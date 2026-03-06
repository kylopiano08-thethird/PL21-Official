// js/countdown.js
let countdownInterval = null;
let currentRace = null;
let currentRaceDate = null;

function initCountdown() {
    console.log('⏰ Countdown initializing...');
    
    // Wait for data to be ready
    if (window.PL21_DATA) {
        console.log('⏰ PL21_DATA exists, starting countdown');
        startCountdown(window.PL21_DATA.calendar);
    } else {
        console.log('⏰ Waiting for pl21-data-ready event');
        window.addEventListener('pl21-data-ready', (e) => {
            console.log('⏰ Data ready event received');
            startCountdown(e.detail.calendar);
        });
    }
}

function startCountdown(calendar) {
    console.log('⏰ Starting countdown with calendar:', calendar);
    
    const container = document.getElementById('countdown-container');
    const timerEl = document.getElementById('countdown-timer');
    
    if (!container) {
        console.error('⏰ Countdown container not found');
        return;
    }
    
    if (!timerEl) {
        console.error('⏰ Countdown timer element not found');
        return;
    }
    
    if (!calendar || calendar.length === 0) {
        console.log('⏰ No calendar data available');
        container.style.display = 'none';
        return;
    }
    
    // Log the first race to see its structure
    console.log('⏰ First race in calendar:', calendar[0]);
    
    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    console.log('⏰ Current date:', now.toString());
    console.log('⏰ Using year:', currentYear);
    
    // Find the next race
    let nextRace = null;
    let nextRaceDate = null;
    
    // First, try to find a race with a proper date object from the calendar
    for (let race of calendar) {
        // Skip if no date
        if (!race.date || race.date === 'TBD') {
            console.log('⏰ Race has no date:', race.name);
            continue;
        }
        
        try {
            // Parse the race date with current year
            const raceDateTime = parseRaceDate(race.date, race.time || '19:00', currentYear);
            
            if (raceDateTime) {
                console.log(`⏰ ${race.name}: ${race.date} ${race.time} ->`, raceDateTime.toString());
                
                if (raceDateTime > now) {
                    console.log(`⏰ Found future race: ${race.name}`);
                    nextRace = race;
                    nextRaceDate = raceDateTime;
                    break;
                }
            }
        } catch (e) {
            console.error(`⏰ Error parsing date for ${race.name}:`, e);
        }
    }
    
    // If no future race found, check if any race is today/in progress
    if (!nextRace) {
        for (let race of calendar) {
            if (!race.date || race.date === 'TBD') continue;
            
            try {
                const raceDateTime = parseRaceDate(race.date, race.time || '19:00', currentYear);
                if (raceDateTime) {
                    // If race is within the next 7 days, consider it as upcoming
                    const daysDiff = (raceDateTime - now) / (1000 * 60 * 60 * 24);
                    if (daysDiff > 0 && daysDiff < 7) {
                        console.log(`⏰ Race weekend soon: ${race.name}`);
                        nextRace = race;
                        nextRaceDate = raceDateTime;
                        break;
                    }
                }
            } catch (e) {
                console.error(`⏰ Error parsing date for ${race.name}:`, e);
            }
        }
    }
    
    // If still no race found, try next year (maybe season hasn't started yet)
    if (!nextRace) {
        console.log('⏰ No upcoming races this year, trying next year...');
        
        for (let race of calendar) {
            if (!race.date || race.date === 'TBD') continue;
            
            try {
                // Try next year
                const raceDateTime = parseRaceDate(race.date, race.time || '19:00', currentYear + 1);
                
                if (raceDateTime && raceDateTime > now) {
                    console.log(`⏰ Found future race next year: ${race.name}`);
                    nextRace = race;
                    nextRaceDate = raceDateTime;
                    break;
                }
            } catch (e) {
                console.error(`⏰ Error parsing date for ${race.name}:`, e);
            }
        }
    }
    
    if (!nextRace) {
        console.log('⏰ No upcoming races found');
        container.style.display = 'none';
        return;
    }
    
    console.log(`⏰ Next race: ${nextRace.name} on ${nextRace.date} at ${nextRace.time}`);
    console.log(`⏰ Next race date object:`, nextRaceDate.toString());
    
    // Store current race info
    currentRace = nextRace;
    currentRaceDate = nextRaceDate;
    
    // Show the container
    container.style.display = 'flex';
    
    // Add tooltip with race name
    container.title = `Next: ${nextRace.name}`;
    
    // Clear any existing interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Update countdown function
    function updateCountdown() {
        const now = new Date();
        const diff = currentRaceDate - now;
        
        if (diff <= 0) {
            console.log('⏰ Race time passed, checking for next race');
            // Race has started/passed, find the next one
            findNextRace(calendar);
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        // Format with leading zeros
        const daysStr = days;
        const hoursStr = hours.toString().padStart(2, '0');
        const minutesStr = minutes.toString().padStart(2, '0');
        
        timerEl.textContent = `${daysStr}d ${hoursStr}h ${minutesStr}m`;
    }
    
    // Helper function to find next race without recursion
    function findNextRace(calendar) {
        const now = new Date();
        const currentYear = now.getFullYear();
        
        // Try current year first
        for (let race of calendar) {
            if (!race.date || race.date === 'TBD') continue;
            
            try {
                const raceDateTime = parseRaceDate(race.date, race.time || '19:00', currentYear);
                if (raceDateTime && raceDateTime > now) {
                    currentRace = race;
                    currentRaceDate = raceDateTime;
                    container.title = `Next: ${race.name}`;
                    updateCountdown();
                    return;
                }
            } catch (e) {
                console.error(`⏰ Error parsing date for ${race.name}:`, e);
            }
        }
        
        // Try next year
        for (let race of calendar) {
            if (!race.date || race.date === 'TBD') continue;
            
            try {
                const raceDateTime = parseRaceDate(race.date, race.time || '19:00', currentYear + 1);
                if (raceDateTime && raceDateTime > now) {
                    currentRace = race;
                    currentRaceDate = raceDateTime;
                    container.title = `Next: ${race.name}`;
                    updateCountdown();
                    return;
                }
            } catch (e) {
                console.error(`⏰ Error parsing date for ${race.name}:`, e);
            }
        }
        
        // No more races
        container.style.display = 'none';
    }
    
    // Update immediately
    updateCountdown();
    
    // Then update every minute
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown, 60000);
}

function parseRaceDate(dateStr, timeStr, year) {
    if (!dateStr || dateStr === 'TBD') return null;
    
    try {
        // Remove ordinal indicators (st, nd, rd, th)
        // e.g., "8th March" -> "8 March"
        let cleanDate = dateStr.replace(/(st|nd|rd|th)/g, '');
        
        // Add the specified year
        const dateTimeStr = `${cleanDate} ${year}, ${timeStr}`;
        console.log('⏰ Parsing date string:', dateTimeStr);
        
        const date = new Date(dateTimeStr);
        
        // Check if valid
        if (isNaN(date.getTime())) {
            console.error('⏰ Invalid date:', dateTimeStr);
            return null;
        }
        
        return date;
    } catch (e) {
        console.error('⏰ Error parsing date:', dateStr, timeStr, e);
        return null;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('⏰ DOM ready, initializing countdown');
    // Small delay to ensure other scripts have loaded
    setTimeout(initCountdown, 500);
});

// Also try to initialize if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('⏰ DOM already ready, initializing countdown');
    setTimeout(initCountdown, 500);
}