import "server-only";
import { z } from "zod";

/** Schémas zod des routes /api/posts (entrée du compositeur et de l'agent). */

const Target = z.object({
  platform: z.string().min(1).max(40),
  accountId: z.string().min(1).max(100),
  username: z.string().max(200).nullable().optional(),
});

export const PostOptionsSchema = z
  .object({
    instagramType: z.enum(["feed", "reel", "story"]).optional(),
    shareToFeed: z.boolean().optional(),
    coverTimeS: z.number().min(0).max(36_000).nullable().optional(),
    tiktokPrivacy: z.enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"]).optional(),
    facebookType: z.enum(["feed", "reel", "story"]).optional(),
    tiktokAllowComment: z.boolean().optional(),
    tiktokAllowDuet: z.boolean().optional(),
    tiktokAllowStitch: z.boolean().optional(),
    tiktokCommercial: z.object({ own: z.boolean(), branded: z.boolean() }).nullable().optional(),
    tiktokConsent: z.boolean().optional(),
  })
  .catchall(z.unknown());

const When = z.union([z.literal("next-slot"), z.string().datetime({ offset: true }), z.null()]);

export const CreatePostSchema = z.object({
  caption: z.string().max(70_000).default(""),
  assetIds: z.array(z.string().uuid()).max(35).default([]),
  targets: z.array(Target).max(20).default([]),
  scheduledFor: When.default(null),
  firstComment: z.string().max(2200).nullable().optional(),
  options: PostOptionsSchema.optional(),
});

export const PatchPostSchema = z.object({
  caption: z.string().max(70_000).optional(),
  assetIds: z.array(z.string().uuid()).max(35).optional(),
  targets: z.array(Target).max(20).optional(),
  scheduledFor: When.optional(),
  firstComment: z.string().max(2200).nullable().optional(),
  options: PostOptionsSchema.optional(),
});

export const ValidatePostSchema = CreatePostSchema.extend({ postId: z.string().uuid().optional() });
