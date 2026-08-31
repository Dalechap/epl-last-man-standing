export default async function handler(req, res) {
  try {
    const round = Number(req.query.matchday);

    if (!round) {
      return res.status(400).json({ error: 'Round number is required' });
    }

    const apiKey = process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Football API key is not configured' });
    }

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/PL/matches?matchday=${round}`,
      {
        headers: {
          'X-Auth-Token': apiKey
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Football-Data request failed'
      });
    }

    return res.status(200).json({
      matches: data.matches || []
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Unable to load EPL fixtures'
    });
  }
}
