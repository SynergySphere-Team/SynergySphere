import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, Heading } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const links = [
  { title: 'Profile', description: 'View your account and learning progress.', href: '/profile', icon: 'person' },
  { title: 'Notifications', description: 'Review your latest updates.', href: '/notifications', icon: 'notifications' },
] as const;

export default function SettingsScreen() {
  const router = useRouter(); const { logout } = useAuth();
  return <Screen><Heading subtitle="Manage your account and app preferences.">Settings</Heading><Card>{links.map((link, index) => <Pressable key={link.href} accessibilityRole="button" onPress={() => router.push(link.href as never)} style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}><View style={styles.icon}><Ionicons name={link.icon} size={20} color={colors.primary} /></View><View style={styles.copy}><Text style={styles.title}>{link.title}</Text><Text style={styles.description}>{link.description}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.muted} /></Pressable>)}</Card><Card><Text style={styles.title}>Session</Text><Text style={styles.description}>Signing out removes your securely stored session from this device.</Text><Button title="Sign out" secondary onPress={logout} /></Card></Screen>;
}
const styles = StyleSheet.create({ row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }, divider: { borderTopWidth: 1, borderTopColor: colors.border }, pressed: { opacity: 0.7 }, icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primaryDark }, copy: { flex: 1, gap: 3 }, title: { color: colors.text, fontSize: 16, fontWeight: '800' }, description: { color: colors.muted, fontSize: 13, lineHeight: 18 } });
