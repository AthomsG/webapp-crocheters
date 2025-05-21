class ColorPalette {
    constructor(container) {
        this.container = container;
        this.colors = Array.from(container.querySelectorAll('.color-option'));
        this.colorWheelContainer = document.getElementById('color-wheel-container');
        this.colorWheelInput = document.getElementById('color-wheel');
        this.colorHexInput = document.getElementById('color-hex');
        this.colorWheelApplyBtn = document.getElementById('color-wheel-apply');
        this.colorWheelCancelBtn = document.getElementById('color-wheel-cancel');
        this.init();
    }
    
    init() {
        this.colors.forEach(color => {
            color.addEventListener('click', () => {
                if (color.classList.contains('color-wheel')) {
                    this.openColorWheel();
                } else {
                    this.selectColor(color.dataset.color);
                }
            });
        });
        
        // Color wheel event listeners
        if (this.colorWheelInput) {
            this.colorWheelInput.addEventListener('input', () => {
                const color = this.colorWheelInput.value;
                this.colorHexInput.value = color;
            });
            
            this.colorHexInput.addEventListener('input', () => {
                const color = this.colorHexInput.value;
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    this.colorWheelInput.value = color;
                }
            });
            
            this.colorWheelApplyBtn.addEventListener('click', () => {
                this.selectColor(this.colorWheelInput.value);
                this.closeColorWheel();
            });
            
            this.colorWheelCancelBtn.addEventListener('click', () => {
                this.closeColorWheel();
            });
        }
    }
    
    openColorWheel() {
        this.colorWheelInput.value = app.currentColor;
        this.colorHexInput.value = app.currentColor;
        this.colorWheelContainer.classList.add('active');
    }
    
    closeColorWheel() {
        this.colorWheelContainer.classList.remove('active');
    }
    
    selectColor(color) {
        // Remove selected class from all colors
        this.colors.forEach(c => c.classList.remove('selected'));
        
        // Add selected class to the chosen color if it exists in the palette
        const selectedColor = this.colors.find(c => c.dataset.color === color);
        if (selectedColor) {
            selectedColor.classList.add('selected');
        } else {
            // If the color is custom and not in the palette, select the color wheel
            const colorWheel = this.colors.find(c => c.classList.contains('color-wheel'));
            if (colorWheel) {
                colorWheel.classList.add('selected');
            }
        }
        
        // Update the app's current color
        app.setCurrentColor(color);
    }
}
