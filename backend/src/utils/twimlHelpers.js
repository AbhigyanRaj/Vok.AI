import twilio from 'twilio';

// Create TwiML response helper
export function createTwiMLResponse() {
  return new twilio.twiml.VoiceResponse();
}

/**
 * Add Media Stream to TwiML for real-time transcription
 * @param {VoiceResponse} twiml - Twilio VoiceResponse object
 * @param {string} callSid - Twilio Call SID
 * @param {Object} options - Stream options
 */
export function addMediaStream(twiml, callSid, options = {}) {
  const baseUrl = process.env.BASE_URL || process.env.NGROK_URL || 'http://localhost:5001';
  const streamUrl = `wss://${baseUrl.replace('https://', '').replace('http://', '')}/api/streams/twilio?callSid=${callSid}`;
  
  const start = twiml.start();
  const stream = start.stream({
    name: `stream_${callSid}`,
    url: streamUrl,
    track: 'inbound_track', // Only capture customer audio
    ...options
  });
  
  console.log(`🎤 Added Media Stream to TwiML: ${streamUrl}`);
  return stream;
}

/**
 * Create TwiML with streaming enabled
 * @param {string} callSid - Twilio Call SID
 * @param {boolean} enableStreaming - Whether to enable streaming
 */
export function createStreamingTwiMLResponse(callSid, enableStreaming = true) {
  const twiml = new twilio.twiml.VoiceResponse();
  
  if (enableStreaming && callSid) {
    addMediaStream(twiml, callSid);
  }
  
  return twiml;
}

// Export for CommonJS compatibility if needed
export default {
  createTwiMLResponse,
  addMediaStream,
  createStreamingTwiMLResponse
};
