'use strict';
(() => {
    var request = require('request');
    class AudioProxy {
        constructor(SonosWeb) {
            this.pmap = [];
            this.ENDPOINT = '/plugins/audioproxy';
            SonosWeb.app.get(this.ENDPOINT + '/:id', (req,res)=>{
                this._proxyAudio(req.params.id).pipe(res);
            });
        }

        _proxyAudio(id)
        {
            return request.get(this.pmap[id]);
        }

        addAudioUrl(url)
        {
            var newIndex = this.pmap.length;
            this.pmap.push(url);
            return newIndex;
        }
    }
    module.exports = AudioProxy;
})();