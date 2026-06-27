// js/data-loader-archive.js - PL21 Archive Data Loader
const ARCHIVE_SHEET_ID = '1BA9J14wUXfrjGUXlFrxYBqdZzAKIDrfQFgop_7FwfPg';

function parseCSV(csvText) {
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

async function fetchSheetAsCSV(sheetName) {
    try {
        const cacheBuster = Date.now();
        const url = `https://docs.google.com/spreadsheets/d/${ARCHIVE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&cb=${cacheBuster}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const csvText = await res.text();
        return parseCSV(csvText);
    } catch (e) {
        console.warn(`Failed to load ${sheetName}:`, e);
        return [];
    }
}

function getFlagEmoji(country) {
    const flags = {
        'British': '🇬🇧', 'American': '🇺🇸', 'French': '🇫🇷',
        'Serbian': '🇷🇸', 'Serbia': '🇷🇸', 'Dutch': '🇳🇱',
        'German': '🇩🇪', 'Italian': '🇮🇹', 'Spanish': '🇪🇸',
        'Finnish': '🇫🇮', 'Australian': '🇦🇺', 'Canadian': '🇨🇦',
        'Japanese': '🇯🇵', 'Mexican': '🇲🇽', 'Brazilian': '🇧🇷',
        'New Zealander': '🇳🇿', 'Irish': '🇮🇪', 'Belgian': '🇧🇪',
        'Austrian': '🇦🇹', 'Swiss': '🇨🇭', 'Swedish': '🇸🇪',
        'Danish': '🇩🇰', 'Polish': '🇵🇱', 'Hungarian': '🇭🇺',
        'Portuguese': '🇵🇹'
    };
    return flags[country] || '🏁';
}

async function loadArchiveData() {
    console.log('📦 Loading PL21 archive data...');

    const [driverMaster, driverMovement, teamMaster, circuitMaster, calendarRaw, raceResults, qualiResults, sprintResults] = await Promise.all([
        fetchSheetAsCSV('Driver Master'),
        fetchSheetAsCSV('Driver Movement'),
        fetchSheetAsCSV('Team Master'),
        fetchSheetAsCSV('Circuit Master'),
        fetchSheetAsCSV('Calendar'),
        fetchSheetAsCSV('Race Results'),
        fetchSheetAsCSV('Quali Results'),
        fetchSheetAsCSV('Sprint Results')
    ]);

    console.log('📊 Archive sheets loaded:', {
        driverMaster: driverMaster.length,
        driverMovement: driverMovement.length,
        teamMaster: teamMaster.length,
        circuitMaster: circuitMaster.length,
        calendar: calendarRaw.length,
        raceResults: raceResults.length,
        qualiResults: qualiResults.length,
        sprintResults: sprintResults.length
    });

    // Process Teams
    const teamMap = {};
    teamMaster.forEach((team, index) => {
        const teamName = team['Team Name'] || team['Team'] || team['col0'] || '';
        if (!teamName || teamName.toLowerCase().includes('team')) return;
        
        teamMap[teamName] = {
            id: teamName.toLowerCase().replace(/\s+/g, ''),
            name: teamName,
            primaryColor: team['Primary Color'] || team['Primary'] || team['col1'] || '#860000',
            secondaryColor: team['Secondary Color'] || team['Secondary'] || team['col2'] || '#000000',
            owner: team['Team Owner'] || team['Owner'] || team['col3'] || 'TBA',
            drivers: [],
            totalPoints: 0,
            totalWins: 0,
            totalPodiums: 0,
            totalPoles: 0,
            totalFastestLaps: 0
        };
    });

    // Process Driver Movement
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

    // Process Drivers
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
            movement: movement,
            currentTeam: team,
            teamColor: teamMap[team]?.primaryColor || '#860000',
            getTeamForRound: (round) => {
                const roundKey = `round${round}`;
                return movement[roundKey] || team;
            }
        };
    });

    drivers.forEach(driver => {
        const team = teamMap[driver.currentTeam];
        if (team) team.drivers.push(driver);
    });

    // Process Calendar
    const calendar = [];
    if (calendarRaw.length >= 3) {
        const raceNamesRow = calendarRaw[0];
        const lapsRow = calendarRaw[1];
        const raceKeys = Object.keys(raceNamesRow).filter(key => key !== 'Round Date' && key !== 'col0');
        
        const roundsWithResults = new Set();
        if (raceResults && raceResults.length > 0) {
            for (let roundNum = 1; roundNum <= raceKeys.length; roundNum++) {
                const roundCol = `col${roundNum}`;
                const hasResults = raceResults.some(row => {
                    const result = row[roundCol];
                    return result && result.toString().trim() !== '';
                });
                if (hasResults) roundsWithResults.add(roundNum);
            }
        }

        const sprintRoundsMap = {};
        if (sprintResults && sprintResults.length > 0) {
            const headerRow = sprintResults[0];
            Object.keys(headerRow).forEach(key => {
                if (key === 'col0') return;
                const value = headerRow[key];
                if (value && value.toString().trim() !== '') {
                    const roundMatch = value.toString().match(/Round\s+(\d+)/i);
                    if (roundMatch) {
                        sprintRoundsMap[parseInt(roundMatch[1])] = true;
                    }
                }
            });
        }

        raceKeys.forEach((key, index) => {
            const raceInfo = key;
            const roundMatch = raceInfo.match(/Round (\d+)/i);
            let roundNum = index + 1;
            if (roundMatch) roundNum = parseInt(roundMatch[1]);
            
            let raceName = raceInfo.replace(/Round \d+\s+.+$/, '').trim();
            let dateStr = 'TBD';
            const dateMatch = raceInfo.match(/Round \d+\s+(.+)$/i);
            if (dateMatch) dateStr = dateMatch[1].trim();
            
            const dateValue = raceNamesRow[key];
            let timeStr = '19:00';
            if (typeof dateValue === 'string' && dateValue.startsWith('Date(')) {
                const matches = dateValue.match(/Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
                if (matches) {
                    const [_, year, month, day, hour, minute, second] = matches;
                    timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                }
            }
            
            const laps = lapsRow?.[key] || 'TBD';
            const status = roundsWithResults.has(roundNum) ? 'completed' : 'upcoming';
            
            calendar.push({
                round: roundNum,
                name: raceName || `Round ${roundNum}`,
                date: dateStr,
                time: timeStr,
                laps: laps,
                status: status,
                hasSprint: sprintRoundsMap[roundNum] === true
            });
        });
        calendar.sort((a, b) => a.round - b.round);
    }

    // Process Results
    const results = calendar.map(race => {
        const roundCol = `col${race.round}`;
        const hasSprint = race.hasSprint || false;
        
        const getRoundResults = (sheet, isSprint = false) => {
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
                
                if (positionStr.includes('Fastest Lap') || positionStr.includes('FL')) {
                    hasFastestLap = true;
                    positionStr = positionStr.replace(/Fastest Lap|FL/gi, '').trim();
                }
                
                if (typeof positionStr === 'string') {
                    const pMatch = positionStr.match(/^P(\d+)$/i);
                    if (pMatch) positionNumber = parseInt(pMatch[1]);
                    else positionNumber = parseInt(positionStr) || null;
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
                        if (hasFastestLap && positionNumber <= 10) points += 1;
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
            return roundResults.sort((a, b) => (a.positionNumber || 999) - (b.positionNumber || 999));
        };

        return {
            round: race.round,
            name: race.name,
            date: race.date,
            classification: getRoundResults(raceResults, false),
            qualifying: getRoundResults(qualiResults, false),
            sprint: hasSprint ? getRoundResults(sprintResults, true) : [],
            hasSprint: hasSprint
        };
    });

    // Calculate Standings
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
            const team = teamMap[result.team];
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
                const team = teamMap[result.team];
                if (!team) return;
                if (!team.roundPoints[round]) team.roundPoints[round] = 0;
                team.roundPoints[round] += result.points || 0;
            });
        }
        
        race.qualifying.forEach(result => {
            const team = teamMap[result.team];
            if (!team) return;
            if (!team.roundPoles[round]) team.roundPoles[round] = 0;
            if (result.positionNumber === 1) team.roundPoles[round] += 1;
        });
    });

    Object.values(teamMap).forEach(team => {
        team.totalPoints = Object.values(team.roundPoints || {}).reduce((sum, pts) => sum + pts, 0);
        team.totalWins = Object.values(team.roundWins || {}).reduce((sum, wins) => sum + wins, 0);
        team.totalPodiums = Object.values(team.roundPodiums || {}).reduce((sum, pod) => sum + pod, 0);
        team.totalPoles = Object.values(team.roundPoles || {}).reduce((sum, poles) => sum + poles, 0);
        team.totalFastestLaps = Object.values(team.roundFastestLaps || {}).reduce((sum, fl) => sum + fl, 0);
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
        return { ...driver, points, wins, podiums, poles, fastestLaps };
    }).sort((a, b) => b.points - a.points).map((d, i) => ({ ...d, pos: i + 1 }));

    const constructorStandings = Object.values(teamMap)
        .filter(team => team.totalPoints > 0 || team.drivers.length > 0)
        .map(team => ({
            ...team,
            drivers: drivers.filter(d => d.currentTeam === team.name)
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((team, i) => ({ ...team, pos: i + 1 }));

    const ARCHIVE_DATA = {
        drivers,
        teams: Object.values(teamMap).filter(t => t.drivers.length > 0),
        calendar,
        results,
        standings: {
            drivers: driverStandings,
            constructors: constructorStandings
        }
    };

    window.ARCHIVE_DATA = ARCHIVE_DATA;
    window.dispatchEvent(new CustomEvent('archive-data-ready', { detail: ARCHIVE_DATA }));
    console.log('✅ PL21 Archive data loaded successfully');
    return ARCHIVE_DATA;
}