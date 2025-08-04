import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const makeCall = async (to, from, twimlUrl) => {
  try {
    const call = await client.calls.create({
      to: to,
      from: from,
      url: twimlUrl,
      record: true,
    });
    return call;
  } catch (error) {
    console.error('Twilio call error:', error);
    throw error;
  }
};

export const generateTwiML = (questions) => {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  
  questions.forEach((question, index) => {
    twiml += `<Say voice="alice">${question}</Say>`;
    twiml += '<Pause length="3"/>';
    if (index < questions.length - 1) {
      twiml += '<Pause length="2"/>';
    }
  });
  
  twiml += '</Response>';
  return twiml;
};

export default client; 