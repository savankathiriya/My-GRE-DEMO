var utilities = {};
var clockIntervalId = null;

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

utilities.updatingTimeAndDate = function () {

    function pad(num) {
        return num < 10 ? '0' + num : num;
    }

    function formatTime(date, format){
        var hours24 = date.getHours();
        var hours12 = hours24 % 12 || 12;
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();

        var tokens = {
            'hh': pad(hours12),
            'HH': pad(hours24),
            'mm': pad(minutes),
            'ss': pad(seconds)
        }

        return format.replace(/hh|HH|mm|ss/g, function(match) {
            return tokens[match];
        });
    }

    function updateDateTime() {
        var now = new Date();

        // Get time format and remove any trailing 'a' or 'A' (am/pm indicator)
        var rawFormat = (Main.templateApiData && Main.templateApiData.time_format)
            ? Main.templateApiData.time_format : 'HH:mm';
        
        var timeFormat = rawFormat.replace(/\s*[aA]$/, '');

        // Format time and date
        var timeStr = formatTime(now, timeFormat);
        var dateStr = now.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });

        // Update DOM
        var timeE1 = document.getElementById("time_now");
        var dateE1 = document.getElementById("date_now");

        if(timeE1) { timeE1.textContent = timeStr; }
        if(dateE1) { dateE1.textContent = dateStr; }
    }

    //Initial call
    updateDateTime();
    // Start the interval and store the ID
    clockIntervalId = setInterval(updateDateTime, 1000);
}

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
                console.log(" App launched successfully:", appId);
            },
            "onFailure": function (err) {
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
            // var foundApp = s.list.find( function (app) {
            //     return app.appId === appId;
            // });

            console.log("s------------------->", s);

            // if(foundApp) {
            //     if(foundApp.installed) {
            //         console.log(" " + appId + " already installed.");
            //         // Optionally auto-launch
            //         launchApp(appId,source);
            //     } else {
            //         console.log("📥 " + appId + " found but not installed, installing...");
            //         installApp(appId, source);
            //     }
            // } else {
            //     console.log(" " + appId + " not found in available apps.");
            // }
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