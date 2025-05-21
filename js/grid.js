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
            
            this.container.appendChild(cell);
            this.cells.push(cell);
        }
        
        // Prevent drag selection
        this.container.addEventListener('mousedown', (e) => e.preventDefault());
        
        // Add global mouseup event to handle drawing outside the grid
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }
    
    handleMouseDown(event) {
        this.isDrawing = true;
        const cell = event.target;
        app.activeTool.handleCellClick(cell);
    }
    
    handleMouseOver(event) {
        if (this.isDrawing) {
            const cell = event.target;
            app.activeTool.handleCellDrag(cell);
        }
    }
    
    handleClick(event) {
        // For tools that need a simple click (especially paste)
        if (app.activeTool.name === 'move' && app.clipboard) {
            const cell = event.target;
            if (cell.classList.contains('grid-cell')) {
                app.activeTool.handleCellClick(cell);
            }
        }
        
        // Prevent event bubbling that might cause issues
        event.stopPropagation();
    }
    
    handleMouseUp(event) {
        if (this.isDrawing) {
            this.isDrawing = false;
            
            // If we have a tool with a mouseUp handler, call it
            if (app.activeTool.handleMouseUp) {
                try {
                    let cell = null;
                    
                    // Try to find the target cell
                    if (event.target && event.target.classList && 
                        event.target.classList.contains('grid-cell')) {
                        cell = event.target;
                    } else if (document.querySelector('.grid-cell.move-preview')) {
                        // If we're dropping outside the grid but have a preview, use the last preview cell
                        cell = document.querySelector('.grid-cell.move-preview');
                    }
                    
                    app.activeTool.handleMouseUp(cell);
                } catch (error) {
                    console.error("Error in mouseUp handler:", error);
                    // Reset to safe state on error
                    if (app.activeTool.name === 'move' && app.activeTool.resetTool) {
                        app.activeTool.resetTool();
                    }
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
