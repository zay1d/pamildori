# Pamildori backend — playlist (Telegram bot + API)

Stores each user's audio on the VPS and serves it to the Mini App.

- **Bot** (grammY, **long polling** — no webhook/DNS needed): send it an audio
  file → it's saved to your playlist.
- **API** (Fastify): `GET /api/tracks`, `GET /api/stream/:id`, `DELETE /api/tracks/:id`.
  Auth = Telegram **initData** HMAC validation. Streaming uses short-lived
  **signed capability URLs** (so a plain `<audio>` element works) + HTTP Range.
- **Storage**: audio on disk (`DATA_DIR/audio`), metadata in **SQLite**
  (`DATA_DIR/pamildori.db`).

## Why this shape
Single VPS, personal playlists → disk + SQLite is the right size (no DB server,
no object store to operate). Long polling sidesteps the webhook/DNS requirement
for the bot; the API still needs HTTPS (the Mini App is served over HTTPS and
can't call plain HTTP) — provided here by **nginx + Let's Encrypt** (certbot)
for the domain `api.pamildori.uz`.

## Prerequisites
- A VPS with Docker + Docker Compose, ports **80** and **443** open.
- Its **public IP**.
- A Telegram **bot token** from [@BotFather](https://t.me/BotFather).

## DNS (Cloudflare)
The domain `pamildori.uz` is on Cloudflare. Add one record for the backend:

| Type | Name | Content   | Proxy        |
|------|------|-----------|--------------|
| A    | api  | <VPS IP>  | **DNS only** (grey cloud) |

→ `api.pamildori.uz` resolves to the VPS so certbot can issue the TLS cert.
**Grey cloud is required** — an orange (proxied) record blocks the Let's Encrypt
HTTP-01 challenge.

## Deploy — shared VPS behind nginx (this project's setup)
The VPS already serves other sites through nginx (it owns ports 80/443), and
port 8080 is taken by another app. So the app runs in Docker on a local port
and the existing nginx fronts it with TLS.

```bash
cd pamildori/server
cp .env.example .env          # set BOT_TOKEN (PUBLIC_HOST=api.pamildori.uz already)
docker compose up -d --build
ss -ltnp | grep 8090          # app should be listening on 127.0.0.1:8090
curl http://127.0.0.1:8090/api/health   # → {"ok":true}
```
Add the nginx vhost, then issue the cert with the **webroot** method (the certbot
`--nginx` plugin can choke on a crowded shared nginx):
```bash
sudo cp deploy/pamildori.nginx.conf /etc/nginx/sites-available/api.pamildori.uz
sudo ln -s /etc/nginx/sites-available/api.pamildori.uz /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/certbot -d api.pamildori.uz
# then uncomment the `listen 443 ssl` block in the vhost and reload:
sudo nginx -t && sudo systemctl reload nginx
```
Verify: `curl https://api.pamildori.uz/api/health` → `{"ok":true}`.
> If 8090 is taken, change both the host port in `docker-compose.yml` and
> `proxy_pass` in the nginx conf to a free port.

## Run without Docker (Node ≥ 22)
```bash
cd server
npm install
cp .env.example .env   # edit values; set HOST=0.0.0.0 only if not behind a proxy
npm start              # node --experimental-strip-types src/server.ts
npm test               # unit tests for auth + safe-path + range logic
```
Put nginx in front for HTTPS; point `proxy_pass` at `PORT`.

## Connect Telegram
In @BotFather:
- **/setmenubutton** → set the Mini App URL to `https://zay1d.github.io/pamildori/`
  (or **/newapp** to register a Web App). This makes the app open from the bot.
- Users add tracks by **sending audio to the bot**.

> Telegram bots can only download files up to **~20 MB** (`getFile` limit), so
> larger uploads are rejected with a friendly message. `MAX_AUDIO_MB` enforces it.

## Wire the frontend (next step)
The Mini App should call this API with
`Authorization: tma <Telegram.WebApp.initData>` and use the per-track `url`
from `GET /api/tracks` directly as the `<audio>` source. Set the API base URL
(`PUBLIC_BASE_URL`) as a build-time env in the web app.

## Security model (summary)
- **initData** validated via HMAC-SHA256 (`WebAppData` key scheme) + `auth_date`
  freshness; only the verified Telegram user id is trusted.
- **Per-user authorization** on every track (list/stream/delete) — no IDOR.
- **Stream URLs** are HMAC-signed, expiring capabilities bound to (track, user).
- **No path traversal**: on-disk names are `*<server-UUID>.<allow-listed-ext>*`,
  re-checked to stay within the audio dir; user filenames never touch the path.
- **Limits**: audio type allow-list, size cap (+ download timeout & content-length
  check), per-user track cap, small JSON body limit.
- **Secrets** only via env; CORS restricted to the Mini App origin; the bot token
  is never logged; request logging is disabled so stream tokens don't reach logs.
- The app process runs as a **non-root** user in Docker: the entrypoint starts
  as root only to fix the bind-mounted data-dir ownership, then drops to `node`
  via `gosu` (so no manual `chown` is needed on a fresh deploy). HSTS/HTTPS are
  terminated by the reverse proxy in front.

## Security review — applied & accepted
Audited with the secure-coding-trio (no critical/high fail-open found). Applied:
disable request logging (stream-token leak), bot-download timeout + size cap +
`redirect: 'error'`, non-root container, HSTS, async stat, explicit-secret guidance.

Accepted / operational follow-ups (do these for production):
- **Lockfile**: run `npm install` once and **commit `package-lock.json`** — the
  Dockerfile then uses `npm ci` automatically for reproducible builds.
- **STREAM_SECRET**: set an explicit random value (see `.env.example`).
- **Rate limiting & disk quota**: add `@fastify/rate-limit` or limit in nginx, and
  monitor `DATA_DIR` usage (per-user cap is 500 tracks; no global cap yet).
- **initData freshness**: default `INITDATA_MAX_AGE_SEC=86400` favors long Mini App
  sessions over replay hardening; lower it if you prefer tighter replay windows.
