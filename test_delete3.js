async function main() {
    // 1. Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test2@test.com', password: 'password123' })
    });

    if (!loginRes.ok) {
        console.error('Login failed', await loginRes.text());
        return;
    }
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Logged in successfully');

    // 2. Set fake GitHub token
    const saveRes = await fetch('http://localhost:3000/api/credentials/github', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': "Bearer " + token
        },
        body: JSON.stringify({ token: 'test_gh_token' })
    });
    console.log('Save GH token:', saveRes.status, await saveRes.text());

    // 3. Me endpoint
    const meRes = await fetch('http://localhost:3000/api/auth/me', {
        headers: { 'Authorization': "Bearer " + token }
    });
    const meData = await meRes.json();
    console.log('has_github_token before delete:', meData.user.has_github_token);

    // 4. Delete token
    const delRes = await fetch('http://localhost:3000/api/credentials/github', {
        method: 'DELETE',
        headers: { 'Authorization': "Bearer " + token, 'Content-Type': 'application/json' }
    });
    console.log('Delete GH token:', delRes.status, await delRes.text());

    // 5. Me endpoint again
    const meRes2 = await fetch('http://localhost:3000/api/auth/me', {
        headers: { 'Authorization': "Bearer " + token }
    });
    const meData2 = await meRes2.json();
    console.log('has_github_token after delete:', meData2.user.has_github_token);
}

main().catch(console.error);
