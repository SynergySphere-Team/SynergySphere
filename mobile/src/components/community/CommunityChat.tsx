import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export function CommunityChat() {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: colors.text },
        ]}
      >
        Community Chat
      </Text>

      <Text
        style={[
          styles.text,
          { color: colors.muted },
        ]}
      >
        Community is connected. Chat and posts will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },

  title: {
    fontSize: 18,
    fontWeight: '800',
  },

  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
