/** PM2 — Matu AI API (OpenAI-compatible + dashboard backend) */
module.exports = {
  apps: [
    {
      name: 'matu-ai-api',
      cwd: __dirname,
      script: 'npm',
      args: 'run start --workspace=api',
      interpreter: 'none',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        API_PORT: '3001',
        API_HOST: '0.0.0.0',
      },
    },
  ],
}
