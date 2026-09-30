import { sql } from '../lib/db.js';
import {
  outcomeSurvives,
  scoreOutcome
} from '../lib/sports.js';
import {
  loadRoot,
  markDeadline,
  saveRoot
} from '../lib/competition.js';
import { loadSportFixtures } from '../lib/fixtures.js';

// Apply finished matches and open the next round for one sport.
async function processSlice(slice, sportId) {
  let changed = false;

  if (markDeadline(slice)) {
    changed = true;
  }

  if (!slice.deadlinePassed) {
    return { changed, openedNext: false };
  }

  if (slice.roundProcessed) {
    return { changed: false, openedNext: false };
  }

  if (slice.resultMode === 'manual') {
    return { changed, openedNext: false };
  }

  const loaded = await loadSportFixtures(
    slice.sport || sportId,
    slice.round,
    slice.league || 'PL'
  );

  if (!loaded.ok) {
    return {
      changed,
      openedNext: false,
      error: loaded.error
    };
  }

  const matches = loaded.matches;
  slice.results = slice.results || {};

  const active = (slice.players || []).filter(
    player => player.alive
  );
  const pickedTeams = [
    ...new Set(
      active
        .map(player => player.picks?.[slice.round])
        .filter(Boolean)
    )
  ];

  for (const team of pickedTeams) {
    const match = matches.find(
      item =>
        item.homeTeam?.name === team ||
        item.awayTeam?.name === team
    );

    if (!match || match.status !== 'FINISHED') {
      continue;
    }

    const result = scoreOutcome(
      slice.sport || sportId,
      team,
      match
    );

    if (!result) {
      continue;
    }

    if (slice.results[team] !== result) {
      slice.results[team] = result;
      changed = true;
    }
  }

  const allPickedMatchesFinished = pickedTeams.every(team => {
    const match = matches.find(
      item =>
        item.homeTeam?.name === team ||
        item.awayTeam?.name === team
    );

    return match && match.status === 'FINISHED';
  });

  if (!allPickedMatchesFinished) {
    return { changed, openedNext: false };
  }

  const wouldEliminate = [];

  for (const player of active) {
    const pick = player.picks?.[slice.round];

    if (!pick || !outcomeSurvives(sportId, slice.results[pick])) {
      wouldEliminate.push(player);
    }
  }

  slice.processSnapshot = {
    alive: Object.fromEntries(
      slice.players.map(player => [player.name, player.alive])
    ),
    eliminatedRound: Object.fromEntries(
      slice.players.map(player => [
        player.name,
        player.eliminatedRound || null
      ])
    ),
    results: { ...slice.results }
  };

  if (
    wouldEliminate.length !== active.length ||
    active.length === 0
  ) {
    for (const player of wouldEliminate) {
      player.alive = false;
      player.eliminatedRound = slice.round;
    }
  }

  slice.roundProcessed = true;
  changed = true;

  const survivors = slice.players.filter(player => player.alive);

  if (survivors.length === 1) {
    return {
      changed: true,
      openedNext: false,
      winner: survivors[0].name
    };
  }

  const nextRound = Number(slice.round) + 1;
  const nextLoaded = await loadSportFixtures(
    slice.sport || sportId,
    nextRound,
    slice.league || 'PL'
  );

  if (!nextLoaded.ok || !nextLoaded.matches.length) {
    return { changed: true, openedNext: false };
  }

  if (!slice.fixtures || Array.isArray(slice.fixtures)) {
    slice.fixtures = {};
  }

  slice.round = nextRound;
  slice.fixtures[nextRound] = nextLoaded.matches.map(match => ({
    home: match.homeTeam?.name || match.name,
    away: match.awayTeam?.name || '',
    homeCrest: match.homeTeam?.crest || '',
    awayCrest: match.awayTeam?.crest || '',
    kickoff: match.utcDate,
    kind: match.kind || 'match',
    position: match.position || null
  }));

  const kickoffTimes = slice.fixtures[nextRound]
    .map(fixture => new Date(fixture.kickoff).getTime())
    .filter(Number.isFinite);

  slice.deadline = kickoffTimes.length
    ? new Date(Math.min(...kickoffTimes)).toISOString()
    : null;
  slice.deadlinePassed = false;
  slice.roundProcessed = false;
  slice.results = {};
  slice.processSnapshot = null;

  return { changed: true, openedNext: true };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { root, missing } = await loadRoot(sql);

    if (missing) {
      return res.status(404).json({
        error: 'Competition state not found'
      });
    }

    let changed = false;
    let openedNext = false;
    let winner = null;

    for (const slice of Object.values(root.competitions || {})) {
      if (!slice || typeof slice !== 'object' || !slice.sport) {
        continue;
      }

      const result = await processSlice(slice, slice.sport);

      if (result.changed) {
        changed = true;
      }

      if (result.openedNext) {
        openedNext = true;
      }

      if (result.winner) {
        winner = result.winner;
      }
    }

    if (changed) {
      await saveRoot(sql, root);
    }

    if (openedNext) {
      try {
        await fetch(
          'https://lastmanstandingsports.com/api/notifications',
          { method: 'POST' }
        );
      } catch (error) {
        console.error(
          'New Matchweek notification trigger failed:',
          error
        );
      }
    }

    return res.status(200).json({
      ok: true,
      changed,
      winner,
      deadlinePassed: true,
      roundProcessed: changed
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
