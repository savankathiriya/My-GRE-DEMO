/**
 * CANVAS WEATHER WIDGET RENDERER - CORRECTED
 */
var CanvasWeather = (function() {
    'use strict';

    var WEATHER_ICONS = {
        0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
        45: '🌫️', 48: '🌫️',
        51: '🌧️', 53: '🌧️', 55: '🌧️',
        61: '🌧️', 63: '🌧️', 65: '🌧️',
        71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
        80: '🌦️', 81: '🌦️', 82: '🌦️',
        85: '🌨️', 86: '🌨️',
        95: '⛈️', 96: '⛈️', 99: '⛈️'
    };

    function render(ctx, el) {
        if (!el.weatherData) return;
        
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
        var tempValue = data.temperature 
            ? (el.unit === 'fahrenheit' ? data.temperature.fahrenheit : data.temperature.celsius)
            : '--';
        var tempText = tempValue + '°';
        var weatherIcon = WEATHER_ICONS[data.weatherCode] || '☀️';
        
        // Font setup
        var fontSize = el.fontSize || 50;
        ctx.font = (el.textBold ? 'bold ' : '') + fontSize + 'px ' + (el.textFont || 'Arial');
        ctx.fillStyle = el.textColor || el.color || '#f4f0f0';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle'; // CRITICAL: Use middle for proper vertical centering
        
        // Calculate vertical center
        var centerY = el.height / 2;
        
        // Draw icon
        var iconX = 10;
        ctx.fillText(weatherIcon, iconX, centerY);
        
        // Draw temperature
        var iconWidth = ctx.measureText(weatherIcon).width;
        ctx.fillText(tempText, iconX + iconWidth + 5, centerY);
        
        ctx.restore();
    }

    return { render: render };
})();