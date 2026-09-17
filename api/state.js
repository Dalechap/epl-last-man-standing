import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const rows = await sql`
      SELECT state
      FROM competition_state
      WHERE id = 1
    `;

    if (!rows.length) {
      return res.status(200).json(null);
    }

    const publicState =
      structuredClone(rows[0].state);

    if (Array.isArray(publicState.players)) {
      publicState.players =
        publicState.players.map(player => {
          const { pin, ...safePlayer } = player;
          return safePlayer;
        });
    }

    return res.status(200).json(publicState);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
