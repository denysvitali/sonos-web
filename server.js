'use strict';
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var SonosDiscovery = require('sonos-discovery');
var request = require('request');

var port = 8888;
server.listen(port);
console.log('App listening at 0.0.0.0:' + port);

// Setup views
app.set('views', __dirname + '/src/views/');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));

// Globals
var clientsReady = 0;
var thePlayer = null;

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

function broadcastState() {
    if (thePlayer !== null && clientsReady > 0) {
        var aa = thePlayer.getState();
        io.emit('data', {
            state: aa
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
        console.log('Got connection');
        clientsReady++;
        client.on('disconnect', function() {
            clientsReady--;
        });
        broadcastState();
        console.log('New client, now we\'re ' + clientsReady + ' clients');
        playerControlEvents(client);
    });

    io.on('disconnection', function() {
        console.log('Disconnect');
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
}

var discovery = new SonosDiscovery();
discovery.on('transport-state', function(player) {
    thePlayer = discovery.players[thePlayer.uuid];
    io.emit('data', {
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

discovery.on('volume', function(player) {
    if (thePlayer !== null) {
        if (clientsReady > 0) {
            io.emit('volume', {
                'volume': thePlayer.state.volume
            });
        }
    }
});