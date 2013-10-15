var
  util = require('util'),
  winston = require('winston'),
  http = require('http');

var logger = exports.logger = winston.transports.logger = function (options) {
  this.name = options.name || 'joola.io.logger';
  this.level = options.level || 'info';
  this.silent = options.silent || false;
  this.handleExceptions = options.handleExceptions || false;
  /*
   this.udpClient = dgram.createSocket('udp4');
   this.udpClient.on('error', function (err) {
   // Handle any suprise errors
   util.error(err);
   });
   */

  this.host = options.host || 'localhost';
  this.port = options.port || 40006;
  this.hostname = options.hostname || require('os').hostname();
  this.component = options.component || 'n/a';
  this.env = options.env || 'n/a';

  if (this.component == 'joola.io.logger')
    this.silent = true;
};

util.inherits(logger, winston.Transport);

logger.prototype.log = function (level, msg, meta, callback) {
  var self = this, message = {}, key;

  if (self.silent) {
    return callback(null, true);
  }

  message._timestamp = new Date();
  message.env = self.env;
  message.hostname = self.hostname;
  message.component = self.component;
  message.type = meta || {};
  message.message = msg;
  message.level = level;

  if (meta) {
    if (meta.level) {
      message.level = meta.level;
      delete meta.level;
    }
  }

  if (!!meta) {
    for (key in meta) {
      if (key !== 'id') {
        message['_' + key] = meta[key];
      }
    }
  }
  message.meta = {};

  var dataString = JSON.stringify(message);

  var headers = {
    'Content-Type': 'application/json',
    'Content-Length': dataString.length
  };

  var options = {
    host: self.host,
    port: self.port,
    path: '/save',
    method: 'POST',
    headers: headers
  };


// Setup the request.  The options parameter is
// the object we defined above.
  var req = http.request(options, function (res) {
    res.setEncoding('utf-8');

    var responseString = '';

    res.on('data', function (data) {
      responseString += data;
    });

    res.on('end', function () {
      //console.log(responseString);

      return callback(null);
      //var resultObject = JSON.parse(responseString);
    });
  });

  req.on('error', function (e) {
    // TODO: handle error.
    return callback(e);
  });

  req.write(dataString);
  req.end();
};
