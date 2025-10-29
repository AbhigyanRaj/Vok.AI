import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import EventEmitter from 'events';

class DeepgramService extends EventEmitter {
  constructor() {
    super();
    this.deepgram = null;
    this.connection = null;
    this.isConnected = false;
    this.apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!this.apiKey) {
      console.error('❌ DEEPGRAM_API_KEY not found in environment variables');
    }
  }

  /**
   * Initialize Deepgram client
   */
  initialize() {
    if (!this.apiKey) {
      throw new Error('Deepgram API key is required');
    }
    
    this.deepgram = createClient(this.apiKey);
    console.log('✅ Deepgram client initialized');
  }

  /**
   * Create a live transcription connection
   * @param {Object} options - Connection options
   * @returns {Object} - Live transcription connection
   */
  async createLiveConnection(options = {}) {
    if (!this.deepgram) {
      this.initialize();
    }

    const defaultOptions = {
      model: 'nova-2-phonecall', // Optimized for telephony
      language: 'en-US',
      smart_format: true,
      interim_results: true, // Get partial transcripts
      endpointing: 300, // 300ms silence to finalize utterance
      encoding: 'mulaw',
      sample_rate: 8000,
      channels: 1,
      punctuate: true,
      // Keyword boosting for better accuracy on common responses
      keywords: ['yes:2', 'no:2', 'maybe:2', 'sure:2', 'okay:2', 'interested:2', 'not interested:2'],
    };

    const connectionOptions = { ...defaultOptions, ...options };

    try {
      this.connection = this.deepgram.listen.live(connectionOptions);
      
      // Set up event listeners
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        this.isConnected = true;
        console.log('🎤 Deepgram connection opened');
        this.emit('connected');
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel?.alternatives?.[0];
        if (transcript && transcript.transcript) {
          const transcriptData = {
            text: transcript.transcript,
            confidence: transcript.confidence,
            isFinal: data.is_final,
            speechFinal: data.speech_final,
            words: transcript.words || []
          };
          
          console.log(`📝 Transcript [${transcriptData.isFinal ? 'FINAL' : 'PARTIAL'}]: "${transcriptData.text}" (confidence: ${transcriptData.confidence?.toFixed(2)})`);
          
          // Emit different events for partial and final transcripts
          if (transcriptData.isFinal || transcriptData.speechFinal) {
            this.emit('finalTranscript', transcriptData);
          } else {
            this.emit('partialTranscript', transcriptData);
          }
          
          this.emit('transcript', transcriptData);
        }
      });

      this.connection.on(LiveTranscriptionEvents.Metadata, (data) => {
        console.log('📊 Deepgram metadata:', data);
        this.emit('metadata', data);
      });

      this.connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('❌ Deepgram error:', error);
        this.emit('error', error);
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        this.isConnected = false;
        console.log('🔌 Deepgram connection closed');
        this.emit('disconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ Failed to create Deepgram connection:', error);
      throw error;
    }
  }

  /**
   * Send audio data to Deepgram
   * @param {Buffer} audioData - Audio data buffer (mulaw, 8kHz)
   */
  sendAudio(audioData) {
    if (!this.connection || !this.isConnected) {
      console.warn('⚠️ Cannot send audio: Deepgram not connected');
      return;
    }

    try {
      this.connection.send(audioData);
    } catch (error) {
      console.error('❌ Error sending audio to Deepgram:', error);
      this.emit('error', error);
    }
  }

  /**
   * Close the Deepgram connection
   */
  close() {
    if (this.connection) {
      try {
        this.connection.finish();
        this.isConnected = false;
        console.log('✅ Deepgram connection closed gracefully');
      } catch (error) {
        console.error('❌ Error closing Deepgram connection:', error);
      }
    }
  }

  /**
   * Check if connection is active
   */
  isActive() {
    return this.isConnected;
  }
}

export default DeepgramService;
