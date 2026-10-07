import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { triggerLightHaptic } from '@/services/nativePolish';

interface CodeKeyboardToolbarProps {
  onInsertSymbol: (symbol: string) => void;
  accentColor?: string;
}

const TOOLBAR_SYMBOLS = [
  { label: '{ }', insert: '{\n  \n}' },
  { label: '( )', insert: '()' },
  { label: '[ ]', insert: '[]' },
  { label: '=>', insert: '=> ' },
  { label: ';', insert: ';' },
  { label: '=', insert: ' = ' },
  { label: '===', insert: ' === ' },
  { label: '""', insert: '""' },
  { label: '\'\'', insert: "''" },
  { label: ':', insert: ': ' },
  { label: 'tab', insert: '  ' },
  { label: '//', insert: '// ' },
  { label: '<', insert: '<' },
  { label: '>', insert: '>' },
  { label: '!', insert: '!' },
  { label: '&&', insert: ' && ' },
  { label: '||', insert: ' || ' },
  { label: 'return', insert: 'return ' },
  { label: 'const', insert: 'const ' },
];

export function CodeKeyboardToolbar({
  onInsertSymbol,
  accentColor = '#38bdf8',
}: CodeKeyboardToolbarProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isLight ? '#f1f5f9' : '#0f172a',
          borderColor: isLight ? '#cbd5e1' : '#334155',
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        {TOOLBAR_SYMBOLS.map((sym, index) => (
          <Pressable
            key={index}
            onPress={() => {
              triggerLightHaptic();
              onInsertSymbol(sym.insert);
            }}
            style={({ pressed }) => [
              styles.symbolBtn,
              {
                backgroundColor: isLight ? '#ffffff' : '#1e293b',
                borderColor: isLight ? '#e2e8f0' : '#475569',
                opacity: pressed ? 0.6 : 1,
              },
            ]}
            accessibilityLabel={`Insert ${sym.label}`}
          >
            <Text
              style={[
                styles.symbolText,
                {
                  color: sym.label === 'tab' || sym.label === 'return' || sym.label === 'const'
                    ? accentColor
                    : colors.text,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                },
              ]}
            >
              {sym.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: 'center',
    marginVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
  },
  symbolBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
