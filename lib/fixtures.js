import { isFootballLeague } from './sports.js';

const PUBLIC_LEAGUES = {
  football: {
    PL: '4328',
    PD: '4335',
    SA: '4332',
    BL1: '4331',
    FL1: '4334',
    ELC: '4329',
    MLS: '4346',
    APL: '4356'
  },
  nba: '4387',
  nfl: '4391',
  mlb: '4424',
  nhl: '4380',
  afl: '4456',
  nrl: '4416',
  rugby: '4414',
  superleague: '4415'
};

const CALENDAR_SEASONS = new Set([
  '4391',
  '4424',
  '4456',
  '4416',
  '4415'
]);

const seasonByLeague = new Map();

// Season labels to try, newest first.
function seasonChoices(leagueId) {
  const year = new Date().getUTCFullYear();

  if (CALENDAR_SEASONS.has(String(leagueId))) {
    return [String(year), String(year - 1)];
  }

  return [
    `${year}-${year + 1}`,
    `${year - 1}-${year}`,
    String(year)
  ];
}

// Use the same match shape the pick screen already expects.
function publicMatch(event) {
  const stamp = event.strTimestamp || '';
  const kickoff = stamp
    ? (stamp.endsWith('Z') ? stamp : `${stamp}Z`)
    : null;
  const home = Number(event.intHomeScore);
  const away = Number(event.intAwayScore);
  const finished = event.strStatus === 'FT'
    || event.strStatus === 'AET'
    || event.strStatus === 'PEN';

  return {
    status: finished ? 'FINISHED' : (event.strStatus || 'SCHEDULED'),
    utcDate: kickoff,
    homeTeam: {
      name: event.strHomeTeam,
      crest: event.strHomeTeamBadge || ''
    },
    awayTeam: {
      name: event.strAwayTeam,
      crest: event.strAwayTeamBadge || ''
    },
    score: {
      fullTime: {
        home: Number.isFinite(home) ? home : null,
        away: Number.isFinite(away) ? away : null
      }
    }
  };
}

// Read one public matchweek.
async function fetchPublicRound(leagueId, round, season) {
  const url =
    `https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=${leagueId}&r=${round}&s=${encodeURIComponent(season)}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return [];
  }

  return (data.events || [])
    .filter(event => event.strHomeTeam && event.strAwayTeam)
    .map(publicMatch);
}

// Load fixtures from the public sports list.
async function loadByLeagueId(leagueId, round) {
  const saved = seasonByLeague.get(leagueId);
  const seasons = saved ? [saved] : seasonChoices(leagueId);

  for (const season of seasons) {
    const matches = await fetchPublicRound(leagueId, round, season);

    if (matches.length) {
      seasonByLeague.set(leagueId, season);

      return {
        ok: true,
        status: 200,
        configured: true,
        matches,
        error: null
      };
    }
  }

  return {
    ok: true,
    status: 200,
    configured: true,
    matches: [],
    error: null
  };
}

// Empty list for a sport that has no public fixture feed yet.
function emptyFixtures() {
  return {
    ok: true,
    status: 200,
    configured: true,
    matches: [],
    error: null
  };
}

// Load football matches for one league and matchweek.
export async function loadFootballMatches(league, round) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  const code = isFootballLeague(league) ? league : 'PL';

  if (!apiKey) {
    const leagueId = PUBLIC_LEAGUES.football[code]
      || PUBLIC_LEAGUES.football.PL;

    return loadByLeagueId(leagueId, round);
  }

  const response = await fetch(
    `https://api.football-data.org/v4/competitions/${code}/matches?season=2026&matchday=${round}`,
    {
      headers: {
        'X-Auth-Token': apiKey
      }
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      configured: true,
      matches: [],
      error: data.message || 'Football-Data request failed'
    };
  }

  return {
    ok: true,
    status: 200,
    configured: true,
    matches: data.matches || [],
    error: null
  };
}

// Turn a public event into a home-versus-away match.
function eventPlayers(event) {
  if (event.strHomeTeam && event.strAwayTeam) {
    return publicMatch(event);
  }

  const title = String(event.strEvent || '');
  const split = title.split(' vs ');

  if (split.length < 2) {
    return null;
  }

  const away = split.pop().trim();
  const home = split.join(' vs ').trim().split(' ').slice(-2).join(' ');

  if (!home || !away) {
    return null;
  }

  return publicMatch({
    ...event,
    strHomeTeam: home,
    strAwayTeam: away,
    strHomeTeamBadge: '',
    strAwayTeamBadge: ''
  });
}

// Load one public season of events.
async function fetchSeason(leagueId, season) {
  const url =
    `https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=${leagueId}&s=${encodeURIComponent(season)}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return [];
  }

  return data.events || [];
}

// Load cricket matches for the asked round.
async function loadCricketRound(round) {
  const seasons = seasonChoices('4461');

  for (const season of seasons) {
    const events = await fetchSeason('4461', season);
    const matches = events
      .filter(event => String(event.intRound) === String(round))
      .map(publicMatch)
      .filter(match => match.homeTeam.name);

    if (matches.length) {
      return {
        ok: true,
        status: 200,
        configured: true,
        matches,
        error: null
      };
    }
  }

  return emptyFixtures();
}

// Load tennis matches for the asked round.
async function loadTennisRound(round) {
  const seasons = ['2026', '2025'];

  for (const season of seasons) {
    const events = await fetchSeason('4464', season);
    const matches = events
      .filter(event => String(event.intRound) === String(round))
      .map(eventPlayers)
      .filter(Boolean);

    if (matches.length) {
      return {
        ok: true,
        status: 200,
        configured: true,
        matches,
        error: null
      };
    }
  }

  return emptyFixtures();
}

// Load the drivers who finished a Formula 1 round.
async function loadF1Round(round) {
  let race = null;

  try {
    const events = await fetchSeason('4370', '2026');
    race = events.find(event => {
      const name = String(event.strEvent || '');

      return String(event.intRound) === String(round)
        && name.includes('Grand Prix')
        && !/Practice|Qualifying|Sprint|Testing/i.test(name);
    }) || null;
  } catch {
    race = null;
  }

  if (!race && String(round) === '1') {
    race = {
      idEvent: '2408111',
      strEvent: 'Australian Grand Prix',
      strStatus: 'FT',
      strTimestamp: '2026-03-08T05:00:00'
    };
  }

  if (!race?.idEvent && String(round) !== '1') {
    return emptyFixtures();
  }

  let results = [];

  if (race?.idEvent) {
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/eventresults.php?id=${race.idEvent}`
    );
    const data = await response.json().catch(() => ({}));
    results = data.results || [];
  }

  let grid = [];

  try {
    const gridResponse = await fetch(
      'https://api.jolpi.ca/ergast/f1/2026/drivers/'
    );
    const gridData = await gridResponse.json().catch(() => ({}));
    grid = gridData?.MRData?.DriverTable?.Drivers || [];
  } catch {
    grid = [];
  }
  const finishByName = new Map(
    results.map(result => [
      String(result.strPlayer || '').toLowerCase(),
      result.intPosition
    ])
  );

  const drivers = grid.filter(driver => driver.permanentNumber);
  const source = drivers.length
    ? drivers.map(driver => {
        const name = `${driver.givenName} ${driver.familyName}`;
        const position = finishByName.get(name.toLowerCase())
          || finishByName.get(String(driver.familyName || '').toLowerCase())
          || null;

        return { name, position };
      })
    : results
      .filter(result => result.strPlayer)
      .map(result => ({
        name: result.strPlayer,
        position: result.intPosition
      }));

  const matches = source.map(driver => ({
    status: race?.strStatus === 'FT' ? 'FINISHED' : 'SCHEDULED',
    utcDate: race?.strTimestamp
      ? (String(race.strTimestamp).endsWith('Z')
        ? race.strTimestamp
        : `${race.strTimestamp}Z`)
      : null,
    kind: 'entry',
    position: driver.position,
    homeTeam: {
      name: driver.name,
      crest: ''
    },
    awayTeam: {
      name: race?.strEvent || 'Formula 1',
      crest: ''
    },
    score: { fullTime: { home: null, away: null } }
  }));

  if (!matches.length) {
    return emptyFixtures();
  }

  return {
    ok: true,
    status: 200,
    configured: true,
    matches,
    error: null
  };
}

// Load fixtures for the sport that is open.
export async function loadSportFixtures(sportId, round, league) {
  if (sportId === 'football') {
    return loadFootballMatches(league || 'PL', round);
  }

  if (sportId === 'f1') {
    return loadF1Round(round);
  }

  if (sportId === 'tennis') {
    return loadTennisRound(round);
  }

  if (sportId === 'cricket') {
    return loadCricketRound(round);
  }

  const leagueId = PUBLIC_LEAGUES[sportId];

  if (!leagueId || typeof leagueId !== 'string') {
    return emptyFixtures();
  }

  return loadByLeagueId(leagueId, round);
}
