import express from 'express';
import { WebSocketServer } from 'ws';
import DeepgramService from '../services/deepgramService.js';
import Call from '../models/Call.js';

const router = express.Router();

// Store active streaming sessions
const activeSessions = new Map();

/**
 * Handle Twilio Media Streams WebSocket connection
 * This endpoint receives real-time audio from Twilio and forwards to Deepgram
 */
export function setupMediaStreamWebSocket(server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/streams/twilio'
  });

  wss.on('connection', (ws, req) => {
    console.log('🔌 New Twilio Media Stream connection');
    
    let streamSid = null;
    let callSid = null;
    let deepgramService = null;
    let sessionData = {
      partialTranscripts: [],
      finalTranscripts: [],
      currentUtterance: '',
      lastTranscriptTime: Date.now(),
      silenceTimeout: null
    };

    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message);

        switch (msg.event) {
          case 'start':
            streamSid = msg.start.streamSid;
            callSid = msg.start.callSid;
            
            console.log(`📞 Stream started - CallSid: ${callSid}, StreamSid: ${streamSid}`);
            
            // Initialize Deepgram connection
            deepgramService = new DeepgramService();
            await deepgramService.createLiveConnection({
              model: 'nova-2-phonecall',
              language: 'en-US',
              smart_format: true,
              interim_results: true,
              endpointing: 300,
              encoding: 'mulaw',
              sample_rate: 8000,
              channels: 1,
              punctuate: true,
              keywords: ['yes:2', 'no:2', 'maybe:2', 'sure:2', 'okay:2', 'interested:2', 'not interested:2', 'definitely:2', 'absolutely:2']
            });

            // Handle Deepgram transcripts
            deepgramService.on('partialTranscript', (data) => {
              sessionData.partialTranscripts.push(data);
              sessionData.currentUtterance = data.text;
              sessionData.lastTranscriptTime = Date.now();
              
              // Send partial transcript back to call handler
              ws.send(JSON.stringify({
                event: 'partialTranscript',
                callSid,
                transcript: data.text,
                confidence: data.confidence,
                timestamp: Date.now()
              }));
            });

            deepgramService.on('finalTranscript', async (data) => {
              sessionData.finalTranscripts.push(data);
              sessionData.currentUtterance = '';
              
              console.log(`✅ Final transcript: "${data.text}" (confidence: ${data.confidence?.toFixed(2)})`);
              
              // Send final transcript back to call handler
              ws.send(JSON.stringify({
                event: 'finalTranscript',
                callSid,
                transcript: data.text,
                confidence: data.confidence,
                timestamp: Date.now()
              }));

              // Store transcript in call record
              try {
                const call = await Call.findOne({ twilioCallSid: callSid });
                if (call) {
                  // Append to transcription field
                  const currentTranscription = call.transcription || '';
                  call.transcription = currentTranscription + `\nUser: ${data.text}`;
                  await call.save();
                }
              } catch (error) {
                console.error('Error updating call transcription:', error);
              }
            });

            deepgramService.on('error', (error) => {
              console.error('❌ Deepgram error:', error);
              ws.send(JSON.stringify({
                event: 'error',
                error: error.message
              }));
            });

            // Store session
            activeSessions.set(callSid, {
              ws,
              deepgramService,
              sessionData,
              streamSid
            });
            
            break;

          case 'media':
            // Forward audio to Deepgram
            if (deepgramService && deepgramService.isActive()) {
              const audioPayload = Buffer.from(msg.media.payload, 'base64');
              deepgramService.sendAudio(audioPayload);
            }
            break;

          case 'stop':
            console.log(`🛑 Stream stopped - CallSid: ${callSid}`);
            
            // Clean up Deepgram connection
            if (deepgramService) {
              deepgramService.close();
            }
            
            // Remove from active sessions
            activeSessions.delete(callSid);
            
            break;

          default:
            console.log('Unknown event:', msg.event);
        }
      } catch (error) {
        console.error('Error processing media stream message:', error);
      }
    });

    ws.on('close', () => {
      console.log('🔌 Media Stream connection closed');
      
      // Clean up
      if (deepgramService) {
        deepgramService.close();
      }
      
      if (callSid) {
        activeSessions.delete(callSid);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('✅ Media Stream WebSocket server initialized on /api/streams/twilio');
}

/**
 * Get active streaming session for a call
 */
export function getStreamingSession(callSid) {
  return activeSessions.get(callSid);
}

/**
 * Send a message to a streaming session
 */
export function sendToStreamingSession(callSid, message) {
  const session = activeSessions.get(callSid);
  if (session && session.ws) {
    session.ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

export default router;
