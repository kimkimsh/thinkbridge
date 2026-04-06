/**
 * ThinkBridge frontend constants.
 * Centralized labels, colors, and configuration values used across the application.
 */


// --- API Configuration ---

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


// --- 6-Dimension Thinking Framework (Bloom's Revised Taxonomy) ---

export const DIMENSION_LABELS: Record<string, string> = {
    problemUnderstanding: "문제 이해",
    premiseCheck: "전제 확인",
    logicalStructure: "논리 구조화",
    evidenceProvision: "근거 제시",
    criticalThinking: "비판적 사고",
    creativeThinking: "창의적 사고",
};

export const DIMENSION_KEYS = Object.keys(DIMENSION_LABELS);

/** Chart colors for each thinking dimension */
export const DIMENSION_COLORS: Record<string, string> = {
    problemUnderstanding: "#FF6B6B",
    premiseCheck: "#4ECDC4",
    logicalStructure: "#45B7D1",
    evidenceProvision: "#96CEB4",
    criticalThinking: "#FFEAA7",
    creativeThinking: "#DDA0DD",
};


// --- Socratic 5-Stage Labels ---

export const STAGE_LABELS: string[] = [
    "명확화",
    "탐색",
    "유도",
    "검증",
    "확장",
];

/** Total number of Socratic stages */
export const TOTAL_STAGES = 5;


// --- Subject Labels ---

export const SUBJECT_LABELS: Record<string, string> = {
    math: "수학",
    science: "과학",
    essay: "논술",
};


// --- Guest Configuration ---

/** Maximum number of turns allowed for guest users */
export const GUEST_MAX_TURNS = 5;


// --- Analysis Score Range ---

/** Minimum score for any thinking dimension */
export const MIN_DIMENSION_SCORE = 0;

/** Maximum score for any thinking dimension */
export const MAX_DIMENSION_SCORE = 10;


// --- Local Storage Keys ---

export const STORAGE_KEY_TOKEN = "thinkbridge_token";
export const STORAGE_KEY_USER = "thinkbridge_user";
