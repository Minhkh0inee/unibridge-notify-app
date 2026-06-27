import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import type { EscalationConfig, Medication } from '@/data/types';
import { logDose } from '@/data/storage';

import { LEVEL_CONFIGS, TEST_ADVANCE_LEVEL_ON_IGNORE } from './escalation-levels';
import type { EscalationLevel } from './escalation-levels';
import { useEscalation } from './use-escalation';
import { CameraCapture } from './camera-capture';

export interface EscalatingReminderProps {
  visible: boolean;
  medication: Medication;
  scheduledTime: string;
  escalationConfig: EscalationConfig;
  onDismiss: () => void;
}

type ViewMode = 'reminder' | 'camera';

function MascotDisplay({ level }: { level: EscalationLevel }) {
  const config = LEVEL_CONFIGS[level];
  if (config.imageSrc !== null) {
    return <Image source={config.imageSrc} style={styles.mascotImage} />;
  }
  return <Text style={styles.mascotEmoji}>{config.emoji}</Text>;
}

export function EscalatingReminder({
  visible,
  medication,
  scheduledTime,
  escalationConfig,
  onDismiss,
}: EscalatingReminderProps) {
  const { level, advanceLevel, cleanup } = useEscalation(escalationConfig, visible);
  const [viewMode, setViewMode] = useState<ViewMode>('reminder');
  const [isLogging, setIsLogging] = useState(false);
  const insets = useSafeAreaInsets();

  // Animate background color through escalation levels
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(level, { duration: 400 });
  }, [level, progress]);

  const animatedBg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1, 2],
      ['#208AEF', '#F5C842', '#E53E3E']
    ),
  }));

  // Reset view when modal hides
  useEffect(() => {
    if (!visible) {
      setViewMode('reminder');
      setIsLogging(false);
    }
  }, [visible]);

  const config = LEVEL_CONFIGS[level];
  const ignoreDisabled =
    (!TEST_ADVANCE_LEVEL_ON_IGNORE && escalationConfig.requirePhotoToStop) || isLogging;

  async function handleIgnore() {
    if (ignoreDisabled) return;
    if (TEST_ADVANCE_LEVEL_ON_IGNORE && level < 2) {
      advanceLevel();
      return;
    }

    setIsLogging(true);
    try {
      await logDose({
        medicationId: medication.id,
        scheduledTime,
        actionTakenAt: new Date().toISOString(),
        status: 'ignored',
      });
      cleanup();
      onDismiss();
    } catch {
      setIsLogging(false);
    }
  }

  async function handlePhotoConfirm(photoUri: string) {
    if (isLogging) return;
    setIsLogging(true);
    setViewMode('reminder');
    try {
      await logDose({
        medicationId: medication.id,
        scheduledTime,
        actionTakenAt: new Date().toISOString(),
        photoUri,
        status: 'taken',
      });
      cleanup();
      onDismiss();
    } catch {
      setIsLogging(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent transparent>
      <Animated.View style={[StyleSheet.absoluteFill, animatedBg]}>
        {viewMode === 'reminder' ? (
          <View
            style={[
              styles.content,
              {
                paddingTop: insets.top + Spacing.six,
                paddingBottom: insets.bottom + Spacing.four,
              },
            ]}>
            <MascotDisplay level={level} />

            <Text style={[styles.messageText, { color: config.textColor }]}>{config.text}</Text>

            <View style={styles.buttons}>
              <Pressable
                onPress={() => setViewMode('camera')}
                disabled={isLogging}
                style={[styles.primaryButton, isLogging && styles.buttonDisabled]}>
                <Text style={styles.primaryButtonText}>📷 Photo confirm dose taken</Text>
              </Pressable>

              <Pressable
                onPress={handleIgnore}
                disabled={ignoreDisabled}
                accessibilityState={{ disabled: ignoreDisabled }}
                style={[styles.ignoreButton, ignoreDisabled && styles.ignoreButtonDimmed]}>
                <Text
                  style={[
                    styles.ignoreButtonText,
                    { color: config.textColor },
                    ignoreDisabled && styles.ignoreButtonTextDimmed,
                  ]}>
                  Ignore
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <CameraCapture
            onCapture={handlePhotoConfirm}
            onCancel={() => setViewMode('reminder')}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  mascotEmoji: {
    fontSize: 100,
    textAlign: 'center',
  },
  mascotImage: {
    width: 160,
    height: 160,
  },
  messageText: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
  },
  buttons: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  primaryButton: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  ignoreButton: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  ignoreButtonDimmed: {
    opacity: 0.35,
  },
  ignoreButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  ignoreButtonTextDimmed: {
    textDecorationLine: 'line-through',
  },
});
