from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReportResponse(BaseModel):
    """
    리포트 응답 스키마 - 세션 완료 후 자동 생성되는 학습 분석 리포트
    Session report with narrative summary and aggregated dimension scores.
    Fields are mapped manually from model attributes (mValue) in routers.
    """

    id: int
    sessionId: int
    summary: str
    dimensionScores: dict
    generatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class GrowthTrendEntry(BaseModel):
    """
    성장 추세 데이터 포인트 - 학생의 세션별 6차원 점수 시계열
    Per-session average scores for growth trend visualization.
    """

    sessionId: int
    date: datetime
    problemUnderstanding: float
    premiseCheck: float
    logicalStructure: float
    evidenceProvision: float
    criticalThinking: float
    creativeThinking: float


class StudentSummary(BaseModel):
    """
    학생 요약 정보 - 강사 대시보드의 학생 목록용
    Student summary for instructor dashboard class roster.
    """

    id: int
    name: str
    sessionCount: int
    avgScore: float


class HeatmapEntry(BaseModel):
    """
    히트맵 데이터 포인트 - 학생별 6차원 점수 매트릭스
    Per-student dimension scores for heatmap visualization.
    """

    studentId: int
    studentName: str
    scores: dict[str, float]


class HeatmapResponse(BaseModel):
    """
    히트맵 응답 - 학생별 6차원 점수 매트릭스 + AI 인사이트 텍스트
    Heatmap data with programmatic AI insight for instructor dashboard.
    """

    entries: list[HeatmapEntry]
    insight: str


class ClassSummary(BaseModel):
    """
    교실 요약 정보 - 강사 대시보드의 교실 목록용
    Classroom summary for instructor dashboard class list.
    """

    id: int
    name: str
    subject: str
    studentCount: int
