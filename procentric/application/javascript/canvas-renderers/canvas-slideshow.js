/**
 * ====================================================================
 * CANVAS SLIDESHOW RENDERER - FINAL FIX
 * Handles slideshow type elements with automatic transitions
 * Properly respects x, y, width, height for all slides
 * FIXES: Black box, proper image fitting WITH CLIPPING
 * ====================================================================
 */

var CanvasSlideshow = (function() {
    'use strict';

    // Store active slideshows by element ID
    var activeSlideshows = {};
    
    /**
     * Main render function for slideshow elements
     */
    function render(ctx, element) {
        console.log('[CanvasSlideshow] Rendering slideshow:', element.name || element.id);
        
        // Validate element structure
        if (!element.slides || !Array.isArray(element.slides) || element.slides.length === 0) {
            console.warn('[CanvasSlideshow] No slides found for slideshow:', element.id);
            renderPlaceholder(ctx, element);
            return;
        }

        // Initialize slideshow state if needed
        if (!activeSlideshows[element.id]) {
            activeSlideshows[element.id] = {
                element: element,
                currentIndex: element.currentSlide || 0,
                loadedImages: {},
                timerRunning: false
            };
        }

        var state = activeSlideshows[element.id];
        var currentIndex = element.currentSlide || 0;
        
        if (currentIndex >= element.slides.length) {
            currentIndex = 0;
            element.currentSlide = 0;
            state.currentIndex = 0;
        }

        var currentSlide = element.slides[currentIndex];
        console.log('[CanvasSlideshow] Rendering slide', (currentIndex + 1), 'of', element.slides.length);

        // Render the current slide
        renderSlide(ctx, element, currentSlide, currentIndex);

        // Setup auto-play if enabled and not already running
        if (element.autoPlay !== false && !state.timerRunning) {
            setupAutoPlay(element);
        }
    }

    /**
     * Render a single slide - FIXED VERSION WITH CLIPPING
     */
    function renderSlide(ctx, element, slide, slideIndex) {
        ctx.save();

        // Apply transformations (translate to element position)
        ctx.translate(element.x || 0, element.y || 0);
        
        if (element.rotation) {
            ctx.translate(element.width / 2, element.height / 2);
            ctx.rotate((element.rotation * Math.PI) / 180);
            ctx.translate(-element.width / 2, -element.height / 2);
        }

        // Apply opacity
        ctx.globalAlpha = (typeof element.opacity !== 'undefined') ? element.opacity : 1;

        // 🔥 FIX 1: ALWAYS clear the slideshow area first to prevent black boxes
        ctx.clearRect(0, 0, element.width, element.height);

        // 🔥 FIX 2: Draw background AFTER clearing (if specified)
        if (element.backgroundColor && element.backgroundColor !== 'transparent') {
            ctx.fillStyle = element.backgroundColor;
            ctx.fillRect(0, 0, element.width, element.height);
        }

        // 🔥 FIX 3: Create clipping region to ensure image stays within bounds
        ctx.save();
        if (element.borderRadius) {
            // Create rounded rectangle clip path
            var radius = element.borderRadius;
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.arcTo(element.width, 0, element.width, element.height, radius);
            ctx.arcTo(element.width, element.height, 0, element.height, radius);
            ctx.arcTo(0, element.height, 0, 0, radius);
            ctx.arcTo(0, 0, element.width, 0, radius);
            ctx.closePath();
            ctx.clip();
        } else {
            // Simple rectangular clip
            ctx.beginPath();
            ctx.rect(0, 0, element.width, element.height);
            ctx.clip();
        }

        // Render slide content based on type
        var slideType = slide.type ? slide.type.toLowerCase() : 'image';
        
        if (slideType === 'image') {
            renderImageSlide(ctx, element, slide, slideIndex);
        } else {
            console.warn('[CanvasSlideshow] Unsupported slide type:', slide.type);
            renderPlaceholder(ctx, element);
        }

        ctx.restore(); // Restore after clipping

        // Draw border if specified (AFTER clipping restore so border isn't clipped)
        if (element.borderWidth && element.borderColor) {
            ctx.strokeStyle = element.borderColor;
            ctx.lineWidth = element.borderWidth;
            
            if (element.borderRadius) {
                var radius = element.borderRadius;
                ctx.beginPath();
                ctx.moveTo(radius, 0);
                ctx.arcTo(element.width, 0, element.width, element.height, radius);
                ctx.arcTo(element.width, element.height, 0, element.height, radius);
                ctx.arcTo(0, element.height, 0, 0, radius);
                ctx.arcTo(0, 0, element.width, 0, radius);
                ctx.closePath();
                ctx.stroke();
            } else {
                ctx.strokeRect(0, 0, element.width, element.height);
            }
        }

        ctx.restore();
    }

    /**
     * Render an image slide
     */
    function renderImageSlide(ctx, element, slide, slideIndex) {
        var imageUrl = slide.content || slide.media_url || slide.thumbnail;
        
        if (!imageUrl) {
            console.warn('[CanvasSlideshow] No image URL for slide:', slide.id);
            return;
        }

        var state = activeSlideshows[element.id];
        if (!state) return;

        // Check if image is already cached
        if (state.loadedImages[slideIndex]) {
            var cachedImg = state.loadedImages[slideIndex];
            if (cachedImg.complete && cachedImg.naturalHeight !== 0) {
                // Draw at (0,0) because we've already translated to element position
                drawImageProper(ctx, element, cachedImg);
                return;
            }
        }

        // Load new image
        console.log('[CanvasSlideshow] Loading image for slide:', slideIndex);
        var img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            console.log('[CanvasSlideshow] ✅ Image loaded for slide:', slideIndex);
            
            // Cache the loaded image
            if (state.loadedImages) {
                state.loadedImages[slideIndex] = img;
            }
            
            // Re-render ONLY this slideshow element
            rerenderSlideshowOnly(element);
        };
        
        img.onerror = function() {
            console.error('[CanvasSlideshow] Failed to load image:', imageUrl);
        };
        
        img.src = imageUrl;
    }

    /**
     * 🔥 FINAL FIX: Proper image drawing that ALWAYS fits within container bounds
     * Images are drawn within clipping region, so they can't overflow
     */
    function drawImageProper(ctx, element, img) {
        var fit = element.objectFit || 'cover';
        
        var imgRatio = img.width / img.height;
        var boxRatio = element.width / element.height;
        
        var drawWidth, drawHeight, offsetX, offsetY;
        
        if (fit === 'cover') {
            // Fill the entire container while maintaining aspect ratio
            // Image will be cropped if aspect ratios don't match
            if (imgRatio > boxRatio) {
                // Image is wider than container - fit to height, crop width
                drawHeight = element.height;
                drawWidth = element.height * imgRatio;
                offsetX = (element.width - drawWidth) / 2;
                offsetY = 0;
            } else {
                // Image is taller than container - fit to width, crop height
                drawWidth = element.width;
                drawHeight = element.width / imgRatio;
                offsetX = 0;
                offsetY = (element.height - drawHeight) / 2;
            }
        } else if (fit === 'contain') {
            // Show entire image within container, may have empty space
            if (imgRatio > boxRatio) {
                // Image is wider - fit to width
                drawWidth = element.width;
                drawHeight = element.width / imgRatio;
                offsetX = 0;
                offsetY = (element.height - drawHeight) / 2;
            } else {
                // Image is taller - fit to height
                drawHeight = element.height;
                drawWidth = element.height * imgRatio;
                offsetX = (element.width - drawWidth) / 2;
                offsetY = 0;
            }
        } else { 
            // 'fill' - stretch to exact container size (may distort)
            drawWidth = element.width;
            drawHeight = element.height;
            offsetX = 0;
            offsetY = 0;
        }
        
        // Draw image - clipping region ensures it stays within bounds
        // Even if drawWidth/drawHeight are larger, the clip prevents overflow
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        console.log('[CanvasSlideshow] Drew image:', {
            fit: fit,
            containerSize: element.width + 'x' + element.height,
            imageSize: img.width + 'x' + img.height,
            drawSize: Math.round(drawWidth) + 'x' + Math.round(drawHeight),
            offset: Math.round(offsetX) + ',' + Math.round(offsetY)
        });
    }

    /**
     * Re-render ONLY the slideshow element without affecting the rest of the canvas
     */
    function rerenderSlideshowOnly(element) {
        var canvas = document.getElementById('templateCanvas');
        if (!canvas) {
            console.error('[CanvasSlideshow] Canvas not found');
            return;
        }

        var ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('[CanvasSlideshow] Context not found');
            return;
        }

        // Get the template data to access canvas configuration
        var templateData = null;
        try {
            templateData = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
        } catch (e) {
            console.error('[CanvasSlideshow] Error accessing template data:', e);
            return;
        }

        if (!templateData || !templateData.canvas) {
            console.error('[CanvasSlideshow] No template data');
            return;
        }

        var canvasConfig = templateData.canvas;
        
        // Calculate scaling factors
        var designW = canvasConfig.width || 1920;
        var designH = canvasConfig.height || 1080;
        
        var scaleX = canvas.width / designW;
        var scaleY = canvas.height / designH;

        // Calculate the actual position and size on the scaled canvas
        var scaledX = element.x * scaleX;
        var scaledY = element.y * scaleY;
        var scaledW = element.width * scaleX;
        var scaledH = element.height * scaleY;

        // Save the current context state
        ctx.save();

        // Clear only the slideshow area (on the actual scaled canvas)
        ctx.clearRect(scaledX, scaledY, scaledW, scaledH);

        // Redraw background in the slideshow area
        if (canvasConfig.backgroundType === 'image' && canvasConfig.backgroundImage) {
            var bgImageUrl = Array.isArray(canvasConfig.backgroundImage) 
                ? canvasConfig.backgroundImage[0] 
                : canvasConfig.backgroundImage;
                
            if (bgImageUrl) {
                // Load background image synchronously for this area
                var bgImg = new Image();
                bgImg.crossOrigin = 'anonymous';
                
                // Create a completion handler
                var drawSlideshow = function() {
                    // Clear and setup for slideshow drawing
                    ctx.clearRect(scaledX, scaledY, scaledW, scaledH);
                    
                    // Draw background portion if image loaded
                    if (bgImg.complete && bgImg.naturalHeight !== 0) {
                        // Calculate which portion of the background image to draw
                        var bgScaleX = bgImg.width / designW;
                        var bgScaleY = bgImg.height / designH;
                        
                        var srcX = element.x * bgScaleX;
                        var srcY = element.y * bgScaleY;
                        var srcW = element.width * bgScaleX;
                        var srcH = element.height * bgScaleY;
                        
                        ctx.drawImage(bgImg, 
                            srcX, srcY, srcW, srcH,  // source rectangle
                            scaledX, scaledY, scaledW, scaledH  // destination rectangle
                        );
                    }
                    
                    // Now render the slideshow with proper scaling
                    ctx.scale(scaleX, scaleY);
                    
                    var currentIndex = element.currentSlide || 0;
                    var currentSlide = element.slides[currentIndex];
                    
                    renderSlide(ctx, element, currentSlide, currentIndex);
                    
                    ctx.restore();
                };
                
                if (bgImg.complete && bgImg.naturalHeight !== 0) {
                    drawSlideshow();
                } else {
                    bgImg.onload = drawSlideshow;
                    bgImg.onerror = function() {
                        console.warn('[CanvasSlideshow] Background image failed to load, drawing without it');
                        drawSlideshow();
                    };
                    bgImg.src = bgImageUrl;
                }
                
                return; // Exit here, the rest will happen in the handler
            }
        }
        
        // If no background image or it's a color background
        if (canvasConfig.background && canvasConfig.background !== 'transparent') {
            ctx.fillStyle = canvasConfig.background;
            ctx.fillRect(0, 0, width, height);
        }

        // Now render the slideshow with proper scaling
        ctx.scale(scaleX, scaleY);

        // Then render the slideshow (which will translate to element.x, element.y)
        var currentIndex = element.currentSlide || 0;
        var currentSlide = element.slides[currentIndex];
        
        renderSlide(ctx, element, currentSlide, currentIndex);

        // Restore context
        ctx.restore();
    }

    /**
     * Setup automatic slide transitions
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

        // Check if already running
        if (state.timerRunning) {
            return;
        }

        // Get duration (in seconds) for current slide
        var currentIndex = element.currentSlide || 0;
        var currentSlide = element.slides[currentIndex];
        
        // Priority: slide.duration > element.duration > element.defaultDuration > 5 seconds
        var duration = currentSlide.duration || element.duration || element.defaultDuration || 5;
        var durationMs = duration * 1000;

        console.log('[CanvasSlideshow] Auto-play: slide', (currentIndex + 1), 'duration:', duration, 's');

        // Mark timer as running
        state.timerRunning = true;

        // Clear any existing timer
        if (state.timer) {
            clearTimeout(state.timer);
        }

        // Start transition timer
        state.timer = setTimeout(function() {
            nextSlide(element);
        }, durationMs);
    }

    /**
     * Advance to next slide
     */
    function nextSlide(element) {
        var state = activeSlideshows[element.id];
        if (!state) {
            return;
        }

        var currentIndex = element.currentSlide || 0;
        var nextIndex = currentIndex + 1;
        
        // Check if we should loop
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

        // Update current slide index
        element.currentSlide = nextIndex;
        state.currentIndex = nextIndex;

        // Mark timer as not running so it can be set again
        state.timerRunning = false;
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }

        // Re-render ONLY this slideshow element
        rerenderSlideshowOnly(element);
        
        // After re-rendering, setup the timer again for continuous auto-play
        setTimeout(function() {
            if (element.autoPlay !== false && !state.timerRunning) {
                setupAutoPlay(element);
            }
        }, 100);
    }

    /**
     * Render placeholder when no slides or error
     */
    function renderPlaceholder(ctx, element) {
        ctx.fillStyle = element.backgroundColor || '#cccccc';
        ctx.fillRect(0, 0, element.width, element.height);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No Slides', element.width / 2, element.height / 2);
    }

    /**
     * Preload all images for a slideshow
     */
    function preloadImages(element) {
        if (!element.slides || !Array.isArray(element.slides)) {
            return;
        }

        var state = activeSlideshows[element.id];
        if (!state) {
            state = {
                element: element,
                currentIndex: element.currentSlide || 0,
                loadedImages: {},
                timerRunning: false
            };
            activeSlideshows[element.id] = state;
        }

        for (var i = 0; i < element.slides.length; i++) {
            var slide = element.slides[i];
            var imageUrl = slide.content || slide.media_url || slide.thumbnail;
            
            if (!imageUrl) continue;

            // Skip if already cached
            if (state.loadedImages[i]) {
                continue;
            }

            // Preload image
            (function(slideIndex, url) {
                var img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = function() {
                    if (state.loadedImages) {
                        state.loadedImages[slideIndex] = img;
                    }
                };
                
                img.onerror = function() {
                    console.error('[CanvasSlideshow] Failed to preload:', url);
                };
                
                img.src = url;
            })(i, imageUrl);
        }
    }

    /**
     * Stop all slideshows
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
     * Stop specific slideshow
     */
    function stop(elementId) {
        var state = activeSlideshows[elementId];
        if (state && state.timer) {
            clearTimeout(state.timer);
            state.timerRunning = false;
            state.timer = null;
        }
    }

    /**
     * Cleanup function
     */
    function cleanup() {
        stopAll();
    }

    // Public API
    return {
        render: render,
        nextSlide: nextSlide,
        preloadImages: preloadImages,
        stop: stop,
        stopAll: stopAll,
        cleanup: cleanup
    };
})();

// Expose globally
if (typeof window !== 'undefined') {
    window.CanvasSlideshow = CanvasSlideshow;
}