var SMB2Connection = require('v9u-smb2/lib/tools/smb2-connection');

/*
 * close
 * =====
 *
 * close your connection to the SMB2 server
 *
 *  - close TCP connection
 *
 */
module.exports = function disconnect() {
  SMB2Connection.close(this);
};
