const fs = require('fs');

async function testEndpoints() {
    const loginUrl = 'http://localhost:5000/api/auth/login';
    const credentials = {
        email: 'admin@tekypro.com',
        password: 'Admin@123'
    };

    try {
        // Login
        console.log('Logging in...');
        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        if (!loginRes.ok) {
            console.error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
            const text = await loginRes.text();
            console.error('Response:', text);
            return;
        }

        const setCookie = loginRes.headers.get('set-cookie');
        if (!setCookie) {
            console.error('Login failed: No cookies received');
            return;
        }

        console.log('Login successful. Testing endpoints...');

        const endpoints = [
            '/api/admin/stats/overview',
            '/api/admin/stats/enrollments/trends?days=30',
            '/api/admin/stats/courses/popular?limit=5',
            '/api/admin/stats/activities/recent?limit=10',
            '/api/admin/stats/system/health',
            '/api/admin/instructor-applications/stats'
        ];

        for (const endpoint of endpoints) {
            const url = `http://localhost:5000${endpoint}`;
            try {
                const res = await fetch(url, {
                    headers: { Cookie: setCookie }
                });

                const success = res.ok;
                console.log(`${success ? '✓' : '✗'} [${res.status}] ${endpoint}`);

                if (!success) {
                    const text = await res.text();
                    console.log('   Response:', text.substring(0, 200));
                }
            } catch (err) {
                console.log(`✗ Error fetching ${endpoint}:`, err.message);
            }
        }

    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

testEndpoints();
