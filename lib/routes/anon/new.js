/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const auth = require('../../auth');
const db = require('../../db');
const hex = require('buf').to.hex;


module.exports = {
  handler: function activateRegistration(req, reply) {
    console.log(req.body);
    var generatedEmail = 'clientId-EbEcbUibCvbNRGjuhDPpvcXn8iNez9qYbccYvGNzZGCzpFEbfa@fmail.link';

    reply({
      displayName: 'Sneaky Owl',
      email: generatedEmail,
      avatar: 'http://freedesignfile.com/upload/2012/10/Orange-backgrounds-2.jpg'
    });
  }
};
