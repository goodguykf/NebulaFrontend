"""NebulaX train condition-monitoring backend.

Run from this directory:  uvicorn main:app --reload
Swagger docs:             http://127.0.0.1:8000/docs
Web app:                  http://127.0.0.1:8000/     (Expo build in frontend_dist/, if present)
Lightweight web app:      http://127.0.0.1:8000/ui   (always available, no build step)
"""

from __future__ import annotations

import logging
import os
import threading
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

import config
from api import acv, analyses, door, rail, shm
from api.schemas import HealthResponse
from core.errors import BackendError

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("nebula.backend")


def _warm_models() -> None:
    """Load every model artifact once, off the request path. Missing ones only warn."""
    from models.door.inference import load_model as load_door
    from models.rail.inference import load_models as load_rail
    from models.shm.inference import load_model as load_shm

    for label, loader in (("door", load_door), ("rail", load_rail), ("shm", load_shm)):
        try:
            loader()
            logger.info("%s model loaded", label)
        except BackendError as exc:
            logger.warning("%s model not ready: %s", label, exc.message)
        except Exception:  # noqa: BLE001
            logger.exception("%s model failed to load", label)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    if os.environ.get("WARM_MODELS", "1") != "0":
        threading.Thread(target=_warm_models, name="warm-models", daemon=True).start()
    yield


def _error(status_code: int, message: str, detail: object | None = None) -> JSONResponse:
    # "detail" is the FastAPI convention; "error" is what the Expo client reads.
    body = {"detail": message if detail is None else detail, "error": message}
    return JSONResponse(status_code=status_code, content=body)


def _validation_message(exc: RequestValidationError) -> str:
    for item in exc.errors():
        location = [str(part) for part in item.get("loc", ())]
        if item.get("type") == "missing" and location and location[-1] in {"file", "files"}:
            return f"No file supplied. Send the upload in the '{location[-1]}' form field."
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(part) for part in first.get("loc", ()) if part != "body")
    return f"Invalid request: {field} - {first.get('msg', 'validation failed')}".strip()


def create_app() -> FastAPI:
    app = FastAPI(
        title="NebulaX Train Condition Monitoring API",
        description=(
            "Upload subsystem data files and get model predictions back as JSON or as the "
            "hackathon submission CSV. Four subsystems: ACV, Door, Rail corrugation, SHM."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.analysis_store = analyses.new_store()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins(),
        allow_origin_regex=config.cors_origin_regex(),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
    )

    @app.exception_handler(BackendError)
    async def backend_error_handler(_: Request, exc: BackendError) -> JSONResponse:
        return _error(exc.status_code, exc.message)

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return _error(exc.status_code, str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [{k: v for k, v in item.items() if k != "input"} for item in exc.errors()]
        return _error(422, _validation_message(exc), jsonable_encoder(errors))

    @app.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error on %s %s", request.method, request.url.path)
        return _error(500, "Internal server error.")

    frontend_index = config.FRONTEND_DIST / "index.html"
    has_frontend = frontend_index.is_file()

    # With a bundled frontend "/" is the app itself, so the JSON index moves to /api.
    @app.get("/api" if has_frontend else "/", tags=["Service"], summary="Service index")
    def index() -> dict[str, object]:
        return {
            "service": app.title,
            "version": app.version,
            "docs": "/docs",
            "web_app": "/ui",
            "health": "/health",
            "endpoints": {
                "acv": "POST /api/acv/predict (field: file, .xlsx)",
                "door": "POST /api/door/predict (field: file, .csv)",
                "rail": "POST /api/rail/predict (field: files, one or more .csv)",
                "shm": "POST /api/shm/predict (field: files, one or more .csv)",
            },
        }

    @app.get("/health", tags=["Service"], response_model=HealthResponse)
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ui", include_in_schema=False)
    def web_app() -> FileResponse:
        return FileResponse(config.STATIC_DIR / "index.html", media_type="text/html")

    for module in (acv, door, rail, shm, analyses):
        app.include_router(module.router)

    if has_frontend:
        logger.info("serving frontend build from %s", config.FRONTEND_DIST)
        dist_root = config.FRONTEND_DIST.resolve()

        @app.get("/{path:path}", include_in_schema=False)
        def frontend(path: str) -> FileResponse:
            """Static files of the web build; unknown paths are client-side routes."""
            if path.startswith("api/"):
                raise StarletteHTTPException(status_code=404, detail="Not found.")
            candidate = (dist_root / path).resolve()
            if path and candidate.is_file() and dist_root in candidate.parents:
                return FileResponse(candidate)
            return FileResponse(frontend_index, media_type="text/html")

    return app


app = create_app()
