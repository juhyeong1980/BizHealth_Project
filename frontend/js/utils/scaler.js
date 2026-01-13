/**
 * Presentation Scaler
 * 1920x1080 Design -> Fit to Window Logic
 */

const PresentationScaler = (function () {
    const TARGET_W = 1920;
    const TARGET_H = 1080;
    const CONTAINER_ID = 'app-container';

    function init() {
        window.addEventListener('resize', applyScale);
        window.addEventListener('DOMContentLoaded', applyScale);
        // Initial call in case DOM is ready
        applyScale();
    }

    function applyScale() {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        // Force dimensions (Safety check)
        container.style.width = '1920px';
        container.style.height = '1080px';
        container.style.minWidth = '1920px';
        container.style.minHeight = '1080px';

        const windowW = window.innerWidth;
        const windowH = window.innerHeight;

        // Calculate scales
        const scaleW = windowW / TARGET_W;
        const scaleH = windowH / TARGET_H;

        // Choose the smaller scale to fit entirely within the screen (Letterboxing)
        const scale = Math.min(scaleW, scaleH);

        // Apply styles
        // We centre via flexbox on body, so we just need to scale
        container.style.transform = `scale(${scale})`;

        // Optional: If we want to ensure sharp text rendering in some browsers
        // container.style.backfaceVisibility = 'hidden'; 
    }

    return {
        init: init,
        applyScale: applyScale
    };
})();

// Auto-init
PresentationScaler.init();
