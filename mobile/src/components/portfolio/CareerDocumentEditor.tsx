import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import {
  DOC_BLOCK_LABELS,
  createBlock,
  type DocBlock,
  type DocBlockType,
} from '@/utils/careerDocument';

interface CareerDocumentEditorProps {
  blocks: DocBlock[];
  editing: boolean;
  onChange: (blocks: DocBlock[]) => void;
}

const BLOCK_TYPES = Object.keys(DOC_BLOCK_LABELS) as DocBlockType[];

/** Paper-style document that is rendered cleanly and can be edited line by line. */
export function CareerDocumentEditor({ blocks, editing, onChange }: CareerDocumentEditorProps) {
  const { colors } = useTheme();
  const [typePickerFor, setTypePickerFor] = useState<string | null>(null);

  function updateBlock(id: string, patch: Partial<DocBlock>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function insertAfter(index: number, type: DocBlockType) {
    const next = [...blocks];
    next.splice(index + 1, 0, createBlock(type));
    onChange(next);
  }

  function textStyleFor(type: DocBlockType) {
    switch (type) {
      case 'title':
        return styles.title;
      case 'subtitle':
        return styles.subtitle;
      case 'section':
        return styles.section;
      case 'subsection':
        return styles.subsection;
      case 'strong':
        return styles.strong;
      case 'meta':
        return styles.meta;
      default:
        return styles.body;
    }
  }

  if (blocks.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          This document is empty.{editing ? ' Use the buttons below to add content.' : ''}
        </Text>
        {editing && <AddBar onAdd={(type) => onChange([...blocks, createBlock(type)])} />}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.paper}>
        {blocks.map((block, index) => {
          const textStyle = textStyleFor(block.type);
          const isBullet = block.type === 'bullet';

          if (!editing) {
            if (!block.text.trim()) return null;
            return (
              <View key={block.id} style={isBullet ? styles.bulletRow : undefined}>
                {isBullet && <Text style={[styles.body, styles.bulletDot]}>{'\u2022'}</Text>}
                <Text style={[textStyle, isBullet && { flex: 1 }]}>{block.text}</Text>
              </View>
            );
          }

          return (
            <View key={block.id} style={styles.editRow}>
              <View style={isBullet ? styles.bulletRow : undefined}>
                {isBullet && <Text style={[styles.body, styles.bulletDot]}>{'\u2022'}</Text>}
                <TextInput
                  value={block.text}
                  onChangeText={(text) => updateBlock(block.id, { text })}
                  multiline
                  scrollEnabled={false}
                  placeholder="Type here…"
                  placeholderTextColor="#9ca3af"
                  accessibilityLabel={`${DOC_BLOCK_LABELS[block.type]} text`}
                  style={[textStyle, styles.input, isBullet && { flex: 1 }]}
                />
              </View>

              <View style={styles.controlsRow}>
                <Pressable
                  onPress={() => setTypePickerFor(typePickerFor === block.id ? null : block.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Change line style"
                  style={styles.typeBtn}
                >
                  <Text style={styles.typeBtnText}>{DOC_BLOCK_LABELS[block.type]}</Text>
                  <Ionicons name="chevron-down" size={11} color="#374151" />
                </Pressable>
                <IconBtn name="arrow-up" label="Move line up" disabled={index === 0} onPress={() => moveBlock(index, -1)} />
                <IconBtn
                  name="arrow-down"
                  label="Move line down"
                  disabled={index === blocks.length - 1}
                  onPress={() => moveBlock(index, 1)}
                />
                <IconBtn
                  name="add"
                  label="Add a line below"
                  onPress={() => insertAfter(index, isBullet ? 'bullet' : 'text')}
                />
                <IconBtn name="trash-outline" label="Delete line" danger onPress={() => removeBlock(block.id)} />
              </View>

              {typePickerFor === block.id && (
                <View style={styles.typePicker}>
                  {BLOCK_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => {
                        updateBlock(block.id, { type: t });
                        setTypePickerFor(null);
                      }}
                      style={[styles.typeChip, t === block.type && styles.typeChipActive]}
                    >
                      <Text style={[styles.typeChipText, t === block.type && styles.typeChipTextActive]}>
                        {DOC_BLOCK_LABELS[t]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {editing && <AddBar onAdd={(type) => onChange([...blocks, createBlock(type)])} />}
    </View>
  );
}

function IconBtn({
  name,
  label,
  onPress,
  disabled = false,
  danger = false,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.iconBtn, disabled && { opacity: 0.3 }]}
    >
      <Ionicons name={name} size={15} color={danger ? '#dc2626' : '#374151'} />
    </Pressable>
  );
}

function AddBar({ onAdd }: { onAdd: (type: DocBlockType) => void }) {
  const { colors } = useTheme();
  const options: { type: DocBlockType; label: string }[] = [
    { type: 'section', label: 'Section' },
    { type: 'subsection', label: 'Sub-heading' },
    { type: 'text', label: 'Paragraph' },
    { type: 'bullet', label: 'Bullet' },
  ];
  return (
    <View style={styles.addBar}>
      <Text style={[styles.addBarLabel, { color: colors.muted }]}>Add to document:</Text>
      {options.map((o) => (
        <Pressable
          key={o.type}
          onPress={() => onAdd(o.type)}
          accessibilityRole="button"
          accessibilityLabel={`Add ${o.label}`}
          style={[styles.addChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
        >
          <Ionicons name="add" size={13} color={colors.text} />
          <Text style={[styles.addChipText, { color: colors.text }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 28 },
  subtitle: { fontSize: 18, fontWeight: '800', color: '#111827', lineHeight: 24 },
  section: {
    marginTop: 14,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: '#374151',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#111827',
  },
  subsection: { marginTop: 8, fontSize: 13.5, fontWeight: '700', color: '#111827' },
  strong: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 19 },
  meta: { fontSize: 12.5, fontStyle: 'italic', color: '#4b5563', lineHeight: 18 },
  body: { fontSize: 13, color: '#1f2937', lineHeight: 19 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 8, gap: 6 },
  bulletDot: { marginTop: 0 },
  editRow: { marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#f9fafb',
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  typeBtnText: { fontSize: 11, color: '#374151', fontWeight: '600' },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  typePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  typeChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  typeChipActive: { backgroundColor: '#1e6827', borderColor: '#1e6827' },
  typeChipText: { fontSize: 11, color: '#374151', fontWeight: '600' },
  typeChipTextActive: { color: '#ffffff' },
  addBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  addBarLabel: { fontSize: 12, fontWeight: '600' },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  addChipText: { fontSize: 12, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
