import Tool from './Tool.js';

class PencilTool extends Tool {
    constructor() {
        super('pencil');
    }
    
    handleCellClick(cell) {
        // Start tracking for undo history
        app.history.startStroke('pencil', app.currentColor);
        
        // Store the original color for undo
        const oldColor = cell.dataset.color;
        
        // Apply new color
        cell.style.backgroundColor = app.currentColor;
        cell.dataset.color = app.currentColor;
        
        // Add to current stroke
        app.history.addToStroke(cell, oldColor);
    }
    
    handleCellDrag(cell) {
        // Only change color if it's different from current
        if (cell.dataset.color !== app.currentColor) {
            const oldColor = cell.dataset.color;
            cell.style.backgroundColor = app.currentColor;
            cell.dataset.color = app.currentColor;
            app.history.addToStroke(cell, oldColor);
        }
    }
    
    handleMouseUp() {
        // End the stroke and add to history
        app.history.endStroke();
    }
}

export default PencilTool;
