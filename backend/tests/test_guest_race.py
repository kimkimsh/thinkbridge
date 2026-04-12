"""
Guest 5턴 제한 race condition 재현·검증 스크립트.
Local backend(localhost:8000) 또는 production(Render)에 대해 실행 가능.

사용법:
    # Local (race 재현성 최대)
    THINKBRIDGE_API_URL=http://localhost:8000 python backend/tests/test_guest_race.py

    # Production smoke test
    python backend/tests/test_guest_race.py

기대 결과: 200 응답 5건 + 403 응답 5건. 락이 미동작하면 200이 6개 이상 나옴.
"""

import asyncio
import os

import httpx


DEFAULT_API_URL = "https://thinkbridge-api.onrender.com"
API_URL = os.getenv("THINKBRIDGE_API_URL", DEFAULT_API_URL)

CONCURRENT_REQUESTS = 10
GUEST_MAX_TURNS = 5
EXPECTED_SUCCESS_COUNT = GUEST_MAX_TURNS
EXPECTED_FORBIDDEN_COUNT = CONCURRENT_REQUESTS - GUEST_MAX_TURNS
MESSAGE_TIMEOUT_SECONDS = 90.0
WARMUP_TIMEOUT_SECONDS = 60.0
SUCCESS_STATUS = 200
FORBIDDEN_STATUS = 403


async def warmUpBackend(client):
    """Render cold start 편향 제거를 위한 사전 호출"""
    try:
        await client.get(f"{API_URL}/health", timeout=WARMUP_TIMEOUT_SECONDS)
    except Exception:
        pass


async def createGuestSession(client):
    """게스트 토큰 발급 후 세션 1개 생성"""
    tAuth = await client.post(f"{API_URL}/api/auth/guest")
    tToken = tAuth.json()["accessToken"]
    tSession = await client.post(
        f"{API_URL}/api/sessions",
        headers={"Authorization": f"Bearer {tToken}"},
        json={"subject": "math", "topic": "race test"},
    )
    return tToken, tSession.json()["id"]


async def sendOneMessage(client, token, sessionId, idx):
    """단일 메시지 POST — 상태 코드 또는 에러 문자열 반환"""
    try:
        tResp = await client.post(
            f"{API_URL}/api/sessions/{sessionId}/messages",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": f"test {idx}"},
            timeout=MESSAGE_TIMEOUT_SECONDS,
        )
        return tResp.status_code
    except Exception as tError:
        return f"ERR: {tError}"


async def main():
    async with httpx.AsyncClient() as tClient:
        await warmUpBackend(tClient)
        tToken, tSessionId = await createGuestSession(tClient)

        tResults = await asyncio.gather(*[
            sendOneMessage(tClient, tToken, tSessionId, i)
            for i in range(CONCURRENT_REQUESTS)
        ])

        tSuccess = sum(1 for tStatus in tResults if tStatus == SUCCESS_STATUS)
        tForbidden = sum(1 for tStatus in tResults if tStatus == FORBIDDEN_STATUS)
        print(f"200: {tSuccess}, 403: {tForbidden}, raw: {tResults}")
        assert tSuccess == EXPECTED_SUCCESS_COUNT, \
            f"Expected {EXPECTED_SUCCESS_COUNT} successes, got {tSuccess}"
        assert tForbidden == EXPECTED_FORBIDDEN_COUNT, \
            f"Expected {EXPECTED_FORBIDDEN_COUNT} forbidden, got {tForbidden}"
        print("PASS: Guest 5-turn limit correctly enforced under concurrency")


if __name__ == "__main__":
    asyncio.run(main())
