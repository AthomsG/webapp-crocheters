class Grid {
    constructor(container, rows = 20, cols = 20) {
        this.container = container;
        this.rows = rows;
        this.cols = cols;
        this.cells = [];
        this.isDrawing = false;
        this.init();
    }
    
    init() {
        this.container.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        this.container.innerHTML = '';
        this.cells = [];
        
        for (let i = 0; i < this.rows * this.cols; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = Math.floor(i / this.cols);
            cell.dataset.col = i % this.cols;
            cell.dataset.color = '#FFFFFF';
            cell.style.backgroundColor = '#FFFFFF';
            
            cell.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            cell.addEventListener('mouseover', (e) => this.handleMouseOver(e));
            cell.addEventListener('click', (e) => this.handleClick(e));
            
            // Add mousemove listener specifically for paste preview updates
            cell.addEventListener('mousemove', (e) => {
                if (app.activeTool && app.activeTool.name === 'move' && app.activeTool.pastedData) {
                    app.activeTool.showPastePreview(cell);
                }
            });
            
            // Prevent default context menu on grid cells
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
            
            this.container.appendChild(cell);
            this.cells.push(cell);
        }
        
        // Prevent drag selection
        this.container.addEventListener('mousedown', (e) => e.preventDefault());
        
        // Prevent context menu on the entire grid
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // Add global mouseup event to handle drawing outside the grid
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }
    
    handleMouseDown(event) {
        this.isDrawing = true;
        const cell = event.target;
        
        // Check if activeTool exists before calling methods
        if (app && app.activeTool && typeof app.activeTool.handleCellClick === 'function') {
            app.activeTool.handleCellClick(cell);
        } else {
            console.error("Missing activeTool in handleMouseDown", 
                          app ? (app.activeTool ? "Has tool" : "No tool") : "No app");
        }
    }
    
    handleMouseOver(event) {
        if (this.isDrawing) {
            const cell = event.target;
            if (app && app.activeTool && typeof app.activeTool.handleCellDrag === 'function') {
                app.activeTool.handleCellDrag(cell);
            }
        }
    }
    
    handleClick(event) {
        // For tools that need a simple click (especially paste)
        if (app && app.activeTool && app.activeTool.name === 'move' && app.clipboard) {
            const cell = event.target;
            if (cell.classList.contains('grid-cell')) {
                app.activeTool.handleCellClick(cell);
            }
        }
        
        // Prevent event bubbling that might cause issues
        event.stopPropagation();
    }
    
    // Update the handleMouseUp method to ensure proper method calling
    handleMouseUp(event) {
        if (this.isDrawing) {
            this.isDrawing = false;
            
            // If we have a tool with a mouseUp handler, call it
            if (app.activeTool && typeof app.activeTool.handleMouseUp === 'function') {
                try {
                    let cell = null;
                    
                    // Try to find the target cell
                    if (event.target && event.target.classList && 
                        event.target.classList.contains('grid-cell')) {
                        cell = event.target;
                    } else if (document.querySelector('.grid-cell.move-preview')) {
                        cell = document.querySelector('.grid-cell.move-preview');
                    }
                    
                    // Explicitly call with the correct 'this' context
                    app.activeTool.handleMouseUp.call(app.activeTool, cell);
                } catch (error) {
                    console.error("Error in mouseUp handler:", error);
                    console.error(error.stack); // Add stack trace for better debugging
                }
            }
        }
    }
    
    resize(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.init();
        
        // Clear history when grid is resized
        if (app.history) {
            app.history.clear();
        }
    }
    
    getCellAt(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return null;
        }
        return this.container.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }
    
    getNeighbors(cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        return [
            this.getCellAt(row - 1, col), // top
            this.getCellAt(row, col + 1), // right
            this.getCellAt(row + 1, col), // bottom
            this.getCellAt(row, col - 1)  // left
        ].filter(cell => cell !== null);
    }
}

export default Grid;
