# Models package - re-export all models for convenient imports
# Importing models here ensures Base.metadata picks them up for create_all

from app.models.user import User, UserRole
from app.models.class_room import ClassRoom, SubjectType
from app.models.enrollment import Enrollment
from app.models.session import TutoringSession, SessionSubject, SessionStatus
from app.models.message import Message, MessageRole
from app.models.thought_analysis import (
    ThoughtAnalysis,
    EngagementLevel,
    DIMENSION_SCORE_MIN,
    DIMENSION_SCORE_MAX,
    SOCRATIC_STAGE_MIN,
    SOCRATIC_STAGE_MAX,
)
from app.models.report import Report
from app.models.token_usage import TokenUsage

__all__ = [
    # Models
    "User",
    "ClassRoom",
    "Enrollment",
    "TutoringSession",
    "Message",
    "ThoughtAnalysis",
    "Report",
    "TokenUsage",
    # Enums
    "UserRole",
    "SubjectType",
    "SessionSubject",
    "SessionStatus",
    "MessageRole",
    "EngagementLevel",
    # Constants
    "DIMENSION_SCORE_MIN",
    "DIMENSION_SCORE_MAX",
    "SOCRATIC_STAGE_MIN",
    "SOCRATIC_STAGE_MAX",
]
