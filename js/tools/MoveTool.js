import Tool from './Tool.js';

class MoveTool extends Tool {
    constructor() {
        super('move');
        this.isDragging = false;
        this.startPos = { row: 0, col: 0 };
        this.pastedData = null;
        this.previewCells = new Set(); // Track cells used for preview
    }
    
    // Start paste preview operation
    startPastePreview(cell) {
        console.log("DEBUG: startPastePreview called");
        
        // First clear any existing paste operation
        this.clearPastePreview();
        this.resetTool();
        
        // Deep clone the clipboard data to avoid reference issues
        this.pastedData = JSON.parse(JSON.stringify(app.clipboard));
        this.isDragging = true;
        this.showPastePreview(cell);
        
        // Show paste instructions
        this.showPasteInstructions();
        
        // Add a mousemove listener directly to enable real-time preview updates
        document.addEventListener('mousemove', this.handleDocumentMouseMove);
        
        // Also add an ESC key listener to cancel
        document.addEventListener('keydown', this.handleEscapeKey);
    }
    
    // Handler for document-level mousemove to ensure continuous updates
    handleDocumentMouseMove = (e) => {
        // Find cell under cursor
        const cell = document.elementFromPoint(e.clientX, e.clientY);
        if (cell && cell.classList.contains('grid-cell')) {
            this.showPastePreview(cell);
        }
    };
    
    // New escape key handler
    handleEscapeKey = (e) => {
        if (e.key === 'Escape') {
            console.log("DEBUG: Escape key pressed, cancelling paste");
            this.cancelPastePreview();
            document.removeEventListener('keydown', this.handleEscapeKey);
        }
    };
    
    // Show visual instructions for paste operation
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
    
    // Handle cell click - apply paste on click
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
            
            // Clean up and return to previous tool
            this.cleanupAfterPaste();
        }
    }
    
    // Apply paste operation at target cell
    applyPaste(cell) {
        if (!this.pastedData || !cell) return;
        
        console.log("DEBUG: applyPaste called");
        
        const targetRow = parseInt(cell.dataset.row);
        const targetCol = parseInt(cell.dataset.col);
        
        // Clear any preview first
        this.clearPastePreview();
        
        // Center the paste around the target cell
        const offsetRow = Math.floor(this.pastedData.height / 2);
        const offsetCol = Math.floor(this.pastedData.width / 2);
        
        // Track if we made any changes
        let madeChanges = false;
        
        // Apply the paste
        for (let r = 0; r < this.pastedData.height; r++) {
            for (let c = 0; c < this.pastedData.width; c++) {
                const color = this.pastedData.data[r][c];
                if (color !== null) {
                    const row = targetRow - offsetRow + r;
                    const col = targetCol - offsetCol + c;
                    
                    const targetCell = app.grid.getCellAt(row, col);
                    if (targetCell) {
                        // Only register change if color is different
                        if (targetCell.dataset.color !== color) {
                            madeChanges = true;
                        }
                        
                        // Apply changes
                        targetCell.style.backgroundColor = color;
                        targetCell.dataset.color = color;
                    }
                }
            }
        }
        
        // Capture state for history if changes were made
        if (madeChanges) {
            app.history.captureState('Paste');
        }
        
        // Clean up paste operation
        this.cleanupAfterPaste();
    }
    
    // New method to clean up after paste operation
    cleanupAfterPaste() {
        // Remove all event listeners we added
        document.removeEventListener('mousemove', this.handleDocumentMouseMove);
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        // Reset state
        this.resetTool();
        
        // Remove any notification
        const notification = document.querySelector('.paste-notification');
        if (notification) {
            notification.remove();
        }
        
        // Switch back to previous tool
        const previousTool = app.previousTool || 'pencil';
        setTimeout(() => app.setActiveTool(previousTool), 10);
    }
    
    // Clear preview and cancel paste operation
    cancelPastePreview() {
        console.log("DEBUG: cancelPastePreview called");
        
        this.clearPastePreview();
        
        // Remove all event listeners we added
        document.removeEventListener('mousemove', this.handleDocumentMouseMove);
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        this.resetTool();
        
        // Remove any remaining paste notification
        const notification = document.querySelector('.paste-notification');
        if (notification) {
            notification.remove();
        }
        
        // Switch back to the previously used tool
        const previousTool = app.previousTool || 'pencil';
        setTimeout(() => app.setActiveTool(previousTool), 10);
    }
    
    // Handle cell drag events during paste operation
    handleCellDrag(cell) {
        if (!this.pastedData || !cell || !cell.classList.contains('grid-cell')) return;
        
        // Always update preview during paste operation, whether dragging or not
        this.showPastePreview(cell);
    }
    
    // Show preview of paste content at target cell
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
    
    // Clear preview visuals
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
    
    // Reset tool state
    resetTool() {
        this.pastedData = null;
        this.isDragging = false;
        this.previewCells.clear();
    }
    
    // Handle mouse up event
    handleMouseUp() {
        // We don't apply paste on mouseup, only on click
    }
}

export default MoveTool;
