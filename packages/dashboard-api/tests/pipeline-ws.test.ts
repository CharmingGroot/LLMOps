import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer, type Server } from 'http';
import { WebSocket } from 'ws';
import { PipelineWebSocket } from '../src/ws/pipeline-ws.js';
import { PipelineEvent } from '@llmops/core';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return { ...original, logInfo: vi.fn(), logError: vi.fn(), logDebug: vi.fn(), logWarn: vi.fn() };
});

function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    ws.once('message', (data) => resolve(data.toString()));
    ws.once('error', reject);
    setTimeout(() => reject(new Error('Timeout waiting for message')), 3000);
  });
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    ws.once('open', () => resolve());
    ws.once('error', reject);
    setTimeout(() => reject(new Error('Timeout waiting for open')), 3000);
  });
}

describe('PipelineWebSocket', () => {
  let server: Server;
  let pipelineWs: PipelineWebSocket;
  let port: number;
  const clients: WebSocket[] = [];

  function createClient(): WebSocket {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    clients.push(ws);
    return ws;
  }

  afterEach(async () => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
        client.close();
      }
    }
    clients.length = 0;
    pipelineWs.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function setup(): Promise<void> {
    server = createServer();
    pipelineWs = new PipelineWebSocket();
    pipelineWs.attach(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });
  }

  it('should send welcome message on connection', async () => {
    await setup();
    const client = createClient();
    const message = await waitForMessage(client);
    const parsed = JSON.parse(message);

    expect(parsed.type).toBe('connected');
    expect(parsed.message).toContain('LLMOps');
  });

  it('should track connected clients', async () => {
    await setup();
    expect(pipelineWs.getClientCount()).toBe(0);

    const client = createClient();
    await waitForOpen(client);
    // Wait for server to register client
    await new Promise((r) => setTimeout(r, 50));

    expect(pipelineWs.getClientCount()).toBe(1);
  });

  it('should broadcast events to all clients', async () => {
    await setup();
    const client1 = createClient();
    const client2 = createClient();

    // Wait for welcome messages
    await waitForMessage(client1);
    await waitForMessage(client2);

    // Broadcast event
    const eventData = {
      runId: 'run-1',
      timestamp: new Date(),
      pipelineId: 'pipe-1',
    };

    pipelineWs.broadcast(PipelineEvent.PIPELINE_STARTED, eventData);

    const msg1Promise = waitForMessage(client1);
    const msg2Promise = waitForMessage(client2);

    const [msg1, msg2] = await Promise.all([msg1Promise, msg2Promise]);
    const parsed1 = JSON.parse(msg1);
    const parsed2 = JSON.parse(msg2);

    expect(parsed1.type).toBe('pipeline-event');
    expect(parsed1.event).toBe(PipelineEvent.PIPELINE_STARTED);
    expect(parsed1.data.runId).toBe('run-1');
    expect(parsed2.type).toBe('pipeline-event');
  });

  it('should remove clients on disconnect', async () => {
    await setup();
    const client = createClient();
    await waitForOpen(client);
    await new Promise((r) => setTimeout(r, 50));

    expect(pipelineWs.getClientCount()).toBe(1);

    client.close();
    await new Promise((r) => setTimeout(r, 100));

    expect(pipelineWs.getClientCount()).toBe(0);
  });
});
