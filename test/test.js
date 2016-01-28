var reset     = require('reset-storage')
var writable  = require('readable-stream').Writable
var memdb     = require('memdb')

var populate  = require('./populate.js')
var test      = require('tape')
var type      = require('component-type')

function createTestWritable (name) {
  var write$ = writable({ objectMode: true })
  write$._write = function (item, encoding, next) {
    // console.log('<read name="'+name+'", encoding="'+encoding+'">')
    // console.log(item)
    // console.log('</read>')
    next()
  }
  return write$
}

var NAME = 'test.db'
reset.indexedDB("IDBWrapper-"+ NAME)
var TRACKER = require('..')

function noop () {}

test('level-subtrack', function (t) {
  t.plan(1)
  // t.plan(2)
  // t.test('...with level-js', function leveljsTest (t) {
  //   var levelup = require('levelup')
  //   var leveljs = require('level-js')
  //   levelup(NAME, { db: leveljs }, testSuite(t))
  // })
  t.test('...with memdb', function memdbTest (t) {
    memdb(NAME, testSuite(t))
  })
})

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
// START TESTS BELOW
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////

function testSuite (t) {
  return function tests (error, md) {

    t.test('nonsense', function (t) {
      // @TODO: refine or remove this test
      t.plan(3)
      // PREPARE
      var x = 1
      // TEST
      t.ok(x===1, 'yay')
      t.ok(x!==2, 'yay')
      t.doesNotThrow(function(){})
      // function logg (text) { return function (data) { console.log(text,': ',data) }}
      // md.on('put', logg('md:put'))
      // md.on('batch', logg('md:batch'))
      // DB.post({start:'',end:'~'},function (change){console.log('post DB')})
      // DB.on('put', logg('DB:put'))
      // DB.on('batch', logg('DB:batch'))
      // dbA.post({start:'',end:'~'},function (change){console.log('post dbA')})

      // dbA.put('/foobar/asdf', 'dbA:asdf')
      // DB.put('DB:asdf', 'DB:asdf')
      // md.put('md:asdf', 'md:asdf')
    })

    // t.test('@TODO', function (t) {
    //
    // }
    var write$ = createTestWritable('/')
    var dbt = TRACKER(md)
    var state$ = dbt.duplexable('foobar/') // @TODO: defaults
    // TEST DATA
    var testChunkread = { type: 'put', value: 'blerg', key: '/foobar/01' }
    var testChunkwrite = [
      { type: 'put', value: 'blerg 02', key: '/foobar/02' },
      { type: 'del', key: '/foobar/03' }
    ]
    // TEST GENERATOR
    state$.push(testChunkread)
    // CHECK RECEIVING UPDATES
    state$.pipe(write$) // READ
    // CHECK SENDING UPDATES - instad of .pipe(state$)
    state$.write(testChunkwrite) // WRITE
    ///////////////////////////////////////////////////////////////////////////
    var write$1 = createTestWritable('/test1')
    var dbt1 = dbt.sublevel('test1')
    var state1$ = dbt1.duplexable('bar/')
    // TEST DATA
    var testChunk1read = { type: 'put', value: 'blerg', key: '/bar/01' }
    var testChunk1write = [
      { type: 'put', value: 'blerg 02', key: '/bar/02' },
      { type: 'del', key: '/bar/03' }
    ]
    // TEST GENERATOR
    state1$.push(testChunk1read)
    // CHECK RECEIVING UPDATES
    state1$.pipe(write$1) // READ
    // CHECK SENDING UPDATES - instad of .pipe(state$)
    state1$.write(testChunk1write) // WRITE
    ///////////////////////////////////////////////////////////////////////////
    var write$2 = createTestWritable('/test2')
    var dbt2 = dbt.sublevel('test2')
    var state2$ = dbt2.duplexable('baz/')
    // TEST DATA
    var testChunk2read = { type: 'put', value: 'blerg', key: '/baz/01' }
    var testChunk2write = [
      { type: 'put', value: 'blerg 02', key: '/baz/02' },
      { type: 'del', key: '/baz/03' }
    ]
    // TEST GENERATOR
    state2$.push(testChunk2read)
    // CHECK RECEIVING UPDATES
    state2$.pipe(write$2) // READ
    // CHECK SENDING UPDATES - instad of .pipe(state$)
    state2$.write(testChunk2write) // WRITE
    ///////////////////////////////////////////////////////////////////////////
    var write$3 = createTestWritable('/doobidoo1')
    var dbt3 = dbt1.sublevel('doobidoo1')
    var state3$ = dbt3.duplexable('quux/')
    // TEST DATA
    var testChunk3read = { type: 'put', value: 'blerg', key: '/quux/01' }
    var testChunk3write = [
      { type: 'put', value: 'blerg 02', key: '/quux/02' },
      { type: 'del', key: '/quux/03' }
    ]
    // TEST GENERATOR
    state3$.push(testChunk3read)
    // CHECK RECEIVING UPDATES
    state3$.pipe(write$3) // READ
    // CHECK SENDING UPDATES - instad of .pipe(state$)
    state3$.write(testChunk3write) // WRITE
    ///////////////////////////////////////////////////////////////////////////
    var write$4 = createTestWritable('/doobidoo2')
    var dbt4 = dbt2.sublevel('doobidoo2')
    var state4$ = dbt4.duplexable('beep/')
    // TEST DATA
    var testChunk4read = { type: 'put', value: 'blerg', key: '/beep/01' }
    var testChunk4write = [
      { type: 'put', value: 'blerg 02', key: '/beep/02' },
      { type: 'del', key: '/beep/03' }
    ]
    // TEST GENERATOR
    state4$.push(testChunk4read)
    // CHECK RECEIVING UPDATES
    state4$.pipe(write$4) // READ
    // CHECK SENDING UPDATES - instad of .pipe(state$)
    state4$.write(testChunk4write) // WRITE
    state4$.write(testChunk4write) // WRITE
    state4$.write(testChunk4write) // WRITE
    state4$.write(testChunk4write) // WRITE

    // @TODO: test some normal .put, .del, .... on all sublevels

    // var ops = [ // make from 'chunk'
    //   // defaults to  type:'put'
    //   // key' of null or undefined will callback(error)
    //   { type: 'del', key: 'father'/*, value: 'is ignored'*/ },
    //   // type:put, value of null or undefined will callback(error)
    //   { type: 'put', key: 'name', value: 'Yuri Irsenovich Kim' },
    //   { type: 'put', key: 'dob', value: '16 February 1941' },
    //   { type: 'put', key: 'spouse', value: 'Kim Young-sook' },
    //   { type: 'put', key: 'occupation', value: 'Clown' }
    // ]
    // state5$.write(ops)
    // state5$.on('error', function (err, meeeh) {
    //   if (err) return console.log('Ooops!', err)
    //   console.log('end batch: ', meeeh)
    // })


    // var generate = populate(md, 200)
    // generate(dbt, [
    //   { prefix: '/bar/',   interval:  5 },
    //   { prefix: '/foobar/', interval: 25 },
    //   { prefix: '/beep',    interval: 48 }
    // ])
    // generate(dbt1, [
    //   { prefix: '/baz/',  interval:  5 },
    //   { prefix: '/bar/',  interval: 25 },
    //   { prefix: 'dbt1',   interval: 48 }
    // ])
    // generate(dbt2, [
    //   { prefix: '/baz/',  interval:  5 },
    //   { prefix: '/bar/',  interval: 25 },
    //   { prefix: 'dbt2',   interval: 48 }
    // ])
    // generate(dbt3, [
    //   { prefix: '/quux/', interval:  5 },
    //   { prefix: '/beep/', interval: 25 },
    //   { prefix: '/dbt3',  interval: 48 }
    // ])
    // generate(dbt4, [
    //   { prefix: '/quux/', interval:  5 },
    //   { prefix: '/beep/', interval: 25 },
    //   { prefix: '/dbt4',  interval: 48 }
    // ])
  }
}
