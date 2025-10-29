import EventEmitter from 'events';
import { analyzeResponseWithGemini } from '../config/openai.js';
import Call from '../models/Call.js';
import Module from '../models/Module.js';

/**
 * Handles streaming call logic with real-time transcription
 * Manages intent detection, reprompts, and graceful error handling
 */
class StreamingCallHandler extends EventEmitter {
  constructor(callSid, moduleId, phoneNumber, customerName) {
    super();
    this.callSid = callSid;
    this.moduleId = moduleId;
    this.phoneNumber = phoneNumber;
    this.customerName = customerName;
    
    this.currentQuestionIndex = -1; // -1 = greeting, 0+ = questions
    this.questions = [];
    this.responses = new Map();
    this.transcriptBuffer = '';
    this.lastTranscriptTime = Date.now();
    this.repromptCount = 0;
    this.maxReprompts = 2;
    this.isProcessing = false;
    this.call = null;
    this.module = null;
  }

  /**
   * Initialize the call handler
   */
  async initialize() {
    try {
      // Load module and questions
      this.module = await Module.findById(this.moduleId);
      if (!this.module) {
        throw new Error('Module not found');
      }
      
      this.questions = this.module.questions.sort((a, b) => a.order - b.order);
      
      // Load call record
      this.call = await Call.findOne({ twilioCallSid: this.callSid });
      if (!this.call) {
        console.warn('Call record not found, will create on first transcript');
      }
      
      console.log(`✅ Streaming call handler initialized for ${this.customerName}`);
      console.log(`📋 Module: ${this.module.name} with ${this.questions.length} questions`);
      
      return true;
    } catch (error) {
      console.error('Error initializing call handler:', error);
      throw error;
    }
  }

  /**
   * Process partial transcript (for early intent detection)
   */
  async processPartialTranscript(transcript, confidence) {
    if (this.isProcessing) return;
    
    this.transcriptBuffer = transcript;
    this.lastTranscriptTime = Date.now();
    
    // Check for high-confidence intent matches
    const intent = this.detectIntent(transcript, confidence);
    
    if (intent && confidence > 0.8) {
      console.log(`🎯 High-confidence intent detected: ${intent} (${confidence.toFixed(2)})`);
      // Could trigger early response here if needed
      this.emit('intentDetected', { intent, confidence, transcript });
    }
  }

  /**
   * Process final transcript
   */
  async processFinalTranscript(transcript, confidence) {
    if (this.isProcessing) {
      console.log('⏳ Already processing, skipping...');
      return;
    }
    
    this.isProcessing = true;
    this.transcriptBuffer = '';
    
    try {
      console.log(`\n📝 Processing final transcript: "${transcript}" (confidence: ${confidence?.toFixed(2)})`);
      
      // Handle based on current question
      if (this.currentQuestionIndex === -1) {
        // Greeting response - check if customer is available
        await this.handleGreetingResponse(transcript, confidence);
      } else if (this.currentQuestionIndex < this.questions.length) {
        // Question response
        await this.handleQuestionResponse(transcript, confidence);
      }
      
      this.repromptCount = 0; // Reset on successful processing
      
    } catch (error) {
      console.error('Error processing transcript:', error);
      this.emit('error', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle greeting response (availability check)
   */
  async handleGreetingResponse(transcript, confidence) {
    const intent = this.detectIntent(transcript, confidence);
    
    if (confidence < 0.5 || !transcript || transcript.length < 2) {
      // Low confidence or unclear
      await this.handleUnclearResponse('greeting');
      return;
    }
    
    const positiveWords = ['yes', 'okay', 'sure', 'go ahead', 'yeah', 'yep', 'yup', 'alright', 'fine', 'good', 'great', 'sounds good', 'perfect'];
    const negativeWords = ['no', 'not now', 'busy', 'later', 'bad time', 'cannot', 'can\'t'];
    
    const responseText = transcript.toLowerCase().trim();
    const isPositive = positiveWords.some(word => responseText.includes(word));
    const isNegative = negativeWords.some(word => responseText.includes(word));
    
    if (isPositive && !isNegative) {
      console.log('✅ Customer is available, proceeding to questions');
      this.currentQuestionIndex = 0;
      this.emit('customerAvailable', { transcript });
    } else if (isNegative) {
      console.log('❌ Customer declined, ending call gracefully');
      this.emit('customerDeclined', { transcript });
    } else {
      // Unclear response
      await this.handleUnclearResponse('greeting');
    }
  }

  /**
   * Handle question response
   */
  async handleQuestionResponse(transcript, confidence) {
    const questionIndex = this.currentQuestionIndex;
    const question = this.questions[questionIndex];
    
    if (confidence < 0.5 || !transcript || transcript.length < 2) {
      // Low confidence or unclear
      await this.handleUnclearResponse('question');
      return;
    }
    
    // Store response
    this.responses.set(questionIndex.toString(), transcript);
    
    // Analyze response with AI
    const analysisResult = await this.analyzeResponse(transcript, question.question);
    console.log(`🤖 AI Analysis: ${analysisResult}`);
    
    // Update call record
    if (this.call) {
      this.call.responses.set(questionIndex.toString(), transcript);
      
      if (!this.call.evaluation) {
        this.call.evaluation = {
          result: analysisResult,
          comments: []
        };
      } else {
        this.call.evaluation.result = analysisResult;
      }
      
      await this.call.save();
    }
    
    // Move to next question or finish
    this.currentQuestionIndex++;
    
    if (this.currentQuestionIndex >= this.questions.length) {
      console.log('✅ All questions answered, finishing call');
      this.emit('allQuestionsAnswered', { 
        responses: Object.fromEntries(this.responses),
        evaluation: analysisResult
      });
    } else {
      console.log(`➡️ Moving to question ${this.currentQuestionIndex + 1}/${this.questions.length}`);
      this.emit('nextQuestion', { 
        questionIndex: this.currentQuestionIndex,
        question: this.questions[this.currentQuestionIndex],
        previousResponse: transcript,
        previousAnalysis: analysisResult
      });
    }
  }

  /**
   * Handle unclear/low-confidence responses
   */
  async handleUnclearResponse(context) {
    this.repromptCount++;
    
    console.log(`⚠️ Unclear response (attempt ${this.repromptCount}/${this.maxReprompts})`);
    
    if (this.repromptCount <= this.maxReprompts) {
      let repromptMessage = '';
      
      if (this.repromptCount === 1) {
        repromptMessage = "Sorry, I didn't catch that clearly. Could you please repeat that?";
      } else if (this.repromptCount === 2) {
        if (context === 'greeting') {
          repromptMessage = "I'm having trouble hearing you. You can simply say 'Yes' if now is a good time, or 'No' if you're busy.";
        } else {
          repromptMessage = "I'm still having trouble understanding. You can say 'Yes', 'No', or 'Maybe'. For example, just say 'Yes'.";
        }
      }
      
      this.emit('reprompt', { 
        message: repromptMessage, 
        attempt: this.repromptCount,
        context 
      });
    } else {
      // Max reprompts reached, move on gracefully
      console.log('⏭️ Max reprompts reached, moving to next question');
      
      if (context === 'greeting') {
        // Assume customer is busy, end call politely
        this.emit('customerDeclined', { 
          transcript: 'no_response',
          reason: 'max_reprompts'
        });
      } else {
        // Store "no response" and move to next question
        this.responses.set(this.currentQuestionIndex.toString(), '[No clear response]');
        
        if (this.call) {
          this.call.responses.set(this.currentQuestionIndex.toString(), '[No clear response]');
          await this.call.save();
        }
        
        this.currentQuestionIndex++;
        this.repromptCount = 0;
        
        if (this.currentQuestionIndex >= this.questions.length) {
          this.emit('allQuestionsAnswered', { 
            responses: Object.fromEntries(this.responses),
            incomplete: true
          });
        } else {
          this.emit('nextQuestion', { 
            questionIndex: this.currentQuestionIndex,
            question: this.questions[this.currentQuestionIndex],
            previousResponse: '[No clear response]'
          });
        }
      }
    }
  }

  /**
   * Detect intent from transcript
   */
  detectIntent(transcript, confidence) {
    if (!transcript) return null;
    
    const text = transcript.toLowerCase().trim();
    
    // Positive intent
    if (['yes', 'yeah', 'yep', 'sure', 'okay', 'definitely', 'absolutely', 'interested'].some(word => text.includes(word))) {
      return 'YES';
    }
    
    // Negative intent
    if (['no', 'nah', 'not interested', 'not now', 'never', 'don\'t want'].some(phrase => text.includes(phrase))) {
      return 'NO';
    }
    
    // Maybe/uncertain intent
    if (['maybe', 'not sure', 'think about', 'depends', 'possibly'].some(phrase => text.includes(phrase))) {
      return 'MAYBE';
    }
    
    return null;
  }

  /**
   * Analyze response with AI
   */
  async analyzeResponse(response, question) {
    try {
      const analysisPrompt = `
      Analyze this customer response to determine if they are saying YES, NO, or MAYBE/UNCERTAIN.
      
      Question asked: "${question}"
      Customer response: "${response}"
      
      Rules:
      - Return only "YES" if the response is clearly positive/affirmative
      - Return only "NO" if the response is clearly negative/declining
      - Return only "MAYBE" if the response is uncertain, unclear, or needs follow-up
      
      Response (only YES, NO, or MAYBE):`;

      const result = await analyzeResponseWithGemini(analysisPrompt);
      
      if (result && ['YES', 'NO', 'MAYBE'].includes(result.toUpperCase())) {
        return result.toUpperCase();
      }
      
      // Fallback to keyword matching
      return this.detectIntent(response, 1.0) || 'MAYBE';
      
    } catch (error) {
      console.error('Error analyzing response:', error);
      return 'MAYBE';
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      callSid: this.callSid,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      responses: Object.fromEntries(this.responses),
      repromptCount: this.repromptCount,
      isProcessing: this.isProcessing
    };
  }
}

export default StreamingCallHandler;
