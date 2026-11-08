// WASM module usage demo
// This demonstrates using Rust-compiled WASM for performance calculations

// The importmap in dist/index.html maps "portfolio-wasm" to the WASM URL
// But we'll also support direct import for environments without importmaps

async function initWasm() {
    let ratioFor, warmCharcoal, generateConstellation;
    
    try {
        // Try importmap first (Astro/ modern approach)
        const wasm = await import('/wasm/portfolio_wasm.wasm', { assert: { type: 'wasm' } });
        ratioFor = wasm.ratio_for;
        warmCharcoal = wasm.warm_charcoal;
        generateConstellation = wasm.generate_constellation;
        console.log('WASM loaded via import assertion');
    } catch (e) {
        console.warn('Import assertion failed, trying dynamic import', e);
        // Fallback: direct WebAssembly.instantiate
        const response = await fetch('/wasm/portfolio_wasm.wasm');
        const bytes = await response.arrayBuffer();
        const importObject = { env: {} };
        const module = await WebAssembly.instantiate(bytes, importObject);
        ratioFor = module.instance.exports.ratio_for;
        warmCharcoal = module.instance.exports.warm_charcoal;
        generateConstellation = module.instance.exports.generate_constellation;
        console.log('WASM loaded via WebAssembly.instantiate');
    }
    
    // Example: Calculate optimal render ratio
    const ratio = ratioFor(window.devicePixelRatio || 1, 1152, 720, 829440);
    console.log('Optimal render ratio:', ratio);
    
    // Example: Generate warm charcoal color
    const color = warmCharcoal(10, 9, 8);
    console.log('Warm charcoal color:', color);
    
    // Example: Generate constellation points for skills graph
    const points = generateConstellation(12, 100, 600, 360);
    console.log('Constellation points:', points);
    
    // Apply to skills graph if canvas exists
    const graphCanvas = document.getElementById('skillGraph');
    if (graphCtx && points) {
        // Could use points to redraw constellation
        console.log('Would apply constellation points to skills graph');
    }
    
    return { ratio, color, points };
}

// Initialize on module load
if (typeof window !== 'undefined' && !window.__wasmInitialized) {
    window.__wasmInitialized = true;
    initWasm().catch(e => console.error('WASM init failed', e));
}

export { initWasm, ratioFor, warmCharcoal, generateConstellation };
