import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool', 'developer']),
  content: z.union([z.string(), z.array(z.record(z.unknown())), z.null()]),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
})

export const chatCompletionSchema = z.object({
  model: z.string().min(1),
  messages: z.array(messageSchema).min(1),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
  n: z.number().int().min(1).max(4).optional().default(1),
  stop: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  seed: z.number().int().optional().nullable(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  user: z.string().optional(),
  response_format: z.object({ type: z.enum(['text', 'json_object']) }).optional().nullable(),
  stream_options: z.object({ include_usage: z.boolean().optional() }).optional(),
  tools: z.array(z.record(z.unknown())).optional(),
  tool_choice: z.union([z.string(), z.record(z.unknown())]).optional(),
})

export const completionSchema = z.object({
  model: z.string().min(1),
  prompt: z.union([z.string(), z.array(z.string()), z.array(z.number())]),
  suffix: z.string().optional(),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().int().min(1).max(4).optional().default(1),
  stream: z.boolean().optional().default(false),
  stop: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  seed: z.number().int().optional().nullable(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  user: z.string().optional(),
  echo: z.boolean().optional(),
  logprobs: z.number().optional(),
  best_of: z.number().optional(),
})

export const embeddingSchema = z.object({
  model: z.string().min(1),
  input: z.union([z.string(), z.array(z.string()), z.array(z.number())]),
  encoding_format: z.enum(['float', 'base64']).optional().default('float'),
  dimensions: z.number().int().positive().optional(),
  user: z.string().optional(),
})

export type ChatCompletionInput = z.infer<typeof chatCompletionSchema>
export type CompletionInput = z.infer<typeof completionSchema>
export type EmbeddingInput = z.infer<typeof embeddingSchema>
