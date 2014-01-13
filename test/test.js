var co = require('co')
var os = require('os')
var fs = require('fs')
var path = require('path')
var http = require('http')
var assert = require('assert')
var koa = require('koa')
var auth = require('koa-basic-auth')

var request = require('..')

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

  describe('when gunzip=false', function () {
    it('should return an uncompressed stream', co(function* () {
      var res = yield* request(uri, {
        gunzip: false
      })
      assert.ok(res instanceof http.IncomingMessage)
    }))

    it('should throw if buffering the response', co(function* () {
      try {
        var res = yield* request(uri, {
          gunzip: false,
          buffer: true
        })
        throw new Error('boom')
      } catch (err) {
        err.message.should.not.equal('boom')
      }
    }))
  })

  describe('auth', function () {
    var app = koa()

    app.use(auth({
      name: 'name',
      pass: 'pass'
    }))

    app.use(function* () {
      this.status = 204
    })

    var uri = 'http://localhost:'

    it('server should start', function (done) {
      var server = app.listen(function (err) {
        if (err) return done(err)
        uri += this.address().port
        done()
      })
    })

    it('should work when passing .auth', co(function* () {
      var res = yield* request(uri, {
        auth: 'name:pass'
      })
      res.statusCode.should.equal(204)
    }))

    it('should work with netrc', co(function* () {
      var res = yield* request(uri, {
        netrc: path.join(__dirname, '.netrc')
      })
      res.statusCode.should.equal(204)
    }))

    it('should work with netrc as extension', co(function* () {
      var req = request.extend({
        netrc: path.join(__dirname, '.netrc')
      })
      var res = yield* req(uri)
      res.statusCode.should.equal(204)
    }))
  })
})