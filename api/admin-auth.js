import fs from 'fs';
import path from 'path';

// Read ADMIN_PIN from .env so a local change is used immediately.
export function currentAdminPin() {
  try {
    const file = path.join(process.cwd(), '.env');
    const line = fs.readFileSync(file, 'utf8')
      .split('\n')
      .map(item => item.trim())
      .find(item => item.startsWith('ADMIN_PIN='));

    if (line) {
      return line.slice('ADMIN_PIN='.length).trim().replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // Hosted servers keep the PIN in the environment.
  }

  return String(process.env.ADMIN_PIN || '').trim();
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { pin } = req.body || {};

    const cleanPin = String(pin || '').trim();
    const adminPin = currentAdminPin();

    if (!adminPin) {
      return res.status(500).json({
        error: 'Admin PIN is not configured'
      });
    }

    if (cleanPin !== adminPin) {
      return res.status(403).json({
        error: 'Incorrect Admin PIN'
      });
    }

    return res.status(200).json({
      ok: true
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
