import Tool from './Tool.js';

class PencilTool extends Tool {
    constructor() {
        super('pencil');
        this.isDrawing = false;
        this.hasMadeChanges = false;
    }
    
    handleCellClick(cell) {
        this.isDrawing = true;
        this.hasMadeChanges = false;
        
        // Apply color if different
        if (cell.dataset.color !== app.currentColor) {
            cell.style.backgroundColor = app.currentColor;
            cell.dataset.color = app.currentColor;
            this.hasMadeChanges = true;
        }
    }
    
    handleCellDrag(cell) {
        if (!this.isDrawing) return;
        
        // Apply color if different
        if (cell.dataset.color !== app.currentColor) {
            cell.style.backgroundColor = app.currentColor;
            cell.dataset.color = app.currentColor;
            this.hasMadeChanges = true;
        }
    }
    
    handleMouseUp() {
        if (this.isDrawing && this.hasMadeChanges) {
            // Capture state after the drawing operation is complete
            app.history.captureState('Pencil drawing');
            
            this.isDrawing = false;
            this.hasMadeChanges = false;
        }
    }
}

export default PencilTool;
