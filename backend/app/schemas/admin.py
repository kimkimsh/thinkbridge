"""
관리자 대시보드 응답 스키마 - 전체 통계, 반별 비교, 과목별 레이더 데이터
Admin dashboard response schemas: aggregated stats, per-class comparison, per-subject radar.
"""

from pydantic import BaseModel


class AdminStats(BaseModel):
    """
    전체 운영 통계 - 관리자 대시보드 요약 카드용
    Aggregated platform statistics for admin summary cards.
    """

    totalStudents: int
    totalSessions: int
    avgScore: float
    activeRate: float


class AdminClassComparison(BaseModel):
    """
    반별 6차원 사고력 비교 - BarChart 데이터용
    Per-class average dimension scores for grouped bar chart visualization.
    """

    id: int
    name: str
    subject: str
    studentCount: int
    scores: dict[str, float]


class AdminSubjectRadar(BaseModel):
    """
    과목별 6차원 레이더 - RadarChart overlay 데이터용
    Per-subject average dimension scores for radar chart overlay visualization.
    """

    subject: str
    scores: dict[str, float]
