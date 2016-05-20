'use strict';

var backgroundImage = document.getElementById('partyBackgroundImage');
var currentAlbumArt = document.getElementById('partyAlbumArt');
var currentSongTitle = document.getElementById('partySongTitle');
var currentSongArtist = document.getElementById('partySongArtist');

var caa = null;
var cst = null;
var csa = null;

ui.on('track', (track) => {
    if (track.albumArtURI !== caa) {
        var albumArt = (track.albumArtURI !== null ? (track.albumArtURI.indexOf('/getaa') === 0 ? '/sonos' + track.albumArtURI : track.albumArtURI) : '/img/dummy/album-cover.jpg');
        currentAlbumArt.setAttribute('src', albumArt);
        backgroundImage.style.backgroundImage = 'url(\''+albumArt + '\')';
        caa = track.albumArtURI;
    }
    if(track.title !== cst)
    {
      currentSongTitle.innerHTML = window.ui._utils.encodeHTML(track.title);
      cst = track.title;
    }
    if(track.artist !== csa){
      currentSongArtist.innerHTML = window.ui._utils.encodeHTML(track.artist);
      csa = track.artist;
    }
});