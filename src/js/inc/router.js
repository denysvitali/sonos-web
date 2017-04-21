'use strict';
import UIDebugEv from './uidebug/events';
class Router {
    constructor(ui) {
        this._ui = ui;
    }

    getRoute(page) {
        return page;
    }

    events(page) {
        switch (page) {
            case 'debug':
                var uidebug = new UIDebugEv(this._ui);
                uidebug.run();
                break;

            default:
                this._ui.streamElements();
                break;
        }
    }
}

export
default Router;
