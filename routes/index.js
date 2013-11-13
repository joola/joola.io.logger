var
  logger = require('../lib/joola.io.logger');

var responseError = function (err, req, res) {
  var response = {};
  res.status = 500;
  response.error = err;
  return res.json(response);
};

var responseSuccess = function (response, req, res) {
  return res.json(response);
};

exports.index = function (req, res) {
  res.render('index');
};

exports.save = function (req, res) {
  var document = req.body;

  joola.io.sockets.emit('log-line', document);
  logger.save(document, function (err) {
    if (err)
      return responseError(err, req, res);
    else
      return responseSuccess({ok: 1}, req, res);


  });
};

exports.saveUDP = function (document, callback) {
  callback(null);

  joola.io.sockets.emit('log-line', document);
  logger.save(document, function (err) {
   // if (err)
      //console.log(err);
  });

};