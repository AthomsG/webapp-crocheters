// Helper functions for the application

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Function to validate grid size input
export function validateGridSize(size, min = 5, max = 50) {
    const numSize = parseInt(size);
    if (isNaN(numSize)) return min;
    return clamp(numSize, min, max);
}

/**
 * Enhanced function to export the grid as a JPEG image
 * @param {HTMLElement} gridContainer - The grid container element
 * @param {Object} options - Options for export
 * @param {number} options.resolution - Resolution multiplier (1, 2, or 4)
 * @param {boolean} options.includeGrid - Whether to include grid lines
 * @param {string} options.filename - Filename for the exported image
 */
export function exportGridAsImage(gridContainer, options = {}) {
    if (!gridContainer) {
        console.error('Grid container not found');
        return;
    }
    
    // Extract options with defaults
    const resolution = options.resolution || 1;
    const includeGrid = options.includeGrid || false;
    const filename = options.filename || `crochet-design-${new Date().toISOString().slice(0,10)}`;
    
    console.log(`Exporting image with resolution: ${resolution}x, grid lines: ${includeGrid}, filename: ${filename}`);
    
    // Get the grid dimensions
    const gridRect = gridContainer.getBoundingClientRect();
    const width = gridRect.width * resolution;
    const height = gridRect.height * resolution;
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Set background color
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate cell size
    const cellWidth = width / app.grid.cols;
    const cellHeight = height / app.grid.rows;
    
    // Draw each cell
    app.grid.cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const color = cell.dataset.color;
        
        ctx.fillStyle = color;
        ctx.fillRect(
            col * cellWidth,
            row * cellHeight,
            cellWidth,
            cellHeight
        );
    });
    
    // Draw grid lines if requested
    if (includeGrid) {
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = Math.max(1, resolution * 0.5);
        
        // Draw horizontal grid lines
        for (let row = 0; row <= app.grid.rows; row++) {
            ctx.beginPath();
            ctx.moveTo(0, row * cellHeight);
            ctx.lineTo(width, row * cellHeight);
            ctx.stroke();
        }
        
        // Draw vertical grid lines
        for (let col = 0; col <= app.grid.cols; col++) {
            ctx.beginPath();
            ctx.moveTo(col * cellWidth, 0);
            ctx.lineTo(col * cellWidth, height);
            ctx.stroke();
        }
    }
    
    // Convert to data URL and trigger download
    try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${filename}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`Image successfully saved as ${filename}.jpg`);
    } catch (e) {
        console.error('Error creating image:', e);
        alert('There was an error creating the image. Please try again.');
    }
}

/**
 * Save grid data as a downloadable JSON file
 * @param {Grid} grid - The grid object
 * @param {string} filename - Filename without extension
 */
export function saveGridFile(grid, filename = 'crochet-design') {
    if (!grid) {
        console.error('Grid not found');
        return;
    }
    
    console.log(`Saving grid file as ${filename}.json`);
    
    // Create grid data object with all necessary information
    const gridData = {
        version: "1.0",
        name: filename,
        createdAt: new Date().toISOString(),
        rows: grid.rows,
        cols: grid.cols,
        cells: Array.from(grid.cells).map(cell => ({
            row: parseInt(cell.dataset.row),
            col: parseInt(cell.dataset.col),
            color: cell.dataset.color
        })),
        palette: Array.from(document.querySelectorAll('.color-option:not(.add-color)'))
            .map(color => color.dataset.color)
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(gridData, null, 2);
    
    try {
        // Create a Blob containing the data
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create download link and force download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.json`;
        
        // Append to document, click, and clean up
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        console.log(`Grid file successfully saved as ${filename}.json`);
    } catch (e) {
        console.error('Error saving grid file:', e);
        alert('There was an error saving your design. Please try again.');
    }
}

// Import a grid file
export function importGridFile(file, app) {
    if (!file || !app) {
        console.error('Missing file or app for import');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const gridData = JSON.parse(e.target.result);
            
            // Validate grid data
            if (!gridData.rows || !gridData.cols || !gridData.cells || !Array.isArray(gridData.cells)) {
                throw new Error('Invalid grid file format');
            }
            
            // Resize grid to match imported grid
            app.grid.resize(gridData.rows, gridData.cols);
            app.rowsInput.value = gridData.rows;
            app.colsInput.value = gridData.cols;
            
            // Clear grid first
            app.clearGrid();
            
            // Apply cell colors
            gridData.cells.forEach(cellData => {
                const cell = app.grid.getCellAt(cellData.row, cellData.col);
                if (cell && cellData.color) {
                    cell.dataset.color = cellData.color;
                    cell.style.backgroundColor = cellData.color;
                }
            });
            
            // Import palette colors if available
            if (gridData.palette && Array.isArray(gridData.palette) && app.colorPalette) {
                // Clear existing palette except the add button
                const addButton = app.colorPaletteElement.querySelector('.add-color');
                app.colorPaletteElement.innerHTML = '';
                
                // Add imported colors
                gridData.palette.forEach(color => {
                    const colorOption = document.createElement('div');
                    colorOption.className = 'color-option';
                    colorOption.dataset.color = color;
                    colorOption.style.backgroundColor = color;
                    app.colorPaletteElement.appendChild(colorOption);
                });
                
                // Add the "+" button back
                app.colorPaletteElement.appendChild(addButton);
                
                // Reattach event listeners to the palette
                app.colorPalette.setupColorOptionListeners();
                
                // Set the first color as current
                if (gridData.palette.length > 0) {
                    app.setCurrentColor(gridData.palette[0]);
                }
            }
            
            // Capture the state for history
            app.history.captureState('Import grid file');
            
            alert('Grid file imported successfully!');
        } catch (error) {
            console.error('Error importing grid file:', error);
            alert('Failed to import grid file: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file');
        alert('Error reading file. Please try again.');
    };
    
    reader.readAsText(file);
}
