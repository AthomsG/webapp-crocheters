class ColorPalette {
    constructor(container) {
        this.container = container;
        this.colors = Array.from(container.querySelectorAll('.color-option'));
        this.colorPickerContainer = document.getElementById('color-picker-container');
        this.colorPickerInput = document.getElementById('color-picker');
        this.colorHexInput = document.getElementById('color-hex');
        this.colorPickerApplyBtn = document.getElementById('color-picker-apply');
        this.colorPickerCancelBtn = document.getElementById('color-picker-cancel');
        
        // No essential colors - all colors can be removed
        this.essentialColors = [];
        
        // Load saved colors from localStorage
        this.loadSavedColors();
        
        // Add a debug flag
        this.debug = true;
        
        this.init();
    }
    
    init() {
        // Set up event listeners for existing color options
        this.setupColorOptionListeners();
        
        // Set up color picker event listeners
        if (this.colorPickerInput) {
            this.colorPickerInput.addEventListener('input', () => {
                const color = this.colorPickerInput.value;
                this.colorHexInput.value = color;
            });
            
            this.colorHexInput.addEventListener('input', () => {
                const color = this.colorHexInput.value;
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    this.colorPickerInput.value = color;
                }
            });
            
            this.colorPickerApplyBtn.addEventListener('click', () => {
                this.addColorToPalette(this.colorPickerInput.value);
                this.closeColorPicker();
            });
            
            this.colorPickerCancelBtn.addEventListener('click', () => {
                this.closeColorPicker();
            });
        }
    }
    
    setupColorOptionListeners() {
        const appCurrentColor = window.app ? window.app.currentColor : '#FF0000';
        
        // Remove existing listeners to avoid duplicates
        const newColors = Array.from(this.container.querySelectorAll('.color-option'));
        
        // Extract references from container to avoid DOM lookup issues
        const colorPickerContainer = this.colorPickerContainer;
        const self = this;
        
        newColors.forEach(color => {
            // Remove existing listeners
            const newColor = color.cloneNode(true);
            if (color.parentNode) {
                color.parentNode.replaceChild(newColor, color);
            }
            
            // Add new listeners
            if (newColor.classList.contains('add-color')) {
                newColor.addEventListener('click', () => {
                    self.openColorPicker();
                });
            } else {
                // Simpler approach for color selection - use a direct handler
                newColor.addEventListener('click', (e) => {
                    // Check if it's a remove click (top right corner)
                    const rect = newColor.getBoundingClientRect();
                    if (e.clientX > rect.right - 15 && e.clientY < rect.top + 15) {
                        // This is a click on the X (remove) area
                        self.removeColorFromPalette(newColor, (newColor.dataset.color === window.app.currentColor));
                        e.stopPropagation();
                    } else {
                        // Regular color selection
                        const colorValue = newColor.dataset.color;
                        self.log('Direct color selection:', colorValue);
                        
                        // First update the app's current color directly
                        if (window.app) {
                            window.app.currentColor = colorValue;
                        }
                        
                        // Then update visuals
                        self.container.querySelectorAll('.color-option').forEach(c => {
                            c.classList.remove('selected');
                        });
                        newColor.classList.add('selected');
                    }
                });
            }
        });
        
        // Update the colors array
        this.colors = newColors;
        
        // Apply the visual selection
        this.markSelectedColor(appCurrentColor);
        
        // Prevent right-click menu on palette
        this.container.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('color-option')) {
                e.preventDefault();
            }
        });
    }
    
    // New method: ONLY updates the visual selection marks, doesn't change app.currentColor
    markSelectedColor(colorHex) {
        this.log('markSelectedColor called with:', colorHex);
        
        // First remove all selections
        this.container.querySelectorAll('.color-option').forEach(c => {
            c.classList.remove('selected');
        });
        
        // Then find and mark the target color
        const colorElement = this.container.querySelector(`.color-option[data-color="${colorHex}"]:not(.add-color)`);
        if (colorElement) {
            colorElement.classList.add('selected');
            this.log('Selected element visually marked:', colorElement.dataset.color);
        } else {
            this.log('WARNING: Could not find color element for:', colorHex);
        }
    }
    
    openColorPicker() {
        this.colorPickerContainer.classList.add('active');
        this.colorPickerInput.value = app.currentColor || '#000000';
        this.colorHexInput.value = app.currentColor || '#000000';
    }
    
    closeColorPicker() {
        this.colorPickerContainer.classList.remove('active');
    }
    
    selectColor(color) {
        this.log('selectColor called with color:', color);
        
        // Directly update the app's current color
        if (window.app) {
            window.app.currentColor = color;
        }
        
        // Update the visual selection
        this.markSelectedColor(color);
    }
    
    addColorToPalette(colorHex) {
        // Validate color format
        if (!/^#[0-9A-F]{6}$/i.test(colorHex)) {
            alert('Please enter a valid hex color code (e.g., #FF0000)');
            return;
        }
        
        // Check if color already exists
        if (this.colorExists(colorHex)) {
            this.selectColor(colorHex);
            return;
        }
        
        // Create new color element
        const newColor = document.createElement('div');
        newColor.className = 'color-option';
        newColor.dataset.color = colorHex;
        newColor.style.backgroundColor = colorHex;
        
        // Insert before the "+" button
        const addButton = this.container.querySelector('.add-color');
        this.container.insertBefore(newColor, addButton);
        
        // Update listeners and select the new color
        this.setupColorOptionListeners();
        this.selectColor(colorHex);
        
        // Save the updated palette
        this.saveColors();
    }
    
    removeColorFromPalette(colorElement, isRemovingCurrentColor) {
        const color = colorElement.dataset.color;
        this.log('removeColorFromPalette called for:', color);
        
        // Make sure we always have at least one color in the palette
        const totalColors = this.container.querySelectorAll('.color-option:not(.add-color)').length;
        if (totalColors <= 1) {
            alert("You need at least one color in your palette!");
            return;
        }
        
        // Store current app color BEFORE any changes
        const currentAppColor = window.app.currentColor;
        this.log('Current app color before removal:', currentAppColor);
        
        // Check if the removed color is the currently selected color - use the parameter
        // that was determined BEFORE any DOM changes
        const isSelectedColor = isRemovingCurrentColor;
        this.log('Is this the selected color? (from parameter)', isSelectedColor);
        
        // DEBUG: Track which color was selected visually
        const visuallySelected = colorElement.classList.contains('selected');
        this.log('Is this visually selected?', visuallySelected);
        
        // Save reference to app.currentColor value BEFORE removal
        const originalAppColor = window.app.currentColor;
        
        // Remove the element
        colorElement.remove();
        
        // DEBUG: Check color right after removal
        this.log('App color immediately after removal:', window.app.currentColor);
        
        // Re-attach event listeners
        this.setupColorOptionListeners();
        
        // DEBUG: Check color after setupColorOptionListeners
        this.log('App color after setupColorOptionListeners:', window.app.currentColor, 
                 'Original app color was:', originalAppColor);
        
        // Handle color selection behavior after removal
        if (isSelectedColor) {
            // If we removed the selected color, choose a new one
            const firstColor = this.container.querySelector('.color-option:not(.add-color)');
            if (firstColor) {
                this.log('Removed was selected, selecting new color:', firstColor.dataset.color);
                // FIX: Store a copy of the current color to avoid reference issues
                const newColor = firstColor.dataset.color;
                this.selectColor(newColor);
            }
        } else {
            // Otherwise keep the current selection
            this.log('Removed color was NOT selected, keeping current color:', originalAppColor);
            
            // Force app.currentColor back to its original value
            if (window.app) {
                window.app.currentColor = originalAppColor;
            }
            
            // Force update the visual selection to match
            setTimeout(() => {
                this.markSelectedColor(originalAppColor);
            }, 10);
        }
        
        // Save the updated palette
        this.saveColors();
        
        // Final check
        this.log('Final app color after everything:', window.app.currentColor);
        
        // Return false to prevent further event handling
        return false;
    }
    
    colorExists(colorHex) {
        const allColorElements = this.container.querySelectorAll('.color-option:not(.add-color)');
        return Array.from(allColorElements).some(element => 
            element.dataset.color.toLowerCase() === colorHex.toLowerCase()
        );
    }
    
    saveColors() {
        // Save the current palette to localStorage
        const paletteColors = Array.from(this.container.querySelectorAll('.color-option'))
            .filter(color => !color.classList.contains('add-color'))
            .map(color => color.dataset.color);
        
        localStorage.setItem('savedColorPalette', JSON.stringify(paletteColors));
    }
    
    loadSavedColors() {
        try {
            // Get saved colors
            const savedColors = JSON.parse(localStorage.getItem('savedColorPalette'));
            
            // If we have saved colors, rebuild the palette
            if (savedColors && Array.isArray(savedColors) && savedColors.length > 0) {
                // Keep only the add button
                const addButton = this.container.querySelector('.add-color');
                this.container.innerHTML = '';
                
                // Add colors from the saved list
                savedColors.forEach(color => {
                    const colorOption = document.createElement('div');
                    colorOption.className = 'color-option';
                    colorOption.dataset.color = color;
                    colorOption.style.backgroundColor = color;
                    
                    // Correctly mark the current color as selected
                    if (app && color === app.currentColor) {
                        colorOption.classList.add('selected');
                    }
                    
                    this.container.appendChild(colorOption);
                });
                
                // Add the "+" button back
                this.container.appendChild(addButton);
            } else {
                // Ensure we have some default colors if no saved ones exist or saved list is empty
                this.ensureDefaultColors();
            }
        } catch(e) {
            console.error('Error loading saved colors:', e);
            // If there's an error, ensure we have default colors
            this.ensureDefaultColors();
        }
    }
    
    // New method to ensure we have some default colors
    ensureDefaultColors() {
        const defaultColors = ['#FF0000', '#0000FF', '#FFFF00', '#000000'];
        const existingColors = Array.from(this.container.querySelectorAll('.color-option:not(.add-color)')).map(
            color => color.dataset.color
        );
        
        if (existingColors.length === 0) {
            // If we have no colors, add the default ones
            defaultColors.forEach(color => this.addColorToPalette(color));
        }
    }
    
    // Helper debug method
    log(message, ...data) {
        if (this.debug) {
            console.log(`[ColorPalette] ${message}`, ...data);
        }
    }
}

export default ColorPalette;