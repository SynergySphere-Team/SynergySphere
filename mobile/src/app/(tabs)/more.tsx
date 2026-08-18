import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, Heading } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const destinations = [
  ['Learning Hub', 'Solve coding challenges and submit solutions.', '/coding'],
  ['AI Workspace', 'Ask for explanations, reviews, and debugging help.', '/ai-assistant'],
  ['LectureToLife', 'Turn lecture notes into study materials.', '/lecture-to-life'],
  ['Community', 'Find and apply to impact projects.', '/community'],
  ['Portfolio', 'Build your career project showcase.', '/portfolio'],
  ['Mock Interviews', 'Practice technical interview questions.', '/interviews'],
  ['Leaderboard', 'See the SynergySphere rankings.', '/leaderboard'],
] as const;

export default function MoreScreen() {
  const router = useRouter(); const { user } = useAuth();
  return <Screen><Heading subtitle="Every SynergySphere workspace, optimized for your phone.">More</Heading>
    {destinations.map(([title, description, route]) => <Card key={route}><Text style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text><Button title={`Open ${title}`} secondary onPress={() => router.push(route as never)} /></Card>)}
    {user?.role === 'ADMIN' ? <Card><Text style={styles.title}>Analytics</Text><Text style={styles.description}>Review platform-wide learning and wellness metrics.</Text><Button title="Open analytics" secondary onPress={() => router.push('/admin' as never)} /></Card> : null}
  </Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 17, fontWeight: '800' }, description: { color: colors.muted, lineHeight: 20 } });
