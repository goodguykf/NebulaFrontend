"""/api/v1 - the job-style contract the NebulaFrontend (Expo) app already speaks.

    POST /api/v1/analyses                     multipart: subsystem + files  -> {id, status}
    GET  /api/v1/analyses[?subsystem&limit]   history, newest first
    GET  /api/v1/analyses/{id}                one record; poll until completed/failed
    GET  /api/v1/analyses/{id}/predictions.csv  submission-format download

Uploads live in a job-specific temp dir that is deleted as soon as inference
ends. Only the (small) results are kept, in memory, for the history screen.
"""

from __future__ import annotations

import logging
import shutil
import tempfile
import threading
import uuid
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Sequence

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Query, Request, UploadFile

import config
from api import services
from api.responses import csv_download
from api.schemas import HealthResponse
from api.uploads import SavedFile, save_uploads
from core.errors import BackendError, InvalidInputError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Frontend app (job API)"])

SUBSYSTEMS = ("acv", "door", "rail", "shm")
SINGLE_FILE_SUBSYSTEMS = ("acv", "door")
LABELS = {"acv": "ACV", "door": "Door", "rail": "Rail", "shm": "SHM"}


@dataclass
class Analysis:
    id: str
    subsystem: str
    filename: str
    created_at: str
    status: str = "queued"
    error: Optional[str] = None
    result: Optional[dict[str, Any]] = None
    csv_text: Optional[str] = field(default=None, repr=False)

    def to_record(self) -> dict[str, Any]:
        record: dict[str, Any] = {
            "id": self.id,
            "subsystem": self.subsystem,
            "filename": self.filename,
            "createdAt": self.created_at,
            "status": self.status,
        }
        if self.error:
            record["error"] = self.error
        if self.result is not None:
            record["result"] = self.result
        return record


class AnalysisStore:
    """Thread-safe, size-capped, in-memory record of recent analyses."""

    def __init__(self, capacity: int) -> None:
        self._capacity = capacity
        self._items: OrderedDict[str, Analysis] = OrderedDict()
        self._lock = threading.Lock()
        # One inference at a time: the models are multi-threaded and memory hungry.
        self.inference_lock = threading.Lock()

    def add(self, analysis: Analysis) -> None:
        with self._lock:
            self._items[analysis.id] = analysis
            while len(self._items) > self._capacity:
                self._items.popitem(last=False)

    def get(self, analysis_id: str) -> Optional[Analysis]:
        with self._lock:
            return self._items.get(analysis_id)

    def update(self, analysis_id: str, **changes: Any) -> None:
        with self._lock:
            analysis = self._items.get(analysis_id)
            if analysis is not None:
                for key, value in changes.items():
                    setattr(analysis, key, value)

    def newest_first(self, subsystem: Optional[str], limit: Optional[int]) -> list[Analysis]:
        with self._lock:
            items = [a for a in reversed(self._items.values()) if subsystem in (None, a.subsystem)]
        return items[:limit] if limit else items


def _store(request: Request) -> AnalysisStore:
    return request.app.state.analysis_store


# --- shaping results the way the frontend's TypeScript types expect -------------------


def depot_clock_to_iso(value: str) -> str:
    """'2023-7-5-0-0-3-760' -> '2023-07-05T00:00:03.760Z' (same rule as the frontend)."""
    parts = value.split("-")
    try:
        year, month, day, hour, minute, second, milli = (int(part) for part in parts)
        moment = datetime(year, month, day, hour, minute, second, milli * 1000, tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return value
    return moment.strftime("%Y-%m-%dT%H:%M:%S.") + f"{milli:03d}Z"


def acv_result(result: dict) -> dict[str, Any]:
    scores = {item["car"]: item.get("score") for item in result.get("ranking_details", [])}
    ranked = [
        {"carId": car, "rank": rank, **({"score": scores[car]} if scores.get(car) is not None else {})}
        for rank, car in enumerate(result["ranked_cars"], start=1)
    ]
    return {
        "type": "acv",
        "ranking": "|".join(result["ranked_cars"]),
        "rankedCars": ranked,
        "availableMetrics": [],
    }


def door_result(segments: Sequence[dict]) -> dict[str, Any]:
    shaped = [
        {
            "id": f"seg_{index:03d}",
            "startTime": depot_clock_to_iso(seg["start_time"]),
            "endTime": depot_clock_to_iso(seg["end_time"]),
            "rawStartTime": seg["start_time"],
            "rawEndTime": seg["end_time"],
            "prediction": seg["prediction"],
            **({"confidence": seg["confidence"]} if seg.get("confidence") is not None else {}),
        }
        for index, seg in enumerate(segments, start=1)
    ]
    abnormal = sum(1 for seg in segments if seg["prediction"] != "Normal")
    return {
        "type": "door",
        "totalSegments": len(shaped),
        "normalSegments": len(shaped) - abnormal,
        "abnormalSegments": abnormal,
        "segments": shaped,
    }


def rail_result(results: Sequence[dict]) -> dict[str, Any]:
    keys = {"Normal": "normal", "Side I": "sideI", "Side II": "sideII"}
    counts = {key: 0 for key in keys.values()}
    for item in results:
        counts[keys.get(item["prediction"], "normal")] += 1
    # Leading class = most files; ties resolve in the official class order.
    leading = max(keys, key=lambda name: counts[keys[name]])
    shaped: dict[str, Any] = {
        "type": "rail",
        "prediction": leading,
        "files": [
            {
                "fileId": item["file_id"],
                "prediction": item["prediction"],
                "probabilities": item.get("probabilities", {}),
            }
            for item in results
        ],
        "statusCounts": counts,
    }
    with_probabilities = [item["probabilities"] for item in results if item.get("probabilities")]
    if with_probabilities:
        shaped["classScores"] = {
            key: sum(p.get(name, 0.0) for p in with_probabilities) / len(with_probabilities)
            for name, key in keys.items()
        }
    return shaped


def shm_result(results: Sequence[dict]) -> dict[str, Any]:
    return {
        "type": "shm",
        "files": [{"fileId": item["file_id"], "prediction": item["prediction"]} for item in results],
    }


def run_subsystem(subsystem: str, files: Sequence[SavedFile]) -> tuple[dict[str, Any], str]:
    """Inference for one job -> (frontend-shaped result, submission CSV text)."""
    if subsystem == "acv":
        file_id, path = files[0]
        result = services.run_acv(path, file_id)
        return acv_result(result), services.acv_csv([result])
    if subsystem == "door":
        segments = services.run_door(files[0][1])
        return door_result(segments), services.door_csv(segments)
    if subsystem == "rail":
        results = services.run_rail(files)
        return rail_result(results), services.rail_csv(results)
    results = services.run_shm(files)
    return shm_result(results), services.shm_csv(results)


def process_analysis(
    store: AnalysisStore, analysis_id: str, subsystem: str, files: Sequence[SavedFile], workdir: Path
) -> None:
    """Background job: always leaves a final status and always deletes the uploads."""
    try:
        with store.inference_lock:
            store.update(analysis_id, status="processing")
            result, csv_text = run_subsystem(subsystem, files)
        store.update(analysis_id, status="completed", result=result, csv_text=csv_text)
    except BackendError as exc:
        store.update(analysis_id, status="failed", error=exc.message)
    except Exception:  # noqa: BLE001 - never leak internals to the client
        logger.exception("analysis %s failed", analysis_id)
        store.update(analysis_id, status="failed", error="Unexpected server error during analysis.")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


# --- routes ---------------------------------------------------------------------------


@router.get("/health", response_model=HealthResponse)
def health_v1() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/analyses", status_code=202, summary="Upload file(s) and start an analysis")
async def create_analysis(
    request: Request,
    background: BackgroundTasks,
    subsystem: str = Form(..., description="acv | door | rail | shm"),
    files: list[UploadFile] = File(..., description="Repeat the field for every file."),
) -> dict[str, str]:
    subsystem = subsystem.strip().lower()
    if subsystem not in SUBSYSTEMS:
        raise InvalidInputError(f"Unknown subsystem '{subsystem}'. Use one of: {', '.join(SUBSYSTEMS)}.")
    if subsystem in SINGLE_FILE_SUBSYSTEMS and len(files) != 1:
        raise InvalidInputError(f"{LABELS[subsystem]} analysis takes exactly one file.")

    allowed = services.ACV_EXTENSIONS if subsystem == "acv" else services.CSV_EXTENSIONS
    workdir = Path(tempfile.mkdtemp(prefix=f"nebula_{subsystem}_"))
    try:
        saved = await save_uploads(files, workdir, allowed, LABELS[subsystem])
    except BaseException:
        shutil.rmtree(workdir, ignore_errors=True)
        raise

    first = saved[0][0]
    analysis = Analysis(
        id=f"analysis_{subsystem}_{uuid.uuid4().hex[:12]}",
        subsystem=subsystem,
        filename=first if len(saved) == 1 else f"{first} (+{len(saved) - 1} more)",
        created_at=datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
    )
    store = _store(request)
    store.add(analysis)
    background.add_task(process_analysis, store, analysis.id, subsystem, saved, workdir)
    return {"id": analysis.id, "status": "queued"}


@router.get("/analyses", summary="Recent analyses, newest first")
def list_analyses(
    request: Request,
    subsystem: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=500),
    cursor: Optional[str] = Query(None, description="Accepted for compatibility; not used."),
) -> list[dict[str, Any]]:
    return [a.to_record() for a in _store(request).newest_first(subsystem, limit)]


def _require(request: Request, analysis_id: str) -> Analysis:
    analysis = _store(request).get(analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail=f"Analysis {analysis_id} was not found.")
    return analysis


@router.get("/analyses/{analysis_id}", summary="One analysis; poll until completed or failed")
def get_analysis(request: Request, analysis_id: str) -> dict[str, Any]:
    return _require(request, analysis_id).to_record()


@router.get("/analyses/{analysis_id}/predictions.csv", summary="Download the submission-format CSV")
def download_predictions(request: Request, analysis_id: str):
    analysis = _require(request, analysis_id)
    if analysis.status != "completed" or analysis.csv_text is None:
        raise HTTPException(status_code=409, detail="This analysis has no predictions yet.")
    return csv_download(analysis.csv_text, services.CSV_FILENAMES[analysis.subsystem])


def new_store() -> AnalysisStore:
    return AnalysisStore(config.MAX_STORED_ANALYSES)
