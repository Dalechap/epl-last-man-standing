import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const {
      playerName,
      pin,
      subscription
    } = req.body || {};

    const cleanName =
      String(playerName || '').trim();

    const cleanPin =
      String(pin || '').trim();

    if (
      !cleanName ||
      !/^\d{4}$/.test(cleanPin)
    ) {
      return res.status(400).json({
        error: 'Player name and 4-digit PIN are required'
      });
    }

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return res.status(400).json({
        error: 'Valid push subscription is required'
      });
    }

    const rows = await sql`
      SELECT player
      FROM competition_state,
      jsonb_array_elements(state->'players') AS player
      WHERE id = 1
        AND lower(player->>'name') = lower(${cleanName}::text)
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({
        error: 'Player not found'
      });
    }

    const player = rows[0].player;

    if (String(player.pin) !== cleanPin) {
      return res.status(403).json({
        error: 'Incorrect PIN'
      });
    }

    await sql`
      INSERT INTO push_subscriptions (
        player_name,
        endpoint,
        p256dh,
        auth,
        enabled,
        updated_at
      )
      VALUES (
        ${player.name},
        ${subscription.endpoint},
        ${subscription.keys.p256dh},
        ${subscription.keys.auth},
        TRUE,
        NOW()
      )
      ON CONFLICT (endpoint)
      DO UPDATE SET
        player_name = EXCLUDED.player_name,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        enabled = TRUE,
        updated_at = NOW()
    `;

    return res.status(200).json({
      ok: true,
      playerName: player.name
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
