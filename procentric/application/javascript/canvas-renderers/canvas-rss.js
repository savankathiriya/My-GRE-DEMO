/**
 * ====================================================================
 * CANVAS RSS FEED RENDERER
 * Displays RSS feed items with title and description
 * Uses HTML overlay for RSS content display
 * ====================================================================
 */

var CanvasRss = (function() {
    'use strict';
    
    var rssOverlays = {}; // Store RSS overlay elements
    var rssFeedCache = {}; // Cache feed data
    var fetchingFeeds = {}; // Track ongoing fetches
    
    function _isVideoBg() {
        try {
            var tj = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
            return !!(tj && tj.canvas && tj.canvas.backgroundType === 'video');
        } catch (e) { return false; }
    }

    function render(ctx, el, canvas) {
        if (!el.feedUrl) {
            console.warn('[CanvasRss] RSS element missing feedUrl:', el.name || el.id);
            return;
        }
        
        console.log('[CanvasRss] Rendering RSS feed:', el.name || el.id, el.feedUrl);

        // VIDEO BACKGROUND: skip canvas placeholder draw entirely — it would block the video.
        // The DOM overlay (createRssOverlay) handles all visual rendering.
        if (!_isVideoBg()) {
            ctx.save();
            CanvasBase.applyTransformations(ctx, el);
            if (el.backgroundColor && el.backgroundColor !== 'transparent') {
                ctx.fillStyle = el.backgroundColor;
                ctx.fillRect(0, 0, el.width, el.height);
            }
            ctx.restore();
        }
        
        // Create or update HTML overlay for RSS content
        createRssOverlay(el, canvas);
    }
    
    function createRssOverlay(el, canvas) {
        var elementId = el.id || el.name || 'rss-' + Math.random();
        
        if (!canvas) {
            canvas = document.getElementById('templateCanvas');
        }
        
        if (!canvas) {
            console.error('[CanvasRss] Canvas element not found');
            return;
        }
        
        var container = canvas.parentElement;
        if (!container) return;
        
        // Remove old overlay if exists
        if (rssOverlays[elementId]) {
            try {
                if (rssOverlays[elementId].parentNode) {
                    rssOverlays[elementId].parentNode.removeChild(rssOverlays[elementId]);
                }
            } catch (e) {
                console.warn('[CanvasRss] Error removing old overlay:', e);
            }
        }
        
        // Create new overlay
        var overlay = document.createElement('div');
        overlay.id = 'rss-overlay-' + elementId;
        overlay.className = 'rss-overlay';
        container.appendChild(overlay);
        rssOverlays[elementId] = overlay;
        
        // Calculate position.
        // el.x/y/width/height are already in screen pixels (CanvasScaler has run).
        // The canvas is position:absolute inside the container, so canvas pixels
        // map 1:1 to container-relative pixels — no scale factor needed.
        var scaleX = 1, scaleY = 1;
        try {
            var canvasRect = canvas.getBoundingClientRect();
            // Only apply scale if canvas CSS size differs from its pixel size
            // (e.g. legacy non-CanvasScaler path)
            if (Math.abs(canvasRect.width - canvas.width) > 2) {
                scaleX = canvasRect.width  / canvas.width;
                scaleY = canvasRect.height / canvas.height;
            }
        } catch (e) { /* use 1:1 */ }

        overlay.style.position = 'absolute';
        overlay.style.left = (el.x * scaleX) + 'px';
        overlay.style.top = (el.y * scaleY) + 'px';
        overlay.style.width = (el.width * scaleX) + 'px';
        overlay.style.height = (el.height * scaleY) + 'px';
        overlay.style.backgroundColor = el.backgroundColor || 'transparent';
        overlay.style.overflow = 'hidden';
        overlay.style.overflowY = 'auto';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '100';
        overlay.style.padding = '10px';
        overlay.style.boxSizing = 'border-box';
        
        // Check cache first
        if (rssFeedCache[el.feedUrl]) {
            console.log('[CanvasRss] Using cached feed data');
            displayRssItems(el, overlay, rssFeedCache[el.feedUrl]);
        } else {
            // Fetch and display RSS feed
            fetchAndDisplayRss(el, overlay);
        }
    }
    
    function fetchAndDisplayRss(el, overlay) {
        // Prevent duplicate fetches
        if (fetchingFeeds[el.feedUrl]) {
            console.log('[CanvasRss] Already fetching this feed');
            return;
        }
        
        fetchingFeeds[el.feedUrl] = true;
        
        // Show loading state
        overlay.innerHTML = '<div style="color: ' + (el.titleColor || '#000000') + '; font-family: Arial; font-size: 14px; text-align: center; padding: 20px;">Loading RSS feed...</div>';
        
        // Use RSS2JSON API as a free CORS proxy
        var proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(el.feedUrl);
        
        var xhr = new XMLHttpRequest();
        xhr.open('GET', proxyUrl, true);
        xhr.timeout = 15000; // 15 second timeout
        
        xhr.onload = function() {
            fetchingFeeds[el.feedUrl] = false;
            
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data.status === 'ok' && data.items) {
                        console.log('[CanvasRss] ✅ Fetched', data.items.length, 'items from feed');
                        rssFeedCache[el.feedUrl] = data.items; // Cache the data
                        displayRssItems(el, overlay, data.items);
                    } else {
                        console.error('[CanvasRss] Invalid feed response:', data);
                        showError(overlay, 'Failed to parse RSS feed');
                    }
                } catch (e) {
                    console.error('[CanvasRss] Parse error:', e);
                    showError(overlay, 'Error parsing feed data');
                }
            } else {
                console.error('[CanvasRss] HTTP error:', xhr.status);
                showError(overlay, 'Failed to load RSS feed (HTTP ' + xhr.status + ')');
            }
        };
        
        xhr.onerror = function() {
            fetchingFeeds[el.feedUrl] = false;
            console.error('[CanvasRss] Network error loading RSS');
            showError(overlay, 'Network error loading feed');
        };
        
        xhr.ontimeout = function() {
            fetchingFeeds[el.feedUrl] = false;
            console.error('[CanvasRss] RSS feed timeout');
            showError(overlay, 'Feed loading timeout');
        };
        
        xhr.send();
    }
    
    function displayRssItems(el, overlay, items) {
        var maxItems = el.maxItems || 5;
        var fontSize = el.fontSize || 14;
        var itemSpacing = el.itemSpacing || 10;
        
        var html = '';
        var displayItems = items.slice(0, maxItems);
        
        for (var i = 0; i < displayItems.length; i++) {
            var item = displayItems[i];
            
            html += '<div style="margin-bottom: ' + itemSpacing + 'px;">';
            
            // Title
            if (el.showTitle !== false && item.title) {
                html += '<div style="color: ' + (el.titleColor || '#000000') + '; font-size: ' + fontSize + 'px; font-weight: bold; font-family: Arial; margin-bottom: 4px; line-height: 1.3;">';
                html += escapeHtml(item.title);
                html += '</div>';
            }
            
            // Description
            if (el.showDescription !== false && item.description) {
                var cleanDesc = stripHtml(item.description).substring(0, 150);
                if (item.description.length > 150) cleanDesc += '...';
                
                html += '<div style="color: ' + (el.descriptionColor || '#666666') + '; font-size: ' + (fontSize - 2) + 'px; font-family: Arial; line-height: 1.4;">';
                html += escapeHtml(cleanDesc);
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        overlay.innerHTML = html;
        console.log('[CanvasRss] ✅ Displayed', displayItems.length, 'RSS items');
    }
    
    function showError(overlay, message) {
        overlay.innerHTML = '<div style="color: #cc0000; font-family: Arial; font-size: 12px; padding: 10px;">' + escapeHtml(message) + '</div>';
    }
    
    function stripHtml(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }
    
    function escapeHtml(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    function cleanup() {
        console.log('[CanvasRss] Cleaning up RSS overlays');
        
        // Remove all overlays
        for (var id in rssOverlays) {
            if (rssOverlays.hasOwnProperty(id)) {
                var overlay = rssOverlays[id];
                if (overlay && overlay.parentNode) {
                    try {
                        overlay.parentNode.removeChild(overlay);
                    } catch (e) {
                        console.warn('[CanvasRss] Error removing overlay:', e);
                    }
                }
            }
        }
        
        rssOverlays = {};
        fetchingFeeds = {};
        // Keep cache for reuse: rssFeedCache = {};
    }
    
    function clearCache() {
        rssFeedCache = {};
        console.log('[CanvasRss] Cache cleared');
    }
    
    return {
        render: render,
        cleanup: cleanup,
        clearCache: clearCache
    };
})();