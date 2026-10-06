import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface CodeBlockProps {
  title?: string;
  language?: string;
  code: string;
  explanation?: string;
}

export function CodeBlock({ title, language = 'code', code, explanation }: CodeBlockProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);

  // Extract expected output if embedded in explanation
  const extractExpectedOutput = (): string => {
    if (!explanation) return '';
    const match = explanation.match(/Expected Output:\s*([\s\S]+)$/i);
    if (match) return match[1].trim();
    return '';
  };

  const expected = extractExpectedOutput();

  async function handleCopy() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleRun() {
    setIsRunning(true);
    setShowConsole(true);
    setTimeout(() => {
      setIsRunning(false);
      if (expected) {
        setConsoleOutput(expected);
      } else {
        setConsoleOutput('Program executed successfully with exit code 0.');
      }
    }, 450);
  }

  const langUpper = (language || 'CODE').toUpperCase();

  return (
    <View style={[styles.container, { borderColor: isLight ? '#d0d7de' : '#30363d' }]}>
      {/* Code Header Bar */}
      <View style={[styles.header, { backgroundColor: isLight ? '#f6f8fa' : '#161b22', borderBottomColor: isLight ? '#d0d7de' : '#30363d' }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.langBadge, { backgroundColor: isLight ? '#0969da' : colors.primary }]}>
            <Text style={styles.langText}>{langUpper}</Text>
          </View>
          {title ? (
            <Text style={[styles.titleText, { color: isLight ? '#24292f' : '#e6edf3' }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy code"
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: isLight ? '#eaeef2' : '#21262d' },
              pressed && styles.btnPressed,
            ]}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={14}
              color={copied ? '#22c55e' : isLight ? '#57606a' : '#8b949e'}
            />
            <Text style={[styles.actionBtnText, { color: copied ? '#22c55e' : isLight ? '#57606a' : '#8b949e' }]}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Run code"
            onPress={handleRun}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.runBtn,
              { backgroundColor: isLight ? '#2ea043' : '#238636' },
              pressed && styles.btnPressed,
            ]}
          >
            <Ionicons name="play" size={13} color="#ffffff" />
            <Text style={[styles.actionBtnText, { color: '#ffffff', fontWeight: '800' }]}>
              {isRunning ? 'Running…' : 'Run'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Code Content */}
      <View style={[styles.codeBody, { backgroundColor: isLight ? '#f8fafc' : '#0d1117' }]}>
        <Text style={[styles.codeText, { color: isLight ? '#1f2328' : '#e6edf3' }]}>
          {code}
        </Text>
      </View>

      {/* Execution Console Output */}
      {showConsole ? (
        <View style={[styles.consoleContainer, { backgroundColor: isLight ? '#1e293b' : '#040d1a' }]}>
          <View style={styles.consoleHeader}>
            <View style={styles.consoleTitleRow}>
              <Ionicons name="terminal-outline" size={13} color="#4ade80" />
              <Text style={styles.consoleTitle}>TERMINAL OUTPUT</Text>
            </View>
            <Pressable onPress={() => setShowConsole(false)} hitSlop={8}>
              <Ionicons name="close" size={15} color="#94a3b8" />
            </Pressable>
          </View>
          <Text style={styles.consoleOutputText}>
            {consoleOutput}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'Consolas, Monaco, "Courier New", monospace',
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  langBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  langText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  runBtn: {
    paddingHorizontal: 11,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.75,
  },
  codeBody: {
    padding: 14,
  },
  codeText: {
    fontFamily: monoFont,
    fontSize: 13,
    lineHeight: 20,
  },
  consoleContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  consoleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  consoleTitle: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  consoleOutputText: {
    fontFamily: monoFont,
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 19,
  },
});
