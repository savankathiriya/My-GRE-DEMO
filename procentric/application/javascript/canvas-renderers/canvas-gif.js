/**
 * ====================================================================
 * CANVAS GIF ELEMENT RENDERER (FIXED FOR ANIMATION)
 * Handles animated GIF elements using HTML overlay method
 * ====================================================================
 */

var CanvasGif = (function() {
    'use strict';

    /**
     * Render GIF element (automatically uses HTML overlay for animation)
     */
    function render(ctx, el, canvas) {
        if (!el.src) {
            console.warn('[CanvasGif] GIF element missing src:', el.name || el.id);
            return;
        }
        
        console.log('[CanvasGif] Rendering animated GIF:', el.name || el.id);
        
        // Get canvas element if not provided
        if (!canvas) {
            canvas = document.getElementById('templateCanvas');
        }
        
        if (!canvas) {
            console.error('[CanvasGif] Canvas element not found');
            return;
        }
        
        // Use HTML overlay method for proper GIF animation
        renderAnimated(ctx, el, canvas);
    }

    /**
     * Render animated GIF using HTML img element overlay
     * This method creates an actual <img> element for proper GIF animation
     */
    function renderAnimated(ctx, el, canvas) {
        if (!el.src) {
            console.warn('[CanvasGif] GIF element missing src:', el.name || el.id);
            return;
        }
        
        console.log('[CanvasGif] Creating animated GIF overlay:', el.name || el.id);
        
        // Get canvas scaling factor
        var canvasRect = canvas.getBoundingClientRect();
        var scaleX = canvasRect.width / canvas.width;
        var scaleY = canvasRect.height / canvas.height;
        
        // Create img element overlay for GIF animation
        var gifOverlay = document.createElement('img');
        gifOverlay.src = el.src;
        gifOverlay.className = 'gif-overlay-element';
        gifOverlay.setAttribute('data-element-id', el.id || el.name);
        
        // Positioning and sizing
        gifOverlay.style.position = 'absolute';
        gifOverlay.style.left = (el.x * scaleX) + 'px';
        gifOverlay.style.top = (el.y * scaleY) + 'px';
        gifOverlay.style.width = (el.width * scaleX) + 'px';
        gifOverlay.style.height = (el.height * scaleY) + 'px';
        
        // Opacity
        gifOverlay.style.opacity = (typeof el.opacity !== 'undefined' ? el.opacity : 1);
        
        // Prevent interaction
        gifOverlay.style.pointerEvents = 'none';
        
        // Z-index
        gifOverlay.style.zIndex = el.zIndex || 'auto';
        
        // Object fit (similar to canvas drawImageWithFit)
        gifOverlay.style.objectFit = el.objectFit || 'contain';
        
        // Border radius
        if (el.borderRadius) {
            gifOverlay.style.borderRadius = el.borderRadius + 'px';
        }
        
        // Rotation
        if (el.rotation) {
            gifOverlay.style.transform = 'rotate(' + el.rotation + 'deg)';
            gifOverlay.style.transformOrigin = 'center center';
        }
        
        // Add to DOM
        var container = canvas.parentElement;
        if (container) {
            container.style.position = 'relative';
            container.appendChild(gifOverlay);
            
            console.log('[CanvasGif] ✅ Animated GIF overlay created:', el.name || el.id);
        } else {
            console.error('[CanvasGif] No parent container found for canvas');
        }
    }

    /**
     * Clean up all GIF overlays (call this before re-rendering)
     */
    function cleanup() {
        var overlays = document.querySelectorAll('.gif-overlay-element');
        for (var i = 0; i < overlays.length; i++) {
            overlays[i].parentNode.removeChild(overlays[i]);
        }
        console.log('[CanvasGif] Cleaned up', overlays.length, 'GIF overlays');
    }

    // Public API
    return {
        render: render,
        renderAnimated: renderAnimated,
        cleanup: cleanup
    };
})();