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

export default Tool;
