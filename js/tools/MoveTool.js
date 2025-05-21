import Tool from './Tool.js';

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

export default MoveTool;
