'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Radio, Send, LogOut } from 'lucide-react';

interface LiveCodeRoomBarProps {
  challengeId: string;
  language?: string | null;
  code: string;
  onRemoteCodeChange: (newCode: string) => void;
}

export function LiveCodeRoomBar({
  challengeId,
  language,
  code,
  onRemoteCodeChange,
}: LiveCodeRoomBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<Array<{ userId: string; name: string }>>([]);
  const [chatText, setChatText] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const suppressBroadcastRef = useRef(false);

  useEffect(() => {
    if (!activeRoom) return;
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host =
      process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')
        ? process.env.NEXT_PUBLIC_API_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '')
        : `${protocol}//${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4000`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws?.send(
          JSON.stringify({
            type: 'join_code_room',
            roomId: activeRoom,
            challengeId,
            language: language || 'JavaScript',
            code,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data || '{}'));
          if (msg.roomId !== activeRoom) return;
          if (msg.type === 'room_state') {
            if (Array.isArray(msg.participants)) setParticipants(msg.participants);
            if (typeof msg.code === 'string' && msg.code.trim().length > 0) {
              suppressBroadcastRef.current = true;
              onRemoteCodeChange(msg.code);
            }
          } else if (msg.type === 'room_participants') {
            if (Array.isArray(msg.participants)) setParticipants(msg.participants);
          } else if (msg.type === 'code_sync') {
            if (typeof msg.code === 'string') {
              suppressBroadcastRef.current = true;
              onRemoteCodeChange(msg.code);
            }
          } else if (msg.type === 'room_chat') {
            setChatMessages((prev) => [
              ...prev.slice(-15),
              { sender: msg.senderName || 'Peer', text: msg.text || '' },
            ]);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setConnected(false);
      };
    } catch {
      setConnected(false);
    }

    return () => {
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'leave_code_room', roomId: activeRoom }));
        }
        ws?.close();
      } catch {}
      wsRef.current = null;
      setConnected(false);
    };
  }, [activeRoom]);

  useEffect(() => {
    if (!activeRoom || !connected) return;
    if (suppressBroadcastRef.current) {
      suppressBroadcastRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'code_sync',
            roomId: activeRoom,
            code,
            language,
            challengeId,
          })
        );
      }
    }, 240);
    return () => clearTimeout(timer);
  }, [code, activeRoom, connected, language, challengeId]);

  function handleJoin(codeToJoin?: string) {
    const clean = (codeToJoin ?? roomInput).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!clean) return;
    setRoomInput(clean);
    setActiveRoom(clean);
  }

  function handleSendChat() {
    if (!chatText.trim() || !activeRoom) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'room_chat', roomId: activeRoom, text: chatText.trim() }));
      setChatText('');
    }
  }

  return (
    <div className="rounded-lg border border-white/[0.08] bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-left text-xs font-semibold text-white"
        >
          {activeRoom ? (
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          ) : (
            <Users className="h-3.5 w-3.5 text-primary" />
          )}
          <span>
            {activeRoom
              ? `Live Pair Room: #${activeRoom} (${participants.length || 1} online)`
              : 'Live Pair-Programming Room'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          {expanded ? 'Hide' : activeRoom ? 'Open Room' : 'Collaborate'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2.5 border-t border-white/[0.07] pt-3">
          {!activeRoom ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Room code (e.g. PAIR-42)"
                className="h-8 flex-1 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs text-white outline-none focus:border-primary/50"
              />
              <Button size="sm" className="h-8 text-xs" onClick={() => handleJoin()}>
                Join Room
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  const randomCode = `PAIR-${Math.floor(100 + Math.random() * 900)}`;
                  handleJoin(randomCode);
                }}
              >
                Create Code
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {participants.map((p) => (
                    <span
                      key={p.userId}
                      className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300"
                    >
                      ● {p.name}
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setActiveRoom(null);
                    setParticipants([]);
                    setChatMessages([]);
                  }}
                  className="h-7 gap-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="h-3 w-3" /> Leave
                </Button>
              </div>

              {chatMessages.length > 0 && (
                <div className="max-h-24 overflow-y-auto rounded border border-white/5 bg-black/30 p-2 space-y-1">
                  {chatMessages.slice(-4).map((m, idx) => (
                    <div key={idx} className="text-[11px] text-gray-300">
                      <span className="font-bold text-primary">{m.sender}: </span>
                      {m.text}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChat();
                  }}
                  placeholder="Message pair partner..."
                  className="h-8 flex-1 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs text-white outline-none"
                />
                <Button size="sm" variant="secondary" className="h-8 px-2.5" onClick={handleSendChat}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
