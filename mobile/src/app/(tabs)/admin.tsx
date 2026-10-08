import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading, Stat } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type {
  AdminComplaint,
  AdminDatabaseHealth,
  AdminEvent,
  AdminOverview,
  AdminPost,
  AdminUser,
  UserTicket,
} from '@/types/api';

type AdminTab =
  | 'overview'
  | 'users'
  | 'approvals'
  | 'moderation'
  | 'events'
  | 'tickets'
  | 'reports'
  | 'database';

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fixed(value: unknown, digits = 1): string {
  return num(value).toFixed(digits);
}

export default function AdminScreen() {
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (params.tab === 'analytics' || params.tab === 'reports') return 'reports';
    if (params.tab) return params.tab as AdminTab;
    return 'overview';
  });

  useEffect(() => {
    if (params.tab === 'analytics' || params.tab === 'reports') {
      setActiveTab('reports');
    } else if (params.tab) {
      setActiveTab(params.tab as AdminTab);
    }
  }, [params.tab]);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 2: Users
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [roleSelectUserId, setRoleSelectUserId] = useState<string | null>(null);

  // Tab 3: Approvals
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [rejectPromptUserId, setRejectPromptUserId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Tab 4: Moderation
  const [modSubTab, setModSubTab] = useState<'posts' | 'complaints'>('posts');
  const [postsList, setPostsList] = useState<AdminPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [complaintsList, setComplaintsList] = useState<AdminComplaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  // Tab 5: Events
  const [eventsList, setEventsList] = useState<AdminEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventLoc, setEventLoc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventCapacity, setEventCapacity] = useState('50');

  // Tab 6: Tickets
  const [ticketsList, setTicketsList] = useState<UserTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [ticketNotesInput, setTicketNotesInput] = useState<Record<string, string>>({});

  // Tab 7: Reports
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Tab 8: Database
  const [databaseHealth, setDatabaseHealth] = useState<AdminDatabaseHealth | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<string | null>(null);

  const primaryAccent = colors.primary || '#6366F1';

  // 1. Overview Loader
  const loadOverview = useCallback(async () => {
    try {
      const res = await api.get<AdminOverview>('/admin/overview');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load admin overview.');
    } finally {
      setLoaded(true);
    }
  }, []);

  // 2. Users Loader
  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams();
      if (userSearch.trim()) params.set('search', userSearch.trim());
      if (userStatusFilter !== 'all') params.set('status', userStatusFilter);
      const res = await api.get<AdminUser[]>(`/admin/users?${params.toString()}`);
      setUsersList(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.warn('Load users failed:', e);
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch, userStatusFilter]);

  // 3. Pending Approvals Loader
  const loadPending = useCallback(async () => {
    try {
      setLoadingPending(true);
      const res = await api.get<AdminUser[]>('/admin/users/pending');
      setPendingUsers(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.warn('Load pending failed:', e);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  // 4. Moderation Loaders
  const loadPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const res = await api.get<AdminPost[]>('/admin/posts');
      setPostsList(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.warn('Load posts failed:', e);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    try {
      setLoadingComplaints(true);
      const res = await api.get<AdminComplaint[]>('/admin/complaints');
      setComplaintsList(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.warn('Load complaints failed:', e);
    } finally {
      setLoadingComplaints(false);
    }
  }, []);

  // 5. Events Loader
  const loadEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const res = await api.get<AdminEvent[]>('/admin/events');
      setEventsList(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.warn('Load events failed:', e);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // 6. Tickets Loader
  const loadTickets = useCallback(async () => {
    try {
      setLoadingTickets(true);
      const params = new URLSearchParams();
      if (ticketStatusFilter !== 'all') params.set('status', ticketStatusFilter);
      const res = await api.get<UserTicket[]>(`/admin/tickets?${params.toString()}`);
      setTicketsList(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.warn('Load tickets failed:', e);
    } finally {
      setLoadingTickets(false);
    }
  }, [ticketStatusFilter]);

  // 7. Reports Loader
  const loadReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const [an, logs] = await Promise.allSettled([
        api.get('/admin/analytics'),
        api.get<any[]>('/admin/audit-logs'),
      ]);
      if (an.status === 'fulfilled') setAnalyticsData(an.value);
      if (logs.status === 'fulfilled' && Array.isArray(logs.value)) setAuditLogs(logs.value);
    } catch (e: any) {
      console.warn('Load reports failed:', e);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  // 8. Database Loader
  const loadDatabase = useCallback(async () => {
    try {
      setLoadingDb(true);
      const res = await api.get<AdminDatabaseHealth>('/admin/database/health');
      setDatabaseHealth(res);
    } catch (e: any) {
      console.warn('Load db health failed:', e);
    } finally {
      setLoadingDb(false);
    }
  }, []);

  // Trigger loading when activeTab changes
  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      setLoaded(true);
      return;
    }
    if (activeTab === 'overview') void loadOverview();
    else if (activeTab === 'users') void loadUsers();
    else if (activeTab === 'approvals') void loadPending();
    else if (activeTab === 'moderation') {
      void loadPosts();
      void loadComplaints();
    } else if (activeTab === 'events') void loadEvents();
    else if (activeTab === 'tickets') void loadTickets();
    else if (activeTab === 'reports') void loadReports();
    else if (activeTab === 'database') void loadDatabase();
  }, [
    user?.role,
    activeTab,
    loadOverview,
    loadUsers,
    loadPending,
    loadPosts,
    loadComplaints,
    loadEvents,
    loadTickets,
    loadReports,
    loadDatabase,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'overview') await loadOverview();
    else if (activeTab === 'users') await loadUsers();
    else if (activeTab === 'approvals') await loadPending();
    else if (activeTab === 'moderation') {
      await Promise.allSettled([loadPosts(), loadComplaints()]);
    } else if (activeTab === 'events') await loadEvents();
    else if (activeTab === 'tickets') await loadTickets();
    else if (activeTab === 'reports') await loadReports();
    else if (activeTab === 'database') await loadDatabase();
    setRefreshing(false);
  }, [
    activeTab,
    loadOverview,
    loadUsers,
    loadPending,
    loadPosts,
    loadComplaints,
    loadEvents,
    loadTickets,
    loadReports,
    loadDatabase,
  ]);

  // Actions: User Management
  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setFeedbackNotice({ type: 'success', text: `User role updated to ${newRole}.` });
      setRoleSelectUserId(null);
      await loadUsers();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Failed to update user role.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string, reason?: string) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus, rejectionReason: reason });
      setFeedbackNotice({ type: 'success', text: `Account status updated to ${newStatus}.` });
      setRejectPromptUserId(null);
      setRejectionReasonInput('');
      await loadUsers();
      await loadPending();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Failed to update status.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Actions: Moderation
  const handleToggleHidePost = async (postId: string, currentHidden: boolean) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/posts/${postId}`, { isHidden: !currentHidden });
      setFeedbackNotice({ type: 'success', text: !currentHidden ? 'Post is now hidden.' : 'Post unhidden.' });
      await loadPosts();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Failed to update post.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLockComments = async (postId: string, currentLocked: boolean) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/posts/${postId}`, { commentsLocked: !currentLocked });
      setFeedbackNotice({ type: 'success', text: !currentLocked ? 'Comments locked.' : 'Comments unlocked.' });
      await loadPosts();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Failed to toggle comments.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      setActionLoading(true);
      await api.delete(`/admin/posts/${postId}`);
      setFeedbackNotice({ type: 'success', text: 'Post deleted successfully.' });
      await loadPosts();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Failed to delete post.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateComplaintStatus = async (id: string, status: 'resolved' | 'dismissed') => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/complaints/${id}`, { status });
      setFeedbackNotice({ type: 'success', text: `Complaint marked as ${status}.` });
      await loadComplaints();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Failed to update complaint.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Actions: Events
  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventLoc.trim()) {
      setFeedbackNotice({ type: 'error', text: 'Please fill in Event Title and Location.' });
      return;
    }
    try {
      setActionLoading(true);
      const targetDate = eventDate.trim() || new Date(Date.now() + 86400000 * 2).toISOString();
      await api.post('/admin/events', {
        title: eventTitle.trim(),
        description: eventDesc.trim() || 'Community Campus Event',
        location: eventLoc.trim(),
        eventDate: targetDate,
        capacity: Number(eventCapacity) || 50,
      });
      setFeedbackNotice({ type: 'success', text: 'New event created successfully!' });
      setEventTitle('');
      setEventDesc('');
      setEventLoc('');
      setShowCreateEvent(false);
      await loadEvents();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Failed to create event.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateEvent = async (id: string, update: Partial<AdminEvent>) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/events/${id}`, update);
      setFeedbackNotice({ type: 'success', text: 'Event updated.' });
      await loadEvents();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Failed to update event.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      setActionLoading(true);
      await api.delete(`/admin/events/${id}`);
      setFeedbackNotice({ type: 'success', text: 'Event deleted.' });
      await loadEvents();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Failed to delete event.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Actions: Tickets
  const handleUpdateTicket = async (ticketId: string, patchData: Partial<UserTicket>) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/tickets/${ticketId}`, patchData);
      setFeedbackNotice({ type: 'success', text: 'Ticket updated successfully.' });
      await loadTickets();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Failed to update ticket.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Actions: Database Maintenance
  const handleRunMaintenance = async (action: 'clear_cache' | 'vacuum' | 'purge_soft_deleted') => {
    try {
      setActionLoading(true);
      setMaintenanceResult(null);
      const res = await api.post<{ message?: string; output?: string }>('/admin/database/maintenance', { action });
      const msg = res?.message || `Maintenance (${action}) executed successfully.`;
      setMaintenanceResult(msg);
      setFeedbackNotice({ type: 'success', text: msg });
      await loadDatabase();
    } catch (e: any) {
      setFeedbackNotice({ type: 'error', text: e?.message || 'Maintenance command failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Export CSV document with native share sheet / file download
  const handleExportCsv = async (type: string) => {
    try {
      setActionLoading(true);
      const rows = await api.get<any[]>(`/admin/reports?type=${type}`);
      const dataList = Array.isArray(rows) ? rows : [];

      let csvContent = '';
      if (dataList.length === 0) {
        csvContent = 'No records found\n';
      } else {
        const headers = Object.keys(dataList[0]);
        const headerRow = headers.join(',');
        const bodyRows = dataList.map((row) =>
          headers
            .map((field) => {
              const val = row[field] == null ? '' : String(row[field]);
              return `"${val.replace(/"/g, '""')}"`;
            })
            .join(',')
        );
        csvContent = [headerRow, ...bodyRows].join('\n');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `synergysphere_${type}_report_${timestamp}.csv`;

      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setFeedbackNotice({
          type: 'success',
          text: `CSV document downloaded: ${filename} (${dataList.length} records)`,
        });
        return;
      }

      // Native (iOS & Android)
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Export ${type.toUpperCase()} Report Document`,
          UTI: 'public.comma-separated-values-text',
        });
        setFeedbackNotice({
          type: 'success',
          text: `Export document ready: ${filename} (${dataList.length} records)`,
        });
      } else {
        Alert.alert(
          'Document Saved',
          `Report document saved with ${dataList.length} records to:\n${fileUri}`,
        );
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Could not generate report document.');
      setFeedbackNotice({
        type: 'error',
        text: e?.message || 'Failed to export document.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (!loaded) return <Loading />;
  if (user?.role !== 'ADMIN') {
    return (
      <Screen>
        <Heading>Admin Portal</Heading>
        <Notice>Administrative controls are restricted to authorised Admin accounts.</Notice>
      </Screen>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }[] = [
    { key: 'overview', label: 'Dashboard', icon: 'grid-outline' },
    { key: 'users', label: 'Users', icon: 'people-outline' },
    {
      key: 'approvals',
      label: 'Approvals',
      icon: 'checkmark-circle-outline',
      badge: data?.kpis?.pendingApprovals || 0,
    },
    {
      key: 'moderation',
      label: 'Moderation',
      icon: 'shield-outline',
      badge: data?.kpis?.unreviewedComplaints || 0,
    },
    { key: 'events', label: 'Events', icon: 'calendar-outline' },
    {
      key: 'tickets',
      label: 'Tickets',
      icon: 'receipt-outline',
      badge: data?.kpis?.openTickets || 0,
    },
    { key: 'reports', label: 'Analytics', icon: 'bar-chart-outline' },
    { key: 'database', label: 'Database', icon: 'server-outline' },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <Heading subtitle="Complete administrative control, moderation, triage and telemetry.">
        Admin Portal
      </Heading>

      {/* Module Navigation Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScroll}
        style={{ marginBottom: 12 }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                setActiveTab(t.key);
                setFeedbackNotice(null);
              }}
              style={[
                styles.navTab,
                {
                  backgroundColor: isActive ? primaryAccent : colors.surfaceElevated,
                  borderColor: isActive ? primaryAccent : colors.border,
                },
              ]}
            >
              <Ionicons
                name={t.icon}
                size={16}
                color={isActive ? '#FFFFFF' : colors.text}
              />
              <Text
                style={[
                  styles.navTabText,
                  { color: isActive ? '#FFFFFF' : colors.text },
                ]}
              >
                {t.label}
              </Text>
              {t.badge && t.badge > 0 ? (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? '#FFFFFF' : '#EF4444' }]}>
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: isActive ? primaryAccent : '#FFFFFF' },
                    ]}
                  >
                    {t.badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Global Feedback Notice */}
      {feedbackNotice ? (
        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor: feedbackNotice.type === 'success' ? '#ECFDF3' : '#FEF3F2',
              borderColor: feedbackNotice.type === 'success' ? '#12B76A' : '#F04438',
            },
          ]}
        >
          <Ionicons
            name={feedbackNotice.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={feedbackNotice.type === 'success' ? '#12B76A' : '#F04438'}
          />
          <Text
            style={{
              color: feedbackNotice.type === 'success' ? '#027A48' : '#B42318',
              fontSize: 12,
              fontWeight: '700',
              flex: 1,
            }}
          >
            {feedbackNotice.text}
          </Text>
          <Pressable onPress={() => setFeedbackNotice(null)}>
            <Ionicons name="close" size={16} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}

      {error ? <Notice>{error}</Notice> : null}

      {/* ─────────────────────────────────────────────────────────────────────────────
          1. TAB: OVERVIEW & DASHBOARD
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && data ? (
        <View style={styles.sectionGap}>
          {/* KPI Cards Grid */}
          <View style={styles.grid}>
            <Stat label="Total Active Users" value={num(data.kpis?.totalActiveUsers ?? data.activeUsers)} />
            <Stat label="Total Users" value={num(data.kpis?.totalUsers ?? data.totalUsers)} />
            <Stat label="Pending Approvals" value={num(data.kpis?.pendingApprovals)} />
            <Stat label="Open Tickets" value={num(data.kpis?.openTickets)} />
            <Stat label="Critical Tickets" value={num(data.kpis?.criticalTickets)} />
            <Stat label="Unreviewed Complaints" value={num(data.kpis?.unreviewedComplaints)} />
            <Stat label="Scheduled Events" value={num(data.kpis?.scheduledEventsWeek)} />
            <Stat label="Community Posts" value={num(data.kpis?.totalCommunityPosts)} />
            <Stat label="Suspended Users" value={num(data.kpis?.suspendedUsers)} />
          </View>

          {/* Quick Action Shortcut Buttons */}
          <Card style={styles.cardPad}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Admin Quick Actions</Text>
            <Text style={[styles.copy, { color: colors.muted, marginBottom: 8 }]}>
              Immediate shortcuts to active operational queues.
            </Text>
            <View style={{ gap: 8 }}>
              <Button
                title="Review Pending User Approvals"
                onPress={() => setActiveTab('approvals')}
                style={{ backgroundColor: primaryAccent }}
              />
              <Button
                title="Triage Support Tickets & Issues"
                secondary
                onPress={() => setActiveTab('tickets')}
              />
              <Button
                title="Moderate Posts & Flagged Content"
                secondary
                onPress={() => setActiveTab('moderation')}
              />
              <Button
                title="Create & Manage Campus Events"
                secondary
                onPress={() => setActiveTab('events')}
              />
              <Button
                title="Run Database Health & Maintenance"
                secondary
                onPress={() => setActiveTab('database')}
              />
            </View>
          </Card>

          {/* Recent Administrative Activity Feed */}
          <Card style={styles.cardPad}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Administrative Activity</Text>
            {(data.recentActivity ?? []).length === 0 ? (
              <Text style={[styles.copy, { color: colors.muted }]}>No recent activity recorded.</Text>
            ) : (
              (data.recentActivity ?? []).slice(0, 8).map((log) => (
                <View
                  key={log.id}
                  style={[styles.activityRow, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontWeight: '800', fontSize: 13, color: colors.text }}>
                        {log.adminName || 'Admin'}
                      </Text>
                      <View style={[styles.tagBadge, { backgroundColor: colors.surfaceElevated }]}>
                        <Text style={[styles.tagBadgeText, { color: primaryAccent }]}>
                          {log.action}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.copy, { color: colors.muted }]}>
                      {log.description}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: colors.muted }}>
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))
            )}
          </Card>

          {/* Wellness & Platform Averages */}
          <Card style={styles.cardPad}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Platform Engagement Averages</Text>
            <Text style={[styles.copy, { color: colors.muted }]}>
              Stress {fixed(data.avgStressLevel)} · Mood {fixed(data.avgMood)} · Energy {fixed(data.avgEnergy)} · Interview Score {Math.round(num(data.avgInterviewScore))}%
            </Text>
          </Card>
        </View>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. TAB: USER MANAGEMENT
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'users' ? (
        <View style={styles.sectionGap}>
          <Field
            label="Search Users"
            value={userSearch}
            onChangeText={setUserSearch}
            placeholder="Search by name, email, or student ID..."
          />
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'active', 'suspended', 'pending', 'rejected'].map((st) => (
              <Pressable
                key={st}
                onPress={() => setUserStatusFilter(st)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: userStatusFilter === st ? primaryAccent : colors.surfaceElevated,
                    borderColor: userStatusFilter === st ? primaryAccent : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: userStatusFilter === st ? '#FFFFFF' : colors.text,
                  }}
                >
                  {st.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          {loadingUsers ? (
            <ActivityIndicator size="small" color={primaryAccent} />
          ) : usersList.length === 0 ? (
            <Text style={[styles.copy, { color: colors.muted }]}>No users found matching search criteria.</Text>
          ) : (
            usersList.map((u) => (
              <Card key={u.id} style={styles.cardPad}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>
                    {u.firstName} {u.lastName}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View
                      style={[
                        styles.tagBadge,
                        {
                          backgroundColor:
                            u.status === 'active' ? '#DCFCE7' : u.status === 'suspended' ? '#FEE2E2' : '#FEF3C7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagBadgeText,
                          {
                            color:
                              u.status === 'active' ? '#15803D' : u.status === 'suspended' ? '#B91C1C' : '#B45309',
                          },
                        ]}
                      >
                        {u.status.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.tagBadge, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.tagBadgeText, { color: primaryAccent }]}>{u.role}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.copy, { color: colors.muted, marginTop: 2 }]}>{u.email}</Text>
                {u.studentId ? (
                  <Text style={[styles.copy, { color: colors.muted, fontSize: 11 }]}>Student ID: {u.studentId}</Text>
                ) : null}

                {/* Role Change Modal / Options */}
                {roleSelectUserId === u.id ? (
                  <View style={[styles.inlineActionBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={{ fontWeight: '800', fontSize: 12, color: colors.text }}>Select New Role:</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {['STUDENT', 'MODERATOR', 'ADMIN'].map((r) => (
                        <Pressable
                          key={r}
                          onPress={() => void handleUpdateUserRole(u.id, r)}
                          style={[styles.smallBtn, { backgroundColor: primaryAccent }]}
                        >
                          <Text style={styles.smallBtnText}>{r}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable onPress={() => setRoleSelectUserId(null)}>
                      <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'right' }}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <Button
                    title="Change Role"
                    secondary
                    onPress={() => setRoleSelectUserId(roleSelectUserId === u.id ? null : u.id)}
                    style={{ flex: 1 }}
                  />
                  {u.status === 'active' ? (
                    <Button
                      title="Suspend"
                      danger
                      onPress={() =>
                        Alert.alert('Suspend User', `Are you sure you want to suspend ${u.firstName}?`, [
                          { text: 'Cancel' },
                          { text: 'Suspend', style: 'destructive', onPress: () => void handleUpdateUserStatus(u.id, 'suspended', 'Suspended by admin') },
                        ])
                      }
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <Button
                      title="Activate"
                      onPress={() => void handleUpdateUserStatus(u.id, 'active')}
                      style={{ flex: 1, backgroundColor: '#10B981' }}
                    />
                  )}
                </View>
              </Card>
            ))
          )}
        </View>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. TAB: PENDING APPROVALS
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'approvals' ? (
        <View style={styles.sectionGap}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Pending Student Approvals ({pendingUsers.length})
          </Text>
          <Text style={[styles.copy, { color: colors.muted }]}>
            Verify student identity and activate full platform and community privileges.
          </Text>

          {loadingPending ? (
            <ActivityIndicator size="small" color={primaryAccent} />
          ) : pendingUsers.length === 0 ? (
            <Card style={styles.cardPad}>
              <Text style={[styles.copy, { color: colors.muted, textAlign: 'center' }]}>
                All user registrations are up to date. No pending approvals.
              </Text>
            </Card>
          ) : (
            pendingUsers.map((u) => (
              <Card key={u.id} style={styles.cardPad}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>
                    {u.firstName} {u.lastName}
                  </Text>
                  <View style={[styles.tagBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.tagBadgeText, { color: '#B45309' }]}>PENDING</Text>
                  </View>
                </View>

                <Text style={[styles.copy, { color: colors.muted, marginTop: 2 }]}>{u.email}</Text>
                <Text style={[styles.copy, { color: colors.muted, fontSize: 11 }]}>
                  Student ID: {u.studentId || 'Not provided'} · Registered: {new Date(u.createdAt).toLocaleDateString()}
                </Text>

                {rejectPromptUserId === u.id ? (
                  <View style={[styles.inlineActionBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 8 }]}>
                    <Field
                      label="Rejection Reason"
                      value={rejectionReasonInput}
                      onChangeText={setRejectionReasonInput}
                      placeholder="e.g. Invalid student ID format"
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button
                        title="Confirm Reject"
                        danger
                        onPress={() => void handleUpdateUserStatus(u.id, 'rejected', rejectionReasonInput)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Cancel"
                        secondary
                        onPress={() => setRejectPromptUserId(null)}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Button
                    title="Approve User"
                    onPress={() => void handleUpdateUserStatus(u.id, 'active')}
                    style={{ flex: 1, backgroundColor: '#10B981' }}
                  />
                  <Button
                    title="Reject"
                    danger
                    onPress={() => setRejectPromptUserId(u.id)}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))
          )}
        </View>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. TAB: COMMUNITY & MODERATION
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'moderation' ? (
        <View style={styles.sectionGap}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Community Posts"
              secondary={modSubTab !== 'posts'}
              onPress={() => setModSubTab('posts')}
              style={{ flex: 1 }}
            />
            <Button
              title="Flagged & Complaints"
              secondary={modSubTab !== 'complaints'}
              onPress={() => setModSubTab('complaints')}
              style={{ flex: 1 }}
            />
          </View>

          {modSubTab === 'posts' ? (
            loadingPosts ? (
              <ActivityIndicator size="small" color={primaryAccent} />
            ) : postsList.length === 0 ? (
              <Card style={styles.cardPad}>
                <Text style={[styles.copy, { color: colors.muted, textAlign: 'center' }]}>No community posts found.</Text>
              </Card>
            ) : (
              postsList.map((p) => (
                <Card key={p.id} style={styles.cardPad}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '800', fontSize: 14, color: colors.text, flex: 1 }}>
                      {p.title || 'Community Post'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {p.isHidden ? (
                        <View style={[styles.tagBadge, { backgroundColor: '#FEE2E2' }]}>
                          <Text style={[styles.tagBadgeText, { color: '#B91C1C' }]}>HIDDEN</Text>
                        </View>
                      ) : null}
                      {p.commentsLocked ? (
                        <View style={[styles.tagBadge, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[styles.tagBadgeText, { color: '#B45309' }]}>LOCKED</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <Text style={[styles.copy, { color: colors.muted, fontSize: 11 }]}>
                    By {p.authorName} ({p.authorEmail}) · {new Date(p.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.copy, { color: colors.text, marginVertical: 6 }]} numberOfLines={3}>
                    {p.content}
                  </Text>

                  {/* Moderation Actions */}
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <Button
                      title={p.isHidden ? 'Unhide' : 'Hide Post'}
                      secondary
                      onPress={() => void handleToggleHidePost(p.id, p.isHidden)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={p.commentsLocked ? 'Unlock' : 'Lock Comments'}
                      secondary
                      onPress={() => void handleToggleLockComments(p.id, p.commentsLocked)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Delete"
                      danger
                      onPress={() =>
                        Alert.alert('Delete Post', 'Soft-delete this post from the public community feed?', [
                          { text: 'Cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => void handleDeletePost(p.id) },
                        ])
                      }
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              ))
            )
          ) : loadingComplaints ? (
            <ActivityIndicator size="small" color={primaryAccent} />
          ) : complaintsList.length === 0 ? (
            <Card style={styles.cardPad}>
              <Text style={[styles.copy, { color: colors.muted, textAlign: 'center' }]}>No flagged complaints reported.</Text>
            </Card>
          ) : (
            complaintsList.map((c) => (
              <Card key={c.id} style={styles.cardPad}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 14, color: '#DC2626' }}>
                    Complaint: {c.reason}
                  </Text>
                  <View style={[styles.tagBadge, { backgroundColor: c.status === 'resolved' ? '#DCFCE7' : '#FEF3C7' }]}>
                    <Text style={[styles.tagBadgeText, { color: c.status === 'resolved' ? '#15803D' : '#B45309' }]}>
                      {c.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.copy, { color: colors.muted, fontSize: 11 }]}>
                  Reporter: {c.reporterName} ({c.reporterEmail}) · Target: {c.targetType}
                </Text>
                {c.details ? (
                  <Text style={[styles.copy, { color: colors.text, marginVertical: 4 }]}>
                    {c.details}
                  </Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Button
                    title="Resolve"
                    onPress={() => void handleUpdateComplaintStatus(c.id, 'resolved')}
                    style={{ flex: 1, backgroundColor: '#10B981' }}
                  />
                  <Button
                    title="Dismiss"
                    secondary
                    onPress={() => void handleUpdateComplaintStatus(c.id, 'dismissed')}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))
          )}
        </View>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. TAB: EVENTS MANAGEMENT
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'events' ? (
        <View style={styles.sectionGap}>
          {!showCreateEvent ? (
            <Button
              title="+ Create Campus Event"
              onPress={() => setShowCreateEvent(true)}
              style={{ backgroundColor: primaryAccent }}
            />
          ) : (
            <Card style={styles.cardPad}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>New Campus Event</Text>
                <Pressable onPress={() => setShowCreateEvent(false)}>
                  <Ionicons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>
              <Field label="Event Title" value={eventTitle} onChangeText={setEventTitle} placeholder="e.g. AI Hackathon 2026" />
              <Field label="Location" value={eventLoc} onChangeText={setEventLoc} placeholder="e.g. Main Auditorium / Discord" />
              <Field label="Description" value={eventDesc} onChangeText={setEventDesc} multiline numberOfLines={3} placeholder="Event overview..." />
              <Field label="Capacity" value={eventCapacity} onChangeText={setEventCapacity} keyboardType="number-pad" placeholder="50" />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Button title={actionLoading ? 'Creating...' : 'Submit Event'} disabled={actionLoading} onPress={handleCreateEvent} style={{ flex: 1 }} />
                <Button title="Cancel" secondary onPress={() => setShowCreateEvent(false)} style={{ flex: 1 }} />
              </View>
            </Card>
          )}

          {loadingEvents ? (
            <ActivityIndicator size="small" color={primaryAccent} />
          ) : eventsList.length === 0 ? (
            <Card style={styles.cardPad}>
              <Text style={[styles.copy, { color: colors.muted, textAlign: 'center' }]}>No events found.</Text>
            </Card>
          ) : (
            eventsList.map((ev) => (
              <Card key={ev.id} style={styles.cardPad}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text, flex: 1 }}>{ev.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {ev.isFeatured ? (
                      <View style={[styles.tagBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.tagBadgeText, { color: '#B45309' }]}>FEATURED</Text>
                      </View>
                    ) : null}
                    <View style={[styles.tagBadge, { backgroundColor: ev.status === 'APPROVED' ? '#DCFCE7' : '#FEE2E2' }]}>
                      <Text style={[styles.tagBadgeText, { color: ev.status === 'APPROVED' ? '#15803D' : '#B91C1C' }]}>
                        {ev.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.copy, { color: colors.muted, fontSize: 11 }]}>
                  {ev.location} · Capacity: {ev.capacity} · {new Date(ev.eventDate).toLocaleDateString()}
                </Text>
                {ev.description ? <Text style={[styles.copy, { color: colors.text, marginVertical: 4 }]}>{ev.description}</Text> : null}

                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {ev.status !== 'APPROVED' ? (
                    <Button
                      title="Approve"
                      onPress={() => void handleUpdateEvent(ev.id, { status: 'APPROVED' })}
                      style={{ flex: 1, backgroundColor: '#10B981' }}
                    />
                  ) : null}
                  <Button
                    title={ev.isFeatured ? 'Unfeature' : 'Feature'}
                    secondary
                    onPress={() => void handleUpdateEvent(ev.id, { isFeatured: !ev.isFeatured })}
                    style={{ flex: 1 }}
                  />
                  {ev.status !== 'CANCELLED' ? (
                    <Button
                      title="Cancel"
                      secondary
                      onPress={() => void handleUpdateEvent(ev.id, { status: 'CANCELLED' })}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                  <Button
                    title="Delete"
                    danger
                    onPress={() => void handleDeleteEvent(ev.id)}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))
          )}
        </View>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────────────────
          6. TAB: TICKETS & COMPLAINTS
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'tickets' ? (
        <View style={styles.sectionGap}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((st) => (
              <Pressable
                key={st}
                onPress={() => setTicketStatusFilter(st)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: ticketStatusFilter === st ? primaryAccent : colors.surfaceElevated,
                    borderColor: ticketStatusFilter === st ? primaryAccent : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: ticketStatusFilter === st ? '#FFFFFF' : colors.text }}>
                  {st.replace('_', ' ').toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          {loadingTickets ? (
            <ActivityIndicator size="small" color={primaryAccent} />
          ) : ticketsList.length === 0 ? (
            <Card style={styles.cardPad}>
              <Text style={[styles.copy, { color: colors.muted, textAlign: 'center' }]}>No tickets matching this filter.</Text>
            </Card>
          ) : (
            ticketsList.map((t) => {
              const isExpanded = expandedTicketId === t.id;
              return (
                <Card key={t.id} style={styles.cardPad}>
                  <Pressable onPress={() => setExpandedTicketId(isExpanded ? null : t.id)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: '800', fontSize: 14, color: primaryAccent }}>#{t.ticketNumber}</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <View style={[styles.tagBadge, { backgroundColor: t.priority === 'critical' ? '#FEE2E2' : '#FEF3C7' }]}>
                          <Text style={[styles.tagBadgeText, { color: t.priority === 'critical' ? '#B91C1C' : '#B45309' }]}>
                            {t.priority.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[styles.tagBadge, { backgroundColor: t.status === 'resolved' ? '#DCFCE7' : '#E0E7FF' }]}>
                          <Text style={[styles.tagBadgeText, { color: t.status === 'resolved' ? '#15803D' : '#3730A3' }]}>
                            {t.status.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={{ fontWeight: '700', fontSize: 14, color: colors.text, marginTop: 4 }}>{t.title}</Text>
                    <Text style={[styles.copy, { color: colors.muted, fontSize: 11 }]}>
                      {t.category} · {new Date(t.createdAt).toLocaleDateString()}
                    </Text>
                  </Pressable>

                  {isExpanded ? (
                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
                      <Text style={[styles.copy, { color: colors.text }]}>{t.description}</Text>

                      {/* Quick Status Buttons */}
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 4 }}>Set Status:</Text>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        {(['open', 'in_progress', 'resolved', 'closed'] as const).map((st) => (
                          <Pressable
                            key={st}
                            onPress={() => void handleUpdateTicket(t.id, { status: st })}
                            style={[
                              styles.smallBtn,
                              { backgroundColor: t.status === st ? primaryAccent : colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
                            ]}
                          >
                            <Text style={[styles.smallBtnText, { color: t.status === st ? '#FFFFFF' : colors.text }]}>
                              {st.replace('_', ' ')}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      {/* Quick Priority Buttons */}
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 4 }}>Set Priority:</Text>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        {(['low', 'medium', 'high', 'critical'] as const).map((pr) => (
                          <Pressable
                            key={pr}
                            onPress={() => void handleUpdateTicket(t.id, { priority: pr })}
                            style={[
                              styles.smallBtn,
                              { backgroundColor: t.priority === pr ? '#EF4444' : colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
                            ]}
                          >
                            <Text style={[styles.smallBtnText, { color: t.priority === pr ? '#FFFFFF' : colors.text }]}>
                              {pr}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      {/* Admin Notes */}
                      <Field
                        label="Internal Admin Notes"
                        value={ticketNotesInput[t.id] ?? (t.adminNotes || '')}
                        onChangeText={(txt) => setTicketNotesInput((prev) => ({ ...prev, [t.id]: txt }))}
                        placeholder="Resolution details or internal findings..."
                      />
                      <Button
                        title="Save Admin Notes"
                        secondary
                        onPress={() => void handleUpdateTicket(t.id, { adminNotes: ticketNotesInput[t.id] ?? t.adminNotes })}
                      />
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}
        </View>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────────────────
          7. TAB: REPORTS & ANALYTICS
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' ? (
        <View style={styles.sectionGap}>
          {/* Telemetry Overview KPIs */}
          <View style={styles.grid}>
            <Stat
              label="Mean Resolution"
              value={`${analyticsData?.avgResolutionHours || 0} hrs`}
            />
            <Stat
              label="New Users (14d)"
              value={(analyticsData?.dailyRegistrations || []).reduce(
                (acc: number, d: any) => acc + (d.newUsers || 0),
                0
              )}
            />
            <Stat
              label="Workshop Seats"
              value={(analyticsData?.eventStats || []).reduce(
                (acc: number, ev: any) => acc + (ev.totalCapacity || 0),
                0
              )}
            />
          </View>

          {/* User Registration Trend */}
          {analyticsData?.dailyRegistrations && analyticsData.dailyRegistrations.length > 0 ? (
            <Card style={styles.cardPad}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trending-up" size={18} color="#10B981" />
                <Text style={[styles.cardTitle, { color: colors.text }]}>User Registration Volume (Trend)</Text>
              </View>
              <Text style={[styles.copy, { color: colors.muted, marginBottom: 8 }]}>
                Daily incoming signups across the past 14 days.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {analyticsData.dailyRegistrations.map((d: any) => (
                  <View
                    key={d.date}
                    style={[
                      styles.trendCard,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '900', color: primaryAccent }}>
                      +{d.newUsers}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>
                      {d.date.slice(5)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </Card>
          ) : null}

          {/* Support Tickets by Category */}
          {analyticsData?.ticketCategoryBreakdown && analyticsData.ticketCategoryBreakdown.length > 0 ? (
            <Card style={styles.cardPad}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="help-buoy-outline" size={18} color={primaryAccent} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Support Requests by Category</Text>
              </View>
              <View style={{ gap: 8, marginTop: 4 }}>
                {analyticsData.ticketCategoryBreakdown.map((c: any) => {
                  const maxCount = Math.max(
                    ...analyticsData.ticketCategoryBreakdown.map((x: any) => x.count || 1),
                    1
                  );
                  const pct = Math.min(100, Math.round(((c.count || 0) / maxCount) * 100));
                  return (
                    <View key={c.category} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{c.category}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: primaryAccent }}>
                          {c.count} tickets
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.surfaceElevated,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            backgroundColor: primaryAccent,
                            borderRadius: 3,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}

          {/* Complaints Target Breakdown */}
          {analyticsData?.complaintTypeBreakdown && analyticsData.complaintTypeBreakdown.length > 0 ? (
            <Card style={styles.cardPad}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Community Complaints by Target</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {analyticsData.complaintTypeBreakdown.map((comp: any) => (
                  <View
                    key={comp.targetType}
                    style={[
                      styles.tableChip,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, textTransform: 'uppercase' }}>
                      {comp.targetType}:
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#F59E0B' }}>
                      {comp.count} filed
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          <Card style={styles.cardPad}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>On-Demand CSV Export</Text>
            <Text style={[styles.copy, { color: colors.muted, marginBottom: 8 }]}>
              Generate compliant audit exports for platform metrics and records.
            </Text>
            <View style={{ gap: 8 }}>
              <Button title="Export Users CSV Report" secondary onPress={() => void handleExportCsv('users')} />
              <Button title="Export Tickets CSV Report" secondary onPress={() => void handleExportCsv('tickets')} />
              <Button title="Export Complaints CSV Report" secondary onPress={() => void handleExportCsv('complaints')} />
              <Button title="Export Events CSV Report" secondary onPress={() => void handleExportCsv('events')} />
            </View>
          </Card>

          {/* System Audit Logs */}
          <Card style={styles.cardPad}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Platform Audit Logs ({auditLogs.length})</Text>
            {loadingReports ? (
              <ActivityIndicator size="small" color={primaryAccent} />
            ) : auditLogs.length === 0 ? (
              <Text style={[styles.copy, { color: colors.muted }]}>No audit logs found.</Text>
            ) : (
              auditLogs.slice(0, 10).map((log) => (
                <View key={log.id} style={[styles.activityRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: '800', fontSize: 13, color: colors.text }}>
                      {log.adminName} · {log.action}
                    </Text>
                    <Text style={[styles.copy, { color: colors.muted }]}>{log.description}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: colors.muted }}>
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </View>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────────────────
          8. TAB: DATABASE & MAINTENANCE
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'database' ? (
        <View style={styles.sectionGap}>
          {databaseHealth ? (
            <Card style={styles.cardPad}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Database Diagnostics</Text>
                <View style={[styles.tagBadge, { backgroundColor: databaseHealth.status === 'healthy' ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Text style={[styles.tagBadgeText, { color: databaseHealth.status === 'healthy' ? '#15803D' : '#B91C1C' }]}>
                    {databaseHealth.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.copy, { color: colors.muted, marginTop: 4 }]}>
                PostgreSQL Engine · Response: {databaseHealth.latencyMs}ms · Active: {databaseHealth.activeConnections} conn
              </Text>

              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, marginTop: 8 }}>Table Telemetry:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {(databaseHealth.tables ?? []).map((t) => (
                  <View key={t.table} style={[styles.tableChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{t.table}:</Text>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: primaryAccent }}>{t.rowCount}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Operational Maintenance Buttons */}
          <Card style={styles.cardPad}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Operational Maintenance Actions</Text>
            <Text style={[styles.copy, { color: colors.muted, marginBottom: 8 }]}>
              Perform low-level system hygiene, memory cache invalidation, and table optimization.
            </Text>

            <View style={{ gap: 8 }}>
              <Button
                title="Refresh Diagnostics & Telemetry"
                secondary
                onPress={() => void loadDatabase()}
              />
              <Button
                title="Clear System Cache"
                onPress={() => void handleRunMaintenance('clear_cache')}
                style={{ backgroundColor: primaryAccent }}
              />
              <Button
                title="Vacuum & Optimize Database Tables"
                secondary
                onPress={() => void handleRunMaintenance('vacuum')}
              />
              <Button
                title="Purge Soft-Deleted Records"
                danger
                onPress={() =>
                  Alert.alert('Purge Deleted Records', 'Permanently remove soft-deleted records from storage?', [
                    { text: 'Cancel' },
                    { text: 'Purge', style: 'destructive', onPress: () => void handleRunMaintenance('purge_soft_deleted') },
                  ])
                }
              />
            </View>

            {maintenanceResult ? (
              <View style={[styles.noticeBox, { backgroundColor: '#ECFDF3', borderColor: '#12B76A', marginTop: 10 }]}>
                <Ionicons name="checkmark-circle" size={18} color="#12B76A" />
                <Text style={{ fontSize: 12, color: '#027A48', fontWeight: '700', flex: 1 }}>{maintenanceResult}</Text>
              </View>
            ) : null}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabScroll: { gap: 6, paddingVertical: 4 },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  navTabText: { fontSize: 13, fontWeight: '700' },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sectionGap: { gap: 12 },
  cardPad: { padding: 14, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  copy: { lineHeight: 20, fontSize: 13 },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagBadgeText: { fontSize: 10, fontWeight: '800' },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inlineActionBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 6,
  },
  tableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  trendCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
  },
});
