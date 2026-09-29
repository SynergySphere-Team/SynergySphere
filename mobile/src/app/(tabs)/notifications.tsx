import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import Ionicons from '@expo/vector-icons/Ionicons';

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

import { api } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

type AppNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type?: string | null;
  link?: string | null;
  createdAt: string;
};

function formatTimeAgo(
  value: string,
) {
  const created =
    new Date(value);

  if (
    Number.isNaN(
      created.getTime(),
    )
  ) {
    return '';
  }

  const difference =
    Date.now() -
    created.getTime();

  const minutes =
    Math.max(
      Math.floor(
        difference /
          60000,
      ),
      0,
    );

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24,
    );

  if (days < 7) {
    return `${days}d ago`;
  }

  return created.toLocaleDateString();
}

function notificationIcon(
  type?: string | null,
) {
  switch (
    String(type ?? '')
      .toLowerCase()
  ) {
    case 'community':
      return 'people-outline' as const;

    case 'project':
      return 'folder-open-outline' as const;

    case 'comment':
    case 'message':
    case 'reply':
      return 'chatbubble-ellipses-outline' as const;

    case 'like':
      return 'heart-outline' as const;

    case 'mention':
      return 'at-outline' as const;

    default:
      return 'notifications-outline' as const;
  }
}

export default function NotificationsScreen() {
  const router =
    useRouter();

  const {
    colors,
    theme,
  } = useTheme();

  const [
    notifications,
    setNotifications,
  ] =
    useState<AppNotification[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    markingAll,
    setMarkingAll,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const loadNotifications =
    useCallback(
      async () => {
        try {
          setError('');

          const result =
            await api.get<
              AppNotification[]
            >(
              '/notifications?take=75',
            );

          setNotifications(
            Array.isArray(result)
              ? result
              : [],
          );
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : 'Could not load notifications.',
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  const handleRefresh =
    useCallback(async () => {
      setRefreshing(true);
      await loadNotifications();
      setRefreshing(false);
    }, [loadNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount =
    notifications.filter(
      (
        notification,
      ) =>
        !notification.read,
    ).length;

  async function openNotification(
    notification: AppNotification,
  ) {
    if (
      !notification.read
    ) {
      try {
        await api.patch(
          `/notifications/${notification.id}/read`,
          {},
        );

        setNotifications(
          (
            current,
          ) =>
            current.map(
              (
                item,
              ) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      read: true,
                    }
                  : item,
            ),
        );
      } catch {
        // Opening the destination is more important than
        // blocking the user if the read-state update fails.
      }
    }

    if (
      notification.link
    ) {
      router.push(
        notification.link as never,
      );
    }
  }

  async function markAllRead() {
    if (
      unreadCount === 0 ||
      markingAll
    ) {
      return;
    }

    try {
      setMarkingAll(
        true,
      );

      setError('');

      await api.patch(
        '/notifications/read-all',
        {},
      );

      setNotifications(
        (
          current,
        ) =>
          current.map(
            (
              item,
            ) => ({
              ...item,
              read: true,
            }),
          ),
      );
    } catch (e) {
      console.error(
        'Mark all notifications read failed:',
        e,
      );

      setError(
        'Could not mark notifications as read. Please try again.',
      );
    } finally {
      setMarkingAll(
        false,
      );
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <View
        style={
          styles.topRow
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(
                '/(tabs)/community' as never,
              );
            }
          }}
          style={({
            pressed,
          }) => [
            styles.backButton,

            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={
              colors.text
            }
          />
        </Pressable>

        <View
          style={
            styles.headingWrap
          }
        >
          <Heading subtitle="Project, Community, comment, like and system updates.">
            Notifications
          </Heading>
        </View>
      </View>

      {error ? (
        <Notice>
          {error}
        </Notice>
      ) : null}

      <View
        style={
          styles.summaryRow
        }
      >
        <Text
          style={[
            styles.summary,
            {
              color:
                colors.muted,
            },
          ]}
        >
          {unreadCount > 0
            ? `${unreadCount} unread`
            : 'You are all caught up'}
        </Text>

        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            disabled={
              markingAll
            }
            onPress={
              markAllRead
            }
          >
            <Text
              style={[
                styles.markAll,
                {
                  color:
                    accentColor,
                },
              ]}
            >
              {markingAll
                ? 'Updating...'
                : 'Mark all read'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {notifications.length ===
      0 ? (
        <Card>
          <View
            style={
              styles.emptyState
            }
          >
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor:
                    colors.surfaceElevated,
                },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={28}
                color={
                  accentColor
                }
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              No notifications yet
            </Text>

            <Text
              style={[
                styles.emptyCopy,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              Project requests,
              approvals, comments and
              other community activity
              will appear here.
            </Text>
          </View>
        </Card>
      ) : (
        notifications.map(
          (
            notification,
          ) => (
            <Pressable
              key={
                notification.id
              }
              accessibilityRole="button"
              accessibilityLabel={`${notification.title}. ${notification.message}`}
              onPress={() =>
                openNotification(
                  notification,
                )
              }
              style={({
                pressed,
              }) => [
                styles.notificationCard,
                {
                  backgroundColor:
                    notification.read
                      ? colors.surface
                      : colors.surfaceElevated,

                  borderColor:
                    notification.read
                      ? colors.border
                      : accentColor,
                },

                pressed &&
                  styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor:
                      colors.surface,
                  },
                ]}
              >
                <Ionicons
                  name={notificationIcon(
                    notification.type,
                  )}
                  size={22}
                  color={
                    accentColor
                  }
                />
              </View>

              <View
                style={
                  styles.notificationCopy
                }
              >
                <View
                  style={
                    styles.titleRow
                  }
                >
                  <Text
                    style={[
                      styles.title,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                    numberOfLines={
                      2
                    }
                  >
                    {
                      notification.title
                    }
                  </Text>

                  {!notification.read ? (
                    <View
                      style={[
                        styles.unreadDot,
                        {
                          backgroundColor:
                            accentColor,
                        },
                      ]}
                    />
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.message,
                    {
                      color:
                        colors.muted,
                    },
                  ]}
                >
                  {
                    notification.message
                  }
                </Text>

                <Text
                  style={[
                    styles.time,
                    {
                      color:
                        notification.read
                          ? colors.muted
                          : accentColor,
                    },
                  ]}
                >
                  {formatTimeAgo(
                    notification.createdAt,
                  )}
                </Text>
              </View>
            </Pressable>
          ),
        )
      )}

      {notifications.length >
      0 ? (
        <Button
          title="Refresh"
          secondary
          onPress={
            loadNotifications
          }
        />
      ) : null}
    </Screen>
  );
}

const styles =
  StyleSheet.create({
    topRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap: 8,
    },

    headingWrap: {
      flex: 1,
    },

    backButton: {
      width: 42,
      height: 42,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 21,

      marginTop: 2,
    },

    summaryRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap: 12,
    },

    summary: {
      fontSize: 13,
      fontWeight: '600',
    },

    markAll: {
      fontSize: 13,
      fontWeight: '800',
    },

    notificationCard: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap: 11,

      borderWidth: 1,
      borderRadius: 16,

      padding: 13,
    },

    iconWrap: {
      width: 42,
      height: 42,

      borderRadius: 21,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    notificationCopy: {
      flex: 1,
      gap: 4,
    },

    titleRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap: 7,
    },

    title: {
      flex: 1,

      fontSize: 14,
      fontWeight: '800',

      lineHeight: 19,
    },

    unreadDot: {
      width: 9,
      height: 9,

      borderRadius: 5,

      marginTop: 5,
    },

    message: {
      fontSize: 13,
      lineHeight: 19,
    },

    time: {
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
    },

    emptyState: {
      alignItems:
        'center',

      gap: 8,

      paddingVertical: 16,
      paddingHorizontal: 8,
    },

    emptyIcon: {
      width: 56,
      height: 56,

      borderRadius: 28,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
    },

    emptyCopy: {
      textAlign: 'center',
      fontSize: 13,
      lineHeight: 19,
    },

    pressed: {
      opacity: 0.68,
    },
  });
