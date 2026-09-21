import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return res.status(500).json({
        error: 'VAPID keys are not configured'
      });
    }

    webpush.setVapidDetails(
      'https://lastmanstandingsports.com',
      publicKey,
      privateKey
    );

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
        sent: 0,
        reason: 'No deadline'
      });
    }

    if (state.roundProcessed) {
      return res.status(200).json({
        ok: true,
        sent: 0,
        reason: 'Matchweek already processed'
      });
    }

/*
  Send the New Matchweek notification once
  to every subscribed player who is still alive.
*/
const alivePlayers =
  Array.isArray(state.players)
    ? state.players.filter(
        player => player.alive === true
      )
    : [];

for (const player of alivePlayers) {
  const subscriptions = await sql`
    SELECT
      endpoint,
      p256dh,
      auth
    FROM push_subscriptions
    WHERE lower(player_name) =
      lower(${player.name}::text)
      AND enabled = TRUE
  `;

  for (const subscription of subscriptions) {
    const alreadySent = await sql`
      SELECT id
      FROM notification_log
      WHERE lower(player_name) =
        lower(${player.name}::text)
        AND notification_type =
          'new-matchweek'
        AND matchweek =
          ${Number(state.round)}
        AND endpoint =
          ${subscription.endpoint}
      LIMIT 1
    `;

    if (alreadySent.length) {
      continue;
    }

    const payload = JSON.stringify({
      title:
        `Matchweek ${state.round} is open`,
      body:
        'Make your selection before the deadline.',
      url: '/?tab=pick'
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        },
        payload
      );

      await sql`
        INSERT INTO notification_log (
          player_name,
          notification_type,
          matchweek,
          endpoint
        )
        VALUES (
          ${player.name},
          'new-matchweek',
          ${Number(state.round)},
          ${subscription.endpoint}
        )
        ON CONFLICT DO NOTHING
      `;

    } catch (error) {
      console.error(
        'New Matchweek push failed:',
        error
      );

      if (
        error.statusCode === 404 ||
        error.statusCode === 410
      ) {
        await sql`
          UPDATE push_subscriptions
          SET enabled = FALSE,
              updated_at = NOW()
          WHERE endpoint =
            ${subscription.endpoint}
        `;
      }
    }
  }
}
    
    const deadline =
      new Date(state.deadline).getTime();

    const now = Date.now();

    const hoursRemaining =
      (deadline - now) / (1000 * 60 * 60);

    let notificationType = null;
    let body = null;

    if (
      hoursRemaining <= 24 &&
      hoursRemaining > 6
    ) {
      notificationType = '24-hour';
      body =
        `Matchweek ${state.round}: you have not made your pick yet.`;
    } else if (
      hoursRemaining <= 6 &&
      hoursRemaining > 0
    ) {
      notificationType = '6-hour';
      body =
        `Matchweek ${state.round}: selection closes soon and you have not made your pick.`;
    } else {
      return res.status(200).json({
        ok: true,
        sent: 0,
        reason: 'Outside reminder window'
      });
    }

    const players =
      Array.isArray(state.players)
        ? state.players
        : [];

    const eligiblePlayers =
      players.filter(player => {
        if (player.alive !== true) {
          return false;
        }

        const pick =
          player.picks?.[state.round];

        return !pick;
      });

    let sent = 0;

    for (const player of eligiblePlayers) {
      const subscriptions = await sql`
        SELECT
          endpoint,
          p256dh,
          auth
        FROM push_subscriptions
        WHERE lower(player_name) =
          lower(${player.name}::text)
          AND enabled = TRUE
      `;

      for (const subscription of subscriptions) {
        const alreadySent = await sql`
          SELECT id
          FROM notification_log
          WHERE lower(player_name) =
            lower(${player.name}::text)
            AND notification_type =
              ${notificationType}
            AND matchweek =
              ${Number(state.round)}
            AND endpoint =
              ${subscription.endpoint}
          LIMIT 1
        `;

        if (alreadySent.length) {
          continue;
        }

        const payload = JSON.stringify({
          title: 'Last Man Standing',
          body,
          url: '/?tab=pick'
        });

        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            },
            payload
          );

          await sql`
            INSERT INTO notification_log (
              player_name,
              notification_type,
              matchweek,
              endpoint
            )
            VALUES (
              ${player.name},
              ${notificationType},
              ${Number(state.round)},
              ${subscription.endpoint}
            )
            ON CONFLICT DO NOTHING
          `;

          sent++;

        } catch (error) {
          console.error(
            'Reminder push failed:',
            error
          );

          if (
            error.statusCode === 404 ||
            error.statusCode === 410
          ) {
            await sql`
              UPDATE push_subscriptions
              SET enabled = FALSE,
                  updated_at = NOW()
              WHERE endpoint =
                ${subscription.endpoint}
            `;
          }
        }
      }
    }

    return res.status(200).json({
      ok: true,
      notificationType,
      eligiblePlayers:
        eligiblePlayers.length,
      sent
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
