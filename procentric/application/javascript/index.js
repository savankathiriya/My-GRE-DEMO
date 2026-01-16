var app = {}
var macro = jQuery.noConflict();
var appConfig = {
	appVersion:"v1.120"
};
var loadFilePaths = 'macrotv.json';
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
var deviceMac = null;
var deviceIp  = null;

window.__APP_READY_FOR_POWER__ = false;

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

    setTimeout(function () {
      enableMode2Safely();
    }, 500);
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

function enableMode2Safely() {
  if (!window.hcap || !hcap.power || !hcap.mode) return;

  console.log("[STARTUP] Ensuring NORMAL mode before MODE_2");
 
  hcap.power.getPowerMode({
    onSuccess: function (res) {
      if (res.mode !== hcap.power.PowerMode.NORMAL) {
        // 🔥 Force panel ON first
        hcap.power.setPowerMode({
          mode: hcap.power.PowerMode.NORMAL,
          onSuccess: function () {
            console.log("[STARTUP] Panel forced to NORMAL");

            // 🔥 CRITICAL delay
            setTimeout(setMode2, 1200);
          }
        });
      } else {
        // Already NORMAL → still wait
        setTimeout(setMode2, 1200);
      }
    }
  });

  function setMode2() {
    hcap.mode.setHcapMode({
      mode: hcap.mode.HCAP_MODE_2,
      onSuccess: function () {
        console.log("[STARTUP] HCAP_MODE_2 enabled safely");
        window.__APP_READY_FOR_POWER__ = true;
      },
      onFailure: function (f) {
        console.warn("MODE_2 failed:", f && f.errorMessage);
      }
    });
  }
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
            try {
                Main.deviceRegistrationAPi();
            } catch (e) { console.error("deviceRegistrationAPi error:", e); }

            try { exitLiveTv(); } catch (e) { console.warn("exitLiveTv error:", e); }
            try { registerKeyCodeNumbers(); } catch (e) { console.warn("registerKeyCodeNumbers error:", e); }
            try { registerKeyCodeExit(); } catch (e) { console.warn("registerKeyCodeExit error:", e); }
            try { initHCAPPowerDefaults(); } catch (e) { console.warn("initHCAPPowerDefaults error:", e); }

            // 🔥 REQUIRED: avoid morning reboot issue
            setTimeout(function () {
              window.__APP_READY_FOR_POWER__ = true;
              console.log("[POWER] App ready for Warm Mode");
            }, 3000); // 2–3 sec is SAFE for LG TVs
        }
    });
}

function registerKeyCodeNumbers() {
    try {
      if (window.hcap && hcap.key && hcap.key.registerKey) {
        // register the power key scancode so native power is intercepted
        hcap.key.registerKey({
          keyCode: [409],  // must be an array (Power key)
          onSuccess: function () {
            // utilities.genricPopup("Power key (409) registered successfully", 'info');
            console.log("Power key (409) registered successfully");
          },
          onFailure: function (f) {
            // utilities.genricPopup("Power key registration failed: " + (f && f.errorMessage), 'info');
            console.error("Power key registration failed:", f && f.errorMessage);
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

app.appPreLoad();