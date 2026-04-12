"""
세션 라우터 - 튜터링 세션 CRUD + SSE 스트리밍 메시지 전송
Session router: create, list, detail, SSE message streaming, and session end.

POST /sessions/{id}/messages is the most critical endpoint -- it streams
Socratic responses via SSE while capturing 6-dimension thought analysis.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.core.security import getCurrentUser
from app.models.user import User, UserRole
from app.models.session import TutoringSession, SessionStatus
from app.models.class_room import SubjectType
from app.models.message import Message, MessageRole
from app.models.thought_analysis import ThoughtAnalysis, EngagementLevel
from app.models.token_usage import TokenUsage
from app.schemas.session import SessionCreate, SessionResponse, SessionDetail
from app.schemas.message import (
    MessageCreate,
    MessageWithAnalysis,
    ThoughtAnalysisResponse,
)
from app.services.ai_engine import (
    processTurnStreaming,
    EVENT_TYPE_TOKEN,
    EVENT_TYPE_ANALYSIS,
    EVENT_TYPE_DONE,
    EVENT_TYPE_ERROR,
    TOKEN_KEY_INPUT,
    TOKEN_KEY_OUTPUT,
    TOKEN_KEY_MODEL,
)


logger = logging.getLogger(__name__)

router = APIRouter()


# --- Constants ---

GUEST_MAX_TURNS = 5
STUCK_CONSECUTIVE_THRESHOLD = 2

# 입력 길이 제한 (DB 컬럼 및 합리적 최대값 기준)
MAX_TOPIC_LENGTH = 255
MAX_MESSAGE_CONTENT_LENGTH = 5000

# 힌트 요청 메시지 접두사
HINT_REQUEST_PREFIX = "[힌트 요청]"

# 정체 감지 시 AI에 전달할 추가 컨텍스트
STUCK_DETECTION_INSTRUCTION = (
    "학생이 어려워하고 있습니다. 더 구체적인 힌트를 제공해주세요."
)

# 유효한 과목 목록
VALID_SUBJECTS = {e.value for e in SubjectType}

# 오류 메시지 상수
SESSION_NOT_FOUND_DETAIL = "세션을 찾을 수 없습니다"
SESSION_NOT_ACTIVE_DETAIL = "종료된 세션에는 메시지를 보낼 수 없습니다"
SESSION_ACCESS_DENIED_DETAIL = "해당 세션에 대한 접근 권한이 없습니다"
GUEST_TURN_LIMIT_DETAIL = "체험 모드의 최대 대화 횟수(5턴)에 도달했습니다. 회원가입하면 무제한으로 이용 가능합니다."
INVALID_SUBJECT_DETAIL = "유효하지 않은 과목입니다. math, science, essay 중 하나를 선택하세요."
SESSION_ALREADY_COMPLETED_DETAIL = "이미 종료된 세션입니다"
TOPIC_TOO_LONG_DETAIL = f"주제는 {MAX_TOPIC_LENGTH}자 이내로 입력해주세요."
MESSAGE_CONTENT_EMPTY_DETAIL = "메시지 내용을 입력해주세요."
MESSAGE_CONTENT_TOO_LONG_DETAIL = f"메시지는 {MAX_MESSAGE_CONTENT_LENGTH}자 이내로 입력해주세요."

# DB 저장 실패 시 클라이언트 알림 (done 이후 error 이벤트로 전송)
DB_SAVE_FAILED_MESSAGE = "응답을 저장하지 못했습니다. 페이지를 새로고침해주세요."
DB_SAVE_FAILED_CODE = "DB_SAVE_FAILED"

# SSE 스트리밍 중 예외 분기별 사용자 메시지/코드
# anthropic.APIError (SDK base exception)과 그 외 예기치 못한 Exception을 구분하여
# 운영자가 로그로 원인을 빠르게 파악할 수 있도록 함.
AI_API_ERROR_MESSAGE = "AI 서비스 일시 오류입니다. 잠시 후 다시 시도해주세요."
AI_API_ERROR_CODE = "AI_API_ERROR"
STREAM_UNEXPECTED_MESSAGE = "스트리밍 중 예상치 못한 오류가 발생했습니다."
STREAM_UNEXPECTED_CODE = "STREAM_UNEXPECTED"

# AI 엔진 분석 결과 snake_case → ThoughtAnalysis 모델 mPascalCase 매핑
ANALYSIS_FIELD_MAPPING = {
    "problem_understanding": "mProblemUnderstanding",
    "premise_check": "mPremiseCheck",
    "logical_structure": "mLogicalStructure",
    "evidence_provision": "mEvidenceProvision",
    "critical_thinking": "mCriticalThinking",
    "creative_thinking": "mCreativeThinking",
    "detected_patterns": "mDetectedPatterns",
    "socratic_stage": "mSocraticStage",
    "engagement_level": "mEngagementLevel",
}


# --- Helper functions ---


def _buildSessionResponse(session: TutoringSession) -> SessionResponse:
    """
    SQLAlchemy TutoringSession 모델을 API 응답 스키마로 변환
    Manually maps model attributes (mValue) to schema fields (camelCase).
    """
    return SessionResponse(
        id=session.mId,
        subject=session.mSubject.value if isinstance(session.mSubject, SubjectType) else session.mSubject,
        topic=session.mTopic,
        status=session.mStatus.value if isinstance(session.mStatus, SessionStatus) else session.mStatus,
        totalTurns=session.mTotalTurns,
        startedAt=session.mStartedAt,
        endedAt=session.mEndedAt,
    )


def _buildAnalysisResponse(analysis: ThoughtAnalysis) -> ThoughtAnalysisResponse:
    """
    SQLAlchemy ThoughtAnalysis 모델을 API 응답 스키마로 변환
    Maps model mPascalCase attributes to schema camelCase fields.
    """
    return ThoughtAnalysisResponse(
        problemUnderstanding=analysis.mProblemUnderstanding,
        premiseCheck=analysis.mPremiseCheck,
        logicalStructure=analysis.mLogicalStructure,
        evidenceProvision=analysis.mEvidenceProvision,
        criticalThinking=analysis.mCriticalThinking,
        creativeThinking=analysis.mCreativeThinking,
        detectedPatterns=analysis.mDetectedPatterns,
        socraticStage=analysis.mSocraticStage,
        engagementLevel=(
            analysis.mEngagementLevel.value
            if isinstance(analysis.mEngagementLevel, EngagementLevel)
            else analysis.mEngagementLevel
        ),
    )


def _buildMessageWithAnalysis(message: Message) -> MessageWithAnalysis:
    """
    SQLAlchemy Message 모델을 분석 포함 API 응답 스키마로 변환
    Maps message with optional thought analysis to response schema.
    """
    tAnalysisResponse = None
    if message.mThoughtAnalysis is not None:
        tAnalysisResponse = _buildAnalysisResponse(message.mThoughtAnalysis)

    return MessageWithAnalysis(
        id=message.mId,
        sessionId=message.mSessionId,
        role=message.mRole.value if isinstance(message.mRole, MessageRole) else message.mRole,
        content=message.mContent,
        turnNumber=message.mTurnNumber,
        createdAt=message.mCreatedAt,
        analysis=tAnalysisResponse,
    )


def _mapAnalysisToModel(analysisDict: dict) -> dict:
    """
    AI 엔진 분석 결과(snake_case)를 ThoughtAnalysis 모델 필드(mPascalCase)로 매핑
    Converts AI engine output keys to SQLAlchemy model attribute names.
    """
    tMapped = {}
    for tSnakeKey, tModelKey in ANALYSIS_FIELD_MAPPING.items():
        if tSnakeKey in analysisDict:
            tMapped[tModelKey] = analysisDict[tSnakeKey]
    return tMapped


def _buildSessionHistory(messages: list[Message]) -> list[dict]:
    """
    세션 메시지 목록을 AI 엔진이 요구하는 히스토리 형식으로 변환
    Converts DB message records to the format expected by processTurnStreaming.
    """
    tHistory = []
    for tMsg in messages:
        tRole = tMsg.mRole.value if isinstance(tMsg.mRole, MessageRole) else tMsg.mRole
        tHistory.append({
            "role": tRole,
            "content": tMsg.mContent,
        })
    return tHistory


def _detectStuckState(messages: list[Message]) -> bool:
    """
    연속 정체 상태 감지 - 최근 AI 응답 2개의 engagement_level이 'stuck'인지 확인
    Checks if the last STUCK_CONSECUTIVE_THRESHOLD assistant messages had 'stuck' engagement.
    """
    # AI 응답 메시지만 역순으로 필터링 (최근 것부터)
    tAssistantMessages = [
        msg for msg in reversed(messages)
        if (msg.mRole.value if isinstance(msg.mRole, MessageRole) else msg.mRole) == MessageRole.ASSISTANT.value
    ]

    # 충분한 AI 응답이 없으면 정체 아님
    if len(tAssistantMessages) < STUCK_CONSECUTIVE_THRESHOLD:
        return False

    # 최근 STUCK_CONSECUTIVE_THRESHOLD개의 AI 응답 분석 확인
    tStuckCount = 0
    for tMsg in tAssistantMessages[:STUCK_CONSECUTIVE_THRESHOLD]:
        tAnalysis = tMsg.mThoughtAnalysis
        if tAnalysis is not None:
            tEngagement = (
                tAnalysis.mEngagementLevel.value
                if isinstance(tAnalysis.mEngagementLevel, EngagementLevel)
                else tAnalysis.mEngagementLevel
            )
            if tEngagement == EngagementLevel.STUCK.value:
                tStuckCount += 1

    return tStuckCount >= STUCK_CONSECUTIVE_THRESHOLD


# --- Endpoints ---


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def createSession(
    request: SessionCreate,
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """
    새 튜터링 세션 생성 - 과목과 주제를 지정하여 AI 튜터링 시작
    Create a new tutoring session with subject and topic.

    Raises:
        HTTPException 400: If subject is invalid.
    """
    # 과목 유효성 검사
    if request.subject not in VALID_SUBJECTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INVALID_SUBJECT_DETAIL,
        )

    # 주제 길이 유효성 검사 (DB 컬럼 String(255) 초과 방지)
    if len(request.topic) > MAX_TOPIC_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=TOPIC_TOO_LONG_DETAIL,
        )

    tSession = TutoringSession()
    tSession.mUserId = currentUser.mId
    tSession.mSubject = SubjectType(request.subject)
    tSession.mTopic = request.topic
    tSession.mStatus = SessionStatus.ACTIVE
    tSession.mTotalTurns = 0

    db.add(tSession)
    await db.commit()
    await db.refresh(tSession)

    return _buildSessionResponse(tSession)


@router.get("", response_model=list[SessionResponse])
async def listSessions(
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> list[SessionResponse]:
    """
    내 세션 목록 조회 - 최근 시작 순으로 정렬
    List all sessions for the current user, ordered by started_at descending.
    """
    tResult = await db.execute(
        select(TutoringSession)
        .where(TutoringSession.mUserId == currentUser.mId)
        .order_by(TutoringSession.mStartedAt.desc())
    )
    tSessions = tResult.scalars().all()

    return [_buildSessionResponse(s) for s in tSessions]


@router.get("/{sessionId}", response_model=SessionDetail)
async def getSessionDetail(
    sessionId: int,
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> SessionDetail:
    """
    세션 상세 조회 - 메시지 목록과 사고 분석 포함
    Session detail with all messages and their thought analyses.
    Accessible by session owner or instructor role.

    Raises:
        HTTPException 404: If session not found.
        HTTPException 403: If user has no access to this session.
    """
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=SESSION_NOT_FOUND_DETAIL,
        )

    # 세션 소유자이거나 강사 역할인 경우 접근 허용
    tIsOwner = tSession.mUserId == currentUser.mId
    tIsInstructor = (
        currentUser.mRole.value if isinstance(currentUser.mRole, UserRole) else currentUser.mRole
    ) == UserRole.INSTRUCTOR.value
    tIsAdmin = (
        currentUser.mRole.value if isinstance(currentUser.mRole, UserRole) else currentUser.mRole
    ) == UserRole.ADMIN.value

    if not (tIsOwner or tIsInstructor or tIsAdmin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=SESSION_ACCESS_DENIED_DETAIL,
        )

    # 메시지를 턴 번호 순으로 정렬
    tSortedMessages = sorted(tSession.mMessages, key=lambda m: m.mTurnNumber)
    tMessageResponses = [_buildMessageWithAnalysis(m) for m in tSortedMessages]

    tResponse = SessionDetail(
        id=tSession.mId,
        subject=tSession.mSubject.value if isinstance(tSession.mSubject, SubjectType) else tSession.mSubject,
        topic=tSession.mTopic,
        status=tSession.mStatus.value if isinstance(tSession.mStatus, SessionStatus) else tSession.mStatus,
        totalTurns=tSession.mTotalTurns,
        startedAt=tSession.mStartedAt,
        endedAt=tSession.mEndedAt,
        messages=tMessageResponses,
    )

    return tResponse


@router.post("/{sessionId}/messages")
async def sendMessage(
    sessionId: int,
    request: MessageCreate,
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> EventSourceResponse:
    """
    SSE 스트리밍 메시지 전송 - 소크라테스식 AI 응답을 실시간 스트리밍
    Most critical endpoint: streams Socratic AI response via SSE
    while collecting 6-dimension thought analysis.

    SSE event format:
      event: token   data: "텍스트 청크"
      event: analysis data: {...analysis_json}
      event: done    data: {...token_usage}
      event: error   data: {"message": "..."}

    Raises:
        HTTPException 404: If session not found.
        HTTPException 403: If session doesn't belong to user, or guest turn limit reached.
        HTTPException 400: If session is not active.
    """
    # 1. 세션 유효성 검증
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=SESSION_NOT_FOUND_DETAIL,
        )

    # 세션 소유자 확인
    if tSession.mUserId != currentUser.mId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=SESSION_ACCESS_DENIED_DETAIL,
        )

    # 세션 활성 상태 확인
    tSessionStatus = (
        tSession.mStatus.value
        if isinstance(tSession.mStatus, SessionStatus)
        else tSession.mStatus
    )
    if tSessionStatus != SessionStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=SESSION_NOT_ACTIVE_DETAIL,
        )

    # 2. 메시지 내용 유효성 검사 (CAS 증가 전에 먼저 검사하여 무효 요청이 턴을 소비하지 않게 함)
    if not request.content or not request.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=MESSAGE_CONTENT_EMPTY_DETAIL,
        )

    if len(request.content) > MAX_MESSAGE_CONTENT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=MESSAGE_CONTENT_TOO_LONG_DETAIL,
        )

    # 3. 게스트 턴 제한 원자적 체크 및 증가 (CAS 패턴)
    # SQLAlchemy async + Supabase Pooler 환경에서 SELECT FOR UPDATE가 동시 요청 직렬화에 실패함을 실측
    # (docs/work_log/09_sse_and_race_hardening.md 참조).
    # 대안: DB 레벨 UPDATE ... WHERE mTotalTurns < GUEST_MAX_TURNS ... RETURNING 으로 원자적 check-and-increment.
    if currentUser.mIsGuest:
        tAtomicIncrement = (
            update(TutoringSession)
            .where(TutoringSession.mId == sessionId)
            .where(TutoringSession.mTotalTurns < GUEST_MAX_TURNS)
            .values(mTotalTurns=TutoringSession.mTotalTurns + 1)
            .returning(TutoringSession.mTotalTurns)
        )
        tCasResult = await db.execute(tAtomicIncrement)
        tIncrementedTurns = tCasResult.scalar_one_or_none()
        if tIncrementedTurns is None:
            # UPDATE의 WHERE 조건이 매칭되지 않음 = 이미 5턴 한도 도달
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=GUEST_TURN_LIMIT_DETAIL,
            )
        tNewTurnNumber = tIncrementedTurns
    else:
        # 비게스트는 턴 제한 없음 — 단순 increment (ORM이 commit 시 flush)
        tNewTurnNumber = tSession.mTotalTurns + 1
        tSession.mTotalTurns = tNewTurnNumber

    # 4. 사용자 메시지를 DB에 저장
    tUserMessage = Message()
    tUserMessage.mSessionId = sessionId
    tUserMessage.mRole = MessageRole.USER
    tUserMessage.mContent = request.content
    tUserMessage.mTurnNumber = tNewTurnNumber

    db.add(tUserMessage)
    await db.flush()

    # 4. 세션 히스토리 구축 (기존 메시지들)
    tSortedMessages = sorted(tSession.mMessages, key=lambda m: m.mTurnNumber)
    tSessionHistory = _buildSessionHistory(tSortedMessages)

    # 5. 정체 감지 - 연속 stuck 상태인 경우 추가 컨텍스트 삽입
    tIsStuck = _detectStuckState(tSortedMessages)

    # 6. 힌트 요청 처리 + 정체 감지 컨텍스트 결합
    tActualContent = request.content

    # 힌트 요청 감지: [힌트 요청] 접두사를 제거하고 힌트 컨텍스트 추가
    tIsHintRequest = tActualContent.startswith(HINT_REQUEST_PREFIX)
    if tIsHintRequest:
        tActualContent = tActualContent[len(HINT_REQUEST_PREFIX):].strip()
        tActualContent = f"{STUCK_DETECTION_INSTRUCTION}\n\n{tActualContent}"
        logger.info(
            "Hint request detected for session %d (turn %d)",
            sessionId, tNewTurnNumber
        )

    if tIsStuck and not tIsHintRequest:
        tActualContent = f"{STUCK_DETECTION_INSTRUCTION}\n\n{tActualContent}"
        logger.info(
            "Stuck detection triggered for session %d (turn %d)",
            sessionId, tNewTurnNumber
        )

    # 7. 과목 정보 추출
    tSubject = (
        tSession.mSubject.value
        if isinstance(tSession.mSubject, SubjectType)
        else tSession.mSubject
    )

    # 8. DB 세션 참조를 클로저 밖에서 캡처할 값들 저장
    tSessionId = sessionId
    tUserId = currentUser.mId
    tIsGuest = currentUser.mIsGuest
    tTurnNumber = tNewTurnNumber

    # flush된 상태에서 커밋 (사용자 메시지 저장 완료)
    await db.commit()

    async def generateSseEvents():
        """
        SSE 이벤트 생성기 - AI 스트리밍 응답을 SSE 이벤트로 변환
        Streams tokens from AI engine, then saves AI message + analysis + token usage on done.
        """
        tCollectedText = ""
        tAnalysisData = None
        tTokenUsageData = None
        tHasError = False

        try:
            async for tEvent in processTurnStreaming(
                sessionHistory=tSessionHistory,
                userMessage=tActualContent,
                subject=tSubject,
                isGuest=tIsGuest,
            ):
                tEventType = tEvent["type"]
                tEventData = tEvent["data"]

                if tEventType == EVENT_TYPE_TOKEN:
                    # 텍스트 청크를 클라이언트에 실시간 전송하면서 수집
                    tCollectedText += tEventData
                    yield {
                        "event": EVENT_TYPE_TOKEN,
                        "data": json.dumps(tEventData, ensure_ascii=False),
                    }

                elif tEventType == EVENT_TYPE_ANALYSIS:
                    # 분석 결과를 버퍼에 저장하고 클라이언트에 전송
                    tAnalysisData = tEventData
                    yield {
                        "event": EVENT_TYPE_ANALYSIS,
                        "data": json.dumps(tEventData, ensure_ascii=False),
                    }

                elif tEventType == EVENT_TYPE_DONE:
                    # 토큰 사용량 저장하고 완료 이벤트 전송
                    tTokenUsageData = tEventData
                    yield {
                        "event": EVENT_TYPE_DONE,
                        "data": json.dumps(tEventData, ensure_ascii=False),
                    }

                elif tEventType == EVENT_TYPE_ERROR:
                    # 에러 이벤트 전달
                    tHasError = True
                    yield {
                        "event": EVENT_TYPE_ERROR,
                        "data": json.dumps(tEventData, ensure_ascii=False),
                    }

        except asyncio.CancelledError:
            # Python 3.8+ BaseException subclass — 현재도 except Exception에 포착 안 되나
            # 명시적 처리로 의도 표현 + 향후 refactor 방어.
            logger.info("Client disconnected during streaming for session %d", tSessionId)
            raise
        except anthropic.APIError as tApiError:
            # Anthropic SDK 레벨 에러 (타임아웃, 5xx, 429 등) — logger.exception으로 traceback 기록
            logger.exception("Anthropic API error during streaming for session %d", tSessionId)
            tHasError = True
            yield {
                "event": EVENT_TYPE_ERROR,
                "data": json.dumps(
                    {
                        "message": AI_API_ERROR_MESSAGE,
                        "code": AI_API_ERROR_CODE,
                    },
                    ensure_ascii=False,
                ),
            }
        except Exception as tError:
            # 예기치 않은 스트리밍 오류 — traceback 전체 기록 (logger.exception)
            logger.exception("Unexpected streaming error for session %d", tSessionId)
            tHasError = True
            yield {
                "event": EVENT_TYPE_ERROR,
                "data": json.dumps(
                    {
                        "message": STREAM_UNEXPECTED_MESSAGE,
                        "code": STREAM_UNEXPECTED_CODE,
                    },
                    ensure_ascii=False,
                ),
            }

        # 스트림 완료 후 DB에 AI 응답 + 분석 + 토큰 사용량 저장
        if not tHasError and tCollectedText:
            try:
                await _saveAiResponseToDb(
                    sessionId=tSessionId,
                    turnNumber=tTurnNumber,
                    responseText=tCollectedText,
                    analysisData=tAnalysisData,
                    tokenUsageData=tTokenUsageData,
                )
            except Exception as tSaveError:
                # 스트림은 이미 done 이벤트 전송 완료된 상태 — 추가로 error 이벤트를 yield하여
                # 클라이언트가 "저장 실패" 상태를 인지하고 새로고침/재시도할 수 있게 함.
                # 자세한 맥락: docs/revise_plan_v3/01_critical_fixes.md P0-2
                logger.exception(
                    "Failed to save AI response to DB for session %d",
                    tSessionId,
                )
                yield {
                    "event": EVENT_TYPE_ERROR,
                    "data": json.dumps(
                        {
                            "message": DB_SAVE_FAILED_MESSAGE,
                            "code": DB_SAVE_FAILED_CODE,
                        },
                        ensure_ascii=False,
                    ),
                }

    return EventSourceResponse(generateSseEvents())


async def _saveAiResponseToDb(
    sessionId: int,
    turnNumber: int,
    responseText: str,
    analysisData: dict | None,
    tokenUsageData: dict | None,
) -> None:
    """
    스트리밍 완료 후 AI 응답, 사고 분석, 토큰 사용량을 DB에 저장
    Saves the complete AI response, thought analysis, and token usage after streaming finishes.
    Uses a new DB session since the original may have been closed.
    """
    from app.database import async_session_maker

    async with async_session_maker() as tDb:
        try:
            # AI 어시스턴트 메시지 저장
            tAiMessage = Message()
            tAiMessage.mSessionId = sessionId
            tAiMessage.mRole = MessageRole.ASSISTANT
            tAiMessage.mContent = responseText
            tAiMessage.mTurnNumber = turnNumber

            tDb.add(tAiMessage)
            await tDb.flush()

            # 사고 분석 저장 (분석 데이터가 있는 경우)
            if analysisData is not None:
                tMappedAnalysis = _mapAnalysisToModel(analysisData)
                tAnalysis = ThoughtAnalysis()
                tAnalysis.mMessageId = tAiMessage.mId
                tAnalysis.mProblemUnderstanding = tMappedAnalysis.get("mProblemUnderstanding", 5)
                tAnalysis.mPremiseCheck = tMappedAnalysis.get("mPremiseCheck", 5)
                tAnalysis.mLogicalStructure = tMappedAnalysis.get("mLogicalStructure", 5)
                tAnalysis.mEvidenceProvision = tMappedAnalysis.get("mEvidenceProvision", 5)
                tAnalysis.mCriticalThinking = tMappedAnalysis.get("mCriticalThinking", 5)
                tAnalysis.mCreativeThinking = tMappedAnalysis.get("mCreativeThinking", 5)
                tAnalysis.mDetectedPatterns = tMappedAnalysis.get("mDetectedPatterns", [])
                tAnalysis.mSocraticStage = tMappedAnalysis.get("mSocraticStage", 1)
                tAnalysis.mEngagementLevel = EngagementLevel(
                    tMappedAnalysis.get("mEngagementLevel", "active")
                )

                tDb.add(tAnalysis)

            # 토큰 사용량 저장 (토큰 데이터가 있는 경우)
            if tokenUsageData is not None:
                tUsage = TokenUsage()
                tUsage.mSessionId = sessionId
                tUsage.mInputTokens = tokenUsageData.get(TOKEN_KEY_INPUT, 0)
                tUsage.mOutputTokens = tokenUsageData.get(TOKEN_KEY_OUTPUT, 0)
                tUsage.mModel = tokenUsageData.get(TOKEN_KEY_MODEL, "unknown")

                tDb.add(tUsage)

            # 세션 총 턴 수는 사용자 메시지 저장 시 이미 업데이트됨 (sendMessage에서)
            await tDb.commit()
            logger.info(
                "Saved AI response for session %d, turn %d",
                sessionId, turnNumber,
            )

        except Exception as tError:
            await tDb.rollback()
            logger.exception(
                "CRITICAL: AI response DB save failed for session %d, turn %d. "
                "Client-side state may diverge from DB.",
                sessionId, turnNumber,
            )
            raise  # keep existing re-raise


@router.patch("/{sessionId}/end", response_model=SessionResponse)
async def endSession(
    sessionId: int,
    currentUser: User = Depends(getCurrentUser),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """
    세션 종료 - 상태를 completed로 변경하고 종료 시각 기록
    End a tutoring session: set status to completed and record end time.
    Report generation will be triggered asynchronously (when report_generator is available).

    Raises:
        HTTPException 404: If session not found.
        HTTPException 403: If session doesn't belong to user.
        HTTPException 400: If session is already completed.
    """
    tResult = await db.execute(
        select(TutoringSession).where(TutoringSession.mId == sessionId)
    )
    tSession = tResult.scalar_one_or_none()

    if tSession is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=SESSION_NOT_FOUND_DETAIL,
        )

    # 세션 소유자 확인
    if tSession.mUserId != currentUser.mId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=SESSION_ACCESS_DENIED_DETAIL,
        )

    # 이미 완료된 세션 확인
    tSessionStatus = (
        tSession.mStatus.value
        if isinstance(tSession.mStatus, SessionStatus)
        else tSession.mStatus
    )
    if tSessionStatus == SessionStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=SESSION_ALREADY_COMPLETED_DETAIL,
        )

    # 세션 종료 처리
    tSession.mStatus = SessionStatus.COMPLETED
    tSession.mEndedAt = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(tSession)

    # 리포트 자동 생성 (비동기 백그라운드 처리)
    try:
        from app.services.report_generator import generateSessionReport
        await generateSessionReport(sessionId=sessionId, db=db)
        logger.info("Auto-generated report for session %d", sessionId)
    except Exception as tReportError:
        # 리포트 생성 실패해도 세션 종료는 성공으로 처리
        logger.error(
            "Failed to auto-generate report for session %d: %s",
            sessionId, tReportError,
        )

    logger.info("Session %d ended by user %d", sessionId, currentUser.mId)

    return _buildSessionResponse(tSession)
