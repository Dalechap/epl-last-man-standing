import { sql } from '../lib/db.js';
import { loadRoot, readSlice } from '../lib/competition.js';
import { freshSlice } from '../lib/sports.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.body || {};
    const clean = String(code || '').trim().toLowerCase();

    if (!clean) {
      return res.status(400).json({ ok: false, error: 'Enter a competition code.' });
    }

    const { root } = await loadRoot(sql);
    const appCode = String(root?.code || 'lmsmw8').trim().toLowerCase();

    // 1. Check against root app code stored in database
    if (clean === appCode || clean === 'lmsmw8') {
      const slice = readSlice(root, 'football', 'PL') || freshSlice('football');
      return res.status(200).json({
        ok: true,
        code: root?.code || 'lmsmw8',
        isAppCode: true,
        sport: slice.sport || 'football',
        league: slice.league || 'PL'
      });
    }

    // 2. Check against any competition slice code
    for (const slice of Object.values(root?.competitions || {})) {
      if (slice?.code && String(slice.code).trim().toLowerCase() === clean) {
        return res.status(200).json({
          ok: true,
          code: slice.code,
          isAppCode: false,
          sport: slice.sport || 'football',
          league: slice.league || null
        });
      }
    }

    // 3. Check standard sport codes (EPL, NFL, NRL, AFL)
    if (clean === 'epl' || clean === 'pl') {
      return res.status(200).json({ ok: true, code: 'EPL', isAppCode: false, sport: 'football', league: 'PL' });
    }
    if (clean === 'nfl') {
      return res.status(200).json({ ok: true, code: 'NFL', isAppCode: false, sport: 'nfl', league: null });
    }
    if (clean === 'nrl') {
      return res.status(200).json({ ok: true, code: 'NRL', isAppCode: false, sport: 'nrl', league: null });
    }
    if (clean === 'afl') {
      return res.status(200).json({ ok: true, code: 'AFL', isAppCode: false, sport: 'afl', league: null });
    }

    return res.status(403).json({
      ok: false,
      error: 'Incorrect competition code.'
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return res.status(500).json({ error: error.message });
  }
}
