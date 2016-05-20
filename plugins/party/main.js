'use strict';
(() => {
    var sprintf = require('sprintf-js').sprintf;
    var express = require('express');
    class Party {
        constructor(SonosWeb) {
            // Called when plugin is loaded
            console.log('Plugin ready', SonosWeb);
            var request = require('request');
            this._request = request;
            this._ua = 'Sonos-Web (https://github.com/denysvitali/sonos-web)';
            SonosWeb.app.use('/plugins/party/', express.static(__dirname + '/client'));
            SonosWeb.app.use('/pages/party/', (req, res) => {
                res.render('../../plugins/party/server/pages/party');
            });
            SonosWeb.addMenuEntry('fa-music', 'Party', 'party', 2000);
        }
    }
    module.exports = Party;
})();