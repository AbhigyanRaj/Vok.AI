import { WebSocketServer } from 'ws';

// Store active WebSocket connections per call
const liveCallClients = new Map(); // callId -> Set of WebSocket clients

/**
 * Initialize WebSocket server for live call monitoring
 * This runs alongside the existing Media Stream WebSocket without interference
 */
export function initializeLiveCallWebSocket(server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/live-call'
  });

  wss.on('connection', (ws, req) => {
    // Extract callId from URL path: /live-call?callId=xxx
    const url = new URL(req.url, `http://${req.headers.host}`);
    const callId = url.searchParams.get('callId');
    
    if (!callId) {
      console.log('WebSocket connection rejected: No callId provided');
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
      type: 'connection_established',
      callId: callId,
      timestamp: new Date().toISOString(),
      message: 'Connected to live call transcript'
    }));

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`🔌 WebSocket client disconnected for call: ${callId}`);
      const clients = liveCallClients.get(callId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          liveCallClients.delete(callId);
          console.log(`🧹 Cleaned up empty client set for call: ${callId}`);
        }
      }
    });

    // Handle client errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for call ${callId}:`, error);
      const clients = liveCallClients.get(callId);
      if (clients) {
        clients.delete(ws);
      }
    });

    // Send ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds
  });

  console.log('🎤 Live Call WebSocket server initialized on /live-call');
  return wss;
}

/**
 * Broadcast transcript update to all clients watching a specific call
 * This is called from the call routes when transcript updates occur
 */
export function broadcastTranscriptUpdate(callId, data) {
  const clients = liveCallClients.get(callId);
  if (!clients || clients.size === 0) {
    // No clients watching this call - skip broadcast (no error)
    return;
  }

  const message = JSON.stringify({
    type: 'transcript_update',
    callId: callId,
    timestamp: new Date().toISOString(),
    ...data
  });

  let activeClients = 0;
  clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(message);
        activeClients++;
      } catch (error) {
        console.error(`❌ Failed to send to client for call ${callId}:`, error);
        clients.delete(client);
      }
    } else {
      // Remove dead connections
      clients.delete(client);
    }
  });

  console.log(`📡 Broadcasted transcript update to ${activeClients} clients for call: ${callId}`);
}

/**
 * Broadcast call status update (started, completed, failed)
 */
export function broadcastCallStatus(callId, status, metadata = {}) {
  const clients = liveCallClients.get(callId);
  if (!clients || clients.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: 'call_status',
    callId: callId,
    status: status,
    timestamp: new Date().toISOString(),
    ...metadata
  });

  clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error(`❌ Failed to send status update to client for call ${callId}:`, error);
        clients.delete(client);
      }
    }
  });

  console.log(`📡 Broadcasted status '${status}' to ${clients.size} clients for call: ${callId}`);
}

/**
 * Clean up all clients for a completed call
 */
export function cleanupCallClients(callId) {
  const clients = liveCallClients.get(callId);
  if (clients) {
    // Send final message before cleanup
    const finalMessage = JSON.stringify({
      type: 'call_completed',
      callId: callId,
      timestamp: new Date().toISOString(),
      message: 'Call has ended. Transcript is now stored.'
    });

    clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        try {
          client.send(finalMessage);
          client.close(1000, 'Call completed');
        } catch (error) {
          console.error(`❌ Error during cleanup for call ${callId}:`, error);
        }
      }
    });

    liveCallClients.delete(callId);
    console.log(`🧹 Cleaned up all clients for completed call: ${callId}`);
  }
}

/**
 * Get statistics about active connections
 */
export function getLiveCallStats() {
  const totalCalls = liveCallClients.size;
  let totalClients = 0;
  
  liveCallClients.forEach(clients => {
    totalClients += clients.size;
  });

  return {
    activeCalls: totalCalls,
    totalClients: totalClients,
    callsWithClients: Array.from(liveCallClients.keys())
  };
}
