"""Upload handling shared by every endpoint: validation and request-isolated storage."""

from __future__ import annotations

from pathlib import Path
from typing import Sequence

from fastapi import UploadFile

import config
from core.errors import InvalidInputError

CHUNK_BYTES = 1024 * 1024

SavedFile = tuple[str, Path]  # (original file name shown to the user, path inside the temp dir)


def safe_filename(upload: UploadFile) -> str:
    """Original file name with any client-supplied directory part removed."""
    raw = (upload.filename or "").replace("\\", "/")
    name = Path(raw).name.strip()
    if not name or name in {".", ".."}:
        raise InvalidInputError("No file supplied.")
    return name


def check_extension(name: str, allowed: Sequence[str], label: str) -> None:
    if Path(name).suffix.lower() not in allowed:
        expected = " or ".join(allowed)
        raise InvalidInputError(f"Unsupported file type for {label}: '{name}'. Expected {expected}.")


async def _write_to_disk(upload: UploadFile, target: Path, name: str) -> None:
    size = 0
    with target.open("wb") as handle:
        while chunk := await upload.read(CHUNK_BYTES):
            size += len(chunk)
            if size > config.MAX_UPLOAD_BYTES:
                limit_mb = config.MAX_UPLOAD_BYTES // (1024 * 1024)
                raise InvalidInputError(f"'{name}' is larger than the {limit_mb} MB upload limit.")
            handle.write(chunk)
    if size == 0:
        raise InvalidInputError(f"'{name}' is empty.")


async def save_uploads(
    uploads: Sequence[UploadFile],
    directory: Path,
    allowed: Sequence[str],
    label: str,
) -> list[SavedFile]:
    """Validate names/extensions of every upload, then stream them into ``directory``.

    Each file gets its own numbered subfolder, so two uploads with the same name
    cannot overwrite each other and a crafted file name cannot leave ``directory``.
    """
    if not uploads:
        raise InvalidInputError("No file supplied.")
    names = [safe_filename(upload) for upload in uploads]
    for name in names:
        check_extension(name, allowed, label)

    saved: list[SavedFile] = []
    for index, (upload, name) in enumerate(zip(uploads, names)):
        slot = directory / f"{index:04d}"
        slot.mkdir(parents=True, exist_ok=True)
        target = slot / name
        await _write_to_disk(upload, target, name)
        saved.append((name, target))
    return saved
