export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = 'd8c746e8-d900-4e52-a29b-bae73cc936ac';
    const API_SECRET = '7d1ce82b-fb2d-4e9a-8d7b-fb03a281557c';
    const ENDPOINT = 'https://leads.leadexec.net/v2/insert/general';

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
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': API_KEY
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
