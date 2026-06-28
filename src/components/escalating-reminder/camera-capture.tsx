import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

interface CameraCaptureProps {
  onCapture: (uri: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'web') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.webMessage}>Camera chưa hỗ trợ trên phiên bản web.</Text>
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Hủy</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission) {
    return <ActivityIndicator style={StyleSheet.absoluteFill} />;
  }

  if (!permission.granted) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.center, styles.permissionBg]}>
        <Text style={styles.permissionTitle}>Cần quyền truy cập camera</Text>
        <Text style={styles.permissionBody}>
          Mèo cần camera để chụp ảnh và xác nhận bạn đã uống thuốc.
        </Text>
        <Pressable onPress={requestPermission} style={styles.grantButton}>
          <Text style={styles.grantText}>Cho phép camera</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Hủy</Text>
        </Pressable>
      </View>
    );
  }

  async function handleShutter() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      onCapture(photo.uri);
    } catch {
      setCapturing(false);
    }
    // On success the parent unmounts this component, so no setCapturing(false) needed
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Pressable
          onPress={handleShutter}
          disabled={capturing}
          style={[styles.shutter, capturing && styles.shutterDisabled]}>
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable onPress={onCancel} style={styles.cancelOverlay}>
          <Text style={styles.cancelOverlayText}>Hủy</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  permissionBg: {
    backgroundColor: '#000',
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionBody: {
    color: '#ccc',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  grantButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.two,
  },
  grantText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  webMessage: {
    color: '#fff',
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  cancelText: {
    color: '#aaa',
    fontSize: 15,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.three,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  cancelOverlay: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  cancelOverlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
