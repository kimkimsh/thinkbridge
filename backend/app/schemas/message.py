from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# 메시지 내용 최대 길이
MAX_MESSAGE_CONTENT_LENGTH = 5000


class MessageCreate(BaseModel):
    """
    메시지 전송 요청 스키마 - 학생의 채팅 입력
    Student message input for a tutoring session turn.
    """

    content: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CONTENT_LENGTH)


class ThoughtAnalysisResponse(BaseModel):
    """
    사고 분석 응답 스키마 - 블룸의 수정된 분류체계 기반 6차원 분석 결과
    Per-turn AI analysis of student thinking based on Bloom's Revised Taxonomy.
    Fields are mapped manually from model attributes (mValue) in routers.
    """

    problemUnderstanding: int
    premiseCheck: int
    logicalStructure: int
    evidenceProvision: int
    criticalThinking: int
    creativeThinking: int
    detectedPatterns: list[str]
    socraticStage: int
    engagementLevel: str

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """
    메시지 응답 스키마 - 대화 메시지 정보
    Message information returned from API endpoints.
    Fields are mapped manually from model attributes (mValue) in routers.
    """

    id: int
    sessionId: int
    role: str
    content: str
    turnNumber: int
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageWithAnalysis(MessageResponse):
    """
    메시지 + 사고 분석 응답 - 분석 결과가 포함된 메시지
    Message with optional associated thought analysis.
    """

    analysis: ThoughtAnalysisResponse | None = None
