import { sql } from '../lib/db.js';
import {
  cleanSportId,
  loadRoot,
  markDeadline,
  readSlice,
  saveRoot
} from '../lib/competition.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const sportId = cleanSportId(req.body?.sport);
    const { root, missing } = await loadRoot(sql);

    if (missing) {
      return res.status(404).json({
        error: 'Competition state not found'
      });
    }

    const slice = readSlice(root, sportId, req.body?.league);

    if (!slice) {
      return res.status(404).json({
        error: 'Competition state not found'
      });
    }

    if (!slice.deadline) {
      return res.status(200).json({
        ok: true,
        changed: false
      });
    }

    const changed = markDeadline(slice);

    if (changed) {
      await saveRoot(sql, root);
    }

    return res.status(200).json({
      ok: true,
      changed
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
