import { memo, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import { useAccessibility } from '@/context/AccessibilityContext';

type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string };

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'code_block'; language?: string; code: string }
  | { type: 'bullet'; text: string; indent: number }
  | { type: 'numbered'; number: string; text: string; indent: number }
  | { type: 'quote'; text: string }
  | { type: 'divider' }
  | { type: 'paragraph'; text: string };

function parseInline(raw: string): InlineToken[] {
  if (!raw) return [];
  const tokens: InlineToken[] = [];
  let index = 0;
  const len = raw.length;

  while (index < len) {
    // 1. Inline code: `code`
    if (raw[index] === '`') {
      const end = raw.indexOf('`', index + 1);
      if (end !== -1) {
        tokens.push({ type: 'code', text: raw.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    // 2. Bold: **bold** or __bold__
    if (
      (raw[index] === '*' && raw[index + 1] === '*') ||
      (raw[index] === '_' && raw[index + 1] === '_')
    ) {
      const marker = raw.slice(index, index + 2);
      const end = raw.indexOf(marker, index + 2);
      if (end !== -1) {
        tokens.push({ type: 'bold', text: raw.slice(index + 2, end) });
        index = end + 2;
        continue;
      }
    }

    // 3. Italic: *italic* or _italic_
    if (
      raw[index] === '*' ||
      (raw[index] === '_' && (index === 0 || /\s/.test(raw[index - 1])))
    ) {
      const marker = raw[index];
      const end = raw.indexOf(marker, index + 1);
      if (end !== -1 && end > index + 1 && raw[end - 1] !== ' ') {
        tokens.push({ type: 'italic', text: raw.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    // Accumulate regular text until next formatting symbol
    let nextSpecial = len;
    for (let j = index; j < len; j++) {
      if (
        raw[j] === '`' ||
        (raw[j] === '*' && raw[j + 1] === '*') ||
        (raw[j] === '_' && raw[j + 1] === '_') ||
        raw[j] === '*' ||
        raw[j] === '_'
      ) {
        nextSpecial = j;
        break;
      }
    }

    if (nextSpecial > index) {
      tokens.push({ type: 'text', text: raw.slice(index, nextSpecial) });
      index = nextSpecial;
    } else {
      tokens.push({ type: 'text', text: raw[index] });
      index++;
    }
  }

  return tokens;
}

function parseBlocks(markdown: string): Block[] {
  if (!markdown) return [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];

  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const joined = currentParagraphLines.join('\n').trim();
      if (joined) {
        blocks.push({ type: 'paragraph', text: joined });
      }
      currentParagraphLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block fences: ```
    if (trimmed.startsWith('```')) {
      if (!inCode) {
        flushParagraph();
        inCode = true;
        codeLang = trimmed.slice(3).trim();
        codeLines = [];
      } else {
        inCode = false;
        blocks.push({
          type: 'code_block',
          language: codeLang,
          code: codeLines.join('\n'),
        });
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Divider: --- or ***
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'divider' });
      continue;
    }

    // Heading: #, ##, ###, ####, #####, ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    // Blockquote: > text
    const quoteMatch = trimmed.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      blocks.push({
        type: 'quote',
        text: quoteMatch[1].trim(),
      });
      continue;
    }

    // Bullet item: * item, - item, + item, • item
    const bulletMatch = rawLine.match(/^(\s*)[*\-+•]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      blocks.push({
        type: 'bullet',
        indent: Math.floor(bulletMatch[1].length / 2),
        text: bulletMatch[2].trim(),
      });
      continue;
    }

    // Numbered item: 1. item, 2) item
    const numberedMatch = rawLine.match(/^(\s*)(\d+)[.)]\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      blocks.push({
        type: 'numbered',
        number: numberedMatch[2],
        indent: Math.floor(numberedMatch[1].length / 2),
        text: numberedMatch[3].trim(),
      });
      continue;
    }

    // Regular line in paragraph
    currentParagraphLines.push(trimmed);
  }

  flushParagraph();
  if (inCode && codeLines.length > 0) {
    blocks.push({
      type: 'code_block',
      language: codeLang,
      code: codeLines.join('\n'),
    });
  }

  return blocks;
}

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'Consolas, Monaco, "Courier New", monospace',
});

function InlineTextRenderer({
  text,
  baseColor,
  baseFontSize,
  accentColor,
  isLight,
}: {
  text: string;
  baseColor: string;
  baseFontSize: number;
  accentColor: string;
  isLight: boolean;
}) {
  const tokens = useMemo(() => parseInline(text), [text]);

  return (
    <Text style={{ color: baseColor, fontSize: baseFontSize, lineHeight: baseFontSize * 1.55 }}>
      {tokens.map((token, i) => {
        if (token.type === 'bold') {
          return (
            <Text
              key={i}
              style={{
                fontWeight: '700',
                color: isLight ? '#0f172a' : '#ffffff',
              }}
            >
              {token.text}
            </Text>
          );
        }
        if (token.type === 'italic') {
          return (
            <Text
              key={i}
              style={{
                fontStyle: 'italic',
                color: isLight ? '#334155' : '#cbd5e1',
              }}
            >
              {token.text}
            </Text>
          );
        }
        if (token.type === 'code') {
          return (
            <Text
              key={i}
              style={{
                fontFamily: monoFont,
                fontSize: Math.max(11, baseFontSize - 1.5),
                color: isLight ? '#0284c7' : '#38bdf8',
                backgroundColor: isLight ? '#e0f2fe' : 'rgba(56, 189, 248, 0.12)',
              }}
            >
              {` ${token.text} `}
            </Text>
          );
        }
        return <Text key={i}>{token.text}</Text>;
      })}
    </Text>
  );
}

function CodeBlockRenderer({
  language,
  code,
  isLight,
  borderColor,
}: {
  language?: string;
  code: string;
  isLight: boolean;
  borderColor: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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
  };

  return (
    <View
      style={[
        styles.codeBox,
        {
          backgroundColor: isLight ? '#0d1117' : '#030712',
          borderColor: isLight ? '#e2e8f0' : borderColor,
        },
      ]}
    >
      <View style={styles.codeHeader}>
        <View style={styles.langTag}>
          <Text style={styles.langText}>{(language || 'CODE').toUpperCase()}</Text>
        </View>
        <Pressable onPress={handleCopy} hitSlop={8} style={styles.copyBtn}>
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={13}
            color={copied ? '#4ade80' : '#94a3b8'}
          />
          <Text style={[styles.copyText, { color: copied ? '#4ade80' : '#94a3b8' }]}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeScroll}>
        <Text style={styles.codeFont}>{code}</Text>
      </ScrollView>
    </View>
  );
}

interface MarkdownViewProps {
  content: string;
  style?: StyleProp<ViewStyle>;
  baseFontSize?: number;
}

export const MarkdownView = memo(function MarkdownView({
  content,
  style,
  baseFontSize = 13.5,
}: MarkdownViewProps) {
  const { colors, theme } = useTheme();
  const { fontSize } = useAccessibility();
  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  const blocks = useMemo(() => parseBlocks(content), [content]);
  const scaledSize = fontSize(baseFontSize);

  if (!content) return null;

  return (
    <View style={[styles.container, style]}>
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const isH1 = block.level === 1;
          const isH2 = block.level === 2;
          const headingSize = isH1
            ? fontSize(17)
            : isH2
            ? fontSize(15)
            : fontSize(13.5);

          return (
            <View
              key={idx}
              style={[
                styles.headingWrapper,
                isH1 && styles.h1Wrapper,
                isH2 && styles.h2Wrapper,
              ]}
            >
              <View
                style={[
                  styles.headingIndicator,
                  {
                    backgroundColor: isH1
                      ? primaryAccent
                      : isH2
                      ? (isLight ? '#0284c7' : '#38bdf8')
                      : colors.muted,
                  },
                ]}
              />
              <Text
                style={[
                  styles.headingText,
                  {
                    fontSize: headingSize,
                    color: isLight ? '#0f172a' : '#f8fafc',
                  },
                ]}
              >
                <InlineTextRenderer
                  text={block.text}
                  baseColor={isLight ? '#0f172a' : '#f8fafc'}
                  baseFontSize={headingSize}
                  accentColor={primaryAccent}
                  isLight={isLight}
                />
              </Text>
            </View>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <View key={idx} style={styles.paragraphWrapper}>
              <InlineTextRenderer
                text={block.text}
                baseColor={colors.text}
                baseFontSize={scaledSize}
                accentColor={primaryAccent}
                isLight={isLight}
              />
            </View>
          );
        }

        if (block.type === 'bullet') {
          return (
            <View
              key={idx}
              style={[
                styles.listRow,
                { marginLeft: block.indent * 14 },
              ]}
            >
              <View
                style={[
                  styles.bulletDot,
                  { backgroundColor: isLight ? '#16a34a' : primaryAccent },
                ]}
              />
              <View style={styles.listItemText}>
                <InlineTextRenderer
                  text={block.text}
                  baseColor={colors.text}
                  baseFontSize={scaledSize}
                  accentColor={primaryAccent}
                  isLight={isLight}
                />
              </View>
            </View>
          );
        }

        if (block.type === 'numbered') {
          return (
            <View
              key={idx}
              style={[
                styles.listRow,
                { marginLeft: block.indent * 14 },
              ]}
            >
              <Text
                style={[
                  styles.numberBadge,
                  { color: isLight ? '#0284c7' : primaryAccent, fontSize: scaledSize },
                ]}
              >
                {block.number}.
              </Text>
              <View style={styles.listItemText}>
                <InlineTextRenderer
                  text={block.text}
                  baseColor={colors.text}
                  baseFontSize={scaledSize}
                  accentColor={primaryAccent}
                  isLight={isLight}
                />
              </View>
            </View>
          );
        }

        if (block.type === 'code_block') {
          return (
            <CodeBlockRenderer
              key={idx}
              language={block.language}
              code={block.code}
              isLight={isLight}
              borderColor={colors.border}
            />
          );
        }

        if (block.type === 'quote') {
          return (
            <View
              key={idx}
              style={[
                styles.quoteBox,
                {
                  borderLeftColor: primaryAccent,
                  backgroundColor: isLight ? '#f8fafc' : colors.surfaceElevated,
                },
              ]}
            >
              <InlineTextRenderer
                text={block.text}
                baseColor={colors.muted}
                baseFontSize={scaledSize}
                accentColor={primaryAccent}
                isLight={isLight}
              />
            </View>
          );
        }

        if (block.type === 'divider') {
          return (
            <View
              key={idx}
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
          );
        }

        return null;
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  headingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  h1Wrapper: {
    marginTop: 12,
    marginBottom: 6,
  },
  h2Wrapper: {
    marginTop: 10,
    marginBottom: 4,
  },
  headingIndicator: {
    width: 3.5,
    height: 14,
    borderRadius: 2,
  },
  headingText: {
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.2,
  },
  paragraphWrapper: {
    marginVertical: 3,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginVertical: 2.5,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
  },
  numberBadge: {
    fontWeight: '800',
    minWidth: 16,
  },
  listItemText: {
    flex: 1,
  },
  codeBox: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 6,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  langTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  langText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  codeScroll: {
    padding: 10,
  },
  codeFont: {
    fontFamily: monoFont,
    fontSize: 12,
    lineHeight: 18,
    color: '#e2e8f0',
  },
  quoteBox: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 4,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
});
