// js/data-loader.js - COMPLETE INTELLIGENT DATA LOADER with Vercel proxy
const SHEET_ID = '1ECRV_5PiAFGBx9lfgKU_ZYdRSgUG4OpTEm9YzrxBvMI';
// No external proxy needed - using our own Vercel function

// Function to parse CSV text properly
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    // Parse header - clean up quotes and split properly
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
    headers.push(current.trim().replace(/^"+|"+$/g, '')); // Add last header
    
    // Parse data rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
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
        fields.push(current.trim().replace(/^"+|"+$/g, '')); // Add last field
        
        // Create object with headers as keys
        const row = {};
        headers.forEach((header, index) => {
            let value = fields[index] || '';
            // Try to convert numeric strings to numbers
            if (value && !isNaN(value) && value.trim() !== '') {
                value = parseFloat(value);
            }
            row[header] = value;
        });
        
        rows.push(row);
    }
    
    return rows;
}

async function fetchSheetAsCSV(sheetName) {
    try {
        const cacheBuster = Date.now();
        // Use our own Vercel function
        const url = `/api/sheets?sheet=${encodeURIComponent(sheetName)}&format=csv&cb=${cacheBuster}`;
        
        console.log(`📡 Fetching ${sheetName} as CSV via proxy...`);
        
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const csvText = await res.text();
        return parseCSV(csvText);
    } catch (e) {
        console.warn(`Failed to load ${sheetName} as CSV:`, e);
        return [];
    }
}

async function fetchSheetAsJSON(sheetName) {
    try {
        const cacheBuster = Date.now();
        // Use our own Vercel function
        const url = `/api/sheets?sheet=${encodeURIComponent(sheetName)}&format=json&cb=${cacheBuster}`;
        
        console.log(`📡 Fetching ${sheetName} as JSON via proxy...`);
        
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        const cols = json.table.cols.map(c => c.label || '');
        const rows = json.table.rows;
        
        return rows.map(row => {
            const obj = {};
            row.c.forEach((cell, index) => {
                if (cell && cell.v !== null) {
                    const colName = cols[index] || `col${index}`;
                    obj[colName] = cell.v;
                }
            });
            return obj;
        }).filter(row => Object.keys(row).length > 0);
    } catch (e) {
        console.warn(`Failed to load ${sheetName} as JSON:`, e);
        return [];
    }
}

async function fetchSheet(sheetName) {
    // Special handling for Circuit Master - use CSV format
    if (sheetName === 'Circuit Master') {
        console.log('🔧 Using CSV fetch for Circuit Master');
        return await fetchSheetAsCSV(sheetName);
    }
    
    // Try JSON first, fall back to CSV
    console.log(`🔧 Trying JSON for ${sheetName}...`);
    const jsonData = await fetchSheetAsJSON(sheetName);
    if (jsonData && jsonData.length > 0) {
        console.log(`✅ ${sheetName} loaded via JSON (${jsonData.length} rows)`);
        return jsonData;
    }
    
    console.log(`⚠️ JSON fetch returned no data for ${sheetName}, trying CSV...`);
    return await fetchSheetAsCSV(sheetName);
}

function getFlagEmoji(country) {
    const flags = {
        'British': '🇬🇧',
        'American': '🇺🇸',
        'French': '🇫🇷',
        'Serbian': '🇷🇸',
        'Serbia': '🇷🇸',
        'Dutch': '🇳🇱',
        'German': '🇩🇪',
        'Italian': '🇮🇹',
        'Spanish': '🇪🇸',
        'Finnish': '🇫🇮',
        'Australian': '🇦🇺',
        'Canadian': '🇨🇦',
        'Japanese': '🇯🇵',
        'Mexican': '🇲🇽',
        'Brazilian': '🇧🇷',
        'New Zealander': '🇳🇿',
        'Irish': '🇮🇪',
        'Belgian': '🇧🇪',
        'Austrian': '🇦🇹',
        'Swiss': '🇨🇭',
        'Swedish': '🇸🇪',
        'Danish': '🇩🇰',
        'Polish': '🇵🇱',
        'Hungarian': '🇭🇺',
        'Portuguese': '🇵🇹'
    };
    return flags[country] || '🏁';
}

async function loadAllData() {
    console.log('🚀 Loading PL21 data...');

    // Fetch all sheets
    const [
        driverMaster,
        driverMovement,
        teamMaster,
        circuitMaster,
        calendarRaw,
        raceResults,
        qualiResults,
        sprintResults,
        news
    ] = await Promise.all([
        fetchSheet('Driver Master'),
        fetchSheet('Driver Movement'),
        fetchSheet('Team Master'),
        fetchSheet('Circuit Master'),
        fetchSheet('Calendar'),
        fetchSheet('Race Results'),
        fetchSheet('Quali Results'),
        fetchSheet('Sprint Results'),
        fetchSheet('News')
    ]);

    console.log('📊 Sheets loaded:', {
        driverMaster: driverMaster.length,
        driverMovement: driverMovement.length,
        teamMaster: teamMaster.length,
        circuitMaster: circuitMaster.length,
        calendar: calendarRaw.length,
        raceResults: raceResults.length,
        qualiResults: qualiResults.length,
        sprintResults: sprintResults.length,
        news: news.length
    });

    // Log the raw news data
    console.log('📰 RAW NEWS DATA:');
    news.forEach((row, index) => {
        console.log(`Row ${index}:`, row);
    });

    // Log results data for debugging
    console.log('🏁 RAW RACE RESULTS:', raceResults);
    console.log('🏁 RAW QUALI RESULTS:', qualiResults);
    console.log('🏁 RAW SPRINT RESULTS:', sprintResults);

    // Log Circuit Master data for debugging
    console.log('🏁 CIRCUIT MASTER RAW DATA:');
    if (circuitMaster.length > 0) {
        console.log('Total circuit rows:', circuitMaster.length);
        console.log('First circuit row keys:', Object.keys(circuitMaster[0]));
        console.log('First circuit row values:', circuitMaster[0]);
        if (circuitMaster.length > 1) {
            console.log('Second circuit row:', circuitMaster[1]);
        }
        if (circuitMaster.length > 2) {
            console.log('Third circuit row:', circuitMaster[2]);
        }
    } else {
        console.log('❌ No Circuit Master data found!');
    }

    // ========== PROCESS TEAMS ==========
    const teamMap = {};
    teamMaster.forEach((team, index) => {
        // Get team name from various possible column names
        const teamName = team['Team Name'] || team['Team'] || team['col0'] || '';
        
        // Skip empty rows
        if (!teamName) return;
        
        // Skip header row (if it contains words like "Team", "Name", etc.)
        if (teamName.toLowerCase().includes('team') && 
            teamName.toLowerCase().includes('name') &&
            index === 0) {
            console.log('🏁 Skipping header row:', teamName);
            return;
        }
        
        // Also skip if it's clearly a header (like "Team Name" or "Team")
        if (teamName === 'Team Name' || teamName === 'Team' || teamName === 'Name') {
            console.log('🏁 Skipping header row:', teamName);
            return;
        }
        
        // Skip if it contains "Round" (sometimes appears in team sheets)
        if (teamName.toLowerCase().includes('round')) {
            console.log('🏁 Skipping round row:', teamName);
            return;
        }
        
        // Get car image from column F - try multiple possible column names
        // Column F is typically col5 (0-indexed, so A=0, B=1, C=2, D=3, E=4, F=5)
        const carImage = team['Car Image'] || 
                         team['Car_Image'] || 
                         team['carImage'] || 
                         team['col5'] ||  // Column F
                         team['Photo'] || 
                         team['photo'] || 
                         '';
        
        if (carImage) {
            console.log(`🏁 Team ${teamName} car image found:`, carImage.substring(0, 50) + '...');
        } else {
            console.log(`🏁 Team ${teamName} has no car image`);
        }
        
        teamMap[teamName] = {
            id: teamName.toLowerCase().replace(/\s+/g, ''),
            name: teamName,
            primaryColor: team['Primary Color'] || team['Primary'] || team['col1'] || '#860000',
            secondaryColor: team['Secondary Color'] || team['Secondary'] || team['col2'] || '#000000',
            owner: team['Team Owner'] || team['Owner'] || team['col3'] || 'TBA',
            engineer: team['Engineer'] || team['col4'] || '',
            carImage: carImage, // Add car image here
            drivers: [],
            // Per-round stats will be calculated later
            roundPoints: {},
            roundWins: {},
            roundPodiums: {},
            roundPoles: {},
            roundFastestLaps: {},
            totalPoints: 0,
            totalWins: 0,
            totalPodiums: 0,
            totalPoles: 0,
            totalFastestLaps: 0
        };
    });
    console.log('🏁 Teams loaded:', Object.keys(teamMap));
    console.log('🏁 Teams with car images:', Object.values(teamMap).filter(t => t.carImage).map(t => t.name));

    // ========== PROCESS DRIVER MOVEMENT ==========
    const driverTeamMap = {};
    driverMovement.forEach(row => {
        const driver = row['Driver'] || row['col0'];
        if (!driver) return;
        
        driverTeamMap[driver] = {
            round1: row['Round 1'] || row['col1'] || '',
            round2: row['Round 2'] || row['col2'] || '',
            round3: row['Round 3'] || row['col3'] || '',
            round4: row['Round 4'] || row['col4'] || '',
            round5: row['Round 5'] || row['col5'] || '',
            round6: row['Round 6'] || row['col6'] || '',
            round7: row['Round 7'] || row['col7'] || '',
            round8: row['Round 8'] || row['col8'] || '',
            round9: row['Round 9'] || row['col9'] || '',
            round10: row['Round 10'] || row['col10'] || '',
            round11: row['Round 11'] || row['col11'] || '',
            round12: row['Round 12'] || row['col12'] || ''
        };
    });
    console.log('🏁 Driver movement loaded:', Object.keys(driverTeamMap));

    // ========== PROCESS DRIVERS ==========
    const drivers = driverMaster.map(driver => {
        const driverName = driver['Driver'] || driver['col0'];
        const movement = driverTeamMap[driverName] || {};
        
        // Find the most recent team assignment (check rounds in reverse order)
        let mostRecentTeam = '';
        for (let round = 12; round >= 1; round--) {
            const roundKey = `round${round}`;
            if (movement[roundKey] && movement[roundKey] !== '') {
                mostRecentTeam = movement[roundKey];
                break;
            }
        }
        
        // If no recent team found, use round1 as fallback
        const team = mostRecentTeam || movement.round1 || '';
        
        const nationality = driver['Nationality'] || driver['col3'] || 'Unknown';
        
        // Get driver photo from column E (col4)
        const driverPhoto = driver['Photo'] || driver['photo'] || driver['col4'] || '';
        
        return {
            id: driverName?.toLowerCase().replace(/\s+/g, ''),
            name: driverName || 'Unknown',
            short: driver['Shortened'] || driver['col1'] || '',
            discord: driver['Discord'] || driver['col2'] || '',
            nationality: nationality,
            flag: getFlagEmoji(nationality),
            photo: driverPhoto,
            number: driver['Number'] || driver['col5'] || '0',
            experience: driver['Experience'] || driver['col6'] || '',
            movement: movement,
            currentTeam: team, // This is now the most recent team
            teamColor: teamMap[team]?.primaryColor || '#860000',
            stats: { wins: 0, podiums: 0, poles: 0, points: 0 },
            // Per-round team assignment
            getTeamForRound: (round) => {
                const roundKey = `round${round}`;
                return movement[roundKey] || team; // Fallback to most recent team if not specified
            }
        };
    });
    console.log('🏎️ Drivers loaded:', drivers.map(d => `${d.name} (${d.currentTeam})`));

    // Assign drivers to teams (using most recent team)
    drivers.forEach(driver => {
        const team = teamMap[driver.currentTeam];
        if (team) {
            team.drivers.push(driver);
        }
    });

    // ========== PROCESS CIRCUITS ==========
    console.log('🏁 Processing Circuit Master...');
    console.log('🏁 Total circuit rows to process:', circuitMaster.length);

    // Helper function to find a value from an object using multiple possible keys
    function findValue(obj, possibleKeys) {
        for (const key of possibleKeys) {
            if (obj[key] !== undefined && obj[key] !== '') {
                return obj[key];
            }
        }
        return '';
    }

    const circuits = circuitMaster.map((circuit, index) => {
        // Skip completely empty rows
        if (!circuit || Object.keys(circuit).length === 0) {
            console.log(`🏁 Skipping empty circuit row ${index}`);
            return null;
        }
        
        // Log each circuit's data for debugging (first 5 only)
        if (index < 5) {
            console.log(`🏁 Circuit ${index} raw data:`, circuit);
            console.log(`🏁 Circuit ${index} keys:`, Object.keys(circuit));
        }
        
        // Get all available keys
        const keys = Object.keys(circuit);
        
        // Try to find the correct column names dynamically
        // Race Name - try various possible column names
        const raceName = findValue(circuit, [
            'Race Name',
            'RaceName',
            'race name',
            'race_name',
            'Race',
            'race',
            keys.find(k => k.toLowerCase().includes('race') && k.toLowerCase().includes('name')),
            keys.find(k => k.toLowerCase().includes('race')),
            'col0'
        ]);
        
        // Location
        const location = findValue(circuit, [
            'Location',
            'location',
            'Loc',
            'loc',
            keys.find(k => k.toLowerCase().includes('location')),
            keys.find(k => k.toLowerCase().includes('loc')),
            'col1'
        ]);
        
        // Length
        const length = findValue(circuit, [
            'Length',
            'length',
            'Track Length',
            'track length',
            keys.find(k => k.toLowerCase().includes('length')),
            'col2'
        ]);
        
        // Record
        const record = findValue(circuit, [
            'Record',
            'record',
            'Lap Record',
            'lap record',
            keys.find(k => k.toLowerCase().includes('record')),
            'col3'
        ]);
        
        // Description
        const description = findValue(circuit, [
            'Description',
            'description',
            'Desc',
            'desc',
            keys.find(k => k.toLowerCase().includes('description')),
            keys.find(k => k.toLowerCase().includes('desc')),
            'col4'
        ]);
        
        // Circuit name
        const circuitName = findValue(circuit, [
            'Circuit name',
            'Circuit Name',
            'circuit name',
            'circuit_name',
            'Circuit',
            'circuit',
            'Track',
            'track',
            keys.find(k => k.toLowerCase().includes('circuit')),
            keys.find(k => k.toLowerCase().includes('track')),
            'col5'
        ]);
        
        // Picture
        const picture = findValue(circuit, [
            'Picture',
            'picture',
            'Photo',
            'photo',
            'Image',
            'image',
            keys.find(k => k.toLowerCase().includes('picture')),
            keys.find(k => k.toLowerCase().includes('photo')),
            keys.find(k => k.toLowerCase().includes('image')),
            'col6'
        ]);
        
        // Coordinates
        const coordinates = findValue(circuit, [
            'Coordinates',
            'coordinates',
            'Coord',
            'coord',
            'Lat/Long',
            'lat/long',
            'LatLng',
            'latlng',
            keys.find(k => k.toLowerCase().includes('coord')),
            keys.find(k => k.toLowerCase().includes('lat')),
            keys.find(k => k.toLowerCase().includes('long')),
            'col7'
        ]);
        
        // Skip header row or empty race names
        if (!raceName || 
            raceName.toString().toLowerCase().includes('race name') || 
            raceName.toString().toLowerCase() === 'race') {
            if (index === 0) {
                console.log(`🏁 Skipping header row: ${raceName}`);
            }
            return null;
        }
        
        const circuitObj = {
            id: raceName.toString().toLowerCase().replace(/\s+/g, '-'),
            raceName: raceName.toString(),
            location: location.toString() || 'TBD',
            length: length.toString() || 'TBD',
            record: record.toString() || '',
            description: description.toString() || '',
            circuitName: circuitName.toString() || raceName.toString(),
            picture: picture.toString() || '',
            coordinates: coordinates.toString() || ''
        };
        
        if (index < 5) {
            console.log(`🏁 Processed circuit ${index}:`, circuitObj);
        }
        
        return circuitObj;
    }).filter(c => c !== null);

    console.log('🏁 Processed circuits:', circuits.length);
    console.log('🏁 Circuits with coordinates:', circuits.filter(c => c.coordinates).length);
    console.log('🏁 First processed circuit:', circuits[0]);
    if (circuits.length > 1) console.log('🏁 Second processed circuit:', circuits[1]);

    // ========== PROCESS CALENDAR ==========
    console.log('📅 Processing calendar data...');
    console.log('📅 RAW CALENDAR DATA:', calendarRaw);
    console.log('📅 Calendar rows count:', calendarRaw.length);

    const calendar = [];

    if (calendarRaw.length >= 3) {
        // Row 0 contains race names and dates
        const raceNamesRow = calendarRaw[0];
        // Row 1 contains laps
        const lapsRow = calendarRaw[1];
        
        console.log('📅 Race names row:', raceNamesRow);
        console.log('📅 Laps row:', lapsRow);
        
        // Get all the race keys (excluding 'Round Date' which is the first column)
        const raceKeys = Object.keys(raceNamesRow).filter(key => key !== 'Round Date' && key !== 'col0');
        console.log('📅 Race keys found:', raceKeys);
        
        raceKeys.forEach((key, index) => {
            // The key is something like "Australia Grand Prix Round 1 8th March"
            const raceInfo = key;
            
            // Parse the race name and date from the key
            let raceName = raceInfo;
            let dateStr = 'TBD';
            
            // Try to extract round number if present
            const roundMatch = raceInfo.match(/Round (\d+)/i);
            let roundNum = index + 1;
            if (roundMatch) {
                roundNum = parseInt(roundMatch[1]);
            }
            
            // Extract the date part (everything after "Round X")
            const dateMatch = raceInfo.match(/Round \d+\s+(.+)$/i);
            if (dateMatch) {
                dateStr = dateMatch[1].trim(); // This gives us "8th March", "15th March", etc.
                // Remove the date part from the race name
                raceName = raceInfo.replace(/Round \d+\s+.+$/, '').trim();
            } else {
                // If no round pattern, just use the whole thing as race name
                raceName = raceInfo;
            }
            
            // Get the time from the Date() value
            const dateValue = raceNamesRow[key];
            let timeStr = '19:00';
            
            // Parse the time from the Date() format
            if (typeof dateValue === 'string' && dateValue.startsWith('Date(')) {
                const matches = dateValue.match(/Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
                if (matches) {
                    const [_, year, month, day, hour, minute, second] = matches;
                    timeStr = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
                }
            }
            
            // Get laps
            const laps = lapsRow?.[key] || 'TBD';
            
            // Find matching circuit from circuit master - try multiple matching strategies
            let circuit = circuits.find(c => 
                c.raceName && c.raceName.toLowerCase().includes(raceName.toLowerCase().replace(' grand prix', ''))
            );
            
            // If not found, try exact match
            if (!circuit) {
                circuit = circuits.find(c => 
                    c.raceName && c.raceName.toLowerCase() === raceName.toLowerCase()
                );
            }
            
            // If still not found, try partial match
            if (!circuit) {
                circuit = circuits.find(c => 
                    c.raceName && raceName.toLowerCase().includes(c.raceName.toLowerCase().replace(' grand prix', ''))
                );
            }
            
            // If still not found, try matching by circuit name
            if (!circuit) {
                circuit = circuits.find(c => 
                    c.circuitName && raceName.toLowerCase().includes(c.circuitName.toLowerCase())
                );
            }
            
            circuit = circuit || {};
            
            // Determine status based on current date (you may want to implement actual logic)
            let status = 'upcoming';
            
            calendar.push({
                round: roundNum,
                name: raceName,
                circuit: circuit.circuitName || raceName,
                location: circuit.location || 'TBD',
                date: dateStr,
                time: timeStr,
                laps: laps,
                circuitInfo: circuit,
                coordinates: circuit.coordinates || '',
                status: status
            });
            
            console.log(`📅 Added race ${roundNum}: ${raceName} - Circuit: ${circuit.circuitName || 'Not found'} - Coordinates: ${circuit.coordinates || 'none'}`);
        });
    }

    // Sort by round number
    calendar.sort((a, b) => a.round - b.round);
    console.log('📅 Final calendar:', calendar.map(r => ({
        round: r.round,
        name: r.name,
        circuit: r.circuit,
        hasCoords: !!r.coordinates
    })));
    console.log('📅 Calendar length:', calendar.length);

    // ========== PROCESS SPRINT INFORMATION FROM SPRINT RESULTS SHEET HEADER ==========
    console.log('🏁 Processing sprint information from Sprint Results sheet header...');

    // Create a map of which rounds have sprints based on which round columns exist in the header
    const sprintRoundsMap = {};

    if (sprintResults && sprintResults.length > 0) {
        // The FIRST ROW (index 0) contains the header with round columns
        const headerRow = sprintResults[0];
        console.log('🏁 Sprint Results HEADER row:', headerRow);
        
        // Check each column in the header row to see which round columns exist
        Object.keys(headerRow).forEach(key => {
            // Skip the first column which is "Round" (driver names column)
            if (key === 'col0') return;
            
            const value = headerRow[key];
            
            // If the column has a header value like "Round 1", "Round 6", etc.
            if (value && value.toString().trim() !== '') {
                // Extract the round number from the header text
                const headerText = value.toString();
                const roundMatch = headerText.match(/Round\s+(\d+)/i);
                
                if (roundMatch) {
                    const roundNum = parseInt(roundMatch[1]);
                    console.log(`🏁 Found sprint column: ${headerText} -> Round ${roundNum}`);
                    sprintRoundsMap[roundNum] = true;
                }
            }
        });
    }

    console.log('🏁 Final sprint rounds map (rounds with sprint columns):', sprintRoundsMap);

    // ========== PROCESS RESULTS ==========
    console.log('🏁 Processing race results...');

    const results = calendar.map(race => {
        // Use col1 for round 1, col2 for round 2, etc.
        const roundCol = `col${race.round}`;
        
        // Determine if this round has a sprint based on the Sprint Results sheet header
        const hasSprint = sprintRoundsMap[race.round] === true;
        
        console.log(`🏁 Processing round ${race.round}: ${race.name} - Has sprint from header: ${hasSprint}`);
        
        const getRoundResults = (sheet, sheetName, isSprint = false) => {
            const roundResults = [];
            
            if (!sheet || sheet.length === 0) {
                return roundResults;
            }
            
            // Skip header row (index 0)
            for (let i = 1; i < sheet.length; i++) {
                const row = sheet[i];
                const driverName = row['col0'] || row['Driver'] || '';
                if (!driverName) continue;
                
                // Get position from the round column (col1 for round 1, col2 for round 2, etc.)
                const position = row[roundCol];
                
                // Skip if no position
                if (!position || position === '') continue;
                
                const driver = drivers.find(d => d.name === driverName);
                if (!driver) {
                    console.log(`⚠️ Driver not found: ${driverName}`);
                    continue;
                }
                
                // Get the team for this specific round from driver movement
                const teamForRound = driver.getTeamForRound(race.round);
                
                console.log(`🏁 ${driverName} in ${sheetName} round ${race.round}: ${position} (driving for ${teamForRound})`);
                
                // Parse position - check for fastest lap indicator
                let positionStr = position.toString();
                let hasFastestLap = false;
                let positionNumber = null;
                
                // Check if it contains "Fastest Lap" text
                if (positionStr.includes('Fastest Lap') || positionStr.includes('fastest lap') || positionStr.includes('FL')) {
                    hasFastestLap = true;
                    // Remove the fastest lap text to get the position
                    positionStr = positionStr.replace(/Fastest Lap|fastest lap|\(Fastest Lap\)|\[Fastest Lap\]|FL/gi, '').trim();
                    console.log(`🏁 ${driverName} has fastest lap! Cleaned position: "${positionStr}"`);
                }
                
                // Parse position - handle "P1", "P2" format
                if (typeof positionStr === 'string') {
                    const pMatch = positionStr.match(/^P(\d+)$/i);
                    if (pMatch) {
                        positionNumber = parseInt(pMatch[1]);
                    } else {
                        positionNumber = parseInt(positionStr);
                        if (isNaN(positionNumber)) positionNumber = null;
                    }
                } else if (typeof positionStr === 'number') {
                    positionNumber = positionStr;
                }
                
                // Calculate points based on session type
                let points = 0;
                
                if (isSprint) {
                    // F1 Sprint points: 8 for 1st, 7 for 2nd, 6 for 3rd, 5 for 4th, 4 for 5th, 3 for 6th, 2 for 7th, 1 for 8th
                    if (positionNumber && positionNumber <= 8) {
                        const sprintPointsSystem = [8, 7, 6, 5, 4, 3, 2, 1];
                        points = sprintPointsSystem[positionNumber - 1];
                        console.log(`🏁 ${driverName} gets ${points} sprint points for P${positionNumber}`);
                    }
                    // No fastest lap point in sprints
                } else {
                    // Race points (top 10 only)
                    if (positionNumber && positionNumber <= 10) {
                        const racePointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
                        points = racePointsSystem[positionNumber - 1];
                        
                        // Add 1 point for fastest lap (only if driver finished in top 10)
                        if (hasFastestLap) {
                            points += 1;
                            console.log(`🏁 ${driverName} gets +1 point for fastest lap, total points: ${points}`);
                        }
                    } else if (hasFastestLap) {
                        // If driver had fastest lap but finished outside top 10, they still get 1 point
                        points = 1;
                        console.log(`🏁 ${driverName} gets 1 point for fastest lap (outside top 10)`);
                    }
                }
                
                roundResults.push({
                    driver: driverName,
                    number: driver.number || '0',
                    team: teamForRound,
                    teamColor: teamMap[teamForRound]?.primaryColor || '#860000',
                    position: positionNumber,
                    positionNumber: positionNumber,
                    points: points,
                    hasFastestLap: hasFastestLap,
                    rawPosition: position,
                    round: race.round
                });
            }
            
            return roundResults.sort((a, b) => {
                if (a.positionNumber && b.positionNumber) {
                    return a.positionNumber - b.positionNumber;
                }
                return 0;
            });
        };

        // Process sprint results only if the race has a sprint
        let sprintResultsForRound = [];
        if (hasSprint) {
            sprintResultsForRound = getRoundResults(sprintResults, 'Sprint Results', true);
            console.log(`🏁 Round ${race.round} HAS SPRINT - found ${sprintResultsForRound.length} sprint results`);
        } else {
            console.log(`🏁 Round ${race.round} has NO SPRINT`);
        }

        return {
            round: race.round,
            name: race.name,
            date: race.date,
            circuit: race.circuit,
            classification: getRoundResults(raceResults, 'Race Results', false),
            qualifying: getRoundResults(qualiResults, 'Quali Results', false),
            sprint: sprintResultsForRound,
            hasSprint: hasSprint  // Use the value from sprint rounds map
        };
    });

    console.log('🏁 Processed results - Sprint summary:', results.map(r => ({
        round: r.round,
        name: r.name,
        hasSprint: r.hasSprint,
        sprintCount: r.sprint.length,
        sprintPoints: r.sprint.map(s => `${s.driver}: ${s.points}`)
    })));

    // ========== CALCULATE STANDINGS ==========
    console.log('📊 Calculating standings with per-round team assignments...');

    // Initialize team round stats
    Object.values(teamMap).forEach(team => {
        team.roundPoints = {};
        team.roundWins = {};
        team.roundPodiums = {};
        team.roundPoles = {};
        team.roundFastestLaps = {};
    });

    // Process each round
    results.forEach(race => {
        const round = race.round;
        console.log(`📊 Processing round ${round} for constructor standings`);
        
        // Process race results for constructor points
        race.classification.forEach(result => {
            const teamName = result.team;
            const team = teamMap[teamName];
            
            if (!team) {
                console.log(`⚠️ Team not found: ${teamName} for driver ${result.driver} in round ${round}`);
                return;
            }
            
            // Initialize round stats for this team if not exists
            if (!team.roundPoints[round]) team.roundPoints[round] = 0;
            if (!team.roundWins[round]) team.roundWins[round] = 0;
            if (!team.roundPodiums[round]) team.roundPodiums[round] = 0;
            if (!team.roundFastestLaps[round]) team.roundFastestLaps[round] = 0;
            
            // Add points
            team.roundPoints[round] += result.points || 0;
            
            // Count wins
            if (result.positionNumber === 1) {
                team.roundWins[round] += 1;
            }
            
            // Count podiums
            if (result.positionNumber && result.positionNumber <= 3) {
                team.roundPodiums[round] += 1;
            }
            
            // Count fastest laps
            if (result.hasFastestLap) {
                team.roundFastestLaps[round] += 1;
            }
            
            console.log(`📊 Team ${teamName} gets ${result.points} points in round ${round} (total: ${team.roundPoints[round]})`);
        });
        
        // Process sprint results for constructor points
        if (race.hasSprint) {
            race.sprint.forEach(result => {
                const teamName = result.team;
                const team = teamMap[teamName];
                
                if (!team) return;
                
                // Initialize round stats for this team if not exists
                if (!team.roundPoints[round]) team.roundPoints[round] = 0;
                
                // Add sprint points
                team.roundPoints[round] += result.points || 0;
                console.log(`📊 Team ${teamName} gets ${result.points} sprint points in round ${round} (total: ${team.roundPoints[round]})`);
            });
        }
        
        // Process qualifying results for poles
        race.qualifying.forEach(result => {
            const teamName = result.team;
            const team = teamMap[teamName];
            
            if (!team) return;
            
            if (!team.roundPoles[round]) team.roundPoles[round] = 0;
            
            if (result.positionNumber === 1) {
                team.roundPoles[round] += 1;
            }
        });
    });

    // Calculate total stats for each team
    Object.values(teamMap).forEach(team => {
        team.totalPoints = Object.values(team.roundPoints).reduce((sum, points) => sum + points, 0);
        team.totalWins = Object.values(team.roundWins).reduce((sum, wins) => sum + wins, 0);
        team.totalPodiums = Object.values(team.roundPodiums).reduce((sum, podiums) => sum + podiums, 0);
        team.totalPoles = Object.values(team.roundPoles).reduce((sum, poles) => sum + poles, 0);
        team.totalFastestLaps = Object.values(team.roundFastestLaps).reduce((sum, fl) => sum + fl, 0);
    });

    // Calculate driver standings - using most recent team for display
    const driverStandings = drivers.map(driver => {
        let points = 0, wins = 0, podiums = 0, poles = 0, fastestLaps = 0;
        
        results.forEach(race => {
            // Race results
            const raceResult = race.classification.find(r => r.driver === driver.name);
            if (raceResult) {
                points += raceResult.points || 0;
                if (raceResult.positionNumber === 1) wins++;
                if (raceResult.positionNumber && raceResult.positionNumber <= 3) podiums++;
                if (raceResult.hasFastestLap) fastestLaps++;
            }
            
            // Qualifying results (for poles)
            const qualiResult = race.qualifying.find(r => r.driver === driver.name);
            if (qualiResult && qualiResult.positionNumber === 1) {
                poles++;
            }
            
            // Sprint results (if applicable)
            if (race.hasSprint) {
                const sprintResult = race.sprint.find(r => r.driver === driver.name);
                if (sprintResult) {
                    points += sprintResult.points || 0;
                    // Note: Sprint wins don't count as race wins, so no wins++
                }
            }
        });
        
        // Use the most recent team for display (already set in driver.currentTeam)
        return { 
            ...driver, 
            points, 
            wins, 
            podiums, 
            poles, 
            fastestLaps,
            // Ensure we use the most recent team
            currentTeam: driver.currentTeam,
            teamColor: teamMap[driver.currentTeam]?.primaryColor || '#860000'
        };
    }).sort((a, b) => b.points - a.points)
      .map((driver, index) => ({ ...driver, pos: index + 1 }));

    // Create constructor standings array with current driver lineups
    console.log('🏁 Building constructor standings with current driver lineups...');
    console.log('🏁 Total drivers:', drivers.length);
    console.log('🏁 Drivers with currentTeam:', drivers.filter(d => d.currentTeam).map(d => `${d.name} -> ${d.currentTeam}`));

    const constructorStandings = Object.values(teamMap)
        .filter(team => team.totalPoints > 0 || team.drivers.length > 0)
        .map(team => {
            // Get current drivers for this team using the most recent team assignment
            const currentDrivers = drivers.filter(d => d.currentTeam === team.name);
            
            console.log(`🏁 Team ${team.name}:`);
            console.log(`   - Found ${currentDrivers.length} current drivers:`, currentDrivers.map(d => d.name).join(', '));
            console.log(`   - Team.drivers array has ${team.drivers?.length || 0} drivers`);
            
            return {
                ...team,
                points: team.totalPoints,
                wins: team.totalWins,
                podiums: team.totalPodiums,
                poles: team.totalPoles,
                fastestLaps: team.totalFastestLaps,
                // Use the current drivers filtered by most recent team
                drivers: currentDrivers
            };
        })
        .sort((a, b) => b.points - a.points)
        .map((team, index) => ({ ...team, pos: index + 1 }));

    console.log('📊 Driver standings:', driverStandings.map(d => ({ name: d.name, points: d.points, team: d.currentTeam })));
    console.log('📊 Constructor standings:', constructorStandings.map(c => ({ 
        name: c.name, 
        points: c.points, 
        drivers: c.drivers.map(d => d.name).join(', ')
    })));

    // ========== PROCESS NEWS ==========
    console.log('📰 Processing News Sheet - Total rows:', news.length);

    let homepageTitle = 'PL21 Season';
    let homepageDescription = 'The season is underway!';
    let dotdDriver = null;
    let transferWindowStatus = 'Closed';
    const newsItems = [];

    if (news && news.length > 0) {
        console.log('📰 News sheet has', news.length, 'rows');
        
        // Second row (index 1) contains homepage metadata
        if (news.length >= 2) {
            const metadataRow = news[1]; // Row 2 (index 1)
            console.log('📰 METADATA ROW (row 2):', metadataRow);
            console.log('📰 col0 (A) value:', metadataRow['col0']);
            console.log('📰 col2 (C) value:', metadataRow['col2']);
            console.log('📰 col3 (D) value:', metadataRow['col3']);
            console.log('📰 col4 (E) value:', metadataRow['col4']);
            
            homepageTitle = metadataRow['col3'] || metadataRow['Homepage Title'] || 'PL21 Season';
            homepageDescription = metadataRow['col4'] || metadataRow['Homepage Description'] || 'The season is underway!';
            
            // Get DOTD driver from column A (col0)
            const dotdDriverName = metadataRow['col0'] || '';
            console.log('📰 DOTD Driver Name from sheet:', dotdDriverName);
            
            if (dotdDriverName) {
                console.log('📰 Looking for driver match in database...');
                console.log('📰 Available drivers:', drivers.map(d => d.name));
                
                // Try to find exact match first
                dotdDriver = drivers.find(d => 
                    d.name.toLowerCase() === dotdDriverName.toLowerCase()
                );
                
                // If no exact match, try partial match
                if (!dotdDriver) {
                    console.log('📰 No exact match, trying partial match...');
                    dotdDriver = drivers.find(d => 
                        d.name.toLowerCase().includes(dotdDriverName.toLowerCase()) ||
                        dotdDriverName.toLowerCase().includes(d.name.toLowerCase())
                    );
                }
                
                if (dotdDriver) {
                    console.log('✅ DOTD Driver found:', dotdDriver);
                } else {
                    console.log('❌ No driver match found for:', dotdDriverName);
                    // Create placeholder
                    dotdDriver = { 
                        name: dotdDriverName, 
                        number: '0', 
                        currentTeam: 'Unknown',
                        teamColor: '#860000',
                        short: dotdDriverName.substring(0, 3).toUpperCase()
                    };
                }
            } else {
                console.log('📰 No DOTD driver name in col0');
            }
            
            // Get transfer window status from column C (col2)
            transferWindowStatus = metadataRow['col2'] || 'Closed';
            console.log('📰 Transfer Window Status:', transferWindowStatus);
        } else {
            console.log('📰 Not enough rows for metadata (need at least 2, have', news.length, ')');
        }
        
        // Remaining rows starting from row 3 (index 2) are actual news items
        console.log('📰 Processing news items from row 3 onward...');
        for (let i = 2; i < news.length; i++) {
            const item = news[i];
            console.log(`📰 News row ${i+1}:`, item);
            if (item && Object.keys(item).length > 0) {
                newsItems.push({
                    title: item['col0'] || item['Title'] || 'Latest News',
                    summary: item['col1'] || item['Summary'] || 'Stay tuned',
                    link: item['col2'] || item['Link'] || '#',
                    category: 'News'
                });
            }
        }
        
        console.log('📰 News items found:', newsItems.length);
        
        // If there are no news items beyond row 2, create placeholder
        if (newsItems.length === 0) {
            console.log('📰 No news items found, creating placeholder');
            newsItems.push({
                title: 'Latest News',
                summary: 'Stay tuned for updates from the PL21 season.',
                link: '#',
                category: 'News'
            });
        }
    } else {
        console.log('📰 No news data available');
    }

    console.log('📰 FINAL VALUES:');
    console.log('📰 Homepage Title:', homepageTitle);
    console.log('📰 Homepage Description:', homepageDescription);
    console.log('📰 DOTD Driver:', dotdDriver);
    console.log('📰 Transfer Window:', transferWindowStatus);
    console.log('📰 News Items:', newsItems);

    // ========== BUILD FINAL DATA ==========
    window.PL21_DATA = {
        // Raw data
        drivers,
        teams: Object.values(teamMap).filter(t => t.drivers.length > 0),
        circuits,
        calendar,
        results,
        news: newsItems,
        
        // Special homepage cards data
        dotd: dotdDriver,
        transferWindow: transferWindowStatus,
        
        // Standings
        standings: {
            drivers: driverStandings,
            constructors: constructorStandings
        },
        
        // Statistics
        statistics: {
            overview: {
                totalRaces: results.filter(r => r.classification.length > 0).length,
                differentWinners: new Set(results.flatMap(r => 
                    r.classification.filter(c => c.positionNumber === 1).map(c => c.driver)
                )).size,
                totalDrivers: drivers.length,
                totalTeams: Object.values(teamMap).length
            }
        },
        
        // Homepage data
        homepage: {
            hero: {
                title: homepageTitle,
                description: homepageDescription,
                featuredDriver: driverStandings[0] ? {
                    ...driverStandings[0],
                    teamColor: teamMap[driverStandings[0].currentTeam]?.primaryColor || '#860000'
                } : {
                    number: '1',
                    name: 'TBD',
                    currentTeam: 'TBD',
                    teamColor: '#860000',
                    wins: 0,
                    points: 0,
                    podiums: 0
                }
            },
            stats: {
                nextRace: {
                    label: 'Next Race',
                    value: calendar.find(r => r.status === 'upcoming')?.name || calendar[0]?.name || 'TBD',
                    detail: calendar.find(r => r.status === 'upcoming') ? 
                        `${calendar.find(r => r.status === 'upcoming').date} · ${calendar.find(r => r.status === 'upcoming').time}` : 
                        calendar[0] ? `${calendar[0].date} · ${calendar[0].time}` : 'TBD'
                },
                leader: {
                    label: 'Championship Leader',
                    value: driverStandings[0]?.short || driverStandings[0]?.name?.split(' ')[1] || 'TBD',
                    detail: `${driverStandings[0]?.points || 0} pts`
                },
                constructor: {
                    label: "Constructor's",
                    value: constructorStandings[0]?.name || 'TBD',
                    detail: `${constructorStandings[0]?.points || 0} pts`
                },
                progress: {
                    label: 'Season Progress',
                    value: `${results.filter(r => r.classification.length > 0).length}/${calendar.length}`,
                    detail: `${Math.round((results.filter(r => r.classification.length > 0).length / calendar.length) * 100)}% complete`
                }
            },
            news: newsItems.slice(0, 3),
            standings: driverStandings.slice(0, 5).map((d, i) => ({
                pos: i + 1,
                driver: d.name,
                short: d.short,
                team: d.currentTeam,
                teamColor: teamMap[d.currentTeam]?.primaryColor || '#860000',
                points: d.points,
                wins: d.wins
            }))
        }
    };

    console.log('✅ FINAL DATA OBJECT:');
    console.log('✅ Teams with car images:', window.PL21_DATA.teams.filter(t => t.carImage).map(t => t.name));
    console.log('✅ dotd:', window.PL21_DATA.dotd);
    console.log('✅ transferWindow:', window.PL21_DATA.transferWindow);
    console.log('✅ featuredDriver:', window.PL21_DATA.homepage.hero.featuredDriver);
    console.log('✅ Next Race:', window.PL21_DATA.homepage.stats.nextRace);
    console.log('✅ Sprint rounds map:', sprintRoundsMap);
    console.log('✅ Sprint summary:', window.PL21_DATA.results.map(r => ({
        round: r.round,
        name: r.name,
        hasSprint: r.hasSprint,
        sprintCount: r.sprint.length,
        sprintPoints: r.sprint.map(s => `${s.driver}: ${s.points}`)
    })));
    console.log('✅ Circuits loaded:', window.PL21_DATA.circuits.length, 'with', window.PL21_DATA.circuits.filter(c => c.coordinates).length, 'having coordinates');
    console.log('✅ First few circuits:', window.PL21_DATA.circuits.slice(0, 3));
    
    window.dispatchEvent(new CustomEvent('pl21-data-ready', { detail: window.PL21_DATA }));
}

// Auto-load
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAllData);
    } else {
        loadAllData();
    }
}