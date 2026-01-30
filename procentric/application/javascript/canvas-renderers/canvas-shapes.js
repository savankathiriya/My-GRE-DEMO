/**
 * ====================================================================
 * CANVAS SHAPES RENDERER
 * Handles geometric shape elements: arrow, diamond, triangle, line,
 * circle, rectangle, pentagon, hexagon, star
 * ====================================================================
 */

var CanvasShapes = (function() {
    'use strict';

    /**
     * Main render function - routes to specific shape renderer
     */
    function render(ctx, el) {
        if (!el.type) {
            console.warn('[CanvasShapes] Element missing type');
            return;
        }

        var shapeType = el.type.toLowerCase();
        console.log('[CanvasShapes] Rendering:', shapeType, '-', el.name || el.id);

        ctx.save();

        // Apply transformations
        CanvasBase.applyTransformations(ctx, el);

        // Route to specific shape renderer
        switch (shapeType) {
            case 'arrow':
                renderArrow(ctx, el);
                break;
            case 'diamond':
                renderDiamond(ctx, el);
                break;
            case 'triangle':
                renderTriangle(ctx, el);
                break;
            case 'line':
                renderLine(ctx, el);
                break;
            case 'circle':
                renderCircle(ctx, el);
                break;
            case 'rectangle':
                renderRectangle(ctx, el);
                break;
            case 'pentagon':
                renderPentagon(ctx, el);
                break;
            case 'hexagon':
                renderHexagon(ctx, el);
                break;
            case 'star':
                renderStar(ctx, el);
                break;
            default:
                console.warn('[CanvasShapes] Unknown shape type:', shapeType);
        }

        ctx.restore();
        console.log('[CanvasShapes] ✅ Shape rendered:', shapeType);
    }

    /**
     * Render ARROW shape
     * Supports directions: up, down, left, right
     */
    function renderArrow(ctx, el) {
        var direction = el.direction || 'right';
        var headSize = el.arrowHeadSize || 0.3; // Fraction of width/height
        var bgColor = el.backgroundColor || '#f59e0b';
        var borderColor = el.borderColor || '#d97706';
        var borderWidth = el.borderWidth || 2;

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;

        ctx.beginPath();

        switch (direction) {
            case 'right':
                drawRightArrow(ctx, el.width, el.height, headSize);
                break;
            case 'left':
                drawLeftArrow(ctx, el.width, el.height, headSize);
                break;
            case 'up':
                drawUpArrow(ctx, el.width, el.height, headSize);
                break;
            case 'down':
                drawDownArrow(ctx, el.width, el.height, headSize);
                break;
            default:
                drawRightArrow(ctx, el.width, el.height, headSize);
        }

        ctx.fill();
        if (borderWidth > 0) {
            ctx.stroke();
        }
    }

    function drawRightArrow(ctx, width, height, headSize) {
        var shaftWidth = height * 0.4;
        var headWidth = width * headSize;
        var shaftHeight = (height - shaftWidth) / 2;

        ctx.moveTo(0, shaftHeight);
        ctx.lineTo(width - headWidth, shaftHeight);
        ctx.lineTo(width - headWidth, 0);
        ctx.lineTo(width, height / 2);
        ctx.lineTo(width - headWidth, height);
        ctx.lineTo(width - headWidth, height - shaftHeight);
        ctx.lineTo(0, height - shaftHeight);
        ctx.closePath();
    }

    function drawLeftArrow(ctx, width, height, headSize) {
        var shaftWidth = height * 0.4;
        var headWidth = width * headSize;
        var shaftHeight = (height - shaftWidth) / 2;

        ctx.moveTo(headWidth, shaftHeight);
        ctx.lineTo(width, shaftHeight);
        ctx.lineTo(width, height - shaftHeight);
        ctx.lineTo(headWidth, height - shaftHeight);
        ctx.lineTo(headWidth, height);
        ctx.lineTo(0, height / 2);
        ctx.lineTo(headWidth, 0);
        ctx.closePath();
    }

    function drawUpArrow(ctx, width, height, headSize) {
        var shaftWidth = width * 0.4;
        var headHeight = height * headSize;
        var shaftLeft = (width - shaftWidth) / 2;

        ctx.moveTo(shaftLeft, height);
        ctx.lineTo(shaftLeft, headHeight);
        ctx.lineTo(0, headHeight);
        ctx.lineTo(width / 2, 0);
        ctx.lineTo(width, headHeight);
        ctx.lineTo(width - shaftLeft, headHeight);
        ctx.lineTo(width - shaftLeft, height);
        ctx.closePath();
    }

    function drawDownArrow(ctx, width, height, headSize) {
        var shaftWidth = width * 0.4;
        var headHeight = height * headSize;
        var shaftLeft = (width - shaftWidth) / 2;

        ctx.moveTo(shaftLeft, 0);
        ctx.lineTo(shaftLeft, height - headHeight);
        ctx.lineTo(0, height - headHeight);
        ctx.lineTo(width / 2, height);
        ctx.lineTo(width, height - headHeight);
        ctx.lineTo(width - shaftLeft, height - headHeight);
        ctx.lineTo(width - shaftLeft, 0);
        ctx.closePath();
    }

    /**
     * Render DIAMOND shape
     */
    function renderDiamond(ctx, el) {
        var bgColor = el.backgroundColor || '#06b6d4';
        var borderColor = el.borderColor || '#0891b2';
        var borderWidth = el.borderWidth || 2;

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;

        ctx.beginPath();
        ctx.moveTo(el.width / 2, 0);
        ctx.lineTo(el.width, el.height / 2);
        ctx.lineTo(el.width / 2, el.height);
        ctx.lineTo(0, el.height / 2);
        ctx.closePath();

        ctx.fill();
        if (borderWidth > 0) {
            ctx.stroke();
        }
    }

    /**
     * Render TRIANGLE shape
     * Supports directions: up, down, left, right
     */
    function renderTriangle(ctx, el) {
        var direction = el.direction || 'up';
        var bgColor = el.backgroundColor || '#10b981';
        var borderColor = el.borderColor || '#059669';
        var borderWidth = el.borderWidth || 2;

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;

        ctx.beginPath();

        switch (direction) {
            case 'up':
                ctx.moveTo(el.width / 2, 0);
                ctx.lineTo(el.width, el.height);
                ctx.lineTo(0, el.height);
                break;
            case 'down':
                ctx.moveTo(0, 0);
                ctx.lineTo(el.width, 0);
                ctx.lineTo(el.width / 2, el.height);
                break;
            case 'left':
                ctx.moveTo(0, el.height / 2);
                ctx.lineTo(el.width, 0);
                ctx.lineTo(el.width, el.height);
                break;
            case 'right':
                ctx.moveTo(0, 0);
                ctx.lineTo(el.width, el.height / 2);
                ctx.lineTo(0, el.height);
                break;
            default:
                ctx.moveTo(el.width / 2, 0);
                ctx.lineTo(el.width, el.height);
                ctx.lineTo(0, el.height);
        }

        ctx.closePath();
        ctx.fill();
        if (borderWidth > 0) {
            ctx.stroke();
        }
    }

    /**
     * Render LINE shape
     */
    function renderLine(ctx, el) {
        var bgColor = el.backgroundColor || '#31dd53';
        var strokeOpacity = typeof el.strokeOpacity !== 'undefined' ? el.strokeOpacity : 1;

        ctx.fillStyle = bgColor;
        ctx.globalAlpha = strokeOpacity;

        // Line is rendered as a filled rectangle
        ctx.fillRect(0, 0, el.width, el.height);
    }

    /**
     * Render CIRCLE shape
     */
    function renderCircle(ctx, el) {
        var bgColor = el.backgroundColor || '#ef4444';
        var borderColor = el.borderColor || '#dc2626';
        var borderWidth = el.borderWidth || 2;

        var centerX = el.width / 2;
        var centerY = el.height / 2;
        var radius = Math.min(el.width, el.height) / 2;

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();

        if (borderWidth > 0) {
            ctx.stroke();
        }
    }

    /**
     * Render RECTANGLE shape
     */
    function renderRectangle(ctx, el) {
        var bgColor = el.backgroundColor || '#3b82f6';
        var borderColor = el.borderColor || '#1e40af';
        var borderWidth = el.borderWidth || 2;
        var borderRadius = el.borderRadius || 0;

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;

        if (borderRadius > 0) {
            CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, borderRadius);
            ctx.fill();
            if (borderWidth > 0) {
                ctx.stroke();
            }
        } else {
            ctx.fillRect(0, 0, el.width, el.height);
            if (borderWidth > 0) {
                ctx.strokeRect(0, 0, el.width, el.height);
            }
        }
    }

    /**
     * Render PENTAGON shape (5 sides)
     */
    function renderPentagon(ctx, el) {
        renderPolygon(ctx, el, 5);
    }

    /**
     * Render HEXAGON shape (6 sides)
     */
    function renderHexagon(ctx, el) {
        renderPolygon(ctx, el, 6);
    }

    /**
     * Render regular polygon (pentagon, hexagon, etc.)
     */
    function renderPolygon(ctx, el, sides) {
        var bgColor = el.backgroundColor || '#8b5cf6';
        var borderColor = el.borderColor || '#7c3aed';
        var borderWidth = el.borderWidth || 2;

        var centerX = el.width / 2;
        var centerY = el.height / 2;
        var radius = Math.min(el.width, el.height) / 2;

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;

        ctx.beginPath();
        for (var i = 0; i < sides; i++) {
            var angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            var x = centerX + radius * Math.cos(angle);
            var y = centerY + radius * Math.sin(angle);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();

        ctx.fill();
        if (borderWidth > 0) {
            ctx.stroke();
        }
    }

    /**
     * Render STAR shape
     */
    function renderStar(ctx, el) {
        var points = el.points || 5;
        var innerRadius = el.innerRadius || 0.5; // Fraction of outer radius
        var bgColor = el.backgroundColor || '#eab308';
        var borderColor = el.borderColor || '#ca8a04';
        var borderWidth = el.borderWidth || 2;

        var centerX = el.width / 2;
        var centerY = el.height / 2;
        var outerRadius = Math.min(el.width, el.height) / 2;
        var innerRadiusActual = outerRadius * innerRadius;

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;

        ctx.beginPath();
        for (var i = 0; i < points * 2; i++) {
            var angle = (i * Math.PI / points) - Math.PI / 2;
            var radius = i % 2 === 0 ? outerRadius : innerRadiusActual;
            var x = centerX + radius * Math.cos(angle);
            var y = centerY + radius * Math.sin(angle);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();

        ctx.fill();
        if (borderWidth > 0) {
            ctx.stroke();
        }
    }

    // Public API
    return {
        render: render
    };
})();

// Expose globally
if (typeof window !== 'undefined') {
    window.CanvasShapes = CanvasShapes;
}