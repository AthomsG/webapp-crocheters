import Tool from './Tool.js';

class SelectionTool extends Tool {
    constructor() {
        super('selection');
        this.selectedCells = new Set();
        this.isSelecting = false;
        this.isMoving = false;
        this.startCell = null;
        this.selectionRect = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
        this.moveStartPosition = { row: 0, col: 0 };
        
        // Floating layer system
        this.floatingLayer = {
            active: false,
            position: { row: 0, col: 0 }, // Top-left position of floating selection
            content: [], // Array of {relRow, relCol, color} (positions relative to top-left)
            originalCells: [] // Store positions and colors that were cleared to create this selection
        };
    }
    
    handleCellClick(cell) {
        if (!cell.classList.contains('grid-cell')) return;
        
        // If clicking inside an existing selection, start moving it
        if (this.floatingLayer.active && this.selectedCells.has(cell)) {
            this.startMovingFloatingLayer(cell);
            return;
        }
        
        // If we have a floating selection and clicked outside it,
        // merge it down before starting a new selection
        if (this.floatingLayer.active) {
            this.mergeFloatingLayer();
        }
        
        // Start a new selection
        this.clearSelection();
        this.isSelecting = true;
        this.startCell = cell;
        this.selectionRect.startRow = parseInt(cell.dataset.row);
        this.selectionRect.startCol = parseInt(cell.dataset.col);
    }
    
    startMovingFloatingLayer(cell) {
        this.isMoving = true;
        this.moveStartPosition = {
            row: parseInt(cell.dataset.row),
            col: parseInt(cell.dataset.col)
        };
    }
    
    handleCellDrag(cell) {
        if (!cell.classList.contains('grid-cell')) return;
        
        if (this.isSelecting) {
            this.updateSelectionRectangle(cell);
        } 
        else if (this.isMoving && this.floatingLayer.active) {
            this.moveFloatingLayer(cell);
        }
    }
    
    updateSelectionRectangle(cell) {
        this.selectionRect.endRow = parseInt(cell.dataset.row);
        this.selectionRect.endCol = parseInt(cell.dataset.col);
        
        // Clear previous selection
        document.querySelectorAll('.grid-cell.selected').forEach(cell => {
            cell.classList.remove('selected', 'selected-top', 'selected-right', 'selected-bottom', 'selected-left');
        });
        this.selectedCells.clear();
        
        // Calculate bounds
        const minRow = Math.min(this.selectionRect.startRow, this.selectionRect.endRow);
        const maxRow = Math.max(this.selectionRect.startRow, this.selectionRect.endRow);
        const minCol = Math.min(this.selectionRect.startCol, this.selectionRect.endCol);
        const maxCol = Math.max(this.selectionRect.startCol, this.selectionRect.endCol);
        
        // Add all cells in the rectangle to the selection
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const cell = app.grid.getCellAt(row, col);
                if (cell) {
                    cell.classList.add('selected');
                    this.selectedCells.add(cell);
                }
            }
        }
        
        // Add border indicators to the edges
        this.addBorderIndicators(minRow, maxRow, minCol, maxCol);
    }
    
    addBorderIndicators(minRow, maxRow, minCol, maxCol) {
        this.selectedCells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (row === minRow) cell.classList.add('selected-top');
            if (col === maxCol) cell.classList.add('selected-right');
            if (row === maxRow) cell.classList.add('selected-bottom');
            if (col === minCol) cell.classList.add('selected-left');
        });
    }
    
    // Create a floating layer from the current selection
    createFloatingLayer() {
        if (this.floatingLayer.active) {
            this.mergeFloatingLayer(); // Merge any existing floating layer first
        }
        
        // Calculate selection bounds
        const cells = Array.from(this.selectedCells);
        const rows = cells.map(cell => parseInt(cell.dataset.row));
        const cols = cells.map(cell => parseInt(cell.dataset.col));
        
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);
        
        // Initialize floating layer
        this.floatingLayer.active = true;
        this.floatingLayer.position = { row: minRow, col: minCol };
        this.floatingLayer.content = [];
        this.floatingLayer.originalCells = [];
        
        // Store cells' content in the floating layer and clear original cells
        const matrixChanges = [];
        
        this.selectedCells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const color = cell.dataset.color;
            
            // Store in floating layer (as relative positions)
            this.floatingLayer.content.push({
                relRow: row - minRow,
                relCol: col - minCol,
                color: color
            });
            
            // Record original cell for undo
            this.floatingLayer.originalCells.push({
                row: row,
                col: col,
                color: color
            });
            
            // Record for history
            if (color !== '#FFFFFF') {
                matrixChanges.push({
                    cell: cell,
                    oldColor: color,
                    newColor: '#FFFFFF'
                });
            }
            
            // Clear original cell
            cell.style.backgroundColor = '#FFFFFF';
            cell.dataset.color = '#FFFFFF';
        });
        
        // Record this change in history
        if (matrixChanges.length > 0) {
            app.history.addMatrixAction(matrixChanges);
        }
        
        // Clear the selection visuals since we'll now have floating content
        this.selectedCells.clear();
        document.querySelectorAll('.grid-cell.selected').forEach(cell => {
            cell.classList.remove('selected', 'selected-top', 'selected-right', 'selected-bottom', 'selected-left');
        });
        
        // Show the floating selection
        this.showFloatingLayer();
    }
    
    // Display the floating layer at its current position
    showFloatingLayer() {
        // First clear any existing floating layer visuals
        this.clearFloatingVisuals();
        
        // Create visual representation at current position
        const baseRow = this.floatingLayer.position.row;
        const baseCol = this.floatingLayer.position.col;
        
        // Calculate bounds for the selection border
        let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
        
        // Apply each floating content item
        this.floatingLayer.content.forEach(item => {
            const row = baseRow + item.relRow;
            const col = baseCol + item.relCol;
            
            // Update bounds
            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
            
            const cell = app.grid.getCellAt(row, col);
            if (cell) {
                // For VISUAL DISPLAY only:
                // Save current background state if not already saved
                if (!cell.hasAttribute('data-orig-bg')) {
                    cell.setAttribute('data-orig-bg', cell.dataset.color);
                }
                
                // Add to tracked cells
                this.selectedCells.add(cell);
                
                // Add visual classes
                cell.classList.add('selected');
                cell.classList.add('floating-layer');
                
                // Show the floating content color VISUALLY only
                if (item.color !== '#FFFFFF') {
                    cell.style.backgroundColor = item.color;
                }
            }
        });
        
        // Add selection borders
        this.addBorderIndicators(minRow, maxRow, minCol, maxCol);
    }
    
    // Clear only the visual representation of the floating layer
    clearFloatingVisuals() {
        // Restore background appearance of all cells with the floating-layer class
        document.querySelectorAll('.grid-cell.floating-layer').forEach(cell => {
            // Restore original visual state
            if (cell.hasAttribute('data-orig-bg')) {
                cell.style.backgroundColor = cell.getAttribute('data-orig-bg');
                cell.removeAttribute('data-orig-bg');
            }
            
            // Remove visual classes
            cell.classList.remove('floating-layer', 'selected', 
                                 'selected-top', 'selected-right', 
                                 'selected-bottom', 'selected-left');
        });
        
        this.selectedCells.clear();
    }
    
    moveFloatingLayer(cell) {
        if (!this.isMoving || !this.floatingLayer.active) return;
        
        // Calculate offset from drag start position
        const currentRow = parseInt(cell.dataset.row);
        const currentCol = parseInt(cell.dataset.col);
        
        const rowOffset = currentRow - this.moveStartPosition.row;
        const colOffset = currentCol - this.moveStartPosition.col;
        
        // Update floating layer position
        this.floatingLayer.position = {
            row: this.floatingLayer.position.row + rowOffset,
            col: this.floatingLayer.position.col + colOffset
        };
        
        // Update moveStartPosition for next drag movement
        this.moveStartPosition = { row: currentRow, col: currentCol };
        
        // Show the floating selection at the new position
        this.showFloatingLayer();
    }
    
    handleMouseUp(cell) {
        if (this.isSelecting) {
            this.isSelecting = false;
            
            // If we've selected something, convert it to a floating layer
            if (this.selectedCells.size > 0) {
                this.createFloatingLayer();
            }
            
            app.updateSelectionUI();
        }
        else if (this.isMoving) {
            this.isMoving = false;
            // When we stop moving, just update the UI - the floating layer stays active
            app.updateSelectionUI();
        }
    }
    
    // Merge the floating layer into the background grid
    mergeFloatingLayer() {
        if (!this.floatingLayer.active) return;
        
        // Get the current floating layer position
        const baseRow = this.floatingLayer.position.row;
        const baseCol = this.floatingLayer.position.col;
        
        // Create history records
        const matrixChanges = [];
        
        // Clear the visual representation first
        this.clearFloatingVisuals();
        
        // Apply floating content to the grid
        this.floatingLayer.content.forEach(item => {
            const row = baseRow + item.relRow;
            const col = baseCol + item.relCol;
            const cell = app.grid.getCellAt(row, col);
            
            if (cell && item.color !== '#FFFFFF') {
                // Record the change for history
                matrixChanges.push({
                    cell: cell,
                    oldColor: cell.dataset.color,
                    newColor: item.color
                });
                
                // Apply the color to the grid (BOTH visual and data)
                cell.style.backgroundColor = item.color;
                cell.dataset.color = item.color;
            }
        });
        
        // Record changes in history
        if (matrixChanges.length > 0) {
            app.history.addMatrixAction(matrixChanges);
        }
        
        // Reset floating layer state
        this.floatingLayer.active = false;
        this.floatingLayer.content = [];
        this.floatingLayer.originalCells = [];
    }
    
    applyColor() {
        if (this.selectedCells.size === 0 && !this.floatingLayer.active) return;
        
        // If we have a floating layer, apply color to it
        if (this.floatingLayer.active) {
            // Merge the current floating layer first
            this.mergeFloatingLayer();
            
            // Then apply color to the selected cells as normal
            this.applyColorToSelection();
            
            // Recreate the floating layer with the new color
            if (this.selectedCells.size > 0) {
                this.createFloatingLayer();
            }
        } else {
            this.applyColorToSelection();
        }
    }
    
    applyColorToSelection() {
        const matrixChanges = [];
        
        this.selectedCells.forEach(cell => {
            const oldColor = cell.dataset.color;
            
            matrixChanges.push({
                cell: cell,
                oldColor: oldColor,
                newColor: app.currentColor
            });
            
            // Apply new color
            cell.style.backgroundColor = app.currentColor;
            cell.dataset.color = app.currentColor;
        });
        
        // Record in history
        if (matrixChanges.length > 0) {
            app.history.addMatrixAction(matrixChanges);
        }
    }
    
    clearSelection() {
        // If we have a floating layer, merge it down
        if (this.floatingLayer.active) {
            this.mergeFloatingLayer();
        }
        
        // Clear selection visuals
        document.querySelectorAll('.grid-cell.selected').forEach(cell => {
            cell.classList.remove('selected', 'selected-top', 'selected-right', 'selected-bottom', 'selected-left');
            cell.classList.remove('floating-layer');
        });
        
        // Reset state
        this.selectedCells.clear();
        this.isSelecting = false;
        this.isMoving = false;
        this.startCell = null;
        
        app.updateSelectionUI();
    }
    
    copySelection() {
        // If we have a floating layer, use that for copying
        if (this.floatingLayer && this.floatingLayer.active) {
            const bounds = this.getFloatingLayerBounds();
            const width = bounds.maxCol - bounds.minCol + 1;
            const height = bounds.maxRow - bounds.minRow + 1;
            
            // Create a 2D array for the clipboard
            const selectionData = Array(height).fill().map(() => Array(width).fill(null));
            
            // Fill in the colors from the floating layer
            this.floatingLayer.content.forEach(item => {
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
        if (this.selectedCells.size === 0) return;
        
        // Create a rectangle representation of the selection
        const cells = Array.from(this.selectedCells);
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
                selectionData[r][c] = cell && this.selectedCells.has(cell) ? cell.dataset.color : null;
            }
        }
        
        app.clipboard = {
            data: selectionData,
            width: maxCol - minCol + 1,
            height: maxRow - minRow + 1
        };
    }
    
    getFloatingLayerBounds() {
        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;
        
        this.floatingLayer.content.forEach(item => {
            const row = this.floatingLayer.position.row + item.relRow;
            const col = this.floatingLayer.position.col + item.relCol;
            
            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
        });
        
        return { minRow, maxRow, minCol, maxCol };
    }
    
    cutSelection() {
        this.copySelection();
        
        // If we have a floating layer, just remove it
        if (this.floatingLayer.active) {
            document.querySelectorAll('.grid-cell.selected, .grid-cell.floating-layer').forEach(cell => {
                cell.classList.remove('selected', 'selected-top', 'selected-right', 'selected-bottom', 'selected-left', 'floating-layer');
            });
            this.floatingLayer.active = false;
            this.floatingLayer.content = [];
            this.selectedCells.clear();
            return;
        }
        
        // Otherwise, clear the selected cells
        const matrixChanges = [];
        
        this.selectedCells.forEach(cell => {
            const oldColor = cell.dataset.color;
            if (oldColor !== '#FFFFFF') {
                matrixChanges.push({
                    cell: cell,
                    oldColor: oldColor,
                    newColor: '#FFFFFF'
                });
            }
            
            // Apply change
            cell.style.backgroundColor = '#FFFFFF';
            cell.dataset.color = '#FFFFFF';
        });
        
        // Record for undo
        if (matrixChanges.length > 0) {
            app.history.addMatrixAction(matrixChanges);
        }
        
        this.clearSelection();
    }
    
    // Handle cleanup when switching tools
    cancelOperation() {
        // If we have a floating layer, merge it down
        if (this.floatingLayer.active) {
            this.mergeFloatingLayer();
        }
        
        if (this.isMoving) {
            this.isMoving = false;
        }
        
        if (this.isSelecting) {
            this.isSelecting = false;
        }
    }
    
    // Add an alias for backward compatibility
    commitFloatingSelection() {
        if (this.floatingLayer && this.floatingLayer.active) {
            this.mergeFloatingLayer();
        }
    }
}

export default SelectionTool;
