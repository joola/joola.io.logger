/**
 *  joola.io
 *
 *  Copyright Joola Smart Solutions, Ltd. <info@joo.la>
 *
 *  Licensed under GNU General Public License 3.0 or later.
 *  Some rights reserved. See LICENSE, AUTHORS.
 *
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>
 */

global.logger_component = 'joola.io.logger';

var
  fs = require('fs'),
  nconf = require('nconf'),
  path = require('path'),
  logger = require('./lib/joola.io.logger'),
  http = require('http'),
  https = require('https'),
  router = require('./routes/index'),
  express = require('express'),
  mongo = require('./lib/joola.io.logger/mongo'),
  dgram = require("dgram");

var app = global.app = express();
var io;
var udpserver = dgram.createSocket("udp4");

//test

var joola = {};
global.joola = joola;
joola.logger = logger;
joola.io = io;
//Configuration
nconf.argv()
  .env()
  .file({ file: nconf.get('conf') || './config/joola.io.logger.json' });

var port = nconf.get('server:port');
var secureport = nconf.get('server:securePort');

if (!nconf.get('version')) {
  throw new Error('Failed to load configuration.');
}

joola.config = nconf;

//Application settings
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon('public/assets/ico/favicon.ico'));
app.use(express.compress());
app.use(express.bodyParser());
app.use(express.methodOverride());

app.use(express.static(path.join(__dirname, 'public')));

//Logger
var winstonStream = {
  write: function (message, encoding) {
    joola.logger.info(message);
  }
};

app.use(express.logger((global.test ? function (req, res) {
} : {stream: winstonStream})));

//Routes
app.get('/', router.index);
app.post('/save', router.save);

//Service Start/Stop & Control Port
var status = '';
var httpServer, httpsServer;

var fetchLog = function (lastTimestamp, callback) {
  mongo.open(joola.config.get('mongo:url'), function (err, db) {
    if (err) {
      return callback(null);
    }

    var collectionName = 'generic';
    mongo.ensureCollection(collectionName, db, function (err, collection) {
      if (err)
        return callback(err);
      //console.log('Collection ensured');

      var filter = {};
      if (lastTimestamp.lastTimestamp)
        filter._timestamp = {$gt: new Date(lastTimestamp.lastTimestamp)};
      mongo.find(collection, filter, function (err, data) {
        if (err)
          return callback(err);
        mongo.close(db, function () {
          return callback(null, data);
        });
      })
    });

    return true;
  });
};

var startHTTP = function (callback) {
  var result = {};
  try {
    var _httpServer = http.createServer(app).listen(port,function (err) {
      if (err) {
        result.status = 'Failed: ' + ex.message;
        return callback(result);
      }
      status = 'Running';
      joola.logger.info('joola.io logging HTTP server listening on port ' + port);
      result.status = 'Success';
      httpServer = _httpServer;
      return callback(result);
    }).on('error',function (ex) {
        result.status = 'Failed: ' + ex.message;
        return callback(result);
      }).on('close', function () {
        status = 'Stopped';
        joola.logger.warn('joola.io logging HTTP server listening on port ' + port.toString() + ' received a CLOSE command.');
      });
  }
  catch (ex) {
    result.status = 'Failed: ' + ex.message;
    console.log(result.status);
    console.log(ex.stack);
    return callback(result);
  }
  return null;
};

var startSocketIO = function (callback) {
  joola.io = io = require('socket.io').listen(httpServer);
  io.set('log level', 0);
  io.sockets.on('connection', function (socket) {
    socket.on('last-log-fetch', function (data) {
      fetchLog(data, function (err, data) {
        if (err)
          return socket.emit('last-log', {});

        return socket.emit('last-log', data);
      });
    });
  });
  return callback();
};

var startUDP = function (callback) {
  udpserver.on("error", function (err) {
    console.log("server error:\n" + err.stack);
    udpserver.close();
    callback(err);
  });

  udpserver.on("close", function () {
    console.log("server closed:\n");
    callback(err);
  });

  udpserver.on("message", function (msg, rinfo) {
    var document = JSON.parse(msg);
    router.saveUDP(document, function () {
    })
  });

  udpserver.on("listening", function () {
    var address = udpserver.address();
    console.log("server listening " +
      address.address + ":" + address.port);
    callback(null);
  });

  udpserver.bind(joola.config.get('server:udpport'));
};

var startHTTPS = function (callback) {
  var result = {};
  try {
    var secureOptions = {
      key: fs.readFileSync(nconf.get('server:keyFile')),
      cert: fs.readFileSync(nconf.get('server:certFile'))
    };
    var _httpsServer = https.createServer(secureOptions, app).listen(secureport,function (err) {
      if (err) {
        result.status = 'Failed: ' + ex.message;
        return callback(result);
      }
      joola.logger.info('joola.io logging HTTPS server listening on port ' + secureport);
      result.status = 'Success';
      httpsServer = _httpsServer;
      return callback(result);
    }).on('error',function (ex) {
        result.status = 'Failed: ' + ex.message;
        return callback(result);
      }).on('close', function () {
        joola.logger.warn('Jjoola.io logging HTTPS server listening on port ' + secureport.toString() + ' received a CLOSE command.');
      });
  }
  catch (ex) {
    result.status = 'Failed: ' + ex.message;
    console.log(result.status);
    console.log(ex.stack);
    return callback(result);
  }
  return null;
};

startHTTP(function () {
  startSocketIO(function () {
    startUDP(function () {
      if (nconf.get('server:secure') === true)
        startHTTPS(function () {
        });
    });
  });
});

//Control Port
if (nconf.get('server:controlPort:enabled') === true) {
  var cp = require('node-controlport');
  var cp_endpoints = [];

  cp_endpoints.push({
    endpoint: 'status',
    exec: function (callback) {
      callback({status: status, pid: process.pid});
    }
  });

  cp_endpoints.push({
      endpoint: 'start',
      exec: function (callback) {
        if (nconf.get('server:secure') === true) {
          startHTTP(function () {
            startSocketIO(function () {
              startUDP(function () {
                startHTTPS(callback);
              });
            })
          });
        }
        else {
          startHTTP(callback);
        }
      }
    }
  );

  cp_endpoints.push({
    endpoint: 'stop',
    exec: function (callback) {
      var result = {};
      result.status = 'Success';
      try {
        httpServer.close();
        if (nconf.get('server:secure') === true)
          httpsServer.close();

        if (nconf.get('server:controlPort:exitOnStop') === true)
          process.exit(0);
      }
      catch (ex) {
        console.log(ex);
        result.status = 'Failed: ' + ex.message;
        return callback(result);
      }
      return callback(result);
    }
  });

  cp.start(nconf.get('server:controlPort:port'), cp_endpoints, function () {
    joola.logger.info('joola.io logging control port listening on port ' + nconf.get('server:controlPort:port'));
  });
}