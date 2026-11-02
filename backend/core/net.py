"""Client IP resolution for rate limiting and audit logs.

Behind a reverse proxy the socket peer is the proxy, so every user would share
one IP. X-Forwarded-For fixes that, but the header is client-controlled: the
LEFT side can be forged by anyone. Only the entries appended by proxies you
trust are reliable, so we count from the RIGHT using TRUSTED_PROXY_HOPS:

    hops=0 (default): ignore the header, use the socket peer (spoof-proof)
    hops=1: one proxy in front -> the last entry is the real client
    hops=2: two proxies (e.g. CDN + load balancer) -> second to last, etc.

Only raise this if you are sure how many proxies sit in front of the app;
too high a value lets clients choose their own IP.
"""
import ipaddress

from starlette.requests import Request

from backend.core.config import get_settings


def _parse_ip(raw: str) -> str | None:
    raw = raw.strip()
    if raw.startswith("["):  # [v6]:port
        raw = raw[1:].split("]")[0]
    elif raw.count(":") == 1:  # v4:port
        raw = raw.split(":")[0]
    try:
        return str(ipaddress.ip_address(raw))
    except ValueError:
        return None  # never store arbitrary header text in logs / limiter keys


def client_ip(request: Request) -> str:
    hops = get_settings().trusted_proxy_hops
    if hops > 0:
        entries = [p for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
        if len(entries) >= hops:
            ip = _parse_ip(entries[-hops])
            if ip:
                return ip
    peer = request.client.host if request.client else None
    return (_parse_ip(peer) if peer else None) or "unknown"
