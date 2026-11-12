"""Outgoing email (approval notices). Never blocks or fails the request that caused
it: messages are sent in the background and failures are only logged.

EMAIL_BACKEND=disabled (default) sends nothing. console logs the message instead of
sending it (development). smtp sends through any SMTP provider (Gmail app passwords,
Zoho, Brevo, Resend's SMTP, ...). Message bodies are never logged."""
import asyncio
import logging
import smtplib
from email.message import EmailMessage

from starlette.concurrency import run_in_threadpool

from backend.core.config import get_settings

logger = logging.getLogger("mediscan.email")

_pending: set[asyncio.Task] = set()


def _build(to: str, subject: str, body: str) -> EmailMessage:
    s = get_settings()
    msg = EmailMessage()
    msg["From"] = s.email_from or f"{s.app_name} <no-reply@localhost>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    return msg


def _smtp_send(msg: EmailMessage) -> None:
    s = get_settings()
    if s.smtp_security == "ssl":
        server = smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, timeout=s.smtp_timeout_seconds)
    else:
        server = smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=s.smtp_timeout_seconds)
    try:
        if s.smtp_security == "starttls":
            server.starttls()
        if s.smtp_username and s.smtp_password:
            server.login(s.smtp_username, s.smtp_password.get_secret_value())
        server.send_message(msg)
    finally:
        try:
            server.quit()
        except Exception:  # the message is already sent or has failed; nothing to add
            pass


async def deliver(to: str, subject: str, body: str) -> None:
    """Send one message now, using the configured backend. Raises on failure."""
    backend = get_settings().email_backend
    if backend == "disabled":
        return
    msg = _build(to, subject, body)
    if backend == "console":
        logger.info("EMAIL (console backend) subject=%r", subject)
        return
    await run_in_threadpool(_smtp_send, msg)


async def _safe_deliver(to: str, subject: str, body: str) -> None:
    try:
        await deliver(to, subject, body)
    except Exception as exc:  # a mail problem must never break approvals
        logger.error("Email %r could not be sent (%s)", subject, type(exc).__name__)


def send_in_background(to: str, subject: str, body: str) -> None:
    """Queue a message and return at once. A no-op when email is disabled."""
    if get_settings().email_backend == "disabled":
        return
    task = asyncio.get_running_loop().create_task(_safe_deliver(to, subject, body))
    _pending.add(task)  # keep a reference so it is not garbage-collected mid-send
    task.add_done_callback(_pending.discard)


async def drain() -> None:
    """Wait for queued messages (used by tests and at shutdown)."""
    if _pending:
        await asyncio.gather(*list(_pending), return_exceptions=True)


# ------------------------------------------------------------------ the messages
def _login_url() -> str:
    return get_settings().frontend_url.rstrip("/") + "/login"


def send_organisation_approved(to: str, full_name: str, org_name: str) -> None:
    send_in_background(
        to, "Your MediScan organisation is approved",
        f"Hello {full_name},\n\n"
        f"{org_name} has been approved on MediScan. You can now sign in with the email "
        f"and password you registered with:\n\n{_login_url()}\n\n"
        "After you sign in you will be guided through setting up your organisation "
        "and inviting your team.\n\nMediScan",
    )


def send_account_approved(to: str, full_name: str, org_name: str) -> None:
    send_in_background(
        to, "Your MediScan account is approved",
        f"Hello {full_name},\n\n"
        f"Your account at {org_name} has been approved by your organisation admin. "
        f"You can now sign in:\n\n{_login_url()}\n\nMediScan",
    )
