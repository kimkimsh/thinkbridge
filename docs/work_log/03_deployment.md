# ThinkBridge 배포 과정 및 트러블슈팅

> Supabase + Render + Vercel 배포 과정에서 발생한 문제와 해결 과정 기록

## 배포 아키텍처

```
[Browser] → [Vercel: Next.js 14]
                  ↓ REST + SSE
            [Render: FastAPI] ← UptimeRobot 5min ping
                  ↓
     [Supabase PostgreSQL] + [Claude API]
```

## 배포 순서

1. GitHub repo 생성 (`kimkimsh/thinkbridge`)
2. Supabase 프로젝트 (DB)
3. Render Web Service (백엔드)
4. Vercel (프론트엔드)
5. UptimeRobot (cold start 방지)

---

## 트러블슈팅 기록

### Issue 1: Render 첫 배포 실패 — "Exited with status 3"
- **원인**: 환경변수가 설정되지 않은 상태에서 `Settings()` 호출 시 필수 값 누락으로 크래시
- **해결**: Render Dashboard에서 4개 환경변수 설정 (DATABASE_URL, ANTHROPIC_API_KEY, SECRET_KEY, CORS_ORIGINS)
- **커밋**: 해당 없음 (설정 변경)

### Issue 2: Supabase Direct Connection — "Network is unreachable"
- **원인**: Supabase 새 프로젝트는 **IPv6 전용** (`2406:da1c:...`). Render Free tier는 IPv4만 지원
- **해결**: Direct connection 대신 **Pooler connection** (pooler.supabase.com:6543) 사용
- **커밋**: `4913b07` fix: add SSL support for Supabase

### Issue 3: asyncpg + pgbouncer — "prepared statement already exists"
- **원인**: Supabase Pooler는 pgbouncer(Transaction mode)를 사용. asyncpg의 prepared statement 캐시와 충돌
- **시도한 해결책들**:
  1. `connect_args={"prepared_statement_cache_size": 0}` → 파라미터명 틀림
  2. `connect_args={"statement_cache_size": 0}` → SQLAlchemy dialect 초기화에는 미적용
  3. `NullPool` + `statement_cache_size=0` → 여전히 dialect init에서 충돌
  4. SQLAlchemy `connect` 이벤트 리스너로 캐시 강제 제거 → 부분 해결
- **최종 해결**: Supabase Pooler를 **Session mode** (port 5432)로 변경. Session mode는 prepared statement 지원
- **커밋**: `5068fd6`, `f0e46ae`, `8dafe35`, `e88e01e` (여러 시도 기록)

### Issue 4: Enum이 문자열로 반환 — "'str' has no attribute 'value'"
- **원인**: Supabase Pooler를 통한 쿼리 결과에서 Python Enum 대신 plain string 반환
- **해결**: `.value` 접근 전 `hasattr(field, "value")` 체크 추가
- **커밋**: `8705d9f` fix: handle enum as string in _buildUserResponse

### Issue 5: Render 배포가 최신 커밋 미반영
- **원인**: Render auto-deploy가 간헐적으로 지연되거나 트리거 안 됨
- **해결**: Render Dashboard에서 "Manual Deploy → Deploy latest commit" 수동 트리거
- **학습**: Render Free tier에서는 auto-deploy를 신뢰하지 말고 중요 변경 후 수동 배포 확인

### Issue 6: Vercel Deployment Protection — "Authentication Required"
- **원인**: Vercel 프로젝트의 Deployment Protection이 기본 활성화 → 외부 접근 차단
- **해결**: Vercel Dashboard → Settings → Deployment Protection → OFF
- **학습**: Vercel 프로젝트 생성 후 반드시 Protection 설정 확인

### Issue 7: 프론트엔드 API URL이 localhost:8000
- **원인**: `NEXT_PUBLIC_API_URL`이 빌드 시점에 주입되지 않음. Vercel CLI의 `-e` 플래그가 일회성
- **해결**: `vercel env add NEXT_PUBLIC_API_URL production` 으로 프로젝트 환경변수에 영구 등록
- **커밋**: 해당 없음 (Vercel 설정)
- **학습**: Next.js `NEXT_PUBLIC_*` 변수는 빌드 시점에 인라인됨 → Vercel 프로젝트 설정에 등록 필수

### Issue 8: Seed Data — asyncpg pgbouncer 호환
- **원인**: `seed_data.py`가 `database.py`의 async 엔진을 사용하는데, pgbouncer와 충돌
- **해결**: `seed_sync.py` 별도 작성 (psycopg2 동기 드라이버 사용, pgbouncer 문제 완전 우회)
- **커밋**: `e88e01e` fix: force-disable asyncpg prepared stmt cache

---

## 배포 타임라인

| 시각 (KST) | 이벤트 |
|------------|--------|
| 04/09 00:00 | GitHub repo 생성 + push |
| 04/09 00:10 | Render 배포 시작 (첫 시도 실패) |
| 04/09 00:30 | SSL + 타임아웃 수정 push |
| 04/09 00:55 | DB 연결 성공 (health/db OK) |
| 04/09 01:00 | prepared statement 에러 발견 |
| 04/09 01:50 | Session mode pooler로 전환 → 백엔드 정상 동작 |
| 04/09 01:55 | Vercel 프론트엔드 배포 |
| 04/09 02:00 | CORS 설정 완료 |
| 04/09 02:10 | 시드 데이터 투입 (seed_sync.py) |
| 04/09 02:25 | 데모 로그인 성공 확인 |
| 04/09 02:30 | Deployment Protection 해제 |
| 04/09 02:45 | NEXT_PUBLIC_API_URL 환경변수 등록 + 재배포 |
| 04/09 10:30 | SSE 파싱 버그 수정 + 재배포 |

---

## 교훈

1. **Supabase + Render Free tier = IPv6 문제 필연적** → Pooler 사용 필수
2. **asyncpg + pgbouncer = prepared statement 충돌** → Session mode 또는 psycopg2 사용
3. **Vercel NEXT_PUBLIC_* 변수 = 빌드 시 인라인** → 프로젝트 설정에 등록해야 함
4. **배포 디버깅용 엔드포인트 필수** → `/health/db`, `/health/tables` 가 큰 도움
5. **글로벌 exception handler** → 프로덕션에서도 에러 상세를 보려면 필요
