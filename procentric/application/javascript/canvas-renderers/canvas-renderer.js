/**
 * ====================================================================
 * CANVAS RENDERER - OPTIMIZED FOR SELECTIVE CLOCK UPDATES
 * Only re-renders clock elements, not the entire canvas
 * ====================================================================
 */

var CanvasRenderer = (function() {
    'use strict';

    var currentCanvas = null;
    var ctx = null;
    var templateData = null;
    var scaleX = 1;
    var scaleY = 1;
    var clockElements = []; // Store only clock elements
    var animationFrameId = null;

    /**
     * Main render function - orchestrates all rendering
     */
    function render() {
        console.log('[CanvasRenderer] ===== Starting Canvas Render =====');
        
        var canvas = document.getElementById('templateCanvas');
        if (!canvas) {
            console.error('[CanvasRenderer] Canvas element #templateCanvas not found');
            return;
        }

        currentCanvas = canvas;
        ctx = canvas.getContext('2d');
        
        if (!ctx) {
            console.error('[CanvasRenderer] Cannot get 2D context');
            return;
        }

        // Clean up any existing GIF overlays and slideshows from previous renders
        if (typeof CanvasGif !== 'undefined' && CanvasGif.cleanup) {
            CanvasGif.cleanup();
        }
        if (typeof CanvasSlideshow !== 'undefined' && CanvasSlideshow.cleanup) {
            CanvasSlideshow.cleanup();
        }

        // Get template data
        try {
            templateData = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
        } catch (e) {
            console.error('[CanvasRenderer] Error accessing template data:', e);
            return;
        }

        if (!templateData || !templateData.canvas || !templateData.elements) {
            console.error('[CanvasRenderer] Invalid template_json structure');
            return;
        }

        var canvasConfig = templateData.canvas;
        var elements = templateData.elements;

        console.log('[CanvasRenderer] Template loaded - Elements:', elements.length);

        // Setup canvas dimensions & scaling
        var screenW = window.innerWidth;
        var screenH = window.innerHeight;
        var designW = canvasConfig.width  || 1920;
        var designH = canvasConfig.height || 1080;
        
        scaleX = screenW / designW;
        scaleY = screenH / designH;

        console.log('[CanvasRenderer] Screen:', screenW + 'x' + screenH, 'Design:', designW + 'x' + designH);
        console.log('[CanvasRenderer] Scale:', scaleX.toFixed(3), 'x', scaleY.toFixed(3));

        canvas.width  = screenW;
        canvas.height = screenH;
        canvas.style.width  = '100%';
        canvas.style.height = '100%';

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(scaleX, scaleY);

        // Sort elements by zIndex for proper layering
        var sortedElements = elements.slice().sort(function(a, b) {
            var zA = typeof a.zIndex !== 'undefined' ? a.zIndex : 0;
            var zB = typeof b.zIndex !== 'undefined' ? b.zIndex : 0;
            return zA - zB;
        });

        // Extract clock elements for selective updates
        clockElements = sortedElements.filter(function(el) {
            if (el.visible === false) return false;
            var elType = el.type ? el.type.toLowerCase() : '';
            return elType === 'clock' || elType === 'timer' || elType === 'countdown';
        });

        console.log('[CanvasRenderer] Found', clockElements.length, 'clock elements for live updates');

        // Check if background is an image
        var bgType = canvasConfig.backgroundType || 'color';
        
        if (bgType === 'image' && canvasConfig.backgroundImage) {
            // Background is an image - render it first, THEN render elements
            renderBackgroundThenElements(ctx, canvasConfig, designW, designH, sortedElements, canvas);
        } else {
            // Background is a color or video placeholder - render immediately
            CanvasBackground.render(ctx, canvasConfig, designW, designH);
            // Then render all elements immediately
            renderAllElements(ctx, sortedElements, canvas);
        }

        console.log('[CanvasRenderer] ===== Canvas Render Complete =====');
    }

    /**
     * Render background image first, then all elements on top
     */
    function renderBackgroundThenElements(ctx, canvasConfig, width, height, sortedElements, canvas) {
        console.log('[CanvasRenderer] Rendering background image first...');
        
        // Draw solid background color first (fallback)
        if (canvasConfig.background && canvasConfig.background !== 'transparent') {
            ctx.fillStyle = canvasConfig.background;
            ctx.fillRect(0, 0, width, height);
        }
        
        // Get background image URL
        var imageUrl = Array.isArray(canvasConfig.backgroundImage) 
            ? canvasConfig.backgroundImage[0] 
            : canvasConfig.backgroundImage;
        
        if (!imageUrl) {
            console.warn('[CanvasRenderer] No background image URL found');
            renderAllElements(ctx, sortedElements, canvas);
            return;
        }
        
        var opacity = typeof canvasConfig.backgroundOpacity !== 'undefined' ? canvasConfig.backgroundOpacity : 1;
        var fit = canvasConfig.backgroundFit || 'cover';
        
        // Load background image
        var bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        
        bgImg.onload = function() {
            console.log('[CanvasRenderer] Ã¢Å“â€¦ Background image loaded, rendering...');
            
            // Draw background image
            ctx.save();
            ctx.globalAlpha = opacity;
            CanvasBase.drawImageWithFit(ctx, bgImg, 0, 0, width, height, fit);
            ctx.restore();
            
            console.log('[CanvasRenderer] Ã¢Å“â€¦ Background rendered, now rendering elements...');
            
            // NOW render all elements on top of the background
            renderAllElements(ctx, sortedElements, canvas);
        };
        
        bgImg.onerror = function() {
            console.warn('[CanvasRenderer] Ã¢Å¡Â Ã¯Â¸Â Background image failed to load, rendering elements anyway');
            // Still render elements even if background fails
            renderAllElements(ctx, sortedElements, canvas);
        };
        
        bgImg.src = imageUrl;
    }

    /**
     * Render all elements in order
     */
    function renderAllElements(ctx, sortedElements, canvas) {
        console.log('[CanvasRenderer] Rendering', sortedElements.length, 'elements...');
        
        for (var i = 0; i < sortedElements.length; i++) {
            var el = sortedElements[i];
            
            if (el.visible === false) {
                continue;
            }

            console.log('[CanvasRenderer] Rendering element', (i + 1), '/', sortedElements.length, '-', el.type, '-', el.name || el.id);

            try {
                renderElement(ctx, el, canvas);
            } catch (elementError) {
                console.error('[CanvasRenderer] Error rendering element:', el.name || el.id, elementError);
            }
        }
        
        console.log('[CanvasRenderer] Ã¢Å“â€¦ All elements rendered');
    }

    /**
     * Render a single element
     */
    function renderElement(ctx, el, canvas) {
        var elType = el.type ? el.type.toLowerCase() : '';
        
        switch (elType) {
            case 'text':
                CanvasText.render(ctx, el);
                break;
                
            case 'weather':
                CanvasWeather.render(ctx, el);
                break;
                
            case 'clock':
            case 'timer':
            case 'countdown':
                CanvasClock.render(ctx, el);
                break;
                
            case 'image':
                CanvasImage.render(ctx, el);
                break;
                
            case 'gif':
                CanvasGif.render(ctx, el, canvas);
                break;
                
            case 'video':
                CanvasVideo.render(ctx, el);
                break;
                
            case 'slideshow':
                CanvasSlideshow.render(ctx, el);
                break;
                
            case 'action':
            case 'button':
            case 'card':
                CanvasAction.render(ctx, el);
                break;
            
            // Geometric shapes
            case 'arrow':
            case 'diamond':
            case 'triangle':
            case 'line':
            case 'circle':
            case 'rectangle':
            case 'pentagon':
            case 'hexagon':
            case 'star':
                CanvasShapes.render(ctx, el);
                break;
                
            default:
                console.warn('[CanvasRenderer] Unknown element type:', el.type);
                renderGenericElement(ctx, el);
        }
    }

    /**
     * Render unknown/generic element type
     */
    function renderGenericElement(ctx, el) {
        console.log('[CanvasRenderer] Rendering generic element:', el.type);
        
        ctx.save();
        
        // Apply basic transformations
        CanvasBase.applyTransformations(ctx, el);
        
        // Draw background
        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
            ctx.fillStyle = el.backgroundColor;
            ctx.fillRect(0, 0, el.width, el.height);
        }
        
        // Draw border
        if (el.borderWidth && el.borderColor) {
            ctx.strokeStyle = el.borderColor;
            ctx.lineWidth = el.borderWidth;
            ctx.strokeRect(0, 0, el.width, el.height);
        }
        
        // Draw placeholder text
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Unknown: ' + el.type, el.width / 2, el.height / 2);
        
        ctx.restore();
    }

    /**
     * Ã°Å¸â€Â¥ UPDATE ONLY CLOCK ELEMENTS (SELECTIVE RENDERING)
     * This is much more efficient than re-rendering the entire canvas
     */
    function updateClocks() {
        if (!ctx || !currentCanvas || clockElements.length === 0) {
            return;
        }

        console.log('[CanvasRenderer] Ã¢ÂÂ±Ã¯Â¸Â Updating', clockElements.length, 'clock elements only...');

        // Save the current canvas state
        ctx.save();
        
        // Re-apply scaling
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        ctx.scale(scaleX, scaleY);

        // Update each clock element
        for (var i = 0; i < clockElements.length; i++) {
            var el = clockElements[i];
            
            // Clear only the clock area (with some padding for smooth edges)
            var padding = 5;
            var clearX = (el.x || 0) - padding;
            var clearY = (el.y || 0) - padding;
            var clearW = el.width + (padding * 2);
            var clearH = el.height + (padding * 2);
            
            ctx.clearRect(clearX, clearY, clearW, clearH);
            
            // Re-render just this clock element
            CanvasClock.render(ctx, el);
        }

        ctx.restore();
        
        console.log('[CanvasRenderer] Ã¢Å“â€¦ Clock elements updated at', new Date().toLocaleTimeString());
    }

    /**
     * Clear canvas and re-render
     */
    function refresh() {
        var canvas = document.getElementById('templateCanvas');
        if (canvas) {
            var ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        render();
    }

    /**
     * Ã°Å¸â€Â¥ OPTIMIZED ANIMATION LOOP - ONLY UPDATES CLOCKS
     * Does NOT re-render the entire canvas
     */
    function startAnimationLoop() {
        console.log('[CanvasRenderer] Ã°Å¸â€â€ž Starting OPTIMIZED animation loop (clocks only)...');
        
        // Stop any existing animation
        if (animationFrameId) {
            clearInterval(animationFrameId);
        }

        // Update only clocks every second
        animationFrameId = setInterval(function() {
            updateClocks(); // Only updates clock elements, not entire canvas
        }, 1000);

        console.log('[CanvasRenderer] Ã¢Å“â€¦ Optimized animation loop started - updating clocks only (not entire canvas)');
    }

    /**
     * Stop animation loop
     */
    function stopAnimationLoop() {
        if (animationFrameId) {
            clearInterval(animationFrameId);
            animationFrameId = null;
            console.log('[CanvasRenderer] Ã¢ÂÂ¹Ã¯Â¸Â Animation loop stopped');
        }
    }

    /**
     * Cleanup - remove GIF overlays and stop slideshows
     */
    function cleanup() {
        stopAnimationLoop();
        
        if (typeof CanvasGif !== 'undefined' && CanvasGif.cleanup) {
            CanvasGif.cleanup();
        }
        if (typeof CanvasSlideshow !== 'undefined' && CanvasSlideshow.cleanup) {
            CanvasSlideshow.cleanup();
        }
    }

    // Public API
    return {
        render: render,
        refresh: refresh,
        updateClocks: updateClocks,
        startAnimationLoop: startAnimationLoop,
        stopAnimationLoop: stopAnimationLoop,
        cleanup: cleanup
    };
})();

// Expose globally for backward compatibility
window.renderTemplateCanvas = CanvasRenderer.render;