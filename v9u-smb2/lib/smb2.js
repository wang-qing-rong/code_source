/*
 * CONSTANTS
 */
var shareRegExp = /\\\\([^\\]*)\\([^\\]*)\\?/;
var port = 445;
var packetConcurrency = 20;
var autoCloseTimeout = 10000;

/*
 * DEPENDENCIES
 */
var autoPromise = require('v9u-smb2/lib/tools/auto-promise');
var SMB2Connection = require('v9u-smb2/lib/tools/smb2-connection');

/*
 * CONSTRUCTOR
 */
var SMB = (module.exports = function(opt) {
  opt = opt || {};

  // Parse share-string
  var matches;
  if (!opt.share || !(matches = opt.share.match(shareRegExp))) {
    throw new Error('the share is not valid');
  }

  // resolve IP from NetBios
  // this.ip = netBios.resolve(matches[0]);
  this.ip = matches[1];

  // set default port
  this.port = opt.port || port;

  // extract share
  this.share = matches[2];

  // save the full path
  this.fullPath = opt.share;

  // packet concurrency default 20
  this.packetConcurrency = opt.packetConcurrency || packetConcurrency;

  // close timeout default 10s
  if (opt.autoCloseTimeout !== undefined) {
    this.autoCloseTimeout = opt.autoCloseTimeout;
  } else {
    this.autoCloseTimeout = autoCloseTimeout;
  }

  // store authentification
  this.domain = opt.domain;
  this.username = opt.username;
  this.password = opt.password;

  // set the process id
  // https://msdn.microsoft.com/en-us/library/ff470100.aspx
  this.ProcessId = Buffer.from([
    Math.floor(Math.random() * 256) & 0xff,
    Math.floor(Math.random() * 256) & 0xff,
    Math.floor(Math.random() * 256) & 0xff,
    Math.floor(Math.random() * 256) & 0xfe,
  ]);

  // activate debug mode
  this.debug = opt.debug;

  // init connection (socket)
  SMB2Connection.init(this);
});

/*
 * PROTOTYPE
 */
var proto = (SMB.prototype = {});

proto.disconnect = require('v9u-smb2/lib/api/disconnect');

proto.exists = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/exists'))
);

proto.rename = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/rename'))
);

proto.readFile = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/readFile'))
);
proto.createReadStream = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/createReadStream'))
);
proto.createWriteStream = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/createWriteStream'))
);
proto.writeFile = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/writeFile'))
);
proto.unlink = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/unlink'))
);

proto.readdir = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/readdir'))
);
proto.rmdir = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/rmdir'))
);
proto.mkdir = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/mkdir'))
);

proto.getSize = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/getSize'))
);

proto.stat = autoPromise(SMB2Connection.requireConnect(require('v9u-smb2/lib/api/stat')));

proto.open = autoPromise(SMB2Connection.requireConnect(require('v9u-smb2/lib/api/open')));
proto.read = autoPromise(require('v9u-smb2/lib/api/read'), function(bytesRead, buffer) {
  return {
    bytesRead: bytesRead,
    buffer: buffer,
  };
});
proto.write = autoPromise(require('v9u-smb2/lib/api/write'), function(
  bytesWritten,
  buffer
) {
  return {
    bytesWritten: bytesWritten,
    buffer: buffer,
  };
});
proto.close = autoPromise(require('v9u-smb2/lib/api/close'));
proto.truncate = autoPromise(
  SMB2Connection.requireConnect(require('v9u-smb2/lib/api/truncate'))
);
