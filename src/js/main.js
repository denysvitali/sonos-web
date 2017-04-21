'use strict';
/* globals io */
import UI from './inc/uievents.js';
var socket_url = 'http://' + window.location.hostname + (window.location.port !== '' ? ':8888' : '');
var socket = io.connect(socket_url);
console.log(socket_url);
window.ui = new UI({
    socket: socket
});
window.ui.prepare();

var ui = window.ui; // linter is now happy

window.SonosWeb = {};
window.SonosStatus = {};
window.SonosStatus.playing = {};


socket.on('connect', function() {
    socket.emit('newclient', {});
    /*
    socket.on('data', function(data) {
        if (data.state !== undefined) {
            ui.setVolumeBarSize(data.state.volume);
            if (ui.getPlayState() === 0 && data.state === 'PLAYING') {
                ui.setPlayState(1);
                ui.setButtonPlaying();
            } else if (ui.getPlayState() === 1 && (data.state === 'STOPPED' || data.state === 'PAUSED')) {
                ui.setPlayState(0);
                ui.setButtonPaused();
            }

            if (data.roomName !== undefined) {
                if (ui.getRoomName() !== data.roomName) {
                    ui.setRoomName(data.roomName);
                }
            }

            if (data.state.mute === true && ui.getMuteState() === 0) {
                ui.setMuteState(1);
                ui.buttons.mute.doMute();
            } else if (data.state.mute === false && ui.getMuteState() === 1) {
                ui.setMuteState(0);
                ui.buttons.mute.doUnmute();
            }

            if (data.track.position !== undefined) {
                ui.setTrackTime(data.track.position, data.track.duration);
            }
            ui.setTrack(data.track);
            ui.setAlbumArt(data.track);
            ui.emit('track', data.track);
            ui.setVolumeBarSize(data.volume);
        }
    });
    */

    socket.on('config', (data)=>{
        console.log('Got config', data);
        SonosWeb._ipaddress = data.ip;
        SonosWeb._port = data.port;
    });

    socket.on('volume', (data) => {
        socket.parse('volume', data);
        // Master is always passed.
    });

    socket.on('playState', (data) => {
        // 1 = Playing, else Stopped / paused
        socket.parse('playState', data);
    });

    socket.on('currentSong', (data) => {
        socket.parse('currentSong', data);
    });

    socket.on('status', (data) => {
        SonosStatus = data;
        socket.parse('currentSong', data.playing);
        socket.parse('volume', data.volume);
        socket.parse('playState', data.playState);
    });

    socket.on('track', (data)=>{
        ui.setTrackTime(data.position, data.duration);
    });


    socket.parse = (event, data) => {
        switch (event) {
            case 'volume':
                SonosStatus.volume = data;
                ui.setVolumeBarSize(data.master);
                break;

            case 'currentSong':
                if (data !== null) {
                    SonosStatus.playing = data;
                    ui.setTrack(data);
                    ui.setAlbumArt(data);
                    ui.emit('track', data);

                }
                break;
            case 'playState':
                SonosStatus.playState = data;
                if (data === 'PLAYING') {
                    ui.setPlayState(1);
                    ui.setButtonPlaying();
                } else {
                    ui.setPlayState(0);
                    ui.setButtonPaused();
                }
                break;
        }
    };
});
console.log('ui loaded');
