import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { playerName, team, round } = req.body || {};

    if (!playerName || !team || !round) {
      return res.status(400).json({
        error: 'playerName, team and round are required'
      });
    }

    const rows = await sql`
      WITH updated_players AS (
        SELECT jsonb_agg(
          CASE
            WHEN player->>'name' = ${playerName}
            THEN jsonb_set(
              jsonb_set(
                player,
                ARRAY['picks', ${String(round)}]::text[],
                to_jsonb(${team}::text),
                true
              ),
              '{used}',
              CASE
                WHEN COALESCE(player->'used', '[]'::jsonb) ? ${team}
                THEN COALESCE(player->'used', '[]'::jsonb)
                ELSE COALESCE(player->'used', '[]'::jsonb)
                     || jsonb_build_array(${team}::text)
              END,
              true
            )
            ELSE player
          END
          ORDER BY ord
        ) AS players
        FROM competition_state,
        jsonb_array_elements(state->'players')
          WITH ORDINALITY AS p(player, ord)
        WHERE id = 1
      )

      UPDATE competition_state
      SET
        state = jsonb_set(
          state,
          '{players}',
          updated_players.players,
          true
        ),
        updated_at = NOW()
      FROM updated_players
      WHERE competition_state.id = 1
        AND competition_state.state->>'round' = ${String(round)}
      RETURNING competition_state.state
    `;

    if (!rows.length) {
      return res.status(409).json({
        error: 'Competition round has changed. Please refresh.'
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
