// Central color management for the application
class ColorManager {
    constructor() {
        this._currentColor = '#FF0000'; // Default red
        this._subscribers = [];
    }
    
    get currentColor() {
        return this._currentColor;
    }
    
    set currentColor(color) {
        if (this._currentColor !== color) {
            this._currentColor = color;
            this._notifySubscribers();
        }
    }
    
    // Subscribe to color changes
    subscribe(callback) {
        if (typeof callback === 'function') {
            this._subscribers.push(callback);
        }
    }
    
    // Notify all subscribers about a color change
    _notifySubscribers() {
        this._subscribers.forEach(callback => {
            try {
                callback(this._currentColor);
            } catch (e) {
                console.error('Error in color change subscriber:', e);
            }
        });
    }
}

export default ColorManager;
