import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import type { InterviewerPersona } from '@/types/interview';

interface PersonaHeaderProps {
  persona: InterviewerPersona;
  stageTitle: string;
  activeFollowUpQuestion?: string | null;
}

export function PersonaHeader({
  persona,
  stageTitle,
  activeFollowUpQuestion,
}: PersonaHeaderProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={[styles.avatarBox, { backgroundColor: `${persona.accentColor}18` }]}>
          <Ionicons
            name={persona.avatarIcon as any}
            size={22}
            color={persona.accentColor}
          />
        </View>

        <View style={styles.identityCol}>
          <View style={styles.badgeRow}>
            <Text style={[styles.name, { color: colors.text }]}>{persona.name}</Text>
            <View style={[styles.badge, { backgroundColor: `${persona.accentColor}20` }]}>
              <Text style={[styles.badgeText, { color: persona.accentColor }]}>
                {persona.badge}
              </Text>
            </View>
          </View>
          <Text style={[styles.title, { color: colors.muted }]}>{persona.title}</Text>
        </View>
      </View>

      <View style={styles.stageBar}>
        <Ionicons name="sparkles" size={13} color={persona.accentColor} />
        <Text style={[styles.stageText, { color: colors.text }]} numberOfLines={1}>
          {stageTitle}
        </Text>
      </View>

      {/* Dynamic Persona Follow-up speech bubble */}
      {activeFollowUpQuestion ? (
        <View
          style={[
            styles.followUpBubble,
            {
              backgroundColor: isLight ? '#fffbeb' : '#1e1b4b',
              borderColor: isLight ? '#f59e0b' : '#6366f1',
            },
          ]}
        >
          <View style={styles.bubbleHeader}>
            <Ionicons
              name="chatbubble-ellipses"
              size={15}
              color={isLight ? '#d97706' : '#818cf8'}
            />
            <Text
              style={[
                styles.bubbleTag,
                { color: isLight ? '#b45309' : '#a5b4fc' },
              ]}
            >
              DYNAMIC PROBING FROM {persona.name.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.bubbleContent, { color: colors.text }]}>
            {activeFollowUpQuestion}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCol: {
    flex: 1,
    gap: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 11,
  },
  stageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  stageText: {
    fontSize: 12,
    fontWeight: '700',
  },
  followUpBubble: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    marginTop: 4,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bubbleTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bubbleContent: {
    fontSize: 12,
    lineHeight: 17,
  },
});
