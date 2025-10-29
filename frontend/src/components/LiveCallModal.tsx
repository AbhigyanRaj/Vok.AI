import React, { useState, useEffect, useRef } from 'react';
import { X, Phone, Clock, User, Bot, Wifi, WifiOff, XCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface TranscriptLine {
  speaker: 'AI' | 'User';
  text: string;
  timestamp: Date;
  type: 'question' | 'response' | 'analysis' | 'system';
}

interface LiveCallModalProps {
  callId: string;
  customerName: string;
  phoneNumber: string;
  onClose: () => void;
}

interface CallDetails {
  _id: string;
  customerName: string;
  phoneNumber: string;
  status: string;
  duration: number;
  createdAt: string;
  transcription?: string;
  evaluation?: {
    result: string;
    comments: string[];
  };
  responses?: { [key: string]: string };
}

const LiveCallModal: React.FC<LiveCallModalProps> = ({ 
  callId, 
  customerName, 
  phoneNumber, 
  onClose 
}) => {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [callStatus, setCallStatus] = useState<'connecting' | 'active' | 'completed' | 'failed'>('connecting');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const callStartTime = useRef<Date>(new Date());

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcript]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'active') {
      const interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime.current.getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callStatus]);

  // Fetch call details and setup WebSocket connection
  useEffect(() => {
    const fetchCallDetails = async () => {
      setLoading(true);
      setError('');
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          return;
        }

        const response = await fetch(`${process.env.NODE_ENV === 'production' 
          ? 'https://vok-ai.onrender.com/api'
          : 'http://localhost:5001/api'}/calls/${callId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();
        
        if (data.success && data.call) {
          setCallDetails(data.call);
          const isCompleted = data.call.status === 'completed';
          setCallStatus(isCompleted ? 'completed' : 'active');
          setCallDuration(data.call.duration || 0);
          
          // Parse stored transcript if available
          if (data.call.transcription) {
            const parsedTranscript = parseStoredTranscript(data.call.transcription);
            setTranscript(parsedTranscript);
            setCurrentQuestion(isCompleted ? 'Call completed' : 'Loading live transcript...');
          } else if (isCompleted) {
            // Completed call with no transcript
            setError('Transcript not available for this call');
          } else {
            // Live call - will get transcript via WebSocket
            setCurrentQuestion('Waiting for call to start...');
          }

          // Setup WebSocket connection for live calls
          if (!isCompleted) {
            setupWebSocketConnection();
          }
        } else {
          setError('Failed to load call details');
        }
      } catch (error) {
        console.error('Error fetching call details:', error);
        setError('Failed to load call transcript');
      } finally {
        setLoading(false);
      }
    };

    const setupWebSocketConnection = () => {
      try {
        const wsUrl = `${process.env.NODE_ENV === 'production' 
          ? 'wss://vok-ai.onrender.com'
          : 'ws://localhost:5001'}/live-call?callId=${callId}`;
        
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ WebSocket connected for call:', callId);
          setConnectionStatus('connected');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📡 WebSocket message:', message);

            switch (message.type) {
              case 'connection_established':
                setConnectionStatus('connected');
                break;

              case 'transcript_update':
                handleTranscriptUpdate(message);
                break;

              case 'call_status':
                handleCallStatusUpdate(message);
                break;

              case 'call_completed':
                setCallStatus('completed');
                setCurrentQuestion('Call completed');
                setConnectionStatus('disconnected');
                break;

              default:
                console.log('Unknown WebSocket message type:', message.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          setConnectionStatus('disconnected');
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setConnectionStatus('disconnected');
        };

      } catch (error) {
        console.error('Failed to setup WebSocket connection:', error);
        setConnectionStatus('disconnected');
      }
    };

    const handleTranscriptUpdate = (message: any) => {
      const newLine: TranscriptLine = {
        speaker: message.speaker as 'AI' | 'User',
        text: message.text,
        timestamp: new Date(message.timestamp),
        type: message.type || (message.speaker === 'AI' ? 'question' : 'response')
      };

      setTranscript(prev => [...prev, newLine]);
      
      if (message.question) {
        setCurrentQuestion(message.question);
      }
    };

    const handleCallStatusUpdate = (message: any) => {
      setCallStatus(message.status);
      if (message.status === 'completed') {
        setCurrentQuestion('Call completed');
      }
    };

    fetchCallDetails();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [callId]);

  // Parse stored transcript into TranscriptLine format
  const parseStoredTranscript = (transcription: string): TranscriptLine[] => {
    const lines = transcription.split('\n').filter(line => line.trim());
    const parsedLines: TranscriptLine[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('VokAI:')) {
        parsedLines.push({
          speaker: 'AI',
          text: trimmedLine.replace('VokAI:', '').trim(),
          timestamp: new Date(Date.now() - (lines.length - index) * 10000), // Simulate timestamps
          type: trimmedLine.includes('Question') ? 'question' : 'system'
        });
      } else if (trimmedLine.startsWith('User:')) {
        parsedLines.push({
          speaker: 'User',
          text: trimmedLine.replace('User:', '').trim(),
          timestamp: new Date(Date.now() - (lines.length - index) * 10000),
          type: 'response'
        });
      } else if (trimmedLine.includes('[Analysis:')) {
        parsedLines.push({
          speaker: 'AI',
          text: trimmedLine,
          timestamp: new Date(Date.now() - (lines.length - index) * 10000),
          type: 'analysis'
        });
      }
    });
    
    return parsedLines;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connecting': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getConnectionIcon = () => {
    return connectionStatus === 'connected' ? 
      <Wifi className="w-4 h-4 text-green-400" /> : 
      <WifiOff className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-full">
              <Phone className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {callStatus === 'completed' ? 'Call Transcript' : 'Live Call Transcript'}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-zinc-400">{customerName}</span>
                <span className="text-xs text-zinc-500">•</span>
                <span className="text-sm text-zinc-400">{phoneNumber}</span>
                {callDetails && (
                  <>
                    <span className="text-xs text-zinc-500">•</span>
                    <span className="text-sm text-zinc-400">
                      {callDetails.evaluation?.result && (
                        <Badge className={`text-xs ${
                          callDetails.evaluation.result === 'YES' ? 'bg-green-500/20 text-green-400' :
                          callDetails.evaluation.result === 'NO' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {callDetails.evaluation.result}
                        </Badge>
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {getConnectionIcon()}
            <Badge className={getStatusColor(callStatus)}>
              {callStatus.charAt(0).toUpperCase() + callStatus.slice(1)}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Call Info Bar */}
        <div className="px-6 py-4 bg-zinc-800/50 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-white font-mono">
                  {formatDuration(callDuration)}
                </span>
              </div>
              <div className="text-sm text-zinc-400">
                Current: <span className="text-white">{currentQuestion}</span>
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              Call ID: {callId.slice(-8)}
            </div>
          </div>
        </div>

        {/* Transcript Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-lg font-medium">Loading transcript...</p>
              <p className="text-sm">Please wait while we fetch the call details</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <XCircle className="w-12 h-12 mb-4 opacity-50 text-red-400" />
              <p className="text-lg font-medium text-red-400">Transcript Not Available</p>
              <p className="text-sm text-center max-w-md">
                {error === 'Transcript not available for this call' 
                  ? 'This call does not have a transcript. Transcripts are only available for calls made after the feature was implemented.'
                  : error
                }
              </p>
            </div>
          ) : transcript.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <Phone className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No transcript available</p>
              <p className="text-sm">This call does not contain transcript data</p>
            </div>
          ) : (
            <>
              {transcript.map((line, index) => (
                <div 
                  key={index} 
                  className={`flex gap-3 ${line.speaker === 'AI' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[80%] ${line.speaker === 'AI' ? 'order-1' : 'order-2'}`}>
                    <div className={`flex items-center gap-2 mb-1 ${line.speaker === 'User' ? 'justify-end' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        line.speaker === 'AI' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {line.speaker === 'AI' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      </div>
                      <span className="text-xs font-medium text-zinc-300">
                        {line.speaker === 'AI' ? 'VokAI' : customerName}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {line.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className={`p-3 rounded-lg ${
                      line.speaker === 'AI'
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100'
                        : 'bg-green-500/10 border border-green-500/20 text-green-100'
                    }`}>
                      <p className="text-sm leading-relaxed">{line.text}</p>
                      {line.type === 'analysis' && (
                        <div className="mt-2 pt-2 border-t border-current/20">
                          <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            AI Analysis
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-800/30 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-4">
              <span>🔴 Live Recording</span>
              <span>•</span>
              <span>Auto-scroll enabled</span>
            </div>
            <div>
              Powered by VokAI Real-time Transcription
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveCallModal;
