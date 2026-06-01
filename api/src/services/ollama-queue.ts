/** Serializa inferencias del chat web para no saturar CPU con varios runners */
let tail: Promise<void> = Promise.resolve()

export async function withDashboardOllamaLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = tail
  let release!: () => void
  tail = new Promise<void>((resolve) => {
    release = resolve
  })
  await prev
  try {
    return await fn()
  } finally {
    release()
  }
}
