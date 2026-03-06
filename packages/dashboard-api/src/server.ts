/**
 * Dashboard API Server Entry Point
 */

import { createServer } from 'http';
import { createApp } from './app.js';
import { PipelineWebSocket } from './ws/pipeline-ws.js';

const PORT = Number(process.env.PORT) || 4000;
const TRACKING_URI = process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000';

const app = createApp({ trackingUri: TRACKING_URI });
const server = createServer(app);

const pipelineWs = new PipelineWebSocket();
pipelineWs.attach(server);

server.listen(PORT, () => {
  console.log(`Dashboard API listening on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`MLflow tracking: ${TRACKING_URI}`);
});
