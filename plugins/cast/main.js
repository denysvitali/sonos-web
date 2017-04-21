'use strict';
(() => {
    class Cast {
        constructor(SonosWeb) {
            SonosWeb.app.use('/plugins/cast/', SonosWeb.express.static(__dirname + '/client'));
        }
    }
    module.exports = Cast;
})();
