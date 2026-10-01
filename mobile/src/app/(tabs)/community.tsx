import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { CommunityChat } from '@/components/community/CommunityChat';
import { CommunityInitiatives } from '@/components/community/CommunityInitiatives';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';

export default function CommunityScreen() {
  const { colors, theme } = useTheme();

  const {
    fontSize,
    largerText,
  } = useAccessibility();

  const [activeTab, setActiveTab] =
    useState<'chat' | 'initiatives'>('chat');

  const isLight = theme === 'light';

  const activeBackground =
    isLight ? '#1e6827' : colors.primary;

  const activeTextColor =
    isLight ? '#FFFFFF' : '#07180d';

  return (
    <Screen>
      {/* COMMUNITY HEADER */}

      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <Image
          source={require(
            '../../../assets/images/community-logo.png'
          )}
          style={[
            styles.communityLogo,
            largerText && styles.communityLogoLarge,
          ]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />

        <View style={styles.headerText}>
          <Text
            allowFontScaling
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: fontSize(24),
              },
            ]}
          >
            Community
          </Text>

          <Text
            allowFontScaling
            style={[
              styles.subtitle,
              {
                color: colors.muted,
                fontSize: fontSize(13),
                lineHeight: fontSize(18),
              },
            ]}
          >
            Chat with peers, ask questions, and
            collaborate on software initiatives.
          </Text>
        </View>
      </View>

      {/* COMMUNITY TABS */}

      <View style={styles.topTabBarRow}>
        <View
          accessibilityRole="tablist"
          style={[
            styles.topTabBar,
            largerText && styles.topTabBarLarge,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* COMMUNITY CHAT */}

          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Community Chat"
            accessibilityState={{
              selected: activeTab === 'chat',
            }}
            onPress={() => setActiveTab('chat')}
            style={({ pressed }) => [
              styles.topTabButton,

              largerText &&
                styles.topTabButtonLarge,

              activeTab === 'chat' && [
                styles.topTabButtonActive,
                {
                  backgroundColor:
                    activeBackground,
                },
              ],

              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={
                activeTab === 'chat'
                  ? 'chatbubble-ellipses'
                  : 'chatbubble-ellipses-outline'
              }
              size={largerText ? 19 : 16}
              color={
                activeTab === 'chat'
                  ? activeTextColor
                  : colors.muted
              }
            />

            <Text
              allowFontScaling
              numberOfLines={
                largerText ? 2 : 1
              }
              style={[
                styles.topTabText,
                {
                  color:
                    activeTab === 'chat'
                      ? activeTextColor
                      : colors.text,

                  fontWeight:
                    activeTab === 'chat'
                      ? '800'
                      : '600',

                  fontSize: fontSize(13),
                },
              ]}
            >
              Community Chat
            </Text>
          </Pressable>

          {/* INITIATIVES */}

          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Initiatives"
            accessibilityState={{
              selected:
                activeTab === 'initiatives',
            }}
            onPress={() =>
              setActiveTab('initiatives')
            }
            style={({ pressed }) => [
              styles.topTabButton,

              largerText &&
                styles.topTabButtonLarge,

              activeTab === 'initiatives' && [
                styles.topTabButtonActive,
                {
                  backgroundColor:
                    activeBackground,
                },
              ],

              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="layers-outline"
              size={largerText ? 19 : 16}
              color={
                activeTab === 'initiatives'
                  ? activeTextColor
                  : colors.muted
              }
            />

            <Text
              allowFontScaling
              numberOfLines={
                largerText ? 2 : 1
              }
              style={[
                styles.topTabText,
                {
                  color:
                    activeTab ===
                    'initiatives'
                      ? activeTextColor
                      : colors.text,

                  fontWeight:
                    activeTab ===
                    'initiatives'
                      ? '800'
                      : '600',

                  fontSize: fontSize(13),
                },
              ]}
            >
              Initiatives
            </Text>
          </Pressable>
        </View>
      </View>

      {/* COMMUNITY CONTENT */}

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

  headerRowLarge: {
    alignItems: 'flex-start',
  },

  communityLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  communityLogoLarge: {
    width: 62,
    height: 62,
    borderRadius: 31,
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

  topTabBarLarge: {
    alignItems: 'stretch',
  },

  topTabButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
  },

  topTabButtonLarge: {
    minHeight: 54,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },

  topTabButtonActive: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },

  topTabText: {
    fontSize: 13,
    textAlign: 'center',
    flexShrink: 1,
  },

  pressed: {
    opacity: 0.75,
  },
});