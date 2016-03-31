'use strict';
/* globals io */
import UI from './inc/uievents.js';
var socket = io.connect('http://' + window.location.hostname + ':8888');
var ui = new UI({
    socket: socket
});
ui.prepare();


socket.on('connect', function() {
    socket.emit('newclient', {});
    socket.on('data', function(data) {
        if (data.state !== undefined) {
            ui.setVolumeBarSize(data.state.volume);
            if (ui.getPlayState() === 0 && data.state.playerState === 'PLAYING') {
                ui.setPlayState(1);
                ui.setButtonPlaying();
            } else if (ui.getPlayState() === 1 && (data.state.playerState === 'STOPPED' || data.state.playerState === 'PAUSED_PLAYBACK')) {
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

            if (data.state.elapsedTime !== undefined) {
                ui.setTrackTime(data.state.elapsedTime, data.state.currentTrack.duration);
            }
            ui.setTrack(data.state.currentTrack);
            ui.setAlbumArt(data.state.currentTrack);
        }
    });
    socket.on('volume', function(data) {
        ui.setVolumeBarSize(data.volume);
    });
});
