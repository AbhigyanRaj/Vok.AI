import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Upload, Phone, User, X, Check } from "lucide-react";
import * as auth from "../lib/auth";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";


interface Contact {
  name: string;
  phone: string;
  selected: boolean;
}

interface ContactUploaderProps {
  onSubmit: (contacts: { name: string; phone: string }[]) => void;
  onClose: () => void;
  selectedModule?: any;
  userModules?: any[];
}

const CSV_TEMPLATE = "name,phone\nAbhigyan Raj,9234567890\nSandeep Mehta,9876543210";

// List of voices with local MP3 files
const ELEVENLABS_FREE_VOICES = [
  { id: 'RACHEL', name: 'Rachel', gender: 'Female', demo: '/audio/rachel.mp3' },
  { id: 'DOMI', name: 'Domi', gender: 'Female', demo: '/audio/domi.mp3' },
  { id: 'BELLA', name: 'Bella', gender: 'Female', demo: '/audio/bella.mp3' },
  { id: 'ANTONI', name: 'Antoni', gender: 'Male', demo: '/audio/antoni.mp3' },
  { id: 'THOMAS', name: 'Thomas', gender: 'Male', demo: '/audio/thomas.mp3' },
  { id: 'JOSH', name: 'Josh', gender: 'Male', demo: '/audio/josh.mp3' },
];

const LANGUAGES = [
  { id: 'english', name: 'English', available: true },
  { id: 'hindi', name: 'Hindi', available: false },
  { id: 'bengali', name: 'Bengali', available: false },
];

const AI_MODELS = [
  { id: 'gemini', name: 'Gemini 1.5 Flash', available: true },
  { id: 'gpt', name: 'GPT-3.5 Turbo', available: true },
  { id: 'claude', name: 'Claude 3', available: false },
  { id: 'llama', name: 'Llama 3', available: false },
];

const ContactUploader: React.FC<ContactUploaderProps> = ({ onSubmit, onClose, selectedModule: initialModule, userModules = [] }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [calling, setCalling] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{
    costPerCall: number;
    currentBalance: number;
    canMakeCall: boolean;
  } | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('RACHEL');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<any>(initialModule || null);
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const moduleDropdownRef = useRef<HTMLDivElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement | null>(null);

  const playDemo = async (voiceId: string) => {
    // If already playing this voice, stop it
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }

    // Stop any currently playing voice
    setPlayingVoice(null);

    // Get the direct MP3 URL for this voice
    const voice = ELEVENLABS_FREE_VOICES.find(v => v.id === voiceId);
    if (!voice) {
      setError(`Voice ${voiceId} not found`);
      return;
    }

    const audioUrl = voice.demo;
    setPlayingVoice(voiceId);
    
    // Create and play audio directly from the MP3 file
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      setPlayingVoice(null);
    };
    
    audio.onerror = (error) => {
      console.error(`❌ Audio playback error for ${voiceId}:`, error);
      setPlayingVoice(null);
      setError(`Failed to play voice preview for ${voiceId}. Please try again.`);
    };
    
    // Start playing
    try {
      await audio.play();
    } catch (playError) {
      console.error(`❌ Failed to play audio for ${voiceId}:`, playError);
      setPlayingVoice(null);
      setError(`Failed to play voice preview for ${voiceId}. Please try again.`);
    }
  };

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      // No audioObj to clean up as we are using direct audio streaming
    };
  }, []);

  // Fetch token information on component mount
  React.useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        const token = auth.getStoredToken();
        
        if (token) {
          const response = await api.getCallCostInfo(token);
          
          if (response.success) {
            setTokenInfo(response);
          } else {
            console.error('Failed to get call cost info:', response.error);
          }
        } else {
          console.log('No token found, skipping token info fetch');
        }
      } catch (error) {
        console.error('Error fetching token info:', error);
      }
    };

    fetchTokenInfo();
  }, []);

  // Close dropdown on outside click or ESC
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [dropdownOpen]);

  // Close module dropdown on outside click or ESC
  useEffect(() => {
    if (!moduleDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(e.target as Node)) {
        setModuleDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModuleDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [moduleDropdownOpen]);

  // Close language dropdown
  useEffect(() => {
    if (!languageDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(e.target as Node)) {
        setLanguageDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLanguageDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [languageDropdownOpen]);

  // Close model dropdown
  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModelDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [modelDropdownOpen]);

  // Minimal CSV parser: expects header row with 'name' and 'phone' columns
  const parseCSV = (csv: string) => {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const phoneIdx = headers.indexOf("phone");
    if (nameIdx === -1 || phoneIdx === -1) return [];
    return lines.slice(1).map(line => {
      const cols = line.split(",");
      return {
        name: cols[nameIdx]?.trim() || "",
        phone: cols[phoneIdx]?.trim() || "",
        selected: true,
      };
    }).filter(c => c.phone);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError("Invalid CSV. Use columns: name, phone");
        setContacts([]);
      } else {
        setContacts(parsed);
        setError("");
        setSuccess("CSV uploaded successfully!");
        setTimeout(() => setSuccess(""), 2000);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleSelectAll = (checked: boolean) => {
    setContacts(cs => cs.map(c => ({ ...c, selected: checked })));
  };

  const handleContactSelect = (idx: number, checked: boolean) => {
    setContacts(cs => cs.map((c, i) => i === idx ? { ...c, selected: checked } : c));
  };

  const makeCallToBackend = async (contact: { name: string; phone: string }) => {
    try {
      const token = auth.getStoredToken();
      
      if (!token) {
        console.error('No authentication token found');
        setError('Authentication required. Please sign in again.');
        return false;
      }

      // Pass selectedVoice to backend (even if ignored for now)
      const result = await api.initiateCall(
        token,
        selectedModule?.id || 'simple-module',
        contact.phone,
        contact.name,
        selectedVoice // <-- pass as extra param (backend can ignore)
      );

      if (result.success) {
        // Update token info after successful call
        if (result.remainingTokens !== undefined) {
          setTokenInfo(prev => prev ? {
            ...prev,
            currentBalance: result.remainingTokens
          } : null);
        }
        return true;
      } else {
        console.error('Call initiation failed:', result.error);
        
        // Handle insufficient tokens error
        if (result.error === 'Insufficient tokens') {
          setError(`Insufficient tokens: ${result.message}`);
          return false;
        }
        
        // Handle trial account limitation
        if (result.error === 'Trial account limitation' || result.code === 'UNVERIFIED_NUMBER') {
          setError(`Call failed: ${result.message}`);
          if (result.suggestion) {
            setError(prev => prev + '\n\n' + result.suggestion);
          }
          return false;
        }
        
        // Handle invalid phone number
        if (result.error === 'Invalid phone number' || result.code === 'INVALID_NUMBER') {
          setError(`Call failed: ${result.message}`);
          return false;
        }
        
        setError(`Call failed: ${result.message || result.error}`);
        return false;
      }
    } catch (error: any) {
      console.error('Error making call:', error);
      
      // Handle insufficient tokens error from API
      if (error.message?.includes('Insufficient tokens') || error.status === 402) {
        setError('Insufficient tokens to make this call. Please buy more tokens.');
        return false;
      }
      
      // Handle network errors
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        setError('Network error. Please check your connection and try again.');
        return false;
      }
      
      setError(`Call failed: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCalling(true);

    try {
      let contactsToCall: { name: string; phone: string }[] = [];

      if (contacts.length > 0) {
        const selected = contacts.filter(c => c.selected);
        if (selected.length === 0) {
          setError("Select at least one contact");
          setCalling(false);
          return;
        }
        contactsToCall = selected.map(({ name, phone }) => ({ name, phone }));
      } else {
        // Manual entry fallback
        if (!manualName || !manualPhone) {
          setError("Enter name and phone");
          setCalling(false);
          return;
        }
        contactsToCall = [{ name: manualName, phone: manualPhone }];
      }

      setSuccess(`Initiating calls to ${contactsToCall.length} contact(s)...`);

      // Make calls to backend
      let successCount = 0;
      for (const contact of contactsToCall) {
        const success = await makeCallToBackend(contact);
        if (success) {
          successCount++;
        }
        // Small delay between calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (successCount > 0) {
        setSuccess(`Successfully initiated ${successCount} call(s)!`);
        setTimeout(() => {
          setSuccess("");
          onSubmit(contactsToCall);
          onClose();
        }, 2000);
      } else {
        setError("Failed to initiate any calls. Please try again.");
      }

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError("An error occurred while making calls. Please try again.");
    } finally {
      setCalling(false);
    }
  };

  // Filtered contacts for search
  const filteredContacts = search.trim()
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      )
    : contacts;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 w-full max-w-md mx-auto p-2 sm:p-0">
      {/* Module Selection Dropdown */}
      <div className="flex flex-col gap-1 relative z-20" ref={moduleDropdownRef}>
        <label className="text-sm text-white/80 font-medium mb-1">Choose Voice Module:</label>
        <button
          type="button"
          className="flex items-center justify-between w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 hover:bg-zinc-800 transition-colors"
          onClick={() => setModuleDropdownOpen((open) => !open)}
          aria-haspopup="listbox"
          aria-expanded={moduleDropdownOpen}
        >
          {selectedModule ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              <span className="font-semibold">{selectedModule.name}</span>
              <span className="text-xs text-zinc-400">({selectedModule.questions?.length || 0} questions)</span>
            </span>
          ) : (
            <span className="text-zinc-400">Select a module...</span>
          )}
          <svg className={`w-4 h-4 ml-2 transition-transform ${moduleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {moduleDropdownOpen && (
          <ul
            className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-64 overflow-y-auto z-30 p-1"
            tabIndex={-1}
            role="listbox"
          >
            {userModules.length === 0 ? (
              <li className="px-4 py-3 text-sm text-zinc-400 text-center">
                No modules available. Create one first!
              </li>
            ) : (
              userModules.map((module) => (
                <li
                  key={module.id}
                  className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer text-sm rounded-md transition-colors ${
                    selectedModule?.id === module.id
                      ? 'bg-blue-950/50 text-blue-300 border border-blue-500/30'
                      : 'hover:bg-zinc-800 text-white/90'
                  }`}
                  onClick={() => {
                    setSelectedModule(module);
                    setModuleDropdownOpen(false);
                    setError('');
                  }}
                  role="option"
                  aria-selected={selectedModule?.id === module.id}
                  tabIndex={0}
                >
                  <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{module.name}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {module.questions?.length || 0} questions
                    </div>
                  </div>
                  {selectedModule?.id === module.id && (
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Show error if no module selected */}
      {!selectedModule && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Please select a voice module to continue</span>
        </div>
      )}

      {/* Language and AI Model - Side by Side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Language Selection */}
        <div className="flex flex-col gap-1.5 relative" ref={languageDropdownRef} style={{ zIndex: languageDropdownOpen ? 40 : 10 }}>
          <label className="text-xs text-zinc-400 font-medium">Language</label>
          <button
            type="button"
            className="flex items-center justify-between w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 text-sm text-white hover:bg-zinc-800 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            onClick={() => setLanguageDropdownOpen((open) => !open)}
          >
            <span className="font-medium">{LANGUAGES.find(l => l.id === selectedLanguage)?.name}</span>
            <svg className={`w-4 h-4 ml-2 transition-transform text-zinc-400 ${languageDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {languageDropdownOpen && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto py-1">
              {LANGUAGES.map(lang => (
                <li
                  key={lang.id}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition-colors ${
                    selectedLanguage === lang.id ? 'bg-blue-600 text-white' : 'hover:bg-zinc-700 text-zinc-200'
                  } ${!lang.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (lang.available) {
                      setSelectedLanguage(lang.id);
                      setLanguageDropdownOpen(false);
                    }
                  }}
                >
                  <span>{lang.name}</span>
                  {!lang.available && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">Soon</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* AI Model Selection */}
        <div className="flex flex-col gap-1.5 relative" ref={modelDropdownRef} style={{ zIndex: modelDropdownOpen ? 40 : 10 }}>
          <label className="text-xs text-zinc-400 font-medium">AI Model</label>
          <button
            type="button"
            className="flex items-center justify-between w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 text-sm text-white hover:bg-zinc-800 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            onClick={() => setModelDropdownOpen((open) => !open)}
          >
            <span className="font-medium truncate">{AI_MODELS.find(m => m.id === selectedModel)?.name}</span>
            <svg className={`w-4 h-4 ml-2 transition-transform text-zinc-400 flex-shrink-0 ${modelDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {modelDropdownOpen && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto py-1">
              {AI_MODELS.map(model => (
                <li
                  key={model.id}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition-colors ${
                    selectedModel === model.id ? 'bg-blue-600 text-white' : 'hover:bg-zinc-700 text-zinc-200'
                  } ${!model.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (model.available) {
                      setSelectedModel(model.id);
                      setModelDropdownOpen(false);
                    }
                  }}
                >
                  <span className="truncate">{model.name}</span>
                  {!model.available && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded flex-shrink-0 ml-2">Soon</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Voice Model Selection */}
      <div className="flex flex-col gap-1.5 relative z-10" ref={dropdownRef}>
        <label className="text-xs text-zinc-400 font-medium">Voice Model</label>
        <button
          type="button"
          className="flex items-center justify-between w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 text-sm text-white hover:bg-zinc-800 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          onClick={() => setDropdownOpen((open) => !open)}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
        >
          <span className="flex items-center gap-2">
            <span className="font-medium">{ELEVENLABS_FREE_VOICES.find(v => v.id === selectedVoice)?.name}</span>
            <span className="text-xs text-zinc-500">({ELEVENLABS_FREE_VOICES.find(v => v.id === selectedVoice)?.gender})</span>
          </span>
          <svg className={`w-4 h-4 ml-2 transition-transform text-zinc-400 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {dropdownOpen && (
          <ul
            className="absolute left-0 right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-64 overflow-y-auto z-30 py-1"
            tabIndex={-1}
            role="listbox"
          >
            {ELEVENLABS_FREE_VOICES.map(v => (
              <li
                key={v.id}
                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm transition-colors ${selectedVoice === v.id ? 'bg-blue-600 text-white' : 'hover:bg-zinc-700 text-zinc-200'}`}
                onClick={() => { setSelectedVoice(v.id); setDropdownOpen(false); }}
                role="option"
                aria-selected={selectedVoice === v.id}
                tabIndex={0}
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{v.name}</span>
                  <span className="text-xs text-zinc-400">({v.gender})</span>
                </span>
                <button
                  type="button"
                  className="ml-2 p-1.5 rounded-full hover:bg-white/10 focus:outline-none transition-colors"
                  onClick={e => { e.stopPropagation(); playDemo(v.id); }}
                  disabled={playingVoice === v.id}
                  aria-label={`Play sample for ${v.name}`}
                >
                  {playingVoice === v.id ? (
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V7z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 5a1 1 0 011.707-.707l4 4a1 1 0 010 1.414l-4 4A1 1 0 018 13V5z" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <label className="text-sm text-white/80 font-medium">Upload CSV (name, phone):</label>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
          download="contacts_template.csv"
          className="text-xs text-blue-400 hover:underline"
        >
          Download template
        </a>
      </div>
      <div
        className={`rounded-lg border-2 border-dashed ${dragActive ? "border-blue-400 bg-blue-950/30" : "border-zinc-700 bg-zinc-900"} px-2 sm:px-4 py-4 sm:py-6 text-center cursor-pointer transition-colors w-full`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <span className="text-xs text-white/60">Drag & drop or click to upload CSV</span>
      </div>
      {contacts.length > 0 && (
        <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-700">
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2 w-full rounded border border-zinc-700 px-3 py-1 text-xs sm:text-sm bg-zinc-800 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={filteredContacts.length > 0 && filteredContacts.every(c => c.selected)}
              onChange={e => handleSelectAll(e.target.checked)}
              className="mr-2 accent-blue-500"
            />
            <span className="text-xs text-white/70">Select All</span>
          </div>
          <div className="max-h-40 overflow-y-auto flex flex-col gap-1 w-full">
            {filteredContacts.map((c, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-2 text-xs sm:text-sm px-2 py-1 rounded transition-colors w-full ${c.selected ? "bg-blue-900/30 text-blue-200" : "text-white/80 hover:bg-zinc-800"}`}
                style={{ cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={c.selected}
                  onChange={e => handleContactSelect(contacts.indexOf(c), e.target.checked)}
                  className="accent-blue-500"
                />
                <span>{c.name} ({c.phone})</span>
              </label>
            ))}
            {filteredContacts.length === 0 && (
              <div className="text-xs text-zinc-400 text-center py-2">No contacts found.</div>
            )}
          </div>
        </div>
      )}
      {contacts.length === 0 && (
        <>
          <div className="border-t border-zinc-800 my-2" />
          <label className="text-sm text-white/80 font-medium">Or enter manually:</label>
          <input
            type="text"
            placeholder="Name"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 bg-zinc-800 text-white placeholder-zinc-400 w-full"
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={manualPhone}
            onChange={e => setManualPhone(e.target.value)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 bg-zinc-800 text-white placeholder-zinc-400 w-full"
          />
        </>
      )}
      {error && <div className="text-red-400 text-xs text-center font-medium">{error}</div>}
      {success && <div className="text-green-400 text-xs text-center font-medium">{success}</div>}
      
      <Button 
        type="submit" 
        className="mt-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors w-full sm:w-auto text-xs sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={calling || !selectedModule}
      >
        {calling ? "Making Calls..." : "Submit"}
      </Button>
    </form>
  );
};

export default ContactUploader; 