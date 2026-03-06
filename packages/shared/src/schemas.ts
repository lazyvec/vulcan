import { z } from "zod";

export const agentStatusSchema = z.enum([
  "idle",
  "writing",
  "researching",
  "executing",
  "syncing",
  "error",
]);

export const taskLaneSchema = z.enum(["backlog", "in_progress", "review"]);

const nullableIdSchema = z.string().min(1).nullable();
const jsonRecordSchema = z.record(z.string(), z.unknown());

export const ingestEventInputSchema = z.object({
  id: z.string().min(1).optional(),
  ts: z.number().int().nonnegative().optional(),
  source: z.string().min(1).optional(),
  agentId: nullableIdSchema.optional(),
  projectId: nullableIdSchema.optional(),
  taskId: nullableIdSchema.optional(),
  type: z.string().min(1),
  summary: z.string().min(1),
  payloadJson: z.string().optional(),
});

export const eventItemSchema = z.object({
  id: z.string().min(1),
  ts: z.number().int().nonnegative(),
  source: z.string().min(1),
  agentId: nullableIdSchema,
  projectId: nullableIdSchema,
  taskId: nullableIdSchema,
  type: z.string().min(1),
  summary: z.string().min(1),
  payloadJson: z.string(),
});

export const ingestPayloadSchema = z.union([
  z.object({
    events: z.array(ingestEventInputSchema).min(1),
  }),
  ingestEventInputSchema,
]);

export const taskLanePatchSchema = z.object({
  lane: taskLaneSchema,
});

export const createEventSchema = ingestEventInputSchema;

export const createAgentInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  mission: z.string().min(1),
  roleTags: z.array(z.string().min(1)).optional(),
  avatarKey: z.string().min(1).optional(),
  status: agentStatusSchema.optional(),
  skills: z.array(z.string().min(1)).optional(),
  capabilities: z.array(z.string().min(1)).optional(),
  config: jsonRecordSchema.optional(),
  gatewayId: nullableIdSchema.optional(),
  isActive: z.boolean().optional(),
  gatewayWorkspace: z.string().min(1).optional(),
});

export const updateAgentInputSchema = z.object({
  name: z.string().min(1).optional(),
  mission: z.string().min(1).optional(),
  roleTags: z.array(z.string().min(1)).optional(),
  avatarKey: z.string().min(1).optional(),
  status: agentStatusSchema.optional(),
  skills: z.array(z.string().min(1)).optional(),
  capabilities: z.array(z.string().min(1)).optional(),
  config: jsonRecordSchema.optional(),
  gatewayId: nullableIdSchema.optional(),
  isActive: z.boolean().optional(),
  gatewayWorkspace: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
});

export const delegateCommandInputSchema = z.object({
  message: z.string().min(1),
  taskLabel: z.string().min(1).optional(),
  metadata: jsonRecordSchema.optional(),
  idempotencyKey: z.string().min(1).optional(),
});

export const directCommandInputSchema = z.object({
  message: z.string().min(1),
  to: z.string().min(1).optional(),
  metadata: jsonRecordSchema.optional(),
  idempotencyKey: z.string().min(1).optional(),
});

export const realtimeMessageTypeSchema = z.enum([
  "event",
  "command",
  "ack",
  "error",
]);

export const realtimeClientMessageSchema = z.object({
  type: z.literal("command"),
  payload: z.object({
    command: z.literal("ping"),
    requestId: z.string().min(1).optional(),
  }),
});

export const realtimeServerMessageSchema = z.union([
  z.object({
    type: z.literal("event"),
    payload: eventItemSchema,
  }),
  z.object({
    type: z.literal("ack"),
    payload: z.object({
      kind: z.enum(["ready", "heartbeat", "pong"]),
      ts: z.number().int().nonnegative(),
      requestId: z.string().min(1).optional(),
    }),
  }),
  z.object({
    type: z.literal("error"),
    payload: z.object({
      message: z.string().min(1),
      requestId: z.string().min(1).optional(),
    }),
  }),
]);

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;
export type TaskLanePatchInput = z.infer<typeof taskLanePatchSchema>;
export type CreateAgentInput = z.infer<typeof createAgentInputSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentInputSchema>;
export type DelegateCommandInput = z.infer<typeof delegateCommandInputSchema>;
export type DirectCommandInput = z.infer<typeof directCommandInputSchema>;
