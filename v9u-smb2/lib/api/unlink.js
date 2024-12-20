var SMB2Forge = require('v9u-smb2/lib/tools/smb2-forge');
var SMB2Request = SMB2Forge.request;
var BigInt = require('v9u-smb2/lib/tools/bigint');
var constants = require('v9u-smb2/lib/structures/constants');
var parseFlags = require('v9u-smb2/lib/tools/parse-flags');
/*
 * unlink
 * ======
 *
 * remove file:
 *
 *  - open the file
 *
 *  - remove the file
 *
 *  - close the file
 *
 */
module.exports = function unlink(path, cb) {
  var connection = this;
    /* 'open',
       {   path: path,
           createDisposition: constants.FILE_OPEN,
           shareAccess: constants.FILE_SHARE_DELETE,
           desiredAccess: 0x0012019F,
           RequestedOplockLevel: 0x08, },
       connection,*/
  // SMB2 open file    constants.FILE_SHARE_DELETE
  SMB2Request(
       'create2',
        {   path: path,
            shareAccess: constants.FILE_SHARE_DELETE,
            desiredAccess: 0x0012019F,
            createDisposition: parseFlags(
                'wx'
            ),
        },
      connection,
       function(err, file) {
      if (err) cb && cb(err);
      // SMB2 query directory
      else
        SMB2Request(
          'set_info',
          {
            FileId: file.FileId,
            FileInfoClass: 'FileDispositionInformation',
            Buffer: new BigInt(1, 1).toBuffer(),
          },
          connection,
          function(err, files) {
            SMB2Request('close', file, connection, function() {
              if (err) cb && cb(err);
              else cb && cb(null, files);
            });
          }
        );
    }
  );
};
