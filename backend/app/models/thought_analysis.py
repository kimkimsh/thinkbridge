import enum
from typing import Any

from sqlalchemy import String, Integer, ForeignKey, JSON, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# 사고 분석 점수 범위 상수
DIMENSION_SCORE_MIN = 0
DIMENSION_SCORE_MAX = 10

# 소크라테스식 5단계 범위 상수
SOCRATIC_STAGE_MIN = 1
SOCRATIC_STAGE_MAX = 5

# DB CheckConstraint에서 사용되는 6차원 점수 컬럼 목록
_DIMENSION_COLUMNS = [
    "mProblemUnderstanding", "mPremiseCheck", "mLogicalStructure",
    "mEvidenceProvision", "mCriticalThinking", "mCreativeThinking",
]


class EngagementLevel(str, enum.Enum):
    """학생 참여 수준 - 적극적, 소극적, 정체"""
    ACTIVE = "active"
    PASSIVE = "passive"
    STUCK = "stuck"


class ThoughtAnalysis(Base):
    """
    사고 분석 모델 - 블룸의 수정된 분류체계 기반 6차원 사고력 분석
    Critical model: stores per-message AI analysis of student thinking.
    Each message has exactly one analysis (message_id is unique).

    6-Dimension Framework (Bloom's Revised Taxonomy):
      1. problem_understanding (문제 이해) - Bloom: Understand
      2. premise_check (전제 확인) - Bloom: Remember/Understand
      3. logical_structure (논리 구조화) - Bloom: Analyze
      4. evidence_provision (근거 제시) - Bloom: Apply
      5. critical_thinking (비판적 사고) - Bloom: Evaluate
      6. creative_thinking (창의적 사고) - Bloom: Create
    """

    __tablename__ = "thought_analyses"

    # DB 레벨에서 점수 범위 강제 (0-10, 1-5)
    __table_args__ = (
        *(
            CheckConstraint(
                f'"{col}" BETWEEN {DIMENSION_SCORE_MIN} AND {DIMENSION_SCORE_MAX}',
                name=f"ck_{col.lower()}_range",
            )
            for col in _DIMENSION_COLUMNS
        ),
        CheckConstraint(
            f'"mSocraticStage" BETWEEN {SOCRATIC_STAGE_MIN} AND {SOCRATIC_STAGE_MAX}',
            name="ck_socratic_stage_range",
        ),
    )

    mId: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # 하나의 메시지에 하나의 분석만 존재 (unique constraint)
    mMessageId: Mapped[int] = mapped_column(
        Integer, ForeignKey("messages.mId"), unique=True, nullable=False
    )

    # 6차원 사고력 점수 (각 0-10)
    mProblemUnderstanding: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    mPremiseCheck: Mapped[int] = mapped_column(Integer, nullable=False)
    mLogicalStructure: Mapped[int] = mapped_column(Integer, nullable=False)
    mEvidenceProvision: Mapped[int] = mapped_column(Integer, nullable=False)
    mCriticalThinking: Mapped[int] = mapped_column(Integer, nullable=False)
    mCreativeThinking: Mapped[int] = mapped_column(Integer, nullable=False)

    # 탐지된 사고 패턴 (예: ["logical_leap", "missing_premise"])
    mDetectedPatterns: Mapped[Any] = mapped_column(
        JSON, nullable=False, default=list
    )
    # 소크라테스식 대화 단계 (1-5)
    mSocraticStage: Mapped[int] = mapped_column(Integer, nullable=False)
    # 학생 참여 수준
    mEngagementLevel: Mapped[EngagementLevel] = mapped_column(
        String(20), nullable=False
    )

    # Relationships
    mMessage: Mapped["Message"] = relationship(
        "Message", back_populates="mThoughtAnalysis", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<ThoughtAnalysis(id={self.mId}, message_id={self.mMessageId}, "
            f"stage={self.mSocraticStage}, engagement={self.mEngagementLevel})>"
        )
