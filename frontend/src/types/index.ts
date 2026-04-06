/**
 * ThinkBridge TypeScript type definitions.
 * All interfaces align with backend Pydantic schemas (camelCase field names).
 */


// --- User & Auth ---

export interface User
{
    id: number;
    email: string;
    name: string;
    role: "student" | "instructor" | "admin";
    isGuest: boolean;
}

export interface TokenResponse
{
    accessToken: string;
    tokenType: string;
    user: User;
}

export interface GuestResponse extends TokenResponse
{
    maxTurns: number;
}


// --- Sessions ---

export interface TutoringSession
{
    id: number;
    subject: "math" | "science" | "essay";
    topic: string;
    status: "active" | "completed";
    totalTurns: number;
    startedAt: string;
    endedAt: string | null;
}

export interface SessionDetail extends TutoringSession
{
    messages: MessageWithAnalysis[];
}


// --- Messages ---

export interface Message
{
    id: number;
    sessionId: number;
    role: "user" | "assistant";
    content: string;
    turnNumber: number;
    createdAt: string;
}

export interface MessageWithAnalysis extends Message
{
    analysis: ThoughtAnalysis | null;
}


// --- Thought Analysis (6-Dimension Bloom's Revised Taxonomy) ---

export interface ThoughtAnalysis
{
    problemUnderstanding: number;
    premiseCheck: number;
    logicalStructure: number;
    evidenceProvision: number;
    criticalThinking: number;
    creativeThinking: number;
    detectedPatterns: string[];
    socraticStage: number;
    engagementLevel: "active" | "passive" | "stuck";
}


// --- SSE Streaming Events ---

export interface SSETokenEvent
{
    type: "token";
    data: string;
}

export interface SSEAnalysisEvent
{
    type: "analysis";
    data: ThoughtAnalysis;
}

export interface SSEDoneEvent
{
    type: "done";
    data: Record<string, number | string>;
}

export interface SSEErrorEvent
{
    type: "error";
    data: { message: string };
}

export type SSEEvent = SSETokenEvent | SSEAnalysisEvent | SSEDoneEvent | SSEErrorEvent;


// --- Reports ---

export interface Report
{
    id: number;
    sessionId: number;
    summary: string;
    dimensionScores: Record<string, number>;
    generatedAt: string;
}

export interface GrowthTrendEntry
{
    sessionId: number;
    date: string;
    problemUnderstanding: number;
    premiseCheck: number;
    logicalStructure: number;
    evidenceProvision: number;
    criticalThinking: number;
    creativeThinking: number;
}


// --- Dashboard (Instructor) ---

export interface ClassSummary
{
    id: number;
    name: string;
    subject: string;
    studentCount: number;
}

export interface StudentSummary
{
    id: number;
    name: string;
    sessionCount: number;
    avgScore: number;
}

export interface HeatmapEntry
{
    studentId: number;
    studentName: string;
    scores: Record<string, number>;
}

export interface HeatmapResponse
{
    entries: HeatmapEntry[];
    insight: string;
}


// --- Admin Dashboard ---

export interface AdminStats
{
    totalStudents: number;
    totalSessions: number;
    avgScore: number;
    activeRate: number;
}

export interface AdminClassComparison
{
    id: number;
    name: string;
    subject: string;
    studentCount: number;
    scores: Record<string, number>;
}

export interface AdminSubjectRadar
{
    subject: string;
    scores: Record<string, number>;
}
