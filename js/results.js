// js/results.js
let currentRound = 1;
let currentSession = 'race';

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('round-scroll')) return;
    
    window.addEventListener('pl21-data-ready', (e) => {
        const data = e.detail;
        console.log('Results data received:', data);
        initializeResultsPage(data);
    });
    
    // If data already exists
    if (window.PL21_DATA) {
        console.log('Data already exists for results:', window.PL21_DATA);
        initializeResultsPage(window.PL21_DATA);
    }
});

function initializeResultsPage(data) {
    const rounds = data.results;
    if (rounds.length === 0) {
        console.log('No rounds data available');
        return;
    }
    
    console.log('Rounds data:', rounds.map(r => ({
        round: r.round,
        name: r.name,
        hasSprint: r.hasSprint,
        sprintCount: r.sprint.length
    })));
    
    // Set current round to first round
    currentRound = rounds[0].round;
    
    // Build round navigator
    buildRoundNavigator(rounds);
    
    // Show initial results
    showRoundResults(currentRound, data);
    
    // Setup session buttons
    setupSessionButtons(data);
    
    // Hide loading, show content
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
}

function buildRoundNavigator(rounds) {
    const scroll = document.getElementById('round-scroll');
    if (!scroll) return;
    
    scroll.innerHTML = rounds.map(round => {
        const isActive = round.round === currentRound ? 'active' : '';
        
        // Shorten "Grand Prix" to "GP"
        const shortName = round.name.replace('Grand Prix', 'GP');
        const dateStr = round.date || 'TBD';
        
        // Add sprint indicator if the round has a sprint
        const sprintIndicator = round.hasSprint ? '<span class="sprint-indicator">SPRINT</span>' : '';
        
        return `
            <div class="round-item ${isActive}" data-round="${round.round}">
                <div class="round-number">ROUND ${round.round}</div>
                <div class="round-name">${shortName} ${sprintIndicator}</div>
                <div class="round-date">${dateStr}</div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    document.querySelectorAll('.round-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.round-item').forEach(r => r.classList.remove('active'));
            item.classList.add('active');
            currentRound = parseInt(item.dataset.round);
            
            // Trigger round change
            if (window.PL21_DATA) {
                showRoundResults(currentRound, window.PL21_DATA);
            }
        });
    });
}

function showRoundResults(round, data) {
    const roundData = data.results.find(r => r.round === round);
    if (!roundData) {
        console.log('No data for round', round);
        return;
    }
    
    console.log('Showing round:', roundData.round, roundData.name);
    console.log('Has sprint:', roundData.hasSprint);
    console.log('Sprint results:', roundData.sprint);
    
    if (currentSession === 'race') {
        showRaceResults(roundData);
    } else if (currentSession === 'qualifying') {
        showQualifyingResults(roundData);
    } else if (currentSession === 'sprint') {
        // Only show sprint if the round has one
        if (roundData.hasSprint) {
            showSprintResults(roundData);
        } else {
            // If no sprint, show message and switch to race view
            console.log('Round has no sprint, switching to race view');
            document.querySelector('.session-btn.active').classList.remove('active');
            document.querySelector('.session-btn:first-child').classList.add('active');
            currentSession = 'race';
            showRaceResults(roundData);
        }
    }
    
    // Update race header
    updateRaceHeader(roundData);
    
    // Update session button states based on available sessions
    updateSessionButtons(roundData);
}

function updateSessionButtons(roundData) {
    const sprintBtn = document.querySelector('.session-btn:last-child');
    
    // Disable sprint button if round has no sprint
    if (sprintBtn) {
        if (roundData.hasSprint) {
            sprintBtn.disabled = false;
            sprintBtn.classList.remove('disabled');
        } else {
            sprintBtn.disabled = true;
            sprintBtn.classList.add('disabled');
        }
    }
}

function showRaceResults(roundData) {
    const container = document.getElementById('race-view');
    const qualifyingView = document.getElementById('qualifying-view');
    const sprintView = document.getElementById('sprint-view');
    
    if (!container) return;
    
    qualifyingView.style.display = 'none';
    sprintView.style.display = 'none';
    container.style.display = 'block';
    
    const tbody = document.getElementById('race-results-body');
    const classification = roundData.classification || [];
    
    console.log('Race classification:', classification);
    
    if (classification.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No race results available for this round</td></tr>';
        return;
    }
    
    // Sort by positionNumber to ensure correct order
    const sortedResults = [...classification].sort((a, b) => {
        // Handle cases where positionNumber might be null/undefined
        const posA = a.positionNumber || 999;
        const posB = b.positionNumber || 999;
        return posA - posB;
    });
    
    tbody.innerHTML = sortedResults.map((result, index) => {
        // Use positionNumber from the data
        const pos = result.positionNumber || (index + 1);
        const posClass = pos === 1 ? 'pos-1' : 
                        pos === 2 ? 'pos-2' : 
                        pos === 3 ? 'pos-3' : '';
        
        // Create position display with FL tag if applicable
        let positionDisplay = `P${pos}`;
        if (result.hasFastestLap) {
            positionDisplay += ' <span class="fastest-lap">FL</span>';
        }
        
        return `
            <tr>
                <td class="driver-cell">
                    <span class="driver-color-dot" style="background: ${result.teamColor};"></span>
                    ${result.driver}
                </td>
                <td class="team-cell">${result.team}</td>
                <td class="position-cell ${posClass}">${positionDisplay}</td>
                <td class="points-cell">${result.points}</td>
            </tr>
        `;
    }).join('');
}

function showQualifyingResults(roundData) {
    const container = document.getElementById('qualifying-view');
    const raceView = document.getElementById('race-view');
    const sprintView = document.getElementById('sprint-view');
    
    if (!container) return;
    
    raceView.style.display = 'none';
    sprintView.style.display = 'none';
    container.style.display = 'block';
    
    const tbody = document.getElementById('qualifying-results-body');
    const qualifying = roundData.qualifying || [];
    
    console.log('Qualifying results:', qualifying);
    
    if (qualifying.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No qualifying results available for this round</td></tr>';
        return;
    }
    
    // Sort qualifying results by positionNumber
    const sortedResults = [...qualifying].sort((a, b) => {
        const posA = a.positionNumber || 999;
        const posB = b.positionNumber || 999;
        return posA - posB;
    });
    
    tbody.innerHTML = sortedResults.map((result, index) => {
        const pos = result.positionNumber || (index + 1);
        const posClass = pos === 1 ? 'pos-1' : 
                        pos === 2 ? 'pos-2' : 
                        pos === 3 ? 'pos-3' : '';
        
        return `
            <tr>
                <td class="driver-cell">
                    <span class="driver-color-dot" style="background: ${result.teamColor};"></span>
                    ${result.driver}
                </td>
                <td class="team-cell">${result.team}</td>
                <td class="time-cell ${posClass}">P${pos}</td>
                <td class="points-cell">—</td>
            </tr>
        `;
    }).join('');
}

function showSprintResults(roundData) {
    const container = document.getElementById('sprint-view');
    const raceView = document.getElementById('race-view');
    const qualifyingView = document.getElementById('qualifying-view');
    
    if (!container) return;
    
    raceView.style.display = 'none';
    qualifyingView.style.display = 'none';
    container.style.display = 'block';
    
    const tbody = document.getElementById('sprint-results-body');
    const sprint = roundData.sprint || [];
    
    console.log('Sprint results:', sprint);
    
    if (!sprint || sprint.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No sprint results available for this round</td></tr>';
        return;
    }
    
    // Sort sprint results by positionNumber
    const sortedResults = [...sprint].sort((a, b) => {
        const posA = a.positionNumber || 999;
        const posB = b.positionNumber || 999;
        return posA - posB;
    });
    
    tbody.innerHTML = sortedResults.map((result, index) => {
        const pos = result.positionNumber || (index + 1);
        const posClass = pos === 1 ? 'pos-1' : 
                        pos === 2 ? 'pos-2' : 
                        pos === 3 ? 'pos-3' : '';
        
        // Create position display with FL tag if applicable
        let positionDisplay = `P${pos}`;
        if (result.hasFastestLap) {
            positionDisplay += ' <span class="fastest-lap">FL</span>';
        }
        
        return `
            <tr>
                <td class="driver-cell">
                    <span class="driver-color-dot" style="background: ${result.teamColor};"></span>
                    ${result.driver}
                </td>
                <td class="team-cell">${result.team}</td>
                <td class="position-cell ${posClass}">${positionDisplay}</td>
                <td class="points-cell">${result.points || 0}</td>
            </tr>
        `;
    }).join('');
}

function updateRaceHeader(roundData) {
    const header = document.getElementById('race-header-info');
    if (!header) return;
    
    // Shorten "Grand Prix" to "GP" in header too
    const shortName = roundData.name.replace('Grand Prix', 'GP');
    
    header.innerHTML = `
        <h2>${shortName}</h2>
        <div class="race-location">
            <span>📍 ${roundData.circuit}</span>
            <span>📅 ${roundData.date || 'TBD'}</span>
        </div>
    `;
}

function setupSessionButtons(data) {
    const sessionBtns = document.querySelectorAll('.session-btn');
    
    sessionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newSession = btn.textContent.toLowerCase();
            
            sessionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentSession = newSession;
            showRoundResults(currentRound, data);
        });
    });
    
    // Listen for round changes
    window.addEventListener('round-changed', (e) => {
        currentRound = e.detail;
        if (window.PL21_DATA) {
            showRoundResults(currentRound, window.PL21_DATA);
        }
    });
}

// Add minimal CSS
const style = document.createElement('style');
style.textContent = `
    .sprint-indicator {
        font-size: 0.6rem;
        background: #860000;
        color: white;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        margin-left: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .session-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
    }
    
    .fastest-lap {
        color: #b657ff;
        font-weight: 700;
        font-size: 0.7rem;
        border: 1px solid #b657ff;
        padding: 0.15rem 0.3rem;
        border-radius: 4px;
        display: inline-block;
        margin-left: 0.5rem;
        background: rgba(182, 87, 255, 0.1);
    }

    .time-cell {
        font-family: 'F1-Regular', sans-serif;
        font-weight: 500;
    }
`;
document.head.appendChild(style);