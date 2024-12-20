var SMB2Message = require('v9u-smb2/lib/tools/smb2-message');
var message = require('v9u-smb2/lib/tools/message');

module.exports = message({
  generate: function(connection, params) {
    var buffer = Buffer.from(params.path, 'ucs2');
    return new SMB2Message({
      headers: {
        Command: 'CREATE',
        SessionId: connection.SessionId,
        TreeId: connection.TreeId,
        ProcessId: connection.ProcessId,
      },
      request: {
        Buffer: buffer,
        NameOffset: 0x0078,
        FileAttributes: 0x00000080,
        ShareAccess: params.shareAccess,
        CreateDisposition: params.createDisposition,
        CreateContextsOffset: 0x007a + buffer.length,
        DesiredAccess: params.desiredAccess,
      },
    });
  },
});
