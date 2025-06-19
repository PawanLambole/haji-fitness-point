import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, EyeOff, Eye } from 'lucide-react-native';
import { useRouter } from 'expo-router';


export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { colors } = useTheme();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

 const handlePasswordReset = async () => {
  if (!email || !newPassword) {
    Alert.alert('Missing Fields', 'Please enter email and new password');
    return;
  }

  setIsLoading(true);

  try {
    const response = await fetch('https://haji-password-reset-api.onrender.com/update-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, newPassword }),
    });

    const contentType = response.headers.get('content-type');

    let result;
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Unexpected response: ${text}`);
    }

    if (!response.ok) {
      throw new Error(result.error || 'Password reset failed');
    }

    Alert.alert('Success', 'Password updated successfully');
    router.replace('/');
  } catch (err: any) {
    console.error('Password reset error:', err);
    Alert.alert('Error', err.message || 'Something went wrong');
  } finally {
    setIsLoading(false);
  }
};


  return (
    <LinearGradient
      colors={[colors.background, colors.surface]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Reset Password
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter your email and new password.
        </Text>

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Mail size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Email Address"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View
  style={[
    styles.inputContainer,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ]}
>
  <Lock size={20} color={colors.textSecondary} />
  <TextInput
    style={[styles.input, { color: colors.text }]}
    placeholder="New Password"
    placeholderTextColor={colors.textSecondary}
    secureTextEntry={!showPassword}
    value={newPassword}
    onChangeText={setNewPassword}
  />
  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
    {showPassword ? (
      <EyeOff size={20} color={colors.textSecondary} />
    ) : (
      <Eye size={20} color={colors.textSecondary} />
    )}
  </TouchableOpacity>
</View>


        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handlePasswordReset}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Updating...' : 'Reset Password'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.primary }]}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 20,
  },
});
