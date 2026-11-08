use wasm_bindgen::prelude::*;

/// Calculate optimal render scale based on device pixel ratio and viewport size
/// Returns a ratio between 0.5 and 1.0 to balance quality vs performance
#[wasm_bindgen]
pub fn ratio_for(dpr: f64, width: u32, height: u32, max_pixels: u32) -> f64 {
    let budget = (max_pixels as f64).sqrt() / ((width as f64) * (height as f64).sqrt());
    let ratio = dpr.min(budget);
    ratio.max(0.5).min(1.0)
}

/// Get a warm charcoal color from RGB components
#[wasm_bindgen]
pub fn warm_charcoal(red: u8, green: u8, blue: u8) -> String {
    format!("#{:02x}{:02x}{:02x}", red, green, blue)
}

/// Generate a deterministic constellation pattern for skill nodes
/// Returns positions as a space-separated string: "x1,y1 x2,y2 x3,y3 ..."
/// The format is compatible with Canvas 2D for drawing constellation lines
#[wasm_bindgen]
pub fn generate_constellation(node_count: u32, radius: f32, center_x: f32, center_y: f32) -> JsValue {
    let mut points = Vec::new();
    
    for i in 0..node_count {
        let angle = (2.0 * std::f32::consts::PI * i as f32 / node_count as f32);
        let r = radius * (0.8 + 0.2 * (i as f32 / node_count as f32).sin());
        let x = center_x + r * angle.cos();
        let y = center_y + r * angle.sin();
        points.push(format!("{},{}", x, y));
    }
    
    JsValue::from(points.join(" "))
}
