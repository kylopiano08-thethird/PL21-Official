// api/google-sheets-proxy.js - Vercel serverless function
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { sheet, format = 'json' } = req.query;
    
    if (!sheet) {
        return res.status(400).json({ error: 'Missing sheet parameter' });
    }
    
    // This is the PL21 (Previous Season) Sheet ID
    const SHEET_ID = '1BA9J14wUXfrjGUXlFrxYBqdZzAKIDrfQFgop_7FwfPg';
    
    try {
        let url;
        if (format === 'csv') {
            url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&id=${SHEET_ID}&sheet=${encodeURIComponent(sheet)}`;
        } else {
            url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`;
        }
        
        console.log(`📡 Proxying request to: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Vercel/1.0)',
                'Accept': format === 'csv' ? 'text/csv' : 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ Google Sheets API error: ${response.status}`);
            return res.status(response.status).json({ error: `Google Sheets API error: ${response.status}` });
        }
        
        let data;
        if (format === 'csv') {
            data = await response.text();
            res.setHeader('Content-Type', 'text/csv');
            return res.status(200).send(data);
        } else {
            const text = await response.text();
            // Clean up the JSONP response
            const jsonStr = text.replace(/^.*?\(/, '').replace(/\);$/, '');
            const jsonData = JSON.parse(jsonStr);
            res.setHeader('Content-Type', 'application/json');
            return res.status(200).json(jsonData);
        }
    } catch (error) {
        console.error('❌ Error fetching sheet:', error);
        return res.status(500).json({ error: 'Failed to fetch sheet data' });
    }
}