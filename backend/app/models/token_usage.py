from datetime import datetime, timezone

from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TokenUsage(Base):
    """
    토큰 사용량 모델 - Claude API 호출당 토큰 사용량 추적
    Tracks input/output tokens per API call for cost analysis and AI report data.
    """

    __tablename__ = "token_usages"

    mId: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mSessionId: Mapped[int] = mapped_column(
        Integer, ForeignKey("tutoring_sessions.mId"), nullable=False
    )
    mInputTokens: Mapped[int] = mapped_column(Integer, nullable=False)
    mOutputTokens: Mapped[int] = mapped_column(Integer, nullable=False)
    # 사용된 Claude 모델명 (예: "claude-sonnet-4-20250514")
    mModel: Mapped[str] = mapped_column(String(100), nullable=False)
    mCreatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    mSession: Mapped["TutoringSession"] = relationship(
        "TutoringSession", back_populates="mTokenUsages", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<TokenUsage(id={self.mId}, session_id={self.mSessionId}, "
            f"in={self.mInputTokens}, out={self.mOutputTokens})>"
        )
