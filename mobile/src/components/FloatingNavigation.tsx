import { useEffect, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

type NavigationItem = { label: string; href: string; icon: keyof typeof Ionicons.glyphMap };
const items: NavigationItem[] = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Tasks', href: '/tasks', icon: 'checkmark-circle' },
  { label: 'Wellness', href: '/wellness', icon: 'heart' },
  { label: 'Explore', href: '/explore', icon: 'compass' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

function NavigationItemButton({ item, active, onPress }: { item: NavigationItem; active: boolean; onPress(): void }) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => { Animated.spring(progress, { toValue: active ? 1 : 0, useNativeDriver: true, speed: 22, bounciness: 5 }).start(); }, [active, progress]);
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const activeOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`Open ${item.label}`} onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
    <Animated.View style={[styles.itemInner, { transform: [{ scale }] }]}>
      <Animated.View pointerEvents="none" style={[styles.activeFill, { opacity: activeOpacity }]} />
      <Ionicons name={item.icon} size={20} color={active ? colors.background : colors.muted} />
      <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
    </Animated.View>
  </Pressable>;
}

export function FloatingNavigation() {
  const router = useRouter(); const pathname = usePathname(); const insets = useSafeAreaInsets();
  const activeHref = items.find((item) => item.href === '/' ? pathname === '/' : pathname.startsWith(item.href))?.href;
  return <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}><View accessibilityRole="tablist" style={styles.shell}>{items.map((item) => <NavigationItemButton key={item.href} item={item} active={item.href === activeHref} onPress={() => router.push(item.href as never)} />)}</View></View>;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, zIndex: 20, alignItems: 'center', paddingHorizontal: 14 },
  shell: { width: '100%', maxWidth: 660, minHeight: 66, flexDirection: 'row', alignItems: 'center', padding: 7, borderRadius: 27, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  item: { flex: 1, minHeight: 52, justifyContent: 'center' }, itemInner: { height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden' },
  activeFill: { ...StyleSheet.absoluteFill, backgroundColor: colors.primary, borderRadius: 18 }, label: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: -0.15 }, labelActive: { color: colors.background }, pressed: { opacity: 0.72 },
});
