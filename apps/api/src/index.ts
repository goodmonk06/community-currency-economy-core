import Fastify from 'fastify';
import cors from '@fastify/cors';
import communitiesRoutes from './routes/communities';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.API_PORT || '3001');
const HOST = process.env.API_HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes
  fastify.register(communitiesRoutes, { prefix: '/communities' });
}

// Start server
async function start() {
  try {
    await registerPlugins();

    await fastify.listen({ port: PORT, host: HOST });

    console.log(`
    🚀 Community Economy API Server is running!

    📍 Server: http://${HOST}:${PORT}
    🏥 Health: http://${HOST}:${PORT}/health
    📚 API Prefix: /communities

    Environment: ${process.env.NODE_ENV || 'development'}
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    await fastify.close();
    process.exit(0);
  });
});

start();
