var SMB2Message = require('v9u-smb2/lib/tools/smb2-message');
var message = require('v9u-smb2/lib/tools/message');

module.exports = message({
  generate: function(connection) {
    return new SMB2Message({
      headers: {
        Command: 'NEGOTIATE',
        ProcessId: connection.ProcessId,
      },
    });
  },
});
