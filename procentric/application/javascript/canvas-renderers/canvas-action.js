/**
 * ====================================================================
 * CANVAS ACTION ELEMENT RENDERER
 * Handles action elements (interactive cards with text overlays)
 * ====================================================================
 */

var CanvasAction = (function() {
    'use strict';

    /**
     * Render ACTION element with text showing on top
     */
    function render(ctx, el) {
        console.log('[CanvasAction] Rendering:', el.name || el.id);
        
        ctx.save();
        
        // Position & rotation
        CanvasBase.applyTransformations(ctx, el);
        
        // STEP 1: Draw solid background color
        if (el.backgroundColor) {
            ctx.fillStyle = el.backgroundColor;
            
            if (el.borderRadius > 0) {
                CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, el.width, el.height);
            }
        }
        
        // STEP 2: Draw border
        if (el.borderWidth > 0 && el.borderColor) {
            ctx.strokeStyle = el.borderColor;
            ctx.lineWidth = el.borderWidth;
            
            if (el.borderRadius > 0) {
                CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(0, 0, el.width, el.height);
            }
        }
        
        ctx.restore();
        
        // STEP 3: Load background media asynchronously
        var hasBackgroundVideo = el.backgroundVideo && el.displayMode === 'video';
        var hasBackgroundImage = el.backgroundImage && el.backgroundImage.trim() !== '';
        var hasImageData = el.imageData && el.imageData.trim() !== '';
        
        if (hasBackgroundVideo) {
            renderVideoBackgroundPlaceholder(ctx, el);
            drawActionText(ctx, el);
        } 
        else if (hasBackgroundImage) {
            loadAndDrawActionBackground(ctx, el, el.backgroundImage, 'url');
        } 
        else if (hasImageData) {
            var imgSrc = el.imageData.indexOf('data:') === 0 ? el.imageData : 'data:image/png;base64,' + el.imageData;
            loadAndDrawActionBackground(ctx, el, imgSrc, 'base64');
        }
        else {
            // No background image, just draw text immediately
            drawActionText(ctx, el);
        }
    }

    /**
     * Draw text on action elements
     */
    function drawActionText(ctx, el) {
        if (!el.text || el.showTextOverlay === false) {
            return;
        }
        
        ctx.save();
        
        // Re-apply position and rotation
        ctx.translate(el.x || 0, el.y || 0);
        if (el.rotation) {
            ctx.translate(el.width / 2, el.height / 2);
            ctx.rotate(el.rotation * Math.PI / 180);
            ctx.translate(-el.width / 2, -el.height / 2);
        }
        
        ctx.globalAlpha = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        
        var fontSize = el.fontSize || 22;
        var fontFamily = el.fontFamily || 'Arial';
        
        ctx.font = fontSize + 'px ' + fontFamily;
        ctx.fillStyle = el.color || '#ffffff';
        ctx.textAlign = el.textAlign || 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate text position
        var textX;
        if (el.textAlign === 'left') {
            textX = 10;
        } else if (el.textAlign === 'right') {
            textX = el.width - 10;
        } else {
            textX = el.width / 2;
        }
        
        // Vertical alignment
        var textY;
        if (el.textAlignVertical === 'top') {
            textY = fontSize + 10;
        } else if (el.textAlignVertical === 'middle' || el.textAlignVertical === 'center') {
            textY = el.height / 2;
        } else { // bottom (default)
            textY = el.height - 40;
        }
        
        // Add text shadow for readability
        var shadowIntensity = el.textShadowIntensity || 0.7;
        ctx.shadowColor = 'rgba(0, 0, 0, ' + shadowIntensity + ')';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText(el.text, textX, textY);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.restore();
        
        console.log('[CanvasAction] ✅ Text drawn:', el.text);
    }

    /**
     * Load and draw background for action element
     */
    function loadAndDrawActionBackground(ctx, el, imageSrc, sourceType) {
        var img = new Image();
        
        if (sourceType === 'url') {
            img.crossOrigin = 'anonymous';
        }
        
        // Store element data for async callback
        var elementData = {
            x: el.x || 0,
            y: el.y || 0,
            width: el.width,
            height: el.height,
            rotation: el.rotation || 0,
            opacity: typeof el.opacity !== 'undefined' ? el.opacity : 1,
            borderRadius: el.borderRadius || 0,
            imageSize: el.imageSize || 'cover',
            vignetteEffect: el.vignetteEffect,
            vignetteIntensity: el.vignetteIntensity || 1,
            name: el.name || el.id
        };
        
        img.onload = function() {
            try {
                ctx.save();
                
                // Re-apply transformations
                ctx.translate(elementData.x, elementData.y);
                if (elementData.rotation) {
                    ctx.translate(elementData.width / 2, elementData.height / 2);
                    ctx.rotate(elementData.rotation * Math.PI / 180);
                    ctx.translate(-elementData.width / 2, -elementData.height / 2);
                }
                
                ctx.globalAlpha = elementData.opacity;
                
                // Clip to border radius
                if (elementData.borderRadius > 0) {
                    CanvasBase.roundRect(ctx, 0, 0, elementData.width, elementData.height, elementData.borderRadius);
                    ctx.clip();
                }
                
                // Draw background image
                CanvasBase.drawImageWithFit(ctx, img, 0, 0, elementData.width, elementData.height, elementData.imageSize);
                
                // Apply vignette effect
                if (elementData.vignetteEffect) {
                    CanvasBase.applyVignette(ctx, elementData.width, elementData.height, elementData.vignetteEffect, elementData.vignetteIntensity);
                }
                
                ctx.restore();
                
                console.log('[CanvasAction] ✅ Background ' + sourceType + ' loaded:', elementData.name);
                
                // Draw text AFTER image loads
                drawActionText(ctx, el);
                
            } catch (e) {
                console.warn('[CanvasAction] Failed to draw background ' + sourceType + ':', e);
                drawActionText(ctx, el);
            }
        };
        
        img.onerror = function() {
            console.warn('[CanvasAction] ❌ Background ' + sourceType + ' load failed:', elementData.name);
            drawActionText(ctx, el);
        };
        
        img.src = imageSrc;
    }

    /**
     * Render video background placeholder for action element
     */
    function renderVideoBackgroundPlaceholder(ctx, el) {
        ctx.save();
        
        ctx.translate(el.x || 0, el.y || 0);
        if (el.rotation) {
            ctx.translate(el.width / 2, el.height / 2);
            ctx.rotate(el.rotation * Math.PI / 180);
            ctx.translate(-el.width / 2, -el.height / 2);
        }
        
        ctx.globalAlpha = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        
        // Clip to border radius
        if (el.borderRadius > 0) {
            CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
            ctx.clip();
        }
        
        // Dark background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, el.width, el.height);
        
        // Play icon
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        var centerX = el.width / 2;
        var centerY = el.height / 2;
        var iconSize = Math.min(el.width, el.height) * 0.15;
        
        ctx.beginPath();
        ctx.moveTo(centerX - iconSize / 2, centerY - iconSize);
        ctx.lineTo(centerX - iconSize / 2, centerY + iconSize);
        ctx.lineTo(centerX + iconSize, centerY);
        ctx.closePath();
        ctx.fill();
        
        // "Video" text
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('Video', centerX, centerY + iconSize + 25);
        
        ctx.restore();
        
        console.log('[CanvasAction] Video background placeholder rendered:', el.name || el.id);
    }

    // Public API
    return {
        render: render
    };
})();