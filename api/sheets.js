// api/sheets.js
export default async function handler(req, res) {
    // Set CORS headers early
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // PL22 (Current) - default
    // PL21 (Archive) - when season=archive or season=pl21
    const { sheet, format = 'csv', season } = req.query;
    
    if (!sheet) {
        return res.status(400).json({ error: 'Sheet name required' });
    }
    
    // Choose which sheet ID to use
    let SHEET_ID = '1ECRV_5PiAFGBx9lfgKU_ZYdRSgUG4OpTEm9YzrxBvMI'; // PL22 default
    
    if (season === 'archive' || season === 'pl21') {
        SHEET_ID = '1BA9J14wUXfrjGUXlFrxYBqdZzAKIDrfQFgop_7FwfPg'; // PL21 archive
        console.log('[ARCHIVE] Using PL21 sheet');
    } else {
        console.log('[CURRENT] Using PL22 sheet');
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
        
        res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
        return res.status(200).send(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: error.message });
    }
}