export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ========================================
    // RECAPTCHA VALIDATION
    // ========================================
    const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;

    // Get reCAPTCHA token from request
    const recaptchaToken = req.body?.leads?.[0]?.fields?.recaptchaToken;

    if (RECAPTCHA_SECRET && recaptchaToken) {
        try {
            const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `secret=${RECAPTCHA_SECRET}&response=${recaptchaToken}`
            });

            const recaptchaResult = await recaptchaResponse.json();
            console.log('reCAPTCHA result:', recaptchaResult);

            // Check if verification failed or score is too low (likely bot)
            if (!recaptchaResult.success) {
                console.warn('reCAPTCHA verification failed:', recaptchaResult['error-codes']);
                return res.status(400).json({ error: 'reCAPTCHA verification failed' });
            }

            // Score threshold: 0.5 is Google's recommended threshold
            // Score ranges from 0.0 (bot) to 1.0 (human)
            if (recaptchaResult.score !== undefined && recaptchaResult.score < 0.5) {
                console.warn('reCAPTCHA score too low:', recaptchaResult.score);
                return res.status(400).json({ error: 'Request blocked - suspicious activity detected' });
            }

            console.log('reCAPTCHA passed with score:', recaptchaResult.score);
        } catch (error) {
            console.error('reCAPTCHA validation error:', error);
            // Continue anyway if reCAPTCHA fails - don't block legitimate users
        }
    } else {
        console.log('reCAPTCHA token not provided or secret not configured');
    }

    const CLIENT_ID = '60520d12-3f34-4603-a2e3-f5c8f7c577c8';
    const CLIENT_SECRET = '3ab74abc-7898-4b7a-91e5-a5f379435f97';
    const AUTH_ENDPOINT = 'https://api.leadexec.net/v1/authorization/token';
    const LEAD_ENDPOINT = 'https://leads.leadexec.net/v2/insert/general';

    // ========================================
    // TIER CLASSIFICATION CONFIGURATION
    // ========================================

    // Tier 1 ($90) - High Distress dropdown selections
    const TIER_1_REASONS = [
        'inherited',
        'foreclosure',
        'financial',           // "Behind on payments / taxes" mapped to "Financial"
        'tired landlord',
        'vacant',              // Note: Also check Status field for "Vacant"
        'divorce'
    ];

    // Tier 1 keywords in free text (case-insensitive)
    const TIER_1_KEYWORDS = [
        'vacant', 'empty', 'no one living',
        'needs repairs', 'roof', 'foundation', 'fire damage', 'water damage', 'mold',
        'tenants', 'evict',
        'behind', 'late payments', 'taxes',
        'probate', 'estate',
        'asap', 'urgent',
        'foreclosure'
    ];

    // Tier 2 ($75) - General Motivation
    const TIER_2_REASONS = ['relocating', 'downsizing', 'upgrading', 'other'];

    // ========================================
    // TIER CLASSIFICATION FUNCTION
    // ========================================

    function classifyLead(fields) {
        const reasonText = (fields.ReasonForSelling || '').toLowerCase();
        const statusText = (fields.Status || '').toLowerCase();
        const state = (fields.State || '').toUpperCase();

        let tier = 2;  // Default to Tier 2
        let price = 75;
        let motivation = 'OTHER';
        const tags = [];

        // Check for Tier 1 reasons in the dropdown selection
        for (const reason of TIER_1_REASONS) {
            if (reasonText.includes(reason)) {
                tier = 1;
                motivation = reason.toUpperCase().replace(' ', '_');
                break;
            }
        }

        // Check if Status is "Vacant" (property occupancy status)
        if (statusText === 'vacant' || statusText === 'empty') {
            tier = 1;
            if (motivation === 'OTHER') motivation = 'VACANT_PROPERTY';
        }

        // Check for Tier 1 keywords in free text (can upgrade Tier 2 to Tier 1)
        if (tier === 2) {
            for (const keyword of TIER_1_KEYWORDS) {
                if (reasonText.includes(keyword)) {
                    tier = 1;
                    motivation = 'KEYWORD_DISTRESS';
                    break;
                }
            }
        }

        // Extract primary motivation if still Tier 2
        if (tier === 2) {
            for (const reason of TIER_2_REASONS) {
                if (reasonText.includes(reason)) {
                    motivation = reason.toUpperCase();
                    break;
                }
            }
        }

        // Set price based on tier
        price = tier === 1 ? 90 : 75;

        // Build tags
        tags.push(tier === 1 ? 'TIER_1_DISTRESS' : 'TIER_2_GENERAL');
        if (state) tags.push(`STATE_${state}`);
        tags.push(`MOTIVATION_${motivation}`);
        tags.push(`PRICE_${price}`);

        return { tier, price, motivation, tags };
    }

    // ========================================
    // MAIN HANDLER LOGIC
    // ========================================

    // Capture client IP address
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.connection?.remoteAddress
        || 'Unknown';

    const body = req.body;

    // Process lead classification and inject tags
    if (body.leads && body.leads[0] && body.leads[0].fields) {
        const fields = body.leads[0].fields;
        const classification = classifyLead(fields);

        // Inject IP address
        body.leads[0].fields.IPAddress = clientIP;

        // Add classification data
        body.leads[0].fields.LeadTier = classification.tier;
        body.leads[0].fields.LeadPrice = classification.price;
        body.leads[0].fields.Motivation = classification.motivation;

        // Add tags to properties
        if (!body.leads[0].properties) {
            body.leads[0].properties = {};
        }
        body.leads[0].properties.tags = classification.tags;

        console.log('Lead Classification:', {
            tier: classification.tier,
            price: classification.price,
            motivation: classification.motivation,
            tags: classification.tags,
            reasonText: fields.ReasonForSelling,
            status: fields.Status
        });
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
