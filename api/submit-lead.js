export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const CLIENT_ID = '60520d12-3f34-4603-a2e3-f5c8f7c577c8';
    const CLIENT_SECRET = '3ab74abc-7898-4b7a-91e5-a5f379435f97';
    const AUTH_ENDPOINT = 'https://api.leadexec.net/v1/authorization/token';
    const LEAD_ENDPOINT = 'https://leads.leadexec.net/v2/insert/general';

    // Capture client IP address
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.connection?.remoteAddress
        || 'Unknown';

    // Inject IP into lead data if leads array exists
    const body = req.body;
    if (body.leads && body.leads[0] && body.leads[0].fields) {
        body.leads[0].fields.IPAddress = clientIP;
    }

    console.log('Submitting lead:', JSON.stringify(body, null, 2));
    console.log('Client IP:', clientIP);

    try {
        // Step 1: Get OAuth access token
        const authResponse = await fetch(AUTH_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });

        const authData = await authResponse.json();

        if (!authData.access_token) {
            console.error('Auth failed:', authData);
            return res.status(401).json({ error: 'Authentication failed', details: authData.error });
        }

        // Step 2: Submit lead with Bearer token
        const response = await fetch(LEAD_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authData.access_token}`
            },
            body: JSON.stringify(body)
        });

        const text = await response.text();
        console.log('LeadExec response:', response.status, text);

        try {
            const data = JSON.parse(text);
            res.status(response.status).json(data);
        } catch {
            res.status(response.status).json({ raw: text, status: response.status });
        }
    } catch (error) {
        console.error('LeadExec API error:', error);
        res.status(500).json({ error: 'Failed to submit lead', details: error.message });
    }
}
