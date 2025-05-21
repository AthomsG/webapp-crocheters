// Helper functions for the application

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Function to validate grid size input
function validateGridSize(size, min = 5, max = 50) {
    const numSize = parseInt(size);
    if (isNaN(numSize)) return min;
    return clamp(numSize, min, max);
}

// Function to export the current grid as an image
function exportGridAsImage(gridContainer) {
    // This is a placeholder for future implementation
    // Would use html2canvas or a similar library
    console.log("Export functionality will be implemented in the future");
    alert("Export functionality will be implemented in the future");
}

// Function to save grid data (for future backend integration)
function saveGridData(grid, name) {
    // This is a placeholder for future implementation with backend
    const gridData = {
        name: name || "Untitled Design",
        rows: grid.rows,
        cols: grid.cols,
        cells: Array.from(grid.container.querySelectorAll('.grid-cell')).map(cell => ({
            row: parseInt(cell.dataset.row),
            col: parseInt(cell.dataset.col),
            color: cell.dataset.color
        })),
        timestamp: new Date().toISOString()
    };
    
    console.log("Grid data prepared for saving:", gridData);
    localStorage.setItem('tempSavedGrid', JSON.stringify(gridData));
    alert("Design temporarily saved to local storage. Backend integration coming soon!");
    
    return gridData;
}
