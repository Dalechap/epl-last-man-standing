import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    const rows = await sql`
      SELECT state
      FROM competition_state
      WHERE id = 1
    `;

    if (!rows.length) {
      return res.status(404).json({ error: 'Competition state not found' });
    }

    const state = rows[0].state;

    if (!state || state.roundProcessed || !state.deadlinePassed) {
      return res.status(200).json({
        ok: true,
        message: 'No result update required'
      });
    }

    const apiKey = process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'Football API key is not configured'
      });
    }

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/PL/matches?season=2026&matchday=${state.round}`,
      {
        headers: {
          'X-Auth-Token': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Football API error: ${response.status}`);
    }

    const data = await response.json();
    const matches = data.matches || [];

    state.results = state.results || {};

    const active = state.players.filter(p => p.alive);

    for (const p of active) {
      const team = p.picks?.[state.round];

      if (!team) continue;

      const match = matches.find(
        m =>
          m.homeTeam?.name === team ||
          m.awayTeam?.name === team
      );

      if (!match || match.status !== 'FINISHED') continue;

      const home = match.score?.fullTime?.home;
      const away = match.score?.fullTime?.away;

      if (home == null || away == null) continue;

      if (home === 0 && away === 0) {
        state.results[team] =
          match.awayTeam.name === team
            ? 'zero-away'
            : 'zero-home';
      } else if (home === away) {
        state.results[team] = 'score-draw';
      } else {
        const winner =
          home > away
            ? match.homeTeam.name
            : match.awayTeam.name;

        state.results[team] =
          winner === team ? 'win' : 'loss';
      }
    }

    await sql`
      UPDATE competition_state
      SET state = ${state},
          updated_at = NOW()
      WHERE id = 1
    `;

    return res.status(200).json({
      ok: true,
      message: 'Results checked and updated'
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
