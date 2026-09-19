"""POST /api/shm/predict - cumulative fatigue damage for one or many stress recordings."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import APIRouter, File, UploadFile
from starlette.concurrency import run_in_threadpool

from api import services
from api.responses import FORMAT_QUERY, OutputFormat, csv_download
from api.schemas import SHMResponse
from api.uploads import save_uploads

router = APIRouter(prefix="/api/shm", tags=["SHM - fatigue damage"])


@router.post("/predict", response_model=SHMResponse, summary="Predict damage for one or more .csv recordings")
async def predict_shm(
    files: list[UploadFile] = File(..., description="One or more stress recordings (.csv); repeat the field."),
    format: OutputFormat = FORMAT_QUERY,
):
    with TemporaryDirectory(prefix="nebula_shm_") as tmp:
        saved = await save_uploads(files, Path(tmp), services.CSV_EXTENSIONS, "SHM")
        results = await run_in_threadpool(services.run_shm, saved)
    if format == "csv":
        return csv_download(services.shm_csv(results), services.CSV_FILENAMES["shm"])
    return {"subsystem": "shm", "results": results}
