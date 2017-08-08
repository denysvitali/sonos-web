'use strict';
(() => {
    var sprintf = require('sprintf-js').sprintf;
    class SoundCloud {
        constructor(SonosWeb) {
            // Called when plugin is loaded
            var request = require('request');
            this._request = request;
            this._ua = 'Sonos-Web (https://github.com/denysvitali/sonos-web)';
            this._getWidgetJs();
            SonosWeb.app.use('/plugins/soundcloud/', SonosWeb.express.static(__dirname + '/client'));
            SonosWeb.app.get('/pages/soundcloud', (req, res) => {
                var charts = ['all-music', 'ambient', 'deephouse'];
                var chartsObj = {};
                var promiseArr = [];
                var promPush = (el) => {
                    promiseArr.push(this.getTopChart(el).then((result) => {
                        chartsObj[result.cat] = result.coll;
                    }));
                };
                for (var i in charts) {
                    if (charts.hasOwnProperty(i)) {
                        promPush(charts[i]);
                    }
                }
                Promise.all(promiseArr).then(() => {
                    res.render('../../plugins/soundcloud/server/pages/soundcloud', {
                        charts: chartsObj
                    });
                }).catch((e) => {
                    console.log('SC page promise error! ' + e);
                });
            });
            SonosWeb.app.get('/plugins/soundcloud/suggest/:text', (req, res) => {
                console.log(req.params.text);
                this.suggestSong(req.params.text).then((val) => {
                    res.end(JSON.stringify({
                        'results': val
                    }));
                }).catch((e) => {
                    console.log('[SC] Got error ' + e);
                    res.end('{results:[]}');
                });
            });

            SonosWeb.app.get('/plugins/soundcloud/resolve/:url', (req, res) => {
                if (req.params.url.match(/^http(?:s|):\/\/(?:www\.|)soundcloud\.com\/(.*?)\/(.*?)$/i)) {
                    this.getMp3Info(req.params.url)
                        .then((songInfo) => {
                            res.json(songInfo);
                        });
                } else {
                    res.json({
                        success: false,
                        error: {
                            text: 'Bad url'
                        }
                    });
                }
            });

            SonosWeb.app.get('/plugins/soundcloud/play/:element', (req, res) => {
                if (req.params.element !== null && req.params.element !== '') {
                    var scUrl = 'https://soundcloud.com/' + req.params.element;
                    console.log(scUrl);
                    this.getMp3(scUrl)
                        .then((mp3Url) => {
                            request(mp3Url).pipe(res);
                        })
                        .catch((error) => {
                            console.log("[SC] Got a promise error: " + error);
                            res.end(500);
                        })
                }
            });

            SonosWeb.addMenuEntry('fa-soundcloud', 'Soundcloud', 'soundcloud', 4000);
        }

        _getWidgetJs() {
            //load soundcloud dummy embedded url to get the widget.js file path
            this._request('https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/34019569', {
                headers: {
                    'User-Agent': this._ua
                }
            }, (err, res, body) => {
                var widgetsrc = body.match(/<script src\=\"(.*widget-(?:.*?).js)\"\>/i);
                if (!widgetsrc) {
                    console.log('[Soundcloud] Unable to get widget src!');
                    return;
                }
                widgetsrc = widgetsrc[1];
                if (widgetsrc.indexOf('/') === 0) {
                    // relative url
                    this._request('https://w.soundcloud.com' + widgetsrc, {
                        headers: {
                            'User-Agent': this._ua
                        }
                    }, (err, res, body) => {
                        this._parseWidgetJs(body);
                    });
                } else {
                    this._request(widgetsrc, (err, res, body) => {
                        this._parseWidgetJs(body);
                    });
                }
            });
        }

        _parseWidgetJs(body) {
            var clientId = body.match(/client_id:u\?".*?":"([A-z0-9]{32})"/i);
            if (!clientId) {
                console.log('[SoundCloud] Client ID not found!');
                return;
            }
            this._clientId = clientId[1];
            console.log('[SC] Client ID set to '+this._clientId);
        }

        getTopChart(category) {
            var t = this;
            var url = 'https://api-v2.soundcloud.com/charts?kind=top&genre=' + encodeURIComponent('soundcloud:genres:' + category) + '&client_id=' + this._clientId + '&limit=100';
            return new Promise((resolve, reject) => {
                t._request(url, {
                    headers: {
                        'User-Agent': t._ua
                    }
                }, (err, res, body) => {
                    try {
                        var json = JSON.parse(body);
                        if (json.collection.length !== 0) {
                            for (var i in json.collection) {
                                if (json.collection.hasOwnProperty(i)) {
                                    if (json.collection[i].track.artwork_url !== undefined && json.collection[i].track.artwork_url !== null) {
                                        json.collection[i].track.artwork_url = json.collection[i].track.artwork_url.replace(/^(.*?)-large.jpg$/, '$1-t500x500.jpg');
                                    } else {
                                        json.collection[i].track.artwork_url = json.collection[i].track.user.avatar_url.replace(/^(.*?)-large.jpg$/, '$1-t500x500.jpg');
                                    }
                                }
                            }
                            resolve({
                                cat: category,
                                coll: json.collection
                            });
                        } else {
                            resolve({});
                        }
                    } catch (e) {
                        console.log('error in getTopChart promise', url);
                        reject(e);
                    }
                });
            });
        }

        getMp3(url) {
            var t = this;
            return new Promise((resolve, reject) => {
                t.getMp3Info(url).then((songInfo) => {
                    var requrl = 'https://api.soundcloud.com/i1/tracks/' + songInfo.id + '/streams?client_id=' + t._clientId;
                    t._request(requrl, {
                        headers: {
                            'User-Agent': t._ua
                        }
                    }, (err, res, body) => {
                        try {
                            var json = JSON.parse(body);
                            if (json.hasOwnProperty('http_mp3_128_url')) {
                                resolve(json.http_mp3_128_url);
                                return;
                            }
                            throw 'not found';

                        } catch (e) {
                            reject(e);
                        }
                    });
                });
            });
        }

        getMp3Info(url) {
            var t = this;
            return new Promise((resolve, reject) => {
                var apiResolve = 'https://api.soundcloud.com/resolve?url=' + encodeURIComponent(url) + '&client_id=' + t._clientId;
                t._request(apiResolve, {
                    headers: {
                        'User-Agent': t._ua
                    },
                    followRedirect: true
                }, (err, res, body) => {
                    var songInfo = null;
                    try {
                        songInfo = JSON.parse(body);
                    } catch (e) {
                        reject(e);
                        return;
                    }
                    if (songInfo.id === undefined) {
                        reject('Invalid url');
                        return;
                    }
                    resolve(songInfo);
                });
            });
        }

        suggest(text) {
            var t = this;
            return new Promise((resolve, reject) => {
                var apiSuggest = 'https://api-v2.soundcloud.com/search/autocomplete?q=%s&queries_limit=%d&results_limit=%d&limit=%d&offset=%d&linked_partitioning=1&client_id=%s';
                var url = sprintf(apiSuggest, text, 10, 10, 10, 0, this._clientId);
                t._request(url, {
                    headers: {
                        'User-Agent': t._ua
                    }
                }, (err, res, body) => {
                    if (err) {
                        reject('Unable to get results');
                        return;
                    }
                    var json = JSON.parse(body);
                    console.log(json);
                    var results = [];
                    for (var i in json.results) {
                        if (json.results.hasOwnProperty(i)) {
                            if (json.results[i].kind !== 'track') {
                                continue;
                            }
                            var ritem = {};
                            ritem.text = json.results[i].output;
                            ritem.artwork = json.results[i].entity.artwork_url;
                            ritem.url = json.results[i].entity.permalink_url;
                            ritem.duration = json.results[i].entity.duration;
                            results.push(ritem);
                        }
                    }
                    resolve(results);
                });
            });
        }

        suggestSong(text) {
            var t = this;
            return new Promise((resolve, reject) => {
                var apiSuggest = 'https://api-v2.soundcloud.com/search/tracks?q=%s&results_limit=%d&limit=%d&offset=%d&linked_partitioning=1&client_id=%s';
                var url = sprintf(apiSuggest, text, 10, 10, 0, this._clientId);
                t._request(url, {
                    headers: {
                        'User-Agent': t._ua
                    }
                }, (err, res, body) => {
                    if (err) {
                        reject('Unable to get results');
                        return;
                    }
                    var json = JSON.parse(body);
                    var results = [];
                    for (var i in json.collection) {
                        if (json.collection.hasOwnProperty(i)) {
                            if (json.collection[i].kind !== 'track') {
                                continue;
                            }
                            var ritem = {};
                            ritem.text = json.collection[i].title;
                            ritem.artwork = (json.collection[i].artwork_url !== null ? json.collection[i].artwork_url.toString().replace('large', 't500x500') : null);
                            ritem.url = json.collection[i].permalink_url;
                            ritem.duration = json.collection[i].duration;
                            ritem.artist = json.collection[i].user.username;
                            results.push(ritem);
                        }
                    }
                    resolve(results);
                });
            });
        }
    }
    module.exports = SoundCloud;
})();
