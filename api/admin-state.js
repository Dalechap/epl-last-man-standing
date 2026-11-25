import { neon } from '@neondatabase/serverless';
import { randomInt } from 'node:crypto';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { adminPin, state: incomingState } = req.body || {};

    if (String(adminPin) !== String(process.env.ADMIN_PIN)) {
      return res.status(403).json({
        error: 'Incorrect Admin PIN'
      });
    }

    if (!incomingState || typeof incomingState !== 'object') {
      return res.status(400).json({
        error: 'Competition state is required'
      });
    }

    const rows = await sql`
      SELECT state
      FROM competition_state
      WHERE id = 1
    `;

    const existingState =
      rows.length ? rows[0].state : null;

    // Preserve player PINs already stored on the server.
    if (
      existingState &&
      Array.isArray(existingState.players) &&
      Array.isArray(incomingState.players)
    ) {
      incomingState.players =
        incomingState.players.map(player => {
          const existingPlayer =
            existingState.players.find(
              existing =>
                existing.name.toLowerCase() ===
                player.name.toLowerCase()
            );

          if (existingPlayer?.pin) {
            return {
              ...player,
              pin: existingPlayer.pin
            };
          }

          return player;
        });
    }

    const restarting =
      existingState?.roundProcessed === true &&
      Number(incomingState.startRound) >
        Number(existingState.round);

    if (restarting) {

const profiles = await sql`
  SELECT name, pin
  FROM player_profiles
  ORDER BY name
`;

if (!profiles.length) {
  throw new Error('No registered player profiles found');
}

incomingState.players = profiles.map(profile => ({
  name: profile.name,
  pin: profile.pin,
  alive: true,
  picks: {},
  used: [],
  eliminatedRound: null
}));
      
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const newCompetitionCode = Array.from(
  { length: 6 },
  () => alphabet[randomInt(alphabet.length)]
).join('');
      await sql.transaction([
        sql`
          INSERT INTO competition_history (
            start_round,
            final_round,
            winner,
            participants,
            completed_at,
            snapshot
          )
          SELECT
            (state->>'startRound')::integer,
            (state->>'round')::integer,
            (
              SELECT p->>'name'
              FROM jsonb_array_elements(state->'players') p
              WHERE p->>'alive' = 'true'
            ),
            jsonb_array_length(state->'players'),
            updated_at,
            jsonb_set(
              state - 'processSnapshot',
              '{players}',
              (
                SELECT jsonb_agg(p - 'pin' ORDER BY ord)
                FROM jsonb_array_elements(state->'players')
                WITH ORDINALITY AS x(p, ord)
              )
            )
          FROM competition_state
          WHERE id = 1
            AND state->>'roundProcessed' = 'true'
            AND (
              SELECT count(*)
              FROM jsonb_array_elements(state->'players') p
              WHERE p->>'alive' = 'true'
            ) = 1
            AND NOT EXISTS (
              SELECT 1
              FROM competition_history h
              WHERE h.start_round =
                (state->>'startRound')::integer
                AND h.final_round =
                (state->>'round')::integer
            )
          ON CONFLICT DO NOTHING
        `,
        sql`
          UPDATE competition_state
          SET state = ${incomingState},
              updated_at = NOW()
                    WHERE id = 1
        `,
        sql`
          UPDATE competition_access
          SET code = ${newCompetitionCode},
              updated_at = NOW()
          WHERE id = 1
        `
      ]);
    } else {
      await sql`
        INSERT INTO competition_state (id, state, updated_at)
        VALUES (1, ${incomingState}, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          state = EXCLUDED.state,
          updated_at = NOW()
      `;
    }

    return res.status(200).json({
      ok: true
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
