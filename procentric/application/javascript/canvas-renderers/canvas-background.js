/**
 * ====================================================================
 * CANVAS BACKGROUND RENDERER
 * Handles main canvas background: color / image / video (MP4 + HLS)
 *
 * Video approach mirrors canvas-action.js exactly:
 *  - HTML <video> overlay div (position:fixed, full-screen, z-index:1)
 *  - Manual cover/contain sizing via _applyVideoFit() -- objectFit CSS
 *    is NOT used because it is unreliable on older LG webOS browsers
 *  - HLS (.m3u8): <source type="application/x-mpegURL"> + watchdog loop
 *  - MP4: video.src + loop attribute + 'ended' fallback listener
 *  - cleanup() removes the overlay and stops the watchdog
 *
 * BG-VIDEO FIX:
 *  When navigating from a page that had a normal video element,
 *  hcap.video.setVideoSize() was previously called with that element's
 *  small x/y/w/h.  CanvasVideo.cleanup() now resets the plane to full
 *  screen, but as a belt-and-suspenders measure createBackgroundVideo()
 *  also calls _resetHcapVideoSizeFullScreen() on both 'loadedmetadata'
 *  and 'playing' events to guarantee the hardware decode plane covers
 *  the entire screen before the first bg-video frame is rendered.
 * ====================================================================
 */

var CanvasBackground = (function () {
    'use strict';

    /* Active background video -- only one at a time */
    var _bgVideoWrap = null;
    var _bgVideo     = null;
    var _bgWatchdog  = null;

    /* ================================================================
       PUBLIC: render()
       Called by CanvasRenderer for every full render pass.
       width / height are already SCREEN PIXELS (CanvasScaler has run).
    ================================================================ */
    function render(ctx, config, width, height) {
        console.log('[CanvasBackground] Rendering, size:', width + 'x' + height);

        ctx.save();

        var bgType  = config.backgroundType  || 'color';
        var opacity = typeof config.backgroundOpacity !== 'undefined'
                      ? config.backgroundOpacity : 1;

        /* For video background, start with a transparent canvas so the
           video DOM layer behind shows through. For other types, draw
           a solid colour first as a safe fallback.                      */
        if (bgType !== 'video') {
            ctx.fillStyle = config.background || '#000000';
            ctx.fillRect(0, 0, width, height);
        }

        if (bgType === 'color' && config.background) {
            ctx.fillStyle   = config.background;
            ctx.globalAlpha = opacity;
            ctx.fillRect(0, 0, width, height);
            console.log('[CanvasBackground] Color:', config.background);

        } else if (bgType === 'image' && config.backgroundImage) {
            var imageUrl = Array.isArray(config.backgroundImage)
                ? config.backgroundImage[0]
                : config.backgroundImage;
            if (imageUrl) {
                loadAndDrawBackground(ctx, imageUrl, width, height,
                                      opacity, config.backgroundFit || 'cover');
            }

        } else if (bgType === 'video' && config.backgroundVideo) {
            /* Clear canvas to fully transparent -- the video plays in a DOM div
               at z-index:1 (behind canvas z-index:2 inside the container).
               Any opaque fill here would block the video from showing through.  */
            ctx.clearRect(0, 0, width, height);
            console.log('[CanvasBackground] Video -- canvas cleared transparent, creating overlay');
            createBackgroundVideo(config, width, height);

        } else {
            console.log('[CanvasBackground] No background media -- color only');
        }

        ctx.restore();
    }

    /* ================================================================
       BACKGROUND IMAGE (unchanged)
    ================================================================ */
    function loadAndDrawBackground(ctx, imageUrl, width, height, opacity, fit) {
        CanvasBase.loadImage(
            imageUrl,
            function (img) {
                /* LG webOS: reset ALL composite state explicitly inside the
                   async callback -- the ctx may have been mutated by other
                   draws between loadImage() call and this callback firing.  */
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.globalCompositeOperation = 'source-over';
                ctx.shadowColor  = 'transparent';
                ctx.shadowBlur   = 0;

                /* Step 1: solid black base so canvas is never transparent */
                ctx.globalAlpha = 1;
                ctx.fillStyle   = '#000000';
                ctx.fillRect(0, 0, width, height);

                /* Step 2: draw image at backgroundOpacity */
                ctx.globalAlpha = (typeof opacity === 'number') ? opacity : 1;
                CanvasBase.drawImageWithFit(ctx, img, 0, 0, width, height, fit);

                ctx.restore();
                console.log('[CanvasBackground] Background image drawn | opacity:', opacity);
            },
            function () {
                console.warn('[CanvasBackground] Background image failed to load');
            }
        );
    }

    /* ================================================================
       BACKGROUND VIDEO
       Full-screen <video> overlay inserted BEHIND the canvas.
       Mirrors canvas-action.js createBackgroundVideo() exactly.
    ================================================================ */
    function createBackgroundVideo(config, screenW, screenH) {
        var src = (config.backgroundVideo || '').trim();
        if (!src) { cleanupVideo(); return; }

        /* Normalise protocol early so we can compare against existing src */
        if (src.indexOf('http://') !== 0 && src.indexOf('https://') !== 0) {
            src = 'https://' + src;
        }

        var opacity = typeof config.backgroundOpacity !== 'undefined'
                      ? config.backgroundOpacity : 1;

        /* ── If the same video is already playing, just update opacity ── */
        if (_bgVideo && _bgVideoWrap &&
            (_bgVideo.src === src ||
             (_bgVideo.querySelector && (function () {
                 var s = _bgVideo.querySelector('source');
                 return s && s.src === src;
             }())))) {
            /* Update overlay div opacity (LG-safe dimming) */
            var _ov = document.getElementById('bg-video-overlay');
            if (_ov) {
                _ov.style.opacity = String(Math.max(0, Math.min(1, 1 - opacity)));
            }
            console.log('[CanvasBackground] BG video already running -- opacity updated to', opacity);
            return;
        }

        /* Remove any previous background video first */
        cleanupVideo();

        var fitMode = config.backgroundFit        || 'cover';
        var doLoop  = config.backgroundVideoLoop  !== false;
        var muted   = config.backgroundVideoMuted !== false;
        var isHls   = src.toLowerCase().indexOf('.m3u8') !== -1;

        console.log('[CanvasBackground] BG video src:', src,
                    '| fit:', fitMode, '| loop:', doLoop,
                    '| muted:', muted, '| isHls:', isHls);

        /* ── wrapper div (full-screen, behind canvas) ─────────────── */
        var wrap            = document.createElement('div');
        wrap.id             = 'bg-video-wrap';
        wrap.style.position = 'fixed';
        wrap.style.top      = '0';
        wrap.style.left     = '0';
        wrap.style.width    = screenW + 'px';
        wrap.style.height   = screenH + 'px';
        wrap.style.overflow = 'hidden';
        wrap.style.zIndex   = '1';        /* behind canvas (z-index:auto ~0) */
        wrap.style.margin   = '0';
        wrap.style.padding  = '0';
        wrap.style.pointerEvents = 'none';
        /* LG webOS: CSS opacity on a <div> containing <video> is unreliable.
           Instead we lay a black <div> on top of the video with
           opacity = (1 - backgroundOpacity) to simulate dimming.           */
        wrap.style.opacity = '1';

        /* ── <video> element ───────────────────────────────────────── */
        var video              = document.createElement('video');
        video.id               = 'bg-video-el';
        video.style.position   = 'absolute';
        video.style.top        = '0';
        video.style.left       = '0';
        video.style.margin     = '0';
        video.style.padding    = '0';
        video.style.border     = 'none';
        video.style.outline    = 'none';
        video.style.display    = 'block';
        video.style.backgroundColor = 'transparent';
        video.style.pointerEvents   = 'none';
        /* NO CSS transform -- breaks LG TV hardware decoder */
        video.style.transform       = 'none';
        video.style.webkitTransform = 'none';

        /* objectFit is NOT reliably supported on older LG webOS browsers.
           We compute cover/contain sizing manually in _applyVideoFit()     */

        video.loop        = doLoop && !isHls;  /* HLS loop via watchdog */
        video.muted       = muted;
        video.autoplay    = true;
        video.controls    = false;
        video.playsInline = true;
        video.preload     = 'auto';
        video.setAttribute('playsinline',        'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay',   'deny');

        /* ── manual cover/contain sizing (same as canvas-action.js) ── */
        function _applyVideoFit() {
            var vw = video.videoWidth  || 0;
            var vh = video.videoHeight || 0;
            if (!vw || !vh) return;

            var scale = (fitMode === 'contain')
                ? Math.min(screenW / vw, screenH / vh)   /* contain */
                : Math.max(screenW / vw, screenH / vh);  /* cover   */

            var newW = Math.round(vw * scale);
            var newH = Math.round(vh * scale);
            var offX = Math.round((screenW - newW) / 2);
            var offY = Math.round((screenH - newH) / 2);

            video.style.width  = newW + 'px';
            video.style.height = newH + 'px';
            video.style.left   = offX + 'px';
            video.style.top    = offY + 'px';

            console.log('[CanvasBackground] _applyVideoFit (' + fitMode + '):'
                        + ' src=' + vw + 'x' + vh
                        + ' -> ' + newW + 'x' + newH
                        + ' @' + offX + ',' + offY);
        }

        /* ── play helper (with muted fallback) ──────────────────────── */
        function _tryPlay() {
            if (!video || !video.parentNode) return;
            var p = video.play();
            if (p !== undefined) {
                p.catch(function (err) {
                    console.warn('[CanvasBackground] play() rejected:', err.message);
                    if (!video.muted) {
                        video.muted = true;
                        video.play().catch(function (e) {
                            console.error('[CanvasBackground] Muted play failed:', e.message);
                        });
                    }
                });
            }
        }

        /* ── event listeners ─────────────────────────────────────────── */
        var started = false;

        video.addEventListener('loadedmetadata', function () {
            console.log('[CanvasBackground] BG video metadata:',
                        video.videoWidth + 'x' + video.videoHeight);
            _applyVideoFit();
            /* ── FIX: Reset hcap plane to full screen early ──────────────
               A prior page's element video may have set the hardware plane
               to a small rect via hcap.video.setVideoSize().  Reset it here
               (before 'playing' fires) so the very first bg-video frame
               uses the correct full-screen dimensions.                      */
            _resetHcapVideoSizeFullScreen(screenW, screenH);
        });

        video.addEventListener('playing', function () {
            _applyVideoFit();   /* re-apply in case timing differs on LG firmware */
            if (!started) {
                started = true;
                console.log('[CanvasBackground] BG video playing OK');
                /* ── FIX: Belt-and-suspenders full-screen reset on first play ──
                   Ensures the hcap hardware decode plane covers the full screen
                   even if the 'loadedmetadata' reset fired before hcap was ready,
                   or if CanvasVideo.cleanup() hasn't finished its async reset yet. */
                _resetHcapVideoSizeFullScreen(screenW, screenH);
            }
        });

        video.addEventListener('ended', function () {
            /* Belt-and-suspenders restart alongside loop attribute */
            console.log('[CanvasBackground] BG video ended, restarting');
            video.currentTime = 0;
            _tryPlay();
        });

        video.addEventListener('stalled', function () {
            console.warn('[CanvasBackground] BG video stalled');
        });

        video.addEventListener('suspend', function () {
            if (!started) {
                setTimeout(function () {
                    if (!started) {
                        console.log('[CanvasBackground] BG video retry after suspend');
                        video.load();
                        _tryPlay();
                    }
                }, 1500);
            }
        });

        video.addEventListener('error', function () {
            var code = video.error ? video.error.code : '?';
            console.error('[CanvasBackground] BG video error code', code, '| src:', src);
            switch (code) {
                case 1: console.error('[CanvasBackground]   MEDIA_ERR_ABORTED'); break;
                case 2: console.error('[CanvasBackground]   MEDIA_ERR_NETWORK -- check URL'); break;
                case 3: console.error('[CanvasBackground]   MEDIA_ERR_DECODE'); break;
                case 4: console.error('[CanvasBackground]   MEDIA_ERR_SRC_NOT_SUPPORTED'); break;
            }
        });

        /* ── source assignment ───────────────────────────────────────── */
        if (isHls) {
            /* <source type="application/x-mpegURL"> triggers the native LG HLS
               demuxer -- same approach as canvas-action.js for HLS cards        */
            var hlsSrc  = document.createElement('source');
            hlsSrc.src  = src;
            hlsSrc.type = 'application/x-mpegURL';
            video.appendChild(hlsSrc);
            console.log('[CanvasBackground] HLS <source> set:', src);
        } else {
            video.src = src;
        }

        /* ── insert into DOM behind the canvas ───────────────────────── */
        var container = document.getElementById('our-hotel-container')
                     || (function () {
                            var cv = document.getElementById('templateCanvas');
                            return cv ? cv.parentNode : document.body;
                        })();

        wrap.appendChild(video);

        /* ── black opacity overlay (LG-safe dimming for video bg) ───────── */
        var overlayDiv              = document.createElement('div');
        overlayDiv.id               = 'bg-video-overlay';
        overlayDiv.style.position   = 'absolute';
        overlayDiv.style.top        = '0';
        overlayDiv.style.left       = '0';
        overlayDiv.style.width      = '100%';
        overlayDiv.style.height     = '100%';
        overlayDiv.style.background = '#000000';
        overlayDiv.style.opacity    = String(Math.max(0, Math.min(1, 1 - opacity)));
        overlayDiv.style.pointerEvents = 'none';
        overlayDiv.style.zIndex     = '2';   /* above video (z-index:0 default) */
        wrap.appendChild(overlayDiv);

        /* Insert BEFORE the canvas so the video sits behind it.
           The canvas will draw a transparent/dark rect for bgType=video,
           allowing the video overlay to show through.                     */
        var canvas = document.getElementById('templateCanvas');
        if (canvas && canvas.parentNode === container) {
            container.insertBefore(wrap, canvas);
        } else {
            container.insertBefore(wrap, container.firstChild);
        }

        _bgVideoWrap = wrap;
        _bgVideo     = video;

        console.log('[CanvasBackground] BG video wrap added to DOM (behind canvas)');

        /* ── start playback ─────────────────────────────────────────── */
        video.load();
        setTimeout(function () { _tryPlay(); }, 500);
        setTimeout(function () {
            if (!started) {
                console.log('[CanvasBackground] BG video second play attempt');
                _tryPlay();
            }
        }, 1500);

        /* ── HLS seamless-loop watchdog ──────────────────────────────
           Some LG firmware versions do not fire 'ended' for HLS/VOD.
           Poll currentTime every second: if it stops advancing while
           the video is playing and duration is finite, restart from 0.
           Live streams (duration===Infinity) are never restarted.       */
        if (isHls) {
            var _hlsLastTime   = -1;
            var _hlsStallCount = 0;

            function _stopWatchdog() {
                if (_bgWatchdog) { clearInterval(_bgWatchdog); _bgWatchdog = null; }
            }

            video.addEventListener('playing', function () {
                if (_bgWatchdog) return;
                _bgWatchdog = setInterval(function () {
                    if (!video.parentNode) { _stopWatchdog(); return; }
                    if (video.paused || video.ended) {
                        _hlsStallCount = 0; _hlsLastTime = -1; return;
                    }
                    if (isFinite(video.duration) && video.duration > 0) {
                        var cur = video.currentTime;
                        if (cur === _hlsLastTime) {
                            if (++_hlsStallCount >= 3) {
                                _hlsStallCount = 0; _hlsLastTime = -1;
                                console.log('[CanvasBackground] HLS watchdog restart');
                                video.currentTime = 0;
                                _tryPlay();
                            }
                        } else {
                            _hlsStallCount = 0; _hlsLastTime = cur;
                        }
                    }
                }, 1000);
                console.log('[CanvasBackground] HLS watchdog started');
            });

            video.addEventListener('emptied', _stopWatchdog);
        }
    }

    /* ================================================================
       _resetHcapVideoSizeFullScreen(sw, sh)
       Sets the hcap hardware decode plane to cover the full screen
       (0, 0, displayW, displayH).
       Called from createBackgroundVideo() on 'loadedmetadata' and
       'playing' so the plane is guaranteed to be full-screen whenever
       a background video starts, regardless of what the previous page
       may have set via CanvasVideo._applyVideoSize().
    ================================================================ */
    function _resetHcapVideoSizeFullScreen(sw, sh) {
        if (!(window.hcap && hcap.video && typeof hcap.video.setVideoSize === 'function')) return;

        sw = sw || window.innerWidth  || (window.screen && window.screen.width)  || 1920;
        sh = sh || window.innerHeight || (window.screen && window.screen.height) || 1080;
        console.log('[CanvasBackground] Resetting hcap video plane to full screen:', sw + 'x' + sh);

        function _doSet(x, y, w, h) {
            try {
                hcap.video.setVideoSize({
                    x: x, y: y, width: w, height: h,
                    onSuccess: function () {
                        console.log('[CanvasBackground] hcap setVideoSize full-screen OK:', w + 'x' + h);
                    },
                    onFailure: function (f) {
                        console.warn('[CanvasBackground] hcap setVideoSize failed:', f && f.errorMessage);
                    }
                });
            } catch (e) {
                console.error('[CanvasBackground] hcap setVideoSize threw:', e);
            }
        }

        /* Use display_resolution for physical pixel accuracy (matches canvas-video.js) */
        if (window.hcap && hcap.property && hcap.property.getProperty) {
            try {
                hcap.property.getProperty({
                    key: 'display_resolution',
                    onSuccess: function (res) {
                        var dw = sw, dh = sh;
                        try {
                            if (res && res.value) {
                                var p = String(res.value).split('x');
                                if (p.length === 2) {
                                    dw = parseInt(p[0], 10) || dw;
                                    dh = parseInt(p[1], 10) || dh;
                                }
                            }
                        } catch (e) {}
                        _doSet(0, 0, dw, dh);
                    },
                    onFailure: function () { _doSet(0, 0, sw, sh); }
                });
            } catch (e) { _doSet(0, 0, sw, sh); }
        } else {
            _doSet(0, 0, sw, sh);
        }
    }

    /* ================================================================
       cleanupVideo() -- internal: stops video + removes overlay
    ================================================================ */
    function cleanupVideo() {
        if (_bgWatchdog) {
            clearInterval(_bgWatchdog);
            _bgWatchdog = null;
        }
        if (_bgVideo) {
            try { _bgVideo.pause(); } catch (e) {}
            _bgVideo.src = '';
            try { _bgVideo.load(); } catch (e) {}
            _bgVideo = null;
        }
        if (_bgVideoWrap && _bgVideoWrap.parentNode) {
            _bgVideoWrap.parentNode.removeChild(_bgVideoWrap);
        }
        _bgVideoWrap = null;
    }

    /* ================================================================
       PUBLIC: cleanup()
       Called by CanvasRenderer.cleanup() when navigating away.
    ================================================================ */
    function cleanup() {
        console.log('[CanvasBackground] cleanup()');
        cleanupVideo();
    }

    /* ================================================================
       PUBLIC API
    ================================================================ */
    return {
        render:  render,
        cleanup: cleanup
    };

})();