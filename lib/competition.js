import { usingLocalDatabase } from './db.js';
import {
  freshSlice,
  getSport,
  isFootballLeague,
  isSportId
} from './sports.js';

// Move the old single competition into Football.
export function migrateRoot(raw) {
  if (
    raw &&
    raw.competitions &&
    typeof raw.competitions === 'object'
  ) {
    return { root: raw, migrated: false };
  }

  if (!raw || typeof raw !== 'object') {
    return {
      root: { competitions: {} },
      migrated: false
    };
  }

  const football = {
    ...raw,
    sport: 'football',
    league: raw.league || 'PL'
  };

  delete football.competitions;

  return {
    root: { competitions: { football } },
    migrated: true
  };
}

// Load the saved document and keep old data as Football.
export async function loadRoot(sql) {
  const rows = await sql`
    SELECT state
    FROM competition_state
    WHERE id = 1
  `;

  if (!rows.length || !rows[0].state) {
    return {
      root: { competitions: {} },
      missing: true
    };
  }

  const stored = rows[0].state;
  const { root, migrated } = migrateRoot(unwrapState(stored));
  const split = splitSharedFootball(root);

  if (migrated || split || typeof stored === 'string') {
    await saveRoot(sql, root);
  }

  return { root, missing: false };
}

// Turn a stored JSON string into an object.
function unwrapState(raw) {
  if (typeof raw !== 'string') {
    return raw;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Save every sport back into the same row.
export async function saveRoot(sql, root) {
  if (usingLocalDatabase) {
    await sql`
      INSERT INTO competition_state (id, state, updated_at)
      VALUES (1, ${sql.json(root)}, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        state = EXCLUDED.state,
        updated_at = NOW()
    `;
    return;
  }

  const payload = JSON.stringify(root);

  await sql`
    INSERT INTO competition_state (id, state, updated_at)
    VALUES (1, ${payload}::jsonb, NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      state = EXCLUDED.state,
      updated_at = NOW()
  `;
}

// One saved competition key. Football keeps each league apart.
export function sliceKey(sportId, league) {
  const sport = getSport(sportId || 'football');

  if (!sport) {
    return null;
  }

  if (sport.id === 'football') {
    const code = isFootballLeague(league) ? league : 'PL';
    return `football:${code}`;
  }

  return sport.id;
}

// Move a shared football save into the league it was using.
function splitSharedFootball(root) {
  const shared = root?.competitions?.football;

  if (!shared || typeof shared !== 'object') {
    return false;
  }

  const code = isFootballLeague(shared.league) ? shared.league : 'PL';
  const key = `football:${code}`;

  if (!root.competitions[key]) {
    root.competitions[key] = {
      ...shared,
      sport: 'football',
      league: code,
      resultMode: shared.resultMode || 'live'
    };
  }

  delete root.competitions.football;
  return true;
}
// Read one sport, or one football league.
export function readSlice(root, sportId, league) {
  const key = sliceKey(sportId, league);

  if (!key) {
    return null;
  }

  return root.competitions?.[key] || null;
}

// Create a sport competition when it does not exist yet.
export function ensureSlice(root, sportId, league) {
  const sport = getSport(sportId);

  if (!sport) {
    return null;
  }

  const key = sliceKey(sportId, league);

  if (!key) {
    return null;
  }

  if (!root.competitions) {
    root.competitions = {};
  }

  if (!root.competitions[key]) {
    const slice = freshSlice(sport.id);
    slice.resultMode = 'live';

    if (sport.id === 'football') {
      slice.league = isFootballLeague(league) ? league : 'PL';
    }

    root.competitions[key] = slice;
  }

  const slice = root.competitions[key];
  slice.sport = sport.id;

  if (!slice.resultMode) {
    slice.resultMode = 'live';
  }

  return slice;
}

// A competition has started when someone has already joined.
export function hasStarted(slice) {
  return Array.isArray(slice?.players) && slice.players.length > 0;
}

// Hide PINs before the data is sent to the website.
export function publicSlice(slice) {
  if (!slice) {
    return null;
  }

  const copy = structuredClone(slice);

  if (Array.isArray(copy.players)) {
    copy.players = copy.players.map(player => {
      const { pin, ...safePlayer } = player;
      return safePlayer;
    });
  }

  return copy;
}

// Keep a known sport id, or use football.
export function cleanSportId(sportId) {
  return isSportId(sportId)
    ? String(sportId).trim().toLowerCase()
    : 'football';
}

// Close selections after kickoff on the opening round.
export function markDeadline(slice) {
  if (!slice?.deadline || slice.deadlinePassed) {
    return false;
  }

  const deadlineTime = new Date(slice.deadline).getTime();

  if (
    !Number.isFinite(deadlineTime) ||
    Date.now() < deadlineTime
  ) {
    return false;
  }

  slice.deadlinePassed = true;

  const openingRound = slice.startRound == null
    ? 4
    : Number(slice.startRound);

  if (Number(slice.round) === openingRound) {
    slice.registrationClosed = true;
  }

  return true;
}
