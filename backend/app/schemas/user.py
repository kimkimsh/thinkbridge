from pydantic import BaseModel, ConfigDict, Field


class UserRegister(BaseModel):
    """
    회원가입 요청 스키마 - 학생 또는 강사 등록
    Registration request: student or instructor account creation.
    """

    email: str
    name: str
    password: str = Field(min_length=4)
    role: str = "student"


class UserLogin(BaseModel):
    """
    로그인 요청 스키마
    Login request: email + password authentication.
    """

    email: str
    password: str


class UserResponse(BaseModel):
    """
    사용자 응답 스키마 - API에서 반환되는 사용자 정보
    User information returned from API endpoints.
    Fields are mapped manually from model attributes (mValue) in routers.
    """

    id: int
    email: str
    name: str
    role: str
    isGuest: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """
    인증 토큰 응답 - 로그인/회원가입 성공 시 반환
    Authentication token returned on successful login or registration.
    """

    accessToken: str
    tokenType: str = "bearer"
    user: UserResponse


class GuestResponse(BaseModel):
    """
    게스트 세션 응답 - 비회원 5턴 체험용
    Guest session response: includes max turn limit for trial experience.
    """

    accessToken: str
    tokenType: str = "bearer"
    user: UserResponse
    maxTurns: int = 5
