import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { github } from '@/services/github';
import type { GithubConnection } from '@/types/api';

interface SettingsData {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    bio: string | null;
    theme: string;
    emailNotifications: boolean;
  };
  profile: {
    githubUrl: string | null;
    linkedinUrl: string | null;
    targetRole: string | null;
    location: string | null;
    about: string | null;
  };
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user, updateProfile } = useAuth();
  const { theme, setTheme, colors } = useTheme();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [bio, setBio] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [location, setLocation] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [photo, setPhoto] = useState<string | null | undefined>(user?.profilePicture);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [githubConnection, setGithubConnection] = useState<GithubConnection | null>(null);
  const [resetSending, setResetSending] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setPhoto(user?.profilePicture);
  }, [user]);

  useEffect(() => {
    api
      .get<SettingsData>('/auth/settings')
      .then((data) => {
        if (data.user) {
          setFirstName(data.user.firstName || '');
          setLastName(data.user.lastName || '');
          setBio(data.user.bio || data.profile?.about || '');
          setEmailNotifications(data.user.emailNotifications ?? true);
        }
        if (data.profile) {
          setTargetRole(data.profile.targetRole || '');
          setLocation(data.profile.location || '');
          setGithubUrl(data.profile.githubUrl || '');
          setLinkedinUrl(data.profile.linkedinUrl || '');
        }
      })
      .catch(() => {});

    github
      .connection()
      .then(setGithubConnection)
      .catch(() => setGithubConnection(null));
  }, []);

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage({ type: 'error', text: 'Photo-library access is needed to choose a profile photo.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  async function saveSettings() {
    if (!firstName.trim() || !lastName.trim()) {
      setMessage({ type: 'error', text: 'First and last name are required.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.patch('/auth/settings', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        targetRole: targetRole.trim(),
        location: location.trim(),
        githubUrl: githubUrl.trim(),
        linkedinUrl: linkedinUrl.trim(),
        theme,
        emailNotifications,
      });

      if (photo !== user?.profilePicture) {
        await updateProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          profilePicture: photo,
        });
      }

      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not save settings.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestPasswordReset() {
    if (!user?.email) return;
    setResetSending(true);
    try {
      const res = await api.post<{ message: string; resetToken?: string }>('/auth/forgot-password', {
        email: user.email,
      });
      Alert.alert(
        'Password Reset',
        res.resetToken
          ? `Reset token generated:\n\n${res.resetToken}\n\nYou can use this token to reset your password.`
          : 'A password reset link has been dispatched to your email.'
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not request password reset.');
    } finally {
      setResetSending(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete Account (POPIA)',
      'This will permanently delete your account, project contributions, and all personal data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/auth/me');
              await logout();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete account.');
            }
          },
        },
      ]
    );
  }

  async function disconnectGithub() {
    try {
      await github.disconnect();
      setGithubConnection({ connected: false, username: null, avatarUrl: null });
      setMessage({ type: 'success', text: 'GitHub disconnected from SynergySphere.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not disconnect GitHub.',
      });
    }
  }

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <Heading subtitle="Manage your developer identity, preferences, and account security.">Settings</Heading>

      {message ? <Notice tone={message.type === 'success' ? 'success' : 'error'}>{message.text}</Notice> : null}

      {/* Developer Profile */}
      <Card>
        <Text style={[styles.title, { color: colors.text }]}>Developer Profile</Text>
        <View style={styles.profileTop}>
          <Pressable
            onPress={choosePhoto}
            accessibilityRole="button"
            accessibilityLabel="Choose profile photo"
            style={[styles.avatar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={34} color={primaryAccent} />
            )}
          </Pressable>
          <View style={styles.profileCopy}>
            <Text style={[styles.description, { color: colors.muted }]}>
              Profile picture is visible across community projects and team chats.
            </Text>
            <Button title="Upload Photo" secondary onPress={choosePhoto} />
          </View>
        </View>

        <Field label="First Name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last Name" value={lastName} onChangeText={setLastName} />
        <Field label="Target Role (e.g. Backend Intern)" value={targetRole} onChangeText={setTargetRole} />
        <Field label="Location" value={location} onChangeText={setLocation} />
        <Field label="Bio / Engineering Focus" value={bio} onChangeText={setBio} multiline numberOfLines={3} />
        <Field label="LinkedIn Profile URL" value={linkedinUrl} onChangeText={setLinkedinUrl} />
        <Field label="GitHub Profile URL" value={githubUrl} onChangeText={setGithubUrl} />

        <Button title={saving ? 'Saving…' : 'Save Profile Changes'} onPress={saveSettings} disabled={saving} />
      </Card>

      {/* Preferences & Theme */}
      <Card>
        <Text style={[styles.title, { color: colors.text, marginBottom: 12 }]}>Preferences</Text>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Dark Mode</Text>
            <Text style={[styles.description, { color: colors.muted }]}>Switch between dark and light themes.</Text>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
            trackColor={{ false: colors.border, true: primaryAccent }}
            thumbColor={theme === 'dark' ? '#ffffff' : colors.surface}
          />
        </View>

        <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Email Notifications</Text>
            <Text style={[styles.description, { color: colors.muted }]}>Receive updates on project reviews and deadlines.</Text>
          </View>
          <Switch
            value={emailNotifications}
            onValueChange={setEmailNotifications}
            trackColor={{ false: colors.border, true: primaryAccent }}
            thumbColor={emailNotifications ? '#ffffff' : colors.surface}
          />
        </View>
      </Card>

      {/* GitHub Integration */}
      <Card>
        <Text style={[styles.title, { color: colors.text }]}>GitHub Collaboration</Text>
        <Text style={[styles.description, { color: colors.muted, marginBottom: 10 }]}>
          {githubConnection?.connected
            ? `Connected as @${githubConnection.username}. Repository access is encrypted at rest.`
            : 'Connect GitHub to collaborate on community projects and sync repositories.'}
        </Text>
        <Button
          title={githubConnection?.connected ? 'Disconnect GitHub' : 'Connect GitHub'}
          secondary
          onPress={githubConnection?.connected ? disconnectGithub : () => router.push('/github-connect?returnTo=/settings' as never)}
        />
      </Card>

      {/* Account Security & Password */}
      <Card>
        <Text style={[styles.title, { color: colors.text }]}>Security</Text>
        <Text style={[styles.description, { color: colors.muted, marginBottom: 12 }]}>
          Request a secure password reset token dispatched to {user?.email}.
        </Text>
        <Button
          title={resetSending ? 'Sending Token…' : 'Request Password Reset Token'}
          secondary
          onPress={handleRequestPasswordReset}
          disabled={resetSending}
        />
      </Card>

      {/* Session & Sign Out */}
      <Card>
        <Text style={[styles.title, { color: colors.text }]}>Session</Text>
        <Text style={[styles.description, { color: colors.muted, marginBottom: 10 }]}>
          Signing out removes your securely stored session credentials from this device.
        </Text>
        <Button title="Sign Out" secondary onPress={logout} />
      </Card>

      {/* POPIA Account Deletion */}
      <Card>
        <Text style={[styles.title, { color: colors.danger }]}>Danger Zone (POPIA Compliance)</Text>
        <Text style={[styles.description, { color: colors.muted, marginBottom: 10 }]}>
          Permanently delete your account and personal data pursuant to POPIA privacy rights.
        </Text>
        <Button title="Delete Account" danger onPress={confirmDeleteAccount} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileTop: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  avatar: { width: 76, height: 76, borderRadius: 38, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarImage: { width: '100%', height: '100%' },
  profileCopy: { flex: 1, gap: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  description: { fontSize: 13, lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { fontSize: 14, fontWeight: '700' },
});
