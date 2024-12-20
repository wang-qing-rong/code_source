var SMB2Message = require('v9u-smb2/lib/tools/smb2-message');
var message = require('v9u-smb2/lib/tools/message');
var ntlm = require('ntlm2');

module.exports = message({
  generate: function(connection) {
    return new SMB2Message({
      headers: {
        Command: 'SESSION_SETUP',
        ProcessId: connection.ProcessId,
      },
      request: {
        Buffer: ntlm.encodeType1(),
      },
    });
  },

  successCode: 'STATUS_MORE_PROCESSING_REQUIRED',

  onSuccess: function(connection, response) {
    var h = response.getHeaders();
    connection.SessionId = h.SessionId;
    connection.nonce = ntlm.decodeType2(response.getResponse().Buffer);
  },
});
