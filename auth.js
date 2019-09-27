const jwt = require('express-jwt')
const jwtAuthz = require('express-jwt-authz')
const jwksRsa = require('jwks-rsa')
const createError = require('http-errors')
const request = require('request')
const decypher = require('decypher')
const { isString, get } = require('lodash')

const { executeQuery } = require('./lib/util/neo4j')
const { generateApiKey } = require('./lib/util/crypto')
const { generateUuid } = require('./lib/util/text')

const userQueries = decypher('./queries/user.cyp')

/**
 * Authentication middleware. When used, the
 * Access Token must exist and be verified against
 * the Auth0 JSON Web Key Set
 */
const checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and
  // the signing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: 'https://c2dh.eu.auth0.com/.well-known/jwks.json'
  }),

  // Validate the audience and the issuer.
  audience: 'c2dh-histograph',
  issuer: 'https://c2dh.eu.auth0.com/',
  algorithms: ['RS256']
})

const readOnly = jwtAuthz(['read:data'])

const AuthHeaderTokenRegex = /^Bearer\s+(.*)$/i

function getBearerToken(req) {
  return get(get(req.headers, 'authorization', '').match(AuthHeaderTokenRegex), 1)
}

async function fetchUserProfile(profileUrl, jwtToken) {
  return new Promise((res, rej) => {
    request.get(profileUrl, { auth: { bearer: jwtToken }, json: true }, (err, response, body) => {
      if (err) return rej(err)
      if (response.statusCode !== 200) return rej(createError(response.statusCode, body))
      return res(body)
    })
  })
}

function auth0UserProfileAsHistographUser(userProfile) {
  return {
    uuid: generateUuid(),
    status: 'enabled',
    username: userProfile.name,
    authId: userProfile.sub,
    picture: userProfile.picture,
    apiKey: generateApiKey()
  }
}

function presentHistographUser(user) {
  return {
    is_authentified: true,
    firstname: user.props.firstname,
    lastname: user.props.lastname,
    email: user.props.email,
    username: user.username,
    id: user.id,
    picture: user.props.picture,
    apiKey: user.props.apiKey
  }
}

async function getUserFromDbByApiKey(apiKey) {
  const result = await executeQuery(userQueries.get_by_api_key, { apiKey })
  return result[0]
}

async function getUserFromDb(authId) {
  const result = await executeQuery(userQueries.get_by_auth_id, { id: authId })
  return result[0]
}

async function saveUserInDb(user) {
  const result = await executeQuery(userQueries.save_user_by_auth_id, user)
  return result[0]
}

async function fetchAndSaveUser(profileUrl, jwtToken) {
  const userProfile = await fetchUserProfile(profileUrl, jwtToken)
  const user = auth0UserProfileAsHistographUser(userProfile)
  return saveUserInDb(user)
}

function getUserProfile(req, res, next) {
  const jwtData = req.user
  const profileUrl = get(jwtData, 'aud.1')
  const userId = get(jwtData, 'sub')
  const jwtToken = getBearerToken(req)

  if (!isString(profileUrl) || !isString(userId)) {
    throw createError(404, `JWT Token malformed or not present. Could not find Profile URL (${profileUrl}) and/or User ID (${userId}).`)
  }

  getUserFromDb(userId)
    .then(user => {
      if (!user) return fetchAndSaveUser(profileUrl, jwtToken)
      return user
    })
    .then(user => {
      req.user = presentHistographUser(user)
      next()
    })
    .catch(next)
}

/**
 * Middleware for authenticating user with an API Key.
 * API Key can be provided as a bearer token or
 * a query parameter (overrides token).
 * @param {Request} req request
 * @param {Response} res response
 * @param {function} next callback
 */
function apiKeyAuthMiddleware(req, res, next) {
  const { apiKey: apiKeyQueryParameterValue } = req.query

  const apiKeyHeaderValue = getBearerToken(req)
  const apiKey = apiKeyQueryParameterValue || apiKeyHeaderValue

  if (!isString(apiKey)) return next(createError(403, 'No API Key Provided ("apiKey")'))
  return getUserFromDbByApiKey(apiKey)
    .then(user => {
      if (!user) return next(createError(403, 'Invalid API Key'))
      req.user = presentHistographUser(user)
      return next()
    })
    .catch(next)
}

module.exports = {
  apiKeyAuthMiddleware,
  checkJwt,
  readOnly,
  getUserProfile
}
