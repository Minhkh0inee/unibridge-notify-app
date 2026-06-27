import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

export type MascotMood = 'happy' | 'impatient' | 'proud' | 'waiting' | 'wave';

const mascotSource: Record<MascotMood, number> = {
  happy: require('@/assets/mascot/cat-happy.png'),
  impatient: require('@/assets/mascot/cat-impatient.png'),
  proud: require('@/assets/mascot/cat-proud.png'),
  waiting: require('@/assets/mascot/cat-waiting.png'),
  wave: require('@/assets/mascot/cat-wave.png'),
};

export function Mascot({ mood = 'happy', size = 88 }: { mood?: MascotMood; size?: number }) {
  return (
    <Image
      source={mascotSource[mood]}
      style={[styles.image, { width: size, height: size }]}
      contentFit="contain"
      transition={180}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    flexShrink: 0,
  },
});
