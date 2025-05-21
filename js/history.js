class History {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50; // Limit the history size
        this.currentStroke = null; // To track ongoing brush strokes
        this.batchOperationInProgress = false;
    }
    
    // Start a batch of changes (like a stroke or multi-cell operation)
    startBatchOperation() {
        this.batchOperationInProgress = true;
        this.currentBatchChanges = [];
    }
    
    // Add a change to the current batch
    addToBatch(cell, oldColor, newColor) {
        if (this.batchOperationInProgress) {
            this.currentBatchChanges.push({
                cell: cell,
                oldColor: oldColor,
                newColor: newColor
            });
        }
    }
    
    // End a batch operation and commit to history
    endBatchOperation() {
        if (this.batchOperationInProgress && this.currentBatchChanges.length > 0) {
            this.addMatrixAction(this.currentBatchChanges);
        }
        this.batchOperationInProgress = false;
        this.currentBatchChanges = [];
    }
    
    // Universal matrix-based action recording
    addMatrixAction(changes) {
        // Create an action representing grid cell changes
        const action = {
            type: 'matrixChange',
            changes: changes.map(change => ({
                cell: change.cell,
                oldColor: change.oldColor,
                newColor: change.newColor
            }))
        };
        
        this.undoStack.push(action);
        this.redoStack = []; // Clear redo stack when new action is added
        
        // Limit the size of the history stack
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        
        this.updateUndoRedoUI();
    }
    
    // For backward compatibility
    startStroke(tool, color) {
        this.startBatchOperation();
    }
    
    addToStroke(cell, oldColor) {
        const newColor = cell.dataset.color;
        this.addToBatch(cell, oldColor, newColor);
    }
    
    endStroke() {
        this.endBatchOperation();
    }
    
    // For backward compatibility
    addAction(action) {
        // Convert old action formats to the new matrix-based format
        switch (action.type) {
            case 'colorChange':
                const changes = [];
                action.cells.forEach(cell => {
                    changes.push({
                        cell: cell,
                        oldColor: action.oldColors.get(cell),
                        newColor: action.newColor
                    });
                });
                this.addMatrixAction(changes);
                break;
                
            case 'cut':
            case 'paste':
            case 'move':
                // These can be directly forwarded to the undoStack
                this.undoStack.push(action);
                this.redoStack = []; // Clear redo stack
                if (this.undoStack.length > this.maxHistory) {
                    this.undoStack.shift();
                }
                this.updateUndoRedoUI();
                break;
                
            default:
                // For other action types, preserve them as-is
                this.undoStack.push(action);
                this.redoStack = []; // Clear redo stack
                if (this.undoStack.length > this.maxHistory) {
                    this.undoStack.shift();
                }
                this.updateUndoRedoUI();
        }
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        
        const action = this.undoStack.pop();
        this.redoStack.push(action);
        
        switch (action.type) {
            case 'matrixChange':
                // Undo each cell change in the matrix
                action.changes.forEach(change => {
                    change.cell.style.backgroundColor = change.oldColor;
                    change.cell.dataset.color = change.oldColor;
                });
                break;
                
            // ...other existing case handlers...
            case 'stroke':
                // Undo each cell in the stroke
                action.cellChanges.forEach(change => {
                    change.cell.style.backgroundColor = change.oldColor;
                    change.cell.dataset.color = change.oldColor;
                });
                break;
                
            case 'colorChange':
                action.cells.forEach(cell => {
                    const oldColor = action.oldColors.get(cell);
                    cell.style.backgroundColor = oldColor;
                    cell.dataset.color = oldColor;
                });
                break;
                
            case 'cut':
                action.cells.forEach(cell => {
                    const oldColor = action.oldColors.get(cell);
                    cell.style.backgroundColor = oldColor;
                    cell.dataset.color = oldColor;
                });
                break;
                
            case 'paste':
                action.affectedCells.forEach(cellInfo => {
                    const cell = cellInfo.cell;
                    cell.style.backgroundColor = cellInfo.originalColor;
                    cell.dataset.color = cellInfo.originalColor;
                });
                break;
                
            case 'move':
                // Reset moved cells to original state
                action.beforeState.forEach(cellInfo => {
                    const cell = cellInfo.cell;
                    cell.style.backgroundColor = cellInfo.color;
                    cell.dataset.color = cellInfo.color;
                });
                break;
                
            case 'clearGrid':
                action.cellStates.forEach(cellInfo => {
                    const cell = app.grid.getCellAt(cellInfo.row, cellInfo.col);
                    if (cell) {
                        cell.style.backgroundColor = cellInfo.color;
                        cell.dataset.color = cellInfo.color;
                    }
                });
                break;
        }
        
        this.updateUndoRedoUI();
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        const action = this.redoStack.pop();
        this.undoStack.push(action);
        
        switch (action.type) {
            case 'matrixChange':
                // Redo each cell change in the matrix
                action.changes.forEach(change => {
                    change.cell.style.backgroundColor = change.newColor;
                    change.cell.dataset.color = change.newColor;
                });
                break;
                
            // ...other existing case handlers...
            case 'stroke':
                // Redo each cell in the stroke
                action.cellChanges.forEach(change => {
                    change.cell.style.backgroundColor = change.newColor;
                    change.cell.dataset.color = change.newColor;
                });
                break;
                
            case 'colorChange':
                action.cells.forEach(cell => {
                    cell.style.backgroundColor = action.newColor;
                    cell.dataset.color = action.newColor;
                });
                break;
                
            case 'cut':
                action.cells.forEach(cell => {
                    cell.style.backgroundColor = '#FFFFFF';
                    cell.dataset.color = '#FFFFFF';
                });
                break;
                
            case 'paste':
                action.affectedCells.forEach(cellInfo => {
                    const cell = cellInfo.cell;
                    cell.style.backgroundColor = cellInfo.newColor;
                    cell.dataset.color = cellInfo.newColor;
                });
                break;
                
            case 'move':
                // Reapply the move
                action.afterState.forEach(cellInfo => {
                    const cell = cellInfo.cell;
                    cell.style.backgroundColor = cellInfo.color;
                    cell.dataset.color = cellInfo.color;
                });
                break;
                
            case 'clearGrid':
                action.cellStates.forEach(cellInfo => {
                    const cell = app.grid.getCellAt(cellInfo.row, cellInfo.col);
                    if (cell) {
                        cell.style.backgroundColor = '#FFFFFF';
                        cell.dataset.color = '#FFFFFF';
                    }
                });
                break;
        }
        
        this.updateUndoRedoUI();
    }
    
    updateUndoRedoUI() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0;
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
        }
    }
    
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateUndoRedoUI();
    }
}
