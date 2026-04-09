# SSE Streaming Bug Report - v1

## Summary

AI responses were not displaying in the student chat interface despite the backend SSE endpoint working correctly (verified via curl). The root cause was the frontend SSE parser failing to detect event boundaries due to a line ending mismatch.

---

## Bug #1 (CRITICAL): SSE Event Boundary Detection Fails

### Symptom
The `parseSSEBuffer` function in `api.ts` never finds any SSE events in the incoming stream buffer, so token/analysis/done events are never yielded to the `ChatInterface` component. The AI response never appears.

### Root Cause
The `sse-starlette` library (used by the FastAPI backend) uses `\r\n` (CRLF) as its default line separator. This means SSE events are terminated by `\r\n\r\n`. However, the frontend parser searched for `\n\n` (LF LF) as the event boundary delimiter.

The string `\r\n\r\n` (CR LF CR LF) does **not** contain the substring `\n\n` (LF LF) because each `\n` is preceded by a `\r` -- there are never two consecutive `\n` characters.

- Backend output: `event: token\r\ndata: "hello"\r\n\r\n`
- Frontend search: `buffer.indexOf("\n\n")` => returns `-1` (never found)
- Result: No events are ever parsed from the buffer

### Fix Applied
Replaced the fixed `"\n\n"` boundary search with a regex that matches all valid SSE line ending combinations: `\r\n\r\n`, `\r\r`, and `\n\n`. Also replaced `split("\n")` line parsing with a regex split that handles `\r\n`, `\r`, and `\n`.

### Files Changed
- `frontend/src/lib/api.ts` -- `parseSSEBuffer()` function and SSE parsing constants

---

## Bug #2 (CRITICAL): SSE Line Parsing Leaves Trailing Carriage Returns

### Symptom
Even if event boundaries were somehow detected, individual SSE lines parsed by `split("\n")` would contain trailing `\r` characters when the backend uses `\r\n` line endings.

### Root Cause
Splitting `"event: token\r\ndata: \"hello\"\r\n"` by `"\n"` produces:
- `"event: token\r"` (trailing `\r`)
- `"data: \"hello\"\r"` (trailing `\r`)

For the `event:` line, the original code used `.trim()` on the extracted event type, which would remove the `\r`. But for the `data:` line, no `.trim()` was applied to `tDataStr`. This caused `JSON.parse('"hello"\r')` to fail with a parse error due to the trailing carriage return character.

### Fix Applied
- Changed line splitting to use `SSE_LINE_SPLIT_REGEX` (`/\r\n|\r|\n/`) which correctly handles all line ending formats
- Added `.trim()` to both event type and data string extraction
- Changed `SSE_EVENT_PREFIX` and `SSE_DATA_PREFIX` constants from `"event: "` and `"data: "` to `"event:"` and `"data:"` (without trailing space), using `.trim()` after `substring()` to handle optional whitespace between the colon and value

### Files Changed
- `frontend/src/lib/api.ts` -- `parseSSEBuffer()` function, SSE prefix constants

---

## Verification

### Pre-fix Data Flow (broken)
1. Backend sends: `event: token\r\ndata: "text"\r\n\r\n`
2. Frontend buffer accumulates bytes
3. `indexOf("\n\n")` returns -1 -- **event never detected**
4. Buffer grows indefinitely, no events yielded
5. ChatInterface receives nothing, streaming dots show forever

### Post-fix Data Flow (working)
1. Backend sends: `event: token\r\ndata: "text"\r\n\r\n`
2. Frontend buffer accumulates bytes
3. `SSE_EVENT_BOUNDARY_REGEX` matches `\r\n\r\n` -- event boundary found
4. Block split by `SSE_LINE_SPLIT_REGEX` into clean lines
5. `event: token` and `data: "text"` extracted correctly
6. `JSON.parse("\"text\"")` returns `"text"` (string)
7. `ChatInterface` receives `{type: "token", data: "text"}` and displays it

### Build Verification
- `npm run build` passes with no errors

---

## Non-Issues Investigated

### Analysis event order
The analysis event can arrive before token events when Claude returns `tool_use` before `text`. The `ChatInterface` handles events independently (token accumulates text, analysis updates panel, done finalizes), so order does not matter.

### Double JSON encoding
The backend does `json.dumps(tEventData)` where `tEventData` is a string for token events. This produces `'"hello"'` (JSON-encoded string). The frontend correctly does `JSON.parse(tDataStr)` which unwraps to `"hello"`. No double-encoding bug.

### Snake-case to camelCase conversion
The `convertAnalysisToCamelCase` function correctly maps all 9 analysis fields from snake_case to camelCase. No bug found.

### Fallback response handling
When AI returns only `tool_use` without text, the backend sends `FALLBACK_RESPONSE_TEXT` as a single token event. The frontend accumulates this the same as streamed chunks. No bug found.
