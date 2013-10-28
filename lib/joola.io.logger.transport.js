var
  util = require('util'),
  winston = require('winston'),
  dgram = require("dgram"),
  http = require('http');

var logger = exports.logger = winston.transports.logger = function (options) {
  this.name = options.name || 'joola.io.logger';
  this.level = options.level || 'silly';
  this.method = options.method || 'udp';
  this.silent = options.silent || false;
  this.handleExceptions = options.handleExceptions || false;
  this.host = options.host || 'localhost';
  this.port = options.port || 40007;
  this.hostname = options.hostname || require('os').hostname();
  this.component = options.component || 'n/a';
  this.env = options.env || 'n/a';

  //if (!options.hasOwnProperty('silent') && this.component == 'joola.io.logger')
//    this.silent = true;
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
    if (meta.component) {
      message.component = meta.component;
      delete meta.component;
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

  if (self.method == 'http') {
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

    var req = http.request(options, function (res) {
      res.setEncoding('utf-8');

      var responseString = '';

      res.on('data', function (data) {
        responseString += data;
      });

      res.on('end', function () {
        return callback(null);
      });
    });

    req.on('error', function (e) {
      if (this.handleExceptions) {
        //TODO: handle exceptions
      }
      return callback(e);
    });

    req.write(dataString);
    req.end();
  }
  else {
    var client = dgram.createSocket("udp4");
    message = new Buffer(dataString);
    client.send(message, 0, message.length, self.port, self.host, function (err, bytes) {
      if (err && this.handleExceptions) {
        //TODO: handle exceptions
      }

      client.close();
      return callback();
    });
  }
  return null;
};
