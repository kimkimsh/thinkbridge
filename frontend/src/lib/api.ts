/**
 * ThinkBridge API client.
 * REST request helper and SSE streaming via fetch + ReadableStream.
 * CRITICAL: SSE uses fetch (NOT EventSource) to support POST with body.
 */

import { API_URL } from "@/lib/constants";
import type {
    TokenResponse,
    GuestResponse,
    TutoringSession,
    SessionDetail,
    Report,
    GrowthTrendEntry,
    ClassSummary,
    StudentSummary,
    HeatmapResponse,
    SSEEvent,
    ThoughtAnalysis,
    AdminStats,
    AdminClassComparison,
    AdminSubjectRadar,
} from "@/types";


// --- Error Constants ---

const ERROR_STREAM_NO_BODY = "서버 응답에 스트림 본문이 없습니다.";


// --- SSE Parsing Constants ---

const SSE_EVENT_PREFIX = "event:";
const SSE_DATA_PREFIX = "data:";

/**
 * Regex matching SSE event boundaries (blank line between events).
 * Handles all valid SSE line endings: \r\n, \r, or \n.
 * A blank line is two consecutive line endings with nothing between them.
 */
const SSE_EVENT_BOUNDARY_REGEX = /\r\n\r\n|\r\r|\n\n/;

/**
 * Regex matching any single line ending: \r\n (must be checked first), \r, or \n.
 */
const SSE_LINE_SPLIT_REGEX = /\r\n|\r|\n/;


// --- Snake-to-Camel Conversion for Analysis ---

/** Maps snake_case analysis keys to camelCase TypeScript field names */
const ANALYSIS_KEY_MAP: Record<string, string> = {
    problem_understanding: "problemUnderstanding",
    premise_check: "premiseCheck",
    logical_structure: "logicalStructure",
    evidence_provision: "evidenceProvision",
    critical_thinking: "criticalThinking",
    creative_thinking: "creativeThinking",
    detected_patterns: "detectedPatterns",
    socratic_stage: "socraticStage",
    engagement_level: "engagementLevel",
};


// --- REST Helper ---

interface ApiRequestOptions
{
    method?: string;
    body?: unknown;
    token?: string;
}

/**
 * Generic REST request helper with automatic auth header and JSON handling.
 * Throws an Error with detail message on non-2xx responses.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T>
{
    const { method = "GET", body, token } = options;

    const tHeaders: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (token)
    {
        tHeaders["Authorization"] = `Bearer ${token}`;
    }

    const tFetchOptions: RequestInit = {
        method,
        headers: tHeaders,
    };

    if (body !== undefined)
    {
        tFetchOptions.body = JSON.stringify(body);
    }

    const tResponse = await fetch(`${API_URL}${path}`, tFetchOptions);

    if (!tResponse.ok)
    {
        let tErrorMessage = `HTTP ${tResponse.status}`;
        try
        {
            const tErrorData = await tResponse.json();
            if (tErrorData.detail)
            {
                tErrorMessage = tErrorData.detail;
            }
        }
        catch
        {
            // 응답 본문이 JSON이 아닌 경우 기본 에러 메시지 사용
        }
        throw new Error(tErrorMessage);
    }

    return tResponse.json() as Promise<T>;
}


// --- SSE Streaming ---

interface ParsedSSEResult
{
    events: SSEEvent[];
    remaining: string;
}

/**
 * Converts a snake_case analysis object from the AI engine to camelCase.
 * The backend SSE stream sends analysis data with snake_case keys directly from Claude.
 */
function convertAnalysisToCamelCase(rawAnalysis: Record<string, unknown>): ThoughtAnalysis
{
    const tConverted: Record<string, unknown> = {};

    for (const [tSnakeKey, tValue] of Object.entries(rawAnalysis))
    {
        const tCamelKey = ANALYSIS_KEY_MAP[tSnakeKey];
        if (tCamelKey)
        {
            tConverted[tCamelKey] = tValue;
        }
        else
        {
            tConverted[tSnakeKey] = tValue;
        }
    }

    return tConverted as unknown as ThoughtAnalysis;
}

/**
 * Parses a buffer of SSE text into discrete events.
 * SSE format: "event: <type>\ndata: <json>\n\n"
 * Handles all valid SSE line endings: \r\n, \r, and \n.
 * Returns parsed events and any remaining incomplete data.
 */
function parseSSEBuffer(buffer: string): ParsedSSEResult
{
    const tEvents: SSEEvent[] = [];
    let tRemaining = buffer;

    while (true)
    {
        const tMatch = SSE_EVENT_BOUNDARY_REGEX.exec(tRemaining);
        if (!tMatch || tMatch.index === undefined)
        {
            break;
        }

        const tEndIndex = tMatch.index;
        const tBoundaryLength = tMatch[0].length;

        const tBlock = tRemaining.substring(0, tEndIndex);
        tRemaining = tRemaining.substring(tEndIndex + tBoundaryLength);

        let tEventType = "";
        let tDataStr = "";

        // Split lines using regex that handles all line ending variants
        const tLines = tBlock.split(SSE_LINE_SPLIT_REGEX);
        for (const tLine of tLines)
        {
            // Trim to handle any residual whitespace from line endings
            const tTrimmedLine = tLine.trim();

            if (tTrimmedLine.startsWith(SSE_EVENT_PREFIX))
            {
                tEventType = tTrimmedLine.substring(SSE_EVENT_PREFIX.length).trim();
            }
            else if (tTrimmedLine.startsWith(SSE_DATA_PREFIX))
            {
                tDataStr = tTrimmedLine.substring(SSE_DATA_PREFIX.length).trim();
            }
        }

        if (!tEventType || !tDataStr)
        {
            continue;
        }

        try
        {
            const tParsedData = JSON.parse(tDataStr);

            if (tEventType === "token")
            {
                tEvents.push({ type: "token", data: tParsedData as string });
            }
            else if (tEventType === "analysis")
            {
                // AI 엔진에서 snake_case로 전달되는 분석 데이터를 camelCase로 변환
                const tAnalysis = convertAnalysisToCamelCase(tParsedData);
                tEvents.push({ type: "analysis", data: tAnalysis });
            }
            else if (tEventType === "done")
            {
                tEvents.push({ type: "done", data: tParsedData });
            }
            else if (tEventType === "error")
            {
                tEvents.push({ type: "error", data: tParsedData });
            }
        }
        catch
        {
            // JSON 파싱 실패 시 해당 이벤트 무시
        }
    }

    return { events: tEvents, remaining: tRemaining };
}

/**
 * SSE streaming via fetch + ReadableStream (NOT EventSource).
 * EventSource only supports GET; this endpoint requires POST with JSON body.
 * Yields SSEEvent objects as they arrive from the server.
 */
export async function* streamMessages(
    sessionId: number,
    content: string,
    token: string,
): AsyncGenerator<SSEEvent>
{
    const tResponse = await fetch(`${API_URL}/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
    });

    if (!tResponse.ok)
    {
        let tErrorMessage = `HTTP ${tResponse.status}`;
        try
        {
            const tErrorData = await tResponse.json();
            if (tErrorData.detail)
            {
                tErrorMessage = tErrorData.detail;
            }
        }
        catch
        {
            // JSON이 아닌 에러 응답
        }
        throw new Error(tErrorMessage);
    }

    if (!tResponse.body)
    {
        throw new Error(ERROR_STREAM_NO_BODY);
    }

    const tReader = tResponse.body.getReader();
    const tDecoder = new TextDecoder();
    let tBuffer = "";

    while (true)
    {
        const { done, value } = await tReader.read();

        if (done)
        {
            break;
        }

        tBuffer += tDecoder.decode(value, { stream: true });
        const tResult = parseSSEBuffer(tBuffer);

        for (const tEvent of tResult.events)
        {
            yield tEvent;
        }

        tBuffer = tResult.remaining;
    }
}


// --- Auth API ---

/**
 * 로그인 - 이메일/비밀번호 인증 후 JWT 토큰 발급
 */
export function login(email: string, password: string): Promise<TokenResponse>
{
    return apiRequest<TokenResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
    });
}

/**
 * 회원가입 - 학생 또는 강사 계정 생성
 */
export function register(
    email: string,
    name: string,
    password: string,
    role: string = "student",
): Promise<TokenResponse>
{
    return apiRequest<TokenResponse>("/api/auth/register", {
        method: "POST",
        body: { email, name, password, role },
    });
}

/**
 * 게스트 체험 - 비회원 5턴 체험 세션 생성
 */
export function loginAsGuest(): Promise<GuestResponse>
{
    return apiRequest<GuestResponse>("/api/auth/guest", {
        method: "POST",
    });
}


// --- Session API ---

/**
 * 새 튜터링 세션 생성
 */
export function createSession(
    subject: string,
    topic: string,
    token: string,
): Promise<TutoringSession>
{
    return apiRequest<TutoringSession>("/api/sessions", {
        method: "POST",
        body: { subject, topic },
        token,
    });
}

/**
 * 내 세션 목록 조회 (최근 순)
 */
export function getSessions(token: string): Promise<TutoringSession[]>
{
    return apiRequest<TutoringSession[]>("/api/sessions", { token });
}

/**
 * 세션 상세 조회 - 메시지 + 사고 분석 포함
 */
export function getSessionDetail(sessionId: number, token: string): Promise<SessionDetail>
{
    return apiRequest<SessionDetail>(`/api/sessions/${sessionId}`, { token });
}

/**
 * 세션 종료 - 완료 처리 및 자동 리포트 생성 트리거
 */
export function endSession(sessionId: number, token: string): Promise<TutoringSession>
{
    return apiRequest<TutoringSession>(`/api/sessions/${sessionId}/end`, {
        method: "PATCH",
        token,
    });
}


// --- Report API ---

/**
 * 세션 리포트 조회 - 6차원 점수 + 서술 요약
 */
export function getSessionReport(sessionId: number, token: string): Promise<Report>
{
    return apiRequest<Report>(`/api/reports/session/${sessionId}`, { token });
}

/**
 * 학생 성장 추세 조회 - 세션별 6차원 점수 시계열
 */
export function getStudentGrowth(studentId: number, token: string): Promise<GrowthTrendEntry[]>
{
    return apiRequest<GrowthTrendEntry[]>(`/api/students/${studentId}/growth`, { token });
}


// --- Dashboard API (Instructor) ---

/**
 * 강사 교실 목록 조회
 */
export function getClasses(token: string): Promise<ClassSummary[]>
{
    return apiRequest<ClassSummary[]>("/api/dashboard/classes", { token });
}

/**
 * 교실 학생 목록 조회 - 세션 수 및 평균 점수 포함
 */
export function getClassStudents(classId: number, token: string): Promise<StudentSummary[]>
{
    return apiRequest<StudentSummary[]>(`/api/dashboard/classes/${classId}/students`, { token });
}

/**
 * 교실 히트맵 조회 - 학생별 6차원 점수 매트릭스 + AI 인사이트
 */
export function getClassHeatmap(classId: number, token: string): Promise<HeatmapResponse>
{
    return apiRequest<HeatmapResponse>(`/api/dashboard/classes/${classId}/heatmap`, { token });
}


// --- Admin Dashboard API ---

/**
 * 관리자 전체 통계 조회 - 총 학생, 총 세션, 평균 점수, 활성률
 */
export function getAdminStats(token: string): Promise<AdminStats>
{
    return apiRequest<AdminStats>("/api/admin/stats", { token });
}

/**
 * 반별 6차원 사고력 비교 데이터 조회 - BarChart용
 */
export function getAdminClasses(token: string): Promise<AdminClassComparison[]>
{
    return apiRequest<AdminClassComparison[]>("/api/admin/classes", { token });
}

/**
 * 과목별 6차원 레이더 데이터 조회 - RadarChart overlay용
 */
export function getAdminSubjects(token: string): Promise<AdminSubjectRadar[]>
{
    return apiRequest<AdminSubjectRadar[]>("/api/admin/subjects", { token });
}
