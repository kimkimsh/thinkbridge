from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.message import MessageWithAnalysis


# 주제 최대 길이 (DB 컬럼 String(255)에 맞춤)
MAX_TOPIC_LENGTH = 255


class SessionCreate(BaseModel):
    """
    세션 생성 요청 스키마 - 과목과 주제 필수
    Session creation request: subject (math/science/essay) and topic required.
    """

    subject: str
    topic: str = Field(..., min_length=1, max_length=MAX_TOPIC_LENGTH)


class SessionResponse(BaseModel):
    """
    세션 응답 스키마 - 세션 목록 및 상세 조회용
    Session information returned from API endpoints.
    Fields are mapped manually from model attributes (mValue) in routers.
    """

    id: int
    subject: str
    topic: str
    status: str
    totalTurns: int
    startedAt: datetime
    endedAt: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SessionDetail(SessionResponse):
    """
    세션 상세 응답 - 메시지 목록 포함
    Session detail including all messages in the conversation.
    """

    messages: list[MessageWithAnalysis] = []
