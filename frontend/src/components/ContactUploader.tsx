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
}

const CSV_TEMPLATE = "name,phone\nAbhigyan Raj,9234567890\nSandeep Mehta,9876543210";

// List of voices with local MP3 files
const ELEVENLABS_FREE_VOICES = [
  { id: 'RACHEL', name: 'Rachel', gender: 'Female', demo: 'http://localhost:5001/sample-audio/rachel.mp3' },
  { id: 'DOMI', name: 'Domi', gender: 'Female', demo: 'http://localhost:5001/sample-audio/domi.mp3' },
  { id: 'BELLA', name: 'Bella', gender: 'Female', demo: 'http://localhost:5001/sample-audio/bella.mp3' },
  { id: 'ANTONI', name: 'Antoni', gender: 'Male', demo: 'http://localhost:5001/sample-audio/antoni.mp3' },
  { id: 'THOMAS', name: 'Thomas', gender: 'Male', demo: 'http://localhost:5001/sample-audio/thomas.mp3' },
  { id: 'JOSH', name: 'Josh', gender: 'Male', demo: 'http://localhost:5001/sample-audio/josh.mp3' },
];

const ContactUploader: React.FC<ContactUploaderProps> = ({ onSubmit, onClose, selectedModule }) => {
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
      {/* Token Information */}
      {tokenInfo && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-300">Call Cost:</span>
            <span className="text-sm font-medium text-blue-400">{tokenInfo.costPerCall} tokens per call</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-300">Current Balance:</span>
            <span className={`text-sm font-medium ${tokenInfo.currentBalance >= tokenInfo.costPerCall ? 'text-green-400' : 'text-red-400'}`}>
              {tokenInfo.currentBalance} tokens
            </span>
          </div>
          {!tokenInfo.canMakeCall && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              Insufficient tokens. You need {tokenInfo.costPerCall} tokens to make a call.
            </div>
          )}
        </div>
      )}

      {/* Minimal Custom Dropdown for Voice Selection - moved above CSV upload */}
      <div className="flex flex-col gap-1 relative z-10" ref={dropdownRef}>
        <label className="text-sm text-white/80 font-medium mb-1">Choose Voice Model:</label>
        <button
          type="button"
          className="flex items-center justify-between w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          onClick={() => setDropdownOpen((open) => !open)}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
        >
          <span className="flex items-center gap-2">
            <span className="font-semibold">{ELEVENLABS_FREE_VOICES.find(v => v.id === selectedVoice)?.name}</span>
            <span className="text-xs text-zinc-400">({ELEVENLABS_FREE_VOICES.find(v => v.id === selectedVoice)?.gender})</span>
          </span>
          <svg className={`w-4 h-4 ml-2 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {dropdownOpen && (
          <ul
            className="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded shadow-lg max-h-56 overflow-y-auto z-20 p-0"
            tabIndex={-1}
            role="listbox"
          >
            {ELEVENLABS_FREE_VOICES.map(v => (
              <li
                key={v.id}
                className={`flex items-center justify-between px-3 py-1 cursor-pointer text-sm transition-colors ${selectedVoice === v.id ? 'bg-blue-950/40 text-blue-300' : 'hover:bg-zinc-800 text-white/90'}`}
                onClick={() => { setSelectedVoice(v.id); setDropdownOpen(false); }}
                role="option"
                aria-selected={selectedVoice === v.id}
                tabIndex={0}
              >
                <span className="flex items-center gap-2">
                  <span>{v.name}</span>
                  <span className="text-xs text-zinc-400">({v.gender})</span>
                </span>
                <button
                  type="button"
                  className="ml-2 p-1 rounded-full hover:bg-blue-900/30 focus:outline-none"
                  onClick={e => { e.stopPropagation(); playDemo(v.id); }}
                  disabled={playingVoice === v.id}
                  aria-label={`Play sample for ${v.name}`}
                >
                  {playingVoice === v.id ? (
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6 4l12 6-12 6V4z" />
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
        className="mt-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors w-full sm:w-auto text-xs sm:text-base"
        disabled={calling}
      >
        {calling ? "Making Calls..." : "Submit"}
      </Button>
    </form>
  );
};

export default ContactUploader; 