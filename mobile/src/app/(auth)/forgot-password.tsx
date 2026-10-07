import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Notice } from '@/components/Screen';
import { Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
  triggerErrorHaptic,
} from '@/services/nativePolish';

type Step = 'request' | 'reset' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const { colors, theme } = useTheme();

  const isLight = theme === 'light';
  const brandGreen = isLight ? '#1e6827' : colors.primary;

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Deep linking: If token is provided in route params, jump straight to reset step
  useEffect(() => {
    if (params?.token) {
      setToken(String(params.token));
      setStep('reset');
    }
    if (params?.email) {
      setEmail(String(params.email));
    }
  }, [params?.token, params?.email]);

  function isValidEmail(val: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  // Password Strength Calculations
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumberOrSymbol].filter(Boolean).length;

  async function handleRequestToken() {
    if (submitting) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your account email.');
      triggerErrorHaptic();
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      triggerErrorHaptic();
      return;
    }

    setError('');
    setInfoMessage('');
    setSubmitting(true);
    triggerLightHaptic();

    try {
      const res = await api.post<{
        message?: string;
        resetToken?: string;
        expiresAt?: string;
      }>('/auth/forgot-password', { email: trimmedEmail });

      triggerSuccessHaptic();

      if (res?.resetToken) {
        setToken(res.resetToken);
        setExpiresAt(res.expiresAt || null);
        setInfoMessage('Reset token generated. For testing, it has been pre-filled for you.');
        setStep('reset');
      } else {
        setInfoMessage('If an account exists with this email, a reset token has been issued.');
        setStep('reset');
      }
    } catch (e: any) {
      triggerErrorHaptic();
      setError(e?.message || 'Unable to request password reset. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (submitting) return;
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setError('Please provide the reset token.');
      triggerErrorHaptic();
      return;
    }
    if (!hasMinLength) {
      setError('Password must be at least 8 characters.');
      triggerErrorHaptic();
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      triggerErrorHaptic();
      return;
    }

    setError('');
    setSubmitting(true);
    triggerLightHaptic();

    try {
      await api.post('/auth/reset-password', {
        token: trimmedToken,
        newPassword,
      });

      triggerSuccessHaptic();
      setStep('success');
    } catch (e: any) {
      triggerErrorHaptic();
      setError(e?.message || 'Invalid or expired password reset token.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen keyboardAvoiding={true}>
      <View style={styles.page}>
        {/* Top Back Navigation */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Sign In"
          onPress={() => {
            triggerLightHaptic();
            router.replace('/(auth)/login');
          }}
          style={styles.backRow}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back to Sign In</Text>
        </Pressable>

        {/* Brand Header */}
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brand, { color: colors.text }]}>SynergySphere</Text>
          <Text style={[styles.tagline, { color: colors.muted }]}>Account Recovery & Security</Text>
        </View>

        {/* Step 1: Request Reset Token */}
        {step === 'request' && (
          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
            <Text style={[styles.copy, { color: colors.muted }]}>
              Enter your registered email address to receive an expiring verification token.
            </Text>

            {error ? <Notice>{error}</Notice> : null}
            {infoMessage ? (
              <View style={[styles.infoBanner, { backgroundColor: isLight ? '#ecfdf5' : '#064e3b', borderColor: '#059669' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={{ fontSize: 12, color: isLight ? '#065f46' : '#a7f3d0', flex: 1 }}>{infoMessage}</Text>
              </View>
            ) : null}

            <Field
              label="Email Address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              placeholder="you@example.com"
            />

            <Button
              title={submitting ? 'Generating Token…' : 'Send Verification Token'}
              disabled={submitting || !email.trim()}
              onPress={handleRequestToken}
            />

            <Pressable
              onPress={() => {
                triggerLightHaptic();
                setStep('reset');
              }}
              style={styles.haveCodeBtn}
            >
              <Text style={[styles.link, { color: brandGreen }]}>
                Already have a reset token? Enter it here →
              </Text>
            </Pressable>
          </View>
        )}

        {/* Step 2: Enter Token & New Password */}
        {step === 'reset' && (
          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
            <Text style={[styles.copy, { color: colors.muted }]}>
              Enter your token and choose a strong new password (minimum 8 characters).
            </Text>

            {error ? <Notice>{error}</Notice> : null}
            {infoMessage ? (
              <View style={[styles.infoBanner, { backgroundColor: isLight ? '#eff6ff' : '#1e3a8a', borderColor: '#3b82f6' }]}>
                <Ionicons name="information-circle" size={16} color="#3b82f6" />
                <Text style={{ fontSize: 12, color: isLight ? '#1e40af' : '#bfdbfe', flex: 1 }}>{infoMessage}</Text>
              </View>
            ) : null}

            <Field
              label="Reset Verification Token"
              value={token}
              onChangeText={(t) => {
                setToken(t);
                if (error) setError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Paste token or OTP code"
            />

            <Field
              label="New Password"
              value={newPassword}
              onChangeText={(p) => {
                setNewPassword(p);
                if (error) setError('');
              }}
              secureTextEntry={!showPassword}
              placeholder="At least 8 characters"
              rightElement={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword((v) => !v)}
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

            {/* Password Strength Meter */}
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarsRow}>
                  {[1, 2, 3, 4].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            strengthScore >= level
                              ? strengthScore <= 1
                                ? '#ef4444'
                                : strengthScore <= 2
                                ? '#f59e0b'
                                : '#10b981'
                              : isLight
                              ? '#e2e8f0'
                              : '#334155',
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.requirementsList}>
                  <Text style={[styles.reqItem, { color: hasMinLength ? '#10b981' : colors.muted }]}>
                    {hasMinLength ? '✓' : '•'} 8+ characters
                  </Text>
                  <Text style={[styles.reqItem, { color: hasUppercase && hasLowercase ? '#10b981' : colors.muted }]}>
                    {hasUppercase && hasLowercase ? '✓' : '•'} Upper & lower case
                  </Text>
                  <Text style={[styles.reqItem, { color: hasNumberOrSymbol ? '#10b981' : colors.muted }]}>
                    {hasNumberOrSymbol ? '✓' : '•'} Number or symbol
                  </Text>
                </View>
              </View>
            )}

            <Field
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(cp) => {
                setConfirmPassword(cp);
                if (error) setError('');
              }}
              secureTextEntry={!showPassword}
              placeholder="Re-enter new password"
            />

            {confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={{ fontSize: 11, color: '#ef4444', marginTop: -6, marginBottom: 8 }}>
                Passwords do not match.
              </Text>
            )}

            <Button
              title={submitting ? 'Resetting Password…' : 'Update Password'}
              disabled={submitting || !token.trim() || !hasMinLength || !passwordsMatch}
              onPress={handleResetPassword}
            />

            <Pressable
              onPress={() => {
                triggerLightHaptic();
                setStep('request');
              }}
              style={styles.haveCodeBtn}
            >
              <Text style={[styles.link, { color: colors.muted }]}>
                ← Request a new verification token
              </Text>
            </Pressable>
          </View>
        )}

        {/* Step 3: Success Confirmation */}
        {step === 'success' && (
          <View style={styles.form}>
            <View style={styles.successIconBadge}>
              <Ionicons name="checkmark-done-circle" size={56} color="#059669" />
            </View>

            <Text style={[styles.title, { color: colors.text, textAlign: 'center' }]}>
              Password Reset!
            </Text>
            <Text style={[styles.copy, { color: colors.muted, textAlign: 'center' }]}>
              Your account password has been updated securely. You can now log in with your new credentials.
            </Text>

            <Button
              title="Return to Sign In"
              onPress={() => {
                triggerSuccessHaptic();
                router.replace('/(auth)/login');
              }}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 40,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  brand: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    marginTop: 2,
  },
  form: {
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  copy: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  eyeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  haveCodeBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
  },
  strengthContainer: {
    gap: 6,
    marginTop: -4,
    marginBottom: 4,
  },
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  requirementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reqItem: {
    fontSize: 11,
    fontWeight: '600',
  },
  successIconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
