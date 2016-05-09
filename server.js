'use strict';
const fs = require('fs');
const color = require('color');
const util = require('util');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const sonos = require('sonos');
const request = require('request');
const sprintf = require('sprintf-js').sprintf;

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

const err = (msg) => {
    console.log(('[E] ' + msg).red);
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

var menu_default = [
    ['fa-home', 'Home', 'home', 0],
    ['fa-list', 'Queue', 'queue', 1000],
    ['fa-music', 'Party', 'party', 2000],
    ['fa-bug', 'UI Debug', 'uidebug', 8000],
    ['fa-gear', 'Settings', 'settings', 9000]
];

SonosWeb.menu = menu_default;

server.listen(SonosWeb.port);
info('App listening at 0.0.0.0:' + SonosWeb.port);

// Setup views
app.set('views', __dirname + '/src/views/');
app.set('view engine', 'jade');
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



// Routing
app.get('/sonos/getaa', (req, res) => {
    var url = '';
    if (thePlayer !== null) {
        try {
            url = 'http://' + thePlayer.host + ':' + thePlayer.port + '/getaa?' + req._parsedOriginalUrl.query;
            request(url).pipe(res);
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
    res.render('pages/queue', {
        menu: SonosWeb.menu
    });
});

app.get('/pages/party', (req, res) => {
    res.render('pages/party', {
        menu: SonosWeb.menu
    });
});

app.get('/pages/uidebug', (req, res) => {
    res.render('pages/uidebug', {
        menu: SonosWeb.menu
    });
});

app.get('/pages/settings', (req, res) => {
    res.render('pages/settings', {
        menu: SonosWeb.menu
    });
});

function broadcastState() {
    if (thePlayer !== null && clientsReady > 0) {
        thePlayer.getState().then((result) => {
            var status = result[0];
            var track = result[1];
            var volume = result[2];
            var isMuted = result[3];
            var zone = result[4];

            io.emit('data', {
                'roomName': zone.CurrentZoneName,
                'state': status.toUpperCase(),
                'track': track,
                'volume': volume,
                'isMuted': isMuted
            });
        });
    }
}

function enableio() {

    function timingUpdate() {
        broadcastState();
        setTimeout(() => {
            timingUpdate();
        }, 500);
    }

    timingUpdate();

    io.on('connection', function(client) {
        info('Got connection');
        clientsReady++;
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
        if (obj.trackUrl.indexOf('x-rincon-mp3radio://') !== -1) {
            type = 'radio';
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


        if (obj.trackUrl.match(/http(?:|s):\/\/(?:www\.|)soundcloud\.com\//i) && scplugin !== undefined) {
            scplugin.getMp3(obj.trackUrl).then((res) => {
                var trackUrl = '';
                if (res.length > 255) {
                    var audioProxy = plugins['sonos-web-audioproxy'];
                    if (audioProxy === undefined) {
                        warn('Unable to play track: trackUrl is too big and audioproxy isn\'t available');
                        return;
                    }
                    var theId = audioProxy.addAudioUrl(res);
                    trackUrl = 'http://' + SonosWeb._ipaddress + ':' + SonosWeb.port + audioProxy.ENDPOINT + '/' + theId;
                } else {
                    trackUrl = res;
                }
                metadata = metadata.replace(/%uri%/g, trackUrl);
                //thePlayer.addURIToQueue(res, metadata, true);
                thePlayer.play({
                    'uri': trackUrl,
                    'metadata': metadata
                }, nullf);
            });
        } else {
            thePlayer.play({
                'uri': obj.trackUrl,
                'metadata': metadata
            }, nullf);
        }
    });
}

function init() {

    sonos.search(function(device) {
        console.log(device);
        thePlayer = device;

        thePlayer.getState = () => {
            var PromArr = [];
            PromArr.push(new Promise((resolve, reject) => {
                device.getCurrentState((err, state) => {
                    if (!err) {
                        resolve(state);
                        return;
                    }
                    reject(err);
                });
            }));

            PromArr.push(new Promise((resolve, reject) => {
                device.currentTrack((err, track) => {
                    if (!err) {
                        resolve(track);
                        return;
                    }
                    reject(err);
                });
            }));

            PromArr.push(new Promise((resolve, reject) => {
                device.getVolume((err, volume) => {
                    if (!err) {
                        resolve(volume);
                        return;
                    }
                    reject(err);
                });
            }));

            PromArr.push(new Promise((resolve, reject) => {
                device.getMuted((err, muted) => {
                    if (!err) {
                        resolve(muted);
                        return;
                    }
                    reject(err);
                });
            }));

            PromArr.push(new Promise((resolve, reject) => {
                device.getZoneAttrs((err, data) => {
                    if (!err) {
                        resolve(data);
                        return;
                    }
                    reject(err);
                });
            }));

            PromArr.push(new Promise((resolve, reject) => {
                device.getTopology((err, data) => {
                    if (!err) {
                        resolve(data);
                        return;
                    }
                    reject(err);
                });
            }));

            PromArr.push(new Promise((resolve, reject) => {
                device.deviceDescription((err, data) => {
                    if (!err) {
                        resolve(data);
                        return;
                    }
                    reject(err);
                });
            }));

            return Promise.all(PromArr);
        };
        enableio();
    });
}
/*var discovery = new SonosDiscovery();
discovery.on('transport-state', function() {
    thePlayer = discovery.players[thePlayer.uuid];
    io.emit('data', {
        'roomName': thePlayer.roomName,
        'state': thePlayer.state,
        'elapsedTime': thePlayer.elapsedTime
    });
});


discovery.on('topology-change', function(topology) {
    var player = topology[0];
    if (thePlayer === null) {
        thePlayer = discovery.players[player.uuid];
        enableio();
    }
});

discovery.on('volume', function() {
    if (thePlayer !== null) {
        if (clientsReady > 0) {
            io.emit('volume', {
                'volume': thePlayer.state.volume
            });
        }
    }
});
*/