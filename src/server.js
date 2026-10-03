import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, db, seed } from './database/store.js';
import { startWorker, stopWorker } from './services/jobs.js';

await connectDatabase();
await seed();
const cleanup = () => {
  const now = Date.now();
  for (const collection of [db.otpChallenges, db.passwordResetTokens]) {
    for (let index = collection.length - 1; index >= 0; index -= 1) {
      const item = collection[index];
      if (item.usedAt || new Date(item.expiresAt).getTime() < now - 24 * 60 * 60 * 1000) collection.splice(index, 1);
    }
  }
};
cleanup();
const cleanupTimer = setInterval(cleanup, 15 * 60 * 1000);
cleanupTimer.unref();
startWorker();
const server = app.listen(env.port, '0.0.0.0', () => console.log(`Ride platform backend listening on port ${env.port}`));
const shutdown = async () => { clearInterval(cleanupTimer); stopWorker(); server.close(); process.exit(0); };
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);