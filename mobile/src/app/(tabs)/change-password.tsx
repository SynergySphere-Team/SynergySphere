import { useEffect, useState } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Notice,
  Screen,
} from '@/components/Screen';

import {
  Button,
  Card,
  Heading,
} from '@/components/ui';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

import { api } from '@/services/api';

type ResetRequestResponse = {
  message?: string;
  resetToken?: string;
};

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  visible,
  onToggleVisible,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggleVisible: () => void;
  colors: {
    text: string;
    muted: string;
    border: string;
    surfaceElevated: string;
  };
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text
        style={[
          styles.label,
          {
            color:
              colors.text,
          },
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.passwordField,
          {
            backgroundColor:
              colors.surfaceElevated,
            borderColor:
              colors.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={
            onChangeText
          }
          placeholder={
            placeholder
          }
          placeholderTextColor={
            colors.muted
          }
          secureTextEntry={
            !visible
          }
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.passwordInput,
            {
              color:
                colors.text,
            },
          ]}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? `Hide ${label}`
              : `Show ${label}`
          }
          onPress={
            onToggleVisible
          }
          hitSlop={10}
          style={
            styles.eyeButton
          }
        >
          <Ionicons
            name={
              visible
                ? 'eye-off-outline'
                : 'eye-outline'
            }
            size={20}
            color={
              colors.muted
            }
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const router =
    useRouter();

  const params =
    useLocalSearchParams<{
      token?: string | string[];
    }>();

  const { user } =
    useAuth();

  const {
    colors,
    theme,
  } = useTheme();

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const [
    resetToken,
    setResetToken,
  ] =
    useState('');

  useEffect(() => {
    const tokenParam =
      Array.isArray(
        params.token,
      )
        ? params.token[0]
        : params.token;

    if (tokenParam) {
      setResetToken(
        tokenParam,
      );
    }
  }, [params.token]);

  const [
    newPassword,
    setNewPassword,
  ] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState('');

  const [
    showNewPassword,
    setShowNewPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  const [
    requestingToken,
    setRequestingToken,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState<{
      type:
        | 'success'
        | 'error';
      text: string;
    } | null>(null);

  const hasMinimumLength =
    newPassword.length >=
    8;

  const hasUppercase =
    /[A-Z]/.test(
      newPassword,
    );

  const hasLowercase =
    /[a-z]/.test(
      newPassword,
    );

  const hasNumber =
    /\d/.test(
      newPassword,
    );

  const passwordsMatch =
    Boolean(
      newPassword &&
        confirmPassword &&
        newPassword ===
          confirmPassword,
    );

  const passwordReady =
    hasMinimumLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    passwordsMatch;

  async function requestResetToken() {
    if (!user?.email) {
      setMessage({
        type: 'error',
        text: 'Your account email could not be found.',
      });

      return;
    }

    try {
      setRequestingToken(
        true,
      );

      setMessage(null);

      const response =
        await api.post<ResetRequestResponse>(
          '/auth/forgot-password',
          {
            email:
              user.email,
          },
        );

      if (
        response
          ?.resetToken
      ) {
        setResetToken(
          response.resetToken,
        );

        setMessage({
          type: 'success',
          text: 'Your verification token has been generated. You can now choose a new password.',
        });
      } else {
        setMessage({
          type: 'success',
          text:
            response?.message ||
            'A password reset token has been sent to your email.',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not request a password reset token.',
      });
    } finally {
      setRequestingToken(
        false,
      );
    }
  }

  async function updatePassword() {
    if (
      !resetToken.trim()
    ) {
      setMessage({
        type: 'error',
        text: 'Enter or request your verification token first.',
      });

      return;
    }

    if (!passwordReady) {
      setMessage({
        type: 'error',
        text: 'Your new password must meet all requirements and both passwords must match.',
      });

      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      await api.post(
        '/auth/reset-password',
        {
          token:
            resetToken.trim(),
          newPassword,
        },
      );

      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');

      setMessage({
        type: 'success',
        text: 'Your password has been updated successfully.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not update your password.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Heading subtitle="Protect your account with a strong, unique password.">
        Change Password
      </Heading>

      {message ? (
        <Notice
          tone={
            message.type ===
            'success'
              ? 'success'
              : 'error'
          }
        >
          {message.text}
        </Notice>
      ) : null}

      <Card>
        <View
          style={
            styles.securityHeader
          }
        >
          <View
            style={[
              styles.securityIcon,
              {
                backgroundColor:
                  colors.surfaceElevated,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color={
                accentColor
              }
            />
          </View>

          <View
            style={{
              flex: 1,
              gap: 3,
            }}
          >
            <Text
              style={[
                styles.title,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              Verify your account
            </Text>

            <Text
              style={[
                styles.description,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              We will use your registered email to verify this password change.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.emailBox,
            {
              backgroundColor:
                colors.surfaceElevated,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={18}
            color={
              accentColor
            }
          />

          <Text
            style={[
              styles.emailText,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {user?.email ||
              'No email available'}
          </Text>
        </View>

        <Button
          title={
            requestingToken
              ? 'Requesting…'
              : resetToken
                ? 'Request New Token'
                : 'Send Verification Token'
          }
          secondary
          onPress={
            requestResetToken
          }
          disabled={
            requestingToken
          }
        />
      </Card>

      <Card>
        <Text
          style={[
            styles.title,
            {
              color:
                colors.text,
            },
          ]}
        >
          Set New Password
        </Text>

        <Text
          style={[
            styles.description,
            {
              color:
                colors.muted,
              marginBottom: 4,
            },
          ]}
        >
          Enter the verification token and choose your new password.
        </Text>

        <View
          style={
            styles.fieldGroup
          }
        >
          <Text
            style={[
              styles.label,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Verification Token
          </Text>

          <View
            style={[
              styles.tokenField,
              {
                backgroundColor:
                  colors.surfaceElevated,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Ionicons
              name="key-outline"
              size={18}
              color={
                colors.muted
              }
            />

            <TextInput
              value={
                resetToken
              }
              onChangeText={
                setResetToken
              }
              placeholder="Enter reset token"
              placeholderTextColor={
                colors.muted
              }
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.tokenInput,
                {
                  color:
                    colors.text,
                },
              ]}
            />
          </View>
        </View>

        <PasswordField
          label="New Password"
          value={
            newPassword
          }
          onChangeText={
            setNewPassword
          }
          placeholder="Enter your new password"
          visible={
            showNewPassword
          }
          onToggleVisible={() =>
            setShowNewPassword(
              (
                current,
              ) => !current,
            )
          }
          colors={
            colors
          }
        />

        <PasswordField
          label="Confirm New Password"
          value={
            confirmPassword
          }
          onChangeText={
            setConfirmPassword
          }
          placeholder="Re-enter your new password"
          visible={
            showConfirmPassword
          }
          onToggleVisible={() =>
            setShowConfirmPassword(
              (
                current,
              ) => !current,
            )
          }
          colors={
            colors
          }
        />

        <View
          style={[
            styles.requirements,
            {
              backgroundColor:
                colors.surfaceElevated,
            },
          ]}
        >
          <Text
            style={[
              styles.requirementsTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Password requirements
          </Text>

          <Requirement
            ok={
              hasMinimumLength
            }
            label="At least 8 characters"
            accentColor={
              accentColor
            }
            mutedColor={
              colors.muted
            }
          />

          <Requirement
            ok={
              hasUppercase
            }
            label="One uppercase letter"
            accentColor={
              accentColor
            }
            mutedColor={
              colors.muted
            }
          />

          <Requirement
            ok={
              hasLowercase
            }
            label="One lowercase letter"
            accentColor={
              accentColor
            }
            mutedColor={
              colors.muted
            }
          />

          <Requirement
            ok={
              hasNumber
            }
            label="One number"
            accentColor={
              accentColor
            }
            mutedColor={
              colors.muted
            }
          />

          <Requirement
            ok={
              passwordsMatch
            }
            label="Passwords match"
            accentColor={
              accentColor
            }
            mutedColor={
              colors.muted
            }
          />
        </View>

        <Button
          title={
            saving
              ? 'Updating Password…'
              : 'Update Password'
          }
          onPress={
            updatePassword
          }
          disabled={
            saving ||
            !resetToken.trim() ||
            !passwordReady
          }
        />
      </Card>

      <View
        style={[
          styles.tip,
          {
            borderColor:
              colors.border,
            backgroundColor:
              colors.surface,
          },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={19}
          color={
            accentColor
          }
        />

        <Text
          style={[
            styles.tipText,
            {
              color:
                colors.muted,
            },
          ]}
        >
          Use a password you do not reuse on GitHub, email, university portals or other services.
        </Text>
      </View>
    </Screen>
  );
}

function Requirement({
  ok,
  label,
  accentColor,
  mutedColor,
}: {
  ok: boolean;
  label: string;
  accentColor: string;
  mutedColor: string;
}) {
  return (
    <View
      style={
        styles.requirementRow
      }
    >
      <Ionicons
        name={
          ok
            ? 'checkmark-circle'
            : 'ellipse-outline'
        }
        size={16}
        color={
          ok
            ? accentColor
            : mutedColor
        }
      />

      <Text
        style={{
          color:
            ok
              ? accentColor
              : mutedColor,
          fontSize: 11,
          fontWeight:
            ok
              ? '800'
              : '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    backButton: {
      width: 40,
      height: 40,
      borderWidth: 1,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },

    securityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      marginBottom: 12,
    },

    securityIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },

    title: {
      fontSize: 16,
      fontWeight: '900',
    },

    description: {
      fontSize: 12,
      lineHeight: 18,
    },

    emailBox: {
      minHeight: 46,
      borderWidth: 1,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 12,
      marginBottom: 10,
    },

    emailText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
    },

    fieldGroup: {
      gap: 6,
      marginTop: 8,
    },

    label: {
      fontSize: 12,
      fontWeight: '800',
    },

    tokenField: {
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },

    tokenInput: {
      flex: 1,
      minHeight: 46,
      fontSize: 13,
    },

    passwordField: {
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 12,
    },

    passwordInput: {
      flex: 1,
      minHeight: 46,
      fontSize: 13,
    },

    eyeButton: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
    },

    requirements: {
      borderRadius: 14,
      padding: 12,
      gap: 7,
      marginTop: 10,
      marginBottom: 4,
    },

    requirementsTitle: {
      fontSize: 12,
      fontWeight: '900',
      marginBottom: 2,
    },

    requirementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    tip: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },

    tipText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 17,
    },
  });
