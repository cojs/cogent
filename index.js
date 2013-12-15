var url = require('url')
var http = require('http')
var https = require('https')
var crypto = require('crypto')
var saveTo = require('save-to')
var rawBody = require('raw-body')
var toArray = require('stream-to-array')

module.exports = cogent

var redirectStatusCodes = [
  301,
  302,
  303,
  307,
]

function* cogent(uri, options) {
  options = options || {}
  options.headers = options.headers || {}
  options.headers['accept-encoding'] = 'gzip'

  var o, req, res, code, stream
  do {
    o = url.parse(uri)
    mergeRequestOptions(o, options)
    res = yield function (done) {
      (o.protocol === 'https:' ? https : http).request(o, done)
    }
    code = res.statusCode

    // redirect
    if (~redirectStatusCodes.indexOf(code)) {
      uri = url.resolve(uri, res.headers.location)
      res.resume() // dump the stream
      continue
    }

    // unzip
    if (res.headers['content-encoding'] === 'gzip') {
      stream = res.pipe(crypto.createGunzip())
      stream.res = res
      stream.statusCode = code
      res = stream
    }

    // okay!
    if (code === 200) {
      // save to a file and return the destination
      if (options.save) return yield saveTo(res, options.save)
      // return JSON
      if ((options.buffer || options.string) && isJSON(res))
        return JSON.parse(yield rawBody(res, {
          encoding: 'utf8'
        }))

      if (options.buffer) {
        res.buffer = Buffer.concat(yield toArray(res))
        if (options.string) res.text = res.buffer.toString('utf8')
      } else if (options.string) {
        res.text = yield rawBody(res, {
          encoding: options.string
        })
      }
    }

    return res
  } while (true)
}

function mergeRequestOptions(dest, src) {
  dest.method = (src.method || 'GET').toUpperCase()
  dest.auth = src.auth
  dest.agent = src.agent
  dest.headers = src.headers
  return dest
}

function isJSON(res) {
  var type = res.headers['content-type']
  return type && type.split(';')[0] === 'application/json'
}