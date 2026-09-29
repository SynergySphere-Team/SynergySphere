import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, Heading, Stat } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, logout, refresh } = useAuth();
  const { colors, theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const isLight = theme === 'light';
  const roleColor = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <Heading subtitle="Your SynergySphere account and learning progress.">Profile</Heading>
      <Card>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.initials, { color: roleColor }]}>
              {user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}
            </Text>
          </View>
          <View>
            <Text style={[styles.name, { color: colors.text }]}>{user?.firstName} {user?.lastName}</Text>
            <Text style={[styles.email, { color: colors.muted }]}>{user?.email}</Text>
            <Text style={[styles.role, { color: roleColor }]}>
              {user?.role === 'ORGANIZATION' ? 'Organization' : user?.role === 'ADMIN' ? 'Admin' : 'Student'}
            </Text>
          </View>
        </View>
      </Card>
      <View style={styles.stats}>
        <Stat label="Level" value={user?.level ?? 1} />
        <Stat label="XP" value={user?.xp ?? 0} />
      </View>
      <Card>
        <Text style={[styles.note, { color: colors.muted }]}>
          Your mobile session is stored securely on this device. Sign out removes the local access token.
        </Text>
        <Button title="Sign out" onPress={logout} secondary />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  initials: { fontSize: 20, fontWeight: '800' },
  name: { fontSize: 19, fontWeight: '800' },
  email: { marginTop: 2, fontSize: 14 },
  role: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  stats: { flexDirection: 'row', gap: 10 },
  note: { fontSize: 14, lineHeight: 20 },
});
