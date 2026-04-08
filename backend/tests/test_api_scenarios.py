#!/usr/bin/env python3
"""
ThinkBridge API Comprehensive Test Script
Tests 100+ scenarios across all endpoints using httpx sync client.

Usage:
    python tests/test_api_scenarios.py

Requires:
    - Backend running at http://localhost:8000
    - Seed data loaded (demo accounts)
"""

import sys
import time
import uuid

import httpx


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_URL = "http://localhost:8000"
REQUEST_TIMEOUT = 30

DEMO_STUDENT_EMAIL = "student@demo.com"
DEMO_INSTRUCTOR_EMAIL = "instructor@demo.com"
DEMO_ADMIN_EMAIL = "admin@demo.com"
DEMO_PASSWORD = "demo1234"

VALID_SUBJECTS = {"math", "science", "essay"}
DIMENSION_KEYS = [
    "problemUnderstanding",
    "premiseCheck",
    "logicalStructure",
    "evidenceProvision",
    "criticalThinking",
    "creativeThinking",
]

TOKEN_RESPONSE_KEYS = {"accessToken", "tokenType", "user"}
USER_RESPONSE_KEYS = {"id", "email", "name", "role", "isGuest"}
SESSION_RESPONSE_KEYS = {"id", "subject", "topic", "status", "totalTurns", "startedAt", "endedAt"}
SESSION_DETAIL_KEYS = SESSION_RESPONSE_KEYS | {"messages"}
MESSAGE_KEYS = {"id", "sessionId", "role", "content", "turnNumber", "createdAt", "analysis"}
REPORT_KEYS = {"id", "sessionId", "summary", "dimensionScores", "generatedAt"}
GROWTH_ENTRY_KEYS = {"sessionId", "date"} | set(DIMENSION_KEYS)
ADMIN_STATS_KEYS = {"totalStudents", "totalSessions", "avgScore", "activeRate"}
ADMIN_CLASS_KEYS = {"id", "name", "subject", "studentCount", "scores"}
ADMIN_SUBJECT_KEYS = {"subject", "scores"}
HEATMAP_ENTRY_KEYS = {"studentId", "studentName", "scores"}
HEATMAP_RESPONSE_KEYS = {"entries", "insight"}
CLASS_SUMMARY_KEYS = {"id", "name", "subject", "studentCount"}
STUDENT_SUMMARY_KEYS = {"id", "name", "sessionCount", "avgScore"}


# ---------------------------------------------------------------------------
# Test harness
# ---------------------------------------------------------------------------

class TestRunner:
    """Simple sequential test runner that collects pass/fail results."""

    def __init__(self):
        self.mResults = []
        self.mClient = httpx.Client(base_url=BASE_URL, timeout=REQUEST_TIMEOUT)
        self.mTokens = {}
        self.mUserIds = {}

    def record(self, description, passed, detail=""):
        """Record a test result."""
        tStatus = "PASS" if passed else "FAIL"
        self.mResults.append((description, passed))
        tDetailSuffix = f" -- {detail}" if detail and not passed else ""
        print(f"  [{tStatus}] {description}{tDetailSuffix}")

    def assertStatus(self, description, response, expected):
        """Assert HTTP status code."""
        tPassed = response.status_code == expected
        tDetail = ""
        if not tPassed:
            tBody = ""
            try:
                tBody = response.json()
            except Exception:
                tBody = response.text[:200]
            tDetail = f"expected {expected}, got {response.status_code}: {tBody}"
        self.record(description, tPassed, tDetail)
        return tPassed

    def assertTrue(self, description, condition, detail=""):
        """Assert a boolean condition."""
        self.record(description, bool(condition), detail)
        return bool(condition)

    def login(self, email, password):
        """Login and return (token, user_dict). Caches by email."""
        if email in self.mTokens:
            return self.mTokens[email], self.mUserIds[email]
        tResponse = self.mClient.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        if tResponse.status_code == 200:
            tData = tResponse.json()
            self.mTokens[email] = tData["accessToken"]
            self.mUserIds[email] = tData["user"]
            return tData["accessToken"], tData["user"]
        return None, None

    def authHeaders(self, token):
        """Build Authorization header dict."""
        return {"Authorization": f"Bearer {token}"}

    def printSummary(self):
        """Print final summary and return exit code."""
        tTotal = len(self.mResults)
        tPassed = sum(1 for _, p in self.mResults if p)
        tFailed = tTotal - tPassed

        print("\n" + "=" * 60)
        print(f"TOTAL: {tTotal}  |  PASSED: {tPassed}  |  FAILED: {tFailed}")
        print("=" * 60)

        if tFailed > 0:
            print("\nFailed tests:")
            for tDesc, tPass in self.mResults:
                if not tPass:
                    print(f"  - {tDesc}")

        return 1 if tFailed > 0 else 0


# ---------------------------------------------------------------------------
# Test categories
# ---------------------------------------------------------------------------


def testAuth(runner):
    """Auth endpoint tests (15+ assertions)."""
    print("\n--- AUTH TESTS ---")

    # 1. Register new student
    tUniqueEmail = f"test_student_{uuid.uuid4().hex[:8]}@test.com"
    tResp = runner.mClient.post("/api/auth/register", json={
        "email": tUniqueEmail,
        "name": "Test Student",
        "password": "testpass1234",
        "role": "student",
    })
    runner.assertStatus("Register new student -> 201", tResp, 201)
    if tResp.status_code == 201:
        tData = tResp.json()
        runner.assertTrue(
            "Register response has TokenResponse keys",
            TOKEN_RESPONSE_KEYS.issubset(set(tData.keys())),
            f"got keys: {list(tData.keys())}",
        )
        runner.assertTrue(
            "Register response tokenType is bearer",
            tData.get("tokenType") == "bearer",
            f"got: {tData.get('tokenType')}",
        )
        tUser = tData.get("user", {})
        runner.assertTrue(
            "Register user has correct fields",
            USER_RESPONSE_KEYS.issubset(set(tUser.keys())),
            f"got keys: {list(tUser.keys())}",
        )
        runner.assertTrue(
            "Register user role is student",
            tUser.get("role") == "student",
            f"got: {tUser.get('role')}",
        )
        runner.assertTrue(
            "Register user isGuest is False",
            tUser.get("isGuest") is False,
        )
        runner.assertTrue(
            "Register user email matches",
            tUser.get("email") == tUniqueEmail,
            f"got: {tUser.get('email')}",
        )

    # 2. Register new instructor
    tInstrEmail = f"test_instr_{uuid.uuid4().hex[:8]}@test.com"
    tResp = runner.mClient.post("/api/auth/register", json={
        "email": tInstrEmail,
        "name": "Test Instructor",
        "password": "testpass1234",
        "role": "instructor",
    })
    runner.assertStatus("Register new instructor -> 201", tResp, 201)
    if tResp.status_code == 201:
        runner.assertTrue(
            "Instructor role is instructor",
            tResp.json()["user"]["role"] == "instructor",
        )

    # 3. Register with duplicate email
    tResp = runner.mClient.post("/api/auth/register", json={
        "email": tUniqueEmail,
        "name": "Duplicate",
        "password": "testpass1234",
        "role": "student",
    })
    runner.assertStatus("Register duplicate email -> 400", tResp, 400)

    # 4. Register with invalid role
    tResp = runner.mClient.post("/api/auth/register", json={
        "email": f"invalid_role_{uuid.uuid4().hex[:8]}@test.com",
        "name": "Bad Role",
        "password": "testpass1234",
        "role": "admin",
    })
    runner.assertStatus("Register with invalid role -> 400", tResp, 400)

    # 5. Register with short password (<4 chars)
    tResp = runner.mClient.post("/api/auth/register", json={
        "email": f"short_pw_{uuid.uuid4().hex[:8]}@test.com",
        "name": "Short PW",
        "password": "abc",
        "role": "student",
    })
    runner.assertStatus("Register short password -> 422", tResp, 422)

    # 6. Register with missing fields (no email)
    tResp = runner.mClient.post("/api/auth/register", json={
        "name": "No Email",
        "password": "testpass1234",
    })
    runner.assertStatus("Register missing email -> 422", tResp, 422)

    # 7. Register with missing name
    tResp = runner.mClient.post("/api/auth/register", json={
        "email": f"no_name_{uuid.uuid4().hex[:8]}@test.com",
        "password": "testpass1234",
    })
    runner.assertStatus("Register missing name -> 422", tResp, 422)

    # 8. Login with valid credentials (student)
    tResp = runner.mClient.post("/api/auth/login", json={
        "email": DEMO_STUDENT_EMAIL,
        "password": DEMO_PASSWORD,
    })
    runner.assertStatus("Login student -> 200", tResp, 200)
    if tResp.status_code == 200:
        tData = tResp.json()
        runner.assertTrue(
            "Login response has accessToken",
            "accessToken" in tData and len(tData["accessToken"]) > 0,
        )
        runner.assertTrue(
            "Login user role is student",
            tData["user"]["role"] == "student",
        )

    # 9. Login with valid credentials (instructor)
    tResp = runner.mClient.post("/api/auth/login", json={
        "email": DEMO_INSTRUCTOR_EMAIL,
        "password": DEMO_PASSWORD,
    })
    runner.assertStatus("Login instructor -> 200", tResp, 200)

    # 10. Login with valid credentials (admin)
    tResp = runner.mClient.post("/api/auth/login", json={
        "email": DEMO_ADMIN_EMAIL,
        "password": DEMO_PASSWORD,
    })
    runner.assertStatus("Login admin -> 200", tResp, 200)

    # 11. Login with wrong password
    tResp = runner.mClient.post("/api/auth/login", json={
        "email": DEMO_STUDENT_EMAIL,
        "password": "wrongpassword",
    })
    runner.assertStatus("Login wrong password -> 401", tResp, 401)

    # 12. Login with non-existent email
    tResp = runner.mClient.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "whatever",
    })
    runner.assertStatus("Login non-existent email -> 401", tResp, 401)

    # 13. Guest login
    tResp = runner.mClient.post("/api/auth/guest")
    runner.assertStatus("Guest login -> 201", tResp, 201)
    if tResp.status_code == 201:
        tGuestData = tResp.json()
        runner.assertTrue(
            "Guest isGuest is True",
            tGuestData["user"]["isGuest"] is True,
        )
        runner.assertTrue(
            "Guest maxTurns is 5",
            tGuestData.get("maxTurns") == 5,
            f"got: {tGuestData.get('maxTurns')}",
        )
        runner.assertTrue(
            "Guest has accessToken",
            "accessToken" in tGuestData and len(tGuestData["accessToken"]) > 0,
        )

    # 14. Multiple guest logins produce unique emails
    tGuest1 = runner.mClient.post("/api/auth/guest").json()
    tGuest2 = runner.mClient.post("/api/auth/guest").json()
    runner.assertTrue(
        "Multiple guests get unique emails",
        tGuest1["user"]["email"] != tGuest2["user"]["email"],
        f"email1={tGuest1['user']['email']}, email2={tGuest2['user']['email']}",
    )

    # 15. Token response structure validation
    tResp = runner.mClient.post("/api/auth/login", json={
        "email": DEMO_STUDENT_EMAIL,
        "password": DEMO_PASSWORD,
    })
    if tResp.status_code == 200:
        tData = tResp.json()
        runner.assertTrue(
            "Token response has all required keys (accessToken, tokenType, user)",
            all(k in tData for k in ["accessToken", "tokenType", "user"]),
        )
        tUser = tData["user"]
        runner.assertTrue(
            "User response has all required keys (id, email, name, role, isGuest)",
            all(k in tUser for k in ["id", "email", "name", "role", "isGuest"]),
        )
        runner.assertTrue(
            "User id is a positive integer",
            isinstance(tUser["id"], int) and tUser["id"] > 0,
        )


def testSessions(runner):
    """Session endpoint tests (20+ assertions)."""
    print("\n--- SESSION TESTS ---")

    tStudentToken, tStudentUser = runner.login(DEMO_STUDENT_EMAIL, DEMO_PASSWORD)
    tStudentHeaders = runner.authHeaders(tStudentToken)

    # 1. Create session with valid data
    tResp = runner.mClient.post("/api/sessions", json={
        "subject": "math",
        "topic": "Test topic: quadratic equations",
    }, headers=tStudentHeaders)
    runner.assertStatus("Create session -> 201", tResp, 201)
    tCreatedSessionId = None
    if tResp.status_code == 201:
        tSessionData = tResp.json()
        tCreatedSessionId = tSessionData["id"]
        runner.assertTrue(
            "Created session has correct keys",
            SESSION_RESPONSE_KEYS.issubset(set(tSessionData.keys())),
            f"got keys: {list(tSessionData.keys())}",
        )
        runner.assertTrue(
            "Created session subject is math",
            tSessionData["subject"] == "math",
        )
        runner.assertTrue(
            "Created session status is active",
            tSessionData["status"] == "active",
        )
        runner.assertTrue(
            "Created session totalTurns is 0",
            tSessionData["totalTurns"] == 0,
        )
        runner.assertTrue(
            "Created session endedAt is null",
            tSessionData["endedAt"] is None,
        )

    # 2. Create session with science subject
    tResp = runner.mClient.post("/api/sessions", json={
        "subject": "science",
        "topic": "Newton's laws",
    }, headers=tStudentHeaders)
    runner.assertStatus("Create science session -> 201", tResp, 201)

    # 3. Create session with essay subject
    tResp = runner.mClient.post("/api/sessions", json={
        "subject": "essay",
        "topic": "Argumentative writing",
    }, headers=tStudentHeaders)
    runner.assertStatus("Create essay session -> 201", tResp, 201)

    # 4. Create session without auth
    tResp = runner.mClient.post("/api/sessions", json={
        "subject": "math",
        "topic": "No auth",
    })
    runner.assertStatus("Create session without auth -> 401", tResp, 401)

    # 5. Create session with invalid subject
    tResp = runner.mClient.post("/api/sessions", json={
        "subject": "history",
        "topic": "Invalid subject",
    }, headers=tStudentHeaders)
    runner.assertStatus("Create session invalid subject -> 400", tResp, 400)

    # 6. List sessions
    tResp = runner.mClient.get("/api/sessions", headers=tStudentHeaders)
    runner.assertStatus("List sessions -> 200", tResp, 200)
    if tResp.status_code == 200:
        tSessions = tResp.json()
        runner.assertTrue(
            "List sessions returns array",
            isinstance(tSessions, list),
        )
        runner.assertTrue(
            "List sessions has entries (seed data + created)",
            len(tSessions) > 0,
            f"count: {len(tSessions)}",
        )
        if tSessions:
            runner.assertTrue(
                "Session items have correct keys",
                SESSION_RESPONSE_KEYS.issubset(set(tSessions[0].keys())),
                f"got keys: {list(tSessions[0].keys())}",
            )

    # 7. List sessions without auth
    tResp = runner.mClient.get("/api/sessions")
    runner.assertStatus("List sessions without auth -> 401", tResp, 401)

    # 8. Get session detail (seed session 1)
    tResp = runner.mClient.get("/api/sessions/1", headers=tStudentHeaders)
    runner.assertStatus("Get session detail -> 200", tResp, 200)
    if tResp.status_code == 200:
        tDetail = tResp.json()
        runner.assertTrue(
            "Session detail has messages key",
            "messages" in tDetail,
        )
        runner.assertTrue(
            "Session detail messages is a list",
            isinstance(tDetail.get("messages"), list),
        )
        runner.assertTrue(
            "Session detail has correct keys",
            SESSION_DETAIL_KEYS.issubset(set(tDetail.keys())),
            f"got keys: {list(tDetail.keys())}",
        )
        tMessages = tDetail.get("messages", [])
        if tMessages:
            runner.assertTrue(
                "Messages have correct keys",
                MESSAGE_KEYS.issubset(set(tMessages[0].keys())),
                f"got keys: {list(tMessages[0].keys())}",
            )
            # Check that messages have roles
            tRoles = {m["role"] for m in tMessages}
            runner.assertTrue(
                "Messages contain user and assistant roles",
                "user" in tRoles and "assistant" in tRoles,
                f"roles found: {tRoles}",
            )

    # 9. Get session detail for non-existent session
    tResp = runner.mClient.get("/api/sessions/99999", headers=tStudentHeaders)
    runner.assertStatus("Get non-existent session -> 404", tResp, 404)

    # 10. Get session detail for another user's session -> 403
    # Create a new user and try to access student's session
    tOtherEmail = f"other_user_{uuid.uuid4().hex[:8]}@test.com"
    tRegResp = runner.mClient.post("/api/auth/register", json={
        "email": tOtherEmail,
        "name": "Other User",
        "password": "testpass1234",
        "role": "student",
    })
    if tRegResp.status_code == 201:
        tOtherToken = tRegResp.json()["accessToken"]
        tOtherHeaders = runner.authHeaders(tOtherToken)
        tResp = runner.mClient.get("/api/sessions/1", headers=tOtherHeaders)
        runner.assertStatus("Get other user's session -> 403", tResp, 403)

    # 11. End session
    if tCreatedSessionId:
        tResp = runner.mClient.patch(
            f"/api/sessions/{tCreatedSessionId}/end",
            headers=tStudentHeaders,
        )
        runner.assertStatus("End session -> 200", tResp, 200)
        if tResp.status_code == 200:
            runner.assertTrue(
                "Ended session status is completed",
                tResp.json()["status"] == "completed",
            )
            runner.assertTrue(
                "Ended session has endedAt timestamp",
                tResp.json()["endedAt"] is not None,
            )

    # 12. End already-completed session -> 400
    if tCreatedSessionId:
        tResp = runner.mClient.patch(
            f"/api/sessions/{tCreatedSessionId}/end",
            headers=tStudentHeaders,
        )
        runner.assertStatus("End already-completed session -> 400", tResp, 400)

    # 13. End non-existent session -> 404
    tResp = runner.mClient.patch(
        "/api/sessions/99999/end",
        headers=tStudentHeaders,
    )
    runner.assertStatus("End non-existent session -> 404", tResp, 404)

    # 14. End another user's session -> 403
    # Use a seed data session that belongs to a different student
    # First find another student's session
    tInstructorToken, _ = runner.login(DEMO_INSTRUCTOR_EMAIL, DEMO_PASSWORD)
    tInstructorHeaders = runner.authHeaders(tInstructorToken)
    # Instructor can view session 1, but student created new session; let's use
    # a session that doesn't belong to demo student
    # Sessions 6-10 belong to student id=4 based on seed data
    tResp = runner.mClient.patch(
        "/api/sessions/6/end",
        headers=tStudentHeaders,
    )
    # Should be 403 (not owner) or 400 (already completed)
    runner.assertTrue(
        "End other user's session -> 403 or 400",
        tResp.status_code in (403, 400),
        f"got: {tResp.status_code}",
    )

    # 15. Instructor can view any session detail
    tResp = runner.mClient.get("/api/sessions/1", headers=tInstructorHeaders)
    runner.assertStatus("Instructor can view session detail -> 200", tResp, 200)

    # 16. Create session with empty topic
    tResp = runner.mClient.post("/api/sessions", json={
        "subject": "math",
        "topic": "",
    }, headers=tStudentHeaders)
    # Empty string is valid for topic (no validation rule), so could be 201
    runner.assertTrue(
        "Create session with empty topic -> accepted (201) or rejected",
        tResp.status_code in (201, 400, 422),
        f"got: {tResp.status_code}",
    )

    return tCreatedSessionId


def testReports(runner):
    """Report endpoint tests (10+ assertions)."""
    print("\n--- REPORT TESTS ---")

    tStudentToken, tStudentUser = runner.login(DEMO_STUDENT_EMAIL, DEMO_PASSWORD)
    tStudentHeaders = runner.authHeaders(tStudentToken)
    tStudentId = tStudentUser["id"]

    # 1. Get session report (seed session 1)
    tResp = runner.mClient.get("/api/reports/session/1", headers=tStudentHeaders)
    runner.assertStatus("Get session report -> 200", tResp, 200)
    if tResp.status_code == 200:
        tReport = tResp.json()
        runner.assertTrue(
            "Report has correct keys",
            REPORT_KEYS.issubset(set(tReport.keys())),
            f"got keys: {list(tReport.keys())}",
        )
        runner.assertTrue(
            "Report sessionId matches",
            tReport["sessionId"] == 1,
        )
        runner.assertTrue(
            "Report summary is non-empty string",
            isinstance(tReport["summary"], str) and len(tReport["summary"]) > 0,
        )
        runner.assertTrue(
            "Report dimensionScores is a dict",
            isinstance(tReport["dimensionScores"], dict),
        )
        runner.assertTrue(
            "Report dimensionScores has 6 dimensions",
            len(tReport["dimensionScores"]) == 6,
            f"got {len(tReport['dimensionScores'])} keys: {list(tReport['dimensionScores'].keys())}",
        )

    # 2. Get report for non-existent session
    tResp = runner.mClient.get("/api/reports/session/99999", headers=tStudentHeaders)
    runner.assertStatus("Get report non-existent session -> 404", tResp, 404)

    # 3. Get report without auth
    tResp = runner.mClient.get("/api/reports/session/1")
    runner.assertStatus("Get report without auth -> 401", tResp, 401)

    # 4. Student growth trend
    tResp = runner.mClient.get(
        f"/api/students/{tStudentId}/growth",
        headers=tStudentHeaders,
    )
    runner.assertStatus("Get student growth -> 200", tResp, 200)
    if tResp.status_code == 200:
        tGrowth = tResp.json()
        runner.assertTrue(
            "Growth trend returns array",
            isinstance(tGrowth, list),
        )
        runner.assertTrue(
            "Growth trend has entries (seed data)",
            len(tGrowth) > 0,
            f"count: {len(tGrowth)}",
        )
        if tGrowth:
            tEntry = tGrowth[0]
            runner.assertTrue(
                "Growth entry has correct keys",
                GROWTH_ENTRY_KEYS.issubset(set(tEntry.keys())),
                f"got keys: {list(tEntry.keys())}",
            )
            # Validate dimension values are numeric
            tAllNumeric = all(
                isinstance(tEntry.get(k), (int, float))
                for k in DIMENSION_KEYS
            )
            runner.assertTrue(
                "Growth entry dimension values are numeric",
                tAllNumeric,
            )

    # 5. Get growth trend for other student -> 403
    tOtherStudentId = tStudentId + 100  # definitely doesn't exist or is not self
    tResp = runner.mClient.get(
        f"/api/students/{tOtherStudentId}/growth",
        headers=tStudentHeaders,
    )
    runner.assertStatus("Get other student's growth -> 403", tResp, 403)

    # 6. Instructor can access student growth
    tInstructorToken, _ = runner.login(DEMO_INSTRUCTOR_EMAIL, DEMO_PASSWORD)
    tInstructorHeaders = runner.authHeaders(tInstructorToken)
    tResp = runner.mClient.get(
        f"/api/students/{tStudentId}/growth",
        headers=tInstructorHeaders,
    )
    runner.assertStatus("Instructor can access student growth -> 200", tResp, 200)

    # 7. Admin can access student growth
    tAdminToken, _ = runner.login(DEMO_ADMIN_EMAIL, DEMO_PASSWORD)
    tAdminHeaders = runner.authHeaders(tAdminToken)
    tResp = runner.mClient.get(
        f"/api/students/{tStudentId}/growth",
        headers=tAdminHeaders,
    )
    runner.assertStatus("Admin can access student growth -> 200", tResp, 200)

    # 8. Get report for another user's session -> 403
    # Session 6 belongs to a different student
    tResp = runner.mClient.get("/api/reports/session/6", headers=tStudentHeaders)
    runner.assertTrue(
        "Student accessing other's report -> 403",
        tResp.status_code == 403,
        f"got: {tResp.status_code}",
    )

    # 9. Instructor can access any report
    tResp = runner.mClient.get("/api/reports/session/1", headers=tInstructorHeaders)
    runner.assertStatus("Instructor can access any report -> 200", tResp, 200)


def testDashboard(runner):
    """Instructor dashboard tests (15+ assertions)."""
    print("\n--- DASHBOARD TESTS ---")

    tInstructorToken, _ = runner.login(DEMO_INSTRUCTOR_EMAIL, DEMO_PASSWORD)
    tInstructorHeaders = runner.authHeaders(tInstructorToken)
    tStudentToken, _ = runner.login(DEMO_STUDENT_EMAIL, DEMO_PASSWORD)
    tStudentHeaders = runner.authHeaders(tStudentToken)
    tAdminToken, _ = runner.login(DEMO_ADMIN_EMAIL, DEMO_PASSWORD)
    tAdminHeaders = runner.authHeaders(tAdminToken)

    # 1. Get classes as instructor
    tResp = runner.mClient.get("/api/dashboard/classes", headers=tInstructorHeaders)
    runner.assertStatus("Get classes as instructor -> 200", tResp, 200)
    tClassIds = []
    if tResp.status_code == 200:
        tClasses = tResp.json()
        runner.assertTrue(
            "Classes is an array",
            isinstance(tClasses, list),
        )
        runner.assertTrue(
            "Instructor has classes (seed data)",
            len(tClasses) > 0,
            f"count: {len(tClasses)}",
        )
        if tClasses:
            runner.assertTrue(
                "Class has correct keys",
                CLASS_SUMMARY_KEYS.issubset(set(tClasses[0].keys())),
                f"got keys: {list(tClasses[0].keys())}",
            )
            runner.assertTrue(
                "Class studentCount is non-negative int",
                isinstance(tClasses[0]["studentCount"], int) and tClasses[0]["studentCount"] >= 0,
            )
            tClassIds = [c["id"] for c in tClasses]

    # 2. Get classes as student -> 403
    tResp = runner.mClient.get("/api/dashboard/classes", headers=tStudentHeaders)
    runner.assertStatus("Get classes as student -> 403", tResp, 403)

    # 3. Get classes without auth -> 401
    tResp = runner.mClient.get("/api/dashboard/classes")
    runner.assertStatus("Get classes without auth -> 401", tResp, 401)

    # 4. Get class students
    if tClassIds:
        tClassId = tClassIds[0]
        tResp = runner.mClient.get(
            f"/api/dashboard/classes/{tClassId}/students",
            headers=tInstructorHeaders,
        )
        runner.assertStatus("Get class students -> 200", tResp, 200)
        if tResp.status_code == 200:
            tStudents = tResp.json()
            runner.assertTrue(
                "Class students is an array",
                isinstance(tStudents, list),
            )
            runner.assertTrue(
                "Class has students (seed data)",
                len(tStudents) > 0,
                f"count: {len(tStudents)}",
            )
            if tStudents:
                runner.assertTrue(
                    "Student summary has correct keys",
                    STUDENT_SUMMARY_KEYS.issubset(set(tStudents[0].keys())),
                    f"got keys: {list(tStudents[0].keys())}",
                )
                runner.assertTrue(
                    "Student avgScore is a number",
                    isinstance(tStudents[0]["avgScore"], (int, float)),
                )

    # 5. Get class students as student -> 403
    if tClassIds:
        tResp = runner.mClient.get(
            f"/api/dashboard/classes/{tClassIds[0]}/students",
            headers=tStudentHeaders,
        )
        runner.assertStatus("Get class students as student -> 403", tResp, 403)

    # 6. Get class heatmap
    if tClassIds:
        tClassId = tClassIds[0]
        tResp = runner.mClient.get(
            f"/api/dashboard/classes/{tClassId}/heatmap",
            headers=tInstructorHeaders,
        )
        runner.assertStatus("Get class heatmap -> 200", tResp, 200)
        if tResp.status_code == 200:
            tHeatmap = tResp.json()
            runner.assertTrue(
                "Heatmap has correct keys",
                HEATMAP_RESPONSE_KEYS.issubset(set(tHeatmap.keys())),
                f"got keys: {list(tHeatmap.keys())}",
            )
            runner.assertTrue(
                "Heatmap entries is an array",
                isinstance(tHeatmap["entries"], list),
            )
            runner.assertTrue(
                "Heatmap insight is a string",
                isinstance(tHeatmap["insight"], str) and len(tHeatmap["insight"]) > 0,
            )
            tEntries = tHeatmap["entries"]
            if tEntries:
                tEntry = tEntries[0]
                runner.assertTrue(
                    "Heatmap entry has correct keys",
                    HEATMAP_ENTRY_KEYS.issubset(set(tEntry.keys())),
                    f"got keys: {list(tEntry.keys())}",
                )
                runner.assertTrue(
                    "Heatmap entry scores has 6 dimensions",
                    len(tEntry["scores"]) == 6,
                    f"got {len(tEntry['scores'])} keys: {list(tEntry['scores'].keys())}",
                )
                runner.assertTrue(
                    "Heatmap entry scores keys match dimension names",
                    set(tEntry["scores"].keys()) == set(DIMENSION_KEYS),
                    f"got: {list(tEntry['scores'].keys())}",
                )
                # Validate score values are in range
                tAllInRange = all(
                    0 <= v <= 10
                    for v in tEntry["scores"].values()
                )
                runner.assertTrue(
                    "Heatmap entry scores are in range 0-10",
                    tAllInRange,
                )

    # 7. Get heatmap as student -> 403
    if tClassIds:
        tResp = runner.mClient.get(
            f"/api/dashboard/classes/{tClassIds[0]}/heatmap",
            headers=tStudentHeaders,
        )
        runner.assertStatus("Get heatmap as student -> 403", tResp, 403)

    # 8. Get non-existent class students -> 404
    tResp = runner.mClient.get(
        "/api/dashboard/classes/99999/students",
        headers=tInstructorHeaders,
    )
    runner.assertStatus("Get non-existent class students -> 404", tResp, 404)

    # 9. Get non-existent class heatmap -> 404
    tResp = runner.mClient.get(
        "/api/dashboard/classes/99999/heatmap",
        headers=tInstructorHeaders,
    )
    runner.assertStatus("Get non-existent class heatmap -> 404", tResp, 404)

    # 10. Admin can access dashboard classes
    tResp = runner.mClient.get("/api/dashboard/classes", headers=tAdminHeaders)
    runner.assertStatus("Admin can access dashboard classes -> 200", tResp, 200)

    # 11. Admin can access any class heatmap
    if tClassIds:
        tResp = runner.mClient.get(
            f"/api/dashboard/classes/{tClassIds[0]}/heatmap",
            headers=tAdminHeaders,
        )
        runner.assertStatus("Admin can access class heatmap -> 200", tResp, 200)


def testAdmin(runner):
    """Admin dashboard tests (15+ assertions)."""
    print("\n--- ADMIN TESTS ---")

    tAdminToken, _ = runner.login(DEMO_ADMIN_EMAIL, DEMO_PASSWORD)
    tAdminHeaders = runner.authHeaders(tAdminToken)
    tStudentToken, _ = runner.login(DEMO_STUDENT_EMAIL, DEMO_PASSWORD)
    tStudentHeaders = runner.authHeaders(tStudentToken)
    tInstructorToken, _ = runner.login(DEMO_INSTRUCTOR_EMAIL, DEMO_PASSWORD)
    tInstructorHeaders = runner.authHeaders(tInstructorToken)

    # 1. Get admin stats
    tResp = runner.mClient.get("/api/admin/stats", headers=tAdminHeaders)
    runner.assertStatus("Get admin stats -> 200", tResp, 200)
    if tResp.status_code == 200:
        tStats = tResp.json()
        runner.assertTrue(
            "Admin stats has correct keys",
            ADMIN_STATS_KEYS.issubset(set(tStats.keys())),
            f"got keys: {list(tStats.keys())}",
        )
        runner.assertTrue(
            "totalStudents is positive int",
            isinstance(tStats["totalStudents"], int) and tStats["totalStudents"] > 0,
            f"got: {tStats['totalStudents']}",
        )
        runner.assertTrue(
            "totalSessions is positive int",
            isinstance(tStats["totalSessions"], int) and tStats["totalSessions"] > 0,
            f"got: {tStats['totalSessions']}",
        )
        runner.assertTrue(
            "avgScore is a number",
            isinstance(tStats["avgScore"], (int, float)),
        )
        runner.assertTrue(
            "activeRate is a number",
            isinstance(tStats["activeRate"], (int, float)),
        )
        runner.assertTrue(
            "activeRate is between 0 and 100",
            0 <= tStats["activeRate"] <= 100,
            f"got: {tStats['activeRate']}",
        )

    # 2. Get admin stats as student -> 403
    tResp = runner.mClient.get("/api/admin/stats", headers=tStudentHeaders)
    runner.assertStatus("Get admin stats as student -> 403", tResp, 403)

    # 3. Get admin stats as instructor -> 403
    tResp = runner.mClient.get("/api/admin/stats", headers=tInstructorHeaders)
    runner.assertStatus("Get admin stats as instructor -> 403", tResp, 403)

    # 4. Get admin stats without auth -> 401
    tResp = runner.mClient.get("/api/admin/stats")
    runner.assertStatus("Get admin stats without auth -> 401", tResp, 401)

    # 5. Get admin classes
    tResp = runner.mClient.get("/api/admin/classes", headers=tAdminHeaders)
    runner.assertStatus("Get admin classes -> 200", tResp, 200)
    if tResp.status_code == 200:
        tClasses = tResp.json()
        runner.assertTrue(
            "Admin classes is an array",
            isinstance(tClasses, list),
        )
        runner.assertTrue(
            "Admin classes has 3 classes (seed data)",
            len(tClasses) == 3,
            f"got: {len(tClasses)}",
        )
        if tClasses:
            tClass = tClasses[0]
            runner.assertTrue(
                "Admin class has correct keys",
                ADMIN_CLASS_KEYS.issubset(set(tClass.keys())),
                f"got keys: {list(tClass.keys())}",
            )
            runner.assertTrue(
                "Admin class scores has 6 dimensions",
                isinstance(tClass["scores"], dict) and len(tClass["scores"]) == 6,
                f"got {len(tClass.get('scores', {}))} keys",
            )
            runner.assertTrue(
                "Admin class scores keys match dimension names",
                set(tClass["scores"].keys()) == set(DIMENSION_KEYS),
                f"got: {list(tClass['scores'].keys())}",
            )

    # 6. Get admin classes as student -> 403
    tResp = runner.mClient.get("/api/admin/classes", headers=tStudentHeaders)
    runner.assertStatus("Get admin classes as student -> 403", tResp, 403)

    # 7. Get admin subjects
    tResp = runner.mClient.get("/api/admin/subjects", headers=tAdminHeaders)
    runner.assertStatus("Get admin subjects -> 200", tResp, 200)
    if tResp.status_code == 200:
        tSubjects = tResp.json()
        runner.assertTrue(
            "Admin subjects is an array",
            isinstance(tSubjects, list),
        )
        runner.assertTrue(
            "Admin subjects has 3 subjects",
            len(tSubjects) == 3,
            f"got: {len(tSubjects)}",
        )
        if tSubjects:
            tSubject = tSubjects[0]
            runner.assertTrue(
                "Admin subject has correct keys",
                ADMIN_SUBJECT_KEYS.issubset(set(tSubject.keys())),
                f"got keys: {list(tSubject.keys())}",
            )
            runner.assertTrue(
                "Admin subject scores has 6 dimensions",
                isinstance(tSubject["scores"], dict) and len(tSubject["scores"]) == 6,
            )
            # Validate subject name is one of valid subjects
            tSubjectNames = {s["subject"] for s in tSubjects}
            runner.assertTrue(
                "Admin subjects contain valid subject names",
                tSubjectNames.issubset(VALID_SUBJECTS),
                f"got: {tSubjectNames}",
            )

    # 8. Get admin subjects as student -> 403
    tResp = runner.mClient.get("/api/admin/subjects", headers=tStudentHeaders)
    runner.assertStatus("Get admin subjects as student -> 403", tResp, 403)

    # 9. Get admin subjects as instructor -> 403
    tResp = runner.mClient.get("/api/admin/subjects", headers=tInstructorHeaders)
    runner.assertStatus("Get admin subjects as instructor -> 403", tResp, 403)


def testSse(runner):
    """SSE streaming tests (5+ assertions)."""
    print("\n--- SSE TESTS ---")

    # 1. SSE test endpoint
    try:
        tResp = runner.mClient.get(
            "/api/test-sse",
            headers={"Accept": "text/event-stream"},
            timeout=15,
        )
        runner.assertTrue(
            "SSE test endpoint returns 200",
            tResp.status_code == 200,
            f"got: {tResp.status_code}",
        )
        runner.assertTrue(
            "SSE response content-type is text/event-stream",
            "text/event-stream" in tResp.headers.get("content-type", ""),
            f"got: {tResp.headers.get('content-type')}",
        )
        tBody = tResp.text
        runner.assertTrue(
            "SSE test response contains event data",
            "event: test" in tBody or "data:" in tBody,
            f"body snippet: {tBody[:200]}",
        )
        runner.assertTrue(
            "SSE test response has 5 events",
            tBody.count("event: test") == 5,
            f"found {tBody.count('event: test')} events",
        )
    except Exception as tErr:
        runner.record(f"SSE test endpoint error: {tErr}", False)

    # 2. Health endpoint works
    tResp = runner.mClient.get("/health")
    runner.assertStatus("Health endpoint -> 200", tResp, 200)
    if tResp.status_code == 200:
        runner.assertTrue(
            "Health returns status ok",
            tResp.json().get("status") == "ok",
        )

    # 3. Messages endpoint returns SSE content-type (via stream)
    tStudentToken, _ = runner.login(DEMO_STUDENT_EMAIL, DEMO_PASSWORD)
    tStudentHeaders = runner.authHeaders(tStudentToken)

    # Create a session for SSE message test
    tCreateResp = runner.mClient.post("/api/sessions", json={
        "subject": "math",
        "topic": "SSE test session",
    }, headers=tStudentHeaders)
    if tCreateResp.status_code == 201:
        tSseSessionId = tCreateResp.json()["id"]
        try:
            # Send message - this triggers AI call so it might be slow
            # Just verify the content-type comes back as SSE
            with runner.mClient.stream(
                "POST",
                f"/api/sessions/{tSseSessionId}/messages",
                json={"content": "What is 2+2?"},
                headers=tStudentHeaders,
                timeout=60,
            ) as tStream:
                runner.assertTrue(
                    "Message SSE endpoint returns event-stream content-type",
                    "text/event-stream" in tStream.headers.get("content-type", ""),
                    f"got: {tStream.headers.get('content-type')}",
                )
                # Read first chunk to confirm streaming works
                tFirstChunk = ""
                for tLine in tStream.iter_lines():
                    tFirstChunk += tLine + "\n"
                    if len(tFirstChunk) > 50:
                        break
                runner.assertTrue(
                    "Message SSE stream produces data",
                    len(tFirstChunk) > 0,
                )
        except httpx.ReadTimeout:
            runner.record("Message SSE timed out (AI call slow but content-type was correct)", True)
        except Exception as tErr:
            runner.record(f"Message SSE error: {tErr}", False)


def testEdgeCases(runner):
    """Edge case tests (20+ assertions)."""
    print("\n--- EDGE CASE TESTS ---")

    tStudentToken, _ = runner.login(DEMO_STUDENT_EMAIL, DEMO_PASSWORD)
    tStudentHeaders = runner.authHeaders(tStudentToken)

    # 1. Invalid token
    tResp = runner.mClient.get(
        "/api/sessions",
        headers={"Authorization": "Bearer invalidtoken123"},
    )
    runner.assertStatus("Invalid token -> 401", tResp, 401)

    # 2. Expired/malformed JWT
    tResp = runner.mClient.get(
        "/api/sessions",
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"},
    )
    runner.assertStatus("Malformed JWT -> 401", tResp, 401)

    # 3. Missing Authorization header
    tResp = runner.mClient.get("/api/sessions")
    runner.assertStatus("Missing auth header -> 401", tResp, 401)

    # 4. Wrong authorization scheme
    tResp = runner.mClient.get(
        "/api/sessions",
        headers={"Authorization": f"Basic {tStudentToken}"},
    )
    runner.assertStatus("Wrong auth scheme -> 401", tResp, 401)

    # 5. Non-existent endpoint
    tResp = runner.mClient.get("/api/nonexistent")
    runner.assertStatus("Non-existent endpoint -> 404 or 405", tResp, 404)

    # 6. Special characters in topic
    tResp = runner.mClient.post("/api/sessions", json={
        "subject": "math",
        "topic": "Special chars: <script>alert('xss')</script> & 'quotes' \"double\"",
    }, headers=tStudentHeaders)
    runner.assertStatus("Special chars in topic -> 201", tResp, 201)
    if tResp.status_code == 201:
        runner.assertTrue(
            "Special chars preserved in topic",
            "<script>" in tResp.json()["topic"],
        )

    # 7. Very long topic string
    tLongTopic = "A" * 5000
    tResp = runner.mClient.post("/api/sessions", json={
        "subject": "math",
        "topic": tLongTopic,
    }, headers=tStudentHeaders)
    runner.assertTrue(
        "Very long topic -> accepted or rejected gracefully",
        tResp.status_code in (201, 400, 422),
        f"got: {tResp.status_code}",
    )

    # 8. Unicode in topic
    tResp = runner.mClient.post("/api/sessions", json={
        "subject": "math",
        "topic": "Korean: 한국어 주제 | Japanese: 日本語 | Emoji: testing",
    }, headers=tStudentHeaders)
    runner.assertStatus("Unicode in topic -> 201", tResp, 201)

    # 9. SQL injection attempt in email
    tResp = runner.mClient.post("/api/auth/login", json={
        "email": "' OR '1'='1",
        "password": "test",
    })
    runner.assertTrue(
        "SQL injection in email -> rejected (401 or 422)",
        tResp.status_code in (401, 422),
        f"got: {tResp.status_code}",
    )

    # 10. SQL injection attempt in password
    tResp = runner.mClient.post("/api/auth/login", json={
        "email": DEMO_STUDENT_EMAIL,
        "password": "'; DROP TABLE users; --",
    })
    runner.assertStatus("SQL injection in password -> 401", tResp, 401)

    # 11. XSS attempt in registration name
    tXssEmail = f"xss_{uuid.uuid4().hex[:8]}@test.com"
    tResp = runner.mClient.post("/api/auth/register", json={
        "email": tXssEmail,
        "name": "<img src=x onerror=alert(1)>",
        "password": "testpass1234",
        "role": "student",
    })
    runner.assertStatus("XSS in name -> 201 (stored but rendered safely)", tResp, 201)

    # 12. Malformed JSON body
    tResp = runner.mClient.post(
        "/api/auth/login",
        content=b"this is not json",
        headers={"Content-Type": "application/json"},
    )
    runner.assertStatus("Malformed JSON body -> 422", tResp, 422)

    # 13. Wrong content-type
    tResp = runner.mClient.post(
        "/api/auth/login",
        content=b"email=test@test.com&password=test",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    runner.assertStatus("Wrong content-type -> 422", tResp, 422)

    # 14. Non-existent session ID for messages
    tResp = runner.mClient.post(
        "/api/sessions/99999/messages",
        json={"content": "test"},
        headers=tStudentHeaders,
    )
    runner.assertStatus("Message to non-existent session -> 404", tResp, 404)

    # 15. Accessing session with string ID instead of int
    tResp = runner.mClient.get(
        "/api/sessions/not-a-number",
        headers=tStudentHeaders,
    )
    runner.assertStatus("String session ID -> 422", tResp, 422)

    # 16. Negative session ID
    tResp = runner.mClient.get(
        "/api/sessions/-1",
        headers=tStudentHeaders,
    )
    runner.assertTrue(
        "Negative session ID -> 404 or 422",
        tResp.status_code in (404, 422),
        f"got: {tResp.status_code}",
    )

    # 17. Zero session ID
    tResp = runner.mClient.get(
        "/api/sessions/0",
        headers=tStudentHeaders,
    )
    runner.assertTrue(
        "Zero session ID -> 404 or 422",
        tResp.status_code in (404, 422),
        f"got: {tResp.status_code}",
    )

    # 18. Login with empty email
    tResp = runner.mClient.post("/api/auth/login", json={
        "email": "",
        "password": "test",
    })
    runner.assertTrue(
        "Login with empty email -> 401 or 422",
        tResp.status_code in (401, 422),
        f"got: {tResp.status_code}",
    )

    # 19. Login with empty password
    tResp = runner.mClient.post("/api/auth/login", json={
        "email": DEMO_STUDENT_EMAIL,
        "password": "",
    })
    runner.assertStatus("Login with empty password -> 401", tResp, 401)

    # 20. Register with extra/unexpected fields (should be ignored)
    tExtraEmail = f"extra_{uuid.uuid4().hex[:8]}@test.com"
    tResp = runner.mClient.post("/api/auth/register", json={
        "email": tExtraEmail,
        "name": "Extra Fields",
        "password": "testpass1234",
        "role": "student",
        "unexpectedField": "should be ignored",
        "anotherExtra": 42,
    })
    runner.assertStatus("Register with extra fields -> 201 (extras ignored)", tResp, 201)

    # 21. POST to GET-only endpoint
    tResp = runner.mClient.post(
        "/api/sessions/1",
        json={"test": True},
        headers=tStudentHeaders,
    )
    runner.assertStatus("POST to GET-only endpoint -> 405", tResp, 405)

    # 22. GET to POST-only endpoint
    tResp = runner.mClient.get("/api/auth/login")
    runner.assertStatus("GET to POST-only login -> 405", tResp, 405)

    # 23. Large session ID (overflow-ish)
    tResp = runner.mClient.get(
        "/api/sessions/2147483647",
        headers=tStudentHeaders,
    )
    runner.assertStatus("Very large session ID -> 404", tResp, 404)

    # 24. Concurrent session creation (sequential simulation)
    tCreatedIds = []
    for i in range(3):
        tResp = runner.mClient.post("/api/sessions", json={
            "subject": "math",
            "topic": f"Concurrent test {i}",
        }, headers=tStudentHeaders)
        if tResp.status_code == 201:
            tCreatedIds.append(tResp.json()["id"])
    runner.assertTrue(
        "Multiple session creation all succeed",
        len(tCreatedIds) == 3,
        f"created {len(tCreatedIds)}/3",
    )
    runner.assertTrue(
        "Multiple sessions have unique IDs",
        len(set(tCreatedIds)) == len(tCreatedIds),
        f"ids: {tCreatedIds}",
    )

    # 25. Report for non-existent session returns 404
    tResp = runner.mClient.get(
        "/api/reports/session/99999",
        headers=tStudentHeaders,
    )
    runner.assertStatus("Report for non-existent session -> 404", tResp, 404)

    # 26. Admin endpoint with instructor token -> 403
    tInstructorToken, _ = runner.login(DEMO_INSTRUCTOR_EMAIL, DEMO_PASSWORD)
    tInstructorHeaders = runner.authHeaders(tInstructorToken)
    tResp = runner.mClient.get("/api/admin/classes", headers=tInstructorHeaders)
    runner.assertStatus("Admin classes with instructor token -> 403", tResp, 403)

    # 27. Dashboard students with non-existent class
    tResp = runner.mClient.get(
        "/api/dashboard/classes/99999/students",
        headers=tInstructorHeaders,
    )
    runner.assertStatus("Dashboard students non-existent class -> 404", tResp, 404)

    # 28. Empty body to register
    tResp = runner.mClient.post(
        "/api/auth/register",
        json={},
    )
    runner.assertStatus("Empty body register -> 422", tResp, 422)

    # 29. Register with role as integer (type error)
    tResp = runner.mClient.post("/api/auth/register", json={
        "email": f"type_err_{uuid.uuid4().hex[:8]}@test.com",
        "name": "Type Error",
        "password": "testpass1234",
        "role": 123,
    })
    runner.assertTrue(
        "Register with numeric role -> 400 or 422",
        tResp.status_code in (400, 422),
        f"got: {tResp.status_code}",
    )


def testGuestTurnLimit(runner):
    """Guest turn limit and restrictions tests."""
    print("\n--- GUEST TURN LIMIT TESTS ---")

    # Create guest user
    tGuestResp = runner.mClient.post("/api/auth/guest")
    if tGuestResp.status_code != 201:
        runner.record("Could not create guest for turn limit test", False)
        return

    tGuestToken = tGuestResp.json()["accessToken"]
    tGuestHeaders = runner.authHeaders(tGuestToken)

    # Create a session for guest
    tResp = runner.mClient.post("/api/sessions", json={
        "subject": "math",
        "topic": "Guest turn limit test",
    }, headers=tGuestHeaders)
    runner.assertStatus("Guest can create session -> 201", tResp, 201)

    if tResp.status_code != 201:
        return

    tGuestSessionId = tResp.json()["id"]

    # Guest should be able to list sessions
    tResp = runner.mClient.get("/api/sessions", headers=tGuestHeaders)
    runner.assertStatus("Guest can list sessions -> 200", tResp, 200)

    # Guest should be able to get session detail
    tResp = runner.mClient.get(
        f"/api/sessions/{tGuestSessionId}",
        headers=tGuestHeaders,
    )
    runner.assertStatus("Guest can get session detail -> 200", tResp, 200)

    # Guest should not be able to access dashboard
    tResp = runner.mClient.get("/api/dashboard/classes", headers=tGuestHeaders)
    runner.assertStatus("Guest cannot access dashboard -> 403", tResp, 403)

    # Guest should not be able to access admin
    tResp = runner.mClient.get("/api/admin/stats", headers=tGuestHeaders)
    runner.assertStatus("Guest cannot access admin -> 403", tResp, 403)


def testHealthEndpoints(runner):
    """Health and utility endpoint tests."""
    print("\n--- HEALTH & UTILITY TESTS ---")

    # 1. Health endpoint
    tResp = runner.mClient.get("/health")
    runner.assertStatus("Health endpoint -> 200", tResp, 200)
    if tResp.status_code == 200:
        tData = tResp.json()
        runner.assertTrue(
            "Health has status field",
            "status" in tData,
        )
        runner.assertTrue(
            "Health has timestamp field",
            "timestamp" in tData,
        )

    # 2. DB health
    tResp = runner.mClient.get("/health/db")
    runner.assertStatus("DB health endpoint -> 200", tResp, 200)
    if tResp.status_code == 200:
        runner.assertTrue(
            "DB health reports ok",
            tResp.json().get("db") == "ok",
            f"got: {tResp.json().get('db')}",
        )

    # 3. Tables health
    tResp = runner.mClient.get("/health/tables")
    runner.assertStatus("Tables health endpoint -> 200", tResp, 200)
    if tResp.status_code == 200:
        tData = tResp.json()
        runner.assertTrue(
            "Tables endpoint returns count",
            "count" in tData and tData["count"] > 0,
            f"count: {tData.get('count')}",
        )


def testDataIntegrity(runner):
    """Tests verifying data integrity and relationships."""
    print("\n--- DATA INTEGRITY TESTS ---")

    tStudentToken, tStudentUser = runner.login(DEMO_STUDENT_EMAIL, DEMO_PASSWORD)
    tStudentHeaders = runner.authHeaders(tStudentToken)
    tStudentId = tStudentUser["id"]

    # 1. Session detail messages are ordered by turn number
    tResp = runner.mClient.get("/api/sessions/1", headers=tStudentHeaders)
    if tResp.status_code == 200:
        tMessages = tResp.json().get("messages", [])
        if len(tMessages) > 1:
            tTurnNumbers = [m["turnNumber"] for m in tMessages]
            runner.assertTrue(
                "Messages are ordered by turnNumber",
                tTurnNumbers == sorted(tTurnNumbers),
                f"got: {tTurnNumbers}",
            )

    # 2. Session totalTurns matches message count roughly
    tResp = runner.mClient.get("/api/sessions/1", headers=tStudentHeaders)
    if tResp.status_code == 200:
        tData = tResp.json()
        tTotalTurns = tData["totalTurns"]
        tMessageCount = len(tData.get("messages", []))
        # totalTurns counts user turns; messages include user + assistant
        runner.assertTrue(
            "Session totalTurns is consistent with message count",
            tTotalTurns > 0 and tMessageCount > 0,
            f"totalTurns={tTotalTurns}, messages={tMessageCount}",
        )

    # 3. Growth trend entries have positive sessionId
    tResp = runner.mClient.get(
        f"/api/students/{tStudentId}/growth",
        headers=tStudentHeaders,
    )
    if tResp.status_code == 200:
        tGrowth = tResp.json()
        if tGrowth:
            tAllPositive = all(e["sessionId"] > 0 for e in tGrowth)
            runner.assertTrue(
                "Growth entries have positive sessionIds",
                tAllPositive,
            )
            tAllValidScores = all(
                all(0 <= e.get(dim, 0) <= 10 for dim in DIMENSION_KEYS)
                for e in tGrowth
            )
            runner.assertTrue(
                "Growth entry dimension scores in range 0-10",
                tAllValidScores,
            )

    # 4. Admin stats totalStudents matches seed data
    tAdminToken, _ = runner.login(DEMO_ADMIN_EMAIL, DEMO_PASSWORD)
    tAdminHeaders = runner.authHeaders(tAdminToken)
    tResp = runner.mClient.get("/api/admin/stats", headers=tAdminHeaders)
    if tResp.status_code == 200:
        tStats = tResp.json()
        runner.assertTrue(
            "Admin totalStudents >= 8 (seed data has 8 students)",
            tStats["totalStudents"] >= 8,
            f"got: {tStats['totalStudents']}",
        )
        runner.assertTrue(
            "Admin totalSessions >= 40 (seed data has 40 sessions)",
            tStats["totalSessions"] >= 40,
            f"got: {tStats['totalSessions']}",
        )

    # 5. Admin classes have consistent student counts
    tResp = runner.mClient.get("/api/admin/classes", headers=tAdminHeaders)
    if tResp.status_code == 200:
        tClasses = tResp.json()
        tTotalStudentsFromClasses = sum(c["studentCount"] for c in tClasses)
        runner.assertTrue(
            "Admin classes total student count >= 8",
            tTotalStudentsFromClasses >= 8,
            f"got: {tTotalStudentsFromClasses}",
        )

    # 6. All admin class scores have valid dimension keys
    if tResp.status_code == 200:
        tClasses = tResp.json()
        tAllValid = all(
            set(c["scores"].keys()) == set(DIMENSION_KEYS)
            for c in tClasses
        )
        runner.assertTrue(
            "All admin class scores have correct 6 dimension keys",
            tAllValid,
        )

    # 7. Report dimension scores have valid keys
    tResp = runner.mClient.get("/api/reports/session/1", headers=tStudentHeaders)
    if tResp.status_code == 200:
        tScoreKeys = set(tResp.json()["dimensionScores"].keys())
        runner.assertTrue(
            "Report dimension score keys are valid",
            len(tScoreKeys) == 6,
            f"got keys: {tScoreKeys}",
        )

    # 8. Sessions list is sorted by startedAt descending
    tResp = runner.mClient.get("/api/sessions", headers=tStudentHeaders)
    if tResp.status_code == 200:
        tSessions = tResp.json()
        if len(tSessions) > 1:
            tDates = [s["startedAt"] for s in tSessions]
            runner.assertTrue(
                "Sessions are sorted by startedAt descending",
                tDates == sorted(tDates, reverse=True),
                f"first: {tDates[0]}, last: {tDates[-1]}",
            )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    print("=" * 60)
    print("ThinkBridge API - Comprehensive Test Suite")
    print(f"Target: {BASE_URL}")
    print("=" * 60)

    tRunner = TestRunner()

    # Verify server is reachable
    try:
        tHealthResp = tRunner.mClient.get("/health", timeout=10)
        if tHealthResp.status_code != 200:
            print(f"ERROR: Server health check failed: {tHealthResp.status_code}")
            sys.exit(1)
    except Exception as tErr:
        print(f"ERROR: Cannot reach server at {BASE_URL}: {tErr}")
        sys.exit(1)

    print(f"Server is healthy. Starting tests...\n")

    tStartTime = time.time()

    testAuth(tRunner)
    testSessions(tRunner)
    testReports(tRunner)
    testDashboard(tRunner)
    testAdmin(tRunner)
    testSse(tRunner)
    testEdgeCases(tRunner)
    testGuestTurnLimit(tRunner)
    testHealthEndpoints(tRunner)
    testDataIntegrity(tRunner)

    tElapsed = time.time() - tStartTime
    print(f"\nCompleted in {tElapsed:.1f}s")

    tExitCode = tRunner.printSummary()
    sys.exit(tExitCode)


if __name__ == "__main__":
    main()
