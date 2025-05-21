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
        this.currentColor = '#000000'; // Default to black
        this.clipboard = null;
        this.history = new History();
        
        this.tools = {
            pencil: new PencilTool(),
            eraser: new EraserTool(),
            fill: new FillTool(),
            picker: new ColorPickerTool(),
            selection: new SelectionTool(),
            move: new MoveTool()
        };
        this.activeTool = this.tools.pencil;
        
        // Track previous tool for better UX when switching back after operations
        this.previousTool = null;
        
        // Initialize components
        this.grid = new Grid(this.gridContainer);
        this.colorPalette = new ColorPalette(this.colorPaletteElement);
        
        // Add mouse tracking for paste preview
        this.mousePosition = { x: 0, y: 0, gridCell: null };
        
        // Set up event listeners
        this.setupEventListeners();
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
    }
    
    setActiveTool(toolName) {
        if (!this.tools[toolName]) return;
        
        // Store previous tool (but not if it's the move tool)
        if (this.activeTool && this.activeTool.name !== 'move') {
            this.previousTool = this.activeTool.name;
        }
        
        // If we're switching from move tool with an active paste preview, cancel it
        if (this.activeTool.name === 'move' && this.activeTool.pastedData) {
            this.activeTool.cancelPastePreview();
        }
        
        // If we're switching from selection tool, cancel any ongoing operations
        if (this.activeTool.name === 'selection' && this.activeTool.cancelOperation) {
            this.activeTool.cancelOperation();
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
        this.currentColor = color;
        this.colorPalette.selectColor(color);
        
        // If we have a selection tool active and cells selected, update the buttons
        if (this.activeTool.name === 'selection') {
            this.updateSelectionUI();
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

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
