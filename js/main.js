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

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Crochet Designer App...');
    
    // Enable debug mode
    window.debugMode = false; // Set to true when debugging
    
    // Make utility functions globally available
    window.validateGridSize = Utils.validateGridSize;
    window.exportGridAsImage = Utils.exportGridAsImage;
    window.saveGridData = Utils.saveGridData;
    
    // Create the app instance first
    window.app = new App();
    
    // Add methods from App.prototype to app instance
    Object.getOwnPropertyNames(App.prototype).forEach(name => {
        if (name !== 'constructor') {
            window.app[name] = App.prototype[name].bind(window.app);
        }
    });
    
    // Now initialize components in order
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
    
    // Set default active tool
    window.app.activeTool = window.app.tools.pencil;
    window.app.setupEventListeners();
    window.app.setActiveTool('pencil');
    
    console.log('App initialized successfully');
});

// Save colors before leaving the page
window.addEventListener('beforeunload', () => {
    if (window.app && window.app.colorPalette) {
        window.app.colorPalette.saveColors();
    }
});
