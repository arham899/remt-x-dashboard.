// REMT-X Background Script (Service Worker)
// Purpose: Relay telemetry from content scripts to the Telemetry Hub via WebSocket.

const HUB_URL = 'wss://remt-x-telemetry-hub-production.up.railway.app/socket.io/?EIO=4&transport=websocket';
let socket = null;
let reconnectInterval = 5000;

const CONFIG = {
    enumeratorId: 'enum_001',
    projectId: 'proj_beta',
    role: 'enumerator'
};

const connectToHub = () => {
    console.log('[REMT-X] Connecting to Telemetry Hub...');

    // Using standard WebSocket for low-bandwidth stealth relay
    socket = new WebSocket(HUB_URL);

    socket.onopen = () => {
        console.log('[REMT-X] WebSocket Connected');
        // Socket.io v4 Handshake:
        // 1. Send connection packet "40" to connect to the namespace
        socket.send('40');
    };

    socket.onmessage = (event) => {
        // Handle incoming messages (e.g., handshake response, pings)
        if (event.data === '40' || event.data.startsWith('40{')) {
            console.log('[REMT-X] Socket.io Connected. Joining project...');
            sendPacket('join', CONFIG);
        } else if (event.data === '2') {
            // Respond to EIO Ping with Pong
            socket.send('3');
        }
    };

    socket.onclose = () => {
        console.warn('[REMT-X] Disconnected. Retrying in 5s...');
        setTimeout(connectToHub, reconnectInterval);
    };

    socket.onerror = (err) => {
        console.error('[REMT-X] WebSocket Error:', err);
    };
};

const sendPacket = (event, data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        // Socket.io standard packet format for 'message' events: 42["event", data]
        const packet = `42["${event}", ${JSON.stringify(data)}]`;
        socket.send(packet);
    }
};

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TELEMETRY') {
        const payload = {
            projectId: CONFIG.projectId,
            enumeratorId: CONFIG.enumeratorId,
            data: message.data
        };
        sendPacket('telemetry', payload);
    } else if (message.type === 'LOCATION') {
        const payload = {
            projectId: CONFIG.projectId,
            enumeratorId: CONFIG.enumeratorId,
            location: message.location
        };
        sendPacket('location_ping', payload);
    }
});

// Initial connection
connectToHub();
