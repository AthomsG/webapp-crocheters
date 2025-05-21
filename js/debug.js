// Simple debugging helper for troubleshooting module loading and grid issues
(function() {
    console.log('Debug script loaded');
    
    // Check if DOM is fully loaded
    console.log('DOM ready state:', document.readyState);
    
    // Function to inspect the DOM structure
    function inspectGridContainer() {
        const gridContainer = document.getElementById('grid-container');
        console.log('Grid container element:', gridContainer);
        
        if (gridContainer) {
            console.log('Grid container children:', gridContainer.children.length);
            console.log('Grid style:', gridContainer.style.cssText);
            console.log('Grid computed style gridTemplateColumns:', 
                window.getComputedStyle(gridContainer).gridTemplateColumns);
        }
    }
    
    // Check global objects
    function checkGlobals() {
        console.log('app object exists:', typeof window.app !== 'undefined');
        if (window.app) {
            console.log('app properties:', Object.keys(window.app));
            console.log('app.grid exists:', typeof window.app.grid !== 'undefined');
            console.log('app.tools exists:', typeof window.app.tools !== 'undefined');
        }
        
        console.log('Grid class exists:', typeof window.Grid !== 'undefined');
        console.log('History class exists:', typeof window.History !== 'undefined');
    }
    
    // Run diagnostics when DOM is ready
    function runDiagnostics() {
        console.log('----------- DIAGNOSTICS -----------');
        inspectGridContainer();
        checkGlobals();
        console.log('---------------------------------');
    }
    
    // Run immediately if DOM is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        runDiagnostics();
    } else {
        // Otherwise wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', runDiagnostics);
    }
    
    // Run again after a delay to catch post-initialization issues
    setTimeout(runDiagnostics, 1000);
})();
