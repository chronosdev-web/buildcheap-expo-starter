import puppeteer from 'puppeteer';

async function main() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await page.goto('http://localhost:5173/#/login');
    
    await page.type('#email', 'test2@test.com');
    await page.type('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation();
    console.log('Logged in, URL:', page.url());

    await page.goto('http://localhost:5173/#/credentials');
    await page.waitForSelector('#deleteGithubBtn', { timeout: 5173 }).catch(async () => {
        console.log('deleteGithubBtn not found, adding token first...');
        await page.waitForSelector('#githubToken');
        await page.type('#githubToken', 'ghp_fake_token');
        await page.click('#saveGithubBtn');
        await page.waitForSelector('#deleteGithubBtn');
    });

    console.log('Clicking delete button...');
    
    // Automatically accept the confirm dialog
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
