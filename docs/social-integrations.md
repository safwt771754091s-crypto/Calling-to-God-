# Social integrations — The True Path Islam

Status of each platform's integration. **None of these are connected yet**: no
credentials are present in this environment, so nothing has been published.
The publisher is built and tested, and activates once credentials are supplied
and the kill switch is enabled.

Credentials are read from environment variables (never stored in the database).
Register an account under `/admin/agents` → "Connected accounts" with the
`credentialEnv` set to the variable name.

## Summary

| Platform | Adapter | Env var | Required scope | Status |
|----------|---------|---------|----------------|--------|
| Facebook (Page) | implemented | `FACEBOOK_PAGE_TOKEN` | `pages_manage_posts` | **Not connected** (no token) |
| Telegram (channel/bot) | implemented | `TELEGRAM_BOT_TOKEN` | bot admin on channel | **Not connected** (no token) |
| Instagram | not implemented | `INSTAGRAM_TOKEN` | `instagram_content_publish` | Needs Meta app review + business account |
| YouTube | not implemented | `YOUTUBE_API_TOKEN` | `youtube.upload` | Needs OAuth + quota |
| TikTok | not implemented | `TIKTOK_ACCESS_TOKEN` | `video.publish` | Needs app audit |
| X (Twitter) | not implemented | `X_API_TOKEN` | write scope | Needs paid API access |

"Implemented" means there is a working code path in
`src/lib/agents/publisher.ts` that calls the platform's official API. It has
**not** been exercised against a live account here.

## Facebook Page

1. Create/confirm a Meta app and a Page you administer.
2. Add the **`pages_manage_posts`** permission (under the "Manage everything on
   your Page" use case — the Business/Marketing use cases do not expose it).
3. Obtain a Page access token and store it as `FACEBOOK_PAGE_TOKEN`.
4. Register the account: handle = the numeric Page id, platform `FACEBOOK`,
   `credentialEnv = FACEBOOK_PAGE_TOKEN`, scope `pages_manage_posts`.
5. The adapter POSTs to `graph.facebook.com/v21.0/{page-id}/feed`.

## Telegram

1. Create a bot with @BotFather; add it as an admin of your channel.
2. Store the bot token as `TELEGRAM_BOT_TOKEN`.
3. Register the account: handle = the channel `@username`, platform `TELEGRAM`,
   `credentialEnv = TELEGRAM_BOT_TOKEN`.
4. The adapter calls `sendMessage`.

## Platforms requiring extra steps (documented, not implemented)

- **Instagram**: Meta app review for `instagram_content_publish`; an IG Business
  account linked to the Page; media must be a public image/video URL.
- **YouTube**: Google OAuth with `youtube.upload`; video uploads consume daily
  quota; expect a verification review.
- **TikTok**: developer app audit for the Content Posting API; only videos.
- **X**: write access requires a paid API tier.

## Regional reach notes

- **China**: several international platforms are restricted. Publishing there
  depends on platform availability and must not attempt to bypass platform or
  legal restrictions. Prepared for allowed channels only.
- **India / Japan**: no platform-level restrictions; follow each platform's
  content policy and local law.

## Safety controls

- Global kill switch (`PlatformConfig["publishing.enabled"]`, default `false`),
  toggled from the dashboard by an ADMIN.
- Only human-approved content (`ContentItem.status = APPROVED`) can publish.
- Idempotency key prevents accidental duplicate posts on retry.
- Failed attempts store the error and an attempt counter; successful posts store
  the remote id and URL for verification.
