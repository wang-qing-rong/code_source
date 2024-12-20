var Writable = require('stream').Writable;

var BigInt = require('v9u-smb2/lib/tools/bigint');
var constants = require('v9u-smb2/lib/structures/constants');
var parseFlags = require('v9u-smb2/lib/tools/parse-flags');
var request = require('v9u-smb2/lib/tools/smb2-forge').request;


module.exports = function createWriteStream(path, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  var flag = 'wx'
  var connection = this;
  var ShareAccess = 0
  if (options.flags == "rwx") {
    flag = 'w'
  }
  var fd = options.fd;
  var isFd = fd != null;
  var shouldClose = !isFd || options.autoClose == null || options.autoClose;
  var maxRetries = 10;
  var retries = 0;

  function onCreate(err, file) {
    if (err != null) {
      if (err && err.code === 'STATUS_DELETE_PENDING') {
        return cb(err);
      } else if (err && err.code === 'STATUS_PENDING' && retries < maxRetries) {
        retries++;
        create_(
          connection,
          {
            createDisposition: parseFlags(flag),
            desiredAccess: 0x0012019F,
            path: path,
          },
          onCreate)
        return
      } else {
        return cb(err);
      }

    }

    var offset = new BigInt(8, (options != null && options.start) || 0);

    async function write(buffer, i, cb) {
      var j = i + constants.MAX_WRITE_LENGTH;
      var chunk = buffer.slice(i, j);

      try {
        await requestWithTimeout(
          'write',
          {
            Buffer: chunk,
            FileId: file.FileId,
            Offset: offset.toBuffer(),
          },
          connection,
          10000, // 设置超时时间为 5000 毫秒（5 秒）
          i,
          buffer
        );
        offset = offset.add(chunk.length);
        if (j < buffer.length) {
          return write(buffer, j, cb);
        }
        cb();
      } catch (err) {
        // cb(err);
        // 只有状态码返回为 STATUS_PENDING 时才进行重试
        if (err && err.code === 'STATUS_PENDING') {
          if (retries < maxRetries) {
            retries++
            return setTimeout(() => write(buffer, i, cb), 200);
          }
        } else {
          cb(err);
        }

      }

    }

    function requestWithTimeout(command, params, connection, timeout, i, buffer) {
      return new Promise((resolve, reject) => {
        let isResolved = false;

        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error('Request timed out'));
          }
        }, timeout);

        request(command, params, connection, (err, result) => {
          if (!isResolved) {
            clearTimeout(timeoutId);
            isResolved = true;
            retries = 0;
            if (err && err.code === 'STATUS_PENDING') {
              reject(err);
              // throw  err;
            } else if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          }
        });


      });
    }

    /*function write(buffer, i, cb) {
      var j = i + constants.MAX_WRITE_LENGTH;
      var chunk = buffer.slice(i, j);
      request(
          'write',
          {
            Buffer: chunk,
            FileId: file.FileId,
            Offset: offset.toBuffer(),
          },
          connection,
          function(err) {
            if (err != null) {
              return cb(err);
            }
            offset = offset.add(chunk.length);
            if (j < buffer.length) {
              return write(buffer, j, cb);
            }
            cb();
          }
      );
    }*/

    var stream = new Writable();
    if (shouldClose) {
      var close = request.bind(undefined, 'close', file, connection);
      stream._destroy = function (err, cb) {
        close(function (err2) {
          if (err2 != null) {
            return cb(err2);
          }
          cb(err);
        });
      };
      stream._final = close;
    }
    stream._write = function (chunk, encoding, next) {
      write(
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding),
        0,
        next
      );
    };
    cb(null, stream);
  }

  if (isFd) {
    onCreate(null, fd);
  } else {
    create_(
      connection,
      {
        createDisposition: parseFlags(flag),
        desiredAccess: 0x0012019F,
        path: path,
      },
      onCreate)
    /*request(
        'create',
        {
          createDisposition: parseFlags(flag),
          desiredAccess: 0x0012019F,
          path: path,
        },

        connection,
        onCreate
    );*/
  }
};

function create_(connection, options, onCreate) {
  // SMB2 rename
  request(
    'create',
    {
      createDisposition: options.path,
      desiredAccess: options.path,
      path: options.path,
    },
    connection,
    onCreate
  );
}