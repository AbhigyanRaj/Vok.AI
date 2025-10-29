import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const transcribeAudio = async (audioBuffer) => {
  try {
    // Note: Actual transcription happens during the call via Twilio's speech recognition
    // The transcription is built from the SpeechResult responses collected during the call
    // This function is kept for compatibility but transcription is handled in real-time
    console.log('Audio transcription - handled via real-time speech recognition during call');
    return "Transcription is captured in real-time during the call via Twilio speech recognition";
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
};

export const generateSummary = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `You are a helpful assistant that summarizes call transcripts and extracts key insights. Please summarize this call transcript and extract key insights: ${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Summary generation error:', error);
    throw error;
  }
};

/**
 * Evaluate loan application based on responses
 * Based on the reference Python implementation
 */
export const evaluateLoanApplication = async (applicationData) => {
  const prompt = `
Loan Application Evaluation for Indian Market:
Applicant Profile: ${JSON.stringify(applicationData, null, 2)}

Decisioning Criteria:
1. Age: >=18 years
2. Minimum monthly income: ₹25,000
3. CIBIL Score: Above 600
4. Loan-to-income ratio: Max 4x annual income

Based on the above criteria, respond with exactly one of these three options:
YES (if application meets all criteria)
NO (if application clearly fails criteria)
INVESTIGATION_REQUIRED (if more information needed)

You are a loan decisioning expert. Respond only with YES, NO, or INVESTIGATION_REQUIRED.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Loan evaluation error:', error);
    return "INVESTIGATION_REQUIRED";
  }
};

/**
 * Evaluate credit card application based on responses
 */
export const evaluateCreditCardApplication = async (applicationData) => {
  const prompt = `
Credit Card Application Evaluation for Indian Market:
Applicant Profile: ${JSON.stringify(applicationData, null, 2)}

Decisioning Criteria:
1. Age: 18-60 years range
2. Minimum annual income: ₹3,00,000
3. CIBIL Score: Above 700
4. No recent payment defaults
5. Stable employment

Based on the above criteria, respond with exactly one of these three options:
YES (if application meets all criteria)
NO (if application clearly fails criteria)
INVESTIGATION_REQUIRED (if more information needed)

You are a credit card decisioning expert. Respond only with YES, NO, or INVESTIGATION_REQUIRED.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Credit card evaluation error:', error);
    return "INVESTIGATION_REQUIRED";
  }
};

/**
 * Generate predefined questions for loan applications
 */
export const generateLoanQuestions = () => {
  return [
    "What is your current age?",
    "What is your monthly income in Indian Rupees?",
    "Are you a salaried employee, self-employed, or a business owner?",
    "In which city and state do you currently reside?",
    "What is your current occupation and industry?",
    "How much loan amount are you seeking in Indian Rupees?",
    "Do you have a CIBIL credit score?",
    "Are you a first-time loan applicant?",
    "Do you have any existing EMIs or loan commitments?",
    "What is the primary purpose of this loan?"
  ];
};

/**
 * Generate predefined questions for credit card applications
 */
export const generateCreditCardQuestions = () => {
  return [
    "What is your current age?",
    "What is your annual income in Indian Rupees?",
    "Are you employed in private sector, government, or self-employed?",
    "In which city do you currently work?",
    "Do you have any existing credit cards?",
    "What is your CIBIL credit score?",
    "Have you ever defaulted on any credit or loan payment?",
    "What is your typical monthly household expenditure?",
    "Do you have any existing loan EMIs?",
    "Are you a first-time credit card applicant?"
  ];
};

/**
 * Evaluate application based on type
 */
export const evaluateApplication = async (applicationType, applicationData) => {
  if (applicationType === 'loan') {
    return await evaluateLoanApplication(applicationData);
  } else if (applicationType === 'credit_card') {
    return await evaluateCreditCardApplication(applicationData);
  } else {
    throw new Error('Invalid application type');
  }
};

/**
 * Analyze customer response using Gemini AI
 */
export const analyzeResponseWithGemini = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini analysis error:', error);
    throw error;
  }
};

export default genAI; 