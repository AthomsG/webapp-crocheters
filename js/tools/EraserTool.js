import Tool from './Tool.js';

class EraserTool extends Tool {
    constructor() {
        super('eraser');
        this.isErasing = false;
        this.hasMadeChanges = false;
    }
    
    handleCellClick(cell) {
        this.isErasing = true;
        this.hasMadeChanges = false;
        
        // Apply eraser if cell isn't already white
        if (cell.dataset.color !== '#FFFFFF') {
            cell.style.backgroundColor = '#FFFFFF';
            cell.dataset.color = '#FFFFFF';
            this.hasMadeChanges = true;
        }
    }
    
    handleCellDrag(cell) {
        if (!this.isErasing) return;
        
        // Apply eraser if cell isn't already white
        if (cell.dataset.color !== '#FFFFFF') {
            cell.style.backgroundColor = '#FFFFFF';
            cell.dataset.color = '#FFFFFF';
            this.hasMadeChanges = true;
        }
    }
    
    handleMouseUp() {
        if (this.isErasing && this.hasMadeChanges) {
            // Capture state after erasing is complete
            app.history.captureState('Eraser');
            
            this.isErasing = false;
            this.hasMadeChanges = false;
        }
    }
}

export default EraserTool;
