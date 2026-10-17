import WebSocket, { WebSocketServer as WsServer } from 'ws';
import type { Server, IncomingMessage } from 'node:http';
import { verifyToken, AUTH_COOKIE_NAME, type AuthPayload } from '../middleware/auth.js';

export type WebSocketClient = WebSocket;
export type WebSocketServer = InstanceType<typeof WsServer>;

export interface ClientConnection {
  ws: WebSocketClient;
  user?: AuthPayload;
  userName?: string;
  channels: Set<string>;
  codeRooms: Set<string>;
}

export interface CodeRoomState {
  roomId: string;
  challengeId?: string;
  language?: string;
  code?: string;
  updatedAt: string;
}

let wss: WebSocketServer | null = null;
const clients = new Set<ClientConnection>();
const codeRoomStates = new Map<string, CodeRoomState>();

function parseCookieToken(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key === AUTH_COOKIE_NAME && val) {
      return decodeURIComponent(val);
    }
  }
  return null;
}

function getRoomParticipants(roomId: string): Array<{ userId: string; userName: string }> {
  const seen = new Map<string, string>();
  let anonIdx = 1;
  for (const c of clients) {
    if (c.codeRooms.has(roomId) && c.ws.readyState === WebSocket.OPEN) {
      const uid = c.user?.userId || `guest-${anonIdx++}`;
      const uname = c.userName || c.user?.email?.split('@')[0] || 'Collaborator';
      seen.set(uid, uname);
    }
  }
  return Array.from(seen.entries()).map(([userId, userName]) => ({ userId, userName }));
}

function broadcastToCodeRoom(roomId: string, message: unknown, excludeClient?: ClientConnection): void {
  const json = JSON.stringify(message);
  for (const client of clients) {
    if (client !== excludeClient && client.codeRooms.has(roomId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(json);
    }
  }
}

export function initRealtime(server: Server): WebSocketServer {
  const ServerCtor = WsServer || (WebSocket as any).WebSocketServer || (WebSocket as any).Server;
  wss = new ServerCtor({ server, path: '/ws' }) as WebSocketServer;

  wss.on('connection', (ws: WebSocketClient, req?: IncomingMessage) => {
    const client: ClientConnection = {
      ws,
      channels: new Set(),
      codeRooms: new Set(),
    };

    // Attempt immediate authentication via ?token= query param or httpOnly cookie
    try {
      const urlObj = req?.url ? new URL(req.url, 'http://localhost') : null;
      const queryToken = urlObj?.searchParams.get('token');
      const cookieToken = parseCookieToken(req?.headers?.cookie);
      const initialToken = queryToken || cookieToken;
      if (initialToken) {
        client.user = verifyToken(initialToken);
      }
    } catch {
      // ignore invalid initial token; client can still authenticate via message
    }

    clients.add(client);

    // Send welcome heartbeat
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'connected',
          authenticated: Boolean(client.user),
          userId: client.user?.userId,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    ws.on('message', (data: Buffer | string) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.type === 'auth') {
          if (payload.userName) client.userName = String(payload.userName);
          if (payload.token) {
            try {
              client.user = verifyToken(payload.token);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'authenticated', userId: client.user.userId }));
              }
            } catch {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
              }
            }
          } else if (client.user) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'authenticated', userId: client.user.userId }));
            }
          }
        } else if (payload.type === 'subscribe' && payload.channelId) {
          client.channels.add(String(payload.channelId));
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'subscribed', channelId: payload.channelId }));
          }
        } else if (payload.type === 'unsubscribe' && payload.channelId) {
          client.channels.delete(String(payload.channelId));
        } else if (payload.type === 'typing' && payload.channelId) {
          broadcastToChannel(
            String(payload.channelId),
            {
              type: 'typing',
              channelId: payload.channelId,
              userId: client.user?.userId || payload.userId,
              userName: payload.userName || client.userName || 'Someone',
            },
            client,
          );
        } else if (payload.type === 'join_code_room' && payload.roomId) {
          const roomId = String(payload.roomId).trim().toUpperCase();
          if (payload.userName) client.userName = String(payload.userName).trim();
          client.codeRooms.add(roomId);

          const existingState = codeRoomStates.get(roomId);
          if (!existingState && (payload.code || payload.challengeId)) {
            codeRoomStates.set(roomId, {
              roomId,
              challengeId: payload.challengeId ? String(payload.challengeId) : undefined,
              language: payload.language ? String(payload.language) : undefined,
              code: typeof payload.code === 'string' ? payload.code : undefined,
              updatedAt: new Date().toISOString(),
            });
          }

          const participants = getRoomParticipants(roomId);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'room_joined',
                roomId,
                participants,
                state: codeRoomStates.get(roomId) || null,
              }),
            );
          }

          broadcastToCodeRoom(
            roomId,
            {
              type: 'room_participants',
              roomId,
              participants,
              joinedUser: client.userName || client.user?.email?.split('@')[0] || 'Peer',
            },
            client,
          );
        } else if (payload.type === 'leave_code_room' && payload.roomId) {
          const roomId = String(payload.roomId).trim().toUpperCase();
          client.codeRooms.delete(roomId);
          const participants = getRoomParticipants(roomId);
          if (participants.length === 0) {
            codeRoomStates.delete(roomId);
          } else {
            broadcastToCodeRoom(roomId, {
              type: 'room_participants',
              roomId,
              participants,
            });
          }
        } else if (payload.type === 'code_sync' && payload.roomId) {
          const roomId = String(payload.roomId).trim().toUpperCase();
          const nextState: CodeRoomState = {
            roomId,
            challengeId: payload.challengeId ? String(payload.challengeId) : codeRoomStates.get(roomId)?.challengeId,
            language: payload.language ? String(payload.language) : codeRoomStates.get(roomId)?.language,
            code: typeof payload.code === 'string' ? payload.code : codeRoomStates.get(roomId)?.code,
            updatedAt: new Date().toISOString(),
          };
          codeRoomStates.set(roomId, nextState);
          broadcastToCodeRoom(
            roomId,
            {
              type: 'code_sync',
              roomId,
              challengeId: nextState.challengeId,
              language: nextState.language,
              code: nextState.code,
              userId: client.user?.userId,
              userName: payload.userName || client.userName || 'Collaborator',
              updatedAt: nextState.updatedAt,
            },
            client,
          );
        } else if (payload.type === 'room_run_result' && payload.roomId) {
          const roomId = String(payload.roomId).trim().toUpperCase();
          broadcastToCodeRoom(
            roomId,
            {
              type: 'room_run_result',
              roomId,
              userName: payload.userName || client.userName || 'Collaborator',
              passed: Boolean(payload.passed),
              summary: String(payload.summary || ''),
              timestamp: new Date().toISOString(),
            },
            client,
          );
        } else if (payload.type === 'room_chat' && payload.roomId && payload.message) {
          const roomId = String(payload.roomId).trim().toUpperCase();
          broadcastToCodeRoom(roomId, {
            type: 'room_chat',
            roomId,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            userId: client.user?.userId || 'peer',
            userName: payload.userName || client.userName || 'Collaborator',
            message: String(payload.message).slice(0, 500),
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        // ignore malformed message
      }
    });

    const cleanupClient = () => {
      const rooms = Array.from(client.codeRooms);
      clients.delete(client);
      for (const roomId of rooms) {
        const participants = getRoomParticipants(roomId);
        if (participants.length === 0) {
          codeRoomStates.delete(roomId);
        } else {
          broadcastToCodeRoom(roomId, {
            type: 'room_participants',
            roomId,
            participants,
          });
        }
      }
    };

    ws.on('close', cleanupClient);
    ws.on('error', cleanupClient);
  });

  const heartbeatInterval = setInterval(() => {
    for (const client of clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          (client.ws as any).ping?.();
        } catch {
          // ignore
        }
      }
    }
  }, 25_000);

  wss.on('close', () => clearInterval(heartbeatInterval));

  return wss;
}

export function broadcastToChannel(channelId: string, message: unknown, excludeClient?: ClientConnection): void {
  const json = JSON.stringify(message);
  for (const client of clients) {
    if (client !== excludeClient && client.channels.has(channelId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(json);
    }
  }
}

export function broadcastNotification(userId: string, notification: unknown): void {
  const json = JSON.stringify({ type: 'notification', notification });
  for (const client of clients) {
    if (client.user?.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(json);
    }
  }
}

