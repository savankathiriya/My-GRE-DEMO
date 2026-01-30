/**
 * ====================================================================
 * CANVAS BACKGROUND RENDERER
 * Handles main canvas background (color/image/video)
 * ====================================================================
 */

var CanvasBackground = (function() {
    'use strict';

    /**
     * Render main canvas background
     */
    function render(ctx, config, width, height) {
        console.log('[CanvasBackground] Rendering canvas background');
        
        ctx.save();
        
        var bgType = config.backgroundType || 'color';
        var opacity = typeof config.backgroundOpacity !== 'undefined' ? config.backgroundOpacity : 1;
        
        // Default background
        ctx.fillStyle = config.background || '#000000';
        ctx.fillRect(0, 0, width, height);
        
        if (bgType === 'color' && config.background) {
            ctx.fillStyle = config.background;
            ctx.globalAlpha = opacity;
            ctx.fillRect(0, 0, width, height);
            console.log('[CanvasBackground] Background: Color', config.background);
        } 
        else if (bgType === 'image' && config.backgroundImage) {
            var imageUrl = Array.isArray(config.backgroundImage) 
                ? config.backgroundImage[0] 
                : config.backgroundImage;
            
            if (imageUrl) {
                loadAndDrawBackground(ctx, imageUrl, width, height, opacity, config.backgroundFit || 'cover');
            }
        }
        else if (bgType === 'video' && config.backgroundVideo) {
            // Video placeholder
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, width, height);
            console.log('[CanvasBackground] Background: Video placeholder');
        }
        
        ctx.restore();
    }

    /**
     * Load and draw background image
     */
    function loadAndDrawBackground(ctx, imageUrl, width, height, opacity, fit) {
        CanvasBase.loadImage(
            imageUrl,
            function(img) {
                ctx.save();
                ctx.globalAlpha = opacity;
                CanvasBase.drawImageWithFit(ctx, img, 0, 0, width, height, fit);
                ctx.restore();
                console.log('[CanvasBackground] ✅ Background image loaded');
            },
            function() {
                console.warn('[CanvasBackground] ❌ Background image failed to load');
            }
        );
    }

    // Public API
    return {
        render: render
    };
})();