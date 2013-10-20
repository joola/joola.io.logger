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
  mongo = require('./joola.io.logger/mongo'),
  _ = require('underscore');

require('./joola.io.logger.transport');
require('./joola.io.logger/utils');

var options = {};
options.host = 'localhost';
options.port = 40007;
options.method = 'udp';
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

var verifyTemplate = function (document, callback) {
  if (document.version)
    callback(null, true);
  else
    callback(null, false);
};

logger.save = function (document, callback) {
  if (document._timestamp)
    document._timestamp = new Date(document._timestamp);

  mongo.open(joola.config.get('mongo:url'), function (err, db) {
    if (err)
      return callback(err);

    verifyTemplate(document, function (err, validated) {
      var collectionName = 'generic';
      if (validated)
        collectionName = document.collection;

      mongo.ensureCollection(collectionName, db, function (err, collection) {
        if (err)
          return callback(err);

        mongo.ensureIndex({_timestamp: 1}, collection, function (err) {
          if (err)
            return callback(err);

          mongo.saveDocument(document, {}, collection, function (err) {
            if (err)
              return callback(err);
            mongo.close(db, function () {
              return callback(null);
            });
            return null;
          });
        });
        return null;
      });
    });

    return true;
  });
};

module.exports = logger;