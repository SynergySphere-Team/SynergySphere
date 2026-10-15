import WebSocket from 'ws';
import type { Server } from 'node:http';
import { verifyToken, type AuthPayload } from '../middleware/auth.js';

export type WebSocketClient = WebSocket;
export type WebSocketServer = InstanceType<typeof WebSocket.Server>;

export interface ClientConnection {
  ws: WebSocketClient;
  user?: AuthPayload;
  channels: Set<string>;
}

let wss: WebSocketServer | null = null;
const clients = new Set<ClientConnection>();

export function initRealtime(server: Server): WebSocketServer {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocketClient) => {
    const client: ClientConnection = {
      ws,
      channels: new Set(),
    };
    clients.add(client);

    // Send welcome heartbeat
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
    }

    ws.on('message', (data: Buffer | string) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.type === 'auth' && payload.token) {
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
              userName: payload.userName || 'Someone',
            },
            client,
          );
        }
      } catch {
        // ignore malformed message
      }
    });

    ws.on('close', () => {
      clients.delete(client);
    });

    ws.on('error', () => {
      clients.delete(client);
    });
  });

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
