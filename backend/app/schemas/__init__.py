# Schemas package - Pydantic request/response schemas
# Re-export all schemas for convenient imports

from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    GuestResponse,
)
from app.schemas.session import (
    SessionCreate,
    SessionResponse,
    SessionDetail,
)
from app.schemas.message import (
    MessageCreate,
    ThoughtAnalysisResponse,
    MessageResponse,
    MessageWithAnalysis,
)
from app.schemas.report import (
    ReportResponse,
    GrowthTrendEntry,
    StudentSummary,
    HeatmapEntry,
    HeatmapResponse,
    ClassSummary,
)
from app.schemas.admin import (
    AdminStats,
    AdminClassComparison,
    AdminSubjectRadar,
)

__all__ = [
    # User schemas
    "UserRegister",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "GuestResponse",
    # Session schemas
    "SessionCreate",
    "SessionResponse",
    "SessionDetail",
    # Message schemas
    "MessageCreate",
    "ThoughtAnalysisResponse",
    "MessageResponse",
    "MessageWithAnalysis",
    # Report schemas
    "ReportResponse",
    "GrowthTrendEntry",
    "StudentSummary",
    "HeatmapEntry",
    "HeatmapResponse",
    "ClassSummary",
    # Admin schemas
    "AdminStats",
    "AdminClassComparison",
    "AdminSubjectRadar",
]
