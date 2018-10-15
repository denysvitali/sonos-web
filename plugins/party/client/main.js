'use strict';

(() => {
var backgroundImage = document.getElementById('partyBackgroundImage');
var currentAlbumArt = document.getElementById('partyAlbumArt');
var currentSongTitle = document.getElementById('partySongTitle');
var currentSongArtist = document.getElementById('partySongArtist');

var caa = null;
var cst = null;
var csa = null;

function setAlbumArt(albumArt) {
    if (albumArt === null) {
        albumArt = '/img/dummy/album-cover.jpg';
    }
    currentAlbumArt.style.backgroundImage = 'url(\'' + albumArt + '\')';
    backgroundImage.style.backgroundImage = 'url(\'' + albumArt + '\')';
    caa = albumArt;
}

function setTrackTitle(title) {
    currentSongTitle.innerHTML = window.ui._utils.encodeHTML(title);
    cst = title;
}

function setTrackArtist(artist) {
    if (artist === null) {
        artist = '';
    }
    currentSongArtist.innerHTML = window.ui._utils.encodeHTML(artist);
    csa = artist;
}


ui.on('track', (track) => {
    if (track.albumArtURI !== caa) {
        var albumArt = (track.albumArtURI !== null ? (track.albumArtURI.match(/^\/getaa.*/i) ? '/sonos' + track.albumArtURI : track.albumArtURI) : '/img/dummy/album-cover.jpg');
        setAlbumArt(albumArt);
    }
    if (track.title !== cst) {
        setTrackTitle(track.title);
    }
    if (track.artist !== csa) {
        setTrackArtist(track.artist);
    }
});

if (SonosStatus.playing !== null) {
    setAlbumArt(SonosStatus.playing.albumArt);
    setTrackTitle(SonosStatus.playing.title);
    setTrackArtist(SonosStatus.playing.artist);
}
})();
