var
  mongo = require('../lib/mongo');

var responseError = function (err, req, res) {
  var response = {};
  res.status = 500;
  response.error = err;
  return res.json(response);
};

var responseSuccess = function (response, req, res) {
  return res.json(response);
};

var verifyTemplate = function (document, callback) {
  if (document.version)
    callback(null, true);
  else
    callback(null, false);
};

exports.index = function (req, res) {
  res.render('index');
};

exports.save = function (req, res) {
  var document = req.body;

  if (document._timestamp)
    document._timestamp = new Date(document._timestamp);

  mongo.open(joola.config.get('mongo:url'), function (err, db) {
    if (err) {
      return responseError(err, req, res);
    }

    verifyTemplate(document, function (err, validated) {
      var collectionName = 'generic';
      if (validated)
        collectionName = document.collection;

      mongo.ensureCollection(collectionName, db, function (err, collection) {
        if (err)
          return responseError(err, req, res);

        mongo.saveDocument(document, {}, collection, function (err) {
          if (err)
            return responseError(err, req, res);
          mongo.close(db, function () {
            return responseSuccess({ok: 1}, req, res);
          });
        })
      });
    });

    return true;
  });
};