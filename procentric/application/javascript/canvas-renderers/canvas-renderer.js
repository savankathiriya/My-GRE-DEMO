/**
 * ====================================================================
 * CANVAS RENDERER - PROPER FIX FOR LG PRO:CENTRIC TV
 * Issue: TV picture mode was causing overscan - solution is proper scaling
 * NO artificial padding - let CanvasScaler handle everything correctly
 * ====================================================================
 */

var CanvasRenderer = (function() {
    'use strict';

    var currentCanvas = null;
    var ctx = null;
    var templateData = null;
    var scaleX = 1;
    var scaleY = 1;
    var clockElements = [];
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
        var originalTemplateData;
        try {
            originalTemplateData = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
        } catch (e) {
            console.error('[CanvasRenderer] Error accessing template data:', e);
            return;
        }

        if (!originalTemplateData || !originalTemplateData.canvas || !originalTemplateData.elements) {
            console.error('[CanvasRenderer] Invalid template_json structure');
            return;
        }

        // 🔥 PROPER FIX: Use exact window dimensions, let CanvasScaler handle everything
        var screenW = window.innerWidth;
        var screenH = window.innerHeight;
        var designW = originalTemplateData.canvas.width  || 1920;
        var designH = originalTemplateData.canvas.height || 1080;

        console.log('[CanvasRenderer] Screen:', screenW + 'x' + screenH);
        console.log('[CanvasRenderer] Design:', designW + 'x' + designH);

        // Initialize CanvasScaler with EXACT screen dimensions
        if (typeof CanvasScaler !== 'undefined') {
            CanvasScaler.initialize(screenW, screenH, designW, designH, 'fit');
            
            // Scale the entire template data
            templateData = CanvasScaler.scaleTemplateData(originalTemplateData);
            
            var scaleInfo = CanvasScaler.getScaleInfo();
            console.log('[CanvasRenderer] ✅ CanvasScaler - Scale:', scaleInfo.scaleX.toFixed(4), 'x', scaleInfo.scaleY.toFixed(4));
        } else {
            // Fallback to old method if CanvasScaler not loaded
            console.warn('[CanvasRenderer] ⚠️ CanvasScaler not found, using legacy scaling');
            templateData = originalTemplateData;
            
            scaleX = screenW / designW;
            scaleY = screenH / designH;
            console.log('[CanvasRenderer] Legacy Scale:', scaleX.toFixed(3), 'x', scaleY.toFixed(3));
        }

        var canvasConfig = templateData.canvas;
        var elements = templateData.elements;

        console.log('[CanvasRenderer] Template loaded - Elements:', elements.length);

        // Set canvas to EXACT screen size
        canvas.width  = screenW;
        canvas.height = screenH;
        canvas.style.width  = screenW + 'px';
        canvas.style.height = screenH + 'px';
        canvas.style.position = 'fixed';
        canvas.style.top = '0px';
        canvas.style.left = '0px';
        canvas.style.margin = '0';
        canvas.style.padding = '0';

        // Reset transform - NO OFFSET, NO EXTRA TRANSLATION
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Only apply ctx.scale if CanvasScaler wasn't used
        if (typeof CanvasScaler === 'undefined') {
            ctx.scale(scaleX, scaleY);
        }

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
            renderBackgroundThenElements(ctx, canvasConfig, canvasConfig.width, canvasConfig.height, sortedElements, canvas);
        } else {
            // Background is a color or video placeholder - render immediately
            CanvasBackground.render(ctx, canvasConfig, canvasConfig.width, canvasConfig.height);
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
            console.log('[CanvasRenderer] ✅ Background image loaded, rendering...');
            
            // Draw background image
            ctx.save();
            ctx.globalAlpha = opacity;
            CanvasBase.drawImageWithFit(ctx, bgImg, 0, 0, width, height, fit);
            ctx.restore();
            
            console.log('[CanvasRenderer] ✅ Background rendered, now rendering elements...');
            
            // NOW render all elements on top of the background
            renderAllElements(ctx, sortedElements, canvas);
        };
        
        bgImg.onerror = function() {
            console.warn('[CanvasRenderer] ❌ Background image failed to load, rendering elements anyway');
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
        
        console.log('[CanvasRenderer] ✅ All elements rendered');

        // 🔥 APPLY ANIMATIONS AFTER ALL ELEMENTS ARE RENDERED
        setTimeout(function() {
            if (typeof CanvasAnimation !== 'undefined') {
                console.log('[CanvasRenderer] Applying animations to elements');
                CanvasAnimation.applyAllAnimations(sortedElements, canvas);
            }
        }, 100);
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
            
            // NEW ELEMENTS
            case 'label':
                CanvasLabel.render(ctx, el);
                break;
                
            case 'rss':
                CanvasRss.render(ctx, el, canvas);
                break;
                
            case 'ticker':
                CanvasTicker.render(ctx, el, canvas);
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
     * 🔥 UPDATE ONLY CLOCK ELEMENTS (SELECTIVE RENDERING)
     */
    function updateClocks() {
        if (!ctx || !currentCanvas || clockElements.length === 0) {
            return;
        }

        // Save the current canvas state
        ctx.save();
        
        // Re-apply scaling if using legacy mode
        if (typeof CanvasScaler === 'undefined') {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(scaleX, scaleY);
        } else {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

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
     * 🔥 OPTIMIZED ANIMATION LOOP - ONLY UPDATES CLOCKS
     */
    function startAnimationLoop() {
        console.log('[CanvasRenderer] 🎬 Starting animation loop (clocks only)...');
        
        // Stop any existing animation
        if (animationFrameId) {
            clearInterval(animationFrameId);
        }

        // Update only clocks every second
        animationFrameId = setInterval(function() {
            updateClocks();
        }, 1000);

        console.log('[CanvasRenderer] ✅ Animation loop started');
    }

    /**
     * Stop animation loop
     */
    function stopAnimationLoop() {
        if (animationFrameId) {
            clearInterval(animationFrameId);
            animationFrameId = null;
            console.log('[CanvasRenderer] ⏹️ Animation loop stopped');
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
        if (typeof CanvasAction !== 'undefined' && CanvasAction.cleanup) {
            CanvasAction.cleanup();
        }
        if (typeof CanvasRss !== 'undefined' && CanvasRss.cleanup) {
            CanvasRss.cleanup();
        }
        if (typeof CanvasTicker !== 'undefined' && CanvasTicker.cleanup) {
            CanvasTicker.cleanup();
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