/**
 * ====================================================================
 * CANVAS TICKER RENDERER - FULLY WORKING VERSION
 * Displays scrolling ticker with title and text moving right to left
 * Uses HTML overlay for smooth CSS animations
 * Speed: 1-10 (1=slowest, 10=fastest)
 * ====================================================================
 */

var CanvasTicker = (function() {
    'use strict';
    
    var tickerOverlays = {}; // Store ticker overlay elements
    var tickerAnimationIds = {}; // Store animation style IDs
    
    function _isVideoBg() {
        try {
            var tj = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
            return !!(tj && tj.canvas && tj.canvas.backgroundType === 'video');
        } catch (e) { return false; }
    }

    function render(ctx, el, canvas) {
        if (!el.items || el.items.length === 0) {
            console.warn('[CanvasTicker] Ticker element missing items:', el.name || el.id);
            return;
        }
        
        console.log('[CanvasTicker] Rendering ticker:', el.name || el.id, 'Speed:', el.speed);

        // VIDEO BACKGROUND: skip all canvas draws — they block the video.
        // The DOM overlay handles all visual rendering.
        if (!_isVideoBg()) {
            ctx.save();
            CanvasBase.applyTransformations(ctx, el);
            
            var bgType = el.backgroundType || 'color';
            if (bgType === 'color' && el.backgroundColor && el.backgroundColor !== 'transparent') {
                var bgOpacity = typeof el.backgroundOpacity !== 'undefined' ? el.backgroundOpacity : 1;
                ctx.globalAlpha = bgOpacity;
                ctx.fillStyle = el.backgroundColor;
                ctx.fillRect(0, 0, el.width, el.height);
                ctx.globalAlpha = 1;
            }
            
            if (el.showBorder) {
                ctx.strokeStyle = el.borderColor || '#cccccc';
                ctx.lineWidth = el.borderWidth || 1;
                if (el.borderRadius > 0) {
                    CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
                    ctx.stroke();
                } else {
                    ctx.strokeRect(0, 0, el.width, el.height);
                }
            }

            ctx.restore();
        }
        
        // Create HTML overlay for ticker animation
        createTickerOverlay(el, canvas);
    }
    
    function createTickerOverlay(el, canvas) {
        var elementId = el.id || el.name || 'ticker-' + Math.random();
        
        if (!canvas) {
            canvas = document.getElementById('templateCanvas');
        }
        
        if (!canvas) {
            console.error('[CanvasTicker] Canvas element not found');
            return;
        }
        
        var container = canvas.parentElement;
        if (!container) return;
        
        // Remove old overlay if exists
        if (tickerOverlays[elementId]) {
            try {
                if (tickerOverlays[elementId].parentNode) {
                    tickerOverlays[elementId].parentNode.removeChild(tickerOverlays[elementId]);
                }
            } catch (e) {
                console.warn('[CanvasTicker] Error removing old overlay:', e);
            }
        }
        
        // Remove old animation style if exists
        if (tickerAnimationIds[elementId]) {
            var oldStyle = document.getElementById(tickerAnimationIds[elementId]);
            if (oldStyle && oldStyle.parentNode) {
                oldStyle.parentNode.removeChild(oldStyle);
            }
        }
        
        // Create new overlay
        var overlay = document.createElement('div');
        overlay.id = 'ticker-overlay-' + elementId;
        overlay.className = 'ticker-overlay';
        // Hide until animation fires (prevents flash at natural position on first load)
        if (el.animation && el.animation.enabled && el.animation.type && el.animation.type !== 'none') {
            overlay.style.visibility = 'hidden';
        }
        container.appendChild(overlay);
        tickerOverlays[elementId] = overlay;
        
        // el.x/y/width/height are already screen pixels when CanvasScaler is used.
        // Only apply a scale when canvas CSS size differs from its pixel buffer size.
        var scaleX = 1, scaleY = 1;
        try {
            var canvasRect = canvas.getBoundingClientRect();
            if (Math.abs(canvasRect.width - canvas.width) > 2) {
                scaleX = canvasRect.width  / canvas.width;
                scaleY = canvasRect.height / canvas.height;
            }
        } catch (e) { /* use 1:1 */ }

        overlay.style.position = 'absolute';
        overlay.style.left = (el.x * scaleX) + 'px';
        overlay.style.top = (el.y * scaleY) + 'px';
        overlay.style.width = (el.width * scaleX) + 'px';
        overlay.style.height = (el.height * scaleY) + 'px';
        overlay.style.overflow = 'hidden';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '100';
        
        // Apply background
        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
            overlay.style.backgroundColor = el.backgroundColor;
            if (typeof el.backgroundOpacity !== 'undefined') {
                overlay.style.opacity = el.backgroundOpacity;
            }
        }
        
        // Apply border
        if (el.showBorder) {
            overlay.style.border = (el.borderWidth || 1) + 'px ' + (el.borderStyle || 'solid') + ' ' + (el.borderColor || '#cccccc');
            if (el.borderRadius) {
                overlay.style.borderRadius = (el.borderRadius * scaleX) + 'px';
            }
        }
        
        // Create ticker content with delay to ensure DOM is ready
        setTimeout(function() {
            createTickerContent(el, overlay, scaleX, scaleY, elementId);
        }, 100);
    }
    
    function createTickerContent(el, overlay, scaleX, scaleY, elementId) {
        var enabledItems = el.items.filter(function(item) { return item.enabled !== false; });
        
        if (enabledItems.length === 0) {
            overlay.innerHTML = '';
            return;
        }
        
        // Get styling
        var speed = el.speed || 5;
        var spacing = (el.spacing || 20) * scaleX;
        var titleSize = (el.titleSize || 16) * Math.min(scaleX, scaleY);
        var textSize = (el.textSize || 14) * Math.min(scaleX, scaleY);
        var titleFont = el.titleFont || 'Roboto';
        var textFont = el.textFont || 'Roboto';
        var titleColor = el.titleColor || '#000000';
        var textColor = el.textColor || '#666666';
        var direction = el.direction || 'left';
        
        console.log('[CanvasTicker] Creating content with speed:', speed, 'direction:', direction);
        
        // Determine if this is a vertical direction
        var isVertical = (direction === 'up' || direction === 'down');

        // Build ticker content HTML
        var tickerContent = '';
        for (var i = 0; i < enabledItems.length; i++) {
            var item = enabledItems[i];

            tickerContent += '<div class="ticker-item" style="';
            if (isVertical) {
                // Vertical: block layout, full width, with bottom margin as spacing
                tickerContent += 'display: block; ';
                tickerContent += 'width: 100%; ';
                tickerContent += 'padding: 4px 8px; ';
                tickerContent += 'box-sizing: border-box; ';
                tickerContent += 'margin-bottom: ' + spacing + 'px; ';
            } else {
                // Horizontal: inline-flex, full height, with right margin as spacing
                tickerContent += 'display: inline-flex; ';
                tickerContent += 'flex-direction: column; ';
                tickerContent += 'justify-content: center; ';
                tickerContent += 'align-items: flex-start; ';
                tickerContent += 'margin-right: ' + spacing + 'px; ';
                tickerContent += 'vertical-align: middle; ';
                tickerContent += 'white-space: nowrap; ';
                tickerContent += 'height: 100%; ';
            }
            tickerContent += '">';

            // Title
            if (item.title) {
                tickerContent += '<div style="display: block; line-height: 1.2;">';
                tickerContent += '<span style="';
                tickerContent += 'color: ' + titleColor + '; ';
                tickerContent += 'font-size: ' + titleSize + 'px; ';
                tickerContent += 'font-family: ' + titleFont + ', Arial, sans-serif; ';
                tickerContent += 'font-weight: ' + (el.titleBold ? 'bold' : 'normal') + '; ';
                tickerContent += 'font-style: ' + (el.titleItalic ? 'italic' : 'normal') + '; ';
                tickerContent += 'text-decoration: ' + (el.titleUnderline ? 'underline' : 'none') + ';';
                tickerContent += '">';
                tickerContent += escapeHtml(item.title);
                tickerContent += '</span></div>';
            }

            // Text (below title)
            if (item.text) {
                tickerContent += '<div style="display: block; line-height: 1.2; margin-top: ' + (el.textSpacing || 4) + 'px;">';
                tickerContent += '<span style="';
                tickerContent += 'color: ' + textColor + '; ';
                tickerContent += 'font-size: ' + textSize + 'px; ';
                tickerContent += 'font-family: ' + textFont + ', Arial, sans-serif; ';
                tickerContent += 'font-weight: ' + (el.textBold ? 'bold' : 'normal') + '; ';
                tickerContent += 'font-style: ' + (el.textItalic ? 'italic' : 'normal') + '; ';
                tickerContent += 'text-decoration: ' + (el.textUnderline ? 'underline' : 'none') + ';';
                tickerContent += '">';
                tickerContent += escapeHtml(item.text);
                tickerContent += '</span></div>';
            }

            tickerContent += '</div>';
        }

        // Add trailing spacer
        if (isVertical) {
            tickerContent += '<div style="display: block; width: 100%; height: ' + (spacing * 3) + 'px;"></div>';
        } else {
            tickerContent += '<div style="display: inline-block; width: ' + (spacing * 3) + 'px; height: 100%;"></div>';
        }

        // Repeat content 4 times for smooth looping
        var fullContent = tickerContent + tickerContent + tickerContent + tickerContent;

        // Calculate animation duration based on speed
        // Speed 1 = 50 seconds, Speed 10 = 5 seconds
        var baseDuration = 50;
        var duration = (baseDuration / speed);

        console.log('[CanvasTicker] Animation duration:', duration, 'seconds');

        // Create unique animation name
        var animationName = 'ticker-scroll-' + elementId.toString().replace(/\./g, '_');

        // Build wrapper style based on direction
        var wrapperStyle = 'position: absolute; ';

        if (isVertical) {
            // Vertical directions: wrapper spans full width, animates top
            wrapperStyle += 'left: 0; ';
            wrapperStyle += 'width: 100%; ';
            if (direction === 'up') {
                wrapperStyle += 'top: 100%; ';    // Start below the ticker
            } else {
                wrapperStyle += 'top: -100%; ';   // Start above the ticker
            }
            wrapperStyle += 'display: block; ';
        } else {
            // Horizontal directions: wrapper spans full height, animates left
            wrapperStyle += 'top: 0; ';
            wrapperStyle += 'height: 100%; ';
            if (direction === 'left' || direction === 'right-to-left') {
                wrapperStyle += 'left: 100%; ';   // Start from right edge
            } else {
                // direction === 'right' or 'left-to-right'
                wrapperStyle += 'left: -100%; ';  // Start from left edge
            }
            wrapperStyle += 'display: inline-flex; ';
            wrapperStyle += 'align-items: center; ';
            wrapperStyle += 'white-space: nowrap; ';
        }

        wrapperStyle += 'animation: ' + animationName + ' ' + duration + 's linear infinite;';

        // Create the HTML structure
        var html = '<div style="position: relative; width: 100%; height: 100%; overflow: hidden;">';
        html += '<div class="ticker-wrapper" style="' + wrapperStyle + '">';
        html += fullContent;
        html += '</div>';
        html += '</div>';

        // Add keyframes animation
        var styleId = 'ticker-animation-style-' + elementId.toString().replace(/\./g, '_');
        var style = document.createElement('style');
        style.id = styleId;

        if (direction === 'up') {
            // Bottom to top
            style.textContent =
                '@keyframes ' + animationName + ' {' +
                '    from { top: 100%; }' +
                '    to { top: -100%; }' +
                '}';
        } else if (direction === 'down') {
            // Top to bottom
            style.textContent =
                '@keyframes ' + animationName + ' {' +
                '    from { top: -100%; }' +
                '    to { top: 100%; }' +
                '}';
        } else if (direction === 'left' || direction === 'right-to-left') {
            // Right to left
            style.textContent =
                '@keyframes ' + animationName + ' {' +
                '    from { left: 100%; }' +
                '    to { left: -100%; }' +
                '}';
        } else {
            // direction === 'right' or 'left-to-right' — Left to right
            style.textContent =
                '@keyframes ' + animationName + ' {' +
                '    from { left: -100%; }' +
                '    to { left: 100%; }' +
                '}';
        }
        
        document.head.appendChild(style);
        tickerAnimationIds[elementId] = styleId;
        
        overlay.innerHTML = html;

        // Apply CSS entry/exit animation if configured on this element
        if (el.animation && el.animation.enabled && el.animation.type && el.animation.type !== 'none') {
            if (typeof CanvasAnimation !== 'undefined' && CanvasAnimation.applyAnimation) {
                CanvasAnimation.applyAnimation(el, canvas);
            }
        }

        console.log('[CanvasTicker] ✅ Ticker animation started successfully!');
        console.log('[CanvasTicker] Element ID:', elementId);
        console.log('[CanvasTicker] Animation name:', animationName);
        console.log('[CanvasTicker] Duration:', duration + 's');
        console.log('[CanvasTicker] Direction:', direction);
    }
    
    function escapeHtml(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    function cleanup() {
        console.log('[CanvasTicker] Cleaning up ticker overlays');
        
        // Remove all overlays
        for (var id in tickerOverlays) {
            if (tickerOverlays.hasOwnProperty(id)) {
                var overlay = tickerOverlays[id];
                if (overlay && overlay.parentNode) {
                    try {
                        overlay.parentNode.removeChild(overlay);
                    } catch (e) {
                        console.warn('[CanvasTicker] Error removing overlay:', e);
                    }
                }
            }
        }
        
        // Remove all animation styles
        for (var id in tickerAnimationIds) {
            if (tickerAnimationIds.hasOwnProperty(id)) {
                var styleElement = document.getElementById(tickerAnimationIds[id]);
                if (styleElement && styleElement.parentNode) {
                    try {
                        styleElement.parentNode.removeChild(styleElement);
                    } catch (e) {
                        console.warn('[CanvasTicker] Error removing style:', e);
                    }
                }
            }
        }
        
        tickerOverlays = {};
        tickerAnimationIds = {};
    }
    
    return {
        render: render,
        cleanup: cleanup
    };
})();