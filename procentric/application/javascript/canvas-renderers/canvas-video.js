/**
 * ====================================================================
 * CANVAS VIDEO - LG PRO:CENTRIC TV
 *
 * ZOOM FIX:
 *  - Default objectFit is 'contain' → shows FULL video content, no cropping
 *  - wrapper background is TRANSPARENT → letterbox gaps show canvas bg,
 *    not an ugly black bar
 *  - video background is also TRANSPARENT for same reason
 *  - If JSON provides el.objectFit='cover' that is still respected
 *
 * Positioning:
 *  - el.x / el.y / el.width / el.height are already SCREEN PIXELS
 *    (CanvasScaler has scaled them) – do NOT multiply again
 *  - Wrapper <div> is position:absolute inside #our-hotel-container
 *    which is position:fixed top:0 left:0 → correct screen coordinates
 *  - overflow:hidden on wrapper clips video to element bounds
 *
 * LG TV specifics:
 *  - No crossOrigin on <video> → avoids MEDIA_ERR_NETWORK for CDN videos
 *  - No CSS transform → never breaks LG hardware video decoder
 *  - Manual cover/contain sizing (CSS object-fit unreliable on old webOS)
 *  - tryPlay() with muted-retry fallback
 *  - HLS (.m3u8) supported via <source type="application/x-mpegURL">
 * ====================================================================
 */

var CanvasVideo = (function () {
    'use strict';

    var activeVideos = [];

    /* ================================================================
       PUBLIC: render()
    ================================================================ */
    function render(ctx, el, canvas) {
        if (!el.src) {
            console.warn('[CanvasVideo] Missing src:', el.name || el.id);
            return;
        }

        console.log('[CanvasVideo] render – id:', el.name || el.id,
                    '| src:', el.src,
                    '| pos:', el.x, el.y,
                    '| size:', el.width, 'x', el.height);

        _drawPlaceholder(ctx, el);
        _createVideoOverlay(el);
    }

    /* ================================================================
       PLACEHOLDER – synchronous canvas draw while video loads
       Uses the canvas background color so it blends in, not black
    ================================================================ */
    function _drawPlaceholder(ctx, el) {
        /* Try to read the canvas background color from templateData */
        var bgColor = '#000000';
        try {
            var tj = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
            if (tj && tj.canvas && tj.canvas.background) {
                bgColor = tj.canvas.background;
            }
        } catch (e) { /* ignore */ }

        ctx.save();
        ctx.translate(el.x || 0, el.y || 0);
        if (el.rotation) {
            ctx.translate(el.width / 2, el.height / 2);
            ctx.rotate(el.rotation * Math.PI / 180);
            ctx.translate(-el.width / 2, -el.height / 2);
        }
        ctx.globalAlpha = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        if ((el.borderRadius || 0) > 0) {
            CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
            ctx.clip();
        }
        /* Use canvas bg color so placeholder blends with background */
        ctx.fillStyle = el.backgroundColor || bgColor;
        ctx.fillRect(0, 0, el.width, el.height);
        ctx.restore();
    }

    /* ================================================================
       VIDEO OVERLAY – DOM element sized to match el exactly
    ================================================================ */
    function _createVideoOverlay(el) {
        var canvas = document.getElementById('templateCanvas');
        if (!canvas) { console.error('[CanvasVideo] templateCanvas not found'); return; }
        var container = canvas.parentElement;
        if (!container) { console.error('[CanvasVideo] No parent container'); return; }

        /* Stable unique key */
        var _rawId   = (el.id   != null) ? String(el.id)   : '';
        var _rawName = (el.name != null) ? String(el.name) : '';
        var elementId = (_rawId + (_rawName ? '_' + _rawName : '')) || ('cvid-' + Date.now());

        /* Duplicate guard */
        for (var v = 0; v < activeVideos.length; v++) {
            if (activeVideos[v].elementId === elementId) {
                console.log('[CanvasVideo] Already exists:', elementId);
                return;
            }
        }

        /* ── geometry (already in screen px from CanvasScaler) ───── */
        var x      = Math.round(el.x      || 0);
        var y      = Math.round(el.y      || 0);
        var w      = Math.round(el.width  || 400);
        var h      = Math.round(el.height || 300);
        var radius = Math.round(el.borderRadius || 0);
        var opacity = typeof el.opacity !== 'undefined' ? el.opacity : 1;

        /* ── playback flags ─────────────────────────────────────── */
        var doAutoplay = (el.autoplay !== false) && (el.autoPlay !== false);
        var doLoop     = (el.loop     !== false) && (el.videoLoop !== false);
        var doMuted    = !(el.muted === false && el.videoMuted === false);

        /*
         * FIT MODE
         * ─────────────────────────────────────────────────────────
         * 'contain' (DEFAULT) → scales video to fit INSIDE the element
         *   box keeping aspect ratio. Full video content visible.
         *   Any remaining space is transparent (shows canvas bg).
         *   Use this when you want to see the entire video frame.
         *
         * 'cover' → scales video to FILL the element box, cropping
         *   edges. No empty space, but content at edges is cut off.
         *   This causes the "zoomed" look reported on TV.
         *
         * 'fill' → stretches to exact element size, may distort.
         *
         * The JSON element can override with el.objectFit.
         */
        var _fitMode = el.objectFit || el.videoSize || 'contain';

        console.log('[CanvasVideo] overlay:', elementId,
                    '| pos:', x + ',' + y, '| size:', w + 'x' + h,
                    '| fit:', _fitMode, '| autoplay:', doAutoplay,
                    '| loop:', doLoop, '| muted:', doMuted);

        /* ── WRAPPER DIV ────────────────────────────────────────── */
        /*
         * Sized exactly to the element's w × h.
         * overflow:hidden clips the video if it's larger (cover mode).
         * Background is TRANSPARENT so any letterbox gap (contain mode)
         * shows the canvas background colour behind it, not a black bar.
         */
        var wrap             = document.createElement('div');
        wrap.id              = 'canvas-video-wrap-' + elementId;
        wrap.className       = 'canvas-video-wrap';
        wrap.style.position  = 'absolute';
        wrap.style.left      = x + 'px';
        wrap.style.top       = y + 'px';
        wrap.style.width     = w + 'px';
        wrap.style.height    = h + 'px';
        wrap.style.overflow  = 'hidden';
        wrap.style.borderRadius = radius > 0 ? radius + 'px' : '0';
        wrap.style.zIndex    = String(typeof el.zIndex !== 'undefined' ? el.zIndex : 500);
        wrap.style.pointerEvents    = 'none';
        wrap.style.margin    = '0';
        wrap.style.padding   = '0';
        wrap.style.opacity   = String(opacity);
        /* TRANSPARENT – letterbox gaps show canvas bg, not black */
        wrap.style.backgroundColor = 'transparent';

        /* ── VIDEO ELEMENT ──────────────────────────────────────── */
        var video              = document.createElement('video');
        video.id               = 'canvas-video-el-' + elementId;
        video.className        = 'canvas-video-element';
        video.style.position   = 'absolute';
        video.style.top        = '0';
        video.style.left       = '0';
        video.style.width      = w + 'px';
        video.style.height     = h + 'px';
        video.style.margin     = '0';
        video.style.padding    = '0';
        video.style.border     = 'none';
        video.style.outline    = 'none';
        video.style.display    = 'block';
        /* TRANSPARENT background – same reason as wrapper */
        video.style.backgroundColor = 'transparent';
        video.style.pointerEvents   = 'none';
        video.style.transform       = 'none';
        video.style.webkitTransform = 'none';

        /* ── MANUAL FIT (CSS object-fit unreliable on old LG webOS) */
        /*
         * All measurements relative to WRAPPER local space (0,0)→(w,h).
         * The wrapper is already at the correct screen position.
         *
         * contain: video shrinks to fit inside w×h, centred.
         *   offX/offY are POSITIVE → video is inset from edges.
         *   Gap area is transparent (wrapper bg = transparent).
         *
         * cover: video grows to fill w×h, centred.
         *   offX/offY may be NEGATIVE → edges overflow wrapper.
         *   overflow:hidden clips the overflow → no black gaps,
         *   but edges of video content are cropped (zoom effect).
         */
        function _applyVideoFit() {
            var vw = video.videoWidth  || 0;
            var vh = video.videoHeight || 0;
            if (!vw || !vh) return;

            var scale, newW, newH, offX, offY;

            if (_fitMode === 'fill') {
                /* Stretch to exact element size – no bars, may distort */
                newW = w;
                newH = h;
                offX = 0;
                offY = 0;
            } else if (_fitMode === 'cover') {
                /* Fill box, crop edges */
                scale = Math.max(w / vw, h / vh);
                newW  = Math.round(vw * scale);
                newH  = Math.round(vh * scale);
                offX  = Math.round((w - newW) / 2);  /* negative = crops */
                offY  = Math.round((h - newH) / 2);
            } else {
                /* contain (default) – show full frame, transparent gaps */
                scale = Math.min(w / vw, h / vh);
                newW  = Math.round(vw * scale);
                newH  = Math.round(vh * scale);
                offX  = Math.round((w - newW) / 2);  /* positive = inset */
                offY  = Math.round((h - newH) / 2);
            }

            video.style.width  = newW + 'px';
            video.style.height = newH + 'px';
            video.style.left   = offX + 'px';
            video.style.top    = offY + 'px';

            console.log('[CanvasVideo] fit(' + _fitMode + ') ' + elementId +
                        ': src=' + vw + 'x' + vh +
                        ' box=' + w + 'x' + h +
                        ' → ' + newW + 'x' + newH +
                        ' @' + offX + ',' + offY);
        }

        /* ── VIDEO ATTRIBUTES ───────────────────────────────────── */
        video.loop        = doLoop;
        video.muted       = doMuted;
        video.autoplay    = doAutoplay;
        video.controls    = (el.controls === true || el.showControls === true);
        video.playsInline = true;
        video.preload     = 'auto';
        video.playbackRate = 1.0;
        try { video.disablePictureInPicture = true; } catch (e) {}
        video.setAttribute('playsinline',        'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay',   'deny');
        /* ⚠️ NO crossOrigin – causes MEDIA_ERR_NETWORK on LG TV for CDN videos */

        /* ── EVENT LISTENERS ────────────────────────────────────── */
        var started = false;

        video.addEventListener('loadedmetadata', function () {
            console.log('[CanvasVideo] metadata:', elementId,
                        video.videoWidth + 'x' + video.videoHeight,
                        '| dur:', (video.duration || 0).toFixed(1) + 's');
            _applyVideoFit();
        });

        video.addEventListener('playing', function () {
            _applyVideoFit(); /* re-apply – LG timing quirk */
            if (!started) { started = true; console.log('[CanvasVideo] ✅ playing:', elementId); }
        });

        video.addEventListener('canplay', function () {
            console.log('[CanvasVideo] canplay:', elementId);
        });

        video.addEventListener('ended', function () {
            if (doLoop) { video.currentTime = 0; _tryPlay(video, elementId); }
        });

        video.addEventListener('stalled', function () {
            console.warn('[CanvasVideo] stalled:', elementId);
            if (!started) {
                setTimeout(function () {
                    if (!started) { video.load(); _tryPlay(video, elementId); }
                }, 1500);
            }
        });

        video.addEventListener('suspend', function () {
            if (!started) {
                setTimeout(function () {
                    if (!started) { video.load(); _tryPlay(video, elementId); }
                }, 1500);
            }
        });

        video.addEventListener('error', function () {
            var code = video.error ? video.error.code : '?';
            console.error('[CanvasVideo] ❌ error', code, ':', elementId, '| src:', el.src);
            switch (code) {
                case 1: console.error('[CanvasVideo]   MEDIA_ERR_ABORTED'); break;
                case 2: console.error('[CanvasVideo]   MEDIA_ERR_NETWORK'); break;
                case 3: console.error('[CanvasVideo]   MEDIA_ERR_DECODE – use H.264 MP4'); break;
                case 4: console.error('[CanvasVideo]   MEDIA_ERR_SRC_NOT_SUPPORTED – use H.264 MP4'); break;
            }
        });

        /* ── SOURCE ─────────────────────────────────────────────── */
        var src   = el.src;
        var isHls = src.toLowerCase().indexOf('.m3u8') !== -1;

        if (isHls) {
            video.loop = false;
            var srcEl  = document.createElement('source');
            srcEl.src  = src;
            srcEl.type = 'application/x-mpegURL';
            video.appendChild(srcEl);
        } else {
            video.src = src;
        }

        /* ── ATTACH TO DOM ──────────────────────────────────────── */
        wrap.appendChild(video);
        /*
         * Do NOT touch container.style.position —
         * pages.js already sets #our-hotel-container to
         * position:fixed; top:0; left:0; width:100%; height:100%.
         * Our wrap (position:absolute) resolves against it correctly.
         */
        container.appendChild(wrap);

        console.log('[CanvasVideo] ✅ added:', elementId,
                    '@', x + ',' + y, '| size', w + 'x' + h);

        activeVideos.push({ video: video, wrapDiv: wrap, elementId: elementId });

        /* ── LOAD + PLAY ────────────────────────────────────────── */
        video.load();
        if (doAutoplay) {
            setTimeout(function () { _tryPlay(video, elementId); }, 500);
            setTimeout(function () {
                if (!started) { _tryPlay(video, elementId); }
            }, 1500);
        }

        /* ── HLS WATCHDOG ───────────────────────────────────────── */
        if (isHls) {
            var _hlsLast = -1, _hlsCount = 0, _hlsWd = null;
            function _stopWd() { if (_hlsWd) { clearInterval(_hlsWd); _hlsWd = null; } }
            video.addEventListener('playing', function () {
                if (_hlsWd) return;
                _hlsWd = setInterval(function () {
                    if (!video.parentNode) { _stopWd(); return; }
                    if (video.paused || video.ended) { _hlsCount = 0; _hlsLast = -1; return; }
                    if (isFinite(video.duration) && video.duration > 0) {
                        var cur = video.currentTime;
                        if (cur === _hlsLast) {
                            if (++_hlsCount >= 3) {
                                _hlsCount = 0; _hlsLast = -1;
                                video.currentTime = 0; _tryPlay(video, elementId);
                            }
                        } else { _hlsCount = 0; _hlsLast = cur; }
                    }
                }, 1000);
            });
            video.addEventListener('emptied', _stopWd);
        }
    }

    /* ================================================================
       _tryPlay – play() with muted fallback
    ================================================================ */
    function _tryPlay(video, elementId) {
        if (!video || !video.parentNode) return;
        var p = video.play();
        if (p && typeof p.then === 'function') {
            p.catch(function (err) {
                console.warn('[CanvasVideo] play rejected:', elementId, err.message);
                if (!video.muted) {
                    video.muted = true;
                    video.play().catch(function (e) {
                        console.error('[CanvasVideo] muted play failed:', elementId, e.message);
                    });
                }
            });
        }
    }

    /* ================================================================
       PUBLIC: cleanup()
    ================================================================ */
    function cleanup() {
        for (var i = 0; i < activeVideos.length; i++) {
            var vd = activeVideos[i];
            try { vd.video.pause(); vd.video.src = ''; vd.video.load(); } catch (e) {}
            if (vd.wrapDiv && vd.wrapDiv.parentNode) {
                vd.wrapDiv.parentNode.removeChild(vd.wrapDiv);
            }
        }
        activeVideos = [];
        var leftovers = document.querySelectorAll('.canvas-video-wrap');
        for (var j = 0; j < leftovers.length; j++) {
            if (leftovers[j].parentNode) leftovers[j].parentNode.removeChild(leftovers[j]);
        }
        console.log('[CanvasVideo] ✅ cleanup done');
    }

    /* ── control helpers ────────────────────────────────────────── */
    function _find(id) {
        for (var i = 0; i < activeVideos.length; i++) {
            if (activeVideos[i].elementId === id) return activeVideos[i].video;
        }
        return null;
    }
    function play(id)            { var v = _find(id); if (v) _tryPlay(v, id); }
    function pause(id)           { var v = _find(id); if (v) v.pause(); }
    function stop(id)            { var v = _find(id); if (v) { v.pause(); v.currentTime = 0; } }
    function setVolume(id, vol)  { var v = _find(id); if (v) v.volume = Math.max(0, Math.min(1, vol)); }
    function seek(id, t)         { var v = _find(id); if (v) v.currentTime = t; }

    return { render: render, cleanup: cleanup, play: play, pause: pause,
             stop: stop, setVolume: setVolume, seek: seek };
})();