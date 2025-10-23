import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

type Sound = 'clock-in' | 'clock-out' | 'save' | 'delete' | 'add' | 'notification' | 'success';

interface AudioContextType {
  play: (sound: Sound) => void;
}

const SaatiAudioContext = createContext<AudioContextType | undefined>(undefined);

const soundEffects: Record<Sound, string> = {
  'clock-in': 'https://raw.githack.com/Pixel-Perfect-Engineering-Displays/Saati-Assets/main/sounds/clock-in.mp3',
  'clock-out': 'https://raw.githack.com/Pixel-Perfect-Engineering-Displays/Saati-Assets/main/sounds/clock-out.mp3',
  'save': 'https://raw.githack.com/Pixel-Perfect-Engineering-Displays/Saati-Assets/main/sounds/save.mp3',
  'delete': 'https://raw.githack.com/Pixel-Perfect-Engineering-Displays/Saati-Assets/main/sounds/delete.mp3',
  'add': 'https://raw.githack.com/Pixel-Perfect-Engineering-Displays/Saati-Assets/main/sounds/add.mp3',
  'notification': 'https://raw.githack.com/Pixel-Perfect-Engineering-Displays/Saati-Assets/main/sounds/notification.mp3',
  'success': 'https://raw.githack.com/Pixel-Perfect-Engineering-Displays/Saati-Assets/main/sounds/success.mp3',
};

interface AudioProviderProps {
  children: React.ReactNode;
  isEnabled: boolean;
}

export const AudioProvider = ({ children, isEnabled }: AudioProviderProps) => {
  const audioCache = useRef<Record<Sound, HTMLAudioElement | null>>({} as any);

  useEffect(() => {
    // Preload audio files
    (Object.keys(soundEffects) as Sound[]).forEach(sound => {
      if (!audioCache.current[sound]) {
        const audio = new Audio(soundEffects[sound]);
        audio.preload = 'auto';
        audioCache.current[sound] = audio;
      }
    });
  }, []);

  const play = useCallback((sound: Sound) => {
    if (isEnabled) {
      const audio = audioCache.current[sound];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(error => console.error(`Error playing sound: ${sound}`, error));
      }
    }
  }, [isEnabled]);

  // FIX: Replaced JSX with React.createElement to support usage in a .ts file.
  // The original JSX was causing parsing errors because this file does not have a .tsx extension.
  return React.createElement(SaatiAudioContext.Provider, { value: { play } }, children);
};

export const useAudio = (): AudioContextType => {
  const context = useContext(SaatiAudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
