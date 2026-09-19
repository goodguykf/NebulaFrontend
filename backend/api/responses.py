"""Small response helpers shared by the routers."""

from __future__ import annotations

from typing import Literal

from fastapi import Query
from fastapi.responses import Response

OutputFormat = Literal["json", "csv"]

FORMAT_QUERY = Query(
    "json",
    description="`json` for the app, `csv` for the hackathon submission file.",
)


def csv_download(text: str, filename: str) -> Response:
    return Response(
        content=text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
