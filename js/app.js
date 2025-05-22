// Import utility functions for saving
import { exportGridAsImage, saveGridFile, importGridFile, validateGridSize } from './utils.js';

class App {
    constructor() {
        // DOM elements
        this.gridContainer = document.getElementById('grid-container');
        this.toolElements = document.querySelectorAll('.tool');
        this.colorPaletteElement = document.querySelector('.color-palette');
        this.rowsInput = document.getElementById('grid-rows');
        this.colsInput = document.getElementById('grid-cols');
        this.updateGridBtn = document.getElementById('update-grid');
        this.clearAllBtn = document.getElementById('clear-all-btn');
        this.saveBtn = document.getElementById('save-btn');
        this.importGridBtn = document.getElementById('import-grid');
        this.gridFileInput = document.getElementById('grid-file-input');
        
        // Save modal elements
        this.saveModal = document.getElementById('save-modal');
        this.closeModalBtn = document.querySelector('.close-modal');
        this.saveAsImageBtn = document.getElementById('save-as-image-btn');
        this.saveAsGridBtn = document.getElementById('save-as-grid-btn');
        this.imageResolution = document.getElementById('image-resolution');
        this.gridFilename = document.getElementById('grid-filename');
        this.includeGridLines = document.getElementById('include-grid-lines');
        
        // App state
        this.currentColor = '#000000'; // Changed from '#FF0000' to black as default
        this.clipboard = null;
        this.previousTool = null;
        this.mousePosition = { x: 0, y: 0, gridCell: null };
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
        
        // Add mouse position tracking
        document.addEventListener('mousemove', (e) => {
            this.mousePosition.x = e.clientX;
            this.mousePosition.y = e.clientY;
            
            // Find grid cell under cursor (if any)
            const cell = document.elementFromPoint(e.clientX, e.clientY);
            if (cell && cell.classList.contains('grid-cell')) {
                this.mousePosition.gridCell = cell;
            } else {
                this.mousePosition.gridCell = null;
            }
        });
        
        // Keyboard shortcuts - Make sure these work!
        document.addEventListener('keydown', (e) => {
            // Use metaKey for Mac and ctrlKey for Windows/Linux
            const ctrl = e.ctrlKey || e.metaKey;
            
            if (ctrl && e.key === 'z') {
                e.preventDefault();
                console.log("Ctrl+Z pressed - undoing");
                this.history.undo();
            } else if ((ctrl && e.key === 'y') || (ctrl && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                console.log("Ctrl+Y pressed - redoing");
                this.history.redo();
            } else if (ctrl && e.key === 'c') {
                if (this.tools.selection && this.tools.selection.operations && 
                    this.tools.selection.selectedCells.size > 0) {
                    e.preventDefault();
                    this.tools.selection.copySelection();
                }
            } else if (ctrl && e.key === 'x') {
                if (this.tools.selection && this.tools.selection.operations && 
                    this.tools.selection.selectedCells.size > 0) {
                    e.preventDefault();
                    this.tools.selection.cutSelection();
                }
            } else if (ctrl && e.key === 'v') {
                e.preventDefault();
                if (this.clipboard) {
                    this.pasteFromClipboard();
                }
            }
        });
        
        // Add a context menu handler for selection tool
        this.gridContainer.addEventListener('contextmenu', (e) => {
            // If the selection tool is active, handle context menu
            if (this.activeTool && this.activeTool.name === 'selection') {
                if (typeof this.activeTool.handleContextMenu === 'function') {
                    this.activeTool.handleContextMenu(e);
                }
            }
        });
        
        // Add click event for the Clear All action button
        if (this.clearAllBtn) {
            this.clearAllBtn.addEventListener('click', () => {
                // Show confirmation dialog
                if (confirm('Are you sure you want to clear the entire grid?')) {
                    this.clearGrid();
                }
            });
        }
        
        // Save button click - open modal
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                this.openSaveModal();
            });
        }
        
        // Save modal close button
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => {
                this.closeSaveModal();
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.saveModal) {
                this.closeSaveModal();
            }
        });
        
        // Save as image button
        if (this.saveAsImageBtn) {
            this.saveAsImageBtn.addEventListener('click', () => {
                const resolution = parseInt(this.imageResolution.value) || 1;
                const includeGrid = this.includeGridLines && this.includeGridLines.checked;
                const filename = this.gridFilename.value.trim() || 'crochet-design';
                
                exportGridAsImage(this.gridContainer, {
                    resolution: resolution,
                    includeGrid: includeGrid,
                    filename: filename
                });
                
                this.closeSaveModal();
            });
        }
        
        // Save as grid file button
        if (this.saveAsGridBtn) {
            this.saveAsGridBtn.addEventListener('click', () => {
                const filename = this.gridFilename.value.trim() || 'crochet-design';
                
                saveGridFile(this.grid, filename);
                this.closeSaveModal();
            });
        }
        
        // Import grid button
        if (this.importGridBtn && this.gridFileInput) {
            this.importGridBtn.addEventListener('click', () => {
                this.gridFileInput.click();
            });
            
            this.gridFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    importGridFile(e.target.files[0], this);
                    // Clear the input so the same file can be selected again if needed
                    e.target.value = '';
                }
            });
        }
        
        // Set default active tool
        this.setActiveTool('pencil');
        
        console.log("Event listeners set up");
    }
    
    setActiveTool(toolName) {
        console.log("Setting active tool to:", toolName);
        
        if (!this.tools || !this.tools[toolName]) {
            console.error("Tool not found:", toolName);
            return;
        }
        
        // Store previous tool
        if (this.activeTool) {
            this.previousTool = this.activeTool.name;
        }
        
        // Handle tool-specific cleanup before changing tools
        if (this.activeTool) {
            // Selection tool cleanup - ONLY for selection tool
            if (this.activeTool.name === 'selection') {
                // Commit floating selection when changing tools
                if (typeof this.activeTool.mergeFloatingLayer === 'function') {
                    this.activeTool.mergeFloatingLayer();
                }
            }
        }
        
        // Update the active tool
        this.activeTool = this.tools[toolName];
        console.log("Active tool updated to:", this.activeTool ? this.activeTool.name : "undefined");
        
        // Update the UI
        this.toolElements.forEach(toolElement => {
            if (toolElement.dataset.tool === toolName) {
                toolElement.classList.add('active');
            } else {
                toolElement.classList.remove('active');
            }
        });
    }
    
    // Updated paste function with better handling of repeated Cmd+V
    pasteFromClipboard() {
        if (!this.clipboard) return;
        
        console.log("Initiating paste operation");
        
        // Check if we're already in paste mode with the move tool
        const alreadyInPasteMode = 
            this.activeTool && 
            this.activeTool.name === 'move' && 
            this.tools.move && 
            this.tools.move.pastedData;
        
        if (alreadyInPasteMode) {
            // If already pasting, cancel the current paste operation first
            console.log("Already in paste mode, resetting before starting new paste");
            this.tools.move.cancelPastePreview();
            
            // Give a small delay to ensure cleanup completes
            setTimeout(() => {
                // Then restart with a fresh paste operation
                this.setActiveTool('move');
                if (this.mousePosition.gridCell) {
                    this.tools.move.startPastePreview(this.mousePosition.gridCell);
                }
            }, 50);
        } else {
            // Normal paste flow when not already in paste mode
            this.setActiveTool('move');
            
            // If we have a cell under the cursor, immediately start the paste preview
            if (this.mousePosition.gridCell) {
                // Use setTimeout to ensure the tool switch has fully processed
                setTimeout(() => {
                    this.tools.move.startPastePreview(this.mousePosition.gridCell);
                }, 0);
            }
        }
    }
    
    // Add back the updateSelectionUI method (simplified since we removed the buttons)
    updateSelectionUI() {
        // This method used to update button states, but since we removed the buttons,
        // we'll keep it as an empty method for compatibility
        // If keyboard shortcuts need to be disabled based on selection state,
        // that logic can be added here in the future
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
        console.log("Clearing grid");
        
        // If we have an active selection or floating layer, commit/clear it first
        if (this.tools.selection && this.tools.selection.floatingLayer.active) {
            this.tools.selection.clearSelection();
        }
        
        // Track if any changes were made
        let madeChanges = false;
        
        // Clear all cells
        this.grid.cells.forEach(cell => {
            if (cell.dataset.color !== '#FFFFFF') {
                madeChanges = true;
                cell.style.backgroundColor = '#FFFFFF';
                cell.dataset.color = '#FFFFFF';
            }
        });
        
        // Only capture state if changes were made
        if (madeChanges) {
            this.history.captureState("Clear all");
        }
        
        // Switch to pencil tool
        this.setActiveTool('pencil');
        
        console.log("Grid cleared");
    }
    
    // Open save modal with improved defaults
    openSaveModal() {
        if (this.saveModal) {
            const dateStr = new Date().toISOString().slice(0, 10);
            this.gridFilename.value = `crochet-design-${dateStr}`;
            
            // Set default for grid lines checkbox
            if (this.includeGridLines) {
                this.includeGridLines.checked = false; // Default to no grid lines
            }
            
            // Add active class FIRST then set display property
            this.saveModal.classList.add('active');
            this.saveModal.style.display = 'block';
        }
    }
    
    // Close save modal
    closeSaveModal() {
        if (this.saveModal) {
            this.saveModal.classList.remove('active');
            this.saveModal.style.display = 'none';
        }
    }
}

export default App;
