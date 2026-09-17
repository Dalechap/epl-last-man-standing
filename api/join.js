import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, pin } = req.body || {};

    const cleanName = String(name || '').trim();
    const cleanPin = String(pin || '').trim();

    if (!cleanName || !/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({
        error: 'A name and 4-digit PIN are required'
      });
    }

    const rows = await sql`
      UPDATE competition_state
      SET
        state = jsonb_set(
          state,
          '{players}',
          COALESCE(state->'players', '[]'::jsonb)
          ||
          jsonb_build_array(
            jsonb_build_object(
              'name', ${cleanName}::text,
              'pin', ${cleanPin}::text,
              'alive', true,
              'picks', '{}'::jsonb,
              'used', '[]'::jsonb,
              'eliminatedRound', null
            )
          ),
          true
        ),
        updated_at = NOW()
      WHERE id = 1
AND COALESCE(
  (state->>'registrationClosed')::boolean,
  false
) = false
AND COALESCE(
  (state->>'round')::integer,
  4
) = 4
AND COALESCE(
  (state->>'deadlinePassed')::boolean,
  false
) = false
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            COALESCE(state->'players', '[]'::jsonb)
          ) AS player
          WHERE lower(player->>'name') = lower(${cleanName}::text)
        )
      RETURNING state
    `;

if (!rows.length) {
  const check = await sql`
    SELECT state
    FROM competition_state
    WHERE id = 1
  `;

  const currentState = check.length ? check[0].state : null;

  if (currentState?.registrationClosed) {
    return res.status(403).json({
      error: 'Registration is closed. The competition has already started.'
    });
  }

  return res.status(409).json({
    error: 'That player name is already in the competition'
  });
}

    return res.status(200).json({
      ok: true,
      state: rows[0].state
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
