/**
 * WebSocket handler for real-time pipeline updates
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { PipelineEvent, EventData } from '@llmops/core';

export interface WSMessage {
  type: string;
  event: PipelineEvent;
  data: EventData;
}

export class PipelineWebSocket {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to LLMOps pipeline stream',
        timestamp: new Date().toISOString(),
      }));
    });
  }

  broadcast(event: PipelineEvent, data: EventData): void {
    const message: WSMessage = { type: 'pipeline-event', event, data };
    const payload = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  close(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
    this.wss?.close();
  }
}
