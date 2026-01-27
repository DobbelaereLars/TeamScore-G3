// Format score helper used across display views
export const formatScore = (val, type, config = {}) => {
  if (type === 'boolean' || type === 'bool') {
    return val ? 'Voltooid' : 'Niet voltooid';
  }

  if (type === 'time') {
    // If null/undefined/empty, show placeholder
    if (val === null || val === undefined || val === '') {
      return '--:--';
    }

    const totalSeconds = Number(val) || 0;
    const notation = config.timeNotation || 'mm:ss';
    const pad = (n, length = 2) => String(n).padStart(length, '0');

    // Calculations
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
    const cs = Math.floor(ms / 10); // centiseconds for 2-digit ms display often used

    if (notation === 'hh:mm:ss') {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    
    if (notation === 'hh:mm:ss:ms') {
        const msStr = String(ms).padStart(3, '0').slice(0, 2); // Taking first 2 digits of ms usually or 3? User label says "milliseconde". Usually 2 or 3.
        // Let's use 2 digits for consistency with standard sports timing if unspecified, or 3 if they asked for ms. 
        // User label: 'Uur : minuut : seconde : milliseconde'. 
        // Let's assume 3 for ms (000-999).
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(ms, 3)}`;
    }

    if (notation === 'ss') {
        return String(Math.floor(totalSeconds));
    }

    // Default 'mm:ss'
    // If we have hours but only show mm:ss, we usually add hours to minutes (e.g. 90:00) 
    // OR we just show minutes (modulo) and hours are lost? 
    // User request: "2:00:00:00 uur wordt 120:00 minuten als het op is op minuten:seconden"
    // So 2 hours = 120 minutes.
    if (notation === 'mm:ss') {
        const totalMinutes = Math.floor(totalSeconds / 60);
        return `${pad(totalMinutes)}:${pad(seconds)}`;
    }

    // Fallback
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  // Points
  return String(Math.round(Number(val) || 0)); 
};

export const getScoreLabel = (type, score = 0) => {
  if (type === 'boolean' || type === 'bool') return '';
  if (type === 'time') return '';
  if (type === 'points' && Math.round(Number(score)) === 1) return 'punt';
  return 'punten';
};
