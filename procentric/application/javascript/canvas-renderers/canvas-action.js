/**
 * ====================================================================
 * CANVAS ACTION ELEMENT RENDERER
 * âœ… backgroundVideo  â€” real <video> HTML overlay, loops, scaled correctly
 * âœ… actionIcon       â€” icon drawn on canvas with iconPosition support
 * âœ… Focus            â€” CSS overlay, NO canvas redraw, NO blinking
 *
 * Render Z-order for a video card:
 *   1. Dark placeholder drawn on canvas  (immediate, no flicker)
 *   2. <video> HTML element              (absolute, z-index 500)
 *   3. Icon + text on canvas             (drawn over placeholder; visible over video via DOM order)
 *   4. Focus border CSS overlay          (z-index 1000)
 *
 * NOTE: By the time render() is called, el.x / el.y / el.width / el.height
 * are already in SCREEN PIXELS â€” CanvasScaler has already scaled them.
 * Do NOT multiply by any scale factor here.
 * ====================================================================
 */

var CanvasAction = (function () {
    'use strict';

    /* â”€â”€ internal state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    var actionElements = [];
    var focusedIndex   = -1;
    var focusOverlays  = {};   // { elementId â†’ <div> }
    var activeVideos   = [];   // [{ video:<video>, elementId, wrapDiv:<div> }]
    var _actionDomOverlays = []; // DOM card overlays for video-bg mode

    /* Helper: is a video canvas background currently active? */
    function _isVideoBg() {
        try {
            var tj = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
            return !!(tj && tj.canvas && tj.canvas.backgroundType === 'video');
        } catch (e) { return false; }
    }

    /* ================================================================
       PUBLIC: render()
       Called by CanvasRenderer for every action / button / card element
    ================================================================ */
    function render(ctx, el) {
        console.log('[CanvasAction] Rendering:', el.name || el.id,
                    '| displayMode:', el.displayMode,
                    '| pos:', el.x, el.y, '| size:', el.width, 'x', el.height);

        /* â”€â”€ which background mode? â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        /* Normalise backgroundVideo URL -- add https:// if protocol missing */
        var bgVideoSrc = '';
        if (el.backgroundVideo && el.backgroundVideo.trim() !== '') {
            bgVideoSrc = el.backgroundVideo.trim();
            if (bgVideoSrc.indexOf('http://') !== 0 && bgVideoSrc.indexOf('https://') !== 0) {
                bgVideoSrc = 'https://' + bgVideoSrc;
            }
        }
        /* Both MP4 and HLS (.m3u8) use the HTML <video> overlay approach.
           LG webOS <video> natively decodes HLS -- same approach gives correct
           sizing, border-radius clipping and seamless loop for both types. */
        var isHlsStream = bgVideoSrc !== '' && bgVideoSrc.toLowerCase().indexOf('.m3u8') !== -1;
        var hasVideo    = bgVideoSrc !== '' && el.displayMode === 'video'; /* MP4 + HLS both */
        var hasHlsVideo = false;  /* never use hcap hole-punch for canvas cards */
        var hasImage    = !hasVideo && el.backgroundImage && el.backgroundImage.length > 0;
        var hasImgData  = !hasVideo && !hasImage && el.imageData && el.imageData.trim() !== '';
        var hasAnyMedia = hasVideo || hasImage || hasImgData;

        /* â”€â”€ Step 1 : draw solid background on canvas (no media only) */
        ctx.save();
        CanvasBase.applyTransformations(ctx, el);

        if (!hasAnyMedia && el.backgroundColor) {
            ctx.fillStyle = el.backgroundColor;
            if (el.borderRadius > 0) {
                CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
                ctx.fill();
                /* re-clip for vignette */
                if (el.vignetteEffect && el.vignetteEffect !== 'none') {
                    CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
                    ctx.clip();
                }
            } else {
                ctx.fillRect(0, 0, el.width, el.height);
            }
            /* apply vignette over solid background */
            if (el.vignetteEffect && el.vignetteEffect !== 'none') {
                CanvasBase.applyVignette(ctx, el.width, el.height,
                                         el.vignetteEffect, el.vignetteIntensity || 1);
            }
        }

        /* â”€â”€ Step 2 : border â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        var bw = el.borderWidth > 0 ? el.borderWidth : 0;
        var bc = el.borderColor || '#d9d9d9';
        if (bw > 0) {
            ctx.strokeStyle = bc;
            ctx.lineWidth   = bw;
            if (el.borderRadius > 0) {
                CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(0, 0, el.width, el.height);
            }
        }
        ctx.restore();

        /* â”€â”€ Step 3 : background media â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        if (hasHlsVideo) {
            /* HLS (.m3u8): play via Navigation.playSelectedChannel (hcap.Media).
               hcap.Media renders in the LG hardware video layer which sits BELOW
               the browser compositor. To make it visible we must:
               1. Make body + container + canvas CSS background transparent
               2. Punch a pixel-transparent hole in the canvas at this card's
                  exact position using destination-out compositing so the
                  hardware video layer shows through from underneath
               3. Call Navigation.playSelectedChannel to start HCAP playback
               4. Re-draw icon+text AFTER punching the hole so they are visible  */
            console.log('[CanvasAction] HLS card: punching hole + calling Navigation.playSelectedChannel');

            /* Step 1 -- make entire stack transparent */
            document.body.style.background = 'none';
            var _hlsCont = document.getElementById('our-hotel-container');
            if (_hlsCont) _hlsCont.style.background = 'none';
            var _hlsCanvas = document.getElementById('templateCanvas');
            if (_hlsCanvas) _hlsCanvas.style.background = 'transparent';

            /* Step 2 -- punch a transparent hole at this card's pixel position */
            punchHoleInCanvas(ctx, el);

            /* Step 3 -- start HCAP playback using the same function lgLgDemoPlayers uses */
            if (typeof Navigation !== 'undefined' && typeof Navigation.playSelectedChannel === 'function') {
                Navigation.playSelectedChannel(bgVideoSrc);
            } else {
                console.error('[CanvasAction] Navigation.playSelectedChannel not found');
            }

            /* Step 4 -- draw icon + text on top of the hole (they appear over the video) */
            drawActionIcon(ctx, el, function () { drawActionText(ctx, el); });

        } else if (hasVideo) {
            /* Non-HLS video (mp4) -- HTML <video> overlay, unchanged */
            drawVideoBgPlaceholder(ctx, el);
            createBackgroundVideo(el);
            drawActionIcon(ctx, el, function () {
                drawActionText(ctx, el);
            });

        } else if (hasImage) {
            var src = Array.isArray(el.backgroundImage)
                ? el.backgroundImage[0] : el.backgroundImage;
            if (_isVideoBg()) {
                createActionDomOverlay(el, src);
            } else {
                loadAndDrawActionBackground(ctx, el, src, 'url');
            }

        } else if (hasImgData) {
            var src = el.imageData.indexOf('data:') === 0
                ? el.imageData
                : 'data:image/png;base64,' + el.imageData;
            if (_isVideoBg()) {
                createActionDomOverlay(el, src);
            } else {
                loadAndDrawActionBackground(ctx, el, src, 'base64');
            }

        } else {
            /* â"€â"€ button / none displayMode â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
               When canvas.backgroundType === 'video' the canvas is drawn
               underneath the full-screen video element and any pixels drawn
               onto the canvas are hidden behind it.  Use a DOM overlay div
               (same approach as image cards in video-bg mode) so the button
               renders on top of the background video.                       */
            if (_isVideoBg()) {
                createActionButtonDomOverlay(el);
            } else {
                drawActionIcon(ctx, el, function () {
                    drawActionText(ctx, el);
                });
            }
        }

        /* â”€â”€ Step 4 : CSS focus overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        createFocusOverlay(el);
    }

    /* ================================================================
       BACKGROUND VIDEO
    ================================================================ */

    /**
     * Draw a solid placeholder on the canvas immediately so the card
     * area is not transparent while the video loads.
     */
    function drawVideoBgPlaceholder(ctx, el) {
        ctx.save();
        ctx.translate(el.x || 0, el.y || 0);
        if (el.rotation) {
            ctx.translate(el.width / 2, el.height / 2);
            ctx.rotate(el.rotation * Math.PI / 180);
            ctx.translate(-el.width / 2, -el.height / 2);
        }
        ctx.globalAlpha = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        if (el.borderRadius > 0) {
            CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
            ctx.clip();
        }
        ctx.fillStyle = el.backgroundColor || '#111111';
        ctx.fillRect(0, 0, el.width, el.height);
        ctx.restore();
    }

    /**
     * âœ… THE REAL VIDEO FIX
     *
     * Creates an absolutely-positioned <div> wrapper that clips to the
     * card's border-radius, and a <video> inside it.
     *
     * Key decisions:
     *  â€¢ Position / size come from el.x, el.y, el.width, el.height which
     *    are ALREADY in screen-pixels (scaled by CanvasScaler).
     *  â€¢ The container is the canvas's parentElement (#our-hotel-container),
     *    which is position:fixed top:0 left:0 width:100% height:100%.
     *    That means the pixel values map directly to screen coordinates.
     *  â€¢ loop attribute + 'ended' listener both ensure seamless replay.
     *  â€¢ We do NOT use CSS transforms (breaks LG TV hardware decoder).
     *  â€¢ pointerEvents:none so remote-control focus is never captured.
     */
    /**
     * punchHoleInCanvas()
     * Uses globalCompositeOperation='destination-out' to erase all pixels
     * inside the card's bounding box to fully transparent (alpha=0).
     * Because the canvas CSS background is 'transparent' and the container/body
     * backgrounds are 'none', this creates a real see-through window that
     * exposes the HCAP hardware video layer underneath.
     * Border-radius clipping is applied so the hole matches the card shape.
     */
    function punchHoleInCanvas(ctx, el) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);  /* reset any existing transform */
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        var x = Math.round(el.x || 0);
        var y = Math.round(el.y || 0);
        var w = Math.round(el.width  || 0);
        var h = Math.round(el.height || 0);
        var r = Math.round(el.borderRadius || 0);
        if (r > 0) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(x, y, w, h);
        }
        ctx.globalCompositeOperation = 'source-over';  /* restore default */
        ctx.restore();
        console.log('[CanvasAction] Hole punched at:', x, y, w, 'x', h);
    }

    function createBackgroundVideo(el) {
        var canvas = document.getElementById('templateCanvas');
        if (!canvas) {
            console.error('[CanvasAction] templateCanvas not found');
            return;
        }
        var container = canvas.parentElement;
        if (!container) {
            console.error('[CanvasAction] canvas has no parent');
            return;
        }

        /* Build collision-safe key: numeric id may lose precision on old LG
           webOS V8 engines; duplicated _copy names also collide. Combine both. */
        var _rawId  = (el.id  !== undefined && el.id  !== null) ? String(el.id)  : '';
        var _rawName = (el.name !== undefined && el.name !== null) ? String(el.name) : '';
        var elementId = _rawId + (_rawName ? ('_' + _rawName) : '') || ('vid-' + Date.now());

        /* guard â€” don't duplicate */
        for (var v = 0; v < activeVideos.length; v++) {
            if (activeVideos[v].elementId === elementId) {
                console.log('[CanvasAction] video already exists for:', elementId);
                return;
            }
        }

        var src    = el.backgroundVideo;
        var x      = Math.round(el.x      || 0);
        var y      = Math.round(el.y      || 0);
        var w      = Math.round(el.width  || 300);
        var h      = Math.round(el.height || 200);
        var radius = Math.round(el.borderRadius || 0);
        var opacity = typeof el.opacity !== 'undefined' ? el.opacity : 1;

        console.log('[CanvasAction] Creating video:', elementId);
        console.log('[CanvasAction]   src:', src);
        console.log('[CanvasAction]   pos (screen px):', x, y, '|', w, 'x', h);

        /* â”€â”€ wrapper div (clips to border-radius) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        var wrap             = document.createElement('div');
        wrap.id              = 'video-wrap-' + elementId;
        wrap.style.position  = 'absolute';
        wrap.style.left      = x + 'px';
        wrap.style.top       = y + 'px';
        wrap.style.width     = w + 'px';
        wrap.style.height    = h + 'px';
        wrap.style.overflow  = 'hidden';
        wrap.style.borderRadius = radius + 'px';
        wrap.style.zIndex    = '500';          /* above canvas, below focus overlay */
        wrap.style.pointerEvents = 'none';
        wrap.style.margin    = '0';
        wrap.style.padding   = '0';
        wrap.style.opacity   = String(opacity);

        /* â”€â”€ <video> element â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        var video              = document.createElement('video');
        video.id               = 'video-el-' + elementId;
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
        video.style.backgroundColor = 'transparent';
        video.style.pointerEvents   = 'none';

        /* objectFit is NOT reliably supported on older LG webOS browsers.
           We compute cover/contain sizing manually in loadedmetadata and
           apply exact pixel dimensions + centered offset on the <video>.
           This works correctly on ALL LG webOS versions.                  */
        var _fitMode = (el.videoSize || 'cover');

        function _applyVideoFit() {
            var vw = video.videoWidth  || 0;
            var vh = video.videoHeight || 0;
            if (!vw || !vh) return;
            /* scale to fill box (cover) or fit inside box (contain) */
            var scale = (_fitMode === 'contain')
                ? Math.min(w / vw, h / vh)   /* contain */
                : Math.max(w / vw, h / vh);  /* cover   */
            var newW = Math.round(vw * scale);
            var newH = Math.round(vh * scale);
            /* centre: negative offsets = crop edges (cover mode) */
            var offX = Math.round((w - newW) / 2);
            var offY = Math.round((h - newH) / 2);
            video.style.width  = newW + 'px';
            video.style.height = newH + 'px';
            video.style.left   = offX + 'px';
            video.style.top    = offY + 'px';
            console.log('[CanvasAction] _applyVideoFit (' + _fitMode + '):', elementId,
                'src=' + vw + 'x' + vh + ' -> ' + newW + 'x' + newH + ' @' + offX + ',' + offY);
        }

        /* NO transform â€” breaks LG TV hardware decoder */
        video.style.transform       = 'none';
        video.style.webkitTransform = 'none';

        /* video attributes */
        video.loop        = (el.videoLoop     !== false);   /* âœ… seamless loop */
        video.muted       = (el.videoMuted    !== false);   /* muted required for autoplay */
        video.autoplay    = (el.videoAutoplay !== false);
        video.controls    = false;
        video.playsInline = true;
        video.preload     = 'auto';
        video.playbackRate = 1.0;
        video.disablePictureInPicture = true;

        /* LG webOS required */
        video.setAttribute('playsinline',        'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay',   'deny');

        /* Do NOT set crossOrigin on <video> elements.
           On LG Pro:Centric, crossOrigin='anonymous' forces a CORS preflight
           that many CDNs reject for the TV user-agent -> MEDIA_ERR_NETWORK.
           We never readback video pixels to canvas so it is not needed. */

        /* â”€â”€ event listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        var started = false;

        video.addEventListener('canplay', function () {
            console.log('[CanvasAction] canplay:', elementId);
        });

        video.addEventListener('playing', function () {
            if (!started) {
                started = true;
                console.log('[CanvasAction] âœ… VIDEO PLAYING:', elementId);
            }
        });

        /**
         * âœ… 'ended' listener â€” replay when video finishes.
         * This is a belt-and-suspenders fallback alongside loop=true.
         * On some LG TV firmware versions loop attribute is ignored for
         * cross-origin videos; explicit replay handles that case.
         */
        video.addEventListener('ended', function () {
            console.log('[CanvasAction] Video ended, replaying:', elementId);
            video.currentTime = 0;
            tryPlay(video, elementId);
        });

        video.addEventListener('loadedmetadata', function () {
            console.log('[CanvasAction] Metadata loaded:', elementId,
                        video.videoWidth + 'x' + video.videoHeight);
            /* Apply manual cover/contain sizing now that dimensions are known */
            _applyVideoFit();
        });

        /* Also re-apply on 'playing' in case loadedmetadata fired before
           the video element was fully sized in the DOM (LG webOS timing) */
        video.addEventListener('playing', function () {
            _applyVideoFit();
        });

        video.addEventListener('stalled', function () {
            console.warn('[CanvasAction] Video stalled:', elementId);
        });

        video.addEventListener('suspend', function () {
            console.warn('[CanvasAction] Video suspended:', elementId);
            /* retry loading if not started yet */
            if (!started) {
                setTimeout(function () {
                    if (!started) {
                        console.log('[CanvasAction] Retrying after suspend:', elementId);
                        video.load();
                        tryPlay(video, elementId);
                    }
                }, 1500);
            }
        });

        video.addEventListener('error', function () {
            var code = video.error ? video.error.code : '?';
            console.error('[CanvasAction] âŒ Video error code', code, 'for:', elementId);
            console.error('[CanvasAction]   src:', src);
            switch (code) {
                case 1: console.error('[CanvasAction]   MEDIA_ERR_ABORTED'); break;
                case 2: console.error('[CanvasAction]   MEDIA_ERR_NETWORK â€” check URL / CORS'); break;
                case 3: console.error('[CanvasAction]   MEDIA_ERR_DECODE  â€” wrong codec; use H.264 MP4'); break;
                case 4: console.error('[CanvasAction]   MEDIA_ERR_SRC_NOT_SUPPORTED â€” use H.264 MP4'); break;
            }
        });

        /* â”€â”€ assemble and attach â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        /* For HLS (.m3u8) use a <source> element with the correct MIME type
           so LG webOS picks the native HLS demuxer. Also disable loop for HLS
           since 'ended' + watchdog handle replay (loop attr unreliable for HLS). */
        var _isHls = src.toLowerCase().indexOf('.m3u8') !== -1;
        if (_isHls) {
            video.loop = false;
            var _hlsSrc = document.createElement('source');
            _hlsSrc.src  = src;
            _hlsSrc.type = 'application/x-mpegURL';
            video.appendChild(_hlsSrc);
            console.log('[CanvasAction] HLS <source> set:', src);
        } else {
            video.src = src;
        }
        wrap.appendChild(video);

        /* Make the container exactly co-incident with the canvas so that
           position:absolute children (video wraps) land at the correct
           screen coordinates.
           The canvas is position:fixed top:0 left:0 and fills the screen.
           The container must be the same -- NOT position:relative which
           leaves it in normal flow and may have a non-zero top-left on LG TV. */
        container.style.position = 'fixed';
        container.style.top      = '0';
        container.style.left     = '0';
        container.style.width    = '100%';
        container.style.height   = '100%';
        container.style.margin   = '0';
        container.style.padding  = '0';
        container.style.overflow = 'hidden';

        container.appendChild(wrap);
        console.log('[CanvasAction] âœ… Video wrap added to DOM:', elementId);

        /* track for cleanup */
        activeVideos.push({ video: video, wrapDiv: wrap, elementId: elementId });

        /* â”€â”€ force load then play â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        video.load();

        if (el.videoAutoplay !== false) {
            /*
             * LG TV hardware decoder needs ~500 ms after load() before
             * play() will succeed.  We try at 500 ms and again at 1500 ms.
             */
            setTimeout(function () { tryPlay(video, elementId); }, 500);
            setTimeout(function () {
                if (!started) {
                    console.log('[CanvasAction] Second play attempt:', elementId);
                    tryPlay(video, elementId);
                }
            }, 1500);
        }

        /* HLS seamless-loop watchdog: some LG firmware does not fire 'ended'
           for HLS/VOD streams. Poll currentTime every second -- if it stops
           advancing while playing and duration is finite, restart from 0.
           Live streams (duration===Infinity) are never restarted.           */
        if (_isHls) {
            var _hlsLastTime   = -1;
            var _hlsStallCount = 0;
            var _hlsWatchdog   = null;

            function _stopHlsWatchdog() {
                if (_hlsWatchdog) { clearInterval(_hlsWatchdog); _hlsWatchdog = null; }
            }

            video.addEventListener('playing', function () {
                if (_hlsWatchdog) return;
                _hlsWatchdog = setInterval(function () {
                    if (!video.parentNode) { _stopHlsWatchdog(); return; }
                    if (video.paused || video.ended) { _hlsStallCount = 0; _hlsLastTime = -1; return; }
                    if (isFinite(video.duration) && video.duration > 0) {
                        var cur = video.currentTime;
                        if (cur === _hlsLastTime) {
                            if (++_hlsStallCount >= 3) {
                                _hlsStallCount = 0; _hlsLastTime = -1;
                                console.log('[CanvasAction] HLS watchdog restart:', elementId);
                                video.currentTime = 0;
                                tryPlay(video, elementId);
                            }
                        } else { _hlsStallCount = 0; _hlsLastTime = cur; }
                    }
                }, 1000);
                console.log('[CanvasAction] HLS watchdog started:', elementId);
            });
            video.addEventListener('emptied', _stopHlsWatchdog);
        }
    }

    /**
     * Attempt video.play(); if blocked, retry muted.
     */
    function tryPlay(video, elementId) {
        if (!video || !video.parentNode) return;   /* element removed (cleanup) */
        console.log('[CanvasAction] tryPlay():', elementId,
                    '| readyState:', video.readyState,
                    '| networkState:', video.networkState);

        var p = video.play();
        if (p !== undefined) {
            p.then(function () {
                console.log('[CanvasAction] play() resolved:', elementId);
            }).catch(function (err) {
                console.warn('[CanvasAction] play() rejected:', elementId, err.message);
                if (!video.muted) {
                    console.log('[CanvasAction] Retrying muted:', elementId);
                    video.muted = true;
                    video.play().catch(function (e) {
                        console.error('[CanvasAction] Muted play also failed:', elementId, e.message);
                    });
                }
            });
        }
    }

    /* â”€â”€ stop / remove all active video overlays â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    function cleanupVideos() {
        console.log('[CanvasAction] Removing', activeVideos.length, 'video overlay(s)');
        for (var i = 0; i < activeVideos.length; i++) {
            var vd = activeVideos[i];
            try {
                vd.video.pause();
                vd.video.src   = '';
                vd.video.load();
            } catch (e) { /* ignore */ }
            if (vd.wrapDiv && vd.wrapDiv.parentNode) {
                vd.wrapDiv.parentNode.removeChild(vd.wrapDiv);
            }
        }
        activeVideos = [];
    }

    /* ================================================================
       ACTION ICON  (drawn on canvas)
    ================================================================ */

    /**
     * Draw el.actionIcon on the canvas card.
     * iconPosition: 'top' | 'bottom' | 'left' | 'right' | 'center'
     * Always calls onComplete() whether icon loaded or not.
     */
    function drawActionIcon(ctx, el, onComplete) {
        var iconSrc = el.actionIcon;
        if (!iconSrc || iconSrc.trim() === '') {
            if (onComplete) onComplete();
            return;
        }

        var img = new Image();
        if (iconSrc.indexOf('http') === 0) img.crossOrigin = 'anonymous';

        var snap = {
            x:           el.x      || 0,
            y:           el.y      || 0,
            width:       el.width,
            height:      el.height,
            rotation:    el.rotation    || 0,
            opacity:     typeof el.opacity !== 'undefined' ? el.opacity : 1,
            iconSize:    el.iconSize    || 60,
            iconPos:     el.iconPosition || 'top',
            iconSpacing: el.iconSpacing  || 12,
            name:        el.name || el.id
        };

        img.onload = function () {
            try {
                ctx.save();
                ctx.translate(snap.x, snap.y);
                if (snap.rotation) {
                    ctx.translate(snap.width / 2, snap.height / 2);
                    ctx.rotate(snap.rotation * Math.PI / 180);
                    ctx.translate(-snap.width / 2, -snap.height / 2);
                }
                ctx.globalAlpha = snap.opacity;

                var iw = snap.iconSize, ih = snap.iconSize, pad = snap.iconSpacing;
                var ix, iy;
                switch (snap.iconPos) {
                    case 'top':    ix = (snap.width - iw) / 2;  iy = pad;                          break;
                    case 'bottom': ix = (snap.width - iw) / 2;  iy = snap.height - ih - pad;       break;
                    case 'left':   ix = pad;                     iy = (snap.height - ih) / 2;       break;
                    case 'right':  ix = snap.width - iw - pad;   iy = (snap.height - ih) / 2;       break;
                    default:       ix = (snap.width - iw) / 2;  iy = (snap.height - ih) / 2;       break;
                }
                ctx.drawImage(img, ix, iy, iw, ih);
                ctx.restore();
                console.log('[CanvasAction] âœ… Icon drawn:', snap.name, '| pos:', snap.iconPos);
            } catch (e) {
                console.warn('[CanvasAction] Icon draw error:', snap.name, e);
            }
            if (onComplete) onComplete();
        };

        img.onerror = function () {
            console.warn('[CanvasAction] Icon load failed:', snap.name);
            if (onComplete) onComplete();
        };

        img.src = iconSrc;
    }

    /* ================================================================
       ACTION TEXT  (icon-aware vertical positioning)
    ================================================================ */

    function drawActionText(ctx, el) {
        if (!el.text || el.showTextOverlay === false) return;

        ctx.save();
        ctx.translate(el.x || 0, el.y || 0);
        if (el.rotation) {
            ctx.translate(el.width / 2, el.height / 2);
            ctx.rotate(el.rotation * Math.PI / 180);
            ctx.translate(-el.width / 2, -el.height / 2);
        }
        ctx.globalAlpha  = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        var fontSize      = el.fontSize   || 22;
        ctx.font          = fontSize + 'px ' + (el.fontFamily || 'Arial');
        ctx.fillStyle     = el.color      || '#ffffff';
        var textAlign     = el.textAlign  || 'center';
        ctx.textAlign     = textAlign;
        ctx.textBaseline  = 'middle';

        /* horizontal — padding keeps text away from edge */
        var hPad = 12;
        var textX;
        if (textAlign === 'left') {
            textX = hPad;
        } else if (textAlign === 'right') {
            textX = el.width - hPad;
        } else {
            textX = el.width / 2;   /* center */
        }

        /* vertical â€” shift away from icon when present */
        var hasIcon     = el.actionIcon && el.actionIcon.trim() !== '';
        var iconSize    = el.iconSize    || 60;
        var iconSpacing = el.iconSpacing || 12;
        var iconPos     = el.iconPosition || 'top';
        var textY;

        if (hasIcon) {
            switch (iconPos) {
                case 'top':
                    textY = iconSpacing + iconSize + iconSpacing + fontSize / 2;
                    break;
                case 'bottom':
                    textY = el.height - iconSize - iconSpacing - fontSize - iconSpacing / 2;
                    break;
                case 'left':
                    ctx.textAlign = 'left';
                    textX = iconSpacing + iconSize + iconSpacing;
                    textY = el.height / 2;
                    break;
                case 'right':
                    ctx.textAlign = 'left';
                    textX = iconSpacing;
                    textY = el.height / 2;
                    break;
                default: /* center */
                    textY = el.height / 2 + iconSize / 2 + iconSpacing + fontSize / 2;
                    break;
            }
        } else {
            var vAlign = el.textAlignVertical || 'middle';  /* default: vertical center */
            if (vAlign === 'top') {
                textY = fontSize / 2 + hPad;
            } else if (vAlign === 'bottom') {
                textY = el.height - fontSize / 2 - hPad;
            } else {
                /* 'middle' | 'center' | anything else -> vertical center */
                textY = el.height / 2;
            }
        }

        /* shadow for readability over images / video */
        var si = el.textShadowIntensity || 0.7;
        ctx.shadowColor   = 'rgba(0,0,0,' + si + ')';
        ctx.shadowBlur    = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillText(el.text, textX, textY);

        ctx.shadowColor   = 'transparent';
        ctx.shadowBlur    = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.restore();

        console.log('[CanvasAction] âœ… Text drawn:', el.text);
    }

    /* ================================================================
       BACKGROUND IMAGE  (async; chains icon â†’ text on load)
    ================================================================ */


    /* ================================================================
       ACTION DOM OVERLAY (video background mode)
       Renders the action card as a DOM element (div+img+text) positioned
       above the canvas (z-index:10) so it is visible over the background
       video.  Mirrors the GIF / CanvasImage DOM overlay approach.
    ================================================================ */
    function createActionDomOverlay(el, imageSrc) {
        var canvas = document.getElementById('templateCanvas');
        if (!canvas) return;
        var container = canvas.parentElement;
        if (!container) return;

        var elKey = String(el.id || el.name || Date.now());

        /* Remove any stale overlay for this element */
        var stale = document.querySelector('[data-action-overlay-id="' + elKey + '"]');
        if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

        var x       = Math.floor(el.x      || 0);
        var y       = Math.floor(el.y      || 0);
        var w       = Math.ceil(el.width   || 0);
        var h       = Math.ceil(el.height  || 0);
        var radius  = el.borderRadius || 0;
        var opacity = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        var zIndex  = (el.zIndex && el.zIndex !== 'auto') ? el.zIndex : 10;

        /* Outer wrapper: clips border-radius, sets position/size */
        var wrap = document.createElement('div');
        wrap.setAttribute('data-action-overlay-id', elKey);
        wrap.style.cssText = 'position:absolute;overflow:hidden;pointer-events:none;margin:0;padding:0;box-sizing:border-box;';
        wrap.style.left         = x + 'px';
        wrap.style.top          = y + 'px';
        wrap.style.width        = w + 'px';
        wrap.style.height       = h + 'px';
        wrap.style.borderRadius = radius + 'px';
        wrap.style.opacity      = String(opacity);
        wrap.style.zIndex       = String(zIndex);

        /* Border */
        var bw = el.borderWidth > 0 ? el.borderWidth : 0;
        if (bw > 0) {
            wrap.style.border = bw + 'px solid ' + (el.borderColor || '#d9d9d9');
            wrap.style.boxSizing = 'border-box';
        }

        /* Background fallback colour */
        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
            wrap.style.backgroundColor = el.backgroundColor;
        }

        /* Background image */
        if (imageSrc) {
            var img = document.createElement('img');
            img.src = imageSrc;
            img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;margin:0;padding:0;border:none;pointer-events:none;';
            img.style.objectFit = el.imageSize || 'cover';
            img.style.transform       = 'translate3d(0,0,0)';
            img.style.webkitTransform = 'translate3d(0,0,0)';
            img.addEventListener('load',  function () { console.log('[CanvasAction] DOM overlay img loaded:', elKey); });
            img.addEventListener('error', function () { console.error('[CanvasAction] DOM overlay img failed:', elKey); });
            wrap.appendChild(img);
        }

        /* Vignette overlay (gradient) */
        if (el.vignetteEffect && el.vignetteEffect !== 'none' && el.vignetteIntensity > 0) {
            var vig = document.createElement('div');
            var alpha = el.vignetteIntensity || 0.5;
            vig.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
            if (el.vignetteEffect === 'bottom') {
                vig.style.background = 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,' + alpha + ') 100%)';
            } else if (el.vignetteEffect === 'top') {
                vig.style.background = 'linear-gradient(to top, transparent 40%, rgba(0,0,0,' + alpha + ') 100%)';
            } else {
                vig.style.background = 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,' + alpha + ') 100%)';
            }
            wrap.appendChild(vig);
        }

        /* Text label overlay */
        if (el.text && el.showTextOverlay !== false) {
            var textWrap = document.createElement('div');
            textWrap.style.cssText = 'position:absolute;left:0;right:0;pointer-events:none;box-sizing:border-box;padding:8px 12px;';
            var vAlign = el.textAlignVertical || 'bottom';
            if (vAlign === 'bottom') {
                textWrap.style.bottom = '0';
                /* semi-transparent band behind text */
                var bgOpacity = typeof el.textBackgroundOpacity !== 'undefined' ? el.textBackgroundOpacity : 0;
                if (bgOpacity > 0) {
                    textWrap.style.background = 'rgba(0,0,0,' + bgOpacity + ')';
                }
            } else if (vAlign === 'top') {
                textWrap.style.top = '0';
            } else {
                textWrap.style.top = '50%';
                textWrap.style.transform = 'translateY(-50%)';
            }

            var span = document.createElement('span');
            span.textContent = el.text;
            span.style.cssText = 'display:block;margin:0;padding:0;';
            span.style.fontSize   = (el.fontSize  || 22) + 'px';
            span.style.fontFamily = el.fontFamily || 'Arial';
            span.style.color      = el.color      || '#ffffff';
            span.style.textAlign  = el.textAlign  || 'center';
            span.style.textShadow = '2px 2px 8px rgba(0,0,0,' + (el.textShadowIntensity || 0.7) + ')';
            span.style.lineHeight = '1.2';

            textWrap.appendChild(span);
            wrap.appendChild(textWrap);
        }

        if (!container.style.position || container.style.position === 'static') {
            container.style.position = 'relative';
        }

        container.appendChild(wrap);
        _actionDomOverlays.push(wrap);

        console.log('[CanvasAction] DOM overlay created:', elKey,
                    'at', x, y, w + 'x' + h, 'z:', zIndex);
    }


    /* ================================================================
       ACTION BUTTON DOM OVERLAY (video bg mode, displayMode=button/none)
       Renders a solid-color button card as a DOM div with text label.
    ================================================================ */
    function createActionButtonDomOverlay(el) {
        var canvas = document.getElementById('templateCanvas');
        if (!canvas) return;
        var container = canvas.parentElement;
        if (!container) return;

        var elKey = String(el.id || el.name || Date.now());

        var stale = document.querySelector('[data-action-btn-id="' + elKey + '"]');
        if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

        var x       = Math.floor(el.x      || 0);
        var y       = Math.floor(el.y      || 0);
        var w       = Math.ceil(el.width   || 0);
        var h       = Math.ceil(el.height  || 0);
        var radius  = el.borderRadius || 0;
        var opacity = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        var zIndex  = (el.zIndex && el.zIndex !== 'auto') ? el.zIndex : 10;

        var wrap = document.createElement('div');
        wrap.setAttribute('data-action-btn-id', elKey);
        wrap.style.cssText = 'position:absolute;overflow:hidden;pointer-events:none;margin:0;padding:0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;';
        wrap.style.left         = x + 'px';
        wrap.style.top          = y + 'px';
        wrap.style.width        = w + 'px';
        wrap.style.height       = h + 'px';
        wrap.style.borderRadius = radius + 'px';
        wrap.style.opacity      = String(opacity);
        wrap.style.zIndex       = String(zIndex);

        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
            wrap.style.backgroundColor = el.backgroundColor;
        }

        var bw = el.borderWidth > 0 ? el.borderWidth : 0;
        if (bw > 0) {
            wrap.style.border    = bw + 'px solid ' + (el.borderColor || '#d9d9d9');
            wrap.style.boxSizing = 'border-box';
        }

        if (el.rotation && el.rotation !== 0) {
            wrap.style.transform       = 'rotate(' + el.rotation + 'deg)';
            wrap.style.webkitTransform = 'rotate(' + el.rotation + 'deg)';
            wrap.style.transformOrigin = 'center center';
        }

        if (el.text) {
            var span = document.createElement('span');
            span.textContent   = el.text;
            span.style.cssText = 'display:block;text-align:center;margin:0;padding:0 8px;word-break:break-word;';
            span.style.fontSize   = (el.fontSize  || 22) + 'px';
            span.style.fontFamily = el.fontFamily || 'Arial';
            span.style.color      = el.color      || '#ffffff';
            span.style.textShadow = '2px 2px 8px rgba(0,0,0,' + (el.textShadowIntensity || 0.7) + ')';
            wrap.appendChild(span);
        }

        if (!container.style.position || container.style.position === 'static') {
            container.style.position = 'relative';
        }

        container.appendChild(wrap);
        _actionDomOverlays.push(wrap);
        console.log('[CanvasAction] Button DOM overlay created:', elKey, 'at', x, y, w+'x'+h);
    }

    function loadAndDrawActionBackground(ctx, el, imageSrc, sourceType) {
        var img = new Image();
        if (sourceType === 'url') img.crossOrigin = 'anonymous';

        var snap = {
            x: el.x || 0, y: el.y || 0,
            width: el.width, height: el.height,
            rotation: el.rotation || 0,
            opacity: typeof el.opacity !== 'undefined' ? el.opacity : 1,
            borderRadius: el.borderRadius || 0,
            imageSize: el.imageSize || 'cover',
            vignetteEffect: (el.vignetteEffect && el.vignetteEffect !== 'none') ? el.vignetteEffect : null,
            vignetteIntensity: el.vignetteIntensity || 1,
            name: el.name || el.id
        };

        img.onload = function () {
            try {
                ctx.save();
                ctx.translate(snap.x, snap.y);
                if (snap.rotation) {
                    ctx.translate(snap.width / 2, snap.height / 2);
                    ctx.rotate(snap.rotation * Math.PI / 180);
                    ctx.translate(-snap.width / 2, -snap.height / 2);
                }
                ctx.globalAlpha = snap.opacity;
                if (snap.borderRadius > 0) {
                    CanvasBase.roundRect(ctx, 0, 0, snap.width, snap.height, snap.borderRadius);
                    ctx.clip();
                }
                CanvasBase.drawImageWithFit(ctx, img, 0, 0, snap.width, snap.height, snap.imageSize);
                if (snap.vignetteEffect) {
                    CanvasBase.applyVignette(ctx, snap.width, snap.height,
                                            snap.vignetteEffect, snap.vignetteIntensity);
                }
                ctx.restore();
                console.log('[CanvasAction] âœ… BG image loaded:', snap.name);
            } catch (e) {
                console.warn('[CanvasAction] BG draw error:', e);
            }
            drawActionIcon(ctx, el, function () { drawActionText(ctx, el); });
        };

        img.onerror = function () {
            console.warn('[CanvasAction] âŒ BG load failed:', snap.name);
            if (el.backgroundColor) {
                ctx.save();
                ctx.translate(el.x || 0, el.y || 0);
                ctx.fillStyle = el.backgroundColor;
                if (el.borderRadius > 0) {
                    CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
                    ctx.fill();
                } else {
                    ctx.fillRect(0, 0, el.width, el.height);
                }
                ctx.restore();
            }
            drawActionIcon(ctx, el, function () { drawActionText(ctx, el); });
        };

        img.src = imageSrc;
    }

    /* ================================================================
       CSS FOCUS OVERLAY
    ================================================================ */

    function createFocusOverlay(el) {
        var _rawId2   = (el.id   !== undefined && el.id   !== null) ? String(el.id)   : '';
        var _rawName2 = (el.name !== undefined && el.name !== null) ? String(el.name) : '';
        var elementId = _rawId2 + (_rawName2 ? ('_' + _rawName2) : '') || ('action-' + Math.random());
        if (focusOverlays[elementId]) return;

        var canvas = document.getElementById('templateCanvas');
        if (!canvas) return;
        var container = canvas.parentElement;
        if (!container) return;

        /* Ensure container is position:fixed at 0,0 -- same as canvas.
           el.x / el.y are screen pixels; they map correctly only when
           the offset parent sits exactly at the viewport origin. */
        container.style.position = 'fixed';
        container.style.top      = '0';
        container.style.left     = '0';

        /* el.x / el.y / el.width / el.height are already screen pixels.
         * The container is position:fixed covering the full screen,
         * so we can place the overlay directly at those pixel values.
         */
        var overlay           = document.createElement('div');
        overlay.id            = 'focus-overlay-' + elementId;
        overlay.style.position = 'absolute';
        overlay.style.left     = Math.round(el.x)      + 'px';
        overlay.style.top      = Math.round(el.y)      + 'px';
        overlay.style.width    = Math.round(el.width)  + 'px';
        overlay.style.height   = Math.round(el.height) + 'px';
        overlay.style.zIndex   = '1000';   /* above video (500) */
        overlay.style.pointerEvents  = 'none';
        overlay.style.display        = 'none';
        overlay.style.boxSizing      = 'border-box';
        overlay.style.transition     = 'opacity 0.15s ease-in-out';
        overlay.style.opacity        = '0';

        var fbc = el.focusBorderColor || '#3b82f6';
        var fbw = el.focusBorderWidth || 4;
        var br  = Math.round(el.borderRadius || 0);

        overlay.style.border       = fbw + 'px solid ' + fbc;
        overlay.style.borderRadius = br + 'px';
        overlay.style.boxShadow    = '0 0 24px 4px ' + fbc;

        container.appendChild(overlay);
        focusOverlays[elementId] = overlay;
        console.log('[CanvasAction] Focus overlay created:', elementId);
    }

    function updateFocusOverlays() {
        for (var id in focusOverlays) {
            if (focusOverlays.hasOwnProperty(id)) {
                focusOverlays[id].style.display = 'none';
                focusOverlays[id].style.opacity = '0';
            }
        }
        if (focusedIndex >= 0 && focusedIndex < actionElements.length) {
            var focused = actionElements[focusedIndex];
            var _fRawId   = (focused.id   !== undefined && focused.id   !== null) ? String(focused.id)   : '';
            var _fRawName = (focused.name !== undefined && focused.name !== null) ? String(focused.name) : '';
            var fid = _fRawId + (_fRawName ? ('_' + _fRawName) : '') || 'action-unknown';
            var fDiv    = focusOverlays[fid];
            if (fDiv) {
                fDiv.style.display = 'block';
                setTimeout(function () { fDiv.style.opacity = '1'; }, 10);
            }
        }
    }

    /* ================================================================
       NAVIGATION
    ================================================================ */

    function initializeNavigation(elements) {
        actionElements = [];
        cleanup();

        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if ((el.type === 'action' || el.type === 'button' || el.type === 'card') &&
                el.visible !== false) {
                actionElements.push(el);
            }
        }

        actionElements.sort(function (a, b) {
            var dy = (a.y || 0) - (b.y || 0);
            if (Math.abs(dy) > 50) return dy;
            return (a.x || 0) - (b.x || 0);
        });

        if (actionElements.length > 0) {
            focusedIndex = 0;
            updateFocusOverlays();
        }
        console.log('[CanvasAction] Navigation ready:', actionElements.length, 'elements');
    }

    function findClosestInDirection(currentEl, direction) {
        var cx = currentEl.x + currentEl.width  / 2;
        var cy = currentEl.y + currentEl.height / 2;
        var bestDist = Infinity, bestIndex = -1;

        for (var i = 0; i < actionElements.length; i++) {
            if (actionElements[i] === currentEl) continue;
            var el  = actionElements[i];
            var elX = el.x + el.width  / 2;
            var elY = el.y + el.height / 2;
            var d   = Math.sqrt(Math.pow(elX - cx, 2) + Math.pow(elY - cy, 2));
            var ok  = false;
            if      (direction === 'up'   ) ok = elY < cy - 20;
            else if (direction === 'down' ) ok = elY > cy + 20;
            else if (direction === 'left' ) ok = elX < cx - 20;
            else if (direction === 'right') ok = elX > cx + 20;
            if (ok && d < bestDist) { bestDist = d; bestIndex = i; }
        }
        return bestIndex;
    }

    function moveFocus(direction) {
        if (actionElements.length === 0 || focusedIndex < 0) return false;
        var ni = findClosestInDirection(actionElements[focusedIndex], direction);
        if (ni >= 0) {
            focusedIndex = ni;
            updateFocusOverlays();
            console.log('[CanvasAction] Focus â†’',
                        actionElements[ni].name || actionElements[ni].id);
            return true;
        }
        return false;
    }

    /* ================================================================
       ACTION EXECUTION
    ================================================================ */

    function executeAction() {
        if (focusedIndex < 0 || focusedIndex >= actionElements.length) {
            console.warn('[CanvasAction] No focused element');
            return;
        }
        var el = actionElements[focusedIndex];
        console.log('[CanvasAction] Execute:', el.actionType, '|', el.actionValue);

        if      (el.actionType === 'app')         handleAppAction(el);
        else if (el.actionType === 'dynamicPage') handleDynamicPageAction(el);
        else if (el.actionType === 'url')         handleUrlAction(el);
        else console.warn('[CanvasAction] Unknown actionType:', el.actionType);
    }

    function handleAppAction(el) {
        var appId = el.actionValue;
        console.log('[CanvasAction] Launching app:', appId);

        var handlers = {
            'Netflix': function () {
                if (typeof hcap !== 'undefined' && hcap.preloadedApplication) {
                    hcap.preloadedApplication.launchPreloadedApplication({
                        id: "244115188075859013",
                        parameters: JSON.stringify({
                            reason: "launcher",
                            params: { hotel_id: "GRE1234", launcher_version: "1.0" }
                        }),
                        onSuccess: function () { console.log('[CanvasAction] Netflix launched'); },
                        onFailure: function (e) { console.error('[CanvasAction] Netflix fail:', e.errorMessage); }
                    });
                }
            },
            'Youtube': function () {
                if (typeof hcap !== 'undefined' && hcap.preloadedApplication) {
                    hcap.preloadedApplication.launchPreloadedApplication({
                        id: "144115188075859002", parameters: "{}",
                        onSuccess: function () { console.log('[CanvasAction] YouTube launched'); },
                        onFailure: function (e) { console.error('[CanvasAction] YouTube fail:', e.errorMessage); }
                    });
                }
            },
            'accuweather': function () {
                if (typeof hcap !== 'undefined' && hcap.preloadedApplication) {
                    hcap.preloadedApplication.launchPreloadedApplication({
                        id: "144115188075855876", parameters: "{}",
                        onSuccess: function () { console.log('[CanvasAction] AccuWeather launched'); },
                        onFailure: function (e) { console.error('[CanvasAction] AccuWeather fail:', e.errorMessage); }
                    });
                }
            },
            'hdmi': function () {
                if (typeof Main !== 'undefined') {
                    Main.addBackData("MyDevice");
                    view = "MyDevice";
                    presentPagedetails.view = view;
                    if (typeof Util !== 'undefined' && Util.DevicesSwitchPage) Util.DevicesSwitchPage();
                }
            },
            'Cleardata': function () {
                if (typeof Main !== 'undefined') {
                    Main.popupData = { popuptype: "clearData" };
                    if (typeof macro !== 'undefined' && typeof Util !== 'undefined') {
                        macro("#popUpFDFS").html(Util.clearDataPage());
                        macro("#popupBtn-0").addClass('popupFocus');
                    }
                }
            },
            'com.guest.chromecast': function () {
                if (typeof Main !== 'undefined' && Main.handleGoogleCast) Main.handleGoogleCast();
            },
            'LGTV': function () {
                if (typeof Main !== 'undefined' && Main.lgLgChannelIdApi) Main.lgLgChannelIdApi(true);
            },
            'LIVETV': function () {
                if (typeof Main !== 'undefined' && Main.liveTvChannelIdApi) Main.liveTvChannelIdApi(true);
            }
        };

        if (handlers[appId]) handlers[appId]();
        else console.warn('[CanvasAction] No handler for app:', appId);
    }

    function handleDynamicPageAction(el) {
        var pageUuid = el.actionValue;
        console.log('[CanvasAction] Loading dynamic page:', pageUuid);

        if (typeof Main === 'undefined') { console.error('[CanvasAction] Main missing'); return; }

        // ── Push the CURRENT page onto the history stack before navigating away.
        //    We snapshot the full jsonTemplateData object so we can fully restore it
        //    (canvas layout, elements, background, etc.) when the user presses EXIT.
        if (Main.jsonTemplateData) {
            if (!Array.isArray(Main.pageHistory)) Main.pageHistory = [];
            var currentUuid = Main.jsonTemplateData.template_uuid || '';
            console.log('[CanvasAction] Pushing page to history. uuid:', currentUuid,
                        '| history depth:', Main.pageHistory.length + 1);
            Main.pageHistory.push({
                uuid:             currentUuid,
                jsonTemplateData: Main.jsonTemplateData  // store entire data object
            });
        }

        if (typeof Main.ShowLoading === 'function') Main.ShowLoading();

        if (typeof macro !== 'undefined') {
            macro.ajax({
                url:  apiPrefixUrl + "json-template?template_uuid=" + pageUuid,
                type: "GET",
                headers: {
                    Authorization: "Bearer " + (pageDetails && pageDetails.access_token
                                                ? pageDetails.access_token : "")
                },
                success: function (response) {
                    try {
                        var result = typeof response === "string" ? JSON.parse(response) : response;
                        if (result.status === true) {
                            Main.jsonTemplateData = result.result;

                            // ── Clean up the current canvas page before rendering
                            //    the new one so videos, overlays and clocks from the
                            //    previous page don't leak into the next page.
                            try {
                                if (typeof CanvasRenderer !== 'undefined' && CanvasRenderer.cleanup) {
                                    CanvasRenderer.cleanup();
                                } else {
                                    try { if (typeof CanvasBackground !== 'undefined') CanvasBackground.cleanup(); } catch(_) {}
                                    try { if (typeof CanvasAction     !== 'undefined') CanvasAction.cleanup();     } catch(_) {}
                                }
                            } catch(_e) {}

                            // Remove any bg-video-wrap that lives on document.body
                            try {
                                var _bvw = document.getElementById('bg-video-wrap');
                                if (_bvw && _bvw.parentNode) _bvw.parentNode.removeChild(_bvw);
                            } catch(_e) {}

                            // Restore backgrounds (may have been set transparent for video mode)
                            try { document.body.style.background = ''; } catch(_e) {}

                            if (typeof Main.HideLoading === 'function') Main.HideLoading();
                            macro("#mainContent").html('');
                            if (typeof Util !== 'undefined' && Util.ourHotelPage) {
                                macro("#mainContent").html(Util.ourHotelPage());
                                macro("#mainContent").show();
                            }
                        } else {
                            console.error('[CanvasAction] API status false');
                            // Pop the history entry we just pushed since navigation failed
                            if (Array.isArray(Main.pageHistory) && Main.pageHistory.length > 0) {
                                Main.pageHistory.pop();
                            }
                            if (typeof Main.HideLoading === 'function') Main.HideLoading();
                        }
                    } catch (e) {
                        console.error('[CanvasAction] Parse error:', e);
                        // Pop the history entry we just pushed since navigation failed
                        if (Array.isArray(Main.pageHistory) && Main.pageHistory.length > 0) {
                            Main.pageHistory.pop();
                        }
                        if (typeof Main.HideLoading === 'function') Main.HideLoading();
                    }
                },
                error: function (err) {
                    console.error('[CanvasAction] AJAX error:', err);
                    // Pop the history entry we just pushed since navigation failed
                    if (Array.isArray(Main.pageHistory) && Main.pageHistory.length > 0) {
                        Main.pageHistory.pop();
                    }
                    if (typeof Main.HideLoading === 'function') Main.HideLoading();
                },
                timeout: 30000
            });
        }
    }

    function handleUrlAction(el) {
        console.warn('[CanvasAction] URL actions not implemented for TV:', el.actionValue);
    }

    /* ================================================================
       HELPERS
    ================================================================ */

    function getFocusedElement() {
        return (focusedIndex >= 0 && focusedIndex < actionElements.length)
            ? actionElements[focusedIndex] : null;
    }

    /**
     * Full cleanup: focus overlays + background video elements.
     * Called by Util.ourHotelPage and CanvasRenderer.cleanup().
     */
    function cleanup() {
        console.log('[CanvasAction] Full cleanup');

        /* Stop hcap.Media started by Navigation.playSelectedChannel */
        try {
            if (window._currentHcapMedia) {
                try { window._currentHcapMedia.stop({ onSuccess: function(){}, onFailure: function(){} }); } catch(e){}
                try { window._currentHcapMedia.destroy({ onSuccess: function(){}, onFailure: function(){} }); } catch(e){}
                window._currentHcapMedia = null;
            }
        } catch(e) {}
        /* Restore backgrounds */
        try { document.body.style.background = ''; } catch(e) {}
        try {
            var _c = document.getElementById('our-hotel-container');
            if (_c) _c.style.background = '#000';
        } catch(e) {}
        try {
            var _cv = document.getElementById('templateCanvas');
            if (_cv) _cv.style.background = '';
        } catch(e) {}

        for (var id in focusOverlays) {
            if (focusOverlays.hasOwnProperty(id)) {
                var ov = focusOverlays[id];
                if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
            }
        }
        focusOverlays = {};

        cleanupVideos();

        /* Remove action DOM overlays (video-bg mode cards) */
        for (var _i = 0; _i < _actionDomOverlays.length; _i++) {
            var _ov = _actionDomOverlays[_i];
            if (_ov && _ov.parentNode) _ov.parentNode.removeChild(_ov);
        }
        _actionDomOverlays = [];
    }

    /* ================================================================
       PUBLIC API
    ================================================================ */
    return {
        render:               render,
        initializeNavigation: initializeNavigation,
        moveFocus:            moveFocus,
        executeAction:        executeAction,
        getFocusedElement:    getFocusedElement,
        cleanup:              cleanup
    };

})();