var parseFlags = require('v9u-smb2/lib/tools/parse-flags');
var request = require('v9u-smb2/lib/tools/smb2-forge').request;

module.exports = function open(path, flags, cb) {
  if (typeof flags === 'function') {
    cb = flags;
    flags = undefined;
  }

  request(
    'create',
    { createDisposition: parseFlags(flags || 'r'), path: path },
    this,
    cb
  );
};
