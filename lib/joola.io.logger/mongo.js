var mongo = require('mongodb');

exports.open = function (url, callback) {
  new mongo.MongoClient.connect(url, {w: 0}, function (err, db) {
    if (err)
      return callback(err);

    return callback(null, db);
  });
};

exports.close = function (db, callback) {
  db.close();
  return callback(null);
};

exports.ensureCollection = function (collection, db, callback) {
  db.createCollection(collection, {strict: false}, function (err, collection) {
    if (err)
      return callback(err);

    return callback(null, collection);
  });
};

exports.ensureIndex = function (indexKey, collection, callback) {
  collection.ensureIndex(indexKey, { unique: false }, function (err) {
    if (err)
      return callback(err);
    
    return callback(null);
  });
};

exports.saveDocument = function (document, options, collection, callback) {
  collection.insert(document, options, function (err) {
    if (err)
      return callback(err);

    return callback(null, document);
  });
};

exports.find = function (collection, filter, callback) {
  collection.find(filter).sort({_timestamp:-1}).limit(500).toArray(function (err, data) {
    if (err)
      return callback(err);

    data.reverse();
    return callback(null, data);
  });
};

exports.getCount = function (collection, callback) {
  var result = -1;

  return callback(null, result);
};