var BigInt = require('v9u-smb2/lib/tools/bigint');
var SMB2Request = require('v9u-smb2/lib/tools/smb2-forge').request;
var constants = require('v9u-smb2/lib/structures/constants');

/*
 * rename
 * ======
 *
 * change the name of a file:
 *
 *  - open the file
 *
 *  - change file name
 *
 *  - close the file
 *
 */
module.exports = function rename(oldPath, newPath, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  var connection = this;

  // SMB2 open the folder / file
  SMB2Request('open_folder', { path: oldPath }, connection, function(
    err,
    file
  ) {
    if (err)
      SMB2Request(
        'open',
        {
          path: oldPath,
          createDisposition: constants.FILE_OPEN,
          shareAccess: constants.FILE_SHARE_DELETE,
          desiredAccess: 0x0012019F,
          RequestedOplockLevel: 0x08,
        },
        connection,
        function(err, file) {
          if (err) cb && cb(err);
          else rename_(connection, file, newPath, options, cb);
        }
      );
    else rename_(connection, file, newPath, options, cb);
  });
};

function rename_(connection, file, newPath, options, cb) {
  // SMB2 rename
  SMB2Request(
    'set_info',
    {
      FileId: file.FileId,
      FileInfoClass: 'FileRenameInformation',
      Buffer: renameBuffer(newPath, options),
      AdditionalInformation: 0,
      Flags: 0,
    },
    connection,
    function(err) {
      SMB2Request('close', file, connection, function() {
        if (err) cb && cb(err);
        else cb && cb(null);
      });
    }
  );
}

function renameBuffer(newPath, options) {
  var filename = Buffer.from(newPath, 'ucs2');

  return Buffer.concat([
    // ReplaceIfExists 1 byte
    new BigInt(1, options.replace ? 1 : 0).toBuffer(),

    // Reserved 7 bytes
    new BigInt(7, 0).toBuffer(),

    // RootDirectory 8 bytes
    new BigInt(8, 0).toBuffer(),

    // FileNameLength 4 bytes
    new BigInt(4, filename.length).toBuffer(),

    // FileName
    filename,
  ]);
}
