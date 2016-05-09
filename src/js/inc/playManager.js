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
                albumArt: '',
                duration: 0
            };
        } else {
            if (!isNaN(metadata.duration)) {
                // duration is always in seconds
                // need to convert it in H:MM:SS
                var hours = Math.floor(metadata.duration / 3600);
                var remaining = metadata.duration % 3600;
                var minutes = Math.floor(remaining / 60);
                remaining = remaining % 60;
                var seconds = Math.floor(remaining);

                var durationString = hours + ':' + ('0' + minutes).substr(-2) + ':' + ('0' + seconds).substr(-2);
                metadata.duration = durationString;
                console.log(hours, minutes, seconds);

            }
        }
        this._socket.emit('playUrl', {
            trackUrl: url,
            metadata: metadata
        });
    }
}

export
default PlayManager;