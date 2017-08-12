'use strict';
import UIDebugEv from './uidebug/events';
import Queue from './queue.js';

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
                let uidebug = new UIDebugEv(this._ui);
                uidebug.run();
                break;
                
            case 'queue':
                console.log('Page is queue');
                let queue = new Queue(this._ui);
                queue.run();
                break;

            default:
                this._ui.streamElements();
                break;
        }
    }
}

export
default Router;
