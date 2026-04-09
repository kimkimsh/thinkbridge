"""
AI 엔진 - 소크라테스식 튜터링의 핵심 모듈
Core AI engine implementing the 1-tool + text pattern for Socratic tutoring.

Single Claude API call produces:
  [text block]     -> Socratic guiding question (streamable char-by-char)
  [tool_use block] -> analyze_thinking JSON (6-dimension analysis)
"""

import copy
import json
import logging
from typing import AsyncGenerator

import anthropic

from app.config import settings
from app.core.prompts import (
    SOCRATIC_SYSTEM_PROMPT,
    GUEST_SOCRATIC_PROMPT,
    ANALYZE_THINKING_TOOL,
)


logger = logging.getLogger(__name__)

# AI 엔진 상수
CLAUDE_MODEL = "claude-sonnet-4-20250514"
MAX_HISTORY_TURNS = 8
MAX_TOKENS = 2048
API_TIMEOUT_SECONDS = 60.0
MAX_RETRY_COUNT = 1

# 기본 분석 점수 (도구 호출 실패 시 폴백)
DEFAULT_DIMENSION_SCORE = 5
DEFAULT_SOCRATIC_STAGE = 1
DEFAULT_ENGAGEMENT_LEVEL = "active"

# 텍스트 응답이 비어있을 때 사용되는 방어적 기본 메시지
FALLBACK_RESPONSE_TEXT = "좋은 질문이에요! 조금 더 생각해볼까요? 어떤 부분이 가장 궁금한지 말씀해주세요."

DEFAULT_ANALYSIS = {
    "problem_understanding": DEFAULT_DIMENSION_SCORE,
    "premise_check": DEFAULT_DIMENSION_SCORE,
    "logical_structure": DEFAULT_DIMENSION_SCORE,
    "evidence_provision": DEFAULT_DIMENSION_SCORE,
    "critical_thinking": DEFAULT_DIMENSION_SCORE,
    "creative_thinking": DEFAULT_DIMENSION_SCORE,
    "detected_patterns": [],
    "socratic_stage": DEFAULT_SOCRATIC_STAGE,
    "engagement_level": DEFAULT_ENGAGEMENT_LEVEL,
}


def _getDefaultAnalysis() -> dict:
    """기본 분석 dict의 깊은 복사본 반환 (detected_patterns 리스트 공유 방지)"""
    return copy.deepcopy(DEFAULT_ANALYSIS)

# SSE 이벤트 타입 상수
EVENT_TYPE_TOKEN = "token"
EVENT_TYPE_ANALYSIS = "analysis"
EVENT_TYPE_DONE = "done"
EVENT_TYPE_ERROR = "error"

# 도구 관련 상수
TOOL_NAME_ANALYZE_THINKING = "analyze_thinking"
TOOL_CHOICE_AUTO = "auto"

# 컨텐츠 블록 타입 상수
CONTENT_TYPE_TEXT = "text"
CONTENT_TYPE_TOOL_USE = "tool_use"

# 히스토리 요약 관련 상수
HISTORY_SUMMARY_PREFIX = "[이전 대화 요약] "

# 토큰 사용량 키 상수
TOKEN_KEY_INPUT = "input_tokens"
TOKEN_KEY_OUTPUT = "output_tokens"
TOKEN_KEY_MODEL = "model"


_client: anthropic.AsyncAnthropic | None = None


def _getClient() -> anthropic.AsyncAnthropic:
    """Anthropic 비동기 클라이언트 싱글톤 - 커넥션 풀 재사용"""
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=API_TIMEOUT_SECONDS,
        )
    return _client


def _selectSystemPrompt(isGuest: bool) -> str:
    """
    게스트 여부에 따라 시스템 프롬프트 선택
    Guest users get the compressed 5-turn prompt.
    """
    if isGuest:
        return GUEST_SOCRATIC_PROMPT
    return SOCRATIC_SYSTEM_PROMPT


def _buildMessages(
    sessionHistory: list[dict],
    userMessage: str,
) -> list[dict]:
    """
    대화 히스토리를 Claude API 메시지 형식으로 변환
    Applies history windowing: only last MAX_HISTORY_TURNS turns are sent in full.
    Older turns are summarized as a brief system-role message.

    sessionHistory format: [{"role": "user"/"assistant", "content": "..."}]
    """
    tMessages: list[dict] = []

    # 히스토리 윈도우 적용 (MAX_HISTORY_TURNS 초과 시 오래된 메시지 요약)
    tWindowSize = MAX_HISTORY_TURNS * 2  # 각 턴은 user + assistant = 2 메시지
    if len(sessionHistory) > tWindowSize:
        # 오래된 메시지들을 요약하여 첫 메시지로 추가
        tOlderMessages = sessionHistory[:-tWindowSize]
        tSummary = _summarizeOlderMessages(tOlderMessages)
        tMessages.append({"role": "user", "content": tSummary})
        tMessages.append({
            "role": "assistant",
            "content": "네, 이전 대화 내용을 참고하겠습니다. 이어서 진행해볼까요?"
        })
        # 최근 메시지들은 그대로 추가
        tRecentMessages = sessionHistory[-tWindowSize:]
        tMessages.extend(tRecentMessages)
    else:
        tMessages.extend(sessionHistory)

    # 현재 사용자 메시지 추가
    tMessages.append({"role": "user", "content": userMessage})

    return tMessages


def _summarizeOlderMessages(olderMessages: list[dict]) -> str:
    """
    오래된 메시지들을 간략하게 요약
    Produces a short summary of older conversation history to preserve context
    while reducing token usage.
    """
    tUserMessages = [
        msg["content"][:100]
        for msg in olderMessages
        if msg["role"] == "user"
    ]
    tSummaryText = "; ".join(tUserMessages)
    return f"{HISTORY_SUMMARY_PREFIX}학생이 이전에 다음과 같은 내용을 논의했습니다: {tSummaryText}"


def _validateAnalysis(rawAnalysis: dict) -> dict:
    """
    도구 호출 결과의 유효성을 검증하고 안전한 분석 딕셔너리 반환
    Validates all dimension scores are within bounds and engagement level is valid.
    Falls back to defaults for any invalid field.
    """
    tValidated = {}

    # 6차원 점수 검증 (0-10 정수 범위)
    tDimensionKeys = [
        "problem_understanding", "premise_check", "logical_structure",
        "evidence_provision", "critical_thinking", "creative_thinking",
    ]
    for tKey in tDimensionKeys:
        tValue = rawAnalysis.get(tKey)
        if isinstance(tValue, int) and 0 <= tValue <= 10:
            tValidated[tKey] = tValue
        else:
            logger.warning(
                "Invalid dimension score for %s: %s, using default",
                tKey, tValue
            )
            tValidated[tKey] = DEFAULT_DIMENSION_SCORE

    # detected_patterns 검증 (문자열 배열)
    tPatterns = rawAnalysis.get("detected_patterns")
    if isinstance(tPatterns, list) and all(isinstance(p, str) for p in tPatterns):
        tValidated["detected_patterns"] = tPatterns
    else:
        logger.warning("Invalid detected_patterns: %s, using default", tPatterns)
        tValidated["detected_patterns"] = []

    # socratic_stage 검증 (1-5 정수)
    tStage = rawAnalysis.get("socratic_stage")
    if isinstance(tStage, int) and 1 <= tStage <= 5:
        tValidated["socratic_stage"] = tStage
    else:
        logger.warning("Invalid socratic_stage: %s, using default", tStage)
        tValidated["socratic_stage"] = DEFAULT_SOCRATIC_STAGE

    # engagement_level 검증 (enum 값)
    tEngagement = rawAnalysis.get("engagement_level")
    tValidEngagementLevels = {"active", "passive", "stuck"}
    if tEngagement in tValidEngagementLevels:
        tValidated["engagement_level"] = tEngagement
    else:
        logger.warning("Invalid engagement_level: %s, using default", tEngagement)
        tValidated["engagement_level"] = DEFAULT_ENGAGEMENT_LEVEL

    return tValidated


def _parseResponse(response: anthropic.types.Message) -> tuple[str, dict]:
    """
    Claude API 응답에서 텍스트 응답과 도구 호출 분석을 분리 추출
    Extracts text blocks as Socratic response and tool_use blocks as analysis.

    3-stage fallback:
      1. Tool not called -> text as response, default analysis
      2. JSON parse failure -> default analysis, error logged
    """
    tResponseText = ""
    tAnalysis = None

    for tBlock in response.content:
        if tBlock.type == CONTENT_TYPE_TEXT:
            tResponseText += tBlock.text
        elif tBlock.type == CONTENT_TYPE_TOOL_USE:
            if tBlock.name == TOOL_NAME_ANALYZE_THINKING:
                try:
                    # tool_use 블록의 input은 이미 파싱된 dict
                    tAnalysis = _validateAnalysis(tBlock.input)
                except Exception as tError:
                    # Fallback stage 2: JSON 파싱 실패
                    logger.error(
                        "Failed to parse analyze_thinking tool input: %s",
                        tError
                    )
                    tAnalysis = None

    # Fallback stage 1: 도구 호출 없음 -> 기본 분석 사용
    if tAnalysis is None:
        logger.warning("analyze_thinking tool was not called, using default analysis")
        tAnalysis = _getDefaultAnalysis()

    # 텍스트 응답이 비어있는 경우 방어
    if not tResponseText.strip():
        tResponseText = FALLBACK_RESPONSE_TEXT

    return tResponseText, tAnalysis


def _extractTokenUsage(response: anthropic.types.Message) -> dict:
    """Claude API 응답에서 토큰 사용량 추출"""
    return {
        TOKEN_KEY_INPUT: response.usage.input_tokens,
        TOKEN_KEY_OUTPUT: response.usage.output_tokens,
        TOKEN_KEY_MODEL: CLAUDE_MODEL,
    }


async def processTurn(
    sessionHistory: list[dict],
    userMessage: str,
    subject: str,
    isGuest: bool,
) -> tuple[str, dict, dict]:
    """
    비스트리밍 모드로 소크라테스식 응답 + 사고 분석을 생성
    Non-streaming: single API call returns complete response.

    Returns:
        (socraticResponse, analysisDict, tokenUsage)
        - socraticResponse: 소크라테스식 유도 질문 텍스트
        - analysisDict: 6차원 사고 분석 결과
        - tokenUsage: 입출력 토큰 사용량

    3-stage fallback:
        1. Tool not called -> text as response, default analysis (all scores 5)
        2. JSON parse failure -> default analysis, error logged
        3. API timeout/error -> retry once, then raise
    """
    tClient = _getClient()
    tSystemPrompt = _selectSystemPrompt(isGuest)
    tMessages = _buildMessages(sessionHistory, userMessage)

    # 과목 정보를 시스템 프롬프트에 추가
    tFullSystemPrompt = f"{tSystemPrompt}\n\n현재 과목: {subject}"

    tLastError = None
    tAttemptCount = MAX_RETRY_COUNT + 1  # 최초 1회 + 재시도

    for tAttempt in range(tAttemptCount):
        try:
            tResponse = await tClient.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=MAX_TOKENS,
                system=tFullSystemPrompt,
                messages=tMessages,
                tools=[ANALYZE_THINKING_TOOL],
                tool_choice={"type": TOOL_CHOICE_AUTO},
            )

            tSocraticResponse, tAnalysis = _parseResponse(tResponse)
            tTokenUsage = _extractTokenUsage(tResponse)

            return tSocraticResponse, tAnalysis, tTokenUsage

        except anthropic.APITimeoutError as tError:
            # Fallback stage 3: 타임아웃 -> 재시도
            tLastError = tError
            logger.warning(
                "Claude API timeout (attempt %d/%d): %s",
                tAttempt + 1, tAttemptCount, tError
            )
        except anthropic.APIError as tError:
            # Fallback stage 3: API 오류 -> 재시도
            tLastError = tError
            logger.warning(
                "Claude API error (attempt %d/%d): %s",
                tAttempt + 1, tAttemptCount, tError
            )

    # 모든 재시도 실패
    logger.error("All API attempts failed: %s", tLastError)
    raise tLastError


async def processTurnStreaming(
    sessionHistory: list[dict],
    userMessage: str,
    subject: str,
    isGuest: bool,
) -> AsyncGenerator[dict, None]:
    """
    스트리밍 모드로 소크라테스식 응답을 실시간 전송 + 사고 분석 생성
    Streaming: yields SSE events as Claude generates content.

    Yields:
        {"type": "token",    "data": "텍스트 청크"}        - text block delta
        {"type": "analysis", "data": {analysis_json}}      - tool_use complete
        {"type": "done",     "data": {"input_tokens": N, "output_tokens": M, "model": "..."}}
        {"type": "error",    "data": {"message": "..."}}   - on failure

    3-stage fallback:
        1. Tool not called -> yield default analysis at stream end
        2. JSON parse failure -> yield default analysis, error logged
        3. API timeout/error -> retry once, then yield error event
    """
    # 스트리밍은 부분 데이터 전송 후 재시도 시 데이터 중복 위험이 있으므로
    # 재시도하지 않고 즉시 에러 이벤트를 발생시킴
    tClient = _getClient()
    tSystemPrompt = _selectSystemPrompt(isGuest)
    tMessages = _buildMessages(sessionHistory, userMessage)

    # 과목 정보를 시스템 프롬프트에 추가
    tFullSystemPrompt = f"{tSystemPrompt}\n\n현재 과목: {subject}"

    try:
        async for tEvent in _streamFromApi(tClient, tFullSystemPrompt, tMessages):
            yield tEvent

    except (anthropic.APITimeoutError, anthropic.APIError) as tError:
        # Fallback stage 3: 스트리밍 실패 -> 에러 이벤트 전송 (재시도 없음)
        logger.error("Claude API streaming failed: %s", tError)
        yield {
            "type": EVENT_TYPE_ERROR,
            "data": {"message": f"AI 응답 생성에 실패했습니다: {str(tError)}"},
        }


async def _streamFromApi(
    client: anthropic.AsyncAnthropic,
    systemPrompt: str,
    messages: list[dict],
) -> AsyncGenerator[dict, None]:
    """
    Claude API 스트리밍 호출 및 이벤트 변환
    Internal streaming implementation using client.messages.stream() context manager.

    Tracks content block types and accumulates tool_use input JSON
    for parsing when the block completes.
    """
    tToolJsonBuffer = ""
    tToolCallReceived = False
    tHasTextContent = False

    async with client.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=MAX_TOKENS,
        system=systemPrompt,
        messages=messages,
        tools=[ANALYZE_THINKING_TOOL],
        tool_choice={"type": TOOL_CHOICE_AUTO},
    ) as tStream:
        async for tEvent in tStream:
            # 텍스트 블록의 델타 -> 토큰 이벤트로 전송
            if tEvent.type == "content_block_delta":
                if hasattr(tEvent.delta, "text"):
                    tHasTextContent = True
                    yield {
                        "type": EVENT_TYPE_TOKEN,
                        "data": tEvent.delta.text,
                    }
                elif hasattr(tEvent.delta, "partial_json"):
                    # tool_use 블록의 JSON 조각 누적
                    tToolJsonBuffer += tEvent.delta.partial_json

            # tool_use 블록 시작 -> JSON 버퍼 초기화
            elif tEvent.type == "content_block_start":
                if hasattr(tEvent.content_block, "type"):
                    if tEvent.content_block.type == CONTENT_TYPE_TOOL_USE:
                        tToolJsonBuffer = ""

            # 컨텐츠 블록 완료 -> tool_use인 경우 JSON 파싱하여 분석 이벤트 전송
            elif tEvent.type == "content_block_stop":
                if tToolJsonBuffer:
                    tToolCallReceived = True
                    try:
                        tRawAnalysis = json.loads(tToolJsonBuffer)
                        tAnalysis = _validateAnalysis(tRawAnalysis)
                        yield {
                            "type": EVENT_TYPE_ANALYSIS,
                            "data": tAnalysis,
                        }
                    except json.JSONDecodeError as tError:
                        # Fallback stage 2: JSON 파싱 실패
                        logger.error(
                            "Failed to parse streamed tool JSON: %s", tError
                        )
                        yield {
                            "type": EVENT_TYPE_ANALYSIS,
                            "data": _getDefaultAnalysis(),
                        }
                    finally:
                        tToolJsonBuffer = ""

        # 스트림 종료 후 최종 메시지 정보 추출
        tFinalMessage = await tStream.get_final_message()

        # Fallback stage 1: 도구 호출이 없었으면 기본 분석 전송
        if not tToolCallReceived:
            logger.warning(
                "analyze_thinking tool was not called during streaming, "
                "using default analysis"
            )
            yield {
                "type": EVENT_TYPE_ANALYSIS,
                "data": _getDefaultAnalysis(),
            }

        # 텍스트 응답이 없었던 경우: non-streaming으로 재시도하여 실제 응답 획득
        if not tHasTextContent:
            logger.warning("No text content in streaming response, retrying non-streaming")
            try:
                tRetryResponse = await client.messages.create(
                    model=CLAUDE_MODEL,
                    max_tokens=MAX_TOKENS,
                    system=systemPrompt,
                    messages=messages,
                    tools=[ANALYZE_THINKING_TOOL],
                    tool_choice={"type": TOOL_CHOICE_AUTO},
                )
                tRetryText, _tRetryAnalysis = _parseResponse(tRetryResponse)
                yield {
                    "type": EVENT_TYPE_TOKEN,
                    "data": tRetryText,
                }
            except Exception as tRetryError:
                logger.error("Non-streaming retry failed: %s", tRetryError)
                yield {
                    "type": EVENT_TYPE_TOKEN,
                    "data": FALLBACK_RESPONSE_TEXT,
                }

        # 완료 이벤트 (토큰 사용량 포함)
        yield {
            "type": EVENT_TYPE_DONE,
            "data": {
                TOKEN_KEY_INPUT: tFinalMessage.usage.input_tokens,
                TOKEN_KEY_OUTPUT: tFinalMessage.usage.output_tokens,
                TOKEN_KEY_MODEL: CLAUDE_MODEL,
            },
        }
