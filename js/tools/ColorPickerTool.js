import Tool from './Tool.js';

class ColorPickerTool extends Tool {
    constructor() {
        super('picker');
    }
    
    handleCellClick(cell) {
        const color = cell.dataset.color;
        app.setCurrentColor(color);
    }
}

export default ColorPickerTool;
