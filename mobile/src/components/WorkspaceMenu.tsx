import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';

const destinations: {
  title: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { title: 'Learning Hub', href: '/coding', icon: 'code-slash' },
  { title: 'AI Workspace', href: '/ai-assistant', icon: 'sparkles' },
  { title: 'Lecture to Life', href: '/lecture-to-life', icon: 'school' },
  { title: 'Community', href: '/community', icon: 'people' },
  { title: 'My Work', href: '/my-work', icon: 'git-pull-request' },
  { title: 'Portfolio', href: '/portfolio', icon: 'briefcase' },
  { title: 'Mock Interviews', href: '/interviews', icon: 'chatbubbles' },
  { title: 'Leaderboard', href: '/leaderboard', icon: 'trophy' },
  { title: 'Analytics', href: '/analytics', icon: 'bar-chart' },
];

export function WorkspaceMenu({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose(): void;
}) {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { fontSize, largerText, reduceMotion } = useAccessibility();

  const isLight = theme === 'light';
  const iconColor = isLight
    ? '#1e6827'
    : colors.primary;

  function open(href: string) {
    onClose();
    router.push(href as never);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <Text
              allowFontScaling
              style={[
                styles.heading,
                {
                  color: colors.text,
                  fontSize: fontSize(18),
                },
              ]}
            >
              Workspaces
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              onPress={onClose}
              style={[
                styles.close,
                {
                  backgroundColor:
                    colors.surfaceElevated,
                },
              ]}
            >
              <Ionicons
                name="close"
                size={largerText ? 22 : 20}
                color={colors.text}
              />
            </Pressable>
          </View>

          {destinations.map((item, index) => (
            <Pressable
              key={item.href}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              onPress={() => open(item.href)}
              style={({ pressed }) => [
                styles.row,
                largerText && styles.rowLarge,
                index > 0 && [
                  styles.divider,
                  { borderTopColor: colors.border },
                ],
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor:
                      colors.surfaceElevated,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={largerText ? 21 : 19}
                  color={iconColor}
                />
              </View>

              <Text
                allowFontScaling
                style={[
                  styles.label,
                  {
                    color: colors.text,
                    fontSize: fontSize(16),
                  },
                ]}
              >
                {item.title}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={largerText ? 20 : 18}
                color={colors.muted}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    gap: 1,
  },
  header: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
  },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLarge: {
    minHeight: 66,
  },
  divider: {
    borderTopWidth: 1,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.68,
  },
});
