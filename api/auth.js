import { sql } from '../lib/db.js';
import {
  cleanSportId,
  loadRoot,
  readSlice
} from '../lib/competition.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { playerName, pin } = req.body || {};
    const sportId = cleanSportId(req.body?.sport);
    const cleanName = String(playerName || '').trim();
    const cleanPin = String(pin || '').trim();

    if (!cleanName || !/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({
        error: 'Player name and 4-digit PIN are required'
      });
    }

    const { root, missing } = await loadRoot(sql);
    const slice = missing
      ? null
      : readSlice(root, sportId, req.body?.league);
    const players = Array.isArray(slice?.players)
      ? slice.players
      : [];

    const player = players.find(
      item => item.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (!player) {
      return res.status(404).json({
        error: 'Player not found'
      });
    }

    if (String(player.pin) !== cleanPin) {
      return res.status(403).json({
        error: 'Incorrect PIN'
      });
    }

    if (player.alive !== true) {
      return res.status(403).json({
        error: 'Player has been eliminated'
      });
    }

    return res.status(200).json({
      ok: true,
      playerName: player.name,
      sport: sportId
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
