/**
 * ====================================================================
 * CANVAS VIDEO ELEMENT RENDERER (FIXED FOR .MP4 PLAYBACK)
 * Handles video elements using HTML5 video overlay
 * ====================================================================
 */

var CanvasVideo = (function() {
    'use strict';

    /**
     * Render VIDEO element (automatically uses HTML overlay for playback)
     */
    function render(ctx, el, canvas) {
        if (!el.src) {
            console.warn('[CanvasVideo] Video element missing src:', el.name || el.id);
            return;
        }
        
        console.log('[CanvasVideo] Rendering video:', el.name || el.id);
        
        // Get canvas element if not provided
        if (!canvas) {
            canvas = document.getElementById('templateCanvas');
        }
        
        if (!canvas) {
            console.error('[CanvasVideo] Canvas element not found');
            return;
        }
        
        // Use HTML overlay method for proper video playback
        renderVideo(ctx, el, canvas);
    }

    /**
     * Render actual HTML5 video element overlay
     */
    function renderVideo(ctx, el, canvas) {
        if (!el.src) {
            console.warn('[CanvasVideo] Video element missing src:', el.name || el.id);
            return;
        }
        
        console.log('[CanvasVideo] Creating video overlay:', el.name || el.id);
        
        // Get canvas scaling factor
        var canvasRect = canvas.getBoundingClientRect();
        var scaleX = canvasRect.width / canvas.width;
        var scaleY = canvasRect.height / canvas.height;
        
        // Create video element overlay
        var videoOverlay = document.createElement('video');
        videoOverlay.className = 'video-overlay-element';
        videoOverlay.setAttribute('data-element-id', el.id || el.name);
        
        // Set video source
        videoOverlay.src = el.src;
        
        // Positioning and sizing
        videoOverlay.style.position = 'absolute';
        videoOverlay.style.left = (el.x * scaleX) + 'px';
        videoOverlay.style.top = (el.y * scaleY) + 'px';
        videoOverlay.style.width = (el.width * scaleX) + 'px';
        videoOverlay.style.height = (el.height * scaleY) + 'px';
        
        // Opacity
        videoOverlay.style.opacity = (typeof el.opacity !== 'undefined' ? el.opacity : 1);
        
        // Prevent interaction (unless controls are enabled)
        videoOverlay.style.pointerEvents = el.showControls ? 'auto' : 'none';
        
        // Z-index
        videoOverlay.style.zIndex = el.zIndex || 'auto';
        
        // Object fit (cover/contain)
        videoOverlay.style.objectFit = el.objectFit || el.videoFit || 'cover';
        
        // Border radius
        if (el.borderRadius) {
            videoOverlay.style.borderRadius = el.borderRadius + 'px';
            videoOverlay.style.overflow = 'hidden';
        }
        
        // Rotation
        if (el.rotation) {
            videoOverlay.style.transform = 'rotate(' + el.rotation + 'deg)';
            videoOverlay.style.transformOrigin = 'center center';
        }
        
        // Video attributes
        videoOverlay.autoplay = el.autoPlay !== false;
        videoOverlay.loop = el.loop !== false;
        videoOverlay.muted = el.muted !== false; // Muted by default for autoplay
        videoOverlay.controls = el.showControls === true;
        videoOverlay.playsInline = true; // Important for mobile/TV
        
        // Playback speed
        if (el.playbackRate) {
            videoOverlay.playbackRate = el.playbackRate;
        }
        
        // Volume
        if (typeof el.volume !== 'undefined') {
            videoOverlay.volume = Math.max(0, Math.min(1, el.volume));
        }
        
        // Preload strategy
        videoOverlay.preload = el.preload || 'auto';
        
        // Add event listeners for debugging and control
        videoOverlay.addEventListener('loadedmetadata', function() {
            console.log('[CanvasVideo] ✅ Video metadata loaded:', el.name || el.id);
            console.log('[CanvasVideo] Duration:', videoOverlay.duration, 'seconds');
        });
        
        videoOverlay.addEventListener('canplay', function() {
            console.log('[CanvasVideo] ✅ Video can play:', el.name || el.id);
        });
        
        videoOverlay.addEventListener('play', function() {
            console.log('[CanvasVideo] ▶️ Video playing:', el.name || el.id);
        });
        
        videoOverlay.addEventListener('pause', function() {
            console.log('[CanvasVideo] ⏸️ Video paused:', el.name || el.id);
        });
        
        videoOverlay.addEventListener('ended', function() {
            console.log('[CanvasVideo] ⏹️ Video ended:', el.name || el.id);
            
            // Handle end behavior
            if (el.onEndBehavior === 'restart') {
                videoOverlay.currentTime = 0;
                videoOverlay.play();
            } else if (el.onEndBehavior === 'hide') {
                videoOverlay.style.display = 'none';
            }
        });
        
        videoOverlay.addEventListener('error', function(e) {
            console.error('[CanvasVideo] ❌ Video error:', el.name || el.id, e);
            console.error('[CanvasVideo] Error details:', {
                code: videoOverlay.error ? videoOverlay.error.code : 'unknown',
                message: videoOverlay.error ? videoOverlay.error.message : 'unknown',
                src: el.src
            });
            
            // Show error placeholder
            showVideoError(videoOverlay, el);
        });
        
        // Add to DOM
        var container = canvas.parentElement;
        if (container) {
            container.style.position = 'relative';
            container.appendChild(videoOverlay);
            
            console.log('[CanvasVideo] ✅ Video overlay created:', el.name || el.id);
            
            // Try to play if autoplay is enabled
            if (el.autoPlay !== false) {
                var playPromise = videoOverlay.play();
                if (playPromise !== undefined) {
                    playPromise.then(function() {
                        console.log('[CanvasVideo] ✅ Autoplay started successfully');
                    }).catch(function(error) {
                        console.warn('[CanvasVideo] ⚠️ Autoplay failed:', error);
                        console.warn('[CanvasVideo] Tip: Videos may require user interaction to play with sound');
                    });
                }
            }
        } else {
            console.error('[CanvasVideo] No parent container found for canvas');
        }
    }

    /**
     * Show error message when video fails to load
     */
    function showVideoError(videoElement, el) {
        // Create error overlay
        var errorDiv = document.createElement('div');
        errorDiv.className = 'video-error-overlay';
        errorDiv.style.position = 'absolute';
        errorDiv.style.left = videoElement.style.left;
        errorDiv.style.top = videoElement.style.top;
        errorDiv.style.width = videoElement.style.width;
        errorDiv.style.height = videoElement.style.height;
        errorDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.display = 'flex';
        errorDiv.style.alignItems = 'center';
        errorDiv.style.justifyContent = 'center';
        errorDiv.style.fontSize = '18px';
        errorDiv.style.padding = '20px';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.zIndex = videoElement.style.zIndex;
        errorDiv.innerHTML = '⚠️<br>Video Load Failed<br><small style="font-size:12px;color:#aaa;">Check file path and format</small>';
        
        // Hide video element and show error
        videoElement.style.display = 'none';
        videoElement.parentElement.appendChild(errorDiv);
    }

    /**
     * Clean up all video overlays (call this before re-rendering)
     */
    function cleanup() {
        // Stop and remove all videos
        var videos = document.querySelectorAll('.video-overlay-element');
        for (var i = 0; i < videos.length; i++) {
            try {
                videos[i].pause();
                videos[i].src = ''; // Release video resources
            } catch (e) {
                console.warn('[CanvasVideo] Error pausing video:', e);
            }
            videos[i].parentNode.removeChild(videos[i]);
        }
        
        // Remove error overlays
        var errors = document.querySelectorAll('.video-error-overlay');
        for (var j = 0; j < errors.length; j++) {
            errors[j].parentNode.removeChild(errors[j]);
        }
        
        console.log('[CanvasVideo] Cleaned up', videos.length, 'video overlays');
    }

    /**
     * Control video playback
     */
    function play(elementId) {
        var video = document.querySelector('.video-overlay-element[data-element-id="' + elementId + '"]');
        if (video) {
            video.play();
        }
    }

    function pause(elementId) {
        var video = document.querySelector('.video-overlay-element[data-element-id="' + elementId + '"]');
        if (video) {
            video.pause();
        }
    }

    function stop(elementId) {
        var video = document.querySelector('.video-overlay-element[data-element-id="' + elementId + '"]');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
    }

    function setVolume(elementId, volume) {
        var video = document.querySelector('.video-overlay-element[data-element-id="' + elementId + '"]');
        if (video) {
            video.volume = Math.max(0, Math.min(1, volume));
        }
    }

    function seek(elementId, time) {
        var video = document.querySelector('.video-overlay-element[data-element-id="' + elementId + '"]');
        if (video) {
            video.currentTime = time;
        }
    }

    // Public API
    return {
        render: render,
        renderVideo: renderVideo,
        cleanup: cleanup,
        play: play,
        pause: pause,
        stop: stop,
        setVolume: setVolume,
        seek: seek
    };
})();