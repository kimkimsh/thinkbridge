/**
 * Tutorial definitions for the 4 main pages of ThinkBridge.
 * Each tutorial is a sequence of steps targeting DOM elements by `data-tutorial-id`.
 * Phase 3 will wire these attributes into the actual pages.
 */

import {
    TUTORIAL_STORAGE_KEY_PREFIX,
    TUTORIAL_STORAGE_KEY_VERSION,
} from "./tutorialConstants";


// --- Types ---

export type TutorialPlacement = "top" | "bottom" | "left" | "right" | "center";

export type TutorialId = "chat" | "sessions" | "instructor" | "admin";

export interface TutorialStep
{
    /** Stable identifier used for keys and logging. */
    id: string;

    /** CSS selector for the target element (usually `[data-tutorial-id='...']`). */
    targetSelector: string;

    /** Tooltip title (Korean). */
    title: string;

    /** Tooltip description (Korean). */
    description: string;

    /** Preferred placement relative to the target. `center` ignores the target. */
    placement?: TutorialPlacement;

    /** Override the default tooltip offset (px). */
    offset?: number;

    /** Override the default spotlight padding (px). */
    spotlightPadding?: number;

    /** Override the default waitForTarget timeout (ms). */
    waitTimeoutMs?: number;
}

export interface Tutorial
{
    id: TutorialId;
    storageKey: string;
    steps: TutorialStep[];
}


// --- Helpers ---

function storageKey(id: TutorialId): string
{
    return `${TUTORIAL_STORAGE_KEY_PREFIX}${id}${TUTORIAL_STORAGE_KEY_VERSION}`;
}


// --- CHAT 튜토리얼 ---

const CHAT_TUTORIAL: Tutorial = {
    id: "chat",
    storageKey: storageKey("chat"),
    steps: [
        {
            id: "chat-intro",
            targetSelector: "[data-tutorial-id='chat-subject-selector']",
            title: "과목을 선택하세요",
            description: "수학·과학·논술 중 오늘 대화할 주제 영역을 고릅니다. 각 과목에 맞춘 프롬프트가 적용돼요.",
            placement: "bottom",
        },
        {
            id: "chat-topic",
            targetSelector: "[data-tutorial-id='chat-topic-input']",
            title: "주제를 입력하세요",
            description: "예) 이차방정식 근의 공식, 뉴턴의 운동 법칙. 구체적일수록 AI가 더 맞춤형 질문을 만듭니다.",
            placement: "bottom",
        },
        {
            id: "chat-start",
            targetSelector: "[data-tutorial-id='chat-start-button']",
            title: "대화 시작",
            description: "버튼을 누르면 세션이 생성되고 AI 튜터가 첫 질문을 던집니다. 기억하세요: AI는 답을 주지 않아요.",
            placement: "top",
        },
        {
            id: "chat-progress",
            targetSelector: "[data-tutorial-id='chat-progress-bar']",
            title: "5단계 소크라테스 진행",
            description: "명확화 → 탐색 → 유도 → 검증 → 확장 순서로 사고가 깊어집니다. 현재 단계가 강조됩니다.",
            placement: "bottom",
        },
        {
            id: "chat-analysis",
            targetSelector: "[data-tutorial-id='chat-thought-panel']",
            title: "실시간 사고력 분석",
            description: "6차원 (문제 이해·전제 확인·논리·근거·비판·창의)이 매 턴마다 업데이트됩니다. 클릭해서 자세히 볼 수 있어요.",
            placement: "left",
        },
        {
            id: "chat-hint",
            targetSelector: "[data-tutorial-id='chat-hint-button']",
            title: "힌트가 필요할 때",
            description: "막히면 클릭하세요. AI가 더 구체적인 유도 질문을 줍니다.",
            placement: "top",
        },
        {
            id: "chat-end",
            targetSelector: "[data-tutorial-id='chat-end-button']",
            title: "대화 마무리",
            description: "종료하면 사고 과정 리포트가 자동 생성됩니다. 레이더 차트와 성장 추이가 함께 제공돼요.",
            placement: "top",
        },
    ],
};


// --- SESSIONS 튜토리얼 ---

const SESSIONS_TUTORIAL: Tutorial = {
    id: "sessions",
    storageKey: storageKey("sessions"),
    steps: [
        {
            id: "sessions-new",
            targetSelector: "[data-tutorial-id='sessions-new-chat']",
            title: "새 대화 시작",
            description: "언제든 여기서 새로운 대화를 시작할 수 있어요.",
            placement: "bottom",
        },
        {
            id: "sessions-card",
            targetSelector: "[data-tutorial-id='sessions-card-first']",
            title: "세션 카드",
            description: "진행중 세션은 이어서 대화할 수 있고, 완료된 세션은 리포트를 확인할 수 있어요.",
            placement: "bottom",
        },
        {
            id: "sessions-report",
            targetSelector: "[data-tutorial-id='sessions-report-cta']",
            title: "리포트 보기",
            description: "완료된 대화의 사고력 분석 결과를 다시 볼 수 있습니다.",
            placement: "left",
        },
    ],
};


// --- INSTRUCTOR 튜토리얼 ---

const INSTRUCTOR_TUTORIAL: Tutorial = {
    id: "instructor",
    storageKey: storageKey("instructor"),
    steps: [
        {
            id: "instructor-class",
            targetSelector: "[data-tutorial-id='instructor-class-selector']",
            title: "반 선택",
            description: "담당하는 반을 선택하면 아래 모든 지표가 해당 반 학생들로 필터링됩니다.",
            placement: "bottom",
        },
        {
            id: "instructor-summary",
            targetSelector: "[data-tutorial-id='instructor-summary-cards']",
            title: "반 요약 통계",
            description: "총 학생 / 평균 세션 / 활성률 / 전체 평균 사고력을 한눈에 확인하세요.",
            placement: "bottom",
        },
        {
            id: "instructor-heatmap",
            targetSelector: "[data-tutorial-id='instructor-heatmap']",
            title: "사고력 히트맵",
            description: "학생 × 6차원 매트릭스. 빨강-노랑-초록으로 약점 영역을 파악하고, 학생을 클릭하면 세션 리플레이로 이동합니다. 아래 AI 인사이트도 참고하세요.",
            placement: "top",
        },
        {
            id: "instructor-students",
            targetSelector: "[data-tutorial-id='instructor-student-list']",
            title: "학생 목록",
            description: "학생별 평균 점수 뱃지를 확인하고, 카드를 클릭해 과거 세션을 재생할 수 있습니다.",
            placement: "top",
        },
    ],
};


// --- ADMIN 튜토리얼 ---

const ADMIN_TUTORIAL: Tutorial = {
    id: "admin",
    storageKey: storageKey("admin"),
    steps: [
        {
            id: "admin-banner",
            targetSelector: "[data-tutorial-id='admin-demo-banner']",
            title: "데모 데이터 안내",
            description: "시드 데이터로 구성된 대시보드입니다. 실제 운영 시 전체 학원 통계로 교체됩니다.",
            placement: "bottom",
        },
        {
            id: "admin-stats",
            targetSelector: "[data-tutorial-id='admin-stats-cards']",
            title: "전체 통계",
            description: "총 학생 / 총 세션 / 전체 평균 / 활성률. 학원 전반의 사용 현황과 사고력 수준을 파악합니다.",
            placement: "bottom",
        },
        {
            id: "admin-bar",
            targetSelector: "[data-tutorial-id='admin-bar-chart']",
            title: "반별 사고력 비교",
            description: "각 반의 6차원 평균 점수를 비교합니다. 특정 차원이 낮은 반을 확인하고 커리큘럼 개선에 활용하세요.",
            placement: "top",
        },
        {
            id: "admin-radar",
            targetSelector: "[data-tutorial-id='admin-radar-chart']",
            title: "과목별 6차원 레이더",
            description: "수학·과학·논술의 사고력 프로필 오버레이. 과목별 강/약점 패턴을 한눈에.",
            placement: "top",
        },
    ],
};


// --- Exported registry ---

export const TUTORIALS: Record<TutorialId, Tutorial> = {
    chat: CHAT_TUTORIAL,
    sessions: SESSIONS_TUTORIAL,
    instructor: INSTRUCTOR_TUTORIAL,
    admin: ADMIN_TUTORIAL,
};

export function getTutorial(id: TutorialId): Tutorial
{
    return TUTORIALS[id];
}
