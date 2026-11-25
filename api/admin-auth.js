import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { pin } = req.body || {};

    const cleanPin = String(pin || '').trim();
    const adminPin = String(process.env.ADMIN_PIN || '').trim();

    if (!adminPin) {
      return res.status(500).json({
        error: 'Admin PIN is not configured'
      });
    }

    if (cleanPin !== adminPin) {
      return res.status(403).json({
        error: 'Incorrect Admin PIN'
      });
    }

   const rows = await sql`
  SELECT code
  FROM competition_access
  WHERE id = 1
`;

return res.status(200).json({
  ok: true,
  competitionCode: rows[0]?.code || null
});

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
