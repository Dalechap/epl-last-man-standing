import { sql } from '../lib/db.js';
import { currentAdminPin } from './admin-auth.js';
import {
  cleanSportId,
  loadRoot,
  readSlice,
  saveRoot,
  sliceKey
} from '../lib/competition.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { adminPin, state: incomingState } = req.body || {};

    if (String(adminPin) !== currentAdminPin()) {
      return res.status(403).json({
        error: 'Incorrect Admin PIN'
      });
    }

    if (!incomingState || typeof incomingState !== 'object') {
      return res.status(400).json({
        error: 'Competition state is required'
      });
    }

    const sportId = cleanSportId(
      req.body?.sport || incomingState.sport
    );
    const league = req.body?.league || incomingState.league;
    const { root } = await loadRoot(sql);
    const existingSlice = readSlice(root, sportId, league);
    const nextSlice = {
      ...incomingState,
      sport: sportId,
      league: sportId === 'football'
        ? (league || existingSlice?.league || 'PL')
        : incomingState.league || null,
      resultMode: incomingState.resultMode === 'manual'
        ? 'manual'
        : 'live'
    };

    delete nextSlice.competitions;

    if (
      existingSlice &&
      Array.isArray(existingSlice.players) &&
      Array.isArray(nextSlice.players)
    ) {
      nextSlice.players = nextSlice.players.map(player => {
        const existingPlayer = existingSlice.players.find(
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

    if (!root.competitions) {
      root.competitions = {};
    }

    root.competitions[sliceKey(sportId, nextSlice.league)] = nextSlice;
    await saveRoot(sql, root);

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
