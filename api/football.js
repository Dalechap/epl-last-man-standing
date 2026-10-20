
// EPL fixtures and live scores with shared Vercel CDN caching.

export default async function handler(req, res) {
  try {
    const round = Number(req.query.round);

    if (
      !Number.isInteger(round) ||
      round < 1 ||
      round > 38
    ) {
      return res.status(400).json({
        error: 'A valid Matchweek number is required'
      });
    }

    const apiKey = process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'Football API key is not configured'
      });
    }

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/PL/matches?season=2026&matchday=${round}`,
      {
        headers: {
          'X-Auth-Token': apiKey
        }
      }
    );

    if (!response.ok) {
      // Never cache API errors or rate-limit responses.
      res.setHeader('Cache-Control', 'no-store');

      let message = 'Football data request failed';

      try {
        const errorData = await response.json();
        message = errorData.message || message;
      } catch (_) {}

      return res.status(response.status).json({
        error: message
      });
    }

    const data = await response.json();
    const matches = data.matches || [];

    const live = matches.some(match =>
      ['IN_PLAY', 'PAUSED'].includes(match.status)
    );

    const allFinished =
      matches.length > 0 &&
      matches.every(match => match.status === 'FINISHED');

    // Shorter cache during live games for fresher scores.
    // Longer cache when fixtures are idle or completed.
    const cacheSeconds = live
      ? 20
      : allFinished
        ? 600
        : 60;

    // Phones always recheck the CDN.
    res.setHeader('Cache-Control', 'no-store');

    // Vercel shares cached responses between visitors
    // requesting the same Matchweek.
    res.setHeader(
      'Vercel-CDN-Cache-Control',
      `max-age=${cacheSeconds}`
    );

    // Useful for checking which cache duration was selected.
    res.setHeader(
      'X-LMS-Cache-Seconds',
      String(cacheSeconds)
    );

    return res.status(200).json({ matches });

  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');

    return res.status(500).json({
      error: error.message || 'Unable to load EPL fixtures'
    });
  }
}
