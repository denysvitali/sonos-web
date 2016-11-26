/* TuneIN provider */
'use strict';
(() => {
    const parseXML = require('xml2js').parseString;
    const request = require('request');
    const TUNEIN_API = 'http://legato.radiotime.com';
    var getMDBody = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Header><credentials xmlns="http://www.sonos.com/Services/1.1"><deviceId>00-11-22-33-44-FF:1</deviceId><deviceProvider>Sonos</deviceProvider></credentials></s:Header><s:Body><getMediaMetadata xmlns="http://www.sonos.com/Services/1.1"><id>%stream%</id></getMediaMetadata></s:Body></s:Envelope>';

    class TuneInProvider {
        constructor(stream) {
            this.stream = stream;
        }

        getMetadata() {
            var stream = this.stream;
            var mdbody = getMDBody.replace(/%stream%/g, stream);
            console.log(mdbody);
            return new Promise((resolve, reject) => {
                request(TUNEIN_API + '/Radio.asmx', {
                    headers: {
                        'SoapAction': '"http://www.sonos.com/Services/1.1#getMediaMetadata"',
                        'Content-Type': 'text/xml; charset="utf-8"'
                    },
                    method: 'POST',
                    body: mdbody
                }, (err, res, body) => {
                    if (!err) {
                        parseXML(body, (err, result) => {
                            resolve(result['soap:Envelope']['soap:Body'][0].getMediaMetadataResponse[0].getMediaMetadataResult[0]);
                        });
                        return;
                    }
                    reject(err);
                });
            });
        }
    }


    module.exports = TuneInProvider;
})();
