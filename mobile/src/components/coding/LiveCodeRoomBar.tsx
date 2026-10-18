import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { authStorage, getWsUrl } from '@/services/api';

interface Participant {
  userId: string;
  userName: string;
}

interface LiveCodeRoomBarProps {
  challengeId?: string;
  language?: string;
  code: string;
  onRemoteCodeChange: (newCode: string, peerName: string) => void;
}

export function LiveCodeRoomBar({
  challengeId,
  language,
  code,
  onRemoteCodeChange,
}: LiveCodeRoomBarProps) {
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  const isLight = theme === 'light';
  const accent = isLight ? '#1e6827' : colors.primary;

  const [roomId, setRoomId] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [showRules, setShowRules] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [lastSyncInfo, setLastSyncInfo] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [roomFeed, setRoomFeed] = useState<Array<{ id: string; userName: string; message: string }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const applyingRemoteRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCodeRef = useRef(code);
  latestCodeRef.current = code;

  const userName =
    user?.firstName
      ? `${user.firstName}${user.lastName ? ' ' + user.lastName[0] + '.' : ''}`
      : 'Developer';

  const disconnectRoom = () => {
    if (wsRef.current && roomId) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'leave_code_room', roomId }));
        wsRef.current.close();
      } catch {
      }
    }
    wsRef.current = null;
    setConnected(false);
    setRoomId('');
    setParticipants([]);
    setLastSyncInfo('');
    setRoomFeed([]);
  };

  const joinRoom = async (targetRoom: string) => {
    const cleanRoom = targetRoom.trim().toUpperCase();
    if (!cleanRoom) return;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
      }
    }

    const token = await authStorage.getToken();
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      if (token) {
        ws.send(JSON.stringify({ type: 'auth', token, userName }));
      }
      ws.send(
        JSON.stringify({
          type: 'join_code_room',
          roomId: cleanRoom,
          userName,
          challengeId,
          language,
          code: latestCodeRef.current,
        }),
      );
      setRoomId(cleanRoom);
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        if (msg.type === 'room_joined') {
          if (Array.isArray(msg.participants)) setParticipants(msg.participants);
          if (msg.state?.code && msg.state.code !== latestCodeRef.current) {
            applyingRemoteRef.current = true;
            onRemoteCodeChange(msg.state.code, 'Room Snapshot');
            setLastSyncInfo('Loaded shared room code');
            setTimeout(() => {
              applyingRemoteRef.current = false;
            }, 150);
          }
        } else if (msg.type === 'room_participants') {
          if (Array.isArray(msg.participants)) setParticipants(msg.participants);
          if (msg.joinedUser) {
            setLastSyncInfo(`${msg.joinedUser} joined the room`);
          }
        } else if (msg.type === 'code_sync' && typeof msg.code === 'string') {
          if (msg.code !== latestCodeRef.current) {
            applyingRemoteRef.current = true;
            onRemoteCodeChange(msg.code, msg.userName || 'Collaborator');
            setLastSyncInfo(`${msg.userName || 'Peer'} edited code`);
            setTimeout(() => {
              applyingRemoteRef.current = false;
            }, 150);
          }
        } else if (msg.type === 'room_chat' && msg.message) {
          setRoomFeed((prev) => [
            ...prev.slice(-8),
            {
              id: msg.id || String(Date.now()),
              userName: msg.userName || 'Peer',
              message: msg.message,
            },
          ]);
        }
      } catch {
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };
  };

  // Broadcast local code edits to peers (debounced 220ms)
  useEffect(() => {
    if (!connected || !roomId || applyingRemoteRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'code_sync',
            roomId,
            challengeId,
            language,
            code,
            userName,
          }),
        );
      }
    }, 220);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [code, connected, roomId, challengeId, language, userName]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
        }
      }
    };
  }, []);

  const sendRoomMessage = () => {
    const clean = chatMsg.trim();
    if (!clean || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'room_chat',
        roomId,
        userName,
        message: clean,
      }),
    );
    setChatMsg('');
  };

  return (
    <>
      {/* Sleek, Compact Trigger Button (Takes minimal space) */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.compactPillBtn,
          {
            backgroundColor: connected
              ? (isLight ? '#E8F5E9' : 'rgba(16, 185, 129, 0.15)')
              : colors.surfaceElevated,
            borderColor: connected ? '#10B981' : colors.border,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.pillLeft}>
          <Ionicons name="people" size={16} color={connected ? '#10B981' : accent} />
          <Text style={[styles.compactPillText, { color: colors.text }]} numberOfLines={1}>
            {connected
              ? `Live Pair: #${roomId} (${participants.length || 1} online)`
              : 'Live Pair Programming'}
          </Text>
        </View>
        <View style={styles.pillBadge}>
          <Text style={[styles.pillBadgeText, { color: connected ? '#10B981' : accent }]}>
            {connected ? 'Active' : 'Collaborate'}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={connected ? '#10B981' : accent} />
        </View>
      </Pressable>

      {/* Live Pair Programming Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isLight ? '#FFFFFF' : colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleGroup}>
                <Ionicons name="people-circle" size={22} color={accent} />
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                  {connected ? `Live Pair Room · ${roomId}` : 'Live Pair-Programming'}
                </Text>
                {connected && (
                  <View style={[styles.liveBadge, { backgroundColor: accent }]}>
                    <Text style={styles.liveBadgeText}>{participants.length || 1} online</Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Action / Connect Section */}
              {!connected ? (
                <View style={styles.actionSection}>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={roomInput}
                      onChangeText={setRoomInput}
                      placeholder="Enter Room Code (e.g. PAIR-4A9B)"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="characters"
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                    />
                    <Pressable
                      disabled={!roomInput.trim()}
                      onPress={() => void joinRoom(roomInput)}
                      style={[
                        styles.joinBtn,
                        {
                          backgroundColor: roomInput.trim() ? accent : colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.btnTextWhite}>Join</Text>
                    </Pressable>
                  </View>

                  <View style={styles.createRoomRow}>
                    <Pressable
                      onPress={() => {
                        const generated = `PAIR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                        setRoomInput(generated);
                        void joinRoom(generated);
                      }}
                      style={[styles.createBtn, { backgroundColor: accent }]}
                    >
                      <Ionicons name="add-circle-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.createBtnText}>+ Create Room</Text>
                    </Pressable>
                    <Text style={[styles.createSubtext, { color: colors.muted }]}>
                      Instant temporary pair session with real-time sync
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.connectedSection}>
                  <View style={styles.connectedHeader}>
                    <View style={styles.participantsRow}>
                      {participants.map((p) => (
                        <View
                          key={p.userId}
                          style={[styles.peerChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                          <View style={[styles.onlineDot, { backgroundColor: accent }]} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{p.userName}</Text>
                        </View>
                      ))}
                      {lastSyncInfo ? (
                        <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 4 }}>· {lastSyncInfo}</Text>
                      ) : null}
                    </View>

                    <Pressable
                      onPress={disconnectRoom}
                      style={[styles.leaveBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Ionicons name="log-out-outline" size={13} color={colors.danger} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.danger }}>Leave</Text>
                    </Pressable>
                  </View>

                  {roomFeed.length > 0 ? (
                    <View style={[styles.feedBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {roomFeed.slice(-3).map((m) => (
                        <Text key={m.id} style={{ fontSize: 11, color: colors.text }}>
                          <Text style={{ fontWeight: '800', color: accent }}>{m.userName}: </Text>
                          {m.message}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.chatInputRow}>
                    <TextInput
                      value={chatMsg}
                      onChangeText={setChatMsg}
                      placeholder="Quick note to pair partner..."
                      placeholderTextColor={colors.muted}
                      onSubmitEditing={sendRoomMessage}
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text,
                          paddingVertical: 6,
                        },
                      ]}
                    />
                    <Pressable onPress={sendRoomMessage} style={[styles.sendBtn, { backgroundColor: accent }]}>
                      <Ionicons name="send" size={13} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Dedicated Live Pair Programming Rules Card */}
              <View
                style={[
                  styles.rulesContainer,
                  {
                    backgroundColor: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.08)',
                    borderColor: isLight ? '#BBF7D0' : 'rgba(16, 185, 129, 0.25)',
                  },
                ]}
              >
                <View style={styles.rulesTitleRow}>
                  <Ionicons name="shield-checkmark-outline" size={15} color={accent} />
                  <Text style={[styles.rulesTitle, { color: colors.text }]}>Live Pair Programming Rules</Text>
                </View>
                <Text style={[styles.ruleBullet, { color: colors.text }]}>
                  • <Text style={styles.ruleHighlight}>Driver & Navigator Roles:</Text> One person types the code while the other reviews, anticipates edge cases, and guides algorithmic approach.
                </Text>
                <Text style={[styles.ruleBullet, { color: colors.text }]}>
                  • <Text style={styles.ruleHighlight}>Rotate Frequently:</Text> Switch roles every 15–20 minutes to keep both developers actively engaged and code quality high.
                </Text>
                <Text style={[styles.ruleBullet, { color: colors.text }]}>
                  • <Text style={styles.ruleHighlight}>Continuous Communication:</Text> Explain thoughts and variable naming decisions out loud before typing complex blocks.
                </Text>
                <Text style={[styles.ruleBullet, { color: colors.text }]}>
                  • <Text style={styles.ruleHighlight}>Synchronized Assertions:</Text> Code updates and test runs reflect instantly across all room peers in real-time.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  compactPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  compactPillText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScrollBody: {
    gap: 12,
    paddingBottom: 8,
  },
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  liveBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rulesToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  rulesToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionSection: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  joinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextWhite: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createSubtext: {
    fontSize: 11,
    flex: 1,
    minWidth: 160,
  },
  connectedSection: {
    gap: 8,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  participantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    flex: 1,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  feedBox: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  rulesContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 5,
    marginTop: 2,
  },
  rulesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  ruleBullet: {
    fontSize: 11,
    lineHeight: 16,
  },
  ruleHighlight: {
    fontWeight: '700',
  },
});
