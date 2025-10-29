import React, { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { X, Phone, Clock, MessageSquare, User, Bot, Download } from "lucide-react";

interface TranscriptLine {
  type: 'ai_speech' | 'user_speech' | 'system';
  text: string;
  speaker: 'AI' | 'User' | 'System';
  timestamp: string;
  confidence?: string;
  questionNumber?: number;
}

interface CallMetrics {
  duration: number;
  questionsAsked: number;
  responsesReceived: number;
  currentStep: string;
}

interface LiveCallModalProps {
  callId: string;
  customerName: string;
  phoneNumber: string;
  onClose: () => void;
}

const LiveCallModal: React.FC<LiveCallModalProps> = ({ 
  callId, 
  customerName, 
  phoneNumber, 
  onClose 
}) => {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [callStatus, setCallStatus] = useState<'connecting' | 'active' | 'ended' | 'error'>('connecting');
  const [metrics, setMetrics] = useState<CallMetrics>({
    duration: 0,
    questionsAsked: 0,
    responsesReceived: 0,
    currentStep: 'Initializing...'
  });
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new transcript arrives
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Connect to WebSocket
  useEffect(() => {
    const wsUrl = process.env.NODE_ENV === 'production'
      ? `wss://vok-ai.onrender.com`
      : `ws://localhost:5001`;
    
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}/live-call/${callId}`);
    
    const ws = new WebSocket(`${wsUrl}/live-call/${callId}`);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      setCallStatus('active');
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setMetrics(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Received:', data);
        
        if (data.type === 'transcript') {
          setTranscript(prev => [...prev, data]);
          
          // Update metrics
          if (data.speaker === 'AI' && data.questionNumber !== undefined) {
            setMetrics(prev => ({ 
              ...prev, 
              questionsAsked: Math.max(prev.questionsAsked, data.questionNumber + 1),
              currentStep: `Question ${data.questionNumber + 1}`
            }));
          } else if (data.speaker === 'User') {
            setMetrics(prev => ({ 
              ...prev, 
              responsesReceived: prev.responsesReceived + 1 
            }));
          }
        } else if (data.type === 'status') {
          setCallStatus(data.status);
          setMetrics(prev => ({ ...prev, currentStep: data.message }));
        } else if (data.type === 'call_ended') {
          setCallStatus('ended');
          setMetrics(prev => ({ ...prev, currentStep: 'Call Completed' }));
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setCallStatus('error');
      setIsConnected(false);
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
      if (callStatus !== 'ended') {
        setCallStatus('ended');
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
    
    wsRef.current = ws;
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connecting': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'ended': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const downloadTranscript = () => {
    const transcriptText = transcript
      .map(line => `[${new Date(line.timestamp).toLocaleTimeString()}] ${line.speaker}: ${line.text}`)
      .join('\n');
    
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-transcript-${callId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-zinc-900 border-zinc-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Live Call Monitor</h2>
                <Badge className={`${getStatusColor()} border`}>
                  {callStatus === 'connecting' && '🔄 Connecting'}
                  {callStatus === 'active' && '🔴 Live'}
                  {callStatus === 'ended' && '✓ Ended'}
                  {callStatus === 'error' && '⚠ Error'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {customerName}
                </span>
                <span>{phoneNumber}</span>
                <span className="text-xs text-zinc-500">ID: {callId.slice(0, 8)}...</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-zinc-400">Duration</span>
              </div>
              <p className="text-lg font-bold text-white">{formatDuration(metrics.duration)}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-xs text-zinc-400">Questions</span>
              </div>
              <p className="text-lg font-bold text-white">{metrics.questionsAsked}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-zinc-400">Responses</span>
              </div>
              <p className="text-lg font-bold text-white">{metrics.responsesReceived}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-zinc-400">Status</span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{metrics.currentStep}</p>
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {!isConnected && callStatus === 'connecting' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-zinc-400">Connecting to live call...</p>
            </div>
          )}
          
          {transcript.length === 0 && isConnected && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">Waiting for conversation to start...</p>
            </div>
          )}

          {transcript.map((line, index) => (
            <div 
              key={index} 
              className={`flex gap-3 ${line.speaker === 'AI' ? 'justify-start' : 'justify-end'}`}
            >
              {line.speaker === 'AI' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
              )}
              
              <div className={`max-w-[70%] ${line.speaker === 'AI' ? 'order-2' : 'order-1'}`}>
                <div className={`rounded-lg p-3 ${
                  line.speaker === 'AI' 
                    ? 'bg-blue-500/10 border border-blue-500/20' 
                    : line.speaker === 'User'
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-zinc-800/50 border border-zinc-700'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${
                      line.speaker === 'AI' ? 'text-blue-400' : 
                      line.speaker === 'User' ? 'text-green-400' : 
                      'text-zinc-400'
                    }`}>
                      {line.speaker}
                      {line.questionNumber !== undefined && ` - Q${line.questionNumber + 1}`}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(line.timestamp).toLocaleTimeString()}
                    </span>
                    {line.confidence && (
                      <span className="text-xs text-zinc-500">
                        ({line.confidence}% confidence)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white leading-relaxed">{line.text}</p>
                </div>
              </div>

              {line.speaker === 'User' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center order-2">
                  <User className="w-4 h-4 text-green-400" />
                </div>
              )}
            </div>
          ))}
          
          <div ref={transcriptEndRef} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-xs text-zinc-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={downloadTranscript}
            disabled={transcript.length === 0}
            className="text-xs"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Transcript
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default LiveCallModal;
