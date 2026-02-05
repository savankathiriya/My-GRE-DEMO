/**
 * ====================================================================
 * CANVAS ACTION ELEMENT RENDERER - CSS OVERLAY FOCUS VERSION
 * Uses HTML overlays for focus instead of canvas redrawing
 * NO CANVAS REDRAW = NO BLINKING OR DUPLICATES
 * ====================================================================
 */

var CanvasAction = (function() {
    'use strict';

    // Store action elements for navigation
    var actionElements = [];
    var focusedIndex = -1;
    var focusOverlays = {}; // Store overlay elements by action ID

    /**
     * Render ACTION element - ONCE ONLY, NEVER REDRAWN
     */
    function render(ctx, el) {
        console.log('[CanvasAction] Rendering:', el.name || el.id);
        
        ctx.save();
        
        // Position & rotation
        CanvasBase.applyTransformations(ctx, el);
        
        // STEP 1: Check for background media first
        var hasBackgroundVideo = el.backgroundVideo && el.displayMode === 'video';
        var hasBackgroundImage = el.backgroundImage && el.backgroundImage.length > 0;
        var hasImageData = el.imageData && el.imageData.trim() !== '';
        var hasAnyBackgroundMedia = hasBackgroundVideo || hasBackgroundImage || hasImageData;
        
        // STEP 2: Only draw solid background color if NO background media available
        if (!hasAnyBackgroundMedia && el.backgroundColor) {
            ctx.fillStyle = el.backgroundColor;
            
            if (el.borderRadius > 0) {
                CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, el.width, el.height);
            }
        }
        
        // STEP 3: Draw NORMAL border (focus will be handled by CSS overlay)
        var borderWidth = el.borderWidth > 0 ? el.borderWidth : 0;
        var borderColor = el.borderColor || '#d9d9d9';
        
        if (borderWidth > 0) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            
            if (el.borderRadius > 0) {
                CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(0, 0, el.width, el.height);
            }
        }
        
        ctx.restore();
        
        // STEP 4: Load background media asynchronously
        if (hasBackgroundVideo) {
            renderVideoBackgroundPlaceholder(ctx, el);
            drawActionText(ctx, el);
        } 
        else if (hasBackgroundImage) {
            var imgSrc = Array.isArray(el.backgroundImage) ? el.backgroundImage[0] : el.backgroundImage;
            loadAndDrawActionBackground(ctx, el, imgSrc, 'url');
        } 
        else if (hasImageData) {
            var imgSrc = el.imageData.indexOf('data:') === 0 ? el.imageData : 'data:image/png;base64,' + el.imageData;
            loadAndDrawActionBackground(ctx, el, imgSrc, 'base64');
        }
        else {
            // No background image/video, just draw text immediately
            drawActionText(ctx, el);
        }

        // STEP 5: Create CSS overlay for focus (HTML element on top of canvas)
        createFocusOverlay(el);
    }

    /**
     * 🔥 NEW: Create CSS overlay for focus indication
     * This overlay sits on top of canvas and shows/hides for focus
     */
    function createFocusOverlay(el) {
        var elementId = el.id || el.name || 'action-' + Math.random();
        
        // Skip if overlay already exists
        if (focusOverlays[elementId]) {
            return;
        }

        var canvas = document.getElementById('templateCanvas');
        if (!canvas) return;

        var container = canvas.parentElement;
        if (!container) return;

        // Create overlay div
        var overlay = document.createElement('div');
        overlay.id = 'focus-overlay-' + elementId;
        overlay.style.position = 'absolute';
        overlay.style.pointerEvents = 'none';
        overlay.style.display = 'none'; // Hidden by default
        overlay.style.zIndex = '1000';
        
        // Calculate position based on canvas size and element position
        var canvasRect = canvas.getBoundingClientRect();
        var canvasWidth = canvas.width;
        var canvasHeight = canvas.height;
        
        // Calculate scale factor from design to display
        var scaleX = canvasRect.width / canvasWidth;
        var scaleY = canvasRect.height / canvasHeight;
        
        // Position overlay
        overlay.style.left = (el.x * scaleX) + 'px';
        overlay.style.top = (el.y * scaleY) + 'px';
        overlay.style.width = (el.width * scaleX) + 'px';
        overlay.style.height = (el.height * scaleY) + 'px';
        
        // Focus border styling
        var focusBorderWidth = el.focusBorderWidth || 4;
        var focusBorderColor = el.focusBorderColor || '#3b82f6';
        var borderRadius = el.borderRadius || 0;
        
        overlay.style.border = focusBorderWidth + 'px solid ' + focusBorderColor;
        overlay.style.borderRadius = (borderRadius * scaleX) + 'px';
        overlay.style.boxSizing = 'border-box';
        
        // Optional: Add glow effect
        overlay.style.boxShadow = '0 0 20px ' + focusBorderColor;
        
        // Add transition for smooth show/hide
        overlay.style.transition = 'opacity 0.2s ease-in-out';
        overlay.style.opacity = '0';
        
        container.appendChild(overlay);
        focusOverlays[elementId] = overlay;
        
        console.log('[CanvasAction] Created focus overlay for:', elementId);
    }

    /**
     * 🔥 NEW: Update focus overlays (show focused, hide others)
     */
    function updateFocusOverlays() {
        // Hide all overlays first
        for (var id in focusOverlays) {
            if (focusOverlays.hasOwnProperty(id)) {
                var overlay = focusOverlays[id];
                overlay.style.display = 'none';
                overlay.style.opacity = '0';
            }
        }
        
        // Show overlay for focused element
        if (focusedIndex >= 0 && focusedIndex < actionElements.length) {
            var focusedEl = actionElements[focusedIndex];
            var elementId = focusedEl.id || focusedEl.name || 'action-unknown';
            var focusedOverlay = focusOverlays[elementId];
            
            if (focusedOverlay) {
                focusedOverlay.style.display = 'block';
                // Use setTimeout to trigger CSS transition
                setTimeout(function() {
                    focusedOverlay.style.opacity = '1';
                }, 10);
            }
        }
    }

    /**
     * Draw text on action elements
     */
    function drawActionText(ctx, el) {
        if (!el.text || el.showTextOverlay === false) {
            return;
        }
        
        ctx.save();
        
        // Re-apply position and rotation
        ctx.translate(el.x || 0, el.y || 0);
        if (el.rotation) {
            ctx.translate(el.width / 2, el.height / 2);
            ctx.rotate(el.rotation * Math.PI / 180);
            ctx.translate(-el.width / 2, -el.height / 2);
        }
        
        ctx.globalAlpha = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        
        var fontSize = el.fontSize || 22;
        var fontFamily = el.fontFamily || 'Arial';
        
        ctx.font = fontSize + 'px ' + fontFamily;
        ctx.fillStyle = el.color || '#ffffff';
        ctx.textAlign = el.textAlign || 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate text position
        var textX;
        if (el.textAlign === 'left') {
            textX = 10;
        } else if (el.textAlign === 'right') {
            textX = el.width - 10;
        } else {
            textX = el.width / 2;
        }
        
        // Vertical alignment
        var textY;
        if (el.textAlignVertical === 'top') {
            textY = fontSize + 10;
        } else if (el.textAlignVertical === 'middle' || el.textAlignVertical === 'center') {
            textY = el.height / 2;
        } else { // bottom (default)
            textY = el.height - 40;
        }
        
        // Add text shadow for readability
        var shadowIntensity = el.textShadowIntensity || 0.7;
        ctx.shadowColor = 'rgba(0, 0, 0, ' + shadowIntensity + ')';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText(el.text, textX, textY);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.restore();
        
        console.log('[CanvasAction] ✅ Text drawn:', el.text);
    }

    /**
     * Load and draw background for action element
     */
    function loadAndDrawActionBackground(ctx, el, imageSrc, sourceType) {
        var img = new Image();
        
        if (sourceType === 'url') {
            img.crossOrigin = 'anonymous';
        }
        
        // Store element data for async callback
        var elementData = {
            x: el.x || 0,
            y: el.y || 0,
            width: el.width,
            height: el.height,
            rotation: el.rotation || 0,
            opacity: typeof el.opacity !== 'undefined' ? el.opacity : 1,
            borderRadius: el.borderRadius || 0,
            imageSize: el.imageSize || 'cover',
            vignetteEffect: el.vignetteEffect,
            vignetteIntensity: el.vignetteIntensity || 1,
            name: el.name || el.id
        };
        
        img.onload = function() {
            try {
                ctx.save();
                
                // Re-apply transformations
                ctx.translate(elementData.x, elementData.y);
                if (elementData.rotation) {
                    ctx.translate(elementData.width / 2, elementData.height / 2);
                    ctx.rotate(elementData.rotation * Math.PI / 180);
                    ctx.translate(-elementData.width / 2, -elementData.height / 2);
                }
                
                ctx.globalAlpha = elementData.opacity;
                
                // Clip to border radius
                if (elementData.borderRadius > 0) {
                    CanvasBase.roundRect(ctx, 0, 0, elementData.width, elementData.height, elementData.borderRadius);
                    ctx.clip();
                }
                
                // Draw background image
                CanvasBase.drawImageWithFit(ctx, img, 0, 0, elementData.width, elementData.height, elementData.imageSize);
                
                // Apply vignette effect
                if (elementData.vignetteEffect) {
                    CanvasBase.applyVignette(ctx, elementData.width, elementData.height, elementData.vignetteEffect, elementData.vignetteIntensity);
                }
                
                ctx.restore();
                
                console.log('[CanvasAction] ✅ Background ' + sourceType + ' loaded:', elementData.name);
                
                // Draw text AFTER image loads
                drawActionText(ctx, el);
                
            } catch (e) {
                console.warn('[CanvasAction] Failed to draw background ' + sourceType + ':', e);
                drawActionText(ctx, el);
            }
        };
        
        img.onerror = function() {
            console.warn('[CanvasAction] ❌ Background ' + sourceType + ' load failed:', elementData.name);
            
            // If background image fails to load, show background color as fallback
            if (el.backgroundColor) {
                ctx.save();
                ctx.translate(el.x || 0, el.y || 0);
                if (el.rotation) {
                    ctx.translate(el.width / 2, el.height / 2);
                    ctx.rotate(el.rotation * Math.PI / 180);
                    ctx.translate(-el.width / 2, -el.height / 2);
                }
                
                ctx.fillStyle = el.backgroundColor;
                if (el.borderRadius > 0) {
                    CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
                    ctx.fill();
                } else {
                    ctx.fillRect(0, 0, el.width, el.height);
                }
                ctx.restore();
            }
            
            drawActionText(ctx, el);
        };
        
        img.src = imageSrc;
    }

    /**
     * Render video background placeholder for action element
     */
    function renderVideoBackgroundPlaceholder(ctx, el) {
        ctx.save();
        
        ctx.translate(el.x || 0, el.y || 0);
        if (el.rotation) {
            ctx.translate(el.width / 2, el.height / 2);
            ctx.rotate(el.rotation * Math.PI / 180);
            ctx.translate(-el.width / 2, -el.height / 2);
        }
        
        ctx.globalAlpha = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        
        // Clip to border radius
        if (el.borderRadius > 0) {
            CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, el.borderRadius);
            ctx.clip();
        }
        
        // Dark background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, el.width, el.height);
        
        // Play icon
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        var centerX = el.width / 2;
        var centerY = el.height / 2;
        var iconSize = Math.min(el.width, el.height) * 0.15;
        
        ctx.beginPath();
        ctx.moveTo(centerX - iconSize / 2, centerY - iconSize);
        ctx.lineTo(centerX - iconSize / 2, centerY + iconSize);
        ctx.lineTo(centerX + iconSize, centerY);
        ctx.closePath();
        ctx.fill();
        
        // "Video" text
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('Video', centerX, centerY + iconSize + 25);
        
        ctx.restore();
        
        console.log('[CanvasAction] Video background placeholder rendered:', el.name || el.id);
    }

    /**
     * Initialize action elements for navigation
     */
    function initializeNavigation(elements) {
        actionElements = [];
        
        // Clear existing overlays
        cleanup();
        
        // Filter only action type elements that are visible
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if ((el.type === 'action' || el.type === 'button' || el.type === 'card') && el.visible !== false) {
                actionElements.push(el);
            }
        }
        
        // Sort by position (top to bottom, left to right)
        actionElements.sort(function(a, b) {
            var yDiff = (a.y || 0) - (b.y || 0);
            if (Math.abs(yDiff) > 50) { // Same row threshold
                return yDiff;
            }
            return (a.x || 0) - (b.x || 0);
        });
        
        // Set initial focus
        if (actionElements.length > 0) {
            focusedIndex = 0;
            updateFocusOverlays();
        }
        
        console.log('[CanvasAction] Initialized navigation with', actionElements.length, 'action elements');
    }

    /**
     * Find closest element in a direction
     */
    function findClosestInDirection(currentEl, direction) {
        var currentX = currentEl.x + currentEl.width / 2;
        var currentY = currentEl.y + currentEl.height / 2;
        
        var bestDistance = Infinity;
        var bestIndex = -1;
        
        for (var i = 0; i < actionElements.length; i++) {
            if (actionElements[i] === currentEl) continue;
            
            var el = actionElements[i];
            var elX = el.x + el.width / 2;
            var elY = el.y + el.height / 2;
            
            var isValid = false;
            var distance = 0;
            
            if (direction === 'up') {
                isValid = elY < currentY - 20; // Above current
                distance = Math.sqrt(Math.pow(elX - currentX, 2) + Math.pow(elY - currentY, 2));
            } else if (direction === 'down') {
                isValid = elY > currentY + 20; // Below current
                distance = Math.sqrt(Math.pow(elX - currentX, 2) + Math.pow(elY - currentY, 2));
            } else if (direction === 'left') {
                isValid = elX < currentX - 20; // Left of current
                distance = Math.sqrt(Math.pow(elX - currentX, 2) + Math.pow(elY - currentY, 2));
            } else if (direction === 'right') {
                isValid = elX > currentX + 20; // Right of current
                distance = Math.sqrt(Math.pow(elX - currentX, 2) + Math.pow(elY - currentY, 2));
            }
            
            if (isValid && distance < bestDistance) {
                bestDistance = distance;
                bestIndex = i;
            }
        }
        
        return bestIndex;
    }

    /**
     * 🔥 OPTIMIZED: Move focus - NO CANVAS REDRAW, just update CSS overlays
     */
    function moveFocus(direction) {
        if (actionElements.length === 0 || focusedIndex < 0) return false;
        
        var currentEl = actionElements[focusedIndex];
        var newIndex = findClosestInDirection(currentEl, direction);
        
        if (newIndex >= 0) {
            // Update focus index
            focusedIndex = newIndex;
            
            // Update CSS overlays (NO CANVAS REDRAW!)
            updateFocusOverlays();
            
            console.log('[CanvasAction] Focus moved to:', actionElements[focusedIndex].name || actionElements[focusedIndex].id);
            
            return true;
        }
        
        return false;
    }

    /**
     * Execute action of focused element
     */
    function executeAction() {
        if (focusedIndex < 0 || focusedIndex >= actionElements.length) {
            console.warn('[CanvasAction] No focused element to execute');
            return;
        }
        
        var el = actionElements[focusedIndex];
        
        console.log('[CanvasAction] Executing action:', {
            type: el.actionType,
            value: el.actionValue,
            text: el.text
        });
        
        // Handle different action types
        if (el.actionType === 'app') {
            handleAppAction(el);
        } else if (el.actionType === 'dynamicPage') {
            handleDynamicPageAction(el);
        } else if (el.actionType === 'url') {
            handleUrlAction(el);
        } else {
            console.warn('[CanvasAction] Unknown action type:', el.actionType);
        }
    }

    /**
     * Handle app launch action
     */
    function handleAppAction(el) {
        var appId = el.actionValue;
        
        console.log('[CanvasAction] Launching app:', appId);
        
        // Map of app IDs to launch functions
        var appHandlers = {
            'Netflix': function() {
                if (typeof hcap !== 'undefined' && hcap.preloadedApplication) {
                    hcap.preloadedApplication.launchPreloadedApplication({
                        id: "244115188075859013",
                        parameters: JSON.stringify({
                            reason: "launcher",
                            params: {
                                hotel_id: "GRE1234",
                                launcher_version: "1.0"
                            }
                        }),
                        onSuccess: function() {
                            console.log('[CanvasAction] Netflix launched successfully');
                        },
                        onFailure: function(err) {
                            console.error('[CanvasAction] Netflix launch failed:', err.errorMessage);
                        }
                    });
                }
            },
            'Youtube': function() {
                if (typeof hcap !== 'undefined' && hcap.preloadedApplication) {
                    hcap.preloadedApplication.launchPreloadedApplication({
                        id: "144115188075859002",
                        parameters: "{}",
                        onSuccess: function() {
                            console.log('[CanvasAction] YouTube launched successfully');
                        },
                        onFailure: function(err) {
                            console.error('[CanvasAction] YouTube launch failed:', err.errorMessage);
                        }
                    });
                }
            },
            'accuweather': function() {
                if (typeof hcap !== 'undefined' && hcap.preloadedApplication) {
                    hcap.preloadedApplication.launchPreloadedApplication({
                        id: "144115188075855876",
                        parameters: "{}",
                        onSuccess: function() {
                            console.log('[CanvasAction] AccuWeather launched successfully');
                        },
                        onFailure: function(err) {
                            console.error('[CanvasAction] AccuWeather launch failed:', err.errorMessage);
                        }
                    });
                }
            },
            'hdmi': function() {
                if (typeof Main !== 'undefined') {
                    Main.addBackData("MyDevice");
                    view = "MyDevice";
                    presentPagedetails.view = view;
                    if (typeof Util !== 'undefined' && Util.DevicesSwitchPage) {
                        Util.DevicesSwitchPage();
                    }
                }
            },
            'Cleardata': function() {
                if (typeof Main !== 'undefined') {
                    Main.popupData = {};
                    Main.popupData.popuptype = "clearData";
                    if (typeof macro !== 'undefined' && typeof Util !== 'undefined') {
                        macro("#popUpFDFS").html(Util.clearDataPage());
                        macro("#popupBtn-0").addClass('popupFocus');
                    }
                }
            },
            'com.guest.chromecast': function() {
                if (typeof Main !== 'undefined' && Main.handleGoogleCast) {
                    Main.handleGoogleCast();
                }
            },
            'LGTV': function() {
                if (typeof Main !== 'undefined' && Main.lgLgChannelIdApi) {
                    Main.lgLgChannelIdApi(true);
                }
            },
            'LIVETV': function() {
                if (typeof Main !== 'undefined' && Main.liveTvChannelIdApi) {
                    Main.liveTvChannelIdApi(true);
                }
            }
        };
        
        // Execute app handler if exists
        if (appHandlers[appId]) {
            appHandlers[appId]();
        } else {
            console.warn('[CanvasAction] No handler for app:', appId);
        }
    }

    /**
     * Handle dynamic page action
     */
    function handleDynamicPageAction(el) {
        var pageUuid = el.actionValue;
        
        console.log('[CanvasAction] Loading dynamic page:', pageUuid);
        
        if (typeof Main === 'undefined') {
            console.error('[CanvasAction] Main object not available');
            return;
        }
        
        // Show loading
        if (typeof Main.ShowLoading === 'function') {
            Main.ShowLoading();
        }
        
        // Fetch template data for the dynamic page
        if (typeof macro !== 'undefined') {
            macro.ajax({
                url: apiPrefixUrl + "json-template?template_uuid=" + pageUuid,
                type: "GET",
                headers: {
                    Authorization: "Bearer " + (pageDetails && pageDetails.access_token ? pageDetails.access_token : "")
                },
                success: function(response) {
                    try {
                        var result = typeof response === "string" ? JSON.parse(response) : response;
                        
                        if (result.status === true) {
                            Main.jsonTemplateData = result.result;
                            
                            console.log('[CanvasAction] Template loaded successfully');
                            
                            // Hide loading
                            if (typeof Main.HideLoading === 'function') {
                                Main.HideLoading();
                            }
                            
                            // Render the new template
                            if (typeof macro !== 'undefined') {
                                macro("#mainContent").html('');
                                if (typeof Util !== 'undefined' && Util.ourHotelPage) {
                                    macro("#mainContent").html(Util.ourHotelPage());
                                    macro("#mainContent").show();
                                }
                            }
                        } else {
                            console.error('[CanvasAction] Template API returned status: false');
                            if (typeof Main.HideLoading === 'function') {
                                Main.HideLoading();
                            }
                        }
                    } catch (parseError) {
                        console.error('[CanvasAction] Failed to parse template response:', parseError);
                        if (typeof Main.HideLoading === 'function') {
                            Main.HideLoading();
                        }
                    }
                },
                error: function(err) {
                    console.error('[CanvasAction] Template load failed:', err);
                    if (typeof Main.HideLoading === 'function') {
                        Main.HideLoading();
                    }
                },
                timeout: 30000
            });
        }
    }

    /**
     * Handle URL action
     */
    function handleUrlAction(el) {
        var url = el.actionValue;
        console.log('[CanvasAction] Opening URL:', url);
        
        // This would require browser integration
        console.warn('[CanvasAction] URL actions not yet implemented for TV environment');
    }

    /**
     * Get focused element
     */
    function getFocusedElement() {
        if (focusedIndex >= 0 && focusedIndex < actionElements.length) {
            return actionElements[focusedIndex];
        }
        return null;
    }

    /**
     * Cleanup overlays
     */
    function cleanup() {
        console.log('[CanvasAction] Cleaning up focus overlays');
        
        for (var id in focusOverlays) {
            if (focusOverlays.hasOwnProperty(id)) {
                var overlay = focusOverlays[id];
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }
        }
        
        focusOverlays = {};
    }

    // Public API
    return {
        render: render,
        initializeNavigation: initializeNavigation,
        moveFocus: moveFocus,
        executeAction: executeAction,
        getFocusedElement: getFocusedElement,
        cleanup: cleanup
    };
})();