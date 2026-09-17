import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {

    // GET — return competition state without player PINs
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT state
        FROM competition_state
        WHERE id = 1
      `;

      if (!rows.length) {
        return res.status(200).json(null);
      }

      const publicState = structuredClone(rows[0].state);

      if (Array.isArray(publicState.players)) {
        publicState.players =
          publicState.players.map(player => {
            const { pin, ...safePlayer } = player;
            return safePlayer;
          });
      }

      return res.status(200).json(publicState);
    }


    // POST — update state while preserving PINs already stored on server
    if (req.method === 'POST') {
      const incomingState = req.body;

      const rows = await sql`
        SELECT state
        FROM competition_state
        WHERE id = 1
      `;

      const existingState =
        rows.length ? rows[0].state : null;

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

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
