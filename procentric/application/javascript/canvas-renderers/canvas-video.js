/**
 * ====================================================================
 * CANVAS VIDEO - CORRECTED FOR LG TV WITH PROPER INTEGRATION
 * ✅ Fixes "Format Error - Convert to H.264 MP4"
 * ✅ Fixes video zoom/cropping issues with objectFit
 * ✅ Integrates properly with canvas-renderer.js render() function
 * ✅ Integrates properly with pages.js cleanup() flow
 * ====================================================================
 */

var CanvasVideo = (function() {
    'use strict';

    // Track all active video overlays
    var activeVideos = [];

    /**
     * Main render function called by canvas-renderer.js
     * Signature: render(ctx, el, canvas)
     */
    function render(ctx, el, canvas) {
        if (!el.src) {
            console.warn('[CanvasVideo] Video element missing src:', el.name || el.id);
            return;
        }
        
        console.log('[CanvasVideo] ==========================================');
        console.log('[CanvasVideo] Rendering video:', el.name || el.id);
        console.log('[CanvasVideo] Video source:', el.src);
        
        if (!canvas) {
            canvas = document.getElementById('templateCanvas');
        }
        
        if (!canvas) {
            console.error('[CanvasVideo] Canvas element not found');
            return;
        }
        
        // Check video format
        var videoFormat = getVideoFormat(el.src);
        if (!isValidFormat(videoFormat)) {
            console.error('[CanvasVideo] ❌ INVALID FORMAT:', videoFormat);
            console.error('[CanvasVideo] LG TV requires H.264 MP4 format');
            console.error('[CanvasVideo] Convert using: ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4');
            
            // Show format error on canvas
            showFormatError(ctx, el);
            return;
        }
        
        console.log('[CanvasVideo] ✅ Valid format:', videoFormat);
        
        // Create video overlay
        createVideoOverlay(el, canvas);
        
        console.log('[CanvasVideo] ==========================================');
    }

    /**
     * Get video format from URL
     */
    function getVideoFormat(src) {
        var url = src.toLowerCase();
        if (url.endsWith('.mp4')) return 'mp4';
        if (url.endsWith('.webm')) return 'webm';
        if (url.endsWith('.ogv') || url.endsWith('.ogg')) return 'ogg';
        if (url.endsWith('.avi')) return 'avi';
        if (url.endsWith('.mov')) return 'mov';
        return 'unknown';
    }

    /**
     * Check if video format is supported on LG TV
     */
    function isValidFormat(format) {
        // LG TV supports MP4 with H.264 codec
        // WebM, OGV, AVI are NOT supported
        return format === 'mp4';
    }

    /**
     * Show format error on canvas
     */
    function showFormatError(ctx, el) {
        var x = el.x || 0;
        var y = el.y || 0;
        var width = el.width || 400;
        var height = el.height || 300;
        
        ctx.save();
        
        // Draw red background
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(x, y, width, height);
        
        // Draw red border
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        
        // Draw error icon (X)
        var centerX = x + width / 2;
        var centerY = y + height / 2 - 20;
        var iconSize = 40;
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(centerX - iconSize/2, centerY - iconSize/2);
        ctx.lineTo(centerX + iconSize/2, centerY + iconSize/2);
        ctx.moveTo(centerX + iconSize/2, centerY - iconSize/2);
        ctx.lineTo(centerX - iconSize/2, centerY + iconSize/2);
        ctx.stroke();
        
        // Draw error text
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FORMAT ERROR', centerX, centerY + 40);
        
        ctx.font = '16px Arial';
        ctx.fillText('Convert to H.264 MP4', centerX, centerY + 65);
        
        ctx.font = '14px Arial';
        ctx.fillStyle = '#cc0000';
        ctx.fillText('Unsupported format for LG TV', centerX, centerY + 88);
        
        ctx.restore();
    }

    /**
     * Create video overlay element
     */
    function createVideoOverlay(el, canvas) {
        var container = canvas.parentElement;
        if (!container) {
            console.error('[CanvasVideo] No parent container found for canvas');
            return;
        }
        
        // Get element properties (already scaled by CanvasScaler)
        var x = Math.floor(el.x || 0);
        var y = Math.floor(el.y || 0);
        var width = Math.ceil(el.width || 400);
        var height = Math.ceil(el.height || 300);
        
        console.log('[CanvasVideo] Element position (scaled):', x, ',', y);
        console.log('[CanvasVideo] Element size (scaled):', width, 'x', height);
        
        // Create video element
        var videoOverlay = document.createElement('video');
        videoOverlay.className = 'video-overlay-element';
        videoOverlay.setAttribute('data-element-id', el.id || el.name);
        
        // ✅ POSITIONING - Use absolute positioning
        videoOverlay.style.position = 'absolute';
        videoOverlay.style.left = x + 'px';
        videoOverlay.style.top = y + 'px';
        videoOverlay.style.width = width + 'px';
        videoOverlay.style.height = height + 'px';
        
        // ✅ CRITICAL FIX FOR ZOOM ISSUE: Object-fit handling
        var objectFit = el.objectFit || 'contain'; // Default to 'contain' to show full video
        videoOverlay.style.objectFit = objectFit;
        videoOverlay.style.objectPosition = 'center center';
        
        console.log('[CanvasVideo] Object-fit:', objectFit);
        console.log('[CanvasVideo]   - contain: Shows full video (may have letterboxing)');
        console.log('[CanvasVideo]   - cover: Fills area completely (may crop edges)');
        console.log('[CanvasVideo]   - fill: Stretches to exact size (may distort)');
        
        // ✅ NO CSS TRANSFORMS (they break hardware video decoder on LG TV)
        videoOverlay.style.transform = 'none';
        videoOverlay.style.webkitTransform = 'none';
        
        // Basic styling
        videoOverlay.style.margin = '0';
        videoOverlay.style.padding = '0';
        videoOverlay.style.border = 'none';
        videoOverlay.style.outline = 'none';
        videoOverlay.style.boxSizing = 'border-box';
        videoOverlay.style.display = 'block';
        videoOverlay.style.visibility = 'visible';
        videoOverlay.style.backgroundColor = 'transparent';
        
        // Opacity
        var opacity = (typeof el.opacity !== 'undefined' ? el.opacity : 1);
        videoOverlay.style.opacity = opacity;
        
        // Prevent interaction unless controls enabled
        videoOverlay.style.pointerEvents = el.showControls ? 'auto' : 'none';
        
        // Z-index
        var zIndex = el.zIndex || 9999;
        videoOverlay.style.zIndex = zIndex;
        
        // Border radius
        if (el.borderRadius && el.borderRadius > 0) {
            videoOverlay.style.borderRadius = Math.round(el.borderRadius) + 'px';
            videoOverlay.style.overflow = 'hidden';
        }
        
        // ✅ CRITICAL: LG TV video attributes
        videoOverlay.autoplay = (el.autoPlay !== false);
        videoOverlay.loop = (el.loop !== false);
        videoOverlay.muted = (el.muted !== false);
        videoOverlay.controls = (el.showControls === true);
        videoOverlay.playsInline = true;
        
        console.log('[CanvasVideo] Video settings:');
        console.log('[CanvasVideo]   Autoplay:', videoOverlay.autoplay);
        console.log('[CanvasVideo]   Loop:', videoOverlay.loop);
        console.log('[CanvasVideo]   Muted:', videoOverlay.muted);
        console.log('[CanvasVideo]   Controls:', videoOverlay.controls);
        
        // ✅ LG webOS specific attributes
        videoOverlay.setAttribute('playsinline', 'true');
        videoOverlay.setAttribute('webkit-playsinline', 'true');
        
        // ✅ CRITICAL: Preload setting
        videoOverlay.preload = 'auto';
        console.log('[CanvasVideo]   Preload: auto');
        
        // Disable picture-in-picture
        videoOverlay.disablePictureInPicture = true;
        
        // Standard playback rate
        videoOverlay.playbackRate = 1.0;
        
        // Volume
        if (typeof el.volume !== 'undefined') {
            videoOverlay.volume = Math.max(0, Math.min(1, el.volume));
        }
        
        // ✅ Set crossOrigin if external URL
        if (el.src.indexOf('http://') === 0 || el.src.indexOf('https://') === 0) {
            if (el.src.indexOf(window.location.hostname) === -1) {
                videoOverlay.crossOrigin = 'anonymous';
                console.log('[CanvasVideo]   CrossOrigin: anonymous (external video)');
            }
        }
        
        // ✅ Set video source
        videoOverlay.src = el.src;
        
        // Track if video has started
        var hasStartedPlaying = false;
        
        // ✅ EVENT LISTENERS
        
        videoOverlay.addEventListener('loadstart', function() {
            console.log('[CanvasVideo] ▶ [' + (el.name || el.id) + '] Load started');
        });
        
        videoOverlay.addEventListener('loadedmetadata', function() {
            console.log('[CanvasVideo] 📊 [' + (el.name || el.id) + '] Metadata loaded');
            console.log('[CanvasVideo]   Video dimensions:', videoOverlay.videoWidth, 'x', videoOverlay.videoHeight);
            console.log('[CanvasVideo]   Duration:', videoOverlay.duration.toFixed(2), 'seconds');
            
            // ✅ CRITICAL: Adjust video size based on natural dimensions for better fitting
            adjustVideoSize(videoOverlay, el, width, height);
        });
        
        videoOverlay.addEventListener('loadeddata', function() {
            console.log('[CanvasVideo] 📦 [' + (el.name || el.id) + '] Data loaded');
        });
        
        videoOverlay.addEventListener('canplay', function() {
            console.log('[CanvasVideo] ✓ [' + (el.name || el.id) + '] Can play');
        });
        
        videoOverlay.addEventListener('canplaythrough', function() {
            console.log('[CanvasVideo] ✓✓ [' + (el.name || el.id) + '] Can play through');
        });
        
        videoOverlay.addEventListener('playing', function() {
            if (!hasStartedPlaying) {
                hasStartedPlaying = true;
                console.log('[CanvasVideo] ✓✓✓ [' + (el.name || el.id) + '] Playing - SUCCESS!');
            }
        });
        
        videoOverlay.addEventListener('progress', function() {
            if (videoOverlay.buffered.length > 0) {
                var bufferedEnd = videoOverlay.buffered.end(videoOverlay.buffered.length - 1);
                var duration = videoOverlay.duration;
                if (duration > 0) {
                    var percentBuffered = (bufferedEnd / duration * 100).toFixed(1);
                    if (percentBuffered % 25 === 0) { // Log every 25%
                        console.log('[CanvasVideo] ⏳ [' + (el.name || el.id) + '] Buffered: ' + percentBuffered + '%');
                    }
                }
            }
        });
        
        videoOverlay.addEventListener('suspend', function() {
            console.warn('[CanvasVideo] ⏸ [' + (el.name || el.id) + '] Download suspended');
            console.warn('[CanvasVideo]   This may indicate network issues');
            
            // Try to resume after a short delay
            setTimeout(function() {
                if (!hasStartedPlaying && videoOverlay.readyState < 4) {
                    console.log('[CanvasVideo] 🔄 Attempting to resume loading...');
                    videoOverlay.load();
                }
            }, 1000);
        });
        
        videoOverlay.addEventListener('stalled', function() {
            console.warn('[CanvasVideo] ⚠ [' + (el.name || el.id) + '] Download stalled');
        });
        
        videoOverlay.addEventListener('waiting', function() {
            console.log('[CanvasVideo] ⏱ [' + (el.name || el.id) + '] Waiting for data');
        });
        
        videoOverlay.addEventListener('ended', function() {
            console.log('[CanvasVideo] ⏹ [' + (el.name || el.id) + '] Playback ended');
        });
        
        videoOverlay.addEventListener('error', function() {
            console.error('[CanvasVideo] ==========================================');
            console.error('[CanvasVideo] ❌ VIDEO ERROR [' + (el.name || el.id) + ']');
            console.error('[CanvasVideo] ==========================================');
            
            if (videoOverlay.error) {
                var errorCode = videoOverlay.error.code;
                var errorMessage = videoOverlay.error.message || 'Unknown error';
                
                console.error('[CanvasVideo] Error code:', errorCode);
                console.error('[CanvasVideo] Error message:', errorMessage);
                
                // Decode error codes
                if (errorCode === 1) {
                    console.error('[CanvasVideo] MEDIA_ERR_ABORTED - Video loading aborted');
                } else if (errorCode === 2) {
                    console.error('[CanvasVideo] MEDIA_ERR_NETWORK - Network error');
                    console.error('[CanvasVideo] 💡 Check:');
                    console.error('[CanvasVideo]    - Video URL is accessible');
                    console.error('[CanvasVideo]    - Network connection is stable');
                    console.error('[CanvasVideo]    - No firewall blocking access');
                } else if (errorCode === 3) {
                    console.error('[CanvasVideo] MEDIA_ERR_DECODE - Decoding error');
                    console.error('[CanvasVideo] 💡 FORMAT ERROR - Video must be:');
                    console.error('[CanvasVideo]    - Container: MP4');
                    console.error('[CanvasVideo]    - Video codec: H.264');
                    console.error('[CanvasVideo]    - Audio codec: AAC');
                    console.error('[CanvasVideo]    Convert: ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4');
                } else if (errorCode === 4) {
                    console.error('[CanvasVideo] MEDIA_ERR_SRC_NOT_SUPPORTED - Format not supported');
                    console.error('[CanvasVideo] 💡 FORMAT ERROR - Use H.264 MP4 format only!');
                }
            }
            
            console.error('[CanvasVideo] Network state:', videoOverlay.networkState);
            console.error('[CanvasVideo] Ready state:', videoOverlay.readyState);
            console.error('[CanvasVideo] ==========================================');
            
            // Show error overlay
            showVideoErrorOverlay(videoOverlay, el);
        });
        
        // Ensure container is positioned
        if (!container.style.position || container.style.position === 'static') {
            container.style.position = 'relative';
        }
        
        // Add to container
        container.appendChild(videoOverlay);
        console.log('[CanvasVideo] ✓ Video added to DOM');
        
        // Track this video
        activeVideos.push({
            element: videoOverlay,
            elementId: el.id || el.name,
            config: el
        });
        
        // ✅ CRITICAL: Force load
        console.log('[CanvasVideo] 🔄 Calling load()...');
        videoOverlay.load();
        
        // ✅ Start playback if autoplay enabled
        if (el.autoPlay !== false) {
            console.log('[CanvasVideo] ⏱ Starting autoplay sequence...');
            
            // Wait for LG TV to be ready (1 second delay)
            setTimeout(function() {
                console.log('[CanvasVideo] 🎬 Attempting play()...');
                
                var playPromise = videoOverlay.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(function() {
                        console.log('[CanvasVideo] ✓✓✓ Autoplay SUCCESS ✓✓✓');
                    }).catch(function(error) {
                        console.warn('[CanvasVideo] ⚠ Autoplay failed:', error.message);
                        
                        // Try with muted if not already
                        if (!videoOverlay.muted) {
                            console.log('[CanvasVideo] 🔇 Retrying with muted...');
                            videoOverlay.muted = true;
                            
                            videoOverlay.play().then(function() {
                                console.log('[CanvasVideo] ✓ Muted autoplay successful');
                            }).catch(function(err) {
                                console.error('[CanvasVideo] ✗ Muted autoplay also failed:', err.message);
                            });
                        }
                    });
                }
            }, 1000);
        }
    }

    /**
     * ✅ CRITICAL: Adjust video size based on natural dimensions and objectFit mode
     * This fixes the zoom/cropping issue
     */
    function adjustVideoSize(videoElement, config, targetWidth, targetHeight) {
        var videoWidth = videoElement.videoWidth;
        var videoHeight = videoElement.videoHeight;
        
        if (!videoWidth || !videoHeight) {
            console.warn('[CanvasVideo] Video dimensions not available yet');
            return;
        }
        
        var objectFit = config.objectFit || 'contain';
        
        console.log('[CanvasVideo] Adjusting video size:');
        console.log('[CanvasVideo]   Video natural size:', videoWidth + 'x' + videoHeight);
        console.log('[CanvasVideo]   Target size:', targetWidth + 'x' + targetHeight);
        console.log('[CanvasVideo]   Object-fit mode:', objectFit);
        
        if (objectFit === 'contain') {
            // Calculate aspect ratios
            var videoAspect = videoWidth / videoHeight;
            var targetAspect = targetWidth / targetHeight;
            
            var finalWidth, finalHeight;
            
            if (videoAspect > targetAspect) {
                // Video is wider - fit to width
                finalWidth = targetWidth;
                finalHeight = targetWidth / videoAspect;
            } else {
                // Video is taller - fit to height
                finalHeight = targetHeight;
                finalWidth = targetHeight * videoAspect;
            }
            
            // Center the video
            var offsetX = (targetWidth - finalWidth) / 2;
            var offsetY = (targetHeight - finalHeight) / 2;
            
            var currentLeft = parseInt(videoElement.style.left, 10);
            var currentTop = parseInt(videoElement.style.top, 10);
            
            videoElement.style.width = Math.round(finalWidth) + 'px';
            videoElement.style.height = Math.round(finalHeight) + 'px';
            videoElement.style.left = Math.round(currentLeft + offsetX) + 'px';
            videoElement.style.top = Math.round(currentTop + offsetY) + 'px';
            
            console.log('[CanvasVideo]   Adjusted size:', Math.round(finalWidth) + 'x' + Math.round(finalHeight));
            console.log('[CanvasVideo]   Offset:', Math.round(offsetX) + ',' + Math.round(offsetY));
        } else if (objectFit === 'cover') {
            // No adjustment needed - CSS object-fit: cover handles it
            console.log('[CanvasVideo]   Using CSS object-fit: cover (no manual adjustment)');
        } else if (objectFit === 'fill') {
            // No adjustment needed - CSS object-fit: fill handles it
            console.log('[CanvasVideo]   Using CSS object-fit: fill (no manual adjustment)');
        }
    }

    /**
     * Show error overlay when video fails to load
     */
    function showVideoErrorOverlay(videoElement, config) {
        var errorDiv = document.createElement('div');
        errorDiv.className = 'video-error-overlay';
        errorDiv.style.position = 'absolute';
        errorDiv.style.left = videoElement.style.left;
        errorDiv.style.top = videoElement.style.top;
        errorDiv.style.width = videoElement.style.width;
        errorDiv.style.height = videoElement.style.height;
        errorDiv.style.backgroundColor = 'rgba(20, 20, 20, 0.95)';
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.display = 'flex';
        errorDiv.style.flexDirection = 'column';
        errorDiv.style.alignItems = 'center';
        errorDiv.style.justifyContent = 'center';
        errorDiv.style.fontSize = '16px';
        errorDiv.style.padding = '20px';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.zIndex = videoElement.style.zIndex;
        errorDiv.style.borderRadius = videoElement.style.borderRadius || '0';
        
        var errorCode = videoElement.error ? videoElement.error.code : 0;
        var errorTitle = 'Video Load Failed';
        var errorHint = 'Check console for details';
        
        if (errorCode === 2) {
            errorTitle = 'Network Error';
            errorHint = 'Check connection & URL';
        } else if (errorCode === 3 || errorCode === 4) {
            errorTitle = 'Format Error';
            errorHint = 'Convert to H.264 MP4';
        }
        
        errorDiv.innerHTML = '<div style="font-size:48px;margin-bottom:20px;">⚠️</div>' +
                            '<div style="font-size:20px;font-weight:bold;margin-bottom:10px;">' + errorTitle + '</div>' +
                            '<div style="font-size:14px;color:#aaa;">' + errorHint + '</div>';
        
        videoElement.style.display = 'none';
        videoElement.parentElement.appendChild(errorDiv);
    }

    /**
     * ✅ Cleanup function - called by pages.js
     * This is critical for proper integration with your page lifecycle
     */
    function cleanup() {
        console.log('[CanvasVideo] ==========================================');
        console.log('[CanvasVideo] Cleaning up video overlays');
        console.log('[CanvasVideo] Found', activeVideos.length, 'active videos');
        
        // Stop and remove all video elements
        for (var i = 0; i < activeVideos.length; i++) {
            var videoData = activeVideos[i];
            var video = videoData.element;
            
            try {
                console.log('[CanvasVideo] Stopping video:', videoData.elementId);
                video.pause();
                video.src = '';
                video.load();
            } catch (e) {
                console.warn('[CanvasVideo] Error stopping video:', e);
            }
            
            if (video.parentNode) {
                video.parentNode.removeChild(video);
            }
        }
        
        // Clear active videos array
        activeVideos = [];
        
        // Remove error overlays
        var errors = document.querySelectorAll('.video-error-overlay');
        for (var j = 0; j < errors.length; j++) {
            if (errors[j].parentNode) {
                errors[j].parentNode.removeChild(errors[j]);
            }
        }
        
        console.log('[CanvasVideo] ✓ Cleanup complete');
        console.log('[CanvasVideo] ==========================================');
    }

    /**
     * Control functions for video playback
     */
    function play(elementId) {
        for (var i = 0; i < activeVideos.length; i++) {
            if (activeVideos[i].elementId === elementId) {
                activeVideos[i].element.play().catch(function(err) {
                    console.error('[CanvasVideo] Play failed:', err);
                });
                return;
            }
        }
        console.warn('[CanvasVideo] Video not found:', elementId);
    }

    function pause(elementId) {
        for (var i = 0; i < activeVideos.length; i++) {
            if (activeVideos[i].elementId === elementId) {
                activeVideos[i].element.pause();
                return;
            }
        }
        console.warn('[CanvasVideo] Video not found:', elementId);
    }

    function stop(elementId) {
        for (var i = 0; i < activeVideos.length; i++) {
            if (activeVideos[i].elementId === elementId) {
                var video = activeVideos[i].element;
                video.pause();
                video.currentTime = 0;
                return;
            }
        }
        console.warn('[CanvasVideo] Video not found:', elementId);
    }

    function setVolume(elementId, volume) {
        for (var i = 0; i < activeVideos.length; i++) {
            if (activeVideos[i].elementId === elementId) {
                activeVideos[i].element.volume = Math.max(0, Math.min(1, volume));
                return;
            }
        }
        console.warn('[CanvasVideo] Video not found:', elementId);
    }

    function seek(elementId, time) {
        for (var i = 0; i < activeVideos.length; i++) {
            if (activeVideos[i].elementId === elementId) {
                activeVideos[i].element.currentTime = time;
                return;
            }
        }
        console.warn('[CanvasVideo] Video not found:', elementId);
    }

    // Public API - matches your existing interface
    return {
        render: render,
        cleanup: cleanup,
        play: play,
        pause: pause,
        stop: stop,
        setVolume: setVolume,
        seek: seek
    };
})();