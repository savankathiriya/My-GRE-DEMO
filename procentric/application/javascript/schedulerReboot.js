/**
 * ====================================================================
 * SCHEDULED REBOOT MODULE
 * File: scheduledReboot.js
 *
 * Automatically reboots the TV twice every day at:
 *   - 00:00 AM  (midnight)
 *   - 12:00 PM  (noon)
 *
 * Reboot fires regardless of the current power mode (WARM or NORMAL).
 *
 * Timezone is read from:
 *   Main.deviceProfile.property_detail.property_timezone
 * Falls back to the device's local timezone if not set.
 *
 * HOW TO USE:
 *   1. Include BEFORE main.js in your HTML:
 *        <script src="scheduledReboot.js?v=1.0"></script>
 *
 *   2. ScheduledReboot.start() is already called from
 *      Main.deviceProfileApi() in main.js — nothing extra needed.
 *
 * PUBLIC API:
 *   ScheduledReboot.start()   — arm both daily timers
 *   ScheduledReboot.stop()    — cancel all timers (call before manual checkout)
 *   ScheduledReboot.status()  — diagnostic snapshot (use in TV console)
 *
 * DEBUG (TV console):
 *   console.log(JSON.stringify(ScheduledReboot.status(), null, 2));
 * ====================================================================
 */

var ScheduledReboot = (function () {

    // ── Internal state ────────────────────────────────────────────────
    var _timers     = [];
    var _isRunning  = false;
    var _LOG_PREFIX = '[ScheduledReboot]';

    /**
     * Scheduled reboot times in 24-hour format.
     *   00:00  →  midnight (12:00 AM)
     *   12:00  →  noon     (12:00 PM)
     */
    var REBOOT_TIMES = [
        { hour: 0,  minute: 0, label: 'Midnight (00:00 AM)' },
        { hour: 12, minute: 0, label: 'Noon    (12:00 PM)'  }
    ];

    // ── Private helpers ───────────────────────────────────────────────

    /**
     * Returns the IANA timezone string to use.
     * Priority: property_timezone from device profile → device local timezone.
     */
    function _getTimezone() {
        try {
            var tz = Main &&
                     Main.deviceProfile &&
                     Main.deviceProfile.property_detail &&
                     Main.deviceProfile.property_detail.property_timezone;

            if (tz && typeof tz === 'string' && tz.trim() !== '') {
                console.log(_LOG_PREFIX, 'Using property_timezone:', tz.trim());
                return tz.trim();
            }
        } catch (e) {
            console.warn(_LOG_PREFIX, 'Could not read property_timezone:', e);
        }

        try {
            var localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            console.warn(_LOG_PREFIX, 'property_timezone not set — falling back to:', localTz);
            return localTz;
        } catch (e) {
            return 'UTC';
        }
    }

    /**
     * Returns { hour, minute, second } in the given IANA timezone.
     * Uses Intl.DateTimeFormat.formatToParts — no external lib needed,
     * works on LG webOS.
     */
    function _getNowInTimezone(tz) {
        var now   = new Date();
        var parts = {};

        try {
            var fmt = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                hour:     '2-digit',
                minute:   '2-digit',
                second:   '2-digit',
                hour12:   false
            });

            fmt.formatToParts(now).forEach(function (p) {
                parts[p.type] = p.value;
            });
        } catch (e) {
            console.warn(_LOG_PREFIX, 'Intl.DateTimeFormat error — using device local time:', e);
            parts.hour   = String(now.getHours());
            parts.minute = String(now.getMinutes());
            parts.second = String(now.getSeconds());
        }

        return {
            hour:   parseInt(parts.hour,   10),
            minute: parseInt(parts.minute, 10),
            second: parseInt(parts.second, 10)
        };
    }

    /**
     * Returns milliseconds until the next occurrence of
     * { targetHour : targetMinute } in the given timezone.
     * If that moment has already passed today, targets tomorrow.
     * A 2-second safety buffer is added to avoid early firing.
     */
    function _msUntilNext(targetHour, targetMinute, tz) {
        var now = _getNowInTimezone(tz);

        var nowSecs    = now.hour * 3600 + now.minute * 60 + now.second;
        var targetSecs = targetHour * 3600 + targetMinute * 60;

        var diffSecs = targetSecs - nowSecs;

        if (diffSecs <= 0) {
            // Already passed today — schedule for tomorrow
            diffSecs += 24 * 3600;
        }

        // 2-second buffer so timer fires just AFTER the target second
        diffSecs += 2;

        return diffSecs * 1000;
    }

    /**
     * Triggers the reboot via CheckoutManager_requestCheckout().
     * Falls back to hcap.power.reboot directly if CheckoutManager throws.
     */
    function _doReboot(label) {
        console.log(
            _LOG_PREFIX,
            '*** SCHEDULED REBOOT TRIGGERED *** "' + label + '"',
            '| UTC:', new Date().toISOString()
        );

        try {
            CheckoutManager_requestCheckout();
        } catch (e) {
            console.error(_LOG_PREFIX, 'CheckoutManager_requestCheckout threw:', e);

            // Direct HCAP fallback
            try {
                if (window.hcap && hcap.power && typeof hcap.power.reboot === 'function') {
                    hcap.power.reboot({
                        onSuccess: function () {
                            console.log(_LOG_PREFIX, 'hcap.power.reboot success (fallback)');
                        },
                        onFailure: function (f) {
                            console.error(_LOG_PREFIX, 'hcap.power.reboot failed (fallback):',
                                          f && f.errorMessage);
                        }
                    });
                } else {
                    console.error(_LOG_PREFIX, 'hcap.power.reboot not available');
                }
            } catch (ex) {
                console.error(_LOG_PREFIX, 'Direct HCAP reboot also threw:', ex);
            }
        }
    }

    /**
     * Arms a single reboot slot.
     * After the timer fires it re-arms for the next 24-hour cycle.
     */
    function _scheduleSlot(slot, tz) {
        var delayMs = _msUntilNext(slot.hour, slot.minute, tz);

        var h = Math.floor(delayMs / 3600000);
        var m = Math.floor((delayMs % 3600000) / 60000);
        var s = Math.floor((delayMs % 60000)   / 1000);

        console.log(
            _LOG_PREFIX,
            '"' + slot.label + '" fires in ' +
            h + 'h ' + m + 'm ' + s + 's (tz: ' + tz + ')'
        );

        var handle = setTimeout(function () {

            // Remove this handle from the active list
            _timers = _timers.filter(function (t) { return t !== handle; });

            // Trigger reboot immediately — no mode check
            _doReboot(slot.label);

            // Re-arm for the next 24-hour cycle
            if (_isRunning) {
                setTimeout(function () {
                    _scheduleSlot(slot, _getTimezone());
                }, 5000); // 5s gap before re-arming
            }

        }, delayMs);

        _timers.push(handle);
    }

    // ── Public API ────────────────────────────────────────────────────

    /**
     * ScheduledReboot.start()
     *
     * Arms both daily reboot timers (midnight and noon).
     * Called automatically from Main.deviceProfileApi() in main.js.
     * Safe to call multiple times — duplicate calls are ignored.
     */
    function start() {
        if (_isRunning) {
            console.log(_LOG_PREFIX, 'Already running — ignoring duplicate start()');
            return;
        }

        _isRunning = true;
        var tz = _getTimezone();

        console.log(_LOG_PREFIX, '======================================');
        console.log(_LOG_PREFIX, ' Scheduled reboot STARTED');
        console.log(_LOG_PREFIX, ' Timezone : ' + tz);
        console.log(_LOG_PREFIX, ' Reboot 1 : 00:00 AM (midnight)');
        console.log(_LOG_PREFIX, ' Reboot 2 : 12:00 PM (noon)');
        console.log(_LOG_PREFIX, '======================================');

        REBOOT_TIMES.forEach(function (slot) {
            _scheduleSlot(slot, tz);
        });
    }

    /**
     * ScheduledReboot.stop()
     *
     * Cancels all pending reboot timers.
     * Call this before a manual checkout to prevent a double-reboot.
     */
    function stop() {
        console.log(_LOG_PREFIX, 'Stopping — cancelling ' + _timers.length + ' timer(s)');
        _timers.forEach(function (h) { try { clearTimeout(h); } catch (e) {} });
        _timers    = [];
        _isRunning = false;
    }

    /**
     * ScheduledReboot.status()
     *
     * Returns a diagnostic snapshot.
     * Usage in TV console:
     *   console.log(JSON.stringify(ScheduledReboot.status(), null, 2));
     */
    function status() {
        var tz  = _getTimezone();
        var now = _getNowInTimezone(tz);

        function pad(n) { return n < 10 ? '0' + n : String(n); }

        return {
            isRunning:    _isRunning,
            timezone:     tz,
            currentTime:  pad(now.hour) + ':' + pad(now.minute) + ':' + pad(now.second),
            activeTimers: _timers.length,
            nextReboots:  REBOOT_TIMES.map(function (slot) {
                var ms = _msUntilNext(slot.hour, slot.minute, tz);
                var h  = Math.floor(ms / 3600000);
                var m  = Math.floor((ms % 3600000) / 60000);
                var s  = Math.floor((ms % 60000)   / 1000);
                return {
                    label:   slot.label,
                    humanIn: h + 'h ' + m + 'm ' + s + 's'
                };
            })
        };
    }

    return { start: start, stop: stop, status: status };

})();