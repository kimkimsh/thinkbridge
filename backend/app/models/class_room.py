import enum
from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SubjectType(str, enum.Enum):
    """과목 유형 - 수학, 과학, 논술"""
    MATH = "math"
    SCIENCE = "science"
    ESSAY = "essay"


class ClassRoom(Base):
    """
    교실 모델 - 시드 데이터 전용 (데모용 교실 정보)
    Seed-only: represents a class managed by an instructor.
    """

    __tablename__ = "classrooms"

    mId: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mName: Mapped[str] = mapped_column(String(100), nullable=False)
    mSubject: Mapped[SubjectType] = mapped_column(String(20), nullable=False)
    mInstructorId: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.mId"), nullable=False
    )
    mCreatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    mInstructor: Mapped["User"] = relationship(
        "User", back_populates="mClassRooms", lazy="selectin"
    )
    mEnrollments: Mapped[list["Enrollment"]] = relationship(
        "Enrollment", back_populates="mClassRoom", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ClassRoom(id={self.mId}, name={self.mName}, subject={self.mSubject})>"
