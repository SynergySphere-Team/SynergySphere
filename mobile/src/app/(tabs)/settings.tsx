import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { github } from '@/services/github';
import type { GithubConnection } from '@/types/api';

const links = [
  { title: 'Notifications', description: 'Review your latest updates.', href: '/notifications', icon: 'notifications' },
] as const;

export default function SettingsScreen() {
  const router = useRouter(); const { logout, user, updateProfile } = useAuth(); const { theme, setTheme, colors } = useTheme();
  const [firstName, setFirstName] = useState(user?.firstName || ''); const [lastName, setLastName] = useState(user?.lastName || ''); const [photo, setPhoto] = useState<string | null | undefined>(user?.profilePicture); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(''); const [githubConnection, setGithubConnection] = useState<GithubConnection | null>(null);
  useEffect(() => { setFirstName(user?.firstName || ''); setLastName(user?.lastName || ''); setPhoto(user?.profilePicture); }, [user]);
  useEffect(() => { github.connection().then(setGithubConnection).catch(() => setGithubConnection(null)); }, []);
  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setMessage('Photo-library access is needed to choose a profile photo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.55, base64: true });
    if (!result.canceled && result.assets[0]?.base64) setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
  }
  async function saveProfile() {
    if (!firstName.trim() || !lastName.trim()) { setMessage('Enter both your first and last name.'); return; }
    setSaving(true); setMessage('');
    try { await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), profilePicture: photo }); setMessage('Profile saved.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save your profile.'); }
    finally { setSaving(false); }
  }
  async function disconnectGithub() {
    try { await github.disconnect(); setGithubConnection({ connected: false, username: null, avatarUrl: null }); setMessage('GitHub disconnected from SynergySphere.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not disconnect GitHub.'); }
  }
  return <Screen><Heading subtitle="Manage your account and app preferences.">Settings</Heading>{message ? <Notice tone={message === 'Profile saved.' ? 'success' : 'error'}>{message}</Notice> : null}
    <Card><View style={styles.sectionHeader}><View><Text style={[styles.title, { color: colors.text }]}>Appearance</Text><Text style={[styles.description, { color: colors.muted }]}>Switch between dark and light themes.</Text></View><Switch value={theme === 'dark'} onValueChange={value => setTheme(value ? 'dark' : 'light')} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={theme === 'dark' ? '#ffffff' : colors.surface} accessibilityLabel="Toggle dark mode" /></View><Text style={[styles.modeLabel, { color: theme === 'light' ? '#2e7d32' : colors.primary }]}>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</Text></Card>
    <Card><Text style={[styles.title, { color: colors.text }]}>Your profile</Text><View style={styles.profileTop}><Pressable onPress={choosePhoto} accessibilityRole="button" accessibilityLabel="Choose profile photo" style={[styles.avatar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>{photo ? <Image source={{ uri: photo }} style={styles.avatarImage} /> : <Ionicons name="person" size={34} color={theme === 'light' ? '#2e7d32' : colors.primary} />}</Pressable><View style={styles.profileCopy}><Text style={[styles.description, { color: colors.muted }]}>Choose a photo from your device. Images are cropped square and saved to your profile.</Text><Button title="Upload profile photo" secondary onPress={choosePhoto} /></View></View><Field label="First name" value={firstName} onChangeText={setFirstName} /><Field label="Last name" value={lastName} onChangeText={setLastName} /><Text style={[styles.email, { color: colors.muted }]}>{user?.email}</Text><Button title={saving ? 'Saving…' : 'Save profile'} onPress={saveProfile} disabled={saving} /></Card>
    <Card>{links.map(link => <Pressable key={link.href} accessibilityRole="button" onPress={() => router.push(link.href as never)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={[styles.icon, { backgroundColor: colors.surfaceElevated }]}><Ionicons name={link.icon} size={20} color={theme === 'light' ? '#2e7d32' : colors.primary} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>{link.title}</Text><Text style={[styles.description, { color: colors.muted }]}>{link.description}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.muted} /></Pressable>)}</Card>
    <Card><Text style={[styles.title, { color: colors.text }]}>GitHub</Text><Text style={[styles.description, { color: colors.muted }]}>{githubConnection?.connected ? `Connected as @${githubConnection.username}. Repository access is encrypted at rest.` : 'Connect GitHub to collaborate on Community repositories.'}</Text><Button title={githubConnection?.connected ? 'Disconnect GitHub' : 'Connect GitHub'} secondary onPress={githubConnection?.connected ? disconnectGithub : () => router.push('/github-connect?returnTo=/settings' as never)} /></Card>
    <Card><Text style={[styles.title, { color: colors.text }]}>Session</Text><Text style={[styles.description, { color: colors.muted }]}>Signing out removes your securely stored session from this device.</Text><Button title="Sign out" secondary onPress={logout} /></Card>
  </Screen>;
}
const styles = StyleSheet.create({ sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, modeLabel: { fontSize: 13, fontWeight: '800' }, profileTop: { flexDirection: 'row', gap: 12, alignItems: 'center' }, avatar: { width: 76, height: 76, borderRadius: 38, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1 }, avatarImage: { width: '100%', height: '100%' }, profileCopy: { flex: 1, gap: 8 }, row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }, pressed: { opacity: 0.7 }, icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, copy: { flex: 1, gap: 3 }, title: { fontSize: 16, fontWeight: '800' }, description: { fontSize: 13, lineHeight: 18 }, email: { fontSize: 13 } });
