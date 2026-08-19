import { useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export type NavigationItem = { label: string; href: string; icon: keyof typeof Ionicons.glyphMap };
export const NAV_TAB_ITEMS: NavigationItem[] = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Tasks', href: '/tasks', icon: 'checkmark-circle' },
  { label: 'Wellness', href: '/wellness', icon: 'heart' },
  { label: 'Explore', href: '/explore', icon: 'compass' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

export function FloatingNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);

  const activeIndex = Math.max(
    0,
    NAV_TAB_ITEMS.findIndex((item) => (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)))
  );

  const position = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.timing(position, {
      toValue: activeIndex,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, position]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const innerWidth = Math.max(0, containerWidth - 14);
  const itemWidth = innerWidth > 0 ? innerWidth / NAV_TAB_ITEMS.length : 0;

  const translateX = position.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [0, itemWidth, itemWidth * 2, itemWidth * 3, itemWidth * 4],
  });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}>
      <View accessibilityRole="tablist" onLayout={onLayout} style={styles.shell}>
        {itemWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeIndicator,
              {
                width: itemWidth,
                transform: [{ translateX }],
              },
            ]}
          />
        )}
        {NAV_TAB_ITEMS.map((item, index) => {
          const active = index === activeIndex;
          return (
            <Pressable
              key={item.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Open ${item.label}`}
              onPress={() => router.push(item.href as never)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <Ionicons name={item.icon} size={20} color={active ? colors.background : colors.muted} />
              <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
    alignItems: 'center',
  },
  shell: {
    width: '100%',
    maxWidth: 680,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
    borderRadius: 35,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  activeIndicator: {
    position: 'absolute',
    top: 7,
    left: 7,
    height: 56,
    borderRadius: 29,
    backgroundColor: colors.primary,
  },
  item: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 1,
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  labelActive: {
    color: colors.background,
  },
  pressed: {
    opacity: 0.75,
  },
});
