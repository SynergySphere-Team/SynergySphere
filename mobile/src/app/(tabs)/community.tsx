import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { CommunityChat } from '@/components/community/CommunityChat';
import { CommunityInitiatives } from '@/components/community/CommunityInitiatives';
import { useTheme } from '@/context/ThemeContext';

export default function CommunityScreen() {
  const { colors, theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'chat' | 'initiatives'>('chat');

  return (
    <Screen>
      {/* Community Header with Logo */}
      <View style={styles.headerRow}>
        <Image
          source={require('../../../assets/images/community-logo.png')}
          style={styles.communityLogo}
          resizeMode="contain"
        />

        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Community</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Chat with peers, ask questions, and collaborate on software initiatives.
          </Text>
        </View>
      </View>

      {/* Top Tab Bar: Community Chat vs Initiatives */}
      <View style={styles.topTabBarRow}>
        <View
          style={[
            styles.topTabBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => setActiveTab('chat')}
            style={[
              styles.topTabButton,
              activeTab === 'chat' && [
                styles.topTabButtonActive,
                { backgroundColor: theme === 'light' ? '#1e6827' : colors.primary },
              ],
            ]}
          >
            <Ionicons
              name={activeTab === 'chat' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={16}
              color={activeTab === 'chat' ? (theme === 'light' ? '#FFFFFF' : '#07180d') : colors.muted}
            />
            <Text
              style={[
                styles.topTabText,
                {
                  color: activeTab === 'chat' ? (theme === 'light' ? '#FFFFFF' : '#07180d') : colors.text,
                  fontWeight: activeTab === 'chat' ? '800' : '600',
                },
              ]}
            >
              Community Chat
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('initiatives')}
            style={[
              styles.topTabButton,
              activeTab === 'initiatives' && [
                styles.topTabButtonActive,
                { backgroundColor: theme === 'light' ? '#1e6827' : colors.primary },
              ],
            ]}
          >
            <Ionicons
              name="layers-outline"
              size={16}
              color={activeTab === 'initiatives' ? (theme === 'light' ? '#FFFFFF' : '#07180d') : colors.muted}
            />
            <Text
              style={[
                styles.topTabText,
                {
                  color: activeTab === 'initiatives' ? (theme === 'light' ? '#FFFFFF' : '#07180d') : colors.text,
                  fontWeight: activeTab === 'initiatives' ? '800' : '600',
                },
              ]}
            >
              Initiatives
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'chat' ? (
        <CommunityChat />
      ) : (
        <CommunityInitiatives />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingRight: 42,
  },
  communityLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  topTabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  topTabBar: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 3,
    gap: 4,
  },
  topTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  topTabButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  topTabText: {
    fontSize: 13,
  },
});