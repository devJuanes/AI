import '../load-env.js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getMatuAdmin } from '../db/matu.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaPath = join(__dirname, '../../sql/schema.sql')

async function main() {
  const raw = readFileSync(schemaPath, 'utf8')
  const sql = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')

  const db = getMatuAdmin()

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const statement of statements) {
    const { error } = await db.rpc(statement)
    if (error) {
      console.error('Error ejecutando SQL:', error.message)
      console.error('Statement:', statement.slice(0, 120), '...')
      process.exit(1)
    }
    console.log('OK:', statement.split('\n')[0])
  }

  console.log('\nEsquema Matu AI aplicado correctamente en MatuDB.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
