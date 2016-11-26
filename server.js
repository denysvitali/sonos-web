'use strict';
const fs = require('fs');
const colors = require('colors');
const util = require('util');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const sonos = require('sonos');
const Listener = require('sonos/lib/events/listener');
const parseXML = require('xml2js').parseString;
const crypto = require('crypto');
const request = require('request');
const sprintf = require('sprintf-js').sprintf;


// Providers
const PTuneIn = require('./inc/tunein');

var SonosWeb = {
    port: 8888,
    app: app
};

require('dns').lookup(require('os').hostname(), function(err, addr) {
    SonosWeb._ipaddress = addr;
    init();
});

const nullf = () => {};

// Console functions
const warn = (msg) => {
    console.log(('[W] ' + msg).yellow);
};

const info = (msg) => {
    console.log(('[I] ' + msg).blue);
};

const error = (msg) => {
    console.log(('[E] ' + msg).red);
};

console.inspect = (item) => {
    console.log(util.inspect(item, {
        colors: true,
        depth: 10
    }));
};

SonosWeb.addMenuEntry = (icon, title, page, order) => {
    SonosWeb.menu.push([icon, title, page, order]);
    SonosWeb.menu.sort((a, b) => {
        if (a[3] < b[3]) {
            return -1;
        } else if (a[3] > b[3]) {
            return 1;
        } else {
            return 0;
        }
    });
};

SonosWeb.express = express;

var menu_default = [
    ['fa-home', 'Home', 'home', 0],
    ['fa-list', 'Queue', 'queue', 1000],
    ['fa-bug', 'Debug', 'debug', 8000],
    ['fa-gear', 'Settings', 'settings', 9000]
];

SonosWeb.menu = menu_default;

server.listen(SonosWeb.port);
info('App listening at 0.0.0.0:' + SonosWeb.port);

// Setup views
app.set('views', __dirname + '/src/views/');
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));
// Globals
var clientsReady = 0;
var thePlayer = null;

var pluginList = [];
var plugins = [];

var pluginExists = (name) => {
    var found = false;
    for (var i in pluginList) {
        if (pluginList.hasOwnProperty(i)) {
            if (pluginList[i].name === name) {
                found = true;
                break;
            }
        }
    }
    return found;
};

var addPlugin = (plugindir, json) => {
    if (pluginExists(json.name)) {
        warn('Trying to add an already existing plugin!');
        return;
    }
    var minimalJson = {};
    minimalJson.name = json.name;
    minimalJson.description = json.description;
    minimalJson.version = json.version;
    minimalJson.author = json.author;
    minimalJson.main = json.main;
    pluginList.push(json);
    var thePath = './plugins/' + plugindir + '/' + json.main;
    var Plugin = require(thePath);
    plugins[minimalJson.name] = new Plugin(SonosWeb);
    console.log(plugins[minimalJson.name]);
    info('Plugin ' + minimalJson.name + ' was loaded');
};

var parsePluginDir = (plugindir) => {
    try {
        var file = fs.readFileSync(__dirname + '/plugins/' + plugindir + '/package.json');
        var json = JSON.parse(file);
        file = null; //cleanup
        if (!json.hasOwnProperty('name')) {
            throw 'Property "name" is missing';
        }
        if (!json.hasOwnProperty('description')) {
            throw 'Property "description" is missing';
        }
        if (!json.hasOwnProperty('version')) {
            throw 'Property "version" is missing';
        }
        if (!json.hasOwnProperty('author')) {
            throw 'Property "author" is missing';
        }
        if (!json.hasOwnProperty('main')) {
            throw 'Property "main" is missing';
        }
        try {
            file = fs.readFileSync(__dirname + '/plugins/' + plugindir + '/' + json.main);
        } catch (e) {
            throw 'Main has not a valid value - the file specified is missing!';
        }
        addPlugin(plugindir, json);

    } catch (e) {
        warn('Plugin ' + plugindir + ' is not a valid plugin\nError: ' + e.toString());
    }
};

// Scan plugins directory for new plugins
var plugindir_content = fs.readdirSync(__dirname + '/plugins/');
for (var i in plugindir_content) {
    if (plugindir_content.hasOwnProperty(i)) {
        var stat = fs.statSync(__dirname + '/plugins/' + plugindir_content[i]);
        if (stat.isDirectory()) {
            parsePluginDir(plugindir_content[i]);
        }
    }
}


var albumArtCache = [];

// Routing
app.get('/sonos/getaa', (req, res) => {
    var url = '';
    if (thePlayer !== null) {
        var qry = req._parsedOriginalUrl.query;
        var hash = crypto.createHash('sha1');
        hash.setEncoding('hex');
        hash.write(qry);
        hash.end();
        var sum = hash.read();

        if (albumArtCache.indexOf(sum) !== -1) {
            res.send(fs.readFileSync(__dirname + '/cache/' + sum));
            return;
        }
        try {
            url = 'http://' + thePlayer.host + ':' + thePlayer.port + '/getaa?' + req._parsedOriginalUrl.query;
            var x = request(url);
            x.pipe(fs.createWriteStream(__dirname + '/cache/' + sum));
            x.pipe(res);
            albumArtCache.push(sum);
            console.log(albumArtCache);
        } catch (e) {
            url = '/img/dummy/album-cover.jpg';
        }
    } else {
        res.end('{error: 1}');
    }
});

app.get('/', (req, res) => {
    res.render('index', {
        menu: SonosWeb.menu
    });
});

app.get('/sonosTest', (req, res) => {
    console.log('========= SONOS - CUT HERE ========');
    console.log(util.inspect(req.headers, {
        colors: true,
        depth: null
    }));
    console.log('===================================');
    res.end();
});

app.get('/pages/home', (req, res) => {
    res.render('pages/home', {
        menu: SonosWeb.menu
    });
});

app.get('/pages/queue', (req, res) => {
    thePlayer.getQueue((err, data) => {
        if (!err) {
            console.log(data);
            res.render('pages/queue', {
                menu: SonosWeb.menu,
                queue: data
            });
            return;
        }
        res.render('pages/e/500', {
            menu: SonosWeb.menu
        });
    });
});

app.get('/pages/debug', (req, res) => {
    res.render('pages/debug', {
        menu: SonosWeb.menu
    });
});

app.get('/pages/settings', (req, res) => {
    res.render('pages/settings', {
        menu: SonosWeb.menu
    });
});

var SonosStatus = {
    playing: null,
    volume: {
        master: 0,
        LF: 0,
        RF: 0
    },
    zones: null
};

function broadcastState() {
    if (thePlayer !== null && clientsReady > 0) {
        thePlayer.currentTrack((error, data) => {
            if (!error) {
                //console.log(data);

                var track_data = {};

                //console.inspect(data.protocolData);

                track_data.type = 'other';

                /*if (data.protocolData.res[0] !== undefined) {
                    if (data.protocolData.res[0]['$'].protocolInfo.indexOf('sonos.com') === -1) {
                        track_data.title = data.title;
                        track_data.artist = data.artist;
                        track_data.album = data.album;
                        track_data.albumArtURI = data.albumArtURI;
                        track_data.type = 'song';
                    }
                }*/
                track_data.position = data.position;
                track_data.duration = data.duration;

                io.emit('track', track_data);
            }
        });
    }
}

function enableio() {

    function timingUpdate() {
        broadcastState();
        setTimeout(() => {
            timingUpdate();
        }, 800);
    }

    timingUpdate();

    io.on('connection', function(client) {
        info('Got connection');
        clientsReady++;
        sendCurrentTrack();
        client.emit('config', {
            ip: SonosWeb._ipaddress,
            port: SonosWeb.port
        });
        client.emit('status', SonosStatus);
        client.emit('currentSong', SonosStatus.playing);
        client.emit('playState', SonosStatus.playState);
        client.emit('volume', SonosStatus.volume);
        client.on('disconnect', function() {
            clientsReady--;
        });
        broadcastState();
        info('New client, now we have ' + clientsReady + ' ' + (clientsReady === 1 ? 'client' : 'clients'));
        playerControlEvents(client);
    });

    io.on('disconnection', function() {
        info('Disconnect');
        clientsReady--;
    });
}

function sendCurrentTrack() {
    if (thePlayer === null || io === null) {
        return;
    }
    thePlayer.currentTrack((error, data) => {
        if (!error) {
            io.emit('track', data);
        }
    });
}

function playerControlEvents(client) {
    client.on('do_play', () => {
        if (thePlayer !== null) {
            thePlayer.play(nullf);
            broadcastState();
        }
    });

    client.on('do_pause', () => {
        if (thePlayer !== null) {
            thePlayer.pause(nullf);
            broadcastState();
        }
    });

    client.on('do_next_track', () => {
        if (thePlayer !== null) {
            thePlayer.next(nullf);
            broadcastState();
        }
    });

    client.on('do_prev_track', () => {
        if (thePlayer !== null) {
            thePlayer.previous(nullf);
            broadcastState();
        }
    });

    client.on('do_mute', () => {
        if (thePlayer !== null) {
            thePlayer.setMuted(true, nullf);
            broadcastState();
        }
    });

    client.on('do_unmute', () => {
        if (thePlayer !== null) {
            thePlayer.setMuted(false, nullf);
            broadcastState();
        }
    });

    client.on('do_setVolume', (data) => {
        if (thePlayer !== null) {
            if (data.volume >= 0 && data.volume <= 100) {
                thePlayer.setVolume(data.volume, nullf);
                broadcastState();
            }
        }
    });

    // playManager
    function htmlEntities(unsafe) {
        if (unsafe === null) {
            return null;
        }
        return unsafe.replace(/[<>&'"]/g, function(c) {
            switch (c) {
                case '<':
                    return '&lt;';
                case '>':
                    return '&gt;';
                case '&':
                    return '&amp;';
                case '\'':
                    return '&apos;';
                case '"':
                    return '&quot;';
            }
        });
    }

    client.on('playUrl', (obj) => {
        var scplugin = plugins['sonos-web-soundcloud'];
        var metadata = '';
        var type = '';
        if (obj.trackUrl.indexOf('x-sonosapi-stream') !== -1) {
            type = 'sonos-stream';
        } else {
            type = 'song';
        }
        console.log(obj);
        try {
            metadata = fs.readFileSync(__dirname + '/src/didl/' + type + '.xml').toString();
            //metadata = metadata.replace(/%id%/g, crypto.createHash('md5').update(obj.trackUrl).digest('hex'));
            metadata = metadata.replace(/%title%/g, htmlEntities(obj.metadata.title));
            metadata = metadata.replace(/%artist%/g, htmlEntities(obj.metadata.artist));
            metadata = metadata.replace(/%url%/g, htmlEntities(obj.trackUrl));
            metadata = metadata.replace(/%album%/g, htmlEntities(obj.metadata.album));
            metadata = metadata.replace(/%albumart%/g, htmlEntities(obj.metadata.albumArt));
            metadata = metadata.replace(/%duration%/g, htmlEntities(obj.metadata.duration));
        } catch (e) {
            console.log('[METADATA ERROR] ' + e.stack);
            metadata = '';
        }

        console.log(metadata);
        console.log('Adding to queue?');
        if (obj.trackUrl.match(/x-sonosapi-stream/i)) {
            thePlayer.play({
                'uri': obj.trackUrl,
                'metadata': metadata
            }, nullf);
            console.log('sonos stream');
        } else {
            thePlayer.queue({
                'uri': obj.trackUrl,
                'metadata': metadata
            }, nullf);
        }
    });

    client.on('get_zoneInfo', () => {
        if (thePlayer === null) {
            return;
        }
        thePlayer.getZoneInfo((err, data) => {
            if (!err) {
                // Reply to sender only
                client.emit('zoneInfo', data);
            }
        });
    });

    client.on('get_track', () => {
        sendCurrentTrack();
    });
}

function init() {

    sonos.search(function(device) {
        console.log(device);
        thePlayer = device;

        thePlayer.selectQueue();

        var listener = new Listener(device);
        listener.listen((err) => {
            if (err) {
                throw err;
            }

            listener.addService('/MusicServices/Event', (error, sid) => {
                if (error) {
                    throw err;
                }
                console.log('Successfully subscribed, with subscription id', sid);
            });

            listener.addService('/MediaServer/ContentDirectory/Event', (error, sid) => {
                if (error) {
                    throw err;
                }
                console.log('Successfully subscribed, with subscription id', sid);
            });

            listener.addService('/MediaRenderer/RenderingControl/Event', (error, sid) => {
                if (error) {
                    throw err;
                }
                console.log('Successfully subscribed, with subscription id', sid);
            });

            listener.addService('/ZoneGroupTopology/Event', (error, sid) => {
                if (error) {
                    throw err;
                }
                console.log('Successfully subscribed, with subscription id', sid);
            });

            listener.addService('/MediaRenderer/AVTransport/Event', (error, sid) => {
                if (error) {
                    throw err;
                }
                console.log('Successfully subscribed, with subscription id', sid);
            });

            listener.on('serviceEvent', (endpoint, sid, data) => {
                //console.log(endpoint,sid,data);
                if (endpoint === '/MediaRenderer/AVTransport/Event') {
                    parseXML(data.LastChange, (err, result) => {
                        if (err) {
                            error('Unable to parse XML, the error was ' + err);
                            return;
                        }
                        console.inspect(result.Event.InstanceID, {
                            colors: true,
                            depth: 5
                        });

                        if (result.Event.InstanceID[0].hasOwnProperty('TransportStatus')) {
                            if (result.Event.InstanceID[0].TransportStatus[0].$.val === 'ERROR_NO_RESOURCE') {
                                error('Sonos couldn\'t find a resource:\n' + result.Event.InstanceID[0].TransportErrorURI[0].$.val);
                            }
                            return;
                        }
                        var playState = result.Event.InstanceID[0].TransportState[0].$.val;
                        console.log(playState);

                        SonosStatus.playState = playState;
                        io.emit('playState', playState);

                        var metadata;
                        var type;
                        if (result.Event.InstanceID[0].hasOwnProperty('r:EnqueuedTransportURIMetaData') && result.Event.InstanceID[0]['r:EnqueuedTransportURIMetaData'][0].$.val !== '') {
                            metadata = result.Event.InstanceID[0]['r:EnqueuedTransportURIMetaData'][0].$.val;
                            type = 'radio';
                        } else if (result.Event.InstanceID[0].hasOwnProperty('AVTransportURIMetaData') && result.Event.InstanceID[0].AVTransportURIMetaData[0].$.val !== '') {
                            metadata = result.Event.InstanceID[0].AVTransportURIMetaData[0].$.val;
                            type = 'radio';
                        } else if (result.Event.InstanceID[0].hasOwnProperty('CurrentTrackMetaData') && result.Event.InstanceID[0].hasOwnProperty('CurrentTrackMetaData') !== '') {
                            metadata = result.Event.InstanceID[0]['CurrentTrackMetaData'][0].$.val;
                            type = 'song';
                        }

                        var albumArtURI = null;
                        var AVTransportURI = null;
                        if (result.Event.InstanceID[0].AVTransportURI !== undefined) {
                            AVTransportURI = result.Event.InstanceID[0].AVTransportURI[0].$.val.toString();
                        } else if (result.Event.InstanceID[0]['r:EnqueuedTransportURI'] !== undefined) {
                            AVTransportURI = result.Event.InstanceID[0]['r:EnqueuedTransportURI'][0].$.val.toString();
                        }

                        if (AVTransportURI !== null) {
                            var matches = AVTransportURI.match(/x-sonosapi-stream:(.*?)\?sid=(\d+)&flags=(\d+)/i);
                            if (matches) {
                                // TuneIN
                                console.log('Okay, TuneIN!');
                                var radio = new PTuneIn(matches[1]);
                                console.log(radio.getMetadata);

                                var niu = (el) => {
                                    return (el !== undefined ? el : null);
                                };

                                radio.getMetadata().then((data) => {
                                        console.log('Got result... data!', data);
                                        var songInfo = {
                                            title: data.title[0],
                                            artist: niu(data.streamMetadata[0].currentShow[0]),
                                            duration: null,
                                            albumArtURI: 'http://cdn-radiotime-logos.tunein.com/' + matches[1] + 'g.png',
                                            radio: {
                                                language: niu(data.language[0]),
                                                title: niu(data.title),
                                                country: niu(data.country[0]),
                                                liveNow: niu(data.liveNow[0]),
                                                genre: niu(data.genre[0]),
                                                genreId: niu(data.genreId[0]),
                                                currentHost: niu(data.streamMetadata[0].currentHost[0]),
                                                currentShow: niu(data.streamMetadata[0].currentShow[0]),
                                                stationTitle: niu(data.streamMetadata[0].title[0]),
                                                stationSubtitle: niu(data.streamMetadata[0].subtitle[0]),
                                                bitrate: niu(data.streamMetadata[0].bitrate[0]),
                                                onDemand: niu(data.onDemand[0]),
                                                twitter: niu(data.twitterId[0]),
                                            }
                                        };
                                        SonosStatus.playing = songInfo;
                                        io.emit('currentSong', songInfo);
                                    })
                                    .catch((error) => {
                                        console.log(error);
                                    });


                                albumArtURI = 'http://cdn-radiotime-logos.tunein.com/' + matches[1] + 'g.png';
                                console.log(albumArtURI);
                            }
                        } else {
                            console.log('AVTransportURI is null!');
                        }

                        console.log(type);
                        if (metadata !== undefined && metadata !== '') {
                            console.log(metadata);
                            parseXML(metadata, (err, result) => {
                                if (err) {
                                    error('Unable to parse metadata XML, the error was ' + err);
                                    return;
                                }
                                console.inspect(result);

                                console.log(result['DIDL-Lite'].item[0]['dc:title'][0]);
                                var aaURI = albumArtURI || (result['DIDL-Lite'].item[0]['upnp:albumArtURI'] !== undefined ? result['DIDL-Lite'].item[0]['upnp:albumArtURI'][0] : null);
                                var songInfo = {
                                    title: result['DIDL-Lite'].item[0]['dc:title'][0],
                                    artist: (result['DIDL-Lite'].item[0]['dc:creator'] !== undefined ? result['DIDL-Lite'].item[0]['dc:creator'][0] : null),
                                    duration: (result['DIDL-Lite'].item[0].res !== undefined ? result['DIDL-Lite'].item[0].res[0].$.duration : null),
                                    albumArtURI: aaURI
                                };
                                console.inspect(songInfo);

                                SonosStatus.playing = songInfo;
                                io.emit('currentSong', songInfo);
                            });
                        }
                    });
                } else if (endpoint === '/MediaRenderer/RenderingControl/Event') {
                    parseXML(data.LastChange, (err, result) => {
                        if (!err) {
                            var volObj = result.Event.InstanceID[0].Volume;

                            var MasterVol = 0;
                            var LFVol = 0;
                            var RFVol = 0;

                            for (var i in volObj) {
                                if (volObj.hasOwnProperty(i)) {
                                    switch (volObj[i]['$'].channel) {
                                        case 'Master':
                                            MasterVol = volObj[i]['$'].val;
                                            break;

                                        case 'LF':
                                            LFVol = volObj[i]['$'].val;
                                            break;

                                        case 'RF':
                                            RFVol = volObj[i]['$'].val;
                                            break;
                                    }
                                }
                            }

                            var SVolObj = {
                                'master': MasterVol,
                                'LF': LFVol,
                                'RF': RFVol
                            };

                            SonosStatus.volume = SVolObj;
                            io.emit('volume', SVolObj);
                        }
                    });
                } else if (endpoint === '/ZoneGroupTopology/Event') {
                    console.log('Got ZoneGroupTopology event');
                    parseXML(data.ZoneGroupState, (err, result) => {
                        console.inspect(result);
                        // TODO: Implement zone management

                    });
                    console.inspect(data);
                } else if (endpoint === '/MusicServices/Event') {
                    console.log('=========== MUSIC SERVICES EVENT ============');
                    console.inspect(data);
                } else {
                    console.log('Got a new event with enpoint: ' + endpoint);
                }
            });
        });

        thePlayer.getVolume((err, res) => {
            if (!err) {
                SonosStatus.volume.master = res;
                io.emit('volume', {
                    'master': res
                });
            }
        });
        enableio();
    });
}
