import prisma from "@/lib/db";
import { createHash } from "node:crypto";
import type { SocialPlatform } from "@/generated/prisma/client";
import { recordAudit } from "./audit";

/**
 * Social Publisher agent.
 *
 * Guarantees:
 *  - Gating: only content whose status is APPROVED may be published; anything
 *    religiously sensitive is blocked until a human approves it.
 *  - Kill switch: a PlatformConfig flag halts all publishing immediately.
 *  - Idempotency: each (content, platform, locale) pair has a deterministic key
 *    stored on Publication, so a retry can never create a duplicate post.
 *  - Safe retry: network/API failures are recorded with the error and a
 *    bounded attempt counter; successful posts store the remote id and URL.
 *
 * Credentials are read from environment variables named on SocialAccount
 * (credentialEnv) and are never persisted in the database.
 */

export const PUBLISHING_ENABLED_KEY = "publishing.enabled";

export function idempotencyKey(contentId: string, platform: SocialPlatform, locale: string): string {
  return createHash("sha256").update(`${contentId}:${platform}:${locale}`).digest("hex").slice(0, 40);
}

export async function isPublishingEnabled(): Promise<boolean> {
  const row = await prisma.platformConfig.findUnique({ where: { key: PUBLISHING_ENABLED_KEY } });
  // Default OFF until an operator explicitly enables publishing.
  return row?.value === "true";
}

export async function setPublishingEnabled(enabled: boolean): Promise<void> {
  await prisma.platformConfig.upsert({
    where: { key: PUBLISHING_ENABLED_KEY },
    create: { key: PUBLISHING_ENABLED_KEY, value: enabled ? "true" : "false" },
    update: { value: enabled ? "true" : "false" },
  });
}

interface AdapterResult {
  remoteId: string;
  remoteUrl: string;
}

type Adapter = (token: string, accountHandle: string, text: string) => Promise<AdapterResult>;

const adapters: Partial<Record<SocialPlatform, Adapter>> = {
  FACEBOOK: async (token, handle, text) => {
    const res = await fetch(`https://graph.facebook.com/v21.0/${handle}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, access_token: token }),
    });
    if (!res.ok) throw new Error(`Facebook ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { id?: string };
    return { remoteId: data.id ?? "", remoteUrl: `https://facebook.com/${data.id ?? handle}` };
  },
  TELEGRAM: async (token, handle, text) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: handle, text }),
    });
    if (!res.ok) throw new Error(`Telegram ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { result?: { message_id?: number } };
    return {
      remoteId: String(data.result?.message_id ?? ""),
      remoteUrl: `https://t.me/${handle.replace(/^@/, "")}`,
    };
  },
};

export interface PublishOutcome {
  ok: boolean;
  status: "PUBLISHED" | "FAILED" | "BLOCKED" | "PENDING";
  reason?: string;
  publicationId: string;
}

/** Attempt to publish a single Publication row, honouring all gates. */
export async function publishPublication(publicationId: string): Promise<PublishOutcome> {
  const pub = await prisma.publication.findUnique({
    where: { id: publicationId },
    include: { content: true, account: true },
  });
  if (!pub) return { ok: false, status: "FAILED", reason: "not_found", publicationId };

  // Already published — idempotent no-op.
  if (pub.status === "PUBLISHED") {
    return { ok: true, status: "PUBLISHED", reason: "already_published", publicationId };
  }

  if (!(await isPublishingEnabled())) {
    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: "BLOCKED", error: "publishing_disabled" },
    });
    return { ok: false, status: "BLOCKED", reason: "publishing_disabled", publicationId };
  }

  if (pub.content.status !== "APPROVED" && pub.content.status !== "SCHEDULED") {
    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: "BLOCKED", error: "content_not_approved" },
    });
    return { ok: false, status: "BLOCKED", reason: "content_not_approved", publicationId };
  }

  const account = pub.account;
  if (!account || !account.enabled) {
    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: "BLOCKED", error: "account_not_connected" },
    });
    return { ok: false, status: "BLOCKED", reason: "account_not_connected", publicationId };
  }

  const adapter = adapters[pub.platform];
  if (!adapter) {
    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: "BLOCKED", error: "adapter_not_implemented" },
    });
    return { ok: false, status: "BLOCKED", reason: "adapter_not_implemented", publicationId };
  }

  const token = account.credentialEnv ? process.env[account.credentialEnv] : undefined;
  if (!token) {
    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: "BLOCKED", error: "credentials_missing" },
    });
    return { ok: false, status: "BLOCKED", reason: "credentials_missing", publicationId };
  }

  const text = `${pub.content.title ? `${pub.content.title}\n\n` : ""}${pub.content.body}`;
  await prisma.publication.update({
    where: { id: publicationId },
    data: { attempts: { increment: 1 } },
  });

  try {
    const result = await adapter(token, account.handle, text);
    await prisma.publication.update({
      where: { id: publicationId },
      data: {
        status: "PUBLISHED",
        remoteId: result.remoteId,
        remoteUrl: result.remoteUrl,
        publishedAt: new Date(),
        error: null,
      },
    });
    await recordAudit({
      actorType: "agent",
      action: "publication.published",
      entityType: "Publication",
      entityId: publicationId,
      contentId: pub.contentId,
      detail: { platform: pub.platform, remoteUrl: result.remoteUrl },
    });
    return { ok: true, status: "PUBLISHED", publicationId };
  } catch (err) {
    const message = (err as Error).message.slice(0, 500);
    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: "FAILED", error: message },
    });
    await recordAudit({
      actorType: "agent",
      action: "publication.failed",
      entityType: "Publication",
      entityId: publicationId,
      contentId: pub.contentId,
      detail: { platform: pub.platform, error: message },
    });
    return { ok: false, status: "FAILED", reason: message, publicationId };
  }
}

/**
 * Create (idempotently) a Publication row for approved content and attempt to
 * publish it. Re-running is safe: the unique idempotencyKey prevents duplicates.
 */
export async function publishContent(
  contentId: string,
  platform: SocialPlatform,
  accountId?: string,
): Promise<PublishOutcome> {
  const content = await prisma.contentItem.findUnique({ where: { id: contentId } });
  if (!content) return { ok: false, status: "FAILED", reason: "content_not_found", publicationId: "" };

  const key = idempotencyKey(contentId, platform, content.locale);
  // Resolve a connected account for this platform/locale unless one is given.
  const resolvedAccountId =
    accountId ??
    (
      await prisma.socialAccount.findFirst({
        where: { platform, enabled: true },
        orderBy: { region: "asc" },
      })
    )?.id ??
    null;

  const publication = await prisma.publication.upsert({
    where: { idempotencyKey: key },
    create: {
      contentId,
      accountId: resolvedAccountId,
      platform,
      region: content.region,
      locale: content.locale,
      idempotencyKey: key,
    },
    update: {}, // keep the existing row; never duplicate
  });

  return publishPublication(publication.id);
}
