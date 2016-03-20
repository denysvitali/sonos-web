'use strict';
class PlayManager {
    constructor(object) {
        this._socket = object.socket;
    }

    playMp3(url, metadata) {
        if (metadata === null) {
            metadata = {
                title: 'Title',
                artist: 'Artist',
                album: 'Album',
                albumArt: ''
            };
        }
        this._socket.emit('playUrl', {
            trackUrl: url,
            metadata: metadata
        });
    }
}

export
default PlayManager;