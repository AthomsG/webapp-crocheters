// Import modules
import Grid from './grid.js';
import History from './history.js';
import ColorPalette from './colorPalette.js';
import * as Utils from './utils.js';
import App from './app.js';

// Import tool classes
import Tool from './tools/Tool.js';
import PencilTool from './tools/PencilTool.js';
import EraserTool from './tools/EraserTool.js';
import FillTool from './tools/FillTool.js';
import ColorPickerTool from './tools/ColorPickerTool.js';
import SelectionTool from './tools/SelectionTool.js';
import MoveTool from './tools/MoveTool.js';

// Create a global app object first, before any DOM content loading
window.app = new App();

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Crochet Designer App...');
    
    // Enable debug mode for better logging
    window.debugMode = true;
    
    // Make utility functions globally available
    window.validateGridSize = Utils.validateGridSize;
    window.exportGridAsImage = Utils.exportGridAsImage;
    window.saveGridFile = Utils.saveGridFile;
    window.importGridFile = Utils.importGridFile;
    
    // 1. History
    window.app.history = new History();
    
    // 2. Grid
    window.app.grid = new Grid(window.app.gridContainer);
    
    // 3. Tools
    window.app.tools = {
        pencil: new PencilTool(),
        eraser: new EraserTool(),
        fill: new FillTool(),
        picker: new ColorPickerTool(),
        selection: new SelectionTool(),
        move: new MoveTool()
    };
    
    // 4. Color palette
    window.app.colorPalette = new ColorPalette(window.app.colorPaletteElement);
    
    // Make the selection operations available globally
    window.app.selectionOps = window.app.tools.selection.operations;
    
    // Initialize event listeners
    window.app.setupEventListeners();
    
    // Set default active tool EXPLICITLY to pencil
    window.app.activeTool = window.app.tools.pencil;
    
    // Also update UI to reflect this
    const pencilElement = document.querySelector('.tool[data-tool="pencil"]');
    if (pencilElement) {
        pencilElement.classList.add('active');
    }
    
    console.log('App initialized successfully');
    console.log('Active tool:', window.app.activeTool ? window.app.activeTool.name : 'none');
});

// Save colors before leaving the page
window.addEventListener('beforeunload', () => {
    if (window.app && window.app.colorPalette) {
        window.app.colorPalette.saveColors();
    }
});
