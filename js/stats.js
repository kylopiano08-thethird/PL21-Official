// js/stats.js
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('overview')) return;
    
    // Show loading initially
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    
    if (loading) loading.style.display = 'block';
    if (content) content.style.display = 'none';
    
    window.addEventListener('pl21-data-ready', (e) => {
        const data = e.detail;
        console.log('Stats page received data:', data);
        initializeStatsPage(data);
    });
    
    // If data already exists
    if (window.PL21_DATA) {
        console.log('Data already exists for stats:', window.PL21_DATA);
        initializeStatsPage(window.PL21_DATA);
    }
});

function initializeStatsPage(data) {
    console.log('Initializing stats page with data:', data);
    
    // Setup tab navigation
    setupTabNavigation();
    
    // Calculate derived statistics
    const statistics = calculateStatistics(data);
    console.log('Calculated statistics:', statistics);
    
    // Update overview tab
    updateOverview(statistics, data);
    
    // Update drivers tab
    updateDriversTab(data, statistics);
    
    // Update teams tab
    updateTeamsTab(data);
    
    // Update comparison tab
    updateComparisonTab(data, statistics);
    
    // Hide loading, show content
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
}

function calculateStatistics(data) {
    const { results, standings, calendar } = data;
    
    // Calculate totals
    const totalRacesCompleted = results.filter(r => r.classification && r.classification.length > 0).length;
    const totalRaces = calendar.length;
    
    // Count different winners
    const winners = new Set();
    results.forEach(race => {
        if (race.classification && race.classification.length > 0) {
            const winner = race.classification.find(r => r.positionNumber === 1);
            if (winner) winners.add(winner.driver);
        }
    });
    
    // Count pole positions by driver
    const poleCounts = {};
    results.forEach(race => {
        if (race.qualifying && race.qualifying.length > 0) {
            const poleSitter = race.qualifying.find(r => r.positionNumber === 1);
            if (poleSitter) {
                poleCounts[poleSitter.driver] = (poleCounts[poleSitter.driver] || 0) + 1;
            }
        }
    });
    
    // Find driver with most poles
    let mostPolesDriver = '';
    let mostPoles = 0;
    Object.entries(poleCounts).forEach(([driver, count]) => {
        if (count > mostPoles) {
            mostPoles = count;
            mostPolesDriver = driver;
        }
    });
    
    // Count fastest laps by driver
    const flCounts = {};
    results.forEach(race => {
        if (race.classification) {
            race.classification.forEach(result => {
                if (result.hasFastestLap) {
                    flCounts[result.driver] = (flCounts[result.driver] || 0) + 1;
                }
            });
        }
    });
    
    // Find driver with most fastest laps
    let mostFLDriver = '';
    let mostFL = 0;
    Object.entries(flCounts).forEach(([driver, count]) => {
        if (count > mostFL) {
            mostFL = count;
            mostFLDriver = driver;
        }
    });
    
    // Calculate DNFs by driver
    const dnfCounts = {};
    results.forEach(race => {
        if (race.classification) {
            race.classification.forEach(result => {
                // Check if position is null (DNF) or if rawPosition contains DNF
                if (!result.positionNumber || result.rawPosition?.toString().includes('DNF')) {
                    dnfCounts[result.driver] = (dnfCounts[result.driver] || 0) + 1;
                }
            });
        }
    });
    
    // Calculate average finishing position by driver
    const avgPositions = {};
    const positionSums = {};
    const positionCounts = {};
    
    results.forEach(race => {
        if (race.classification) {
            race.classification.forEach(result => {
                if (result.positionNumber) {
                    positionSums[result.driver] = (positionSums[result.driver] || 0) + result.positionNumber;
                    positionCounts[result.driver] = (positionCounts[result.driver] || 0) + 1;
                }
            });
        }
    });
    
    Object.keys(positionSums).forEach(driver => {
        avgPositions[driver] = (positionSums[driver] / positionCounts[driver]).toFixed(1);
    });
    
    return {
        totalRacesCompleted,
        totalRaces,
        differentWinners: winners.size,
        mostPoles: mostPoles,
        mostPolesDriver: mostPolesDriver,
        mostFL: mostFL,
        mostFLDriver: mostFLDriver,
        dnfCounts,
        avgPositions,
        poleCounts,
        flCounts
    };
}

function setupTabNavigation() {
    const navItems = document.querySelectorAll('.stats-nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            tabContents.forEach(tab => tab.classList.remove('active'));
            document.getElementById(item.dataset.tab).classList.add('active');
        });
    });
}

function updateOverview(statistics, data) {
    const { standings } = data;
    
    // Update overview cards
    const overviewGrid = document.querySelector('.overview-grid');
    if (overviewGrid) {
        overviewGrid.innerHTML = `
            <div class="overview-card">
                <div class="overview-label">Total Races</div>
                <div class="overview-value">${statistics.totalRacesCompleted}/${statistics.totalRaces}</div>
                <div class="overview-detail">${statistics.totalRaces - statistics.totalRacesCompleted} remaining</div>
            </div>
            <div class="overview-card">
                <div class="overview-label">Different Winners</div>
                <div class="overview-value">${statistics.differentWinners}</div>
                <div class="overview-detail">Most: ${standings.drivers[0]?.name || 'TBD'} (${standings.drivers[0]?.wins || 0})</div>
            </div>
            <div class="overview-card">
                <div class="overview-label">Most Pole Positions</div>
                <div class="overview-value">${statistics.mostPoles}</div>
                <div class="overview-detail">${statistics.mostPolesDriver || 'TBD'}</div>
            </div>
            <div class="overview-card">
                <div class="overview-label">Most Fastest Laps</div>
                <div class="overview-value">${statistics.mostFL}</div>
                <div class="overview-detail">${statistics.mostFLDriver || 'TBD'}</div>
            </div>
        `;
    }
    
    // Update most wins panel
    updateMostWins(standings.drivers);
    
    // Update most podiums panel
    updateMostPodiums(standings.drivers);
}

function updateMostWins(drivers) {
    const sortedByWins = [...drivers].sort((a, b) => b.wins - a.wins).slice(0, 5);
    
    const winsPanel = document.querySelector('.stat-panel:first-child .leader-table');
    if (winsPanel) {
        if (sortedByWins.length === 0) {
            winsPanel.innerHTML = '<div class="leader-row">No data available</div>';
            return;
        }
        
        winsPanel.innerHTML = sortedByWins.map((driver, index) => {
            const goldClass = index === 0 ? 'gold' : '';
            return `
                <div class="leader-row">
                    <div class="leader-info">
                        <span class="leader-pos">${index + 1}</span>
                        <span class="leader-dot" style="background: ${driver.teamColor};"></span>
                        <span class="leader-name">${driver.name}</span>
                    </div>
                    <span class="leader-value ${goldClass}">${driver.wins}</span>
                </div>
            `;
        }).join('');
    }
}

function updateMostPodiums(drivers) {
    const sortedByPodiums = [...drivers].sort((a, b) => b.podiums - a.podiums).slice(0, 5);
    
    const podiumsPanel = document.querySelector('.stat-panel:nth-child(2) .leader-table');
    if (podiumsPanel) {
        if (sortedByPodiums.length === 0) {
            podiumsPanel.innerHTML = '<div class="leader-row">No data available</div>';
            return;
        }
        
        podiumsPanel.innerHTML = sortedByPodiums.map((driver, index) => {
            return `
                <div class="leader-row">
                    <div class="leader-info">
                        <span class="leader-pos">${index + 1}</span>
                        <span class="leader-dot" style="background: ${driver.teamColor};"></span>
                        <span class="leader-name">${driver.name}</span>
                    </div>
                    <span class="leader-value">${driver.podiums}</span>
                </div>
            `;
        }).join('');
    }
}

function updateDriversTab(data, statistics) {
    const drivers = data.standings.drivers;
    const selector = document.querySelector('.driver-selector');
    const deepdiveContainer = document.getElementById('driver-deepdive-container');
    
    if (!selector || !deepdiveContainer || !drivers || drivers.length === 0) {
        console.log('No driver data available');
        return;
    }
    
    // Build driver selector (top 6 drivers)
    selector.innerHTML = drivers.slice(0, 6).map(driver => `
        <div class="driver-tab" data-driver="${driver.id}">
            <div class="driver-tab-number">#${driver.number}</div>
            <div class="driver-tab-name">${driver.short || driver.name.split(' ').pop().toUpperCase()}</div>
            <div class="driver-tab-team" style="color: ${driver.teamColor};">${driver.currentTeam.split(' ')[0].toUpperCase()}</div>
        </div>
    `).join('');
    
    // Build driver profiles with comprehensive stats
    deepdiveContainer.innerHTML = drivers.slice(0, 6).map((driver, idx) => {
        const display = idx === 0 ? 'block' : 'none';
        
        // Calculate comprehensive stats for this driver
        const driverStats = calculateDriverDetailedStats(driver, data, statistics);
        
        // Get rating tier and color
        const ratingInfo = getRatingTier(driverStats.driverRating);
        
        return `
            <div id="driver-${driver.id}" class="driver-deepdive" style="display: ${display}">
                <!-- Driver Header with Key Info -->
                <div class="driver-header-compact">
                    <div class="driver-header-left">
                        <div class="driver-number-large" style="background: ${driver.teamColor};">${driver.number}</div>
                        <div class="driver-name-title">
                            <h2>${driver.name}</h2>
                            <div class="driver-team-badge" style="background: ${driver.teamColor}20; color: ${driver.teamColor};">${driver.currentTeam}</div>
                        </div>
                    </div>
                    <div class="driver-rating-card" style="background: linear-gradient(135deg, ${driver.teamColor}20, ${driver.teamColor}05); border-left: 4px solid ${driver.teamColor};">
                        <div class="rating-label">DRIVER RATING</div>
                        <div class="rating-value" style="color: ${ratingInfo.color};">${driverStats.driverRating}</div>
                        <div class="rating-tier" style="color: ${ratingInfo.color};">${ratingInfo.tier}</div>
                        <div class="rating-scores">
                            <span>P: ${driverStats.performanceScore}</span>
                            <span>C: ${driverStats.consistencyScore}</span>
                        </div>
                    </div>
                </div>

                <!-- Key Stats Grid - Most Important Info Up Front -->
                <div class="key-stats-grid">
                    <div class="key-stat-item">
                        <div class="key-stat-label">Championship</div>
                        <div class="key-stat-value">${driver.pos}${getOrdinalSuffix(driver.pos)}</div>
                        <div class="key-stat-detail">${driver.points} PTS</div>
                    </div>
                    <div class="key-stat-item">
                        <div class="key-stat-label">Races</div>
                        <div class="key-stat-value">${driverStats.racesAttended}</div>
                        <div class="key-stat-detail">${statistics.totalRacesCompleted} total</div>
                    </div>
                    <div class="key-stat-item">
                        <div class="key-stat-label">Pts/Race</div>
                        <div class="key-stat-value">${driverStats.pointsPerRace}</div>
                        <div class="key-stat-detail">${driver.points} total</div>
                    </div>
                    <div class="key-stat-item">
                        <div class="key-stat-label">Avg Finish</div>
                        <div class="key-stat-value">${driverStats.avgFinish}</div>
                        <div class="key-stat-detail">Best: ${driverStats.highestFinish}</div>
                    </div>
                </div>

                <!-- Performance Metrics Grid -->
                <div class="performance-metrics">
                    <!-- Wins/Podiums/Poles Section -->
                    <div class="metrics-card">
                        <h4 class="metrics-title">RACE ACHIEVEMENTS</h4>
                        <div class="metrics-row">
                            <div class="metric-badge wins-badge">
                                <span class="metric-icon">🏆</span>
                                <span class="metric-value">${driver.wins}</span>
                                <span class="metric-label">Wins</span>
                            </div>
                            <div class="metric-badge podiums-badge">
                                <span class="metric-icon">🥉</span>
                                <span class="metric-value">${driver.podiums}</span>
                                <span class="metric-label">Podiums</span>
                            </div>
                            <div class="metric-badge poles-badge">
                                <span class="metric-icon">⚡</span>
                                <span class="metric-value">${driver.poles}</span>
                                <span class="metric-label">Poles</span>
                            </div>
                            <div class="metric-badge fl-badge">
                                <span class="metric-icon">⏱️</span>
                                <span class="metric-value">${driverStats.fastestLaps}</span>
                                <span class="metric-label">Fastest Laps</span>
                            </div>
                        </div>
                    </div>

                    <!-- Advanced Stats Section -->
                    <div class="metrics-card">
                        <h4 class="metrics-title">PERFORMANCE METRICS</h4>
                        <div class="advanced-stats-grid">
                            <div class="advanced-stat">
                                <span class="advanced-label">Race Pace</span>
                                <div class="progress-bar" style="background: ${driver.teamColor}20;">
                                    <div class="progress-fill" style="width: ${driverStats.performanceScore}%; background: ${driver.teamColor};"></div>
                                </div>
                                <span class="advanced-value">${driverStats.performanceScore}</span>
                            </div>
                            <div class="advanced-stat">
                                <span class="advanced-label">Reliability</span>
                                <div class="progress-bar" style="background: ${driver.teamColor}20;">
                                    <div class="progress-fill" style="width: ${driverStats.consistencyScore}%; background: ${driver.teamColor};"></div>
                                </div>
                                <span class="advanced-value">${driverStats.consistencyScore}</span>
                            </div>
                            <div class="advanced-stat">
                                <span class="advanced-label">Attendance</span>
                                <div class="progress-bar" style="background: ${driver.teamColor}20;">
                                    <div class="progress-fill" style="width: ${driverStats.attendanceRate}%; background: ${driver.teamColor};"></div>
                                </div>
                                <span class="advanced-value">${driverStats.attendanceRate}%</span>
                            </div>
                        </div>
                    </div>

                    <!-- Additional Stats Grid -->
                    <div class="metrics-card">
                        <h4 class="metrics-title">ADDITIONAL STATS</h4>
                        <div class="stats-grid-compact">
                            <div class="compact-stat">
                                <span class="compact-label">Avg Quali</span>
                                <span class="compact-value">${driverStats.avgQuali}</span>
                            </div>
                            <div class="compact-stat">
                                <span class="compact-label">Pos Δ</span>
                                <span class="compact-value ${driverStats.avgPosGain >= 0 ? 'positive' : 'negative'}">${driverStats.avgPosGain > 0 ? '+' : ''}${driverStats.avgPosGain}</span>
                            </div>
                            <div class="compact-stat">
                                <span class="compact-label">Podium Rate</span>
                                <span class="compact-value">${driverStats.podiumRate}%</span>
                            </div>
                            <div class="compact-stat">
                                <span class="compact-label">DNFs</span>
                                <span class="compact-value dnf-count">${driverStats.dnfCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Race History with Sprint Results -->
                <div class="race-history-compact">
                    <h4 class="history-title">RECENT RACE HISTORY</h4>
                    <div class="history-grid">
                        ${generateCompactRaceHistory(driver, data.results)}
                    </div>
                </div>
                
                <!-- Rating Explanation Tooltip -->
                <div class="rating-explanation">
                    <span class="rating-explanation-icon">ⓘ</span>
                    <span class="rating-explanation-text">${ratingInfo.explanation}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Setup driver tab switching
    setupDriverTabs();
}

// Function to get rating tier and color based on score
function getRatingTier(score) {
    if (score >= 95) {
        return {
            tier: 'Championship Winner',
            color: '#ffd700',
            explanation: 'Dominant performance, elite consistency'
        };
    } else if (score >= 85) {
        return {
            tier: 'Front-Runner',
            color: '#c0c0c0',
            explanation: 'Regular podium contender'
        };
    } else if (score >= 70) {
        return {
            tier: 'Solid Midfield',
            color: '#cd7f32',
            explanation: 'Consistent points scorer'
        };
    } else if (score >= 50) {
        return {
            tier: 'Developing',
            color: '#4169e1',
            explanation: 'Shows potential, needs consistency'
        };
    } else {
        return {
            tier: 'Backmarker',
            color: '#860000',
            explanation: 'Struggling for pace or attendance'
        };
    }
}

// BALANCED driver statistics calculation
function calculateDriverDetailedStats(driver, data, statistics) {
    const results = data.results;
    const totalRacesCompleted = statistics.totalRacesCompleted;
    
    // Count races attended (where driver appears in classification)
    let racesAttended = 0;
    let totalPoints = 0;
    let totalFinishPosition = 0;
    let totalQualiPosition = 0;
    let qualiCount = 0;
    let dnfCount = 0;
    let fastestLaps = 0;
    let highestFinish = 20; // Start high to find lowest (best) finish
    let wins = 0;
    let podiums = 0;
    
    // Track positions for gain/loss calculation
    let totalPosGain = 0;
    let racesWithPosData = 0;
    
    // Track qualifying vs race consistency
    let qualiRaceDiffTotal = 0;
    let qualiRaceDiffCount = 0;
    
    results.forEach(race => {
        // Check race classification
        const raceResult = race.classification.find(r => r.driver === driver.name);
        if (raceResult) {
            racesAttended++;
            totalPoints += raceResult.points || 0;
            
            // Count wins and podiums
            if (raceResult.positionNumber === 1) wins++;
            if (raceResult.positionNumber && raceResult.positionNumber <= 3) podiums++;
            
            // Finish position
            if (raceResult.positionNumber) {
                totalFinishPosition += raceResult.positionNumber;
                if (raceResult.positionNumber < highestFinish) {
                    highestFinish = raceResult.positionNumber;
                }
            }
            
            // Check for DNF (explicit DNF text or null position)
            if (!raceResult.positionNumber || 
                raceResult.rawPosition?.toString().toUpperCase().includes('DNF') ||
                raceResult.rawPosition?.toString().toUpperCase() === 'DNF') {
                dnfCount++;
            }
            
            // Fastest lap
            if (raceResult.hasFastestLap) {
                fastestLaps++;
            }
        }
        
        // Check sprint results for points and DNFs
        if (race.hasSprint) {
            const sprintResult = race.sprint.find(r => r.driver === driver.name);
            if (sprintResult) {
                totalPoints += sprintResult.points || 0;
                if (!sprintResult.positionNumber || 
                    sprintResult.rawPosition?.toString().toUpperCase().includes('DNF')) {
                    dnfCount++;
                }
            }
        }
        
        // Qualifying position
        const qualiResult = race.qualifying.find(r => r.driver === driver.name);
        if (qualiResult && qualiResult.positionNumber) {
            totalQualiPosition += qualiResult.positionNumber;
            qualiCount++;
        }
        
        // Calculate positions gained/lost (race finish vs quali)
        if (raceResult && raceResult.positionNumber && qualiResult && qualiResult.positionNumber) {
            const posGain = qualiResult.positionNumber - raceResult.positionNumber;
            totalPosGain += posGain;
            racesWithPosData++;
            
            // Track quali vs race consistency (smaller diff = more consistent)
            const diff = Math.abs(qualiResult.positionNumber - raceResult.positionNumber);
            qualiRaceDiffTotal += diff;
            qualiRaceDiffCount++;
        }
    });
    
    // Calculate averages
    const avgFinish = racesAttended > 0 ? (totalFinishPosition / racesAttended).toFixed(1) : '—';
    const avgQuali = qualiCount > 0 ? (totalQualiPosition / qualiCount).toFixed(1) : '—';
    const pointsPerRace = racesAttended > 0 ? (totalPoints / racesAttended).toFixed(1) : '0';
    const podiumRate = racesAttended > 0 ? Math.round((podiums / racesAttended) * 100) : 0;
    const avgPosGain = racesWithPosData > 0 ? (totalPosGain / racesWithPosData).toFixed(1) : '0';
    
    // Calculate attendance rate
    const attendanceRate = totalRacesCompleted > 0 
        ? Math.round((racesAttended / totalRacesCompleted) * 100) 
        : 0;
    
    // ===== BALANCED PERFORMANCE SCORE (70% weight) =====
    let performanceScore = 40; // Start at 40 (base for backmarkers)
    
    // Points per race contribution (max 30 points)
    const ptsPerRaceNum = parseFloat(pointsPerRace);
    if (ptsPerRaceNum >= 25) performanceScore += 30;
    else if (ptsPerRaceNum >= 22) performanceScore += 28;
    else if (ptsPerRaceNum >= 20) performanceScore += 26;
    else if (ptsPerRaceNum >= 18) performanceScore += 23;
    else if (ptsPerRaceNum >= 16) performanceScore += 20;
    else if (ptsPerRaceNum >= 14) performanceScore += 17;
    else if (ptsPerRaceNum >= 12) performanceScore += 14;
    else if (ptsPerRaceNum >= 10) performanceScore += 11;
    else if (ptsPerRaceNum >= 8) performanceScore += 8;
    else if (ptsPerRaceNum >= 6) performanceScore += 5;
    else if (ptsPerRaceNum >= 4) performanceScore += 3;
    else if (ptsPerRaceNum >= 2) performanceScore += 1;
    else if (ptsPerRaceNum > 0) performanceScore += 0.5;
    
    // Achievement bonuses (max 20 points combined)
    performanceScore += Math.min(12, wins * 4);  // +4 per win, max 12
    performanceScore += Math.min(8, (podiums - wins) * 2);  // +2 per non-win podium, max 8
    
    // Fastest lap bonus (max 5 points)
    performanceScore += Math.min(5, fastestLaps * 1);  // +1 per FL, max 5
    
    // Poles bonus (max 5 points)
    performanceScore += Math.min(5, driver.poles * 1);  // +1 per pole, max 5
    
    // Qualifying performance bonus (max 15 points)
    if (avgQuali !== '—') {
        const avgQualiNum = parseFloat(avgQuali);
        if (avgQualiNum <= 2) performanceScore += 15;
        else if (avgQualiNum <= 3) performanceScore += 13;
        else if (avgQualiNum <= 4) performanceScore += 11;
        else if (avgQualiNum <= 5) performanceScore += 9;
        else if (avgQualiNum <= 6) performanceScore += 7;
        else if (avgQualiNum <= 7) performanceScore += 5;
        else if (avgQualiNum <= 8) performanceScore += 4;
        else if (avgQualiNum <= 9) performanceScore += 3;
        else if (avgQualiNum <= 10) performanceScore += 2;
        else if (avgQualiNum <= 12) performanceScore += 1;
    }
    
    // Average finish position bonus (max 20 points)
    if (avgFinish !== '—') {
        const avgFinishNum = parseFloat(avgFinish);
        if (avgFinishNum <= 2) performanceScore += 20;
        else if (avgFinishNum <= 3) performanceScore += 17;
        else if (avgFinishNum <= 4) performanceScore += 14;
        else if (avgFinishNum <= 5) performanceScore += 11;
        else if (avgFinishNum <= 6) performanceScore += 8;
        else if (avgFinishNum <= 7) performanceScore += 6;
        else if (avgFinishNum <= 8) performanceScore += 4;
        else if (avgFinishNum <= 9) performanceScore += 3;
        else if (avgFinishNum <= 10) performanceScore += 2;
        else if (avgFinishNum <= 12) performanceScore += 1;
    }
    
    // Ensure within 0-100 range
    performanceScore = Math.max(0, Math.min(100, Math.round(performanceScore)));
    
    // ===== BALANCED CONSISTENCY SCORE (30% weight) =====
    let consistencyScore = 60; // Start at 60 (baseline)
    
    // DNF penalty
    consistencyScore -= dnfCount * 6;  // -6 per DNF
    
    // Quali vs Race consistency (max +/- 12)
    if (qualiRaceDiffCount > 0) {
        const avgDiff = qualiRaceDiffTotal / qualiRaceDiffCount;
        if (avgDiff <= 0.5) consistencyScore += 12;
        else if (avgDiff <= 1) consistencyScore += 10;
        else if (avgDiff <= 1.5) consistencyScore += 8;
        else if (avgDiff <= 2) consistencyScore += 6;
        else if (avgDiff <= 2.5) consistencyScore += 4;
        else if (avgDiff <= 3) consistencyScore += 2;
        else if (avgDiff <= 3.5) consistencyScore += 1;
        else if (avgDiff >= 6) consistencyScore -= 8;
        else if (avgDiff >= 5) consistencyScore -= 5;
        else if (avgDiff >= 4) consistencyScore -= 2;
    }
    
    // Points finish rate (max +15)
    const pointsFinishes = results.reduce((count, race) => {
        const result = race.classification.find(r => r.driver === driver.name);
        return count + (result && result.points > 0 ? 1 : 0);
    }, 0);
    
    const pointsFinishRate = racesAttended > 0 ? (pointsFinishes / racesAttended) : 0;
    if (pointsFinishRate >= 0.95) consistencyScore += 15;
    else if (pointsFinishRate >= 0.9) consistencyScore += 13;
    else if (pointsFinishRate >= 0.85) consistencyScore += 11;
    else if (pointsFinishRate >= 0.8) consistencyScore += 9;
    else if (pointsFinishRate >= 0.75) consistencyScore += 7;
    else if (pointsFinishRate >= 0.7) consistencyScore += 5;
    else if (pointsFinishRate >= 0.6) consistencyScore += 3;
    else if (pointsFinishRate >= 0.5) consistencyScore += 1;
    
    // Attendance bonus (max +8)
    if (attendanceRate >= 100) consistencyScore += 8;
    else if (attendanceRate >= 95) consistencyScore += 7;
    else if (attendanceRate >= 90) consistencyScore += 6;
    else if (attendanceRate >= 85) consistencyScore += 5;
    else if (attendanceRate >= 80) consistencyScore += 4;
    else if (attendanceRate >= 75) consistencyScore += 3;
    else if (attendanceRate >= 70) consistencyScore += 2;
    else if (attendanceRate >= 65) consistencyScore += 1;
    
    // Ensure within 0-100 range
    consistencyScore = Math.max(0, Math.min(100, Math.round(consistencyScore)));
    
    // ===== DRIVER RATING =====
    // Weighted average of performance (70%) and consistency (30%)
    let driverRating = (performanceScore * 0.7) + (consistencyScore * 0.3);
    
    // Apply mild attendance penalty (max 15% penalty for missing races)
    driverRating = driverRating * (0.85 + (attendanceRate / 100) * 0.15);
    
    // Round to nearest integer
    driverRating = Math.round(driverRating);
    
    return {
        racesAttended,
        pointsPerRace,
        avgFinish,
        avgQuali,
        dnfCount,
        fastestLaps,
        wins,
        podiums,
        highestFinish: highestFinish === 20 ? '—' : (highestFinish === 1 ? '1st' : highestFinish === 2 ? '2nd' : highestFinish === 3 ? '3rd' : highestFinish + 'th'),
        avgPosGain: parseFloat(avgPosGain),
        podiumRate,
        attendanceRate,
        performanceScore,
        consistencyScore,
        driverRating
    };
}

// Updated function for compact race history display that properly includes sprint results
function generateCompactRaceHistory(driver, results) {
    const completedRaces = results.filter(r => r.classification && r.classification.length > 0);
    const lastRaces = completedRaces.slice(-6); // Show last 6 races
    
    if (lastRaces.length === 0) {
        return '<div class="no-history">No recent races</div>';
    }
    
    let historyHTML = '';
    
    lastRaces.forEach(race => {
        const raceResult = race.classification.find(r => r.driver === driver.name);
        const sprintResult = race.hasSprint ? race.sprint.find(r => r.driver === driver.name) : null;
        
        // Race result display
        if (raceResult) {
            const posClass = raceResult.positionNumber === 1 ? 'pos-1' : 
                            raceResult.positionNumber === 2 ? 'pos-2' : 
                            raceResult.positionNumber === 3 ? 'pos-3' : '';
            
            let posText = '';
            if (!raceResult.positionNumber) {
                posText = 'DNF';
            } else if (raceResult.positionNumber === 1) {
                posText = '1st';
            } else if (raceResult.positionNumber === 2) {
                posText = '2nd';
            } else if (raceResult.positionNumber === 3) {
                posText = '3rd';
            } else {
                posText = `${raceResult.positionNumber}th`;
            }
            
            const flIndicator = raceResult.hasFastestLap ? '★' : '';
            
            historyHTML += `
                <div class="history-item race-result">
                    <span class="history-round">R${race.round}</span>
                    <span class="history-pos ${posClass}">${posText}${flIndicator ? ' ' + flIndicator : ''}</span>
                </div>
            `;
        }
        
        // Sprint result display (if exists)
        if (sprintResult) {
            const posClass = sprintResult.positionNumber === 1 ? 'pos-1' : 
                            sprintResult.positionNumber === 2 ? 'pos-2' : 
                            sprintResult.positionNumber === 3 ? 'pos-3' : '';
            
            let posText = '';
            if (!sprintResult.positionNumber) {
                posText = 'DNF';
            } else if (sprintResult.positionNumber === 1) {
                posText = '1st';
            } else if (sprintResult.positionNumber === 2) {
                posText = '2nd';
            } else if (sprintResult.positionNumber === 3) {
                posText = '3rd';
            } else {
                posText = `${sprintResult.positionNumber}th`;
            }
            
            historyHTML += `
                <div class="history-item sprint-result">
                    <span class="history-round">R${race.round}S</span>
                    <span class="history-pos ${posClass}">⚡ ${posText}</span>
                </div>
            `;
        }
        
        // If no results at all, show DNS
        if (!raceResult && !sprintResult) {
            historyHTML += `
                <div class="history-item absent">
                    <span class="history-round">R${race.round}</span>
                    <span class="history-pos">DNS</span>
                </div>
            `;
        }
    });
    
    return historyHTML;
}

function getOrdinalSuffix(num) {
    if (num === 1) return 'st';
    if (num === 2) return 'nd';
    if (num === 3) return 'rd';
    return 'th';
}

function setupDriverTabs() {
    const driverTabs = document.querySelectorAll('.driver-tab');
    const driverProfiles = document.querySelectorAll('.driver-deepdive');
    
    driverTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            driverTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const driverId = tab.dataset.driver;
            driverProfiles.forEach(profile => profile.style.display = 'none');
            const targetProfile = document.getElementById(`driver-${driverId}`);
            if (targetProfile) targetProfile.style.display = 'block';
        });
    });
    
    // Activate first tab by default
    if (driverTabs.length > 0) {
        driverTabs[0].classList.add('active');
    }
}

// Updated updateTeamsTab function with comprehensive team stats
function updateTeamsTab(data) {
    const teams = data.standings.constructors;
    const selector = document.querySelector('.team-selector');
    const profilesContainer = document.getElementById('team-profiles-container');
    
    if (!selector || !profilesContainer || !teams || teams.length === 0) {
        console.log('No team data available');
        return;
    }
    
    // Build team selector
    selector.innerHTML = teams.slice(0, 4).map(team => `
        <div class="team-tab" data-team="${team.id}">
            <div class="team-tab-name" style="color: ${team.primaryColor}">${team.name.split(' ')[0].toUpperCase()}</div>
            <div class="team-tab-points">${team.points} pts</div>
        </div>
    `).join('');
    
    // Build team profiles with comprehensive stats
    profilesContainer.innerHTML = teams.slice(0, 4).map((team, idx) => {
        const display = idx === 0 ? 'block' : 'none';
        
        // Calculate comprehensive team stats
        const teamStats = calculateTeamDetailedStats(team, data);
        
        return `
            <div id="team-${team.id}" class="team-profile" style="display: ${display}">
                <!-- Team Header -->
                <div class="team-header">
                    <div class="team-logo" style="background: ${team.primaryColor};">${team.name.split(' ')[0].substring(0, 2).toUpperCase()}</div>
                    <div class="team-info">
                        <h2 style="color: ${team.primaryColor}">${team.name}</h2>
                        <div class="team-quick-stats">
                            <div class="quick-stat">
                                <span class="quick-stat-label">Championship</span>
                                <span class="quick-stat-value">${team.pos}${getOrdinalSuffix(team.pos)}</span>
                            </div>
                            <div class="quick-stat">
                                <span class="quick-stat-label">Points</span>
                                <span class="quick-stat-value">${team.points}</span>
                            </div>
                            <div class="quick-stat">
                                <span class="quick-stat-label">Races</span>
                                <span class="quick-stat-value">${teamStats.racesAttended}</span>
                            </div>
                            <div class="quick-stat">
                                <span class="quick-stat-label">Pts/Race</span>
                                <span class="quick-stat-value">${teamStats.pointsPerRace}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Key Stats Grid -->
                <div class="team-key-stats">
                    <div class="team-key-stat-card">
                        <div class="team-key-stat-label">Wins</div>
                        <div class="team-key-stat-value">${teamStats.wins}</div>
                        <div class="team-key-stat-detail">Win Rate: ${teamStats.winRate}%</div>
                    </div>
                    <div class="team-key-stat-card">
                        <div class="team-key-stat-label">Podiums</div>
                        <div class="team-key-stat-value">${teamStats.podiums}</div>
                        <div class="team-key-stat-detail">Podium Rate: ${teamStats.podiumRate}%</div>
                    </div>
                    <div class="team-key-stat-card">
                        <div class="team-key-stat-label">Poles</div>
                        <div class="team-key-stat-value">${teamStats.poles}</div>
                        <div class="team-key-stat-detail">FLs: ${teamStats.fastestLaps}</div>
                    </div>
                    <div class="team-key-stat-card">
                        <div class="team-key-stat-label">DNFs</div>
                        <div class="team-key-stat-value">${teamStats.totalDNFs}</div>
                        <div class="team-key-stat-detail">Reliability: ${teamStats.reliability}%</div>
                    </div>
                </div>

                <!-- Performance Metrics -->
                <div class="team-performance-metrics">
                    <div class="team-metrics-card">
                        <h4 class="team-metrics-title">PERFORMANCE METRICS</h4>
                        <div class="team-metrics-grid">
                            <div class="team-metric">
                                <span class="team-metric-label">Avg Finish</span>
                                <span class="team-metric-value">${teamStats.avgFinish}</span>
                            </div>
                            <div class="team-metric">
                                <span class="team-metric-label">Avg Quali</span>
                                <span class="team-metric-value">${teamStats.avgQuali}</span>
                            </div>
                            <div class="team-metric">
                                <span class="team-metric-label">Best Finish</span>
                                <span class="team-metric-value">${teamStats.bestFinish}</span>
                            </div>
                            <div class="team-metric">
                                <span class="team-metric-label">Best Quali</span>
                                <span class="team-metric-value">${teamStats.bestQuali}</span>
                            </div>
                        </div>
                    </div>

                    <div class="team-metrics-card">
                        <h4 class="team-metrics-title">DRIVER CONTRIBUTION</h4>
                        <div class="driver-contribution">
                            ${generateDriverContribution(team, data)}
                        </div>
                    </div>
                </div>

                <!-- Advanced Stats -->
                <div class="team-advanced-stats">
                    <div class="team-advanced-card">
                        <div class="team-advanced-header">
                            <span class="team-advanced-title">Points Distribution</span>
                        </div>
                        <div class="team-advanced-content">
                            <div class="points-distribution">
                                ${generatePointsDistribution(team, data)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="team-advanced-card">
                        <div class="team-advanced-header">
                            <span class="team-advanced-title">Performance vs Target</span>
                        </div>
                        <div class="team-advanced-content">
                            <div class="performance-bars">
                                <div class="perf-bar-item">
                                    <span class="perf-bar-label">Race Pace</span>
                                    <div class="perf-bar-container">
                                        <div class="perf-bar-fill" style="width: ${teamStats.performanceScore}%; background: ${team.primaryColor};"></div>
                                    </div>
                                    <span class="perf-bar-value">${teamStats.performanceScore}</span>
                                </div>
                                <div class="perf-bar-item">
                                    <span class="perf-bar-label">Reliability</span>
                                    <div class="perf-bar-container">
                                        <div class="perf-bar-fill" style="width: ${teamStats.reliability}%; background: ${team.primaryColor};"></div>
                                    </div>
                                    <span class="perf-bar-value">${teamStats.reliability}%</span>
                                </div>
                                <div class="perf-bar-item">
                                    <span class="perf-bar-label">Consistency</span>
                                    <div class="perf-bar-container">
                                        <div class="perf-bar-fill" style="width: ${teamStats.consistencyScore}%; background: ${team.primaryColor};"></div>
                                    </div>
                                    <span class="perf-bar-value">${teamStats.consistencyScore}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Team Race History -->
                <div class="team-race-history">
                    <h4 class="history-title">RECENT RACE HISTORY</h4>
                    <div class="team-history-grid">
                        ${generateTeamRaceHistory(team, data.results)}
                    </div>
                </div>

                <!-- Head to Head Battle -->
                <div class="head-to-head">
                    ${generateTeamComparison(team, data)}
                </div>
            </div>
        `;
    }).join('');
    
    // Setup team tab switching
    setupTeamTabs();
}

// Updated calculateTeamDetailedStats function - only counts results for the team
function calculateTeamDetailedStats(team, data) {
    const results = data.results;
    const completedRaces = results.filter(r => r.classification && r.classification.length > 0);
    
    // Track team performance
    let racesAttended = 0;
    let totalPoints = 0;
    let totalFinishPosition = 0;
    let finishCount = 0;
    let totalQualiPosition = 0;
    let qualiCount = 0;
    let totalDNFs = 0;
    let bestFinish = 20;
    let bestQuali = 20;
    let pointsByRound = {};
    let wins = 0;
    let podiums = 0;
    let poles = 0;
    let fastestLaps = 0;
    
    // Track which rounds the team participated in
    const teamRounds = new Set();
    
    completedRaces.forEach(race => {
        const round = race.round;
        let teamParticipated = false;
        let roundPoints = 0;
        
        // Check race results for this team
        const raceResults = race.classification.filter(r => r.team === team.name);
        if (raceResults.length > 0) {
            teamParticipated = true;
            
            raceResults.forEach(result => {
                // Points
                totalPoints += result.points || 0;
                roundPoints += result.points || 0;
                
                // Finish position
                if (result.positionNumber) {
                    totalFinishPosition += result.positionNumber;
                    finishCount++;
                    
                    if (result.positionNumber < bestFinish) {
                        bestFinish = result.positionNumber;
                    }
                    
                    // Wins and podiums
                    if (result.positionNumber === 1) wins++;
                    if (result.positionNumber <= 3) podiums++;
                }
                
                // DNFs
                if (!result.positionNumber || result.rawPosition?.toString().toUpperCase().includes('DNF')) {
                    totalDNFs++;
                }
                
                // Fastest laps
                if (result.hasFastestLap) {
                    fastestLaps++;
                }
            });
        }
        
        // Check sprint results for this team
        if (race.hasSprint) {
            const sprintResults = race.sprint.filter(r => r.team === team.name);
            if (sprintResults.length > 0) {
                teamParticipated = true;
                
                sprintResults.forEach(result => {
                    totalPoints += result.points || 0;
                    roundPoints += result.points || 0;
                    
                    // Check for DNFs in sprint
                    if (!result.positionNumber || result.rawPosition?.toString().toUpperCase().includes('DNF')) {
                        totalDNFs++;
                    }
                });
            }
        }
        
        // Check qualifying results for poles
        const qualiResults = race.qualifying.filter(r => r.team === team.name);
        if (qualiResults.length > 0) {
            teamParticipated = true;
            
            qualiResults.forEach(result => {
                if (result.positionNumber) {
                    totalQualiPosition += result.positionNumber;
                    qualiCount++;
                    
                    if (result.positionNumber < bestQuali) {
                        bestQuali = result.positionNumber;
                    }
                    
                    // Poles
                    if (result.positionNumber === 1) poles++;
                }
            });
        }
        
        if (teamParticipated) {
            racesAttended++;
            teamRounds.add(round);
            pointsByRound[round] = roundPoints;
        }
    });
    
    // Calculate averages
    const avgFinish = finishCount > 0 ? (totalFinishPosition / finishCount).toFixed(1) : '—';
    const avgQuali = qualiCount > 0 ? (totalQualiPosition / qualiCount).toFixed(1) : '—';
    const pointsPerRace = racesAttended > 0 ? (totalPoints / racesAttended).toFixed(1) : '0';
    
    // Calculate rates based on actual team participation
    const winRate = racesAttended > 0 ? Math.round((wins / racesAttended) * 100) : 0;
    const podiumRate = racesAttended > 0 ? Math.round((podiums / racesAttended) * 100) : 0;
    
    // Reliability: (total possible finishes - DNFs) / total possible finishes
    const totalPossibleFinishes = finishCount + totalDNFs;
    const reliability = totalPossibleFinishes > 0 
        ? Math.round((totalPossibleFinishes - totalDNFs) / totalPossibleFinishes * 100) 
        : 100;
    
    // Calculate points distribution consistency
    const pointsValues = Object.values(pointsByRound);
    const avgPointsPerRound = pointsValues.length > 0 
        ? pointsValues.reduce((a, b) => a + b, 0) / pointsValues.length 
        : 0;
    
    let pointsVariance = 0;
    if (pointsValues.length > 1) {
        const squaredDiffs = pointsValues.map(p => Math.pow(p - avgPointsPerRound, 2));
        pointsVariance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / pointsValues.length);
    }
    
    // Performance Score (0-100)
    const performanceScore = Math.min(100, Math.round(
        (pointsPerRace / 25) * 60 +  // Points per race contribution
        (winRate * 0.3) +             // Win rate contribution
        (podiumRate * 0.2) +          // Podium rate contribution
        (poles * 2)                    // Pole bonus
    ));
    
    // Consistency Score (0-100)
    const consistencyScore = Math.max(0, Math.min(100, 
        Math.round(
            70 -                       // Base
            (pointsVariance * 1.5) -    // Penalty for inconsistent scoring
            (totalDNFs * 8) +           // Penalty for DNFs
            (reliability * 0.2)          // Bonus for reliability
        )
    ));
    
    return {
        racesAttended,
        pointsPerRace,
        avgFinish,
        avgQuali,
        bestFinish: bestFinish === 20 ? '—' : (bestFinish === 1 ? '1st' : bestFinish === 2 ? '2nd' : bestFinish === 3 ? '3rd' : bestFinish + 'th'),
        bestQuali: bestQuali === 20 ? '—' : (bestQuali === 1 ? '1st' : bestQuali === 2 ? '2nd' : bestQuali === 3 ? '3rd' : bestQuali + 'th'),
        totalDNFs,
        winRate,
        podiumRate,
        reliability,
        pointsVariance: pointsVariance.toFixed(1),
        performanceScore,
        consistencyScore,
        wins,
        podiums,
        poles,
        fastestLaps,
        pointsByRound
    };
}

// Updated generateDriverContribution function - shows all drivers who scored for the team
function generateDriverContribution(team, data) {
    const results = data.results;
    
    // Find all drivers who have ever scored points for this team
    const driverPoints = {};
    let totalTeamPoints = 0;
    
    // Go through all results and find any driver who scored for this team
    results.forEach(race => {
        // Race results
        race.classification.forEach(result => {
            if (result.team === team.name) {
                if (!driverPoints[result.driver]) {
                    driverPoints[result.driver] = 0;
                }
                driverPoints[result.driver] += result.points || 0;
                totalTeamPoints += result.points || 0;
            }
        });
        
        // Sprint results
        if (race.hasSprint) {
            race.sprint.forEach(result => {
                if (result.team === team.name) {
                    if (!driverPoints[result.driver]) {
                        driverPoints[result.driver] = 0;
                    }
                    driverPoints[result.driver] += result.points || 0;
                    totalTeamPoints += result.points || 0;
                }
            });
        }
    });
    
    // Convert to array and sort by points (highest first)
    const sortedDrivers = Object.entries(driverPoints)
        .map(([name, points]) => ({ name, points }))
        .sort((a, b) => b.points - a.points);
    
    if (sortedDrivers.length === 0) {
        return '<p class="no-data">No points scored yet</p>';
    }
    
    // Generate contribution bars for all drivers who scored for this team
    return sortedDrivers.map((driver, index) => {
        const contribution = totalTeamPoints > 0 ? Math.round((driver.points / totalTeamPoints) * 100) : 0;
        
        // Find driver info if available (for short name)
        const driverInfo = data.standings.drivers.find(d => d.name === driver.name);
        const displayName = driverInfo?.short || driver.name.split(' ').pop() || driver.name.substring(0, 3).toUpperCase();
        
        // Check if this driver is still in the team's current lineup
        const isCurrentDriver = team.drivers?.some(d => d.name === driver.name);
        
        return `
            <div class="driver-contrib-item ${!isCurrentDriver ? 'former-driver' : ''}">
                <div class="driver-contrib-info">
                    <span class="driver-contrib-name">
                        ${displayName}
                        ${!isCurrentDriver ? '<span class="driver-contrib-former">(former)</span>' : ''}
                    </span>
                    <span class="driver-contrib-points">${driver.points} pts</span>
                </div>
                <div class="driver-contrib-bar">
                    <div class="driver-contrib-fill" style="width: ${contribution}%; background: ${team.primaryColor};"></div>
                </div>
                <span class="driver-contrib-pct">${contribution}%</span>
            </div>
        `;
    }).join('');
}

// Updated generatePointsDistribution function - uses team-specific points
function generatePointsDistribution(team, data) {
    const results = data.results;
    const completedRaces = results.filter(r => r.classification && r.classification.length > 0);
    const lastRaces = completedRaces.slice(-5); // Show last 5 races
    
    if (lastRaces.length === 0) {
        return '<p class="no-data">No race data available</p>';
    }
    
    let pointsHTML = '';
    let maxPoints = 0;
    const roundPoints = [];
    
    // Calculate max points for scaling - only count points for this team
    lastRaces.forEach(race => {
        let totalRoundPoints = 0;
        
        // Race points
        const racePoints = race.classification
            .filter(r => r.team === team.name)
            .reduce((sum, r) => sum + (r.points || 0), 0);
        totalRoundPoints += racePoints;
        
        // Sprint points
        if (race.hasSprint) {
            const sprintPoints = race.sprint
                .filter(r => r.team === team.name)
                .reduce((sum, r) => sum + (r.points || 0), 0);
            totalRoundPoints += sprintPoints;
        }
        
        roundPoints.push({ 
            round: race.round, 
            points: totalRoundPoints 
        });
        
        maxPoints = Math.max(maxPoints, totalRoundPoints);
    });
    
    roundPoints.forEach(item => {
        const barHeight = maxPoints > 0 ? (item.points / maxPoints) * 60 : 0;
        pointsHTML += `
            <div class="points-bar-item">
                <div class="points-bar-label">R${item.round}</div>
                <div class="points-bar-container">
                    <div class="points-bar-fill" style="height: ${barHeight}px; background: ${team.primaryColor};"></div>
                </div>
                <div class="points-bar-value">${item.points}</div>
            </div>
        `;
    });
    
    return pointsHTML;
}

// Updated generateTeamRaceHistory function - only shows results for this team
function generateTeamRaceHistory(team, results) {
    const completedRaces = results.filter(r => r.classification && r.classification.length > 0);
    const lastRaces = completedRaces.slice(-5); // Show last 5 races
    
    if (lastRaces.length === 0) {
        return '<div class="no-history">No recent races</div>';
    }
    
    let historyHTML = '';
    
    lastRaces.forEach(race => {
        // Only get results where the driver was driving for THIS team
        const teamResults = race.classification.filter(r => r.team === team.name);
        const teamSprintResults = race.hasSprint ? race.sprint.filter(r => r.team === team.name) : [];
        
        // Only show the round if the team had any participation
        if (teamResults.length === 0 && teamSprintResults.length === 0) {
            // Team didn't participate in this round (maybe didn't exist yet or drivers elsewhere)
            historyHTML += `
                <div class="team-history-item absent">
                    <span class="team-history-round">R${race.round}</span>
                    <span class="team-history-driver">—</span>
                    <span class="team-history-pos">DNS</span>
                    <span class="team-history-points">0 pts</span>
                </div>
            `;
            return;
        }
        
        // Race results for drivers that were actually in this team at this time
        teamResults.forEach((result, idx) => {
            const driver = team.drivers.find(d => d.name === result.driver);
            const posClass = result.positionNumber === 1 ? 'pos-1' : 
                            result.positionNumber === 2 ? 'pos-2' : 
                            result.positionNumber === 3 ? 'pos-3' : '';
            
            let posText = '';
            if (!result.positionNumber) {
                posText = 'DNF';
            } else if (result.positionNumber === 1) {
                posText = '1st';
            } else if (result.positionNumber === 2) {
                posText = '2nd';
            } else if (result.positionNumber === 3) {
                posText = '3rd';
            } else {
                posText = `${result.positionNumber}th`;
            }
            
            const flIndicator = result.hasFastestLap ? '★' : '';
            const driverShort = driver?.short || result.driver.split(' ').pop().substring(0, 3).toUpperCase();
            
            historyHTML += `
                <div class="team-history-item">
                    <span class="team-history-round">R${race.round}</span>
                    <span class="team-history-driver" style="color: ${team.primaryColor};">${driverShort}</span>
                    <span class="team-history-pos ${posClass}">${posText}${flIndicator ? ' ' + flIndicator : ''}</span>
                    <span class="team-history-points">${result.points} pts</span>
                </div>
            `;
        });
        
        // Sprint results if they exist
        if (teamSprintResults.length > 0) {
            teamSprintResults.forEach(result => {
                const driver = team.drivers.find(d => d.name === result.driver);
                const posClass = result.positionNumber === 1 ? 'pos-1' : 
                                result.positionNumber === 2 ? 'pos-2' : 
                                result.positionNumber === 3 ? 'pos-3' : '';
                
                let posText = '';
                if (!result.positionNumber) {
                    posText = 'DNF';
                } else if (result.positionNumber === 1) {
                    posText = '1st';
                } else if (result.positionNumber === 2) {
                    posText = '2nd';
                } else if (result.positionNumber === 3) {
                    posText = '3rd';
                } else {
                    posText = `${result.positionNumber}th`;
                }
                
                const driverShort = driver?.short || result.driver.split(' ').pop().substring(0, 3).toUpperCase();
                
                historyHTML += `
                    <div class="team-history-item sprint">
                        <span class="team-history-round">R${race.round}S</span>
                        <span class="team-history-driver" style="color: ${team.primaryColor};">${driverShort}</span>
                        <span class="team-history-pos ${posClass}">⚡ ${posText}</span>
                        <span class="team-history-points">${result.points} pts</span>
                    </div>
                `;
            });
        }
    });
    
    return historyHTML;
}

// Updated generateTeamComparison function - only compares stats while both were in the team
function generateTeamComparison(team, data) {
    if (!team.drivers || team.drivers.length < 2) {
        return '<p class="no-data">Insufficient driver data for comparison</p>';
    }
    
    const driver1 = team.drivers[0];
    const driver2 = team.drivers[1];
    const results = data.results;
    
    // Calculate head-to-head stats only for races where both were in this team
    let driver1Points = 0;
    let driver2Points = 0;
    let driver1Wins = 0;
    let driver2Wins = 0;
    let driver1Podiums = 0;
    let driver2Podiums = 0;
    let driver1Poles = 0;
    let driver2Poles = 0;
    let racesTogether = 0;
    
    results.forEach(race => {
        // Check if both drivers were driving for this team in this race
        const driver1InTeam = race.classification.some(r => r.driver === driver1.name && r.team === team.name) ||
                             (race.hasSprint && race.sprint.some(r => r.driver === driver1.name && r.team === team.name));
        
        const driver2InTeam = race.classification.some(r => r.driver === driver2.name && r.team === team.name) ||
                             (race.hasSprint && race.sprint.some(r => r.driver === driver2.name && r.team === team.name));
        
        if (driver1InTeam && driver2InTeam) {
            racesTogether++;
            
            // Race points
            const d1Race = race.classification.find(r => r.driver === driver1.name && r.team === team.name);
            const d2Race = race.classification.find(r => r.driver === driver2.name && r.team === team.name);
            
            if (d1Race) {
                driver1Points += d1Race.points || 0;
                if (d1Race.positionNumber === 1) driver1Wins++;
                if (d1Race.positionNumber && d1Race.positionNumber <= 3) driver1Podiums++;
            }
            
            if (d2Race) {
                driver2Points += d2Race.points || 0;
                if (d2Race.positionNumber === 1) driver2Wins++;
                if (d2Race.positionNumber && d2Race.positionNumber <= 3) driver2Podiums++;
            }
            
            // Sprint points
            if (race.hasSprint) {
                const d1Sprint = race.sprint.find(r => r.driver === driver1.name && r.team === team.name);
                const d2Sprint = race.sprint.find(r => r.driver === driver2.name && r.team === team.name);
                
                if (d1Sprint) driver1Points += d1Sprint.points || 0;
                if (d2Sprint) driver2Points += d2Sprint.points || 0;
            }
            
            // Qualifying poles
            const d1Quali = race.qualifying.find(r => r.driver === driver1.name && r.team === team.name);
            const d2Quali = race.qualifying.find(r => r.driver === driver2.name && r.team === team.name);
            
            if (d1Quali && d1Quali.positionNumber === 1) driver1Poles++;
            if (d2Quali && d2Quali.positionNumber === 1) driver2Poles++;
        }
    });
    
    const totalPoints = driver1Points + driver2Points;
    const driver1Pct = totalPoints > 0 ? Math.round((driver1Points / totalPoints) * 100) : 50;
    const driver2Pct = 100 - driver1Pct;
    
    return `
        <div class="driver-comparison-card">
            <div class="comparison-header">
                <div class="comparison-avatar" style="background: ${team.primaryColor}20; color: ${team.primaryColor};">${driver1.number}</div>
                <div class="comparison-info">
                    <h4>${driver1.name}</h4>
                    <span style="color: ${team.primaryColor};">#1 Driver</span>
                    ${racesTogether > 0 ? `<span class="comparison-races">${racesTogether} races together</span>` : ''}
                </div>
            </div>
            <div class="comparison-stats">
                <div class="comparison-row">
                    <span class="comparison-label">Points</span>
                    <span class="comparison-value comparison-highlight">${driver1Points}</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Wins</span>
                    <span class="comparison-value">${driver1Wins}</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Podiums</span>
                    <span class="comparison-value">${driver1Podiums}</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Poles</span>
                    <span class="comparison-value">${driver1Poles}</span>
                </div>
            </div>
        </div>
        <div class="driver-comparison-card">
            <div class="comparison-header">
                <div class="comparison-avatar" style="background: ${team.primaryColor}20; color: ${team.primaryColor};">${driver2.number}</div>
                <div class="comparison-info">
                    <h4>${driver2.name}</h4>
                    <span style="color: ${team.primaryColor};">#2 Driver</span>
                </div>
            </div>
            <div class="comparison-stats">
                <div class="comparison-row">
                    <span class="comparison-label">Points</span>
                    <span class="comparison-value">${driver2Points}</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Wins</span>
                    <span class="comparison-value">${driver2Wins}</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Podiums</span>
                    <span class="comparison-value">${driver2Podiums}</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Poles</span>
                    <span class="comparison-value">${driver2Poles}</span>
                </div>
            </div>
        </div>
        <div class="h2h-battle">
            <div class="h2h-title">TEAMMATE BATTLE • ${racesTogether} RACES TOGETHER</div>
            <div class="h2h-grid">
                <div class="h2h-driver">
                    <div class="h2h-driver-name">${driver1.short || driver1.name.split(' ').pop()}</div>
                    <div class="h2h-stat">${driver1Points}</div>
                </div>
                <div class="h2h-label">Points</div>
                <div class="h2h-driver">
                    <div class="h2h-driver-name">${driver2.short || driver2.name.split(' ').pop()}</div>
                    <div class="h2h-stat">${driver2Points}</div>
                </div>
                <div class="h2h-bars">
                    <div class="h2h-bar-left" style="width: ${driver1Pct}%; background: ${team.primaryColor};">${driver1Pct}%</div>
                    <div class="h2h-bar-right" style="width: ${driver2Pct}%; background: ${team.primaryColor}80;">${driver2Pct}%</div>
                </div>
            </div>
        </div>
    `;
}

function setupTeamTabs() {
    const teamTabs = document.querySelectorAll('.team-tab');
    const teamProfiles = document.querySelectorAll('.team-profile');
    
    teamTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            teamTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const teamId = tab.dataset.team;
            teamProfiles.forEach(profile => profile.style.display = 'none');
            const targetProfile = document.getElementById(`team-${teamId}`);
            if (targetProfile) targetProfile.style.display = 'block';
        });
    });
    
    // Activate first tab by default
    if (teamTabs.length > 0) {
        teamTabs[0].classList.add('active');
    }
}

// Updated updateComparisonTab function with driver rating, working LED%, and reordered columns
function updateComparisonTab(data, statistics) {
    const tbody = document.querySelector('#comparison-table tbody');
    if (!tbody) return;
    
    const drivers = data.standings.drivers;
    const results = data.results;
    const completedRaces = results.filter(r => r.classification && r.classification.length > 0).length;
    
    if (!drivers || drivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" style="text-align: center;">No driver data available</td></tr>';
        return;
    }
    
    // Pre-calculate detailed stats for all drivers to get driver ratings
    const driverStatsMap = {};
    drivers.forEach(driver => {
        driverStatsMap[driver.name] = calculateDriverDetailedStats(driver, data, statistics);
    });
    
    tbody.innerHTML = drivers.map((driver, index) => {
        const driverStats = driverStatsMap[driver.name];
        
        // Calculate DNFs
        const dnfCount = results.reduce((count, race) => {
            if (!race.classification) return count;
            const result = race.classification.find(r => r.driver === driver.name);
            if (!result) return count; // Didn't participate
            // Check if DNF (no position number or DNF in raw position)
            if (!result.positionNumber || result.rawPosition?.toString().includes('DNF')) {
                return count + 1;
            }
            return count;
        }, 0);
        
        // Calculate laps led (simplified - would need actual lap data)
        // This is a placeholder - you'll need actual lap data to calculate this properly
        const lapsLed = '—';
        
        // Get fastest laps
        const flCount = results.reduce((count, race) => {
            if (!race.classification) return count;
            const result = race.classification.find(r => r.driver === driver.name);
            return count + (result?.hasFastestLap ? 1 : 0);
        }, 0);
        
        // Calculate average finish position
        const finishes = results.flatMap(race => 
            race.classification ? race.classification.filter(r => r.driver === driver.name && r.positionNumber) : []
        );
        const avgFinish = finishes.length > 0 
            ? (finishes.reduce((sum, r) => sum + r.positionNumber, 0) / finishes.length).toFixed(1)
            : '—';
        
        // Calculate average qualifying position
        const qualiResults = results.flatMap(race => 
            race.qualifying ? race.qualifying.filter(r => r.driver === driver.name && r.positionNumber) : []
        );
        const avgQuali = qualiResults.length > 0 
            ? (qualiResults.reduce((sum, r) => sum + r.positionNumber, 0) / qualiResults.length).toFixed(1)
            : '—';
        
        // Calculate points per race
        const pointsPerRace = driverStats.pointsPerRace;
        
        // Get driver rating and tier color
        const ratingInfo = getRatingTier(driverStats.driverRating);
        
        const posClass = index === 0 ? 'pos-1' : index === 1 ? 'pos-2' : index === 2 ? 'pos-3' : '';
        
        return `
            <tr>
                <td class="${posClass}">${index + 1}</td>
                <td style="font-weight: 600;">${driver.name}</td>
                <td><span class="stat-team-dot" style="background: ${driver.teamColor};"></span>${driver.currentTeam}</td>
                <td style="font-weight: 700; color: #860000;">${driver.points}</td>
                <td><span style="color: ${ratingInfo.color}; font-weight: 700;">${driverStats.driverRating}</span></td>
                <td>${driver.wins}</td>
                <td>${driver.podiums}</td>
                <td>${driver.poles}</td>
                <td>${flCount}</td>
                <td>${completedRaces}</td>
                <td>${pointsPerRace}</td>
                <td>${avgFinish}</td>
                <td>${avgQuali}</td>
                <td>${dnfCount}</td>
                <td>${lapsLed}</td>
            </tr>
        `;
    }).join('');
}