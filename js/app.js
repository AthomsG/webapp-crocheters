class App {
    constructor() {
        // DOM elements
        this.gridContainer = document.getElementById('grid-container');
        this.toolElements = document.querySelectorAll('.tool');
        this.colorPaletteElement = document.querySelector('.color-palette');
        this.rowsInput = document.getElementById('grid-rows');
        this.colsInput = document.getElementById('grid-cols');
        this.updateGridBtn = document.getElementById('update-grid');
        this.applySelectionBtn = document.getElementById('apply-selection');
        this.clearSelectionBtn = document.getElementById('clear-selection');
        this.undoBtn = document.getElementById('undo-btn');
        this.redoBtn = document.getElementById('redo-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.cutBtn = document.getElementById('cut-btn');
        this.pasteBtn = document.getElementById('paste-btn');
        
        // App state
        this.currentColor = '#FF0000'; // Default to red instead of white
        this.clipboard = null;
        this.previousTool = null;
        this.mousePosition = { x: 0, y: 0, gridCell: null };
        
        // NOTE: We no longer initialize components here
        // They will be initialized in main.js
    }
    
    setupEventListeners() {
        // Tool selection
        this.toolElements.forEach(toolElement => {
            toolElement.addEventListener('click', () => {
                this.setActiveTool(toolElement.dataset.tool);
            });
        });
        
        // Grid size update
        this.updateGridBtn.addEventListener('click', () => {
            const rows = validateGridSize(this.rowsInput.value);
            const cols = validateGridSize(this.colsInput.value);
            this.grid.resize(rows, cols);
            this.rowsInput.value = rows;
            this.colsInput.value = cols;
        });
        
        // Apply selection
        if (this.applySelectionBtn) {
            this.applySelectionBtn.addEventListener('click', () => {
                if (this.activeTool.name === 'selection') {
                    this.activeTool.applyColor();
                    this.updateSelectionUI();
                }
            });
        }
        
        // Clear selection
        if (this.clearSelectionBtn) {
            this.clearSelectionBtn.addEventListener('click', () => {
                if (this.activeTool.name === 'selection') {
                    this.activeTool.clearSelection();
                    this.updateSelectionUI();
                }
            });
        }
        
        // Undo/Redo buttons
        if (this.undoBtn) {
            this.undoBtn.addEventListener('click', () => this.history.undo());
        }
        
        if (this.redoBtn) {
            this.redoBtn.addEventListener('click', () => this.history.redo());
        }
        
        // Copy/Cut/Paste buttons
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => {
                if (this.tools.selection.selectedCells.size > 0) {
                    this.tools.selection.copySelection();
                }
            });
        }
        
        if (this.cutBtn) {
            this.cutBtn.addEventListener('click', () => {
                if (this.tools.selection.selectedCells.size > 0) {
                    this.tools.selection.cutSelection();
                }
            });
        }
        
        if (this.pasteBtn) {
            this.pasteBtn.addEventListener('click', () => {
                this.pasteFromClipboard(true); // true means immediate preview
            });
        }
        
        // Add mouse position tracking
        document.addEventListener('mousemove', (e) => {
            this.mousePosition.x = e.clientX;
            this.mousePosition.y = e.clientY;
            
            // Find grid cell under cursor (if any)
            const cell = document.elementFromPoint(e.clientX, e.clientY);
            if (cell && cell.classList.contains('grid-cell')) {
                this.mousePosition.gridCell = cell;
                
                // Update paste preview if active
                if (this.activeTool.name === 'move' && this.activeTool.pastedData) {
                    this.activeTool.showPastePreview(cell);
                }
            } else {
                this.mousePosition.gridCell = null;
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Use metaKey for Mac and ctrlKey for Windows/Linux
            const ctrl = e.ctrlKey || e.metaKey;
            
            if (ctrl && e.key === 'z') {
                e.preventDefault();
                this.history.undo();
            } else if ((ctrl && e.key === 'y') || (ctrl && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                this.history.redo();
            } else if (ctrl && e.key === 'c') {
                if (this.tools.selection.selectedCells.size > 0) {
                    e.preventDefault();
                    this.tools.selection.copySelection();
                }
            } else if (ctrl && e.key === 'x') {
                if (this.tools.selection.selectedCells.size > 0) {
                    e.preventDefault();
                    this.tools.selection.cutSelection();
                }
            } else if (ctrl && e.key === 'v') {
                e.preventDefault();
                this.pasteFromClipboard(true); // true means immediate preview
            } else if (e.key === 'Escape') {
                // Cancel paste preview
                if (this.activeTool.name === 'move' && this.activeTool.pastedData) {
                    this.activeTool.cancelPastePreview();
                    this.setActiveTool(this.previousTool || 'pencil');
                }
            }
        });
        
        // Set default active tool
        this.setActiveTool('pencil');
        
        console.log("Event listeners set up");
    }
    
    setActiveTool(toolName) {
        if (!this.tools[toolName]) return;
        
        // Store previous tool (but not if it's the move tool)
        if (this.activeTool && this.activeTool.name !== 'move') {
            this.previousTool = this.activeTool.name;
        }
        
        // Handle tool-specific cleanup before changing tools
        if (this.activeTool) {
            // Move tool cleanup
            if (this.activeTool.name === 'move' && 
                this.activeTool.pastedData && 
                typeof this.activeTool.cancelPastePreview === 'function') {
                this.activeTool.cancelPastePreview();
            }
            
            // Selection tool cleanup - ONLY for selection tool
            if (this.activeTool.name === 'selection') {
                // Commit floating selection when changing tools
                if (typeof this.activeTool.mergeFloatingLayer === 'function') {
                    this.activeTool.mergeFloatingLayer();
                }
                
                // Cancel any ongoing selection operations
                if (typeof this.activeTool.cancelOperation === 'function') {
                    this.activeTool.cancelOperation();
                }
            }
        }
        
        // Update the active tool
        this.activeTool = this.tools[toolName];
        
        // Update the UI
        this.toolElements.forEach(toolElement => {
            if (toolElement.dataset.tool === toolName) {
                toolElement.classList.add('active');
            } else {
                toolElement.classList.remove('active');
            }
        });
        
        // Show/hide selection buttons
        this.updateSelectionUI();
    }
    
    // Enhanced paste function with immediate preview
    pasteFromClipboard(immediatePreview = false) {
        if (!this.clipboard) return;
        
        // Switch to move tool
        this.setActiveTool('move');
        
        // If immediate preview requested and we have a cell under the cursor
        if (immediatePreview && this.mousePosition.gridCell) {
            // Start paste preview immediately under the cursor
            this.activeTool.startPastePreview(this.mousePosition.gridCell);
        }
        
        // The move tool will now show the preview as the mouse moves
    }
    
    updateSelectionUI() {
        if (this.applySelectionBtn && this.clearSelectionBtn) {
            const isSelectionTool = this.activeTool.name === 'selection';
            const hasSelectedCells = isSelectionTool && this.activeTool.selectedCells.size > 0;
            
            this.applySelectionBtn.classList.toggle('active', hasSelectedCells);
            this.clearSelectionBtn.classList.toggle('active', hasSelectedCells);
        }
        
        if (this.copyBtn && this.cutBtn) {
            const hasSelectedCells = this.tools.selection.selectedCells.size > 0;
            this.copyBtn.disabled = !hasSelectedCells;
            this.cutBtn.disabled = !hasSelectedCells;
        }
        
        if (this.pasteBtn) {
            this.pasteBtn.disabled = !this.clipboard;
        }
    }
    
    setCurrentColor(color) {
        this.log('Setting current color to:', color);
        this.currentColor = color;
        
        // Update the color palette visual selection if available
        if (this.colorPalette && typeof this.colorPalette.markSelectedColor === 'function') {
            this.colorPalette.markSelectedColor(color);
        }
    }
    
    // Add a logging function to help with debugging
    log(message, ...data) {
        if (window.debugMode) {
            console.log(`[App] ${message}`, ...data);
        }
    }
    
    clearGrid() {
        // Store current state for undo
        const cellStates = [];
        this.grid.cells.forEach(cell => {
            if (cell.dataset.color !== '#FFFFFF') {
                cellStates.push({
                    row: parseInt(cell.dataset.row),
                    col: parseInt(cell.dataset.col),
                    color: cell.dataset.color
                });
            }
        });
        
        if (cellStates.length > 0) {
            // Record this action for undo
            this.history.addAction({
                type: 'clearGrid',
                cellStates: cellStates
            });
        }
        
        // Clear all cells
        this.grid.cells.forEach(cell => {
            cell.style.backgroundColor = '#FFFFFF';
            cell.dataset.color = '#FFFFFF';
        });
    }
}

export default App;
