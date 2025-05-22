import Tool from './Tool.js';

class ClearAllTool extends Tool {
    constructor() {
        super('clearAll');
    }
    
    handleCellClick(cell) {
        // When any cell is clicked with this tool, clear the entire grid
        this.clearGrid();
    }
    
    clearGrid() {
        // Store current state for undo
        const cellStates = [];
        app.grid.cells.forEach(cell => {
            if (cell.dataset.color !== '#FFFFFF') {
                cellStates.push({
                    row: parseInt(cell.dataset.row),
                    col: parseInt(cell.dataset.col),
                    color: cell.dataset.color
                });
            }
        });
        
        if (cellStates.length > 0) {
            // Record this action for undo
            app.history.addAction({
                type: 'clearGrid',
                cellStates: cellStates
            });
            
            // Clear all cells
            app.grid.cells.forEach(cell => {
                cell.style.backgroundColor = '#FFFFFF';
                cell.dataset.color = '#FFFFFF';
            });
        }
    }
}

export default ClearAllTool;
