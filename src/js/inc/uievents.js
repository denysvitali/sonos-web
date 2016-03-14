'use strict';
import Utils from './utils.js';
import Router from './router.js';
class UI {
    constructor(objects) {
        this._socket = objects.socket;
        this._utils = new Utils();
        this._router = new Router();
    }

    prepare() {
        this._playState = 0; // paused
        this._muteState = 0; // unmuted
        this._lastAlbumArt = '';

        this.mE = {};
        this.mE.content = document.getElementById('content');

        this.buttons = {};
        this.buttons.mute = document.getElementById('muteButton');
        this.buttons.playPause = document.getElementById('playPause');

        this.labels = {};
        this.labels.time = document.getElementById('time');

        this.elements = {};
        this.elements.volumeBar = document.getElementById('volumeBar');
        this.elements.volumeBar._inner = this.elements.volumeBar.getElementsByClassName('inner')[0];
        this.elements.volumeBar._indicator = document.getElementById('volumeBarIndicator');
        this.elements.seekBar = document.getElementById('seekbar');
        this.elements.seekBar._inner = this.elements.seekBar.getElementsByClassName('bar')[0];
        this.elements.playBar = document.getElementById('playBar');
        this.elements.menu = document.getElementById('menu');
        this.elements.menu._elements = this.elements.menu.getElementsByClassName('menu-elements')[0];
        this.elements.menu._elements._entries = this.elements.menu._elements.getElementsByClassName('entry');

        this.menuListener();
        this.playPauseListener();
        this.volumeListener();
        this.muteListener();

    }

    getPlayState() {
        return this._playState;
    }

    setPlayState(pstate) {
        this._playState = pstate;
    }

    getMuteState() {
        return this._muteState;
    }

    setMuteState(mstate) {
        this._muteState = mstate;
    }

    setButtonPlaying() {
        this.buttons.playPause.classList.remove('fa-play');
        this.buttons.playPause.classList.add('fa-pause');
    }

    setButtonPaused() {
        this.buttons.playPause.classList.remove('fa-pause');
        this.buttons.playPause.classList.add('fa-play');
    }

    menuListener() {
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
        var d = this;

        function menuEntryEvent(mEntry) {
            mEntry.addEventListener('click', () => {
                console.log('okay', mEntry.getAttribute('data-page'));
                d.gotoPage(mEntry.getAttribute('data-page'));
            });
        }

        for (var i = 0; i < menuEntries.length; i++) {
            if (menuEntries.hasOwnProperty(i)) {
                menuEntryEvent(menuEntries[i]);
            }
        }
    }

    gotoPage(page) {
        this._router.getRoute(page);
        var oReq = new XMLHttpRequest();
        oReq.addEventListener('load', () => {
            if(oReq.status === 200)
            {
            	this.mE.content.innerHTML = oReq.responseText;
            }
        });
        oReq.open('GET', '/pages/' + page);
        oReq.send();
    }

    playPauseListener() {
        this.buttons.playPause.addEventListener('click', () => {
            if (this.buttons.playPause.classList.contains('fa-play')) {
                this.setPlayState(1);
                this.setButtonPlaying();
                this._socket.emit('do_play');
                return;
            }
            this.setPlayState(0);
            this.setButtonPaused();
            this._socket.emit('do_pause');
        });
    }

    volumeListener() {
        this.elements.volumeBar.addEventListener('click', (e) => {
            var newVolume = Math.round(e.layerX / this.elements.volumeBar.offsetWidth * 100);
            this._socket.emit('do_setVolume', {
                'volume': newVolume
            });
        });
    }

    muteListener() {
        this.buttons.mute.doMute = () => {
            this.buttons.mute.classList.remove('fa-volume-up');
            this.buttons.mute.classList.add('fa-volume-off');
        };

        this.buttons.mute.doUnmute = () => {
            this.buttons.mute.classList.add('fa-volume-up');
            this.buttons.mute.classList.remove('fa-volume-off');
        };


        this.buttons.mute.addEventListener('click', () => {
            if (this.buttons.mute.classList.contains('fa-volume-up')) {
                this.buttons.mute.doMute();
                this._muteState = 1;
                this._socket.emit('do_mute');
            } else {
                this.buttons.mute.doUnmute();
                this._muteState = 0;
                this._socket.emit('do_unmute');
            }
        });
    }

    setTrackTime(elapsed, remaining) {
        if (remaining === undefined) {
            this.labels.time.innerHTML = elapsed;
        } else {
            this.labels.time.innerHTML = this._utils.secondsToText(elapsed) + '/' + this._utils.secondsToText(remaining);
        }
        this.elements.seekBar._inner.style.width = Math.round(elapsed / remaining * 100, 2) + '%';
    }

    setTrack(track) {
        var tb = this.elements.playBar.getElementsByClassName('songInfo')[0].getElementsByClassName('textBox')[0];
        var artist = tb.getElementsByClassName('artistName')[0];
        var title = tb.getElementsByClassName('songTitle')[0];

        artist.innerHTML = track.artist;
        title.innerHTML = track.title;

    }

    setVolumeBarSize(volume) {
        this.elements.volumeBar._inner.style.width = volume + '%';
        this.elements.volumeBar._indicator.innerHTML = volume;
    }

    setAlbumArt(track) {
        var url = '/sonos' + track.albumArtURI + '\'';
        if (this._lastAlbumArt !== url) {
            var albumImage = this.elements.playBar.getElementsByClassName('albumImage')[0].getElementsByTagName('img')[0];
            albumImage.src = url;
            this._lastAlbumArt = url;
        }
    }
}

export
default UI;