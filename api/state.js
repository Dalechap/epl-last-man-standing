import { sql } from '../lib/db.js';
import {
  cleanSportId,
  loadRoot,
  publicSlice,
  readSlice
} from '../lib/competition.js';
import { freshSlice } from '../lib/sports.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const sportId = cleanSportId(req.query.sport);
    const { root, missing } = await loadRoot(sql);

    if (missing) {
      return res.status(200).json(publicSlice(freshSlice(sportId)));
    }

    const slice = readSlice(root, sportId, req.query.league)
      || freshSlice(sportId);

    if (sportId === 'football' && req.query.league) {
      slice.league = String(req.query.league);
    }

    return res.status(200).json(publicSlice(slice));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
