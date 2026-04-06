"""
리포트 생성 서비스 - 세션 종료 시 학습 분석 리포트를 프로그래밍적으로 생성
Report generator service: programmatically builds session reports
and student growth trends without Claude API calls (speed priority).
Claude-based narrative can be layered on in Task 13 (prompt tuning).
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.session import TutoringSession, SessionStatus
from app.models.message import Message, MessageRole
from app.models.thought_analysis import ThoughtAnalysis
from app.models.report import Report
from app.schemas.report import GrowthTrendEntry


logger = logging.getLogger(__name__)


# --- Constants ---

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

# 성장 분석에서 초반/후반 분할 비율
EARLY_TURN_RATIO = 0.5

# 유의미한 점수 차이 임계값
GROWTH_THRESHOLD = 1.0

# 6차원 총점 수
DIMENSION_COUNT = 6

# 기본 점수 (분석 데이터 없을 때)
DEFAULT_DIMENSION_SCORE = 5.0


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
    Returns default scores if the list is empty.
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


def _findStrongestDimension(dimensionScores: dict[str, float]) -> str:
    """
    가장 높은 점수의 차원 키 반환
    Returns the dimension key with the highest average score.
    """
    return max(dimensionScores, key=lambda k: dimensionScores[k])


def _findWeakestDimension(dimensionScores: dict[str, float]) -> str:
    """
    가장 낮은 점수의 차원 키 반환
    Returns the dimension key with the lowest average score.
    """
    return min(dimensionScores, key=lambda k: dimensionScores[k])


def _analyzeGrowthPattern(
    analysisList: list[ThoughtAnalysis],
) -> str:
    """
    초반 vs 후반 턴 비교로 성장 패턴을 분석하여 한국어 설명 반환
    Compares early turns vs late turns to determine if growth occurred.
    """
    if len(analysisList) < 2:
        return "충분한 대화 데이터가 없어 성장 패턴을 분석할 수 없습니다."

    tMidpoint = max(1, int(len(analysisList) * EARLY_TURN_RATIO))
    tEarlyAnalyses = analysisList[:tMidpoint]
    tLateAnalyses = analysisList[tMidpoint:]

    tEarlyAvg = _computeAverageDimensions(tEarlyAnalyses)
    tLateAvg = _computeAverageDimensions(tLateAnalyses)

    # 전체 평균 점수 비교
    tEarlyOverall = sum(tEarlyAvg.values()) / DIMENSION_COUNT
    tLateOverall = sum(tLateAvg.values()) / DIMENSION_COUNT
    tDiff = tLateOverall - tEarlyOverall

    # 가장 크게 성장한 영역 찾기
    tGrowthByDimension = {
        key: tLateAvg[key] - tEarlyAvg[key] for key in DIMENSION_LABELS
    }
    tMostImproved = max(tGrowthByDimension, key=lambda k: tGrowthByDimension[k])
    tMostImprovedLabel = DIMENSION_LABELS[tMostImproved]

    if tDiff >= GROWTH_THRESHOLD:
        return (
            f"대화 초반 대비 후반에 전반적인 사고력이 향상되었습니다. "
            f"특히 '{tMostImprovedLabel}' 영역에서 눈에 띄는 성장을 보였습니다."
        )
    elif tDiff <= -GROWTH_THRESHOLD:
        return (
            f"대화가 진행되면서 집중도가 다소 떨어지는 경향이 있었습니다. "
            f"다음 세션에서는 '{tMostImprovedLabel}' 영역을 집중적으로 다뤄보는 것을 권장합니다."
        )
    else:
        return (
            f"대화 전반에 걸쳐 안정적인 사고력을 유지했습니다. "
            f"'{tMostImprovedLabel}' 영역에서 소폭의 변화가 관찰되었습니다."
        )


def _generateProgrammaticSummary(
    session: TutoringSession,
    analysisList: list[ThoughtAnalysis],
    dimensionScores: dict[str, float],
) -> str:
    """
    프로그래밍적으로 한국어 서술형 요약을 생성
    Generates a Korean narrative summary without Claude API call.
    Includes: total turns, subject, topic, strongest/weakest dimensions,
    growth pattern, and encouragement.
    """
    tSubject = (
        session.mSubject.value
        if hasattr(session.mSubject, "value")
        else session.mSubject
    )
    tTopic = session.mTopic
    tTotalTurns = session.mTotalTurns

    # 과목 한국어 레이블
    tSubjectLabels: dict[str, str] = {
        "math": "수학",
        "science": "과학",
        "essay": "논술",
    }
    tSubjectKorean = tSubjectLabels.get(tSubject, tSubject)

    # 가장 강한/약한 차원
    tStrongest = _findStrongestDimension(dimensionScores)
    tWeakest = _findWeakestDimension(dimensionScores)
    tStrongestLabel = DIMENSION_LABELS[tStrongest]
    tWeakestLabel = DIMENSION_LABELS[tWeakest]
    tStrongestScore = dimensionScores[tStrongest]
    tWeakestScore = dimensionScores[tWeakest]

    # 성장 패턴 분석
    tGrowthDescription = _analyzeGrowthPattern(analysisList)

    # 전체 평균 점수
    tOverallAvg = round(
        sum(dimensionScores.values()) / DIMENSION_COUNT, 1
    )

    # 사고 전환 횟수 (소크라테스 단계 변화 횟수 세기)
    tStageTransitions = 0
    tPreviousStage = None
    for tAnalysis in analysisList:
        if tPreviousStage is not None and tAnalysis.mSocraticStage != tPreviousStage:
            tStageTransitions += 1
        tPreviousStage = tAnalysis.mSocraticStage

    tSummary = (
        f"[{tSubjectKorean}] '{tTopic}' 주제로 총 {tTotalTurns}번의 대화를 진행했습니다.\n\n"
        f"{tStageTransitions}번의 사고 전환을 거쳐 스스로 답에 도달하는 과정을 경험했습니다. "
        f"전체 평균 사고력 점수는 {tOverallAvg}점입니다.\n\n"
        f"강점 영역: '{tStrongestLabel}'({tStrongestScore}점)에서 가장 뛰어난 사고력을 보여주었습니다. "
        f"보완 영역: '{tWeakestLabel}'({tWeakestScore}점)은 추가적인 연습이 도움이 될 것입니다.\n\n"
        f"{tGrowthDescription}"
    )

    return tSummary


async def generateSessionReport(
    sessionId: int,
    db: AsyncSession,
) -> Report:
    """
    세션 리포트 생성 - 6차원 점수 집계 및 서술형 요약 생성 후 DB에 저장
    Generates a session report by aggregating ThoughtAnalysis scores
    and producing a programmatic Korean narrative summary.

    Args:
        sessionId: Target session ID.
        db: Async database session.

    Returns:
        The newly created Report model instance.

    Raises:
        ValueError: If the session is not found.
    """
    # 1. 세션과 메시지+분석 데이터를 함께 로드
    tResult = await db.execute(
        select(TutoringSession)
        .options(
            selectinload(TutoringSession.mMessages)
            .selectinload(Message.mThoughtAnalysis)
        )
        .where(TutoringSession.mId == sessionId)
    )
    tSession = tResult.scalar_one_or_none()

    if tSession is None:
        raise ValueError(f"Session not found: {sessionId}")

    # 2. AI 응답 메시지에서 ThoughtAnalysis 수집 (턴 순서대로)
    tSortedMessages = sorted(tSession.mMessages, key=lambda m: m.mTurnNumber)
    tAnalysisList: list[ThoughtAnalysis] = []
    for tMsg in tSortedMessages:
        if tMsg.mThoughtAnalysis is not None:
            tAnalysisList.append(tMsg.mThoughtAnalysis)

    # 3. 6차원 점수 평균 집계
    tDimensionScores = _computeAverageDimensions(tAnalysisList)

    # 4. 프로그래밍적 서술형 요약 생성
    tSummary = _generateProgrammaticSummary(
        session=tSession,
        analysisList=tAnalysisList,
        dimensionScores=tDimensionScores,
    )

    # 5. Report 모델 생성 및 DB 저장
    tReport = Report()
    tReport.mSessionId = sessionId
    tReport.mSummary = tSummary
    tReport.mDimensionScores = tDimensionScores
    tReport.mGeneratedAt = datetime.now(timezone.utc)

    db.add(tReport)
    await db.commit()
    await db.refresh(tReport)

    logger.info("Generated report for session %d", sessionId)

    return tReport


async def getStudentGrowthTrend(
    studentId: int,
    db: AsyncSession,
) -> list[GrowthTrendEntry]:
    """
    학생의 성장 추세 데이터 조회 - 완료된 세션별 6차원 평균 점수 시계열
    Loads all completed sessions for a student and computes per-session
    average dimension scores for growth trend visualization.

    Args:
        studentId: Target student user ID.
        db: Async database session.

    Returns:
        Time-ordered list of GrowthTrendEntry objects for chart rendering.
    """
    # 완료된 세션만 시작 시각 순으로 조회 (메시지+분석 관계 포함)
    tResult = await db.execute(
        select(TutoringSession)
        .options(
            selectinload(TutoringSession.mMessages)
            .selectinload(Message.mThoughtAnalysis)
        )
        .where(
            TutoringSession.mUserId == studentId,
            TutoringSession.mStatus == SessionStatus.COMPLETED,
        )
        .order_by(TutoringSession.mStartedAt.asc())
    )
    tSessions = tResult.scalars().all()

    tTrendEntries: list[GrowthTrendEntry] = []

    for tSession in tSessions:
        # 각 세션의 ThoughtAnalysis 수집
        tAnalysisList: list[ThoughtAnalysis] = []
        for tMsg in tSession.mMessages:
            if tMsg.mThoughtAnalysis is not None:
                tAnalysisList.append(tMsg.mThoughtAnalysis)

        # 6차원 평균 점수 계산
        tDimensionScores = _computeAverageDimensions(tAnalysisList)

        # 세션 시작 날짜 결정 (종료 날짜 우선, 없으면 시작 날짜)
        tDate = tSession.mEndedAt if tSession.mEndedAt else tSession.mStartedAt

        tEntry = GrowthTrendEntry(
            sessionId=tSession.mId,
            date=tDate,
            problemUnderstanding=tDimensionScores["problemUnderstanding"],
            premiseCheck=tDimensionScores["premiseCheck"],
            logicalStructure=tDimensionScores["logicalStructure"],
            evidenceProvision=tDimensionScores["evidenceProvision"],
            criticalThinking=tDimensionScores["criticalThinking"],
            creativeThinking=tDimensionScores["creativeThinking"],
        )
        tTrendEntries.append(tEntry)

    return tTrendEntries
