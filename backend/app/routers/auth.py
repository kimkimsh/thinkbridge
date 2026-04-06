import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    GuestResponse,
)
from app.core.security import (
    hashPassword,
    verifyPassword,
    createAccessToken,
    JWT_SUBJECT_KEY,
)


# --- Constants ---

GUEST_EMAIL_DOMAIN = "thinkbridge.ai"
GUEST_NAME_PREFIX = "체험 사용자"
GUEST_MAX_TURNS = 5
ALLOWED_REGISTRATION_ROLES = {"student", "instructor"}

EMAIL_ALREADY_EXISTS_DETAIL = "이미 등록된 이메일입니다"
INVALID_ROLE_DETAIL = "유효하지 않은 역할입니다. student 또는 instructor만 가능합니다"
INVALID_CREDENTIALS_DETAIL = "이메일 또는 비밀번호가 올바르지 않습니다"

router = APIRouter()


def _buildUserResponse(user: User) -> UserResponse:
    """
    SQLAlchemy User 모델을 API 응답 스키마로 변환
    Manually maps model attributes (mValue) to schema fields (camelCase).
    """
    return UserResponse(
        id=user.mId,
        email=user.mEmail,
        name=user.mName,
        role=user.mRole.value,
        isGuest=user.mIsGuest,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    request: UserRegister,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    회원가입 - 학생 또는 강사 계정 생성
    Create a new student or instructor account with email, name, and password.

    Returns:
        TokenResponse with JWT access token and user info.

    Raises:
        HTTPException 400: If email already exists or role is invalid.
    """
    # 역할 유효성 검사
    if request.role not in ALLOWED_REGISTRATION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INVALID_ROLE_DETAIL,
        )

    # 이메일 중복 검사
    tExistingResult = await db.execute(
        select(User).where(User.mEmail == request.email)
    )
    if tExistingResult.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=EMAIL_ALREADY_EXISTS_DETAIL,
        )

    # 새 사용자 생성
    tHashedPassword = hashPassword(request.password)
    tUser = User()
    tUser.mEmail = request.email
    tUser.mName = request.name
    tUser.mRole = UserRole(request.role)
    tUser.mHashedPassword = tHashedPassword
    tUser.mIsGuest = False

    db.add(tUser)
    await db.commit()
    await db.refresh(tUser)

    # JWT 토큰 생성
    tAccessToken = createAccessToken({JWT_SUBJECT_KEY: str(tUser.mId)})
    tUserResponse = _buildUserResponse(tUser)

    return TokenResponse(
        accessToken=tAccessToken,
        user=tUserResponse,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    로그인 - 이메일/비밀번호 인증 후 JWT 토큰 발급
    Authenticate with email and password, return JWT access token.

    Returns:
        TokenResponse with JWT access token and user info.

    Raises:
        HTTPException 401: If credentials are invalid.
    """
    # 사용자 조회
    tResult = await db.execute(
        select(User).where(User.mEmail == request.email)
    )
    tUser = tResult.scalar_one_or_none()

    # 사용자 존재 여부 및 비밀번호 검증
    if tUser is None or tUser.mHashedPassword is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_DETAIL,
        )

    if not verifyPassword(request.password, tUser.mHashedPassword):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_DETAIL,
        )

    # JWT 토큰 생성
    tAccessToken = createAccessToken({JWT_SUBJECT_KEY: str(tUser.mId)})
    tUserResponse = _buildUserResponse(tUser)

    return TokenResponse(
        accessToken=tAccessToken,
        user=tUserResponse,
    )


@router.post(
    "/guest",
    response_model=GuestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def createGuest(
    db: AsyncSession = Depends(get_db),
) -> GuestResponse:
    """
    게스트 세션 생성 - 비회원 5턴 체험용
    Create a guest user with auto-generated email and no password.
    Guest users can experience up to 5 turns of Socratic tutoring.

    Returns:
        GuestResponse with JWT token, user info, and max turn limit.
    """
    # 고유 게스트 이메일 자동 생성
    tGuestUuid = uuid.uuid4().hex[:8]
    tGuestEmail = f"guest_{tGuestUuid}@{GUEST_EMAIL_DOMAIN}"
    tGuestName = f"{GUEST_NAME_PREFIX} {tGuestUuid[:4]}"

    # 게스트 사용자 생성 (비밀번호 없음)
    tUser = User()
    tUser.mEmail = tGuestEmail
    tUser.mName = tGuestName
    tUser.mRole = UserRole.STUDENT
    tUser.mHashedPassword = None
    tUser.mIsGuest = True

    db.add(tUser)
    await db.commit()
    await db.refresh(tUser)

    # JWT 토큰 생성
    tAccessToken = createAccessToken({JWT_SUBJECT_KEY: str(tUser.mId)})
    tUserResponse = _buildUserResponse(tUser)

    return GuestResponse(
        accessToken=tAccessToken,
        user=tUserResponse,
        maxTurns=GUEST_MAX_TURNS,
    )
