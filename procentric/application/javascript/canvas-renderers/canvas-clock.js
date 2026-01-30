/**
 * ====================================================================
 * CANVAS CLOCK/TIMER WIDGET RENDERER - ENHANCED VERSION
 * Handles analog/digital clocks, countdown timers, and date display
 * Updates live every second via CanvasRenderer.startAnimationLoop()
 * Properly respects element dimensions and colors
 * ====================================================================
 */

var CanvasClock = (function() {
    'use strict';

    /**
     * Render CLOCK/TIMER widget element
     */
    function render(ctx, el) {
        console.log('[CanvasClock] Rendering:', el.name || el.id, 'DisplayMode:', el.displayMode, 'ClockType:', el.clockType);
        
        ctx.save();
        
        // Apply transformations
        CanvasBase.applyTransformations(ctx, el);
        
        // Draw background
        if (el.enableBackground && el.backgroundColor && el.backgroundColor !== 'transparent') {
            var bgOpacity = typeof el.backgroundOpacity !== 'undefined' ? el.backgroundOpacity : 1;
            var bgColor = CanvasBase.parseColorWithOpacity(el.backgroundColor, bgOpacity);
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, el.width, el.height);
        }
        
        // Determine what to render based on displayMode and clockType
        var displayMode = (el.displayMode || '').toLowerCase();
        var clockType = (el.clockType || '').toLowerCase();
        
        console.log('[CanvasClock] Mode:', displayMode, 'Type:', clockType, 'Size:', el.width + 'x' + el.height);
        
        if (displayMode === 'countdown') {
            renderCountdown(ctx, el);
        } else if (displayMode === 'date') {
            renderDateOnly(ctx, el);
        } else if (displayMode === 'datetime') {
            renderDateTimeCombo(ctx, el);
        } else if (displayMode === 'clock' || displayMode === 'time' || displayMode === '' || !displayMode) {
            // Check clockType to determine analog vs digital
            if (clockType === 'analog') {
                renderAnalogClock(ctx, el);
            } else {
                // Default to digital clock (clockType === 'digital' or not specified)
                renderDigitalClock(ctx, el);
            }
        } else if (displayMode === 'digital') {
            renderDigitalClock(ctx, el);
        } else if (displayMode === 'analog') {
            renderAnalogClock(ctx, el);
        } else {
            // Fallback: check clockType
            if (clockType === 'analog') {
                renderAnalogClock(ctx, el);
            } else {
                renderDigitalClock(ctx, el);
            }
        }
        
        ctx.restore();
        
        console.log('[CanvasClock] âœ… Clock rendered successfully');
    }

    /**
     * Render analog clock with proper styling - UPDATES EVERY SECOND
     */
    function renderAnalogClock(ctx, el) {
        console.log('[CanvasClock] Rendering ANALOG clock');
        
        var centerX = el.width / 2;
        var centerY = el.height / 2;
        var radius = Math.min(el.width, el.height) / 2 - 10;
        
        // Get CURRENT time - this updates every time render is called
        var now = new Date();
        var hours = now.getHours() % 12;
        var minutes = now.getMinutes();
        var seconds = now.getSeconds();
        var milliseconds = now.getMilliseconds();
        
        console.log('[CanvasClock] â° Analog time:', pad(hours) + ':' + pad(minutes) + ':' + pad(seconds), '@', now.toLocaleTimeString());
        
        // Draw clock face background
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = el.clockFaceColor || '#ffffff';
        ctx.fill();
        
        // Draw clock border
        if ((el.clockBorderWidth || 0) > 0) {
            ctx.strokeStyle = el.clockBorderColor || '#000000';
            ctx.lineWidth = el.clockBorderWidth || 2;
            ctx.stroke();
        }
        
        // Draw numbers if enabled
        if (el.showNumbers !== false) {
            drawNumbers(ctx, centerX, centerY, radius, el);
        }
        
        // Draw hour markers
        if (el.showHourMarkers !== false) {
            drawHourMarkers(ctx, centerX, centerY, radius, el);
        }
        
        // Draw minute markers
        if (el.showMinuteMarkers) {
            drawMinuteMarkers(ctx, centerX, centerY, radius, el);
        }
        
        // Calculate angles - INCLUDING SMOOTH MOTION with milliseconds for second hand
        var hourAngle = ((hours % 12) + minutes / 60 + seconds / 3600) * 30; // 30 degrees per hour
        var minuteAngle = (minutes + seconds / 60) * 6; // 6 degrees per minute
        var secondAngle = (seconds + milliseconds / 1000) * 6; // 6 degrees per second with smooth motion
        
        console.log('[CanvasClock] Angles - Hour:', hourAngle.toFixed(2) + 'Â°, Min:', minuteAngle.toFixed(2) + 'Â°, Sec:', secondAngle.toFixed(2) + 'Â°');
        
        // Draw hour hand
        drawHand(ctx, centerX, centerY, 
                 hourAngle, 
                 radius * 0.5, 
                 el.hourHandWidth || 4, 
                 el.hourHandColor || '#000000');
        
        // Draw minute hand
        drawHand(ctx, centerX, centerY, 
                 minuteAngle, 
                 radius * 0.7, 
                 el.minuteHandWidth || 3, 
                 el.minuteHandColor || '#000000');
        
        // Draw second hand if enabled (with smooth motion)
        if (el.showSeconds !== false) {
            drawHand(ctx, centerX, centerY, 
                     secondAngle, 
                     radius * 0.85, 
                     el.secondHandWidth || 1, 
                     el.secondHandColor || '#ff0000');
        }
        
        // Draw center dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = el.centerDotColor || '#000000';
        ctx.fill();
        
        console.log('[CanvasClock] Analog clock updated');
    }

    /**
     * Draw clock hand at specific angle
     */
    function drawHand(ctx, centerX, centerY, angleDegrees, length, width, color) {
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Convert degrees to radians and rotate (0 degrees = 12 o'clock)
        var angleRadians = (angleDegrees - 90) * Math.PI / 180;
        ctx.rotate(angleRadians);
        
        ctx.beginPath();
        ctx.moveTo(-8, 0); // Small tail behind center
        ctx.lineTo(length, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * Draw hour numbers on clock face
     */
    function drawNumbers(ctx, centerX, centerY, radius, el) {
        var fontSize = el.numberSize || 14;
        ctx.font = 'bold ' + fontSize + 'px ' + (el.fontFamily || 'Arial');
        ctx.fillStyle = el.numberColor || '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        var numberRadius = radius * 0.75;
        
        for (var i = 1; i <= 12; i++) {
            var angle = (i * 30 - 90) * Math.PI / 180; // 30 degrees per hour
            var x = centerX + Math.cos(angle) * numberRadius;
            var y = centerY + Math.sin(angle) * numberRadius;
            
            if (el.romanNumerals) {
                var romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
                ctx.fillText(romanNumerals[i - 1], x, y);
            } else {
                ctx.fillText(i.toString(), x, y);
            }
        }
    }

    /**
     * Draw hour markers
     */
    function drawHourMarkers(ctx, centerX, centerY, radius, el) {
        ctx.strokeStyle = el.markerColor || el.hourMarkerColor || '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        for (var i = 0; i < 12; i++) {
            var angle = (i * 30 - 90) * Math.PI / 180;
            var startRadius = radius * 0.85;
            var endRadius = radius * 0.95;
            
            var startX = centerX + Math.cos(angle) * startRadius;
            var startY = centerY + Math.sin(angle) * startRadius;
            var endX = centerX + Math.cos(angle) * endRadius;
            var endY = centerY + Math.sin(angle) * endRadius;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    /**
     * Draw minute markers
     */
    function drawMinuteMarkers(ctx, centerX, centerY, radius, el) {
        ctx.strokeStyle = el.minuteMarkerColor || '#cccccc';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        
        for (var i = 0; i < 60; i++) {
            if (i % 5 !== 0) { // Skip hour markers
                var angle = (i * 6 - 90) * Math.PI / 180;
                var startRadius = radius * 0.90;
                var endRadius = radius * 0.95;
                
                var startX = centerX + Math.cos(angle) * startRadius;
                var startY = centerY + Math.sin(angle) * startRadius;
                var endX = centerX + Math.cos(angle) * endRadius;
                var endY = centerY + Math.sin(angle) * endRadius;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    }

    /**
     * Render digital clock (time only) - UPDATES EVERY SECOND
     */
    function renderDigitalClock(ctx, el) {
        console.log('[CanvasClock] Rendering DIGITAL clock');
        
        // Get CURRENT time - this updates every time render is called
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        var seconds = now.getSeconds();
        
        var timeFormat = el.timeFormat || 'HH:mm:ss';
        var showSeconds = el.showSeconds !== false;
        
        // Format time
        var timeString;
        if (timeFormat === '12' || timeFormat.indexOf('hh') !== -1 || timeFormat.indexOf('h:') !== -1) {
            var ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            timeString = pad(hours) + ':' + pad(minutes);
            if (showSeconds) timeString += ':' + pad(seconds);
            timeString += ' ' + ampm;
        } else {
            // 24-hour format (default) - Example: 15:52:40 -> 15:52:41 -> 15:52:42
            timeString = pad(hours) + ':' + pad(minutes);
            if (showSeconds) timeString += ':' + pad(seconds);
        }
        
        // Calculate font size based on element dimensions
        var fontSize = el.fontSize || Math.min(el.width / 6, el.height * 0.6);
        ctx.font = (el.fontWeight || 'normal') + ' ' + fontSize + 'px ' + (el.fontFamily || 'Arial');
        ctx.fillStyle = el.color || '#FFFFFF';
        ctx.textAlign = el.textAlign || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(timeString, el.width / 2, el.height / 2);
        
        console.log('[CanvasClock] â° Digital clock updated:', timeString, '@', now.toLocaleTimeString());
    }

    /**
     * Render date only
     */
    function renderDateOnly(ctx, el) {
        var now = new Date();
        
        // Get date format
        var dateFormat = el.dateFormat || 'short';
        var dateString;
        
        if (dateFormat === 'dmy' || dateFormat === 'dd MMM yyyy') {
            // Format: "29 Jan 2026"
            var day = now.getDate();
            var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            var month = monthNames[now.getMonth()];
            var year = now.getFullYear();
            dateString = day + ' ' + month + ' ' + year;
        } else if (dateFormat === 'long') {
            // Example: "Wednesday, January 29, 2026"
            dateString = now.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (dateFormat === 'short') {
            // Example: "29 Jan 2026" (same as dmy)
            var day = now.getDate();
            var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            var month = monthNames[now.getMonth()];
            var year = now.getFullYear();
            dateString = day + ' ' + month + ' ' + year;
        } else if (dateFormat === 'numeric') {
            // Example: "1/29/2026"
            dateString = now.toLocaleDateString();
        } else {
            // Default: "29 Jan 2026"
            var day = now.getDate();
            var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            var month = monthNames[now.getMonth()];
            var year = now.getFullYear();
            dateString = day + ' ' + month + ' ' + year;
        }
        
        // Draw date
        var fontSize = el.fontSize || 36;
        ctx.font = (el.fontWeight || 'normal') + ' ' + fontSize + 'px ' + (el.fontFamily || 'Arial');
        ctx.fillStyle = el.color || '#FFFFFF';
        ctx.textAlign = el.textAlign || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dateString, el.width / 2, el.height / 2);
    }

    /**
     * Render date and time combo - UPDATES EVERY SECOND
     */
    function renderDateTimeCombo(ctx, el) {
        console.log('[CanvasClock] Rendering DATETIME combo');
        
        // Get CURRENT time - updates every second
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        var seconds = now.getSeconds();
        
        var timeFormat = el.timeFormat || 'HH:mm:ss';
        var showSeconds = el.showSeconds !== false;
        
        // Format time
        var timeString;
        if (timeFormat === '12' || timeFormat.indexOf('hh') !== -1) {
            var ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            timeString = pad(hours) + ':' + pad(minutes);
            if (showSeconds) timeString += ':' + pad(seconds);
            timeString += ' ' + ampm;
        } else {
            // 24-hour format - Example: 15:52:40 -> 15:52:41
            timeString = pad(hours) + ':' + pad(minutes);
            if (showSeconds) timeString += ':' + pad(seconds);
        }
        
        // Format date - "29 Jan 2026"
        var day = now.getDate();
        var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var month = monthNames[now.getMonth()];
        var year = now.getFullYear();
        var dateString = day + ' ' + month + ' ' + year;
        
        // Calculate font sizes based on element dimensions
        var timeFontSize = el.timeFontSize || el.fontSize || Math.min(el.width / 5, el.height * 0.5);
        var dateFontSize = el.dateFontSize || timeFontSize * 0.4;
        
        console.log('[CanvasClock] â° DateTime updated:', timeString, dateString);
        
        // Draw time (larger, centered vertically with space for date below)
        ctx.font = (el.fontWeight || 'normal') + ' ' + timeFontSize + 'px ' + (el.fontFamily || 'Arial');
        ctx.fillStyle = el.color || '#FFFFFF';
        ctx.textAlign = el.textAlign || 'center';
        ctx.textBaseline = 'middle';
        
        var timeY = el.height / 2 - dateFontSize / 2 - 5;
        ctx.fillText(timeString, el.width / 2, timeY);
        
        // Draw date (smaller, below time)
        ctx.font = (el.fontWeight || 'normal') + ' ' + dateFontSize + 'px ' + (el.fontFamily || 'Arial');
        ctx.fillStyle = el.color || '#AAAAAA';
        
        var dateY = el.height / 2 + timeFontSize / 2;
        ctx.fillText(dateString, el.width / 2, dateY);
    }

    /**
     * Render countdown timer - DECREASES SECOND BY SECOND
     * Format: "2:02:21:28" (days:hours:mins:secs)
     * After completion, displays countdownCompleteMessage
     */
    function renderCountdown(ctx, el) {
        console.log('[CanvasClock] Rendering COUNTDOWN');
        
        if (!el.targetDateTime) {
            var fontSize = el.fontSize || 24;
            ctx.font = fontSize + 'px Arial';
            ctx.fillStyle = '#ff0000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No target date set', el.width / 2, el.height / 2);
            console.warn('[CanvasClock] âš ï¸ No targetDateTime set for countdown');
            return;
        }
        
        // Get CURRENT time - this updates every second
        var now = new Date();
        var target = new Date(el.targetDateTime);
        var diff = target - now; // Milliseconds remaining
        
        console.log('[CanvasClock] â±ï¸ Countdown - Now:', now.toLocaleTimeString(), 'Target:', target.toLocaleString(), 'Diff:', Math.floor(diff / 1000) + 's');
        
        // Check if countdown is complete
        if (diff <= 0) {
            // COUNTDOWN COMPLETE - Show completion message
            console.log('[CanvasClock] ðŸŽ‰ COUNTDOWN COMPLETE! Showing message:', el.countdownCompleteMessage || "Time's Up!");
            
            var fontSize = el.timeFontSize || el.fontSize || Math.min(el.width / 8, el.height * 0.6);
            ctx.font = (el.fontWeight || 'normal') + ' ' + fontSize + 'px ' + (el.fontFamily || 'Arial');
            ctx.fillStyle = el.color || '#FF0000';
            ctx.textAlign = el.textAlign || 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(el.countdownCompleteMessage || "Time's Up!", el.width / 2, el.height / 2);
            return;
        }
        
        // Calculate time components - DECREASES EVERY SECOND
        var days = Math.floor(diff / (1000 * 60 * 60 * 24));
        var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        // Format countdown: "2:02:21:28" (days:hours:mins:secs)
        // Example progression: 
        // 2:02:21:28 -> 2:02:21:27 -> 2:02:21:26 -> ... -> 0:00:00:01 -> 0:00:00:00 -> "Time's Up!"
        var countdownText = days + ':' + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
        
        console.log('[CanvasClock] â±ï¸ Countdown remaining:', countdownText);
        
        // Calculate font size based on element dimensions
        var fontSize = el.timeFontSize || el.fontSize || Math.min(el.width / 8, el.height * 0.6);
        ctx.font = (el.fontWeight || 'normal') + ' ' + fontSize + 'px ' + (el.fontFamily || 'Arial');
        ctx.fillStyle = el.timeColor || el.color || '#FFFFFF';
        ctx.textAlign = el.textAlign || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(countdownText, el.width / 2, el.height / 2);
        
        // Optional: Show target date below countdown
        if (el.showTargetDate) {
            var day = target.getDate();
            var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            var month = monthNames[target.getMonth()];
            var year = target.getFullYear();
            var targetDateString = day + ' ' + month + ' ' + year;
            
            ctx.font = (el.dateFontSize || fontSize * 0.4) + 'px ' + (el.fontFamily || 'Arial');
            ctx.fillStyle = el.dateColor || '#AAAAAA';
            var dateY = el.height / 2 + fontSize / 2 + 20;
            ctx.fillText(targetDateString, el.width / 2, dateY);
        }
    }

    /**
     * Pad number with leading zero
     */
    function pad(num) {
        return num < 10 ? '0' + num : num;
    }

    // Public API
    return {
        render: render
    };
})();