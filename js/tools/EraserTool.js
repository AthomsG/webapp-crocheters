import Tool from './Tool.js';

class EraserTool extends Tool {
    constructor() {
        super('eraser');
    }
    
    handleCellClick(cell) {
        // Start tracking for undo history
        app.history.startStroke('eraser', '#FFFFFF');
        
        // Store the original color for undo
        const oldColor = cell.dataset.color;
        
        // Apply eraser - use white instead of transparent
        cell.style.backgroundColor = '#FFFFFF';
        cell.dataset.color = '#FFFFFF';
        
        // Add to current stroke
        app.history.addToStroke(cell, oldColor);
    }
    
    handleCellDrag(cell) {
        // Only erase if not already white
        if (cell.dataset.color !== '#FFFFFF') {
            const oldColor = cell.dataset.color;
            cell.style.backgroundColor = '#FFFFFF';
            cell.dataset.color = '#FFFFFF';
            app.history.addToStroke(cell, oldColor);
        }
    }
    
    handleMouseUp() {
        // End the stroke and add to history
        app.history.endStroke();
    }
}

export default EraserTool;
