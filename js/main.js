// js/main.js - Shared functionality for all pages

// Set active navigation based on current page
function setActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

// Get team color class
function getTeamColorClass(teamName) {
    const teamMap = {
        'Red Bull Racing': 'team-redbull',
        'Mercedes': 'team-mercedes',
        'Ferrari': 'team-ferrari',
        'McLaren': 'team-mclaren',
        'Alpine': 'team-alpine',
        'AlphaTauri': 'team-alphatauri',
        'Aston Martin': 'team-astonmartin',
        'Williams': 'team-williams',
        'Alfa Romeo': 'team-alfa',
        'Haas': 'team-haas'
    };
    return teamMap[teamName] || '';
}

// Get background color class
function getBgColorClass(teamName) {
    const teamMap = {
        'Red Bull Racing': 'bg-redbull',
        'Mercedes': 'bg-mercedes',
        'Ferrari': 'bg-ferrari',
        'McLaren': 'bg-mclaren',
        'Alpine': 'bg-alpine',
        'AlphaTauri': 'bg-alphatauri',
        'Aston Martin': 'bg-astonmartin',
        'Williams': 'bg-williams',
        'Alfa Romeo': 'bg-alfa',
        'Haas': 'bg-haas'
    };
    return teamMap[teamName] || '';
}

// Show loading spinner
function showLoading() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    if (loading) loading.style.display = 'block';
    if (content) content.style.display = 'none';
}

// Hide loading spinner
function hideLoading() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    showLoading();
});

// Listen for data ready event
window.addEventListener('pl21-data-ready', () => {
    hideLoading();
});