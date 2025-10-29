import twilio from 'twilio';

// Create TwiML response helper
export function createTwiMLResponse() {
  return new twilio.twiml.VoiceResponse();
}

// Export for CommonJS compatibility if needed
export default {
  createTwiMLResponse
};
