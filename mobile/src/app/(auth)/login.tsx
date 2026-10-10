import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Notice } from '@/components/Screen';
import { Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { onboardingStorage } from '@/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function isValidEmail(val: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  async function submit() {
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const loggedInUser = await login(trimmedEmail, password);
      await onboardingStorage.setCompleted(loggedInUser?.id);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  const isLight = theme === 'light';
  const brandGreen = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <View style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.brand, { color: colors.text }]}>
            SynergySphere
          </Text>

          <Text style={[styles.tagline, { color: colors.muted }]}>
            Learn. Build. Thrive.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.title, { color: colors.text }]}>
            Sign in
          </Text>

          <Text style={[styles.copy, { color: colors.muted }]}>
            Continue your learning journey.
          </Text>

          {error ? <Notice>{error}</Notice> : null}

          <Field
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            placeholder="you@example.com"
          />

          <Field
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError('');
            }}
            secureTextEntry={!showPassword}
            autoComplete="password"
            placeholder="Your password"
            rightElement={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={8}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.muted}
                />
              </Pressable>
            }
          />

          <View style={styles.forgotRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Forgot password?"
              onPress={() => router.push('/(auth)/forgot-password')}
              hitSlop={8}
            >
              <Text style={[styles.forgotLink, { color: brandGreen }]}>
                Forgot password?
              </Text>
            </Pressable>
          </View>

          <Button
            title={submitting ? 'Signing in…' : 'Sign in to SynergySphere'}
            disabled={submitting || !email.trim() || !password}
            onPress={submit}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/register')}
            style={[
              styles.register,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          >
            <Text style={[styles.link, { color: brandGreen }]}>
              Create an account
            </Text>
          </Pressable>

          <Text style={[styles.demoHint, { color: colors.muted }]}>
            Demo: student@synergysphere.com / student123
          </Text>
        </View>

        <Text style={[styles.terms, { color: colors.muted }]}>
          By signing in, you agree to use SynergySphere responsibly.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 640,
    paddingVertical: 30,
  },
  hero: {
    marginTop: 24,
    alignItems: 'center',
    gap: 6,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brand: {
    fontSize: 25,
    fontWeight: '800',
    marginTop: 8,
  },
  tagline: {
    fontSize: 14,
  },
  form: {
    gap: 15,
    paddingBottom: 40,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    textAlign: 'center',
  },
  copy: {
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 7,
  },
  register: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
  },
  eyeButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 4,
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  link: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 14,
  },
  terms: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  demoHint: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
});
