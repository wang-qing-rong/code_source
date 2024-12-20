var SMB2Message = require('v9u-smb2/lib/tools/smb2-message');
var message = require('v9u-smb2/lib/tools/message');

module.exports = message({
  generate: function(connection) {
    return new SMB2Message({
      headers: {
        Command: 'TREE_CONNECT',
        SessionId: connection.SessionId,
        ProcessId: connection.ProcessId,
      },
      request: {
        Buffer: Buffer.from(connection.fullPath, 'ucs2'),
      },
    });
  },

  onSuccess: function(connection, response) {
    var h = response.getHeaders();
    connection.TreeId = h.TreeId;
  },
});
