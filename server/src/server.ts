// ============================================================
// server.ts — bootstrap: start the HTTP API and the Telegram bot poller,
// with graceful shutdown.
// ============================================================
import { createApi } from './api.ts'
import { createBot } from './bot.ts'
import { config } from './config.ts'

async function main(): Promise<void> {
  const app = createApi()
  await app.listen({ port: config.port, host: config.host })
  app.log.info(`Pamildori API on ${config.host}:${config.port} (public ${config.publicBaseUrl})`)

  const bot = createBot()
  // start() resolves only when the bot stops, so don't await it here.
  void bot.start({
    onStart: (info) => app.log.info(`Telegram bot @${info.username} polling`),
  })

  const shutdown = async (sig: string): Promise<void> => {
    app.log.info(`${sig} received, shutting down`)
    try {
      await bot.stop()
    } catch {
      /* ignore */
    }
    await app.close()
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('fatal:', err)
  process.exit(1)
})
