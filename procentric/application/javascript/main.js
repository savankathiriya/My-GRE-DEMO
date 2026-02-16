var pageDetails = {};
var guestName = "";
var backData = [];
var Main = {
  deviceProfile: "",
};
Main.cachedBgBlobUrl = null;
var disableNavigation = false;

Main.showSplash = function (loaderType) {
  view = "splash";
  macro("#mainContent").css("display", "block");
  macro("#mainContent").html(Util.splashHtml(loaderType));
};
Main.ShowLoading = function () {
  document.getElementById("loading").style.display = "block";
  isLoading = true;
};
Main.HideLoading = function () {
  document.getElementById("loading").style.display = "none";
  isLoading = false;
};


Main.processTrigger = function (rawEvent) {
  var info = getKeyCode(rawEvent);
  var evt = info.evt;
  var keycode = info.keycode;


  console.log("called----------------------------------------------->", keycode, "current view:", view);


  // =================================================
  // POPUP HANDLING
  // =================================================
  if (Main.popupData && Main.popupData.popuptype) {
    try { return Navigation.popupKeyhandler(evt); } catch (e) { return; }
  }

  // =================================================
  // NORMAL NAVIGATION
  // =================================================
  try {
    switch (view) {
      case "macroHome":
        return Navigation.homePageNavigation(evt);
      case "languagePage":
        return Navigation.languagePageNavigation(evt);
      case "MyDevice":
        return Navigation.deviceSwitchNavigation(evt);
      case "liveTv":
        return Navigation.EmptyLiveNavigation(evt);
      case "casting":
        return Navigation.castingPageNavigation(evt);
      case "lgLgLiveTv":
        return Navigation.lgLgDemoPlayers(evt);
      case "liveTvPlayer":
        return Navigation.demoPlayers(evt);
      case "ourHotel":
        return Navigation.ourHotelPageNavigation(evt);
    }
  } catch (ex) {
    console.error("processTrigger error", ex);
  }
};

//storing the back Data
Main.addBackData = function (path) {
  presentPagedetails.htmlData = (macro('#mainContent').html() ).toString();

  if(path == "MyDevice" || path == "liveTv" || path == "casting" || path == "lgLgLiveTv" || path == "liveTvPlayer" || path == "ourHotel") {
    backData.push(presentPagedetails);
    presentPagedetails = {}
  }
}

Main.previousPage = function () {
  if(backData.length > 0) {
    presentPagedetails = backData[backData.length-1];
    macro("#mainContent").html('');
    macro("#mainContent").html(presentPagedetails.htmlData);
    backData.pop();
    view = presentPagedetails.view
  }
}

// QR code
Main.generateQrCode = function (key, code) {
  if (!utilities.validateString(key)) {
    throw "QR_API_FAILED";
  }
  if (!utilities.validateString(code)) {
    throw "QR_API_FAILED";
  }
  if (macro(window).width() == 1280) {
    var qrcode = new QRCode(key, {
      text: code,
      width: 184,
      height: 184,
      correctLevel: QRCode.CorrectLevel.H,
    });
  } else {
    var qrcode = new QRCode(key, {
      text: code,
      width: 277,
      height: 277,
      correctLevel: QRCode.CorrectLevel.H,
    });
  }

  qrcode.clear();
  qrcode.makeCode(code);
};

Main.startRefreshCountdown = function () {
  var seconds = 5;
  var timerElement = document.getElementById("refreshTimer");

  function updateTimer() {
    if (seconds > 0 && timerElement) {
      timerElement.innerText =
        "Activation refresh in " +
        seconds +
        " second" +
        (seconds !== 1 ? "s" : "");
    }

    seconds--;

    if (seconds < 0) {
      seconds = 5; // reset to 5 seconds
      // Optionally refresh the activation here
      // Main.showActivation(deviceMac);
    }

    setTimeout(updateTimer, 1000);
  }

  updateTimer(); // start the countdown
};

Main.deviceRegistrationAPi = function () {
  var data = JSON.stringify({
    sr_no: deviceMac,
  });

  macro.ajax({
    url: apiPrefixUrl + "provision-auth",
    type: "POST",
    data: data,
    contentType: "application/json; charset=utf-8",
    success: function (response) {
      var result =
        typeof response === "string" ? JSON.parse(response) : response;
      Main.HideLoading();
      if (result && result.result) {
        if (deviceRegisCheck) {
          clearTimeout(deviceRegisCheck);
        }

        // Display initial downloading page with 0% progress
        macro("#mainContent").html("");
        macro("#mainContent").html(Util.downloadingPage(0));
        Navigation.downloadingPageLoad();

        // Store result for future use
        pageDetails = result.result;

        // Begin sequence of API calls
        Main.guestInfo(function () {
          Navigation.updateDownloadProgress(30);
          Main.weatherApi(function () {
            Main.getHomeData(function () {
				Main.deviceProfileApi(function () {
					Navigation.updateDownloadProgress(60);

          Main.registerGoogleCastToken();

					if(Main.db) {
						try { Main.db.close(); } catch(ex) {console.log("Error closing IndexedDB:", ex)}
						Main.db = null;
					}
					var oldDbRequest = indexedDB.deleteDatabase("AppCacheDB");
					var fired = false;
					function go() { if (!fired) { fired = true; Main.getTemplateApiData(); } }
					oldDbRequest.onsuccess = go;
					oldDbRequest.onerror = go;
					oldDbRequest.onblocked = go;

					setTimeout(go, 1500); // fallback in case no event arrives (rare)
				})
			});
          });
        });
      } else {
        macro("#mainContent").html("");
        macro("#mainContent").html(Util.activationHtml(deviceMac));

        // Clear old QR code and generate new one
        macro("#qrImage").html("");
        Main.generateQrCode("qrImage", deviceMac);

        // Start refresh countdown
        Main.startRefreshCountdown();

        // Clear existing timeout and set new device registration check
        if (!!deviceRegisCheck) {
          clearTimeout(deviceRegisCheck);
        }
        deviceRegisCheck = setTimeout(function () {
          console.log("Device registration check triggered.");
          Main.deviceRegistrationAPi();
        }, 5000);
      }
    },
    error: function (err) {
      Main.HideLoading();
      macro("#mainContent").html("");
      macro("#mainContent").html(Util.activationHtml(deviceMac));

      // Clear old QR code and generate new one
      macro("#qrImage").html("");
      Main.generateQrCode("qrImage", deviceMac);

      // Start refresh countdown
      Main.startRefreshCountdown();

      // Clear existing timeout and set new device registration check
      if (!!deviceRegisCheck) {
        clearTimeout(deviceRegisCheck);
      }
      deviceRegisCheck = setTimeout(function () {
        console.log("Device registration check triggered.");
        Main.deviceRegistrationAPi();
      }, 5000);
      console.error("Provision API error:", err);
    },
    timeout: 60000,
  });
};

Main.guestInfo = function (callback) {
  macro.ajax({
    url: apiPrefixUrl + "guest-info",
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result =
        typeof response === "string" ? JSON.parse(response) : response;
      Main.HideLoading();
      if (result.status === true) {
        Main.guestInfoData = result.result;
        guestName = result.result.g_name ? result.result.g_name : "Guest";
      }

      if (typeof callback === "function") {
        callback();
      }
    },
    error: function (err) {
      Main.HideLoading();
      console.error("Guest Info API error:", err);

      // Still proceed to template Api
      if (callback === "function") {
        callback();
      }
    },
    timeout: 60000,
  });
};

Main.getTemplateApiData = function (comingFromHomeLang) {
	if(Main.templateApiData){
		Main.loadCachedImagesThenRender();
		return;
	}

	if(comingFromHomeLang === true){
		Main.ShowLoading();
	}

	macro.ajax({
		url: apiPrefixUrl + "device-template",
		type: "GET",
		headers: {
			Authorization: "Bearer " + pageDetails.access_token,
		},
		success: function (response) {
			var result = typeof response === "string" ? JSON.parse(response) : response;
			Main.HideLoading();

			if(result.status === true) {
				Navigation.updateDownloadProgress(80);
				Main.templateApiData = result.result;
				// if(Main.deviceProfile && Main.deviceProfile.property_detail && Main.deviceProfile.property_detail.status_server_ip){
				// 	if(Main.deviceProfile.property_detail.status_server_ip.indexOf(':') !== -1){
				// 		Main.deviceProfile.property_detail.status_server_ip = Main.deviceProfile.property_detail.status_server_ip.split(':')[0];
				// 	}
				// 	setTheRmsIpProperty(Main.deviceProfile.property_detail.status_server_ip);
				// }

				Main.dbInit(function () {
					var bgImage = Main.templateApiData.home_screen_bg && Main.templateApiData.home_screen_bg[0];
					if(bgImage){
						Main.cacheImageToDB(bgImage, function() {
							Main.loadCachedImagesThenRender();
						});
					} else {
						Main.loadCachedImagesThenRender();
					}

					// Main.cacheAllHomeBackgrounds(function (arr) {
					// 	console.log("Home backgrounds cached:", arr.length);
					// });
				});
			}
		},
		error: function (errObj) {
			console.error("Template API error:", errObj);
			Main.HideLoading();
		},
		timeout: 60000,
	})
}

Main.loadCachedImagesThenRender = function() {
	Navigation.updateDownloadProgress(95);

	setTimeout(function() {
		var proceed = function() {
			if(Main.templateApiData && Main.templateApiData.language_detail) {
				view = "languagePage";
				presentPagedetails.view = view;

				macro("#mainContent").html('');
				macro("#mainContent").html(Util.languageSelection());
				macro("#mainContent").show();
				macro('.imageFocus').removeClass('imageFocus');
				macro('#lang_btn-0').addClass('imageFocus');

        // Main.deviceActivity("open","page","welcome screen")
			}
		}

		// step-1 Load Background and logo first
		var loadLogo = function() {
			if(!Main.cachedPropertyLogo) {
				Main.getImageUrl('property_logo', function(logoUrl) {
					Main.cachedPropertyLogo = logoUrl;
					loadLanguageIcons();
				});
			} else {
				loadLanguageIcons();
			}
		}

		var loadLanguageIcons = function() {
			var langItems = [];
			if(Main.templateApiData && Main.templateApiData.language_detail) {
				for (var i = 0; i < Main.templateApiData.language_detail.length; i++) {
					var lang = Main.templateApiData.language_detail[i];
					if(lang.icon && lang.language_uuid){
						langItems.push({
							uuid: lang.language_uuid,
							url: lang.icon
						});
					}
				}
			}

			if(langItems.length){
				Main.cacheMultipleImages(langItems, function() {
					proceed();
				});
			} else {
				proceed();
			}
		}

		if(!Main.cachedBgBlobUrl) {
			Main.getImageUrl('menu_screen_bg', function(bgUrl) {
				Main.cachedBgBlobUrl = bgUrl;
				loadLogo();
			})
		} else {
			loadLogo();
		}
	}, 1000);
};

Main.cacheMultipleImages = function(items, callback) {
	if (!items || !items.length) return callback && callback();

	var total = items.length, doneCount = 0;

	var checkDone = function () {
		doneCount++;
		if(doneCount === total && callback) callback();
	}

	for (var i = 0; i < items.length; i++) {
		(function(item) {
			if(!item.url || !item.uuid){ return checkDone(); }

			var key = "langIcon_" + item.uuid;

			// already in  memory ?
			Main.cachedLanguageIcons = Main.cachedLanguageIcons || {};
			if(Main.cachedLanguageIcons[key]) {
				return checkDone();
			}

			if(!Main.db) {
				return Main.dbInit(function () {
					Main.cacheMultipleImages([item], checkDone);
				})
			}

			var tx = Main.db.transaction(["images"], "readonly");
			var store = tx.objectStore("images");
			var getRequest = store.get(key);

			getRequest.onsuccess = function (event) {
				var blob = event.target.result;
				if(blob) {
					Main.cachedLanguageIcons[key] = URL.createObjectURL(blob);
					return checkDone();
				}

				// fetch & cache once (with the key!)
				Main.cacheImageToDB(item.url, function(blobUrlOrFallback) {
					Main.cachedLanguageIcons[key] = blobUrlOrFallback || item.url;
					checkDone();
				}, key)
			};

			getRequest.onerror = function () {
				// fetch & cache once (with the key!)
				Main.cacheImageToDB(item.url, function(blobUrlOrFallback) {
					Main.cachedLanguageIcons[key] = blobUrlOrFallback || item.url;
					checkDone();
				}, key);
			}
		})(items[i]);
	}
};

// Function to render home page
Main.renderHomePage = function (applist, textOfLang) {
  view = "macroHome";
  presentPagedetails.view = view;
  Main.selectedLanguage = textOfLang
  macro("#mainContent").html("");
  macro("#mainContent").html(Util.homePageHtml());

  Main.ShowLoading();
  Navigation.homePageLoad(applist)

  setTimeout(function () {
    Main.HideLoading();
  }, 7000)
  
  macro("#mainContent").show();
  // Set focus to first app
  macro(".imageFocus").removeClass("imageFocus");
  macro("#menu-item-0").addClass("imageFocus");

  Main.updateDeviceDetailsSendApi();
};

Main.deviceProfileApi = function (callback) { 
	macro.ajax({
		url: apiPrefixUrl + "device-profile",
		type: "GET",
		headers: {
			Authorization: "Bearer " + pageDetails.access_token,
		},
		success: function (response) {
			var result = typeof response === 'string' ? JSON.parse(response) : response;
			Main.HideLoading();
			if(result.status === true) {
				Main.deviceProfile = result.result;


        // 🔥 SET RMS TRUSTED IP IMMEDIATELY AFTER GETTING DEVICE PROFILE
				if(Main.deviceProfile && Main.deviceProfile.property_detail && Main.deviceProfile.property_detail.status_server_ip){
					var rmsIp = Main.deviceProfile.property_detail.status_server_ip;
					// Remove port if present
					if(rmsIp.indexOf(':') !== -1){
						rmsIp = rmsIp.split(':')[0];
					}
					console.log('[RMS] Setting trusted IP:------------------------------->', rmsIp);
          console.log("deviceIp---------------------------------------------------------->", deviceIp)
					setTheRmsIpProperty(rmsIp);
				} else {
					console.warn('[RMS] No status_server_ip found in device profile');
				}

        // Initialize MQTT connection if settings are available
        if(Main.deviceProfile && Main.deviceProfile.property_detail.mqtt_setting) {

          // Wait to ensure all modules are loaded
          setTimeout(function () {
            try {
              if(typeof MqttClient !== 'undefined' && MqttClient.init) {
                MqttClient.init(Main.deviceProfile.property_detail.mqtt_setting, deviceMac);
              }else {
                console.warn('[MQTT] MqttClient module not loaded yet');
              }
            } catch (mqttError) {
              console.log('[MQTT] Initialization error:', mqttError);
            }
          }, 2000);
          // ===== MQTT INTEGRATION END =====
        }
			}

			if(typeof callback === "function") {
				callback();
			}
		},
		error: function (err) {
			Main.HideLoading();
			console.error("Device Profile API error:", err);

			if(typeof callback === "function") {
				callback();
			}
		},
		timeout: 60000,
	})
};

Main.cacheHomeImageAssetsByLanguage = function (items, langUuid, done) {
  try {
    if (!Array.isArray(items) || !items.length) {
      return typeof done === "function" ? done(items || []) : null; // callback with empty array
    }

    if (!Main.db) {
      return Main.dbInit(function () {
        Main.cacheHomeImageAssetsByLanguage(items, langUuid, done);
      });
    }

    var remaining = items.length;
    var out = new Array(items.length);

    function finishOne(index, updated) {
      out[index] = updated;
      remaining--;
      if (remaining <= 0 && typeof done === "function") done(out);
    }

    items.forEach(function (item, index) {
      if (!item) return finishOne(index, item);

      var updated = Object.assign({}, item); // shallow copy

      var bgKey = "home_" + langUuid + "_bg_" + (item.app_uuid || index);
      var iconKey = "home_" + langUuid + "_icon_" + (item.app_uuid || index);

      // Helper to get from IndexedDB or fetch and cache
      function getOrFetch(url, key, cb) {
        if (!url) return cb(null);

        var tx = Main.db.transaction(["images"], "readonly");
        var store = tx.objectStore("images");
        var getRequest = store.get(key);

        getRequest.onsuccess = function (event) {
          var blob = event.target.result;

          if (blob) {
            try {
              return cb(URL.createObjectURL(blob));
            } catch (ex) {
              return cb(null);
            }
          }

          // fetch and cache
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, true);
          xhr.responseType = "blob";
          xhr.onload = function () {
            if (xhr.status === 200) {
              var txw = Main.db.transaction(["images"], "readwrite");
              var storew = txw.objectStore("images");
              storew.put(xhr.response, key);

              txw.oncomplete = function () {
                cb(URL.createObjectURL(xhr.response));
              };

              txw.onerror = function () {
                cb(null);
              };
            } else {
              cb(null);
            }
          };
          xhr.onerror = function () {
            ccb(null);
          };
          xhr.send();
        };
        getRequest.onerror = function () {
          cb(null);
        };
      }

      // Chain: cache bg then icon, then finish
      getOrFetch(item.bg_image, bgKey, function (bgBlobUrl) {
        if (bgBlobUrl) updated._cached_bg_image = bgBlobUrl;
        getOrFetch(item.icon, iconKey, function (iconBlobUrl) {
          if (iconBlobUrl) updated._cached_icon = iconBlobUrl;
          finishOne(index, updated);
        });
      });
    });
  } catch (ex) {
    console.error("Error in Main.cacheHomeImageAssetsByLanguage:", ex);
    if (typeof done === "function") done(items || []);
  }
};

Main.getHomeData = function (callback) {
  if (Main.homePageData) {
    Main.homePageData = null;
  }

  var url = apiPrefixUrl + "app";
  macro.ajax({
    url: url,
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result =
        typeof response === "string" ? JSON.parse(response) : response;

      if (!result || result.status !== true) {
        console.warn("Home Data API returned no data or unsuccessful status");
        if (typeof callback === "function") {
          callback();
        }
      }

      Main.homePageData = result.result || [];

      Main.getBackgroundImageUrl(function (finalBgImageUrl) {

        Main.cachedBgBlobUrl = finalBgImageUrl;

        // Applist group and sort based on the language UUid

        var byLang = {};

        (Main.homePageData || []).forEach(function (app) {
          if (!app || app.is_active !== true) return;

          var languageId = app.language_uuid || "unknown";
          (byLang[languageId] = byLang[languageId] || []).push(app);
        });

        Object.keys(byLang).forEach(function (langId) {
          byLang[langId].sort(function (a, b) {
            return (a.priority_order || 0) - (b.priority_order || 0);
          });
        });

        var langs = Object.keys(byLang);
        if (!langs.length) {
          console.warn("No active apps found for any language");
          if (typeof callback === "function") {
            callback();
          }
          return;
        }

        Main.cachedHomeByLang = Main.cachedHomeByLang || {};

        var doneCount = 0,
          total = langs.length;

        function checkDone() {
          doneCount++;
          if (doneCount >= total && typeof callback === "function") {
            callback();
          }
        }

		langs.forEach(function (langId) {
			try {
				Main.cacheHomeImageAssetsByLanguage(byLang[langId], langId, function (cachedGroup) {
					try {
						Main.cachedHomeByLang[langId] = cachedGroup;
					} catch (ex) {
						console.warn("Error assigning cachedHomeByLang for langId:", langId, ex);
					}

					checkDone();
				})
			} catch (ex) {
				console.warn("Error caching home image assets for langId:", langId, ex);
				checkDone();
			}
		})
      });
    },
    error: function (err) {
      console.error("Home Data API error:", err);
      if (typeof callback === "function") {
        callback();
      }
    },
    timeout: 60000,
  });
};

Main.weatherApi = function (callback) {
  macro.ajax({
    url: apiPrefixUrl + "weather",
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result =
        typeof response === "string" ? JSON.parse(response) : response;
      Main.HideLoading();
      if (result.status === true) {
        Navigation.updateDownloadProgress(50);
        Main.weatherDetails = result.result;
        if (typeof callback === "function") {
          callback();
        }
      }
    },
    error: function (err) {
      Main.HideLoading();
      console.error("Weather API error:", err);
      if (typeof callback === "function") {
        callback();
      }
    },
    timeout: 60000,
  });
};

Main.jsontemplateApi = function() {
  console.log('[API] Fetching template data...');
  
  // ✅ Show loading popup
  showLoadingPopup();
  
  macro.ajax({
    url: apiPrefixUrl + "json-template?template_uuid=9116ddc9-388a-4060-8de6-3135e856d7cb",
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      try {
        var result = typeof response === "string" ? JSON.parse(response) : response;
        
        if(result.status === true) {
          Main.jsonTemplateData = result.result;
          
          console.log('[API] Template data loaded successfully');
          console.log('[API] Canvas size:', result.result.template_json.canvas.width, 'x', result.result.template_json.canvas.height);
          console.log('[API] Elements count:', result.result.template_json.elements.length);
          
          Main.addBackData("ourHotel");
          view = "ourHotel";
          presentPagedetails.view = view;
          
          console.log('[API] Rendering OurHotel page...');
          macro("#mainContent").html('');
          macro("#mainContent").html(Util.ourHotelPage());
          macro("#mainContent").show();
          
          // ⚠️ Don't hide loading yet - it will be hidden after canvas renders
        } else {
          console.error('[API] Template API returned status: false');
          hideLoadingPopup(); // ✅ Hide on error
        }
      } catch (parseError) {
        console.error('[API] Failed to parse template response:', parseError);
        hideLoadingPopup(); // ✅ Hide on error
      }
    },
    error: function(err) {
      console.error('[API] Template load failed:', err);
      hideLoadingPopup(); // ✅ Hide on error
      
      // Show error to user
      macro("#mainContent").html('<div style="color:#fff;text-align:center;padding:50px;">Failed to load template. Please try again.</div>');
    },
    timeout: 30000 
  });
}

Main.castingNewApi = function () {
  Main.addBackData("casting");
  Main.ShowLoading();

  macro.ajax({
    url: apiPrefixUrl + "tv-casting",
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result  = typeof response === "string" ? JSON.parse(response) : response;
      Main.HideLoading();

      if(result.status === true && result.result && result.result.casting_url) {
        view = "casting"
        presentPagedetails.view = view;

        macro("#mainContent").html('');
        macro("#mainContent").html(Util.castingScreen());

        //Qr code generate using backend actual cast screen url
        Main.generateQrCode("castingQr", result.result.casting_url);

        // Main.deviceActivity("close","page","Home screen");
        // Main.deviceActivity("open","page","Chromecast screen");

        // Start Clock & date
        utilities.updatingTimeAndDate();
      }else {
        view = "casting";
        presentPagedetails.view = view;
        macro("#mainContent").html('');
        macro("#mainContent").html(Util.errorCastingScreen());
        macro("#mainContent").show();
        utilities.updatingTimeAndDate();
      }
    },
    error: function (err) {
      Main.HideLoading();
      view = "casting";
      presentPagedetails.view = view;
      macro("#mainContent").html('');
      macro("#mainContent").html(Util.errorCastingScreen());
      macro("#mainContent").show();
      utilities.updatingTimeAndDate();
    },
    timeout: 60000
  });
};

Main.deviceActivity = function (actionType, destinationType, name) {
  var data = JSON.stringify({
    action_type: actionType !=null ? String(actionType) : "",
    destdestination_type: destinationType !=null ? String(destinationType) : "",
    destination: name !=null ? String(name) : "",
  });

  macro.ajax({
    url: apiPrefixUrl + "device-activity",
    type: "POST",
    data: data,
    contentType: "application/json; charset=utf-8",
    headers: {
      Authorization: "Bearer " + (pageDetails && pageDetails.access_token ? pageDetails.access_token : "")
    },
    success: function (data) {
      // No action needed on success
    },
    error: function (err) {
      console.error("Device Activity API error:", err);
    },
    timeout: 60000,
  })
};

/*=====================================================
UPDATE THE DEVICE DETAILS API LOGIC
===================================================== */

Main.getHcapProperty = function (key, callback) {
  if (!window.hcap || !hcap.property || !hcap.property.getProperty) {
    console.warn('[HCAP Property] API not available');
    return callback(null);
  }

  try {
    hcap.property.getProperty({
      key: key,
      onSuccess: function (response) {
        var value = response && response.value ? response.value : null;
        console.log('[HCAP Property] Retrieved:', key, '=', value);
        callback(value);
      },
      onFailure: function (error) {
        console.warn('[HCAP Property] Failed to get:', key, error && error.errorMessage);
        callback(null);
      }
    });
  } catch (ex) {
    console.error('[HCAP Property] Exception:', key, ex);
    callback(null);
  }
};

Main.getAllDeviceProperties = function (callback) {
  var keys = [
    "model_name",
    "tv_name",
    "serial_number",
    "platform_version"
  ];

  var deviceDetails = {};
  var currentIndex = 0;

  function getNextProperty() {
    if (currentIndex >= keys.length) {
      // All properties retrieved
      if (typeof callback === "function") {
        callback(deviceDetails);
      }
      return;
    }

    var key = keys[currentIndex];
    
    Main.getHcapProperty(key, function (value) {
      deviceDetails[key] = value;
      currentIndex++;
      getNextProperty();
    });
  }

  getNextProperty();
};

Main.updateDeviceDetailsSendApi = function () {

  Main.getAllDeviceProperties(function (deviceDetails) {
    var data = JSON.stringify({
      gcm_token: "",
      mac_address: deviceMac || "",
      language_uuid: Main.clickedLanguage || "",
      device_network_ip: deviceIp || "",
      device_name: deviceDetails.tv_name || "",
      device_model: deviceDetails.model_name || "",
      device_serial_number: deviceDetails.serial_number || "",
      os_version: deviceDetails.platform_version || "",
      installed_app_version: { guest_tv: appConfig.appVersion || ""},
      security_patch_level: "",
    })

    if (typeof macro !== "undefined" && macro.ajax) {
      macro.ajax({
        url: apiPrefixUrl + "device-profile",
        type: "PATCH",
        data: data,
        contentType: "application/json; charset=utf-8",
        headers: {
          Authorization: "Bearer " + (pageDetails && pageDetails.access_token ? pageDetails.access_token : "")
        },
        success: function (response) {
          var result = typeof response === "string" ? JSON.parse(response) : response;
          console.log('[Device Details] API Success:', result);
        },
        error: function (err) {
          console.error('[Device Details] API Error:', err);
        },
        timeout: 60000
      })
    }else {
      var xhr = new XMLHttpRequest();
      xhr.open("PATCH", url, true);
      xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
      xhr.setRequestHeader("Authorization", "Bearer " + authToken);
      xhr.timeout = 60000;

      xhr.onload = function () {
        if(xhr.status >= 200 && xhr.status < 300) {
          try {
            var result = JSON.parse(xhr.responseText);
            console.log('[Device Details] XMLHttpRequest Success:', result);
          }catch (ex) {
            console.log('[Device Details] XMLHttpRequest Success (non-JSON response)');
          }
        }else {
          console.error('[Device Details] XMLHttpRequest Error: HTTP Status', xhr.status);
        }
      };

      xhr.onerror = function () {
        console.error('[Device Details] XMLHttpRequest Error: Network error occurred');
      };
      xhr.ontimeout = function () {
        console.error('[Device Details] XMLHttpRequest Error: Request timeout after 60 seconds');
      };
      xhr.send(data);
    }
  })
}

/*=====================================================
LG CHANNEL API FOR SHOW THE CHANNELS DATA
===================================================== */
Main.lgLgChannelIdApi = function (comingfromWatchTvApp) {
  console.log("loading called---");
  Main.ShowLoading();
  macro.ajax({
    url: apiPrefixUrl + "lg-channel",
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result = typeof response === "string" ? JSON.parse(response) : response;

      console.log(result);

      if(result.status === true) {
        Main.lgLgChannelIdDetails = result.result;
        Main.lgLgChannelApiMetaData(comingfromWatchTvApp,result.result);
      }else {
        Main.HideLoading();
      }
    },
    error: function (err) {
      Main.HideLoading();
      console.error("API error for Lg Channel data:", err);
    },
    timeout: 60000,
  })
}

Main.lgLgChannelApiMetaData = function (comingfromWatchTvApp, channelIdDetails) {
  console.log("metadata called----");
  Main.ShowLoading();
  macro.ajax({
    url: apiPrefixUrl + "lg-channel-feed",
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result = typeof response === "string" ? JSON.parse(response) : response;

      if (result.status === true) {
        console.log("metadata result----");
        Main.lgLgChannelMetaDetails = result.result;

        // Set up metadata refresh interval (5 minutes)
        if (Main.lgLgchannelMetaRefreshInterval) {
          clearInterval(Main.lgLgchannelMetaRefreshInterval);
        }
        Main.lgLgchannelMetaRefreshInterval = setInterval(function () {
          Main.lgLgChannelListUpdatingFiveMinutes();
        }, 30 * 60 * 1000);

        if (comingfromWatchTvApp == true) {
          Main.HideLoading();
          Main.addBackData("lgLgLiveTv");
          
          // 🔥 Show empty page with tuning text and overlay
          macro("#mainContent").html('');
          macro("#mainContent").html(Util.lgLgLiveTvEmptyPage(Main.lgLgChannelIdDetails, Main.lgLgChannelMetaDetails));
          macro("#mainContent").show();

          presentPagedetails.view = "lgLgLiveTv";
          view = "lgLgLiveTv";
          document.body.style.background = 'none';
          // document.documentElement.style.backgroundColor = 'transparent';
          // document.body.style.backgroundColor = 'transparent';

          presentPagedetails.lgLgChannelMetaDetails = result.result;
          presentPagedetails.lgLgChannelIdDetails = channelIdDetails;

          // 🔥 START VIDEO PLAYBACK WITH HCAP MEDIA
          if (typeof hcap !== "undefined" && Main.lgLgChannelIdDetails && Main.lgLgChannelIdDetails[0] && Main.lgLgChannelIdDetails[0].ch_media_static_url) {
            
            // Helper: minimal macro replacer
            function buildMediaUrl(templateUrl, values, opts) {
              opts = opts || {};
              var url = templateUrl || '';
              url = url.replace(/\[([A-Z0-9_]+)\]/g, function (_, macro) {
                if (values && Object.prototype.hasOwnProperty.call(values, macro)) {
                  var v = values[macro];
                  if (typeof v === 'undefined' || v === null) return '[' + macro + ']';
                  if (typeof v === 'boolean') v = v ? '1' : '0';
                  return encodeURIComponent(String(v));
                }
                return '[' + macro + ']';
              });
              if (opts.removeEmptyParams) {
                url = url.replace(/([?&][^=]+=)\[.*?\](?=&|$)/g, '');
                url = url.replace(/[&?]+$/g, '');
                url = url.replace(/[?&]+/g, function (m) { return m.indexOf('?') >= 0 ? '?' : '&'; }).replace(/\?&/, '?');
              }
              return url;
            }

            // Helper: guess mime type
            function guessMimeTypeFromUrl(u) {
              try {
                var p = (u || '').split('?')[0].toLowerCase();
                if (p.indexOf('.m3u8', p.length - 5) !== -1) return 'application/x-mpegURL';
                if (p.indexOf('.mp4', p.length - 4) !== -1) return 'video/mp4';
                if (p.indexOf('.ts', p.length - 3) !== -1) return 'video/mp2t';
                if (p.indexOf('.mp3', p.length - 4) !== -1) return 'audio/mpeg';
                return 'application/x-mpegURL';
              } catch (e) { return 'application/x-mpegURL'; }
            }

            // Play final URL via HCAP (no popups)
            function playFinalUrl(finalUrl) {
              if (!finalUrl) {
                console.error('Final URL is empty – aborting playback');
                return;
              }

              var mime = guessMimeTypeFromUrl(finalUrl);

              if (!(window.hcap && hcap.Media && hcap.Media.startUp)) {
                console.error('HCAP media API not available');
                return;
              }

              try {
                hcap.Media.startUp({
                  onSuccess: function () {
                    // cleanup previous media (best-effort)
                    try {
                      if (window._currentHcapMedia) {
                        try {
                          window._currentHcapMedia.stop({ 
                            onSuccess: function () { console.log('Previous media stop: success'); }, 
                            onFailure: function (f) { console.warn('Previous media stop: fail', f); } 
                          });
                        } catch (eStop) { console.warn('Previous media stop threw', eStop); }
                        try {
                          window._currentHcapMedia.destroy({ 
                            onSuccess: function () { console.log('Previous media destroy: success'); }, 
                            onFailure: function (f) { console.warn('Previous media destroy: fail', f); } 
                          });
                        } catch (eDestroy) { console.warn('Previous media destroy threw', eDestroy); }
                        window._currentHcapMedia = null;
                      }
                    } catch (exCleanup) {
                      console.warn('cleanup failed', exCleanup);
                    }

                    // create media
                    try {
                      var media = null;
                      try {
                        media = hcap.Media.createMedia({
                          url: finalUrl,
                          mimeType: mime,
                        });
                      } catch (eCm) {
                        console.error('hcap.Media.createMedia threw', eCm);
                      }

                      if (!media) {
                        console.error('hcap.Media.createMedia returned null for', finalUrl);
                        return;
                      }
                      window._currentHcapMedia = media;
                      console.log('createMedia: success');

                      // play
                      media.play({
                        onSuccess: function () {
                          macro('#lgChannel_tuningText').css('display', 'none');
                          macro('.tv-guide-container').css('display', 'none');
                          console.log('media.play success', finalUrl);
                        },
                        onFailure: function (f) {
                          console.error('media.play failed:', f && f.errorMessage ? f.errorMessage : f);
                          try { 
                            media.destroy({ 
                              onSuccess: function () { 
                                window._currentHcapMedia = null; 
                                console.log('destroy after play failure: success'); 
                              }, 
                              onFailure: function () { 
                                window._currentHcapMedia = null; 
                                console.warn('destroy after play failure: fail'); 
                              } 
                            }); 
                          } catch (e) {}
                        }
                      });
                    } catch (eCreate) {
                      console.error('Exception creating/playing media', eCreate);
                      try { if (media && media.destroy) media.destroy({}); } catch (e) {}
                    }
                  },
                  onFailure: function (f) {
                    console.error('hcap.Media.startUp failed', f);
                  }
                });
              } catch (ex) {
                console.error('playFinalUrl exception', ex);
              }
            }

            // Best-effort gather HCAP properties and expand macros
            function gatherPropsAndPlay(urlTemplate) {
              var values = {};
              values.DEVICE_ID = '';
              values.DEVICE_MODEL = '';
              values.COUNTRY = '';
              values.APP_NAME = (typeof window.APP_NAME !== 'undefined') ? window.APP_NAME : (presentPagedetails && presentPagedetails.appName ? presentPagedetails.appName : 'MyApp');
              values.APP_VERSION = (typeof window.APP_VERSION !== 'undefined') ? window.APP_VERSION : '1.0.0';
              values.NONCE = (Math.random().toString(36).substr(2, 9));

              if (window.hcap && hcap.property && hcap.property.getProperty) {
                try {
                  hcap.property.getProperty({
                    key: 'serial_number',
                    onSuccess: function (resp) {
                      try { values.DEVICE_ID = resp && resp.value ? resp.value : values.DEVICE_ID; } catch (e) {}
                      try {
                        hcap.property.getProperty({
                          key: 'model_name',
                          onSuccess: function (r2) {
                            try { values.DEVICE_MODEL = r2 && r2.value ? r2.value : values.DEVICE_MODEL; } catch (e) {}
                            var final = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
                            console.log('Final URL ready', final);
                            playFinalUrl(final);
                          },
                          onFailure: function () {
                            var final2 = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
                            console.log('Final URL (without model_name)', final2);
                            playFinalUrl(final2);
                          }
                        });
                      } catch (err2) {
                        var final3 = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
                        playFinalUrl(final3);
                      }
                    },
                    onFailure: function (f) {
                      try {
                        hcap.property.getProperty({
                          key: 'model_name',
                          onSuccess: function (r2) {
                            try { values.DEVICE_MODEL = r2 && r2.value ? r2.value : values.DEVICE_MODEL; } catch (e) {}
                            var f = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
                            playFinalUrl(f);
                          },
                          onFailure: function () {
                            var f2 = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
                            playFinalUrl(f2);
                          }
                        });
                      } catch (err) {
                        var ff = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
                        playFinalUrl(ff);
                      }
                    }
                  });
                } catch (e) {
                  var fallback = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
                  playFinalUrl(fallback);
                }
              } else {
                var noProp = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
                playFinalUrl(noProp);
              }
            }

            // Begin macro expansion and play
            gatherPropsAndPlay(Main.lgLgChannelIdDetails[0].ch_media_static_url);
          }
          

          // 🔥 Hide tuning text after 3 seconds with fade effect
          setTimeout(function () {
            var tuningText = document.getElementById("lgChannel_tuningText");
            if (tuningText) {
              tuningText.style.opacity = '0';
              setTimeout(function () {
                tuningText.style.display = 'none';
              }, 500); // Wait for fade animation to complete
            }
          }, 3000);

          // 🔥 Hide overlay after 10 seconds with slide animation
          setTimeout(function () {
            macro(".lg-tv-overlay").animate(
              { bottom: "-300px" },
              800,
              function () {
                macro(".lg-tv-overlay").css('display', 'none');
                macro(".lg-tv-overlay").css('bottom', '44px');
              }
            );
          }, 10000);
        }
      }
      Main.HideLoading();
    },
    error: function (err) {
      Main.HideLoading();
      console.error("API error For Lg channel Metadata:", err);
    },
    timeout: 60000,
  });
};
 
Main.lgLgChannelListUpdatingFiveMinutes = function () {
  macro.ajax({
    url: apiPrefixUrl + "lg-channel-feed",
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result = typeof response === "string" ? JSON.parse(response) : response;

      if(result.status === true) {
        presentPagedetails.lgLgChannelMetaDetails = result.result;
      }
    },
    error: function (err) {
      Main.HideLoading();
      console.log("API error For Lg channel Refresh Metadata:", err);
    }
  })
}

/*=====================================================
LIVE TV CHANNEL API FOR SHOW THE CHANNELS DATA
===================================================== */
Main.liveTvChannelIdApi = function (comingfromWatchTvApp) {
  Main.ShowLoading();
  macro.ajax({
    url: apiPrefixUrl + "channel?ch.language_uuid=" + Main.clickedLanguage,
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result = typeof response === "string" ? JSON.parse(response) : response;
      console.log("result----------------->", result);

      if(result.status === true) {
        Main.liveTvChannelIdDetails = result.result;
        Main.liveTvChannelApiMetaData(comingfromWatchTvApp,result.result);
      }else {
        Main.HideLoading();
      }
    },
    error: function (err) {
      Main.HideLoading();
      console.error("API error for Live Tv Channel data:", err);
    },
    timeout: 60000,
  })
}

Main.liveTvChannelApiMetaData = function (comingfromWatchTvApp, channelIdDetails) {
  Main.ShowLoading();
  macro.ajax({
    url: apiPrefixUrl + "channel-feed?ch.language_uuid="+ Main.clickedLanguage,
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result = typeof response === "string" ? JSON.parse(response) : response;



      // if(result.status === true) {
        Main.liveTvChannelMetaDetails = result.result;

        // Set up metadata refresh interval (5 minutes)
        if(Main.channelMetaRefreshInterval) {
          clearInterval(Main.channelMetaRefreshInterval);
        }
        Main.channelMetaRefreshInterval = setInterval(function () {
          Main.channelListUpdatingFiveMinutes();
        }, 30 * 60 * 1000);

        if (comingfromWatchTvApp == true) {
          Main.HideLoading();
          Main.addBackData("liveTvPlayer");

          // 🔥 Show empty page with tuning text and overlay
          macro("#mainContent").html('');
          macro("#mainContent").html(Util.liveTvEmptyPage(Main.liveTvChannelIdDetails, Main.liveTvChannelMetaDetails));
          macro("#mainContent").show();

          presentPagedetails.view = "liveTvPlayer";
          view = "liveTvPlayer";
          document.body.style.background = 'none';
          // document.documentElement.style.backgroundColor = 'transparent';
          // document.body.style.backgroundColor = 'transparent';

          presentPagedetails.liveTvChannelMetaDetails = result.result;
          presentPagedetails.liveTvChannelIdDetails = channelIdDetails;

          if( Main.liveTvChannelIdDetails && Main.liveTvChannelIdDetails[0] && Main.liveTvChannelIdDetails[0].lg_ch_url) {
            var chUrl = Main.liveTvChannelIdDetails[0].lg_ch_url;

            // Check if it's a UDP IP channel (e.g., "udp://239.74.48.14:8013")
            if(/^udp:\/\/\d{1,3}(\.\d{1,3}){3}:\d+$/.test(chUrl)) {
              var urlWithoutPrefix = chUrl.replace("udp://", ""); // "239.74.48.14:8013"
              var parts = urlWithoutPrefix.split(":");
              var ip = parts[0];
              var port = parseInt(parts[1]);

              hcap.channel.requestChangeCurrentChannel({
                channelType: hcap.channel.ChannelType.IP,
                ip: ip,
                port: port,
                ipBroadcastType: hcap.channel.IpBroadcastType.UDP,
                onSuccess: function () {
                  macro('.live-tv-guide-container').css('display', 'none');
                  console.log('[Live TV] Successfully switched to channel');
                },
                onFailure: function (error) {
                  console.error("Failed to change channel via HCAP:", error);
                }
              })
            }

            // 🆕 Check if it's an RF channel with majorNumber-minorNumber format (e.g., "7-7")
            else if(/^\d+-\d+$/.test(chUrl)) {
              var channelParts = chUrl.split("-");
              var majorNumber = parseInt(channelParts[0]);
              var minorNumber = parseInt(channelParts[1]);

              console.log('[Live TV] Detected RF channel class 3 format:', chUrl);
              console.log('[Live TV] Major Number:', majorNumber, 'Minor Number:', minorNumber);

              hcap.channel.requestChangeCurrentChannel({
                channelType: hcap.channel.ChannelType.RF,
                majorNumber: majorNumber,
                minorNumber: minorNumber,
                rfBroadcastType: hcap.channel.RfBroadcastType.CABLE,
                onSuccess: function () {
                  macro('.live-tv-guide-container').css('display', 'none');
                  console.log('[Live TV] Successfully switched to RF channel:', majorNumber + '-' + minorNumber);
                },
                onFailure: function (error) {
                  console.error("[Live TV] Failed to change RF channel via HCAP:", error);
                }
              })
            }

            // 🆕 Check if it's a logical channel number (e.g., "10", "4")
            else if(/^\d+$/.test(chUrl)) {
              var logicalNumber = parseInt(chUrl);

              console.log('[Live TV] Detected RF channel class 1 format (logical number):', chUrl);
              console.log('[Live TV] Logical Channel Number:', logicalNumber);

              hcap.channel.requestChangeCurrentChannel({
                channelType: hcap.channel.ChannelType.RF,
                logicalNumber: logicalNumber,
                rfBroadcastType: hcap.channel.RfBroadcastType.CABLE,
                onSuccess: function () {
                  macro('.live-tv-guide-container').css('display', 'none');
                  console.log('[Live TV] Successfully switched to logical channel:', logicalNumber);
                },
                onFailure: function (error) {
                  console.error("[Live TV] Failed to change logical channel via HCAP:", error);
                }
              })
            }

            else {
              Navigation.playSelectedChannel(chUrl)
            }
            
          }

          // 🔥 Hide tuning text after 3 seconds with fade effect
          setTimeout(function () {
            var tuningText = document.getElementById("liveChannel_tuningText");
            if(tuningText) {
              tuningText.style.opacity = '0';
              setTimeout(function () {
                tuningText.style.display = 'none';
              }, 500); // Wait for fade animation to complete
            }
          }, 3000);

          // 🔥 Hide overlay after 10 seconds with slide animation
          setTimeout(function () {
            macro(".live-tv-overlay").animate(
              { bottom: "-300px" },
              800,
              function () {
                macro(".live-tv-overlay").css('display', 'none');
                macro(".live-tv-overlay").css('bottom', '44px');
              }
            );
          }, 10000);
        }
      // }
      Main.HideLoading();
    },
    error: function (err) {
      Main.HideLoading();
      console.error("API error For Live Tv channel Metadata:", err);
    },
    timeout: 60000
  });
};

Main.channelListUpdatingFiveMinutes = function () {
  macro.ajax({
    url: apiPrefixUrl + "channel-feed?ch.language_uuid="+ Main.clickedLanguage,
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result = typeof response === "string" ? JSON.parse(response) : response;

      if(result.status === true) {
        presentPagedetails.liveTvChannelMetaDetails = result.result;
      }
    },
    error: function (err) {
      Main.HideLoading();
      console.log("API error For Live Tv channel Refresh Metadata:", err);
    }
  })
}

/**
 * Select the initial home background image URL.
 * Prefers cached home backgrounds; falls back to other available options.
 */
Main.getInitialHomeBackgroundUrl = function () {
  if (Main._cachedHomeBackgroundUrls && Main._cachedHomeBackgroundUrls.length > 0) {
    return Main._cachedHomeBackgroundUrls[0];
  }

  return (
    Main.cachedHomeFirstBg || 
    Main.cachedBgBlobUrl ||
    (Main.templateApiData &&
      Main.templateApiData.home_screen_bg &&
      Main.templateApiData.home_screen_bg[0]) ||
    (Main.templateApiData &&
      Main.templateApiData.menu_screen_bg &&
      Main.templateApiData.menu_screen_bg[0]) ||
    "/images/background_img.png"
  );
};
