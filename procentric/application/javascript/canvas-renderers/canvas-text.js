/**
 * ====================================================================
 * CANVAS TEXT ELEMENT RENDERER - FIXED FOR CANVAS SCALER
 * Properly handles text positioning with scaled elements
 *
 * Placeholder substitution rules:
 *   {{g_xxx}}  → resolved from Main.guestInfoData         (guest info)
 *   {{xxx}}    → resolved from Main.deviceProfile.property_detail  (property info)
 *              (any placeholder NOT starting with g_ is treated as property)
 * ====================================================================
 */
var CanvasText = (function() {
    'use strict';

    /**
     * Resolves a single placeholder value from the given data object.
     * Returns '' if key exists but is null/undefined.
     * Returns the original {{match}} string if key is not found.
     *
     * @param {string} match  - Full placeholder e.g. "{{g_name}}"
     * @param {string} key    - Extracted key e.g. "g_name"
     * @param {object} source - Data object to look up the key in
     * @param {string} label  - Source label for console logging
     * @returns {string}
     */
    function resolvePlaceholder(match, key, source, label) {
        if (!source) {
            console.warn('[CanvasText] ' + label + ' not available, cannot resolve "' + match + '"');
            return match;
        }
        if (key in source) {
            var value = source[key];
            if (value === null || value === undefined) {
                console.log('[CanvasText] ' + label + ' "' + key + '" is null → ""');
                return '';
            }
            console.log('[CanvasText] Resolved "' + match + '" from ' + label + ' => "' + value + '"');
            return String(value);
        }
        console.warn('[CanvasText] "' + key + '" not found in ' + label + ', leaving as-is');
        return match;
    }

    /**
     * Resolves all {{...}} placeholders in a text string.
     *
     * Two sources are consulted depending on the key prefix:
     *   - Keys starting with "g_"  → Main.guestInfoData
     *   - Any other key             → Main.deviceProfile.property_detail
     *
     * Null/undefined values become empty strings.
     * Unknown keys are left as the original placeholder.
     *
     * @param {string} text
     * @returns {string}
     */
    function resolveAllVariables(text) {
        if (!text || text.indexOf('{{') === -1) {
            return text; // Fast path: no placeholders present
        }

        // Fetch both data sources once (tolerates missing gracefully)
        var guestInfo = null;
        var propertyDetail = null;

        try {
            if (typeof Main !== 'undefined') {
                guestInfo      = Main.guestInfoData || null;
                propertyDetail = (Main.deviceProfile && Main.deviceProfile.property_detail)
                                 ? Main.deviceProfile.property_detail
                                 : null;
            }
        } catch (e) {
            console.warn('[CanvasText] Error accessing Main data sources:', e);
        }

        // Replace every {{key}} occurrence
        var resolved = text.replace(/\{\{([^}]+)\}\}/g, function(match, key) {
            key = key.trim(); // safety trim

            if (key.indexOf('g_') === 0) {
                // --- Guest info variable ---
                return resolvePlaceholder(match, key, guestInfo, 'guestInfoData');
            } else {
                // --- Property detail variable ---
                return resolvePlaceholder(match, key, propertyDetail, 'property_detail');
            }
        });

        return resolved;
    }

    function render(ctx, el) {
        if (!el.text) return;

        // --- VARIABLE SUBSTITUTION (guest + property) ---
        var renderEl = el;
        if (el.text.indexOf('{{') !== -1) {
            renderEl = {};
            for (var k in el) {
                if (el.hasOwnProperty(k)) renderEl[k] = el[k];
            }
            renderEl.text = resolveAllVariables(el.text);
        }
        // ------------------------------------

        console.log('[CanvasText] Rendering:', renderEl.name || renderEl.id, 'Size:', renderEl.width + 'x' + renderEl.height);

        // VIDEO BACKGROUND: render as DOM overlay so text is visible above video
        if (typeof CanvasVideoBgHelper !== 'undefined' && CanvasVideoBgHelper.isVideoBg()) {
            _renderAsDom(renderEl);
            return;
        }

        ctx.save();
        CanvasBase.applyTransformations(ctx, renderEl);

        // Background
        if (renderEl.backgroundType !== 'transparent' && renderEl.backgroundColor && renderEl.backgroundColor !== 'transparent') {
            CanvasBase.drawElementBackground(ctx, renderEl);
        }

        // Font setup
        var fontString = getFontString(renderEl);
        ctx.font = fontString;
        console.log('[CanvasText] Font string:', fontString);

        ctx.fillStyle = renderEl.color || '#000000';

        // Text alignment
        ctx.textAlign = renderEl.textAlign || 'left';

        // Use 'middle' baseline for proper vertical centering
        ctx.textBaseline = 'middle';

        // Calculate position with proper vertical centering
        var textX = 0;
        var textY = renderEl.height / 2;

        // Handle padding
        var paddingLeft  = renderEl.paddingLeft  || 0;
        var paddingRight = renderEl.paddingRight || 0;

        // Adjust X based on alignment
        if (renderEl.textAlign === 'center') {
            textX = renderEl.width / 2;
        } else if (renderEl.textAlign === 'right') {
            textX = renderEl.width - paddingRight;
        } else {
            textX = paddingLeft;
        }

        console.log('[CanvasText] Position: x=' + textX.toFixed(2) + ', y=' + textY.toFixed(2) +
                   ', align=' + ctx.textAlign + ', baseline=' + ctx.textBaseline +
                   ', fontFamily=' + renderEl.fontFamily);

        // Apply letter spacing if specified
        if (renderEl.letterSpacing) {
            var spacing = parseFloat(String(renderEl.letterSpacing).replace('px', ''));
            if (!isNaN(spacing) && spacing !== 0) {
                drawTextWithLetterSpacing(ctx, renderEl.text, textX, textY, spacing, renderEl, fontString);
            } else {
                drawStyledText(ctx, renderEl, textX, textY);
            }
        } else {
            drawStyledText(ctx, renderEl, textX, textY);
        }

        ctx.restore();
        console.log('[CanvasText] ✅ Text rendered:', renderEl.text);
    }

    function getFontString(el) {
        var fontStyle  = el.fontStyle  || 'normal';
        var fontWeight = el.fontWeight || 'normal';
        var fontSize   = el.fontSize   || 16;
        var fontFamily = el.fontFamily || 'Arial';

        if (fontFamily.indexOf(' ') !== -1 && fontFamily.charAt(0) !== "'" && fontFamily.charAt(0) !== '"') {
            fontFamily = "'" + fontFamily + "'";
        }

        return fontStyle + ' ' + fontWeight + ' ' + fontSize + 'px ' + fontFamily;
    }

    function drawStyledText(ctx, el, x, y) {
        CanvasBase.applyTextShadow(ctx, el);

        if (el.textStroke) {
            ctx.strokeStyle = el.textStrokeColor || '#000000';
            ctx.lineWidth   = el.textStrokeWidth  || 1;
            ctx.strokeText(el.text, x, y);
        }

        ctx.fillText(el.text, x, y);

        CanvasBase.resetTextShadow(ctx);

        if (el.textDecoration === 'underline') {
            drawUnderline(ctx, el, x, y);
        }
    }

    function drawTextWithLetterSpacing(ctx, text, x, y, spacing, el, fontString) {
        var chars    = text.split('');
        var currentX = x;

        if (ctx.textAlign === 'center') {
            var totalWidth = 0;
            ctx.font = fontString;
            for (var j = 0; j < chars.length; j++) {
                totalWidth += ctx.measureText(chars[j]).width;
            }
            totalWidth += spacing * (chars.length - 1);
            currentX = x - (totalWidth / 2);
        } else if (ctx.textAlign === 'right') {
            var totalWidth = 0;
            ctx.font = fontString;
            for (var j = 0; j < chars.length; j++) {
                totalWidth += ctx.measureText(chars[j]).width;
            }
            totalWidth += spacing * (chars.length - 1);
            currentX = x - totalWidth;
        }

        var originalAlign = ctx.textAlign;
        ctx.textAlign = 'left';
        ctx.font = fontString;

        CanvasBase.applyTextShadow(ctx, el);

        for (var i = 0; i < chars.length; i++) {
            if (el.textStroke) {
                ctx.strokeStyle = el.textStrokeColor || '#000000';
                ctx.lineWidth   = el.textStrokeWidth  || 1;
                ctx.strokeText(chars[i], currentX, y);
            }

            ctx.fillText(chars[i], currentX, y);

            var charWidth = ctx.measureText(chars[i]).width;
            currentX += charWidth + spacing;
        }

        CanvasBase.resetTextShadow(ctx);
        ctx.textAlign = originalAlign;
    }

    function drawUnderline(ctx, el, x, y) {
        var textWidth = ctx.measureText(el.text).width;
        var fontSize  = el.fontSize || 16;

        var underlineY = y + (fontSize / 2) + 2;

        var startX = x;
        var endX   = x + textWidth;

        if (ctx.textAlign === 'center') {
            startX = x - (textWidth / 2);
            endX   = x + (textWidth / 2);
        } else if (ctx.textAlign === 'right') {
            startX = x - textWidth;
            endX   = x;
        }

        ctx.strokeStyle = el.color || '#000000';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(startX, underlineY);
        ctx.lineTo(endX, underlineY);
        ctx.stroke();
    }


    /* ── DOM overlay for video background mode ─────────────────── */
    var _textDomOverlays = [];

    function _renderAsDom(el) {
        var container = (typeof CanvasVideoBgHelper !== 'undefined')
            ? CanvasVideoBgHelper.getContainer()
            : document.getElementById('our-hotel-container') || document.body;

        var elId = String(el.id || el.name || Date.now());
        // Remove stale overlay
        var stale = document.querySelectorAll('[data-canvas-text-id="' + elId + '"]');
        for (var s = 0; s < stale.length; s++) {
            if (stale[s].parentNode) stale[s].parentNode.removeChild(stale[s]);
        }

        var x       = Math.floor(el.x      || 0);
        var y       = Math.floor(el.y      || 0);
        var w       = Math.ceil(el.width   || 100);
        var h       = Math.ceil(el.height  || 40);
        var opacity = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        var zIndex  = (el.zIndex && el.zIndex !== 'auto') ? el.zIndex : 10;
        var fontSize   = el.fontSize   || 16;
        var fontFamily = el.fontFamily || 'Arial';
        var fontWeight = el.fontWeight || 'normal';
        var fontStyle  = el.fontStyle  || 'normal';
        var color      = el.color      || '#000000';
        var textAlign  = el.textAlign  || 'left';
        var paddingLeft  = el.paddingLeft  || 0;
        var paddingRight = el.paddingRight || 0;

        // Background
        if (el.backgroundType !== 'transparent' && el.backgroundColor &&
            el.backgroundColor !== 'transparent') {
            var bgDiv = document.createElement('div');
            bgDiv.setAttribute('data-canvas-text-id', elId + '-bg');
            bgDiv.style.cssText = 'position:absolute;pointer-events:none;margin:0;padding:0;';
            bgDiv.style.left            = x + 'px';
            bgDiv.style.top             = y + 'px';
            bgDiv.style.width           = w + 'px';
            bgDiv.style.height          = h + 'px';
            bgDiv.style.backgroundColor = el.backgroundColor;
            bgDiv.style.borderRadius    = (el.borderRadius || 0) + 'px';
            bgDiv.style.zIndex          = String(zIndex);
            bgDiv.setAttribute('data-canvas-text-id', elId);
            container.appendChild(bgDiv);
            _textDomOverlays.push(bgDiv);
        }

        var div = document.createElement('div');
        div.setAttribute('data-canvas-text-id', elId);
        div.style.cssText = 'position:absolute;pointer-events:none;margin:0;overflow:hidden;box-sizing:border-box;';
        div.style.left         = x + 'px';
        div.style.top          = y + 'px';
        div.style.width        = w + 'px';
        div.style.height       = h + 'px';
        div.style.opacity      = String(opacity);
        div.style.zIndex       = String(zIndex);
        div.style.display      = 'flex';
        div.style.alignItems   = 'center';  // vertical center
        div.style.paddingLeft  = paddingLeft + 'px';
        div.style.paddingRight = paddingRight + 'px';
        div.style.borderRadius = (el.borderRadius || 0) + 'px';

        if (el.rotation && el.rotation !== 0) {
            div.style.transform       = 'rotate(' + el.rotation + 'deg)';
            div.style.webkitTransform = 'rotate(' + el.rotation + 'deg)';
            div.style.transformOrigin = 'center center';
        }

        var span = document.createElement('span');
        span.textContent   = el.text;
        span.style.cssText = 'display:block;width:100%;margin:0;padding:0;white-space:pre-wrap;word-break:break-word;';
        span.style.fontSize   = fontSize + 'px';
        span.style.fontFamily = fontFamily;
        span.style.fontWeight = fontWeight;
        span.style.fontStyle  = fontStyle;
        span.style.color      = color;
        span.style.textAlign  = textAlign;
        span.style.lineHeight = '1.2';
        if (el.letterSpacing) {
            span.style.letterSpacing = el.letterSpacing;
        }
        if (el.textDecoration) {
            span.style.textDecoration = el.textDecoration;
        }
        if (el.textStroke && el.textStrokeColor) {
            span.style.webkitTextStroke = (el.textStrokeWidth || 1) + 'px ' + el.textStrokeColor;
        }
        if (el.textShadow) {
            var si = 0.7;
            span.style.textShadow = '2px 2px 4px rgba(0,0,0,' + si + ')';
        }

        if (!container.style.position || container.style.position === 'static') {
            container.style.position = 'relative';
        }

        div.appendChild(span);
        container.appendChild(div);
        _textDomOverlays.push(div);
        console.log('[CanvasText] DOM overlay created:', el.name || el.id);
    }

    function cleanup() {
        for (var i = 0; i < _textDomOverlays.length; i++) {
            if (_textDomOverlays[i] && _textDomOverlays[i].parentNode) {
                _textDomOverlays[i].parentNode.removeChild(_textDomOverlays[i]);
            }
        }
        _textDomOverlays = [];
    }

    return { render: render, cleanup: cleanup };
})();