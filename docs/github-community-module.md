# GitHub-backed Community module

## Mobile UX flow

1. **Community** is a GitHub-style repository feed. Cards show the category/XP, `owner/repo`, description, language, visibility, request count, and latest activity.
2. **Connect GitHub** is entered before creating or joining. It shows GitHub's device code, opens the verification URL, polls safely, handles denial/expiry, and offers `github.com/join` for people without an account.
3. **Create project** is a seven-step wizard: category, technology, license, visibility, starter template, project purpose, and review. Submission creates a repository and routes directly to its repository view.
4. **Repository view** provides Code, Commits, Issues, Pull Requests, Discussions, Contributors, and a recent-changes feed. The open-on-GitHub action is always available.
5. **Join requests** give creators the requester’s GitHub identity and message. Approval changes the in-app state to “Invitation sent”; GitHub acceptance changes it to approved and awards XP.
6. **My Work** aggregates assigned issues, authored pull requests, contributed repositories, starred repositories, and organizations.

## API surface

| Endpoint | Purpose |
| --- | --- |
| `POST /api/github/device/start` | Starts OAuth Device Authorization (`repo read:org`). |
| `POST /api/github/device/:id/poll` | Polls GitHub and encrypts a completed token at rest. |
| `GET/DELETE /api/github/connection` | Shows or disconnects the GitHub link. |
| `POST /api/github/projects` | Generates the scaffold, creates the repository/files/issues/webhook, then maps it to a project. |
| `GET /api/github/my-work` | GitHub-powered Issues, PRs, repositories, stars, and organizations. |
| `GET /api/github/feed` | Cross-project activity for joined/owned repositories. |
| `PUT /api/github/push-token` | Registers an Expo push token. |
| `POST /api/github/webhooks` | Signed GitHub webhook receiver. |
| `POST /api/projects/:id/join-requests` | Creates a pending request linked to the requester’s GitHub username. |
| `PATCH /api/projects/:id/applications/:applicationId` | Declines a request or sends a GitHub collaborator invite. |
| `GET /api/projects/:id/repository/:section` | Proxies `code`, `commits`, `issues`, `pulls`, or `contributors`. |
| `GET /api/projects/:id/commits/:sha` | Retrieves an individual commit and diff. |
| `GET /api/projects/:id/activity` | Reads persisted project activity. |

## GitHub integration

Device authorization uses `POST https://github.com/login/device/code` and `POST https://github.com/login/oauth/access_token`; the required scopes are `repo read:org`. The mobile client never handles a GitHub password. The backend stores the resulting token encrypted with AES-256-GCM.

Repository creation uses `POST /user/repos`, Git Data endpoints `POST /repos/{owner}/{repo}/git/blobs`, `/git/trees`, `/git/commits`, and `/git/refs`, then `POST /repos/{owner}/{repo}/issues` and `POST /repos/{owner}/{repo}/hooks`.

Membership uses `PUT /repos/{owner}/{repo}/collaborators/{username}`. Repository views use `/contents`, `/commits`, `/commits/{sha}`, `/issues`, `/pulls`, and `/contributors`. My Work uses `/issues?filter=assigned`, `/search/issues`, `/user/repos`, `/user/starred`, and `/user/orgs`.

Webhooks subscribe to `push`, `pull_request`, `issues`, and `member`; SHA-256 signatures are verified using `GITHUB_WEBHOOK_SECRET`. The fallback poller syncs recent commits and checks invitation acceptance every ten minutes (configurable). GET responses are short-lived cached and revalidated with ETags.

Private repositories are queried using the connected user’s token. Public repositories also offer `POST /api/projects/:id/fork` for the fork-and-pull-request fallback when a collaborator invite is not allowed. A revoked/deleted account/repository returns a reconnect/error state rather than exposing stale content.

## Data model

The migration adds repository mapping and recent-activity fields to `Project`, GitHub identity/token records in `GithubToken`, temporary encrypted device codes in `GithubDeviceAuthorization`, contributor invitation fields in `ProjectApplication`, activity in `ActivityEvent`, and device tokens in `PushToken`. Existing users and projects remain compatible.

## Delivery phases

**Phase 1 — implemented:** Device Flow, encrypted backend token persistence, AI wizard, generated repository/files/issues, repository mapping, Community cards, and repository/My Work mobile screens.

**Phase 2 — implemented foundation:** join/decline/invite workflow, invitation acceptance sync, contributor/commit/issues/PR reads, signed webhook activity, fallback polling, in-app activity feed, Expo push-token registration, and backend push delivery.

Before production, configure the GitHub OAuth App, a public HTTPS webhook URL, webhook secret, token-encryption key, and APNs/FCM credentials through EAS. Build a development or production client for remote notifications; Android Expo Go does not support them.
