// js/archive.js - Archive page with grid and season detail
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Archive page loaded');
    
    if (!document.getElementById('archiveGrid')) {
        console.log('📄 Not on archive page, exiting');
        return;
    }
    
    // Show grid view initially
    document.getElementById('gridView').style.display = 'block';
    document.getElementById('seasonDetailView').style.display = 'none';
    
    // Set up season card click handlers - using event delegation
    document.getElementById('archiveGrid').addEventListener('click', function(e) {
        const card = e.target.closest('.archive-card');
        if (!card) return;
        
        const season = card.dataset.season;
        console.log('📄 Season card clicked:', season);
        
        if (season === '2021') {
            loadSeason2021();
        }
    });
    
    // Back button
    document.getElementById('backToGrid').addEventListener('click', function() {
        document.getElementById('gridView').style.display = 'block';
        document.getElementById('seasonDetailView').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Tab switching for detail view
    document.querySelectorAll('.section-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(this.dataset.tab).classList.add('active');
        });
    });
    
    // Check if data is already loaded from archive-data-loader.js
    if (window.ARCHIVE_DATA) {
        console.log('📄 Data already loaded, storing...');
    } else {
        console.log('📄 Waiting for data to load from archive-data-loader.js...');
        // The archive-data-loader.js will set window.ARCHIVE_DATA directly
    }
});

function loadSeason2021() {
    console.log('📄 Loading PL21 season detail');
    
    // Show loading state
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';
    
    // Show detail view, hide grid
    document.getElementById('gridView').style.display = 'none';
    document.getElementById('seasonDetailView').style.display = 'block';
    
    // Check if data is available from archive-data-loader.js
    if (window.ARCHIVE_DATA) {
        console.log('📄 Using stored data from archive-data-loader.js');
        renderSeasonDetail(window.ARCHIVE_DATA);
        if (loading) loading.style.display = 'none';
    } else {
        // Wait for data if not ready yet
        console.log('📄 Waiting for archive-data-loader.js to load data...');
        const checkData = setInterval(() => {
            if (window.ARCHIVE_DATA) {
                clearInterval(checkData);
                console.log('📄 Data now available, rendering...');
                renderSeasonDetail(window.ARCHIVE_DATA);
                if (loading) loading.style.display = 'none';
            }
        }, 500);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkData);
            if (!window.ARCHIVE_DATA) {
                console.error('📄 Data failed to load from archive-data-loader.js');
                if (loading) loading.style.display = 'none';
                document.getElementById('seasonDetailView').innerHTML = `
                    <div style="text-align:center;padding:3rem;color:#777;">
                        <h2>⚠️ Failed to load data</h2>
                        <p>Please check the console for errors and ensure your Google Sheet is accessible.</p>
                        <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 2rem;background:#860000;color:white;border:none;border-radius:4px;cursor:pointer;">Retry</button>
                    </div>
                `;
            }
        }, 10000);
    }
}

function renderSeasonDetail(data) {
    console.log('📄 Rendering season detail');
    
    if (!data || !data.standings) {
        console.error('📄 Invalid data received');
        return;
    }
    
    const { drivers, teams, calendar, results, standings } = data;
    const completedRaces = results ? results.filter(r => r.classification && r.classification.length > 0) : [];
    
    // Season Header
    document.getElementById('racesCount').textContent = `${completedRaces.length} Races`;
    document.getElementById('teamsCount').textContent = `${teams ? teams.length : 0} Teams`;
    document.getElementById('driversCount').textContent = `${drivers ? drivers.length : 0} Drivers`;
    
    const winners = new Set();
    completedRaces.forEach(race => {
        const winner = race.classification.find(r => r.positionNumber === 1);
        if (winner) winners.add(winner.driver);
    });
    document.getElementById('winnersCount').textContent = `${winners.size} Winners`;

    const champion = standings.drivers && standings.drivers.length > 0 ? standings.drivers[0] : null;
    if (champion) {
        document.getElementById('championName').textContent = champion.name || '—';
        document.getElementById('championTeam').textContent = champion.currentTeam || '—';
        document.getElementById('champPoints').textContent = champion.points || 0;
        document.getElementById('champWins').textContent = champion.wins || 0;
        document.getElementById('champPodiums').textContent = champion.podiums || 0;
        document.getElementById('champPoles').textContent = champion.poles || 0;
        document.getElementById('champFL').textContent = champion.fastestLaps || 0;
    }

    // Stats Grid
    document.getElementById('statChampionPoints').textContent = champion?.points || 0;
    document.getElementById('statDifferentWinners').textContent = winners.size;
    
    const poleSitters = new Set();
    completedRaces.forEach(race => {
        const pole = race.qualifying.find(r => r.positionNumber === 1);
        if (pole) poleSitters.add(pole.driver);
    });
    document.getElementById('statPoleSitters').textContent = poleSitters.size;
    
    const flHolders = new Set();
    completedRaces.forEach(race => {
        if (race.classification) {
            race.classification.forEach(r => {
                if (r.hasFastestLap) flHolders.add(r.driver);
            });
        }
    });
    document.getElementById('statFLHolders').textContent = flHolders.size;
    document.getElementById('statTeams').textContent = teams ? teams.length : 0;
    
    const totalPossibleRaces = calendar ? calendar.filter(r => r.status === 'completed').length : 0;
    const attendanceRate = totalPossibleRaces > 0 ? Math.round((completedRaces.length / totalPossibleRaces) * 100) : 0;
    document.getElementById('statAttendance').textContent = `${attendanceRate}%`;

    // Driver Standings
    const driverBody = document.getElementById('driverStandingsBody');
    if (standings.drivers && standings.drivers.length > 0) {
        driverBody.innerHTML = standings.drivers.map((d, i) => {
            const posClass = i === 0 ? 'position-1' : i === 1 ? 'position-2' : i === 2 ? 'position-3' : '';
            const ptsPerRace = completedRaces.length > 0 ? (d.points / completedRaces.length).toFixed(1) : '0';
            return `<tr>
                <td class="${posClass}">${d.pos || i + 1}</td>
                <td class="driver-cell">
                    <span class="driver-color-dot" style="background: ${d.teamColor || '#860000'};"></span>
                    ${d.name || 'Unknown'}
                </td>
                <td class="team-cell">${d.currentTeam || '—'}</td>
                <td>${d.wins || 0}</td>
                <td>${d.podiums || 0}</td>
                <td>${d.poles || 0}</td>
                <td>${d.fastestLaps || 0}</td>
                <td class="points-cell">${d.points || 0}</td>
                <td>${ptsPerRace}</td>
            </tr>`;
        }).join('');
    } else {
        driverBody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#777;padding:1rem;">No driver data available</td></tr>';
    }

    // Constructor Standings
    const constBody = document.getElementById('constructorStandingsBody');
    if (standings.constructors && standings.constructors.length > 0) {
        constBody.innerHTML = standings.constructors.map((t, i) => {
            const posClass = i === 0 ? 'position-1' : i === 1 ? 'position-2' : i === 2 ? 'position-3' : '';
            const driverNames = t.drivers ? t.drivers.map(d => d.short || d.name.split(' ').pop()).join(' / ') : '—';
            return `<tr>
                <td class="${posClass}">${t.pos || i + 1}</td>
                <td class="driver-cell">
                    <span class="driver-color-dot" style="background: ${t.primaryColor || '#860000'};"></span>
                    ${t.name || 'Unknown'}
                </td>
                <td class="team-cell">${driverNames}</td>
                <td>${t.totalWins || 0}</td>
                <td>${t.totalPodiums || 0}</td>
                <td>${t.totalPoles || 0}</td>
                <td>${t.totalFastestLaps || 0}</td>
                <td class="points-cell">${t.totalPoints || 0}</td>
            </tr>`;
        }).join('');
    } else {
        constBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#777;padding:1rem;">No constructor data available</td></tr>';
    }

    // Race Results Grid
    renderRaceResults(completedRaces);

    // Season Stats
    if (standings.drivers) {
        renderSeasonStats(standings.drivers);
    }

    // Advanced Stats
    renderAdvancedStats(data);
}

function renderRaceResults(races) {
    const grid = document.getElementById('resultsGrid');
    if (!grid) return;
    
    if (!races || races.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:2rem;color:#777;">No race results available</div>';
        return;
    }
    
    grid.innerHTML = races.map(race => {
        const winner = race.classification.find(r => r.positionNumber === 1);
        const podium = race.classification.filter(r => r.positionNumber && r.positionNumber <= 3);
        
        return `<div class="result-card" data-round="${race.round}" data-race="${race.name}">
            <div class="race-header">
                <span class="race-name">${race.name || 'Race ' + race.round}</span>
                <span class="race-round">Round ${race.round}</span>
            </div>
            <div class="race-winner">
                <span class="label">Winner</span>
                <span class="name">${winner ? winner.driver : '—'}</span>
                <span style="color: #777; font-size: 0.8rem; margin-left: auto;">${winner ? winner.points : 0} pts</span>
            </div>
            <div class="race-podium">
                ${podium.map((p, idx) => `
                    <div class="podium-item pos-${idx + 1}">
                        <div class="pos">${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : 'rd'}</div>
                        <div class="name">${p.driver.split(' ').pop()}</div>
                    </div>
                `).join('')}
                ${podium.length < 3 ? '<div class="podium-item"><div class="pos">—</div><div class="name">—</div></div>'.repeat(3 - podium.length) : ''}
            </div>
            <div class="race-stats">
                <span>${race.date || 'TBD'}</span>
                ${race.hasSprint ? '<span>🏁 Sprint</span>' : ''}
                <span>FL: ${race.classification.find(r => r.hasFastestLap)?.driver || '—'}</span>
            </div>
            <div class="click-hint">Click for full results →</div>
        </div>`;
    }).join('');

    document.querySelectorAll('.result-card').forEach(card => {
        card.addEventListener('click', function() {
            const round = parseInt(this.dataset.round);
            openModal(round);
        });
    });
}

function renderSeasonStats(drivers) {
    const container = document.getElementById('statsLeaderboards');
    if (!container) return;
    
    if (!drivers || drivers.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:#777;">No driver statistics available</div>';
        return;
    }
    
    const sortedByWins = [...drivers].sort((a, b) => b.wins - a.wins).slice(0, 5);
    const sortedByPodiums = [...drivers].sort((a, b) => b.podiums - a.podiums).slice(0, 5);
    const sortedByPoles = [...drivers].sort((a, b) => b.poles - a.poles).slice(0, 5);
    const sortedByFL = [...drivers].sort((a, b) => (b.fastestLaps || 0) - (a.fastestLaps || 0)).slice(0, 5);
    const sortedByPtsPerRace = [...drivers].sort((a, b) => (b.points / 12) - (a.points / 12)).slice(0, 5);
    const sortedByAvgFinish = [...drivers].sort((a, b) => (a.avgFinish || 20) - (b.avgFinish || 20)).slice(0, 5);
    
    const getRankClass = (index) => {
        if (index === 0) return 'gold';
        if (index === 1) return 'silver';
        if (index === 2) return 'bronze';
        return '';
    };

    const renderList = (items, label) => {
        if (!items || items.length === 0) return '<div style="color:#777;text-align:center;padding:0.5rem;">No data</div>';
        return items.map((item, i) => `
            <div class="entry ${getRankClass(i)}">
                <span class="rank">${i + 1}</span>
                <span class="name">${item.name || 'Unknown'}</span>
                <span class="value">${item[label] || 0}</span>
            </div>
        `).join('');
    };

    container.innerHTML = `
        <div class="stats-leaderboard">
            <h3>Most Wins</h3>
            ${renderList(sortedByWins, 'wins')}
        </div>
        <div class="stats-leaderboard">
            <h3>Most Podiums</h3>
            ${renderList(sortedByPodiums, 'podiums')}
        </div>
        <div class="stats-leaderboard">
            <h3>Most Poles</h3>
            ${renderList(sortedByPoles, 'poles')}
        </div>
        <div class="stats-leaderboard">
            <h3>Most Fastest Laps</h3>
            ${renderList(sortedByFL, 'fastestLaps')}
        </div>
        <div class="stats-leaderboard">
            <h3>Highest Points Per Race</h3>
            ${sortedByPtsPerRace.map((item, i) => `
                <div class="entry ${getRankClass(i)}">
                    <span class="rank">${i + 1}</span>
                    <span class="name">${item.name || 'Unknown'}</span>
                    <span class="value">${(item.points / 12).toFixed(1)}</span>
                </div>
            `).join('')}
        </div>
        <div class="stats-leaderboard">
            <h3>Best Average Finish</h3>
            ${sortedByAvgFinish.map((item, i) => `
                <div class="entry ${getRankClass(i)}">
                    <span class="rank">${i + 1}</span>
                    <span class="name">${item.name || 'Unknown'}</span>
                    <span class="value">${item.avgFinish || '—'}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderAdvancedStats(data) {
    const container = document.getElementById('advancedStats');
    if (!container) return;
    
    const { results, teams, drivers, calendar } = data;
    const completedRaces = results ? results.filter(r => r.classification && r.classification.length > 0) : [];
    const champion = data.standings?.drivers?.[0];
    
    let totalDNFs = 0;
    completedRaces.forEach(race => {
        if (race.classification) {
            race.classification.forEach(r => {
                if (!r.positionNumber) totalDNFs++;
            });
        }
    });

    const totalLaps = completedRaces.reduce((sum, r) => sum + (parseInt(r.laps) || 0), 0);
    const constructors = data.standings?.constructors || [];

    container.innerHTML = `
        <div class="season-advanced-card">
            <h3>Season Overview</h3>
            <div class="stat-row">
                <span class="label">Total Races</span>
                <span class="value">${completedRaces.length}</span>
            </div>
            <div class="stat-row">
                <span class="label">Total Laps Completed</span>
                <span class="value">${totalLaps}</span>
            </div>
            <div class="stat-row">
                <span class="label">DNFs</span>
                <span class="value">${totalDNFs}</span>
            </div>
            <div class="stat-row">
                <span class="label">DNF Rate</span>
                <span class="value">${completedRaces.length > 0 ? Math.round((totalDNFs / (completedRaces.length * 20)) * 100) : 0}%</span>
            </div>
            <div class="stat-row">
                <span class="label">Attendance Rate</span>
                <span class="value">${calendar && calendar.length > 0 ? Math.round((completedRaces.length / calendar.length) * 100) : 0}%</span>
            </div>
        </div>

        <div class="season-advanced-card">
            <h3>Constructor Performance</h3>
            <div class="stat-row">
                <span class="label">Highest Scoring Constructor</span>
                <span class="value highlight">${constructors[0]?.name || '—'} (${constructors[0]?.totalPoints || 0} pts)</span>
            </div>
            <div class="stat-row">
                <span class="label">Most Wins (Constructor)</span>
                <span class="value highlight">${constructors.length > 0 ? [...constructors].sort((a, b) => b.totalWins - a.totalWins)[0]?.name || '—' : '—'} (${constructors.length > 0 ? [...constructors].sort((a, b) => b.totalWins - a.totalWins)[0]?.totalWins || 0 : 0})</span>
            </div>
            <div class="stat-row">
                <span class="label">Most Poles (Constructor)</span>
                <span class="value highlight">${constructors.length > 0 ? [...constructors].sort((a, b) => b.totalPoles - a.totalPoles)[0]?.name || '—' : '—'} (${constructors.length > 0 ? [...constructors].sort((a, b) => b.totalPoles - a.totalPoles)[0]?.totalPoles || 0 : 0})</span>
            </div>
            <div class="stat-row">
                <span class="label">Constructor Championship Gap</span>
                <span class="value highlight">${constructors[0] && constructors[1] ? constructors[0].totalPoints - constructors[1].totalPoints : 0} pts</span>
            </div>
        </div>

        <div class="season-advanced-card">
            <h3>Driver Performance Metrics</h3>
            <div class="stat-row">
                <span class="label">Highest Driver Rating</span>
                <span class="value highlight">${champion?.name || '—'} (${champion ? Math.min(100, Math.round((champion.points / 12) * 3.5 + 20)) : 0})</span>
            </div>
            <div class="stat-row">
                <span class="label">Most Consistent Finisher</span>
                <span class="value highlight">${drivers && drivers.length > 0 ? [...drivers].sort((a, b) => (b.points / 12) - (a.points / 12))[0]?.name || '—' : '—'}</span>
            </div>
            <div class="stat-row">
                <span class="label">Driver Championship Gap</span>
                <span class="value highlight">${data.standings?.drivers?.[0] && data.standings?.drivers?.[1] ? data.standings.drivers[0].points - data.standings.drivers[1].points : 0} pts</span>
            </div>
        </div>

        <div class="season-advanced-card">
            <h3>Race Statistics</h3>
            <div class="stat-row">
                <span class="label">Most Wins at Home</span>
                <span class="value highlight">${drivers && drivers.length > 0 ? [...drivers].sort((a, b) => b.wins - a.wins)[0]?.name || '—' : '—'} (${drivers && drivers.length > 0 ? [...drivers].sort((a, b) => b.wins - a.wins)[0]?.wins || 0 : 0} wins)</span>
            </div>
            <div class="stat-row">
                <span class="label">Most Different Winners</span>
                <span class="value highlight">${completedRaces.length > 0 ? new Set(completedRaces.map(r => r.classification.find(c => c.positionNumber === 1)?.driver)).size : 0}</span>
            </div>
            <div class="stat-row">
                <span class="label">Sprint Races</span>
                <span class="value highlight">${completedRaces.filter(r => r.hasSprint).length}</span>
            </div>
        </div>
    `;
}

// ========== MODAL FUNCTIONS ==========
const modal = document.getElementById('raceModal');
const modalClose = document.getElementById('modalClose');

function openModal(round) {
    const data = window.ARCHIVE_DATA;
    if (!data) {
        console.error('📄 No data available for modal');
        return;
    }
    
    const race = data.results.find(r => r.round === round);
    if (!race) {
        console.error('📄 Race not found:', round);
        return;
    }

    document.getElementById('modalTitle').textContent = race.name || `Round ${round}`;
    document.getElementById('modalSubtitle').textContent = `Round ${round} · ${race.date || 'TBD'}`;

    const winner = race.classification.find(r => r.positionNumber === 1);
    const pole = race.qualifying.find(r => r.positionNumber === 1);
    const fl = race.classification.find(r => r.hasFastestLap);
    
    document.getElementById('modalWinner').textContent = winner?.driver || '—';
    document.getElementById('modalPole').textContent = pole?.driver || '—';
    document.getElementById('modalFL').textContent = fl?.driver || '—';
    document.getElementById('modalGap').textContent = '—';

    const raceBody = document.getElementById('modalRaceBody');
    if (race.classification && race.classification.length > 0) {
        raceBody.innerHTML = race.classification.map(r => {
            const posClass = r.positionNumber === 1 ? 'pos-1' : r.positionNumber === 2 ? 'pos-2' : r.positionNumber === 3 ? 'pos-3' : '';
            const isDNF = !r.positionNumber;
            return `<tr class="${isDNF ? 'dnf' : posClass}">
                <td>${isDNF ? 'DNF' : r.positionNumber}</td>
                <td><span class="driver-dot" style="background:${r.teamColor || '#860000'};"></span>${r.driver || 'Unknown'}</td>
                <td>${r.team || '—'}</td>
                <td>${isDNF ? 0 : r.points}</td>
            </tr>`;
        }).join('');
    } else {
        raceBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#777;padding:1rem;">No race data available</td></tr>';
    }

    const qualiBody = document.getElementById('modalQualiBody');
    if (race.qualifying && race.qualifying.length > 0) {
        qualiBody.innerHTML = race.qualifying.map(r => {
            const posClass = r.positionNumber === 1 ? 'pos-1' : r.positionNumber === 2 ? 'pos-2' : r.positionNumber === 3 ? 'pos-3' : '';
            return `<tr class="${posClass}">
                <td>${r.positionNumber}</td>
                <td><span class="driver-dot" style="background:${r.teamColor || '#860000'};"></span>${r.driver || 'Unknown'}</td>
                <td>${r.team || '—'}</td>
            </tr>`;
        }).join('');
    } else {
        qualiBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#777;padding:1rem;">No qualifying data available</td></tr>';
    }

    const sprintTab = document.querySelector('.modal-session-tab[data-session="sprint"]');
    const sprintBody = document.getElementById('modalSprintBody');
    if (race.hasSprint && race.sprint && race.sprint.length > 0) {
        if (sprintTab) sprintTab.style.display = 'block';
        sprintBody.innerHTML = race.sprint.map(r => {
            const posClass = r.positionNumber === 1 ? 'pos-1' : r.positionNumber === 2 ? 'pos-2' : r.positionNumber === 3 ? 'pos-3' : '';
            const isDNF = !r.positionNumber;
            return `<tr class="${isDNF ? 'dnf' : posClass}">
                <td>${isDNF ? 'DNF' : r.positionNumber}</td>
                <td><span class="driver-dot" style="background:${r.teamColor || '#860000'};"></span>${r.driver || 'Unknown'}</td>
                <td>${r.team || '—'}</td>
                <td>${isDNF ? 0 : r.points}</td>
            </tr>`;
        }).join('');
    } else {
        if (sprintTab) sprintTab.style.display = 'none';
        sprintBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#777;padding:1rem;">No sprint race</td></tr>';
    }

    // Activate race tab by default
    document.querySelectorAll('.modal-session-tab').forEach(t => t.classList.remove('active'));
    const raceTab = document.querySelector('.modal-session-tab[data-session="race"]');
    if (raceTab) raceTab.classList.add('active');
    document.querySelectorAll('.modal-session-content').forEach(c => c.classList.remove('active'));
    const modalRace = document.getElementById('modalRace');
    if (modalRace) modalRace.classList.add('active');

    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

if (modalClose) {
    modalClose.addEventListener('click', closeModal);
}
if (modal) {
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
}
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
});

document.querySelectorAll('.modal-session-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.modal-session-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.modal-session-content').forEach(c => c.classList.remove('active'));
        const target = this.dataset.session;
        if (target === 'race') {
            const el = document.getElementById('modalRace');
            if (el) el.classList.add('active');
        } else if (target === 'qualifying') {
            const el = document.getElementById('modalQualifying');
            if (el) el.classList.add('active');
        } else if (target === 'sprint') {
            const el = document.getElementById('modalSprint');
            if (el) el.classList.add('active');
        }
    });
});