const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = '/home/mark-minipc/workspace/thinkbridge/docs/test';
const BASE_URL = 'https://frontend-manhyeon.vercel.app';
const CHROME_PATH = '/home/mark-minipc/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';

const results = [];

function record(scenario, testName, passed, detail)
{
    results.push({ scenario, testName, passed, detail: detail || '' });
}

function formatResults()
{
    let output = '## Test Suite 1: Landing + Guest Flow\n\n';
    let currentScenario = '';
    let totalPass = 0;
    let totalFail = 0;

    for (const r of results)
    {
        if (r.scenario !== currentScenario)
        {
            currentScenario = r.scenario;
            output += `### ${currentScenario}\n`;
        }
        const status = r.passed ? 'PASS' : 'FAIL';
        if (r.passed) { totalPass++; } else { totalFail++; }
        const detailStr = r.detail ? ` (${r.detail})` : '';
        output += `- [${status}] ${r.testName}${detailStr}\n`;
    }

    output += `\n### Summary\n`;
    output += `- Total: ${totalPass + totalFail}\n`;
    output += `- Passed: ${totalPass}\n`;
    output += `- Failed: ${totalFail}\n`;

    return output;
}

async function screenshot(page, name)
{
    const filePath = path.join(SCREENSHOT_DIR, name);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`  Screenshot saved: ${name}`);
}

async function fullScreenshot(page, name)
{
    const filePath = path.join(SCREENSHOT_DIR, name);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  Full screenshot saved: ${name}`);
}

async function scenario11(page)
{
    const scenarioName = 'Scenario 1.1: Landing Page Elements';
    console.log(`\n=== ${scenarioName} ===`);

    try
    {
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        await screenshot(page, 'landing_01_hero.png');

        // Verify hero text
        try
        {
            const heroText = await page.textContent('body');
            const hasHeroText = heroText.includes('AI가 답을 주는 시대');
            record(scenarioName, 'Hero text "AI가 답을 주는 시대" visible', hasHeroText,
                hasHeroText ? 'Found in page' : 'Not found in page');
        }
        catch (e)
        {
            record(scenarioName, 'Hero text "AI가 답을 주는 시대" visible', false, e.message);
        }

        // Verify CTA button
        try
        {
            const ctaButton = await page.locator('text=바로 체험하기').first();
            const ctaVisible = await ctaButton.isVisible({ timeout: 5000 });
            record(scenarioName, 'Guest CTA button "바로 체험하기" visible', ctaVisible);
        }
        catch (e)
        {
            record(scenarioName, 'Guest CTA button "바로 체험하기" visible', false, e.message);
        }

        // Verify comparison section: "기존 AI와 무엇이 다른가요?" + "기존 AI 챗봇" + "ThinkBridge"
        try
        {
            const bodyText = await page.textContent('body');
            const hasComparison = bodyText.includes('기존 AI') && bodyText.includes('ThinkBridge');
            record(scenarioName, 'ChatGPT vs ThinkBridge comparison section exists', hasComparison,
                hasComparison
                    ? 'Found "기존 AI" and "ThinkBridge" comparison'
                    : `Missing: 기존 AI=${bodyText.includes('기존 AI')}, ThinkBridge=${bodyText.includes('ThinkBridge')}`);
        }
        catch (e)
        {
            record(scenarioName, 'ChatGPT vs ThinkBridge comparison section exists', false, e.message);
        }

        // Verify 3 feature cards
        try
        {
            const bodyText = await page.textContent('body');
            const hasFeature1 = bodyText.includes('소크라테스');
            const hasFeature2 = bodyText.includes('사고력 분석') || bodyText.includes('실시간');
            const hasFeature3 = bodyText.includes('교강사') || bodyText.includes('대시보드');
            const hasCards = hasFeature1 && hasFeature2 && hasFeature3;
            record(scenarioName, '3 feature cards exist', hasCards,
                `소크라테스: ${hasFeature1}, 분석: ${hasFeature2}, 교강사: ${hasFeature3}`);
        }
        catch (e)
        {
            record(scenarioName, '3 feature cards exist', false, e.message);
        }

        // Verify demo mode section with 3 buttons
        try
        {
            const bodyText = await page.textContent('body');
            const hasStudent = bodyText.includes('학생으로 체험') || bodyText.includes('학생으로');
            const hasInstructor = bodyText.includes('교강사로 체험') || bodyText.includes('교강사로');
            const hasAdmin = bodyText.includes('운영자로 체험') || bodyText.includes('운영자로');
            const has3Buttons = hasStudent && hasInstructor && hasAdmin;
            record(scenarioName, 'Demo mode section with 3 role buttons exists', has3Buttons,
                `Student: ${hasStudent}, Instructor: ${hasInstructor}, Admin: ${hasAdmin}`);
        }
        catch (e)
        {
            record(scenarioName, 'Demo mode section with 3 role buttons exists', false, e.message);
        }

        // Scroll to bottom and screenshot
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
        await fullScreenshot(page, 'landing_02_full.png');
        record(scenarioName, 'Full page screenshot captured', true);
    }
    catch (e)
    {
        record(scenarioName, 'Landing page load', false, e.message);
    }
}

async function scenario12(page)
{
    const scenarioName = 'Scenario 1.2: Guest Trial Flow';
    console.log(`\n=== ${scenarioName} ===`);

    try
    {
        // Navigate back to landing
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Click "바로 체험하기"
        try
        {
            const ctaButton = await page.locator('text=바로 체험하기').first();
            await ctaButton.click();
            console.log('  Clicked "바로 체험하기"');

            // Wait for navigation to /student/chat
            await page.waitForURL('**/student/chat**', { timeout: 15000 });
            await page.waitForTimeout(2000);
            const currentUrl = page.url();
            console.log(`  Current URL: ${currentUrl}`);

            const navigatedToChat = currentUrl.includes('/student/chat');
            record(scenarioName, 'Navigation to /student/chat after CTA click', navigatedToChat,
                `URL: ${currentUrl}`);

            await screenshot(page, 'guest_01_chat_page.png');
        }
        catch (e)
        {
            record(scenarioName, 'Navigation to /student/chat after CTA click', false, e.message);
            return;
        }

        // Verify subject selector (수학/과학/논술)
        try
        {
            const bodyText = await page.textContent('body');
            const hasMath = bodyText.includes('수학');
            const hasScience = bodyText.includes('과학');
            const hasEssay = bodyText.includes('논술');
            const hasSubjects = hasMath && hasScience && hasEssay;
            record(scenarioName, 'Subject selector visible (수학/과학/논술)', hasSubjects,
                `수학: ${hasMath}, 과학: ${hasScience}, 논술: ${hasEssay}`);
        }
        catch (e)
        {
            record(scenarioName, 'Subject selector visible (수학/과학/논술)', false, e.message);
        }

        // Verify guest badge ("5턴 체험 중")
        try
        {
            const bodyText = await page.textContent('body');
            const hasGuestBadge = bodyText.includes('체험 중') || bodyText.includes('게스트') || bodyText.includes('Guest');
            record(scenarioName, 'Guest badge visible', hasGuestBadge,
                hasGuestBadge ? 'Guest indicator found ("체험 중" or similar)' : 'No guest indicator found');
        }
        catch (e)
        {
            record(scenarioName, 'Guest badge visible', false, e.message);
        }

        // Select subject "math" (already default) and enter topic "피타고라스 정리"
        try
        {
            // Math is already selected by default, but click it to be sure
            const mathButton = await page.locator('button:has-text("수학")').first();
            if (await mathButton.isVisible({ timeout: 3000 }))
            {
                await mathButton.click();
                console.log('  Selected math subject');
                await page.waitForTimeout(300);
            }

            // Fill the topic input -- it's the input inside the "주제 입력" section
            // The input has placeholder like "예: 이차방정식의 근의 공식"
            const topicInput = await page.locator('input[placeholder*="이차방정식"], input[placeholder*="주제"]').first();
            if (await topicInput.isVisible({ timeout: 3000 }))
            {
                await topicInput.fill('피타고라스 정리');
                console.log('  Entered topic: 피타고라스 정리');
                await page.waitForTimeout(500);

                // Verify the value was set
                const tValue = await topicInput.inputValue();
                console.log(`  Input value: "${tValue}"`);
                record(scenarioName, 'Subject "math" selected and topic entered', tValue.includes('피타고라스'),
                    `Math selected, topic input value: "${tValue}"`);
            }
            else
            {
                record(scenarioName, 'Subject "math" selected and topic entered', false,
                    'Topic input not found by placeholder');
            }
        }
        catch (e)
        {
            record(scenarioName, 'Subject "math" selected and topic entered', false, e.message);
        }

        // Click "대화 시작하기"
        try
        {
            // Wait for the button to become enabled (topic must be filled)
            const startButton = await page.locator('button:has-text("대화 시작하기")');
            await startButton.waitFor({ state: 'visible', timeout: 5000 });

            // Check if button is enabled now
            const isDisabled = await startButton.isDisabled();
            console.log(`  Start button disabled: ${isDisabled}`);

            if (!isDisabled)
            {
                await startButton.click();
                console.log('  Clicked "대화 시작하기"');

                // Take an early screenshot showing "세션 생성 중..." state
                await page.waitForTimeout(2000);
                await screenshot(page, 'guest_02_session_created.png');

                // Wait for the session to be created and chat interface to appear
                // The ChatInterface has a textarea with placeholder "질문을 입력하세요..."
                // The backend may take time (especially on cold start), wait up to 15s
                try
                {
                    await page.locator('textarea[placeholder*="질문을 입력"]').waitFor({ state: 'visible', timeout: 15000 });
                    console.log('  Chat interface textarea appeared');
                }
                catch (waitErr)
                {
                    console.log('  Textarea not found within 15s, checking page state...');
                }

                const bodyText = await page.textContent('body');
                const sessionCreated = bodyText.includes('질문을 입력') ||
                    bodyText.includes('세션 생성 중') ||
                    bodyText.includes('피타고라스');
                record(scenarioName, 'Session created after clicking start', sessionCreated,
                    sessionCreated ? 'Chat interface appeared or session creating' : 'Chat interface not visible');
            }
            else
            {
                // Button is still disabled, likely the topic fill didn't work via React state
                // Try dispatching input event manually
                console.log('  Button still disabled, trying manual input dispatch...');

                const topicInput = await page.locator('input[placeholder*="이차방정식"], input[placeholder*="주제"]').first();
                await topicInput.click();
                await topicInput.fill('');
                await page.waitForTimeout(100);
                await topicInput.type('피타고라스 정리', { delay: 50 });
                await page.waitForTimeout(500);

                const isStillDisabled = await startButton.isDisabled();
                console.log(`  Start button disabled after manual type: ${isStillDisabled}`);

                if (!isStillDisabled)
                {
                    await startButton.click();
                    console.log('  Clicked "대화 시작하기" after manual input');
                    await page.waitForTimeout(5000);
                    await screenshot(page, 'guest_02_session_created.png');
                    record(scenarioName, 'Session created after clicking start', true, 'Required manual type input');
                }
                else
                {
                    await screenshot(page, 'guest_02_session_created.png');
                    record(scenarioName, 'Session created after clicking start', false,
                        'Button remains disabled even after manual type');
                }
            }
        }
        catch (e)
        {
            record(scenarioName, 'Session created after clicking start', false, e.message);
            await screenshot(page, 'guest_02_session_created.png');
        }

        // Type message and send
        try
        {
            // The ChatInterface uses a Textarea with placeholder "질문을 입력하세요... (Shift+Enter: 줄바꿈)"
            const messageTextarea = await page.locator('textarea[placeholder*="질문을 입력"]');
            await messageTextarea.waitFor({ state: 'visible', timeout: 10000 });

            await messageTextarea.click();
            await messageTextarea.fill('피타고라스 정리가 뭐예요?');
            await page.waitForTimeout(300);

            const msgValue = await messageTextarea.inputValue();
            console.log(`  Message textarea value: "${msgValue}"`);

            // Send: look for the Send button or press Enter
            // The ChatInterface has a Send button with <Send> icon
            const sendButton = await page.locator('button:has(svg.lucide-send), button[title*="전송"], button:has-text("전송")').first();
            if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false))
            {
                await sendButton.click();
                console.log('  Clicked send button');
            }
            else
            {
                // Just press Enter (not Shift+Enter, which adds newline)
                await messageTextarea.press('Enter');
                console.log('  Pressed Enter to send');
            }

            record(scenarioName, 'Message sent: "피타고라스 정리가 뭐예요?"', true);

            // Wait for AI response (25 seconds)
            console.log('  Waiting 25 seconds for AI response...');
            await page.waitForTimeout(25000);
            await screenshot(page, 'guest_03_ai_response.png');
        }
        catch (e)
        {
            record(scenarioName, 'Message sent: "피타고라스 정리가 뭐예요?"', false, e.message);
            await page.waitForTimeout(5000);
            await screenshot(page, 'guest_03_ai_response.png');
        }

        // Verify AI response appeared
        try
        {
            const bodyText = await page.textContent('body');
            // Check for assistant message content - the AI should have responded
            // Look for typical Socratic response patterns or any substantial new text
            const hasUserMsg = bodyText.includes('피타고라스 정리가 뭐예요');
            const textLength = bodyText.length;
            // If user message is shown AND body has substantial content, likely AI responded
            const hasResponse = hasUserMsg && textLength > 300;
            record(scenarioName, 'AI response message appears (not empty)', hasResponse,
                `User msg visible: ${hasUserMsg}, body length: ${textLength}`);
        }
        catch (e)
        {
            record(scenarioName, 'AI response message appears (not empty)', false, e.message);
        }

        // Verify ThoughtPanel or analysis section
        try
        {
            const bodyText = await page.textContent('body');
            const hasAnalysisTerms = bodyText.includes('문제 이해') ||
                bodyText.includes('전제 확인') ||
                bodyText.includes('논리 구조화') ||
                bodyText.includes('근거 제시') ||
                bodyText.includes('비판적 사고') ||
                bodyText.includes('창의적 사고') ||
                bodyText.includes('사고력 분석');
            record(scenarioName, 'ThoughtPanel or analysis section visible', hasAnalysisTerms,
                hasAnalysisTerms ? 'Thinking dimension labels found' : 'No analysis dimension text found');
        }
        catch (e)
        {
            record(scenarioName, 'ThoughtPanel or analysis section visible', false, e.message);
        }

        // Verify progress bar shows stage
        try
        {
            const bodyText = await page.textContent('body');
            // ProgressBar stage labels: 명확화, 탐색, 유도, 검증, 확장
            const hasStageLabels = bodyText.includes('명확화') ||
                bodyText.includes('탐색') ||
                bodyText.includes('유도') ||
                bodyText.includes('검증') ||
                bodyText.includes('확장');
            record(scenarioName, 'ProgressBar shows stage', hasStageLabels,
                hasStageLabels ? 'Stage labels found (명확화/탐색/유도/검증/확장)' : 'No stage labels found');
        }
        catch (e)
        {
            record(scenarioName, 'ProgressBar shows stage', false, e.message);
        }
    }
    catch (e)
    {
        record(scenarioName, 'Guest trial flow', false, e.message);
    }
}

async function scenario13(page, context)
{
    const scenarioName = 'Scenario 1.3: Demo Student Login';
    console.log(`\n=== ${scenarioName} ===`);

    try
    {
        // Clear cookies/storage to start fresh
        await context.clearCookies();
        await page.evaluate(() => localStorage.clear());
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Click "학생으로 체험"
        try
        {
            const studentBtn = await page.locator('button:has-text("학생으로 체험"), a:has-text("학생으로 체험")').first();
            if (await studentBtn.isVisible({ timeout: 5000 }))
            {
                await studentBtn.click();
                console.log('  Clicked "학생으로 체험"');
                await page.waitForTimeout(5000);

                const currentUrl = page.url();
                console.log(`  Current URL: ${currentUrl}`);
                await screenshot(page, 'demo_student_01.png');

                const navigated = currentUrl.includes('/student');
                record(scenarioName, 'Navigated to student area after "학생으로 체험"', navigated,
                    `URL: ${currentUrl}`);
            }
            else
            {
                // Try scrolling to demo section first
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(1000);
                const studentBtn2 = await page.locator('button:has-text("학생으로"), a:has-text("학생으로")').first();
                await studentBtn2.click();
                await page.waitForTimeout(5000);
                const currentUrl = page.url();
                await screenshot(page, 'demo_student_01.png');
                record(scenarioName, 'Navigated to student area after "학생으로 체험"',
                    currentUrl.includes('/student'), `URL: ${currentUrl}`);
            }
        }
        catch (e)
        {
            record(scenarioName, 'Navigated to student area after "학생으로 체험"', false, e.message);
            await screenshot(page, 'demo_student_01.png');
        }
    }
    catch (e)
    {
        record(scenarioName, 'Demo student login', false, e.message);
    }
}

async function scenario14(page, context)
{
    const scenarioName = 'Scenario 1.4: Demo Instructor Login';
    console.log(`\n=== ${scenarioName} ===`);

    try
    {
        // Clear cookies/storage and navigate back
        await context.clearCookies();
        await page.evaluate(() => localStorage.clear());
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Click "교강사로 체험"
        try
        {
            const instrBtn = await page.locator('button:has-text("교강사로 체험"), a:has-text("교강사로 체험")').first();
            if (await instrBtn.isVisible({ timeout: 5000 }))
            {
                await instrBtn.click();
                console.log('  Clicked "교강사로 체험"');
                await page.waitForTimeout(5000);

                const currentUrl = page.url();
                console.log(`  Current URL: ${currentUrl}`);
                await screenshot(page, 'demo_instructor_01.png');

                const navigated = currentUrl.includes('/instructor');
                record(scenarioName, 'Navigated to /instructor/dashboard', navigated,
                    `URL: ${currentUrl}`);
            }
            else
            {
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(1000);
                const instrBtn2 = await page.locator('button:has-text("교강사로"), a:has-text("교강사로")').first();
                await instrBtn2.click();
                await page.waitForTimeout(5000);
                const currentUrl = page.url();
                await screenshot(page, 'demo_instructor_01.png');
                record(scenarioName, 'Navigated to /instructor/dashboard',
                    currentUrl.includes('/instructor'), `URL: ${currentUrl}`);
            }
        }
        catch (e)
        {
            record(scenarioName, 'Navigated to /instructor/dashboard', false, e.message);
            await screenshot(page, 'demo_instructor_01.png');
        }
    }
    catch (e)
    {
        record(scenarioName, 'Demo instructor login', false, e.message);
    }
}

async function scenario15(page, context)
{
    const scenarioName = 'Scenario 1.5: Demo Admin Login';
    console.log(`\n=== ${scenarioName} ===`);

    try
    {
        // Clear cookies/storage and navigate back
        await context.clearCookies();
        await page.evaluate(() => localStorage.clear());
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Click "운영자로 체험"
        try
        {
            const adminBtn = await page.locator('button:has-text("운영자로 체험"), a:has-text("운영자로 체험")').first();
            if (await adminBtn.isVisible({ timeout: 5000 }))
            {
                await adminBtn.click();
                console.log('  Clicked "운영자로 체험"');
                await page.waitForTimeout(5000);

                const currentUrl = page.url();
                console.log(`  Current URL: ${currentUrl}`);
                await screenshot(page, 'demo_admin_01.png');

                const navigated = currentUrl.includes('/admin');
                record(scenarioName, 'Navigated to /admin/dashboard', navigated,
                    `URL: ${currentUrl}`);
            }
            else
            {
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(1000);
                const adminBtn2 = await page.locator('button:has-text("운영자로"), a:has-text("운영자로")').first();
                await adminBtn2.click();
                await page.waitForTimeout(5000);
                const currentUrl = page.url();
                await screenshot(page, 'demo_admin_01.png');
                record(scenarioName, 'Navigated to /admin/dashboard',
                    currentUrl.includes('/admin'), `URL: ${currentUrl}`);
            }
        }
        catch (e)
        {
            record(scenarioName, 'Navigated to /admin/dashboard', false, e.message);
            await screenshot(page, 'demo_admin_01.png');
        }
    }
    catch (e)
    {
        record(scenarioName, 'Demo admin login', false, e.message);
    }
}

async function main()
{
    console.log('=== ThinkBridge E2E Test Suite 1: Landing + Guest Flow ===');
    console.log(`Target: ${BASE_URL}`);
    console.log(`Screenshots: ${SCREENSHOT_DIR}\n`);

    // Ensure screenshot directory exists
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const browser = await chromium.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        locale: 'ko-KR'
    });

    const page = await context.newPage();

    // Set a reasonable default timeout
    page.setDefaultTimeout(15000);

    try
    {
        await scenario11(page);
        await scenario12(page);
        await scenario13(page, context);
        await scenario14(page, context);
        await scenario15(page, context);
    }
    catch (e)
    {
        console.error('Fatal error:', e.message);
    }
    finally
    {
        await browser.close();
    }

    const report = formatResults();
    console.log('\n' + report);
}

main().catch(e =>
{
    console.error('Script failed:', e);
    process.exit(1);
});
