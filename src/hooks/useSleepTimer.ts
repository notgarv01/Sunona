import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { audioEngine } from '../services/audioEngine';

interface UseSleepTimerProps {
  volume: number;
  setVolume: (vol: number) => void;
  setIsPlaying: (playing: boolean) => void;
  showToast: (msg: string) => void;
}

export function useSleepTimer({
  volume,
  setVolume,
  setIsPlaying,
  showToast,
}: UseSleepTimerProps) {
  const [isSleepModalOpen, setIsSleepModalOpen] = useState<boolean>(false);
  const [isSleepOverlayOpen, setIsSleepOverlayOpen] = useState<boolean>(false);
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState<number | null>(null);
  const [isSleepEndOfTrack, setIsSleepEndOfTrack] = useState<boolean>(false);
  const isSleepEndOfTrackRef = useRef<boolean>(false);
  isSleepEndOfTrackRef.current = isSleepEndOfTrack;
  const originalVolumeRef = useRef<number>(volume);

  const triggerSleepMode = useCallback(() => {
    setSleepRemainingSeconds(null);
    setIsSleepEndOfTrack(false);

    audioEngine.stopAndRelease();
    setIsPlaying(false);

    audioEngine.setVolume(originalVolumeRef.current);
    setVolume(originalVolumeRef.current);

    setIsSleepOverlayOpen(true);
    setIsSleepModalOpen(false);
  }, [setIsPlaying, setVolume]);

  const handleSetSleepTimer = useCallback(
    (minutes: number) => {
      originalVolumeRef.current = audioEngine.getVolume();
      setIsSleepEndOfTrack(false);
      setSleepRemainingSeconds(minutes * 60);
      setIsSleepModalOpen(false);
      showToast(`🌙 Sleep timer set for ${minutes} min!`);
    },
    [showToast]
  );

  const handleSetSleepEndOfTrack = useCallback(() => {
    originalVolumeRef.current = audioEngine.getVolume();
    setIsSleepEndOfTrack(true);
    setSleepRemainingSeconds(null);
    setIsSleepModalOpen(false);
    showToast('🌙 Sleep mode will activate when this song ends!');
  }, [showToast]);

  const handleCancelSleepTimer = useCallback(() => {
    setSleepRemainingSeconds(null);
    setIsSleepEndOfTrack(false);
    audioEngine.setVolume(originalVolumeRef.current);
    setVolume(originalVolumeRef.current);
    showToast('Sleep timer turned off');
  }, [setVolume, showToast]);

  const handleAddSleepMinutes = useCallback(
    (minutes: number) => {
      setSleepRemainingSeconds((prev) => (prev ? prev + minutes * 60 : minutes * 60));
      showToast(`Added +${minutes} min to sleep timer`);
    },
    [showToast]
  );

  useEffect(() => {
    if (sleepRemainingSeconds === null) return;

    if (sleepRemainingSeconds <= 0) {
      triggerSleepMode();
      return;
    }

    const timer = setInterval(() => {
      setSleepRemainingSeconds((prev) => {
        if (prev === null) return null;
        const next = prev - 1;

        if (next <= 30 && next > 0) {
          const fadeRatio = next / 30;
          const fadedVolume = originalVolumeRef.current * fadeRatio;
          audioEngine.setVolume(fadedVolume);
          setVolume(fadedVolume);
        }

        if (next <= 0) {
          clearInterval(timer);
          triggerSleepMode();
          return null;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepRemainingSeconds, triggerSleepMode, setVolume]);

  const isSleepTimerActive = useMemo(
    () => sleepRemainingSeconds !== null || isSleepEndOfTrack,
    [sleepRemainingSeconds, isSleepEndOfTrack]
  );

  const sleepRemainingText = useMemo(() => {
    if (isSleepEndOfTrack) return 'Track';
    if (sleepRemainingSeconds !== null) {
      const mins = Math.floor(sleepRemainingSeconds / 60);
      const secs = sleepRemainingSeconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return null;
  }, [isSleepEndOfTrack, sleepRemainingSeconds]);

  return {
    isSleepModalOpen,
    setIsSleepModalOpen,
    isSleepOverlayOpen,
    setIsSleepOverlayOpen,
    sleepRemainingSeconds,
    isSleepEndOfTrack,
    isSleepEndOfTrackRef,
    triggerSleepMode,
    handleSetSleepTimer,
    handleSetSleepEndOfTrack,
    handleCancelSleepTimer,
    handleAddSleepMinutes,
    isSleepTimerActive,
    sleepRemainingText,
  };
}
