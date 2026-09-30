import { sql } from '../lib/db.js';
import {
  cleanSportId,
  ensureSlice,
  loadRoot,
  publicSlice,
  saveRoot
} from '../lib/competition.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { name, pin } = req.body || {};
    const sportId = cleanSportId(req.body?.sport);
    const league = req.body?.league;
    const cleanName = String(name || '').trim();
    const cleanPin = String(pin || '').trim();

    if (!cleanName || !/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({
        error: 'A name and 4-digit PIN are required'
      });
    }

    const { root } = await loadRoot(sql);
    const slice = ensureSlice(root, sportId, league);

    if (!slice) {
      return res.status(400).json({
        error: 'Unknown sport'
      });
    }

    if (
      slice.registrationClosed ||
      slice.deadlinePassed
    ) {
      return res.status(403).json({
        error: 'Registration is closed. The competition has already started.'
      });
    }

    const players = Array.isArray(slice.players)
      ? slice.players
      : [];

    if (
      players.some(
        player => player.name.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      return res.status(409).json({
        error: 'That player name is already in the competition'
      });
    }

    slice.players = [
      ...players,
      {
        name: cleanName,
        pin: cleanPin,
        alive: true,
        picks: {},
        used: [],
        eliminatedRound: null
      }
    ];

    await saveRoot(sql, root);

    return res.status(200).json({
      ok: true,
      state: publicSlice(slice)
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
