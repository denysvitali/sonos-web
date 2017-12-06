'use strict';
import Utils from './utils.js';
import Router from './router.js';
import PlayManager from './playManager.js';
import EventEmitter from './EventEmitter.js';
import { setTimeout } from 'timers';

class UI extends EventEmitter {
    constructor(objects) {
        super();
        this._socket = objects.socket;
        this._utils = new Utils();
        this._router = new Router(this);
        this._playManager = new PlayManager({
            socket: this._socket
        });
        this._localStore = {
            roomName: ''
        };
        this._loadedJS = [];
    }

    toastMessage(message) {
        let body = document.getElementsByTagName("body")[0];
        let toastMessage = document.createElement('div');
        toastMessage.classList.add("toast-message");
        toastMessage.innerText = message;

        body.appendChild(toastMessage);

        setTimeout(()=>{
            toastMessage.classList.add("fadeout");
            setTimeout(()=>{
                toastMessage.remove();
            },500);
        }, 5000);
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
        this.buttons.nextTrack = document.getElementById('nextButton');
        this.buttons.prevTrack = document.getElementById('prevButton');

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
        this.elements.roomName = document.getElementById('roomName');
        this.elements.heroMenuImage = document.getElementById('hero-menu-image');

        window.SonosStatus = {};
        window.SonosStatus.playing = {};

        this.menuListener();
        this.playPauseListener();
        this.nextTrackListener();
        this.prevTrackListener();
        this.volumeListener();
        this.muteListener();
        this.streamElements();
    }

    getPlayState() {
        return this._playState;
    }

    setPlayState(pstate) {
        this._playState = pstate;
    }

    getRoomName() {
        return this._localStore.roomName;
    }

    setRoomName(roomName) {
        if (this._localStore.roomName !== roomName) {
            this._localStore.roomName = roomName;
            this.elements.roomName.innerHTML = roomName;
            this.autoHeroMenuImage(roomName);
        }
    }

    autoHeroMenuImage(roomName) {
        var ctx = this;
        var removeClasses = function() {
            var classes = ctx.elements.heroMenuImage.classList;
            for (var i in classes) {
                if (classes.hasOwnProperty(i)) {
                    if (classes[i].match(/^hero-.*$/i)) {
                        classes.remove(classes[i]);
                    }
                }
            }
        };

        var addClass = function(className) {
            ctx.elements.heroMenuImage.classList.add(className);
        };

        if (roomName.match(/camera|bedroom|slaapkamer/i)) {
            removeClasses();
            addClass('hero-bedroom');
        } else if (roomName.match(/bagno|bathroom|badkamer/i)) {
            removeClasses();
            addClass('hero-bathroom');
        } else if (roomName.match(/sala da pranzo|dining room|eetkamer/i)) {
            removeClasses();
            addClass('hero-diningroom');
        } else if (roomName.match(/entrata|atrio|foyer|hall(?!way)|hal/i)) {
            removeClasses();
            addClass('hero-hall');
        } else if (roomName.match(/corridoio|hallway|gang/i)) {
            removeClasses();
            addClass('hero-hallway');
        } else if (roomName.match(/cucina|kitchen|keuken/i)) {
            removeClasses();
            addClass('hero-kitchen');
        } else if (roomName.match(/salotto|lounge|living room|woonkamer/i)) {
            removeClasses();
            addClass('hero-livingroom');
        } else if (roomName.match(/media room/i)) {
            removeClasses();
            addClass('hero-mediaroom');
        } else if (roomName.match(/cortile|patio/i)) {
            removeClasses();
            addClass('hero-patio');
        } else if (roomName.match(/stanza dei giochi|playroom/i)) {
            removeClasses();
            addClass('hero-playroom');
        } else if (roomName.match(/piscina|pool/i)) {
            removeClasses();
            addClass('hero-pool');
        } else if (roomName.match(/tv room|stanza della tv/i)) {
            removeClasses();
            addClass('hero-tvroom');
        } else {
            removeClasses();
            addClass('hero-music');
        }
    }



    getMuteState() {
        return this._muteState;
    }

    setMuteState(mstate) {
        if (this._muteState !== mstate) {
            this._muteState = mstate;
        }
    }

    setButtonPlaying() {
        if (!this.buttons.playPause.classList.contains('fa-pause')) {
            this.buttons.playPause.classList.remove('fa-play');
            this.buttons.playPause.classList.add('fa-pause');
        }
    }

    setButtonPaused() {
        if (!this.buttons.playPause.classList.contains('fa-play')) {
            this.buttons.playPause.classList.remove('fa-pause');
            this.buttons.playPause.classList.add('fa-play');
        }
    }

    streamElements() {
        var t = this;
        t.elements.streamElements = document.getElementsByClassName('stream-el');

        function clickStream() {
            var el = this;
            t._playManager.playMp3(el.getAttribute('data-stream'), {
                title: el.getAttribute('data-title'),
                artist: el.getAttribute('data-artist'),
                albumArt: el.getAttribute('data-albumart'),
                album: 'Album',
                duration: t._utils.secondsToTextUpnp(Math.round(el.getAttribute('data-duration') / 1000))
            });
        }

        for (var i in this.elements.streamElements) {
            if (this.elements.streamElements.hasOwnProperty(i)) {
                this.elements.streamElements[i].addEventListener('click', clickStream);
            }
        }
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
        var routedPage = this._router.getRoute(page);
        var oReq = new XMLHttpRequest();
        oReq.addEventListener('load', () => {
            if (oReq.status === 200) {
                this.mE.content.innerHTML = oReq.responseText;

                // XSS ALERT
                var scripts = this.mE.content.getElementsByTagName('script');
                var head = document.getElementsByTagName('head')[0];
                for (var i in scripts) {
                    if (scripts.hasOwnProperty(i)) {
                        if (scripts[i].innerHTML !== '') {
                            eval(scripts[i].innerHTML);
                        } else {
                            if (this._loadedJS.indexOf(scripts[i].getAttribute('src')) == -1) {
                                console.log('Found a JS file');
                                var jsScript = document.createElement('script');
                                jsScript.setAttribute('type', 'text/javascript');
                                jsScript.setAttribute('src', scripts[i].getAttribute('src'));
                                head.appendChild(jsScript);
                            }
                        }
                    }
                }

                this._router.events(routedPage);
            }
        });
        oReq.open('GET', '/pages/' + routedPage);
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

    nextTrackListener() {
        this.buttons.nextTrack.addEventListener('click', () => {
            this._socket.emit('do_next_track');
        });
    }

    prevTrackListener() {
        this.buttons.prevTrack.addEventListener('click', () => {
            this._socket.emit('do_prev_track');
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
        this.elements.seekBar._inner.style.width = (elapsed / remaining) * 100 + '%';

        if (window.SonosStatus.playing !== null) {
            window.SonosStatus.playing.elapsed = elapsed;
            window.SonosStatus.playing.remaining = remaining;
        }
    }

    setTrack(track) {
        var tb = this.elements.playBar.getElementsByClassName('songInfo')[0].getElementsByClassName('textBox')[0];
        var artist = tb.getElementsByClassName('artistName')[0];
        var title = tb.getElementsByClassName('songTitle')[0];

        if (artist.innerHTML !== track.artist | title.innerHTML !== track.title) {
            artist.innerHTML = track.artist;
            title.innerHTML = track.title;
        }

        if (window.SonosStatus.playing !== null) {
            window.SonosStatus.playing.artist = track.artist;
            window.SonosStatus.playing.title = track.title;
        }
    }

    setVolumeBarSize(volume) {
        this.elements.volumeBar._inner.style.width = volume + '%';
        this.elements.volumeBar._indicator.innerHTML = volume;
    }

    setAlbumArt(track) {
        var url;
        if (track.albumArtURI === null || track.albumArtURI === undefined) {
            url = '/img/dummy/album-cover.jpg';
        } else {
            if (track.albumArtURI.match(/^\/getaa.*/)) {
                url = '/sonos' + track.albumArtURI + '\'';
            } else {
                url = track.albumArtURI;
            }
        }
        if (this._lastAlbumArt !== url) {
            var albumImage = this.elements.playBar.getElementsByClassName('albumImage')[0].getElementsByTagName('img')[0];
            albumImage.src = url;
            this._lastAlbumArt = url;
        }

        if (window.SonosStatus.playing !== null) {
            window.SonosStatus.playing.albumArt = track.albumArtURI;
        }

        this.emit('albumArt', track.albumArtURI);
    }
}

export
default UI;
