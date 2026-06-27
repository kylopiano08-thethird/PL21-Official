// js/archive-data-loader.js - Data loader for archive page (PL21)
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
        const url = `/api/sheets?sheet=${encodeURIComponent(sheetName)}&format=csv&season=archive&cb=${cacheBuster}`;
        
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
        const url = `/api/sheets?sheet=${encodeURIComponent(sheetName)}&format=json&season=archive&cb=${cacheBuster}`;
        
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
    const jsonData = await fetchArchiveSheetAsJSON(sheetName);
    if (jsonData && jsonData.length > 0) {
        return jsonData;
    }
    
    console.log(`⚠️ [ARCHIVE] JSON fetch returned no data for ${sheetName}, trying CSV...`);
    return await fetchArchiveSheetAsCSV(sheetName);
}

function getFlagEmoji(country) {
    const flags = {
        'British': '🇬🇧', 'American': '🇺🇸', 'French': '🇫🇷', 'Serbian': '🇷🇸',
        'Serbia': '🇷🇸', 'Dutch': '🇳🇱', 'German': '🇩🇪', 'Italian': '🇮🇹',
        'Spanish': '🇪🇸', 'Finnish': '🇫🇮', 'Australian': '🇦🇺', 'Canadian': '🇨🇦',
        'Japanese': '🇯🇵', 'Mexican': '🇲🇽', 'Brazilian': '🇧🇷', 'New Zealander': '🇳🇿',
        'Irish': '🇮🇪', 'Belgian': '🇧🇪', 'Austrian': '🇦🇹', 'Swiss': '🇨🇭',
        'Swedish': '🇸🇪', 'Danish': '🇩🇰', 'Polish': '🇵🇱', 'Hungarian': '🇭🇺',
        'Portuguese': '🇵🇹'
    };
    return flags[country] || '🏁';
}

async function loadArchiveData() {
    console.log('🚀 [ARCHIVE] Loading PL21 data...');

    try {
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
            fetchArchiveSheet('Driver Master'),
            fetchArchiveSheet('Driver Movement'),
            fetchArchiveSheet('Team Master'),
            fetchArchiveSheet('Circuit Master'),
            fetchArchiveSheet('Calendar'),
            fetchArchiveSheet('Race Results'),
            fetchArchiveSheet('Quali Results'),
            fetchArchiveSheet('Sprint Results'),
            fetchArchiveSheet('News')
        ]);

        console.log('📊 [ARCHIVE] Sheets loaded:', {
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

        if (driverMaster.length === 0) {
            console.error('❌ [ARCHIVE] No driver data found!');
            return createFallbackData();
        }

        // ========== PROCESS TEAMS ==========
        const teamMap = {};
        teamMaster.forEach((team, index) => {
            const teamName = team['Team Name'] || team['Team'] || team['col0'] || '';
            if (!teamName) return;
            
            if (teamName.toLowerCase().includes('team') && teamName.toLowerCase().includes('name') && index === 0) return;
            if (teamName === 'Team Name' || teamName === 'Team' || teamName === 'Name') return;
            if (teamName.toLowerCase().includes('round')) return;
            
            const carImage = team['Car Image'] || team['Car_Image'] || team['carImage'] || team['col5'] || '';
            
            teamMap[teamName] = {
                id: teamName.toLowerCase().replace(/\s+/g, ''),
                name: teamName,
                primaryColor: team['Primary Color'] || team['Primary'] || team['col1'] || '#860000',
                secondaryColor: team['Secondary Color'] || team['Secondary'] || team['col2'] || '#000000',
                owner: team['Team Owner'] || team['Owner'] || team['col3'] || 'TBA',
                engineer: team['Engineer'] || team['col4'] || '',
                carImage: carImage,
                drivers: [],
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
        console.log('🏁 [ARCHIVE] Teams loaded:', Object.keys(teamMap).length);

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

        // ========== PROCESS DRIVERS ==========
        const drivers = driverMaster.map(driver => {
            const driverName = driver['Driver'] || driver['col0'];
            const movement = driverTeamMap[driverName] || {};
            
            let mostRecentTeam = '';
            for (let round = 12; round >= 1; round--) {
                const roundKey = `round${round}`;
                if (movement[roundKey] && movement[roundKey] !== '') {
                    mostRecentTeam = movement[roundKey];
                    break;
                }
            }
            
            const team = mostRecentTeam || movement.round1 || '';
            const nationality = driver['Nationality'] || driver['col3'] || 'Unknown';
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
                currentTeam: team,
                teamColor: teamMap[team]?.primaryColor || '#860000',
                stats: { wins: 0, podiums: 0, poles: 0, points: 0 },
                getTeamForRound: (round) => {
                    const roundKey = `round${round}`;
                    return movement[roundKey] || team;
                }
            };
        });

        drivers.forEach(driver => {
            const team = teamMap[driver.currentTeam];
            if (team) {
                team.drivers.push(driver);
            }
        });

        // ========== PROCESS CIRCUITS ==========
        function findValue(obj, possibleKeys) {
            for (const key of possibleKeys) {
                if (obj[key] !== undefined && obj[key] !== '') {
                    return obj[key];
                }
            }
            return '';
        }

        const circuits = circuitMaster.map((circuit, index) => {
            if (!circuit || Object.keys(circuit).length === 0) {
                return null;
            }
            
            const keys = Object.keys(circuit);
            
            const raceName = findValue(circuit, [
                'Race Name', 'RaceName', 'race name', 'race_name', 'Race', 'race',
                keys.find(k => k.toLowerCase().includes('race') && k.toLowerCase().includes('name')),
                keys.find(k => k.toLowerCase().includes('race')), 'col0'
            ]);
            
            const location = findValue(circuit, [
                'Location', 'location', 'Loc', 'loc',
                keys.find(k => k.toLowerCase().includes('location')),
                keys.find(k => k.toLowerCase().includes('loc')), 'col1'
            ]);
            
            const length = findValue(circuit, [
                'Length', 'length', 'Track Length', 'track length',
                keys.find(k => k.toLowerCase().includes('length')), 'col2'
            ]);
            
            const record = findValue(circuit, [
                'Record', 'record', 'Lap Record', 'lap record',
                keys.find(k => k.toLowerCase().includes('record')), 'col3'
            ]);
            
            const description = findValue(circuit, [
                'Description', 'description', 'Desc', 'desc',
                keys.find(k => k.toLowerCase().includes('description')),
                keys.find(k => k.toLowerCase().includes('desc')), 'col4'
            ]);
            
            const circuitName = findValue(circuit, [
                'Circuit name', 'Circuit Name', 'circuit name', 'circuit_name',
                'Circuit', 'circuit', 'Track', 'track',
                keys.find(k => k.toLowerCase().includes('circuit')),
                keys.find(k => k.toLowerCase().includes('track')), 'col5'
            ]);
            
            const picture = findValue(circuit, [
                'Picture', 'picture', 'Photo', 'photo', 'Image', 'image',
                keys.find(k => k.toLowerCase().includes('picture')),
                keys.find(k => k.toLowerCase().includes('photo')),
                keys.find(k => k.toLowerCase().includes('image')), 'col6'
            ]);
            
            const coordinates = findValue(circuit, [
                'Coordinates', 'coordinates', 'Coord', 'coord', 'Lat/Long', 'lat/long',
                'LatLng', 'latlng',
                keys.find(k => k.toLowerCase().includes('coord')),
                keys.find(k => k.toLowerCase().includes('lat')),
                keys.find(k => k.toLowerCase().includes('long')), 'col7'
            ]);
            
            if (!raceName || raceName.toString().toLowerCase().includes('race name') || raceName.toString().toLowerCase() === 'race') {
                if (index === 0) {
                    console.log(`🏁 Skipping header row: ${raceName}`);
                }
                return null;
            }
            
            return {
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
        }).filter(c => c !== null);

        // ========== PROCESS CALENDAR ==========
        console.log('📅 Processing calendar data...');
        console.log('📅 RAW CALENDAR DATA:', calendarRaw);
        console.log('📅 Calendar rows count:', calendarRaw.length);

        const calendar = [];

        if (calendarRaw.length >= 5) {
            // Row 0: Race names
            // Row 1: Round labels
            // Row 2: Dates
            // Row 3: Time
            // Row 4: Laps (row 5 in the sheet)
            // Row 5: Sprint indicators (row 6 in the sheet)
            const raceNamesRow = calendarRaw[0];
            const roundLabelsRow = calendarRaw[1];
            const datesRow = calendarRaw[2];
            const timeRow = calendarRaw[3];
            const lapsRow = calendarRaw[4];
            const sprintRow = calendarRaw[5] || {};
            
            console.log('📅 Race names row:', raceNamesRow);
            console.log('📅 Laps row (row 5 / index 4):', lapsRow);
            console.log('📅 Sprint row (row 6 / index 5):', sprintRow);
            
            const raceKeys = Object.keys(raceNamesRow).filter(key => key !== 'Round Date' && key !== 'col0' && key !== '');
            console.log('📅 Race keys found:', raceKeys);
            
            const roundsWithResults = new Set();
            if (raceResults && raceResults.length > 0) {
                for (let roundNum = 1; roundNum <= raceKeys.length; roundNum++) {
                    const roundCol = `col${roundNum}`;
                    const hasResults = raceResults.some(row => {
                        const result = row[roundCol];
                        return result && result.toString().trim() !== '';
                    });
                    if (hasResults) {
                        roundsWithResults.add(roundNum);
                    }
                }
            }
            
            raceKeys.forEach((key, index) => {
                let raceName = key;
                let dateStr = 'TBD';
                let timeStr = '19:00';
                
                const roundMatch = key.match(/Round (\d+)/i);
                let roundNum = index + 1;
                if (roundMatch) {
                    roundNum = parseInt(roundMatch[1]);
                }
                
                const dateMatch = key.match(/Round \d+\s+(.+)$/i);
                if (dateMatch) {
                    dateStr = dateMatch[1].trim();
                    raceName = key.replace(/Round \d+\s+.+$/, '').trim();
                } else {
                    raceName = key;
                }
                
                if (datesRow && datesRow[key] !== undefined && datesRow[key] !== '') {
                    dateStr = datesRow[key];
                }
                
                if (timeRow && timeRow[key] !== undefined && timeRow[key] !== '') {
                    timeStr = timeRow[key];
                }
                
                let laps = 'TBD';
                if (lapsRow && lapsRow[key] !== undefined && lapsRow[key] !== '') {
                    laps = lapsRow[key];
                }
                console.log(`📅 Round ${roundNum} laps:`, laps);
                
                let hasSprint = false;
                if (sprintRow && sprintRow[key] !== undefined && sprintRow[key] !== '') {
                    const sprintValue = sprintRow[key].toString().toLowerCase().trim();
                    if (sprintValue === 'x' || sprintValue === 'true' || sprintValue === 'yes') {
                        hasSprint = true;
                    }
                }
                
                let circuit = circuits.find(c => 
                    c.raceName && c.raceName.toLowerCase().includes(raceName.toLowerCase().replace(' grand prix', ''))
                );
                if (!circuit) {
                    circuit = circuits.find(c => c.raceName && c.raceName.toLowerCase() === raceName.toLowerCase());
                }
                if (!circuit) {
                    circuit = circuits.find(c => c.raceName && raceName.toLowerCase().includes(c.raceName.toLowerCase().replace(' grand prix', '')));
                }
                if (!circuit) {
                    circuit = circuits.find(c => c.circuitName && raceName.toLowerCase().includes(c.circuitName.toLowerCase()));
                }
                circuit = circuit || {};
                
                const status = roundsWithResults.has(roundNum) ? 'completed' : 'upcoming';
                
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
                    status: status,
                    hasSprint: hasSprint
                });
            });
        }

        calendar.sort((a, b) => a.round - b.round);
        console.log('📅 Final calendar:', calendar.map(r => ({
            round: r.round,
            name: r.name,
            laps: r.laps,
            hasSprint: r.hasSprint,
            status: r.status
        })));

        // ========== PROCESS SPRINT INFORMATION ==========
        const sprintRoundsMap = {};
        calendar.forEach(race => {
            if (race.hasSprint) {
                sprintRoundsMap[race.round] = true;
            }
        });

        // Also check Sprint Results sheet header
        if (sprintResults && sprintResults.length > 0) {
            const headerRow = sprintResults[0];
            Object.keys(headerRow).forEach(key => {
                if (key === 'col0') return;
                const value = headerRow[key];
                if (value && value.toString().trim() !== '') {
                    const headerText = value.toString();
                    const roundMatch = headerText.match(/Round\s+(\d+)/i);
                    if (roundMatch) {
                        const roundNum = parseInt(roundMatch[1]);
                        sprintRoundsMap[roundNum] = true;
                    }
                }
            });
        }

        // ========== PROCESS RESULTS ==========
        const results = calendar.map(race => {
            const roundCol = `col${race.round}`;
            const hasSprint = sprintRoundsMap[race.round] === true;
            
            const getRoundResults = (sheet, sheetName, isSprint = false) => {
                const roundResults = [];
                if (!sheet || sheet.length === 0) return roundResults;
                
                for (let i = 1; i < sheet.length; i++) {
                    const row = sheet[i];
                    const driverName = row['col0'] || row['Driver'] || '';
                    if (!driverName) continue;
                    
                    const position = row[roundCol];
                    if (!position || position === '') continue;
                    
                    const driver = drivers.find(d => d.name === driverName);
                    if (!driver) continue;
                    
                    const teamForRound = driver.getTeamForRound(race.round);
                    
                    let positionStr = position.toString();
                    let hasFastestLap = false;
                    let positionNumber = null;
                    
                    if (positionStr.includes('Fastest Lap') || positionStr.includes('fastest lap') || positionStr.includes('FL')) {
                        hasFastestLap = true;
                        positionStr = positionStr.replace(/Fastest Lap|fastest lap|\(Fastest Lap\)|\[Fastest Lap\]|FL/gi, '').trim();
                    }
                    
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
                    
                    let points = 0;
                    if (isSprint) {
                        if (positionNumber && positionNumber <= 8) {
                            const sprintPointsSystem = [8, 7, 6, 5, 4, 3, 2, 1];
                            points = sprintPointsSystem[positionNumber - 1];
                        }
                    } else {
                        if (positionNumber && positionNumber <= 10) {
                            const racePointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
                            points = racePointsSystem[positionNumber - 1];
                            if (hasFastestLap) points += 1;
                        } else if (hasFastestLap) {
                            points = 1;
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

            let sprintResultsForRound = [];
            if (hasSprint) {
                sprintResultsForRound = getRoundResults(sprintResults, 'Sprint Results', true);
            }

            return {
                round: race.round,
                name: race.name,
                date: race.date,
                circuit: race.circuit,
                classification: getRoundResults(raceResults, 'Race Results', false),
                qualifying: getRoundResults(qualiResults, 'Quali Results', false),
                sprint: sprintResultsForRound,
                hasSprint: hasSprint,
                laps: race.laps
            };
        });

        // ========== CALCULATE STANDINGS ==========
        Object.values(teamMap).forEach(team => {
            team.roundPoints = {};
            team.roundWins = {};
            team.roundPodiums = {};
            team.roundPoles = {};
            team.roundFastestLaps = {};
        });

        results.forEach(race => {
            const round = race.round;
            
            race.classification.forEach(result => {
                const teamName = result.team;
                const team = teamMap[teamName];
                if (!team) return;
                
                if (!team.roundPoints[round]) team.roundPoints[round] = 0;
                if (!team.roundWins[round]) team.roundWins[round] = 0;
                if (!team.roundPodiums[round]) team.roundPodiums[round] = 0;
                if (!team.roundFastestLaps[round]) team.roundFastestLaps[round] = 0;
                
                team.roundPoints[round] += result.points || 0;
                if (result.positionNumber === 1) team.roundWins[round] += 1;
                if (result.positionNumber && result.positionNumber <= 3) team.roundPodiums[round] += 1;
                if (result.hasFastestLap) team.roundFastestLaps[round] += 1;
            });
            
            if (race.hasSprint) {
                race.sprint.forEach(result => {
                    const teamName = result.team;
                    const team = teamMap[teamName];
                    if (!team) return;
                    if (!team.roundPoints[round]) team.roundPoints[round] = 0;
                    team.roundPoints[round] += result.points || 0;
                });
            }
            
            race.qualifying.forEach(result => {
                const teamName = result.team;
                const team = teamMap[teamName];
                if (!team) return;
                if (!team.roundPoles[round]) team.roundPoles[round] = 0;
                if (result.positionNumber === 1) team.roundPoles[round] += 1;
            });
        });

        Object.values(teamMap).forEach(team => {
            team.totalPoints = Object.values(team.roundPoints).reduce((sum, points) => sum + points, 0);
            team.totalWins = Object.values(team.roundWins).reduce((sum, wins) => sum + wins, 0);
            team.totalPodiums = Object.values(team.roundPodiums).reduce((sum, podiums) => sum + podiums, 0);
            team.totalPoles = Object.values(team.roundPoles).reduce((sum, poles) => sum + poles, 0);
            team.totalFastestLaps = Object.values(team.roundFastestLaps).reduce((sum, fl) => sum + fl, 0);
        });

        const driverStandings = drivers.map(driver => {
            let points = 0, wins = 0, podiums = 0, poles = 0, fastestLaps = 0;
            
            results.forEach(race => {
                const raceResult = race.classification.find(r => r.driver === driver.name);
                if (raceResult) {
                    points += raceResult.points || 0;
                    if (raceResult.positionNumber === 1) wins++;
                    if (raceResult.positionNumber && raceResult.positionNumber <= 3) podiums++;
                    if (raceResult.hasFastestLap) fastestLaps++;
                }
                
                const qualiResult = race.qualifying.find(r => r.driver === driver.name);
                if (qualiResult && qualiResult.positionNumber === 1) poles++;
                
                if (race.hasSprint) {
                    const sprintResult = race.sprint.find(r => r.driver === driver.name);
                    if (sprintResult) points += sprintResult.points || 0;
                }
            });
            
            let totalPosition = 0;
            let racesFinished = 0;
            results.forEach(race => {
                const result = race.classification.find(r => r.driver === driver.name);
                if (result && result.positionNumber !== null) {
                    totalPosition += result.positionNumber;
                    racesFinished++;
                }
            });
            const avgFinish = racesFinished > 0 ? (totalPosition / racesFinished).toFixed(1) : '—';
            
            return { 
                ...driver, 
                points, 
                wins, 
                podiums, 
                poles, 
                fastestLaps,
                avgFinish: avgFinish,
                currentTeam: driver.currentTeam,
                teamColor: teamMap[driver.currentTeam]?.primaryColor || '#860000'
            };
        }).sort((a, b) => b.points - a.points)
          .map((driver, index) => ({ ...driver, pos: index + 1 }));

        const constructorStandings = Object.values(teamMap)
            .filter(team => team.totalPoints > 0 || team.drivers.length > 0)
            .map(team => {
                const currentDrivers = drivers.filter(d => d.currentTeam === team.name);
                return {
                    ...team,
                    points: team.totalPoints,
                    totalPoints: team.totalPoints,
                    totalWins: team.totalWins,
                    totalPodiums: team.totalPodiums,
                    totalPoles: team.totalPoles,
                    totalFastestLaps: team.totalFastestLaps,
                    drivers: currentDrivers
                };
            })
            .sort((a, b) => b.points - a.points)
            .map((team, index) => ({ ...team, pos: index + 1 }));

        // ========== PROCESS NEWS ==========
        let homepageTitle = 'PL21 Season';
        let homepageDescription = 'The season is underway!';
        let dotdDriver = null;
        let transferWindowStatus = 'Closed';
        const newsItems = [];

        if (news && news.length > 0) {
            if (news.length >= 2) {
                const metadataRow = news[1];
                homepageTitle = metadataRow['col3'] || metadataRow['Homepage Title'] || 'PL21 Season';
                homepageDescription = metadataRow['col4'] || metadataRow['Homepage Description'] || 'The season is underway!';
                
                const dotdDriverName = metadataRow['col0'] || '';
                if (dotdDriverName) {
                    dotdDriver = drivers.find(d => d.name.toLowerCase() === dotdDriverName.toLowerCase());
                    if (!dotdDriver) {
                        dotdDriver = drivers.find(d => 
                            d.name.toLowerCase().includes(dotdDriverName.toLowerCase()) ||
                            dotdDriverName.toLowerCase().includes(d.name.toLowerCase())
                        );
                    }
                    if (!dotdDriver) {
                        dotdDriver = { 
                            name: dotdDriverName, 
                            number: '0', 
                            currentTeam: 'Unknown',
                            teamColor: '#860000',
                            short: dotdDriverName.substring(0, 3).toUpperCase()
                        };
                    }
                }
                
                transferWindowStatus = metadataRow['col2'] || 'Closed';
            }
            
            for (let i = 2; i < news.length; i++) {
                const item = news[i];
                if (item && Object.keys(item).length > 0) {
                    newsItems.push({
                        title: item['col0'] || item['Title'] || 'Latest News',
                        summary: item['col1'] || item['Summary'] || 'Stay tuned',
                        link: item['col2'] || item['Link'] || '#',
                        category: 'News'
                    });
                }
            }
        }

        const nextRace = calendar.find(race => race.status === 'upcoming') || calendar[0];

        // ========== BUILD FINAL DATA ==========
        const archiveData = {
            drivers,
            teams: Object.values(teamMap).filter(t => t.drivers.length > 0),
            circuits,
            calendar,
            results,
            news: newsItems,
            dotd: dotdDriver,
            transferWindow: transferWindowStatus,
            standings: {
                drivers: driverStandings,
                constructors: constructorStandings
            },
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
            homepage: {
                hero: {
                    title: homepageTitle,
                    description: homepageDescription,
                    featuredDriver: driverStandings[0] ? {
                        ...driverStandings[0],
                        teamColor: teamMap[driverStandings[0].currentTeam]?.primaryColor || '#860000'
                    } : null
                },
                stats: {
                    nextRace: {
                        label: 'Next Race',
                        value: nextRace?.name || 'TBD',
                        detail: nextRace ? `${nextRace.date} · ${nextRace.time}` : 'TBD'
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
                news: newsItems.slice(0, 3)
            }
        };

        console.log('✅ [ARCHIVE] Data loaded successfully!');
        console.log('📊 [ARCHIVE] Data summary:', {
            drivers: archiveData.drivers.length,
            teams: archiveData.teams.length,
            races: archiveData.results.length,
            calendar: archiveData.calendar.length
        });
        
        window.ARCHIVE_DATA = archiveData;
        window.dispatchEvent(new CustomEvent('archive-data-ready', { detail: archiveData }));
        
        return archiveData;
    } catch (error) {
        console.error('❌ [ARCHIVE] Error loading data:', error);
        return createFallbackData();
    }
}

function createFallbackData() {
    console.log('📄 [ARCHIVE] Creating fallback data for display');
    const fallbackData = {
        drivers: [],
        teams: [],
        circuits: [],
        calendar: [],
        results: [],
        news: [{ title: 'No Data', summary: 'Unable to load data from Google Sheets', link: '#', category: 'News' }],
        dotd: null,
        transferWindow: 'Closed',
        standings: {
            drivers: [],
            constructors: []
        },
        statistics: {
            overview: {
                totalRaces: 0,
                differentWinners: 0,
                totalDrivers: 0,
                totalTeams: 0
            }
        },
        homepage: {
            hero: {
                title: 'No Data Available',
                description: 'Please check your Google Sheet connection',
                featuredDriver: null
            },
            stats: {
                nextRace: { label: 'Next Race', value: 'TBD', detail: 'TBD' },
                leader: { label: 'Championship Leader', value: 'TBD', detail: '0 pts' },
                constructor: { label: "Constructor's", value: 'TBD', detail: '0 pts' },
                progress: { label: 'Season Progress', value: '0/0', detail: '0% complete' }
            },
            news: [{ title: 'No Data', summary: 'Unable to load data from Google Sheets', link: '#', category: 'News' }]
        }
    };
    
    window.ARCHIVE_DATA = fallbackData;
    window.dispatchEvent(new CustomEvent('archive-data-ready', { detail: fallbackData }));
    return fallbackData;
}

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