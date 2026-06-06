import { z } from "zod";

export const pushSubscriptionPayloadSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type PushSubscriptionPayload = z.infer<
  typeof pushSubscriptionPayloadSchema
>;

export const pushSubscriptionEndpointSchema = z.object({
  endpoint: z.url(),
});

export type PushSubscriptionEndpoint = z.infer<
  typeof pushSubscriptionEndpointSchema
>;
