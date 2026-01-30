/**
 * ====================================================================
 * CANVAS IMAGE ELEMENT RENDERER
 * Handles static image elements
 * ====================================================================
 */

var CanvasImage = (function() {
    'use strict';

    /**
     * Render IMAGE element
     */
    function render(ctx, el) {
        if (!el.src) {
            console.warn('[CanvasImage] Image element missing src:', el.name || el.id);
            return;
        }
        
        console.log('[CanvasImage] Rendering:', el.name || el.id);
        
        ctx.save();
        
        // Apply transformations
        CanvasBase.applyTransformations(ctx, el);
        
        // Draw background if specified
        if (el.hasBackgroundColor && el.backgroundColor && el.backgroundColor !== 'transparent') {
            var padding = el.backgroundPadding || 0;
            var bgRadius = el.backgroundRadius || 0;
            
            ctx.fillStyle = el.backgroundColor;
            
            if (bgRadius > 0) {
                CanvasBase.roundRect(ctx, -padding, -padding, el.width + padding * 2, el.height + padding * 2, bgRadius);
                ctx.fill();
            } else {
                ctx.fillRect(-padding, -padding, el.width + padding * 2, el.height + padding * 2);
            }
        }
        
        ctx.restore();
        
        // Load and draw image asynchronously
        var elementData = {
            x: el.x || 0,
            y: el.y || 0,
            width: el.width,
            height: el.height,
            rotation: el.rotation || 0,
            opacity: typeof el.opacity !== 'undefined' ? el.opacity : 1,
            borderRadius: el.borderRadius || 0,
            objectFit: el.objectFit || 'contain',
            name: el.name || el.id
        };
        
        CanvasBase.loadImage(
            el.src,
            function(img) {
                try {
                    ctx.save();
                    ctx.translate(elementData.x, elementData.y);
                    
                    if (elementData.rotation) {
                        ctx.translate(elementData.width / 2, elementData.height / 2);
                        ctx.rotate(elementData.rotation * Math.PI / 180);
                        ctx.translate(-elementData.width / 2, -elementData.height / 2);
                    }
                    
                    ctx.globalAlpha = elementData.opacity;
                    
                    if (elementData.borderRadius > 0) {
                        CanvasBase.roundRect(ctx, 0, 0, elementData.width, elementData.height, elementData.borderRadius);
                        ctx.clip();
                    }
                    
                    CanvasBase.drawImageWithFit(ctx, img, 0, 0, elementData.width, elementData.height, elementData.objectFit);
                    
                    ctx.restore();
                    console.log('[CanvasImage] ✅ Image loaded:', elementData.name);
                } catch (e) {
                    console.warn('[CanvasImage] Failed to draw image:', e);
                }
            },
            function() {
                console.warn('[CanvasImage] ❌ Image load failed:', elementData.name);
            }
        );
    }

    // Public API
    return {
        render: render
    };
})();