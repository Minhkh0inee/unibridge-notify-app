import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MobileFrameWidth, Spacing } from "@/constants/theme";
import { logDose } from "@/data/storage";
import type { EscalationConfig, Medication } from "@/data/types";
import { scheduleMedicationReminderAfterAsync } from "@/notifications/notifications";
import { verifyMedicationPhoto } from "@/services/medication-verification";

import { CameraCapture } from "./camera-capture";
import type { EscalationLevel } from "./escalation-levels";
import { LEVEL_CONFIGS } from "./escalation-levels";
import { useEscalation } from "./use-escalation";

export interface EscalatingReminderProps {
  visible: boolean;
  medication: Medication;
  scheduledTime: string;
  escalationConfig: EscalationConfig;
  onDismiss: () => void;
}

type ViewMode =
  | "reminder"
  | "camera"
  | "verifying"
  | "verification-failed"
  | "verification-error"
  | "ask-later"
  | "success";

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
  const { level, advanceLevel, cleanup } = useEscalation(
    escalationConfig,
    visible,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("reminder");
  const [isLogging, setIsLogging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [waitingForNextLevel, setWaitingForNextLevel] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const ignoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  // Animate background color through escalation levels
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(level, { duration: 400 });
  }, [level, progress]);

  const animatedBg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1, 2, 3, 4],
      ["#208AEF", "#F5C842", "#F97316", "#E53E3E", "#7F1D1D"],
    ),
  }));

  // Reset view when modal hides
  useEffect(() => {
    if (!visible) {
      if (ignoreTimerRef.current !== null) {
        clearTimeout(ignoreTimerRef.current);
        ignoreTimerRef.current = null;
      }
      setViewMode("reminder");
      setIsLogging(false);
      setIsVerifying(false);
      setWaitingForNextLevel(false);
      setCapturedPhotoUri(null);
    }
  }, [visible]);

  useEffect(
    () => () => {
      if (ignoreTimerRef.current !== null) {
        clearTimeout(ignoreTimerRef.current);
      }
    },
    [],
  );

  const config = LEVEL_CONFIGS[level];

  function handleIgnore() {
    if (isLogging || isVerifying || level === 4) return;

    cleanup();
    setWaitingForNextLevel(true);
    ignoreTimerRef.current = setTimeout(() => {
      ignoreTimerRef.current = null;
      advanceLevel();
      setWaitingForNextLevel(false);
    }, 10_000);
  }

  async function handlePhotoConfirm(photoUri: string) {
    if (isLogging || isVerifying) return;

    setCapturedPhotoUri(photoUri);
    setIsVerifying(true);
    setViewMode("verifying");

    try {
      const result = await verifyMedicationPhoto(photoUri);
      console.log("[MedicationVerification] result:", result);
      if (!result.containsMedication || result.confidence === "low") {
        setViewMode("verification-failed");
        return;
      }

      setIsLogging(true);
      await logDose({
        medicationId: medication.id,
        scheduledTime,
        actionTakenAt: new Date().toISOString(),
        photoUri,
        status: "taken",
      });
      cleanup();
      setViewMode("success");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onDismiss();
    } catch (error) {
      console.warn("[MedicationVerification] error:", error);
      setViewMode("verification-error");
      setIsLogging(false);
    } finally {
      setIsVerifying(false);
    }
  }

  function handleRetakePhoto() {
    if (isLogging || isVerifying) return;
    setCapturedPhotoUri(null);
    setViewMode("camera");
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
        status: "taken",
      });
      cleanup();
      onDismiss();
    } catch {
      setIsLogging(false);
    }
  }

  function openAskLater() {
    if (isLogging || isVerifying) return;
    cleanup();
    setViewMode("ask-later");
  }

  async function handleAskLater(
    seconds: number,
    reason: "busy" | "left-at-home",
  ) {
    if (isLogging) return;

    setIsLogging(true);
    try {
      const scheduledFor = await scheduleMedicationReminderAfterAsync(
        medication,
        scheduledTime,
        seconds,
        reason,
      );
      cleanup();
      onDismiss();
      Alert.alert(
        "Đã hẹn nhắc lại",
        `Mèo sẽ nhắc bạn lúc ${scheduledFor.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}.`,
      );
    } catch (error) {
      setIsLogging(false);
      Alert.alert(
        "Chưa đặt được lời nhắc",
        error instanceof Error ? error.message : "Bạn thử lại giúp mình nhé.",
      );
    }
  }

  return (
    <Modal
      visible={visible && !waitingForNextLevel}
      animationType="slide"
      statusBarTranslucent
      transparent
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedBg]}>
        <View style={styles.container}>
          {viewMode === "reminder" && (
            <View
              style={[
                styles.content,
                {
                  paddingTop: insets.top + Spacing.six,
                  paddingBottom: insets.bottom + Spacing.four,
                },
              ]}
            >
            <MascotDisplay level={level} />

            <Text style={[styles.messageText, { color: config.textColor }]}>
              {config.text}
            </Text>

            <View style={styles.buttons}>
              <Pressable
                onPress={() => setViewMode("camera")}
                disabled={isLogging}
                style={[
                  styles.primaryButton,
                  isLogging && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  📷 Chụp ảnh xác nhận
                </Text>
              </Pressable>

              {level === 4 && (
                <Pressable
                  onPress={openAskLater}
                  disabled={isLogging}
                  style={[
                    styles.laterButton,
                    isLogging && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.laterButtonTitle}>Nhắc tôi sau</Text>
                  <Text style={styles.laterButtonHint}>
                    Đang bận hoặc để quên thuốc
                  </Text>
                </Pressable>
              )}

              {level < 4 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isLogging || isVerifying }}
                  disabled={isLogging || isVerifying}
                  onPress={() => void handleIgnore()}
                  style={[
                    styles.ignoreButton,
                    (isLogging || isVerifying) && styles.buttonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.ignoreButtonText,
                      { color: config.textColor },
                    ]}
                  >
                    Bỏ qua
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {viewMode === "camera" && (
          <CameraCapture
            onCapture={handlePhotoConfirm}
            onCancel={() => setViewMode("reminder")}
          />
        )}

        {viewMode === "verifying" && (
          <View style={styles.statusContent}>
            <ActivityIndicator size="large" color={config.textColor} />
            <Text style={[styles.statusTitle, { color: config.textColor }]}>
              Đang kiểm tra liều thuốc...
            </Text>
            <Text style={[styles.statusBody, { color: config.textColor }]}>
              Giữ màn hình này mở trong lúc Mèo kiểm tra ảnh nhé.
            </Text>
          </View>
        )}

        {viewMode === "verification-failed" && (
          <View style={styles.statusContent}>
            <Image
              source={require('@/assets/mascot/cat-waiting.png')}
              style={styles.statusMascot}
            />
            <Text style={[styles.statusTitle, { color: config.textColor }]}>
              Chưa thấy thuốc trong ảnh
            </Text>
            <Text style={[styles.statusBody, { color: config.textColor }]}>
              Hãy đặt thuốc ở nơi đủ sáng, nhìn rõ rồi thử chụp lại nhé.
            </Text>
            <Pressable onPress={handleRetakePhoto} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Chụp lại ảnh</Text>
            </Pressable>
          </View>
        )}

        {viewMode === "verification-error" && (
          <View style={styles.statusContent}>
            <Image
              source={require('@/assets/mascot/cat-waiting.png')}
              style={styles.statusMascot}
            />
            <Text style={[styles.statusTitle, { color: config.textColor }]}>
              Không thể kiểm tra ảnh
            </Text>
            <Text style={[styles.statusBody, { color: config.textColor }]}>
              Bạn có thể chụp lại hoặc tự xác nhận nếu đã uống thuốc.
            </Text>
            <View style={styles.statusButtons}>
              <Pressable
                onPress={handleRetakePhoto}
                disabled={isLogging}
                style={[
                  styles.primaryButton,
                  isLogging && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>Chụp lại ảnh</Text>
              </Pressable>
              <Pressable
                onPress={handleManualConfirm}
                disabled={isLogging}
                style={[
                  styles.manualButton,
                  isLogging && styles.buttonDisabled,
                ]}
              >
                <Text
                  style={[styles.manualButtonText, { color: config.textColor }]}
                >
                  {isLogging ? "Đang lưu…" : "Tự xác nhận đã uống"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {viewMode === "ask-later" && (
          <View style={styles.statusContent}>
            <Image
              source={require('@/assets/mascot/cat-waiting.png')}
              style={styles.statusMascot}
            />
            <Text style={[styles.statusTitle, { color: config.textColor }]}>
              Khi nào Mèo nên nhắc lại?
            </Text>
            <Text style={[styles.statusBody, { color: config.textColor }]}>
              Không sao cả — chọn tình huống phù hợp nhất với bạn lúc này.
            </Text>
            <View style={styles.laterOptions}>
              <Pressable
                disabled={isLogging}
                onPress={() => void handleAskLater(30 * 60, "busy")}
                style={[styles.laterOption, isLogging && styles.buttonDisabled]}
              >
                <View>
                  <Text style={styles.laterOptionTitle}>Đang bận một chút</Text>
                  <Text style={styles.laterOptionBody}>
                    Nhắc lại sau 30 phút
                  </Text>
                </View>
                <Text style={styles.laterOptionTime}>30p</Text>
              </Pressable>
              <Pressable
                disabled={isLogging}
                onPress={() => void handleAskLater(60 * 60, "left-at-home")}
                style={[styles.laterOption, isLogging && styles.buttonDisabled]}
              >
                <View>
                  <Text style={styles.laterOptionTitle}>
                    Để quên thuốc ở nhà
                  </Text>
                  <Text style={styles.laterOptionBody}>Nhắc lại sau 1 giờ</Text>
                </View>
                <Text style={styles.laterOptionTime}>1h</Text>
              </Pressable>
            </View>
            {isLogging && <ActivityIndicator color={config.textColor} />}
          </View>
        )}

        {viewMode === "success" && (
          <View style={[StyleSheet.absoluteFill, styles.successContent]}>
            <Image
              source={require('@/assets/mascot/cat-happy.png')}
              style={styles.successMascot}
            />
            <Text style={styles.successTitle}>
              Tuyệt lắm! Đã xác nhận liều thuốc.
            </Text>
          </View>
        )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: "center",
    maxWidth: MobileFrameWidth,
    width: "100%",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  mascotEmoji: {
    fontSize: 100,
    textAlign: "center",
  },
  mascotImage: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
  messageText: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 30,
  },
  buttons: {
    alignSelf: "stretch",
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  primaryButton: {
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  laterButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  laterButtonTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  laterButtonHint: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 3,
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  statusContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  statusEmoji: {
    fontSize: 72,
    textAlign: "center",
  },
  statusMascot: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  statusTitle: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 34,
    textAlign: "center",
  },
  statusBody: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    opacity: 0.9,
    textAlign: "center",
  },
  statusButtons: {
    alignSelf: "stretch",
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  laterOptions: {
    alignSelf: "stretch",
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  laterOption: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.36)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  laterOptionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  laterOptionBody: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 4,
    opacity: 0.75,
  },
  laterOptionTime: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  manualButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  successContent: {
    backgroundColor: "#22A06B",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  successEmoji: {
    fontSize: 100,
    textAlign: "center",
  },
  successMascot: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
  },
  successTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
    textAlign: "center",
  },
  ignoreButton: {
    paddingVertical: Spacing.three,
    alignItems: "center",
  },
  ignoreButtonDimmed: {
    opacity: 0.35,
  },
  ignoreButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  ignoreButtonTextDimmed: {
    textDecorationLine: "line-through",
  },
});
