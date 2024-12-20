/*
 * DEPENDENCIES
 */
var SMB2Message = require('v9u-smb2/lib/tools/smb2-message');

const map = new Map([
  ['close', require('v9u-smb2/lib/messages/close')],
  ['create', require('v9u-smb2/lib/messages/create')],
  ['create2', require('v9u-smb2/lib/messages/create2')],
  ['create_folder', require('v9u-smb2/lib/messages/create_folder')],
  ['negotiate', require('v9u-smb2/lib/messages/negotiate')],
  ['open', require('v9u-smb2/lib/messages/open')],
  ['open_folder', require('v9u-smb2/lib/messages/open_folder')],
  ['query_directory', require('v9u-smb2/lib/messages/query_directory')],
  ['read', require('v9u-smb2/lib/messages/read')],
  ['session_setup_step1', require('v9u-smb2/lib/messages/session_setup_step1')],
  ['session_setup_step2', require('v9u-smb2/lib/messages/session_setup_step2')],
  ['set_info', require('v9u-smb2/lib/messages/set_info')],
  ['tree_connect', require('v9u-smb2/lib/messages/tree_connect')],
  ['write', require('v9u-smb2/lib/messages/write')],
]);

/*
 * SMB2 MESSAGE FORGE
 */
var SMB2Forge = (module.exports = {});

/*
 * SMB2 MESSAGE FORGE
 */
SMB2Forge.request = function(messageName, params, connection, cb) {
  var msg = map.get(messageName);
  // var msg = require('../messages/' + messageName);
  var smbMessage = msg.generate(connection, params);

  // send
  sendNetBiosMessage(connection, smbMessage);

  // create an error container synchroneously for better stacktraces
  var error = new Error();
  error.messageName = messageName;
  error.params = params;

  // wait for the response
  getResponse(
    connection,
    smbMessage.getHeaders().MessageId,
    msg.parse(connection, cb, error)
  );
};

/*
 * SMB2 RESPONSE MESSAGE PARSER
 */
SMB2Forge.response = function(c) {
  c.responses = {};
  c.responsesCB = {};
  c.responseBuffer = Buffer.allocUnsafe(0);
  return function(response) {
    // concat new response
    c.responseBuffer = Buffer.concat([c.responseBuffer, response]);
    // extract complete messages
    var extract = true;
    while (extract) {
      extract = false;
      // has a message header
      if (c.responseBuffer.length >= 4) {
        // message is complete
        var msgLength =
          (c.responseBuffer.readUInt8(1) << 16) +
          c.responseBuffer.readUInt16BE(2);
        if (c.responseBuffer.length >= msgLength + 4) {
          // set the flags
          extract = true;
          // parse message
          var r = c.responseBuffer.slice(4, msgLength + 4);
          var message = new SMB2Message();
          message.parseBuffer(r);
          // debug
          if (c.debug) {
            console.log('--response'); // eslint-disable-line no-console
            console.log(r.toString('hex')); // eslint-disable-line no-console
          }
          // get the message id
          var mId = message.getHeaders().MessageId.toString('hex');
          // check if the message can be dispatched
          // or store it
          if (c.responsesCB[mId]) {
            c.responsesCB[mId](message);
            delete c.responsesCB[mId];
          } else {
            c.responses[mId] = message;
          }
          // remove from response buffer
          c.responseBuffer = c.responseBuffer.slice(msgLength + 4);
        }
      }
    }
  };
};

/*
 * HELPERS
 */
function sendNetBiosMessage(connection, message) {
  var smbRequest = message.getBuffer(connection);

  if (connection.debug) {
    console.log('--request'); // eslint-disable-line no-console
    console.log(smbRequest.toString('hex')); // eslint-disable-line no-console
  }

  // create NetBios package
  var buffer = Buffer.allocUnsafe(smbRequest.length + 4);

  // write NetBios cmd
  buffer.writeUInt8(0x00, 0);

  // write message length
  buffer.writeUInt8((0xff0000 & smbRequest.length) >> 16, 1);
  buffer.writeUInt16BE(0xffff & smbRequest.length, 2);

  // write message content
  smbRequest.copy(buffer, 4, 0, smbRequest.length);

  // Send it !!!
  connection.newResponse = false;
  connection.socket.write(buffer);

  return true;
}

function getResponse(c, mId, cb) {
  var messageId = Buffer.allocUnsafe(4);
  messageId.writeUInt32LE(mId, 0);
  messageId = messageId.toString('hex');
  if (c.responses[messageId]) {
    cb(c.responses[messageId]);
    delete c.responses[messageId];
  } else {
    c.responsesCB[messageId] = cb;
  }
}
