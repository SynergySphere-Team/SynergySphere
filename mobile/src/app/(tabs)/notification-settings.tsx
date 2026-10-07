import { useCallback, useEffect, useState } from 'react';

import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import {
  Loading,
  Notice,
  Screen,
} from '@/components/Screen';

import {
  Button,
  Card,
  Heading,
} from '@/components/ui';

import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';

type SettingsResponse = {
  user?: {
    emailNotifications?: boolean;
  };
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const [
    emailNotifications,
    setEmailNotifications,
  ] = useState(true);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.get<SettingsResponse>('/auth/settings');
      setEmailNotifications(data.user?.emailNotifications ?? true);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not load notification preferences.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  }, [loadSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function changeEmailPreference(
    enabled: boolean,
  ) {
    const previous =
      emailNotifications;

    setEmailNotifications(
      enabled,
    );
    setSaving(true);
    setMessage(null);

    try {
      await api.patch(
        '/auth/settings',
        {
          emailNotifications:
            enabled,
        },
      );

      setMessage({
        type: 'success',
        text: enabled
          ? 'Email notifications are enabled.'
          : 'Email notifications are disabled.',
      });
    } catch (error) {
      setEmailNotifications(
        previous,
      );

      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not update notification preferences.',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <Heading subtitle="Choose how SynergySphere keeps you informed.">
        Notification Settings
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
            styles.sectionHeader
          }
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor:
                  colors.surfaceElevated,
              },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={21}
              color={
                accentColor
              }
            />
          </View>

          <View
            style={{
              flex: 1,
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
              Email Notifications
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
              Receive account updates, project reviews and deadline-related email notifications when supported.
            </Text>
          </View>

          <Switch
            value={
              emailNotifications
            }
            disabled={saving}
            onValueChange={
              changeEmailPreference
            }
            trackColor={{
              false:
                colors.border,
              true:
                accentColor,
            }}
            thumbColor={
              emailNotifications
                ? '#ffffff'
                : colors.surface
            }
          />
        </View>

        <Text
          style={[
            styles.statusText,
            {
              color:
                colors.muted,
            },
          ]}
        >
          {saving
            ? 'Saving preference…'
            : emailNotifications
              ? 'Email preference: On'
              : 'Email preference: Off'}
        </Text>
      </Card>

      <Card>
        <View
          style={
            styles.sectionHeader
          }
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor:
                  colors.surfaceElevated,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={21}
              color={
                accentColor
              }
            />
          </View>

          <View
            style={{
              flex: 1,
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
              In-App Notifications
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
              View project, community and account updates in your SynergySphere notification centre.
            </Text>
          </View>
        </View>

        <Button
          title="Open Notification Centre"
          secondary
          onPress={() =>
            router.push(
              '/notifications' as never,
            )
          }
        />
      </Card>

      <View
        style={[
          styles.infoCard,
          {
            backgroundColor:
              colors.surface,
            borderColor:
              colors.border,
          },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={
            accentColor
          }
        />

        <Text
          style={[
            styles.infoText,
            {
              color:
                colors.muted,
            },
          ]}
        >
          This screen currently manages the email-notification preference stored on your SynergySphere account. In-app notifications remain available through the notification centre.
        </Text>
      </View>
    </Screen>
  );
}

const styles =
  StyleSheet.create({
    headerRow: {
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

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },

    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },

    title: {
      fontSize: 14,
      fontWeight: '900',
    },

    description: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 17,
    },

    statusText: {
      marginTop: 12,
      fontSize: 11,
      fontWeight: '700',
    },

    infoCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 13,
      flexDirection: 'row',
      gap: 9,
      alignItems: 'flex-start',
    },

    infoText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 17,
    },
  });
