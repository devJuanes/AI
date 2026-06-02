export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  host: process.env.API_HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  ollamaBaseUrl: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, ''),
  corsOrigins: [
    ...new Set([
      'http://localhost:5173',
      'https://chat.matubyte.com',
      ...(process.env.CORS_ORIGIN ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ]),
  ],
  matudbUrl: (process.env.MATUDB_URL ?? 'https://db.matudb.com').replace(/\/$/, ''),
  matudbProjectId: process.env.MATUDB_PROJECT_ID ?? '',
  matudbServiceKey: process.env.MATUDB_SERVICE_KEY || process.env.MATUDB_API_KEY || '',
  ollamaTimeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS ?? 300_000),
  /** Modelo chat web — Ollama Cloud (requiere ollama signin en el servidor) */
  defaultChatModel: process.env.DEFAULT_CHAT_MODEL ?? 'qwen3.5:4b-cloud',
  /** Zona horaria para fecha en el system prompt del chat */
  appTimezone: process.env.APP_TIMEZONE ?? 'America/Bogota',
}
