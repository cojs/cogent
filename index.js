var url = require('url')
var zlib = require('zlib')
var http = require('http')
var https = require('https')
var saveTo = require('save-to')
var rawBody = require('raw-body')

module.exports = cogent

var redirectStatusCodes = [
  301,
  302,
  303,
  307,
]

function* cogent(uri, options) {
  if (options === true) options = { json: true }
  if (typeof options === 'string') options = { destination: options }
  options = options || {}
  var headers = options.headers = options.headers || {}
  headers['accept-encoding'] = 'gzip'
  if (options.json) headers['accept'] = 'application/json'

  var o, req, res, code, stream
  while (true) {
    o = mergeRequestOptions(url.parse(uri), options)
    res = yield function (done) {
      req = (o.protocol === 'https:' ? https : http).request(o)
      req.once('response', done.bind(null, null))
      req.once('error', done)
      req.end()
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
      stream = res.pipe(zlib.createGunzip())
      stream.res = res
      // pass useful response stuff
      stream.statusCode = code
      stream.headers = res.headers
      res = stream
    } else {
      res.res = res
    }

    res.req = req

    if (code === 200 && options.destination) {
      yield saveTo(res, options.destination)
      res.destination = options.destination
      return res
    }

    if (options.buffer) res.buffer = yield rawBody(res)
    if (options.string || options.json)
      res.text = res.buffer
        ? res.buffer.toString('utf8')
        : yield rawBody(res, { encoding: options.string || true })
    if (options.json && code === 200) res.body = JSON.parse(res.text)

    return res
  }
}

function mergeRequestOptions(dest, src) {
  dest.headers = src.headers
  if ('method' in src) dest.method = src.method
  if ('auth' in src) dest.auth = src.auth
  if ('agent' in src) dest.agent = src.agent
  return dest
}