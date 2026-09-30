import { loadSportFixtures } from '../lib/fixtures.js';

export default async function handler(req, res) {
  try {
    const round = Number(req.query.round);
    const sportId = String(req.query.sport || 'football');
    const league = String(req.query.league || 'PL');

    if (!round) {
      return res.status(400).json({
        error: 'Round number is required'
      });
    }

    const result = await loadSportFixtures(
      sportId,
      round,
      league
    );

    if (!result.ok) {
      return res.status(result.status).json({
        error: result.error,
        configured: result.configured,
        matches: []
      });
    }

    return res.status(200).json({
      matches: result.matches,
      configured: result.configured,
      error: result.configured ? null : result.error
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Unable to load fixtures'
    });
  }
}
