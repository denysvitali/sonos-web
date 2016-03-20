'use strict';
class Utils {
    constructor() {

    }

    secondsToText(seconds) {
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

    secondsToTextUpnp(seconds) {
        var hours = parseInt(seconds / 3600);
        var minutes = parseInt((seconds - (hours * 3600)) / 60) % 60;
        seconds = (seconds - minutes * 60 - hours * 3600);

        var result = '';
        result = hours + ':' + ('0' + minutes).substr(-2) + ':' + ('0' + seconds).substr(-2);
        return result;
    }

    encodeHTML(string){
        return string.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&apos;');
    }
}

export
default Utils;