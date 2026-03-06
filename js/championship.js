// js/championship.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 Championship page loaded');
    
    // Check if we're on championship page
    if (!document.getElementById('podium-grid')) {
        console.log('🔍 Not on championship page, exiting');
        return;
    }
    
    console.log('🔍 Setting up championship page event listeners');
    
    window.addEventListener('pl21-data-ready', (e) => {
        console.log('🔍 pl21-data-ready event received in championship.js');
        const data = e.detail;
        updateChampionshipPage(data);
    });
    
    // If data already exists
    if (window.PL21_DATA) {
        console.log('🔍 Data already exists for championship:', window.PL21_DATA);
        updateChampionshipPage(window.PL21_DATA);
    }
});

let pointsChart = null;
let currentDrivers = [];
let currentConstructors = [];
let currentResults = [];
let currentCalendar = [];

function updateChampionshipPage(data) {
    console.log('🔍 updateChampionshipPage called with data');
    
    // Get drivers, constructors, results, and calendar
    currentDrivers = data.standings?.drivers || [];
    currentConstructors = data.standings?.constructors || [];
    currentResults = data.results || [];
    currentCalendar = data.calendar || [];
    
    console.log('🔍 Drivers found:', currentDrivers.length);
    console.log('🔍 Constructors found:', currentConstructors.length);
    console.log('🔍 Results found:', currentResults.length);
    console.log('🔍 Calendar found:', currentCalendar.length);
    
    if (currentDrivers.length === 0) {
        console.error('🔍 No drivers found in data');
        return;
    }
    
    // Update podium
    updatePodium(currentDrivers);
    
    // Setup view toggle
    setupViewToggle();
    
    // Setup tabs
    setupTabs(currentDrivers, currentConstructors);
    
    // Setup graph
    setupGraph(currentDrivers, currentConstructors, currentResults, currentCalendar);
    
    // Hide loading, show content
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
}

function setupViewToggle() {
    const toggleBtns = document.querySelectorAll('.view-toggle-btn');
    const tableView = document.getElementById('table-view');
    const graphView = document.getElementById('graph-view');
    
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const view = btn.dataset.view;
            
            if (view === 'table') {
                tableView.classList.add('active');
                graphView.classList.remove('active');
            } else {
                tableView.classList.remove('active');
                graphView.classList.add('active');
                // Refresh chart when switching to graph view
                if (pointsChart) {
                    pointsChart.update();
                }
            }
        });
    });
}

function setupGraph(drivers, constructors, results, calendar) {
    // Add tab switching for graph view
    const graphTabsContainer = document.createElement('div');
    graphTabsContainer.className = 'graph-tabs';
    graphTabsContainer.innerHTML = `
        <button class="graph-tab-btn active" data-graph="drivers">DRIVERS</button>
        <button class="graph-tab-btn" data-graph="constructors">CONSTRUCTORS</button>
    `;
    
    const graphHeader = document.querySelector('.graph-header');
    if (graphHeader) {
        graphHeader.appendChild(graphTabsContainer);
    }
    
    // Setup graph tab switching
    const graphTabBtns = document.querySelectorAll('.graph-tab-btn');
    graphTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            graphTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const graphType = btn.dataset.graph;
            
            if (graphType === 'drivers') {
                updatePointsGraph(drivers, results, calendar);
            } else {
                updateConstructorPointsGraph(constructors, results, calendar);
            }
        });
    });
    
    // Initial graph render - show drivers
    updatePointsGraph(drivers, results, calendar);
}

function getTeamForRound(driverName, round, results) {
    const race = results.find(r => r.round === round);
    if (!race) return null;
    
    // Check race classification
    const raceResult = race.classification?.find(r => r.driver === driverName);
    if (raceResult) return raceResult.team;
    
    // Check sprint
    if (race.hasSprint) {
        const sprintResult = race.sprint?.find(r => r.driver === driverName);
        if (sprintResult) return sprintResult.team;
    }
    
    // Check qualifying
    const qualiResult = race.qualifying?.find(r => r.driver === driverName);
    if (qualiResult) return qualiResult.team;
    
    return null;
}

function getTeamColor(teamName) {
    if (!teamName) return '#777';
    // Find team color from constructors data
    const team = currentConstructors.find(c => c.name === teamName);
    return team?.primaryColor || '#860000';
}

function calculateCumulativePoints(driverName, results, calendar) {
    // Sort all races by round (including future rounds)
    const allRaces = [...calendar].sort((a, b) => a.round - b.round);
    const completedRaces = results.filter(r => r.classification && r.classification.length > 0);
    
    let cumulativePoints = [];
    let total = 0;
    
    // Start with round 0 (pre-season)
    cumulativePoints.push({
        round: 0,
        points: 0,
        raceName: 'Start',
        team: null,
        isCompleted: true
    });
    
    // Process each round in order
    allRaces.forEach((race) => {
        const round = race.round;
        const completedRace = completedRaces.find(r => r.round === round);
        
        // If race is completed, add points
        if (completedRace) {
            // Find race result
            const raceResult = completedRace.classification.find(r => r.driver === driverName);
            if (raceResult) {
                total += raceResult.points || 0;
            }
            
            // Add sprint points if applicable
            if (completedRace.hasSprint) {
                const sprintResult = completedRace.sprint.find(r => r.driver === driverName);
                if (sprintResult) {
                    total += sprintResult.points || 0;
                }
            }
        }
        
        // Get team for this round (if available)
        const team = getTeamForRound(driverName, round, results);
        
        cumulativePoints.push({
            round: round,
            points: total,
            raceName: race.name,
            team: team,
            isCompleted: !!completedRace
        });
    });
    
    return cumulativePoints;
}

function calculateConstructorCumulativePoints(constructorName, results, calendar) {
    // Sort all races by round (including future rounds)
    const allRaces = [...calendar].sort((a, b) => a.round - b.round);
    const completedRaces = results.filter(r => r.classification && r.classification.length > 0);
    
    let cumulativePoints = [];
    let total = 0;
    
    // Start with round 0 (pre-season)
    cumulativePoints.push({
        round: 0,
        points: 0,
        raceName: 'Start',
        isCompleted: true
    });
    
    // Process each round in order
    allRaces.forEach((race) => {
        const round = race.round;
        const completedRace = completedRaces.find(r => r.round === round);
        
        // If race is completed, add points for both drivers
        if (completedRace) {
            // Find all results for this constructor in the race
            const raceResults = completedRace.classification.filter(r => r.team === constructorName);
            raceResults.forEach(result => {
                total += result.points || 0;
            });
            
            // Add sprint points if applicable
            if (completedRace.hasSprint) {
                const sprintResults = completedRace.sprint.filter(r => r.team === constructorName);
                sprintResults.forEach(result => {
                    total += result.points || 0;
                });
            }
        }
        
        cumulativePoints.push({
            round: round,
            points: total,
            raceName: race.name,
            isCompleted: !!completedRace
        });
    });
    
    return cumulativePoints;
}

function updatePointsGraph(drivers, results, calendar) {
    const ctx = document.getElementById('points-chart').getContext('2d');
    
    if (!ctx) return;
    
    // Sort all races by round and add round 0
    const allRaces = [...calendar].sort((a, b) => a.round - b.round);
    const labels = ['Start', ...allRaces.map(race => `R${race.round}`)];
    
    // Find the last completed round
    const completedRaces = results.filter(r => r.classification && r.classification.length > 0);
    const lastCompletedRound = completedRaces.length > 0 
        ? Math.max(...completedRaces.map(r => r.round)) 
        : 0;
    
    // Prepare datasets for ALL drivers
    const datasets = [];
    
    // Create a dataset for each driver
    drivers.forEach(driver => {
        const cumulativePoints = calculateCumulativePoints(driver.name, results, calendar);
        
        // Build data array with nulls for future rounds
        const data = [];
        
        // Add round 0 data
        data.push(0);
        
        // Add data for each round
        for (let i = 0; i < allRaces.length; i++) {
            const race = allRaces[i];
            const pointData = cumulativePoints.find(p => p.round === race.round);
            
            // Only show points for completed rounds, null for future rounds
            if (race.round <= lastCompletedRound) {
                data.push(pointData ? pointData.points : null);
            } else {
                data.push(null); // Future round - no data point
            }
        }
        
        datasets.push({
            label: driver.short || driver.name.split(' ').pop(),
            data: data,
            borderColor: driver.teamColor || '#860000', // Default color
            backgroundColor: 'transparent',
            tension: 0.1,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            spanGaps: false,
            segment: {
                borderColor: (ctx) => {
                    // Use p1DataIndex (the end point of the segment) to determine the team
                    const index = ctx.p1DataIndex;
                    
                    if (index === 0) {
                        return driver.teamColor || '#860000';
                    }
                    
                    // Convert to race index
                    const raceIndex = index - 1;
                    
                    if (raceIndex >= 0 && raceIndex < allRaces.length) {
                        const round = allRaces[raceIndex].round;
                        
                        // Get the team for this specific round
                        const team = getTeamForRound(driver.name, round, results);
                        
                        if (team) {
                            return getTeamColor(team);
                        }
                    }
                    
                    // Fallback to driver's current team color
                    return driver.teamColor || '#860000';
                }
            }
        });
    });
    
    // Destroy existing chart if it exists
    if (pointsChart) {
        pointsChart.destroy();
    }
    
    // Create new chart
    pointsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#fff',
                        font: {
                            size: 11,
                            family: 'Plus Jakarta Sans'
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1a1a1a',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#860000',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y + ' points';
                            
                            // Add team info if available
                            const driver = drivers.find(d => 
                                (d.short || d.name.split(' ').pop()) === context.dataset.label
                            );
                            if (driver && context.dataIndex > 0) {
                                const roundIndex = context.dataIndex - 1;
                                if (roundIndex < allRaces.length) {
                                    const round = allRaces[roundIndex]?.round;
                                    if (round) {
                                        const team = getTeamForRound(driver.name, round, results);
                                        if (team) {
                                            label += ` (${team})`;
                                        }
                                    }
                                }
                            }
                            
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#222'
                    },
                    ticks: {
                        color: '#777',
                        stepSize: 10
                    },
                    title: {
                        display: true,
                        text: 'Points',
                        color: '#777'
                    }
                },
                x: {
                    grid: {
                        color: '#222'
                    },
                    ticks: {
                        color: '#777',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 2
                },
                point: {
                    radius: 3,
                    hoverRadius: 5,
                    backgroundColor: '#fff'
                }
            }
        }
    });
}

function updateConstructorPointsGraph(constructors, results, calendar) {
    const ctx = document.getElementById('points-chart').getContext('2d');
    
    if (!ctx) return;
    
    // Sort all races by round and add round 0
    const allRaces = [...calendar].sort((a, b) => a.round - b.round);
    const labels = ['Start', ...allRaces.map(race => `R${race.round}`)];
    
    // Find the last completed round
    const completedRaces = results.filter(r => r.classification && r.classification.length > 0);
    const lastCompletedRound = completedRaces.length > 0 
        ? Math.max(...completedRaces.map(r => r.round)) 
        : 0;
    
    // Prepare datasets for ALL constructors
    const datasets = [];
    
    // Create a dataset for each constructor
    constructors.forEach(constructor => {
        const cumulativePoints = calculateConstructorCumulativePoints(constructor.name, results, calendar);
        
        // Build data array with nulls for future rounds
        const data = [];
        
        // Add round 0 data
        data.push(0);
        
        // Add data for each round
        for (let i = 0; i < allRaces.length; i++) {
            const race = allRaces[i];
            const pointData = cumulativePoints.find(p => p.round === race.round);
            
            // Only show points for completed rounds, null for future rounds
            if (race.round <= lastCompletedRound) {
                data.push(pointData ? pointData.points : null);
            } else {
                data.push(null); // Future round - no data point
            }
        }
        
        datasets.push({
            label: constructor.name.split(' ')[0] || constructor.name,
            data: data,
            borderColor: constructor.primaryColor || '#860000',
            backgroundColor: 'transparent',
            tension: 0.1,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            spanGaps: false
        });
    });
    
    // Destroy existing chart if it exists
    if (pointsChart) {
        pointsChart.destroy();
    }
    
    // Create new chart
    pointsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#fff',
                        font: {
                            size: 11,
                            family: 'Plus Jakarta Sans'
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1a1a1a',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#860000',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y + ' points';
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#222'
                    },
                    ticks: {
                        color: '#777',
                        stepSize: 10
                    },
                    title: {
                        display: true,
                        text: 'Points',
                        color: '#777'
                    }
                },
                x: {
                    grid: {
                        color: '#222'
                    },
                    ticks: {
                        color: '#777',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 2
                },
                point: {
                    radius: 3,
                    hoverRadius: 5,
                    backgroundColor: '#fff'
                }
            }
        }
    });
}

function updatePodium(drivers) {
    const podiumGrid = document.getElementById('podium-grid');
    
    if (!podiumGrid) return;
    
    if (drivers.length < 3) {
        podiumGrid.innerHTML = '<div class="podium-error">Not enough drivers for podium</div>';
        return;
    }
    
    const first = drivers[0];
    const second = drivers[1];
    const third = drivers[2];
    
    podiumGrid.innerHTML = `
        <div class="podium-item second">
            <div class="podium-position">2ND</div>
            <div class="podium-card">
                <div class="podium-number">#${second.number || '?'}</div>
                <div class="podium-name">${second.name || 'Unknown'}</div>
                <div class="podium-team" style="color: ${second.teamColor || '#860000'}">${second.currentTeam || 'Unknown'}</div>
                <div class="podium-points">${second.points || 0} PTS</div>
            </div>
        </div>
        <div class="podium-item first">
            <div class="podium-position">1ST</div>
            <div class="podium-card">
                <div class="podium-number">#${first.number || '?'}</div>
                <div class="podium-name">${first.name || 'Unknown'}</div>
                <div class="podium-team" style="color: ${first.teamColor || '#860000'}">${first.currentTeam || 'Unknown'}</div>
                <div class="podium-points">${first.points || 0} PTS</div>
            </div>
        </div>
        <div class="podium-item third">
            <div class="podium-position">3RD</div>
            <div class="podium-card">
                <div class="podium-number">#${third.number || '?'}</div>
                <div class="podium-name">${third.name || 'Unknown'}</div>
                <div class="podium-team" style="color: ${third.teamColor || '#860000'}">${third.currentTeam || 'Unknown'}</div>
                <div class="podium-points">${third.points || 0} PTS</div>
            </div>
        </div>
    `;
}

function setupTabs(drivers, constructors) {
    const standingsHeader = document.querySelector('.standings-header');
    
    if (!standingsHeader) return;
    
    // Create new tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'standings-tabs';
    tabsContainer.innerHTML = `
        <button class="tab-btn active" data-tab="drivers">DRIVERS</button>
        <button class="tab-btn" data-tab="constructors">CONSTRUCTORS</button>
    `;
    
    // Add tabs to header
    standingsHeader.appendChild(tabsContainer);
    
    // Setup tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tab = btn.dataset.tab;
            
            if (tab === 'drivers') {
                updateDriverStandings(drivers);
            } else {
                updateConstructorStandings(constructors);
            }
        });
    });
    
    // Initial display
    updateDriverStandings(drivers);
}

function updateDriverStandings(drivers) {
    const tbody = document.getElementById('standings-body');
    
    if (!tbody) return;
    
    if (drivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No driver data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = drivers.map((driver, index) => {
        const pos = index + 1;
        const posClass = pos === 1 ? 'position-1' : 
                        pos === 2 ? 'position-2' : 
                        pos === 3 ? 'position-3' : '';
        
        const points = driver.points || 0;
        const leaderPoints = drivers[0]?.points || 0;
        const gap = pos === 1 ? '—' : `+${leaderPoints - points}`;
        
        return `
            <tr>
                <td class="position-cell ${posClass}">${pos}</td>
                <td class="driver-cell">
                    <span class="driver-color-dot" style="background: ${driver.teamColor || '#860000'};"></span>
                    ${driver.name || 'Unknown'}
                </td>
                <td class="team-cell">${driver.currentTeam || 'Unknown'}</td>
                <td class="wins-cell">${driver.wins || 0}</td>
                <td class="wins-cell">${driver.podiums || 0}</td>
                <td class="wins-cell">${driver.poles || 0}</td>
                <td class="gap-cell">${gap}</td>
                <td class="points-cell">${points}</td>
            </tr>
        `;
    }).join('');
}

function updateConstructorStandings(constructors) {
    const tbody = document.getElementById('standings-body');
    
    if (!tbody) return;
    
    if (constructors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No constructor data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = constructors.map((constructor, index) => {
        const pos = index + 1;
        const posClass = pos === 1 ? 'position-1' : 
                        pos === 2 ? 'position-2' : 
                        pos === 3 ? 'position-3' : '';
        
        const points = constructor.points || 0;
        const leaderPoints = constructors[0]?.points || 0;
        const gap = pos === 1 ? '—' : `+${leaderPoints - points}`;
        
        // Get current drivers for this team
        const currentDrivers = constructor.drivers || [];
        
        let driverNames = 'TBD';
        if (Array.isArray(currentDrivers) && currentDrivers.length > 0) {
            driverNames = currentDrivers.map(d => {
                return d.short || (d.name ? d.name.split(' ').pop() : null) || d.name || 'Unknown';
            }).join(' / ');
        }
        
        return `
            <tr>
                <td class="position-cell ${posClass}">${pos}</td>
                <td class="driver-cell">
                    <span class="driver-color-dot" style="background: ${constructor.primaryColor || '#860000'};"></span>
                    ${constructor.name || 'Unknown'}
                </td>
                <td class="team-cell constructor-drivers">${driverNames}</td>
                <td class="wins-cell">${constructor.wins || 0}</td>
                <td class="wins-cell">${constructor.podiums || 0}</td>
                <td class="wins-cell">${constructor.poles || 0}</td>
                <td class="gap-cell">${gap}</td>
                <td class="points-cell">${points}</td>
            </tr>
        `;
    }).join('');
}