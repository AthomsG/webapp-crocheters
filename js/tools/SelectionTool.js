import Tool from './Tool.js';
import SelectionOperations from './SelectionOperations.js';

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
        
        // Initialize operations helper
        this.operations = new SelectionOperations(this);
        
        // DON'T bind methods in the constructor - this causes issues
        // with method definition order. Fix binding in a different way.
    }
    
    // Ensure mouse down handler works properly
    handleCellClick(cell) {
        if (!cell || !cell.classList.contains('grid-cell')) return;
        
        console.log("SelectionTool: handleCellClick called");
        
        // Left-click behavior - don't show context menu
        if (!window.event || window.event.button === 0) {
            // If we have a floating selection and clicked outside it,
            // merge it down before starting a new selection
            if (this.floatingLayer.active && !this.selectedCells.has(cell)) {
                this.mergeFloatingLayer();
            }
            
            // If clicking inside an existing selection, start moving it
            if (this.floatingLayer.active && this.selectedCells.has(cell)) {
                this.startMovingFloatingLayer(cell);
                return;
            }
            
            // Start a new selection
            this.clearSelection();
            this.isSelecting = true;
            this.startCell = cell;
            this.selectionRect.startRow = parseInt(cell.dataset.row);
            this.selectionRect.startCol = parseInt(cell.dataset.col);
            
            // Initial selection of the first cell
            this.updateSelectionRectangle(cell);
        }
    }
    
    startMovingFloatingLayer(cell) {
        console.log("DEBUG: Starting floating layer move");
        this.isMoving = true;
        this.moveStartPosition = {
            row: parseInt(cell.dataset.row),
            col: parseInt(cell.dataset.col)
        };
        
        // Capture the state BEFORE moving for undo
        if (this.operations) {
            this._beforeMoveSnapshot = this.operations.captureFloatingLayerSnapshot("Before Move");
            console.log("DEBUG: Captured pre-move state");
        } else {
            console.error("DEBUG: SelectionOperations not available");
        }
    }
    
    // Make sure drag handler properly updates the selection
    handleCellDrag(cell) {
        if (!cell || !cell.classList.contains('grid-cell')) return;
        
        if (this.isSelecting) {
            console.log("SelectionTool: updating selection rectangle during drag");
            this.updateSelectionRectangle(cell);
        } 
        else if (this.isMoving && this.floatingLayer.active) {
            console.log("SelectionTool: moving floating layer during drag");
            this.moveFloatingLayer(cell);
        }
    }
    
    // Improved selection rectangle update with better cleanup
    updateSelectionRectangle(cell) {
        this.selectionRect.endRow = parseInt(cell.dataset.row);
        this.selectionRect.endCol = parseInt(cell.dataset.col);
        
        // Clear previous selection more thoroughly
        this.clearSelectionVisuals();
        
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
        
        // Add border indicators to the edges - directly implement it here to avoid the function call issue
        this.selectedCells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (row === minRow) cell.classList.add('selected-top');
            if (col === maxCol) cell.classList.add('selected-right');
            if (row === maxRow) cell.classList.add('selected-bottom');
            if (col === minCol) cell.classList.add('selected-left');
        });
    }
    
    // New method to clear only selection visuals (not floating layer)
    clearSelectionVisuals() {
        // Remove selection classes from all grid cells
        document.querySelectorAll('.grid-cell.selected').forEach(cell => {
            cell.classList.remove(
                'selected', 
                'selected-top', 
                'selected-right', 
                'selected-bottom', 
                'selected-left'
            );
        });
        
        // Clear the selection set
        this.selectedCells.clear();
    }
    
    // Improved floating layer cleanup - more thorough
    clearFloatingVisuals() {
        // First, restore original appearance of floating layer cells
        document.querySelectorAll('.grid-cell.floating-layer').forEach(cell => {
            // Restore original visual state
            if (cell.hasAttribute('data-orig-bg')) {
                cell.style.backgroundColor = cell.getAttribute('data-orig-bg');
                cell.removeAttribute('data-orig-bg');
            }
            
            // Remove floating layer class
            cell.classList.remove('floating-layer');
        });
        
        // Then, clear all selection-related classes from ALL cells
        document.querySelectorAll('.grid-cell.selected, .grid-cell.selected-top, .grid-cell.selected-right, .grid-cell.selected-bottom, .grid-cell.selected-left').forEach(cell => {
            cell.classList.remove(
                'selected', 
                'selected-top', 
                'selected-right', 
                'selected-bottom', 
                'selected-left'
            );
        });
        
        // Clear our tracking set
        this.selectedCells.clear();
    }
    
    // Improved floating layer visual display to show full outline while staying minimal
    showFloatingLayer() {
        console.log("DEBUG: showFloatingLayer called");
        
        if (!this.floatingLayer.active || this.floatingLayer.content.length === 0) {
            console.log("DEBUG: No floating layer to show");
            return;
        }
        
        // First ensure ALL previous visuals are cleared
        this.clearFloatingVisuals();
        
        // Get base position
        const baseRow = this.floatingLayer.position.row;
        const baseCol = this.floatingLayer.position.col;
        
        // Calculate bounds for ALL cells in the selection, not just colored ones
        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;
        
        // Calculate bounds for ALL cells, including white ones
        this.floatingLayer.content.forEach(item => {
            const row = baseRow + item.relRow;
            const col = baseCol + item.relCol;
            
            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
        });
        
        // Show ALL cells in the selection, mark colored ones specially
        this.floatingLayer.content.forEach(item => {
            const row = baseRow + item.relRow;
            const col = baseCol + item.relCol;
            const cell = app.grid.getCellAt(row, col);
            
            if (cell) {
                // Store original background for restoration
                if (!cell.hasAttribute('data-orig-bg')) {
                    cell.setAttribute('data-orig-bg', cell.dataset.color);
                }
                
                // Add ALL cells to selection
                this.selectedCells.add(cell);
                cell.classList.add('selected');
                
                // Apply visual styling - for colored cells, show the color
                if (item.color !== '#FFFFFF') {
                    cell.classList.add('floating-layer');
                    cell.style.backgroundColor = item.color;
                }
            }
        });
        
        // Apply border indicators to ALL selected cells
        if (minRow !== Infinity) {
            this.selectedCells.forEach(cell => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                
                if (row === minRow) cell.classList.add('selected-top');
                if (col === maxCol) cell.classList.add('selected-right');
                if (row === maxRow) cell.classList.add('selected-bottom');
                if (col === minCol) cell.classList.add('selected-left');
            });
        }
        
        console.log(`DEBUG: Showed floating layer with ${this.selectedCells.size} cells`);
    }
    
    // Record when moving the floating layer
    moveFloatingLayer(cell) {
        if (!this.isMoving || !this.floatingLayer.active) return;
        
        console.log("DEBUG: moveFloatingLayer called");
        
        // Calculate offset from drag start position
        const currentRow = parseInt(cell.dataset.row);
        const currentCol = parseInt(cell.dataset.col);
        
        const rowOffset = currentRow - this.moveStartPosition.row;
        const colOffset = currentCol - this.moveStartPosition.col;
        
        if (rowOffset === 0 && colOffset === 0) {
            // No actual movement, skip processing
            return;
        }
        
        // Save the old position for history
        const oldPosition = {
            row: this.floatingLayer.position.row,
            col: this.floatingLayer.position.col
        };
        
        // Update floating layer position
        this.floatingLayer.position = {
            row: oldPosition.row + rowOffset,
            col: oldPosition.col + colOffset
        };
        
        // Update moveStartPosition for next drag movement
        this.moveStartPosition = { row: currentRow, col: currentCol };
        
        // Update the visual representation immediately
        this.showFloatingLayer();
        
        console.log("DEBUG: Moved floating layer to", this.floatingLayer.position);
    }
    
    // Enhanced handleMouseUp - remove duplicate state capture
    handleMouseUp(cell) {
        console.log("SelectionTool: handleMouseUp called", this.isSelecting, this.isMoving);
        
        if (this.isSelecting) {
            this.isSelecting = false;
            
            // If we've selected something, convert it to a floating layer
            if (this.selectedCells.size > 0) {
                this.createFloatingLayer();
                // Note: state is already captured inside createFloatingLayer
                // No need for another captureState call here
            }
            
            app.updateSelectionUI();
        }
        else if (this.isMoving) {
            this.isMoving = false;
            
            // Create a history snapshot after moving
            app.history.captureState('Move selection');
            
            app.updateSelectionUI();
        }
    }
    
    // Simplified mergeFloatingLayer for new behavior
    mergeFloatingLayer() {
        console.log("DEBUG: mergeFloatingLayer called");
        
        if (!this.floatingLayer.active) {
            console.log("DEBUG: No active floating layer to merge");
            return;
        }
        
        // Capture state before merging
        app.history.captureState('Before merge layer');
        
        // Get floating layer position
        const baseRow = this.floatingLayer.position.row;
        const baseCol = this.floatingLayer.position.col;
        
        // Flag to track changes
        let madeChanges = false;
        
        // First clear visuals
        this.clearFloatingVisuals();
        
        // Apply floating content to grid, but only for non-white cells
        this.floatingLayer.content.forEach(item => {
            const row = baseRow + item.relRow;
            const col = baseCol + item.relCol;
            const cell = app.grid.getCellAt(row, col);
            
            // Only apply changes for colored cells, ignore white/background
            if (cell && item.color !== '#FFFFFF') {
                // Apply permanent change to the cell
                cell.style.backgroundColor = item.color;
                cell.dataset.color = item.color;
                madeChanges = true;
            }
        });
        
        // Reset floating layer state
        this.floatingLayer.active = false;
        this.floatingLayer.content = [];
        this.floatingLayer.originalCells = [];
        
        // If we made changes, capture the state
        if (madeChanges) {
            app.history.captureState('Merge floating layer');
        }
        
        console.log("DEBUG: Floating layer merged successfully");
    }
    
    // This method MUST remain in SelectionTool class - DO NOT move to operations
    clearSelection() {
        // If we have a floating layer, merge it down
        if (this.floatingLayer.active) {
            this.mergeFloatingLayer();
        }
        
        // Clear ALL selection visuals and classes
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove(
                'selected', 
                'selected-top', 
                'selected-right', 
                'selected-bottom', 
                'selected-left',
                'floating-layer'
            );
            
            // Remove any stored original background
            if (cell.hasAttribute('data-orig-bg')) {
                cell.removeAttribute('data-orig-bg');
            }
        });
        
        // Reset state
        this.selectedCells.clear();
        this.isSelecting = false;
        this.isMoving = false;
        this.startCell = null;
        
        app.updateSelectionUI();
    }
    
    // Delegation methods to SelectionOperations
    copySelection() {
        this.operations.copySelection();
    }
    
    cutSelection() {
        this.operations.cutSelection();
    }
    
    applyColor() {
        this.operations.fillSelection();
    }
    
    applyColorToSelection() {
        this.operations.applyColorToSelection();
    }
    
    // Handle context menu actions - fixed to use proper methods
    handleContextMenuAction(event) {
        const action = event.currentTarget.dataset.action;
        
        switch(action) {
            case 'copy':
                this.operations.copySelection();
                break;
            case 'cut':
                this.operations.cutSelection();
                break;
            case 'fill':
                this.operations.fillSelection();
                break;
            case 'clear':
                this.operations.clearSelectionContent();
                break;
            case 'flip-h':
                this.operations.flipHorizontally();
                break;
            case 'flip-v':
                this.operations.flipVertically();
                break;
        }
        
        // Hide the menu
        this.hideContextMenu();
    }
    
    // Add handleContextMenu method
    handleContextMenu(event) {
        // Make sure we have a cell and it's part of the selection
        const cell = event.target;
        if (!cell.classList.contains('grid-cell')) return;
        
        // Only show the context menu if the cell is in the current selection
        if (this.selectedCells.has(cell)) {
            this.showContextMenu(event);
            event.preventDefault();
            return false;
        }
    }
    
    // Show context menu at mouse position
    showContextMenu(event) {
        // Hide context menu first to reset its state
        this.hideContextMenu();
        
        const contextMenu = document.getElementById('selection-context-menu');
        
        // Position the menu at mouse coordinates with small offset
        contextMenu.style.left = `${event.clientX + 5}px`;
        contextMenu.style.top = `${event.clientY + 5}px`;
        
        // Show the menu
        contextMenu.classList.add('active');
        
        // Set up event handlers for menu items
        contextMenu.querySelectorAll('li').forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            newItem.addEventListener('click', this.handleContextMenuAction.bind(this));
        });
        
        // Add a click handler to the document to hide menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
            document.addEventListener('contextmenu', this.hideContextMenu.bind(this), { once: true });
        }, 0);
        
        // Prevent default context menu and event propagation
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
    
    // Hide context menu
    hideContextMenu() {
        const contextMenu = document.getElementById('selection-context-menu');
        contextMenu.classList.remove('active');
    }
    
    // Add this method to properly capture state before transforms
    captureStateBeforeOperation(description) {
        // Fix the function name from captureGridState to captureState
        app.history.captureState(description || 'Selection operation');
    }
    
    // Make sure this method is defined and accessible
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
    
    // Fix the createFloatingLayer method - ALLOW empty selections
    createFloatingLayer() {
        console.log("DEBUG: createFloatingLayer called");
        
        // Capture state before making changes
        app.history.captureState('Before creating selection');
        
        if (this.floatingLayer.active) {
            console.log("DEBUG: Merging existing floating layer before creating a new one");
            this.mergeFloatingLayer(); 
        }
        
        // Calculate selection bounds
        const cells = Array.from(this.selectedCells);
        if (cells.length === 0) {
            console.log("DEBUG: No cells selected, cannot create floating layer");
            return;
        }
        
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
        this.selectedCells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const color = cell.dataset.color;
            
            // Store in floating layer (as relative positions)
            this.floatingLayer.content.push({
                relRow: row - minRow,
                relCol: col - minCol,
                color: color,
                isContent: color !== '#FFFFFF' // Flag to indicate if this is "real" content
            });
            
            // Record original cell for potential restoration
            this.floatingLayer.originalCells.push({
                row: row,
                col: col,
                color: color
            });
            
            // Clear original cell
            cell.style.backgroundColor = '#FFFFFF';
            cell.dataset.color = '#FFFFFF';
        });
        
        // IMPORTANT: REMOVED hasNonWhiteContent check - allow ANY selection
    
        // Clear the selection visuals since we'll now have floating content
        this.selectedCells.clear();
        document.querySelectorAll('.grid-cell.selected').forEach(cell => {
            cell.classList.remove('selected', 'selected-top', 'selected-right', 'selected-bottom', 'selected-left');
        });
        
        // Show the floating selection
        this.showFloatingLayer();
        console.log("DEBUG: Floating layer created and displayed");
        
        // Capture state after the change is complete
        app.history.captureState('Create floating selection');
    }
}

export default SelectionTool;
