'use strict';
class PlayManager {
    constructor(object) {
        this._socket = object.socket;
    }

    playMp3(url) {
        this._socket.emit('playUrl', {
            trackUrl: url,
            metadata: {
                title: 'Title',
                artist: 'Artist',
                album: 'Album',
                albumArt: 'https://media.licdn.com/mpr/mpr/shrink_200_200/AAEAAQAAAAAAAASbAAAAJGI2OGM3NjgyLWIwMTYtNDEzMi04YTkzLTFkM2U2NjJiM2NjOA.png'
            }
        });
    }
}

export
default PlayManager;