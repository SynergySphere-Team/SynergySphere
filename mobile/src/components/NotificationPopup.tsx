import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';

type AppNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
};

export default function NotificationPopup() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [popup, setPopup] = useState<AppNotification | null>(null);

  useEffect(() => {
    setPopup(null);

    if (!user) return;

    let active = true;
    let initialized = false;
    let checking = false;

    const knownIds = new Set<string>();

    async function checkNotifications() {
      if (checking) return;

      checking = true;

      try {
        const result = await api.get<AppNotification[]>(
          '/notifications?take=50'
        );

        if (!active || !Array.isArray(result)) return;

        // Existing notifications should not appear as new pop-ups.
        if (!initialized) {
          result.forEach(item => knownIds.add(item.id));
          initialized = true;
          return;
        }

        const newNotifications = result
          .filter(item => !knownIds.has(item.id) && !item.read)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );

        result.forEach(item => knownIds.add(item.id));

        if (newNotifications.length > 0) {
          setPopup(newNotifications[0]);
        }
      } catch {
        // A temporary connection error should not interrupt the app.
      } finally {
        checking = false;
      }
    }

    void checkNotifications();

    const interval = setInterval(
      () => void checkNotifications(),
      20000
    );

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!popup) return;

    const timeout = setTimeout(() => {
      setPopup(null);
    }, 6000);

    return () => clearTimeout(timeout);
  }, [popup]);

  if (!user || !popup) return null;

  function openNotification() {
    if (!popup) return;

    const destination = popup.link || '/notifications';

    setPopup(null);
    router.push(destination as never);
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlay,
        { top: insets.top + 12 },
      ]}
    >
      <Pressable
        onPress={openNotification}
        accessibilityRole="button"
        accessibilityLabel={`Notification: ${popup.title}`}
        style={[
          styles.banner,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="notifications"
          size={24}
          color={colors.primary}
        />

        <View style={styles.content}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {popup.title}
          </Text>

          <Text
            style={[styles.message, { color: colors.muted }]}
            numberOfLines={2}
          >
            {popup.message}
          </Text>
        </View>

        <Pressable
          onPress={() => setPopup(null)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          hitSlop={10}
        >
          <Ionicons
            name="close"
            size={20}
            color={colors.muted}
          />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 20,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: 14,
    fontWeight: '800',
  },

  message: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
});