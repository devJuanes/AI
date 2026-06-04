import dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'

const apiSrcDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(apiSrcDir, '../..')

/** Carga .env del monorepo (AI/.env). Vite recarga al editar; la API hay que reiniciarla o usar lectura en runtime. */
const candidates = [
  join(repoRoot, '.env'),
  join(cwd(), '.env'),
  join(cwd(), '..', '.env'),
]

for (const path of candidates) {
  if (existsSync(path)) {
    dotenv.config({ path, override: true })
    break
  }
}
