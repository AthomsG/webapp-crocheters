/**
 * SelectionOperations - A module that contains auxiliary operations for the Selection Tool
 */

class SelectionOperations {
    constructor(selectionTool) {
        this.selectionTool = selectionTool;
    }
    
    // Check if the selection tool has an active selection
    hasSelection() {
        return this.selectionTool.selectedCells.size > 0 || 
               (this.selectionTool.floatingLayer && this.selectionTool.floatingLayer.active);
    }
    
    // Copy the current selection to the clipboard
    copySelection() {
        const selectionTool = this.selectionTool;
        
        // If we have a floating layer, use that for copying
        if (selectionTool.floatingLayer && selectionTool.floatingLayer.active) {
            const bounds = selectionTool.getFloatingLayerBounds();
            const width = bounds.maxCol - bounds.minCol + 1;
            const height = bounds.maxRow - bounds.minRow + 1;
            
            // Create a 2D array for the clipboard
            const selectionData = Array(height).fill().map(() => Array(width).fill(null));
            
            // Fill in the colors from the floating layer
            selectionTool.floatingLayer.content.forEach(item => {
                if (item.relRow >= 0 && item.relRow < height && 
                    item.relCol >= 0 && item.relCol < width) {
                    selectionData[item.relRow][item.relCol] = item.color;
                }
            });
            
            app.clipboard = {
                data: selectionData,
                width: width,
                height: height
            };
            return;
        }
        
        // Otherwise, copy from the selected cells
        if (selectionTool.selectedCells.size === 0) return;
        
        // Create a rectangle representation of the selection
        const cells = Array.from(selectionTool.selectedCells);
        const rows = cells.map(cell => parseInt(cell.dataset.row));
        const cols = cells.map(cell => parseInt(cell.dataset.col));
        
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);
        
        // Create a 2D array representing the selection
        const selectionData = [];
        for (let r = 0; r <= maxRow - minRow; r++) {
            selectionData[r] = [];
            for (let c = 0; c <= maxCol - minCol; c++) {
                const cell = app.grid.getCellAt(r + minRow, c + minCol);
                selectionData[r][c] = cell && selectionTool.selectedCells.has(cell) ? cell.dataset.color : null;
            }
        }
        
        app.clipboard = {
            data: selectionData,
            width: maxCol - minCol + 1,
            height: maxRow - minRow + 1
        };
    }
    
    // Cut the current selection - improved to eliminate intermediate states
    cutSelection() {
        console.log("DEBUG: cutSelection called");
        
        // First, copy the selection to clipboard
        this.copySelection();
        
        // If we have a floating layer, handle that specially
        if (this.selectionTool.floatingLayer.active) {
            console.log("DEBUG: Cutting from floating layer");
            
            // Get the current floating layer position
            const baseRow = this.selectionTool.floatingLayer.position.row;
            const baseCol = this.selectionTool.floatingLayer.position.col;
            
            // Flag to track if changes were made
            let madeChanges = false;
            
            // Apply white to underlying cells
            this.selectionTool.floatingLayer.content.forEach(item => {
                const row = baseRow + item.relRow;
                const col = baseCol + item.relCol;
                const cell = app.grid.getCellAt(row, col);
                
                if (cell && item.color !== '#FFFFFF') {
                    // If the cell isn't already white, we're making a change
                    if (cell.dataset.color !== '#FFFFFF') {
                        madeChanges = true;
                    }
                    
                    // Make the cell white
                    cell.style.backgroundColor = '#FFFFFF';
                    cell.dataset.color = '#FFFFFF';
                }
            });
            
            // Clear floating layer
            this.selectionTool.clearFloatingVisuals();
            this.selectionTool.floatingLayer.active = false;
            this.selectionTool.floatingLayer.content = [];
            this.selectionTool.floatingLayer.originalCells = [];
            this.selectionTool.selectedCells.clear();
            
            // If changes were made, capture state
            if (madeChanges) {
                app.history.captureState('Cut selection');
            }
            
            console.log("DEBUG: Cut operation completed - floating layer cleared");
            return;
        }
        
        // Handle regular selection (non-floating)
        if (this.selectionTool.selectedCells.size === 0) {
            console.log("DEBUG: No selection to cut");
            return;
        }
        
        console.log("DEBUG: Cutting from regular selection");
        
        // Create a matrix action for the cells we're about to cut
        const matrixChanges = [];
        
        this.selectionTool.selectedCells.forEach(cell => {
            const oldColor = cell.dataset.color;
            if (oldColor !== '#FFFFFF') {
                matrixChanges.push({
                    cell: cell,
                    oldColor: oldColor,
                    newColor: '#FFFFFF'
                });
                
                // Apply change immediately
                cell.style.backgroundColor = '#FFFFFF';
                cell.dataset.color = '#FFFFFF';
            }
        });
        
        // Record for undo
        if (matrixChanges.length > 0) {
            app.history.addMatrixAction(matrixChanges);
        }
        
        // Call the clearSelection method to reset all states
        this.selectionTool.clearSelection();
        
        console.log("DEBUG: Cut operation completed - selection cleared");
    }
    
    // Fill the current selection with the current color
    // FIX THE FILL SELECTION METHOD - MAKE IT ACTUALLY WORK
    fillSelection() {
        console.log("DEBUG: fillSelection called");
        
        // Skip if no floating layer or no content
        if (!this.selectionTool.floatingLayer.active) {
            console.log("DEBUG: No floating layer active");
            return;
        }
        
        // Capture state before making changes
        app.history.captureState('Before fill selection');
        
        // Get the current color from the app
        const newColor = app.currentColor;
        console.log("DEBUG: Filling ALL cells with color:", newColor);
        
        // Fill EVERY SINGLE CELL in the selection, regardless of current color
        this.selectionTool.floatingLayer.content.forEach(item => {
            // Apply to ALL cells
            item.color = newColor;
        });
        
        // Always update the visual representation
        this.selectionTool.showFloatingLayer();
        
        // Capture state after changes
        app.history.captureState('Fill selection with color');
        
        console.log("DEBUG: ALL cells in selection filled with color:", newColor);
    }
    
    // Apply the current color to the selected cells
    applyColorToSelection() {
        console.log("DEBUG: applyColorToSelection called");
        
        // First make sure we have cells selected
        if (this.selectionTool.selectedCells.size === 0) {
            console.log("DEBUG: No cells selected");
            return;
        }
        
        // Capture state before making changes
        app.history.captureState('Before apply color');
        
        // Get the color to apply
        const newColor = app.currentColor;
        let madeChanges = false;
        
        // Apply color to all selected cells
        this.selectionTool.selectedCells.forEach(cell => {
            const currentColor = cell.dataset.color;
            if (currentColor !== newColor) {
                cell.style.backgroundColor = newColor;
                cell.dataset.color = newColor;
                madeChanges = true;
            }
        });
        
        // If we made changes, update state
        if (madeChanges) {
            app.history.captureState('Apply color to selection');
        }
    }
    
    // Clear just the content of the selection (make it transparent/white)
    clearSelectionContent() {
        console.log("DEBUG: clearSelectionContent called");
        
        // Skip if no floating layer active
        if (!this.selectionTool.floatingLayer.active) {
            console.log("DEBUG: No floating layer to clear");
            return;
        }
        
        // Capture state before making changes
        app.history.captureState('Before clearing selection');
        
        // Track if any changes were made
        let madeChanges = false;
        
        // Set all non-white cells to white in the floating layer
        this.selectionTool.floatingLayer.content.forEach(item => {
            if (item.color !== '#FFFFFF') {
                item.color = '#FFFFFF';
                madeChanges = true;
            }
        });
        
        // If changes were made, update the visual and history
        if (madeChanges) {
            // Update the visual representation immediately
            this.selectionTool.showFloatingLayer();
            
            // Capture state after changes
            app.history.captureState('Clear selection content');
            
            console.log("DEBUG: Selection content cleared");
        } else {
            console.log("DEBUG: No changes made during clear");
        }
    }
    
    // Create and add a snapshot of the floating layer to history - improved
    captureFloatingLayerSnapshot(description) {
        console.log(`DEBUG: Capturing floating layer snapshot for ${description}`);
        
        if (!this.selectionTool.floatingLayer.active) {
            console.log("DEBUG: No active floating layer to capture");
            return null;
        }
        
        // Create the snapshot with all necessary state information
        const snapshot = {
            type: 'floatingLayerState',
            description: description,
            state: {
                active: true,
                position: { ...this.selectionTool.floatingLayer.position },
                content: JSON.parse(JSON.stringify(this.selectionTool.floatingLayer.content)),
                // Also capture the selected cells for complete state
                selectedCellsInfo: Array.from(this.selectionTool.selectedCells).map(cell => ({
                    row: parseInt(cell.dataset.row),
                    col: parseInt(cell.dataset.col)
                }))
            },
            // Add timestamp to help debug history sequence
            timestamp: Date.now()
        };
        
        console.log(`DEBUG: Created snapshot with ${snapshot.state.content.length} cells for ${description}`);
        return snapshot;
    }
    
    // Apply floating layer snapshot - improved to restore complete state
    applyFloatingLayerSnapshot(snapshot) {
        console.log(`DEBUG: Applying floating layer snapshot for ${snapshot.description || "unknown operation"}`);
        
        if (!snapshot || !snapshot.state) {
            console.error("DEBUG: Invalid snapshot provided");
            return false;
        }
        
        const selectionTool = this.selectionTool;
        
        // First clear any existing selection/floating layer
        selectionTool.clearFloatingVisuals();
        selectionTool.selectedCells.clear();
        
        // Make sure floating layer is active
        selectionTool.floatingLayer.active = true;
        
        // Apply the captured state
        selectionTool.floatingLayer.position = { ...snapshot.state.position };
        selectionTool.floatingLayer.content = JSON.parse(JSON.stringify(snapshot.state.content));
        
        // Restore the selected cells using the stored positions
        if (snapshot.state.selectedCellsInfo) {
            snapshot.state.selectedCellsInfo.forEach(cellInfo => {
                const cell = app.grid.getCellAt(cellInfo.row, cellInfo.col);
                if (cell) {
                    selectionTool.selectedCells.add(cell);
                }
            });
        }
        
        // Update the visual representation
        selectionTool.showFloatingLayer();
        
        console.log("DEBUG: Floating layer snapshot applied successfully");
        return true;
    }
    
    // Flip the selection horizontally
    flipHorizontally() {
        const selectionTool = this.selectionTool;
        
        if (!selectionTool.floatingLayer.active) return;
        
        console.log("DEBUG: flipHorizontally called");
        
        // Find the extremes for the pivot calculation
        let minRelCol = Infinity, maxRelCol = -Infinity;
        selectionTool.floatingLayer.content.forEach(item => {
            minRelCol = Math.min(minRelCol, item.relCol);
            maxRelCol = Math.max(maxRelCol, item.relCol);
        });
        
        // Create a deep copy of the content before modification
        const originalContent = JSON.parse(JSON.stringify(selectionTool.floatingLayer.content));
        
        // Apply the horizontal flip transformation
        selectionTool.floatingLayer.content = selectionTool.floatingLayer.content.map(item => ({
            relRow: item.relRow,
            relCol: maxRelCol - (item.relCol - minRelCol),
            color: item.color
        }));
        
        // Update the display
        selectionTool.showFloatingLayer();
        
        // Capture state for history
        app.history.captureState('Horizontal flip');
        
        console.log("DEBUG: Horizontal flip completed");
    }
    
    // Flip the selection vertically
    flipVertically() {
        const selectionTool = this.selectionTool;
        
        if (!selectionTool.floatingLayer.active) return;
        
        console.log("DEBUG: flipVertically called");
        
        // Find the extremes for the pivot calculation
        let minRelRow = Infinity, maxRelRow = -Infinity;
        selectionTool.floatingLayer.content.forEach(item => {
            minRelRow = Math.min(minRelRow, item.relRow);
            maxRelRow = Math.max(maxRelRow, item.relRow);
        });
        
        // Create a deep copy of the content before modification
        const originalContent = JSON.parse(JSON.stringify(selectionTool.floatingLayer.content));
        
        // Apply the vertical flip transformation
        selectionTool.floatingLayer.content = selectionTool.floatingLayer.content.map(item => ({
            relRow: maxRelRow - (item.relRow - minRelRow),
            relCol: item.relCol,
            color: item.color
        }));
        
        // Update the display
        selectionTool.showFloatingLayer();
        
        // Capture state for history
        app.history.captureState('Vertical flip');
        
        console.log("DEBUG: Vertical flip completed");
    }
}

export default SelectionOperations;
