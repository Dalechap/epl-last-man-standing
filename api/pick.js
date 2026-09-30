import { sql } from '../lib/db.js';
import {
  cleanSportId,
  loadRoot,
  publicSlice,
  readSlice,
  saveRoot
} from '../lib/competition.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { playerName, team, round, pin } = req.body || {};
    const sportId = cleanSportId(req.body?.sport);

    if (!playerName || !team || !round || !pin) {
      return res.status(400).json({
        error: 'playerName, team, round and PIN are required'
      });
    }

    const { root, missing } = await loadRoot(sql);

    if (missing) {
      return res.status(404).json({
        error: 'Competition not found'
      });
    }

    const slice = readSlice(root, sportId, req.body?.league);

    if (!slice) {
      return res.status(404).json({
        error: 'Competition not found'
      });
    }

    const deadlineReached =
      !slice.keepPicksOpen &&
      (
        slice.deadlinePassed === true ||
        (
          slice.deadline &&
          new Date(slice.deadline).getTime() <= Date.now()
        )
      );

    if (deadlineReached) {
      return res.status(409).json({
        error: 'Selections are closed'
      });
    }

    if (String(slice.round) !== String(round)) {
      return res.status(409).json({
        error: 'Competition round has changed. Please refresh.'
      });
    }

    const player = (slice.players || []).find(
      item => item.name === playerName
    );

    if (!player) {
      return res.status(404).json({
        error: 'Player not found'
      });
    }

    if (String(player.pin) !== String(pin)) {
      return res.status(403).json({
        error: 'Incorrect PIN'
      });
    }

    const usedTeams = Array.isArray(player.used)
      ? player.used
      : [];
    const roundKey = String(round);
    const currentPick = player.picks?.[roundKey] || null;

    if (
      usedTeams.includes(team) &&
      currentPick !== team
    ) {
      return res.status(409).json({
        error: 'You have already used that team'
      });
    }

    const nextUsed = usedTeams.filter(
      value => value !== currentPick && value !== team
    );

    nextUsed.push(team);
    player.used = nextUsed;
    player.picks = {
      ...(player.picks || {}),
      [roundKey]: team
    };

    await saveRoot(sql, root);

    return res.status(200).json({
      ok: true,
      state: publicSlice(slice)
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
