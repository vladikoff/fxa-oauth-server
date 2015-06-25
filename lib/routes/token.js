/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const AppError = require('../error');
const buf = require('buf').hex;
const hex = require('buf').to.hex;
const Joi = require('joi');

const config = require('../config');
const db = require('../db');
const encrypt = require('../encrypt');
const logger = require('../logging')('routes.token');
const validators = require('../validators');


function generateToken(code) {
  console.log('generateToken');
  console.log(code);
  var generatedEmail = 'pvcXn8iNez9qYbccYvGNzZGCzpFEbfa@fmail.link';
  code.email = generatedEmail;

  return [code.authAt, db.removeCode(code.code), db.generateToken(code)];
}

function toToken(authAt, _, token) {
  return {
    access_token: token.token.toString('hex'),
    token_type: token.type,
    scope: token.scope.join(' '),
    auth_at: authAt
  };
}


var payloadSchema = Joi.object({
  client_id: validators.clientId,
  client_secret: validators.clientSecret,
  code: Joi.string()
    .length(config.get('unique.code') * 2)
    .regex(validators.HEX_STRING)
    .required()
});

module.exports = {
  validate: {
    // stripUnknown is used to allow various oauth2 libraries to be used
    // with FxA OAuth. Sometimes, they will send other parameters that
    // we don't use, such as `response_type`, or something else. Instead
    // of giving an error here, we can just ignore them.
    payload: function validatePayload(value, options, next) {
      return Joi.validate(value, payloadSchema, { stripUnknown: true }, next);
    }
  },
  response: {
    schema: {
      access_token: Joi.string().required(),
      scope: Joi.string().required().allow(''),
      token_type: Joi.string().valid('bearer').required(),
      auth_at: Joi.number().required()
    }
  },
  handler: function tokenEndpoint(req, reply) {
    var params = req.payload;
    db.getClient(buf(params.client_id)).then(function(client) {
      if (!client) {
        logger.debug('client.notFound', { id: params.client_id });
        throw AppError.unknownClient(params.client_id);
      }

      var submitted = hex(encrypt.hash(buf(params.client_secret)));
      var stored = hex(client.secret);
      if (submitted !== stored) {
        logger.info('client.mismatchSecret', { client: params.client_id });
        logger.verbose('client.mismatchSecret.details', {
          submitted: submitted,
          db: stored
        });
        throw AppError.incorrectSecret(params.client_id);
      }

      return client;
    })
    .then(function(client) {
      return db.getCode(Buffer(req.payload.code, 'hex')).then(function(code) {
        if (!code) {
          logger.debug('code.notFound', { code: req.payload.code });
          throw AppError.unknownCode(req.payload.code);
        } else if (String(code.clientId) !== String(client.id)) {
          logger.debug('code.mismatch', {
            client: client.id.toString('hex'),
            code: code.clientId.toString('hex')
          });
          throw AppError.mismatchCode(req.payload.code, client.id);
        } else {
          // + because loldatemath. without it, it does string concat
          var expiresAt = +code.createdAt + config.get('expiration.code');
          if (Date.now() > expiresAt) {
            logger.debug('code.expired', { code: code });
            throw AppError.expiredCode(req.payload.code, expiresAt);
          }
        }
        return code;
      });
    })
    .then(generateToken)
    .spread(toToken)
    .done(reply, reply);
  }
};
