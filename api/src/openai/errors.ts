import type { FastifyReply } from 'fastify'

export type OpenAIErrorType =
  | 'invalid_request_error'
  | 'authentication_error'
  | 'permission_error'
  | 'not_found_error'
  | 'rate_limit_error'
  | 'api_error'
  | 'service_unavailable'

export interface OpenAIErrorBody {
  error: {
    message: string
    type: OpenAIErrorType
    param?: string | null
    code?: string | null
  }
}

export function openAIError(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  type: OpenAIErrorType,
  param?: string | null,
  code?: string | null,
) {
  return reply.code(statusCode).send({
    error: { message, type, param: param ?? null, code: code ?? null },
  } satisfies OpenAIErrorBody)
}

export function validationError(reply: FastifyReply, message: string, param?: string) {
  return openAIError(reply, 400, message, 'invalid_request_error', param ?? null, 'invalid_value')
}

export function serviceUnavailable(reply: FastifyReply, message: string) {
  return openAIError(reply, 503, message, 'service_unavailable', null, 'ollama_unavailable')
}

export function notFound(reply: FastifyReply, message: string) {
  return openAIError(reply, 404, message, 'not_found_error', 'model', 'model_not_found')
}
