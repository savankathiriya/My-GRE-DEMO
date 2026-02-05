/**
 * ====================================================================
 * CANVAS TEXT ELEMENT RENDERER - FIXED FOR CANVAS SCALER
 * Properly handles text positioning with scaled elements
 * ====================================================================
 */
var CanvasText = (function() {
    'use strict';

    function render(ctx, el) {
        if (!el.text) return;
        
        console.log('[CanvasText] Rendering:', el.name || el.id, 'Size:', el.width + 'x' + el.height);
        
        ctx.save();
        CanvasBase.applyTransformations(ctx, el);
        
        // Background
        if (el.backgroundType !== 'transparent' && el.backgroundColor && el.backgroundColor !== 'transparent') {
            CanvasBase.drawElementBackground(ctx, el);
        }
        
        // Font setup - Now explicitly using font family from element
        var fontString = getFontString(el);
        ctx.font = fontString;
        console.log('[CanvasText] Font string:', fontString);
        
        ctx.fillStyle = el.color || '#000000';
        
        // CRITICAL FIX: Proper text alignment and baseline
        ctx.textAlign = el.textAlign || 'left';
        
        // CRITICAL FIX: Use 'middle' baseline for proper vertical centering
        // This works much better with scaled text than 'top'
        ctx.textBaseline = 'middle';
        
        // Calculate position with proper vertical centering
        var textX = 0;
        var textY = el.height / 2; // CRITICAL: Center vertically
        
        // Handle padding
        var paddingLeft = el.paddingLeft || 0;
        var paddingRight = el.paddingRight || 0;
        
        // Adjust X based on alignment
        if (el.textAlign === 'center') {
            textX = el.width / 2;
        } else if (el.textAlign === 'right') {
            textX = el.width - paddingRight;
        } else {
            // Left alignment (default)
            textX = paddingLeft;
        }
        
        console.log('[CanvasText] Position: x=' + textX.toFixed(2) + ', y=' + textY.toFixed(2) + 
                   ', align=' + ctx.textAlign + ', baseline=' + ctx.textBaseline +
                   ', fontFamily=' + el.fontFamily);
        
        // Apply letter spacing if specified
        if (el.letterSpacing) {
            var spacing = parseFloat(el.letterSpacing.replace('px', ''));
            if (!isNaN(spacing) && spacing !== 0) {
                drawTextWithLetterSpacing(ctx, el.text, textX, textY, spacing, el, fontString);
            } else {
                drawStyledText(ctx, el, textX, textY);
            }
        } else {
            drawStyledText(ctx, el, textX, textY);
        }
        
        ctx.restore();
        console.log('[CanvasText] ✅ Text rendered:', el.text);
    }

    function getFontString(el) {
        // Build font string with all font properties
        var fontStyle = el.fontStyle || 'normal';
        var fontWeight = el.fontWeight || 'normal';
        var fontSize = el.fontSize || 16;
        var fontFamily = el.fontFamily || 'Arial';
        
        // If fontFamily is a Google Font or custom font, make sure it's properly quoted
        if (fontFamily.includes(' ') && !fontFamily.startsWith("'") && !fontFamily.startsWith('"')) {
            fontFamily = "'" + fontFamily + "'";
        }
        
        // Font string format: [font-style] [font-weight] [font-size] [font-family]
        return fontStyle + ' ' + fontWeight + ' ' + fontSize + 'px ' + fontFamily;
    }

    function drawStyledText(ctx, el, x, y) {
        // Apply text shadow
        CanvasBase.applyTextShadow(ctx, el);
        
        // Draw stroke if enabled
        if (el.textStroke) {
            ctx.strokeStyle = el.textStrokeColor || '#000000';
            ctx.lineWidth = el.textStrokeWidth || 1;
            ctx.strokeText(el.text, x, y);
        }
        
        // Draw fill text
        ctx.fillText(el.text, x, y);
        
        // Reset shadow
        CanvasBase.resetTextShadow(ctx);
        
        // Apply text decoration
        if (el.textDecoration === 'underline') {
            drawUnderline(ctx, el, x, y);
        }
    }

    function drawTextWithLetterSpacing(ctx, text, x, y, spacing, el, fontString) {
        var chars = text.split('');
        var currentX = x;
        
        // CRITICAL FIX: Adjust starting position for center/right alignment
        if (ctx.textAlign === 'center') {
            // Calculate total width first
            var totalWidth = 0;
            ctx.font = fontString; // Ensure font is set
            for (var j = 0; j < chars.length; j++) {
                totalWidth += ctx.measureText(chars[j]).width;
            }
            totalWidth += spacing * (chars.length - 1);
            currentX = x - (totalWidth / 2);
        } else if (ctx.textAlign === 'right') {
            // Calculate total width first
            var totalWidth = 0;
            ctx.font = fontString; // Ensure font is set
            for (var j = 0; j < chars.length; j++) {
                totalWidth += ctx.measureText(chars[j]).width;
            }
            totalWidth += spacing * (chars.length - 1);
            currentX = x - totalWidth;
        }
        
        // Temporarily set to left for individual character drawing
        var originalAlign = ctx.textAlign;
        ctx.textAlign = 'left';
        ctx.font = fontString; // Ensure font is set for each character
        
        CanvasBase.applyTextShadow(ctx, el);
        
        for (var i = 0; i < chars.length; i++) {
            if (el.textStroke) {
                ctx.strokeStyle = el.textStrokeColor || '#000000';
                ctx.lineWidth = el.textStrokeWidth || 1;
                ctx.strokeText(chars[i], currentX, y);
            }
            
            ctx.fillText(chars[i], currentX, y);
            
            var charWidth = ctx.measureText(chars[i]).width;
            currentX += charWidth + spacing;
        }
        
        CanvasBase.resetTextShadow(ctx);
        
        // Restore original alignment
        ctx.textAlign = originalAlign;
    }

    function drawUnderline(ctx, el, x, y) {
        var textWidth = ctx.measureText(el.text).width;
        var fontSize = el.fontSize || 16;
        
        // CRITICAL FIX: Adjust underline position based on baseline
        // Since we're using 'middle' baseline, underline goes below center
        var underlineY = y + (fontSize / 2) + 2;
        
        var startX = x;
        var endX = x + textWidth;
        
        // Adjust underline position based on alignment
        if (ctx.textAlign === 'center') {
            startX = x - (textWidth / 2);
            endX = x + (textWidth / 2);
        } else if (ctx.textAlign === 'right') {
            startX = x - textWidth;
            endX = x;
        }
        
        ctx.strokeStyle = el.color || '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, underlineY);
        ctx.lineTo(endX, underlineY);
        ctx.stroke();
    }

    return { render: render };
})();