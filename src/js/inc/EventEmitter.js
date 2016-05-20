// Readapted from https://gist.github.com/bloodyowl/41b1de3388c626796eca
// Thank you @bloodyowl!
class EventEmitter {
    constructor() {
        this._maxListeners = 12;
        this._events = {};
    }
    _error(message, ...args) {
        console.error.apply(console, [message].concat(args));
        console.trace();
    }
    on(type, listener) {
        if (typeof listener !== 'function') {
            throw new TypeError();
        }
        var listeners = this._events[type] || (this._events[type] = []);
        if (listeners.indexOf(listener) !== -1) {
            return this;
        }
        listeners.push(listener);
        if (listeners.length > this._maxListeners) {
            this._error(
                'possible memory leak, added %i %s listeners, ' +
                'use EventEmitter#setMaxListeners(number) if you ' +
                'want to increase the limit (%i now)',
                listeners.length,
                type,
                this._maxListeners
            );
        }
        return this;
    }
    once(type, listener) {
        var eventsInstance = this;

        function onceCallback() {
            eventsInstance.off(type, onceCallback);
            listener.apply(null, arguments);
        }
        return this.on(type, onceCallback);
    }
    off(type, ...args) {
        if (args.length === 0) {
            this._events[type] = null;
        }
        var listener = args[0];
        if (typeof listener !== 'function') {
            throw new TypeError();
        }
        var listeners = this._events[type];
        if (!listeners || !listeners.length) {
            return this;
        }
        var indexOfListener = listeners.indexOf(listener);
        if (indexOfListener === -1) {
            return this;
        }
        listeners.splice(indexOfListener, 1);
        return this;
    }
    emit(type, ...args) {
        var listeners = this._events[type];
        if (!listeners || !listeners.length) {
            return false;
        }
        listeners.forEach(fn => fn.apply(null, args));
        return true;
    }
    setMaxListeners(newMaxListeners) {
        if (parseInt(newMaxListeners) !== newMaxListeners) {
            throw new TypeError();
        }
        this._maxListeners = newMaxListeners;
    }
}

export default EventEmitter;