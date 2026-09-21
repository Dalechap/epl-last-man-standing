export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const publicKey =
      process.env.VAPID_PUBLIC_KEY;

    if (!publicKey) {
      return res.status(500).json({
        error: 'VAPID public key is not configured'
      });
    }

    return res.status(200).json({
      publicKey
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
