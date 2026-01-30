/**
 * CANVAS TEXT ELEMENT RENDERER - CORRECTED
 */
var CanvasText = (function() {
    'use strict';

    function render(ctx, el) {
        if (!el.text) return;
        
        ctx.save();
        CanvasBase.applyTransformations(ctx, el);
        
        // Background
        if (el.backgroundType !== 'transparent' && el.backgroundColor && el.backgroundColor !== 'transparent') {
            CanvasBase.drawElementBackground(ctx, el);
        }
        
        // Font setup
        var fontString = CanvasBase.getFontString(el);
        ctx.font = fontString;
        ctx.fillStyle = el.color || '#000000';
        
        // CRITICAL: Proper text alignment
        ctx.textAlign = el.textAlign || 'left';
        ctx.textBaseline = 'top'; // Use 'top' for consistent positioning with y coordinate
        
        // Calculate position
        var textX = 0;
        var textY = 0;
        
        // Adjust X based on alignment
        if (el.textAlign === 'center') {
            textX = el.width / 2;
        } else if (el.textAlign === 'right') {
            textX = el.width;
        }
        
        // Apply letter spacing if specified
        if (el.letterSpacing) {
            var spacing = parseFloat(el.letterSpacing.replace('px', ''));
            if (!isNaN(spacing) && spacing !== 0) {
                drawTextWithLetterSpacing(ctx, el.text, textX, textY, spacing, el);
            } else {
                drawStyledText(ctx, el, textX, textY);
            }
        } else {
            drawStyledText(ctx, el, textX, textY);
        }
        
        ctx.restore();
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

    function drawTextWithLetterSpacing(ctx, text, x, y, spacing, el) {
        var chars = text.split('');
        var currentX = x;
        
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
    }

    function drawUnderline(ctx, el, x, y) {
        var textWidth = ctx.measureText(el.text).width;
        var fontSize = el.fontSize || 16;
        var underlineY = y + fontSize + 2;
        
        ctx.strokeStyle = el.color || '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, underlineY);
        ctx.lineTo(x + textWidth, underlineY);
        ctx.stroke();
    }

    return { render: render };
})();