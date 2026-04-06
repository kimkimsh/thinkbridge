import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.class_room import SubjectType


class SessionStatus(str, enum.Enum):
    """세션 상태 - 진행 중, 완료"""
    ACTIVE = "active"
    COMPLETED = "completed"


class TutoringSession(Base):
    """
    튜터링 세션 모델 - 학생의 1:1 AI 튜터링 대화 세션
    Tracks an individual tutoring conversation with subject, topic, and turn count.
    """

    __tablename__ = "tutoring_sessions"

    mId: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mUserId: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.mId"), nullable=False
    )
    mSubject: Mapped[SubjectType] = mapped_column(
        String(20), nullable=False
    )
    mTopic: Mapped[str] = mapped_column(String(255), nullable=False)
    mStatus: Mapped[SessionStatus] = mapped_column(
        String(20), nullable=False, default=SessionStatus.ACTIVE
    )
    # 총 대화 턴 수 (사용자 메시지 기준)
    mTotalTurns: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    mStartedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    # 세션 종료 시각 - 완료 시에만 설정
    mEndedAt: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    mUser: Mapped["User"] = relationship(
        "User", back_populates="mSessions", lazy="selectin"
    )
    mMessages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="mSession", lazy="selectin"
    )
    mReport: Mapped[Optional["Report"]] = relationship(
        "Report", back_populates="mSession", uselist=False, lazy="selectin"
    )
    mTokenUsages: Mapped[list["TokenUsage"]] = relationship(
        "TokenUsage", back_populates="mSession", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<TutoringSession(id={self.mId}, subject={self.mSubject}, "
            f"status={self.mStatus}, turns={self.mTotalTurns})>"
        )
