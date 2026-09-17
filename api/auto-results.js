import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

function outcomeSurvives(outcome) {
  return outcome === 'win' || outcome === 'zero-away';
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const rows = await sql`
      SELECT state
      FROM competition_state
      WHERE id = 1
    `;

    if (!rows.length) {
      return res.status(404).json({
        error: 'Competition state not found'
      });
    }

    const state = rows[0].state;

    if (
      !state ||
      state.roundProcessed ||
      !state.deadlinePassed
    ) {
      return res.status(200).json({
        ok: true,
        changed: false,
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
      throw new Error(
        `Football API error: ${response.status}`
      );
    }

    const data = await response.json();
    const matches = data.matches || [];

    state.results = state.results || {};

    const active =
      state.players.filter(p => p.alive);

    const pickedTeams = [
      ...new Set(
        active
          .map(p => p.picks?.[state.round])
          .filter(Boolean)
      )
    ];

    let changed = false;

    for (const team of pickedTeams) {
      const match = matches.find(
        m =>
          m.homeTeam?.name === team ||
          m.awayTeam?.name === team
      );

      if (!match || match.status !== 'FINISHED') {
        continue;
      }

      const home =
        match.score?.fullTime?.home;

      const away =
        match.score?.fullTime?.away;

      if (home == null || away == null) {
        continue;
      }

      let result;

      if (home === 0 && away === 0) {
        result =
          match.awayTeam.name === team
            ? 'zero-away'
            : 'zero-home';
      } else if (home === away) {
        result = 'score-draw';
      } else {
        const winner =
          home > away
            ? match.homeTeam.name
            : match.awayTeam.name;

        result =
          winner === team
            ? 'win'
            : 'loss';
      }

      if (state.results[team] !== result) {
        state.results[team] = result;
        changed = true;
      }
    }

    const allPickedMatchesFinished =
      pickedTeams.every(team => {
        const match = matches.find(
          m =>
            m.homeTeam?.name === team ||
            m.awayTeam?.name === team
        );

        return (
          match &&
          match.status === 'FINISHED'
        );
      });

    if (allPickedMatchesFinished) {
      const wouldEliminate = [];

      for (const player of active) {
        const pick =
          player.picks?.[state.round];

        if (
          !pick ||
          !outcomeSurvives(
            state.results[pick]
          )
        ) {
          wouldEliminate.push(player);
        }
      }

      state.processSnapshot = {
        alive: Object.fromEntries(
          state.players.map(
            p => [p.name, p.alive]
          )
        ),
        eliminatedRound:
          Object.fromEntries(
            state.players.map(
              p => [
                p.name,
                p.eliminatedRound || null
              ]
            )
          ),
        results: {
          ...state.results
        }
      };

      // Special rule:
      // if everybody fails, everybody survives.
      if (
        wouldEliminate.length !== active.length ||
        active.length === 0
      ) {
        for (const player of wouldEliminate) {
          player.alive = false;
          player.eliminatedRound =
            state.round;
        }
      }

      state.roundProcessed = true;
      changed = true;
    }

    if (changed) {
      await sql`
        UPDATE competition_state
        SET state = ${state},
            updated_at = NOW()
        WHERE id = 1
      `;
    }

    return res.status(200).json({
      ok: true,
      changed,
      roundProcessed:
        state.roundProcessed === true
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
