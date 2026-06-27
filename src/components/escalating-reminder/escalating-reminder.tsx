import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { verifyMedicationPhoto } from '@/services/medication-verification';

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

type ViewMode =
  | 'reminder'
  | 'camera'
  | 'verifying'
  | 'verification-failed'
  | 'verification-error'
  | 'success';

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
  const [isVerifying, setIsVerifying] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
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
      setIsVerifying(false);
      setCapturedPhotoUri(null);
    }
  }, [visible]);

  const config = LEVEL_CONFIGS[level];
  const ignoreDisabled =
    (!TEST_ADVANCE_LEVEL_ON_IGNORE && escalationConfig.requirePhotoToStop) ||
    isLogging ||
    isVerifying;

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
    if (isLogging || isVerifying) return;

    setCapturedPhotoUri(photoUri);
    setIsVerifying(true);
    setViewMode('verifying');

    try {
      const result = await verifyMedicationPhoto(photoUri);
      console.log('[MedicationVerification] result:', result);
      if (!result.containsMedication || result.confidence === 'low') {
        setViewMode('verification-failed');
        return;
      }

      setIsLogging(true);
      await logDose({
        medicationId: medication.id,
        scheduledTime,
        actionTakenAt: new Date().toISOString(),
        photoUri,
        status: 'taken',
      });
      cleanup();
      setViewMode('success');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onDismiss();
    } catch (error) {
      console.warn('[MedicationVerification] error:', error);
      setViewMode('verification-error');
      setIsLogging(false);
    } finally {
      setIsVerifying(false);
    }
  }

  function handleRetakePhoto() {
    if (isLogging || isVerifying) return;
    setCapturedPhotoUri(null);
    setViewMode('camera');
  }

  async function handleManualConfirm() {
    if (isLogging || isVerifying) return;

    setIsLogging(true);
    try {
      await logDose({
        medicationId: medication.id,
        scheduledTime,
        actionTakenAt: new Date().toISOString(),
        photoUri: capturedPhotoUri ?? undefined,
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
        {viewMode === 'reminder' && (
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
        )}

        {viewMode === 'camera' && (
          <CameraCapture
            onCapture={handlePhotoConfirm}
            onCancel={() => setViewMode('reminder')}
          />
        )}

        {viewMode === 'verifying' && (
          <View style={styles.statusContent}>
            <ActivityIndicator size="large" color={config.textColor} />
            <Text style={[styles.statusTitle, { color: config.textColor }]}>
              Verifying your dose...
            </Text>
            <Text style={[styles.statusBody, { color: config.textColor }]}>
              Keep this screen open while we check your photo.
            </Text>
          </View>
        )}

        {viewMode === 'verification-failed' && (
          <View style={styles.statusContent}>
            <Text style={styles.statusEmoji}>🔍💊</Text>
            <Text style={[styles.statusTitle, { color: config.textColor }]}>
              No pill detected!
            </Text>
            <Text style={[styles.statusBody, { color: config.textColor }]}>
              Make sure your medication is clearly visible and try again.
            </Text>
            <Pressable onPress={handleRetakePhoto} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Retake Photo</Text>
            </Pressable>
          </View>
        )}

        {viewMode === 'verification-error' && (
          <View style={styles.statusContent}>
            <Text style={styles.statusEmoji}>⚠️</Text>
            <Text style={[styles.statusTitle, { color: config.textColor }]}>
              Verification failed
            </Text>
            <Text style={[styles.statusBody, { color: config.textColor }]}>
              Retake the photo or confirm manually as a last resort.
            </Text>
            <View style={styles.statusButtons}>
              <Pressable
                onPress={handleRetakePhoto}
                disabled={isLogging}
                style={[styles.primaryButton, isLogging && styles.buttonDisabled]}>
                <Text style={styles.primaryButtonText}>Retake Photo</Text>
              </Pressable>
              <Pressable
                onPress={handleManualConfirm}
                disabled={isLogging}
                style={[styles.manualButton, isLogging && styles.buttonDisabled]}>
                <Text style={[styles.manualButtonText, { color: config.textColor }]}>
                  {isLogging ? 'Saving…' : 'Confirm Manually'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {viewMode === 'success' && (
          <View style={[StyleSheet.absoluteFill, styles.successContent]}>
            <Text style={styles.successEmoji}>😊✨</Text>
            <Text style={styles.successTitle}>Great job! Dose confirmed!</Text>
          </View>
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
  statusContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  statusEmoji: {
    fontSize: 72,
    textAlign: 'center',
  },
  statusTitle: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center',
  },
  statusBody: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    opacity: 0.9,
    textAlign: 'center',
  },
  statusButtons: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  manualButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  successContent: {
    backgroundColor: '#22A06B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  successEmoji: {
    fontSize: 100,
    textAlign: 'center',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    textAlign: 'center',
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
