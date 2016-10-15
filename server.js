'use strict';
const fs = require('fs');
require('colors');
const util = require('util');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const sonos = require('sonos');
const request = require('request');

var SonosWeb = {
    port: 8888,
    app: app
};

require('dns').lookup(require('os').hostname(), (err, addr) => {
    SonosWeb._ipaddress = addr;
    init();
});

const nullf = () => {};

// Console functions
const warn = (msg) => {
    console.log(`[W] ${msg}`.yellow);
};

const info = (msg) => {
    console.log(`[I] ${msg}`.blue);
};

const err = (msg) => {
    console.log(`[E] ${msg}`.red);
};

SonosWeb.addMenuEntry = (icon, title, page, order) => {
    SonosWeb.menu.push([icon, title, page, order]);
    SonosWeb.menu.sort((a, b) => {
        if (a[3] < b[3]) {
            return -1;
        }
        if (a[3] > b[3]) {
            return 1;
        }
        return 0;
    });
};

SonosWeb.express = express;

const menu_default = [
    ['fa-home', 'Home', 'home', 0],
    ['fa-list', 'Queue', 'queue', 1000],
    ['fa-bug', 'UI Debug', 'uidebug', 8000],
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
    let found = false;
    for (const plugin of pluginList) {
        if (plugin.name !== name) {
            continue;
        }
        found = true;
        break;
    }
    return found;
};

var addPlugin = (plugindir, json) => {
    if (pluginExists(json.name)) {
        warn('Trying to add an already existing plugin!');
        return;
    }
    const minimalJson = {
        name: json.name,
        description: json.description,
        version: json.version,
        author: json.author,
        main: json.main
    };
    pluginList.push(json);
    const thePath = `./plugins/${plugindir}/${json.main}`;
    const Plugin = require(thePath);
    plugins[minimalJson.name] = new Plugin(SonosWeb);
    console.log(plugins[minimalJson.name]);
    info(`Plugin ${minimalJson.name} was loaded`);
};

var parsePluginDir = (plugindir) => {
    try {
        let file = fs.readFileSync(`${__dirname}/plugins/${plugindir}/package.json`);
        const json = JSON.parse(file);
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
            file = fs.readFileSync(`${__dirname}/plugins/${plugindir}/${json.main}`);
        } catch (e) {
            throw 'Main has not a valid value - the file specified is missing!';
        }
        addPlugin(plugindir, json);

    } catch (e) {
        warn(`Plugin ${plugindir} is not a valid plugin\nError: ${e.toString()}`);
    }
};

// Scan plugins directory for new plugins
var plugindir_content = fs.readdirSync(`${__dirname}/plugins/`);
for (const file of plugindir_content) {
    const stat = fs.statSync(`${__dirname}/plugins/${file}`);
    if (!stat.isDirectory()) {
        continue;
    }
    parsePluginDir(file);
}



// Routing
app.get('/sonos/getaa', (req, res) => {
    let url = '';
    if (thePlayer === null) {
        res.end('{error: 1}');
        return;
    }
    try {
        url = `http://${thePlayer.host}:${thePlayer.port}/getaa?${req._parsedOriginalUrl.query}`;
        request(url).pipe(res);
    } catch (e) {
        url = '/img/dummy/album-cover.jpg';
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
    if (thePlayer === null) {
        return;
    }
    if (clientsReady <= 0) {
        return;
    }
    thePlayer.getState().then(([status, track, volume, isMuted, zone]) => {
        io.emit('data', {
            'roomName': zone.CurrentZoneName,
            'state': status.toUpperCase(),
            track,
            volume,
            isMuted
        });
    });
}

function enableio() {

    function timingUpdate() {
        broadcastState();
        setTimeout(timingUpdate, 500);
    }

    timingUpdate();

    io.on('connection', (client) => {
        info('Got connection');
        clientsReady++;
        client.on('disconnect', function() {
            clientsReady--;
        });
        broadcastState();
        info(`New client, now we have ${clientsReady} client${clientsReady === 1 ? '' : 's'}`);
        playerControlEvents(client);
    });

    io.on('disconnection', () => {
        info('Disconnect');
        clientsReady--;
    });
}

function playerControlEvents(client) {
    client.on('do_play', () => {
        if (thePlayer === null) {
            return;
        }
        thePlayer.play(nullf);
        broadcastState();
    });

    client.on('do_pause', () => {
        if (thePlayer === null) {
            return;
        }
        thePlayer.pause(nullf);
        broadcastState();
    });

    client.on('do_next_track', () => {
        if (thePlayer === null) {
            return;
        }
        thePlayer.next(nullf);
        broadcastState();
    });

    client.on('do_prev_track', () => {
        if (thePlayer === null) {
            return;
        }
        thePlayer.previous(nullf);
        broadcastState();
    });

    client.on('do_mute', () => {
        if (thePlayer === null) {
            return;
        }
        thePlayer.setMuted(true, nullf);
        broadcastState();
    });

    client.on('do_unmute', () => {
        if (thePlayer === null) {
            return;
        }
        thePlayer.setMuted(false, nullf);
        broadcastState();
    });

    client.on('do_setVolume', (data) => {
        if (thePlayer === null) {
            return;
        }
        if (data.volume < 0) {
            return;
        }
        if (data.volume > 100) {
            return;
        }
        thePlayer.setVolume(data.volume, nullf);
        broadcastState();
    });

    // playManager
    function htmlEntities(unsafe) {
        if (unsafe === null) {
            return null;
        }
        return unsafe.replace(/[<>&'"]/g, (c) => {
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
                default:
                    throw new Error('Unexpected character');
            }
        });
    }

    client.on('playUrl', (obj) => {
        const scplugin = plugins['sonos-web-soundcloud'];
        let metadata = '';
        let type = '';
        /*if (obj.trackUrl.indexOf('x-rincon-mp3radio://') !== -1) {
            type = 'radio';
        } else {
            type = 'song';
        }*/
        type = 'song';
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
                let trackUrl = '';
                if (res.length > 255) {
                    const audioProxy = plugins['sonos-web-audioproxy'];
                    if (audioProxy === undefined) {
                        warn('Unable to play track: trackUrl is too big and audioproxy isn\'t available');
                        return;
                    }
                    let theId = audioProxy.addAudioUrl(res);
                    trackUrl = `http://${SonosWeb._ipaddress}:${SonosWeb.port}${audioProxy.ENDPOINT}/${theId}`;
                } else {
                    trackUrl = res;
                }
                metadata = metadata.replace(/%uri%/g, trackUrl);
                //thePlayer.addURIToQueue(res, metadata, true);
                thePlayer.queue({
                    'uri': trackUrl,
                    'metadata': metadata
                }, nullf);
            });
        } else {
            thePlayer.queue({
                'uri': obj.trackUrl,
                'metadata': metadata
            }, nullf);
        }
    });
}

function init() {

    sonos.search((device) => {
        console.log(device);
        thePlayer = device;

        thePlayer.getState = () => Promise.all([
            new Promise((resolve, reject) => {
                device.getCurrentState((err, state) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(state);
                });
            }),

            new Promise((resolve, reject) => {
                device.currentTrack((err, track) => {
                    info('Getting current track');
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(track);
                });
            }),

            new Promise((resolve, reject) => {
                device.getVolume((err, volume) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(volume);
                });
            }),

            new Promise((resolve, reject) => {
                device.getMuted((err, muted) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(muted);
                });
            }),

            new Promise((resolve, reject) => {
                device.getZoneAttrs((err, data) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(data);
                });
            }),

            new Promise((resolve, reject) => {
                device.getTopology((err, data) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(data);
                });
            }),

            new Promise((resolve, reject) => {
                device.deviceDescription((err, data) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(data);
                });
            })
        ]);
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
