// Import the WASM module
// importmap already has "portfolio-wasm" mapped to the WASM URL
// But we need to set up the import properly

// The importmap in BaseLayout.astro maps "portfolio-wasm" to the WASM URL
// We'll use dynamic import to load the module

async function loadWasmModule() {
    const { ratio_for, warm_charcoal, generate_constellation } = 
        await import('/wasm/portfolio_wasm.wasm');
    
    // Example usage
    console.log('WASM loaded successfully');
    
    // Test ratio_for (device pixel ratio, width, height, max pixels)
    const ratio = ratio_for(window.devicePixelRatio || 1, 1152, 720, 829440);
    console.log('Optimal render ratio:', ratio);
    
    // Test warm_charcoal
    const color = warm_charcoal(10, 9, 8); // warm charcoal
    console.log('Warm charcoal color:', color);
    
    // Test generate_constellation
    const constellation = generate_constellation(12, 100, 600, 360);
    console.log('Constellation points:', constellation);
    
    return { ratio, color, constellation };
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.loadWasmModule = loadWasmModule;
}

export { loadWasmModule, ratio_for, warm_charcoal, generate_constellation };
