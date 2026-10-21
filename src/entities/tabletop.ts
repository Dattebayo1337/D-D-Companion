import { z } from "zod";
const line = z.string().trim().min(1).max(160);
export const handoutSchema = z
  .object({
    id: z.string().uuid(),
    title: line,
    text: z.string().max(20000),
    imageMapId: z.string().uuid().nullable().default(null),
    published: z.boolean(),
  })
  .strict();
const stamp = {
  id: z.string().uuid(),
  author: z.string().max(160),
  at: z.string().datetime(),
};
export const journalSchema = z
  .object({ ...stamp, text: z.string().trim().min(1).max(10000) })
  .strict();
export const ledgerSchema = z
  .object({
    ...stamp,
    item: line,
    delta: z
      .number()
      .int()
      .min(-100000000)
      .max(100000000)
      .refine((n) => n !== 0),
    reason: z.string().trim().min(1).max(1000),
    recipient: z.string().max(160),
  })
  .strict();
export const tabletopSchema = z
  .object({
    handouts: z.array(handoutSchema).max(100).default([]),
    journal: z.array(journalSchema).max(1000).default([]),
    ledger: z.array(ledgerSchema).max(2000).default([]),
  })
  .strict();
export type Tabletop = z.infer<typeof tabletopSchema>;
export type Handout = z.infer<typeof handoutSchema>;
export const tabletopCommandSchema = z
  .object({
    action: z.literal("tabletop"),
    id: z.string().uuid(),
    version: z.number().int().positive(),
    operation: z.discriminatedUnion("type", [
      z.object({ type: z.literal("handout"), data: handoutSchema }).strict(),
      z
        .object({ type: z.literal("journal"), text: journalSchema.shape.text })
        .strict(),
      z
        .object({
          type: z.literal("ledger"),
          item: line,
          delta: ledgerSchema.shape.delta,
          reason: ledgerSchema.shape.reason,
          recipient: ledgerSchema.shape.recipient,
        })
        .strict(),
    ]),
  })
  .strict();
export function treasuryBalances(ledger: Tabletop["ledger"]) {
  const balances = new Map<string, number>();
  for (const row of ledger)
    balances.set(row.item, (balances.get(row.item) ?? 0) + row.delta);
  return [...balances].map(([item, quantity]) => ({ item, quantity }));
}
