import webpush from 'web-push';

export default async function handler(req, res) {
  const keys = webpush.generateVAPIDKeys();

  return res.status(200).json({
    publicKey: keys.publicKey,
    privateKey: keys.privateKey
  });
}
