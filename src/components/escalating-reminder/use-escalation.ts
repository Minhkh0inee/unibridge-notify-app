import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { EscalationConfig } from '@/data/types';

import { LEVEL_CONFIGS, SOUND_SOURCES } from './escalation-levels';
import type { EscalationLevel } from './escalation-levels';

export function useEscalation(
  config: EscalationConfig,
  active: boolean
): { level: EscalationLevel; advanceLevel: () => void; cleanup: () => void } {
  const { startGentleSeconds, stepSeconds } = config;
  const [level, setLevel] = useState<EscalationLevel>(0);

  const timer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundRequestRef = useRef(0);

  const clearEscalationTimers = useCallback(() => {
    if (timer1Ref.current !== null) {
      clearTimeout(timer1Ref.current);
      timer1Ref.current = null;
    }
    if (timer2Ref.current !== null) {
      clearTimeout(timer2Ref.current);
      timer2Ref.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearEscalationTimers();
    soundRequestRef.current += 1;
    if (hapticIntervalRef.current !== null) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
    const snd = soundRef.current;
    soundRef.current = null;
    snd?.stopAsync().catch(() => {});
    snd?.unloadAsync().catch(() => {});
  }, [clearEscalationTimers]);

  const advanceLevel = useCallback(() => {
    clearEscalationTimers();
    setLevel((currentLevel) =>
      currentLevel < 2 ? ((currentLevel + 1) as EscalationLevel) : currentLevel
    );
  }, [clearEscalationTimers]);

  // Escalation timer: level 0 → 1 → 2 via chained setTimeout
  useEffect(() => {
    if (!active) {
      cleanup();
      setLevel(0);
      return;
    }

    setLevel(0);

    timer1Ref.current = setTimeout(() => {
      setLevel(1);
      timer2Ref.current = setTimeout(() => {
        setLevel(2);
      }, stepSeconds * 1000);
    }, startGentleSeconds * 1000);

    return cleanup;
  }, [active, startGentleSeconds, stepSeconds, cleanup]);

  // Haptics: escalating intensity + frequency per level.
  // Keep pulsing while the modal is active, increasing intensity per level.
  // expo-haptics emits discrete feedback, so a short interval creates the
  // continuous reminder pattern.
  useEffect(() => {
    if (!active || Platform.OS === 'web') return;

    if (hapticIntervalRef.current !== null) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }

    const HAPTIC_CONFIG = [
      {
        style: Haptics.ImpactFeedbackStyle.Medium,
        androidType: Haptics.AndroidHaptics.Clock_Tick,
        useErrorPattern: false,
        intervalMs: 350,
      },
      {
        style: Haptics.ImpactFeedbackStyle.Heavy,
        androidType: Haptics.AndroidHaptics.Context_Click,
        useErrorPattern: false,
        intervalMs: 220,
      },
      {
        style: Haptics.ImpactFeedbackStyle.Heavy,
        androidType: Haptics.AndroidHaptics.Reject,
        useErrorPattern: true,
        intervalMs: 130,
      },
    ] as const;

    const { style, androidType, useErrorPattern, intervalMs } = HAPTIC_CONFIG[level];
    const fire = async () => {
      try {
        if (Platform.OS === 'android') {
          await Haptics.performAndroidHapticsAsync(androidType);
        } else if (useErrorPattern) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          await Haptics.impactAsync(style);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Unable to play reminder haptic', error);
        }
      }
    };

    void fire(); // immediate pulse when the modal opens or the level changes
    hapticIntervalRef.current = setInterval(() => void fire(), intervalMs);

    return () => {
      if (hapticIntervalRef.current !== null) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
    };
  }, [level, active]);

  // Sound: load and play per level; null entries in SOUND_SOURCES are silent no-ops
  useEffect(() => {
    if (!active || Platform.OS === 'web') return;

    let cancelled = false;
    const requestId = soundRequestRef.current + 1;
    soundRequestRef.current = requestId;

    async function loadAndPlay() {
      const prev = soundRef.current;
      soundRef.current = null;
      if (prev) {
        await prev.stopAsync().catch(() => {});
        await prev.unloadAsync().catch(() => {});
      }

      const src = SOUND_SOURCES[level];
      if (!src || cancelled) return;

      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(src, {
          shouldPlay: false,
          isLooping: true,
          volume: LEVEL_CONFIGS[level].soundVolume,
        });
        if (cancelled || soundRequestRef.current !== requestId) {
          await sound.unloadAsync().catch(() => {});
        } else {
          soundRef.current = sound;
          await sound.playAsync();
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Unable to play reminder sound', error);
        }
      }
    }

    void loadAndPlay();

    return () => {
      cancelled = true;
      if (soundRequestRef.current === requestId) {
        soundRequestRef.current += 1;
      }
      const snd = soundRef.current;
      soundRef.current = null;
      snd?.stopAsync().catch(() => {});
      snd?.unloadAsync().catch(() => {});
    };
  }, [level, active]);

  return { level, advanceLevel, cleanup };
}
