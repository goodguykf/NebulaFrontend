"""Exceptions shared by the inference modules and the API layer.

Inference code raises these; the API layer maps them to HTTP responses so that
no raw stack trace ever reaches the frontend.
"""

from __future__ import annotations


class BackendError(Exception):
    """Base class for errors with a message that is safe to show to a user."""

    status_code: int = 500

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidInputError(BackendError):
    """The uploaded file is unusable (wrong type, empty, corrupted, wrong columns)."""

    status_code = 400


class ModelArtifactMissingError(BackendError):
    """A trained model file the endpoint needs has not been generated/placed yet."""

    status_code = 500


class InferenceError(BackendError):
    """The model failed on input that passed validation."""

    status_code = 500
