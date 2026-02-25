/**
 * CANVAS WEATHER WIDGET RENDERER - VERTICALLY ALIGNED VERSION
 * ✅ Icons perfectly aligned with text baseline
 * 🎨 Matches screenshot design exactly
 */
var CanvasWeather = (function() {
    'use strict';

    /**
     * 🎨 Draw detailed weather condition icons
     */
    function drawWeatherIcon(ctx, weatherCode, x, y, size) {
        ctx.save();
        
        var centerX = x + size / 2;
        var centerY = y + size / 2;
        
        // Determine icon type from weather code
        var iconType = 'sunny';
        if ([0].indexOf(weatherCode) >= 0) iconType = 'sunny';
        else if ([1].indexOf(weatherCode) >= 0) iconType = 'partly-cloudy';
        else if ([2].indexOf(weatherCode) >= 0) iconType = 'partly-cloudy-2';
        else if ([3, 45, 48].indexOf(weatherCode) >= 0) iconType = 'cloudy';
        else if ([51, 53, 55, 61, 63, 65].indexOf(weatherCode) >= 0) iconType = 'rain';
        else if ([71, 73, 75, 77, 85, 86].indexOf(weatherCode) >= 0) iconType = 'snow';
        else if ([80, 81, 82].indexOf(weatherCode) >= 0) iconType = 'showers';
        else if ([95, 96, 99].indexOf(weatherCode) >= 0) iconType = 'thunderstorm';
        
        switch(iconType) {
            case 'sunny':
                // ☀️ Bright yellow sun with rays
                ctx.fillStyle = '#FFD700';
                ctx.strokeStyle = '#FFD700';
                
                // Center circle
                ctx.beginPath();
                ctx.arc(centerX, centerY, size * 0.25, 0, Math.PI * 2);
                ctx.fill();
                
                // 8 sun rays
                ctx.lineWidth = size * 0.06;
                ctx.lineCap = 'round';
                for (var i = 0; i < 8; i++) {
                    var angle = (Math.PI * 2 / 8) * i;
                    var innerRadius = size * 0.32;
                    var outerRadius = size * 0.48;
                    
                    ctx.beginPath();
                    ctx.moveTo(
                        centerX + Math.cos(angle) * innerRadius,
                        centerY + Math.sin(angle) * innerRadius
                    );
                    ctx.lineTo(
                        centerX + Math.cos(angle) * outerRadius,
                        centerY + Math.sin(angle) * outerRadius
                    );
                    ctx.stroke();
                }
                break;
                
            case 'partly-cloudy':
                // 🌤️ Sun behind cloud
                // Draw sun (top-left)
                var sunX = centerX - size * 0.15;
                var sunY = centerY - size * 0.15;
                
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(sunX, sunY, size * 0.18, 0, Math.PI * 2);
                ctx.fill();
                
                // Sun rays (shorter)
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = size * 0.05;
                ctx.lineCap = 'round';
                for (var j = 0; j < 6; j++) {
                    var angle2 = (Math.PI * 2 / 6) * j;
                    var innerR = size * 0.22;
                    var outerR = size * 0.32;
                    
                    ctx.beginPath();
                    ctx.moveTo(
                        sunX + Math.cos(angle2) * innerR,
                        sunY + Math.sin(angle2) * innerR
                    );
                    ctx.lineTo(
                        sunX + Math.cos(angle2) * outerR,
                        sunY + Math.sin(angle2) * outerR
                    );
                    ctx.stroke();
                }
                
                // Draw cloud (bottom-right)
                drawDetailedCloud(ctx, centerX + size * 0.1, centerY + size * 0.1, size * 0.4, '#E8E8E8');
                break;
                
            case 'partly-cloudy-2':
                // ⛅ Larger cloud with sun
                // Sun peeking from behind
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(centerX - size * 0.2, centerY - size * 0.1, size * 0.2, 0, Math.PI * 2);
                ctx.fill();
                
                // Cloud in front
                drawDetailedCloud(ctx, centerX + size * 0.05, centerY + size * 0.05, size * 0.45, '#D0D0D0');
                break;
                
            case 'cloudy':
                // ☁️ Full cloud
                drawDetailedCloud(ctx, centerX, centerY, size * 0.5, '#AAAAAA');
                break;
                
            case 'rain':
                // 🌧️ Cloud with rain drops
                drawDetailedCloud(ctx, centerX, centerY - size * 0.1, size * 0.4, '#888888');
                
                // Rain drops (detailed)
                ctx.strokeStyle = '#4A90E2';
                ctx.lineWidth = size * 0.05;
                ctx.lineCap = 'round';
                
                for (var k = 0; k < 4; k++) {
                    var dropX = centerX - size * 0.25 + k * size * 0.17;
                    var dropY = centerY + size * 0.15;
                    
                    // Drop line
                    ctx.beginPath();
                    ctx.moveTo(dropX, dropY);
                    ctx.lineTo(dropX - size * 0.03, dropY + size * 0.2);
                    ctx.stroke();
                    
                    // Drop tip
                    ctx.fillStyle = '#4A90E2';
                    ctx.beginPath();
                    ctx.arc(dropX - size * 0.03, dropY + size * 0.2, size * 0.025, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'showers':
                // 🌦️ Cloud with sun and rain
                // Small sun
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(centerX - size * 0.2, centerY - size * 0.15, size * 0.15, 0, Math.PI * 2);
                ctx.fill();
                
                // Cloud
                drawDetailedCloud(ctx, centerX + size * 0.05, centerY - size * 0.05, size * 0.38, '#999999');
                
                // Rain
                ctx.strokeStyle = '#5BA3E8';
                ctx.lineWidth = size * 0.04;
                ctx.lineCap = 'round';
                for (var m = 0; m < 3; m++) {
                    var rx = centerX - size * 0.15 + m * size * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(rx, centerY + size * 0.15);
                    ctx.lineTo(rx - size * 0.02, centerY + size * 0.28);
                    ctx.stroke();
                }
                break;
                
            case 'snow':
                // 🌨️ Cloud with snowflakes
                drawDetailedCloud(ctx, centerX, centerY - size * 0.1, size * 0.4, '#B0B0B0');
                
                // Detailed snowflakes
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = size * 0.04;
                ctx.lineCap = 'round';
                
                for (var n = 0; n < 4; n++) {
                    var snowX = centerX - size * 0.25 + n * size * 0.17;
                    var snowY = centerY + size * 0.2;
                    drawDetailedSnowflake(ctx, snowX, snowY, size * 0.1);
                }
                break;
                
            case 'thunderstorm':
                // ⛈️ Dark cloud with lightning
                drawDetailedCloud(ctx, centerX, centerY - size * 0.15, size * 0.45, '#555555');
                
                // Lightning bolt (detailed)
                ctx.fillStyle = '#FFD700';
                ctx.strokeStyle = '#FFF700';
                ctx.lineWidth = size * 0.03;
                ctx.lineJoin = 'miter';
                
                ctx.beginPath();
                ctx.moveTo(centerX + size * 0.08, centerY - size * 0.05);
                ctx.lineTo(centerX - size * 0.02, centerY + size * 0.1);
                ctx.lineTo(centerX + size * 0.04, centerY + size * 0.1);
                ctx.lineTo(centerX - size * 0.08, centerY + size * 0.35);
                ctx.lineTo(centerX + size * 0.02, centerY + size * 0.15);
                ctx.lineTo(centerX - size * 0.03, centerY + size * 0.15);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }
    
    /**
     * 🎨 Draw detailed cloud shape
     */
    function drawDetailedCloud(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        
        // Left puff
        ctx.arc(x - size * 0.35, y + size * 0.05, size * 0.25, 0, Math.PI * 2);
        
        // Middle-left puff
        ctx.arc(x - size * 0.15, y - size * 0.15, size * 0.3, 0, Math.PI * 2);
        
        // Center puff (largest)
        ctx.arc(x + size * 0.05, y - size * 0.2, size * 0.35, 0, Math.PI * 2);
        
        // Right puff
        ctx.arc(x + size * 0.3, y + size * 0.05, size * 0.28, 0, Math.PI * 2);
        
        ctx.fill();
        
        // Bottom fill
        ctx.fillRect(x - size * 0.55, y + size * 0.05, size * 1.1, size * 0.25);
    }
    
    /**
     * 🎨 Draw detailed snowflake
     */
    function drawDetailedSnowflake(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = size * 0.12;
        ctx.lineCap = 'round';
        
        // 6 branches
        for (var i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3);
            
            // Main branch
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, size);
            ctx.stroke();
            
            // Side branches
            ctx.beginPath();
            ctx.moveTo(0, size * 0.6);
            ctx.lineTo(-size * 0.2, size * 0.8);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, size * 0.6);
            ctx.lineTo(size * 0.2, size * 0.8);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * 🎨 Draw detailed UI icons (matching screenshot style)
     */
    function drawIcon(ctx, iconName, x, y, size) {
        ctx.save();
        
        var centerX = x + size / 2;
        var centerY = y + size / 2;
        
        switch(iconName) {
            case 'thermometer':
                // 🌡️ Pink/red thermometer
                var bulbRadius = size * 0.2;
                var tubeWidth = size * 0.15;
                var tubeHeight = size * 0.55;
                
                // Bulb (bottom circle)
                ctx.fillStyle = '#FF6B9D';
                ctx.beginPath();
                ctx.arc(centerX, centerY + size * 0.25, bulbRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Tube (outer - light gray)
                ctx.fillStyle = '#E0E0E0';
                ctx.fillRect(
                    centerX - tubeWidth / 2,
                    centerY - size * 0.35,
                    tubeWidth,
                    tubeHeight
                );
                
                // Round top of tube
                ctx.beginPath();
                ctx.arc(centerX, centerY - size * 0.35, tubeWidth / 2, Math.PI, 0);
                ctx.fill();
                
                // Mercury (inner - pink/red)
                ctx.fillStyle = '#FF6B9D';
                var mercuryWidth = size * 0.08;
                ctx.fillRect(
                    centerX - mercuryWidth / 2,
                    centerY - size * 0.15,
                    mercuryWidth,
                    size * 0.4
                );
                
                // Temperature marks
                ctx.strokeStyle = '#999999';
                ctx.lineWidth = size * 0.02;
                for (var i = 0; i < 5; i++) {
                    var markY = centerY - size * 0.3 + i * size * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(centerX + tubeWidth / 2 + size * 0.02, markY);
                    ctx.lineTo(centerX + tubeWidth / 2 + size * 0.08, markY);
                    ctx.stroke();
                }
                break;
                
            case 'droplet':
                // 💧 Blue water droplet
                ctx.fillStyle = '#4A9FE8';
                
                // Droplet shape
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - size * 0.35);
                
                // Right curve
                ctx.bezierCurveTo(
                    centerX + size * 0.28, centerY - size * 0.2,
                    centerX + size * 0.28, centerY + size * 0.15,
                    centerX, centerY + size * 0.35
                );
                
                // Left curve
                ctx.bezierCurveTo(
                    centerX - size * 0.28, centerY + size * 0.15,
                    centerX - size * 0.28, centerY - size * 0.2,
                    centerX, centerY - size * 0.35
                );
                
                ctx.fill();
                
                // Highlight (lighter blue)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.arc(centerX - size * 0.08, centerY - size * 0.1, size * 0.12, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'wind':
                // 💨 Gray/purple wind lines
                ctx.strokeStyle = '#9B9BAB';
                ctx.lineCap = 'round';
                
                // Three curved wind lines
                var lines = [
                    { y: -0.2, length: 0.7, thickness: 0.08, curve: 0.15 },
                    { y: 0, length: 0.6, thickness: 0.1, curve: 0.1 },
                    { y: 0.2, length: 0.5, thickness: 0.08, curve: 0.12 }
                ];
                
                lines.forEach(function(line) {
                    ctx.lineWidth = size * line.thickness;
                    ctx.beginPath();
                    
                    var startX = centerX - size * line.length / 2;
                    var endX = centerX + size * line.length / 2;
                    var lineY = centerY + size * line.y;
                    
                    // Curved line
                    ctx.moveTo(startX, lineY);
                    ctx.quadraticCurveTo(
                        centerX,
                        lineY - size * line.curve,
                        endX,
                        lineY
                    );
                    ctx.stroke();
                });
                break;
                
            case 'eye':
                // 👁️ Purple eye icon
                ctx.strokeStyle = '#8B7AB8';
                ctx.fillStyle = '#8B7AB8';
                ctx.lineWidth = size * 0.08;
                
                // Eye outline
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, size * 0.4, size * 0.22, 0, 0, Math.PI * 2);
                ctx.stroke();
                
                // Pupil
                ctx.beginPath();
                ctx.arc(centerX, centerY, size * 0.15, 0, Math.PI * 2);
                ctx.fill();
                
                // Highlight
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(centerX - size * 0.05, centerY - size * 0.05, size * 0.05, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'location':
                // 📍 Pink/red location pin
                ctx.fillStyle = '#FF6B9D';
                
                // Pin top circle
                ctx.beginPath();
                ctx.arc(centerX, centerY - size * 0.1, size * 0.22, 0, Math.PI * 2);
                ctx.fill();
                
                // Pin point (bottom triangle)
                ctx.beginPath();
                ctx.moveTo(centerX - size * 0.15, centerY + size * 0.08);
                ctx.lineTo(centerX, centerY + size * 0.4);
                ctx.lineTo(centerX + size * 0.15, centerY + size * 0.08);
                ctx.closePath();
                ctx.fill();
                
                // Inner white circle
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(centerX, centerY - size * 0.1, size * 0.1, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }

    /* ── DOM overlay for video background mode ─────────────────── */
    var _weatherDomOverlays = [];

    function _isVideoBg() {
        try {
            var tj = Main.jsonTemplateData && Main.jsonTemplateData.template_json;
            return !!(tj && tj.canvas && tj.canvas.backgroundType === 'video');
        } catch (e) { return false; }
    }

    function _renderWeatherAsDom(el) {
        if (!el.weatherData) return;
        var data = el.weatherData;

        var canvas = document.getElementById('templateCanvas');
        if (!canvas) return;
        var container = canvas.parentElement;
        if (!container) return;

        var elId = String(el.id || el.name || 'weather');
        // Remove stale overlay
        var stale = document.querySelectorAll('[data-canvas-weather-id="' + elId + '"]');
        for (var s = 0; s < stale.length; s++) {
            if (stale[s].parentNode) stale[s].parentNode.removeChild(stale[s]);
        }

        var x       = Math.floor(el.x      || 0);
        var y       = Math.floor(el.y      || 0);
        var w       = Math.ceil(el.width   || 200);
        var h       = Math.ceil(el.height  || 100);
        var opacity = typeof el.opacity !== 'undefined' ? el.opacity : 1;
        var zIndex  = (el.zIndex && el.zIndex !== 'auto') ? el.zIndex : 10;
        var padding = el.backgroundPadding || 10;
        var baseFontSize = el.fontSize || 40;

        var wrap = document.createElement('div');
        wrap.setAttribute('data-canvas-weather-id', elId);
        wrap.style.cssText = 'position:absolute;pointer-events:none;margin:0;overflow:hidden;box-sizing:border-box;';
        wrap.style.left         = x + 'px';
        wrap.style.top          = y + 'px';
        wrap.style.width        = w + 'px';
        wrap.style.height       = h + 'px';
        wrap.style.opacity      = String(opacity);
        wrap.style.zIndex       = String(zIndex);
        wrap.style.padding      = padding + 'px';
        wrap.style.borderRadius = (el.backgroundRadius || 0) + 'px';
        wrap.style.fontFamily   = el.textFont || 'Arial';
        wrap.style.color        = el.textColor || el.color || '#ffffff';

        if (el.backgroundColor && el.backgroundColor !== 'transparent' &&
            !el.backgroundColor.endsWith('00')) {
            wrap.style.backgroundColor = el.backgroundColor;
        }

        if (el.rotation && el.rotation !== 0) {
            wrap.style.transform       = 'rotate(' + el.rotation + 'deg)';
            wrap.style.webkitTransform = 'rotate(' + el.rotation + 'deg)';
            wrap.style.transformOrigin = 'center center';
        }

        /* Build HTML weather content */
        var html = '';
        var fw = el.textBold ? 'bold' : 'normal';

        var tempValue = data.temperature
            ? (el.unit === 'fahrenheit' ? data.temperature.fahrenheit : data.temperature.celsius)
            : '--';

        /* Title / location */
        if (el.showTitle && (el.titleLabel || data.location)) {
            var titleText = el.titleLabel || data.location || 'Location';
            var tfs = el.titleFontSize || 20;
            html += '<div style="font-size:' + tfs + 'px;font-weight:' + (el.titleBold ? 'bold' : 'normal') +
                    ';color:' + (el.titleColor || '#ffffff') + ';margin-bottom:8px;white-space:nowrap;">&#128205; ' +
                    _escapeHtml(titleText) + '</div>';
        }

        /* Temperature */
        html += '<div style="font-size:' + baseFontSize + 'px;font-weight:' + fw +
                ';white-space:nowrap;margin-bottom:6px;">&#127777; ' + tempValue + '&deg;C</div>';

        /* Conditions */
        if (el.showConditions && data.conditions) {
            html += '<div style="font-size:' + baseFontSize + 'px;font-weight:' + fw +
                    ';white-space:nowrap;margin-bottom:6px;">&#9925; ' + _escapeHtml(data.conditions) + '</div>';
        }

        /* Humidity */
        if (el.showHumidity && typeof data.humidity !== 'undefined') {
            html += '<div style="font-size:' + baseFontSize + 'px;font-weight:' + fw +
                    ';white-space:nowrap;margin-bottom:6px;">&#128167; Humidity: ' + data.humidity + '%</div>';
        }

        /* Wind */
        if (el.showWindSpeed && typeof data.windSpeed !== 'undefined') {
            html += '<div style="font-size:' + baseFontSize + 'px;font-weight:' + fw +
                    ';white-space:nowrap;margin-bottom:6px;">&#128168; Wind: ' + data.windSpeed + ' km/h</div>';
        }

        /* Visibility */
        if (el.showVisibility && typeof data.visibility !== 'undefined') {
            html += '<div style="font-size:' + baseFontSize + 'px;font-weight:' + fw +
                    ';white-space:nowrap;">&#128065; Visibility: ' + data.visibility + ' km</div>';
        }

        /* Compact (no detailed flags) */
        if (!el.showConditions && !el.showHumidity && !el.showWindSpeed && !el.showVisibility) {
            /* already rendered temp above */
        }

        wrap.innerHTML = html;

        if (!container.style.position || container.style.position === 'static') {
            container.style.position = 'relative';
        }

        container.appendChild(wrap);
        _weatherDomOverlays.push(wrap);
        console.log('[CanvasWeather] DOM overlay created:', elId);
    }

    function _escapeHtml(t) {
        return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function cleanupWeather() {
        for (var i = 0; i < _weatherDomOverlays.length; i++) {
            if (_weatherDomOverlays[i] && _weatherDomOverlays[i].parentNode)
                _weatherDomOverlays[i].parentNode.removeChild(_weatherDomOverlays[i]);
        }
        _weatherDomOverlays = [];
    }

    function render(ctx, el) {
        if (!el.weatherData) {
            console.warn('[CanvasWeather] No weather data available');
            return;
        }

        // VIDEO BACKGROUND: use DOM overlay
        if (_isVideoBg()) {
            _renderWeatherAsDom(el);
            return;
        }

        ctx.save();
        CanvasBase.applyTransformations(ctx, el);
        
        // Background
        if (el.backgroundColor && el.backgroundColor !== 'transparent' && !el.backgroundColor.endsWith('00')) {
            ctx.fillStyle = CanvasBase.parseColorWithOpacity(el.backgroundColor, el.opacity);
            var radius = el.backgroundRadius || 0;
            if (radius > 0) {
                CanvasBase.roundRect(ctx, 0, 0, el.width, el.height, radius);
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, el.width, el.height);
            }
        }
        
        var data = el.weatherData;
        
        // Determine display mode
        var isDetailed = el.showHumidity || el.showWindSpeed || el.showConditions || el.showVisibility;
        
        if (isDetailed) {
            renderDetailedWeather(ctx, el, data);
        } else {
            renderCompactWeather(ctx, el, data);
        }
        
        ctx.restore();
    }

    /**
     * ✅ FIXED: Render detailed weather widget with PERFECT vertical alignment
     */ 
    function renderDetailedWeather(ctx, el, data) {
        var padding = el.backgroundPadding || 10;
        var currentY = padding;
        var baseFontSize = el.fontSize || 50;
        var iconSize = Math.round(baseFontSize * 0.85); // Slightly smaller for better alignment
        
        // Title/Location with pin icon
        if (el.showTitle && (el.titleLabel || data.location)) {
            var titleText = el.titleLabel || data.location || 'Location';
            var titleFontSize = el.titleFontSize || 20;
            
            ctx.font = (el.titleBold ? 'bold ' : '') + 
                       (el.titleItalic ? 'italic ' : '') + 
                       titleFontSize + 'px ' + (el.titleFont || 'Arial');
            ctx.fillStyle = el.titleColor || '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            var pinIconSize = Math.round(titleFontSize * 1.1);
            
            // ✅ FIXED: Align icon vertically with text
            var titleTextY = currentY + 2;
            var iconY = titleTextY;
            
            drawIcon(ctx, 'location', padding, iconY, pinIconSize);
            ctx.fillText(titleText, padding + pinIconSize + 8, titleTextY);
            
            currentY += Math.max(titleFontSize, pinIconSize) + 15;
        }
        
        // Setup base font
        ctx.font = (el.textBold ? 'bold ' : '') + baseFontSize + 'px ' + (el.textFont || 'Arial');
        ctx.fillStyle = el.textColor || el.color || '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle'; // ✅ CHANGED: Use 'middle' for better alignment
        
        // ✅ Temperature - PERFECT ALIGNMENT
        var tempValue = data.temperature 
            ? (el.unit === 'fahrenheit' ? data.temperature.fahrenheit : data.temperature.celsius)
            : '--';
        var tempText = tempValue + '°C';
        
        // Calculate text middle point
        var textMiddleY = currentY + baseFontSize / 2;
        
        // Draw icon centered on text middle
        drawIcon(ctx, 'thermometer', padding, textMiddleY - iconSize / 2, iconSize);
        
        // Draw text
        ctx.fillText(tempText, padding + iconSize + 12, textMiddleY);
        
        currentY += baseFontSize + 12;
        
        // ✅ Weather conditions - PERFECT ALIGNMENT
        if (el.showConditions && data.conditions) {
            var conditionsText = data.conditions || 'Clear';
            
            textMiddleY = currentY + baseFontSize / 2;
            
            drawWeatherIcon(ctx, data.weatherCode, padding, textMiddleY - iconSize / 2, iconSize);
            ctx.fillText(conditionsText, padding + iconSize + 12, textMiddleY);
            
            currentY += baseFontSize + 10;
        }
        
        // ✅ Humidity - PERFECT ALIGNMENT
        if (el.showHumidity && typeof data.humidity !== 'undefined') {
            var humidityText = 'Humidity: ' + data.humidity + '%';
            
            textMiddleY = currentY + baseFontSize / 2;
            
            drawIcon(ctx, 'droplet', padding, textMiddleY - iconSize / 2, iconSize);
            ctx.fillText(humidityText, padding + iconSize + 12, textMiddleY);
            
            currentY += baseFontSize + 10;
        }
        
        // ✅ Wind speed - PERFECT ALIGNMENT
        if (el.showWindSpeed && typeof data.windSpeed !== 'undefined') {
            var windText = 'Wind: ' + data.windSpeed + ' km/h';
            
            textMiddleY = currentY + baseFontSize / 2;
            
            drawIcon(ctx, 'wind', padding, textMiddleY - iconSize / 2, iconSize);
            ctx.fillText(windText, padding + iconSize + 12, textMiddleY);
            
            currentY += baseFontSize + 10;
        }
        
        // ✅ Visibility - PERFECT ALIGNMENT
        if (el.showVisibility && typeof data.visibility !== 'undefined') {
            var visibilityText = 'Visibility: ' + data.visibility + ' km';
            
            textMiddleY = currentY + baseFontSize / 2;
            
            drawIcon(ctx, 'eye', padding, textMiddleY - iconSize / 2, iconSize);
            ctx.fillText(visibilityText, padding + iconSize + 12, textMiddleY);
        }
    }

    /**
     * Render compact weather widget
     */
    function renderCompactWeather(ctx, el, data) {
        var padding = el.backgroundPadding || 10;
        
        var tempValue = data.temperature 
            ? (el.unit === 'fahrenheit' ? data.temperature.fahrenheit : data.temperature.celsius)
            : '--';
        var tempText = tempValue + '°C';
        
        var fontSize = el.fontSize || 50;
        ctx.font = (el.textBold ? 'bold ' : '') + fontSize + 'px ' + (el.textFont || 'Arial');
        ctx.fillStyle = el.textColor || el.color || '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        var centerY = el.height / 2;
        
        var iconSize = Math.round(fontSize * 1.1);
        var iconX = padding;
        
        // ✅ FIXED: Center icon vertically with text
        drawWeatherIcon(ctx, data.weatherCode, iconX, centerY - iconSize / 2, iconSize);
        
        ctx.fillText(tempText, iconX + iconSize + 15, centerY);
    }

    return { render: render, cleanup: cleanupWeather };
})();