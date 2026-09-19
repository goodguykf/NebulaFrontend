"""Send the held-out test files through the RUNNING app and build predictions.zip.

This is a convenience for the hackathon submission: it does exactly what a user does in
the web app (upload -> wait -> download CSV), for all four subsystems, then zips the four
CSVs at the top level of predictions.zip.

    uvicorn main:app                       # terminal 1
    python scripts/make_predictions_zip.py # terminal 2
"""

from __future__ import annotations

import argparse
import logging
import re
import sys
import time
import zipfile
from contextlib import ExitStack
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import config  # noqa: E402

logger = logging.getLogger("make_predictions_zip")


def natural_key(path: Path) -> list[object]:
    """Test2.csv before Test10.csv."""
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.name)]


def test_files(data_dir: Path) -> dict[str, list[Path]]:
    return {
        "acv": sorted((data_dir / "ACV" / "Test").glob("*.xlsx"), key=natural_key),
        "door": [data_dir / "Door" / "Test.csv"],
        "rail": sorted((data_dir / "Rail_Corrugation" / "Test").glob("*.csv"), key=natural_key),
        "shm": sorted((data_dir / "SHM" / "Test").glob("*.csv"), key=natural_key),
    }


def run_analysis(client: httpx.Client, subsystem: str, paths: list[Path]) -> str:
    """Upload, poll until the job ends, return the submission CSV text."""
    with ExitStack() as stack:
        uploads = [("files", (p.name, stack.enter_context(p.open("rb")), "application/octet-stream")) for p in paths]
        created = client.post("/api/v1/analyses", data={"subsystem": subsystem}, files=uploads)
    created.raise_for_status()
    analysis_id = created.json()["id"]

    while True:
        record = client.get(f"/api/v1/analyses/{analysis_id}").json()
        if record["status"] == "completed":
            break
        if record["status"] == "failed":
            raise RuntimeError(f"{subsystem}: {record.get('error')}")
        time.sleep(1.0)

    download = client.get(f"/api/v1/analyses/{analysis_id}/predictions.csv")
    download.raise_for_status()
    return download.text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--data-dir", type=Path, default=config.dataset_dir())
    parser.add_argument("--output-dir", type=Path, default=config.BACKEND_ROOT.parent / "predictions_from_app")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    with httpx.Client(base_url=args.base_url, timeout=httpx.Timeout(1800.0)) as client:
        client.get("/health").raise_for_status()
        for subsystem, paths in test_files(args.data_dir).items():
            paths = [p for p in paths if p.is_file()]
            if not paths:
                logger.warning("%s: no test files under %s, skipped", subsystem, args.data_dir)
                continue
            started = time.time()
            text = run_analysis(client, subsystem, paths)
            target = args.output_dir / f"{subsystem}_predictions.csv"
            target.write_text(text, encoding="utf-8", newline="")
            written.append(target)
            rows = len(text.strip().splitlines()) - 1
            logger.info("%s: %d file(s) -> %d row(s) in %.1fs", subsystem, len(paths), rows, time.time() - started)

    archive = args.output_dir / "predictions.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        for path in written:
            bundle.write(path, arcname=path.name)
    logger.info("wrote %s (%s)", archive, ", ".join(p.name for p in written))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
