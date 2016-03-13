'use strict';
import Router from './inc/router.js';
var socket = io.connect('http://192.168.1.149:8888');
/* Includes */
console.log(Router);


var playState = 0; // paused
var muteState = 0; // unmuted
var lastAlbumArt = '';

document.getElementById('openMenu').addEventListener('click', () => {
    var body = document.getElementsByTagName('body')[0];
    var menu = document.getElementById('menu');
    if (body.classList.contains('menu-open')) {
        body.classList.remove('menu-open');
        menu.classList.remove('menu-open');
        return;
    }
    body.classList.add('menu-open');
    menu.classList.add('menu-open');
});

var playPause = document.getElementById('playPause');
playPause.addEventListener('click', () => {
    if (playPause.classList.contains('fa-play')) {
        playState = 1;
        playPause.classList.remove('fa-play');
        playPause.classList.add('fa-pause');
        socket.emit('do_play');
        return;
    }
    playState = 0;
    playPause.classList.remove('fa-pause');
    playPause.classList.add('fa-play');
    socket.emit('do_pause');
});

var menuEntries = document.getElementById('menu').getElementsByClassName('menu-elements')[0].getElementsByClassName('entry');
Array.prototype.forEach.call(menuEntries, function(el) {
    console.log(el);
    el.addEventListener('mousedown', () => {
        for (var i in menuEntries) {
            if (menuEntries.hasOwnProperty(i)) {
                if (menuEntries[i].classList.contains('active')) {
                    menuEntries[i].classList.remove('active');
                }
            }
        }
        if (!el.classList.contains('active')) {
            el.classList.add('active');
            return;
        }
    });

    el.addEventListener('mouseup', () => {

        for (var i in menuEntries) {
            if (menuEntries.hasOwnProperty(i)) {
                if (menuEntries[i].classList.contains('active')) {
                    menuEntries[i].classList.remove('active');
                }
            }
        }
    });
});

var volumeBar = document.getElementById('volumeBar');
var volumeBar_inner = volumeBar.getElementsByClassName('inner')[0];
var volumeBarIndicator = document.getElementById('volumeBarIndicator');
var muteButton = document.getElementById('muteButton');
var time = document.getElementById('time');
var seekBar = document.getElementById('seekbar');
var seekBarInner = seekBar.getElementsByClassName('bar')[0];
var playBar = document.getElementById('playBar');
var menu = document.getElementById('menu');
var menuElements = menu.getElementsByClassName('menu-elements')[0];
var menuEntries = menuElements.getElementsByClassName('entry');

// Iterator
var i;

/* EVENTS */

volumeBar.addEventListener('click', (e) => {
    console.log(volumeBar.offsetWidth);
    var newVolume = Math.round(e.layerX / volumeBar.offsetWidth * 100);
    socket.emit('do_setVolume', {
        'volume': newVolume
    });
});

muteButton.doMute = () => {
    muteButton.classList.remove('fa-volume-up');
    muteButton.classList.add('fa-volume-off');
};

muteButton.doUnmute = () => {
    muteButton.classList.add('fa-volume-up');
    muteButton.classList.remove('fa-volume-off');
};


muteButton.addEventListener('click', (e) => {
    if (muteButton.classList.contains('fa-volume-up')) {
        muteButton.doMute();
        muteState = 1;
        socket.emit('do_mute');
    } else {
        muteButton.doUnmute();
        muteState = 0;
        socket.emit('do_unmute');
    }
});

function menuEntryEvent(mEntry) {
    mEntry.addEventListener('click', () => {
        gotoPage(mEntry.getAttribute('data-page'));
    });
}

for (i = 0; i < menuEntries.length; i++) {
    if (menuEntries.hasOwnProperty(i)) {
        menuEntryEvent(menuEntries[i]);
    }
}

/* Functions */

function secondsToText(seconds) {
    var hours = parseInt(seconds / 3600);
    var minutes = parseInt((seconds - (hours * 3600)) / 60) % 60;
    seconds = (seconds - minutes * 60 - hours * 3600);

    var result = '';
    if (hours === 0) {
        result = ('0' + minutes).substr(-2) + ':' + ('0' + seconds).substr(-2);
    } else {
        result = ('0' + hours).substr(-2) + ':' + ('0' + minutes).substr(-2) + ':' + ('0' + seconds).substr(-2);
    }
    return result;
}

function setTrackTime(elapsed, remaining) {
    console.log(elapsed, remaining);
    if (remaining === undefined) {
        time.innerHTML = elapsed;
    } else {
        time.innerHTML = secondsToText(elapsed) + '/' + secondsToText(remaining);
    }
    seekBarInner.style.width = Math.round(elapsed / remaining * 100, 2) + '%';
}

function setTrack(track) {
    var tb = playBar.getElementsByClassName('songInfo')[0].getElementsByClassName('textBox')[0];
    var artist = tb.getElementsByClassName('artistName')[0];
    var title = tb.getElementsByClassName('songTitle')[0];

    artist.innerHTML = track.artist;
    title.innerHTML = track.title;

}

function setVolumeBarSize(volume) {
    volumeBar_inner.style.width = volume + '%';
    volumeBarIndicator.innerHTML = volume;
}

function setAlbumArt(track) {
    var url = '/sonos' + track.albumArtURI + '\'';
    if (lastAlbumArt !== url) {
        var albumImage = playBar.getElementsByClassName('albumImage')[0].getElementsByTagName('img')[0];
        albumImage.src = url;
        lastAlbumArt = url;
    }
}

/* Socket handling */

socket.on('connect', function() {
    socket.emit('newclient', {});
    socket.on('data', function(data) {
        console.log('got data', data.state);
        if (data.state !== undefined) {
            setVolumeBarSize(data.state.volume);
            if (playState === 0 && data.state.playerState === 'PLAYING') {
                playState = 1;
                playPause.classList.remove('fa-play');
                playPause.classList.add('fa-pause');
            } else if (playState === 1 && (data.state.playerState === 'STOPPED' || data.state.playerState === 'PAUSED_PLAYBACK')) {
                playState = 0;
                playPause.classList.remove('fa-pause');
                playPause.classList.add('fa-play');
            }

            if (data.state.mute === true && muteState === 0) {
                muteState = 1;
                muteButton.doMute();
            } else if (data.state.mute === false && muteState === 1) {
                muteState = 0;
                muteButton.doUnmute();
            }

            if (data.state.elapsedTime !== undefined) {
                setTrackTime(data.state.elapsedTime, data.state.currentTrack.duration);
            }
            setTrack(data.state.currentTrack);
            setAlbumArt(data.state.currentTrack);
        }
    });
    socket.on('volume', function(data) {
        setVolumeBarSize(data.volume);
    });
});