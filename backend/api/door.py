"""POST /api/door/predict - segment one continuous door stream and classify each cycle."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import APIRouter, File, UploadFile
from starlette.concurrency import run_in_threadpool

from api import services
from api.responses import FORMAT_QUERY, OutputFormat, csv_download
from api.schemas import DoorResponse
from api.uploads import save_uploads

router = APIRouter(prefix="/api/door", tags=["Door - abnormal resistance"])


@router.post("/predict", response_model=DoorResponse, summary="Detect and classify door cycles in one .csv")
async def predict_door(
    file: UploadFile = File(..., description="One continuous door-controller stream (.csv)."),
    format: OutputFormat = FORMAT_QUERY,
):
    with TemporaryDirectory(prefix="nebula_door_") as tmp:
        [(file_id, path)] = await save_uploads([file], Path(tmp), services.CSV_EXTENSIONS, "Door")
        segments = await run_in_threadpool(services.run_door, path)
    if format == "csv":
        return csv_download(services.door_csv(segments), services.CSV_FILENAMES["door"])
    return {"subsystem": "door", "file_id": file_id, "segments": segments}
