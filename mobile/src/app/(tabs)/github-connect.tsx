import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Notice, BackButton } from '@/components/Screen';
import { Button, Heading } from '@/components/ui';
import { github } from '@/services/github';
import type { GithubDeviceAuthorization } from '@/types/api';
import { useTheme } from '@/context/ThemeContext';

export default function GithubConnectScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [authorization, setAuthorization] = useState<GithubDeviceAuthorization | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'waiting' | 'checking' | 'connected'>('idle');
  const [error, setError] = useState('');

  const authRef = useRef<GithubDeviceAuthorization | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const isPollingRef = useRef(false);
  const lastPollTimeRef = useRef(0);
  const intervalSecondsRef = useRef(5);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => clearTimer, []);

  const navigateBackOrToReturn = () => {
    if (returnTo) {
      router.replace(returnTo as never);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/community' as never);
    }
  };

  async function poll(current: GithubDeviceAuthorization, retryCount = 0) {
    if (statusRef.current === 'connected') return;
    if (isPollingRef.current) return; // Mutex lock: prevent duplicate concurrent requests

    isPollingRef.current = true;
    lastPollTimeRef.current = Date.now();

    try {
      const result = await github.poll(current.id);
      isPollingRef.current = false;

      if (result.status === 'connected') {
        setStatus('connected');
        clearTimer();

        Alert.alert(
          'GitHub Connected ',
          'Your GitHub account was connected successfully.',
          [
            {
              text: 'Continue',
              onPress: navigateBackOrToReturn,
            },
          ],
          { cancelable: false }
        );

        return;
      }

      // Update requested interval from server (especially if GitHub returns slow_down)
      if (result.intervalSeconds) {
        intervalSecondsRef.current = result.intervalSeconds;
      }

      // Still pending: schedule next poll respecting the backoff interval
      setError('');
      setStatus('waiting');
      clearTimer();
      timer.current = setTimeout(
        () => poll(current, 0),
        intervalSecondsRef.current * 1000,
      );
    } catch (cause) {
      isPollingRef.current = false;
      // If error is transient (e.g. app was backgrounded or network socket dropped), retry quietly up to 3 times
      if (retryCount < 3) {
        clearTimer();
        timer.current = setTimeout(
          () => poll(current, retryCount + 1),
          Math.max(intervalSecondsRef.current, 5) * 1000,
        );
      } else {
        setError(cause instanceof Error ? cause.message : 'GitHub authorization check failed. Tap below to recheck.');
        setStatus('idle');
      }
    }
  }

  // Foreground listener: when user returns from GitHub in Safari/browser, poll if enough time elapsed
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && authRef.current && statusRef.current !== 'connected') {
        const elapsed = Date.now() - lastPollTimeRef.current;
        const waitMs = Math.max(0, (intervalSecondsRef.current * 1000) - elapsed);
        clearTimer();
        setStatus('checking');
        timer.current = setTimeout(() => {
          if (authRef.current) void poll(authRef.current, 0);
        }, waitMs);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function start() {
    clearTimer();
    setError('');
    setStatus('starting');
    try {
      const next = await github.begin();
      setAuthorization(next);
      authRef.current = next;
      intervalSecondsRef.current = next.intervalSeconds || 5;
      setStatus('waiting');
      // Start polling loop immediately (do NOT await browser open)
      poll(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start GitHub connection.');
      setStatus('idle');
    }
  }

  const handleManualCheck = () => {
    if (!authorization) return;
    if (isPollingRef.current) return;
    clearTimer();
    setError('');
    setStatus('checking');
    const elapsed = Date.now() - lastPollTimeRef.current;
    const waitMs = Math.max(0, (intervalSecondsRef.current * 1000) - elapsed);
    timer.current = setTimeout(() => {
      void poll(authorization, 0);
    }, waitMs);
  };

  const parts = authorization?.userCode ? authorization.userCode.split('-') : [];

  return (
    <Screen onBack={navigateBackOrToReturn} onSwipeBack={navigateBackOrToReturn}>
      <Heading subtitle="Connect your GitHub account to create repositories, request access, and collaborate.">
        Connect GitHub
      </Heading>

      {error ? <Notice>{error}</Notice> : null}

      {/* Main Connection Box */}
      <View style={[styles.connectCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeroHeader}>
          <View style={[styles.githubLogoBadge, { backgroundColor: isDark ? '#161b22' : '#f0f3f6' }]}>
            <Ionicons name="logo-github" size={32} color={colors.text} />
          </View>
          <Text style={[styles.connectTitle, { color: colors.text }]}>GitHub Device Authorization</Text>
          <Text style={[styles.connectCopy, { color: colors.muted }]}>
            SynergySphere uses GitHub's official OAuth Device Flow. We never handle your password, and access tokens are encrypted with AES-256-GCM.
          </Text>
        </View>

        {/* Device Code Display Box */}
        {authorization ? (
          <View style={[styles.codeDisplayCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            {authorization.userCode.startsWith('SSPH-') || authorization.userCode.startsWith('MOCK-') ? (
              <View
                style={[
                  styles.mockNoticeBox,
                  {
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
                    borderColor: isDark ? '#1d4ed8' : '#93C5FD',
                  },
                ]}
              >
                <Ionicons name="construct-outline" size={18} color="#3B82F6" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.mockNoticeTitle, { color: colors.text }]}>
                    Simulated Development Mode Active
                  </Text>
                  <Text style={[styles.mockNoticeText, { color: colors.muted }]}>
                    GitHub Client ID is not configured in backend. Tap below to connect the simulated account locally (do not enter on github.com).
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.codeInstructionLabel, { color: colors.muted }]}>
                Enter this one-time code at GitHub
              </Text>
            )}

            <View style={styles.codeBoxesRow}>
              {parts.map((part, index) => (
                <View key={index} style={[styles.codeSegmentBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                  <Text selectable style={[styles.codeSegmentText, { color: colors.text }]}>
                    {part}
                  </Text>
                </View>
              ))}
            </View>

            {authorization.userCode.startsWith('SSPH-') || authorization.userCode.startsWith('MOCK-') ? (
              <Pressable
                style={({ pressed }) => [
                  styles.openVerificationBtn,
                  { backgroundColor: colors.primary },
                  pressed && styles.pressed,
                ]}
                onPress={handleManualCheck}
              >
                <Ionicons name="flash-outline" size={16} color={colors.primaryText} />
                <Text style={[styles.openVerificationText, { color: colors.primaryText, fontWeight: '800' }]}>
                  Authorize Simulated Account
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.openVerificationBtn,
                  { backgroundColor: colors.primary },
                  pressed && styles.pressed,
                ]}
                onPress={() => Linking.openURL(authorization.verificationUriComplete || authorization.verificationUri)}
              >
                <Ionicons name="open-outline" size={16} color={colors.primaryText} />
                <Text style={[styles.openVerificationText, { color: colors.primaryText }]}>
                  Open GitHub Verification
                </Text>
              </Pressable>
            )}

            {/* Live Polling Status Indicator */}
            <View style={styles.pollingStatusRow}>
              {status === 'connected' ? (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={[styles.statusMessage, { color: colors.primary, fontWeight: '700' }]}>
                    Connected! Returning to SynergySphere...
                  </Text>
                </>
              ) : status === 'checking' ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.statusMessage, { color: colors.primary }]}>
                    Checking GitHub authorization status...
                  </Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.statusMessage, { color: colors.muted }]}>
                    Waiting for your authorization in GitHub...
                  </Text>
                </>
              )}
            </View>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.btnGroup}>
          {status === 'connected' ? (
            <>
              <Button
                title="Continue to Community"
                onPress={navigateBackOrToReturn}
              />
              <Button
                title="Disconnect & Connect Real GitHub"
                secondary
                onPress={async () => {
                  clearTimer();
                  try {
                    await github.disconnect();
                  } catch {}
                  setAuthorization(null);
                  setStatus('idle');
                  start();
                }}
              />
            </>
          ) : authorization ? (
            <Button
              title={status === 'checking' ? 'Checking...' : "I've Authorized on GitHub"}
              onPress={handleManualCheck}
              disabled={status === 'checking'}
            />
          ) : null}

          {status !== 'connected' ? (
            <>
              <Button
                title={status === 'starting' ? 'Preparing GitHub…' : authorization ? 'Start Over with New Code' : 'Connect GitHub Account'}
                secondary={Boolean(authorization)}
                onPress={start}
                disabled={status === 'starting'}
              />
              <Button
                title="Create a GitHub account"
                secondary
                onPress={() => Linking.openURL('https://github.com/join')}
              />
            </>
          ) : null}
        </View>
      </View>

      {/* Security & Feature Highlights */}
      <View style={[styles.securityCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.secItem}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text style={[styles.secText, { color: colors.muted }]}>
            Protected by end-to-end secret encryption at rest
          </Text>
        </View>
        <View style={styles.secItem}>
          <Ionicons name="git-pull-request-outline" size={18} color={colors.primary} />
          <Text style={[styles.secText, { color: colors.muted }]}>
            Enables full GitHub repository collaboration and live issue sync
          </Text>
        </View>
        <View style={styles.secItem}>
          <Ionicons name="trophy-outline" size={18} color={colors.primary} />
          <Text style={[styles.secText, { color: colors.muted }]}>
            Earn Community XP when collaborating and shipping open source
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  connectCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    gap: 16,
  },
  cardHeroHeader: {
    alignItems: 'center',
    gap: 8,
  },
  githubLogoBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  connectCopy: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
  },
  codeDisplayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  mockNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  mockNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  mockNoticeText: {
    fontSize: 11,
    lineHeight: 15,
  },
  codeInstructionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeBoxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeSegmentBox: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  codeSegmentText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: 'Courier',
  },
  openVerificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  openVerificationText: {
    fontSize: 14,
    fontWeight: '800',
  },
  pollingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  statusMessage: {
    fontSize: 12,
  },
  btnGroup: {
    gap: 8,
  },
  securityCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  secItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.8,
  },
  topNavRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  backNavText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

