import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import type { Project, ProjectJoinRequest } from '@/types/api';

const categories = ['SUSTAINABILITY', 'RECYCLING', 'ECO_TOURISM', 'GREEN_INFRASTRUCTURE', 'OTHER'] as const;
export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [requests, setRequests] = useState<Record<string, ProjectJoinRequest[]>>({});
  const [reviewing, setReviewing] = useState('');
  const [form, setForm] = useState({ title: '', organization: '', location: '', description: '', category: 'SUSTAINABILITY' });

  const load = useCallback(async (query = '') => {
    try {
      setError('');
      setProjects(await api.get<Project[]>(`/projects${query ? `?search=${encodeURIComponent(query)}` : ''}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load projects.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function apply(id: string) {
    try {
      await api.post(`/projects/${id}/apply`, {});
      await load(search);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join the project.');
    }
  }

  async function createProject() {
    if (!form.title.trim() || !form.organization.trim() || !form.description.trim()) return;
    setCreating(true);
    try {
      await api.post('/projects', {
        ...form,
        title: form.title.trim(),
        organization: form.organization.trim(),
        description: form.description.trim(),
        location: form.location.trim() || undefined,
      });
      setForm({ title: '', organization: '', location: '', description: '', category: 'SUSTAINABILITY' });
      setShowCreate(false);
      await load(search);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create this project.');
    } finally {
      setCreating(false);
    }
  }

  async function loadRequests(projectId: string) {
    try {
      const result = await api.get<ProjectJoinRequest[]>(`/projects/${projectId}/applications`);
      setRequests((current) => ({ ...current, [projectId]: result }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load join requests.');
    }
  }

  async function reviewRequest(projectId: string, applicationId: string, status: 'APPROVED' | 'DECLINED') {
    setReviewing(applicationId);
    try {
      await api.patch(`/projects/${projectId}/applications/${applicationId}`, { status });
      await Promise.all([loadRequests(projectId), load(search)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not review this request.');
    } finally {
      setReviewing('');
    }
  }

  const canCreate = user?.role === 'ORGANIZATION' || user?.role === 'ADMIN';
  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const tagColor = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <Heading subtitle="Join projects that create a practical community impact.">Community</Heading>
      {error ? <Notice>{error}</Notice> : null}
      <Card>
        <Field label="Find projects" value={search} onChangeText={setSearch} placeholder="Search projects or organizations" onSubmitEditing={() => load(search)} />
        <Button title="Search" onPress={() => load(search)} secondary />
      </Card>
      {canCreate ? (
        <>
          <Button title={showCreate ? 'Close project form' : 'Create a community project'} secondary onPress={() => setShowCreate((value) => !value)} />
          {showCreate ? (
            <Card>
              <Text style={[styles.title, { color: colors.text }]}>Create a project</Text>
              <Field label="Project title" value={form.title} onChangeText={(title) => setForm({ ...form, title })} />
              <Field label="Organization" value={form.organization} onChangeText={(organization) => setForm({ ...form, organization })} />
              <Field label="Location (optional)" value={form.location} onChangeText={(location) => setForm({ ...form, location })} />
              <Field label="Description" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline />
              <Text style={[styles.categoryLabel, { color: colors.text }]}>Category</Text>
              <View style={styles.categories}>
                {categories.map((category) => (
                  <Button key={category} title={category.replace('_', ' ')} secondary={form.category !== category} onPress={() => setForm({ ...form, category })} />
                ))}
              </View>
              <Button title={creating ? 'Creating project…' : 'Create project'} onPress={createProject} disabled={creating || !form.title.trim() || !form.organization.trim() || !form.description.trim()} />
            </Card>
          ) : null}
        </>
      ) : null}
      {projects.map((item) => (
        <Card key={item.id}>
          <Text style={[styles.tag, { color: tagColor }]}>{item.category} · {item.xpReward} XP</Text>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>{item.organization}{item.location ? ` · ${item.location}` : ''}</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>{item.description}</Text>
          {item.isCreator ? (
            <>
              <Button title={requests[item.id] ? 'Refresh join requests' : 'Review join requests'} secondary onPress={() => loadRequests(item.id)} />
              {requests[item.id]?.map((request) => (
                <View key={request.id} style={[styles.request, { borderTopColor: colors.border }]}>
                  <View style={styles.requestCopy}>
                    <Text style={[styles.requestName, { color: colors.text }]}>{request.firstName} {request.lastName}</Text>
                    <Text style={[styles.hint, { color: colors.muted }]}>{request.email} · {request.status}</Text>
                  </View>
                  {request.status === 'PENDING' ? (
                    <View style={styles.requestActions}>
                      <Button title={reviewing === request.id ? 'Reviewing…' : 'Allow'} onPress={() => reviewRequest(item.id, request.id, 'APPROVED')} disabled={Boolean(reviewing)} />
                      <Button title="Decline" secondary onPress={() => reviewRequest(item.id, request.id, 'DECLINED')} disabled={Boolean(reviewing)} />
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          ) : (
            <>
              <Button title={item.hasApplied ? `Request ${item.applicationStatus === 'PENDING' ? 'pending' : item.applicationStatus?.toLowerCase()}` : 'Request to join'} onPress={() => apply(item.id)} disabled={item.hasApplied} />
              {item.applicationStatus === 'APPROVED' ? (
                <Button title="Open project discussion" secondary onPress={() => router.push({ pathname: '/project-chat', params: { projectId: item.id, title: item.title } } as never)} />
              ) : (
                <Text style={[styles.hint, { color: colors.muted }]}>
                  {item.hasApplied ? 'The project owner will review your request.' : 'Approved members can access the project discussion.'}
                </Text>
              )}
            </>
          )}
          {item.isCreator ? (
            <Button title="Open project discussion" secondary onPress={() => router.push({ pathname: '/project-chat', params: { projectId: item.id, title: item.title } } as never)} />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tag: { fontSize: 12, fontWeight: '800' },
  title: { fontSize: 17, fontWeight: '800' },
  copy: { lineHeight: 20, fontSize: 13 },
  hint: { fontSize: 12 },
  categoryLabel: { fontSize: 13, fontWeight: '700' },
  categories: { gap: 7 },
  request: { borderTopWidth: 1, paddingTop: 10, gap: 8 },
  requestCopy: { gap: 2 },
  requestName: { fontSize: 14, fontWeight: '800' },
  requestActions: { flexDirection: 'row', gap: 8 },
});
