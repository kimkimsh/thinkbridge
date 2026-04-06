from datetime import datetime, timezone

from sqlalchemy import Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Enrollment(Base):
    """
    수강 등록 모델 - 시드 데이터 전용 (학생-교실 관계)
    Seed-only: links a student to a classroom.
    """

    __tablename__ = "enrollments"

    mId: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mUserId: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.mId"), nullable=False
    )
    mClassId: Mapped[int] = mapped_column(
        Integer, ForeignKey("classrooms.mId"), nullable=False
    )
    mEnrolledAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    mUser: Mapped["User"] = relationship("User", lazy="selectin")
    mClassRoom: Mapped["ClassRoom"] = relationship(
        "ClassRoom", back_populates="mEnrollments", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Enrollment(id={self.mId}, user_id={self.mUserId}, class_id={self.mClassId})>"
