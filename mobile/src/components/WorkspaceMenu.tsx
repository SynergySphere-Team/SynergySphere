import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

const destinations: { title: string; href: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { title: 'Learning Hub', href: '/coding', icon: 'code-slash' },
  { title: 'AI Workspace', href: '/ai-assistant', icon: 'sparkles' },
  { title: 'LectureToLife', href: '/lecture-to-life', icon: 'school' },
  { title: 'Community', href: '/community', icon: 'people' },
  { title: 'Portfolio', href: '/portfolio', icon: 'briefcase' },
  { title: 'Mock Interviews', href: '/interviews', icon: 'chatbubbles' },
  { title: 'Leaderboard', href: '/leaderboard', icon: 'trophy' },
];

export function WorkspaceMenu({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const router = useRouter();
  function open(href: string) { onClose(); router.push(href as never); }
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.overlay}><Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose} style={StyleSheet.absoluteFill} /><View style={styles.sheet}><View style={styles.header}><Text style={styles.heading}>Workspaces</Text><Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose} style={styles.close}><Ionicons name="close" size={20} color={colors.text} /></Pressable></View>{destinations.map((item, index) => <Pressable key={item.href} accessibilityRole="button" onPress={() => open(item.href)} style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}><View style={styles.icon}><Ionicons name={item.icon} size={19} color={colors.primary} /></View><Text style={styles.label}>{item.title}</Text><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>)}</View></View></Modal>;
}

const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' }, sheet: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 32, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, gap: 1 }, header: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { color: colors.text, fontSize: 18, fontWeight: '800' }, close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.surfaceElevated }, row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 }, divider: { borderTopWidth: 1, borderTopColor: colors.border }, icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primaryDark }, label: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' }, pressed: { opacity: 0.68 } });
