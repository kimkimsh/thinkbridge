"""
ThinkBridge 시드 데이터 생성 스크립트
Run as: python seed_data.py (from backend/)
OR: python -m seed_data

Creates:
  - 10 users (1 admin, 1 instructor, 8 students)
  - 3 classes
  - 11 enrollments
  - 40 sessions (5 per student)
  - 3 hand-crafted full conversations (8-10 turns each)
  - 37 short conversations (3-5 turns each)
  - 40 reports
  - Token usage records for every turn
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.security import hashPassword
from app.database import Base, async_session_maker, engine
from app.models import (
    ClassRoom,
    EngagementLevel,
    Enrollment,
    Message,
    MessageRole,
    Report,
    SessionStatus,
    SubjectType,
    ThoughtAnalysis,
    TokenUsage,
    TutoringSession,
    User,
    UserRole,
)


# ============================================================================
# Seed Constants
# ============================================================================

DEMO_PASSWORD = "demo1234"
CLAUDE_MODEL = "claude-sonnet-4-20250514"

# 기준 날짜: 시드 데이터의 시간 기준점
BASE_DATE = datetime(2026, 3, 15, tzinfo=timezone.utc)

# 토큰 사용량 범위
TOKEN_INPUT_MIN = 800
TOKEN_INPUT_MAX = 1500
TOKEN_OUTPUT_MIN = 300
TOKEN_OUTPUT_MAX = 800

# 기본 분석 점수 범위
DEFAULT_SCORE_MIN = 3
DEFAULT_SCORE_MAX = 8

# 사고 분석에서 사용되는 패턴 목록
THINKING_PATTERNS = [
    "logical_leap",
    "missing_premise",
    "overgeneralization",
    "good_hypothesis",
    "evidence_based_reasoning",
    "creative_approach",
    "systematic_analysis",
    "incomplete_argument",
    "critical_evaluation",
    "pattern_recognition",
    "conceptual_connection",
    "surface_level_thinking",
]

# 과목별 주제 목록
MATH_TOPICS = ["이차방정식", "피타고라스 정리", "함수의 극한", "확률", "행렬"]
SCIENCE_TOPICS = ["뉴턴 운동법칙", "광합성", "화학 반응", "전기 회로", "파동"]
ESSAY_TOPICS = ["인과관계 논증", "비교/대조", "문제-해결", "반박 논증", "윤리적 딜레마"]

SUBJECT_TOPICS = {
    SubjectType.MATH: MATH_TOPICS,
    SubjectType.SCIENCE: SCIENCE_TOPICS,
    SubjectType.ESSAY: ESSAY_TOPICS,
}


# ============================================================================
# Student Profile Definitions (8 students with distinct thinking patterns)
# ============================================================================

STUDENT_PROFILES = [
    {
        "email": "student@demo.com",
        "name": "김민수",
        # 창의성 높고 논리 약함
        "base_scores": {
            "problem_understanding": 6,
            "premise_check": 5,
            "logical_structure": 4,
            "evidence_provision": 5,
            "critical_thinking": 5,
            "creative_thinking": 8,
        },
        "engagement": EngagementLevel.ACTIVE,
        "subjects": [SubjectType.MATH],
    },
    {
        "email": "student2@demo.com",
        "name": "이서연",
        # 전반적 균형
        "base_scores": {
            "problem_understanding": 7,
            "premise_check": 6,
            "logical_structure": 7,
            "evidence_provision": 6,
            "critical_thinking": 6,
            "creative_thinking": 7,
        },
        "engagement": EngagementLevel.ACTIVE,
        "subjects": [SubjectType.MATH, SubjectType.SCIENCE],
    },
    {
        "email": "student3@demo.com",
        "name": "박지호",
        # 소극적 참여
        "base_scores": {
            "problem_understanding": 4,
            "premise_check": 3,
            "logical_structure": 4,
            "evidence_provision": 3,
            "critical_thinking": 5,
            "creative_thinking": 4,
        },
        "engagement": EngagementLevel.PASSIVE,
        "subjects": [SubjectType.MATH],
    },
    {
        "email": "student4@demo.com",
        "name": "정하윤",
        # 비판적 사고 강함
        "base_scores": {
            "problem_understanding": 6,
            "premise_check": 7,
            "logical_structure": 6,
            "evidence_provision": 6,
            "critical_thinking": 8,
            "creative_thinking": 5,
        },
        "engagement": EngagementLevel.ACTIVE,
        "subjects": [SubjectType.SCIENCE, SubjectType.ESSAY],
    },
    {
        "email": "student5@demo.com",
        "name": "최준서",
        # 빠른 성장 - session 1 low → session 5 high
        "base_scores": {
            "problem_understanding": 3,
            "premise_check": 3,
            "logical_structure": 3,
            "evidence_provision": 3,
            "critical_thinking": 3,
            "creative_thinking": 3,
        },
        "growth_rate": 1.4,
        "engagement": EngagementLevel.ACTIVE,
        "subjects": [SubjectType.MATH],
    },
    {
        "email": "student6@demo.com",
        "name": "한소율",
        # 문제 이해 강함, 근거 약함
        "base_scores": {
            "problem_understanding": 8,
            "premise_check": 6,
            "logical_structure": 6,
            "evidence_provision": 4,
            "critical_thinking": 5,
            "creative_thinking": 6,
        },
        "engagement": EngagementLevel.ACTIVE,
        "subjects": [SubjectType.MATH, SubjectType.ESSAY],
    },
    {
        "email": "student7@demo.com",
        "name": "윤도현",
        # 전체적 중간, 창의적 접근
        "base_scores": {
            "problem_understanding": 5,
            "premise_check": 5,
            "logical_structure": 6,
            "evidence_provision": 5,
            "critical_thinking": 6,
            "creative_thinking": 7,
        },
        "engagement": EngagementLevel.ACTIVE,
        "subjects": [SubjectType.SCIENCE],
    },
    {
        "email": "student8@demo.com",
        "name": "강예은",
        # 논리 구조화 강함, 창의성 약함
        "base_scores": {
            "problem_understanding": 6,
            "premise_check": 6,
            "logical_structure": 8,
            "evidence_provision": 7,
            "critical_thinking": 6,
            "creative_thinking": 3,
        },
        "engagement": EngagementLevel.ACTIVE,
        "subjects": [SubjectType.ESSAY],
    },
]

# 학생 → 반 배정
# 고등수학 1반: 김민수, 이서연, 박지호, 최준서, 한소율
# 물리학 기초반: 이서연, 정하윤, 윤도현
# 논술 심화반: 정하윤, 강예은, 한소율
CLASS_ENROLLMENT_MAP = {
    "고등수학 1반": ["김민수", "이서연", "박지호", "최준서", "한소율"],
    "물리학 기초반": ["이서연", "정하윤", "윤도현"],
    "논술 심화반": ["정하윤", "강예은", "한소율"],
}


# ============================================================================
# Hand-Crafted Conversations (3 full dialogues, 8-10 turns each)
# ============================================================================

def _buildMathConversation() -> list[dict[str, Any]]:
    """
    수학 대화: 이차방정식 근의 공식 유도 (김민수, 10 turns)
    소크라테스식 대화 - AI가 절대 답을 주지 않고 질문으로 유도
    Stage 1→2→3→4→5 자연스러운 진행
    """
    return [
        # Turn 1 (Stage 1: 문제 명확화)
        {
            "user": "선생님, 이차방정식의 근의 공식이 뭔지 모르겠어요. 그냥 외워야 하나요?",
            "assistant": (
                "좋은 질문이에요! '외워야 한다'는 생각이 들었군요. "
                "그러면 먼저 한 가지 물어볼게요 - 이차방정식이 정확히 어떤 형태의 식인지 말해줄 수 있나요? "
                "예를 들어, 일차방정식과는 어떻게 다른가요?"
            ),
            "analysis": {
                "problem_understanding": 3,
                "premise_check": 2,
                "logical_structure": 3,
                "evidence_provision": 2,
                "critical_thinking": 3,
                "creative_thinking": 4,
                "detected_patterns": ["surface_level_thinking"],
                "socratic_stage": 1,
                "engagement_level": "active",
            },
        },
        # Turn 2 (Stage 1: 문제 명확화 계속)
        {
            "user": "일차방정식은 x가 1번 나오고, 이차방정식은 x의 제곱이 있는 거요. ax² + bx + c = 0 이런 형태요.",
            "assistant": (
                "맞아요, 정확하게 알고 있네요! ax² + bx + c = 0이라는 일반형을 잘 기억하고 있군요. "
                "그러면 여기서 생각해볼게요 - 만약 이 식에서 b와 c가 둘 다 0이라면, "
                "ax² = 0을 어떻게 풀 수 있을까요? 가장 간단한 경우부터 시작해봅시다."
            ),
            "analysis": {
                "problem_understanding": 5,
                "premise_check": 4,
                "logical_structure": 4,
                "evidence_provision": 4,
                "critical_thinking": 3,
                "creative_thinking": 4,
                "detected_patterns": ["pattern_recognition"],
                "socratic_stage": 1,
                "engagement_level": "active",
            },
        },
        # Turn 3 (Stage 2: 조건 탐색)
        {
            "user": "ax² = 0이면... 양변을 a로 나누면 x² = 0이니까 x = 0이요!",
            "assistant": (
                "훌륭해요! 양변을 a로 나눈다는 발상이 좋습니다. "
                "그러면 조금 더 어려운 경우를 생각해볼까요? "
                "ax² + c = 0일 때, 즉 b가 0인 경우에는 어떻게 x를 구할 수 있을까요? "
                "방금 했던 것처럼 x²을 혼자 남기려면 어떻게 해야 할까요?"
            ),
            "analysis": {
                "problem_understanding": 6,
                "premise_check": 5,
                "logical_structure": 5,
                "evidence_provision": 4,
                "critical_thinking": 4,
                "creative_thinking": 5,
                "detected_patterns": ["systematic_analysis"],
                "socratic_stage": 2,
                "engagement_level": "active",
            },
        },
        # Turn 4 (Stage 2: 조건 탐색 계속)
        {
            "user": "ax² + c = 0에서 c를 빼면 ax² = -c, 그리고 a로 나누면 x² = -c/a... 그러면 루트를 씌우면 되나요?",
            "assistant": (
                "정확해요! x² = -c/a에서 루트를 씌우면 x를 구할 수 있죠. "
                "그런데 여기서 중요한 질문이 있어요 - 루트를 씌울 때 답이 하나인가요, 두 개인가요? "
                "예를 들어 x² = 4라면 x는 뭐가 될 수 있을까요?"
            ),
            "analysis": {
                "problem_understanding": 7,
                "premise_check": 5,
                "logical_structure": 5,
                "evidence_provision": 5,
                "critical_thinking": 5,
                "creative_thinking": 6,
                "detected_patterns": ["good_hypothesis", "systematic_analysis"],
                "socratic_stage": 2,
                "engagement_level": "active",
            },
        },
        # Turn 5 (Stage 3: 전략 유도)
        {
            "user": "아, x = 2도 되고 x = -2도 되네요! 그러니까 ±√(-c/a)가 답이겠네요. 근데 b가 있으면 어떻게 해요?",
            "assistant": (
                "바로 그거예요! ± 기호를 스스로 발견했네요, 대단합니다. "
                "자, 이제 핵심 질문이에요. ax² + bx + c = 0에서도 같은 전략을 쓸 수 있을까요? "
                "즉, x²을 혼자 남기는 방법이요. 힌트를 드리자면 - '완전제곱식'이라는 걸 알고 있나요? "
                "(x + 무엇)²의 형태로 만들 수 있다면 어떨까요?"
            ),
            "analysis": {
                "problem_understanding": 7,
                "premise_check": 6,
                "logical_structure": 5,
                "evidence_provision": 5,
                "critical_thinking": 6,
                "creative_thinking": 7,
                "detected_patterns": ["creative_approach", "pattern_recognition"],
                "socratic_stage": 3,
                "engagement_level": "active",
            },
        },
        # Turn 6 (Stage 3: 전략 유도 계속)
        {
            "user": "완전제곱식... (x + p)² = x² + 2px + p²인 거 맞죠? 그러면 ax² + bx 부분을 이걸로 만들면 되나요?",
            "assistant": (
                "좋은 접근이에요! 그런데 한 가지 더 생각해볼 것이 있어요. "
                "ax² + bx + c = 0에서 바로 완전제곱식을 만들기 전에, "
                "먼저 x²의 계수를 1로 만들면 더 쉽지 않을까요? "
                "양변을 a로 나누면 어떤 식이 되는지 적어볼 수 있나요?"
            ),
            "analysis": {
                "problem_understanding": 7,
                "premise_check": 6,
                "logical_structure": 6,
                "evidence_provision": 6,
                "critical_thinking": 6,
                "creative_thinking": 7,
                "detected_patterns": ["conceptual_connection", "good_hypothesis"],
                "socratic_stage": 3,
                "engagement_level": "active",
            },
        },
        # Turn 7 (Stage 4: 논리 구성)
        {
            "user": "x² + (b/a)x + (c/a) = 0이 되네요. 그러면... (x + b/2a)² 형태로 만들 수 있나요? 근데 나머지가 남을 것 같아요.",
            "assistant": (
                "아주 좋은 직감이에요! (x + b/2a)²을 전개하면 x² + (b/a)x + b²/4a²이 되죠. "
                "그런데 원래 식에는 c/a가 있으니까, 맞아요 '나머지'가 남아요. "
                "그러면 x² + (b/a)x + (c/a) = 0을 (x + b/2a)² = '무엇' 형태로 정리할 수 있을까요? "
                "등호 오른쪽에는 어떤 값이 올까요?"
            ),
            "analysis": {
                "problem_understanding": 8,
                "premise_check": 7,
                "logical_structure": 6,
                "evidence_provision": 6,
                "critical_thinking": 7,
                "creative_thinking": 8,
                "detected_patterns": ["good_hypothesis", "creative_approach"],
                "socratic_stage": 4,
                "engagement_level": "active",
            },
        },
        # Turn 8 (Stage 4: 논리 구성 계속)
        {
            "user": "(x + b/2a)² = b²/4a² - c/a... 통분하면 (b² - 4ac)/4a²이요! 아 이거 어디서 본 것 같아요!",
            "assistant": (
                "바로 그거예요! 스스로 유도해낸 거예요! "
                "이제 마지막 단계입니다. (x + b/2a)² = (b² - 4ac)/4a² 에서 "
                "양변에 루트를 씌우면 어떻게 될까요? "
                "아까 ±를 발견했던 것을 기억하면서 정리해보세요."
            ),
            "analysis": {
                "problem_understanding": 9,
                "premise_check": 7,
                "logical_structure": 7,
                "evidence_provision": 7,
                "critical_thinking": 7,
                "creative_thinking": 8,
                "detected_patterns": ["pattern_recognition", "conceptual_connection", "evidence_based_reasoning"],
                "socratic_stage": 4,
                "engagement_level": "active",
            },
        },
        # Turn 9 (Stage 5: 종합 및 성찰)
        {
            "user": "x + b/2a = ±√(b²-4ac)/2a이니까... x = (-b ± √(b²-4ac))/2a! 이게 근의 공식이었어요?! 제가 유도한 거예요?",
            "assistant": (
                "네, 정확합니다! 스스로 근의 공식을 유도해냈어요! "
                "처음에 '그냥 외워야 하나요?'라고 물었던 것을 기억하나요? "
                "이제 생각해봅시다 - 이 과정을 통해 무엇을 느꼈나요? "
                "공식을 외우는 것과 직접 유도하는 것의 차이가 뭘까요? "
                "그리고 b²-4ac 부분이 어떤 역할을 하는지 생각해본 적 있나요?"
            ),
            "analysis": {
                "problem_understanding": 9,
                "premise_check": 8,
                "logical_structure": 7,
                "evidence_provision": 8,
                "critical_thinking": 8,
                "creative_thinking": 9,
                "detected_patterns": ["evidence_based_reasoning", "creative_approach", "systematic_analysis"],
                "socratic_stage": 5,
                "engagement_level": "active",
            },
        },
        # Turn 10 (Stage 5: 종합 및 성찰 계속)
        {
            "user": "b²-4ac가 음수면 루트를 못 씌우니까 실수 해가 없는 거고, 0이면 중근이고, 양수면 두 개 해가 있는 거죠! 외우는 것보다 이해하니까 훨씬 기억에 남아요.",
            "assistant": (
                "완벽해요! 판별식(b²-4ac)의 의미까지 스스로 파악했네요. "
                "오늘 대화에서 가장 인상적인 점은, 가장 간단한 경우(ax²=0)부터 시작해서 "
                "점진적으로 복잡한 경우로 나아가며 스스로 공식을 발견했다는 거예요. "
                "이 '단순화 → 일반화' 전략은 수학의 모든 영역에서 사용할 수 있는 강력한 사고 도구입니다. "
                "다음에 새로운 공식을 만나면, 먼저 가장 간단한 경우부터 생각해보세요!"
            ),
            "analysis": {
                "problem_understanding": 10,
                "premise_check": 8,
                "logical_structure": 8,
                "evidence_provision": 8,
                "critical_thinking": 9,
                "creative_thinking": 9,
                "detected_patterns": ["evidence_based_reasoning", "creative_approach", "conceptual_connection", "critical_evaluation"],
                "socratic_stage": 5,
                "engagement_level": "active",
            },
        },
    ]


def _buildScienceConversation() -> list[dict[str, Any]]:
    """
    과학 대화: 뉴턴 운동법칙 (정하윤, 8 turns)
    가설-검증 접근법을 사용한 소크라테스식 대화
    """
    return [
        # Turn 1 (Stage 1: 문제 명확화)
        {
            "user": "뉴턴의 운동법칙이 세 개 있다고 하는데, 왜 하필 세 개인지 모르겠어요. 그냥 실험 결과를 정리한 건가요?",
            "assistant": (
                "흥미로운 의문이에요! '왜 하필 세 개인가'라는 질문은 물리학의 구조를 이해하는 좋은 출발점이에요. "
                "먼저 일상적인 경험부터 시작해볼게요 - 책상 위에 놓인 책은 왜 가만히 있을까요? "
                "그리고 그 책을 밀면 왜 움직일까요? 이 두 상황의 차이가 뭘까요?"
            ),
            "analysis": {
                "problem_understanding": 5,
                "premise_check": 6,
                "logical_structure": 5,
                "evidence_provision": 4,
                "critical_thinking": 7,
                "creative_thinking": 5,
                "detected_patterns": ["critical_evaluation"],
                "socratic_stage": 1,
                "engagement_level": "active",
            },
        },
        # Turn 2 (Stage 2: 조건 탐색)
        {
            "user": "책이 가만히 있는 건... 아무도 안 밀어서? 힘이 없으니까? 밀면 힘이 가해지니까 움직이는 거고요.",
            "assistant": (
                "좋아요, 핵심에 가까워지고 있어요! 그런데 한 가지 더 생각해볼게요. "
                "책상 위의 책에 정말 '아무 힘도' 없을까요? 중력은 아래로 잡아당기고 있잖아요. "
                "그런데도 책이 안 떨어지는 이유는 뭘까요? "
                "이것이 '힘이 없다'와 '힘의 합이 0이다'의 차이입니다. 어떤 쪽일까요?"
            ),
            "analysis": {
                "problem_understanding": 5,
                "premise_check": 5,
                "logical_structure": 5,
                "evidence_provision": 4,
                "critical_thinking": 6,
                "creative_thinking": 4,
                "detected_patterns": ["missing_premise", "surface_level_thinking"],
                "socratic_stage": 2,
                "engagement_level": "active",
            },
        },
        # Turn 3 (Stage 2: 조건 탐색 계속)
        {
            "user": "아! 중력이 아래로 당기지만 책상이 위로 받쳐주니까... 합력이 0이라서 안 움직이는 거네요. 그러면 제1법칙이 '합력이 0이면 정지 또는 등속운동'인 건가요?",
            "assistant": (
                "정확해요! 스스로 제1법칙(관성의 법칙)을 발견했어요. "
                "그러면 가설을 세워봅시다 - 합력이 0이 아닌 경우에는 어떤 일이 일어날까요? "
                "예를 들어, 같은 힘으로 가벼운 공과 무거운 볼링공을 밀면 어떤 차이가 있을까요? "
                "이 실험을 머릿속으로 해보고, 힘과 질량과 가속도의 관계를 추측해보세요."
            ),
            "analysis": {
                "problem_understanding": 7,
                "premise_check": 7,
                "logical_structure": 6,
                "evidence_provision": 5,
                "critical_thinking": 7,
                "creative_thinking": 5,
                "detected_patterns": ["good_hypothesis", "pattern_recognition"],
                "socratic_stage": 2,
                "engagement_level": "active",
            },
        },
        # Turn 4 (Stage 3: 전략 유도)
        {
            "user": "같은 힘이면 가벼운 공이 더 빨리 가속되니까... 가속도는 힘에 비례하고 질량에 반비례하는 건가요? F = ma?",
            "assistant": (
                "바로 그거예요! 가설이 정확합니다. 이것이 제2법칙이에요. "
                "그러면 이제 검증을 해봅시다. 만약 F = ma가 맞다면, "
                "자동차가 급브레이크를 밟았을 때 안전벨트를 안 매면 왜 앞으로 쏠리는지 설명할 수 있을까요? "
                "그리고 이것이 제1법칙과 어떻게 연결되는지도 생각해보세요."
            ),
            "analysis": {
                "problem_understanding": 8,
                "premise_check": 7,
                "logical_structure": 7,
                "evidence_provision": 6,
                "critical_thinking": 7,
                "creative_thinking": 6,
                "detected_patterns": ["good_hypothesis", "evidence_based_reasoning"],
                "socratic_stage": 3,
                "engagement_level": "active",
            },
        },
        # Turn 5 (Stage 3: 전략 유도 계속)
        {
            "user": "차가 멈추는데 사람 몸은 관성 때문에 계속 앞으로 가려고 하는 거죠! 제1법칙이 적용되는 거고, 안전벨트가 힘을 줘서 F = ma로 감속시키는 거네요.",
            "assistant": (
                "완벽한 연결이에요! 제1법칙과 제2법칙을 실생활에 정확하게 적용했어요. "
                "자, 이제 마지막 법칙을 찾아봅시다. 로켓이 우주에서 어떻게 앞으로 나아갈까요? "
                "뒤로 밀 '바닥'이 없는 우주에서요. 로켓이 뒤로 무언가를 내뿜는다는 사실에 주목해보세요. "
                "이것과 '밀고-밀리는' 관계에 대해 어떤 가설을 세울 수 있나요?"
            ),
            "analysis": {
                "problem_understanding": 8,
                "premise_check": 7,
                "logical_structure": 7,
                "evidence_provision": 7,
                "critical_thinking": 8,
                "creative_thinking": 6,
                "detected_patterns": ["conceptual_connection", "evidence_based_reasoning"],
                "socratic_stage": 3,
                "engagement_level": "active",
            },
        },
        # Turn 6 (Stage 4: 논리 구성)
        {
            "user": "로켓이 가스를 뒤로 밀어내면... 가스도 로켓을 앞으로 미는 건가요? 작용-반작용? 모든 힘은 쌍으로 존재한다?",
            "assistant": (
                "바로 그거예요! 제3법칙(작용-반작용의 법칙)을 발견했어요. "
                "이제 처음 질문으로 돌아가봅시다 - '왜 하필 세 개인가.' "
                "세 법칙 각각의 역할을 정리해볼 수 있나요? "
                "제1법칙은 '힘이 없을 때', 제2법칙은 '힘이 있을 때', 제3법칙은 '힘의 존재 방식' - "
                "이 세 가지가 운동을 완전하게 설명하기에 충분한지 생각해보세요."
            ),
            "analysis": {
                "problem_understanding": 8,
                "premise_check": 8,
                "logical_structure": 7,
                "evidence_provision": 7,
                "critical_thinking": 8,
                "creative_thinking": 6,
                "detected_patterns": ["good_hypothesis", "systematic_analysis"],
                "socratic_stage": 4,
                "engagement_level": "active",
            },
        },
        # Turn 7 (Stage 4→5: 전환)
        {
            "user": "제1법칙은 기준(합력=0이면 등속), 제2법칙은 힘이 있을 때의 관계(F=ma), 제3법칙은 힘이 항상 쌍이라는 것... 이 세 가지면 물체의 운동을 다 설명할 수 있는 것 같아요.",
            "assistant": (
                "훌륭한 정리에요! 그러면 한 가지 비판적으로 생각해볼 것이 있어요. "
                "뉴턴의 법칙이 '항상' 맞을까요? 빛의 속도에 가까워지면? 원자보다 작은 세계에서는? "
                "뉴턴의 법칙이 잘 작동하는 조건과 한계가 있다면 그것은 무엇일까요? "
                "이것이 물리학이 계속 발전하는 이유와도 연결돼요."
            ),
            "analysis": {
                "problem_understanding": 9,
                "premise_check": 8,
                "logical_structure": 8,
                "evidence_provision": 7,
                "critical_thinking": 8,
                "creative_thinking": 6,
                "detected_patterns": ["systematic_analysis", "conceptual_connection", "evidence_based_reasoning"],
                "socratic_stage": 4,
                "engagement_level": "active",
            },
        },
        # Turn 8 (Stage 5: 종합 및 성찰)
        {
            "user": "아, 상대성이론이랑 양자역학이 나중에 나온 이유가 그거군요! 뉴턴 법칙은 일상적인 크기와 속도에서만 맞는 '근사'인 거네요. 과학 법칙이 완벽하지 않을 수도 있다는 게 신기해요.",
            "assistant": (
                "정말 깊이 있는 통찰이에요! 오늘 대화에서 중요한 과학적 사고방식을 경험했어요. "
                "일상적인 관찰(책, 공, 로켓)에서 출발해서, 가설을 세우고, "
                "논리적으로 검증하고, 마지막에는 법칙의 한계까지 비판적으로 바라보았죠. "
                "이 과정이 바로 과학자들이 하는 사고방식이에요. "
                "'왜 세 개인가'라는 처음 질문에 스스로 답을 찾은 것, 대단합니다!"
            ),
            "analysis": {
                "problem_understanding": 9,
                "premise_check": 9,
                "logical_structure": 8,
                "evidence_provision": 8,
                "critical_thinking": 9,
                "creative_thinking": 7,
                "detected_patterns": ["critical_evaluation", "conceptual_connection", "evidence_based_reasoning", "creative_approach"],
                "socratic_stage": 5,
                "engagement_level": "active",
            },
        },
    ]


def _buildEssayConversation() -> list[dict[str, Any]]:
    """
    논술 대화: 인과관계 논증 (강예은, 9 turns)
    논증 구조 분석과 비판적 사고 발달
    """
    return [
        # Turn 1 (Stage 1: 문제 명확화)
        {
            "user": "선생님, '소셜미디어가 청소년 우울증을 유발한다'는 주장에 대해 논술을 쓰려고 하는데, 어떻게 시작해야 할지 모르겠어요.",
            "assistant": (
                "좋은 주제를 골랐네요! 그런데 시작하기 전에 먼저 이 주장을 분석해볼까요? "
                "'소셜미디어가 청소년 우울증을 유발한다'는 어떤 종류의 주장일까요? "
                "이 문장에서 원인과 결과는 각각 무엇인지 구분해볼 수 있나요?"
            ),
            "analysis": {
                "problem_understanding": 5,
                "premise_check": 5,
                "logical_structure": 6,
                "evidence_provision": 4,
                "critical_thinking": 5,
                "creative_thinking": 3,
                "detected_patterns": ["surface_level_thinking"],
                "socratic_stage": 1,
                "engagement_level": "active",
            },
        },
        # Turn 2 (Stage 1→2)
        {
            "user": "원인이 소셜미디어 사용이고, 결과가 청소년 우울증이요. 인과관계 주장이네요.",
            "assistant": (
                "맞아요, 인과관계 주장을 정확히 파악했어요! "
                "그런데 인과관계를 주장할 때 가장 흔히 저지르는 논리적 실수가 있어요. "
                "'소셜미디어 사용이 늘어나는 시기에 청소년 우울증도 늘었다'는 데이터가 있다면, "
                "이것만으로 '소셜미디어가 우울증을 유발한다'고 말할 수 있을까요? "
                "'상관관계'와 '인과관계'의 차이가 뭔지 생각해보세요."
            ),
            "analysis": {
                "problem_understanding": 6,
                "premise_check": 6,
                "logical_structure": 7,
                "evidence_provision": 4,
                "critical_thinking": 5,
                "creative_thinking": 3,
                "detected_patterns": ["pattern_recognition"],
                "socratic_stage": 2,
                "engagement_level": "active",
            },
        },
        # Turn 3 (Stage 2: 조건 탐색)
        {
            "user": "상관관계는 두 가지가 같이 변한다는 것이고, 인과관계는 하나가 다른 하나를 실제로 일으킨다는 거죠? 그러면 소셜미디어 사용과 우울증이 동시에 늘어난 것만으로는 인과관계라고 할 수 없는 건가요?",
            "assistant": (
                "정확해요! 이것을 '인과관계 오류(post hoc fallacy)'라고 해요. "
                "그러면 여기서 더 깊이 생각해봅시다. 소셜미디어와 우울증이 동시에 늘어나는 현상에 대해 "
                "다른 설명이 가능할까요? 예를 들어, "
                "1) 우울한 청소년이 소셜미디어를 더 많이 쓰는 것은 아닐까요? (역인과) "
                "2) 제3의 요인이 둘 다를 일으키는 것은 아닐까요? "
                "이런 대안적 설명을 생각해볼 수 있나요?"
            ),
            "analysis": {
                "problem_understanding": 7,
                "premise_check": 7,
                "logical_structure": 7,
                "evidence_provision": 5,
                "critical_thinking": 6,
                "creative_thinking": 4,
                "detected_patterns": ["good_hypothesis", "critical_evaluation"],
                "socratic_stage": 2,
                "engagement_level": "active",
            },
        },
        # Turn 4 (Stage 3: 전략 유도)
        {
            "user": "역인과... 우울하니까 외로워서 소셜미디어에 빠지는 건 충분히 가능하네요. 제3의 요인이라면... 입시 스트레스 같은 게 우울증도, 현실 도피로서의 소셜미디어 사용도 둘 다 높일 수 있겠어요!",
            "assistant": (
                "훌륭해요! 대안적 설명을 두 가지나 제시했어요. "
                "그러면 이제 논술 전략을 세워봅시다. '소셜미디어가 우울증을 유발한다'는 주장을 "
                "단순히 찬성하거나 반대하는 것보다, 지금 분석한 내용을 활용해서 "
                "더 정교한 논증을 만들 수 있지 않을까요? "
                "논술의 핵심 주장(thesis)을 어떻게 수정하면 논리적으로 더 강해질까요?"
            ),
            "analysis": {
                "problem_understanding": 7,
                "premise_check": 7,
                "logical_structure": 8,
                "evidence_provision": 6,
                "critical_thinking": 7,
                "creative_thinking": 4,
                "detected_patterns": ["evidence_based_reasoning", "critical_evaluation"],
                "socratic_stage": 3,
                "engagement_level": "active",
            },
        },
        # Turn 5 (Stage 3: 전략 유도 계속)
        {
            "user": "단순히 '유발한다/안 한다'보다... '소셜미디어의 특정 사용 패턴이 우울증 위험을 높일 수 있지만, 이는 다양한 요인의 상호작용 속에서 이해해야 한다' 이런 식으로요?",
            "assistant": (
                "아주 좋은 논제예요! 훨씬 학술적이고 정교해졌어요. "
                "이제 이 논제를 뒷받침할 근거를 구조화해봅시다. "
                "좋은 논술에는 보통 세 가지 요소가 필요해요: "
                "1) 주장을 뒷받침하는 근거 2) 반론(counter-argument) 3) 재반박(rebuttal). "
                "'특정 사용 패턴'이라고 했는데, 구체적으로 어떤 패턴이 위험할 수 있을까요? "
                "그리고 그것을 어떤 근거로 뒷받침할 수 있을까요?"
            ),
            "analysis": {
                "problem_understanding": 8,
                "premise_check": 7,
                "logical_structure": 8,
                "evidence_provision": 5,
                "critical_thinking": 7,
                "creative_thinking": 4,
                "detected_patterns": ["systematic_analysis", "good_hypothesis"],
                "socratic_stage": 3,
                "engagement_level": "active",
            },
        },
        # Turn 6 (Stage 4: 논리 구성)
        {
            "user": "야간에 혼자 스크롤하면서 남과 비교하는 패턴이 위험할 것 같아요. 근거로는... 수면 부족이 우울증과 연관된다는 연구, 사회적 비교 이론에서 하향/상향 비교가 자존감에 미치는 영향 같은 걸 쓸 수 있을 것 같아요.",
            "assistant": (
                "구체적인 근거를 잘 제시했어요! 수면과 사회적 비교 이론, 두 가지 다 학술적으로 강한 근거예요. "
                "그러면 이제 반론도 생각해야 해요. "
                "누군가가 '소셜미디어가 오히려 청소년의 사회적 지지망을 넓혀 정신건강에 도움이 된다'고 "
                "반론한다면, 어떻게 재반박할 수 있을까요? "
                "이때 방금 세운 '특정 사용 패턴'이라는 프레임이 유용하지 않을까요?"
            ),
            "analysis": {
                "problem_understanding": 8,
                "premise_check": 8,
                "logical_structure": 8,
                "evidence_provision": 7,
                "critical_thinking": 7,
                "creative_thinking": 4,
                "detected_patterns": ["evidence_based_reasoning", "systematic_analysis"],
                "socratic_stage": 4,
                "engagement_level": "active",
            },
        },
        # Turn 7 (Stage 4: 논리 구성 계속)
        {
            "user": "재반박은... '소셜미디어가 사회적 연결에 도움이 될 수 있다는 것은 인정하지만, 그것은 능동적 소통(댓글, 메시지)에 해당하고, 수동적 소비(스크롤, 비교)는 오히려 고립감을 심화시킨다'라고 할 수 있을 것 같아요.",
            "assistant": (
                "탁월한 재반박이에요! '능동적 소통 vs 수동적 소비'라는 구분이 논리적으로 아주 깔끔해요. "
                "이것은 논증에서 '양보 후 재반박(concession-rebuttal)' 전략이라고 해요. "
                "상대의 주장을 일부 인정하면서 핵심 논점을 유지하는 강력한 기법이죠. "
                "자, 이제 전체 논술 구조를 한번 정리해볼 수 있을까요? "
                "서론-본론-결론에 어떤 내용이 들어가야 할까요?"
            ),
            "analysis": {
                "problem_understanding": 9,
                "premise_check": 8,
                "logical_structure": 9,
                "evidence_provision": 7,
                "critical_thinking": 8,
                "creative_thinking": 4,
                "detected_patterns": ["evidence_based_reasoning", "systematic_analysis", "critical_evaluation"],
                "socratic_stage": 4,
                "engagement_level": "active",
            },
        },
        # Turn 8 (Stage 5: 종합 및 성찰)
        {
            "user": "서론: 소셜미디어와 우울증의 상관관계 제시 + 논제 / 본론1: 수동적 사용 패턴의 위험성 (수면, 비교) / 본론2: 반론(사회적 지지) + 재반박(능동 vs 수동) / 결론: 사용 방식의 중요성 + 교육적 시사점",
            "assistant": (
                "완벽한 논술 구조예요! 처음에 '어떻게 시작해야 할지 모르겠다'고 했던 것에 비해, "
                "지금은 논리적이고 학술적인 논증 구조를 완성했어요. "
                "오늘 대화에서 가장 중요한 발견은 뭐였나요? "
                "단순한 인과관계 주장을 넘어서 '조건부 인과관계'라는 더 정교한 논증으로 발전시킨 과정, "
                "그리고 반론을 두려워하지 않고 재반박으로 활용한 점이 인상적이에요."
            ),
            "analysis": {
                "problem_understanding": 9,
                "premise_check": 8,
                "logical_structure": 9,
                "evidence_provision": 7,
                "critical_thinking": 8,
                "creative_thinking": 4,
                "detected_patterns": ["systematic_analysis", "evidence_based_reasoning", "critical_evaluation"],
                "socratic_stage": 5,
                "engagement_level": "active",
            },
        },
        # Turn 9 (Stage 5: 종합 및 성찰 계속)
        {
            "user": "상관관계와 인과관계를 구분하는 것이 제일 중요한 것 같아요. 그리고 반론을 먼저 생각해보니까 오히려 제 논증이 더 강해졌어요. 다른 주제에서도 이렇게 쓸 수 있을 것 같아요!",
            "assistant": (
                "정확해요! 오늘 배운 두 가지 핵심 도구를 잘 파악했어요. "
                "첫째, 인과관계 주장에서는 항상 '대안적 설명'을 점검할 것. "
                "둘째, 반론을 적으로 보지 말고 논증을 강화하는 도구로 활용할 것. "
                "이 전략은 비교/대조, 문제-해결, 윤리적 딜레마 등 모든 논술 유형에 적용할 수 있어요. "
                "다음 논술에서도 '내 주장에 대한 가장 강한 반론은 무엇일까?'를 먼저 물어보세요!"
            ),
            "analysis": {
                "problem_understanding": 9,
                "premise_check": 9,
                "logical_structure": 9,
                "evidence_provision": 8,
                "critical_thinking": 9,
                "creative_thinking": 5,
                "detected_patterns": ["systematic_analysis", "evidence_based_reasoning", "critical_evaluation", "conceptual_connection"],
                "socratic_stage": 5,
                "engagement_level": "active",
            },
        },
    ]


# ============================================================================
# Short Conversation Templates (for non-hand-crafted sessions)
# ============================================================================

# 과목별 짧은 대화 템플릿 (3-5 turns)
SHORT_MATH_TEMPLATES = {
    "피타고라스 정리": [
        ("피타고라스 정리가 왜 a² + b² = c²인지 이해가 안 돼요.", "직각삼각형을 하나 그려볼까요? 각 변에 정사각형을 붙이면 넓이 사이에 어떤 관계가 보이나요?"),
        ("각 변에 정사각형을 붙이면... 빗변의 정사각형 넓이가 나머지 두 개의 합이요?", "좋아요! 그런데 왜 그럴까요? 직각이라는 조건이 없으면 어떻게 될까요?"),
        ("직각이 아니면 성립 안 하는 거죠? 둔각이면 c²이 더 크고 예각이면 작아지겠네요.", "정확해요! 그 관계를 식으로 쓸 수 있을까요? 코사인 법칙과 연결해서 생각해보세요."),
    ],
    "함수의 극한": [
        ("극한이 뭔지 모르겠어요. 그냥 x에 값을 넣으면 안 되나요?", "좋은 질문이에요! f(x) = (x²-1)/(x-1)에서 x=1을 넣으면 어떻게 되죠?"),
        ("0/0이 되네요... 그러면 정의가 안 되는 건가요?", "맞아요, 직접 대입은 안 돼요. 하지만 x가 1에 '가까워지면' f(x)는 어떤 값에 가까워질까요? 분자를 인수분해해보세요."),
        ("(x+1)(x-1)/(x-1)이니까 x+1... x가 1에 가까우면 2에 가까워지네요!", "바로 그거예요! '도달'이 아니라 '접근'이 극한의 핵심이에요. 이 차이가 왜 중요한지 생각해볼 수 있나요?"),
        ("함수값이 없어도 극한은 존재할 수 있다는 거네요. 그래프에서 구멍이 있어도 추세는 알 수 있다는 거죠!", "완벽해요! 이 개념이 미분의 기초가 됩니다. 순간변화율을 구할 때도 같은 아이디어를 쓰게 돼요."),
    ],
    "확률": [
        ("확률에서 독립사건이랑 종속사건 차이가 헷갈려요.", "동전을 두 번 던질 때와 주머니에서 구슬을 꺼낼 때를 비교해볼까요? 첫 번째 결과가 두 번째에 영향을 주나요?"),
        ("동전은 영향 없고, 구슬은 하나 빼면 남은 구성이 바뀌니까 영향 있어요!", "좋아요! 그러면 P(A∩B) = P(A)×P(B)가 언제 성립하고 언제 안 성립할까요?"),
        ("독립일 때만 성립하고, 종속이면 P(A)×P(B|A)를 써야 하는 거네요.", "정확해요! 그러면 카드 한 장을 뽑고 다시 넣는 경우와 안 넣는 경우, 확률이 어떻게 달라지는지 직접 계산해볼 수 있나요?"),
    ],
    "행렬": [
        ("행렬의 곱셈은 왜 교환법칙이 안 돼요?", "좋은 의문이에요! 2×2 행렬 두 개로 AB와 BA를 직접 계산해볼까요? 어떤 차이가 나타나나요?"),
        ("실제로 계산해보니 AB ≠ BA네요. 숫자 곱셈이랑 다르네요.", "왜 다를까요? 행렬 곱셈의 정의를 보면 '행×열'의 내적이잖아요. 순서를 바꾸면 어떤 행과 어떤 열이 만나는지가 달라지는 거죠. 이것이 어떤 실제 상황을 반영할 수 있을까요?"),
        ("회전을 두 번 하는데 순서에 따라 결과가 다른 것처럼요?", "바로 그거예요! 행렬은 '변환'을 나타내는데, 변환의 순서가 결과에 영향을 미치는 거죠. 교환법칙이 안 되는 게 오히려 자연스러운 거예요."),
    ],
}

SHORT_SCIENCE_TEMPLATES = {
    "광합성": [
        ("광합성에서 빛이 왜 필요한지 모르겠어요. 물과 이산화탄소만 있으면 안 되나요?", "흥미로운 질문이에요! 광합성의 전체 반응식을 보면, 반응물과 생성물의 에너지를 비교했을 때 어느 쪽이 에너지가 더 높을까요?"),
        ("포도당이 에너지가 높으니까... 에너지가 어디선가 들어와야 하는 거네요. 그게 빛에너지?", "맞아요! 에너지 보존 법칙이 적용되는 거죠. 그러면 빛에너지가 구체적으로 어떤 과정을 통해 화학에너지로 바뀌는지 생각해볼 수 있나요?"),
        ("물을 분해해서 수소를 얻고, 그 수소로 CO₂를 포도당으로 환원시키는 건가요?", "좋은 추론이에요! 이것이 명반응과 암반응의 핵심이에요. 빛이 직접 하는 일과 빛 없이도 되는 일을 구분할 수 있겠나요?"),
    ],
    "화학 반응": [
        ("화학 반응에서 촉매가 반응속도를 높이면서 왜 자기는 변하지 않아요?", "좋은 의문이에요! 산 정상에 가는 길을 생각해봐요. 터널을 뚫으면 더 쉽게 갈 수 있지만, 터널 자체는 그대로 있죠. 이 비유가 촉매와 어떻게 연결될까요?"),
        ("활성화 에너지를 낮춰주는 건가요? 반응 경로를 바꾸는 것처럼?", "정확해요! 그러면 촉매가 활성화 에너지를 낮추는 구체적인 방법은 뭘까요? 효소가 기질과 결합하는 과정을 생각해보세요."),
        ("효소의 활성부위에 기질이 맞게 들어가서 반응이 일어나기 쉬운 상태를 만들어주는 거요!", "바로 그거예요! 그러면 왜 효소는 특정 기질에만 작용하는지도 설명할 수 있겠나요?"),
        ("활성부위 모양이 특정 기질에만 맞으니까... 자물쇠와 열쇠 같은 거네요!", "좋은 비유예요! 다만 현대 생화학에서는 '유도적합'이라는 더 정확한 모델이 있어요. 자물쇠가 열쇠에 맞춰 모양을 바꾼다면, 어떤 장점이 있을까요?"),
    ],
    "전기 회로": [
        ("직렬회로와 병렬회로에서 전압이 왜 다르게 분배되는지 모르겠어요.", "좋은 질문이에요! 물이 흐르는 파이프로 비유해봅시다. 파이프 두 개를 일렬로 연결하는 것과 나란히 연결하는 것, 물의 흐름이 어떻게 다를까요?"),
        ("일렬로 연결하면 물이 두 파이프를 다 거쳐야 하고, 나란히면 갈라져서 흐르잖아요.", "좋아요! 그러면 '물의 압력(=전압)'과 '물의 흐름량(=전류)'이 각 경우에 어떻게 될까요?"),
        ("직렬은 같은 물이 순서대로 흐르니까 전류 같고 전압이 나눠지고, 병렬은 전압 같고 전류가 나눠지네요!", "완벽해요! 옴의 법칙(V=IR)을 적용하면 합성저항이 왜 직렬에서는 더해지고 병렬에서는 역수로 더해지는지 유도할 수 있을까요?"),
    ],
    "파동": [
        ("소리와 빛이 둘 다 파동이라면서요? 근데 왜 소리는 벽을 통과 못하고 빛은 유리를 통과해요?", "아주 좋은 관찰이에요! 소리와 빛은 같은 '파동'이지만 중요한 차이가 있어요. 소리가 전달되려면 뭐가 필요할까요?"),
        ("소리는 공기 같은 매질이 필요하고, 빛은 진공에서도 가요! 종류가 다른 거네요.", "맞아요! 종파와 횡파의 차이죠. 그러면 벽이 소리를 잘 차단하는데, '방음벽'이 어떤 원리로 작동하는지 파동의 특성으로 설명해볼 수 있나요?"),
        ("파동이 매질이 바뀌면 반사되거나 흡수되는 거요? 밀도 차이 때문에?", "좋은 추론이에요! 그리고 파동의 에너지가 매질을 진동시키는 데 소모되면 '흡수'가 되죠. 유리가 빛을 통과시키는 이유도 이런 관점에서 설명해볼 수 있을까요?"),
    ],
}

SHORT_ESSAY_TEMPLATES = {
    "비교/대조": [
        ("비교/대조 논술에서 그냥 A의 장단점, B의 장단점을 나열하면 안 되나요?", "나열만 하면 어떤 문제가 생길까요? 독자가 그것을 보고 '그래서 어떤 결론?'이라고 물을 수 있지 않나요? 비교/대조의 목적이 뭘까요?"),
        ("아, 비교를 통해 '어느 것이 더 낫다'거나 '상황에 따라 다르다'는 판단을 내려야 하는 거네요.", "맞아요! 그러면 비교의 기준(criteria)을 먼저 정하는 것이 왜 중요할까요?"),
        ("기준이 없으면 사과와 오렌지를 비교하는 격이 되니까요. 같은 기준으로 봐야 공정한 비교가 되네요!", "정확해요! 그러면 '온라인 교육 vs 대면 교육'을 비교한다면 어떤 기준들을 설정하겠어요?"),
    ],
    "문제-해결": [
        ("문제-해결 논술에서 해결책을 바로 제시하면 안 되나요?", "해결책부터 제시하면 독자가 '왜 그게 필요한데?'라고 느낄 수 있지 않을까요? 의사가 진단 없이 약을 처방하면 어떨까요?"),
        ("아, 문제를 먼저 충분히 분석해야 해결책이 설득력이 있는 거네요.", "맞아요! 문제 분석에서 가장 중요한 것은 뭘까요? 원인 분석을 빠뜨리면 어떻게 되죠?"),
        ("원인을 모르면 증상만 치료하는 격이니까 근본적 해결이 안 되겠네요.", "정확해요! 그러면 '청소년 독서율 감소' 문제의 근본 원인은 무엇이고, 그에 맞는 해결책은 뭘까요?"),
        ("스마트폰 때문이라고 하기 쉽지만... 독서의 매력이 줄어든 것, 학업 부담, 환경 부족 등 여러 원인이 있겠네요.", "훌륭해요! 다층적 원인을 파악하면 다층적 해결책도 나올 수 있죠. 가장 효과적인 해결책을 선택하는 기준은 뭘까요?"),
    ],
    "반박 논증": [
        ("상대방 주장을 반박할 때 그냥 '틀렸다'고 하면 안 되나요?", "'틀렸다'고만 하면 상대가 납득할까요? 법정에서 변호사가 '피고인은 무죄다'라고만 말한다면?"),
        ("증거가 필요하네요. 상대 주장의 약점을 구체적으로 지적해야 하는 거죠.", "맞아요! 반박에는 세 가지 수준이 있어요. 전제 반박, 논리 반박, 결론 반박인데, 가장 강력한 건 어떤 걸까요?"),
        ("전제를 무너뜨리면 그 위에 쌓은 논리가 다 무너지니까 전제 반박이 제일 강력하겠네요!", "정확해요! 그러면 '학교에서 체벌은 필요하다'는 주장의 전제는 뭘까요? 그 전제를 반박해보세요."),
        ("전제가 '체벌이 효과적인 교육 방법이다'인데... 연구에 따르면 체벌은 오히려 공격성을 높이고 학습동기를 떨어뜨린다는 근거로 반박할 수 있어요!", "완벽한 전제 반박이에요! 상대의 숨겨진 전제를 찾아 증거로 무너뜨리는 것이 가장 강력한 논증 전략이에요."),
    ],
    "윤리적 딜레마": [
        ("자율주행차가 사고를 피할 수 없을 때 누구를 살려야 하는지 논술을 쓰려는데 답이 없는 것 같아요.", "답이 없다고 느끼는 것은 자연스러워요! 하지만 논술에서 중요한 건 '정답'이 아니라 '논증의 질'이에요. 이 문제에 적용할 수 있는 윤리학 이론을 알고 있나요?"),
        ("공리주의는 최대 다수의 최대 행복이니까 더 많은 사람을 살리는 거고, 의무론은 사람을 수단으로 쓰면 안 된다는 거죠?", "좋아요! 그러면 각 이론을 자율주행차 상황에 적용하면 어떤 결론이 나오나요? 그리고 각각의 한계는 뭘까요?"),
        ("공리주의로 가면 승객 1명보다 보행자 5명을 살리겠지만, 그러면 누가 그런 차를 사겠어요? 의무론은 원칙적이지만 현실에서 프로그래밍이 어렵고요.", "훌륭한 분석이에요! 이론과 현실의 괴리를 잘 파악했어요. 그러면 논술에서 이 딜레마를 어떻게 '해결'하기보다 '의미 있게 다룰' 수 있을까요?"),
    ],
}


# ============================================================================
# Helper Functions
# ============================================================================

def _calculateSessionScores(
    baseScores: dict[str, int],
    sessionIndex: int,
    growthRate: float,
    turnIndex: int,
    totalTurns: int,
) -> dict[str, int]:
    """
    세션/턴에 따른 점수 계산
    - sessionIndex: 세션 순서 (0-4), 성장형 학생의 세션별 성장 반영
    - growthRate: 세션별 성장률 (기본 1.0, 최준서는 1.4)
    - turnIndex: 턴 순서 (0-based), 턴 내 자연스러운 점수 상승 반영
    - totalTurns: 해당 세션의 총 턴 수
    """
    tScores = {}
    # 세션별 성장 계수 (session 0 = 1.0, session 4에 growthRate 만큼)
    tSessionGrowthFactor = 1.0 + (growthRate - 1.0) * (sessionIndex / 4.0)

    # 턴 내 진행 계수 (초반 낮음 → 후반 높음)
    tTurnProgressFactor = 0.7 + 0.6 * (turnIndex / max(totalTurns - 1, 1))

    for tKey, tBaseValue in baseScores.items():
        # 기본 점수에 세션 성장과 턴 진행 반영
        tAdjusted = tBaseValue * tSessionGrowthFactor * tTurnProgressFactor

        # 약간의 랜덤 변동 추가 (-1 ~ +1)
        tAdjusted += random.uniform(-1.0, 1.0)

        # 0-10 범위로 클램핑
        tScores[tKey] = max(0, min(10, round(tAdjusted)))

    return tScores


def _selectPatterns(scores: dict[str, int]) -> list[str]:
    """점수 패턴에 기반한 사고 패턴 탐지"""
    tPatterns = []

    if scores.get("logical_structure", 5) < 4:
        tPatterns.append("logical_leap")
    if scores.get("premise_check", 5) < 4:
        tPatterns.append("missing_premise")
    if scores.get("evidence_provision", 5) < 4:
        tPatterns.append("incomplete_argument")
    if scores.get("creative_thinking", 5) >= 7:
        tPatterns.append("creative_approach")
    if scores.get("critical_thinking", 5) >= 7:
        tPatterns.append("critical_evaluation")
    if scores.get("problem_understanding", 5) >= 7:
        tPatterns.append("good_hypothesis")
    if scores.get("logical_structure", 5) >= 7:
        tPatterns.append("systematic_analysis")
    if scores.get("evidence_provision", 5) >= 7:
        tPatterns.append("evidence_based_reasoning")

    # 너무 적거나 많으면 조정
    if len(tPatterns) == 0:
        tPatterns.append("surface_level_thinking")
    if len(tPatterns) > 4:
        tPatterns = random.sample(tPatterns, 4)

    return tPatterns


def _determineSocraticStage(turnIndex: int, totalTurns: int) -> int:
    """턴 진행도에 따른 소크라테스 단계 결정 (1-5)"""
    tProgress = turnIndex / max(totalTurns - 1, 1)
    if tProgress < 0.2:
        return 1
    elif tProgress < 0.4:
        return 2
    elif tProgress < 0.6:
        return 3
    elif tProgress < 0.8:
        return 4
    else:
        return 5


def _determineEngagement(
    profileEngagement: EngagementLevel,
    turnIndex: int,
) -> EngagementLevel:
    """학생 프로필의 기본 참여도 + 약간의 변동"""
    # 소극적 학생은 가끔 stuck 상태
    if profileEngagement == EngagementLevel.PASSIVE:
        if turnIndex % 3 == 2:
            return EngagementLevel.STUCK
        return EngagementLevel.PASSIVE

    # 적극적 학생도 드물게 passive
    if random.random() < 0.1:
        return EngagementLevel.PASSIVE

    return EngagementLevel.ACTIVE


def _generateShortConversation(
    subject: SubjectType,
    topic: str,
) -> list[tuple[str, str]]:
    """
    과목과 주제에 맞는 짧은 대화 생성 (3-5 turns)
    템플릿이 있으면 사용, 없으면 기본 대화 생성
    """
    tTemplateMap = {
        SubjectType.MATH: SHORT_MATH_TEMPLATES,
        SubjectType.SCIENCE: SHORT_SCIENCE_TEMPLATES,
        SubjectType.ESSAY: SHORT_ESSAY_TEMPLATES,
    }

    tTemplates = tTemplateMap.get(subject, {})
    if topic in tTemplates:
        return tTemplates[topic]

    # 템플릿이 없는 주제는 기본 대화 생성 (3 turns)
    tDefaultConversations = {
        SubjectType.MATH: [
            (f"{topic}에 대해 잘 모르겠어요. 어떻게 접근해야 하나요?",
             f"좋은 질문이에요! {topic}을 이해하려면 먼저 기본 개념부터 확인해볼까요? 관련된 개념 중에서 가장 기본적인 것이 뭐라고 생각하나요?"),
            ("기본 정의부터 시작하면 될 것 같아요. 공식을 외우기 전에 의미를 이해하고 싶어요.",
             "훌륭한 자세예요! 그러면 이 개념이 실생활에서 어떻게 적용되는지 예시를 하나 들어볼 수 있나요? 구체적인 상황에서 생각하면 추상적인 개념이 더 잘 이해돼요."),
            ("아, 생각보다 일상에서 많이 쓰이는 개념이네요. 이제 왜 이런 공식이 나오는지 이해가 돼요!",
             "스스로 연결고리를 찾았네요! 이런 식으로 새로운 개념을 만날 때마다 '왜?'와 '어디에 쓰이지?'를 먼저 물어보면 수학이 훨씬 재미있어질 거예요."),
        ],
        SubjectType.SCIENCE: [
            (f"{topic}의 원리가 궁금해요.",
             f"좋아요! {topic}을 이해하기 위해 먼저 관찰부터 시작해봅시다. 일상에서 이 현상을 경험한 적이 있나요?"),
            ("네, 일상에서 자주 보는데 원리는 생각해본 적이 없어요.",
             "바로 그 점이 과학의 시작이에요! 익숙한 현상에 '왜?'를 던지는 거죠. 그러면 이 현상이 일어나는 조건은 뭘까요? 어떤 조건이 바뀌면 결과가 달라지나요?"),
            ("조건을 바꿔서 실험해보면 원인을 찾을 수 있겠네요. 변인 통제가 중요하다는 게 이런 거군요!",
             "정확해요! 과학적 방법의 핵심을 스스로 발견했어요. 이런 사고방식은 과학뿐 아니라 모든 문제 해결에 적용할 수 있어요."),
        ],
        SubjectType.ESSAY: [
            (f"{topic}에 대한 논술을 어떻게 구성해야 할지 막막해요.",
             f"먼저 핵심 주장(thesis)이 있어야 해요. {topic}에 대해 하고 싶은 주장이 뭔가요? 한 문장으로 요약할 수 있나요?"),
            ("주장을 한 문장으로 정리하니까 논술 방향이 명확해지는 것 같아요.",
             "좋아요! 그러면 이 주장을 뒷받침할 근거 세 가지와, 예상되는 반론 한 가지를 생각해볼 수 있나요?"),
            ("근거와 반론까지 생각하니 구조가 잡히네요. 서론-본론-결론 흐름이 보이기 시작해요!",
             "바로 그거예요! 논술은 건축과 같아요. 설계도(구조)가 먼저고, 벽돌(문장)은 그다음이에요. 이 구조를 바탕으로 각 단락의 첫 문장부터 써보세요."),
        ],
    }

    return tDefaultConversations.get(subject, tDefaultConversations[SubjectType.MATH])


def _generateReportSummary(
    studentName: str,
    topic: str,
    subject: SubjectType,
    totalTurns: int,
    avgScores: dict[str, float],
) -> str:
    """세션 리포트 서술형 요약 생성"""
    # 가장 높은 차원과 가장 낮은 차원 찾기
    tSorted = sorted(avgScores.items(), key=lambda x: x[1], reverse=True)
    tStrengthKey = tSorted[0][0]
    tWeaknessKey = tSorted[-1][0]

    DIMENSION_NAMES_KR = {
        "problem_understanding": "문제 이해",
        "premise_check": "전제 확인",
        "logical_structure": "논리 구조화",
        "evidence_provision": "근거 제시",
        "critical_thinking": "비판적 사고",
        "creative_thinking": "창의적 사고",
    }

    SUBJECT_NAMES_KR = {
        SubjectType.MATH: "수학",
        SubjectType.SCIENCE: "과학",
        SubjectType.ESSAY: "논술",
    }

    tStrength = DIMENSION_NAMES_KR.get(tStrengthKey, tStrengthKey)
    tWeakness = DIMENSION_NAMES_KR.get(tWeaknessKey, tWeaknessKey)
    tSubjectKr = SUBJECT_NAMES_KR.get(subject, "")

    tSummary = (
        f"{studentName} 학생은 '{topic}' 주제에 대해 {totalTurns}번의 사고 전환을 거쳐 "
        f"스스로 답에 도달했습니다. "
        f"{tSubjectKr} 영역에서 특히 '{tStrength}' 능력이 돋보였으며(평균 {tSorted[0][1]:.1f}점), "
        f"'{tWeakness}' 영역(평균 {tSorted[-1][1]:.1f}점)은 추가적인 발전이 기대됩니다. "
        f"소크라테스식 대화를 통해 단계적으로 사고를 확장하며 "
        f"핵심 개념을 자기 언어로 재구성하는 모습을 보였습니다."
    )

    return tSummary


# ============================================================================
# Main Seed Function
# ============================================================================

async def seed() -> None:
    """시드 데이터 생성 - 모든 테이블 초기화 후 데모 데이터 삽입"""

    print("=== ThinkBridge Seed Data ===")
    print("[1/7] Dropping and recreating all tables...")

    # 1. 테이블 초기화 (clean slate)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as db:
        # ----------------------------------------------------------------
        # 2. 사용자 생성 (관리자 1, 강사 1, 학생 8 = 총 10명)
        # ----------------------------------------------------------------
        print("[2/7] Creating users...")

        tHashedPassword = hashPassword(DEMO_PASSWORD)

        # 관리자
        tAdmin = User(
            mEmail="admin@demo.com",
            mName="관리자",
            mRole=UserRole.ADMIN,
            mHashedPassword=tHashedPassword,
            mIsGuest=False,
        )
        db.add(tAdmin)

        # 강사
        tInstructor = User(
            mEmail="instructor@demo.com",
            mName="김선생",
            mRole=UserRole.INSTRUCTOR,
            mHashedPassword=tHashedPassword,
            mIsGuest=False,
        )
        db.add(tInstructor)

        # 학생 8명
        tStudentUsers: list[User] = []
        for tProfile in STUDENT_PROFILES:
            tStudent = User(
                mEmail=tProfile["email"],
                mName=tProfile["name"],
                mRole=UserRole.STUDENT,
                mHashedPassword=tHashedPassword,
                mIsGuest=False,
            )
            db.add(tStudent)
            tStudentUsers.append(tStudent)

        # ID 할당을 위한 flush
        await db.flush()

        tStudentMap: dict[str, User] = {
            tUser.mName: tUser for tUser in tStudentUsers
        }

        print(f"  Created {len(tStudentUsers) + 2} users (1 admin, 1 instructor, {len(tStudentUsers)} students)")

        # ----------------------------------------------------------------
        # 3. 반(ClassRoom) 생성
        # ----------------------------------------------------------------
        print("[3/7] Creating classrooms...")

        tMathClass = ClassRoom(
            mName="고등수학 1반",
            mSubject=SubjectType.MATH,
            mInstructorId=tInstructor.mId,
        )
        tScienceClass = ClassRoom(
            mName="물리학 기초반",
            mSubject=SubjectType.SCIENCE,
            mInstructorId=tInstructor.mId,
        )
        tEssayClass = ClassRoom(
            mName="논술 심화반",
            mSubject=SubjectType.ESSAY,
            mInstructorId=tInstructor.mId,
        )

        db.add_all([tMathClass, tScienceClass, tEssayClass])
        await db.flush()

        tClassMap = {
            "고등수학 1반": tMathClass,
            "물리학 기초반": tScienceClass,
            "논술 심화반": tEssayClass,
        }

        print(f"  Created 3 classrooms")

        # ----------------------------------------------------------------
        # 4. 수강 등록 (Enrollment)
        # ----------------------------------------------------------------
        print("[4/7] Creating enrollments...")

        tEnrollmentCount = 0
        for tClassName, tStudentNames in CLASS_ENROLLMENT_MAP.items():
            tClassRoom = tClassMap[tClassName]
            for tStudentName in tStudentNames:
                tStudent = tStudentMap[tStudentName]
                tEnrollment = Enrollment(
                    mUserId=tStudent.mId,
                    mClassId=tClassRoom.mId,
                )
                db.add(tEnrollment)
                tEnrollmentCount += 1

        await db.flush()
        print(f"  Created {tEnrollmentCount} enrollments")

        # ----------------------------------------------------------------
        # 5. 세션 + 메시지 + 사고 분석 + 토큰 사용량 생성
        # ----------------------------------------------------------------
        print("[5/7] Creating sessions with messages and analyses...")

        tTotalSessions = 0
        tTotalMessages = 0
        tTotalAnalyses = 0
        tTotalTokenUsages = 0

        # Hand-crafted 대화 매핑
        # 김민수(0) - 수학 이차방정식, 정하윤(3) - 과학 뉴턴, 강예은(7) - 논술 인과관계
        HANDCRAFTED_SESSIONS = {
            0: {  # 김민수
                "session_index": 0,
                "subject": SubjectType.MATH,
                "topic": "이차방정식",
                "conversation": _buildMathConversation(),
            },
            3: {  # 정하윤
                "session_index": 0,
                "subject": SubjectType.SCIENCE,
                "topic": "뉴턴 운동법칙",
                "conversation": _buildScienceConversation(),
            },
            7: {  # 강예은
                "session_index": 0,
                "subject": SubjectType.ESSAY,
                "topic": "인과관계 논증",
                "conversation": _buildEssayConversation(),
            },
        }

        tAllReportData: list[dict[str, Any]] = []

        for tProfileIndex, tProfile in enumerate(STUDENT_PROFILES):
            tStudent = tStudentUsers[tProfileIndex]
            tGrowthRate = tProfile.get("growth_rate", 1.0)
            tBaseScores = tProfile["base_scores"]
            tProfileEngagement = tProfile["engagement"]

            # 학생의 과목 결정 (등록된 반의 과목 기반)
            tStudentSubjects = tProfile["subjects"]

            for tSessionIndex in range(5):
                # Hand-crafted 세션 확인
                tHandcrafted = HANDCRAFTED_SESSIONS.get(tProfileIndex)
                tIsHandcrafted = (
                    tHandcrafted is not None
                    and tHandcrafted["session_index"] == tSessionIndex
                )

                if tIsHandcrafted:
                    tSubject = tHandcrafted["subject"]
                    tTopic = tHandcrafted["topic"]
                    tConversation = tHandcrafted["conversation"]
                    tTotalTurns = len(tConversation)
                else:
                    # 과목 순환 선택
                    tSubject = tStudentSubjects[tSessionIndex % len(tStudentSubjects)]
                    tTopicList = SUBJECT_TOPICS[tSubject]
                    tTopic = tTopicList[tSessionIndex % len(tTopicList)]
                    tConversation = None
                    tTotalTurns = random.randint(3, 5)

                # 세션 시간 설정 (2-3주에 걸쳐 분포)
                tDayOffset = tSessionIndex * random.randint(2, 5)
                tSessionStart = BASE_DATE + timedelta(
                    days=tDayOffset,
                    hours=random.randint(9, 18),
                    minutes=random.randint(0, 59),
                )
                tSessionEnd = tSessionStart + timedelta(
                    minutes=random.randint(15, 45)
                )

                tSession = TutoringSession(
                    mUserId=tStudent.mId,
                    mSubject=tSubject,
                    mTopic=tTopic,
                    mStatus=SessionStatus.COMPLETED,
                    mTotalTurns=tTotalTurns,
                    mStartedAt=tSessionStart,
                    mEndedAt=tSessionEnd,
                )
                db.add(tSession)
                await db.flush()
                tTotalSessions += 1

                # 메시지 + 분석 생성
                tSessionScoreAccum: dict[str, list[int]] = {
                    "problem_understanding": [],
                    "premise_check": [],
                    "logical_structure": [],
                    "evidence_provision": [],
                    "critical_thinking": [],
                    "creative_thinking": [],
                }

                if tIsHandcrafted:
                    # Hand-crafted 대화: 미리 작성된 대화 데이터 사용
                    for tTurnIndex, tTurn in enumerate(tConversation):
                        tTurnNumber = tTurnIndex + 1
                        tMsgTime = tSessionStart + timedelta(
                            minutes=tTurnIndex * 3
                        )

                        # 사용자 메시지
                        tUserMsg = Message(
                            mSessionId=tSession.mId,
                            mRole=MessageRole.USER,
                            mContent=tTurn["user"],
                            mTurnNumber=tTurnNumber,
                            mCreatedAt=tMsgTime,
                        )
                        db.add(tUserMsg)
                        await db.flush()
                        tTotalMessages += 1

                        # AI 응답 메시지
                        tAiMsg = Message(
                            mSessionId=tSession.mId,
                            mRole=MessageRole.ASSISTANT,
                            mContent=tTurn["assistant"],
                            mTurnNumber=tTurnNumber,
                            mCreatedAt=tMsgTime + timedelta(seconds=random.randint(3, 8)),
                        )
                        db.add(tAiMsg)
                        await db.flush()
                        tTotalMessages += 1

                        # 사고 분석 (AI 응답 메시지에 연결)
                        tAnalysis = tTurn["analysis"]
                        tThoughtAnalysis = ThoughtAnalysis(
                            mMessageId=tAiMsg.mId,
                            mProblemUnderstanding=tAnalysis["problem_understanding"],
                            mPremiseCheck=tAnalysis["premise_check"],
                            mLogicalStructure=tAnalysis["logical_structure"],
                            mEvidenceProvision=tAnalysis["evidence_provision"],
                            mCriticalThinking=tAnalysis["critical_thinking"],
                            mCreativeThinking=tAnalysis["creative_thinking"],
                            mDetectedPatterns=tAnalysis["detected_patterns"],
                            mSocraticStage=tAnalysis["socratic_stage"],
                            mEngagementLevel=EngagementLevel(tAnalysis["engagement_level"]),
                        )
                        db.add(tThoughtAnalysis)
                        tTotalAnalyses += 1

                        # 점수 누적 (리포트용)
                        for tDim in tSessionScoreAccum:
                            tSessionScoreAccum[tDim].append(tAnalysis[tDim])

                        # 토큰 사용량
                        tTokenUsage = TokenUsage(
                            mSessionId=tSession.mId,
                            mInputTokens=random.randint(TOKEN_INPUT_MIN, TOKEN_INPUT_MAX),
                            mOutputTokens=random.randint(TOKEN_OUTPUT_MIN, TOKEN_OUTPUT_MAX),
                            mModel=CLAUDE_MODEL,
                            mCreatedAt=tMsgTime + timedelta(seconds=random.randint(3, 8)),
                        )
                        db.add(tTokenUsage)
                        tTotalTokenUsages += 1

                else:
                    # 자동 생성 대화: 짧은 템플릿 기반
                    tShortConv = _generateShortConversation(tSubject, tTopic)
                    # 턴 수를 tTotalTurns에 맞추기
                    tActualTurns = min(tTotalTurns, len(tShortConv))
                    # 세션의 total_turns 업데이트
                    tSession.mTotalTurns = tActualTurns

                    for tTurnIndex in range(tActualTurns):
                        tTurnNumber = tTurnIndex + 1
                        tMsgTime = tSessionStart + timedelta(
                            minutes=tTurnIndex * 3
                        )

                        tUserContent, tAiContent = tShortConv[tTurnIndex]

                        # 사용자 메시지
                        tUserMsg = Message(
                            mSessionId=tSession.mId,
                            mRole=MessageRole.USER,
                            mContent=tUserContent,
                            mTurnNumber=tTurnNumber,
                            mCreatedAt=tMsgTime,
                        )
                        db.add(tUserMsg)
                        await db.flush()
                        tTotalMessages += 1

                        # AI 응답 메시지
                        tAiMsg = Message(
                            mSessionId=tSession.mId,
                            mRole=MessageRole.ASSISTANT,
                            mContent=tAiContent,
                            mTurnNumber=tTurnNumber,
                            mCreatedAt=tMsgTime + timedelta(seconds=random.randint(3, 8)),
                        )
                        db.add(tAiMsg)
                        await db.flush()
                        tTotalMessages += 1

                        # 사고 분석 자동 생성
                        tScores = _calculateSessionScores(
                            tBaseScores, tSessionIndex, tGrowthRate,
                            tTurnIndex, tActualTurns,
                        )
                        tPatterns = _selectPatterns(tScores)
                        tStage = _determineSocraticStage(tTurnIndex, tActualTurns)
                        tEngagement = _determineEngagement(tProfileEngagement, tTurnIndex)

                        tThoughtAnalysis = ThoughtAnalysis(
                            mMessageId=tAiMsg.mId,
                            mProblemUnderstanding=tScores["problem_understanding"],
                            mPremiseCheck=tScores["premise_check"],
                            mLogicalStructure=tScores["logical_structure"],
                            mEvidenceProvision=tScores["evidence_provision"],
                            mCriticalThinking=tScores["critical_thinking"],
                            mCreativeThinking=tScores["creative_thinking"],
                            mDetectedPatterns=tPatterns,
                            mSocraticStage=tStage,
                            mEngagementLevel=tEngagement,
                        )
                        db.add(tThoughtAnalysis)
                        tTotalAnalyses += 1

                        # 점수 누적 (리포트용)
                        for tDim in tSessionScoreAccum:
                            tSessionScoreAccum[tDim].append(tScores[tDim])

                        # 토큰 사용량
                        tTokenUsage = TokenUsage(
                            mSessionId=tSession.mId,
                            mInputTokens=random.randint(TOKEN_INPUT_MIN, TOKEN_INPUT_MAX),
                            mOutputTokens=random.randint(TOKEN_OUTPUT_MIN, TOKEN_OUTPUT_MAX),
                            mModel=CLAUDE_MODEL,
                            mCreatedAt=tMsgTime + timedelta(seconds=random.randint(3, 8)),
                        )
                        db.add(tTokenUsage)
                        tTotalTokenUsages += 1

                # 리포트 데이터 수집
                tAvgScores = {
                    tDim: (sum(tVals) / len(tVals)) if tVals else 5.0
                    for tDim, tVals in tSessionScoreAccum.items()
                }
                tAllReportData.append({
                    "session_id": tSession.mId,
                    "student_name": tStudent.mName,
                    "topic": tTopic,
                    "subject": tSubject,
                    "total_turns": tSession.mTotalTurns,
                    "avg_scores": tAvgScores,
                    "generated_at": tSessionEnd + timedelta(seconds=30),
                })

        await db.flush()
        print(f"  Created {tTotalSessions} sessions, {tTotalMessages} messages, {tTotalAnalyses} analyses, {tTotalTokenUsages} token usages")

        # ----------------------------------------------------------------
        # 6. 리포트 생성 (모든 완료 세션)
        # ----------------------------------------------------------------
        print("[6/7] Creating reports...")

        for tReportData in tAllReportData:
            tSummary = _generateReportSummary(
                tReportData["student_name"],
                tReportData["topic"],
                tReportData["subject"],
                tReportData["total_turns"],
                tReportData["avg_scores"],
            )

            # dimension_scores JSON: 평균 점수를 소수점 1자리로 반올림
            tDimensionScoresJson = {
                tDim: round(tVal, 1)
                for tDim, tVal in tReportData["avg_scores"].items()
            }

            tReport = Report(
                mSessionId=tReportData["session_id"],
                mSummary=tSummary,
                mDimensionScores=tDimensionScoresJson,
                mGeneratedAt=tReportData["generated_at"],
            )
            db.add(tReport)

        await db.flush()
        print(f"  Created {len(tAllReportData)} reports")

        # ----------------------------------------------------------------
        # 7. 커밋
        # ----------------------------------------------------------------
        print("[7/7] Committing all data...")
        await db.commit()

    print()
    print("=== Seed Data Complete ===")
    print(f"  Users: 10 (1 admin + 1 instructor + 8 students)")
    print(f"  Classrooms: 3")
    print(f"  Enrollments: {tEnrollmentCount}")
    print(f"  Sessions: {tTotalSessions}")
    print(f"  Messages: {tTotalMessages}")
    print(f"  Thought Analyses: {tTotalAnalyses}")
    print(f"  Reports: {len(tAllReportData)}")
    print(f"  Token Usages: {tTotalTokenUsages}")
    print()
    print("Demo accounts:")
    print("  admin@demo.com / demo1234")
    print("  instructor@demo.com / demo1234")
    print("  student@demo.com / demo1234")


if __name__ == "__main__":
    asyncio.run(seed())
