"""POST /api/rail/predict - classify one or many axle-box recordings."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import APIRouter, File, UploadFile
from starlette.concurrency import run_in_threadpool

from api import services
from api.responses import FORMAT_QUERY, OutputFormat, csv_download
from api.schemas import RailResponse
from api.uploads import save_uploads

router = APIRouter(prefix="/api/rail", tags=["Rail - corrugation"])


@router.post("/predict", response_model=RailResponse, summary="Classify one or more .csv recordings")
async def predict_rail(
    files: list[UploadFile] = File(..., description="One or more recordings (.csv); repeat the field."),
    format: OutputFormat = FORMAT_QUERY,
):
    with TemporaryDirectory(prefix="nebula_rail_") as tmp:
        saved = await save_uploads(files, Path(tmp), services.CSV_EXTENSIONS, "Rail")
        results = await run_in_threadpool(services.run_rail, saved)
    if format == "csv":
        return csv_download(services.rail_csv(results), services.CSV_FILENAMES["rail"])
    return {"subsystem": "rail", "results": results}
