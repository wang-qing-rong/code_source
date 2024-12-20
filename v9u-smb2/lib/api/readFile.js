var SMB2Forge = require('v9u-smb2/lib/tools/smb2-forge');
var SMB2Request = SMB2Forge.request;
var BigInt = require('v9u-smb2/lib/tools/bigint');
var MAX_READ_LENGTH = require('v9u-smb2/lib/structures/constants').MAX_READ_LENGTH;

/*
 * readFile
 * ========
 *
 * read the content of a file from the share
 *
 *  - open the file
 *
 *  - read the content
 *
 *  - close the file
 *
 */
module.exports = function readFile(filename, options, cb) {
  var connection = this;

  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  SMB2Request('open', { path: filename }, connection, function(err, file) {
    if (err) cb && cb(err);
    // SMB2 read file content
    else {
      var fileLength = 0;
      var offset = new BigInt(8);
      var stop = false;
      var nbRemainingPackets = 0;
      // get file length
      for (var i = 0; i < file.EndofFile.length; i++) {
        fileLength += file.EndofFile[i] * Math.pow(2, i * 8);
      }
      var result = Buffer.allocUnsafe(fileLength);
      // callback manager
      var callback = function(offset) {
        return function(err, content) {
          if (stop) return;
          if (err) {
            cb && cb(err);
            stop = true;
          } else {
            content.copy(result, offset.toNumber());
            nbRemainingPackets--;
            checkDone();
          }
        };
      };
      // callback manager
      var checkDone = function() {
        if (stop) return;
        createPackets();
        if (nbRemainingPackets === 0 && offset.ge(fileLength)) {
          SMB2Request('close', file, connection, function() {
            if (options.encoding) {
              result = result.toString(options.encoding);
            }
            cb && cb(null, result);
          });
        }
      };
      // create packets
      var createPackets = function() {
        while (
          nbRemainingPackets < connection.packetConcurrency &&
          offset.lt(fileLength)
        ) {
          // process packet size
          var rest = offset.sub(fileLength).neg();
          var packetSize = rest.gt(MAX_READ_LENGTH)
            ? MAX_READ_LENGTH
            : rest.toNumber();
          // generate buffer
          SMB2Request(
            'read',
            {
              FileId: file.FileId,
              Length: packetSize,
              Offset: offset.toBuffer(),
            },
            connection,
            callback(offset)
          );
          offset = offset.add(packetSize);
          nbRemainingPackets++;
        }
      };
      checkDone();
    }
  });
};
