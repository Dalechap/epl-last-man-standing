import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { adminPin, playerName } = req.body || {};

    if (
      String(adminPin || '').trim() !==
      String(process.env.ADMIN_PIN || '').trim()
    ) {
      return res.status(403).json({
        error: 'Incorrect Admin PIN'
      });
    }

    const publicKey =
      process.env.VAPID_PUBLIC_KEY;

    const privateKey =
      process.env.VAPID_PRIVATE_KEY;

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

    const subscriptions = await sql`
      SELECT
        endpoint,
        p256dh,
        auth
      FROM push_subscriptions
      WHERE lower(player_name) =
        lower(${String(playerName || '').trim()}::text)
        AND enabled = TRUE
    `;

    if (!subscriptions.length) {
      return res.status(404).json({
        error: 'No notification subscription found'
      });
    }

    const payload = JSON.stringify({
      title: 'Last Man Standing',
      body: 'Test successful — LMS notifications are working.',
      url: '/'
    });

    let sent = 0;

    for (const row of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth
            }
          },
          payload
        );

        sent++;

      } catch (error) {
        console.error(
          'Push send failed:',
          error
        );
      }
    }

    return res.status(200).json({
      ok: true,
      sent
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
