import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
        // ignore
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
        // ignore
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
        // ignore
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
          // ignore
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
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: connected ? accent : colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Ionicons name="people-circle-outline" size={18} color={accent} />
          <Text style={[styles.title, { color: colors.text }]}>
            {connected ? `Live Pair Room · ${roomId}` : 'Live Pair-Programming Room'}
          </Text>
          {connected ? (
            <View style={[styles.liveBadge, { backgroundColor: accent }]}>
              <Text style={styles.liveBadgeText}>{participants.length || 1} online</Text>
            </View>
          ) : null}
        </View>

        {connected ? (
          <Pressable
            onPress={disconnectRoom}
            style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.danger }}>Leave</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              const generated = `PAIR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
              setRoomInput(generated);
              void joinRoom(generated);
            }}
            style={[styles.btn, { backgroundColor: accent }]}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>+ Create Room</Text>
          </Pressable>
        )}
      </View>

      {!connected ? (
        <View style={styles.joinRow}>
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
              styles.btn,
              {
                backgroundColor: roomInput.trim() ? accent : colors.border,
                paddingHorizontal: 14,
              },
            ]}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>Join</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 8, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
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

          <View style={styles.joinRow}>
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
            <Pressable onPress={sendRoomMessage} style={[styles.btn, { backgroundColor: accent }]}>
              <Ionicons name="send" size={13} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
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
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
  },
  btn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
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
});
