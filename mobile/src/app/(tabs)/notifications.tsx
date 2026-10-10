import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { BackButton, Loading, Notice, Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { api } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useAccessibility } from '@/context/AccessibilityContext';

type AppNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type?: string | null;
  link?: string | null;
  createdAt: string;
};

type CategoryFilter = 'all' | 'unread' | 'community' | 'tasks' | 'wellness';

function formatTimeAgo(value: string) {
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) {
    return '';
  }

  const difference = Date.now() - created.getTime();
  const minutes = Math.max(Math.floor(difference / 60000), 0);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return created.toLocaleDateString();
}

function getNotificationCategory(
  type?: string | null,
  title?: string,
  message?: string,
): 'community' | 'tasks' | 'wellness' | 'system' {
  const t = String(type ?? '').toLowerCase();
  const text = `${title ?? ''} ${message ?? ''}`.toLowerCase();

  if (
    t === 'wellness' ||
    text.includes('wellness') ||
    text.includes('strain') ||
    text.includes('break') ||
    text.includes('burnout') ||
    text.includes('sleep')
  ) {
    return 'wellness';
  }
  if (
    t === 'task' ||
    t === 'tasks' ||
    t === 'focus' ||
    text.includes('task') ||
    text.includes('focus session') ||
    text.includes('timer') ||
    text.includes('pomodoro')
  ) {
    return 'tasks';
  }
  if (
    t === 'community' ||
    t === 'project' ||
    t === 'comment' ||
    t === 'message' ||
    t === 'reply' ||
    t === 'mention' ||
    t === 'like' ||
    text.includes('community') ||
    text.includes('channel') ||
    text.includes('comment') ||
    text.includes('project')
  ) {
    return 'community';
  }
  return 'system';
}

function getCategoryBadge(
  category: 'community' | 'tasks' | 'wellness' | 'system',
  isLight: boolean,
) {
  switch (category) {
    case 'wellness':
      return {
        icon: 'heart-outline' as const,
        color: '#10b981',
        bg: isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.20)',
        label: 'Wellness',
      };
    case 'tasks':
      return {
        icon: 'timer-outline' as const,
        color: '#8b5cf6',
        bg: isLight ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.20)',
        label: 'Tasks',
      };
    case 'community':
      return {
        icon: 'chatbubbles-outline' as const,
        color: '#0284c7',
        bg: isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.20)',
        label: 'Community',
      };
    default:
      return {
        icon: 'sparkles-outline' as const,
        color: '#f59e0b',
        bg: isLight ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.20)',
        label: 'System',
      };
  }
}

function getActionLabel(link?: string | null): string | null {
  if (!link) return null;
  const l = link.toLowerCase();
  if (l.includes('task')) return 'View Tasks';
  if (l.includes('wellness')) return 'Open Wellness';
  if (l.includes('community') || l.includes('project')) return 'View Community';
  if (l.includes('portfolio')) return 'View Portfolio';
  if (l.includes('setting')) return 'Open Settings';
  return 'View Details';
}

function getTimeGroup(dateString: string): 'Today' | 'Yesterday' | 'Earlier' {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  return 'Earlier';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { largerText, fontSize } = useAccessibility();
  const isLight = theme === 'light';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingRead, setClearingRead] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');

  // Track notifications marked read during this session so the unread tab doesn't jump
  const [sessionReadIds, setSessionReadIds] = useState<Set<string>>(new Set());

  const brandGreen = isLight ? '#1e6827' : colors.primary;

  const loadNotifications = useCallback(async () => {
    try {
      setError('');
      const result = await api.get<AppNotification[]>('/notifications?take=75');
      setNotifications(Array.isArray(result) ? result : []);
      setSessionReadIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read && !sessionReadIds.has(n.id)).length,
    [notifications, sessionReadIds],
  );

  const readCount = useMemo(
    () => notifications.filter((n) => n.read || sessionReadIds.has(n.id)).length,
    [notifications, sessionReadIds],
  );

  const countsByCategory = useMemo(() => {
    let community = 0;
    let tasks = 0;
    let wellness = 0;

    for (const item of notifications) {
      const cat = getNotificationCategory(item.type, item.title, item.message);
      if (cat === 'community') community++;
      else if (cat === 'tasks') tasks++;
      else if (cat === 'wellness') wellness++;
    }

    return { community, tasks, wellness };
  }, [notifications]);

  // When switching filter tabs, filter smoothly without jumping
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeFilter === 'unread') {
        // Keep items in view even if marked read during this view session, to prevent jarring jumping
        return !item.read || sessionReadIds.has(item.id);
      }
      if (activeFilter === 'community') {
        return (
          getNotificationCategory(item.type, item.title, item.message) ===
          'community'
        );
      }
      if (activeFilter === 'tasks') {
        return (
          getNotificationCategory(item.type, item.title, item.message) ===
          'tasks'
        );
      }
      if (activeFilter === 'wellness') {
        return (
          getNotificationCategory(item.type, item.title, item.message) ===
          'wellness'
        );
      }
      return true;
    });
  }, [notifications, activeFilter, sessionReadIds]);

  // Group notifications into Today, Yesterday, Earlier
  const groupedNotifications = useMemo(() => {
    const groups: { title: 'Today' | 'Yesterday' | 'Earlier'; items: AppNotification[] }[] = [];
    const map = new Map<'Today' | 'Yesterday' | 'Earlier', AppNotification[]>();

    for (const n of filteredNotifications) {
      const group = getTimeGroup(n.createdAt);
      if (!map.has(group)) {
        map.set(group, []);
      }
      map.get(group)!.push(n);
    }

    if (map.has('Today') && map.get('Today')!.length > 0) {
      groups.push({ title: 'Today', items: map.get('Today')! });
    }
    if (map.has('Yesterday') && map.get('Yesterday')!.length > 0) {
      groups.push({ title: 'Yesterday', items: map.get('Yesterday')! });
    }
    if (map.has('Earlier') && map.get('Earlier')!.length > 0) {
      groups.push({ title: 'Earlier', items: map.get('Earlier')! });
    }

    return groups;
  }, [filteredNotifications]);

  async function openNotification(notification: AppNotification) {
    if (!notification.read) {
      setSessionReadIds((prev) => new Set(prev).add(notification.id));
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );

      try {
        await api.patch(`/notifications/${notification.id}/read`, {});
      } catch {
        // Non-blocking
      }
    }

    if (notification.link) {
      router.push(notification.link as never);
    }
  }

  async function deleteNotification(
    id: string,
    event?: { stopPropagation?: () => void },
  ) {
    if (event?.stopPropagation) event.stopPropagation();

    // Optimistic remove
    setNotifications((current) => current.filter((item) => item.id !== id));
    setSessionReadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      // Non-blocking fallback
    }
  }

  async function markAllRead() {
    if (unreadCount === 0 || markingAll) return;

    try {
      setMarkingAll(true);
      setError('');

      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true })),
      );
      setSessionReadIds(new Set());

      await api.patch('/notifications/read-all', {});
    } catch (e) {
      console.error('Mark all notifications read failed:', e);
      setError('Could not mark notifications as read.');
      loadNotifications();
    } finally {
      setMarkingAll(false);
    }
  }

  async function clearReadNotifications() {
    if (readCount === 0 || clearingRead) return;

    Alert.alert(
      'Clear Read Notifications',
      'Remove all read alerts from your inbox?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setClearingRead(true);
              setNotifications((current) => current.filter((item) => !item.read && !sessionReadIds.has(item.id)));
              setSessionReadIds(new Set());
              await api.delete('/notifications/clear-read');
            } catch (err) {
              console.warn('Clear read error:', err);
              loadNotifications();
            } finally {
              setClearingRead(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* ─── SETTINGS-STYLE HEADER ─── */}
      <View style={[styles.headerRow, largerText && styles.headerRowLarge]}>
        <BackButton style={styles.backBtn} />

        <View
          style={[
            styles.notificationsLogoWrapper,
            largerText && styles.notificationsLogoWrapperLarge,
            {
              backgroundColor:
                theme === 'dark'
                  ? 'rgba(16, 33, 40, 0.7)'
                  : 'rgba(237, 243, 239, 0.85)',
              borderColor:
                theme === 'dark'
                  ? 'rgba(145, 219, 94, 0.28)'
                  : 'rgba(145, 219, 94, 0.45)',
              shadowColor: theme === 'dark' ? '#91db5e' : '#10231D',
            },
          ]}
        >
          <Image
            source={require('../../../assets/images/notifications-logo.png')}
            style={[
              styles.notificationsLogo,
              largerText && styles.notificationsLogoLarge,
            ]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.headerText}>
          <Text
            allowFontScaling
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontSize: fontSize(24),
              },
            ]}
          >
            Notifications
          </Text>

          <Text
            allowFontScaling
            numberOfLines={2}
            style={[
              styles.headerSubtitle,
              {
                color: colors.muted,
                fontSize: fontSize(13),
                lineHeight: fontSize(18),
              },
            ]}
          >
            Project, community, task and system updates.
          </Text>
        </View>

        {/* Direct shortcut to Notification Settings */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open notification preferences"
          hitSlop={10}
          onPress={() => router.push('/(tabs)/notification-settings' as never)}
          style={({ pressed }) => [
            styles.settingsIconBtn,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      {error ? <Notice>{error}</Notice> : null}

      {/* ─── SLEEK SEGMENTED FILTER TABS ─── */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsContainer}
        >
          {/* ALL */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filter All: ${notifications.length} items`}
            onPress={() => setActiveFilter('all')}
            style={[
              styles.filterPill,
              activeFilter === 'all'
                ? [styles.filterPillActive, { backgroundColor: brandGreen, borderColor: brandGreen }]
                : [styles.filterPillInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                {
                  color: activeFilter === 'all' ? '#FFFFFF' : colors.text,
                  fontWeight: activeFilter === 'all' ? '800' : '600',
                },
              ]}
            >
              All {notifications.length > 0 ? `(${notifications.length})` : ''}
            </Text>
          </Pressable>

          {/* UNREAD */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filter Unread: ${unreadCount} items`}
            onPress={() => setActiveFilter('unread')}
            style={[
              styles.filterPill,
              activeFilter === 'unread'
                ? [styles.filterPillActive, { backgroundColor: brandGreen, borderColor: brandGreen }]
                : [styles.filterPillInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            ]}
          >
            {unreadCount > 0 && activeFilter !== 'unread' && (
              <View style={[styles.filterDot, { backgroundColor: brandGreen }]} />
            )}
            <Text
              style={[
                styles.filterPillText,
                {
                  color: activeFilter === 'unread' ? '#FFFFFF' : colors.text,
                  fontWeight: activeFilter === 'unread' ? '800' : '600',
                },
              ]}
            >
              Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
            </Text>
          </Pressable>

          {/* COMMUNITY */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filter Community: ${countsByCategory.community} items`}
            onPress={() => setActiveFilter('community')}
            style={[
              styles.filterPill,
              activeFilter === 'community'
                ? [styles.filterPillActive, { backgroundColor: brandGreen, borderColor: brandGreen }]
                : [styles.filterPillInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            ]}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={13}
              color={activeFilter === 'community' ? '#FFFFFF' : colors.muted}
            />
            <Text
              style={[
                styles.filterPillText,
                {
                  color: activeFilter === 'community' ? '#FFFFFF' : colors.text,
                  fontWeight: activeFilter === 'community' ? '800' : '600',
                },
              ]}
            >
              Community
            </Text>
          </Pressable>

          {/* TASKS */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filter Tasks: ${countsByCategory.tasks} items`}
            onPress={() => setActiveFilter('tasks')}
            style={[
              styles.filterPill,
              activeFilter === 'tasks'
                ? [styles.filterPillActive, { backgroundColor: brandGreen, borderColor: brandGreen }]
                : [styles.filterPillInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            ]}
          >
            <Ionicons
              name="timer-outline"
              size={13}
              color={activeFilter === 'tasks' ? '#FFFFFF' : colors.muted}
            />
            <Text
              style={[
                styles.filterPillText,
                {
                  color: activeFilter === 'tasks' ? '#FFFFFF' : colors.text,
                  fontWeight: activeFilter === 'tasks' ? '800' : '600',
                },
              ]}
            >
              Tasks
            </Text>
          </Pressable>

          {/* WELLNESS */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filter Wellness: ${countsByCategory.wellness} items`}
            onPress={() => setActiveFilter('wellness')}
            style={[
              styles.filterPill,
              activeFilter === 'wellness'
                ? [styles.filterPillActive, { backgroundColor: brandGreen, borderColor: brandGreen }]
                : [styles.filterPillInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            ]}
          >
            <Ionicons
              name="heart-outline"
              size={13}
              color={activeFilter === 'wellness' ? '#FFFFFF' : colors.muted}
            />
            <Text
              style={[
                styles.filterPillText,
                {
                  color: activeFilter === 'wellness' ? '#FFFFFF' : colors.text,
                  fontWeight: activeFilter === 'wellness' ? '800' : '600',
                },
              ]}
            >
              Wellness
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* ─── SUMMARY & QUICK BATCH BAR ─── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryLeft}>
          <Text style={[styles.summaryText, { color: colors.muted }]}>
            {unreadCount > 0
              ? `${unreadCount} unread`
              : 'All caught up'}
          </Text>
        </View>

        <View style={styles.summaryActions}>
          {unreadCount > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
              disabled={markingAll}
              onPress={markAllRead}
              style={({ pressed }) => [styles.batchActionBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="checkmark-done" size={14} color={brandGreen} />
              <Text style={[styles.batchActionText, { color: brandGreen }]}>
                {markingAll ? 'Updating...' : 'Mark all read'}
              </Text>
            </Pressable>
          )}

          {readCount > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear read notifications"
              disabled={clearingRead}
              onPress={clearReadNotifications}
              style={({ pressed }) => [styles.batchActionBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="trash-outline" size={13} color={colors.muted} />
              <Text style={[styles.batchActionText, { color: colors.muted }]}>
                {clearingRead ? 'Clearing...' : 'Clear read'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ─── NOTIFICATION FEED OR REFINED EMPTY STATE ─── */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconCircle,
                {
                  backgroundColor: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)',
                },
              ]}
            >
              <Ionicons
                name={
                  activeFilter === 'unread'
                    ? 'checkmark-done-circle-outline'
                    : 'notifications-off-outline'
                }
                size={34}
                color={brandGreen}
              />
            </View>

            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeFilter === 'unread'
                ? 'Zero unread alerts'
                : activeFilter === 'all'
                  ? 'No notifications yet'
                  : `No ${activeFilter} notifications`}
            </Text>

            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              {activeFilter === 'unread'
                ? 'You are all caught up on your projects, tasks, and wellness reminders.'
                : 'Activity across your teams, focus sessions, and community channels will appear here.'}
            </Text>

            <View style={styles.emptyButtonRow}>
              {activeFilter !== 'all' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveFilter('all')}
                  style={[styles.primaryButton, { backgroundColor: brandGreen }]}
                >
                  <Text style={styles.primaryButtonText}>View All Alerts</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/(tabs)/tasks' as never)}
                  style={[styles.primaryButton, { backgroundColor: brandGreen }]}
                >
                  <Ionicons name="checkbox-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Go to Tasks</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Card>
      ) : (
        groupedNotifications.map((group) => (
          <View key={group.title} style={styles.groupContainer}>
            {/* Section Header: Today, Yesterday, Earlier */}
            <Text style={[styles.groupHeader, { color: colors.muted }]}>
              {group.title}
            </Text>

            {group.items.map((notification) => {
              const isSessionRead = sessionReadIds.has(notification.id);
              const isUnread = !notification.read && !isSessionRead;
              const category = getNotificationCategory(
                notification.type,
                notification.title,
                notification.message,
              );
              const badge = getCategoryBadge(category, isLight);
              const actionLabel = getActionLabel(notification.link);

              return (
                <Pressable
                  key={notification.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${notification.title}. ${notification.message}`}
                  onPress={() => openNotification(notification)}
                  style={({ pressed }) => [
                    styles.notificationCard,
                    {
                      backgroundColor: isUnread ? colors.surfaceElevated : colors.surface,
                      borderColor: isUnread ? (isLight ? '#cbd5e1' : '#334155') : colors.border,
                    },
                    isUnread && {
                      borderLeftWidth: 3.5,
                      borderLeftColor: badge.color,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View style={styles.cardMainRow}>
                    {/* Category Avatar Squircle */}
                    <View
                      style={[
                        styles.avatarSquircle,
                        {
                          backgroundColor: badge.bg,
                        },
                      ]}
                    >
                      <Ionicons name={badge.icon} size={19} color={badge.color} />
                    </View>

                    {/* Content Column */}
                    <View style={styles.cardContent}>
                      {/* Meta: Badge + Time */}
                      <View style={styles.cardMetaRow}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                        <Text style={[styles.timeText, { color: colors.muted }]}>
                          {formatTimeAgo(notification.createdAt)}
                        </Text>
                      </View>

                      {/* Title */}
                      <Text
                        style={[
                          styles.cardTitle,
                          {
                            color: colors.text,
                            fontWeight: isUnread ? '800' : '600',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {notification.title}
                      </Text>

                      {/* Message */}
                      <Text
                        style={[styles.cardMessage, { color: colors.muted }]}
                        numberOfLines={2}
                      >
                        {notification.message}
                      </Text>

                      {/* Subtle Action Link */}
                      {actionLabel && (
                        <View style={styles.cardActionLink}>
                          <Text style={[styles.actionLinkText, { color: badge.color }]}>
                            {actionLabel}
                          </Text>
                          <Ionicons name="arrow-forward" size={11} color={badge.color} />
                        </View>
                      )}
                    </View>

                    {/* Right Column: Unread dot + Dismiss */}
                    <View style={styles.cardRightCol}>
                      {isUnread && (
                        <View style={[styles.unreadDot, { backgroundColor: badge.color }]} />
                      )}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete notification"
                        hitSlop={10}
                        onPress={(e) => deleteNotification(notification.id, e)}
                        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                      >
                        <Ionicons name="close" size={16} color={colors.muted} />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* ─── SETTINGS-STYLE HEADER ─── */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    minHeight: 80,
    width: '100%',
  },
  headerRowLarge: {
    alignItems: 'flex-start',
  },
  backBtn: {
    marginRight: -4,
  },
  notificationsLogoWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 0,
  },
  notificationsLogoWrapperLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  notificationsLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  notificationsLogoLarge: {
    borderRadius: 31,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  settingsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },

  /* ─── SEGMENTED FILTER BAR ─── */
  filterBarWrapper: {
    marginBottom: 12,
  },
  filterPillsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterPillActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  filterPillInactive: {},
  filterPillText: {
    fontSize: 12,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  /* ─── SUMMARY & QUICK BATCH BAR ─── */
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 14,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  batchActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  batchActionText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* ─── GROUP SECTION ─── */
  groupContainer: {
    marginBottom: 16,
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  /* ─── NOTIFICATION CARD ─── */
  notificationCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
  },
  avatarSquircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  cardMessage: {
    fontSize: 12,
    lineHeight: 17,
  },
  cardActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  actionLinkText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardRightCol: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
    flexShrink: 0,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── EMPTY STATE ─── */
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
