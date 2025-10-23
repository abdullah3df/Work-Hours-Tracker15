import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LogEntry, ProfileSettings } from '../types';
import { formatDuration, formatTime } from '../lib/utils';
import { ShiftStartIcon, ShiftEndIcon, CalendarDaysIcon } from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';
import { useAudio } from '../hooks/useAudio';

interface TimeTrackerProps {
  addLog: (log: Omit<LogEntry, 'id'>) => Promise<void>;
  profile: ProfileSettings;
  t: (key: string) => string;
  showToast: (message: string, type?: 'success' | 'error') => void;
  language: string;
  logs: LogEntry[];
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ addLog, profile, t, showToast, language, logs }) => {
  const [startTimeISO, setStartTimeISO] = useLocalStorage<string | null>('saati-shift-startTime', null);
  const [notes, setNotes] = useLocalStorage<string>('saati-shift-notes', '');
  const [breakMinutes, setBreakMinutes] = useLocalStorage<number>('saati-shift-breakMinutes', profile.defaultBreakMinutes);
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const intervalRef = useRef<number | null>(null);
  const audio = useAudio();

  const isRunning = !!startTimeISO;
  const startTime = startTimeISO ? new Date(startTimeISO) : null;
  
  const vacationDaysTaken = useMemo(() => logs.filter(log => log.type === 'vacation').length, [logs]);
  const remainingVacationDays = (profile.totalVacationDays || 0) - vacationDaysTaken;

  // Sync default break minutes from profile when no shift is running
  useEffect(() => {
    if (!isRunning) {
      setBreakMinutes(profile.defaultBreakMinutes);
    }
  }, [profile.defaultBreakMinutes, isRunning, setBreakMinutes]);

  // Timer for elapsed time
  useEffect(() => {
    if (isRunning && startTimeISO) {
      const start = new Date(startTimeISO);
      // Set initial value immediately
      setElapsedTime(new Date().getTime() - start.getTime());
      
      intervalRef.current = window.setInterval(() => {
        // Recalculate based on the original start time to avoid drift
        setElapsedTime(new Date().getTime() - start.getTime());
      }, 1000);
    } else {
      setElapsedTime(0); // Reset when not running
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, startTimeISO]);

  // Timer for current real-time clock
  useEffect(() => {
    const clockInterval = window.setInterval(() => {
        setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(clockInterval);
  }, []);


  const handleStart = () => {
    audio.play('clock-in');
    setStartTimeISO(new Date().toISOString());
  };

  const handleStop = async () => {
    if (!startTime) return;
    
    const endTime = new Date();
    audio.play('clock-out');
    
    try {
      await addLog({
        date: startTime.toISOString().split('T')[0],
        type: 'work',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        breakMinutes: Number(breakMinutes) || 0,
        notes,
      });
      showToast(t('shiftSaved'), 'success');
       // Reset all persisted shift data on success
      setStartTimeISO(null);
      setNotes('');
      setBreakMinutes(profile.defaultBreakMinutes);
    } catch(error) {
      console.error("Failed to save shift:", error);
      showToast(t('saveError'), 'error');
    }
  };
  
  return (
    <div className="bg-glass-bg-light dark:bg-glass-bg-dark border border-glass-border-light dark:border-glass-border-dark p-6 sm:p-8 rounded-2xl shadow-2xl shadow-shadow-color-light dark:shadow-shadow-color-dark w-full max-w-4xl mx-auto transition-all duration-300">
      
      <div className="flex flex-col sm:flex-row justify-around items-center mb-8 text-center space-y-6 sm:space-y-0">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('currentTime')}</p>
          <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800 dark:text-white font-mono text-glow" suppressHydrationWarning>{formatTime(currentTime)}</p>
        </div>
        <div className="w-px h-16 bg-gray-300/50 dark:bg-gray-600/50 hidden sm:block"></div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('shiftDuration')}</p>
          <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800 dark:text-white font-mono text-glow">{formatDuration(elapsedTime)}</p>
        </div>
      </div>

      <div className="sm:hidden text-center mb-6 -mt-2">
        <p className="text-lg font-bold text-gray-800 dark:text-white" suppressHydrationWarning>
            {currentTime.toLocaleDateString(language, { weekday: 'long' })}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400" suppressHydrationWarning>
            {currentTime.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex flex-wrap justify-center items-center my-8 gap-4 gooey-container">
        {/* Clock In Button */}
        <button
          onClick={handleStart}
          disabled={isRunning}
          className={`gooey-button w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-in-out focus:outline-none 
            bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 dark:shadow-emerald-800/30
            disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-500 disabled:dark:bg-gray-600 disabled:dark:from-gray-600 disabled:dark:to-gray-700 disabled:cursor-not-allowed disabled:shadow-none
            ${!isRunning ? 'pulse-glow-start' : ''}`}
          aria-label={t('clockIn')}
        >
          <ShiftStartIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
          <span className="text-base sm:text-lg md:text-xl font-semibold mt-2">{t('clockIn')}</span>
        </button>

        {/* Date & Break Display */}
        <div className="text-center px-2 flex-shrink-0 flex flex-col items-center gap-4 z-10">
            <div className="hidden sm:block">
                <p className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white" suppressHydrationWarning>
                    {currentTime.toLocaleDateString(language, { weekday: 'long' })}
                </p>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400" suppressHydrationWarning>
                    {currentTime.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-2 sm:gap-4">
                {/* Break Duration Input */}
                <div className="w-full sm:w-28 text-center">
                    <label htmlFor="break-minutes" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('breakDurationLabel')}</label>
                    <input
                        type="number"
                        id="break-minutes"
                        min="0"
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(parseInt(e.target.value, 10) || 0)}
                        className="w-full text-center p-2 h-12 sm:h-14 text-lg sm:text-xl font-semibold bg-white/50 dark:bg-slate-800/50 border border-gray-300/50 dark:border-slate-700/50 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:text-white"
                    />
                </div>

                {/* Vacation Days Counter */}
                <div className="w-full sm:w-28 text-center">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('remainingVacation')}</label>
                    <div className={`w-full flex items-center justify-center gap-2 p-2 h-12 sm:h-14 text-lg sm:text-xl bg-white/50 dark:bg-slate-800/50 border border-gray-300/50 dark:border-slate-700/50 rounded-md shadow-sm ${remainingVacationDays <= 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                        <CalendarDaysIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                        <span className="font-semibold">{remainingVacationDays}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Clock Out Button */}
        <button
          onClick={handleStop}
          disabled={!isRunning}
          className={`gooey-button w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-in-out focus:outline-none
            bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/30 dark:shadow-rose-800/30
            disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-500 disabled:dark:bg-gray-600 disabled:dark:from-gray-600 disabled:dark:to-gray-700 disabled:cursor-not-allowed disabled:shadow-none`}
          aria-label={t('clockOut')}
        >
          <ShiftEndIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
          <span className="text-base sm:text-lg md:text-xl font-semibold mt-2">{t('clockOut')}</span>
        </button>
      </div>

      <div className="max-w-sm mx-auto">
        <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('notes')}</label>
             <input
              type="text"
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full bg-white/50 dark:bg-slate-800/50 border border-gray-300/50 dark:border-slate-700/50 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:text-white h-14 px-3 text-lg"
              placeholder={t('notes')}
            />
        </div>
      </div>
    </div>
  );
};

export default TimeTracker;
