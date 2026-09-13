const crypto = require('crypto');

// Returns { token, hash }. Send `token` to the user, store `hash` in the DB.
// This way a leaked database never reveals a usable token.
const createRandomToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = { createRandomToken, hashToken };
