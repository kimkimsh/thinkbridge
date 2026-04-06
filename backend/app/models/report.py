from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Integer, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Report(Base):
    """
    리포트 모델 - 세션 완료 시 자동 생성되는 학습 분석 리포트
    Auto-generated on session end: contains narrative summary (Korean)
    and aggregated 6-dimension scores as JSON.
    """

    __tablename__ = "reports"

    mId: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # 세션당 1개 리포트만 존재 (unique constraint)
    mSessionId: Mapped[int] = mapped_column(
        Integer, ForeignKey("tutoring_sessions.mId"), unique=True, nullable=False
    )
    # AI가 생성한 한국어 서술형 요약
    mSummary: Mapped[str] = mapped_column(Text, nullable=False)
    # 6차원 점수 집계 결과 (평균값 등)
    mDimensionScores: Mapped[Any] = mapped_column(JSON, nullable=False)
    mGeneratedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    mSession: Mapped["TutoringSession"] = relationship(
        "TutoringSession", back_populates="mReport", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Report(id={self.mId}, session_id={self.mSessionId})>"
