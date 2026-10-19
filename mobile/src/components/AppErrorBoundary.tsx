import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Keeps an unexpected JavaScript rendering error from looking like an iOS
 * launch failure. Native crashes still appear in iOS Analytics, while React
 * errors leave the app open with a way to retry.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('SynergySphere startup render error:', error, info.componentStack);
  }

  private retry = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Text style={styles.title}>SynergySphere needs to restart</Text>
          <Text style={styles.message}>
            A screen could not load safely. Tap Retry to continue.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry opening SynergySphere"
            onPress={this.retry}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#030608',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 14,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#23454C',
    backgroundColor: '#0B171B',
  },
  title: {
    color: '#F4FBFC',
    fontSize: 22,
    fontWeight: '800',
  },
  message: {
    color: '#B8D4D9',
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00A884',
  },
  buttonText: {
    color: '#031411',
    fontSize: 15,
    fontWeight: '800',
  },
});
