class Tool {
    constructor(name) {
        this.name = name;
    }
    
    handleCellClick(cell) {
        // Default implementation - to be overridden by specific tools
    }
    
    handleCellDrag(cell) {
        // Default implementation - to be overridden by specific tools
        this.handleCellClick(cell);
    }
    
    handleMouseUp() {
        // Default implementation - to be overridden by specific tools
    }
}

class PencilTool extends Tool {
    constructor() {
        super('pencil');
    }
    
    handleCellClick(cell) {
        // Start tracking for undo history
        app.history.startStroke('pencil', app.currentColor);
        
        // Store the original color for undo
        const oldColor = cell.dataset.color;
        
        // Apply new color
        cell.style.backgroundColor = app.currentColor;
        cell.dataset.color = app.currentColor;
        
        // Add to current stroke
        app.history.addToStroke(cell, oldColor);
    }
    
    handleCellDrag(cell) {
        // Only change color if it's different from current
        if (cell.dataset.color !== app.currentColor) {
            const oldColor = cell.dataset.color;
            cell.style.backgroundColor = app.currentColor;
            cell.dataset.color = app.currentColor;
            app.history.addToStroke(cell, oldColor);
        }
    }
    
    handleMouseUp() {
        // End the stroke and add to history
        app.history.endStroke();
    }
}

class EraserTool extends Tool {
    constructor() {
        super('eraser');
    }
    
    handleCellClick(cell) {
        // Start tracking for undo history
        app.history.startStroke('eraser', '#FFFFFF');
        
        // Store the original color for undo
        const oldColor = cell.dataset.color;
        
        // Apply eraser
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

class ColorPickerTool extends Tool {
    constructor() {
        super('picker');
    }
    
    handleCellClick(cell) {
        const color = cell.dataset.color;
        app.setCurrentColor(color);
    }
}

class SelectionTool extends Tool {
    constructor() {
        super('selection');
        this.selectedCells = new Set();
        this.isSelecting = false;
        this.isMoving = false;
        this.startCell = null;
        this.selectionRect = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
        this.moveStartPosition = { row: 0, col: 0 };
        this.cellDataForMove = [];
        this.previewCells = new Set(); // Track cells used for preview
    }
    
    handleCellClick(cell) {
        if (!cell.classList.contains('grid-cell')) return;
        
        // If clicking inside an existing selection, start moving it
        if (this.selectedCells.has(cell) && this.selectedCells.size > 0) {
            this.startMovingSelection(cell);
            return;
        }
        
        // Otherwise start a new selection
        this.clearSelection();
        this.isSelecting = true;
        this.startCell = cell;
        this.selectionRect.startRow = parseInt(cell.dataset.row);
        this.selectionRect.startCol = parseInt(cell.dataset.col);
    }
    
    startMovingSelection(cell) {
        this.isMoving = true;
        this.moveStartPosition = {
            row: parseInt(cell.dataset.row),
            col: parseInt(cell.dataset.col)
        };
        
        // Store the data of cells being moved
        this.cellDataForMove = [];
        this.selectedCells.forEach(cell => {
            this.cellDataForMove.push({
                row: parseInt(cell.dataset.row),
                col: parseInt(cell.dataset.col),
                color: cell.dataset.color
            });
        });
        
        // Clear the original cells and keep track of them for undo
        const oldColors = new Map();
        this.selectedCells.forEach(cell => {
            oldColors.set(cell, cell.dataset.color);
            cell.style.backgroundColor = '#FFFFFF';
            cell.dataset.color = '#FFFFFF';
            cell.classList.remove('selected');
        });
        
        this.selectedCells.clear();
    }
    
    handleCellDrag(cell) {
        if (!cell.classList.contains('grid-cell')) return;
        
        if (this.isSelecting) {
            // Update selection rectangle
            this.updateSelectionRectangle(cell);
        }
        else if (this.isMoving) {
            // Show preview of where the selection will move
            this.showMovePreview(cell);
        }
    }
    
    updateSelectionRectangle(cell) {
        this.selectionRect.endRow = parseInt(cell.dataset.row);
        this.selectionRect.endCol = parseInt(cell.dataset.col);
        
        // Clear previous selection
        document.querySelectorAll('.grid-cell.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
        this.selectedCells.clear();
        
        // Select all cells in the rectangle
        const minRow = Math.min(this.selectionRect.startRow, this.selectionRect.endRow);
        const maxRow = Math.max(this.selectionRect.startRow, this.selectionRect.endRow);
        const minCol = Math.min(this.selectionRect.startCol, this.selectionRect.endCol);
        const maxCol = Math.max(this.selectionRect.startCol, this.selectionRect.endCol);
        
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const cell = app.grid.getCellAt(row, col);
                if (cell) {
                    cell.classList.add('selected');
                    this.selectedCells.add(cell);
                }
            }
        }
    }
    
    showMovePreview(cell) {
        // Clear all previous preview cells and restore their original appearance
        this.clearMovePreview();
        
        const currentRow = parseInt(cell.dataset.row);
        const currentCol = parseInt(cell.dataset.col);
        
        // Calculate the offset from starting position
        const rowOffset = currentRow - this.moveStartPosition.row;
        const colOffset = currentCol - this.moveStartPosition.col;
        
        // Show preview at new position
        this.cellDataForMove.forEach(data => {
            const newRow = data.row + rowOffset;
            const newCol = data.col + colOffset;
            const targetCell = app.grid.getCellAt(newRow, newCol);
            
            if (targetCell) {
                // Store original color if we haven't already
                if (!targetCell.hasAttribute('data-original-color')) {
                    targetCell.setAttribute('data-original-color', targetCell.dataset.color);
                }
                
                // Add to tracked preview cells
                this.previewCells.add(targetCell);
                
                // Add preview class
                targetCell.classList.add('move-preview');
                
                // Just update visual appearance for preview, not data attributes
                targetCell.style.backgroundColor = data.color;
            }
        });
    }
    
    clearMovePreview() {
        // Restore all cells that were part of the preview
        this.previewCells.forEach(cell => {
            cell.classList.remove('move-preview');
            
            // Restore original color from attribute
            if (cell.hasAttribute('data-original-color')) {
                const originalColor = cell.getAttribute('data-original-color');
                cell.style.backgroundColor = originalColor;
                cell.removeAttribute('data-original-color');
            }
        });
        
        // Clear the set of preview cells
        this.previewCells.clear();
    }
    
    handleMouseUp(cell) {
        if (this.isSelecting) {
            this.isSelecting = false;
            // Selection is complete, update UI
            app.updateSelectionUI();
        }
        else if (this.isMoving && cell) {
            this.applyMove(cell);
        }
    }
    
    applyColor() {
        if (this.selectedCells.size === 0) return;
        
        // Use the new matrix-based history
        const matrixChanges = [];
        
        // Apply the new color and track changes
        this.selectedCells.forEach(cell => {
            const oldColor = cell.dataset.color;
            
            // Apply new color
            cell.style.backgroundColor = app.currentColor;
            cell.dataset.color = app.currentColor;
            
            // Record change for history
            matrixChanges.push({
                cell: cell,
                oldColor: oldColor,
                newColor: app.currentColor
            });
        });
        
        // Record this action in history
        if (matrixChanges.length > 0) {
            app.history.addMatrixAction(matrixChanges);
        }
    }
    
    applyMove(cell) {
        const currentRow = parseInt(cell.dataset.row);
        const currentCol = parseInt(cell.dataset.col);
        
        // Calculate offset from starting position
        const rowOffset = currentRow - this.moveStartPosition.row;
        const colOffset = currentCol - this.moveStartPosition.col;
        
        // Clear preview first
        this.clearMovePreview();
        
        // Create matrix changes for history
        const matrixChanges = [];
        
        // Apply the move
        this.cellDataForMove.forEach(data => {
            const newRow = data.row + rowOffset;
            const newCol = data.col + colOffset;
            const targetCell = app.grid.getCellAt(newRow, newCol);
            
            if (targetCell) {
                // Record this change
                matrixChanges.push({
                    cell: targetCell,
                    oldColor: targetCell.dataset.color,
                    newColor: data.color
                });
                
                // Apply new color
                targetCell.style.backgroundColor = data.color;
                targetCell.dataset.color = data.color;
                
                // Add to new selection
                targetCell.classList.add('selected');
                this.selectedCells.add(targetCell);
            }
        });
        
        // Record this action for undo
        if (matrixChanges.length > 0) {
            app.history.addMatrixAction(matrixChanges);
        }
        
        this.isMoving = false;
        this.cellDataForMove = [];
        
        // Update UI to reflect new selection
        app.updateSelectionUI();
    }
    
    clearSelection() {
        // First clear any move preview
        this.clearMovePreview();
        
        // Then clear the selection as before
        this.selectedCells.forEach(cell => {
            cell.classList.remove('selected');
        });
        
        this.selectedCells.clear();
        this.startCell = null;
        this.isSelecting = false;
        this.isMoving = false;
        app.updateSelectionUI();
    }
    
    cutSelection() {
        this.copySelection();
        
        // Use matrix-based history
        const matrixChanges = [];
        
        // Clear the colors of selected cells
        this.selectedCells.forEach(cell => {
            const oldColor = cell.dataset.color;
            
            // Apply change
            cell.style.backgroundColor = '#FFFFFF';
            cell.dataset.color = '#FFFFFF';
            
            // Record change
            matrixChanges.push({
                cell: cell,
                oldColor: oldColor,
                newColor: '#FFFFFF'
            });
        });
        
        // Record this action for undo
        if (matrixChanges.length > 0) {
            app.history.addMatrixAction(matrixChanges);
        }
    }
    
    copySelection() {
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
}

// The MoveTool is no longer needed as we integrated its functionality into SelectionTool
// But let's keep it renamed to make its purpose clearer
class MoveTool extends Tool {
    constructor() {
        super('move');
        this.isDragging = false;
        this.startPos = { row: 0, col: 0 };
        this.pastedData = null;
        this.previewCells = new Set(); // Track cells used for preview
    }
    
    // Repurpose this tool to handle movable paste
    handleCellClick(cell) {
        if (!cell || !cell.classList.contains('grid-cell')) return;
        
        // If we don't have clipboard data, do nothing
        if (!app.clipboard) return;
        
        // If we don't have paste data loaded yet, start paste preview
        if (!this.pastedData) {
            this.startPastePreview(cell);
        } else {
            // Otherwise place the content and reset the paste state
            this.applyPaste(cell);
            
            // Switch back to the previously used tool after pasting
            const previousTool = app.previousTool || 'pencil';
            setTimeout(() => app.setActiveTool(previousTool), 0);
        }
    }
    
    startPastePreview(cell) {
        // Deep clone the clipboard data to avoid reference issues
        this.pastedData = JSON.parse(JSON.stringify(app.clipboard));
        this.isDragging = true;
        this.showPastePreview(cell);
        
        // Show paste instructions
        this.showPasteInstructions();
    }
    
    showPasteInstructions() {
        // Remove any existing notification
        const existingNotification = document.querySelector('.paste-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Show a temporary notification to guide the user
        const notification = document.createElement('div');
        notification.className = 'paste-notification';
        notification.textContent = 'Click to place the copied content or press ESC to cancel';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.contains(notification)) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (document.contains(notification)) {
                        notification.remove();
                    }
                }, 500);
            }
        }, 3000);
    }
    
    handleCellDrag(cell) {
        if (!this.isDragging || !cell || !cell.classList.contains('grid-cell')) return;
        
        this.showPastePreview(cell);
    }
    
    showPastePreview(cell) {
        // Clear previous preview
        this.clearPastePreview();
        
        if (!this.pastedData || !cell) return;
        
        const targetRow = parseInt(cell.dataset.row);
        const targetCol = parseInt(cell.dataset.col);
        
        // Center the paste around the target cell
        const offsetRow = Math.floor(this.pastedData.height / 2);
        const offsetCol = Math.floor(this.pastedData.width / 2);
        
        // Show preview
        for (let r = 0; r < this.pastedData.height; r++) {
            for (let c = 0; c < this.pastedData.width; c++) {
                const color = this.pastedData.data[r][c];
                if (color !== null) {
                    const row = targetRow - offsetRow + r;
                    const col = targetCol - offsetCol + c;
                    
                    const targetCell = app.grid.getCellAt(row, col);
                    if (targetCell) {
                        // Store original color if not already stored
                        if (!targetCell.hasAttribute('data-original-color')) {
                            targetCell.setAttribute('data-original-color', targetCell.dataset.color);
                        }
                        
                        // Add to tracked preview cells
                        this.previewCells.add(targetCell);
                        
                        // Update visual appearance
                        targetCell.classList.add('move-preview');
                        targetCell.style.backgroundColor = color;
                    }
                }
            }
        }
    }
    
    clearPastePreview() {
        // Restore all cells that were part of the preview
        this.previewCells.forEach(cell => {
            cell.classList.remove('move-preview');
            
            // Restore original color
            if (cell.hasAttribute('data-original-color')) {
                const originalColor = cell.getAttribute('data-original-color');
                cell.style.backgroundColor = originalColor;
                cell.removeAttribute('data-original-color');
            }
        });
        
        // Clear the set of preview cells
        this.previewCells.clear();
    }
    
    applyPaste(cell) {
        if (!this.pastedData || !cell) return;
        
        const targetRow = parseInt(cell.dataset.row);
        const targetCol = parseInt(cell.dataset.col);
        
        // Clear any preview first
        this.clearPastePreview();
        
        // Center the paste around the target cell
        const offsetRow = Math.floor(this.pastedData.height / 2);
        const offsetCol = Math.floor(this.pastedData.width / 2);
        
        // Use the new matrix-based history tracking
        const matrixChanges = [];
        
        // Apply the paste
        for (let r = 0; r < this.pastedData.height; r++) {
            for (let c = 0; c < this.pastedData.width; c++) {
                const color = this.pastedData.data[r][c];
                if (color !== null) {
                    const row = targetRow - offsetRow + r;
                    const col = targetCol - offsetCol + c;
                    
                    const targetCell = app.grid.getCellAt(row, col);
                    if (targetCell) {
                        // Record the change for history
                        matrixChanges.push({
                            cell: targetCell,
                            oldColor: targetCell.dataset.color,
                            newColor: color
                        });
                        
                        // Apply changes
                        targetCell.style.backgroundColor = color;
                        targetCell.dataset.color = color;
                    }
                }
            }
        }
        
        // Record this action for undo using the new matrix-based approach
        if (matrixChanges.length > 0) {
            app.history.addMatrixAction(matrixChanges);
        }
        
        // Reset state
        this.resetTool();
    }
    
    cancelPastePreview() {
        this.clearPastePreview();
        this.resetTool();
    }
    
    resetTool() {
        this.pastedData = null;
        this.isDragging = false;
    }
    
    handleMouseUp() {
        // We don't apply paste on mouseup, only on click
    }
}
