// js/calendar.js
let map;
let markers = [];
let clickedItem = null;
let hoverTimer = null;
let currentHoverItem = null;

const zoomedOut = 2.499;
const hoverZoom = 4.2;
const clickZoom = 5.5;

document.addEventListener('DOMContentLoaded', () => {
    console.log('📅 Calendar page loaded');
    
    if (!document.getElementById('map')) {
        console.log('📅 Map element not found');
        return;
    }
    
    // Load Leaflet CSS and JS dynamically
    loadLeaflet();
});

function loadLeaflet() {
    console.log('📅 Loading Leaflet...');
    
    // Check if Leaflet is already loaded
    if (window.L) {
        console.log('📅 Leaflet already loaded');
        initializeCalendar();
        return;
    }
    
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.onload = () => console.log('📅 Leaflet CSS loaded');
    document.head.appendChild(link);
    
    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
        console.log('📅 Leaflet JS loaded');
        initializeCalendar();
    };
    document.body.appendChild(script);
}

function initializeCalendar() {
    console.log('📅 Initializing calendar');
    
    window.addEventListener('pl21-data-ready', (e) => {
        console.log('📅 Data ready event received');
        const data = e.detail;
        setupCalendar(data);
    });
    
    // If data already exists
    if (window.PL21_DATA) {
        console.log('📅 Data already exists');
        setupCalendar(window.PL21_DATA);
    }
}

function parseCoordinates(coordString) {
    if (!coordString) return null;
    
    // Split by forward slash
    const parts = coordString.split('/');
    if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
    }
    return null;
}

function setupCalendar(data) {
    console.log('📅 Setting up calendar with data');
    
    // Get calendar data
    const races = data.calendar || [];
    
    console.log('📅 Races found:', races.length);
    
    if (races.length === 0) {
        console.error('📅 No races found in calendar data');
        return;
    }
    
    // Log the first race to see its structure
    if (races.length > 0) {
        console.log('📅 First race object:', races[0]);
        console.log('📅 First race circuitInfo:', races[0].circuitInfo);
        console.log('📅 First race circuitInfo.coordinates:', races[0].circuitInfo?.coordinates);
    }
    
    // Enhance races with parsed coordinates from circuitInfo
    const enhancedRaces = races.map(race => {
        // Get coordinates from circuitInfo (where they're stored)
        const coordinates = race.circuitInfo?.coordinates || '';
        const coords = parseCoordinates(coordinates);
        
        return {
            ...race,
            lat: coords ? coords.lat : null,
            lng: coords ? coords.lng : null,
            hasValidCoords: coords !== null,
            // Also store the full circuit info for sidebar
            circuitName: race.circuitInfo?.circuitName || race.circuit || 'TBD',
            circuitLength: race.circuitInfo?.length || 'TBD',
            circuitRecord: race.circuitInfo?.record || '',
            circuitDescription: race.circuitInfo?.description || '',
            circuitPicture: race.circuitInfo?.picture || ''
        };
    });
    
    const validRaces = enhancedRaces.filter(race => race.hasValidCoords);
    console.log('📅 Races with valid coordinates:', validRaces.length);
    
    if (validRaces.length === 0) {
        console.error('📅 No races with valid coordinates found');
        console.log('📅 Checking all races circuitInfo:');
        enhancedRaces.forEach((race, i) => {
            console.log(`Race ${i+1}: ${race.name} - circuitInfo.coordinates:`, race.circuitInfo?.coordinates);
        });
        
        // Still show the map but with a default view
        initMapWithDefault();
        buildCalendarList(enhancedRaces); // Use enhanced races which have circuitInfo
        setupSidebar(enhancedRaces);
        setupParallax();
        
        // Hide loading, show content
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        return;
    }
    
    // Find next race (first upcoming race)
    const nextRace = validRaces.find(race => race.status === 'upcoming') || validRaces[0];
    console.log('📅 Next race:', nextRace);
    
    // Initialize map
    initMap(nextRace);
    
    // Add markers
    addMarkers(validRaces);
    
    // Build calendar list
    buildCalendarList(enhancedRaces); // Use all races for the list
    
    // Setup sidebar
    setupSidebar(enhancedRaces);
    
    // Setup parallax effect
    setupParallax();
    
    // Set initial view to next race
    if (nextRace) {
        setTimeout(() => {
            map.setView([nextRace.lat, nextRace.lng], 4.5, { animate: false });
            const nextRaceItem = document.querySelector(`[data-round="${nextRace.round}"]`);
            if (nextRaceItem) {
                nextRaceItem.classList.add('active');
                clickedItem = nextRaceItem;
                updateSidebar(nextRace);
            }
        }, 500);
    }
    
    // Hide loading, show content
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
}

function initMapWithDefault() {
    console.log('📅 Initializing map with default view');
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('📅 Map element not found');
        return;
    }
    
    map = L.map('map', {
        center: [20, 0],
        zoom: zoomedOut,
        minZoom: zoomedOut,
        maxZoom: 8,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        fadeAnimation: true
    });
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
        tileSize: 256,
        keepBuffer: 8,
        updateWhenIdle: true,
        updateWhenZooming: false,
        preload: Infinity
    }).addTo(map);
    
    console.log('📅 Map initialized with default view');
}

function initMap(nextRace) {
    console.log('📅 Initializing map');
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('📅 Map element not found');
        return;
    }
    
    map = L.map('map', {
        center: nextRace ? [nextRace.lat, nextRace.lng] : [20, 0],
        zoom: nextRace ? 4.5 : zoomedOut,
        minZoom: zoomedOut,
        maxZoom: 8,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        fadeAnimation: true
    });
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
        tileSize: 256,
        keepBuffer: 8,
        updateWhenIdle: true,
        updateWhenZooming: false,
        preload: Infinity
    }).addTo(map);
    
    console.log('📅 Map initialized');
}

function addMarkers(races) {
    console.log('📅 Adding markers');
    
    // Clear existing markers
    markers.forEach(m => {
        if (map) map.removeLayer(m);
    });
    markers = [];
    
    races.forEach(race => {
        if (!race.lat || !race.lng) return;
        
        let color, pulseClass;
        
        if (race.status === 'completed') {
            color = '#00ff88';  // Green for completed
            pulseClass = 'pulse-marker-completed';
        } else if (race.status === 'next') {
            color = '#D4AF37';  // Gold/Yellow for next race
            pulseClass = 'pulse-marker-next';
        } else {
            color = '#ff3333';  // Bright red for upcoming (changed from #860000)
            pulseClass = 'pulse-marker-upcoming';
        }
        
        const marker = L.circleMarker([race.lat, race.lng], {
            radius: race.status === 'next' ? 8 : 6,
            color: color,
            fillColor: color,
            fillOpacity: 1,
            weight: 2,
            className: pulseClass
        }).addTo(map);
        
        marker.on('click', () => {
            const item = document.querySelector(`[data-round="${race.round}"]`);
            if (item) {
                document.querySelectorAll('.calendar-item').forEach(el => {
                    el.classList.remove('active');
                });
                item.classList.add('active');
                clickedItem = item;
                
                animateToLocation(race.lat, race.lng, clickZoom, 1.2);
                updateSidebar(race);
            }
        });
        
        markers.push(marker);
    });
    
    console.log('📅 Markers added:', markers.length);
}

function buildCalendarList(races) {
    console.log('📅 Building calendar list');
    
    const calendarList = document.getElementById('calendar-list');
    if (!calendarList) {
        console.error('📅 Calendar list element not found');
        return;
    }
    
    calendarList.innerHTML = races.map(race => {
        // Determine dot class based on status
        let dotClass = '';
        if (race.status === 'completed') dotClass = 'dot-completed';
        else if (race.status === 'next') dotClass = 'dot-next';
        else dotClass = 'dot-upcoming';
        
        // Extract city from location
        const locationStr = race.location || '';
        const city = locationStr.split(',')[0].trim() || '';
        
        return `
        <div class="calendar-item" data-round="${race.round}" data-lat="${race.lat || ''}" data-lng="${race.lng || ''}" data-status="${race.status}">
            <span class="calendar-round">R${String(race.round).padStart(2, '0')}</span>
            <div class="calendar-info">
                <div class="calendar-name">${race.name}</div>
                <div class="calendar-date">${city}</div>
            </div>
            <div class="calendar-dot ${dotClass}"></div>
        </div>
    `}).join('');
    
    // Add event listeners
    addCalendarListeners(races);
}

function addCalendarListeners(races) {
    const calendarList = document.getElementById('calendar-list');
    
    // Hover events
    calendarList.addEventListener('mouseover', (e) => {
        const item = e.target.closest('.calendar-item');
        if (!item) return;
        
        if (hoverTimer) clearTimeout(hoverTimer);
        currentHoverItem = item;
        
        const round = parseInt(item.dataset.round);
        const race = races.find(r => r.round === round);
        
        if (race && race.lat && race.lng) {
            jumpToLocation(race.lat, race.lng, hoverZoom);
        }
        updateSidebar(race);
    });
    
    calendarList.addEventListener('mouseout', (e) => {
        const item = e.target.closest('.calendar-item');
        if (!item) return;
        
        currentHoverItem = null;
        
        hoverTimer = setTimeout(() => {
            if (clickedItem) {
                const round = parseInt(clickedItem.dataset.round);
                const race = races.find(r => r.round === round);
                if (race && race.lat && race.lng) {
                    animateToLocation(race.lat, race.lng, clickZoom, 0.8);
                }
                updateSidebar(race);
            } else {
                resetToZoomedOut();
            }
            hoverTimer = null;
        }, 200);
    });
    
    // Click events
    calendarList.addEventListener('click', (e) => {
        const item = e.target.closest('.calendar-item');
        if (!item) return;
        
        if (hoverTimer) clearTimeout(hoverTimer);
        
        const round = parseInt(item.dataset.round);
        const race = races.find(r => r.round === round);
        
        document.querySelectorAll('.calendar-item').forEach(el => {
            el.classList.remove('active');
        });
        
        item.classList.add('active');
        clickedItem = item;
        
        if (race && race.lat && race.lng) {
            animateToLocation(race.lat, race.lng, clickZoom, 1.2);
        }
        updateSidebar(race);
    });
}

function setupSidebar(races) {
    const sidebar = document.getElementById('map-sidebar');
    const closeBtn = document.getElementById('close-sidebar');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', resetToZoomedOut);
    }
    
    // Map click to reset
    if (map) {
        map.on('click', (e) => {
            resetToZoomedOut();
        });
    }
}

function updateSidebar(race) {
    const sidebar = document.getElementById('map-sidebar');
    const sidebarContent = document.getElementById('sidebar-content');
    
    if (!sidebar || !sidebarContent) return;
    
    // Get circuit info from race (now directly on the race object)
    const circuitName = race.circuitName || race.circuit || 'TBD';
    const length = race.circuitLength || race.length || 'TBD';
    const description = race.circuitDescription || race.description || '';
    const picture = race.circuitPicture || race.picture || '';
    
    sidebarContent.innerHTML = `
        <div class="race-detail">
            <div class="race-header">
                <span class="race-round-badge">ROUND ${race.round}</span>
                <span class="race-status-badge status-${race.status}">${race.status.toUpperCase()}</span>
            </div>
            <div class="race-title">${race.name}</div>
            <div class="race-location">${race.location || 'TBD'}</div>
            
            ${description ? `
            <div class="race-description">
                ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}
            </div>
            ` : ''}
            
            ${picture ? `
            <div class="circuit-image-wrapper">
                <img src="${picture}" alt="${circuitName}" class="circuit-image">
                <div class="circuit-image-caption">${circuitName}</div>
            </div>
            ` : ''}
            
            <div class="race-stats">
                <div class="stat-item">
                    <div class="stat-label">Circuit</div>
                    <div class="stat-value">${circuitName}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Length</div>
                    <div class="stat-value">${length}</div>
                </div>
            </div>
        </div>
    `;
    
    sidebar.classList.remove('hidden');
}

function jumpToLocation(lat, lng, zoom) {
    if (!map) return;
    map.stop();
    map.setView([lat, lng], zoom, { animate: false });
}

function animateToLocation(lat, lng, zoom, duration = 1.2) {
    if (!map) return;
    map.stop();
    map.setView([lat, lng], zoom, {
        animate: true,
        duration: duration,
        easeLinearity: 0.5
    });
}

function resetToZoomedOut() {
    if (!map) return;
    map.stop();
    map.setView([20, 0], zoomedOut, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.3
    });
    
    const sidebar = document.getElementById('map-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
    
    document.querySelectorAll('.calendar-item').forEach(el => {
        el.classList.remove('active');
    });
    
    clickedItem = null;
}

function setupParallax() {
    const mapElement = document.getElementById('map');
    const wrapper = document.getElementById('map-wrapper');
    
    if (!mapElement || !wrapper) return;
    
    let bounds = wrapper.getBoundingClientRect();
    let centerX = bounds.left + bounds.width / 2;
    let centerY = bounds.top + bounds.height / 2;
    
    const baseTransform = 'rotateX(15deg) rotateY(2deg) scale(1.08)';
    
    window.addEventListener('resize', () => {
        bounds = wrapper.getBoundingClientRect();
        centerX = bounds.left + bounds.width / 2;
        centerY = bounds.top + bounds.height / 2;
    });
    
    wrapper.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        const deltaX = (mouseX - centerX) / (bounds.width / 2);
        const deltaY = (mouseY - centerY) / (bounds.height / 2);
        
        const moveX = deltaX * 10;
        const moveY = deltaY * 5;
        
        mapElement.style.transform = `${baseTransform} translate(${moveX}px, ${moveY}px)`;
    });
    
    wrapper.addEventListener('mouseleave', () => {
        mapElement.style.transform = baseTransform;
    });
}