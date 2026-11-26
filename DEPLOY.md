# Deployment & Local Setup Guide

This guide covers running **Last Man Standing** locally and deploying to production, along with the PostgreSQL commands for creating and seeding the database tables.

---

## 1. Environment Variables (`.env`)

Create a `.env` file in the project root (based on `.env.example`):

```env
# Required
DATABASE_URL=postgres://lms:lms@127.0.0.1:5432/lms
ADMIN_PIN=2468

# Optional (for Web Push notifications)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Optional (for fetching football-data.org fixtures)
FOOTBALL_DATA_API_KEY=

# Optional (local server port, defaults to 3000)
PORT=3000
```

### Generating VAPID Keys (Optional — Web Push Notifications)

`VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are a cryptographic key pair used to send **Web Push Notifications** (e.g., deadline reminders via `/api/notifications`):

- **`VAPID_PUBLIC_KEY`**: Exposed to the browser (`/api/push-public-key`) so players can subscribe to push notifications.
- **`VAPID_PRIVATE_KEY`**: Kept secret on the server (`api/notifications.js`) to sign push payloads for browser push services (Chrome, Safari, Firefox).

**Do you need them?**
- **Without push notifications**: Leave both blank. All core features (joining, picking, results, admin) work normally.
- **With push notifications**: No third-party account or API signup is required — generate your own key pair for free using the `web-push` package already installed in this project:

```bash
npx web-push generate-vapid-keys
```

Copy the output `Public Key` and `Private Key` into `.env` (for localhost) or **Vercel Project Settings → Environment Variables** (for production).

> **Notes:**
> - Never commit `VAPID_PRIVATE_KEY` to Git.
> - Generate the pair once and reuse it — rotating keys invalidates existing player subscriptions.
> - Web Push requires **HTTPS** in production (provided automatically by Vercel) and also works on `localhost`.

### Football-Data API Key (Optional — `FOOTBALL_DATA_API_KEY`)

`FOOTBALL_DATA_API_KEY` is an API token for [football-data.org](https://www.football-data.org/) used in `lib/fixtures.js` to fetch Football fixtures and match results.

- **Without this key (default)**: Leave it blank — the app automatically falls back to the free **TheSportsDB** public API (no key required), which already powers all other sports as well.
- **With this key**: Football fixtures are fetched from `api.football-data.org/v4` (faster and more reliable for major European leagues like PL, La Liga, Serie A, Bundesliga, Ligue 1, and Championship). Note that the free tier does not include some leagues (such as MLS or A-League).
- **How to get one**: Register for a free account at [football-data.org/client/register](https://www.football-data.org/client/register). Your API token will be emailed to you after verification — paste it into `FOOTBALL_DATA_API_KEY` in `.env` or Vercel Environment Variables.

---

## 2. Running on Localhost

1. **Install dependencies** (first time only):
   ```bash
   npm install
   ```
2. **Start PostgreSQL via Docker** (defined in `docker-compose.yml`):
   ```bash
   docker compose up -d
   ```
3. **Start the local server**:
   ```bash
   npm run dev
   ```
   - `server.js` automatically loads `.env` and runs `db/schema.sql` when `DATABASE_URL` points to `localhost` or `127.0.0.1`.
   - Open `http://127.0.0.1:3000`.

---

## 3. Deploying to Production (Recommended: Vercel + Neon)

This project is pre-configured for **Vercel** (`vercel.json`) and **Neon PostgreSQL** (`@neondatabase/serverless` in `lib/db.js`). Using Neon requires **no code changes** and comes with a free tier.

1. **Deploy on Vercel**
   - Push the repository to GitHub / GitLab / Bitbucket.
   - Import the project into [Vercel](https://vercel.com) (no build command or output directory required).
   - Vercel automatically serves static assets, serverless functions (`/api/*`), and the cron jobs defined in `vercel.json`:
     - `/api/auto-results` daily at `22:30 UTC`
     - `/api/notifications` daily at `12:00 UTC`
2. **Connect a Neon Database (Easiest via Vercel Storage)**
   - In your Vercel project, go to **Storage → Create Database → Neon** (free tier available) and connect it to the project. Vercel automatically injects `DATABASE_URL` into your project's Environment Variables.
   - *(Alternatively, you can create a database directly on [Neon](https://neon.tech) and manually add its connection string as `DATABASE_URL` in Vercel.)*
   - Open the **Neon SQL Editor** (accessible from the Vercel Storage tab or Neon dashboard) and run the SQL in **Section 5.1 (CREATE TABLE)** once to create the tables.
3. **Configure Remaining Environment Variables on Vercel**
   - Go to **Project Settings → Environment Variables** and add:
     - `ADMIN_PIN` *(required)*
     - `DATABASE_URL` *(auto-created if connected via Vercel Storage → Neon)*
     - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` *(optional)*
     - `FOOTBALL_DATA_API_KEY` *(optional)*
   - Trigger a redeploy.

---

## 4. Deploying to a VPS / Render / Railway (Alternative)

- Start the app with:
  ```bash
  node server.js
  ```
- Update `server.listen(port, '127.0.0.1', ...)` in `server.js` to `'0.0.0.0'` so it accepts external connections.
- Configure external cron jobs to call `GET /api/auto-results` and `GET /api/notifications` on your desired schedule.

---

## 5. Database SQL Commands (PostgreSQL / Neon)

### 5.1 CREATE TABLE (matches `db/schema.sql`)

Run once to create all required tables:

```sql
-- 1. Stores the competition state (single root document at id = 1)
CREATE TABLE IF NOT EXISTS competition_state (
  id integer PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Stores Web Push subscriptions per player
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id bigserial PRIMARY KEY,
  player_name text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Tracks sent notifications to prevent duplicates per matchweek
CREATE TABLE IF NOT EXISTS notification_log (
  id bigserial PRIMARY KEY,
  player_name text NOT NULL,
  notification_type text NOT NULL,
  matchweek integer NOT NULL,
  endpoint text NOT NULL,
  UNIQUE (player_name, notification_type, matchweek, endpoint)
);
```

---

### 5.2 INSERT Seed Data

> Note: The app automatically creates row `id = 1` in `competition_state` when a player joins or an admin saves state. Use one of the queries below if you want to pre-seed the database manually.

#### Option A: Empty initial state (recommended for a fresh setup)

```sql
INSERT INTO competition_state (id, state, updated_at)
VALUES (
  1,
  '{"competitions": {}}'::jsonb,
  NOW()
)
ON CONFLICT (id)
DO UPDATE SET
  state = EXCLUDED.state,
  updated_at = NOW();
```

#### Option B: Pre-seeded with Football (Premier League) and a sample player

```sql
INSERT INTO competition_state (id, state, updated_at)
VALUES (
  1,
  '{
    "competitions": {
      "football:PL": {
        "sport": "football",
        "league": "PL",
        "round": 1,
        "startRound": 1,
        "registrationClosed": false,
        "selectedPlayer": "",
        "deadlinePassed": false,
        "deadline": null,
        "roundProcessed": false,
        "results": {},
        "fixtures": {},
        "players": [
          {
            "name": "PlayerOne",
            "pin": "1234",
            "alive": true,
            "picks": {},
            "used": [],
            "eliminatedRound": null
          }
        ],
        "processSnapshot": null,
        "resultMode": "live"
      }
    }
  }'::jsonb,
  NOW()
)
ON CONFLICT (id)
DO UPDATE SET
  state = EXCLUDED.state,
  updated_at = NOW();
```

#### Reference INSERT for `push_subscriptions` and `notification_log`

> These two tables are normally populated automatically via `/api/push-subscribe` and `/api/notifications`.

```sql
-- Example push subscription insert
INSERT INTO push_subscriptions (
  player_name,
  endpoint,
  p256dh,
  auth,
  enabled,
  updated_at
)
VALUES (
  'PlayerOne',
  'https://fcm.googleapis.com/fcm/send/example-endpoint-token',
  'example-p256dh-key',
  'example-auth-secret',
  TRUE,
  NOW()
)
ON CONFLICT (endpoint)
DO UPDATE SET
  player_name = EXCLUDED.player_name,
  p256dh = EXCLUDED.p256dh,
  auth = EXCLUDED.auth,
  enabled = TRUE,
  updated_at = NOW();

-- Example notification log insert
INSERT INTO notification_log (
  player_name,
  notification_type,
  matchweek,
  endpoint
)
VALUES (
  'PlayerOne',
  'deadline_reminder',
  1,
  'https://fcm.googleapis.com/fcm/send/example-endpoint-token'
)
ON CONFLICT (player_name, notification_type, matchweek, endpoint)
DO NOTHING;
```

---

### 5.3 Useful Maintenance Queries

```sql
-- Inspect current competition state
SELECT id, updated_at, state FROM competition_state WHERE id = 1;

-- List active push subscriptions
SELECT player_name, enabled, updated_at FROM push_subscriptions ORDER BY updated_at DESC;

-- Reset all tables
TRUNCATE TABLE competition_state, push_subscriptions, notification_log RESTART IDENTITY;
```
