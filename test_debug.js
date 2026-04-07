import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on("console", msg => console.log("BROWSER LOG:", msg.type(), msg.text()));
    page.on("pageerror", err => console.log("PAGE ERROR:", err.message));

    console.log("Navigating to login...");
    await page.goto("http://localhost:3000/login");
    await page.waitForTimeout(1000);

    await page.fill('input[type="email"]', "guy@chronos.dev");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    console.log("Navigating to credentials...");
    await page.goto("http://localhost:3000/credentials");
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "creds_debug.png", fullPage: true });
    console.log("Screenshot saved to creds_debug.png!");

    await browser.close();
})();
