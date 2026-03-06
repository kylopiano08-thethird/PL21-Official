// js/index.js
function updateHomepage(data) {
    console.log('Updating homepage with data:', data);
    console.log('DOTD data:', data.dotd);
    console.log('Transfer window:', data.transferWindow);
    console.log('Featured driver:', data.homepage.hero.featuredDriver);
    
    // Update hero eyebrow
    document.getElementById('hero-eyebrow').textContent = 'PL21 SEASON · SEASON OPENER';
    
    // Update hero title
    const heroTitle = document.getElementById('hero-title');
    heroTitle.innerHTML = `
        <span class="hero-title-line"><span>${data.homepage.hero.title}</span></span>
    `;
    
    // Update hero description
    document.getElementById('hero-description').textContent = data.homepage.hero.description;
    
    // Update featured driver - use currentTeam
    const featured = document.getElementById('featured-driver');
    const featuredDriver = data.homepage.hero.featuredDriver;
    featured.innerHTML = `
        <div class="featured-driver">
            <div class="driver-number">#${featuredDriver.number}</div>
            <div class="driver-name">${featuredDriver.name}</div>
            <div class="driver-team">${featuredDriver.currentTeam || featuredDriver.team || 'Unknown'}</div>
            <div class="driver-stats">
                <div class="driver-stat">
                    <div class="driver-stat-value">${featuredDriver.wins}</div>
                    <div class="driver-stat-label">Wins</div>
                </div>
                <div class="driver-stat">
                    <div class="driver-stat-value">${featuredDriver.points}</div>
                    <div class="driver-stat-label">Points</div>
                </div>
                <div class="driver-stat">
                    <div class="driver-stat-value">${featuredDriver.podiums}</div>
                    <div class="driver-stat-label">Podiums</div>
                </div>
            </div>
        </div>
    `;
    
    // Update stats grid
    const statsGrid = document.getElementById('stats-grid');
    statsGrid.innerHTML = '';
    
    // Get constructor name directly from constructorStandings
    const constructorName = data.constructorStandings?.[0]?.name || 
                           data.standings?.constructors?.[0]?.name || 
                           'TBD';
    
    const constructorPoints = data.constructorStandings?.[0]?.points || 
                             data.standings?.constructors?.[0]?.points || 
                             0;
    
    console.log('Constructor name:', constructorName);
    console.log('Constructor points:', constructorPoints);
    
    const stats = [
        {
            label: 'Next Race',
            value: data.homepage.stats.nextRace.value,
            detail: data.homepage.stats.nextRace.detail
        },
        {
            label: 'Championship Leader',
            value: data.homepage.stats.leader.value,
            detail: data.homepage.stats.leader.detail
        },
        {
            label: "Constructor's",
            value: constructorName,  // Use the full name
            detail: `${constructorPoints} pts`
        },
        {
            label: 'Season Progress',
            value: data.homepage.stats.progress.value,
            detail: data.homepage.stats.progress.detail
        }
    ];
    
    stats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div class="stat-label">${stat.label}</div>
            <div class="stat-value">${stat.value}</div>
            <div class="stat-detail">${stat.detail}</div>
        `;
        statsGrid.appendChild(card);
    });
    
    // Update news grid - with special first two cards
    const newsGrid = document.getElementById('news-grid');
    newsGrid.innerHTML = '';
    
    // Card 1: DOTD (Driver of the Day) - make it link to teams page with driver profile
    const dotdCard = document.createElement('div');
    dotdCard.className = 'news-card';
    const dotdDriver = data.dotd || { name: 'TBD', number: '0', currentTeam: 'Unknown', id: '' };
    
    // Create a clickable card that links to teams page and opens the driver profile
    dotdCard.innerHTML = `
        <div class="news-category">🏆 DRIVER OF THE DAY</div>
        <div class="news-title">${dotdDriver.name}</div>
        <div class="news-summary">#${dotdDriver.number} · ${dotdDriver.currentTeam || 'Unknown'}</div>
        <a href="teams.html?driver=${encodeURIComponent(dotdDriver.id || dotdDriver.name)}" class="news-link view-profile-link">View profile →</a>
    `;
    
    // Add click handler to navigate to teams page with driver ID
    const viewProfileLink = dotdCard.querySelector('.view-profile-link');
    viewProfileLink.addEventListener('click', (e) => {
        e.preventDefault();
        const driverId = dotdDriver.id || dotdDriver.name;
        // Store the driver to view in sessionStorage
        sessionStorage.setItem('viewDriver', JSON.stringify({
            id: driverId,
            name: dotdDriver.name
        }));
        window.location.href = `teams.html?driver=${encodeURIComponent(driverId)}`;
    });
    
    newsGrid.appendChild(dotdCard);
    
    // Card 2: Transfer Window Status
    const transferCard = document.createElement('div');
    transferCard.className = 'news-card';
    const transferStatus = data.transferWindow || 'Closed';
    const statusIcon = transferStatus.toLowerCase() === 'open' ? '🔄' : '🔒';
    
    transferCard.innerHTML = `
        <div class="news-category">📋 TRANSFER WINDOW</div>
        <div class="news-title">${statusIcon} ${transferStatus}</div>
        <div class="news-summary">The transfer window is currently ${transferStatus.toLowerCase()}</div>
        <a href="teams.html" class="news-link">View teams →</a>
    `;
    newsGrid.appendChild(transferCard);
    
    // Card 3: Regular news item
    if (data.news && data.news.length > 0) {
        const newsItem = data.news[0];
        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="news-category">${newsItem.category || 'News'}</div>
            <div class="news-title">${newsItem.title || 'Latest News'}</div>
            <div class="news-summary">${newsItem.summary || 'Click to read more'}</div>
            <a href="${newsItem.link || '#'}" class="news-link">Read more →</a>
        `;
        newsGrid.appendChild(card);
    } else {
        const placeholderCard = document.createElement('div');
        placeholderCard.className = 'news-card';
        placeholderCard.innerHTML = `
            <div class="news-category">Latest News</div>
            <div class="news-title">Season Preview</div>
            <div class="news-summary">The 2021 season is about to begin! Stay tuned for updates.</div>
            <a href="#" class="news-link">Read more →</a>
        `;
        newsGrid.appendChild(placeholderCard);
    }
    
    // Update standings table
    const standingsBody = document.getElementById('standings-body');
    standingsBody.innerHTML = '';
    
    if (data.driverStandings && data.driverStandings.length > 0) {
        data.driverStandings.slice(0, 5).forEach((d, index) => {
            const pos = index + 1;
            const posClass = pos === 1 ? 'position-1' : pos === 2 ? 'position-2' : pos === 3 ? 'position-3' : '';
            const row = document.createElement('tr');
            
            // Make driver name clickable
            row.innerHTML = `
                <td class="${posClass}">${pos}</td>
                <td class="driver-cell">
                    <a href="teams.html?driver=${encodeURIComponent(d.id || d.name)}" class="driver-link" data-driver-id="${d.id || d.name}">${d.name}</a>
                </td>
                <td class="team-cell"><span class="team-dot" style="background: ${d.teamColor};"></span>${d.currentTeam}</td>
                <td class="points-cell">${d.points}</td>
            `;
            
            standingsBody.appendChild(row);
        });
        
        // Add click handlers to driver links
        document.querySelectorAll('.driver-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const driverId = link.dataset.driverId;
                sessionStorage.setItem('viewDriver', JSON.stringify({
                    id: driverId,
                    name: link.textContent
                }));
                window.location.href = `teams.html?driver=${encodeURIComponent(driverId)}`;
            });
        });
        
    } else if (data.homepage?.standings && data.homepage.standings.length > 0) {
        data.homepage.standings.forEach(d => {
            const posClass = d.pos === 1 ? 'position-1' : d.pos === 2 ? 'position-2' : d.pos === 3 ? 'position-3' : '';
            const row = document.createElement('tr');
            
            // Make driver name clickable
            row.innerHTML = `
                <td class="${posClass}">${d.pos}</td>
                <td class="driver-cell">
                    <a href="teams.html?driver=${encodeURIComponent(d.driver)}" class="driver-link" data-driver-id="${d.driver}">${d.driver}</a>
                </td>
                <td class="team-cell"><span class="team-dot" style="background: ${d.teamColor};"></span>${d.team}</td>
                <td class="points-cell">${d.points}</td>
            `;
            
            standingsBody.appendChild(row);
        });
        
        // Add click handlers to driver links
        document.querySelectorAll('.driver-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const driverId = link.dataset.driverId;
                sessionStorage.setItem('viewDriver', JSON.stringify({
                    id: driverId,
                    name: link.textContent
                }));
                window.location.href = `teams.html?driver=${encodeURIComponent(driverId)}`;
            });
        });
    }

    // Hide loading, show content
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
}

// Wait for data and update
window.addEventListener('pl21-data-ready', function(e) {
    console.log('pl21-data-ready event received with data:', e.detail);
    if (e.detail) {
        const data = e.detail;
        
        // Create driverStandings and constructorStandings if they don't exist at root level
        if (!data.driverStandings && data.standings?.drivers) {
            data.driverStandings = data.standings.drivers;
        }
        if (!data.constructorStandings && data.standings?.constructors) {
            data.constructorStandings = data.standings.constructors;
        }
        
        updateHomepage(data);
    } else {
        console.error('Invalid data structure received:', e.detail);
    }
});

// If data already exists
if (window.PL21_DATA) {
    console.log('Data already exists, updating immediately:', window.PL21_DATA);
    const data = window.PL21_DATA;
    
    // Create driverStandings and constructorStandings if they don't exist at root level
    if (!data.driverStandings && data.standings?.drivers) {
        data.driverStandings = data.standings.drivers;
    }
    if (!data.constructorStandings && data.standings?.constructors) {
        data.constructorStandings = data.standings.constructors;
    }
    
    updateHomepage(data);
}