import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Heading } from '@/components/ui';
import { api } from '@/services/api';
import type { ProjectJoinRequest } from '@/types/api';
import { useTheme } from '@/context/ThemeContext';

export default function JoinRequestsScreen() {
  const { projectId, title } = useLocalSearchParams<{ projectId: string; title?: string }>();
  const { colors } = useTheme();
  const [requests, setRequests] = useState<ProjectJoinRequest[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setError('');
      setRequests(await api.get<ProjectJoinRequest[]>(`/projects/${projectId}/applications`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load requests.');
    } finally {
      setLoaded(true);
    }
  }, [projectId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  function review(id: string, status: 'APPROVED' | 'DECLINED') {
    const isApprove = status === 'APPROVED';

    Alert.alert(
      isApprove ? 'Approve Request' : 'Decline Request',
      isApprove
        ? 'Are you sure you want to approve this join request?'
        : 'Are you sure you want to decline this join request?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: isApprove ? 'Approve' : 'Decline',
          style: isApprove ? 'default' : 'destructive',
          onPress: async () => {
            setBusy(id);
            setError('');

            try {
              await api.patch(
                `/projects/${projectId}/applications/${id}`,
                { status }
              );

              await load();

              Alert.alert(
                isApprove ? 'Request Approved ✓' : 'Request Declined',
                isApprove
                  ? 'The join request was approved successfully.'
                  : 'The join request was declined successfully.',
                [{ text: 'OK' }]
              );
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Could not update the request.'
              );
            } finally {
              setBusy('');
            }
          },
        },
      ]
    );
  }
  if (!loaded) return <Loading />;

  return (
    <Screen showBackButton refreshing={refreshing} onRefresh={handleRefresh}>
      <Heading subtitle="Approving a request sends an official GitHub collaborator invitation.">
        {title ? `${title} requests` : 'Join requests'}
      </Heading>
      {error ? <Notice>{error}</Notice> : null}
      {requests.length === 0 ? (
        <Card>
          <Text style={[styles.copy, { color: colors.muted }]}>No requests yet.</Text>
        </Card>
      ) : (
        requests.map((request) => (
          <Card key={request.id}>
            <Text style={[styles.name, { color: colors.text }]}>
              {request.firstName} {request.lastName}
            </Text>
            {request.githubUsername ? (
              <Button
                title={`@${request.githubUsername} on GitHub`}
                secondary
                onPress={() => Linking.openURL(`https://github.com/${request.githubUsername}`)}
              />
            ) : null}
            <Text style={[styles.copy, { color: colors.muted }]}>{request.message || request.email}</Text>
            <Text style={[styles.status, { color: colors.primary }]}>
              {request.status === 'INVITATION_SENT'
                ? 'Invitation sent — awaiting GitHub acceptance'
                : request.status}
            </Text>
            {request.status === 'PENDING' ? (
              <View style={styles.actions}>
                <Button
                  title={busy === request.id ? 'Sending…' : 'Approve'}
                  onPress={() => review(request.id, 'APPROVED')}
                  disabled={Boolean(busy)}
                />
                <Button
                  title="Decline"
                  secondary
                  onPress={() => review(request.id, 'DECLINED')}
                  disabled={Boolean(busy)}
                />
              </View>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({ name: { fontSize: 17, fontWeight: '800' }, copy: { fontSize: 14, lineHeight: 20 }, status: { fontSize: 12, fontWeight: '800' }, actions: { flexDirection: 'row', gap: 8 } });
