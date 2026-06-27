# Knights of Columbus Council Site

Next.js council site with member portal, Better Auth, calendar feeds, and dues.

## Setup

Requires **Node 22** (`lts/jod`, see `.nvmrc`). Native modules (`better-sqlite3`) must match your active Node version.

```bash
cp .env.example .env
nvm use
npm install
npm run db:migrate
npm run seed:example
npm run dev
```

`seed:example` copies `src/data/council.json.example` and `council.csv.example` when your local files are missing, then seeds member **1001001** with password **password** (webmaster with all permissions in the example council).

If you see `NODE_MODULE_VERSION` / `better_sqlite3.node` errors after switching Node or tooling runs `npm` under a different version:

```bash
nvm use
npm run rebuild:native
```

On first start, the app syncs:

- `src/data/council.json` permissions and dues into SQLite
- `src/data/council.membership` roster into SQLite (deactivates missing members)

### Dev login without Mail

Pre-seed a member password (no registration email):

```bash
npm run seed:example
npm run member:seed-password -- 1001001 'password' --reset
```

Example council member **1001001** / **password** is the webmaster with all permissions. Uses roster email when present; otherwise `member-<#>@dev.local`. Sign in at `/members/login`.

### Dev server port

Local dev uses a fixed high port (**47831**, `config/dev-server.json`) so cookies stay isolated from other apps on `:3000`. `npm run dev` sets `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to `http://localhost:47831` unless you override them in `.env`.

Stale Better Auth cookies are pruned automatically in development (cache chunks, wrong HTTP/HTTPS scheme, oversized headers).

### Test on your phone (LAN)

Dev server listens on all interfaces (`0.0.0.0`). Open `http://<your-computer-ip>:47831` on the phone.

Next.js blocks client JavaScript from non-localhost origins unless you allow them. Without that, links work but buttons (menu, theme, forms) do not — the page never hydrates.

Add your computer’s LAN IP to `.env` and restart `npm run dev`:

```bash
ALLOWED_DEV_ORIGINS=http://192.168.1.2:47831
```

Use your machine’s IP (check server logs if unsure). For member login from the phone, also set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the same LAN URL (include port **47831**).

## Member portal

- `/members/login` — membership number + password
- `/members/register` — verify email from roster, set password
- Signed-in members use the portal sub-nav (roster, calendar, galleries, dues, admin)
- `/members/admin/*` — permissions, events, galleries, Financial Secretary dues admin

## Public

- `/calendar` — events + ICS subscribe links
- `/dues/pay` — guest PayPal Buy Now button
- `/api/calendar/*.ics` — cached feeds (birthdays require token from `/members/calendar`)

## Docker

Uses `node:22-alpine` (Node 22 / `lts/jod`). Native modules such as `better-sqlite3` are compiled in the build stage.

```bash
docker compose up --build
```

Mount `data/` for SQLite, calendar cache, and optimized image cache (`data/cache/images`). Mount `council.json` and `council.csv`.

Local static images (`next/image`) resize through `/api/image` and cache under `IMAGE_CACHE_DIR` (default `data/cache/images`). With SWAG, nginx also caches `/api/image` and `/_next/image` responses on disk.

Production images are published to GitHub Container Registry on release:

`ghcr.io/tobiatenno/kofc-next:latest` (and semver tags).

### Reverse proxy (SWAG)

Use the `with-proxy` profile for [LinuxServer SWAG](https://docs.linuxserver.io/images/docker-swag) instead of exposing the app on port 3000 publicly:

```bash
docker compose --profile with-proxy up --build
```

Set in `.env`:

- `SWAG_URL` — apex domain (e.g. `example.com`)
- `SWAG_SUBDOMAINS` — subdomain for this site (default `kofc` → `kofc.example.com`)
- `SWAG_VALIDATION` — `http` or `dns` for Let's Encrypt
- `SWAG_EMAIL` — required for Let's Encrypt notifications
- `PUID` / `PGID` — file ownership for SWAG config (default `1000`)

Proxy config lives in `docker/swag/nginx/proxy-confs/kofc.subdomain.conf` and forwards to the `app` service on port 3000.

Set the public site URL in `.env` so auth and canonical redirects match what browsers use (replace with your subdomain):

```bash
BETTER_AUTH_URL=https://kofc.example.com
NEXT_PUBLIC_APP_URL=https://kofc.example.com
```

`NEXT_PUBLIC_APP_URL` is embedded at **build** time for Docker images; pass it as a build arg or rebuild after changing it.

When SWAG (or any reverse proxy) terminates TLS and forwards to a host port (e.g. `localhost:8367`), you **must** pass the public host and scheme — not only `Host`. Without `X-Forwarded-Proto`, Next.js 16 standalone treats proxy routes as HTTP and can 307-loop. Include SWAG’s `proxy.conf` or set at least:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## CI / release

- **Pull requests** — GitHub Actions runs Biome (`npm run lint`), production build, and Cypress E2E.
- **Dependabot** — `.github/dependabot.yml` only (npm, GitHub Actions, Docker). Each ecosystem uses one `groups` entry with `patterns: ["*"]` so updates land in a single commit per PR.
- **`main` branch** — release workflow runs lint, build, and Cypress E2E before [semantic-release](https://semantic-release.gitbook.io/) creates a **git tag** and **GitHub Release** with notes (Conventional Commits required; commitlint enforced locally via Husky). Does **not** push commits to `main` (branch protection: PR + signed commits). **`package.json` / `CHANGELOG.md` on `main` are not auto-bumped** — use [GitHub Releases](https://github.com/TobiTenno/kofc-next/releases) and tags as the version source of truth.
- **Docker** — `@codedependant/semantic-release-docker` builds and pushes `ghcr.io/<owner>/kofc-next:<version>` and `:latest`. CI sets `dockerProject` from `GITHUB_REPOSITORY` (no hardcoded owner); see `Prepare release config` in `.github/workflows/release.yml`.

CI E2E reads `src/data/council.json.example` and `src/data/council.csv.example` via `COUNCIL_JSON_PATH` / `COUNCIL_CSV_PATH` — your local `council.json` / `council.csv` are never touched. Production deployments mount real council data at runtime (or set those env vars).

**Local E2E:** `npm run test:e2e` (interactive: `npm run test:e2e:open`). Override paths: `COUNCIL_JSON_PATH=... COUNCIL_CSV_PATH=... npm run test:e2e`.

## Env

See `[.env.example](.env.example)` for PayPal IPN, Better Auth, and Immich settings.

### Mailgun (registration + council email)

Required for `/members/register` (verification codes) and council email (`/members/email`, roster single/bulk send). Without Mailgun, use [dev login without Mail](#dev-login-without-mail) instead of registration.

#### Mailgun account setup

1. Create a [Mailgun](https://www.mailgun.com/) account and add a **sending domain** (custom domain recommended for production; sandbox works for limited testing).
2. Add the DNS records Mailgun provides (SPF, DKIM; DMARC recommended). Wait until the domain shows as verified.
3. Create an API key with **Send** permission (Sending → Domain settings → API keys, or account API key scoped to the domain).
4. Set in `.env`:

   | Variable | Example | Notes |
   |----------|---------|-------|
   | `MAILGUN_API_KEY` | `key-…` | Private; server-side only |
   | `MAILGUN_DOMAIN` | `mail.example.com` | Verified sending domain (not the full `@` address) |
   | `MAILGUN_FROM` | `Council 1234 <postmaster@mail.example.com>` | Must use an address on `MAILGUN_DOMAIN` |

5. Restart the app after changing env vars.

**Sandbox domain:** Mailgun’s sandbox only delivers to **authorized recipients** you add in the Mailgun dashboard. Fine for testing one or two addresses; not for real member mailouts.

**EU region:** This app calls the US API (`api.mailgun.net`). Mailgun EU domains (`api.eu.mailgun.net`) are not supported without a code change.

#### What the app sends

| Flow | Trigger | Recipients |
|------|---------|------------|
| Registration | `/members/register` → verify step | Roster `primaryEmail` that matches the membership number entered |
| Council broadcast | `/members/email` | All active members with `primaryEmail` on file |
| Roster email | Expand a member or bulk-select on `/members/roster` | Selected member(s) with email on file |

Broadcasts are sent in batches of 50 recipients per Mailgun request. Plain text and simple HTML (line breaks) are supported.

#### Who can send council / roster email

- **Financial Secretary** and **webmaster** — roster email and admin tools by default
- Others — grant `sendCouncilEmail` in `/members/admin/permissions` (stored in `council.json`)

Recipients come from the synced roster CSV (`primaryEmail`). Members without an email on file are skipped (bulk send reports how many were skipped).

#### Troubleshooting

- **503 “Unable to send verification email”** — check the three `MAILGUN_*` vars, domain verification, and Mailgun logs (Sending → Logs).
- **401 / 403 from Mailgun** — wrong API key or key lacks send access to that domain.
- **Mail accepted but not received** — spam folder; sandbox authorized-recipient list; SPF/DKIM/DMARC on the sending domain.
- **Registration “Member not found”** — membership number must be active and the email must exactly match roster `primaryEmail`.

### Immich photo galleries

Optional. Tie council galleries to an [Immich](https://immich.app/) server. Galleries are hidden until `IMMICH_URL` and `IMMICH_API_KEY` are set.

#### One Immich server, many council sites

Immich has no API keys scoped to a single album — keys belong to an Immich **user** and apply to that user’s whole library. To share one Immich instance across several council deployments:

1. In Immich **Administration → Users**, create one user per council (e.g. `council-1234`, `council-5678`).
2. Sign in as each council user and create API keys (Account Settings → API Keys). Do **not** reuse one service account across councils.
3. On each council site, set the same `IMMICH_URL` but that council’s own `IMMICH_API_KEY` and `IMMICH_UPLOAD_API_KEY`.
4. Use a distinct `IMMICH_DEVICE_ID` per council (e.g. `kofc-council-1234`) so uploads can be validated on complete.

Albums are the logical gallery boundary; **user accounts** enforce isolation between councils.

#### Per-site setup

1. Create API keys for this council’s Immich user:
  - **Server key** (`IMMICH_API_KEY`): `album.read`, `album.create`, `albumAsset.create`, `asset.read`, `asset.download` (thumbnail proxy). Some Immich versions still require `all` on certain endpoints.
  - **Upload key** (`IMMICH_UPLOAD_API_KEY`, recommended): `asset.upload` plus minimal read if your Immich version allows — otherwise `all` on this council-only user is acceptable.
2. Set `IMMICH_URL` (e.g. `https://photos.example.com`) and keys in `.env`.
3. Grant `manageGalleries` in `/members/admin/permissions` (webmaster has all permissions).
4. Create galleries at `/members/admin/galleries` — new Immich albums are created under this council’s user, or link an existing album ID owned by that user.
5. Members browse `/members/galleries` and upload when a gallery allows it.

**Upload flow:** browser uploads directly to Immich (`POST /api/assets`) with this site’s `IMMICH_DEVICE_ID`, then calls this app to attach the asset to the gallery album. On complete, the server verifies the asset is readable, matches `IMMICH_DEVICE_ID`, and is not already linked to a gallery. File bytes never pass through Next.js.

If the council site and Immich are on different origins, configure CORS on Immich's reverse proxy (example nginx location):

```nginx
add_header Access-Control-Allow-Origin "https://council.example.com";
add_header Access-Control-Allow-Headers "x-api-key";
add_header Access-Control-Allow-Methods "POST, OPTIONS";
```

Also allow large uploads on the Immich proxy (`client_max_body_size`, long timeouts) — see [Immich reverse proxy docs](https://immich.app/docs/administration/reverse-proxy).

Upload size hint defaults to 25 MB (`IMMICH_MAX_UPLOAD_MB`). Thumbnails are still proxied through this app so the admin API key stays server-side.