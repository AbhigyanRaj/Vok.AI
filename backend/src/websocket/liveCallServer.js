import { WebSocketServer } from 'ws';

// Store active WebSocket connections per call
const liveCallClients = new Map(); // callId -> Set of WebSocket clients

/**
 * Initialize WebSocket server for live call monitoring
 */
export function initializeLiveCallWebSocket(server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/live-call'
  });

  wss.on('connection', (ws, req) => {
    // Extract callId from URL path: /live-call/{callId}
    const urlParts = req.url.split('/');
    const callId = urlParts[urlParts.length - 1];
    
    if (!callId || callId === 'live-call') {
      console.log('❌ WebSocket connection rejected: No callId provided');
      ws.close(1008, 'Call ID required');
      return;
    }

    console.log(`🔌 WebSocket client connected for call: ${callId}`);

    // Add client to the call's client set
    if (!liveCallClients.has(callId)) {
      liveCallClients.set(callId, new Set());
    }
    liveCallClients.get(callId).add(ws);

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'status',
      status: 'active',
      message: 'Connected to live call',
      timestamp: new Date().toISOString()
    }));

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`🔌 WebSocket client disconnected from call: ${callId}`);
      const clients = liveCallClients.get(callId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          liveCallClients.delete(callId);
          console.log(`📭 No more clients for call ${callId}, cleaned up`);
        }
      }
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for call ${callId}:`, error);
    });
  });

  console.log('✅ Live Call WebSocket server initialized');
  return wss;
}

/**
 * Broadcast transcript update to all clients watching a specific call
 */
export function broadcastTranscript(callId, data) {
  const clients = liveCallClients.get(callId);
  
  if (!clients || clients.size === 0) {
    // No clients watching this call, skip broadcast
    return;
  }

  const message = JSON.stringify({
    type: 'transcript',
    ...data,
    timestamp: data.timestamp || new Date().toISOString()
  });

  let successCount = 0;
  let failCount = 0;

  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to send to client:`, error);
        failCount++;
      }
    }
  });

  if (successCount > 0) {
    console.log(`📡 Broadcast to ${successCount} client(s) for call ${callId}`);
  }
  if (failCount > 0) {
    console.log(`⚠️ Failed to send to ${failCount} client(s)`);
  }
}

/**
 * Broadcast call status update
 */
export function broadcastCallStatus(callId, status, message) {
  const clients = liveCallClients.get(callId);
  
  if (!clients || clients.size === 0) {
    return;
  }

  const data = JSON.stringify({
    type: 'status',
    status,
    message,
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.readyState === 1) {
      try {
        client.send(data);
      } catch (error) {
        console.error(`❌ Failed to send status update:`, error);
      }
    }
  });

  console.log(`📡 Status broadcast: ${message} (${clients.size} clients)`);
}

/**
 * Notify all clients that a call has ended
 */
export function broadcastCallEnd(callId) {
  const clients = liveCallClients.get(callId);
  
  if (!clients || clients.size === 0) {
    return;
  }

  const data = JSON.stringify({
    type: 'call_ended',
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.readyState === 1) {
      try {
        client.send(data);
      } catch (error) {
        console.error(`❌ Failed to send call end notification:`, error);
      }
    }
  });

  console.log(`📡 Call end broadcast for ${callId} (${clients.size} clients)`);
  
  // Clean up after a short delay
  setTimeout(() => {
    clients.forEach(client => {
      if (client.readyState === 1) {
        client.close(1000, 'Call ended');
      }
    });
    liveCallClients.delete(callId);
  }, 2000);
}

/**
 * Get count of active viewers for a call
 */
export function getActiveViewers(callId) {
  const clients = liveCallClients.get(callId);
  return clients ? clients.size : 0;
}

/**
 * Get all active call IDs being monitored
 */
export function getActiveCallIds() {
  return Array.from(liveCallClients.keys());
}
