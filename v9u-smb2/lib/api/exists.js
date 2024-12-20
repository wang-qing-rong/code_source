var SMB2Forge = require('v9u-smb2/lib/tools/smb2-forge');
var SMB2Request = SMB2Forge.request;

/*
 * exists
 * ======
 *
 * test the existence of a file
 *
 *  - try to open the file
 *
 *  - close the file
 *
 */
module.exports = function exists(path, cb) {
  var connection = this;;
  const maxRetries = 3; // 最大重试次数
  exists_(connection, path,{ retries: 0, maxRetries: maxRetries }, cb);


};

function exists_(connection, path, options, cb) {
  // SMB2 rename
  SMB2Request(
      'open',
      { path: path },
      connection,
          function(err, file) {
            if (err != null) {
              if (
                  err.code === 'STATUS_OBJECT_NAME_NOT_FOUND' ||
                  err.code === 'STATUS_OBJECT_PATH_NOT_FOUND'
              ) {
                return cb && cb(null, false);
              }
              else if (err && err.code === 'STATUS_PENDING') {
                if (options.retries < options.maxRetries) {
                  options.retries += 1;
                  return exists_(connection, path, options, cb);
                } else {
                  // 超过最大重试次数，返回错误
                  return cb && cb(new Error('Exceeded maximum retries for STATUS_PENDING'));
                }
              }

              return cb && cb(err);
            }

            SMB2Request('close', file, connection, function() {
              cb && cb(null, true);
            });
          }
  );
}