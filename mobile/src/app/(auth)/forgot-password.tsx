import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Screen, Notice } from '@/components/Screen';
import { Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

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

    setError('');
    setSubmitting(true);

    try {
      const res = await api.post<{ message: string; emailDelivered?: boolean; resetUrl?: string }>('/auth/forgot-password', {
        email: trimmedEmail,
      });
      setSuccess(true);
      setEmailDelivered(Boolean(res.emailDelivered));
      if (res.resetUrl) {
        setResetUrl(res.resetUrl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send password reset link.');
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

          <Text style={[styles.title, { color: colors.text }]}>
            {success ? (emailDelivered ? 'Check your email' : 'Reset Link Ready') : 'Forgot password?'}
          </Text>

          <Text style={[styles.copy, { color: colors.muted }]}>
            {success
              ? emailDelivered
                ? `We have sent password reset instructions to ${email}. Check your inbox to choose a new password.`
                : `A reset link was generated for ${email}.`
              : 'Enter the email you used to register and we will send you a link to reset your password.'}
          </Text>
        </View>

        <View style={styles.form}>
          {error ? <Notice>{error}</Notice> : null}

          {success ? (
            <View
              style={[
                styles.successCard,
                {
                  borderColor: emailDelivered ? colors.border : '#eab308',
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
            >
              <Ionicons
                name={emailDelivered ? 'mail-outline' : 'warning-outline'}
                size={36}
                color={emailDelivered ? brandGreen : '#eab308'}
                style={styles.mailIcon}
              />
              <Text style={[styles.successTitle, { color: colors.text }]}>
                {emailDelivered ? 'Reset Link Sent' : 'SMTP Server Not Configured'}
              </Text>
              <Text style={[styles.successText, { color: colors.muted }]}>
                {emailDelivered
                  ? 'Follow the instructions in the email to set a new password. The link expires in 1 hour.'
                  : 'The backend has no SMTP credentials in .env, so the email cannot reach your inbox yet.'}
              </Text>

              {resetUrl ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => Linking.openURL(resetUrl)}
                  style={[styles.openLinkButton, { backgroundColor: brandGreen }]}
                >
                  <Text style={styles.openLinkText}>Reset Password Now</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSuccess(false);
                  setEmail('');
                  setResetUrl(null);
                }}
                style={styles.resendButton}
              >
                <Text style={[styles.resendText, { color: brandGreen }]}>
                  Try another email address
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
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

              <Button
                title={submitting ? 'Sending link…' : 'Send password reset link'}
                disabled={submitting || !email.trim()}
                onPress={submit}
              />
            </>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/login')}
            style={[
              styles.backButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          >
            <Text style={[styles.link, { color: brandGreen }]}>
              Back to sign in
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.terms, { color: colors.muted }]}>
          Need help? Contact support or an administrator.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 600,
    paddingVertical: 30,
  },
  hero: {
    marginTop: 20,
    alignItems: 'center',
    gap: 6,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  copy: {
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 2,
    fontSize: 14,
  },
  form: {
    gap: 16,
    paddingHorizontal: 4,
  },
  successCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  mailIcon: {
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  successText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  openLinkButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  openLinkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  resendButton: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
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
});
