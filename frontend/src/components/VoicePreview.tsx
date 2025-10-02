import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

interface Voice {
  key: string;
  name: string;
  gender: string;
  sampleUrl: string;
}

interface VoicePreviewProps {
  selectedVoice?: string;
  onVoiceSelect?: (voiceKey: string) => void;
  className?: string;
}

// Static voice data with direct MP3 URLs
const VOICES: Voice[] = [
  { key: 'RACHEL', name: 'Rachel', gender: 'female', sampleUrl: 'http://localhost:5001/sample-audio/rachel.mp3' },
  { key: 'DOMI', name: 'Domi', gender: 'female', sampleUrl: 'http://localhost:5001/sample-audio/domi.mp3' },
  { key: 'BELLA', name: 'Bella', gender: 'female', sampleUrl: 'http://localhost:5001/sample-audio/bella.mp3' },
  { key: 'ANTONI', name: 'Antoni', gender: 'male', sampleUrl: 'http://localhost:5001/sample-audio/antoni.mp3' },
  { key: 'THOMAS', name: 'Thomas', gender: 'male', sampleUrl: 'http://localhost:5001/sample-audio/thomas.mp3' },
  { key: 'JOSH', name: 'Josh', gender: 'male', sampleUrl: 'http://localhost:5001/sample-audio/josh.mp3' }
];

const VoicePreview: React.FC<VoicePreviewProps> = ({ 
  selectedVoice = 'RACHEL', 
  onVoiceSelect,
  className = '' 
}) => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());

  // Pre-load audio elements on component mount
  useEffect(() => {
    const audioMap = new Map<string, HTMLAudioElement>();
    VOICES.forEach((voice) => {
      const audio = new Audio(voice.sampleUrl);
      audio.preload = 'metadata';
      audioMap.set(voice.key, audio);
    });
    setAudioElements(audioMap);
  }, []);

  const playVoiceSample = async (voiceKey: string) => {
    try {
      // Stop any currently playing audio
      if (playingVoice && audioElements.has(playingVoice)) {
        const currentAudio = audioElements.get(playingVoice);
        currentAudio?.pause();
        currentAudio!.currentTime = 0;
      }

      const audio = audioElements.get(voiceKey);
      if (!audio) {
        console.error('Audio element not found for voice:', voiceKey);
        return;
      }

      setPlayingVoice(voiceKey);
      
      // Set up event listeners
      const handleEnded = () => {
        setPlayingVoice(null);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };

      const handleError = () => {
        setPlayingVoice(null);
        console.error('Error playing audio for voice:', voiceKey);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };

      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      await audio.play();
    } catch (err) {
      console.error('Error playing voice sample:', err);
      setPlayingVoice(null);
    }
  };

  const stopVoiceSample = (voiceKey: string) => {
    const audio = audioElements.get(voiceKey);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlayingVoice(null);
  };

  const handleVoiceSelect = (voiceKey: string) => {
    if (onVoiceSelect) {
      onVoiceSelect(voiceKey);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white">Voice Selection</h3>
      <div className="grid gap-3">
        {VOICES.map((voice) => (
          <div
            key={voice.key}
            className={`
              flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer
              ${selectedVoice === voice.key 
                ? 'bg-blue-900/30 border-blue-500/50 ring-1 ring-blue-500/30' 
                : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50'
              }
            `}
            onClick={() => handleVoiceSelect(voice.key)}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-white">{voice.name}</h4>
                  <span className={`
                    px-2 py-1 text-xs rounded-full
                    ${voice.gender === 'female' 
                      ? 'bg-pink-900/30 text-pink-300' 
                      : 'bg-blue-900/30 text-blue-300'
                    }
                  `}>
                    {voice.gender}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Sample ready
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  if (playingVoice === voice.key) {
                    stopVoiceSample(voice.key);
                  } else {
                    playVoiceSample(voice.key);
                  }
                }}
                variant="outline"
                size="sm"
                className="bg-gray-700/50 border-gray-600/50 hover:bg-gray-600/50"
              >
                {playingVoice === voice.key ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoicePreview;
