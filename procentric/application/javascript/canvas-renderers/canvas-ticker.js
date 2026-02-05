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
    
    function render(ctx, el, canvas) {
        if (!el.items || el.items.length === 0) {
            console.warn('[CanvasTicker] Ticker element missing items:', el.name || el.id);
            return;
        }
        
        console.log('[CanvasTicker] Rendering ticker:', el.name || el.id, 'Speed:', el.speed);
        
        ctx.save();
        CanvasBase.applyTransformations(ctx, el);
        
        // Draw background placeholder
        var bgType = el.backgroundType || 'color';
        if (bgType === 'color' && el.backgroundColor && el.backgroundColor !== 'transparent') {
            var bgOpacity = typeof el.backgroundOpacity !== 'undefined' ? el.backgroundOpacity : 1;
            ctx.globalAlpha = bgOpacity;
            ctx.fillStyle = el.backgroundColor;
            ctx.fillRect(0, 0, el.width, el.height);
            ctx.globalAlpha = 1;
        }
        
        // Draw border if enabled
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
        container.appendChild(overlay);
        tickerOverlays[elementId] = overlay;
        
        // Calculate position
        var canvasRect = canvas.getBoundingClientRect();
        var scaleX = canvasRect.width / canvas.width;
        var scaleY = canvasRect.height / canvas.height;
        
        // Style the overlay container
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
        
        // Build ticker content HTML - each item with title above text
        var tickerContent = '';
        for (var i = 0; i < enabledItems.length; i++) {
            var item = enabledItems[i];
            
            tickerContent += '<div class="ticker-item" style="';
            tickerContent += 'display: inline-flex; ';
            tickerContent += 'flex-direction: column; ';
            tickerContent += 'justify-content: center; ';
            tickerContent += 'align-items: flex-start; ';
            tickerContent += 'margin-right: ' + spacing + 'px; ';
            tickerContent += 'vertical-align: middle; ';
            tickerContent += 'white-space: nowrap;';
            tickerContent += 'height: 100%;'; // Take full height of ticker
            tickerContent += '">';
            
            // Title container (top)
            if (item.title) {
                tickerContent += '<div style="';
                tickerContent += 'display: block; ';
                tickerContent += 'line-height: 1.2;';
                tickerContent += '">';
                
                tickerContent += '<span style="';
                tickerContent += 'color: ' + titleColor + '; ';
                tickerContent += 'font-size: ' + titleSize + 'px; ';
                tickerContent += 'font-family: ' + titleFont + ', Arial, sans-serif; ';
                tickerContent += 'font-weight: ' + (el.titleBold ? 'bold' : 'normal') + '; ';
                tickerContent += 'font-style: ' + (el.titleItalic ? 'italic' : 'normal') + '; ';
                tickerContent += 'text-decoration: ' + (el.titleUnderline ? 'underline' : 'none') + ';';
                tickerContent += '">';
                tickerContent += escapeHtml(item.title);
                tickerContent += '</span>';
                
                tickerContent += '</div>';
            }
            
            // Text container (below title)
            if (item.text) {
                tickerContent += '<div style="';
                tickerContent += 'display: block; ';
                tickerContent += 'line-height: 1.2;';
                tickerContent += 'margin-top: ' + (el.textSpacing || 4) + 'px;'; // Add spacing between title and text
                tickerContent += '">';
                
                tickerContent += '<span style="';
                tickerContent += 'color: ' + textColor + '; ';
                tickerContent += 'font-size: ' + textSize + 'px; ';
                tickerContent += 'font-family: ' + textFont + ', Arial, sans-serif; ';
                tickerContent += 'font-weight: ' + (el.textBold ? 'bold' : 'normal') + '; ';
                tickerContent += 'font-style: ' + (el.textItalic ? 'italic' : 'normal') + '; ';
                tickerContent += 'text-decoration: ' + (el.textUnderline ? 'underline' : 'none') + ';';
                tickerContent += '">';
                tickerContent += escapeHtml(item.text);
                tickerContent += '</span>';
                
                tickerContent += '</div>';
            }
            
            tickerContent += '</div>';
        }
        
        // Add a separator/spacer after the content
        tickerContent += '<div style="display: inline-block; width: ' + (spacing * 3) + 'px; height: 100%;"></div>';
        
        // Repeat content 4 times for smooth looping
        var fullContent = tickerContent + tickerContent + tickerContent + tickerContent;
        
        // Calculate animation duration based on speed
        // Speed 1 = 50 seconds, Speed 10 = 5 seconds
        var baseDuration = 50;
        var duration = (baseDuration / speed);
        
        console.log('[CanvasTicker] Animation duration:', duration, 'seconds');
        
        // Create unique animation name
        var animationName = 'ticker-scroll-' + elementId.toString().replace(/\./g, '_');
        
        // Create the HTML structure
        var html = '<div style="position: relative; width: 100%; height: 100%; overflow: hidden;">';
        html += '<div class="ticker-wrapper" style="';
        html += 'position: absolute; ';
        html += 'left: 100%; '; // Start from right edge
        html += 'top: 0; ';
        html += 'height: 100%; ';
        html += 'display: inline-flex; ';
        html += 'align-items: center; ';
        html += 'white-space: nowrap; ';
        html += 'animation: ' + animationName + ' ' + duration + 's linear infinite;';
        html += '">';
        html += fullContent;
        html += '</div>';
        html += '</div>';
        
        // Add keyframes animation
        var styleId = 'ticker-animation-style-' + elementId.toString().replace(/\./g, '_');
        var style = document.createElement('style');
        style.id = styleId;
        
        if (direction === 'left' || direction === 'right-to-left') {
            // Right to left animation
            style.textContent = 
                '@keyframes ' + animationName + ' {' +
                '    from { left: 100%; }' +
                '    to { left: -100%; }' +
                '}';
        } else {
            // Left to right animation
            style.textContent = 
                '@keyframes ' + animationName + ' {' +
                '    from { left: -100%; }' +
                '    to { left: 100%; }' +
                '}';
        }
        
        document.head.appendChild(style);
        tickerAnimationIds[elementId] = styleId;
        
        overlay.innerHTML = html;
        
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