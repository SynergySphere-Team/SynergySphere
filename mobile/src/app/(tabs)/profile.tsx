import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, Heading, Stat } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  return <Screen><Heading subtitle="Your SynergySphere account and learning progress.">Profile</Heading><Card><View style={styles.identity}><View style={styles.avatar}><Text style={styles.initials}>{user?.firstName[0]}{user?.lastName[0]}</Text></View><View><Text style={styles.name}>{user?.firstName} {user?.lastName}</Text><Text style={styles.email}>{user?.email}</Text><Text style={styles.role}>{user?.role === 'ORGANIZATION' ? 'Organization' : 'Student'}</Text></View></View></Card><View style={styles.stats}><Stat label="Level" value={user?.level ?? 1} /><Stat label="XP" value={user?.xp ?? 0} /></View><Card><Text style={styles.note}>Your mobile session is stored securely on this device. Sign out removes the local access token.</Text><Button title="Sign out" onPress={logout} secondary /></Card></Screen>;
}
const styles = StyleSheet.create({ identity: { flexDirection: 'row', alignItems: 'center', gap: 14 }, avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark, borderColor: colors.primary, borderWidth: 1 }, initials: { color: colors.primary, fontSize: 20, fontWeight: '800' }, name: { color: colors.text, fontSize: 19, fontWeight: '800' }, email: { color: colors.muted, marginTop: 2 }, role: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 6 }, stats: { flexDirection: 'row', gap: 10 }, note: { color: colors.muted, fontSize: 14, lineHeight: 20 } });
