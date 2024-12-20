var request = require('v9u-smb2/lib/tools/smb2-forge').request;

module.exports = function close(file, cb) {
  request('close', file, this, cb);
};
