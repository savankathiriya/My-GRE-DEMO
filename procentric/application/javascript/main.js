var pageDetails = {};
var guestName = "";
var backData = [];
var Main = {
  deviceProfile: "",
};
// Stack for dynamic-page navigation within the ourHotel canvas view.
// Each entry: { uuid: <string>, jsonTemplateData: <object> }
// Pushed before navigating TO a dynamic page; popped when EXIT is pressed.
Main.pageHistory = [];
Main.cachedBgBlobUrl = null;
var disableNavigation = false;
// Screen-saver state is managed entirely by canvas-screensaver.js (ScreenSaver module).
// Main.js only delegates to it — no inline state kept here.

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
  // SCREEN SAVER: delegate to ScreenSaver module.
  // handleKeyPress() returns true if the key was consumed (saver was active).
  // =================================================
  try {
    if (typeof ScreenSaver !== 'undefined' && ScreenSaver.handleKeyPress()) {
      try { evt.preventDefault && evt.preventDefault(); } catch (_) {}
      return;
    }
  } catch (e) { console.warn('ScreenSaver.handleKeyPress error:', e); }

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
      case "playlist":
        return Navigation.playlistPageNavigation(evt);
    }
  } catch (ex) {
    console.error("processTrigger error", ex);
  }
};

//storing the back Data
Main.addBackData = function (path) {
  presentPagedetails.htmlData = (macro('#mainContent').html() ).toString();

  if(path == "MyDevice" || path == "liveTv" || path == "casting" || path == "lgLgLiveTv" || path == "liveTvPlayer" || path == "ourHotel" || path == "playlist") {
    backData.push(presentPagedetails);
    presentPagedetails = {}
  }
}

Main.previousPage = function () {
  // When truly leaving the ourHotel canvas view, the canvas page-history
  // stack is no longer valid — clear it so stale entries never interfere.
  Main.pageHistory = [];

  if(backData.length > 0) {
    presentPagedetails = backData[backData.length-1];
    macro("#mainContent").html('');
    macro("#mainContent").html(presentPagedetails.htmlData);
    backData.pop();
    view = presentPagedetails.view;

    // Re-arm screen saver idle timer when returning to home or language page,
    // clear it when navigating to any other page.
    try {
      if (typeof ScreenSaver !== 'undefined') {
        if (view === 'macroHome' || view === 'languagePage') {
          ScreenSaver.armIdleTimer();
        } else {
          ScreenSaver.clearIdleTimer();
        }
      }
    } catch (e) {}
  }
};

/**
 * Main.navigateBackCanvas()
 *
 * Called by Navigation.ourHotelPageNavigation when EXIT is pressed.
 *
 * Logic:
 *   1. If Main.pageHistory has entries  → pop the last canvas page,
 *      restore Main.jsonTemplateData and re-render Util.ourHotelPage().
 *      The user stays inside the "ourHotel" view.
 *   2. If Main.pageHistory is empty     → call Main.previousPage() to
 *      leave the ourHotel view entirely and return to the caller view.
 *
 * The caller (navigation.js) is responsible for running canvas/video
 * cleanup BEFORE calling this function.
 */
Main.navigateBackCanvas = function () {
  if (Array.isArray(Main.pageHistory) && Main.pageHistory.length > 0) {
    var prevEntry = Main.pageHistory.pop();
    console.log('[Main] navigateBackCanvas: restoring page uuid:', prevEntry.uuid,
                '| remaining history depth:', Main.pageHistory.length);

    // Restore the template data for the previous canvas page
    Main.jsonTemplateData = prevEntry.jsonTemplateData;

    // Render the previous canvas page behind the loading overlay.
    // Pass onReady so the loader hides only after the canvas is painted.
    if (typeof Util !== 'undefined' && Util.ourHotelPage) {
      macro("#mainContent").html('');
      var _backOnReady = function() {
        if (typeof Main.HideLoading === 'function') Main.HideLoading();
      };
      macro("#mainContent").html(Util.ourHotelPage(_backOnReady));
      macro("#mainContent").show();
    }

  } else {
    // No canvas page history left — exit the ourHotel view entirely
    console.log('[Main] navigateBackCanvas: history empty, calling previousPage()');
    Main.previousPage();
  }
};

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

/**
 * Main.restoreFromCacheAndOpenApp()
 *
 * Called when provision-auth fails (network down or server error) and
 * cached API data exists in localStorage.  Restores all four data blobs
 * into their runtime variables, restores liveTv channel details if cached,
 * rehydrates all images from IndexedDB (bg, logo, language icons) so they
 * display correctly offline, then opens the language selection page.
 *
 * Returns true synchronously to signal "we are handling this offline" —
 * the actual page render happens asynchronously after images load from IDB.
 */
Main.restoreFromCacheAndOpenApp = function () {
  console.log('[Offline] provision-auth failed — attempting to restore from localStorage cache');

  try {
    var cachedWeather    = localStorage.getItem('cachedWeatherDetails');
    var cachedHome       = localStorage.getItem('cachedHomePageData');
    var cachedProfile    = localStorage.getItem('cachedDeviceProfile');
    var cachedTemplate   = localStorage.getItem('cachedTemplateApiData');
    var cachedChMeta     = localStorage.getItem('liveTvChannelMetaDetails');
    var cachedChId       = localStorage.getItem('liveTvChannelIdDetails');

    if (!cachedTemplate) {
      console.warn('[Offline] No cached templateApiData — cannot open app offline');
      return false;
    }

    // ── Restore runtime data variables ───────────────────────────────────
    if (cachedWeather)  { try { Main.weatherDetails  = JSON.parse(cachedWeather);  } catch(e) { console.warn('[Offline] weatherDetails parse error:', e); } }
    if (cachedHome)     { try { Main.homePageData     = JSON.parse(cachedHome);     } catch(e) { console.warn('[Offline] homePageData parse error:', e); } }
    if (cachedProfile)  { try { Main.deviceProfile    = JSON.parse(cachedProfile);  } catch(e) { console.warn('[Offline] deviceProfile parse error:', e); } }
    if (cachedTemplate) { try { Main.templateApiData  = JSON.parse(cachedTemplate); } catch(e) { console.warn('[Offline] templateApiData parse error:', e); } }

    // ── Restore liveTv channel details ───────────────────────────────────
    if (cachedChMeta) {
      try {
        presentPagedetails.liveTvChannelMetaDetails = JSON.parse(cachedChMeta);
        Main.liveTvChannelMetaDetails = presentPagedetails.liveTvChannelMetaDetails;
        console.log('[Offline] liveTvChannelMetaDetails restored from cache');
      } catch(e) { console.warn('[Offline] liveTvChannelMetaDetails parse error:', e); }
    }
    if (cachedChId) {
      try {
        presentPagedetails.liveTvChannelIdDetails = JSON.parse(cachedChId);
        Main.liveTvChannelIdDetails = presentPagedetails.liveTvChannelIdDetails;
        console.log('[Offline] liveTvChannelIdDetails restored from cache');
      } catch(e) { console.warn('[Offline] liveTvChannelIdDetails parse error:', e); }
    }

    if (!Main.templateApiData || !Main.templateApiData.language_detail) {
      console.warn('[Offline] Cached templateApiData has no language_detail — cannot open language page');
      return false;
    }

    console.log('[Offline] Data restored — rehydrating images from IndexedDB before render');

    // Mark that we are running in offline/cached mode so navigation.js
    // can skip network calls (e.g. getHomeData) and use IDB-only image loading.
    Main._restoredFromCache = true;

    // ── Render language page once all images are loaded from IndexedDB ───
    // Mirrors Main.loadCachedImagesThenRender() but reads from IDB only
    // (no network fetches since we are offline).
    var _renderOfflineLangPage = function () {
      Main.HideLoading();
      view = "languagePage";
      presentPagedetails.view = view;
      macro("#mainContent").html('');
      macro("#mainContent").html(Util.languageSelection());
      macro("#mainContent").show();
      macro('.imageFocus').removeClass('imageFocus');
      macro('#lang_btn-0').addClass('imageFocus');
      console.log('[Offline] Language selection page rendered from cache');
    };

    // Step 3 — load language icon blobs from IDB
    var _loadOfflineLangIcons = function (onDone) {
      var langItems = [];
      if (Main.templateApiData && Main.templateApiData.language_detail) {
        for (var i = 0; i < Main.templateApiData.language_detail.length; i++) {
          var lang = Main.templateApiData.language_detail[i];
          if (lang.icon && lang.language_uuid) {
            langItems.push({ uuid: lang.language_uuid, url: lang.icon });
          }
        }
      }

      if (!langItems.length) { return onDone(); }

      Main.cachedLanguageIcons = Main.cachedLanguageIcons || {};
      var total = langItems.length, done = 0;
      var checkDone = function () { if (++done >= total) onDone(); };

      langItems.forEach(function (item) {
        var key = 'langIcon_' + item.uuid;

        // Already in memory — skip IDB lookup
        if (Main.cachedLanguageIcons[key]) { return checkDone(); }

        if (!Main.db) { return checkDone(); }

        try {
          var tx = Main.db.transaction(['images'], 'readonly');
          var store = tx.objectStore('images');
          var req = store.get(key);

          req.onsuccess = function (e) {
            var blob = e.target.result;
            if (blob) {
              try {
                Main.cachedLanguageIcons[key] = URL.createObjectURL(blob);
                console.log('[Offline] Lang icon loaded from IDB:', key);
              } catch (ex) {
                console.warn('[Offline] createObjectURL failed for', key, ex);
              }
            } else {
              // Blob not in IDB — leave icon URL as the raw API URL (may be broken offline but graceful)
              console.warn('[Offline] Lang icon not found in IDB:', key);
            }
            checkDone();
          };

          req.onerror = function () { checkDone(); };
        } catch (ex) {
          console.warn('[Offline] IDB transaction error for lang icon', key, ex);
          checkDone();
        }
      });
    };

    // Step 2 — load property logo blob from IDB
    var _loadOfflineLogo = function (onDone) {
      if (Main.cachedPropertyLogo) { return onDone(); }
      if (!Main.db) { return onDone(); }

      try {
        var tx = Main.db.transaction(['images'], 'readonly');
        var store = tx.objectStore('images');
        var req = store.get('logoImage');

        req.onsuccess = function (e) {
          var blob = e.target.result;
          if (blob) {
            try {
              Main.cachedPropertyLogo = URL.createObjectURL(blob);
              console.log('[Offline] Logo loaded from IDB');
            } catch (ex) { console.warn('[Offline] Logo createObjectURL failed', ex); }
          } else {
            console.warn('[Offline] Logo not found in IDB');
          }
          onDone();
        };

        req.onerror = function () { onDone(); };
      } catch (ex) {
        console.warn('[Offline] IDB transaction error for logo', ex);
        onDone();
      }
    };

    // Step 1 — load background blob from IDB, then chain logo → icons → render
    var _loadOfflineBg = function () {
      if (Main.cachedBgBlobUrl) {
        return _loadOfflineLogo(function () {
          _loadOfflineLangIcons(_renderOfflineLangPage);
        });
      }

      if (!Main.db) {
        return _loadOfflineLogo(function () {
          _loadOfflineLangIcons(_renderOfflineLangPage);
        });
      }

      try {
        var tx = Main.db.transaction(['images'], 'readonly');
        var store = tx.objectStore('images');
        var req = store.get('bgImage');

        req.onsuccess = function (e) {
          var blob = e.target.result;
          if (blob) {
            try {
              Main.cachedBgBlobUrl = URL.createObjectURL(blob);
              console.log('[Offline] Background loaded from IDB');
            } catch (ex) { console.warn('[Offline] BG createObjectURL failed', ex); }
          } else {
            console.warn('[Offline] Background not found in IDB');
          }
          _loadOfflineLogo(function () {
            _loadOfflineLangIcons(_renderOfflineLangPage);
          });
        };

        req.onerror = function () {
          _loadOfflineLogo(function () {
            _loadOfflineLangIcons(_renderOfflineLangPage);
          });
        };
      } catch (ex) {
        console.warn('[Offline] IDB transaction error for bg', ex);
        _loadOfflineLogo(function () {
          _loadOfflineLangIcons(_renderOfflineLangPage);
        });
      }
    };

    // Kick off the image-loading chain, ensuring IDB is open first
    Main.dbInit(function () {
      _loadOfflineBg();
    });

    return true; // signal to caller: offline mode is handling this

  } catch (ex) {
    console.error('[Offline] restoreFromCacheAndOpenApp unexpected error:', ex);
    return false;
  }
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

          Main.lgSetting();

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
        // provision-auth returned but with no result payload — try offline cache first
        // if (Main.restoreFromCacheAndOpenApp()) {
        //   console.log('[Offline] App opened from cache after provision-auth returned no result');
        //   return;
        // }

        macro("#mainContent").html("");
        macro("#mainContent").html(Util.activationHtml(deviceSerialNumber));

        // Clear old QR code and generate new one
        macro("#qrImage").html("");
        Main.generateQrCode("qrImage", deviceSerialNumber);

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
      console.error("Provision API error:", err);

      // Network/server error — try to restore from localStorage cache and open app
      if (Main.restoreFromCacheAndOpenApp()) {
        console.log('[Offline] App opened from cache after provision-auth network error');
        return;
      }

      // No cache available — show activation screen and retry
      macro("#mainContent").html("");
      macro("#mainContent").html(Util.activationHtml(deviceSerialNumber));

      // Clear old QR code and generate new one
      macro("#qrImage").html("");
      Main.generateQrCode("qrImage", deviceSerialNumber);

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
        guestName = result.result.g_name ? result.result.g_name : null;
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

Main.guestInfoAfterInterval = function () {
  var interval =
    Main.deviceProfile &&
    Main.deviceProfile.property_detail &&
    Main.deviceProfile.property_detail.registration_refresh_interval
      ? Main.deviceProfile.property_detail.registration_refresh_interval
      : null;

  if (!interval) {
    console.warn("[GuestInfo Interval] registration_refresh_interval not found in deviceProfile. Skipping interval.");
    return;
  }

  console.log("[GuestInfo Interval] Starting guest-info polling every " + interval + "s");

  setInterval(function () {

    macro.ajax({
      url: apiPrefixUrl + "guest-info",
      type: "GET",
      headers: {
        Authorization: "Bearer " + pageDetails.access_token,
      },
      success: function (response) {
        var result = typeof response === "string" ? JSON.parse(response) : response;
        console.log("[GuestInfo Interval] Response:", result.result);

        Main.guestInfoData = result.result;
        guestName = result.result.g_name ? result.result.g_name : null;

        var tvCmd = result.result.tv_cmd;
        var hasCommand = 
          (typeof tvCmd === "string" && tvCmd.trim() !== "") ||
          (Array.isArray(tvCmd) && tvCmd.length > 0);

        if(hasCommand && window.hcap && hcap.power && hcap.power.reboot) {
          hcap.power.reboot({
            onSuccess: function () {
              console.log("[GuestInfo Interval] Reboot command executed successfully.");
            },
            onFailure: function (f) {
              console.warn("Reboot failed:", f && f.errorMessage);
            }
          })
        }
      },
      error: function (err) {
        console.error("[GuestInfo Interval] Error:", err);
      },
      timeout: 60000,
    });
  }, interval * 1000);
};

/**
 * Main.screenSaverInterval()
 *
 * Called ONCE from Main.deviceProfileApi() after Main.guestInfoAfterInterval().
 *
 * Fetch sequence (all done once, stored in Main.screenSaverData):
 *
 *   Step 1: GET /screen-saver
 *           Filter is_active=true, sort by priority_order ascending.
 *           Store raw entries in Main.screenSaverData.entries[].
 *
 *   Step 2: For EVERY entry (by destination_url)
 *           GET /json-play-list?play_list_uuid=<destination_url>
 *           Store result in entry.playlistData.
 *
 *   Step 3: For EVERY slide inside EVERY playlist
 *           GET /json-template?template_uuid=<template_uuid>
 *           Store result in Main.screenSaverData.allTemplates[template_uuid]
 *           AND in entry.templates[template_uuid]
 *
 * After all fetching is done, Main.screenSaverData.ready = true and
 * ScreenSaver.armIdleTimer() is called so the idle timer starts.
 *
 * Main.screenSaverData shape:
 * {
 *   ready: false,                         // true once ALL data is fetched
 *   entries: [                            // sorted by priority_order asc
 *     {
 *       ...screenSaverEntry,              // original API fields
 *       playlistData: { play_list_json: [...], name, ... },
 *       templates:    { <template_uuid>: <templateResult>, ... }
 *     },
 *     ...
 *   ],
 *   allTemplates: { <template_uuid>: <templateResult>, ... }  // flat across all
 * }
 */
Main.screenSaverInterval = function () {

  // Already fetched — just re-arm the timer
  if (Main.screenSaverData && Main.screenSaverData.ready) {
    console.log('[ScreenSaverInit] Data already cached — re-arming idle timer');
    try { if (typeof ScreenSaver !== 'undefined') ScreenSaver.armIdleTimer(); } catch(e) {}
    return;
  }

  console.log('[ScreenSaverInit] Step 1 — fetching /screen-saver …');

  macro.ajax({
    url: apiPrefixUrl + 'screen-saver',
    type: 'GET',
    headers: { Authorization: 'Bearer ' + pageDetails.access_token },
    success: function (response) {
      try {
        var result = typeof response === 'string' ? JSON.parse(response) : response;

        if (!(result && result.status === true &&
              Array.isArray(result.result) && result.result.length)) {
          console.warn('[ScreenSaverInit] API returned no data — screen saver disabled');
          return;
        }

        // Filter active, sort by priority_order ascending
        var active = result.result.filter(function (item) {
          return item && item.is_active === true;
        });
        active.sort(function (a, b) {
          return (a.priority_order || 0) - (b.priority_order || 0);
        });

        if (!active.length) {
          console.warn('[ScreenSaverInit] No active screen-saver entries');
          return;
        }

        // Initialise Main.screenSaverData
        Main.screenSaverData = {
          ready:        false,
          entries:      active.map(function (e) {
            return {
              screen_saver_uuid: e.screen_saver_uuid,
              name:              e.name,
              destination_url:   e.destination_url,
              priority_order:    e.priority_order,
              screen_time:       e.screen_time,
              is_active:         e.is_active,
              playlistData:      null,   // filled in Step 2
              templates:         {}      // filled in Step 3
            };
          }),
          allTemplates: {}               // flat map filled in Step 3
        };

        console.log('[ScreenSaverInit] ' + active.length + ' active entries:');
        active.forEach(function (e, i) {
          console.log('[ScreenSaverInit]   [' + i + '] priority=' + e.priority_order +
                      ' name=' + e.name + ' uuid=' + e.destination_url);
        });

        // Step 2 & 3 — fetch playlists then templates, one entry at a time (sequential)
        _fetchAllEntriesSequential(0);

      } catch (ex) {
        console.error('[ScreenSaverInit] Parse error:', ex);
      }
    },
    error: function (err) {
      console.error('[ScreenSaverInit] /screen-saver API error:', err);
    },
    timeout: 60000
  });

  // ── Step 2: fetch /json-play-list for entry at index i ──────────────
  function _fetchPlaylistForEntry(entryIdx, onDone) {
    var entry = Main.screenSaverData.entries[entryIdx];
    var uuid  = entry && entry.destination_url;

    if (!uuid) {
      console.warn('[ScreenSaverInit] Entry ' + entryIdx + ' has no destination_url — skipping');
      return onDone();
    }

    console.log('[ScreenSaverInit] Step 2 — fetching playlist for entry[' + entryIdx +
                '] uuid=' + uuid);

    macro.ajax({
      url: apiPrefixUrl + 'json-play-list?play_list_uuid=' + uuid,
      type: 'GET',
      headers: { Authorization: 'Bearer ' + pageDetails.access_token },
      success: function (res) {
        try {
          var r = typeof res === 'string' ? JSON.parse(res) : res;
          if (r && r.status === true && r.result) {

            // ── UNWRAP: the API may return result as an Array (same as
            //    PlaylistPlayer.start does).  We need the object that has
            //    play_list_json, not the outer array wrapper.
            var raw = r.result;
            var obj = null;

            if (Array.isArray(raw)) {
              // Pick the first active item — mirrors PlaylistPlayer.start()
              for (var ai = 0; ai < raw.length; ai++) {
                if (raw[ai] && raw[ai].is_active !== false) {
                  obj = raw[ai];
                  break;
                }
              }
              if (!obj && raw.length) obj = raw[0]; // fallback: first item
            } else if (raw && raw.play_list_json) {
              obj = raw;
            }

            if (!obj || !Array.isArray(obj.play_list_json)) {
              console.warn('[ScreenSaverInit] Playlist result has no play_list_json for uuid: ' + uuid +
                           ' | raw type: ' + (Array.isArray(raw) ? 'Array[' + raw.length + ']' : typeof raw));
              return onDone();
            }

            entry.playlistData = obj;
            console.log('[ScreenSaverInit] Playlist cached: "' + (obj.name || '') +
                        '" slides=' + obj.play_list_json.length);

            // Step 3: fetch all templates for this playlist's slides
            _fetchTemplatesForEntry(entryIdx, onDone);

          } else {
            console.warn('[ScreenSaverInit] Playlist API no result for uuid: ' + uuid);
            onDone();
          }
        } catch (e) {
          console.error('[ScreenSaverInit] Playlist parse error:', e);
          onDone();
        }
      },
      error: function () {
        console.warn('[ScreenSaverInit] Playlist fetch failed for uuid: ' + uuid);
        onDone();
      },
      timeout: 30000
    });
  }

  function _fetchTemplatesForEntry(entryIdx, onDone) {
    var entry  = Main.screenSaverData.entries[entryIdx];
    var slides = (entry.playlistData && entry.playlistData.play_list_json) || [];

    if (!slides.length) {
      console.warn('[ScreenSaverInit] Entry[' + entryIdx + '] has 0 slides — nothing to template-fetch');
      return onDone();
    }

    var remaining = slides.length;
    console.log('[ScreenSaverInit] Step 3 — fetching ' + slides.length +
                ' templates for entry[' + entryIdx + '] "' + (entry.name || '') + '"');

    slides.forEach(function (slide, si) {
      var tUuid = slide && slide.template_uuid;
      console.log('[ScreenSaverInit]   slide[' + si + '] template_uuid=' + tUuid);

      if (!tUuid) {
        console.warn('[ScreenSaverInit]   slide[' + si + '] has no template_uuid — skipping');
        if (--remaining === 0) onDone();
        return;
      }

      // Already fetched by a previous entry — reuse without another network call
      if (Main.screenSaverData.allTemplates[tUuid]) {
        entry.templates[tUuid] = Main.screenSaverData.allTemplates[tUuid];
        console.log('[ScreenSaverInit]   Template reused (already cached): ' + tUuid);
        if (--remaining === 0) onDone();
        return;
      }

      macro.ajax({
        url: apiPrefixUrl + 'json-template?template_uuid=' + tUuid,
        type: 'GET',
        headers: { Authorization: 'Bearer ' + pageDetails.access_token },
        success: function (res) {
          try {
            var r = typeof res === 'string' ? JSON.parse(res) : res;
            if (r && r.status === true && r.result) {
              entry.templates[tUuid]                   = r.result;
              Main.screenSaverData.allTemplates[tUuid] = r.result;
              console.log('[ScreenSaverInit]   ✅ Template cached: ' + tUuid);
            } else {
              console.warn('[ScreenSaverInit]   Template API no result for: ' + tUuid);
            }
          } catch (e) {
            console.error('[ScreenSaverInit]   Template parse error for ' + tUuid + ':', e);
          }
          if (--remaining === 0) onDone();
        },
        error: function () {
          console.warn('[ScreenSaverInit]   Template fetch failed: ' + tUuid);
          if (--remaining === 0) onDone();
        },
        timeout: 30000
      });
    });
  }

  // ── Drive steps 2+3 sequentially across all entries ─────────────────
  function _fetchAllEntriesSequential(idx) {
    if (idx >= Main.screenSaverData.entries.length) {
      // All done
      Main.screenSaverData.ready = true;
      console.log('[ScreenSaverInit] ✅ All data fetched and cached in Main.screenSaverData');
      console.log('[ScreenSaverInit]    Entries: ' + Main.screenSaverData.entries.length);
      console.log('[ScreenSaverInit]    Total templates: ' +
                  Object.keys(Main.screenSaverData.allTemplates).length);
      // Arm the idle timer now that all data is ready
      try { if (typeof ScreenSaver !== 'undefined') ScreenSaver.armIdleTimer(); } catch(e) {}
      return;
    }
    _fetchPlaylistForEntry(idx, function () {
      _fetchAllEntriesSequential(idx + 1);
    });
  }

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
				// Persist template data for offline fallback
				try { localStorage.setItem('cachedTemplateApiData', JSON.stringify(Main.templateApiData)); } catch(ex) { console.warn('[Cache] Failed to save templateApiData:', ex); }
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

        // Re-arm screen saver idle timer each time language page is shown
        try { if (typeof ScreenSaver !== 'undefined') ScreenSaver.armIdleTimer(); } catch (e) {}
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
Main.renderHomePage = function (applist) {
  view = "macroHome";
  presentPagedetails.view = view;
  macro("#mainContent").html("");
  macro("#mainContent").html(Util.homePageHtml());

  Main.ShowLoading();
  Navigation.homePageLoad(applist)

  setTimeout(function () {
    Main.HideLoading();
  }, 1200)
  
  macro("#mainContent").show();
  // Set focus to first app
  macro(".imageFocus").removeClass("imageFocus");
  macro("#menu-item-0").addClass("imageFocus");

  Main.updateDeviceDetailsSendApi();

  // Re-arm screen saver idle timer each time home page is shown
  try { if (typeof ScreenSaver !== 'undefined') ScreenSaver.armIdleTimer(); } catch (e) {}
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
				// Persist device profile for offline fallback
				try { localStorage.setItem('cachedDeviceProfile', JSON.stringify(Main.deviceProfile)); } catch(ex) { console.warn('[Cache] Failed to save deviceProfile:', ex); }

        // Start polling guest-info at registration_refresh_interval
        Main.guestInfoAfterInterval();

        // Fetch screen-saver data once and arm the idle timer
        Main.screenSaverInterval();

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

/**
 * Main.cacheHomeImageAssetsByLanguage(items, langUuid, done, idbOnly)
 *
 * idbOnly=true  → offline mode: read blobs from IndexedDB only, never fetch via XHR.
 *                 If a blob is not in IDB, the item is returned without _cached_ URLs
 *                 so the raw API URL is used as a graceful fallback.
 * idbOnly=false → normal online mode: read from IDB; if missing, fetch + store.
 */
Main.cacheHomeImageAssetsByLanguage = function (items, langUuid, done, idbOnly) {
  try {
    if (!Array.isArray(items) || !items.length) {
      return typeof done === "function" ? done(items || []) : null;
    }

    if (!Main.db) {
      return Main.dbInit(function () {
        Main.cacheHomeImageAssetsByLanguage(items, langUuid, done, idbOnly);
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

      var bgKey   = "home_" + langUuid + "_bg_"   + (item.app_uuid || index);
      var iconKey = "home_" + langUuid + "_icon_" + (item.app_uuid || index);

      // Helper: read blob from IDB; if missing and NOT offline, fetch+cache via XHR.
      function getOrFetch(url, key, cb) {
        if (!url) return cb(null);

        try {
          var tx = Main.db.transaction(["images"], "readonly");
          var store = tx.objectStore("images");
          var getRequest = store.get(key);

          getRequest.onsuccess = function (event) {
            var blob = event.target.result;

            if (blob) {
              try { return cb(URL.createObjectURL(blob)); }
              catch (ex) { return cb(null); }
            }

            // Blob not in IDB ──────────────────────────────────────────────
            if (idbOnly) {
              // Offline: skip XHR, return null so raw URL acts as fallback
              console.warn('[Offline] Home image not in IDB (idbOnly), skipping XHR:', key);
              return cb(null);
            }

            // Online: fetch from network and cache for next time
            try {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url, true);
              xhr.responseType = "blob";
              xhr.onload = function () {
                if (xhr.status === 200) {
                  try {
                    var txw = Main.db.transaction(["images"], "readwrite");
                    var storew = txw.objectStore("images");
                    storew.put(xhr.response, key);
                    txw.oncomplete = function () { cb(URL.createObjectURL(xhr.response)); };
                    txw.onerror   = function () { cb(null); };
                  } catch (ex) { cb(null); }
                } else {
                  cb(null);
                }
              };
              xhr.onerror = function () { cb(null); }; // ← was typo "ccb" — fixed
              xhr.send();
            } catch (xhrEx) {
              console.warn('[cacheHomeImages] XHR setup error:', xhrEx);
              cb(null);
            }
          };

          getRequest.onerror = function () { cb(null); };
        } catch (txEx) {
          console.warn('[cacheHomeImages] IDB transaction error:', txEx);
          cb(null);
        }
      }

      // Chain: bg → icon → finish
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
      // Persist home page data for offline fallback
      try { localStorage.setItem('cachedHomePageData', JSON.stringify(Main.homePageData)); } catch(ex) { console.warn('[Cache] Failed to save homePageData:', ex); }

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
        // Persist weather data for offline fallback
        try { localStorage.setItem('cachedWeatherDetails', JSON.stringify(Main.weatherDetails)); } catch(ex) { console.warn('[Cache] Failed to save weatherDetails:', ex); }
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

Main.lgSetting = function () {
  macro.ajax({
    url: apiPrefixUrl + "lg-setting",
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result =
        typeof response === "string" ? JSON.parse(response) : response;

        if(result.status === true) {
          Main.lgSettings = result.result;

          if(result.result && result.result.google_cast_app_token) {
            Main.registerGoogleCastToken();
          }
          if(result.result && result.result.netflix_app_token) {
            try {
                bindingAppsToPms();
            } catch (e) { console.warn("bindingAppsToPms error:", e); }
          }
        }
        console.log("lgSetting---------------------------->", result)
      Main.HideLoading();
    },
    error: function (err) {
      Main.HideLoading();
      console.error("Weather API error:", err);
    },
    timeout: 60000,
  });
};

Main.jsontemplateApi = function(AppUrl) {
  console.log('[API] Fetching template data...');

  // Show the loading spinner using the correct global function
  Main.ShowLoading();
  var _tplLoadStart       = Date.now();
  var _TPL_LOADING_MIN_MS = 1000;

  // Hides loading only after the minimum display time has elapsed.
  // Passed as onReady into ourHotelPage so it fires only after the
  // canvas background image/video is fully painted — no white flash.
  function _hideAfterMinTime() {
    var _elapsed   = Date.now() - _tplLoadStart;
    var _remaining = _TPL_LOADING_MIN_MS - _elapsed;
    if (_remaining > 0) {
      setTimeout(function () { Main.HideLoading(); }, _remaining);
    } else {
      Main.HideLoading();
    }
  }

  macro.ajax({
    url: apiPrefixUrl + "json-template?template_uuid=" + (AppUrl ? AppUrl : ""),
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      try {
        var result = typeof response === "string" ? JSON.parse(response) : response;

        if (result.status === true) {
          Main.jsonTemplateData = result.result;

          console.log('[API] Template data loaded successfully');

          Main.addBackData("ourHotel");
          view = "ourHotel";
          presentPagedetails.view = view;

          // Render behind the loading overlay. Pass _hideAfterMinTime as
          // onReady so the spinner hides only after the canvas is painted.
          macro("#mainContent").html('');
          if (typeof Util !== 'undefined' && Util.ourHotelPage) {
            macro("#mainContent").html(Util.ourHotelPage(_hideAfterMinTime));
            macro("#mainContent").show();
          } else {
            _hideAfterMinTime();
          }

        } else {
          console.error('[API] Template API returned status: false');
          _hideAfterMinTime();
        }
      } catch (parseError) {
        console.error('[API] Failed to parse template response:', parseError);
        _hideAfterMinTime();
      }
    },
    error: function(err) {
      console.error('[API] Template load failed:', err);
      _hideAfterMinTime();
      // macro("#mainContent").html('<div style="color:#fff;text-align:center;padding:50px;">Failed to load template. Please try again.</div>');
    },
    timeout: 30000
  });
}

Main.playlistApi = function (AppUrl, onComplete) {

  Main.ShowLoading();

  macro.ajax({
    url: apiPrefixUrl + "json-play-list?play_list_uuid=" + (AppUrl ? AppUrl : ""),
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      try {
        var result = typeof response === "string" ? JSON.parse(response) : response;

        if (result.status === true && result.result) {
          Main.playlistData = result.result;
          console.log('[PlaylistAPI] Playlist data loaded successfully', result.result);

          // Start the playlist slideshow player.
          // Pass onComplete so PlaylistPlayer can fire it when all slides finish.
          if (typeof PlaylistPlayer !== 'undefined') {
            PlaylistPlayer.start(Main.playlistData, onComplete || null);
          } else {
            console.error('[PlaylistAPI] PlaylistPlayer not loaded – include canvas-playlist.js');
            Main.HideLoading();
          }
        } else {
          console.warn('[PlaylistAPI] API returned no result or status:false');
          Main.HideLoading();
          if (typeof onComplete === 'function') onComplete();
        }
      } catch (parseError) {
        console.error('[PlaylistAPI] Failed to parse playlist response:', parseError);
        Main.HideLoading();
        if (typeof onComplete === 'function') onComplete();
      }
    },
    error: function (err) {
      console.error('[PlaylistAPI] Playlist fetch failed:', err);
      Main.HideLoading();
      if (typeof onComplete === 'function') onComplete();
    },
    timeout: 30000,
  });
};

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

    if (typeof deviceDetails.model_name === "string") {
      deviceModelName = deviceDetails.model_name.trim().toLowerCase();
    }else if (deviceDetails.model_name != null) {
      deviceModelName = String(deviceDetails.model_name).trim().toLowerCase();
    }

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

          console.log("result.result----", result.result);

          localStorage.setItem('lgLgChannelMetaDetails', JSON.stringify(result.result));
          localStorage.setItem('lgLgChannelIdDetails', JSON.stringify(channelIdDetails));

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

/**
 * Main._renderLiveTvPlayer(channelIdDetails, channelMetaDetails)
 *
 * Shared rendering logic used by both the online path (after both APIs
 * return successfully) and the offline path (using localStorage cache).
 * Renders the live TV player page, tunes to the first channel, and sets
 * up the tuning-text and overlay hide timers.
 */
Main._renderLiveTvPlayer = function (channelIdDetails, channelMetaDetails) {
  Main.HideLoading();
  Main.addBackData("liveTvPlayer");

  macro("#mainContent").html('');
  macro("#mainContent").html(Util.liveTvEmptyPage(channelIdDetails, channelMetaDetails));
  macro("#mainContent").show();

  presentPagedetails.view = "liveTvPlayer";
  view = "liveTvPlayer";
  document.body.style.background = 'none';

  // Persist to localStorage so next cold start can use this data
  try { localStorage.setItem('liveTvChannelMetaDetails', JSON.stringify(channelMetaDetails)); } catch(e) {}
  try { localStorage.setItem('liveTvChannelIdDetails',   JSON.stringify(channelIdDetails));   } catch(e) {}

  presentPagedetails.liveTvChannelMetaDetails = channelMetaDetails;
  presentPagedetails.liveTvChannelIdDetails   = channelIdDetails;

  // Tune to first channel
  if (channelIdDetails && channelIdDetails[0] && channelIdDetails[0].lg_ch_url) {
    var chUrl = channelIdDetails[0].lg_ch_url;

    // UDP IP channel — e.g. "udp://239.74.48.14:8013"
    if (/^udp:\/\/\d{1,3}(\.\d{1,3}){3}:\d+$/.test(chUrl)) {
      var urlWithoutPrefix = chUrl.replace("udp://", "");
      var parts = urlWithoutPrefix.split(":");
      var ip   = parts[0];
      var port = parseInt(parts[1]);

      hcap.channel.requestChangeCurrentChannel({
        channelType: hcap.channel.ChannelType.IP,
        ip: ip,
        port: port,
        ipBroadcastType: hcap.channel.IpBroadcastType.UDP,
        onSuccess: function () {
          macro('.live-tv-guide-container').css('display', 'none');
          console.log('[Live TV] Successfully switched to UDP channel');
        },
        onFailure: function (error) {
          console.error("Failed to change channel via HCAP:", error);
        }
      });
    }

    // RF channel with majorNumber-minorNumber format — e.g. "7-7"
    else if (/^\d+-\d+$/.test(chUrl)) {
      var channelParts = chUrl.split("-");
      var majorNumber  = parseInt(channelParts[0]);
      var minorNumber  = parseInt(channelParts[1]);

      console.log('[Live TV] Detected RF channel class 3 format:', chUrl);
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
      });
    }

    // Logical channel number — e.g. "10" or "4"
    else if (/^\d+$/.test(chUrl)) {
      var logicalNumber = parseInt(chUrl);

      console.log('[Live TV] Detected RF channel class 1 format (logical number):', chUrl);
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
      });
    }

    else {
      Navigation.playSelectedChannel(chUrl);
    }
  }

  // Hide tuning text after 3 seconds with fade
  setTimeout(function () {
    var tuningText = document.getElementById("liveChannel_tuningText");
    if (tuningText) {
      tuningText.style.opacity = '0';
      setTimeout(function () { tuningText.style.display = 'none'; }, 500);
    }
  }, 3000);

  // Hide overlay after 10 seconds with slide animation
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
};

/**
 * Main.liveTvChannelIdApi(comingfromWatchTvApp)
 *
 * Online: fetches the channel list from the API.
 * Offline (Main._restoredFromCache): skips both API calls and renders
 * directly from the localStorage-cached channel data.
 */
Main.liveTvChannelIdApi = function (comingfromWatchTvApp) {
  // ── Offline path: use cached channel data from localStorage ──────────
  if (Main._restoredFromCache) {
    var cachedIdDetails   = Main.liveTvChannelIdDetails   || presentPagedetails.liveTvChannelIdDetails;
    var cachedMetaDetails = Main.liveTvChannelMetaDetails || presentPagedetails.liveTvChannelMetaDetails;

    if (cachedIdDetails && cachedIdDetails.length > 0 && cachedMetaDetails) {
      console.log('[Offline] LIVETV: using cached channel data from localStorage');
      Main.ShowLoading();
      // Restore into runtime vars in case they were only on presentPagedetails
      Main.liveTvChannelIdDetails   = cachedIdDetails;
      Main.liveTvChannelMetaDetails = cachedMetaDetails;
      if (comingfromWatchTvApp) {
        Main._renderLiveTvPlayer(cachedIdDetails, cachedMetaDetails);
      }
      return;
    }

    // Cached data not available — show informative message
    console.warn('[Offline] LIVETV: no cached channel data available');
    Main.addBackData("liveTv");
    macro("#mainContent").html('');
    macro("#mainContent").html(
      '<div id="noProgramInfo" style="width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;z-index:9999;">' +
        '<span style="color:#fff;font-size:36px;font-family:Arial,sans-serif;letter-spacing:1px;">No Channel Data Available Offline</span>' +
      '</div>'
    );
    macro("#mainContent").show();
    presentPagedetails.view = "liveTv";
    view = "liveTv";
    return;
  }

  // ── Online path: fetch from API ───────────────────────────────────────
  Main.ShowLoading();
  macro.ajax({
    url: apiPrefixUrl + "channel?ch.language_uuid=" + Main.clickedLanguage,
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result = typeof response === "string" ? JSON.parse(response) : response;
      console.log("liveTvChannelIdApi result:", result);

      if (result.status === true && result.result && result.result.length > 0) {
        Main.liveTvChannelIdDetails = result.result;
        Main.liveTvChannelApiMetaData(comingfromWatchTvApp, result.result);
      } else {
        Main.HideLoading();
        Main.addBackData("liveTv");
        macro("#mainContent").html('');
        macro("#mainContent").html(
          '<div id="noProgramInfo" style="width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;z-index:9999;">' +
            '<span style="color:#fff;font-size:36px;font-family:Arial,sans-serif;letter-spacing:1px;">No Program Info Available</span>' +
          '</div>'
        );
        macro("#mainContent").show();
        presentPagedetails.view = "liveTv";
        view = "liveTv";
      }
    },
    error: function (err) {
      Main.HideLoading();
      console.error("API error for Live Tv Channel data:", err);
    },
    timeout: 60000,
  });
};

Main.liveTvChannelApiMetaData = function (comingfromWatchTvApp, channelIdDetails) {
  Main.ShowLoading();
  macro.ajax({
    url: apiPrefixUrl + "channel-feed?ch.language_uuid=" + Main.clickedLanguage,
    type: "GET",
    headers: {
      Authorization: "Bearer " + pageDetails.access_token,
    },
    success: function (response) {
      var result = typeof response === "string" ? JSON.parse(response) : response;

      Main.liveTvChannelMetaDetails = result.result;

      // Set up metadata refresh interval (30 minutes)
      if (Main.channelMetaRefreshInterval) {
        clearInterval(Main.channelMetaRefreshInterval);
      }
      Main.channelMetaRefreshInterval = setInterval(function () {
        Main.channelListUpdatingFiveMinutes();
      }, 30 * 60 * 1000);

      if (comingfromWatchTvApp == true) {
        Main._renderLiveTvPlayer(channelIdDetails, result.result);
      }

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