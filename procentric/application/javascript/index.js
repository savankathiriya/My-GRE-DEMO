var app = {}
var macro = jQuery.noConflict();
var appConfig = {
	appVersion:"v1.950"
};
var loadFilePaths = 'macrotv.json';
var apiPrefixUrl = "https://tvapi.guestxp.com/app/";
var scount = 0, mainCount = 0;
var isLoading = false;
var airMouse = false;
var deviceRegisCheck;
var tvKeyCode = {
	ArrowLeft: 37,
	ArrowUp: 38,
	ArrowRight: 39,
	ArrowDown: 40,
	Enter: 13,
	Return: 461,
	Power: 409,
	ChannelUp: 427,
	ChannelDown: 428,
	Exit: 1001,
	Guide: 458
};
// var deviceMac = null;
var deviceMac = '1cf43ff843b4';
// var deviceSerialNumber = null;
var deviceSerialNumber = '507kklpk6504';
var deviceModelName = "";
var lastNetworkType = "";
var deviceIp  = null;
var warmSleepTimerId = null;
var warmSleepStartTs = null;
var isWarmMode = false;
var WARM_SLEEP_RESET_MS = 24 * 60 * 60 * 1000;
var DisplayCheckOutScreen = false;

function _isValidIp(ip) {
  return typeof ip === "string" &&
         ip !== "0.0.0.0" &&
         /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
}

// Keep module-level handles so we can cancel them
var _macRetryTimer = null;
var _macTimeoutTimer = null;
var _macRetryIntervalMs = 2000;   // retry every 2s
var _macOverallTimeoutMs = 120000; // 120s total

function showGettingMacScreen() {
    // Display a centered please-wait message (adapt HTML/CSS to your app)
    macro("#mainContent").html('<div id="mac-wait"">Please wait</div>');
    macro("#mainContent").show();
}

function showMacErrorScreen() {
    var html = ''
      + '<div id="mac-error">'
      + '<div class="mac_error_head">Unable to get MAC address</div>'
      + '<div class="mac_error_head_span">Please restart the TV</div>'
      + '</div>';
    macro("#mainContent").html(html);
    macro("#mainContent").show();

    // wire buttons
    macro("#mac-retry-btn").off("click").on("click", function () {
        // clear existing timers then re-init the flow
        clearMacTimers();
        startMacAcquisitionFlow();
    });
}


function clearMacTimers() {
    try { if (_macRetryTimer) { clearTimeout(_macRetryTimer); _macRetryTimer = null; } } catch (e) {}
    try { if (_macTimeoutTimer) { clearTimeout(_macTimeoutTimer); _macTimeoutTimer = null; } } catch (e) {}
}

function _scanDevicesForIpAndMac(callback) {
  if (!hcap || !hcap.network || !hcap.network.getNumberOfNetworkDevices) {
    return typeof callback === "function" && callback(false);
  }

  hcap.network.getNumberOfNetworkDevices({
    onSuccess: function (devices) {
      var count = (devices && devices.count) || 0;
      if (!count) return typeof callback === "function" && callback(false);

      var pending = count, done = false;

      for (var i = 0; i < count; i++) {
        (function (idx) {
          hcap.network.getNetworkDevice({
            index: idx,
            onSuccess: function (s) {
              if (!done) {
                // prefer the first interface with a valid IP
                if (_isValidIp(s && s.ip)) {
                  deviceIp = s.ip;
                  if (s && s.mac) deviceMac = s.mac;
                  done = true;
                  return typeof callback === "function" && callback(true);
                }
                // still grab MAC if we don't have it yet
                if (!deviceMac && s && s.mac) deviceMac = s.mac;
              }
              if (--pending === 0 && !done) {
                // no interface had a valid IP; success only if we at least got a MAC
                typeof callback === "function" && callback(!!deviceMac);
              }
            },
            onFailure: function () {
              if (--pending === 0 && !done) {
                typeof callback === "function" && callback(!!deviceMac);
              }
            }
          });
        })(i);
      }
    },
    onFailure: function () {
      typeof callback === "function" && callback(false);
    }
  });
}

function getTvAllDetails(callback) {
  try {
    if (!hcap || !hcap.network) {
      console.warn("hcap.network not available");
      return typeof callback === "function" && callback(false);
    }

    // 1) Try unified info first (more reliable for active interface)
    if (hcap.network.getNetworkInformation) {
      hcap.network.getNetworkInformation({
        onSuccess: function (s) {
          var ip = s && s.ip_address;
          if (_isValidIp(ip)) {
            deviceIp = ip; // set only if valid
          }
          // We still need MAC: scan devices quickly (also fills IP if missing)
          _scanDevicesForIpAndMac(function (ok) {
            if (ok && deviceMac) {
              console.log("✅ MAC Address:", deviceMac);
            } else {
              console.warn("MAC Address not found");
            }
            typeof callback === "function" && callback(!!deviceMac);
          });
        },
        onFailure: function () {
          // fallback: scan devices for both
          _scanDevicesForIpAndMac(function (ok) {
            if (ok && deviceMac) {
              console.log("✅ MAC Address:", deviceMac);
            } else {
              console.warn("MAC Address not found");
            }
            typeof callback === "function" && callback(!!deviceMac);
          });
        }
      });
      return;
    }

    // 2) If getNetworkInformation isn't available, scan devices directly
    _scanDevicesForIpAndMac(function (ok) {
      if (ok && deviceMac) {
        console.log("✅ MAC Address:", deviceMac);
      } else {
        console.warn("MAC Address not found");
      }
      typeof callback === "function" && callback(!!deviceMac);
    });

  } catch (e) {
    console.error("getTvAllDetails error:", e && e.message);
    typeof callback === "function" && callback(false);
  }
}

// The repeated attempt routine
function _attemptGetMac(onComplete) {
    getTvAllDetails(function (ok) {
        if (ok && deviceMac) {
            // got MAC
            clearMacTimers();
            if (typeof onComplete === "function") onComplete(true);
            return;
        }
        // not yet — schedule next try if timeout not reached (macTimeoutTimer will handle overall timeout)
        _macRetryTimer = setTimeout(function () {
            _attemptGetMac(onComplete);
        }, _macRetryIntervalMs);
    });
}

function startMacAcquisitionFlow() {
	showGettingMacScreen();

	    // start overall timeout
    _macTimeoutTimer = setTimeout(function () {
        
		// timed out stopped show mac error screen
        clearMacTimers();
        console.warn("Timed out obtaining device MAC after " + (_macOverallTimeoutMs / 1000) + " seconds");
        showMacErrorScreen();
    }, _macOverallTimeoutMs);

	// start first attempt immediately
    _attemptGetMac(function (success) {
        if (success) {
            console.log("Device MAC obtained:", deviceMac);
            // proceed with app initialization sequence
            try {
                bindingAppsToPms();
            } catch (e) { console.warn("bindingAppsToPms error:", e); }

            var res1 = JSON.parse(localStorage.getItem('lgLgChannelMetaDetails'));
            var res2 = JSON.parse(localStorage.getItem('lgLgChannelIdDetails'));

            console.log("presentPagedetails.lgLgChannelIdDetails---------------------------------------------->", res2)
            console.log("presentPagedetails.lgLgChannelMetaDetails----------------------------------------------->", res1)
            try {
                Main.deviceRegistrationAPi();
            } catch (e) { console.error("deviceRegistrationAPi error:", e); }

            try { getDeviceSerialNumber(); } catch (e) { console.warn("getDeviceSerialNumber error:", e); }
            try { registerKeyCodeNumbers(); } catch (e) { console.warn("registerKeyCodeNumbers error:", e); }
            try { registerKeyCodeExit(); } catch (e) { console.warn("registerKeyCodeExit error:", e); }
            try { initHCAPPowerDefaults(); } catch (e) { console.warn("initHCAPPowerDefaults error:", e); }
            try {
              if(typeof stopAndClearMedia === 'function') {
                stopAndClearMedia();
              }
            } catch(e) {}

            // Stop any intervals
            try {
              if (Main.lgLgchannelMetaRefreshInterval) {
                clearInterval(Main.lgLgchannelMetaRefreshInterval);
                Main.lgLgchannelMetaRefreshInterval = null;
              }
            }catch(e) {
              console.warn('Error clearing interval:', e);
            }

            try { resetHdmiToLIveTv(); } catch (e) { console.warn("resetHdmiToLIveTv error:", e); }
            try { clearNoSignalNative(); } catch (e) { console.warn("clearNoSignalNative error:", e); }
            try { exitLiveTv(); } catch (eExit) { console.warn('exitLiveTv threw', eExit); }

            // Clear current channel and navigate back
            try {
              presentPagedetails.currentChannelId = undefined;
              presentPagedetails.showingTvGuide = false;
            } catch(e) {
              console.warn('Error navigating back:', e);
            }

            // Clean up overlays and UI elements
            try {
              macro('.lg-tv-overlay').css('display', 'none');
              macro('.tv-guide-container').css('display', 'none');
              macro('.live-tv-overlay').css('display', 'none');
              macro('.live-tv-guide-container').css('display', 'none');
            } catch(e) {console.warn('Error hiding overlays:', e);}

            // Reset background
            try {
              document.body.style.background = "#000";
            } catch(e) {
              console.warn('Error resetting background:', e);
            }

            try {
              if (window.hcap && hcap.mode && typeof hcap.mode.setHcapMode === 'function') {
                hcap.mode.setHcapMode({ mode: hcap.mode.HCAP_MODE_1 });
              }
            } catch (e) {}
        }
    });
}

function getDeviceSerialNumber() {
  try {
    hcap.property.getProperty({
      key: 'serial_number',
      onSuccess: function (response) {
        var value = response && response.value ? response.value : null;

        deviceSerialNumber = value;
      },
      onFailure: function (error) {
        console.warn('[HCAP Property] Failed to get:', error && error.errorMessage);
      }
    });
  } catch (ex) {
    console.error('[HCAP Property] Exception:', 'serial_number', ex);
  }
}

function registerKeyCodeNumbers() {
    try {
      if (window.hcap && hcap.key && hcap.key.registerKey) {
        // register the power key scancode so native power is intercepted
        hcap.key.registerKey({
          keyCode: [409],  // must be an array (Power key)
          onSuccess: function () {
            console.log("Power key (409) registered successfully");
          },
          onFailure: function (f) {
            console.error("Power key registration failed:", f && f.errorMessage);
          }
        });
      } else {
        console.warn("hcap.key.registerKey API not available on this device");
      }
    } catch (e) {
      console.error("Exception while registering Power key:", e);
    }
}

function registerKeyCodeExit() {
    try {
      if (window.hcap && hcap.key && hcap.key.registerKey) {
        // register the power key scancode so native power is intercepted
        hcap.key.registerKey({
          keyCode: [1001,457],  // Exit and Info keys
          onSuccess: function () {
            // utilities.genricPopup("Keys (1001,457) registered successfully", 'info');
            console.log("Keys (1001,457) registered successfully");
          },
          onFailure: function (f) {
            // utilities.genricPopup("Key registration failed: " + (f && f.errorMessage), 'info');
            console.error("Key registration failed:", f && f.errorMessage);
          }
        });
      } else {
        // utilities.genricPopup("hcap.key.registerKey API not available on this device", 'info');
        console.warn("hcap.key.registerKey API not available on this device");
      }
    } catch (e) {
    //   utilities.genricPopup("Exception while registering Power key: " + e, 'info');
      console.error("Exception while registering Power key:", e);
    }
}

function initHCAPPowerDefaults() {
    if (!window.hcap) {
      console.warn('HCAP not available - cannot set instant_power');
      return;
    }

    if (hcap.property && hcap.property.getProperty && hcap.property.setProperty) {
      hcap.property.getProperty({
        key: 'instant_power',
        onSuccess: function(resp) {
          // resp.value may already be a string
          var cur = (resp && typeof resp.value !== 'undefined') ? Number(resp.value) : 0;
          // utilities.genricPopup("instant_power current value = " + cur, 'info');
          console.log('instant_power current value =', cur);

          // IMPORTANT: setProperty expects a STRING value
          if (cur !== 2) {
            hcap.property.setProperty({
              key: 'instant_power',
              value: "2", // <- string here
              onSuccess: function() {
                // utilities.genricPopup("instant_power set to \"2\" (persistent warm mode enabled)", 'info');
                console.log('instant_power set to "2" (persistent warm mode enabled)');
              },
              onFailure: function(f) {
                // utilities.genricPopup("Failed to set instant_power: " + (f && f.errorMessage), 'info');
                console.warn('Failed to set instant_power:', f && f.errorMessage);
              }
            });
          }
        },
        onFailure: function(f) {
        //   utilities.genricPopup("getProperty instant_power failed: " + (f && f.errorMessage), 'info');
          console.warn('getProperty instant_power failed:', f && f.errorMessage);
        }
      });
    } else {
      console.warn('hcap.property.getProperty/setProperty API not available on this device');
    }

    // Persist security_level as string (if you need it)
    try {
      if (hcap.property && hcap.property.setProperty) {
        hcap.property.setProperty({
          key: 'security_level',
          value: "2", // <- string
          onSuccess: function() {
            // utilities.genricPopup("security_level set to \"2\"", 'info');
            console.log('security_level set to "2"');
          },
          onFailure: function(f) {
            // utilities.genricPopup("setProperty(security_level) failed: " + (f && f.errorMessage), 'info');
            console.warn('set security_level failed', f && f.errorMessage);
          }
        });
      }
    } catch (e) {
    //   utilities.genricPopup("security_level set skipped", 'info');
      console.warn('security_level set skipped', e);
    }
}

function appStart() {
	console.log("Starting appStart sequence (MAC acquisition flow)");
	// Reset HDMI state on app startup
	if (typeof resetHdmiOnStartup === "function") {
		resetHdmiOnStartup();
	}
	startMacAcquisitionFlow();
}

app.checkMainFilesStatus = function() {
	function checkMainFiles() {
		try {
			app.loadMeta();
		} catch (e) {
			clearInterval(loadTimeInterval);
			loadTimeInterval = '';
			loadTimeInterval = setTimeout(checkMainFiles, 100);
		}
	}
	var loadTimeInterval = setTimeout(checkMainFiles, 100);
}

app.loadMeta = function() {
	try {
		if (vers.files) {
			for (var i = 0; i < vers.files.length; i++) {
				if (vers.files[i].FileName.indexOf('css') != -1) {
					var link = document.createElement('link');
					link.setAttribute('rel', 'stylesheet');
					link.setAttribute('type', 'text/css');
					link.setAttribute('href', "" + vers.files[i].FileName + "?v=" + vers.files[i].VersionNo + "");
					document.getElementsByTagName('head')[0].appendChild(link);

					if (link.addEventListener) {
						link.addEventListener('load', function() {
							scount++;
							if (scount == vers.files.length) app.initialize();
						}, false);
					} else if (link.onreadystatechange) {
						link.onreadystatechange = function() {
							var state = link.readyState;
							if (state === 'loaded' || state === 'complete') {
								link.onreadystatechange = null;
								scount++;
								if (scount == vers.files.length) app.initialize();
							}
						};
					} else {
						link.onload = function() {
							scount++;
							if (scount == vers.files.length) app.initialize();
						};
					}
				} else {
					var fileref = document.createElement('script');
					if (typeof fileref != "undefined") {
						fileref.src = "" + vers.files[i].FileName + "?v=" + vers.files[i].VersionNo + "";
						document.getElementsByTagName("head")[0].appendChild(fileref);
						if (fileref.onreadystatechange) {
							fileref.onreadystatechange = function() {
								if (this.readyState == 'complete') {
									scount++;
									if (scount == vers.files.length) app.initialize();
								}
							}
						} else {
							fileref.onload = function() {
								scount++;
								if (scount == vers.files.length) app.initialize();
							}
						}
					}
				}
			}
		}
	} catch (e) {
		if (!!document.getElementById("customMessage")) {
			document.getElementById("customMessage").style.display = "block";
			document.getElementById("customMessage").innerHTML = "<p class='loadNot'><img style='width: 70px;vertical-align: -25px;padding-right: 14px;' src='https://d20w296omhlpzq.cloudfront.net/devices/common/shape-9@3x.png'/>Unable to load necessary modules, Please check your internet connection and relaunch the application.</p>";
		}
	}
}

app.initialize = function() {
	Main.showSplash();
	setTimeout(function() {
		console.log("Splash timeout complete, proceeding to MAC acquisition");
		appStart();
	}, 1500)

	window.addEventListener('keydown', function(e) {
		airMouse = false;
		if (isLoading == false) {
			var id = macro('.mouseFocus').attr("id");
			if (id) {
				macro('#' + id).removeClass('mouseFocus');
			}
			Main.processTrigger(e);
		}
	});
}

app.appPreLoad = function() {
	macro.ajax({
			type: "GET",
			url: loadFilePaths + "?v=" + new Date().getTime()
		})
		.done(function(msg) {
			try {
				if (typeof msg == "string") {
					vers = JSON.parse(msg);
				} else {
					vers = msg;
				}

				if (vers.mainFiles) {
					for (var i = 0; i < vers.mainFiles.length; i++) {
						if (vers.mainFiles[i].FileName.indexOf('css') != -1) {
							var link = document.createElement('link');
							link.setAttribute('rel', 'stylesheet');
							link.setAttribute('type', 'text/css');
							link.setAttribute('href', vers.mainFiles[i].FileName + "?v=" + vers.mainFiles[i].VersionNo);
							document.getElementsByTagName('head')[0].appendChild(link);

							link.onload = link.onreadystatechange = function() {
								if (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') {
									mainCount++;
									if (mainCount == vers.mainFiles.length) app.checkMainFilesStatus();
								}
							};
						} else {
							var fileref = document.createElement('script');
							if (typeof fileref != "undefined") {
								fileref.src = vers.mainFiles[i].FileName + "?v=" + vers.mainFiles[i].VersionNo;
								document.getElementsByTagName("head")[0].appendChild(fileref);

								fileref.onload = fileref.onreadystatechange = function() {
									if (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') {
										mainCount++;
										if (mainCount == vers.mainFiles.length) app.checkMainFilesStatus();
									}
								};
							}
						}
					}
				}
			} catch (e) {
				console.log(e);
				app.errorLoad();
			}
		})
		.fail(function(err) {
			app.errorLoad();
		});
};

app.errorLoad = function() {
	if (!!document.getElementById("customMessage")) {
		document.getElementById("customMessage").style.display = "block";
		document.getElementById("customMessage").innerHTML = "<p class='loadNot'><img style='width: 70px;vertical-align: -25px;padding-right: 14px;' src='https://d20w296omhlpzq.cloudfront.net/devices/common/shape-9@3x.png'/>Unable to load necessary modules, Please check your internet connection and relaunch the application.</p>";
	}
	window.addEventListener('keydown', function(e) {
		app.reloadApp(e);
	});
}

app.reloadApp = function(event) {
	var keycode = (window.event) ? event.keyCode : event.which;
	if (keycode == 13) {
		document.getElementById("customMessage").style.display = "none";
		location.reload();
	} else if (keycode == 8 || keycode == 27) {
		window.close();
	}
}

function resetHdmiToLIveTv() {
	try {
		if (window.hcap && hcap.mode && typeof hcap.mode.setHcapMode === 'function') {
			hcap.mode.setHcapMode({
				mode: hcap.mode.HCAP_MODE_1,
				onSuccess: function () {
					console.log('HCAP_MODE_1 restored');
	
					// 🔹 IMPORTANT: Switch back to Live TV (Tuner)
					if (window.hcap && hcap.externalinput) {
						hcap.externalinput.setCurrentExternalInput({
							type: hcap.externalinput.ExternalInputType.TV,
							index: 0,
							onSuccess: function () {
								console.log("Returned to Live TV (Tuner)");
							},
							onFailure: function (f) {
								console.warn("Failed to return to Live TV:", f && f.errorMessage);
							}
						});
					}
				}
			});
		}
	} catch (e) {
		console.warn('setHcapMode / return-to-TV failed', e);
	}
}

document.addEventListener('power_mode_changed', function(event) {
  console.log("Power mode changed event:", event);
  console.log("view outside------------------------------------------>", view);

  var isInLiveTv = (view === "lgLgLiveTv" || view === "liveTvPlayer");
  if(isInLiveTv) {

    try {
      hcap.power.getPowerMode({
        onSuccess: function(s) {
          var cur = s && s.mode;

          console.log("s---------------->", s)

          if (cur !== hcap.power.PowerMode.WARM) {
            console.log("normal mode called-------------------------->")
          }else {
            try {
              if(typeof stopAndClearMedia === 'function') {
                stopAndClearMedia();
              }
            } catch(e) {}

            // Stop any intervals
            try {
              if (Main.lgLgchannelMetaRefreshInterval) {
                clearInterval(Main.lgLgchannelMetaRefreshInterval);
                Main.lgLgchannelMetaRefreshInterval = null;
              }
            }catch(e) {
              console.warn('Error clearing interval:', e);
            }

            try { resetHdmiToLIveTv(); } catch (e) { console.warn("resetHdmiToLIveTv error:", e); }
            try { clearNoSignalNative(); } catch (e) { console.warn("clearNoSignalNative error:", e); }
            try { exitLiveTv(); } catch (eExit) { console.warn('exitLiveTv threw', eExit); }

            // Clear current channel and navigate back
            try {
              presentPagedetails.currentChannelId = undefined;
              presentPagedetails.showingTvGuide = false;
              Main.previousPage(); 
            } catch(e) {
              console.warn('Error navigating back:', e);
            }

            // Clean up overlays and UI elements
            try {
              macro('.lg-tv-overlay').css('display', 'none');
              macro('.tv-guide-container').css('display', 'none');
              macro('.live-tv-overlay').css('display', 'none');
              macro('.live-tv-guide-container').css('display', 'none');
            } catch(e) {console.warn('Error hiding overlays:', e);}

            // Reset background
            try {
              document.body.style.background = "#000";
            } catch(e) {
              console.warn('Error resetting background:', e);
            }

            try {
              if (window.hcap && hcap.mode && typeof hcap.mode.setHcapMode === 'function') {
                hcap.mode.setHcapMode({ mode: hcap.mode.HCAP_MODE_1 });
              }
            } catch (e) {}
          }
        },
        onFailure: function(f) {
          console.warn("hcap.power.getPowerMode failed:", f && f.errorMessage);
          try {
            if (typeof stopAndClearMedia === 'function') {
              stopAndClearMedia(); 
            }
          } catch(e) {}

          // Stop any intervals
          try {
            if (Main.lgLgchannelMetaRefreshInterval) {
              clearInterval(Main.lgLgchannelMetaRefreshInterval);
              Main.lgLgchannelMetaRefreshInterval = null;
            }
          } catch(e) {
            console.warn('Error clearing interval:', e);
          }

          try { resetHdmiToLIveTv(); } catch (e) { console.warn("resetHdmiToLIveTv error:", e); }
          try { clearNoSignalNative(); } catch (e) { console.warn("clearNoSignalNative error:", e); }
          try { exitLiveTv(); } catch (eExit) { console.warn('exitLiveTv threw', eExit); }

          // Clear current channel and navigate back
          try {
            presentPagedetails.currentChannelId = undefined;
            presentPagedetails.showingTvGuide = false;
            Main.previousPage(); 
          } catch(e) {
            console.warn('Error navigating back:', e);
          }

          // Clean up overlays and UI elements
          try {
            macro('.lg-tv-overlay').css('display', 'none');
            macro('.tv-guide-container').css('display', 'none');
          } catch(e) {console.warn('Error hiding overlays:', e);}

          // Reset background
          try {
            document.body.style.background = "#000";
          } catch(e) {
            console.warn('Error resetting background:', e);
          }

          try {
            if (window.hcap && hcap.mode && typeof hcap.mode.setHcapMode === 'function') {
              hcap.mode.setHcapMode({ mode: hcap.mode.HCAP_MODE_1 });
            }
          } catch (e) {}
        }
      })
    } catch (e) {
      console.warn("getPowerMode error:", e);
    }
  }
})

document.addEventListener('output_connection_changed', function(event) {
  console.log("output_connection_changed ----->", event);

  if (typeof hcap === 'undefined' || !hcap.system || !hcap.system.getHdmiOutStatus) return;

  hcap.system.getHdmiOutStatus({
    onSuccess: function(status) {
      console.log("HDMI OUT status:", status);

      var hdmiCableStatus = (status && status.connected) ? "connected" : "disconnected";

      if (hdmiCableStatus === "disconnected") {

        // ✅ STEP 1: Force HCAP_MODE_1 — this tells the TV to render HTML 
        //            to its INTERNAL panel (not through HDMI OUT)
        // hcap.mode.setHcapMode({
        //   mode: hcap.mode.HCAP_MODE_2,
        //   onSuccess: function() {
        //     console.log("Mode set to HCAP_MODE_1");

        //     // ✅ STEP 2: Small delay to let the TV panel re-activate
        //     setTimeout(function() {

        //       // ✅ STEP 3: Restore body background (was "none" during video/hdmi mode)
        //       document.body.style.background = "#000";
        //       document.body.style.backgroundColor = "#000";

        //       // ✅ STEP 4: Force #mainContent to be visible with inline style
        //       var el = document.getElementById("mainContent");
        //       if (el) {
        //         el.style.display = "block";
        //         el.style.visibility = "visible";
        //         el.style.opacity = "1";
        //         el.style.zIndex = "9999";
        //       }

              // ✅ STEP 5: Inject the page
              macro("#mainContent").html('');
              macro("#mainContent").html(Util.customHdmiDisconnectedPage());
              macro("#mainContent").show();

        //       console.log("customHdmiDisconnectedPage rendered");

        //     }, 300); // 300ms for panel to wake up
        //   },
        //   onFailure: function(f) {
        //     console.warn("setHcapMode failed:", f);

        //     // Still try to show the page even if mode change failed
        //     document.body.style.background = "#000";
        //     macro("#mainContent").html('');
        //     macro("#mainContent").html(Util.customHdmiDisconnectedPage());
        //     macro("#mainContent").show();
        //   }
        // });

      } else if (hdmiCableStatus === "connected" && macro("#mainContent").find(".customHdmiDisconnectedPage").length > 0) {
        gotoHomeSCreenFromDisconnectPage();
      }

      // API update
      updateCurrentNetworkType(function() {
        var payload = {
          device_status_info: {
            hdmi_cable_status: hdmiCableStatus || ""
          }
        };
        if (typeof macro !== "undefined" && macro.ajax) {
          macro.ajax({
            url: apiPrefixUrl + "device-profile",
            type: "PATCH",
            data: JSON.stringify(payload),
            contentType: "application/json; charset=utf-8",
            headers: {
              Authorization: "Bearer " + (pageDetails && pageDetails.access_token ? pageDetails.access_token : "")
            }
          });
        }
      });
    },
    onFailure: function(f) {
      console.log("Failed to get HDMI output status:", f && f.errorMessage);
    }
  });
});

document.addEventListener('hdmi_connection_changed', function(event) {
  console.log("hdmi_connection_changed event:", event);

  var hdmiStatus = (event && event.connected) ? "connected" : "disconnected";

      if(hdmiStatus === "disconnected") {
        handleHdmiConnection();
      }else if(hdmiStatus === "connected") {
        Main.addBackData("MyDevice");
        view = "MyDevice"
        presentPagedetails.view = view;
        Util.DevicesSwitchPage();
      }
})

document.addEventListener('idcap::mpi_cable_status_changed', function(param) {
  var mpiStatus = (param && param.connected) ? "connected" : "disconnected";
  console.log("MPI status changed:", mpiStatus);

  if (mpiStatus === "disconnected") {
    macro("#mainContent").html('');
    macro("#mainContent").html(Util.customHdmiDisconnectedPage());
    macro("#mainContent").show();
  } else if(mpiStatus === "connected" && macro("#mainContent").find(".customHdmiDisconnectedPage").length > 0) {
    gotoHomeSCreenFromDisconnectPage();
  }

  updateCurrentNetworkType(function () {
    var payload = {
      device_status_info: {
        mpi_cable_status: mpiStatus ? mpiStatus : "",
      }
    }
    if (typeof macro !== "undefined" && macro.ajax) {
      macro.ajax({
        url: apiPrefixUrl + "device-profile",
        type: "PATCH",
        data: JSON.stringify(payload),
        contentType: "application/json; charset=utf-8",
        headers: {
          Authorization: "Bearer " + (pageDetails && pageDetails.access_token ? pageDetails.access_token : "")
        }
      });
    }
  });
});

function handleMqttCommand(cmd, data, topic) {
  console.log('[MQTT CMD] cmd:', cmd, '| topic:', topic, '| data:', JSON.stringify(data));

    switch(cmd) {
      case "checkout"             : return mqtt_reboot(data);
      case "checkin"              : return mqtt_reboot(data);
      case "reboot"               : return mqtt_reboot(data);
      case "refresh"              : return mqtt_reboot(data);
      case "refresh_app_data"     : return mqtt_reboot(data);
      case "take_screenshot"      : return mqtt_takeScreenshot(data);
      case "screen_saver_on"      : return mqtt_screenSaverOn();
      case "screen_saver_off"     : return mqtt_screenSaverOff();
      case "refresh_screensaver"  : return mqtt_refreshScreenSaverData();
      case "get_status"           : return mqtt_sendStatusInfo(data);
    }
 
  function mqtt_reboot(data) {

    var payload = {
      cmd: data.cmd,
      response: {
        cmd_status: true,
        sr_no: deviceSerialNumber ? deviceSerialNumber : "",
      },
      seq: data.seq
    };

    sendInfoToBackend(payload);

    setTimeout(function () {
      CheckoutManager_requestCheckout();
    }, 1500);

  }

  /**
   * mqtt_screenSaverOn()
   *
   * Triggered by MQTT cmd "screen_saver_on".
   * Conditions required before launching:
   *   1. ScreenSaver module must be loaded.
   *   2. Main.screenSaverData must be ready (fetched by Main.screenSaverInterval).
   *   3. The screen saver must not already be active.
   *   4. The current view must be macroHome or languagePage (safe to cover).
   *
   * If conditions are met the idle timer is cancelled and the screen saver
   * launches immediately (bypassing the normal idle countdown).
   * If Main.screenSaverData is not ready yet we wait up to 10 s, polling
   * every 500 ms, so a command arriving just after boot still works.
   */
  function mqtt_screenSaverOn() {
    console.log('[MQTT] screen_saver_on received');

    if (typeof ScreenSaver === 'undefined') {
      console.warn('[MQTT] ScreenSaver module not loaded — ignoring screen_saver_on');
      return;
    }

    // Respect is_screen_saver_service flag — if not explicitly true, ignore the command.
    var isEnabled = Main.deviceProfile &&
                    Main.deviceProfile.property_detail &&
                    Main.deviceProfile.property_detail.is_screen_saver_service === true;
    if (!isEnabled) {
      console.warn('[MQTT] screen_saver_on: is_screen_saver_service is not true — ignoring');
      return;
    }

    if (ScreenSaver.isActive()) {
      console.log('[MQTT] Screen saver already active — ignoring screen_saver_on');
      return;
    }

    // Helper: attempt launch once data is confirmed ready
    function _tryLaunch(attemptsLeft) {
      var dataReady = Main.screenSaverData &&
                      Main.screenSaverData.ready &&
                      Array.isArray(Main.screenSaverData.entries) &&
                      Main.screenSaverData.entries.length > 0;

      if (!dataReady) {
        if (attemptsLeft <= 0) {
          console.warn('[MQTT] screen_saver_on: screenSaverData still not ready after retries — aborting');
          return;
        }
        console.log('[MQTT] screen_saver_on: waiting for screenSaverData… attempts left:', attemptsLeft);
        setTimeout(function () { _tryLaunch(attemptsLeft - 1); }, 500);
        return;
      }

      // Only launch from safe views (home / language page)
      var safeView = (view === 'macroHome' || view === 'languagePage');
      if (!safeView) {
        console.warn('[MQTT] screen_saver_on: current view "' + view + '" is not macroHome/languagePage — ignoring');
        return;
      }

      // Cancel the normal idle countdown so it doesn't double-fire
      try { ScreenSaver.clearIdleTimer(); } catch (e) {}

      // Simulate idle-timer expiry by temporarily patching screen_saver_start_time
      // to 1 second, arming the timer, then restoring the original value.
      console.log('[MQTT] screen_saver_on: launching screen saver now');
      try {
        var propDetail = Main.deviceProfile && Main.deviceProfile.property_detail;
        var originalTime = propDetail ? propDetail.screen_saver_start_time : undefined;

        if (propDetail) { propDetail.screen_saver_start_time = 1; }

        ScreenSaver.armIdleTimer();   // arms a 1-second timer → launches

        // Restore original value after the timer fires (1 s + buffer)
        setTimeout(function () {
          if (propDetail && originalTime !== undefined) {
            propDetail.screen_saver_start_time = originalTime;
          }
        }, 1500);

      } catch (e) {
        console.error('[MQTT] screen_saver_on launch error:', e);
      }
    }

    // Retry up to 20 times (10 s total) in case data is still loading
    _tryLaunch(20);
  }

  /**
   * mqtt_screenSaverOff()
   *
   * Triggered by MQTT cmd "screen_saver_off".
   * Stops the screen saver (if active) exactly as a remote-key press
   * would: PlaylistPlayer is stopped silently, Main.previousPage() is
   * called to restore the previous page, and the idle timer is re-armed
   * so the saver can activate again after the next idle period.
   *
   * If the screen saver is not currently active this is a no-op.
   */
  function mqtt_screenSaverOff() {
    console.log('[MQTT] screen_saver_off received');

    if (typeof ScreenSaver === 'undefined') {
      console.warn('[MQTT] ScreenSaver module not loaded — ignoring screen_saver_off');
      return;
    }

    // If the service is disabled there is nothing to stop.
    var isEnabled = Main.deviceProfile &&
                    Main.deviceProfile.property_detail &&
                    Main.deviceProfile.property_detail.is_screen_saver_service === true;
    if (!isEnabled) {
      console.warn('[MQTT] screen_saver_off: is_screen_saver_service is not true — ignoring');
      return;
    }

    if (!ScreenSaver.isActive()) {
      console.log('[MQTT] Screen saver not active — ignoring screen_saver_off');
      return;
    }

    // Delegate to handleKeyPress which performs a clean stop + page restore
    // + idle-timer re-arm, identical to what a physical remote key press does.
    console.log('[MQTT] screen_saver_off: stopping screen saver via handleKeyPress()');
    try {
      ScreenSaver.handleKeyPress();
    } catch (e) {
      console.error('[MQTT] screen_saver_off error:', e);
    }
  }

  function mqtt_refreshScreenSaverData() {
    console.log('[MQTT] refresh_screensaver received');

    // Only refresh if the screen saver service is enabled.
    var isEnabled = Main.deviceProfile &&
                    Main.deviceProfile.property_detail &&
                    Main.deviceProfile.property_detail.is_screen_saver_service === true;
    if (!isEnabled) {
      console.warn('[MQTT] refresh_screensaver: is_screen_saver_service is not true — ignoring');
      return;
    }

    Main.screenSaverData = null;  // clear existing data to force refresh
    Main.screenSaverInterval();
  }

  function mqtt_takeScreenshot(data) {
    if (!data || !data.put_presign_url) {
      console.error("[Screenshot] Missing put_presign_url in MQTT payload");
      return;
    }

    // 1. Capture screen via IDCAP
    idcap.request("idcap://utility/screen/capture", {
      parameters: {
        width: 1920,
        height: 1080,
        format: "PNG"
      },
      onSuccess: function (cbObject) {
        // utilities.genricPopup("Screenshot captured", 'info');

        console.log("Screenshot captured:", cbObject);

        var fileUri = cbObject.uri;
        if (!fileUri) {
          // utilities.genricPopup("Screenshot URI is empty", 'info');

          console.error("Screenshot URI is empty");
          return;
        }
        // utilities.genricPopup("Uploading screenshot to", 'info');

        console.log("Uploading screenshot to S3:", data.put_presign_url);

        // 2. Read file as Blob
        fetch(fileUri)
          .then(function (res) {
            if (!res.ok) throw new Error("Failed to read screenshot file");
            return res.blob();
          })
          .then(function (blob) {

            // 3. Upload to AWS S3 presigned PUT URL
            return fetch(data.put_presign_url, {
              method: "PUT",
              headers: {
                "Content-Type": "image/png"
              },
              body: blob
            });
          })
          .then(function (uploadRes) {
            if (!uploadRes.ok) {
              throw new Error("S3 upload failed, status: " + uploadRes.status);
            }
            // utilities.genricPopup("Screenshot uploaded success", 'info');

            console.log("Screenshot uploaded successfully to S3");

            // 4. Send MQTT confirmation back (CMD_RES)
            sendScreenshotAck(data, fileUri);
          })
          .catch(function (err) {
            // utilities.genricPopup("Screenshot upload error:" + err, 'info');

            console.error("Screenshot upload error:", err);
          });
      },
      onFailure: function (err) {
        console.error("IDCAP screenshot failed:", err && err.errorMessage);
        // utilities.genricPopup("IDCAP screenshot failed:" + err, 'info');

      }
    });
  }

  function sendScreenshotAck(data, fileUri) {

    console.log("fileUri-------------------------------->", fileUri)
    if (!window.GreMqttClient || !GreMqttClient.getClient) {
      console.warn("MQTT client not ready for ACK");
      return;
    }

    var client = GreMqttClient.getClient();
    if(!client) {
      console.warn("MQTT client instance missing");
      return;
    }

    var deviceSrNo = GreMqttClient.getDeviceSrNo();
    var ackTopic = "GRE/" + deviceSrNo + "/CMD_RES";

    var ackPayload = JSON.stringify({
      cmd: "take_screenshot",
      seq: data.seq,
      status: "uploaded",
      file_name: data.file_name,
      get_presign_url: data.get_presign_url
    });

    client.publish(ackTopic, ackPayload, { qos: 1 , retain: false}, function(err) {
      if (err) console.error("Failed to publish screenshot ACK:", err);
      else console.log("Screenshot ACK sent:", ackPayload);
    })
  }

  function mqtt_sendStatusInfo(data) {

    function buildAndSendPayload(screenStatus) {
      console.log("Screen status determined as:------------------>", screenStatus);

      if (typeof idcap === "undefined" || !idcap.request) {
        var payload = {
          cmd: data.cmd,
          response: {
            app_status: "Online",
            cmd_status: true,
            screen_status: screenStatus ? screenStatus : "",
            device_network_ip: deviceIp ? deviceIp : "",
            sr_no: deviceSerialNumber ? deviceSerialNumber : "",
            mac_address: deviceMac ? deviceMac : "",
            screen_saver_status: (typeof ScreenSaver !== 'undefined' && ScreenSaver.isActive()) ? "active" : "inactive",
          },
          seq: data.seq
        };
        sendInfoToBackend(payload);
        return;
      }

      idcap.request("idcap://network/configuration/get", {
        parameters: {},
        onSuccess: function(cbObject) {
          var wired = cbObject && cbObject.wired ? cbObject.wired : {};
          var wifi  = cbObject && cbObject.wifi  ? cbObject.wifi  : {};

          var networkInfo = {
            wired: {
              mac: wired.mac || "",
              state: wired.state || "",
              ipAddress: wired.ipAddress || "",
              onInternet: wired.onInternet || "",
              plugged: (wired.plugged === true || wired.plugged === false) ? wired.plugged : ""
            },
            wifi: {
              mac: wifi.mac || "",
              state: wifi.state || "",
              ipAddress: wifi.ipAddress || "",
              onInternet: wifi.onInternet || "",
              ssid: wifi.ssid || ""
            }
          };

          var payload = {
            cmd: data.cmd,
            response: {
              app_status: "Online",
              cmd_status: true,
              screen_status: screenStatus ? screenStatus : "",
              device_network_ip: deviceIp ? deviceIp : "",
              sr_no: deviceSerialNumber ? deviceSerialNumber : "",
              mac_address: deviceMac ? deviceMac : "",
              screen_saver_status: (typeof ScreenSaver !== 'undefined' && ScreenSaver.isActive()) ? "active" : "inactive",
              network_info: networkInfo
            },
            seq: data.seq
          };

          sendInfoToBackend(payload);
        }
      });
    }

    // ✅ All downstream logic now waits for getPowerMode to complete
    try {
      hcap.power.getPowerMode({
        onSuccess: function(s) {
          var cur = s && s.mode;
          var screenStatus = (cur !== hcap.power.PowerMode.WARM) ? 'on' : 'off';
          buildAndSendPayload(screenStatus);
        },
        onFailure: function(f) {
          console.warn("getPowerMode failed while fetching screen status:", f && f.errorMessage);
          buildAndSendPayload(null); // send payload anyway with null status
        }
      });
    } catch(e) {
      console.warn("getPowerMode exception:", e);
      buildAndSendPayload(null); // send payload anyway with null status
    }
  }

  function sendInfoToBackend(payload) {
    macro.ajax({
      url: apiPrefixUrl + "device-mqtt-cmd",
      type: "POST",
      data: JSON.stringify(payload),
      contentType: "application/json; charset=utf-8",
      headers: {
        Authorization: "Bearer " + pageDetails.access_token,
      },
      success: function(res) {
        console.log("Status info sent successfully:", res);
        var result = typeof res === "string" ? JSON.parse(res) : res;
        if(result.status === false) {
          Main.logTvException({
            error_type:    "API_ERROR",
            error_code:    "MQTT_CMD_POST_FAILED",
            error_message:  result.message ? JSON.stringify(result.message) : "Failed to send MQTT command",
            error_source:  "sendInfoToBackend",
            module:        "mqtt_command_handler"
          });
        }
      },
      error: function(err) {
        console.error("Failed to send status info:", err);

        Main.logTvException({
          error_type:    "API_ERROR",
          error_code:    "MQTT_CMD_POST_FAILED",
          error_message: "Failed to send MQTT command",
          error_source:  "sendInfoToBackend",
          module:        "mqtt_command_handler",
          extra_data: {
            status_code:  err && err.status  ? err.status  : undefined,
            status_text:  err && err.statusText ? err.statusText : undefined,
            response_text: err && err.responseText ? err.responseText : undefined
          }
        });
      },
      timeout: 60000
    })
  }
}

app.appPreLoad();