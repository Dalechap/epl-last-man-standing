import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { adminPin, state: incomingState } = req.body || {};

    if (String(adminPin) !== '9999') {
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

    await sql`
      INSERT INTO competition_state (id, state, updated_at)
      VALUES (1, ${incomingState}, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        state = EXCLUDED.state,
        updated_at = NOW()
    `;

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
