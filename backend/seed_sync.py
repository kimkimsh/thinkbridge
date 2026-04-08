"""
ThinkBridge 시드 데이터 투입 스크립트 (동기 버전)
psycopg2를 사용하여 Supabase pgbouncer 호환성 문제를 우회합니다.

Usage: python seed_sync.py
"""

import os
import sys

# database.py import를 우회하기 위해 직접 설정 로드
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

# asyncpg URL을 psycopg2 URL로 변환
SYNC_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
if SYNC_URL.startswith("postgres://"):
    SYNC_URL = SYNC_URL.replace("postgres://", "postgresql://", 1)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

engine = create_engine(
    SYNC_URL,
    echo=False,
    connect_args={"sslmode": "require"},
)
SessionLocal = sessionmaker(bind=engine)

# Now import models (but override their Base.metadata to use our sync engine)
# We need to avoid importing database.py which creates the async engine
# Instead, re-import Base from the same declarative base

# Trick: import models which import Base from database.py
# But database.py creates async engine at module level - it will fail without valid DATABASE_URL for asyncpg
# So we set the env var and let it create (it won't actually connect until used)

from app.database import Base
from app.models import (
    ClassRoom, Enrollment, Message, MessageRole, Report,
    TutoringSession, ThoughtAnalysis, TokenUsage, User,
    UserRole, SubjectType, SessionStatus, EngagementLevel,
)
from app.core.security import hashPassword

import random
from datetime import datetime, timedelta, timezone


# ============================================================================
# Constants
# ============================================================================

DEMO_PASSWORD = "demo1234"
CLAUDE_MODEL = "claude-sonnet-4-20250514"

STUDENT_PROFILES = [
    {"name": "김민수", "email": "student@demo.com",
     "scores": {"pu": 6, "pc": 5, "ls": 4, "ep": 5, "ct": 5, "cr": 8}},
    {"name": "이서연", "email": "student2@demo.com",
     "scores": {"pu": 7, "pc": 6, "ls": 7, "ep": 6, "ct": 6, "cr": 7}},
    {"name": "박지호", "email": "student3@demo.com",
     "scores": {"pu": 4, "pc": 3, "ls": 3, "ep": 4, "ct": 3, "cr": 5}},
    {"name": "정하윤", "email": "student4@demo.com",
     "scores": {"pu": 6, "pc": 7, "ls": 6, "ep": 5, "ct": 8, "cr": 5}},
    {"name": "최준서", "email": "student5@demo.com",
     "scores": {"pu": 4, "pc": 3, "ls": 4, "ep": 3, "ct": 4, "cr": 4}},  # growth
    {"name": "한소율", "email": "student6@demo.com",
     "scores": {"pu": 8, "pc": 5, "ls": 5, "ep": 4, "ct": 5, "cr": 6}},
    {"name": "윤도현", "email": "student7@demo.com",
     "scores": {"pu": 5, "pc": 5, "ls": 6, "ep": 5, "ct": 5, "cr": 7}},
    {"name": "강예은", "email": "student8@demo.com",
     "scores": {"pu": 6, "pc": 6, "ls": 8, "ep": 5, "ct": 5, "cr": 3}},
]

MATH_TOPICS = ["이차방정식", "피타고라스 정리", "함수의 극한", "확률", "행렬"]
SCIENCE_TOPICS = ["뉴턴 운동법칙", "광합성", "화학 반응", "전기 회로", "파동"]
ESSAY_TOPICS = ["인과관계 논증", "비교/대조", "문제-해결", "반박 논증", "윤리적 딜레마"]

SUBJECTS_TOPICS = {
    "math": MATH_TOPICS,
    "science": SCIENCE_TOPICS,
    "essay": ESSAY_TOPICS,
}

CLASS_ASSIGNMENTS = {
    "고등수학 1반": {"subject": "math", "students": [0, 1, 2, 4, 5]},
    "물리학 기초반": {"subject": "science", "students": [1, 3, 6]},
    "논술 심화반": {"subject": "essay", "students": [3, 7, 5]},
}

# Hand-crafted math conversation
MATH_CONVERSATION = [
    ("user", "이차방정식 x²-5x+6=0을 어떻게 풀어요?"),
    ("assistant", "좋은 질문이에요! 이 식을 잘 살펴보면, 곱해서 6이 되고 더해서 -5가 되는 두 수를 찾아야 해요. 어떤 수가 떠오르나요?"),
    ("user", "음... -2와 -3이요?"),
    ("assistant", "잘 찾았어요! (-2)×(-3)=6이 맞는지, (-2)+(-3)=-5가 맞는지 직접 확인해볼까요?"),
    ("user", "네 맞아요! 그러면 (x-2)(x-3)=0이니까 x=2 또는 x=3이요"),
    ("assistant", "훌륭해요! 인수분해를 완벽하게 해냈네요. 그런데 만약 곱해서 6이 되는 수를 쉽게 찾을 수 없는 경우에는 어떻게 할까요? 예를 들어 x²-5x+3=0 같은 식이라면?"),
    ("user", "근의 공식을 써야 하나요?"),
    ("assistant", "맞아요! 근의 공식이 필요한 경우죠. 그런데 근의 공식이 어떻게 유도되는지 알고 있나요? ax²+bx+c=0에서 출발해서 x에 대해 풀어보면 어떨까요?"),
    ("user", "완전제곱식으로 바꾸면 되나요? x²-5x = -3 이니까... (x-5/2)² = -3+25/4"),
    ("assistant", "정확해요! 완전제곱식을 이용한 풀이를 해냈어요. 이 방법을 일반화하면 근의 공식 x=(-b±√(b²-4ac))/2a 가 유도돼요. 이제 b²-4ac, 즉 판별식이 어떤 역할을 하는지 생각해볼 수 있을까요?"),
]

SCIENCE_CONVERSATION = [
    ("user", "왜 무거운 물체나 가벼운 물체나 동시에 떨어져요?"),
    ("assistant", "정말 근본적인 질문이네요! 무거운 물체에는 더 큰 중력이 작용하죠. F=ma에서 힘이 커지면 가속도는 어떻게 될까요?"),
    ("user", "힘이 크면 가속도도 커져야 하는데... 그러면 무거운 게 더 빨리 떨어져야 하지 않나요?"),
    ("assistant", "좋은 추론이에요! 하지만 한 가지 더 생각해봐야 할 것이 있어요. F=ma에서 질량(m)이 커지면 같은 힘에서 가속도는 어떻게 변하나요?"),
    ("user", "아! 질량이 크면 가속도가 줄어들어요. 그러면... 힘은 커지는데 질량도 커지니까 상쇄되나요?"),
    ("assistant", "바로 그거예요! 중력 F=mg에서 가속도 a=F/m=mg/m을 계산하면 어떻게 되죠?"),
    ("user", "a=g! 질량이 약분돼서 모든 물체가 같은 가속도 g로 떨어지는 거네요!"),
    ("assistant", "완벽한 통찰이에요! 이것이 갈릴레오의 발견이죠. 그런데 실제로 깃털과 볼링공을 떨어뜨리면 동시에 안 떨어지잖아요. 왜 그럴까요?"),
]

ESSAY_CONVERSATION = [
    ("user", "SNS 사용이 늘면서 우울증이 증가했으니까 SNS가 우울증의 원인이라고 주장하려고요."),
    ("assistant", "흥미로운 관찰이에요! 하지만 '동시에 증가했다'는 것과 '원인이다'라는 것은 같은 의미일까요?"),
    ("user", "음... 상관관계와 인과관계가 다르다는 건가요?"),
    ("assistant", "정확해요! 아이스크림 판매량과 익사 사고도 여름에 함께 증가하지만, 아이스크림이 익사의 원인은 아니죠. 그러면 SNS와 우울증 사이에 인과관계를 증명하려면 어떤 근거가 필요할까요?"),
    ("user", "실험 연구나... SNS를 끊었을 때 우울증이 줄어드는 연구가 있으면 되지 않을까요?"),
    ("assistant", "좋은 접근이에요! 그런 연구가 실제로 있다면 강력한 근거가 되겠죠. 하지만 반론도 고려해봐야 해요. SNS와 우울증 모두에 영향을 미치는 제3의 요인은 없을까요?"),
    ("user", "코로나 팬데믹 같은 거요? 사회적 고립이 SNS 사용도 늘리고 우울증도 늘릴 수 있겠네요."),
    ("assistant", "훌륭한 분석이에요! 이런 '교란 변수'를 고려하면 논증이 더 강해져요. 그러면 최종 논술에서 어떻게 구성하면 좋을까요? 주장-근거-반론-재반박 구조로 정리해볼까요?"),
    ("user", "주장: SNS는 우울증의 위험 요인 중 하나다. 근거: 실험 연구 결과. 반론: 교란 변수 존재. 재반박: 교란 변수를 통제한 연구에서도 유의미한 상관."),
]

HANDCRAFTED = [
    {"student_idx": 0, "subject": "math", "topic": "이차방정식", "conv": MATH_CONVERSATION},
    {"student_idx": 3, "subject": "science", "topic": "뉴턴 운동법칙", "conv": SCIENCE_CONVERSATION},
    {"student_idx": 7, "subject": "essay", "topic": "인과관계 논증", "conv": ESSAY_CONVERSATION},
]

SHORT_TEMPLATES = {
    "math": [
        ("user", "이 문제 어떻게 접근해야 하나요?"),
        ("assistant", "먼저 주어진 조건을 정리해볼까요? 어떤 것들이 주어져 있나요?"),
        ("user", "조건을 정리해보니까 식을 세울 수 있을 것 같아요."),
        ("assistant", "좋아요! 어떤 식을 세울 수 있을지 시도해볼까요?"),
        ("user", "식을 세워서 풀어보니 답이 나왔어요!"),
    ],
    "science": [
        ("user", "이 현상이 왜 일어나는 건가요?"),
        ("assistant", "좋은 질문이에요! 어떤 가설을 세울 수 있을까요?"),
        ("user", "아마 이런 원리 때문인 것 같아요."),
        ("assistant", "그 가설을 검증하려면 어떤 실험을 해볼 수 있을까요?"),
    ],
    "essay": [
        ("user", "이 주제로 논술을 쓰고 싶은데 어떻게 시작해야 하나요?"),
        ("assistant", "먼저 핵심 주장이 무엇인지 한 문장으로 정리해볼까요?"),
        ("user", "제 주장은 이렇게 정리할 수 있을 것 같아요."),
        ("assistant", "좋은 출발이에요! 그 주장을 뒷받침할 근거는 어떤 것이 있을까요?"),
        ("user", "몇 가지 근거를 찾았어요."),
    ],
}


def _randScore(base: int, variance: int = 2) -> int:
    return max(0, min(10, base + random.randint(-variance, variance)))


def _makeAnalysis(scores: dict, turnIdx: int, totalTurns: int, isGrowth: bool = False, sessionIdx: int = 0):
    """Generate ThoughtAnalysis scores based on student profile."""
    growth = 0
    if isGrowth:
        growth = int(sessionIdx * 1.2)

    stage = min(5, max(1, 1 + (turnIdx * 5) // totalTurns))
    engagement = EngagementLevel.ACTIVE
    if random.random() < 0.1:
        engagement = EngagementLevel.PASSIVE

    patterns = []
    if scores["cr"] >= 7:
        patterns.append("creative_approach")
    if scores["ls"] >= 7:
        patterns.append("systematic_analysis")
    if scores["ct"] >= 7:
        patterns.append("critical_evaluation")
    if turnIdx > totalTurns // 2:
        patterns.append("deep_insight")

    return {
        "pu": _randScore(scores["pu"] + growth, 1),
        "pc": _randScore(scores["pc"] + growth, 1),
        "ls": _randScore(scores["ls"] + growth, 1),
        "ep": _randScore(scores["ep"] + growth, 1),
        "ct": _randScore(scores["ct"] + growth, 1),
        "cr": _randScore(scores["cr"] + growth, 1),
        "patterns": patterns,
        "stage": stage,
        "engagement": engagement,
    }


def seed():
    print("=== ThinkBridge Seed Data (Sync) ===")

    # Drop and recreate tables
    print("[1/7] Dropping and recreating all tables...")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    db: Session = SessionLocal()

    try:
        # [2/7] Create users
        print("[2/7] Creating users...")
        tHashedPw = hashPassword(DEMO_PASSWORD)

        tAdmin = User()
        tAdmin.mEmail = "admin@demo.com"
        tAdmin.mName = "관리자"
        tAdmin.mRole = UserRole.ADMIN
        tAdmin.mHashedPassword = tHashedPw
        db.add(tAdmin)

        tInstructor = User()
        tInstructor.mEmail = "instructor@demo.com"
        tInstructor.mName = "김선생"
        tInstructor.mRole = UserRole.INSTRUCTOR
        tInstructor.mHashedPassword = tHashedPw
        db.add(tInstructor)

        tStudents = []
        for p in STUDENT_PROFILES:
            s = User()
            s.mEmail = p["email"]
            s.mName = p["name"]
            s.mRole = UserRole.STUDENT
            s.mHashedPassword = tHashedPw
            db.add(s)
            tStudents.append(s)

        db.flush()
        print(f"  Created {2 + len(tStudents)} users")

        # [3/7] Create classes
        print("[3/7] Creating classes...")
        tClasses = {}
        for className, info in CLASS_ASSIGNMENTS.items():
            c = ClassRoom()
            c.mName = className
            c.mSubject = SubjectType(info["subject"])
            c.mInstructorId = tInstructor.mId
            db.add(c)
            db.flush()
            tClasses[className] = c

        # [4/7] Create enrollments
        print("[4/7] Creating enrollments...")
        for className, info in CLASS_ASSIGNMENTS.items():
            for sIdx in info["students"]:
                e = Enrollment()
                e.mUserId = tStudents[sIdx].mId
                e.mClassId = tClasses[className].mId
                db.add(e)
        db.flush()

        # [5/7] Create sessions + messages + analyses
        print("[5/7] Creating sessions with messages and analyses...")
        tBaseDate = datetime(2026, 3, 20, tzinfo=timezone.utc)
        tSessionCount = 0
        tMessageCount = 0

        for sIdx, student in enumerate(tStudents):
            profile = STUDENT_PROFILES[sIdx]
            isGrowth = (sIdx == 4)  # 최준서

            # Find which subject this student is enrolled in
            studentSubjects = []
            for cn, info in CLASS_ASSIGNMENTS.items():
                if sIdx in info["students"]:
                    studentSubjects.append(info["subject"])
            if not studentSubjects:
                studentSubjects = ["math"]

            for sessIdx in range(5):
                subject = studentSubjects[sessIdx % len(studentSubjects)]
                topics = SUBJECTS_TOPICS[subject]
                topic = topics[sessIdx % len(topics)]

                # Check if this is a hand-crafted conversation
                handcrafted = None
                for hc in HANDCRAFTED:
                    if hc["student_idx"] == sIdx and hc["subject"] == subject and sessIdx == 0:
                        handcrafted = hc
                        break

                sessionDate = tBaseDate + timedelta(days=sessIdx * 3 + sIdx, hours=random.randint(9, 17))

                sess = TutoringSession()
                sess.mUserId = student.mId
                sess.mSubject = SubjectType(subject)
                sess.mTopic = topic
                sess.mStatus = SessionStatus.COMPLETED
                sess.mStartedAt = sessionDate
                sess.mEndedAt = sessionDate + timedelta(minutes=random.randint(15, 40))
                db.add(sess)
                db.flush()

                # Create messages
                if handcrafted:
                    conv = handcrafted["conv"]
                else:
                    conv = SHORT_TEMPLATES[subject]

                turnNum = 0
                for msgIdx, (role, content) in enumerate(conv):
                    if role == "user":
                        turnNum += 1

                    msg = Message()
                    msg.mSessionId = sess.mId
                    msg.mRole = MessageRole(role)
                    msg.mContent = content
                    msg.mTurnNumber = turnNum
                    db.add(msg)
                    db.flush()

                    # Add analysis for assistant messages
                    if role == "assistant":
                        a = _makeAnalysis(
                            profile["scores"], msgIdx, len(conv),
                            isGrowth=isGrowth, sessionIdx=sessIdx,
                        )
                        ta = ThoughtAnalysis()
                        ta.mMessageId = msg.mId
                        ta.mProblemUnderstanding = a["pu"]
                        ta.mPremiseCheck = a["pc"]
                        ta.mLogicalStructure = a["ls"]
                        ta.mEvidenceProvision = a["ep"]
                        ta.mCriticalThinking = a["ct"]
                        ta.mCreativeThinking = a["cr"]
                        ta.mDetectedPatterns = a["patterns"]
                        ta.mSocraticStage = a["stage"]
                        ta.mEngagementLevel = a["engagement"]
                        db.add(ta)

                        # Token usage
                        tu = TokenUsage()
                        tu.mSessionId = sess.mId
                        tu.mInputTokens = random.randint(800, 1500)
                        tu.mOutputTokens = random.randint(300, 800)
                        tu.mModel = CLAUDE_MODEL
                        db.add(tu)

                    tMessageCount += 1

                sess.mTotalTurns = turnNum

                # Create report
                dimScores = {
                    "problemUnderstanding": _randScore(profile["scores"]["pu"], 1),
                    "premiseCheck": _randScore(profile["scores"]["pc"], 1),
                    "logicalStructure": _randScore(profile["scores"]["ls"], 1),
                    "evidenceProvision": _randScore(profile["scores"]["ep"], 1),
                    "criticalThinking": _randScore(profile["scores"]["ct"], 1),
                    "creativeThinking": _randScore(profile["scores"]["cr"], 1),
                }
                avgScore = sum(dimScores.values()) / 6

                report = Report()
                report.mSessionId = sess.mId
                report.mSummary = (
                    f"총 {turnNum}턴의 대화를 통해 학생은 {topic}에 대한 이해도를 "
                    f"{'크게 ' if avgScore >= 7 else ''}향상시켰습니다. "
                    f"특히 {'문제 이해' if profile['scores']['pu'] >= 7 else '논리 구조화'} "
                    f"영역에서 강점을 보였으며, "
                    f"{turnNum}번의 사고 전환을 거쳐 스스로 답에 도달했습니다."
                )
                report.mDimensionScores = dimScores
                db.add(report)

                tSessionCount += 1

            db.flush()

        db.commit()
        print(f"  Created {tSessionCount} sessions with {tMessageCount} messages")

        print("[6/7] Verifying data...")
        userCount = db.query(User).count()
        sessionCount = db.query(TutoringSession).count()
        messageCount = db.query(Message).count()
        analysisCount = db.query(ThoughtAnalysis).count()
        reportCount = db.query(Report).count()
        print(f"  Users: {userCount}, Sessions: {sessionCount}, Messages: {messageCount}")
        print(f"  Analyses: {analysisCount}, Reports: {reportCount}")

        print("[7/7] Done!")
        print("=== Seed Data Complete ===")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
