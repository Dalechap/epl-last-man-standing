import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT state
        FROM competition_state
        WHERE id = 1
      `;

      return res.status(200).json(
        rows.length ? rows[0].state : null
      );
    }

    if (req.method === 'POST') {
      const state = req.body;

      await sql`
        INSERT INTO competition_state (id, state, updated_at)
        VALUES (1, ${state}, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          state = EXCLUDED.state,
          updated_at = NOW()
      `;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
