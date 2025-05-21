import Tool from './Tool.js';

class FillTool extends Tool {
    constructor() {
        super('fill');
    }
    
    handleCellClick(cell) {
        const targetColor = cell.dataset.color;
        const newColor = app.currentColor;
        
        if (targetColor === newColor) return;
        
        // Start a batch operation for history tracking
        app.history.startBatchOperation();
        
        const visited = new Set();
        const queue = [cell];
        
        while (queue.length > 0) {
            const currentCell = queue.shift();
            const cellKey = `${currentCell.dataset.row},${currentCell.dataset.col}`;
            
            if (visited.has(cellKey)) continue;
            
            visited.add(cellKey);
            
            if (currentCell.dataset.color === targetColor) {
                // Track the change for history
                const oldColor = currentCell.dataset.color;
                
                // Apply the change
                currentCell.style.backgroundColor = newColor;
                currentCell.dataset.color = newColor;
                
                // Record the change
                app.history.addToBatch(currentCell, oldColor, newColor);
                
                const neighbors = app.grid.getNeighbors(currentCell);
                queue.push(...neighbors);
            }
        }
        
        // End batch operation to commit to history
        app.history.endBatchOperation();
    }
}

export default FillTool;
