CREATE TABLE IF NOT EXISTS competition_state (
  id integer PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id bigserial PRIMARY KEY,
  player_name text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_log (
  id bigserial PRIMARY KEY,
  player_name text NOT NULL,
  notification_type text NOT NULL,
  matchweek integer NOT NULL,
  endpoint text NOT NULL,
  UNIQUE (player_name, notification_type, matchweek, endpoint)
);
