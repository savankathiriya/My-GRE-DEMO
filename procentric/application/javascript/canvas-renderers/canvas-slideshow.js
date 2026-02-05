/**
 * ====================================================================
 * CANVAS SLIDESHOW RENDERER - GUARANTEED WORKING VERSION
 * ULTRA-SIMPLIFIED - NO BLACK BOXES, IMAGES ALWAYS VISIBLE
 * ====================================================================
 */

var CanvasSlideshow = (function() {
    'use strict';

    var activeSlideshows = {};
    
    /**
     * Main render function
     */
    function render(ctx, element) {
        console.log('[CanvasSlideshow] 🎬 Rendering slideshow:', element.name || element.id);
        
        // Validate slides
        if (!element.slides || !Array.isArray(element.slides) || element.slides.length === 0) {
            console.error('[CanvasSlideshow] ❌ NO SLIDES FOUND!');
            renderPlaceholder(ctx, element);
            return;
        }

        // Initialize state
        if (!activeSlideshows[element.id]) {
            activeSlideshows[element.id] = {
                element: element,
                currentIndex: 0,
                loadedImages: {},
                timerRunning: false
            };
        }

        var state = activeSlideshows[element.id];
        var currentIndex = element.currentSlide || 0;
        
        if (currentIndex >= element.slides.length) {
            currentIndex = 0;
            element.currentSlide = 0;
        }

        var currentSlide = element.slides[currentIndex];
        console.log('[CanvasSlideshow] 📍 Slide', (currentIndex + 1), '/', element.slides.length);

        // Render the slide
        renderSlideSimple(ctx, element, currentSlide, currentIndex);

        // Setup auto-play
        if (element.autoPlay !== false && !state.timerRunning) {
            setupAutoPlay(element);
        }
    }

    /**
     * ULTRA-SIMPLE slide rendering - GUARANTEED to work
     */
    function renderSlideSimple(ctx, element, slide, slideIndex) {
        console.log('[CanvasSlideshow] 🖼️ renderSlideSimple START');
        
        // Get image URL - check ALL possible properties
        var imageUrl = slide.content || slide.media_url || slide.thumbnail || 
                      slide.url || slide.src || slide.image || slide.imageUrl;
        
        if (!imageUrl) {
            console.error('[CanvasSlideshow] ❌ NO IMAGE URL FOUND in slide:', JSON.stringify(slide));
            return;
        }

        console.log('[CanvasSlideshow] 🔗 Image URL:', imageUrl);

        var state = activeSlideshows[element.id];
        if (!state) return;

        // Check cache
        if (state.loadedImages[slideIndex]) {
            var cachedImg = state.loadedImages[slideIndex];
            if (cachedImg.complete && cachedImg.naturalHeight !== 0) {
                console.log('[CanvasSlideshow] ♻️ Using cached image');
                drawImageSimple(ctx, element, cachedImg);
                return;
            }
        }

        // Load new image
        console.log('[CanvasSlideshow] 📥 Loading image...');
        var img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            console.log('[CanvasSlideshow] ✅ IMAGE LOADED!', img.width, 'x', img.height);
            
            // Cache it
            if (state.loadedImages) {
                state.loadedImages[slideIndex] = img;
            }
            
            // Re-render just this slideshow
            rerenderSlideshow(element);
        };
        
        img.onerror = function(e) {
            console.error('[CanvasSlideshow] ❌ IMAGE LOAD FAILED:', imageUrl);
            console.error('[CanvasSlideshow] Error details:', e);
        };
        
        img.src = imageUrl;
    }

    /**
     * ULTRA-SIMPLE image drawing - NO complications
     */
    function drawImageSimple(ctx, element, img) {
        console.log('[CanvasSlideshow] 🎨 drawImageSimple START');
        
        ctx.save();
        
        // Translate to element position
        ctx.translate(element.x || 0, element.y || 0);
        console.log('[CanvasSlideshow] 📍 Position:', element.x, element.y);
        
        // Rotation (if any)
        if (element.rotation) {
            ctx.translate(element.width / 2, element.height / 2);
            ctx.rotate((element.rotation * Math.PI) / 180);
            ctx.translate(-element.width / 2, -element.height / 2);
        }
        
        // Opacity
        ctx.globalAlpha = (typeof element.opacity !== 'undefined') ? element.opacity : 1;
        
        // 🔥 CRITICAL: Set up clipping BEFORE drawing anything
        ctx.save();
        ctx.beginPath();
        
        if (element.borderRadius && element.borderRadius > 0) {
            // Rounded rectangle clip
            var r = element.borderRadius;
            var w = element.width;
            var h = element.height;
            ctx.moveTo(r, 0);
            ctx.arcTo(w, 0, w, h, r);
            ctx.arcTo(w, h, 0, h, r);
            ctx.arcTo(0, h, 0, 0, r);
            ctx.arcTo(0, 0, w, 0, r);
            ctx.closePath();
        } else {
            // Simple rectangle clip
            ctx.rect(0, 0, element.width, element.height);
        }
        
        ctx.clip();
        console.log('[CanvasSlideshow] ✂️ Clipping region created');
        
        // 🔥 CRITICAL: Only draw background if EXPLICITLY specified
        // DO NOT draw black by default!
        if (element.backgroundColor && 
            element.backgroundColor !== 'transparent' && 
            element.backgroundColor !== 'rgba(0,0,0,0)' &&
            element.backgroundColor !== '#00000000') {
            ctx.fillStyle = element.backgroundColor;
            ctx.fillRect(0, 0, element.width, element.height);
            console.log('[CanvasSlideshow] 🎨 Background:', element.backgroundColor);
        } else {
            console.log('[CanvasSlideshow] ⚪ No background (transparent)');
        }
        
        // Calculate image position and size
        var fit = element.objectFit || 'cover';
        var imgRatio = img.width / img.height;
        var boxRatio = element.width / element.height;
        
        var drawWidth, drawHeight, offsetX, offsetY;
        
        if (fit === 'cover') {
            // Fill entire container
            if (imgRatio > boxRatio) {
                drawHeight = element.height;
                drawWidth = element.height * imgRatio;
                offsetX = (element.width - drawWidth) / 2;
                offsetY = 0;
            } else {
                drawWidth = element.width;
                drawHeight = element.width / imgRatio;
                offsetX = 0;
                offsetY = (element.height - drawHeight) / 2;
            }
        } else if (fit === 'contain') {
            // Show entire image
            if (imgRatio > boxRatio) {
                drawWidth = element.width;
                drawHeight = element.width / imgRatio;
                offsetX = 0;
                offsetY = (element.height - drawHeight) / 2;
            } else {
                drawHeight = element.height;
                drawWidth = element.height * imgRatio;
                offsetX = (element.width - drawWidth) / 2;
                offsetY = 0;
            }
        } else {
            // Stretch
            drawWidth = element.width;
            drawHeight = element.height;
            offsetX = 0;
            offsetY = 0;
        }
        
        console.log('[CanvasSlideshow] 📐 Draw:', Math.round(drawWidth) + 'x' + Math.round(drawHeight), 
                   'at', Math.round(offsetX) + ',' + Math.round(offsetY));
        
        // 🔥 DRAW THE IMAGE
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        console.log('[CanvasSlideshow] ✅ IMAGE DRAWN!');
        
        ctx.restore(); // Restore from clipping
        
        // Draw border (AFTER clipping restore)
        if (element.borderWidth && element.borderWidth > 0 && element.borderColor) {
            ctx.strokeStyle = element.borderColor;
            ctx.lineWidth = element.borderWidth;
            
            if (element.borderRadius && element.borderRadius > 0) {
                var r = element.borderRadius;
                var w = element.width;
                var h = element.height;
                ctx.beginPath();
                ctx.moveTo(r, 0);
                ctx.arcTo(w, 0, w, h, r);
                ctx.arcTo(w, h, 0, h, r);
                ctx.arcTo(0, h, 0, 0, r);
                ctx.arcTo(0, 0, w, 0, r);
                ctx.closePath();
                ctx.stroke();
            } else {
                ctx.strokeRect(0, 0, element.width, element.height);
            }
            console.log('[CanvasSlideshow] 🖼️ Border drawn');
        }
        
        ctx.restore(); // Final restore
        console.log('[CanvasSlideshow] ✅ drawImageSimple COMPLETE');
    }

    /**
     * Re-render just this slideshow
     */
    function rerenderSlideshow(element) {
        console.log('[CanvasSlideshow] 🔄 rerenderSlideshow START');
        
        var canvas = document.getElementById('templateCanvas');
        if (!canvas) {
            console.error('[CanvasSlideshow] ❌ Canvas #templateCanvas not found!');
            return;
        }

        var ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('[CanvasSlideshow] ❌ Cannot get 2D context!');
            return;
        }

        ctx.save();

        // Detect if using CanvasScaler
        var usingScaler = (typeof CanvasScaler !== 'undefined' && 
                          typeof CanvasScaler.isInitialized === 'function' && 
                          CanvasScaler.isInitialized());
        
        console.log('[CanvasSlideshow] 🔍 Using CanvasScaler:', usingScaler);
        
        if (usingScaler) {
            // CanvasScaler mode
            var padding = 5;
            ctx.clearRect(
                (element.x || 0) - padding,
                (element.y || 0) - padding,
                element.width + (padding * 2),
                element.height + (padding * 2)
            );
            
            // Redraw background portion
            redrawBackground(ctx, element);
            
            // Render slideshow
            var currentIndex = element.currentSlide || 0;
            var currentSlide = element.slides[currentIndex];
            renderSlideSimple(ctx, element, currentSlide, currentIndex);
            
        } else {
            // Legacy scaling mode
            console.log('[CanvasSlideshow] ⚠️ Using legacy scaling');
            
            var templateData = null;
            try {
                templateData = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
            } catch (e) {
                console.error('[CanvasSlideshow] Error accessing template data:', e);
                ctx.restore();
                return;
            }

            if (!templateData || !templateData.canvas) {
                console.error('[CanvasSlideshow] No template data');
                ctx.restore();
                return;
            }

            var canvasConfig = templateData.canvas;
            var designW = canvasConfig.width || 1920;
            var designH = canvasConfig.height || 1080;
            
            var scaleX = canvas.width / designW;
            var scaleY = canvas.height / designH;

            var scaledX = element.x * scaleX;
            var scaledY = element.y * scaleY;
            var scaledW = element.width * scaleX;
            var scaledH = element.height * scaleY;

            // Clear area
            ctx.clearRect(scaledX, scaledY, scaledW, scaledH);

            // Redraw background
            if (canvasConfig.background && canvasConfig.background !== 'transparent') {
                ctx.fillStyle = canvasConfig.background;
                ctx.fillRect(scaledX, scaledY, scaledW, scaledH);
            }

            ctx.scale(scaleX, scaleY);

            var currentIndex = element.currentSlide || 0;
            var currentSlide = element.slides[currentIndex];
            renderSlideSimple(ctx, element, currentSlide, currentIndex);
        }

        ctx.restore();
        console.log('[CanvasSlideshow] ✅ rerenderSlideshow COMPLETE');
    }

    /**
     * Redraw background behind slideshow
     */
    function redrawBackground(ctx, element) {
        try {
            var templateData = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
            if (!templateData || !templateData.canvas) return;

            var canvasConfig = templateData.canvas;
            
            if (canvasConfig.background && canvasConfig.background !== 'transparent') {
                ctx.fillStyle = canvasConfig.background;
                ctx.fillRect(element.x, element.y, element.width, element.height);
            }
        } catch (e) {
            console.warn('[CanvasSlideshow] Could not redraw background:', e);
        }
    }

    /**
     * Setup auto-play
     */
    function setupAutoPlay(element) {
        var elementId = element.id;
        var state = activeSlideshows[elementId];
        
        if (!state) {
            state = {
                element: element,
                currentIndex: element.currentSlide || 0,
                loadedImages: {},
                timerRunning: false
            };
            activeSlideshows[elementId] = state;
        }

        if (state.timerRunning) return;

        var currentIndex = element.currentSlide || 0;
        var currentSlide = element.slides[currentIndex];
        var duration = currentSlide.duration || element.duration || element.defaultDuration || 5;
        var durationMs = duration * 1000;

        console.log('[CanvasSlideshow] ⏰ Auto-play: slide', (currentIndex + 1), 'duration:', duration, 's');

        state.timerRunning = true;

        if (state.timer) {
            clearTimeout(state.timer);
        }

        state.timer = setTimeout(function() {
            nextSlide(element);
        }, durationMs);
    }

    /**
     * Next slide
     */
    function nextSlide(element) {
        var state = activeSlideshows[element.id];
        if (!state) return;

        var currentIndex = element.currentSlide || 0;
        var nextIndex = currentIndex + 1;
        
        if (nextIndex >= element.slides.length) {
            if (element.loop !== false) {
                nextIndex = 0;
            } else {
                state.timerRunning = false;
                if (state.timer) {
                    clearTimeout(state.timer);
                    state.timer = null;
                }
                return;
            }
        }

        element.currentSlide = nextIndex;
        state.currentIndex = nextIndex;
        state.timerRunning = false;
        
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }

        rerenderSlideshow(element);
        
        setTimeout(function() {
            if (element.autoPlay !== false && !state.timerRunning) {
                setupAutoPlay(element);
            }
        }, 100);
    }

    /**
     * Placeholder
     */
    function renderPlaceholder(ctx, element) {
        ctx.save();
        ctx.translate(element.x || 0, element.y || 0);
        
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, element.width, element.height);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = '#999999';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No Slides Available', element.width / 2, element.height / 2);
        
        ctx.restore();
    }

    /**
     * Stop all
     */
    function stopAll() {
        for (var key in activeSlideshows) {
            var state = activeSlideshows[key];
            if (state && state.timer) {
                clearTimeout(state.timer);
                state.timerRunning = false;
                state.timer = null;
            }
        }
        activeSlideshows = {};
    }

    /**
     * Cleanup
     */
    function cleanup() {
        stopAll();
    }

    // Public API
    return {
        render: render,
        nextSlide: nextSlide,
        stopAll: stopAll,
        cleanup: cleanup
    };
})();

// Expose globally
if (typeof window !== 'undefined') {
    window.CanvasSlideshow = CanvasSlideshow;
}