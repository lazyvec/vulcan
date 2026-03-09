import { z } from "zod";

export const agentStatusSchema = z.enum([
  "idle",
  "writing",
  "researching",
  "executing",
  "syncing",
  "error",
]);

export const taskLaneSchema = z.enum([
  "backlog",
  "queued",
  "in_progress",
  "review",
  "done",
  "archived",
]);

export const taskPrioritySchema = z.enum(["low", "medium", "high", "critical"]);

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

export const createTaskInputSchema = z.object({
  id: z.string().min(1).optional(),
  projectId: z.string().min(1).nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  assigneeAgentId: z.string().min(1).nullable().optional(),
  lane: taskLaneSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueAt: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().min(1)).optional(),
  parentTaskId: z.string().min(1).nullable().optional(),
});

export const updateTaskInputSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assigneeAgentId: z.string().min(1).nullable().optional(),
  lane: taskLaneSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueAt: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().min(1)).optional(),
  parentTaskId: z.string().min(1).nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
});

export const createTaskCommentInputSchema = z.object({
  author: z.string().min(1).optional(),
  content: z.string().min(1),
});

export const createTaskDependencyInputSchema = z.object({
  dependsOnTaskId: z.string().min(1),
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

// ── Skills Marketplace ──────────────────────────────────────────────────────

export const skillCategorySchema = z.enum([
  "coding",
  "research",
  "writing",
  "data",
  "communication",
  "automation",
  "other",
]);

export const upsertSkillInputSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1).optional(),
  description: z.string().optional(),
  category: skillCategorySchema.optional(),
  iconKey: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
  isBuiltin: z.boolean().optional(),
});

export const installSkillInputSchema = z.object({
  skillName: z.string().min(1),
});

export type UpsertSkillInput = z.infer<typeof upsertSkillInputSchema>;
export type InstallSkillInput = z.infer<typeof installSkillInputSchema>;

// ── Notification (Phase 7) ──────────────────────────────────────────────────

export const notificationCategorySchema = z.enum([
  "agent",
  "task",
  "command",
  "skill",
  "system",
  "gateway",
  "legacy",
]);

export const updateNotificationPreferencesSchema = z.object({
  chatId: z.string().min(1).optional(),
  enabledCategories: z.array(notificationCategorySchema).optional(),
  enabledTypes: z.array(z.string().min(1)).optional(),
  silentHours: z
    .object({
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(0).max(23),
    })
    .nullable()
    .optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;

// ── Approval / Governance (Phase 8) ──────────────────────────────────────────

export const createApprovalPolicyInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  matchAgentId: z.string().min(1).nullable().optional(),
  matchMode: z.enum(["delegate", "direct"]).nullable().optional(),
  matchCommandPattern: z.string().min(1).nullable().optional(),
  autoApproveMinutes: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateApprovalPolicyInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  matchAgentId: z.string().min(1).nullable().optional(),
  matchMode: z.enum(["delegate", "direct"]).nullable().optional(),
  matchCommandPattern: z.string().min(1).nullable().optional(),
  autoApproveMinutes: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const resolveApprovalInputSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export type CreateApprovalPolicyInput = z.infer<typeof createApprovalPolicyInputSchema>;
export type UpdateApprovalPolicyInput = z.infer<typeof updateApprovalPolicyInputSchema>;
export type ResolveApprovalInput = z.infer<typeof resolveApprovalInputSchema>;

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;
export type TaskLanePatchInput = z.infer<typeof taskLanePatchSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
export type CreateTaskCommentInput = z.infer<typeof createTaskCommentInputSchema>;
export type CreateTaskDependencyInput = z.infer<typeof createTaskDependencyInputSchema>;
export type CreateAgentInput = z.infer<typeof createAgentInputSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentInputSchema>;
export type DelegateCommandInput = z.infer<typeof delegateCommandInputSchema>;
export type DirectCommandInput = z.infer<typeof directCommandInputSchema>;
