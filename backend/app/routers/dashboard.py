"""
강사 대시보드 라우터 - 교실, 학생 목록, 히트맵 API
Instructor dashboard router: classes, student roster, and thinking heatmap.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.security import getCurrentUser
from app.models.user import User, UserRole
from app.models.class_room import ClassRoom
from app.models.enrollment import Enrollment
from app.models.session import TutoringSession, SessionStatus
from app.models.message import Message
from app.models.thought_analysis import ThoughtAnalysis
from app.schemas.report import (
    ClassSummary,
    StudentSummary,
    HeatmapEntry,
    HeatmapResponse,
)


logger = logging.getLogger(__name__)

router = APIRouter()


# --- Constants ---

ACCESS_DENIED_DETAIL = "강사 또는 관리자 권한이 필요합니다"
CLASS_NOT_FOUND_DETAIL = "교실을 찾을 수 없습니다"
CLASS_ACCESS_DENIED_DETAIL = "해당 교실에 대한 접근 권한이 없습니다"

# 히트맵 인사이트에서 저점 기준 임계값
LOW_SCORE_THRESHOLD = 4.0

# 6차원 총 수
DIMENSION_COUNT = 6

# 기본 점수 (분석 데이터 없을 때)
DEFAULT_DIMENSION_SCORE = 5.0

# 6차원 분석 필드와 한국어 레이블 매핑
DIMENSION_LABELS: dict[str, str] = {
    "problemUnderstanding": "문제 이해",
    "premiseCheck": "전제 확인",
    "logicalStructure": "논리 구조화",
    "evidenceProvision": "근거 제시",
    "criticalThinking": "비판적 사고",
    "creativeThinking": "창의적 사고",
}

# ThoughtAnalysis 모델 속성 → 차원 키 매핑
DIMENSION_MODEL_FIELDS: dict[str, str] = {
    "mProblemUnderstanding": "problemUnderstanding",
    "mPremiseCheck": "premiseCheck",
    "mLogicalStructure": "logicalStructure",
    "mEvidenceProvision": "evidenceProvision",
    "mCriticalThinking": "criticalThinking",
    "mCreativeThinking": "creativeThinking",
}


# --- Helper functions ---


def _requireInstructorOrAdmin(user: User) -> None:
    """
    강사 또는 관리자 역할인지 확인하고 아니면 403 에러 발생
    Raises HTTPException 403 if user is neither instructor nor admin.
    """
    tRole = user.mRole.value if isinstance(user.mRole, UserRole) else user.mRole
    if tRole not in (UserRole.INSTRUCTOR.value, UserRole.ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ACCESS_DENIED_DETAIL,
        )


def _isAdmin(user: User) -> bool:
    """
    관리자 역할 여부 확인
    Checks if user has admin role.
    """
    tRole = user.mRole.value if isinstance(user.mRole, UserRole) else user.mRole
    return tRole == UserRole.ADMIN.value


def _extractDimensionScores(analysis: ThoughtAnalysis) -> dict[str, float]:
    """
    ThoughtAnalysis 모델에서 6차원 점수를 딕셔너리로 추출
    Extracts the 6-dimension scores from a ThoughtAnalysis model instance.
    """
    tScores: dict[str, float] = {}
    for tModelField, tDimensionKey in DIMENSION_MODEL_FIELDS.items():
        tScores[tDimensionKey] = float(getattr(analysis, tModelField))
    return tScores


def _computeAverageDimensions(
    analysisList: list[ThoughtAnalysis],
) -> dict[str, float]:
    """
    여러 ThoughtAnalysis의 6차원 점수를 평균 계산
    Computes the mean of each dimension across multiple ThoughtAnalysis records.
    """
    if not analysisList:
        return {key: DEFAULT_DIMENSION_SCORE for key in DIMENSION_LABELS}

    tSums: dict[str, float] = {key: 0.0 for key in DIMENSION_LABELS}
    tCount = len(analysisList)

    for tAnalysis in analysisList:
        tScores = _extractDimensionScores(tAnalysis)
        for tKey, tValue in tScores.items():
            tSums[tKey] += tValue

    return {key: round(value / tCount, 1) for key, value in tSums.items()}


def _generateHeatmapInsight(entries: list[HeatmapEntry]) -> str:
    """
    히트맵 데이터로부터 프로그래밍적 인사이트 생성
    Generates a programmatic AI insight from heatmap data:
    finds the dimension with lowest average across all students
    and reports what percentage of students scored below threshold.
    """
    if not entries:
        return "아직 학생 데이터가 충분하지 않습니다."

    # 전체 학생의 차원별 평균 계산
    tDimensionSums: dict[str, float] = {key: 0.0 for key in DIMENSION_LABELS}
    tStudentCount = len(entries)

    for tEntry in entries:
        for tKey in DIMENSION_LABELS:
            tDimensionSums[tKey] += tEntry.scores.get(tKey, DEFAULT_DIMENSION_SCORE)

    tDimensionAvgs = {
        key: value / tStudentCount for key, value in tDimensionSums.items()
    }

    # 가장 낮은 평균 차원 찾기
    tWeakestDimension = min(tDimensionAvgs, key=lambda k: tDimensionAvgs[k])
    tWeakestLabel = DIMENSION_LABELS[tWeakestDimension]

    # 해당 차원에서 저점 학생 비율 계산
    tLowScoreCount = 0
    for tEntry in entries:
        tScore = tEntry.scores.get(tWeakestDimension, DEFAULT_DIMENSION_SCORE)
        if tScore <= LOW_SCORE_THRESHOLD:
            tLowScoreCount += 1

    tLowScorePercent = round(tLowScoreCount / tStudentCount * 100)

    tInsight = (
        f"전체 학생의 {tLowScorePercent}%가 '{tWeakestLabel}' 영역에서 "
        f"{LOW_SCORE_THRESHOLD}점 이하입니다. "
        f"해당 영역에 대한 집중적인 지도가 필요합니다."
    )

    return tInsight


# --- Endpoints ---


@router.get(
    "/classes",
    response_model=list[ClassSummary],
)
async def listClasses(
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> list[ClassSummary]:
    """
    교실 목록 조회 - 강사: 본인 교실, 관리자: 전체 교실
    List classes for instructor dashboard.
    Instructor sees their own classes; admin sees all.

    Raises:
        HTTPException 403: If user is neither instructor nor admin.
    """
    _requireInstructorOrAdmin(currentUser)

    # 관리자는 전체 교실, 강사는 본인 교실만 조회
    if _isAdmin(currentUser):
        tQuery = (
            select(ClassRoom)
            .options(selectinload(ClassRoom.mEnrollments))
        )
    else:
        tQuery = (
            select(ClassRoom)
            .options(selectinload(ClassRoom.mEnrollments))
            .where(ClassRoom.mInstructorId == currentUser.mId)
        )

    tResult = await db.execute(tQuery)
    tClasses = tResult.scalars().all()

    tSummaries: list[ClassSummary] = []
    for tClassRoom in tClasses:
        tSubject = (
            tClassRoom.mSubject.value
            if hasattr(tClassRoom.mSubject, "value")
            else tClassRoom.mSubject
        )
        tSummary = ClassSummary(
            id=tClassRoom.mId,
            name=tClassRoom.mName,
            subject=tSubject,
            studentCount=len(tClassRoom.mEnrollments),
        )
        tSummaries.append(tSummary)

    return tSummaries


@router.get(
    "/classes/{classId}/students",
    response_model=list[StudentSummary],
)
async def listClassStudents(
    classId: int,
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> list[StudentSummary]:
    """
    교실 학생 목록 조회 - 학생별 세션 수 및 평균 점수 포함
    List enrolled students with session count and average score.
    Accessible by the class instructor or admin.

    Raises:
        HTTPException 403: If user is neither instructor nor admin.
        HTTPException 404: If class not found.
        HTTPException 403: If instructor does not own this class.
    """
    _requireInstructorOrAdmin(currentUser)

    # 교실 존재 여부 및 소유권 확인
    tClassResult = await db.execute(
        select(ClassRoom)
        .options(
            selectinload(ClassRoom.mEnrollments)
            .selectinload(Enrollment.mUser)
        )
        .where(ClassRoom.mId == classId)
    )
    tClassRoom = tClassResult.scalar_one_or_none()

    if tClassRoom is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=CLASS_NOT_FOUND_DETAIL,
        )

    # 강사인 경우 본인 교실인지 확인 (관리자는 모든 교실 접근 가능)
    if not _isAdmin(currentUser) and tClassRoom.mInstructorId != currentUser.mId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=CLASS_ACCESS_DENIED_DETAIL,
        )

    tStudentSummaries: list[StudentSummary] = []

    for tEnrollment in tClassRoom.mEnrollments:
        tStudent = tEnrollment.mUser
        tStudentId = tStudent.mId

        # 학생의 완료된 세션 수 조회
        tSessionCountResult = await db.execute(
            select(func.count(TutoringSession.mId))
            .where(
                TutoringSession.mUserId == tStudentId,
                TutoringSession.mStatus == SessionStatus.COMPLETED,
            )
        )
        tSessionCount = tSessionCountResult.scalar() or 0

        # 학생의 전체 ThoughtAnalysis 평균 점수 계산
        tAnalysisResult = await db.execute(
            select(ThoughtAnalysis)
            .join(Message, ThoughtAnalysis.mMessageId == Message.mId)
            .join(TutoringSession, Message.mSessionId == TutoringSession.mId)
            .where(TutoringSession.mUserId == tStudentId)
        )
        tAnalysisList = list(tAnalysisResult.scalars().all())

        # 전체 6차원 평균을 구한 뒤 그 평균의 총평균을 avgScore로 사용
        tDimensionAvgs = _computeAverageDimensions(tAnalysisList)
        tAvgScore = round(
            sum(tDimensionAvgs.values()) / DIMENSION_COUNT, 1
        )

        tSummary = StudentSummary(
            id=tStudentId,
            name=tStudent.mName,
            sessionCount=tSessionCount,
            avgScore=tAvgScore,
        )
        tStudentSummaries.append(tSummary)

    return tStudentSummaries


@router.get(
    "/classes/{classId}/heatmap",
    response_model=HeatmapResponse,
)
async def getClassHeatmap(
    classId: int,
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> HeatmapResponse:
    """
    교실 히트맵 조회 - 학생별 6차원 점수 매트릭스 + AI 인사이트
    Per-student 6-dimension score matrix for heatmap visualization,
    with programmatic AI insight text.
    Accessible by the class instructor or admin.

    Raises:
        HTTPException 403: If user is neither instructor nor admin.
        HTTPException 404: If class not found.
        HTTPException 403: If instructor does not own this class.
    """
    _requireInstructorOrAdmin(currentUser)

    # 교실 존재 여부 및 소유권 확인
    tClassResult = await db.execute(
        select(ClassRoom)
        .options(
            selectinload(ClassRoom.mEnrollments)
            .selectinload(Enrollment.mUser)
        )
        .where(ClassRoom.mId == classId)
    )
    tClassRoom = tClassResult.scalar_one_or_none()

    if tClassRoom is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=CLASS_NOT_FOUND_DETAIL,
        )

    # 강사인 경우 본인 교실인지 확인
    if not _isAdmin(currentUser) and tClassRoom.mInstructorId != currentUser.mId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=CLASS_ACCESS_DENIED_DETAIL,
        )

    tHeatmapEntries: list[HeatmapEntry] = []

    for tEnrollment in tClassRoom.mEnrollments:
        tStudent = tEnrollment.mUser
        tStudentId = tStudent.mId

        # 학생의 전체 세션에서 모든 ThoughtAnalysis 조회
        tAnalysisResult = await db.execute(
            select(ThoughtAnalysis)
            .join(Message, ThoughtAnalysis.mMessageId == Message.mId)
            .join(TutoringSession, Message.mSessionId == TutoringSession.mId)
            .where(TutoringSession.mUserId == tStudentId)
        )
        tAnalysisList = list(tAnalysisResult.scalars().all())

        # 6차원 평균 점수 계산
        tDimensionScores = _computeAverageDimensions(tAnalysisList)

        tEntry = HeatmapEntry(
            studentId=tStudentId,
            studentName=tStudent.mName,
            scores=tDimensionScores,
        )
        tHeatmapEntries.append(tEntry)

    # 프로그래밍적 AI 인사이트 생성
    tInsight = _generateHeatmapInsight(tHeatmapEntries)

    return HeatmapResponse(
        entries=tHeatmapEntries,
        insight=tInsight,
    )
