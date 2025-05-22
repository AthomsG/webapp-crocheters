/**
 * Simple state-based history system
 * Each tool should call captureState() when an operation completes
 */
class History {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50; // Limit history size
        this.isCapturing = false; // Flag to prevent recursive captures
    }
    
    /**
     * Captures the current state of the grid and adds it to history
     * Call this AFTER making changes to record the complete state
     */
    captureState(description = 'Grid change') {
        if (this.isCapturing) return; // Prevent recursive captures
        
        // Get a snapshot of the entire grid
        const gridSnapshot = this.createGridSnapshot();
        if (!gridSnapshot) return;
        
        console.log(`Capturing state: ${description} with ${gridSnapshot.cells.length} cells`);
        
        // Add to history
        this.undoStack.push({
            timestamp: Date.now(),
            description: description,
            gridState: gridSnapshot
        });
        
        // Clear redo history since we've made a new change
        this.redoStack = [];
        
        // Limit history size
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        
        this.updateUndoRedoUI();
    }
    
    /**
     * Creates a snapshot of the current grid
     */
    createGridSnapshot() {
        if (!app.grid) return null;
        
        // Capture ALL cells
        const cells = app.grid.cells.map(cell => ({
            row: parseInt(cell.dataset.row),
            col: parseInt(cell.dataset.col),
            color: cell.dataset.color
        }));
        
        return {
            rows: app.grid.rows,
            cols: app.grid.cols,
            cells: cells
        };
    }
    
    /**
     * Undo the last change by restoring previous grid state
     */
    undo() {
        if (this.undoStack.length <= 1) return; // Keep at least one state
        
        // First, merge any floating selection layer
        if (app.tools.selection && app.tools.selection.floatingLayer.active) {
            app.tools.selection.mergeFloatingLayer();
        }
        
        // Current state is at the top of the stack
        const currentState = this.undoStack.pop();
        
        // Previous state is now at the top
        const previousState = this.undoStack[this.undoStack.length - 1];
        
        // Store current state in redo stack
        this.redoStack.push(currentState);
        
        // Apply the previous state
        this.applyGridState(previousState);
        
        this.updateUndoRedoUI();
    }
    
    /**
     * Redo a previously undone change
     */
    redo() {
        if (this.redoStack.length === 0) return;
        
        // First, merge any floating selection layer
        if (app.tools.selection && app.tools.selection.floatingLayer.active) {
            app.tools.selection.mergeFloatingLayer();
        }
        
        // Get next state from redo stack
        const nextState = this.redoStack.pop();
        
        // Add it back to the undo stack
        this.undoStack.push(nextState);
        
        // Apply the state
        this.applyGridState(nextState);
        
        this.updateUndoRedoUI();
    }
    
    /**
     * Apply a stored grid state to the current grid
     */
    applyGridState(snapshot) {
        if (!snapshot || !snapshot.gridState) return;
        
        this.isCapturing = true; // Prevent recursive captures
        
        // Apply each cell's color from the snapshot
        snapshot.gridState.cells.forEach(cellData => {
            const cell = app.grid.getCellAt(cellData.row, cellData.col);
            if (cell) {
                cell.dataset.color = cellData.color;
                cell.style.backgroundColor = cellData.color;
            }
        });
        
        this.isCapturing = false;
    }
    
    /**
     * Update the UI to reflect undo/redo availability
     */
    updateUndoRedoUI() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length <= 1;
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
        }
    }
    
    /**
     * Reset history (e.g., when grid size changes)
     */
    clear() {
        // Always keep the current state
        const currentState = this.createGridSnapshot();
        
        this.undoStack = currentState ? [{
            timestamp: Date.now(),
            description: 'Initial state',
            gridState: currentState
        }] : [];
        
        this.redoStack = [];
        this.updateUndoRedoUI();
    }
}

export default History;