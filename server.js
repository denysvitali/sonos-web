'use strict';
const fs = require('fs');
const color = require('color');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const SonosDiscovery = require('sonos-discovery');
const request = require('request');
const crypto = require('crypto');

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

// Server init

var port = 8888;
server.listen(port);
info('App listening at 0.0.0.0:' + port);

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
    plugins[minimalJson.name] = new Plugin();
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


var escapeHTML = (string) => {
    return string.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};



// Routing
app.get('/sonos/getaa', (req, res) => {
    if (thePlayer !== null) {
        var url = 'http://' + thePlayer.address + ':1400/getaa?' + req._parsedOriginalUrl.query;
        request(url).pipe(res);
    } else {
        res.end('{error: 1}');
    }
});

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/pages/home', (req, res) => {
    res.render('pages/home');
});

app.get('/pages/queue', (req, res) => {
    res.render('pages/queue');
});

app.get('/pages/party', (req, res) => {
    res.render('pages/party');
});

app.get('/pages/soundcloud', (req, res) => {
    var scplugin = plugins['sonos-web-soundcloud'];
    if (scplugin !== undefined) {
        var charts = ['all-music','ambient', 'deephouse'];
        var chartsObj = {};
        var promiseArr = [];
        for (var i in charts) {
            if (charts.hasOwnProperty(i)) {
                promiseArr.push(scplugin.getTopChart(charts[i]).then((result) => {
                    chartsObj[result.cat] = result.coll;
                }));
            }
        }
        Promise.all(promiseArr).then(() => {
            res.render('pages/soundcloud', {
                charts: chartsObj
            });
        }).catch((e) => {
            console.log('SC page promise error! ' + e);
        });
    } else {
        res.render('pages/home');
    }
});

app.get('/pages/uidebug', (req, res) => {
    res.render('pages/uidebug');
});

app.get('/pages/settings', (req, res) => {
    res.render('pages/settings');
});

function broadcastState() {
    if (thePlayer !== null && clientsReady > 0) {
        var aa = thePlayer.getState();
        io.emit('data', {
            state: aa,
            roomName: thePlayer.roomName
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
            thePlayer.play();
            broadcastState();
        }
    });

    client.on('do_pause', () => {
        if (thePlayer !== null) {
            thePlayer.pause();
            broadcastState();
        }
    });

    client.on('do_mute', () => {
        if (thePlayer !== null) {
            thePlayer.mute(1);
            broadcastState();
        }
    });

    client.on('do_unmute', () => {
        if (thePlayer !== null) {
            thePlayer.mute(0);
            broadcastState();
        }
    });

    client.on('do_setVolume', (data) => {
        if (thePlayer !== null) {
            if (data.volume >= 0 && data.volume <= 100) {
                thePlayer.setVolume(data.volume);
                broadcastState();
            }
        }
    });

    // playManager

    client.on('playUrl', (obj) => {
        var scplugin = plugins['sonos-web-soundcloud'];
        var metadata;
        var type = '';
        if(obj.trackUrl.indexOf('x-rincon-mp3radio://') !== -1)
        {
            console.log('radio');
            type = 'radio';
        }
        else{
            type = 'song';
        }
        try {
            metadata = fs.readFileSync(__dirname + '/src/didl/'+type+'.xml').toString();
            //metadata = metadata.replace(/%id%/g, crypto.createHash('md5').update(obj.trackUrl).digest('hex'));
            metadata = metadata.replace(/%id%/g, Math.round(Math.random() * 100000));
            metadata = metadata.replace(/%title%/g, escapeHTML(obj.metadata.title));
            metadata = metadata.replace(/%artist%/g, 'Various');
            metadata = metadata.replace(/%album%/g, obj.metadata.album);
            metadata = metadata.replace(/%albumart%/g, obj.metadata.albumArt);
            metadata = metadata.replace(/%duration%/g, obj.metadata.duration);
        } catch (e) {
            console.log('[ERROR] Metadata file not found!' + e);
            metadata = '';
        }


        if (obj.trackUrl.match(/http(?:|s):\/\/(?:www\.|)soundcloud\.com\//i) && scplugin !== undefined) {
            console.log('okay, hello sc!');
            scplugin.getMp3(obj.trackUrl).then((res) => {
                metadata = metadata.replace(/%uri%/g, res);
                thePlayer.setAVTransportURI(res, metadata);
                thePlayer.play();
            });
        } else {
            thePlayer.setAVTransportURI(obj.trackUrl, metadata);
            thePlayer.play();
        }
    });
}

var discovery = new SonosDiscovery();
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