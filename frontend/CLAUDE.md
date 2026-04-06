# ThinkBridge Frontend - Next.js 14 Implementation Guide

## Overview

Next.js 14 App Router frontend with SSE streaming, real-time thinking analysis, and role-based dashboards. The student chat interface is the **single most important page** — 80% of the demo.

## Tech Stack

- **Next.js 14** App Router (TypeScript, strict mode)
- **Tailwind CSS** utility-first styling
- **shadcn/ui** component library (Button, Card, Input, Badge, Tabs, ScrollArea, Textarea, Select, Sheet, Separator, Avatar, DropdownMenu)
- **Recharts** for charts (RadarChart, BarChart, LineChart)
- **lucide-react** for icons
- **Vercel** deployment

## Directory Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with AuthProvider, Korean font
│   │   ├── page.tsx                   # Landing: hero + ChatGPT comparison + guest CTA + demo mode
│   │   ├── globals.css                # Tailwind imports
│   │   ├── login/page.tsx             # Login form
│   │   ├── register/page.tsx          # Register with role selection (student/instructor)
│   │   ├── student/
│   │   │   ├── layout.tsx             # Auth guard + sidebar (student nav)
│   │   │   ├── chat/page.tsx          # Subject selector + topic input + ChatInterface
│   │   │   ├── sessions/page.tsx      # Session history list
│   │   │   └── report/[id]/page.tsx   # Radar + growth + timeline + narrative
│   │   ├── instructor/
│   │   │   ├── layout.tsx             # Auth guard + sidebar (instructor nav)
│   │   │   ├── dashboard/page.tsx     # ClassSelector + SummaryCards + Heatmap + StudentList
│   │   │   └── replay/[sessionId]/page.tsx  # Dual panel replay
│   │   └── admin/
│   │       ├── layout.tsx             # Auth guard (role === "admin")
│   │       └── dashboard/page.tsx     # Stats cards + class bar chart + subject radar
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx      # CORE: streaming + hint + end session
│   │   │   ├── MessageBubble.tsx      # User/AI message display
│   │   │   ├── ThoughtPanel.tsx       # Collapsible 6-dim analysis panel
│   │   │   └── ProgressBar.tsx        # Socratic 5-stage progress
│   │   ├── charts/
│   │   │   ├── RadarChart.tsx         # 6-dim radar + comparison overlay
│   │   │   ├── HeatmapChart.tsx       # Students x dimensions color matrix
│   │   │   ├── ThoughtTimeline.tsx    # Turn-by-turn badges
│   │   │   └── GrowthTrendChart.tsx   # Multi-line time-series
│   │   ├── dashboard/
│   │   │   ├── StudentList.tsx        # Student cards with scores
│   │   │   ├── SummaryCards.tsx       # 4 metric cards
│   │   │   └── ClassSelector.tsx      # Class dropdown
│   │   ├── replay/
│   │   │   └── SessionReplay.tsx      # Dual panel: messages + analysis
│   │   └── layout/
│   │       ├── Navbar.tsx             # User info, logout
│   │       └── Sidebar.tsx            # Role-based nav + mobile hamburger (Sheet)
│   ├── lib/
│   │   ├── api.ts                     # REST helper + SSE streaming (ReadableStream)
│   │   ├── auth.ts                    # AuthProvider context, login/register/guest/logout
│   │   └── constants.ts              # DIMENSION_LABELS, STAGE_LABELS, colors
│   └── types/
│       └── index.ts                   # All TypeScript interfaces
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

## SSE Streaming Client (CRITICAL)

**Must use `fetch` + `ReadableStream`, NOT `EventSource`** (EventSource doesn't support POST).

```typescript
// lib/api.ts
async function* streamMessages(sessionId: number, content: string, token: string) {
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = parseSSEBuffer(buffer);
        for (const event of events.parsed) {
            yield event;  // { type: "token"|"analysis"|"done", data: ... }
        }
        buffer = events.remaining;
    }
}

function parseSSEBuffer(buffer: string) {
    const events: SSEEvent[] = [];
    const lines = buffer.split('\n');
    let remaining = '';
    let currentEvent: Partial<SSEEvent> = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('event: ')) {
            currentEvent.type = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
            currentEvent.data = JSON.parse(line.slice(6).trim());
        } else if (line === '' && currentEvent.type) {
            events.push(currentEvent as SSEEvent);
            currentEvent = {};
        } else if (i === lines.length - 1 && line !== '') {
            remaining = line;
        }
    }

    return { parsed: events, remaining };
}
```

## Core Components

### ChatInterface.tsx (MOST IMPORTANT)
```
┌─────────────────────────────────────────┐
│ [ProgressBar: Stage 1→2→3→4→5]         │
├─────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ │
│ │  Message Area    │ │ ThoughtPanel    │ │
│ │  (scrollable)   │ │ (collapsible)   │ │
│ │                  │ │ 6-dim bars      │ │
│ │ User: ...        │ │ Stage badge     │ │
│ │ AI: ... (typing) │ │ Engagement      │ │
│ │                  │ │                 │ │
│ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────┤
│ [Input] [힌트 더 받기] [Send] [대화 마무리] │
└─────────────────────────────────────────┘
```

**Streaming behavior:**
- On "token" event → append character to AI message (typing effect)
- On "analysis" event → update ThoughtPanel bars + ProgressBar stage
- On "done" event → finalize message, enable input
- Stage 5 reached → auto-show "리포트 확인" button
- Session end → redirect to `/student/report/{id}`

**States:**
- Loading: typing animation dots (NOT text "생각하는 중...")
- Streaming: characters appearing one by one
- Idle: input enabled
- Guest: show "5턴 체험 중 (N/5)" badge

### ThoughtPanel.tsx
- **Student mode**: default collapsed (toggle to open)
- **Demo mode** (`?demo=true`): always open, numeric scores visible
- 6 dimension bars with animated transitions (CSS transition on width)
- Socratic stage indicator
- Engagement level badge (active/passive/stuck)

### ProgressBar.tsx
- 5 stages displayed horizontally at chat top
- Stage labels: 명확화 → 탐색 → 유도 → 검증 → 확장
- Current stage highlighted with color + animation
- Animated transitions on stage change

### MessageBubble.tsx
- User: right-aligned, blue background
- AI: left-aligned, gray background
- AI streaming: show partial text with cursor blink
- No pattern badges in student view

## Page Specifications

### Landing Page (page.tsx) — MOST IMPORTANT FOR JUDGES
```
┌─────────────────────────────────────┐
│ Hero Section                        │
│ "AI가 답을 주는 시대,               │
│  생각하는 법을 가르치는 AI"          │
│ [바로 체험하기] (most prominent CTA) │
├─────────────────────────────────────┤
│ ChatGPT vs ThinkBridge 비교         │
│ ┌───────────────┐ ┌───────────────┐ │
│ │ ChatGPT       │ │ ThinkBridge   │ │
│ │ "답: x=3"     │ │ "어떤 조건을  │ │
│ │ (답 제공)     │ │  사용했지?"   │ │
│ │               │ │ (사고 유도)   │ │
│ └───────────────┘ └───────────────┘ │
├─────────────────────────────────────┤
│ Feature Cards (3)                   │
│ [소크라테스 대화] [사고력 분석]       │
│ [교강사 대시보드]                    │
├─────────────────────────────────────┤
│ 데모 모드                           │
│ [학생으로 체험] [교강사로 체험]       │
│ [운영자로 체험]                     │
│ → 원클릭 로그인 → 해당 대시보드     │
└─────────────────────────────────────┘
```

- `useEffect`: warm-up call to backend `/health` on page load
- Demo buttons: auto-login with demo account, redirect to role dashboard

### Student Chat Page (student/chat/page.tsx)
- Subject selector: 수학 / 과학 / 논술
- Topic input field
- Guest mode: "5턴 체험 중" badge with remaining turns
- Start → POST /api/sessions → render ChatInterface

### Student Report Page (student/report/[id]/page.tsx)
- Loading skeleton while report generates
- RadarChart with comparison overlay (this session vs average)
- GrowthTrendChart (6 lines across sessions)
- ThoughtTimeline (turn-by-turn with dimension badges)
- AI narrative text (Korean)
- "N번의 사고 전환을 거쳐 스스로 답에 도달했습니다" summary

### Instructor Dashboard (instructor/dashboard/page.tsx)
```
┌─────────────────────────────────────┐
│ [ClassSelector dropdown]            │
├─────────────────────────────────────┤
│ SummaryCards (4):                   │
│ [총 학생] [평균 세션] [활성률] [평균]│
├─────────────────────────────────────┤
│ HeatmapChart (students x 6 dims)   │
│ + AI insight text below             │
│ "전체 학생의 N%가 비판적 사고       │
│  영역에서 4점 이하입니다"           │
├─────────────────────────────────────┤
│ StudentList (cards with scores)     │
│ → Click → replay page              │
└─────────────────────────────────────┘
```

### Session Replay (instructor/replay/[sessionId]/page.tsx)
- Student's session list on left
- Click session → dual panel:
  - Left: message conversation
  - Right: turn-by-turn ThoughtAnalysis
- **First student message auto-selected**

### Admin Dashboard (admin/dashboard/page.tsx)
- "Demo Data" banner at top: "데모 데이터입니다. 실제 운영 시 전체 학원 데이터가 표시됩니다."
- 전체 현황 카드 4개 (총 학생, 총 세션, 전체 평균, 활성률)
- 반별 사고력 비교 (BarChart: 3개 반 × 6차원 평균)
- 과목별 6차원 레이더 (RadarChart: 수학 vs 과학 vs 논술 overlay)

## Chart Components

### RadarChart.tsx (Recharts)
- 6 vertices: 6 thinking dimensions
- Comparison overlay: this session (solid fill) vs student average (dashed outline)
- Labels in Korean
- Responsive sizing

### HeatmapChart.tsx
- Matrix: students (rows) x 6 dimensions (columns)
- Color scale: red(0-3) → yellow(4-6) → green(7-10)
- Click student → navigate to replay
- AI insight text generated from data patterns

### GrowthTrendChart.tsx (Recharts LineChart)
- 6 lines (one per dimension), different colors
- X-axis: session dates
- Y-axis: scores 0-10
- Legend with dimension names (Korean)

### ThoughtTimeline.tsx
- Vertical timeline, one entry per turn
- Each entry: turn number, strongest/weakest dimension badges
- Color-coded by engagement level

## Auth System

### AuthProvider (lib/auth.ts)
- React Context for auth state
- JWT stored in localStorage
- Auto-redirect: unauthenticated → /login
- Role-based route protection in layout.tsx files

### Guest Flow
```
Landing "바로 체험하기" → POST /api/auth/guest → receive JWT
→ redirect to /student/chat (guest mode)
→ show "5턴 체험 중" badge
→ after 5 turns: "계속하려면 가입하세요" + mini analysis summary
```

### Demo Mode (One-Click Role Switch)
```
Landing demo buttons:
  [학생으로 체험] → auto-login student@demo.com → /student/chat
  [교강사로 체험] → auto-login instructor@demo.com → /instructor/dashboard
  [운영자로 체험] → auto-login admin@demo.com → /admin/dashboard
```

## Mobile Responsive Strategy

### Chat Page
- ThoughtPanel → Sheet drawer (bottom slide-up) on mobile
- Full-width message area
- Input area fixed at bottom

### Sidebar
- Desktop: fixed left sidebar
- Mobile: hamburger icon → Sheet component (slide-in)

### Dashboard
- Cards: vertical stack on mobile
- Heatmap: horizontal scroll on mobile
- Charts: full-width, reduced padding

### Landing
- Stack hero + comparison + features vertically
- Demo buttons: full-width stack

## UI/UX Guidelines

### Loading States
- Use skeleton UI components (not "로딩 중..." text)
- Chat loading: animated typing dots (3 bouncing dots)
- Report loading: radar chart skeleton + "사고 과정을 분석 중입니다..." message

### Error Handling
- Toast notifications for API errors (shadcn/ui Sonner)
- Global error boundary
- Network error: retry button

### Animations
- ThoughtPanel bars: CSS transition (width, 300ms ease)
- ProgressBar stage change: smooth highlight transition
- Skeleton pulse animation
- No canvas-confetti unless P2 time permits

## TypeScript Interfaces (types/index.ts)

```typescript
interface User {
    id: number;
    email: string;
    name: string;
    role: "student" | "instructor" | "admin";
    isGuest: boolean;
}

interface TutoringSession {
    id: number;
    subject: "math" | "science" | "essay";
    topic: string;
    status: "active" | "completed";
    totalTurns: number;
    startedAt: string;
    endedAt: string | null;
}

interface Message {
    id: number;
    sessionId: number;
    role: "user" | "assistant";
    content: string;
    turnNumber: number;
    createdAt: string;
}

interface ThoughtAnalysis {
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

interface SSEEvent {
    type: "token" | "analysis" | "done";
    data: string | ThoughtAnalysis | Record<string, never>;
}

interface Report {
    id: number;
    sessionId: number;
    summary: string;
    dimensionScores: Record<string, number>;
    generatedAt: string;
}

interface GrowthTrendEntry {
    sessionId: number;
    date: string;
    problemUnderstanding: number;
    premiseCheck: number;
    logicalStructure: number;
    evidenceProvision: number;
    criticalThinking: number;
    creativeThinking: number;
}

interface HeatmapEntry {
    studentId: number;
    studentName: string;
    scores: Record<string, number>;
}
```

## Constants (lib/constants.ts)

```typescript
const DIMENSION_LABELS: Record<string, string> = {
    problemUnderstanding: "문제 이해",
    premiseCheck: "전제 확인",
    logicalStructure: "논리 구조화",
    evidenceProvision: "근거 제시",
    criticalThinking: "비판적 사고",
    creativeThinking: "창의적 사고",
};

const STAGE_LABELS = ["명확화", "탐색", "유도", "검증", "확장"];

const SUBJECT_LABELS: Record<string, string> = {
    math: "수학",
    science: "과학",
    essay: "논술",
};
```
