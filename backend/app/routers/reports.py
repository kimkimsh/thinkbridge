"""
리포트 라우터 - 세션 리포트 조회 및 학생 성장 추세 API
Reports router: session report retrieval and student growth trend endpoints.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import getCurrentUser
from app.models.user import User, UserRole
from app.models.session import TutoringSession
from app.models.report import Report
from app.schemas.report import ReportResponse, GrowthTrendEntry
from app.services.report_generator import (
    generateSessionReport,
    getStudentGrowthTrend,
)


logger = logging.getLogger(__name__)

router = APIRouter()


# --- Constants ---

SESSION_NOT_FOUND_DETAIL = "세션을 찾을 수 없습니다"
SESSION_ACCESS_DENIED_DETAIL = "해당 세션의 리포트에 대한 접근 권한이 없습니다"
STUDENT_ACCESS_DENIED_DETAIL = "해당 학생의 성장 데이터에 대한 접근 권한이 없습니다"
REPORT_GENERATION_FAILED_DETAIL = "리포트 생성에 실패했습니다"


# --- Helper functions ---


def _buildReportResponse(report: Report) -> ReportResponse:
    """
    SQLAlchemy Report 모델을 API 응답 스키마로 변환
    Manually maps model attributes (mValue) to schema fields (camelCase).
    """
    return ReportResponse(
        id=report.mId,
        sessionId=report.mSessionId,
        summary=report.mSummary,
        dimensionScores=report.mDimensionScores,
        generatedAt=report.mGeneratedAt,
    )


def _hasElevatedAccess(user: User) -> bool:
    """
    강사 또는 관리자 역할 여부 확인
    Checks if user has instructor or admin role for elevated access.
    """
    tRole = user.mRole.value if isinstance(user.mRole, UserRole) else user.mRole
    return tRole in (UserRole.INSTRUCTOR.value, UserRole.ADMIN.value)


# --- Endpoints ---


@router.get(
    "/reports/session/{sessionId}",
    response_model=ReportResponse,
)
async def getSessionReport(
    sessionId: int,
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    """
    세션 리포트 조회 - 리포트가 없으면 자동 생성
    Retrieve the report for a session. If no report exists yet, generate one.
    Accessible by session owner, instructor, or admin.

    Raises:
        HTTPException 404: If session not found.
        HTTPException 403: If user has no access to this session's report.
        HTTPException 500: If report generation fails.
    """
    # 세션 존재 여부 및 소유자 확인
    tSessionResult = await db.execute(
        select(TutoringSession).where(TutoringSession.mId == sessionId)
    )
    tSession = tSessionResult.scalar_one_or_none()

    if tSession is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=SESSION_NOT_FOUND_DETAIL,
        )

    # 접근 권한 확인: 세션 소유자이거나 강사/관리자인 경우 허용
    tIsOwner = tSession.mUserId == currentUser.mId
    if not (tIsOwner or _hasElevatedAccess(currentUser)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=SESSION_ACCESS_DENIED_DETAIL,
        )

    # 기존 리포트 조회
    tReportResult = await db.execute(
        select(Report).where(Report.mSessionId == sessionId)
    )
    tReport = tReportResult.scalar_one_or_none()

    # 리포트가 없으면 자동 생성
    if tReport is None:
        try:
            tReport = await generateSessionReport(
                sessionId=sessionId,
                db=db,
            )
        except Exception as tError:
            logger.error(
                "Report generation failed for session %d: %s",
                sessionId, tError,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=REPORT_GENERATION_FAILED_DETAIL,
            )

    return _buildReportResponse(tReport)


@router.get(
    "/students/{studentId}/growth",
    response_model=list[GrowthTrendEntry],
)
async def getStudentGrowth(
    studentId: int,
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> list[GrowthTrendEntry]:
    """
    학생 성장 추세 조회 - 완료된 세션별 6차원 평균 점수 시계열 데이터
    Student growth trend: per-session average 6-dimension scores over time.
    Accessible by the student themselves, instructor, or admin.

    Raises:
        HTTPException 403: If user has no access to this student's data.
    """
    # 접근 권한 확인: 본인이거나 강사/관리자인 경우 허용
    tIsSelf = currentUser.mId == studentId
    if not (tIsSelf or _hasElevatedAccess(currentUser)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=STUDENT_ACCESS_DENIED_DETAIL,
        )

    tTrendEntries = await getStudentGrowthTrend(
        studentId=studentId,
        db=db,
    )

    return tTrendEntries
