"""Bridge between the HTTP layer and the subsystem inference modules.

Routers call these through the module (``services.run_rail(...)``) so tests can
replace them with fakes. Inference packages are imported lazily: a missing
optional dependency then breaks one endpoint instead of the whole app.
"""

from __future__ import annotations

import csv
import io
import logging
from pathlib import Path
from typing import Any, Callable, Sequence

from core.errors import BackendError, InferenceError

logger = logging.getLogger(__name__)

SavedFile = tuple[str, Path]

ACV_EXTENSIONS = (".xlsx",)
CSV_EXTENSIONS = (".csv",)

CSV_FILENAMES = {
    "acv": "acv_predictions.csv",
    "door": "door_predictions.csv",
    "rail": "rail_predictions.csv",
    "shm": "shm_predictions.csv",
}


def _guarded(label: str, func: Callable[..., Any], *args: Any) -> Any:
    """Run inference; keep user-safe errors, hide everything else behind a 500."""
    try:
        return func(*args)
    except BackendError:
        raise
    except Exception as exc:  # noqa: BLE001 - the traceback belongs in the log, not the response
        logger.exception("%s inference failed", label)
        raise InferenceError(f"{label} model inference failed. See the server log.") from exc


def run_acv(path: Path, file_id: str) -> dict:
    def call() -> dict:
        from models.acv.inference import predict_case

        return predict_case(path, file_id)

    return _guarded("ACV", call)


def run_door(path: Path) -> list[dict]:
    def call() -> list[dict]:
        from models.door.inference import predict_stream

        return predict_stream(path)

    return _guarded("Door", call)


def run_rail(files: Sequence[SavedFile]) -> list[dict]:
    def call() -> list[dict]:
        from models.rail.inference import predict_recordings

        return predict_recordings(files)

    return _guarded("Rail", call)


def run_shm(files: Sequence[SavedFile]) -> list[dict]:
    def call() -> list[dict]:
        from models.shm.inference import predict_files

        return predict_files(files)

    return _guarded("SHM", call)


# --- submission-format CSVs (schemas from the problem statement, section 4.1) ---------


def _to_csv(header: Sequence[str], rows: Sequence[Sequence[str]]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return buffer.getvalue()


def acv_csv(results: Sequence[dict]) -> str:
    rows = [[item["file_id"], "|".join(item["ranked_cars"])] for item in results]
    return _to_csv(["file_id", "ranked_cars"], rows)


def door_csv(segments: Sequence[dict]) -> str:
    """Official Door schema only. Confidence is shown in the app, never written to the CSV."""
    rows = [[seg["start_time"], seg["end_time"], seg["prediction"]] for seg in segments]
    return _to_csv(["start_time", "end_time", "prediction"], rows)


def rail_csv(results: Sequence[dict]) -> str:
    return _to_csv(["file_id", "prediction"], [[r["file_id"], r["prediction"]] for r in results])


def shm_csv(results: Sequence[dict]) -> str:
    rows = [[r["file_id"], repr(float(r["prediction"]))] for r in results]
    return _to_csv(["file_id", "prediction"], rows)
