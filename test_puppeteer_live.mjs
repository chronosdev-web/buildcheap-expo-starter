import puppeteer from 'puppeteer';

async function main() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    console.log("Going to buildcheap.dev login...");
    await page.goto('https://buildcheap.dev/#/login');
    
    // Switch to signup
    console.log("Switching to signup...");
    await page.click('a[href="#/signup"]');
    await page.waitForSelector('#email');

    const testEmail = 'test_github_delete_' + Date.now() + '@test.com';
    console.log("Signing up with", testEmail);
    await page.type('#email', testEmail);
    await page.type('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation();
    console.log('Logged in, URL:', page.url());

    await page.goto('https://buildcheap.dev/#/credentials');
    await page.waitForSelector('#githubToken', { timeout: 5000 });
    
    console.log('Adding fake token...');
    await page.type('#githubToken', 'ghp_fake_token_for_testing');
    await page.click('#saveGithubBtn');
    
    console.log('Waiting for disconnect button...');
    await page.waitForSelector('#deleteGithubBtn', { timeout: 5000 });
    
    console.log('Clicking delete button...');
    page.on('dialog', async dialog => {
        console.log('Dialog opened:', dialog.message());
        await dialog.accept();
    });

    await page.click('#deleteGithubBtn');
    
    await new Promise(r => setTimeout(r, 2000));
    
    const exists = await page.$('#deleteGithubBtn');
    if (exists) {
        console.log('FAILURE: Button still exists after clicking!');
    } else {
        console.log('SUCCESS: Button is gone!');
    }

    await browser.close();
}

main().catch(console.error);
