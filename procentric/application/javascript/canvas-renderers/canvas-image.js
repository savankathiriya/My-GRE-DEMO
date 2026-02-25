/**
 * ====================================================================
 * CANVAS IMAGE ELEMENT RENDERER
 * Handles static image elements.
 *
 * VIDEO BACKGROUND MODE:
 *   When canvas.backgroundType === 'video', the canvas is transparent
 *   at z-index:2.  Pixels drawn ON the canvas sit above the video but
 *   canvas-drawn content can be unreliable due to async timing and
 *   compositor behaviour on LG webOS.
 *
 *   Fix: detect video-background mode and render image as a DOM <img>
 *   overlay (position:absolute, z-index:10) inside the canvas container,
 *   exactly the same approach used by CanvasGif.  The DOM overlay is
 *   always composited above the canvas by the browser, so it is always
 *   visible on top of the background video.
 *
 * NON-VIDEO MODE:
 *   Draw directly on the canvas via ctx (original behaviour, unchanged).
 * ====================================================================
 */

var CanvasImage = (function () {
    'use strict';

    var _domOverlays = [];

    function _isVideoBg() {
        try {
            var tj = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
            return !!(tj && tj.canvas && tj.canvas.backgroundType === 'video');
        } catch (e) { return false; }
    }

    /* ── PUBLIC: render() ─────────────────────────────────────────── */
    function render(ctx, el) {
        if (!el.src) {
            console.warn('[CanvasImage] Missing src:', el.name || el.id);
            return;
        }
        console.log('[CanvasImage] Rendering:', el.name || el.id, '| videoBg:', _isVideoBg());

        if (_isVideoBg()) {
            _renderAsDomOverlay(el);
        } else {
            _renderOnCanvas(ctx, el);
        }
    }

    /* ── DOM OVERLAY (video bg mode) ──────────────────────────────── */
    function _renderAsDomOverlay(el) {
        var canvas = document.getElementById('templateCanvas');
        if (!canvas) return;
        var container = canvas.parentElement;
        if (!container) return;

        _removeOverlayById(el.id || el.name);

        var x       = Math.floor(el.x      || 0);
        var y       = Math.floor(el.y      || 0);
        var w       = Math.ceil(el.width   || 0);
        var h       = Math.ceil(el.height  || 0);
        var radius  = el.borderRadius || 0;
        var opacity = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        var fit     = el.objectFit || 'contain';
        var zIndex  = (el.zIndex && el.zIndex !== 'auto') ? el.zIndex : 10;

        /* Optional background colour */
        if (el.hasBackgroundColor && el.backgroundColor && el.backgroundColor !== 'transparent') {
            var bgPad = el.backgroundPadding || 0;
            var bgDiv = document.createElement('div');
            bgDiv.setAttribute('data-canvas-image-bg', String(el.id || el.name));
            bgDiv.style.cssText = 'position:absolute;pointer-events:none;margin:0;padding:0;';
            bgDiv.style.left            = (x - bgPad) + 'px';
            bgDiv.style.top             = (y - bgPad) + 'px';
            bgDiv.style.width           = (w + bgPad * 2) + 'px';
            bgDiv.style.height          = (h + bgPad * 2) + 'px';
            bgDiv.style.backgroundColor = el.backgroundColor;
            bgDiv.style.borderRadius    = (el.backgroundRadius || 0) + 'px';
            bgDiv.style.zIndex          = String(zIndex);
            container.appendChild(bgDiv);
            _domOverlays.push(bgDiv);
        }

        /* Wrapper div (clips border-radius + controls opacity) */
        var wrap = document.createElement('div');
        wrap.setAttribute('data-canvas-image-id', String(el.id || el.name));
        wrap.style.cssText = 'position:absolute;overflow:hidden;pointer-events:none;margin:0;padding:0;';
        wrap.style.left         = x + 'px';
        wrap.style.top          = y + 'px';
        wrap.style.width        = w + 'px';
        wrap.style.height       = h + 'px';
        wrap.style.borderRadius = radius + 'px';
        wrap.style.opacity      = String(opacity);
        wrap.style.zIndex       = String(zIndex);
        if (el.rotation && el.rotation !== 0) {
            wrap.style.transform       = 'rotate(' + el.rotation + 'deg)';
            wrap.style.webkitTransform = 'rotate(' + el.rotation + 'deg)';
            wrap.style.transformOrigin = 'center center';
        }

        /* <img> inside wrapper */
        var img = document.createElement('img');
        img.src = el.src;
        img.style.cssText = 'position:absolute;top:0;left:0;display:block;margin:0;padding:0;border:none;pointer-events:none;';
        img.style.width        = w + 'px';
        img.style.height       = h + 'px';
        img.style.objectFit    = fit;
        img.style.transform       = 'translate3d(0,0,0)';
        img.style.webkitTransform = 'translate3d(0,0,0)';

        img.addEventListener('load',  function () {
            el._loadedImg = img;
            console.log('[CanvasImage] ✅ DOM overlay loaded:', el.name || el.id);
        });
        img.addEventListener('error', function () {
            console.error('[CanvasImage] ✗ DOM overlay failed:', el.name || el.id);
        });

        if (!container.style.position || container.style.position === 'static') {
            container.style.position = 'relative';
        }

        wrap.appendChild(img);
        container.appendChild(wrap);
        _domOverlays.push(wrap);

        console.log('[CanvasImage] DOM overlay at', x, y, w + 'x' + h, 'z:', zIndex);
    }

    /* ── CANVAS DRAW (non-video mode) — original behaviour ────────── */
    function _renderOnCanvas(ctx, el) {
        ctx.save();
        CanvasBase.applyTransformations(ctx, el);

        if (el.hasBackgroundColor && el.backgroundColor && el.backgroundColor !== 'transparent') {
            var pad = el.backgroundPadding || 0;
            var br  = el.backgroundRadius  || 0;
            ctx.fillStyle = el.backgroundColor;
            if (br > 0) {
                CanvasBase.roundRect(ctx, -pad, -pad, el.width + pad*2, el.height + pad*2, br);
                ctx.fill();
            } else {
                ctx.fillRect(-pad, -pad, el.width + pad*2, el.height + pad*2);
            }
        }
        ctx.restore();

        var snap = {
            x: el.x || 0, y: el.y || 0,
            width: el.width, height: el.height,
            rotation: el.rotation || 0,
            opacity: typeof el.opacity !== 'undefined' ? el.opacity : 1,
            borderRadius: el.borderRadius || 0,
            objectFit: el.objectFit || 'contain',
            name: el.name || el.id
        };

        CanvasBase.loadImage(el.src,
            function (img) {
                el._loadedImg = img;
                try {
                    ctx.save();
                    ctx.translate(snap.x, snap.y);
                    if (snap.rotation) {
                        ctx.translate(snap.width/2, snap.height/2);
                        ctx.rotate(snap.rotation * Math.PI / 180);
                        ctx.translate(-snap.width/2, -snap.height/2);
                    }
                    ctx.globalAlpha = snap.opacity;
                    if (snap.borderRadius > 0) {
                        CanvasBase.roundRect(ctx, 0, 0, snap.width, snap.height, snap.borderRadius);
                        ctx.clip();
                    }
                    CanvasBase.drawImageWithFit(ctx, img, 0, 0, snap.width, snap.height, snap.objectFit);
                    ctx.restore();
                    console.log('[CanvasImage] ✅ Canvas draw:', snap.name);
                } catch (e) {
                    console.warn('[CanvasImage] Canvas draw error:', e);
                }
            },
            function () {
                console.warn('[CanvasImage] ❌ Load failed:', snap.name);
            }
        );
    }

    /* ── Helpers ──────────────────────────────────────────────────── */
    function _removeOverlayById(id) {
        var attr = String(id);
        var sel  = '[data-canvas-image-id="' + attr + '"],[data-canvas-image-bg="' + attr + '"]';
        var els  = document.querySelectorAll(sel);
        for (var i = 0; i < els.length; i++) {
            if (els[i].parentNode) els[i].parentNode.removeChild(els[i]);
        }
    }

    /* ── PUBLIC: cleanup() ────────────────────────────────────────── */
    function cleanup() {
        console.log('[CanvasImage] cleanup() removing', _domOverlays.length, 'overlays');
        for (var i = 0; i < _domOverlays.length; i++) {
            if (_domOverlays[i] && _domOverlays[i].parentNode) {
                _domOverlays[i].parentNode.removeChild(_domOverlays[i]);
            }
        }
        _domOverlays = [];
    }

    return { render: render, cleanup: cleanup };

})();