"""
관리자 대시보드 라우터 - 전체 통계, 반별 비교, 과목별 레이더 API
Admin dashboard router: aggregated stats, per-class comparison, per-subject radar.
All data aggregated from existing DB tables -- no separate admin tables needed.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.security import getCurrentUser
from app.models.user import User, UserRole
from app.models.class_room import ClassRoom
from app.models.enrollment import Enrollment
from app.models.session import TutoringSession
from app.models.message import Message
from app.models.thought_analysis import ThoughtAnalysis
from app.schemas.admin import (
    AdminStats,
    AdminClassComparison,
    AdminSubjectRadar,
)


logger = logging.getLogger(__name__)

router = APIRouter()


# --- Constants ---

ACCESS_DENIED_DETAIL = "관리자 권한이 필요합니다"

# 활성 사용자 판단 기간 (일)
ACTIVE_WINDOW_DAYS = 7

# 6차원 분석 필드 수
DIMENSION_COUNT = 6

# 기본 점수 (분석 데이터 없을 때)
DEFAULT_DIMENSION_SCORE = 5.0

# ThoughtAnalysis 모델 속성 -> 차원 키 매핑
DIMENSION_MODEL_FIELDS: dict[str, str] = {
    "mProblemUnderstanding": "problemUnderstanding",
    "mPremiseCheck": "premiseCheck",
    "mLogicalStructure": "logicalStructure",
    "mEvidenceProvision": "evidenceProvision",
    "mCriticalThinking": "criticalThinking",
    "mCreativeThinking": "creativeThinking",
}

# 차원 키 목록 (순서 보장용)
DIMENSION_KEYS = list(DIMENSION_MODEL_FIELDS.values())

# 퍼센트 계산 배율
PERCENT_MULTIPLIER = 100.0


# --- Helper functions ---


def _requireAdmin(user: User) -> None:
    """
    관리자 역할인지 확인하고 아니면 403 에러 발생
    Raises HTTPException 403 if user is not admin.
    """
    tRole = user.mRole.value if isinstance(user.mRole, UserRole) else user.mRole
    if tRole != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ACCESS_DENIED_DETAIL,
        )


def _computeAverageDimensions(
    analysisList: list[ThoughtAnalysis],
) -> dict[str, float]:
    """
    여러 ThoughtAnalysis의 6차원 점수를 평균 계산
    Computes the mean of each dimension across multiple ThoughtAnalysis records.
    Returns default scores if the list is empty.
    """
    if not analysisList:
        return {key: DEFAULT_DIMENSION_SCORE for key in DIMENSION_KEYS}

    tSums: dict[str, float] = {key: 0.0 for key in DIMENSION_KEYS}
    tCount = len(analysisList)

    for tAnalysis in analysisList:
        for tModelField, tDimensionKey in DIMENSION_MODEL_FIELDS.items():
            tSums[tDimensionKey] += float(getattr(tAnalysis, tModelField))

    return {key: round(value / tCount, 1) for key, value in tSums.items()}


def _computeOverallAvgScore(
    analysisList: list[ThoughtAnalysis],
) -> float:
    """
    모든 ThoughtAnalysis에서 6차원 전체 평균 점수 계산
    Computes the grand average across all dimensions and all analyses.
    """
    if not analysisList:
        return 0.0

    tTotalScore = 0.0
    tTotalDimensions = 0

    for tAnalysis in analysisList:
        for tModelField in DIMENSION_MODEL_FIELDS:
            tTotalScore += float(getattr(tAnalysis, tModelField))
            tTotalDimensions += 1

    if tTotalDimensions == 0:
        return 0.0

    return round(tTotalScore / tTotalDimensions, 1)


# --- Endpoints ---


@router.get(
    "/stats",
    response_model=AdminStats,
)
async def getAdminStats(
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> AdminStats:
    """
    전체 운영 통계 조회 - 총 학생, 총 세션, 전체 평균 점수, 활성률
    Aggregated platform statistics for admin dashboard summary cards.

    - totalStudents: 게스트가 아닌 학생 역할 사용자 수
    - totalSessions: 전체 튜터링 세션 수
    - avgScore: 모든 ThoughtAnalysis의 6차원 전체 평균
    - activeRate: 최근 7일 내 세션을 가진 학생 비율 (%)

    Raises:
        HTTPException 403: If user is not admin.
    """
    _requireAdmin(currentUser)

    # 총 학생 수 (게스트 제외, role=student)
    tStudentCountResult = await db.execute(
        select(func.count(User.mId)).where(
            User.mRole == UserRole.STUDENT,
            User.mIsGuest == False,  # noqa: E712
        )
    )
    tTotalStudents = tStudentCountResult.scalar() or 0

    # 총 세션 수
    tSessionCountResult = await db.execute(
        select(func.count(TutoringSession.mId))
    )
    tTotalSessions = tSessionCountResult.scalar() or 0

    # 전체 ThoughtAnalysis 로드하여 평균 점수 계산
    tAnalysisResult = await db.execute(select(ThoughtAnalysis))
    tAllAnalyses = list(tAnalysisResult.scalars().all())
    tAvgScore = _computeOverallAvgScore(tAllAnalyses)

    # 활성률: 최근 7일 내 세션이 있는 학생 비율
    tActiveWindowStart = datetime.now(timezone.utc) - timedelta(days=ACTIVE_WINDOW_DAYS)

    tActiveStudentResult = await db.execute(
        select(func.count(distinct(TutoringSession.mUserId))).where(
            TutoringSession.mStartedAt >= tActiveWindowStart,
        )
    )
    tActiveStudentCount = tActiveStudentResult.scalar() or 0

    tActiveRate = 0.0
    if tTotalStudents > 0:
        tActiveRate = round(
            tActiveStudentCount / tTotalStudents * PERCENT_MULTIPLIER, 1
        )

    return AdminStats(
        totalStudents=tTotalStudents,
        totalSessions=tTotalSessions,
        avgScore=tAvgScore,
        activeRate=tActiveRate,
    )


@router.get(
    "/classes",
    response_model=list[AdminClassComparison],
)
async def getAdminClasses(
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> list[AdminClassComparison]:
    """
    반별 6차원 사고력 비교 - BarChart 데이터
    For each class, computes average 6-dimension scores across all enrolled students' sessions.

    Raises:
        HTTPException 403: If user is not admin.
    """
    _requireAdmin(currentUser)

    # 모든 교실 조회 (수강 등록 정보 포함)
    tClassResult = await db.execute(
        select(ClassRoom)
        .options(
            selectinload(ClassRoom.mEnrollments)
            .selectinload(Enrollment.mUser)
        )
    )
    tClasses = tClassResult.scalars().all()

    tComparisons: list[AdminClassComparison] = []

    for tClassRoom in tClasses:
        tSubject = (
            tClassRoom.mSubject.value
            if hasattr(tClassRoom.mSubject, "value")
            else tClassRoom.mSubject
        )

        # 해당 반의 모든 학생 ID 수집
        tStudentIds = [
            tEnrollment.mUserId for tEnrollment in tClassRoom.mEnrollments
        ]

        # 학생들의 모든 ThoughtAnalysis 조회
        tAnalysisList: list[ThoughtAnalysis] = []
        if tStudentIds:
            tAnalysisResult = await db.execute(
                select(ThoughtAnalysis)
                .join(Message, ThoughtAnalysis.mMessageId == Message.mId)
                .join(TutoringSession, Message.mSessionId == TutoringSession.mId)
                .where(TutoringSession.mUserId.in_(tStudentIds))
            )
            tAnalysisList = list(tAnalysisResult.scalars().all())

        # 6차원 평균 점수 계산
        tScores = _computeAverageDimensions(tAnalysisList)

        tComparison = AdminClassComparison(
            id=tClassRoom.mId,
            name=tClassRoom.mName,
            subject=tSubject,
            studentCount=len(tClassRoom.mEnrollments),
            scores=tScores,
        )
        tComparisons.append(tComparison)

    return tComparisons


@router.get(
    "/subjects",
    response_model=list[AdminSubjectRadar],
)
async def getAdminSubjects(
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> list[AdminSubjectRadar]:
    """
    과목별 6차원 레이더 데이터 - RadarChart overlay
    For each subject, computes average 6-dimension scores across all sessions of that subject.

    Raises:
        HTTPException 403: If user is not admin.
    """
    _requireAdmin(currentUser)

    # 존재하는 과목 목록 조회
    tSubjectResult = await db.execute(
        select(distinct(TutoringSession.mSubject))
    )
    tSubjects = [row[0] for row in tSubjectResult.all()]

    tSubjectRadars: list[AdminSubjectRadar] = []

    for tSubject in tSubjects:
        tSubjectValue = (
            tSubject.value if hasattr(tSubject, "value") else tSubject
        )

        # 해당 과목의 모든 세션에서 ThoughtAnalysis 조회
        tAnalysisResult = await db.execute(
            select(ThoughtAnalysis)
            .join(Message, ThoughtAnalysis.mMessageId == Message.mId)
            .join(TutoringSession, Message.mSessionId == TutoringSession.mId)
            .where(TutoringSession.mSubject == tSubject)
        )
        tAnalysisList = list(tAnalysisResult.scalars().all())

        # 6차원 평균 점수 계산
        tScores = _computeAverageDimensions(tAnalysisList)

        tRadar = AdminSubjectRadar(
            subject=tSubjectValue,
            scores=tScores,
        )
        tSubjectRadars.append(tRadar)

    return tSubjectRadars
