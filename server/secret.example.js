// server/secret.js is gitignored on purpose â€” it holds the JWT signing key.
//
// Do NOT copy this file and leave the placeholder in place. Generate a real one:
//
//   node -e "require('fs').writeFileSync('server/secret.js', 'module.exports = ' + JSON.stringify(require('crypto').randomBytes(32).toString('hex')) + ';')"
//
// Or, if you prefer to do it by hand: create server/secret.js containing a single
// line with 64 random hex characters, like the line below.

module.exports = 'GENERATE_YOUR_OWN_WITH_THE_COMMAND_ABOVE_DO_NOT_USE_THIS_STRING';
