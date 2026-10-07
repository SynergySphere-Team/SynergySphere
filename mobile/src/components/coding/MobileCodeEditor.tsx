import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import { CodeKeyboardToolbar } from './CodeKeyboardToolbar';

interface MobileCodeEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  language?: string;
  minHeight?: number;
}

export function MobileCodeEditor({
  value,
  onChangeText,
  language = 'TypeScript',
  minHeight = 200,
}: MobileCodeEditorProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const [fontSize, setFontSize] = useState(13);
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: value.length,
    end: value.length,
  });

  const lines = value.split('\n');

  function handleInsertSymbol(symbol: string) {
    const { start, end } = selection;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const newText = before + symbol + after;

    onChangeText(newText);
    const newCursor = start + symbol.length;
    setSelection({ start: newCursor, end: newCursor });
  }

  function handleFormatIndentation() {
    // Quick clean 2-space indentation pass
    const formatted = lines
      .map((l) => l.trimEnd())
      .join('\n');
    onChangeText(formatted);
  }

  return (
    <View style={[styles.container, { borderColor: isLight ? '#cbd5e1' : '#334155' }]}>
      {/* Editor Top Bar */}
      <View style={[styles.topBar, { backgroundColor: isLight ? '#f1f5f9' : '#0f172a', borderColor: isLight ? '#cbd5e1' : '#1e293b' }]}>
        <View style={styles.langBadge}>
          <Ionicons name="code-slash" size={13} color="#38bdf8" />
          <Text style={styles.langText}>{language}</Text>
        </View>

        <View style={styles.controlsRow}>
          {/* Format button */}
          <Pressable
            onPress={handleFormatIndentation}
            style={styles.iconBtn}
            accessibilityLabel="Format indentation"
          >
            <Ionicons name="sparkles-outline" size={14} color={colors.muted} />
          </Pressable>

          {/* Font Scaling */}
          <Pressable
            onPress={() => setFontSize((s) => Math.max(10, s - 1))}
            style={styles.iconBtn}
            accessibilityLabel="Decrease font size"
          >
            <Text style={[styles.fontBtnText, { color: colors.muted }]}>A-</Text>
          </Pressable>
          <Pressable
            onPress={() => setFontSize((s) => Math.min(18, s + 1))}
            style={styles.iconBtn}
            accessibilityLabel="Increase font size"
          >
            <Text style={[styles.fontBtnText, { color: colors.muted }]}>A+</Text>
          </Pressable>
        </View>
      </View>

      {/* Editor Body with Gutter */}
      <View style={[styles.editorBody, { backgroundColor: isLight ? '#0f172a' : '#020617', minHeight }]}>
        {/* Line Numbers Gutter */}
        <View style={[styles.gutter, { borderRightColor: '#1e293b' }]}>
          {lines.map((_, i) => (
            <Text
              key={i}
              style={[
                styles.gutterNum,
                { fontSize, lineHeight: fontSize * 1.45, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
              ]}
            >
              {i + 1}
            </Text>
          ))}
        </View>

        {/* Code Input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          keyboardAppearance="dark"
          style={[
            styles.codeTextInput,
            {
              fontSize,
              lineHeight: fontSize * 1.45,
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            },
          ]}
        />
      </View>

      {/* 1-Tap Keyboard Accessory Symbol Toolbar */}
      <CodeKeyboardToolbar onInsertSymbol={handleInsertSymbol} accentColor="#38bdf8" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 4,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  fontBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  editorBody: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  gutter: {
    width: 32,
    paddingHorizontal: 6,
    alignItems: 'flex-end',
    borderRightWidth: 1,
    userSelect: 'none',
  },
  gutterNum: {
    color: '#64748b',
    fontWeight: '600',
  },
  codeTextInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 0,
    color: '#e2e8f0',
    textAlignVertical: 'top',
  },
});
