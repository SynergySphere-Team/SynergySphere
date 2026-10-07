import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const destinations = [
  ['Learning Hub', 'Interactive programming curriculum & challenges.', '/coding'],
  ['AI Workspace', 'Ask for explanations, reviews, and debugging help.', '/ai-assistant'],
  ['LectureToLife', 'Turn lecture notes into study materials.', '/lecture-to-life'],
  ['Community', 'Find and apply to impact projects.', '/community'],
  ['Portfolio', 'Build your career project showcase.', '/portfolio'],
  ['Mock Interviews', 'Practice technical interview questions.', '/interviews'],
  ['Leaderboard', 'See the SynergySphere rankings.', '/leaderboard'],
] as const;

export default function MoreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  return (
    <Screen>
      <Heading subtitle="Every SynergySphere workspace, optimized for your phone.">More</Heading>
      {destinations.map(([title, description, route]) => (
        <Card key={route}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
          <Button title={`Open ${title}`} secondary onPress={() => router.push(route as never)} />
        </Card>
      ))}
      {user?.role === 'ADMIN' ? (
        <Card>
          <Text style={[styles.title, { color: colors.text }]}>Admin Portal</Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            Overview, user management, approvals, moderation, events, tickets, reports & database maintenance.
          </Text>
          <Button title="Open Admin Portal" secondary onPress={() => router.push('/admin' as never)} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '800' },
  description: { lineHeight: 20, fontSize: 13 },
});
