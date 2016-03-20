'use strict';
(() => {
    class SoundCloud {
        constructor() {
            // Called when plugin is loaded
            var request = require('request');
            this._request = request;
            this._ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0';
            this._getWidgetJs();
        }

        _getWidgetJs() {
            //load soundcloud dummy embedded url to get the widget.js file path
            this._request('https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/34019569', {
                headers: {
                    'User-Agent': this._ua
                }
            }, (err, res, body) => {
                var widgetsrc = body.match(/<script src\=\"((?:.*?)widget-(?:.*?).js)\"\>/i);
                if (!widgetsrc) {
                    console.log('[Soundcloud] Unable to get widget src!');
                    return;
                }
                widgetsrc = widgetsrc[1];
                if (widgetsrc.indexOf('/') === 0) {
                    // absolute url
                    this._request('https://w.soundcloud.com' + widgetsrc, (err, res, body) => {
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
            var clientId = body.match(/config\/client-ids.*?production:"(.*?)"/i);
            if (!clientId) {
                console.log('[SoundCloud] Client ID not found!');
                return;
            }
            this._clientId = clientId[1];
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
                        	for(var i in json.collection)
                        	{
                        		if(json.collection.hasOwnProperty(i))
                        		{
                        			if(json.collection[i].track.artwork_url !== undefined && json.collection[i].track.artwork_url !== null)
                        			{
                        				json.collection[i].track.artwork_url = json.collection[i].track.artwork_url.replace(/^(.*?)-large.jpg$/,'$1-t500x500.jpg');
                        			}
                        			else{
                        				json.collection[i].track.artwork_url = json.collection[i].track.user.avatar_url.replace(/^(.*?)-large.jpg$/,'$1-t500x500.jpg');
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
                console.log(apiResolve);
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
    }

    module.exports = SoundCloud;
})();