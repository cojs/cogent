var co = require('co')
var os = require('os')
var path = require('path')
var fs = require('fs')

var request = require('./')

var tmpdir = os.tmpdir()
var uri = 'https://raw.github.com/component/domify/84b1917ea5a9451f5add48c5f61e477f2788532b/component.json'
var redirect = 'https://raw.github.com/jonathanong/inherits/master/component.json'

describe('cogent', function () {
  it('should work with HTTPS', co(function* () {
    var res = yield* request(uri)
    res.statusCode.should.equal(200)
    res.headers['content-encoding'].should.equal('gzip')
    res.resume()
  }))

  it('should buffer the response', co(function* () {
    var res = yield* request(uri, {
      buffer: true
    })
    res.statusCode.should.equal(200)
    res.buffer.should.be.a.Buffer
  }))

  it('should buffer the response as a string', co(function* () {
    var res = yield* request(uri, {
      string: true
    })
    res.statusCode.should.equal(200)
    res.text.should.be.a.String
  }))

  it('should buffer the response as a string and buffer', co(function* () {
    var res = yield* request(uri, {
      buffer: true,
      string: true
    })
    res.statusCode.should.equal(200)
    res.buffer.should.be.a.Buffer
    res.text.should.be.a.String
  }))

  it('should parse JSON', co(function* () {
    var res = yield* request(uri, true)
    res.statusCode.should.equal(200)
    res.headers['content-encoding'].should.equal('gzip')
    res.text.should.be.a.String
    res.body.name.should.equal('domify')
  }))

  it('should save to a file', co(function* () {
    var destination = path.join(tmpdir, Math.random().toString(36).slice(2))
    var res = yield* request(uri, destination)
    res.statusCode.should.equal(200)
    res.destination.should.equal(destination)
    fs.statSync(destination)
  }))

  it('should resolve redirects', co(function* () {
    var res = yield* request(redirect, true)
    res.statusCode.should.equal(200)
    res.body.name.should.equal('inherits')
  }))

  it('should work with retries', co(function* () {
    var res = yield* request(uri, {
      retries: 2
    })
    res.statusCode.should.equal(200)
    res.headers['content-encoding'].should.equal('gzip')
    res.resume()
  }))
})