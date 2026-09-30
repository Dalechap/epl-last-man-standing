// Sport list, pick labels, and who stays alive.

export const SPORTS = [
  {
    id: 'football',
    label: 'Football',
    pickNoun: 'team',
    leagues: [
      { id: 'PL', label: 'Premier League' },
      { id: 'PD', label: 'La Liga' },
      { id: 'SA', label: 'Serie A' },
      { id: 'BL1', label: 'Bundesliga' },
      { id: 'FL1', label: 'Ligue 1' },
      { id: 'ELC', label: 'Championship' },
      { id: 'MLS', label: 'MLS' },
      { id: 'APL', label: 'A-League' }
    ]
  },
  { id: 'nba', label: 'NBA', pickNoun: 'team', leagues: [] },
  { id: 'nfl', label: 'NFL', pickNoun: 'team', leagues: [] },
  { id: 'tennis', label: 'Tennis', pickNoun: 'player', leagues: [] },
  { id: 'f1', label: 'Formula 1', pickNoun: 'driver', leagues: [] },
  { id: 'cricket', label: 'Cricket', pickNoun: 'team', leagues: [] },
  { id: 'mlb', label: 'MLB', pickNoun: 'team', leagues: [] },
  { id: 'nhl', label: 'NHL', pickNoun: 'team', leagues: [] },
  { id: 'afl', label: 'AFL', pickNoun: 'team', leagues: [] },
  { id: 'nrl', label: 'NRL', pickNoun: 'team', leagues: [] },
  { id: 'rugby', label: 'Rugby Union', pickNoun: 'team', leagues: [] },
  { id: 'superleague', label: 'Super League', pickNoun: 'team', leagues: [] }
];

// Find a sport from the allowed list.
export function getSport(sportId) {
  const id = String(sportId || '').trim().toLowerCase();
  return SPORTS.find(sport => sport.id === id) || null;
}

// True when the id is a known sport.
export function isSportId(sportId) {
  return Boolean(getSport(sportId));
}

// True when the league code is a football league we support.
export function isFootballLeague(leagueId) {
  const sport = getSport('football');
  return sport.leagues.some(league => league.id === leagueId);
}

// Empty competition for one sport.
export function freshSlice(sportId) {
  const sport = getSport(sportId);

  return {
    sport: sport.id,
    league: sport.id === 'football' ? 'PL' : null,
    round: 1,
    startRound: 1,
    registrationClosed: false,
    selectedPlayer: '',
    deadlinePassed: false,
    deadline: null,
    roundProcessed: false,
    results: {},
    fixtures: {},
    players: [],
    processSnapshot: null,
    resultMode: 'live'
  };
}

// Decide if this result keeps the player in the game.
export function outcomeSurvives(sportId, outcome) {
  if (sportId === 'football') {
    return outcome === 'win' || outcome === 'zero-away';
  }

  if (sportId === 'cricket') {
    return outcome === 'win' || outcome === 'no-result';
  }

  return outcome === 'win';
}

// Turn a finished football match into a result for one pick.
export function footballOutcome(team, match) {
  const home = match.score?.fullTime?.home;
  const away = match.score?.fullTime?.away;

  if (home == null || away == null) {
    return null;
  }

  if (home === 0 && away === 0) {
    return match.awayTeam?.name === team
      ? 'zero-away'
      : 'zero-home';
  }

  if (home === away) {
    return 'score-draw';
  }

  const winner = home > away
    ? match.homeTeam?.name
    : match.awayTeam?.name;

  return winner === team ? 'win' : 'loss';
}

// Turn a finished match into a win, loss, or draw for one pick.
export function scoreOutcome(sportId, team, match) {
  if (sportId === 'football') {
    return footballOutcome(team, match);
  }

  if (match?.status === 'NO_RESULT' && sportId === 'cricket') {
    return 'no-result';
  }

  if (sportId === 'f1') {
    if (match?.status !== 'FINISHED') {
      return null;
    }

    return String(match.position) === '1' ? 'win' : 'loss';
  }

  const home = match.score?.fullTime?.home;
  const away = match.score?.fullTime?.away;

  if (home == null || away == null) {
    return null;
  }

  const isHome = match.homeTeam?.name === team;
  const isAway = match.awayTeam?.name === team;

  if (!isHome && !isAway) {
    return null;
  }

  const mine = isHome ? home : away;
  const theirs = isHome ? away : home;

  if (mine > theirs) {
    return 'win';
  }

  if (mine < theirs) {
    return 'loss';
  }

  return 'score-draw';
}
