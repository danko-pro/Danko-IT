from __future__ import annotations


class ApplicationError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        payload: dict[str, object] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.detail = message
        self.code = code
        self.payload = dict(payload) if payload is not None else None

    def __str__(self) -> str:
        return self.message


class ValidationError(ApplicationError):
    pass


class NotFoundError(ApplicationError):
    pass


class ConflictError(ApplicationError):
    pass


class ExternalServiceError(ApplicationError):
    pass


class OperationFailedError(ApplicationError):
    pass
