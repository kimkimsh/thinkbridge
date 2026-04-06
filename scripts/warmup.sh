#!/bin/bash
# ThinkBridge 데모 워밍업 스크립트
# Render cold start 방지 및 데모 준비를 위한 사전 호출

BACKEND_URL="${1:-https://your-backend.onrender.com}"

echo "=== ThinkBridge Demo Warm-up ==="
echo "Backend: $BACKEND_URL"
echo ""

# 1. Health check
echo -n "Health check... "
curl -s "$BACKEND_URL/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'OK ({d[\"timestamp\"]})')" 2>/dev/null || echo "FAILED"

# 2. SSE test
echo -n "SSE test... "
timeout 5 curl -s -N "$BACKEND_URL/api/test-sse" | head -1 | grep -q "data" && echo "OK" || echo "FAILED"

# 3. Auth test (guest login)
echo -n "Guest login... "
TOKEN=$(curl -s -X POST "$BACKEND_URL/api/auth/guest" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)
if [ -n "$TOKEN" ]; then
    echo "OK (token received)"
else
    echo "FAILED"
fi

echo ""
echo "=== Warm-up Complete ==="
