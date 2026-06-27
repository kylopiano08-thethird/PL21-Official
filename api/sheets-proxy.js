// api/sheets-proxy.js - Unified Vercel serverless function for both sheets
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { sheet, format = 'json', sheetId } = req.query;
    
    if (!sheet) {
        return res.status(400).json({ error: 'Missing sheet parameter' });
    }
    
    // Default to PL22 (current season) if no sheetId provided
    // PL22: 1ECRV_5PiAFGBx9lfgKU_ZYdRSgUG4OpTEm9YzrxBvMI
    // PL21: 1BA9J14wUXfrjGUXlFrxYBqdZzAKIDrfQFgop_7FwfPg
    let SHEET_ID = sheetId || '1ECRV_5PiAFGBx9lfgKU_ZYdRSgUG4OpTEm9YzrxBvMI';
    
    // If sheetId is 'pl21' or 'archive', use the PL21 sheet
    if (sheetId === 'pl21' || sheetId === 'archive') {
        SHEET_ID = '1BA9J14wUXfrjGUXlFrxYBqdZzAKIDrfQFgop_7FwfPg';
    }
    
    try {
        let url;
        if (format === 'csv') {
            url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&id=${SHEET_ID}&sheet=${encodeURIComponent(sheet)}`;
        } else {
            url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`;
        }
        
        console.log(`📡 Proxying request to: ${url}`);
        console.log(`📡 Using sheet ID: ${SHEET_ID}`);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': format === 'csv' ? 'text/csv' : 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ Google Sheets API error: ${response.status}`);
            return res.status(response.status).json({ 
                error: `Google Sheets API error: ${response.status}`
            });
        }
        
        if (format === 'csv') {
            const data = await response.text();
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
        return res.status(500).json({ 
            error: 'Failed to fetch sheet data',
            message: error.message
        });
    }
}