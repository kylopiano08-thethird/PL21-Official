// js/teams.js
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('teams-grid')) return;
    
    // Check if we need to open a specific driver profile
    const urlParams = new URLSearchParams(window.location.search);
    const driverParam = urlParams.get('driver');
    const storedDriver = sessionStorage.getItem('viewDriver');
    
    if (driverParam || storedDriver) {
        // Store that we need to open a driver profile after data loads
        window.pendingDriverView = {
            id: driverParam || (storedDriver ? JSON.parse(storedDriver).id : null),
            name: storedDriver ? JSON.parse(storedDriver).name : null
        };
        // Clear sessionStorage after retrieving
        sessionStorage.removeItem('viewDriver');
    }
    
    window.addEventListener('pl21-data-ready', (e) => {
        const data = e.detail;
        displayTeams(data.teams);
        
        // Check if we need to open a driver profile
        if (window.pendingDriverView) {
            // Small delay to ensure DOM is fully rendered
            setTimeout(() => {
                const driverId = window.pendingDriverView.id;
                // Try to find by data-driver-id attribute
                let driverCard = document.querySelector(`.driver-card[data-driver-id="${driverId}"]`);
                
                // If not found, try to find by name
                if (!driverCard && window.pendingDriverView.name) {
                    const allCards = document.querySelectorAll('.driver-card');
                    for (let card of allCards) {
                        const nameElement = card.querySelector('.driver-name');
                        if (nameElement && nameElement.textContent.trim() === window.pendingDriverView.name) {
                            driverCard = card;
                            break;
                        }
                    }
                }
                
                // If still not found, try partial name match
                if (!driverCard && window.pendingDriverView.name) {
                    const allCards = document.querySelectorAll('.driver-card');
                    for (let card of allCards) {
                        const nameElement = card.querySelector('.driver-name');
                        if (nameElement && nameElement.textContent.toLowerCase().includes(window.pendingDriverView.name.toLowerCase())) {
                            driverCard = card;
                            break;
                        }
                    }
                }
                
                if (driverCard) {
                    driverCard.click();
                } else {
                    console.log('Driver card not found for:', window.pendingDriverView);
                }
                window.pendingDriverView = null;
            }, 500);
        }
    });
});

function displayTeams(teams) {
    const grid = document.getElementById('teams-grid');
    if (!grid) return;
    
    // Sort teams by points (highest first) for better display
    const sortedTeams = [...teams].sort((a, b) => b.totalPoints - a.totalPoints);
    
    grid.innerHTML = sortedTeams.map(team => createTeamCard(team)).join('');
    
    // Add click handlers to driver cards
    document.querySelectorAll('.driver-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const driverId = card.dataset.driverId;
            const teamId = card.dataset.teamId;
            showDriverProfile(driverId, teamId);
        });
    });
}

function createTeamCard(team) {
    // Get car image from team data
    const carImage = team.carImage || team['Car Image'] || team['col5'] || '';
    
    // Get team owner
    const owner = team.owner || team['Team Owner'] || team['col3'] || 'TBA';
    
    const driversHtml = team.drivers.map(driver => {
        const driverPhoto = driver.photo || driver['Photo'] || driver['col4'] || '';
        
        return `
        <div class="driver-card" data-driver-id="${driver.id || driver.name.toLowerCase().replace(/\s+/g, '')}" data-team-id="${team.id}" style="cursor: pointer;">
            <div class="driver-photo-container">
                ${driverPhoto ? 
                    `<img src="${driverPhoto}" alt="${driver.name}" class="driver-photo" onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/860000?text=${encodeURIComponent(driver.short || driver.name.substring(0,2))}'">` : 
                    `<div class="driver-photo-placeholder" style="background: linear-gradient(135deg, ${driver.teamColor || '#860000'}, #000);">${driver.short || driver.name.substring(0,2)}</div>`
                }
            </div>
            <div class="driver-number" style="color: ${driver.teamColor || '#860000'}">${driver.number}</div>
            <div class="driver-name">${driver.name}</div>
            <div class="driver-flag">${driver.flag}</div>
        </div>
    `}).join('');
    
    return `
        <div class="team-card" style="border-top: 3px solid ${team.primaryColor || '#860000'}">
            <div class="team-header">
                <div class="team-logo-container">
                    <div class="team-color" style="background: ${team.primaryColor || '#860000'};"></div>
                </div>
                <div>
                    <div class="team-name">${team.name}</div>
                    <div class="team-owner">Owner: ${owner}</div>
                </div>
            </div>
            <div class="car-image-container">
                ${carImage ? 
                    `<img src="${carImage}" alt="${team.name} Car" class="car-image" onerror="this.src='https://via.placeholder.com/400x200/1a1a1a/${team.primaryColor?.replace('#', '') || '860000'}?text=${encodeURIComponent(team.name)}+Car'">` : 
                    `<div class="car-image-placeholder" style="background: linear-gradient(145deg, ${team.primaryColor || '#860000'}30, #050505);">
                        <span>${team.name} Car</span>
                    </div>`
                }
            </div>
            <div class="drivers-section">
                <div class="drivers-title">Drivers (click to view profile)</div>
                <div class="drivers-grid">
                    ${driversHtml}
                </div>
            </div>
            <div class="team-stats">
                <div class="stat">
                    <span class="stat-value">${team.totalPoints || 0}</span>
                    <span>Points</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${team.totalWins || 0}</span>
                    <span>Wins</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${team.totalPodiums || 0}</span>
                    <span>Podiums</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${team.totalPoles || 0}</span>
                    <span>Poles</span>
                </div>
            </div>
        </div>
    `;
}

function showDriverProfile(driverId, teamId) {
    const data = window.PL21_DATA;
    
    // Find the driver
    const driver = data.drivers.find(d => d.id === driverId || d.name.toLowerCase().replace(/\s+/g, '') === driverId);
    if (!driver) return;
    
    // Find the team
    const team = data.teams.find(t => t.id === teamId);
    if (!team) return;
    
    // Get driver's career stats from results
    const driverStats = {
        points: 0,
        wins: 0,
        podiums: 0,
        poles: 0,
        fastestLaps: 0,
        races: 0,
        finishes: [],
        qualiPositions: []
    };
    
    data.results.forEach(race => {
        // Race results
        const raceResult = race.classification.find(r => r.driver === driver.name);
        if (raceResult) {
            driverStats.races++;
            driverStats.points += raceResult.points || 0;
            
            if (raceResult.positionNumber === 1) driverStats.wins++;
            if (raceResult.positionNumber && raceResult.positionNumber <= 3) driverStats.podiums++;
            if (raceResult.hasFastestLap) driverStats.fastestLaps++;
            
            if (raceResult.positionNumber) {
                driverStats.finishes.push(raceResult.positionNumber);
            }
        }
        
        // Qualifying results
        const qualiResult = race.qualifying.find(r => r.driver === driver.name);
        if (qualiResult && qualiResult.positionNumber === 1) {
            driverStats.poles++;
        }
        if (qualiResult && qualiResult.positionNumber) {
            driverStats.qualiPositions.push(qualiResult.positionNumber);
        }
        
        // Sprint results
        if (race.hasSprint) {
            const sprintResult = race.sprint.find(r => r.driver === driver.name);
            if (sprintResult) {
                driverStats.points += sprintResult.points || 0;
            }
        }
    });
    
    // Calculate averages
    let avgFinish = 'N/A';
    if (driverStats.finishes.length > 0) {
        avgFinish = (driverStats.finishes.reduce((a, b) => a + b, 0) / driverStats.finishes.length).toFixed(1);
    }
    
    let avgQuali = 'N/A';
    if (driverStats.qualiPositions.length > 0) {
        avgQuali = (driverStats.qualiPositions.reduce((a, b) => a + b, 0) / driverStats.qualiPositions.length).toFixed(1);
    }
    
    let pointsPerRace = 'N/A';
    if (driverStats.races > 0) {
        pointsPerRace = (driverStats.points / driverStats.races).toFixed(1);
    }
    
    let winRate = 'N/A';
    if (driverStats.races > 0) {
        winRate = ((driverStats.wins / driverStats.races) * 100).toFixed(1) + '%';
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'driver-profile-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <button class="modal-close">✕</button>
            <div class="profile-header" style="border-bottom-color: ${team.primaryColor || '#860000'}">
                <div class="profile-photo">
                    ${driver.photo ? 
                        `<img src="${driver.photo}" alt="${driver.name}" onerror="this.src='https://via.placeholder.com/120x120/1a1a1a/860000?text=${encodeURIComponent(driver.short || driver.name.substring(0,2))}'">` : 
                        `<div class="profile-photo-placeholder" style="background: linear-gradient(135deg, ${team.primaryColor || '#860000'}, #000);">${driver.short || driver.name.substring(0,2)}</div>`
                    }
                </div>
                <div class="profile-title">
                    <div class="profile-number" style="color: ${team.primaryColor || '#860000'}">#${driver.number}</div>
                    <h2 class="profile-name">${driver.name}</h2>
                    <div class="profile-team">${team.name}</div>
                </div>
            </div>
            
            <div class="profile-details">
                <div class="detail-item">
                    <span class="detail-label">Nationality</span>
                    <span class="detail-value">${driver.flag} ${driver.nationality}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Experience</span>
                    <span class="detail-value">${driver.experience || 'Rookie'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Discord</span>
                    <span class="detail-value discord-handle">${driver.discord || 'Not available'}</span>
                </div>
            </div>
            
            <div class="profile-stats-grid">
                <div class="profile-stat-card">
                    <div class="profile-stat-value">${driverStats.points}</div>
                    <div class="profile-stat-label">Points</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-value">${driverStats.wins}</div>
                    <div class="profile-stat-label">Wins</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-value">${driverStats.podiums}</div>
                    <div class="profile-stat-label">Podiums</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-value">${driverStats.poles}</div>
                    <div class="profile-stat-label">Poles</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-value">${driverStats.fastestLaps}</div>
                    <div class="profile-stat-label">Fastest Laps</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-value">${driverStats.races}</div>
                    <div class="profile-stat-label">Races</div>
                </div>
            </div>
            
            <div class="profile-advanced-stats">
                <h3 class="advanced-stats-title">Performance Averages</h3>
                <div class="advanced-stats-grid">
                    <div class="advanced-stat">
                        <span class="advanced-stat-label">Average Finish</span>
                        <span class="advanced-stat-value">P${avgFinish}</span>
                    </div>
                    <div class="advanced-stat">
                        <span class="advanced-stat-label">Average Qualifying</span>
                        <span class="advanced-stat-value">P${avgQuali}</span>
                    </div>
                    <div class="advanced-stat">
                        <span class="advanced-stat-label">Points Per Race</span>
                        <span class="advanced-stat-value">${pointsPerRace}</span>
                    </div>
                    <div class="advanced-stat">
                        <span class="advanced-stat-label">Win Rate</span>
                        <span class="advanced-stat-value">${winRate}</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-movement" id="profile-movement"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add team movement timeline
    const movementContainer = document.getElementById('profile-movement');
    if (movementContainer) {
        const rounds = [1,2,3,4,5,6,7,8,9,10,11,12];
        const movementHtml = `
            <h3 class="movement-title">Team Movement</h3>
            <div class="movement-timeline">
                ${rounds.map(round => {
                    const teamForRound = driver.getTeamForRound ? driver.getTeamForRound(round) : driver.currentTeam;
                    const roundTeam = data.teams.find(t => t.name === teamForRound);
                    return `
                        <div class="movement-point">
                            <div class="movement-round">R${round}</div>
                            <div class="movement-team" style="color: ${roundTeam?.primaryColor || '#860000'}">${teamForRound || 'TBA'}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        movementContainer.innerHTML = movementHtml;
    }
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    
    const closeModal = () => {
        document.body.removeChild(modal);
    };
    
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    // Close on escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Export for use in other files if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { displayTeams, createTeamCard, showDriverProfile };
}