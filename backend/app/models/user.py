import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    """사용자 역할 - 학생, 강사, 관리자"""
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"


class User(Base):
    """
    사용자 모델 - 학생, 강사, 관리자 역할을 가진 사용자
    Supports guest users with is_guest flag (5-turn trial, no password).
    """

    __tablename__ = "users"

    mId: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mEmail: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    mName: Mapped[str] = mapped_column(String(100), nullable=False)
    mRole: Mapped[UserRole] = mapped_column(
        String(20), nullable=False, default=UserRole.STUDENT
    )
    # 게스트 사용자는 비밀번호 없이 접근 가능
    mHashedPassword: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    mIsGuest: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    mCreatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    mSessions: Mapped[list["TutoringSession"]] = relationship(
        "TutoringSession", back_populates="mUser", lazy="selectin"
    )
    mClassRooms: Mapped[list["ClassRoom"]] = relationship(
        "ClassRoom", back_populates="mInstructor", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.mId}, email={self.mEmail}, role={self.mRole})>"
