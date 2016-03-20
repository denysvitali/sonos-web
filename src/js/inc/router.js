'use strict';
import UIDebugEv from './uidebug/events';
class Router {
    constructor(ui) {
       	this._ui = ui;
    }

    getRoute(page){
    	return page;
    }

    events(page){
    	switch(page){
    		case 'uidebug':
    			var uidebug = new UIDebugEv(this._ui);
    			uidebug.run();
    		break;

            case 'home':
                this._ui.streamElements();
            break;

            case 'soundcloud':
                this._ui.streamElements();
            break;
    	}
    }
}

export
default Router;