import { z } from 'zod';

const titleSchema = z.string().trim().min(1).max(200);
const descriptionSchema = z.string().max(5000);
export const taskIdSchema = z.uuid();
export const createTaskSchema = z.strictObject({
  title: titleSchema,
  description: descriptionSchema.optional(),
});
export const updateTaskSchema = z.strictObject({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  completed: z.boolean().optional(),
}).refine((value) => Object.values(value).some((field) => field !== undefined), {
  message: 'At least one task field is required.',
});
export const taskSchema = z.strictObject({
  id: taskIdSchema,
  // Persisted titles must already be normalized; never silently repair storage.
  title: z.string().min(1).max(200).refine((value) => value === value.trim()),
  description: descriptionSchema.optional(),
  completed: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
