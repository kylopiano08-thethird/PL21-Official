// api/sheets.js
export default async function handler(req, res) {
    const SHEET_ID = '1ECRV_5PiAFGBx9lfgKU_ZYdRSgUG4OpTEm9YzrxBvMI';
    const { sheet, format = 'csv' } = req.query;
    
    if (!sheet) {
        return res.status(400).json({ error: 'Sheet name required' });
    }
    
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:${format}&sheet=${encodeURIComponent(sheet)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Google Sheets API error: ${response.status}`);
        }
        
        let data;
        if (format === 'json') {
            const text = await response.text();
            // Parse Google's weird JSON response
            const json = JSON.parse(text.substring(47).slice(0, -2));
            data = json;
        } else {
            data = await response.text();
        }
        
        // Set proper CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
        
        return res.status(200).send(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: error.message });
    }
}