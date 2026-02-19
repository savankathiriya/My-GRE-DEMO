var utilities = {};
var clockIntervalId = null;

// HDMI Connection Monitoring
var currentHdmiType = null;
var currentHdmiIndex = null;

function startHdmiMonitor(type, index) {
    console.log('[HDMI Monitor] Starting monitor for type:', type, 'index:', index);
    currentHdmiType = type;
    currentHdmiIndex = index;
    stopHdmiMonitor();
}

function stopHdmiMonitor() {
    console.log('[HDMI Monitor] Stopping monitor');
    currentHdmiType = null;
    currentHdmiIndex = null;
}

// Reset HDMI and app state on application startup
function resetHdmiOnStartup() {
    console.log('[App Startup] Resetting HDMI state...');
    
    // Stop any existing monitoring
    stopHdmiMonitor();
    
    // Clear state variables
    window._originalTvInput = null;
    if (typeof presentPagedetails !== 'undefined') {
        presentPagedetails.currentLiveChannelId = undefined;
        presentPagedetails.showingLiveTvGuide = false;
    }

    // FIX: On startup, always stop any channel that may have been left open
    // by a previous crashed/exited session. Without this, restarting the app
    // while the "No Signal" screen is showing will leave it stuck.
    try {
        if (typeof exitLiveTv === 'function') {
            exitLiveTv();
        }
    } catch(e) {
        console.warn('[App Startup] exitLiveTv on startup threw:', e);
    }
    
    // Ensure we're in HCAP_MODE_1 (normal mode)
    if (typeof hcap !== "undefined" && hcap.mode) {
        hcap.mode.getHcapMode({
            onSuccess: function(result) {
                console.log('[App Startup] Current HCAP mode:', result.mode);
                
                if (result.mode !== hcap.mode.HCAP_MODE_1) {
                    console.log('[App Startup] Switching to HCAP_MODE_1...');
                    hcap.mode.setHcapMode({
                        mode: hcap.mode.HCAP_MODE_1,
                        onSuccess: function() {
                            console.log('[App Startup] ✅ Set to HCAP_MODE_1');
                            ensureTvInput();
                        },
                        onFailure: function(f) {
                            console.warn('[App Startup] Failed to set HCAP_MODE_1:', f);
                            ensureTvInput();
                        }
                    });
                } else {
                    console.log('[App Startup] Already in HCAP_MODE_1');
                    ensureTvInput();
                }
            },
            onFailure: function(f) {
                console.warn('[App Startup] Failed to get HCAP mode:', f);
                // Try to set MODE_1 anyway
                if (hcap.mode.setHcapMode) {
                    hcap.mode.setHcapMode({
                        mode: hcap.mode.HCAP_MODE_1,
                        onSuccess: function() {
                            console.log('[App Startup] ✅ Set to HCAP_MODE_1 (fallback)');
                            ensureTvInput();
                        },
                        onFailure: function(f2) {
                            console.warn('[App Startup] Fallback mode set failed:', f2);
                            ensureTvInput();
                        }
                    });
                }
            }
        });
    } else {
        console.warn('[App Startup] HCAP not available');
    }
    
    function ensureTvInput() {
        // Make sure we're on TV input, not HDMI
        if (typeof hcap !== "undefined" && hcap.externalinput) {
            hcap.externalinput.getCurrentExternalInput({
                onSuccess: function(current) {
                    console.log('[App Startup] Current input - Type:', current.type, 'Index:', current.index);
                    
                    // If we're on HDMI, switch back to TV
                    if (current.type === hcap.externalinput.ExternalInputType.HDMI) {
                        console.log('[App Startup] Currently on HDMI, switching to TV...');
                        hcap.externalinput.setCurrentExternalInput({
                            type: hcap.externalinput.ExternalInputType.TV,
                            index: 0,
                            onSuccess: function() {
                                console.log('[App Startup] ✅ Switched to TV input');
                                document.body.style.background = "#000";
                            },
                            onFailure: function(f) {
                                console.warn('[App Startup] Failed to switch to TV:', f);
                                document.body.style.background = "#000";
                            }
                        });
                    } else {
                        console.log('[App Startup] Already on TV input');
                        document.body.style.background = "#000";
                    }
                },
                onFailure: function(f) {
                    console.warn('[App Startup] Failed to get current input:', f);
                    // Try to switch to TV anyway as fallback
                    if (hcap.externalinput.setCurrentExternalInput) {
                        hcap.externalinput.setCurrentExternalInput({
                            type: hcap.externalinput.ExternalInputType.TV,
                            index: 0,
                            onSuccess: function() {
                                console.log('[App Startup] ✅ Switched to TV (fallback)');
                                document.body.style.background = "#000";
                            },
                            onFailure: function(f2) {
                                console.warn('[App Startup] Fallback switch failed:', f2);
                                document.body.style.background = "#000";
                            }
                        });
                    }
                }
            });
        } else {
            console.warn('[App Startup] External input API not available');
            document.body.style.background = "#000";
        }
    }
}

utilities.validateString = function (value) {
    if (value == undefined || value == null) return false;
    else if (value.trim() == '') return false;
    else return true;
}

function getKeyCode(rawEvt) {
    var evt = rawEvt || window.event || {};
    // prefer which when available and non-zero, else fallback to keyCode
    var kc = (typeof evt.which !== 'undefined' && evt.which !== 0) ? evt.which : evt.keyCode || 0;
    return { evt: evt, keycode: kc };
}

function clearNoSignalNative() {
    try {
        // Shut down any active HCAP media pipeline
        if (window.hcap && hcap.Media && hcap.Media.shutDown) {
            hcap.Media.shutDown({
                onSuccess: function () { console.log("Media.shutDown success"); },
                onFailure: function (f) { console.warn("Media.shutDown fail", f); }
            });
        }
    } catch (e) {
        console.warn("clearNoSignalNative Media.shutDown threw", e);
    }

    try {
        // Release current channel if tuner/IP channel was opened
        if (window.hcap && hcap.channel && hcap.channel.releaseCurrentChannel) {
            hcap.channel.releaseCurrentChannel({
                onSuccess: function () { console.log("releaseCurrentChannel success"); },
                onFailure: function (f) { console.warn("releaseCurrentChannel fail", f); }
            });
        }
    } catch (e) {
        console.warn("clearNoSignalNative releaseCurrentChannel threw", e);
    }

    try {
        // Reset HCAP mode back to normal app mode
        if (window.hcap && hcap.mode && hcap.mode.setHcapMode) {
            hcap.mode.setHcapMode({
                mode: hcap.mode.HCAP_MODE_1,
                onSuccess: function () { console.log("setHcapMode success"); },
                onFailure: function (f) { console.warn("setHcapMode fail", f); }
            });
        }
    } catch (e) {
        console.warn("clearNoSignalNative setHcapMode threw", e);
    }
}

function showLoadingPopup() {
    var el = document.getElementById("loadingPopup");
    if(el) el.style.display = "block";

    initLottieOnce();
    if(loadingAnim && typeof loadingAnim.play === 'function') {
        loadingAnim.play();
    }
}

function hideLoadingPopup() {
    var el = document.getElementById("loadingPopup");
    if (el) el.style.display = 'none';

    if (loadingAnim && typeof loadingAnim.stop === 'function') {
        loadingAnim.stop();
    }
}

utilities.updatingTimeAndDate = function () {

    function pad(num) {
        return num < 10 ? '0' + num : num;
    }

    function formatTimeFromParts(parts, format) {
        var map = {};
        parts.forEach(function (p) {
            map[p.type] = p.value;
        });

        // Parse and pad values properly
        var hour24 = parseInt(map.hour, 10);
        var hour12 = hour24 % 12 || 12;
        
        var tokens = {
            'hh': pad(hour12),
            'HH': pad(hour24),
            'mm': pad(parseInt(map.minute, 10)),
            'ss': pad(parseInt(map.second, 10))
        };

        return format.replace(/hh|HH|mm|ss/g, function (match) {
            return tokens[match];
        });
    }

    function updateDateTime() {

        // 🔹 Get timezone dynamically
        var timeZone =
            (Main.deviceProfile && Main.deviceProfile.property_detail.property_timezone)
                ? Main.deviceProfile.property_detail.property_timezone
                : Intl.DateTimeFormat().resolvedOptions().timeZone; // fallback

        // 🔹 Get raw format (HH:mm, hh:mm a, etc.)
        var rawFormat =
            (Main.templateApiData && Main.templateApiData.time_format)
                ? Main.templateApiData.time_format
                : 'HH:mm';

        // Remove AM/PM if present (you already wanted this)
        var timeFormat = rawFormat.replace(/\s*[aA]$/, '');

        // Determine if 12-hour format is needed
        var is12Hour = rawFormat.toLowerCase().indexOf('hh') !== -1;

        // ðŸ”¹ Get time parts for the given timezone
        var timeFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone,
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false  // Always get 24-hour first, we'll convert if needed
        });

        var timeParts = timeFormatter.formatToParts(new Date());

        var timeStr = formatTimeFromParts(timeParts, timeFormat);

        // 🔹 Date (timezone-aware)
        var dateFormatter = new Intl.DateTimeFormat(undefined, {
            timeZone: timeZone,
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });

        var dateStr = dateFormatter.format(new Date());

        // 🔹 Update DOM
        var timeEl = document.getElementById("time_now");
        var dateEl = document.getElementById("date_now");

        if (timeEl) timeEl.textContent = timeStr;
        if (dateEl) dateEl.textContent = dateStr;
    }

    // Initial call
    updateDateTime();

    // Update every second
    clockIntervalId = setInterval(updateDateTime, 1000);
};


utilities.genricPopup=function(msg,type){
  Main.popupData ={
      popuptype : type,
      message : msg,       
      buttonCount : 1,
      yesText : 'Okay',
      yesTarget : 'close',
      onBack : 'close'
  }
  macro("#popUpFDFS").html(Util.showPopup());	
  macro("#popup-btn-1").addClass('popupFocus');
}

function exitLiveTv() {
  try {
      if (typeof hcap !== "undefined" && hcap.channel && hcap.channel.stopCurrentChannel) {
          hcap.channel.stopCurrentChannel({
              onSuccess: function () {
                  console.log(" Live TV stopped successfully");
                //   utilities.genricPopup("Live TV stopped successfully", 'info');
              },
              onFailure: function (f) {
                  console.error(" Stop failed: " + f.errorMessage);
                //   utilities.genricPopup("Stop failed: " + f.errorMessage, 'info');
              }
          });
      } else {
          console.warn("hcap.channel.stopCurrentChannel is not available");
          // utilities.genricPopup("hcap.channel.stopCurrentChannel function not available on this device", 'info');
      }
  } catch (e) {
      console.error(" hcap.channel.stopCurrentChannel error in exitLiveTv: " + e.message);
      // utilities.genricPopup("hcap.channel.stopCurrentChannel error in exitLiveTv: " + e.message, 'info');
  }
}

function launchApp(appId,source) {
    try {
        idcap.request("idcap://application/launch", {
            "parameters": {
                "id": appId,
                "noSplash": false // set true if you want to skip splash
            },
            "onSuccess": function () {
                Main.HideLoading();
                console.log(" App launched successfully:", appId);
            },
            "onFailure": function (err) {
                launchApp(appId,source);
                console.log(" Failed to launch app:", err.errorMessage);
            }
        });
    } catch (e) {
        console.log("Exception while launching app:", e.message);
    }
}

function installApp(appId, source) {
    idcap.request("idcap://application/install", {
        "parameters": {
            "appList": [appId]
        },
        "onSuccess": function () {
            console.log(" " + appId + " installed successfully.");
            launchApp(appId,source);
        },
        "onFailure": function (err) {
            console.log(" Failed to install " + appId + ":", err.errorMessage);
        }
    })
}

function ensureAppInstalled(appId, source) {
    idcap.request("idcap://application/list", {
        "parameters": { "exteraInfo": true },
        "onSuccess": function (s) {
            var foundApp = s.list.find( function (app) {
                return app.appId === appId;
            });

            Main.ShowLoading();

            console.log("s------------------->", s);

            if(foundApp) {
                if(foundApp.installed) {
                    console.log(" " + appId + " already installed.");
                    // Optionally auto-launch
                    launchApp(appId,source);
                } else {
                    console.log("📥 " + appId + " found but not installed, installing...");
                    installApp(appId, source);
                }
            } else {
                console.log(" " + appId + " not found in available apps.");
            }
        },
        "onFailure": function (err) {
            console.log("Failed to get app list:", err.errorMessage);
        }
    });
}

function rebootTv(){
    // Step 1: Register Google Cast token (required after each reboot)
    Main.ShowLoading();
    if(typeof Main !== 'undefined' && Main.registerGoogleCastToken) {
        Main.registerGoogleCastToken();
    }

    // Wait for token registration
    setTimeout(function () {
        var GOOGLE_CAST_APP_IDS = [
            "com.webos.chromecast",
            "com.webos.app.commercial.chromecastguide",
            "com.webos.chromecast-settings"
        ]

        idcap.request("idcap://application/install", {
            parameters: {
                appList: GOOGLE_CAST_APP_IDS
            },
            onSuccess: function() {
                setTimeout(function () {
                    setTimeout(function () {
                        if (typeof hcap !== 'undefined' && hcap.power && hcap.power.reboot) {
                            hcap.power.reboot({
                                onSuccess: function () { console.log("Rebbot success"); },
                                onFailure: function (f) {
                                    console.log("Reboot failed: " + f.errorMessage);
                                }
                            })
                        } else {
                            Main.HideLoading();
                        }
                    }, 1000); // Wait 1 second before reboot
                }, 5000); // Wait 5 seconds for app installation
            },
            onFailure: function(err) {
                setTimeout(function () {
                    if (typeof hcap !== 'undefined' && hcap.power && hcap.power.reboot) {
                        hcap.power.reboot({
                            onSuccess: function () { console.log("Rebbot success"); },
                            onFailure: function (f) {
                                console.log("Reboot failed: " + f.errorMessage);
                            }
                        })
                    } else {
                        Main.HideLoading();
                    }
                }, 1000); // Wait 1 second before reboot
            }
        })
    }, 1500); // Wait 1.5 seconds for token registration
}


function bindingAppsToPms(){
  // 1. Bind PMS
  if (typeof hcap !== "undefined") {
    // 2. Register SI apps with tokens
    hcap.application.RegisterSIApplicationList({
      tokenList: [
        { id: "netflix", token: netflixToken }
      ],
      onSuccess: function () {
        // utilities.genricPopup("netflix Tokens registered");
        console.log("netflix Tokens registered");
      },
      onFailure: function (f) {
        // utilities.genricPopup("netflix Token registration failed:", f.errorMessage, 'info');
        console.log(" netflix Token registration failed:", f.errorMessage);
      }
    });

  }
}

var loadingAnim = null;

function initLottieOnce() {
    if(loadingAnim) return; // already created

    var container = document.getElementById("lottieContainer");
    if (!container || !window.lottie) return;

    // first of all insure clean the container
    container.innerHTML = "";

    loadingAnim = window.lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        path: 'tv_loading_white.json'
    });
}

function setDefaultIconForChannels(data, lgAppId) {
  if(!data || !data.length || !lgAppId) return null;
  for(var i = 0; i < data.length; i++) {
    var iconData = data[i];
    if(iconData && typeof iconData.lg_app_id !== 'undefined' && String(iconData.lg_app_id) === String(lgAppId)) {
      return iconData;
    }
  }
  return null;
}

function getCustomAppUrl(data,lgAppId) {
    if(!data || !data.length || !lgAppId) return null;
    for(var i = 0; i< data.length; i++) {
        var appData = data[i];
        if(appData && typeof appData.lg_app_id !== 'undefined' && String(appData.lg_app_id) === String(lgAppId)) {
            return appData.app_url;
        }
    }
}

function normalizeId(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "null"
  ) {
    return null;
  }
  return String(value);
}

function setTheRmsIpProperty(statusIp) {
    // Set rms_trusted_ip to allow RMS calls from backend IP
    try {
        hcap.property.setProperty({
            key: "rms_trusted_ip",
            value: statusIp,
            onSuccess: function () {
                console.log("rms_trusted_ip property set to:", statusIp);

                 hcap.property.getProperty({
            key: "rms_trusted_ip",
            onSuccess: function (res) {
                console.log('✅ Verified:', res);
            }
        });
            },
            onFailure: function (f) {
                console.log("Failed to set rms_trusted_ip property:", f.errorMessage);
            }
        })
    } catch (e) {
        console.error("Exception calling hcap.property.setProperty:", e);
    }
}

function updateCurrentNetworkType(callback) {
    try {
        if (!window.hcap || !hcap.network || !hcap.network.getNetworkInformation) {
            lastNetworkType = "";
            if (typeof callback === "function") callback(lastNetworkType);
            return;
        }

        hcap.network.getNetworkInformation({
            onSuccess: function (s) {

                console.log("s--------------------------------------->", s)
                if (s.ethernet_plugged) {
                    lastNetworkType = "ethernet";
                }
                else if (s.wifi_plugged && s.networkMode === hcap.network.NetworkMode.WIRELESS) {
                    lastNetworkType = "wifi";
                }
                else {
                    lastNetworkType = "";
                }

                console.log("Detected network type:", lastNetworkType);

                if (typeof callback === "function") callback(lastNetworkType);
            },
            onFailure: function () {
                lastNetworkType = "";
                if (typeof callback === "function") callback(lastNetworkType);
            }
        });
    } catch (e) {
        console.error("Error in updateCurrentNetworkType:", e);
        lastNetworkType = "";
        if (typeof callback === "function") callback(lastNetworkType);
    }
}

function gotoHomeSCreenFromDisconnectPage() {

    try {
        var defaultLangId = "";

        if (
			Main &&
			Main.templateApiData &&
			Main.templateApiData.language_detail &&
			Main.templateApiData.language_detail.length > 0 &&
			Main.templateApiData.language_detail[0] &&
			Main.templateApiData.language_detail[0].language_uuid
		) {
            defaultLangId = Main.templateApiData.language_detail[0].language_uuid;
        }
        var langId = Main.clickedLanguage ? Main.clickedLanguage : defaultLangId
        
        var cached = [];
        
        if (Main && Main.cachedHomeByLang && Main.cachedHomeByLang[langId]) {
          cached = Main.cachedHomeByLang[langId];
        }

        if (cached.length) {
          Main.renderHomePage(cached);
        }else if (Array.isArray(Main.homePageData) && Main.homePageData.length) {
          var items = Main.homePageData
            .filter(function (x) {
                return x && x.is_active === true && x.language_uuid === langId;
            })
            .sort(function (a, b) {
                return (a.priority_order || 0) - (b.priority_order || 0);
            });

          if (items.length) {
            Main.cacheHomeImageAssetsByLanguage(
                items,
                langId,
                function (cachedGroup) {
                    Main.cachedHomeByLang[langId] = cachedGroup || [];
                    Main.renderHomePage(Main.cachedHomeByLang[langId]);
                }
            );
          }
        } else {
          Main.getHomeData(function () {
            // utilities.genricPopup("Main.getHomeData(function () { inner", 'info');
            var items2 =
              (Main.cachedHomeByLang && Main.cachedHomeByLang[langId]) || [];
            if (items2.length) Main.renderHomePage(items2);
          });
        }
      } catch (e) {
        // utilities.genricPopup("Wake render error:" + e, 'info');
        console.error("Wake render error:", e);
      }

}

/**
 * ====================================================================
 * SIMPLIFIED CANVAS RENDERING FUNCTION
 * Now delegates to the modular canvas rendering system
 * ====================================================================
 */
function renderTemplateCanvas() {
    console.log('[appconfig] Calling CanvasRenderer.render()');
    
    try {
        // Check if CanvasRenderer is available
        if (typeof CanvasRenderer === 'undefined') {
            console.error('[appconfig] CanvasRenderer not loaded! Check script includes.');
            return;
        }
        
        // Delegate to the modular rendering system
        CanvasRenderer.render();
        
        // Optional: Start animation loop for dynamic content (clocks, etc.)
        // Uncomment if you want continuous updates
        // CanvasRenderer.startAnimationLoop();
        
    } catch (error) {
        console.error('[appconfig] Canvas rendering error:', error);
        
        // Show error message to user
        var canvas = document.getElementById('templateCanvas');
        if (canvas) {
            var ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Failed to render template', canvas.width / 2, canvas.height / 2);
            }
        }
    }
}