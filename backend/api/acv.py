"""POST /api/acv/predict - rank the cars of one ACV workbook by leak likelihood."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import APIRouter, File, UploadFile
from starlette.concurrency import run_in_threadpool

from api import services
from api.responses import FORMAT_QUERY, OutputFormat, csv_download
from api.schemas import ACVResponse
from api.uploads import save_uploads

router = APIRouter(prefix="/api/acv", tags=["ACV - refrigerant leak localisation"])


@router.post("/predict", response_model=ACVResponse, summary="Rank cars from one .xlsx case file")
async def predict_acv(
    file: UploadFile = File(..., description="One ACV case workbook (.xlsx)."),
    format: OutputFormat = FORMAT_QUERY,
):
    with TemporaryDirectory(prefix="nebula_acv_") as tmp:
        [(file_id, path)] = await save_uploads([file], Path(tmp), services.ACV_EXTENSIONS, "ACV")
        result = await run_in_threadpool(services.run_acv, path, file_id)
    if format == "csv":
        return csv_download(services.acv_csv([result]), services.CSV_FILENAMES["acv"])
    return {"subsystem": "acv", "results": [result]}
