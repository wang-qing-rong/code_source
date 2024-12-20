var Readable = require('stream').Readable;

var BigInt = require('v9u-smb2/lib/tools/bigint');
var request = require('v9u-smb2/lib/tools/smb2-forge').request;
var MAX_READ_LENGTH = require('v9u-smb2/lib/structures/constants').MAX_READ_LENGTH;
var retryCount = 0;           // 当前重试次数
var MAX_RETRY_COUNT = 15;     // 最大重试次数

module.exports = function createReadStream(path, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  } else if (options == null) {
    options = {};
  }

  var connection = this;

  var fd = options.fd;
  var isFd = fd != null;
  var shouldClose = !isFd || options.autoClose == null || options.autoClose;

  function onOpen(err, file) {
    if (err != null) {
      return cb(err);
    }

    var offset = options.start || 0;
    var fileSize = BigInt.fromBuffer(file.EndofFile).toNumber();
    var end = fileSize;

    if (options.end < end) {
      end = options.end + 1; // end option is inclusive
    }

    var close = request.bind(undefined, 'close', file, connection);

    var stream = new Readable();
    stream.fileSize = fileSize;
    if (shouldClose) {
      stream._destroy = function (err, cb) {
        close(function (err2) {
          if (err2 != null) {
            return cb(err2);
          }
          cb(err);
        });
      };
    }
    var running = false;
    stream._read = function (size) {
      if (running) {
        return;
      }

      if (offset >= end) {
        return shouldClose
          ? close(function () {
            stream.push(null);
          })
          : stream.push(null);
      }

      running = true;

      request(
        'read',
        {
          FileId: file.FileId,
          Length: Math.min(MAX_READ_LENGTH, size, end - offset),
          Offset: new BigInt(8, offset).toBuffer(),
        },
        connection,
        async function (err, content) {
          running = false;
          if (err != null) {
              if (err.code === "STATUS_PENDING" && retryCount <= MAX_RETRY_COUNT){
                 retryCount++;
                 await sleep(500);
                 return stream._read(size);
              }else{
                return process.nextTick(stream.emit.bind(stream, 'error', err));
              }
          }
          retryCount = 0;
          offset += content.length;
          stream.push(content);
        }
      );
    };
    cb(null, stream);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(()=>{
      return resolve()
    }, ms));
  }

  if (isFd) {
    onOpen(null, fd);
  } else {
    request('open', {path: path}, connection, onOpen);
  }
};
