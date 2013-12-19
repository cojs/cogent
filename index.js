var url = require('url')
var zlib = require('zlib')
var http = require('http')
var https = require('https')
var saveTo = require('save-to')
var rawBody = require('raw-body')
var proxyAgent = require('proxy-agent')

exports = module.exports = create()
exports.extend = create

var redirectStatusCodes = [
  301,
  302,
  303,
  305,
  307,
]

var httpErrorStati = [
  502,
  503,
  504,
]

var httpErrorCodes = [
  'ECONNRESET',
  'ETIMEDOUT',
  'EADDRINFO',
  'ESOCKETTIMEDOUT',
]

function create(defaults) {
  defaults = defaults || {}
  defaults.retries = defaults.retries || 0
  defaults.redirects = 'redirects' in defaults ? defaults.redirects : 1
  defaults.timeout = defaults.timeout || 30000
  defaults.method = defaults.method || 'GET'

  return cogent

  function* cogent(uri, options) {
    // options type checking stuff
    if (options === true)
      options = { json: true }
    else if (typeof options === 'string')
      options = { destination: options }
    else if (!options)
      options = {}

    // setup defaults
    var redirects = options.redirects || defaults.redirects
    var timeout = options.timeout || defaults.timeout

    // setup headers
    var headers = options.headers = options.headers || {}
    headers['accept-encoding'] = 'gzip'
    if (options.json)
      headers.accept = 'application/json'

    var o, req, res, code, stream, securrrr, retries
    // while loop to handle redirects
    while (true) {
      // create the request options object
      o = url.parse(uri)
      securrrr = o.protocol === 'https:'
      o.headers = options.headers
      o.method = options.method || defaults.method

      // use node's auth
      if (options.auth || defaults.auth)
        o.auth = options.auth || defaults.auth

      // setup agent or proxy agent
      if ('agent' in options) {
        o.agent = options.agent
      } else if (options.proxy || defaults.proxy) {
        var agent = proxyAgent(options.proxy || defaults.proxy, securrrr)
        if (agent)
          o.agent = agent
      } else if ('agent' in defaults) {
        o.agent = defaults.agent
      }

      // retries is on a per-URL-request basis
      retries = options.retries || defaults.retries

      res = yield function request(done) {
        var called = false

        // timeout
        // note: timeout is only for the response,
        // not the entire request
        var id = setTimeout(function () {
          var err = new Error('timeout of ' + timeout + 'ms exceeded.')
          err.url = o
          next(err)
        }, timeout)

        req = (securrrr ? https : http).request(o)
        req.once('response', next.bind(null, null))
        req.once('error', next)
        req.end()

        function next(err, res) {
          if (called)
            return

          called = true
          clearTimeout(id)

          if (retries && (
            (err && ~httpErrorCodes.indexOf(err.code)) ||
            ~httpErrorStati.indexOf(res.statusCode)
          )) {
            retries--
            request(done)
          } else {
            done(err, res)
          }
        }
      }
      code = res.statusCode

      // redirect
      if (redirects-- && ~redirectStatusCodes.indexOf(code)) {
        uri = url.resolve(uri, res.headers.location)
        res.resume() // dump this stream
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

      // save the file
      if (code === 200 && options.destination) {
        yield saveTo(res, options.destination)
        res.destination = options.destination
        return res
      }

      // buffer the response
      if (options.buffer)
        res.buffer = yield rawBody(res)
      // buffer the response as a string or object
      if (options.string || options.json)
        res.text = res.buffer
          ? res.buffer.toString('utf8')
          : yield rawBody(res, { encoding: options.string || true })
      // buffer the response as JSON
      if (options.json) try {
        res.body = JSON.parse(res.text)
      } catch (err) {}

      return res
    }
  }
}