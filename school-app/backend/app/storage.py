import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic"}
CHUNK = 1024 * 1024


async def save_upload(file: UploadFile, folder: str) -> str:
    """Enregistre le fichier sous un nom aléatoire et renvoie son URL publique (/uploads/...)."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "file_type_not_allowed")

    target_dir = Path(settings.upload_dir) / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    target = target_dir / name

    max_bytes = settings.max_upload_mb * CHUNK
    written = 0
    with target.open("wb") as out:
        while chunk := await file.read(CHUNK):
            written += len(chunk)
            if written > max_bytes:
                out.close()
                target.unlink(missing_ok=True)
                raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "file_too_large")
            out.write(chunk)
    return f"/uploads/{folder}/{name}"


def delete_upload(url: str | None) -> None:
    if not url or not url.startswith("/uploads/"):
        return
    path = Path(settings.upload_dir) / url.removeprefix("/uploads/")
    path.unlink(missing_ok=True)
