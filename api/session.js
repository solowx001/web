const { validSession } = require('../lib/auth');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ authenticated: validSession(req, process.env.SESSION_SECRET) });
};
