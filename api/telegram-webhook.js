// Telegram welcome bot for @DollorOfficialBot.
// Configure TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in Vercel.
const MESSAGE = '💚 WELCOME TO $ DOLLOR OFFICIAL\n\nWelcome to $ DOLLOR!\n\nPlease select an option below.';
const keyboard = { inline_keyboard: [
  [{ text: '🌐 Register Now', url: 'https://www.dollor.co.in' }],
  [{ text: '🎧 24×7 Customer Support', url: 'https://wa.link/yrv0r1' }],
  [{ text: '📢 Join Us', url: 'https://t.me/dollor_exch' }]
]};
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret || !token) return res.status(503).json({error:'Bot not configured'});
  if (req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).json({error:'Unauthorized'});
  }
  const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const msg = update.message;
  if (msg?.chat?.type !== 'private' || !/^\/start(?:@DollorOfficialBot)?(?:\s|$)/i.test(msg.text || '')) {
    return res.status(200).json({ok:true});
  }
  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:msg.chat.id,text:MESSAGE,reply_markup:keyboard})
    });
    if (!r.ok) {
      console.error('Telegram sendMessage failed:', r.status);
      return res.status(502).json({error:'Telegram delivery failed'});
    }
    return res.status(200).json({ok:true});
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return res.status(500).json({error:'Webhook processing failed'});
  }
};
