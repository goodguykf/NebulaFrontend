"""Response models for the four prediction endpoints (drives the Swagger docs)."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class ACVRankingDetail(BaseModel):
    car: str
    score: Optional[float] = None


class ACVFileResult(BaseModel):
    file_id: str
    ranked_cars: list[str] = Field(description="Most likely faulty car first.")
    ranking_details: list[ACVRankingDetail] = []


class ACVResponse(BaseModel):
    subsystem: Literal["acv"] = "acv"
    results: list[ACVFileResult]


class DoorSegment(BaseModel):
    start_time: str
    end_time: str
    prediction: Literal["Normal", "Abnormal resistance"]
    confidence: Optional[float] = None


class DoorResponse(BaseModel):
    subsystem: Literal["door"] = "door"
    file_id: str
    segments: list[DoorSegment]


class RailFileResult(BaseModel):
    file_id: str
    prediction: str
    probabilities: dict[str, float] = {}


class RailResponse(BaseModel):
    subsystem: Literal["rail"] = "rail"
    results: list[RailFileResult]


class SHMFileResult(BaseModel):
    file_id: str
    prediction: float


class SHMResponse(BaseModel):
    subsystem: Literal["shm"] = "shm"
    results: list[SHMFileResult]
