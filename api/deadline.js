import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
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

    if (!state.deadline) {
      return res.status(200).json({
        ok: true,
        changed: false
      });
    }

    const deadlineTime =
      new Date(state.deadline).getTime();

    if (
      !Number.isFinite(deadlineTime) ||
      Date.now() < deadlineTime
    ) {
      return res.status(200).json({
        ok: true,
        changed: false
      });
    }

    if (state.deadlinePassed === true) {
      return res.status(200).json({
        ok: true,
        changed: false
      });
    }

    state.deadlinePassed = true;

    if (Number(state.round) === 4) {
      state.registrationClosed = true;
    }

    await sql`
      UPDATE competition_state
      SET state = ${state},
          updated_at = NOW()
      WHERE id = 1
    `;

    return res.status(200).json({
      ok: true,
      changed: true
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
