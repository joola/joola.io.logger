/**
 *  joola.io
 *
 *  Copyright Itay Weinberger, <itay@joo.la>
 *
 *  Licensed under MIT License.
 *  See LICENSE, AUTHORS.
 *
 *  @license MIT <http://spdx.org/licenses/MIT>
 */

var
  winston = require('winston'),
  _ = require('underscore');

require('./joola.io.logger.transport');
require('./utils');

var options = {};
options.host = 'localhost';
options.port = 40006;
options.level = 'silly';
options.silent = false;
options.env = global.env || process.env.JOOLAIO_ENV;
options.component = global.logger_component || 'n/a'; 

var lastLog = new Date();
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ level: 'debug', json: false, colorize: true, timestamp: function () {
      var tsStart = new Date();
      try {

        if (joola)
          tsStart = joola.timestamps.start.getTime();
      }
      catch (ex) {
      }
      var output = '[' + process.pid + '] ' + new Date().format('yyyy-mm-dd hh:nn:ss') + ', ' + (new Date().getTime() - lastLog.getTime()) + ' ms';
      lastLog = new Date();
      return output;
    } }),
    new winston.transports.logger(options)
  ],
  exitOnError: false
});

//Fix bug with missing method
_.each(logger.transports, function (t) {
  t.logException = function (err) {
    logger.error(err);
  }
});

logger.setLevel = function (level) {
  _.each(logger.transports, function (t) {
    t.level = level;
  });
};

logger.falseLogger = {
  log: function () {

  },
  silly: function () {

  },
  debug: function () {

  },
  info: function () {

  },
  error: function () {

  },
  notice: function () {

  },
  setLevel: function () {

  }
};

module.exports = logger;