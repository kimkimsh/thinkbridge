/**
 * ThinkBridge E2E Test Suite 2: Student Login + Sessions + Report
 * Uses Playwright to test student flows on the deployed frontend.
 */

const { chromium } = require("playwright");

const BASE_URL = "https://frontend-manhyeon.vercel.app";
const SCREENSHOT_DIR = "/home/mark-minipc/workspace/thinkbridge/docs/test";
const CHROME_PATH = "/home/mark-minipc/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";

const STUDENT_EMAIL = "student@demo.com";
const STUDENT_PASSWORD = "demo1234";
const WRONG_PASSWORD = "wrongpassword";

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;

const results = [];

function logResult(scenario, testName, passed, detail)
{
    const tStatus = passed ? "PASS" : "FAIL";
    results.push({ scenario, testName, status: tStatus, detail });
    console.log(`  [${tStatus}] ${testName}${detail ? " — " + detail : ""}`);
}

async function takeScreenshot(page, filename)
{
    const tPath = `${SCREENSHOT_DIR}/${filename}`;
    await page.screenshot({ path: tPath, fullPage: false });
    console.log(`    -> Screenshot saved: ${filename}`);
    return tPath;
}

async function takeFullScreenshot(page, filename)
{
    const tPath = `${SCREENSHOT_DIR}/${filename}`;
    await page.screenshot({ path: tPath, fullPage: true });
    console.log(`    -> Screenshot saved (full): ${filename}`);
    return tPath;
}

// ============================================================
// Scenario 2.1: Student Login
// ============================================================
async function testStudentLogin(page)
{
    console.log("\n--- Scenario 2.1: Student Login ---");

    // Step 1: Navigate to login
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Step 2: Screenshot login page
    await takeScreenshot(page, "student_login_01.png");

    // Verify login form elements exist
    const tEmailInput = page.locator("#email");
    const tPasswordInput = page.locator("#password");
    const tLoginButton = page.locator('button[type="submit"]');

    const tEmailVisible = await tEmailInput.isVisible();
    const tPasswordVisible = await tPasswordInput.isVisible();
    const tLoginBtnVisible = await tLoginButton.isVisible();

    logResult("2.1", "Login page loads with email field", tEmailVisible, "");
    logResult("2.1", "Login page loads with password field", tPasswordVisible, "");
    logResult("2.1", "Login page loads with submit button", tLoginBtnVisible, "");

    // Step 3: Fill credentials
    await tEmailInput.fill(STUDENT_EMAIL);
    await tPasswordInput.fill(STUDENT_PASSWORD);
    await page.waitForTimeout(300);

    // Step 4: Click login
    await tLoginButton.click();

    // Step 5: Wait for navigation
    try
    {
        await page.waitForURL("**/student/**", { timeout: 15000 });
        await page.waitForTimeout(2000);

        // Step 6: Screenshot success
        await takeScreenshot(page, "student_login_02_success.png");

        // Step 7: Verify redirect
        const tCurrentUrl = page.url();
        const tIsStudentArea = tCurrentUrl.includes("/student/");
        logResult("2.1", "Redirected to student area after login", tIsStudentArea, tCurrentUrl);
    }
    catch (error)
    {
        await takeScreenshot(page, "student_login_02_success.png");
        logResult("2.1", "Redirected to student area after login", false, error.message);
    }
}

// ============================================================
// Scenario 2.2: Student Sessions List
// ============================================================
async function testStudentSessions(page)
{
    console.log("\n--- Scenario 2.2: Student Sessions List ---");

    // Step 1: Navigate to sessions
    await page.goto(`${BASE_URL}/student/sessions`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Step 3: Screenshot
    await takeScreenshot(page, "student_sessions_01.png");

    // Step 4: Verify session cards are displayed
    // Session cards are rendered as Card components with cursor-pointer class
    const tSessionCards = page.locator('[class*="cursor-pointer"]');
    const tCardCount = await tSessionCards.count();
    logResult("2.2", "Session cards are displayed (seed data)", tCardCount > 0, `Found ${tCardCount} session cards`);

    // Step 5: Verify each card shows subject, topic, turn count
    // Check for subject label presence (수학, 과학, 논술)
    const tPageContent = await page.textContent("body");

    // Check for turn count indicators (N턴)
    const tHasTurnCount = /\d+턴/.test(tPageContent);
    logResult("2.2", "Cards show turn count (N턴)", tHasTurnCount, "");

    // Check for subject labels
    const tSubjectLabels = ["수학", "과학", "논술"];
    let tFoundSubjects = [];
    for (const label of tSubjectLabels)
    {
        if (tPageContent.includes(label))
        {
            tFoundSubjects.push(label);
        }
    }
    logResult("2.2", "Cards show subject labels", tFoundSubjects.length > 0, `Found: ${tFoundSubjects.join(", ")}`);

    // Step 6: Verify completed sessions show status badge
    const tCompletedBadges = page.locator('text="완료"');
    const tCompletedCount = await tCompletedBadges.count();
    const tActiveBadges = page.locator('text="진행 중"');
    const tActiveCount = await tActiveBadges.count();
    logResult("2.2", "Status badges displayed", tCompletedCount > 0 || tActiveCount > 0,
        `Completed: ${tCompletedCount}, Active: ${tActiveCount}`);
}

// ============================================================
// Scenario 2.3: Student Report
// ============================================================
async function testStudentReport(page)
{
    console.log("\n--- Scenario 2.3: Student Report ---");

    // First go to sessions page
    await page.goto(`${BASE_URL}/student/sessions`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Step 1: Click on a completed session card
    // Look for a card that has "완료" badge
    const tCompletedCards = page.locator('[class*="cursor-pointer"]').filter({ hasText: "완료" });
    const tCompletedCount = await tCompletedCards.count();

    if (tCompletedCount === 0)
    {
        logResult("2.3", "Found completed session to click", false, "No completed sessions found");
        await takeScreenshot(page, "student_report_01.png");
        await takeScreenshot(page, "student_report_02_full.png");
        return;
    }

    logResult("2.3", "Found completed session to click", true, `${tCompletedCount} completed sessions`);

    // Click the first completed session
    await tCompletedCards.first().click();

    // Step 2: Wait for report page load
    try
    {
        await page.waitForURL("**/student/report/**", { timeout: 10000 });
    }
    catch
    {
        // May already be on the page or redirected differently
    }

    // Wait for loading skeleton to disappear — backend may need cold start time
    // The skeleton uses animate-pulse class; wait until the actual report content loads
    try
    {
        await page.waitForFunction(() =>
        {
            const tBody = document.body.textContent || "";
            // Report loaded when we see the page title or summary section
            return tBody.includes("학습 리포트") || tBody.includes("AI 분석 요약") || tBody.includes("리포트 데이터가 없습니다") || tBody.includes("불러오지 못했습니다");
        }, { timeout: 30000 });
    }
    catch
    {
        // Timeout — take screenshot anyway
    }
    await page.waitForTimeout(2000);

    // Step 3: Screenshot
    await takeScreenshot(page, "student_report_01.png");

    const tPageContent = await page.textContent("body");

    // Step 4: Verify radar chart visible
    // Recharts renders SVG with class "recharts-responsive-container" or similar
    // Also check for any SVG elements or canvas that represent charts
    const tRadarSvg = page.locator(".recharts-responsive-container, .recharts-wrapper, svg.recharts-surface, [class*='recharts']");
    const tRadarCount = await tRadarSvg.count();
    // Also check for any SVG elements inside the report (charts render as SVG)
    const tSvgCount = await page.locator("svg").count();
    logResult("2.3", "Radar chart visible", tRadarCount > 0 || tSvgCount > 2, `Recharts elements: ${tRadarCount}, SVGs on page: ${tSvgCount}`);

    // Step 5: Verify AI narrative summary visible
    const tHasSummaryTitle = tPageContent.includes("AI 분석 요약");
    logResult("2.3", "AI narrative summary section visible", tHasSummaryTitle, "");

    // Check for actual summary text (report summary is in a <p> tag)
    const tSummaryParagraphs = page.locator("p.whitespace-pre-line");
    const tSummaryCount = await tSummaryParagraphs.count();
    logResult("2.3", "AI summary content present", tSummaryCount > 0, `Found ${tSummaryCount} summary paragraph(s)`);

    // Step 6: Scroll down for full report
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Step 7: Full screenshot
    await takeFullScreenshot(page, "student_report_02_full.png");

    // Step 8: Verify growth trend chart visible
    const tHasGrowthTitle = tPageContent.includes("성장 추세");
    logResult("2.3", "Growth trend chart section visible", tHasGrowthTitle, "");

    // Step 9: Verify thought timeline visible
    const tHasTimelineTitle = tPageContent.includes("턴별 사고 분석");
    logResult("2.3", "Thought timeline section visible", tHasTimelineTitle, "");

    // Check for dimension labels in the report
    const tDimensionLabels = ["문제 이해", "전제 확인", "논리 구조화", "근거 제시", "비판적 사고", "창의적 사고"];
    let tFoundDimensions = [];
    for (const label of tDimensionLabels)
    {
        if (tPageContent.includes(label))
        {
            tFoundDimensions.push(label);
        }
    }
    logResult("2.3", "Thinking dimension labels displayed", tFoundDimensions.length > 0,
        `Found ${tFoundDimensions.length}/6: ${tFoundDimensions.join(", ")}`);
}

// ============================================================
// Scenario 2.4: Login with Wrong Password
// ============================================================
async function testLoginWrongPassword(page)
{
    console.log("\n--- Scenario 2.4: Login with Wrong Password ---");

    // Clear any existing auth state
    await page.evaluate(() =>
    {
        localStorage.clear();
    });

    // Step 1: Navigate to login
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Step 2: Fill wrong credentials
    const tEmailInput = page.locator("#email");
    const tPasswordInput = page.locator("#password");
    const tLoginButton = page.locator('button[type="submit"]');

    await tEmailInput.fill(STUDENT_EMAIL);
    await tPasswordInput.fill(WRONG_PASSWORD);

    // Step 3: Click login
    await tLoginButton.click();

    // Wait for the error to appear (backend on Render may have cold start)
    try
    {
        await page.waitForFunction(() =>
        {
            const tBody = document.body.textContent || "";
            // Error shown, or button reverts from "로그인 중..." back to "로그인"
            return tBody.includes("실패") || tBody.includes("오류") || tBody.includes("잘못") ||
                   tBody.includes("incorrect") || tBody.includes("invalid") ||
                   document.querySelector('[class*="bg-red"]') !== null;
        }, { timeout: 20000 });
    }
    catch
    {
        // Timeout — screenshot anyway
    }
    await page.waitForTimeout(1000);

    // Step 4: Screenshot
    await takeScreenshot(page, "student_login_03_error.png");

    // Step 5: Verify error message displayed
    // Error is displayed in a div with bg-red-50 class
    const tErrorDiv = page.locator('[class*="bg-red-50"], [class*="bg-red-"]');
    const tErrorVisible = await tErrorDiv.isVisible().catch(() => false);

    if (tErrorVisible)
    {
        const tErrorText = await tErrorDiv.textContent();
        logResult("2.4", "Error message displayed for wrong password", true, tErrorText.trim());
    }
    else
    {
        // Check if still on login page (not redirected)
        const tStillOnLogin = page.url().includes("/login");
        logResult("2.4", "Error message displayed for wrong password", tErrorVisible,
            tStillOnLogin ? "Still on login page but no visible error div" : "Unexpected navigation");
    }

    // Verify not redirected to student area
    const tNotRedirected = !page.url().includes("/student/");
    logResult("2.4", "Not redirected on wrong password", tNotRedirected, page.url());
}

// ============================================================
// Scenario 2.5: Register Page
// ============================================================
async function testRegisterPage(page)
{
    console.log("\n--- Scenario 2.5: Register Page ---");

    // Step 1: Navigate to register
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Step 2: Screenshot
    await takeScreenshot(page, "register_01.png");

    // Step 3: Verify name field
    const tNameInput = page.locator("#name");
    const tNameVisible = await tNameInput.isVisible();
    logResult("2.5", "Name field exists", tNameVisible, "");

    // Verify email field
    const tEmailInput = page.locator("#email");
    const tEmailVisible = await tEmailInput.isVisible();
    logResult("2.5", "Email field exists", tEmailVisible, "");

    // Verify password field
    const tPasswordInput = page.locator("#password");
    const tPasswordVisible = await tPasswordInput.isVisible();
    logResult("2.5", "Password field exists", tPasswordVisible, "");

    // Step 4: Verify role selector (student/instructor)
    const tPageContent = await page.textContent("body");
    const tHasStudentRole = tPageContent.includes("학생");
    const tHasInstructorRole = tPageContent.includes("교강사");

    logResult("2.5", "Student role option exists", tHasStudentRole, "");
    logResult("2.5", "Instructor role option exists", tHasInstructorRole, "");

    // Verify role selector buttons are clickable
    const tRoleButtons = page.locator('button[type="button"]').filter({ hasText: /학생|교강사/ });
    const tRoleButtonCount = await tRoleButtons.count();
    logResult("2.5", "Role selector buttons present", tRoleButtonCount >= 2, `Found ${tRoleButtonCount} role buttons`);

    // Verify submit button
    const tSubmitButton = page.locator('button[type="submit"]');
    const tSubmitVisible = await tSubmitButton.isVisible();
    logResult("2.5", "Submit button exists", tSubmitVisible, "");
}

// ============================================================
// Main
// ============================================================
async function main()
{
    console.log("=== ThinkBridge E2E Test Suite 2: Student Login + Sessions + Report ===\n");
    console.log(`Target: ${BASE_URL}`);
    console.log(`Screenshots: ${SCREENSHOT_DIR}/\n`);

    const browser = await chromium.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
        viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
        locale: "ko-KR",
    });

    const page = await context.newPage();

    try
    {
        // Run tests sequentially
        await testStudentLogin(page);
        await testStudentSessions(page);
        await testStudentReport(page);
        await testLoginWrongPassword(page);
        await testRegisterPage(page);
    }
    catch (error)
    {
        console.error(`\n!!! Unhandled error: ${error.message}`);
        await takeScreenshot(page, "error_unhandled.png").catch(() => {});
    }
    finally
    {
        await browser.close();
    }

    // ---- Print Results in Markdown ----
    console.log("\n\n");
    console.log("## E2E Test Results: Student Login + Sessions + Report\n");

    let tPassCount = 0;
    let tFailCount = 0;
    let tCurrentScenario = "";

    for (const r of results)
    {
        if (r.scenario !== tCurrentScenario)
        {
            tCurrentScenario = r.scenario;
            const tScenarioNames = {
                "2.1": "Scenario 2.1: Student Login",
                "2.2": "Scenario 2.2: Student Sessions List",
                "2.3": "Scenario 2.3: Student Report",
                "2.4": "Scenario 2.4: Login with Wrong Password",
                "2.5": "Scenario 2.5: Register Page",
            };
            console.log(`\n### ${tScenarioNames[r.scenario] || r.scenario}\n`);
        }

        const tIcon = r.status === "PASS" ? "[PASS]" : "[FAIL]";
        const tDetailStr = r.detail ? ` -- ${r.detail}` : "";
        console.log(`- ${tIcon} ${r.testName}${tDetailStr}`);

        if (r.status === "PASS") tPassCount++;
        else tFailCount++;
    }

    const tTotal = tPassCount + tFailCount;
    console.log(`\n### Summary\n`);
    console.log(`| Metric | Count |`);
    console.log(`|--------|-------|`);
    console.log(`| Total  | ${tTotal}   |`);
    console.log(`| Passed | ${tPassCount}   |`);
    console.log(`| Failed | ${tFailCount}   |`);
    console.log(`| Rate   | ${tTotal > 0 ? Math.round((tPassCount / tTotal) * 100) : 0}%  |`);
    console.log("");
}

main().catch((error) =>
{
    console.error("Fatal error:", error);
    process.exit(1);
});
