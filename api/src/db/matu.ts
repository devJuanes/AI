import { createClient, type MatuDBClient } from '@devjuanes/matuclient'
import { config } from '../config.js'

let adminClient: MatuDBClient | null = null

export function getMatuAdmin(): MatuDBClient {
  if (!adminClient) {
    const { matudbUrl, matudbProjectId, matudbServiceKey } = config

    if (!matudbProjectId || !matudbServiceKey) {
      throw new Error('MATUDB_PROJECT_ID y MATUDB_SERVICE_KEY (o MATUDB_API_KEY) son requeridos')
    }

    adminClient = createClient({
      url: matudbUrl,
      projectId: matudbProjectId,
      apiKey: matudbServiceKey,
      useSupabase: false,
    })
  }
  return adminClient
}

/** Alias usado en rutas y servicios */
export const getDb = getMatuAdmin
