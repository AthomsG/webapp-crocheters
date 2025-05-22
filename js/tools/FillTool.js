import Tool from './Tool.js';

class FillTool extends Tool {
    constructor() {
        super('fill');
    }
    
    handleCellClick(cell) {
        const targetColor = cell.dataset.color;
        const newColor = app.currentColor;
        
        if (targetColor === newColor) return; // Nothing to do
        
        let madeChanges = false;
        const visited = new Set();
        const queue = [cell];
        
        // Fill algorithm
        while (queue.length > 0) {
            const currentCell = queue.shift();
            const cellKey = `${currentCell.dataset.row},${currentCell.dataset.col}`;
            
            if (visited.has(cellKey)) continue;
            
            visited.add(cellKey);
            
            if (currentCell.dataset.color === targetColor) {
                // Apply the change
                currentCell.style.backgroundColor = newColor;
                currentCell.dataset.color = newColor;
                madeChanges = true;
                
                const neighbors = app.grid.getNeighbors(currentCell);
                queue.push(...neighbors);
            }
        }
        
        // Only capture state if changes were made
        if (madeChanges) {
            app.history.captureState('Fill');
        }
    }
}

export default FillTool;
