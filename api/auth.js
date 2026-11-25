import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { playerName, pin } = req.body || {};

    const cleanName = String(playerName || '').trim();
    const cleanPin = String(pin || '').trim();

    if (!cleanName || !/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({
        error: 'Player name and 4-digit PIN are required'
      });
    }

   const rows = await sql`
  SELECT name, pin
  FROM player_profiles
  WHERE name_key = lower(${cleanName}::text)
  LIMIT 1
`;

    if (!rows.length) {
      return res.status(404).json({
        error: 'Player not found'
      });
    }

    const player = rows[0];

    if (String(player.pin) !== cleanPin) {
      return res.status(403).json({
        error: 'Incorrect PIN'
      });
    }

    return res.status(200).json({
      ok: true,
      playerName: player.name
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
