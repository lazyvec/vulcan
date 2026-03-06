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

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;
export type TaskLanePatchInput = z.infer<typeof taskLanePatchSchema>;
