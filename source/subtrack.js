'use strict'
var switchboard = require('level-switchboard') // @TODO: publish to npm
var defaults = require('level-defaults')
var codec = require('level-sublevel/codec')
var sub = require('level-sublevel')
// typeof md        === LevelUp
//    ==> has all the levelup methods, including .on(...) & .createReadStream
// typeof md.db     === DeferredLevelDOWN
//    ==> has no methods & is just temporary placeholder for sync memdb calls
// typeof md.db._db === MemDOWN
// => md.db===MemDOWN && md.db._db===undefined // after md.db.setDb(Memdown)
//
// LevelUp.put -> LevelUp.MemDOWN.put -> LevelUp.MemDOWN._put
// === db.put => db.db.put => db.db._put
// ....
//
// DB = sub(db) === shell(nut(db)) -> EventEmitter (with db.methods)
//    === { put/del/batch->nut.apply, get->nut.get, ... }
//        EventEmitter.put -> nut.apply -> MemDOWN.put
//    --> has DB.pre, DB.post  (triggered for all put/del/batch/...)
//        --> to add HOOKS, which are triggered by nut.apply
// DB.put -> shell.put => emit('put', key, value)
//                        && nut.apply => (db.db || db)[put/get/del]
//    WHERE: db.db === MemDOWN === db.db._db
//           db === LevelUp

module.exports = subtrack
/******************************************************************************
  MAIN

  // @TODO: document API of 'level-subtrack' - see translate
  // var query1 = "key"
  // var query3 = {key:{ a:1, b:1 }}
  // var query2 = "key/"
  // var query4 = {"key/": { "01": { a:2, b:2 }, "02": { a:2, b:2 } }}
  // db.duplexable(query1)
******************************************************************************/
function subtrack (db) {
  validateArgs(db)
  db = defaults(db, { // for browser compatibility
    // @TODO: check bytewise encoding for keys
    // @TODO: check json/msgpack encoding for values
    // @TODO: check which type-of types or supported
    // @TODO: check encodings in node and browser
    // @TODO: chec default encodings levelup & sublevel in opts
    keyEncoding: 'utf8', // require('bytewise')
    valueEncoding: 'json', // opts.valueEncoding
  })
  db = switchboard(db, translate, codec)
  db.sublevel = sublevel
  function sublevel (name) {
    var subDB = sub(this).sublevel(name)
    subDB.readable = db.readable
    subDB.writable = db.writable
    subDB.duplexable = db.duplexable
    subDB.sublevel = sublevel
    return subDB
  }
  return db
}
/******************************************************************************
  HELPER - validateArgs
******************************************************************************/
function validateArgs (db) {
  if (!db)
    throw NoRawLevelupInstanceError('subtracker')
  var counter = 0
  if (db.sublevel) {
    counter++
    if (db.sublevel !== subtrack)
      throw MethodAlreadyUsedByAnotherExtensionError('sublevel')
  }
  if (counter !== 0 && counter !== 1)
    throw BrokenInitializationError('subtracker')
}
/******************************************************************************
  HELPER - translate
******************************************************************************/
function translate (query) {
  if (!query) throw NoRequiredArgumentError('query')
  else if (typeof query === 'string') var key = query, defaults = {}
  else {
    var counter = 0
    for (var x in query) { var key = x, defaults = query[key]; counter++ }
    if (counter-1)
      throw ArgumentDoesntFullfillRequirementsError('query')
  }
  key = key[0] === '/' ? key : '/' + key
  var isDirectory = key[key.length-1] === '/'
  defaults = isDirectory ? (function (old, tmp) {
    for (k in old) tmp[key+k] = old[k]
    return tmp
  })(defaults, {}) : defaults
  var suffix = isDirectory ? '!' : ''
  // '\x00' - first char in ASCII range
  // '!' - first printable char (pos 33)in the ASCII range
  var terminator = isDirectory ? '\uffff\uffff' : '\x00'
  // ASCII range is all that matters when it comes to comparing keys
  // Increase gte/lt to stop at the end of the range you care about
  //
  // 'ab' comes after 'aa' because of the second byte
  // => gte:'aa', lt:'ab'
  // which would work great, if you want to exclude 'ab' in your keys
  // 'z' - last char of the alphabet
  // => gte:'aa', lt:'aaz'
  // which would work great unless you have e.g. '2' in your keys
  // '~' - last "printable" char (pos 126) of the lower ASCII range
  // => gte:'aa', lt:'aa~'
  // which would work great unless you have '~' in your keys
  // '\xff' - end char (pos 255) of the full ASCII range
  // => gte:'aa', lt:'aa\xff'
  // which would work great unless you have non-ascii data in your keys
  // '\uffff' - last unicode charcter
  // => gte:'aa', lt:'aa\uffff'
  // which would work great unless '\uffff' is used as a seperator already
  // => gte:'aa', lt:'aa\uffff\uffff'
  var defaultKeys = Object.keys(defaults)
  var defaultKeysCopy = Object.keys(defaults)
  defaultKeys.forEach(function (key1) {
    defaultKeysCopy.shift()
    defaultKeysCopy.forEach(function (key2) {
      if (!key1.indexOf(key2)) throw DefaultsOverlapError(key2, key1)
      else if (!key2.indexOf(key1)) throw DefaultsOverlapError(key1, key2)
    })
  })
  // no default key should contain any other default key
  // @TODO: should be true across all defaults with the same prefix
  // @TODO: should also be made sure for reads/writes later on
  // a/b/c/
  // a/b/c/d
  return { query: { gte: key+suffix, lt: key+terminator }, defaults: defaults }
}
/******************************************************************************
  HELPER - Errors
******************************************************************************/
var err = '(╯°□°)╯︵ ┻━┻'
function DefaultsNotInRangeError () {
  return new Error(err+' : defaults not in query range')
}
function NoRawLevelupInstanceError (modulename) {
  return new Error(err+' : '+modulename+' needs a raw levelup instance')
}
function MethodAlreadyUsedByAnotherExtensionError (methodname) {
  return new Error(err+' : `db.'+methodname+'` already used by an extension')
}
function BrokenInitializationError (modulename) {
  return new Error(err+' : already initialized '+modulename+', but broken')
}
function ArgumentDoesntFullfillRequirementsError (name) {
  return new Error(err+' : given: "'+name+'", but has wrong format')
}
function NoRequiredArgumentError (name) {
  return new Error('no "'+name+'" argument given')
}
function DefaultsOverlapError (key1, key2) {
  return new Error(err+' : "'+key2+'" contains "'+key1+'"')
}
