import type { getMatuAdmin } from '../db/matu.js'

type Db = ReturnType<typeof getMatuAdmin>
type FilterValue = string | number | boolean | null

/** MatuDB: .eq() antes de .update() / .delete() */
export async function matuUpdate(
  db: Db,
  table: string,
  filters: Record<string, FilterValue>,
  data: Record<string, unknown>,
) {
  let q = db.from(table)
  for (const [col, val] of Object.entries(filters)) {
    q = q.eq(col, val)
  }
  return q.update(data)
}
