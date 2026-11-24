import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const history = await sql`
      SELECT
        id,
        start_round,
        final_round,
        winner,
        participants,
        completed_at
      FROM competition_history
      ORDER BY id DESC
    `;

    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      history
    });

  } catch (error) {
    console.error('Competition history:', error);

    return res.status(500).json({
      error: 'Unable to load competition history'
    });
  }
}
