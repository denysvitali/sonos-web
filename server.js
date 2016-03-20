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

app.get('/pages/home', (req, res) => {
    res.render('pages/home');
});

app.get('/pages/party', (req, res) => {
    res.render('pages/party');
});

app.get('/pages/uidebug', (req, res) => {
    res.render('pages/uidebug');
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

    // playManager

    client.on('playUrl', (obj) => {
        //var metadata = '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">  <item id="'+obj.trackUrl+'" parentID="100f006cFavoriteArtistTracksContainer%3a651391" restricted="true">    <dc:title>Superwoman (Radio Edit)</dc:title>    <upnp:class>object.item.audioItem.musicTrack</upnp:class>    <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON12807_k.nielsen81@gmail.com</desc>  </item></DIDL-Lite>';
        var metadata = '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"><item id="%url%" parentID="" restricted="true"><upnp:albumArtURI>%albumArt%</upnp:albumArtURI><dc:title>%title%</dc:title><upnp:class>object.item.audioItem.musicTrack</upnp:class>   <dc:creator>%artist%</dc:creator><upnp:album>%album%</upnp:album><upnp:originalTrackNumber>%trackNo%</upnp:originalTrackNumber><desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON2311_X_#Svc2311-0-Token</desc></item></DIDL-Lite>';
        metadata = metadata.replace('%url%', encodeURIComponent(obj.trackUrl));
        metadata = metadata.replace('%albumArt%', encodeURIComponent(obj.metadata.albumArt));
        metadata = metadata.replace('%title%', encodeURIComponent(obj.metadata.title));
        metadata = metadata.replace('%artist%', encodeURIComponent(obj.metadata.artist));
        metadata = metadata.replace('%album%', encodeURIComponent(obj.metadata.album));
        metadata = metadata.replace('%trackNo%', 1);
        /*var rand = '00030020';
        var track_id = 1234;
        var uri = 'x-sonos-spotify:spotify%3atrack%3a'+track_id;
        metadata = '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"><item id="' + rand + 'spotify%3atrack%3a' + track_id + '" restricted="true"><dc:title></dc:title><upnp:class>object.item.audioItem.musicTrack</upnp:class><desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON2311_X_#Svc2311-0-Token</desc></item></DIDL-Lite>';*/
        thePlayer.setAVTransportURI(obj.trackUrl, metadata);
    });
}

var discovery = new SonosDiscovery();
discovery.on('transport-state', function(player) {
    thePlayer = discovery.players[thePlayer.uuid];
    console.log(thePlayer.roomName);
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

discovery.on('volume', function(player) {
    if (thePlayer !== null) {
        if (clientsReady > 0) {
            io.emit('volume', {
                'volume': thePlayer.state.volume
            });
        }
    }
});