'use strict';
/* globals io */
import UI from './inc/uievents.js';
var socket = io.connect('http://' + window.location.hostname + ':8888');
window.ui = new UI({
    socket: socket
});
window.ui.prepare();

var ui = window.ui; // linter is now happy


socket.on('connect', function() {
    socket.emit('newclient', {});
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
});
console.log('ui loaded');