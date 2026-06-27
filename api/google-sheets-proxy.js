// js/archive-data-loader.js - Data loader for archive page (PL21 Previous Season)
console.log('📦 archive-data-loader.js loaded');

// Function to parse CSV text properly
function parseCSV(csvText) {
    if (!csvText || csvText.includes('<!DOCTYPE') || csvText.includes('<html') || csvText.includes('/*O_o*/')) {
        console.warn('⚠️ Received HTML/error instead of CSV data');
        return [];
    }
    
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    const headerLine = lines[0];
    const headers = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < headerLine.length; i++) {
        const char = headerLine[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            headers.push(current.trim().replace(/^"+|"+$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    headers.push(current.trim().replace(/^"+|"+$/g, ''));
    
    if (headers.length === 0 || headers[0].includes('html')) {
        return [];
    }
    
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const fields = [];
        current = '';
        inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(current.trim().replace(/^"+|"+$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        fields.push(current.trim().replace(/^"+|"+$/g, ''));
        
        const row = {};
        headers.forEach((header, index) => {
            let value = fields[index] || '';
            if (value && !isNaN(value) && value.trim() !== '') {
                value = parseFloat(value);
            }
            row[header] = value;
        });
        rows.push(row);
    }
    return rows;
}

async function fetchArchiveSheetAsCSV(sheetName) {
    try {
        const cacheBuster = Date.now();
        // Use the archive-specific proxy
        const url = `/api/sheets-archive?sheet=${encodeURIComponent(sheetName)}&format=csv&cb=${cacheBuster}`;
        
        console.log(`📡 [ARCHIVE] Fetching ${sheetName} as CSV...`);
        
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const csvText = await res.text();
        return parseCSV(csvText);
    } catch (e) {
        console.warn(`[ARCHIVE] Failed to load ${sheetName} as CSV:`, e);
        return [];
    }
}

async function fetchArchiveSheetAsJSON(sheetName) {
    try {
        const cacheBuster = Date.now();
        // Use the archive-specific proxy
        const url = `/api/sheets-archive?sheet=${encodeURIComponent(sheetName)}&format=json&cb=${cacheBuster}`;
        
        console.log(`📡 [ARCHIVE] Fetching ${sheetName} as JSON...`);
        
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        const cols = json.table.cols.map(c => c.label || '');
        const rows = json.table.rows;
        
        const result = rows.map(row => {
            const obj = {};
            row.c.forEach((cell, index) => {
                if (cell && cell.v !== null) {
                    const colName = cols[index] || `col${index}`;
                    obj[colName] = cell.v;
                }
            });
            return obj;
        }).filter(row => Object.keys(row).length > 0);
        
        console.log(`✅ [ARCHIVE] ${sheetName} loaded (${result.length} rows)`);
        return result;
    } catch (e) {
        console.warn(`[ARCHIVE] Failed to load ${sheetName} as JSON:`, e);
        return [];
    }
}

async function fetchArchiveSheet(sheetName) {
    // Try JSON first
    const jsonData = await fetchArchiveSheetAsJSON(sheetName);
    if (jsonData && jsonData.length > 0) {
        return jsonData;
    }
    
    console.log(`⚠️ [ARCHIVE] JSON fetch returned no data for ${sheetName}, trying CSV...`);
    return await fetchArchiveSheetAsCSV(sheetName);
}

// ========== REST OF THE CODE (getFlagEmoji, loadArchiveData, etc.) ==========
// ... (keep all the processing code the same as before)

// ========== EXPOSE GLOBALLY ==========
window.loadArchiveData = loadArchiveData;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 [ARCHIVE] DOM ready, loading archive data...');
        loadArchiveData();
    });
} else {
    console.log('📄 [ARCHIVE] DOM already ready, loading archive data...');
    loadArchiveData();
}

console.log('📦 archive-data-loader.js initialized');