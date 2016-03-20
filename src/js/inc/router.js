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
    	}
    }
}

export
default Router;