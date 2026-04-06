from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User


# --- Constants ---

OAUTH2_TOKEN_URL = "/api/auth/login"
JWT_SUBJECT_KEY = "sub"
JWT_EXPIRATION_KEY = "exp"
CREDENTIALS_EXCEPTION_DETAIL = "인증 정보가 유효하지 않습니다"
USER_NOT_FOUND_DETAIL = "사용자를 찾을 수 없습니다"

# --- Password hashing ---

mPasswordContext = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- OAuth2 scheme for Bearer token extraction ---

mOAuth2Scheme = OAuth2PasswordBearer(tokenUrl=OAUTH2_TOKEN_URL)


def hashPassword(password: str) -> str:
    """
    비밀번호를 bcrypt 해시로 변환
    Hash a plain-text password using bcrypt.
    """
    return mPasswordContext.hash(password)


def verifyPassword(plainPassword: str, hashedPassword: str) -> bool:
    """
    평문 비밀번호와 해시된 비밀번호를 비교
    Verify a plain-text password against a bcrypt hash.
    """
    return mPasswordContext.verify(plainPassword, hashedPassword)


def createAccessToken(data: dict) -> str:
    """
    JWT 액세스 토큰 생성 - 사용자 ID를 sub 클레임에 포함
    Create a JWT access token with configurable expiry from settings.

    Args:
        data: Claims to encode (must include "sub" with user ID).

    Returns:
        Encoded JWT string.
    """
    tPayload = data.copy()
    tExpire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    tPayload[JWT_EXPIRATION_KEY] = tExpire

    tToken = jwt.encode(
        tPayload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return tToken


async def getCurrentUser(
    token: str = Depends(mOAuth2Scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    JWT 토큰에서 현재 사용자를 추출하는 FastAPI 의존성
    FastAPI dependency: extracts user from JWT Bearer token.

    Raises:
        HTTPException 401: If token is invalid or user not found.
    """
    tCredentialsException = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=CREDENTIALS_EXCEPTION_DETAIL,
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        tPayload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        tUserId: str | None = tPayload.get(JWT_SUBJECT_KEY)
        if tUserId is None:
            raise tCredentialsException
    except JWTError:
        raise tCredentialsException

    # JWT sub 클레임이 유효한 정수인지 확인
    try:
        tUserIdInt = int(tUserId)
    except (ValueError, TypeError):
        raise tCredentialsException

    # DB에서 사용자 조회
    tResult = await db.execute(
        select(User).where(User.mId == tUserIdInt)
    )
    tUser = tResult.scalar_one_or_none()

    if tUser is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=USER_NOT_FOUND_DETAIL,
            headers={"WWW-Authenticate": "Bearer"},
        )

    return tUser
