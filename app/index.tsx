import { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen() {
  const router = useRouter();
  const { admin, isLoading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (admin) {
          router.replace('/(tabs)');
        } else {
          router.replace('/login');
        }
      }
    }, 1500); // Reduced for faster navigation

    return () => clearTimeout(timer);
  }, [admin, isLoading, router]);

  // Handle immediate navigation when auth state changes
  useEffect(() => {
    if (!isLoading) {
      const immediateTimer = setTimeout(() => {
        if (admin) {
          console.log('Splash: Admin found, navigating to tabs');
          router.replace('/(tabs)');
        } else {
          console.log('Splash: No admin, navigating to login');
          router.replace('/login');
        }
      }, 500);

      return () => clearTimeout(immediateTimer);
    }
  }, [admin, isLoading, router]);

  return (
    <LinearGradient
      colors={[colors.background, colors.surface]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={[styles.logoContainer, { borderColor: colors.primary }]}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          HAJI FITNESS POINT
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Gym Management System
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});