import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MessageRole(str, enum.Enum):
    """메시지 역할 - 사용자 또는 AI 어시스턴트"""
    USER = "user"
    ASSISTANT = "assistant"


class Message(Base):
    """
    메시지 모델 - 튜터링 세션 내 개별 대화 메시지
    Each message belongs to a session and has a turn number for ordering.
    """

    __tablename__ = "messages"

    mId: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mSessionId: Mapped[int] = mapped_column(
        Integer, ForeignKey("tutoring_sessions.mId"), nullable=False
    )
    mRole: Mapped[MessageRole] = mapped_column(String(20), nullable=False)
    mContent: Mapped[str] = mapped_column(Text, nullable=False)
    mTurnNumber: Mapped[int] = mapped_column(Integer, nullable=False)
    mCreatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    mSession: Mapped["TutoringSession"] = relationship(
        "TutoringSession", back_populates="mMessages", lazy="selectin"
    )
    # 하나의 메시지에 하나의 사고 분석이 연결됨
    mThoughtAnalysis: Mapped[Optional["ThoughtAnalysis"]] = relationship(
        "ThoughtAnalysis", back_populates="mMessage", uselist=False, lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<Message(id={self.mId}, session_id={self.mSessionId}, "
            f"role={self.mRole}, turn={self.mTurnNumber})>"
        )
