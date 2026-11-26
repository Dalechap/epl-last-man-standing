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

    const { root, missing } = await loadRoot(sql);

    if (req.query.code && !missing) {
      const searchCode = String(req.query.code).trim().toLowerCase();
      const rootAppCode = String(root?.code || 'lmsmw8').trim().toLowerCase();
      if (searchCode === rootAppCode) {
        const slice = readSlice(root, 'football', 'PL') || freshSlice('football');
        const pub = publicSlice(slice);
        pub.appCode = root?.code || 'lmsmw8';
        return res.status(200).json(pub);
      }
      for (const slice of Object.values(root.competitions || {})) {
        if (slice?.code && String(slice.code).trim().toLowerCase() === searchCode) {
          const pub = publicSlice(slice);
          pub.appCode = root?.code || 'lmsmw8';
          return res.status(200).json(pub);
        }
      }
      if (searchCode === 'epl' || searchCode === 'pl' || searchCode === 'lmsmw8') {
        const slice = readSlice(root, 'football', 'PL') || freshSlice('football');
        const pub = publicSlice(slice);
        pub.appCode = root?.code || 'lmsmw8';
        return res.status(200).json(pub);
      }
      if (['nfl', 'nrl', 'afl'].includes(searchCode)) {
        const slice = readSlice(root, searchCode, null) || freshSlice(searchCode);
        const pub = publicSlice(slice);
        pub.appCode = root?.code || 'lmsmw8';
        return res.status(200).json(pub);
      }
    }

    const sportId = cleanSportId(req.query.sport);

    if (missing) {
      const pub = publicSlice(freshSlice(sportId));
      pub.appCode = root?.code || 'lmsmw8';
      return res.status(200).json(pub);
    }

    const base = freshSlice(sportId);
    const existing = readSlice(root, sportId, req.query.league);
    const slice = {
      ...base,
      ...(existing || {}),
      players: Array.isArray(existing?.players) ? existing.players : [],
      fixtures: (existing?.fixtures && typeof existing.fixtures === 'object') ? existing.fixtures : {},
      results: (existing?.results && typeof existing.results === 'object') ? existing.results : {}
    };

    if (sportId === 'football' && req.query.league) {
      slice.league = String(req.query.league);
    }

    const pub = publicSlice(slice);
    if (pub) {
      pub.appCode = root?.code || 'lmsmw8';
      if (!pub.code) {
        pub.code = root?.code || 'lmsmw8';
      }
    }

    return res.status(200).json(pub);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
