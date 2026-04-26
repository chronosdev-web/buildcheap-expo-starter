const http = require('http');

async function testFlow() {
    const email = 'test_delete_github_1@test.com';
    const password = 'password123';
    let cookie = '';

    console.log("0. Signing up...");
    await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    console.log("1. Logging in...");
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.error);
    
    // Extract the HttpOnly cookie
    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
        cookie = setCookie.split(';')[0];
    }
    const token = loginData.token;
    console.log("Logged in. User:", loginData.user.email, "| has_github_token:", loginData.user.has_github_token);

    console.log("2. Saving GitHub Token...");
    const saveRes = await fetch('http://localhost:3000/api/credentials/github', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'Cookie': cookie
        },
        body: JSON.stringify({ token: 'ghp_fake_test_token_12345' })
    });
    console.log("Save status:", saveRes.status);
    
    console.log("3. Fetching /auth/me...");
    const meRes1 = await fetch('http://localhost:3000/api/auth/me?t=' + Date.now(), {
        headers: { 'Authorization': 'Bearer ' + token, 'Cookie': cookie }
    });
    const meData1 = await meRes1.json();
    console.log("has_github_token after save:", meData1.user.has_github_token);

    console.log("4. Deleting GitHub Token...");
    const delRes = await fetch('http://localhost:3000/api/credentials/github', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token, 'Cookie': cookie }
    });
    console.log("Delete status:", delRes.status);

    console.log("5. Fetching /auth/me again...");
    const meRes2 = await fetch('http://localhost:3000/api/auth/me?t=' + Date.now(), {
        headers: { 'Authorization': 'Bearer ' + token, 'Cookie': cookie }
    });
    const meData2 = await meRes2.json();
    console.log("has_github_token after delete:", meData2.user.has_github_token);
}

testFlow().catch(console.error);
