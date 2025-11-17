import { createServer } from 'http';
import { createWebSocketServer } from './server';

const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 8080;
const HOST = process.env.WS_HOST || 'localhost';

export function startWebSocketServer(): void {
  const httpServer = createServer();
  
  createWebSocketServer({
    httpServer,
    cors: {
      origin: process.env.NEXT_PUBLIC_WS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`[WebSocket Server] Listening on http://${HOST}:${PORT}`);
    console.log(`[WebSocket Server] Socket.io path: /socket.io/`);
  });

  httpServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[WebSocket Server] Port ${PORT} is already in use`);
    } else {
      console.error('[WebSocket Server] Error:', error);
    }
    process.exit(1);
  });
}

// Запуск сервера, если файл выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server-runner.ts')) {
  startWebSocketServer();
}

