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
const playerRows = await sql`
  SELECT player
  FROM competition_state,
  jsonb_array_elements(state->'players') AS player
  WHERE id = 1
    AND player->>'name' = ${playerName}::text
`;

if (!playerRows.length) {
  return res.status(404).json({
    error: 'Player not found'
  });
}

const player = playerRows[0].player;

const usedTeams = Array.isArray(player.used)
  ? player.used
  : [];

const currentPick =
  player.picks?.[String(round)] || null;

if (
  usedTeams.includes(team) &&
  currentPick !== team
) {
  return res.status(409).json({
    error: 'You have already used that team'
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
              (
                COALESCE(
                  (
                    SELECT jsonb_agg(value)
                    FROM jsonb_array_elements_text(
                      COALESCE(player->'used', '[]'::jsonb)
                    ) AS u(value)
                    WHERE value <> COALESCE(
                      player #>> ARRAY['picks', ${String(round)}]::text[],
                      ''
                    )
                    AND value <> ${team}
                  ),
                  '[]'::jsonb
                )
                || jsonb_build_array(${team}::text)
              ),
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
