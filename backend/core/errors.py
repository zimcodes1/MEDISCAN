class AppError(Exception):
    """Expected, client-facing failure. main.py turns it into a JSON response."""

    def __init__(self, status_code: int, detail: str, headers: dict[str, str] | None = None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.headers = headers


class AuthError(AppError):
    """Authentication / authorisation failure."""
