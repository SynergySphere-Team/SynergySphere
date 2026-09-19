import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';

type Message = {
  role: 'You' | 'SynergySphere AI';
  content: string;
  lessonTitle?: string;
};

type Grounding = {
  source: 'lesson' | 'upload' | 'search' | 'none';
  lessonId: string | null;
  lessonTitle: string | null;
  subjectName: string | null;
  moduleName: string | null;
};

type LessonPreview = {
  id: string;
  title: string;
  subjectName: string;
  moduleName: string;
  firstExampleCode?: string;
};

export default function AIAssistantScreen() {
  const { colors, theme } = useTheme();
  const { lesson: lessonParam } = useLocalSearchParams<{ lesson?: string }>();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'SynergySphere AI',
      content:
        'How can I help with your code or learning today? I am grounded in the LectureToLife Programming Academy and your study packs.',
    },
  ]);
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lesson, setLesson] = useState<LessonPreview | null>(null);

  // Fetch lesson details when opened with ?lesson=<id>.
  useEffect(() => {
    if (!lessonParam) {
      setLesson(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await api.get<{
          id: string;
          title: string;
          subjectName: string;
          moduleName: string;
          content: { examples?: Array<{ code: string }> };
        }>(`/curriculum/lessons/${lessonParam}`);
        if (cancelled) return;
        setLesson({
          id: detail.id,
          title: detail.title,
          subjectName: detail.subjectName,
          moduleName: detail.moduleName,
          firstExampleCode: detail.content?.examples?.[0]?.code,
        });
        setContext((prev) => prev || detail.content?.examples?.[0]?.code || '');
      } catch {
        if (!cancelled) setLesson(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonParam]);

  const historyFromMessages = useCallback(
    (msgs: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> =>
      msgs
        .filter((m) => m.role === 'You' || m.role === 'SynergySphere AI')
        .slice(-20)
        .map((m) => ({
          role: m.role === 'You' ? ('user' as const) : ('assistant' as const),
          content: m.content,
        })),
    [],
  );

  async function send(value = message) {
    if (!value.trim() || loading) return;
    const question = value.trim();
    const baseMessages = messages;
    setMessages((current) => [...current, { role: 'You', content: question }]);
    setMessage('');
    setLoading(true);
    try {
      const response = await api.post<{ response: string; grounding?: Grounding }>('/ai/chat', {
        message: question,
        ...(context.trim() ? { context } : {}),
        ...(lesson ? { lessonId: lesson.id } : {}),
        history: historyFromMessages(baseMessages).slice(-20),
      });
      setMessages((current) => [
        ...current,
        {
          role: 'SynergySphere AI',
          content: response.response,
          lessonTitle: response.grounding?.lessonTitle || undefined,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI workspace is unavailable.');
    } finally {
      setLoading(false);
    }
  }

  const isLight = theme === 'light';
  const youColor = isLight ? '#1e6827' : colors.primary;
  const aiColor = isLight ? '#1a73e8' : '#9dc8ff';

  return (
    <Screen>
      <Heading
        subtitle={
          lesson
            ? `Grounded in ${lesson.subjectName} › ${lesson.moduleName} › ${lesson.title}`
            : 'Grounded in the LectureToLife Programming Academy and your study packs.'
        }
      >
        AI Workspace
      </Heading>

      {lesson ? (
        <Card>
          <View style={styles.groundedRow}>
            <Ionicons name="book-outline" size={15} color={colors.primary} />
            <Text style={[styles.groundedText, { color: colors.primary }]}>Grounded in</Text>
            <Text style={[styles.groundedLesson, { color: colors.text }]}>
              {lesson.subjectName} › {lesson.moduleName} › {lesson.title}
            </Text>
          </View>
        </Card>
      ) : null}

      {error ? <Notice>{error}</Notice> : null}
      <Card>
        <Field
          label={lesson ? 'Code context (pre-filled from the lesson)' : 'Optional code context'}
          value={context}
          onChangeText={setContext}
          multiline
          placeholder="Paste code or notes for better answers"
          style={styles.context}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Card>
      {messages.map((item, index) => (
        <Card key={index}>
          <Text style={[styles.role, { color: item.role === 'You' ? youColor : aiColor }]}>
            {item.role}
          </Text>
          <Text style={[styles.copy, { color: colors.text }]}>{item.content}</Text>
          {item.role === 'SynergySphere AI' && item.lessonTitle ? (
            <Text style={[styles.basedOn, { color: colors.primary }]}>
              Based on: {item.lessonTitle}
            </Text>
          ) : null}
        </Card>
      ))}
      <Card>
        <Field
          label="Ask SynergySphere AI"
          value={message}
          onChangeText={setMessage}
          placeholder={lesson ? `Ask about ${lesson.title}…` : 'e.g. Explain JavaScript closures'}
          multiline
        />
        <Button
          title={loading ? 'Thinking…' : 'Send'}
          onPress={() => send()}
          disabled={loading || !message.trim()}
          secondary
        />
        <Button
          title="Explain my code"
          onPress={() => send('Explain the code context step by step and suggest one improvement.')}
          disabled={loading || !context.trim()}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  role: { fontWeight: '800', fontSize: 13, marginBottom: 4 },
  copy: { lineHeight: 21, fontSize: 14 },
  context: { minHeight: 110, textAlignVertical: 'top', fontFamily: 'monospace', paddingTop: 12 },
  groundedRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  groundedText: { fontSize: 12, fontWeight: '800' },
  groundedLesson: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  basedOn: { fontSize: 11, fontWeight: '800', marginTop: 6 },
});
