import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faChevronDown, faSliders, faVolumeHigh } from '@fortawesome/free-solid-svg-icons';

export interface VoiceOption {
  id: string;
  name: string;
  category?: string;
  previewUrl?: string;
  description?: string;
  accent?: string;
}

const DEFAULT_VOICES: VoiceOption[] = [
  {
    id: 'rachel',
    name: 'Rachel (Calm & Professional)',
    category: 'Conversational',
    description: 'Warm, clear and natural tone suitable for interactive assistants',
    accent: 'US / English',
  },
  {
    id: 'adam',
    name: 'Adam (Bold & Futuristic)',
    category: 'Deep / Narrative',
    description: 'Deep, expressive, authoritative voice with rich modulation',
    accent: 'US / English',
  },
  {
    id: 'domi',
    name: 'Domi (Dynamic & Energetic)',
    category: 'Engaging',
    description: 'Energetic, fast-paced and youthful voice profile',
    accent: 'US / English',
  },
  {
    id: 'charlotte',
    name: 'Charlotte (Seductive & Crisp)',
    category: 'Conversational',
    description: 'British refined accent with melodic cadences',
    accent: 'UK / English',
  },
  {
    id: 'clyde',
    name: 'Clyde (War-Veteran / Cyberpunk)',
    category: 'Character',
    description: 'Gravelly and futuristic tactical persona',
    accent: 'US / English',
  },
];

interface VoicePickerProps {
  value?: string;
  onValueChange?: (voiceId: string) => void;
  className?: string;
}

export function VoicePicker({
  value = 'adam',
  onValueChange,
  className = '',
}: VoicePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState(value);
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>(DEFAULT_VOICES);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Sync available browser synthesis voices if present
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const sysVoices = window.speechSynthesis.getVoices();
        if (sysVoices && sysVoices.length > 0) {
          const mapped: VoiceOption[] = sysVoices.slice(0, 10).map((v, i) => ({
            id: v.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: v.name,
            category: v.lang,
            accent: v.lang,
            description: `${v.lang} native voice synthesized in high fidelity`,
          }));
          // Combine with presets
          setAvailableVoices([...DEFAULT_VOICES, ...mapped]);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    if (onValueChange) {
      onValueChange(voiceId);
    }
    setIsOpen(false);
  };

  const handlePreview = (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlayingPreview === voice.id) {
      window.speechSynthesis.cancel();
      setIsPlayingPreview(null);
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlayingPreview(voice.id);

    const utterance = new SpeechSynthesisUtterance(
      `Hello! I am ${voice.name.split(' ')[0]}. Testing neural voice synthesis.`
    );
    utterance.onend = () => setIsPlayingPreview(null);
    utterance.onerror = () => setIsPlayingPreview(null);

    // Pick system voice matching name if available
    const systemVoices = window.speechSynthesis.getVoices();
    const match = systemVoices.find(v => v.name.toLowerCase().includes(voice.id));
    if (match) {
      utterance.voice = match;
    }

    window.speechSynthesis.speak(utterance);
  };

  const selectedVoice =
    availableVoices.find(v => v.id === selectedVoiceId) || availableVoices[0];

  const filteredVoices = availableVoices.filter(
    v =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.category && v.category.toLowerCase().includes(search.toLowerCase())) ||
      (v.accent && v.accent.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={`relative w-full max-w-sm ${className}`} ref={dropdownRef}>
      {/* Main Selector Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/20 hover:border-[#ff4500] transition-all duration-200 cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-[#ff4500] flex items-center justify-center text-white flex-shrink-0">
            <FontAwesomeIcon icon={faVolumeHigh} className="text-xs" />
          </div>
          <div className="truncate text-left">
            <div className="text-sm font-semibold text-white group-hover:text-[#ff6b35] transition-colors truncate">
              {selectedVoice.name}
            </div>
            <div className="text-xs text-white/70 truncate">
              {selectedVoice.category || 'Standard'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            type="button"
            onClick={(e) => handlePreview(e, selectedVoice)}
            className="w-7 h-7 rounded-full bg-black/20 hover:bg-[#ff4500] hover:text-white text-white flex items-center justify-center text-xs transition-colors"
            title="Preview voice"
          >
            <FontAwesomeIcon icon={isPlayingPreview === selectedVoice.id ? faPause : faPlay} />
          </button>
          <FontAwesomeIcon
            icon={faChevronDown}
            className={`text-xs text-white/70 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#ff4500]' : ''
              }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 p-2 rounded-xl bg-[#201f1f] border border-white/30 shadow-2xl backdrop-blur-md">
          <div className="p-1 mb-2">
            <input
              type="text"
              placeholder="Search neural voices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/20 text-white border border-white/20 focus:outline-none focus:border-[#ff4500] placeholder-white/50"
              autoFocus
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {filteredVoices.map((voice) => {
              const isSelected = voice.id === selectedVoiceId;
              const isPlaying = isPlayingPreview === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => handleSelect(voice.id)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${isSelected
                      ? 'bg-[#ff4500] text-white'
                      : 'hover:bg-black/20 text-white'
                    }`}
                >
                  <div className="truncate mr-2">
                    <div className="text-xs font-semibold flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-white/40'}`} />
                      <span className="truncate">{voice.name}</span>
                    </div>
                    {voice.description && (
                      <div className="text-[10px] text-white/70 truncate pl-3.5">
                        {voice.description}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handlePreview(e, voice)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 transition-colors ${isPlaying
                        ? 'bg-white text-[#ff4500]'
                        : 'bg-black/30 text-white hover:bg-[#ff4500]'
                      }`}
                  >
                    <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
                  </button>
                </div>
              );
            })}

            {filteredVoices.length === 0 && (
              <div className="text-center py-4 text-xs text-white/70">
                No voices found matching &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VoicePicker;
