var Navigation = {};
var view = "";
var presentPagedetails = {};
Navigation.previousCardFocus = function (v_index, h_index) {
  presentPagedetails.previousCardFocus = {
    row: parseInt(v_index),
    column: parseInt(h_index),
  };
};

Navigation.downloadingPageLoad = function () {
  // Start Lottie animation
  var lottieContainer = document.getElementById("lottie-background");
  if (lottieContainer) {
    try {
      lottie.loadAnimation({
        container: lottieContainer,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "download_bg.json",
      });
    } catch (e) {
      console.error("Lottie animation error:", e);
    }
  }
};

// Smoothly animate progress bar to increase percent
Navigation.updateDownloadProgress = function (targetPercent) {
  var progressBar = document.querySelector(".downloading-progress-fill");
  var downloadText = document.querySelector(".downloading-progress-text");

  if (!progressBar || !downloadText) {
    console.error("Progress elements not found in DOM");
    return;
  }

  var current = parseInt(progressBar.style.width) || 0;

  // Animate from current to targetPercent
  var interval = setInterval(function () {
    if (current >= targetPercent) {
      clearInterval(interval);

      if (targetPercent === 100) {
        downloadText.innerHTML = "Download complete!";
      }
      return;
    }

    current += 1;
    progressBar.style.width = current + "%";
    downloadText.innerHTML = "Downloaded " + current + "%";
  }, 20); // Speed of increment
};

Navigation.languagePageNavigation = function (event) {
  var keycode = window.event ? event.keyCode : event.which;
  var id = macro(".imageFocus").attr("id");
  switch (keycode) {
    case tvKeyCode.ArrowLeft: {
      var splitData = id.split("-");
      if (macro("#lang_btn-" + (parseInt(splitData[1]) - 1)).length > 0) {
        macro(".imageFocus").removeClass("imageFocus");
        macro("#lang_btn-" + (parseInt(splitData[1]) - 1)).addClass(
          "imageFocus"
        );
      }
      console.log("parseInt(splitData[1]) - 1)).text()------->", macro("#lang_btn-" + (parseInt(splitData[1]) - 1)).text())
      if (
        macro("#lang_btn-" + (parseInt(splitData[1]) - 1)).text() == "FRENCH"
      ) {
        macro(".top_texts_welcom").text("Bienvenue");
        macro(".select_lan").text("Veuillez sélectionner votre langue");
        macro(".terms_cond").text(
          "Vous acceptez nos termes et conditions ainsi que notre politique de confidentialité."
        );
      } else if (
        macro("#lang_btn-" + (parseInt(splitData[1]) - 1)).text() == "ENGLISH"
      ) {
        macro(".top_texts_welcom").text("Welcome Dear Guest");
        macro(".select_lan").text("Please Select Your Language");
        macro(".terms_cond").text(
          "You agree to our Terms & Conditions and Privacy Policy. "
        );
      } else if (
        macro("#lang_btn-" + (parseInt(splitData[1]) - 1)).text() == "SPANISH"
      ) {
        macro(".top_texts_welcom").text("Bienvenidos");
        macro(".select_lan").text("Seleccione su idioma");
        macro(".terms_cond").text(
          "Acepta nuestros términos y condiciones y nuestra política de privacidad."
        );
      }
      break;
    }
    case tvKeyCode.ArrowRight: {
      var splitData = id.split("-");
      if (parseInt(splitData[1]) == 0) {
        macro(".imageFocus").removeClass("imageFocus");
        macro("#lang_btn-1").addClass("imageFocus");
      } else if (
        macro("#lang_btn-" + (parseInt(splitData[1]) + 1)).length > 0
      ) {
        macro(".imageFocus").removeClass("imageFocus");
        macro("#lang_btn-" + (parseInt(splitData[1]) + 1)).addClass(
          "imageFocus"
        );
      }
      if (
        macro("#lang_btn-" + (parseInt(splitData[1]) + 1)).text() == "FRENCH"
      ) {
        macro(".top_texts_welcom").text("Bienvenue");
        macro(".select_lan").text("Veuillez sélectionner votre langue");
        macro(".terms_cond").text(
          "vous acceptez nos termes et conditions ainsi que notre politique de confidentialité."
        );
      } else if (
        macro("#lang_btn-" + (parseInt(splitData[1]) + 1)).text() == "ENGLISH"
      ) {
        macro(".top_texts_welcom").text("Welcome Dear Guest");
        macro(".select_lan").text("Please Select Your Language");
        macro(".terms_cond").text(
          "you agree to our Terms & Conditions and Privacy Policy. "
        );
      } else if (
        macro("#lang_btn-" + (parseInt(splitData[1]) + 1)).text() == "SPANISH"
      ) {
        macro(".top_texts_welcom").text("Bienvenidos");
        macro(".select_lan").text("Seleccione su idioma");
        macro(".terms_cond").text(
          "acepta nuestros términos y condiciones y nuestra política de privacidad."
        );
      }
      break;
    }
    case tvKeyCode.ArrowUp: {
      break;
    }
    case tvKeyCode.ArrowDown: {
      break;
    }
    case tvKeyCode.Enter: {
      var uuid = macro(".imageFocus").attr("uuid");
      presentPagedetails.clickedLanguage = uuid;
      Main.clickedLanguage = uuid;

      var textOfLang = id ? document.getElementById(id).textContent : "";
      // Main.deviceActivity("close","page","welcome screen");
      // Main.deviceActivity("open","page","Home screen");

      // 1) Try fully-cached menu for this language
      var cached = (Main.cachedHomeByLang && Main.cachedHomeByLang[uuid]) || [];
      
      if (cached.length > 0) {
        // Already image-cached items for this language

        Main.renderHomePage(cached, textOfLang);
        break;
      }

      // 2) If we already have the raw homePageData, filter/sort for this language
      if (Array.isArray(Main.homePageData) && Main.homePageData.length) {
        var items = Main.homePageData
          .filter(function (x) {
            return x && x.is_active === true && x.language_uuid === uuid;
          })
          .sort(function (a, b) {
            return (a.priority_order || 0) - (b.priority_order || 0);
          });

        if (items.length) {
          // Ensure images for this language are pulled from IndexedDB (no extra API)
          Main.cacheHomeImageAssetsByLanguage(
            items,
            uuid,
            function (cachedGroup) {
              Main.cachedHomeByLang[uuid] = cachedGroup || [];
              Main.renderHomePage(Main.cachedHomeByLang[uuid], textOfLang);
            }
          );
          break;
        }
      }

      // 3) Last resort: we donâ€™t have data yet â†’ fetch once, then render
      Main.getHomeData(function () {
        var items2 =
          (Main.cachedHomeByLang && Main.cachedHomeByLang[uuid]) || [];
        if (items2.length) {
          Main.renderHomePage(items2, textOfLang);
        } else {
          console.error("No cached items available for language:", uuid);
          // You can show a toast or fallback UI here if you want.
        }
      });

      break;
    }

    case 8:
    case tvKeyCode.Return:
    case 10009: {
      break;
    }
  }
};

Navigation.homePageLoad = function (menuData) {
  // defensive: ensure menuData is an array
  if (!menuData || !menuData.length) {
    var emptyContainer = document.getElementById("menu-inner");
    if (emptyContainer) emptyContainer.innerHTML = "";
    utilities.updatingTimeAndDate();
    return;
  }

  // Filter only active items, make a shallow copy so we can splice safely
  var activeMenus = menuData
    .filter(function (item) {
      return item && item.is_active === true;
    })
    .slice();

  // Sort by priority
  activeMenus.sort(function (a, b) {
    return (a.priority_order || 0) - (b.priority_order || 0);
  });

  var menuHTML = "";
  var subtitleLimit = macro(window).width() === 1280 ? 25 : 43;

  for (var i = 0; i < activeMenus.length; i++) {
    var item = activeMenus[i];

    // If the item object is missing, remove it and step index back
    if (!item) {
      activeMenus.splice(i, 1);
      i--;
      continue;
    }

    // If lg_app_id is missing/empty, remove it and step index back so we won't skip next item
    var lg = (item.lg_app_id || "") + "";
    if (lg.trim() === "") {
      activeMenus.splice(i, 1);
      i--;
      continue;
    }

    // Build markup for this (valid) item  use current i so IDs are contiguous
    var bgImage =
      item._cached_bg_image || item.bg_image || "images/bg_menu1.png";
    var iconImage = item._cached_icon || item.icon || "";

    var subTitle = item.sub_title || "";
    var truncatedSubTitle =
      subTitle && subTitle.length > subtitleLimit
        ? subTitle.substring(0, subtitleLimit) + "..."
        : subTitle;

    var title = (item.title || "APP") + ""; // ensure string
    var displayTitle =
      title.length > 11 ? title.substring(0, 11) + "..." : title;

    // Use double-quoted JS strings; single quotes inside onerror for image src
    menuHTML +=
      '<div id="menu-item-' +
      i +
      '" appUrl="' +
      (item.lg_app_id || "") +
      '" source="' +
      (item.name || "") +
      '" class="menu-item">' +
      "<div>" +
      '<img src="' +
      bgImage +
      '" class="menu_inside_icon" alt="BG" onerror="this.onerror=null;this.src=\'images/bg_menu1.png\';" />' +
      '<div class="menu-upside-wrapper">' +
      '<img src="' +
      iconImage +
      '" class="menu_upside_icon" alt="Icon" onerror="this.onerror=null;this.src=\'\';" />' +
      "</div>" +
      '<div class="menu-text">' +
      "<span>" +
      displayTitle +
      "</span>" +
      "<p>" +
      truncatedSubTitle +
      "</p>" +
      "</div>" +
      "</div>" +
      '<div class="focus-glow">' +
      '<div class="focus_glow_inner"></div>' +
      "</div>" +
      "</div>";
  }

  var container = document.getElementById("menu-inner");
  if (container) {
    container.innerHTML = menuHTML;
  } else {
    console.warn("Navigation.homePageLoad: #menu-inner not found");
  }

  utilities.updatingTimeAndDate();
};

Navigation.homePageNavigation = function (event) {
  var keycode = window.event ? event.keyCode : event.which;
  var focusedItem = macro(".imageFocus");
  var id = focusedItem.attr("id");
  var source = focusedItem.attr("source");
  var appUrl = focusedItem.attr("appUrl");

  console.log("keycode, id, source, appUrl", keycode, id, source, appUrl);

  if (!id) {
    // If no focus, set focus to first menu item
    macro("#menu-item-0").addClass("imageFocus");
    return;
  }

  var splitData = id.split("-");
  var currentIndex = parseInt(splitData[2]);

  var items = macro(".menu-item");
  var totalCards = items.length;
  var maxVisibleCards = 5; // Number of cards visible in one view
  var slideWidth = macro(".menu-item").outerWidth(true); // Include margin
  var container = macro(".menu-inner");

  switch (keycode) {
    case tvKeyCode.ArrowRight: {
      if (splitData[0] === "menu") {
        if (currentIndex >= totalCards - 1) break;

        // stopClockInterval();
        // clearTimeout(restartTimeout);

        var nextIndex = currentIndex + 1;
        macro(".imageFocus").removeClass("imageFocus");
        macro("#menu-item-" + nextIndex).addClass("imageFocus");
        currentIndex = nextIndex;

        // Smart sliding logic for right direction
        // Only slide if we are before the last set of visible cards
        if (currentIndex <= totalCards - maxVisibleCards) {
          var newPosition = -currentIndex * slideWidth;
          macro(".menu-inner").css({
            transition: "transform 0.5s ease",
            transform: "translateX(" + newPosition + "px)",
          });
        }

        // restartTimeout = setTimeout(startClockInterval, 550);
      }
      break;
    }

    case tvKeyCode.ArrowLeft: {
      if (splitData[0] === "menu") {
        if (currentIndex <= 0) break;

        // stopClockInterval();
        // clearTimeout(restartTimeout);

        var prevIndex = currentIndex - 1;
        macro(".imageFocus").removeClass("imageFocus");
        macro("#menu-item-" + prevIndex).addClass("imageFocus");
        currentIndex = prevIndex;

        // Smart sliding logic for left direction
        // Only slide when the focus is before the last visible card from left
        if (currentIndex < totalCards - maxVisibleCards) {
          var newPosition = -currentIndex * slideWidth;
          macro(".menu-inner").css({
            transition: "transform 0.5s ease",
            transform: "translateX(" + newPosition + "px)",
          });
        }

        // restartTimeout = setTimeout(startClockInterval, 550);
      }
      break;
    }

    case tvKeyCode.ArrowUp: {
      // stopClockInterval();
      // clearTimeout(restartTimeout);
      if (splitData[0] == "menu") {
        macro(".imageFocus").removeClass("imageFocus");
        macro("#lang_change_icon").addClass("imageFocus");
        macro("#top-right_langIcon").addClass("imageFocus");
        Navigation.previousCardFocus(parseInt(splitData[2]));
      }
      // setTimeout(startClockInterval, 500); // restart after animation completes
      break;
    }

    case tvKeyCode.ArrowDown: {
      // stopClockInterval();
      if (id == "lang_change_icon" && !!presentPagedetails.previousCardFocus) {
        macro(".imageFocus").removeClass("imageFocus");
        macro(
          "#menu-item-" + parseInt(presentPagedetails.previousCardFocus.row)
        ).addClass("imageFocus");
      } else if (id == "lang_change_icon") {
        macro(".imageFocus").removeClass("imageFocus");
        macro("#menu-item-0").addClass("imageFocus");
      }
      // restartTimeout = setTimeout(startClockInterval, 500);
      break;
    }

    case tvKeyCode.Enter: {
      // if (splitData[0] === "menu" && appUrl) {
      //     console.log('Launching app:', source, 'with URL:', appUrl);
      //     // Add your app launch logic here
      //     // Main.launchApp(appUrl, source);
      // }

      console.log("appUrl------------------>", appUrl);

      if (id == "lang_change_icon") {
        var comingFromHomeLang = true;
        // Main.deviceActivity("open","page","welcome screen");
        // Main.deviceActivity("open","page","Home screen");
        Main.getTemplateApiData(comingFromHomeLang);

      }
      else if (appUrl === "hdmi") {
        Main.addBackData("MyDevice");
        view = "MyDevice"
        presentPagedetails.view = view;
        Util.DevicesSwitchPage();
      }
      else if (appUrl === "Netflix") {
        hcap.preloadedApplication.launchPreloadedApplication({
          id: "244115188075859013", // this id i have get from the hcap document
          parameters: JSON.stringify({
            reason: "launcher",  // or "hotKey" / "boot"
            params: {
              hotel_id: "GRE1234",
              launcher_version: "1.0"  // Just for your tracking
            }
          }),
          onSuccess: function(response) {
            // Main.deviceActivity("close","page","Home screen");
            // Main.deviceActivity("open","app",source);
            console.log("Netflix Opend successfully")
          },
          onFailure: function(err) {
             console.log("Netflix launch failed: " + err.errorMessage);
          }
        })
      }
      else if (appUrl === "Youtube") {
        hcap.preloadedApplication.launchPreloadedApplication({
          id: "144115188075859002",
          parameters: "{}",
          onSuccess: function(response) {
            // Main.deviceActivity("close","page","Home screen");
            // Main.deviceActivity("open","app",source);
            console.log("YouTube launched successfully");
          },
          onFailure: function (f) {
            console.log("YouTube not loaded:", f.errorMessage);
          }
        })
      }
      else if(appUrl === "accuweather") {
        hcap.preloadedApplication.launchPreloadedApplication({
          id: "144115188075855876",
          parameters: "{}",
          onSuccess: function() {
            // Main.deviceActivity("close","page","Home screen");
            // Main.deviceActivity("open","app",source);
            console.log("accuweather launched successfully")
          },
          onFailure: function (f) {
            console.log("accuweather not loaded:", f.errorMessage)
          }
        })
      }
      else if(appUrl === "com.fubotv.app") {
        ensureAppInstalled("com.fubotv.app");
      }
      else if(appUrl === "com.haystacktv.app") {
        ensureAppInstalled("com.haystacktv.app");
      }
      else if(appUrl === "com.5403008.196062") {
        ensureAppInstalled("com.5403008.196062");
      }
      else if(appUrl === "tv.amasian.webos.na1.commercial") {
        ensureAppInstalled("tv.amasian.webos.na1.commercial");
      }
      else if(appUrl === "com.webos.app.commercial.clock") {
        ensureAppInstalled("com.webos.app.commercial.clock");
      }
      else if(appUrl === "cdp") {
        ensureAppInstalled("cdp");
      }
      else if(appUrl === "com.aajtak.app") {
        ensureAppInstalled("com.aajtak.app");
      }
      else if(appUrl === "com.airwave.lg") {
        ensureAppInstalled("com.airwave.lg");
      }
      else if(appUrl === "Cleardata") {
        Main.popupData = {}
        Main.popupData.popuptype = "clearData"
        macro("#popUpFDFS").html(Util.clearDataPage());
        macro("#popupBtn-0").addClass('popupFocus');
        // Main.deviceActivity("close","page","Home screen");
        // Main.deviceActivity("open","page",source);
      }
      else if(appUrl === "Casting") {
        Main.handleGoogleCast();
      }
      else if (appUrl === "LGTV") {
        var comingfromWatchTvApp = true;
        // Main.deviceActivity("close","page","Home screen");
        // Main.deviceActivity("open","app",source);
        console.log("LGTV app launched");
        Main.lgLgChannelIdApi(comingfromWatchTvApp)
      }
      else if (appUrl === "LIVETV") {
        var comingfromWatchTvApp = true;
        // Main.deviceActivity("close","page","Home screen");
        // Main.deviceActivity("open","app",source);
        Main.liveTvChannelIdApi(comingfromWatchTvApp)
      }
      else if (appUrl === "custom") {
        Main.jsontemplateApi();
      }

      break;
    }

    case 8:
    case tvKeyCode.Return:
    case 10009: {
      // Handle back button
      console.log("Back button pressed from home page");
      break;
    }
  }
};

/**
 * ====================================================================
 * ENHANCED NAVIGATION FOR OURHOTEL PAGE
 * Integrates with CanvasAction for remote control navigation
 * ====================================================================
 */

// Add this to your Navigation object in navigation.js

/**
 * Navigation handler for OurHotel page with action buttons
 */
Navigation.ourHotelPageNavigation = function (event) {
    var key = getKeyCode(event).keycode;

    console.log('[Navigation] OurHotel key pressed:', key);

    switch (key) {
        case tvKeyCode.ArrowUp:
            console.log('[Navigation] Arrow Up');
            if (typeof CanvasAction !== 'undefined' && CanvasAction.moveFocus) {
                CanvasAction.moveFocus('up');
            }
            break;

        case tvKeyCode.ArrowDown:
            console.log('[Navigation] Arrow Down');
            if (typeof CanvasAction !== 'undefined' && CanvasAction.moveFocus) {
                CanvasAction.moveFocus('down');
            }
            break;

        case tvKeyCode.ArrowLeft:
            console.log('[Navigation] Arrow Left');
            if (typeof CanvasAction !== 'undefined' && CanvasAction.moveFocus) {
                CanvasAction.moveFocus('left');
            }
            break;

        case tvKeyCode.ArrowRight:
            console.log('[Navigation] Arrow Right');
            if (typeof CanvasAction !== 'undefined' && CanvasAction.moveFocus) {
                CanvasAction.moveFocus('right');
            }
            break;

        case tvKeyCode.Enter:
            console.log('[Navigation] Enter pressed');
            if (typeof CanvasAction !== 'undefined' && CanvasAction.executeAction) {
                CanvasAction.executeAction();
            }
            break;

        case tvKeyCode.Return:
        case tvKeyCode.Exit:
        case 8:
        case 461:
        case 10009:
            console.log('[Navigation] Exiting OurHotel page');
            
            // Clean up canvas
            try {
                var canvas = document.getElementById('templateCanvas');
                if (canvas) {
                    var ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                }
            } catch (e) {
                console.warn('[Navigation] Canvas cleanup failed:', e);
            }
            
            // Navigate back
            if (typeof Main !== 'undefined' && Main.previousPage) {
                Main.previousPage();
            }
            break;
    }
};

/**
 * Initialize navigation when OurHotel page loads
 */
Navigation.initializeOurHotelNavigation = function() {
    console.log('[Navigation] Initializing OurHotel navigation');
    
    // Wait for canvas to render
    setTimeout(function() {
        try {
            if (typeof Main !== 'undefined' && 
                Main.jsonTemplateData && 
                Main.jsonTemplateData.template_json &&
                Main.jsonTemplateData.template_json.elements) {
                
                var elements = Main.jsonTemplateData.template_json.elements;
                
                // Initialize action navigation
                if (typeof CanvasAction !== 'undefined' && CanvasAction.initializeNavigation) {
                    CanvasAction.initializeNavigation(elements);
                    
                    // Refresh canvas to show initial focus
                    if (typeof CanvasRenderer !== 'undefined' && CanvasRenderer.refresh) {
                        CanvasRenderer.refresh();
                    }
                }
                
                console.log('[Navigation] OurHotel navigation initialized successfully');
            }
        } catch (e) {
            console.error('[Navigation] Failed to initialize OurHotel navigation:', e);
        }
    }, 500);
};




function stopAndClearMedia() {
  try {
    if (window._currentHcapMedia){
      try{
        window._currentHcapMedia.stop({
          onSuccess: function () { console.log('media stop success'); },
          onFailure: function (f) { console.warn('media stop failed', f); }
        })
      }catch (eStop) {
        console.warn('stop() threw', eStop);
      }
      try {
        window._currentHcapMedia.destroy({
          onSuccess: function () { console.log('media destroy success'); },
          onFailure: function (f) { console.warn('media destroy failed', f); }
        })
      }catch (eDestroy) {
        console.warn("destroy() threw", eDestroy)
      }

      try { window._currentHcapMedia = null; } catch (e) {}
    }
  }catch (err){
    console.warn('stopAndClearMedia error', err);
  }

  // call shutDown after short delay to ensure TV input is released
  try {
    if(window.hcap && hcap.media && hcap.media.shutDown) {
      setTimeout( function () {
        try {
          hcap.media.shutDown({
            onSuccess: function () { console.log('hcap.Media.shutDown success'); },
            onFailure: function (f) { console.warn('hcap.Media.shutDown failed', f); }
          });
        }catch (e) {
          console.warn("shutDown threw", e);
        }
      }, 150);
    }
  }catch (e) { console.warn('shutDown outer error', e); }
}

Navigation.deviceSwitchNavigation = function (event) {
  console.log("called------------------->")
  var keycode = (window.event) ? event.keyCode : event.which;
  var focused = macro('.imageFocus');
  if (!focused || focused.length === 0) return;
  var id = focused.attr("id");
  console.log("id------------->", id)
  if(!id) return;

  var cards = document.querySelectorAll('.device-card');
  var total = cards ? cards.length : 0;
  var parts = id.split("-");
  var idx = parseInt(parts[2], 10);
  if (isNaN(idx)) idx = 0;

  switch (keycode) {
    case tvKeyCode.ArrowLeft: {
      if (idx > 0) {
        macro('.imageFocus').removeClass('imageFocus');
        macro("#device-btn-" + (idx - 1)).addClass('imageFocus');
      }
      break;
    }
    case tvKeyCode.ArrowRight: {
      if (idx < total - 1) {
        macro('.imageFocus').removeClass('imageFocus');
        macro("#device-btn-" + (idx + 1)).addClass('imageFocus');
      }
      break;
    }
    case tvKeyCode.ArrowUp: {
      break;
    }
    case tvKeyCode.ArrowDown: {
      break;
    }
    case tvKeyCode.Enter: {
      var el = document.getElementById(id);
      if (!el) break;

      var action = el.getAttribute("data-action");

      if(action === "input") {
        var attr = el.getAttribute("data-type");
        var type = isNaN(parseInt(attr, 10)) ? attr : parseInt(attr, 10);
        var index = parseInt(el.getAttribute("data-index"), 10);

        console.log('[HDMI] Entering HDMI input mode - type:', type, 'index:', index);

        // âœ… STEP 1: Save original input FIRST
        if (typeof hcap !== "undefined" && hcap.externalinput) {
          try {
            hcap.externalinput.getCurrentExternalInput({
              onSuccess: function(res) {
                window._originalTvInput = {
                  type: res.type,
                  index: res.index
                };
                console.log('[HDMI] âœ… Saved original input:', window._originalTvInput);
              },
              onFailure: function(f) {
                console.warn('[HDMI] Failed to get current input:', f);
                // Default fallback - assume TV input
                window._originalTvInput = {
                  type: hcap.externalinput.ExternalInputType.TV,
                  index: 0
                };
                console.log('[HDMI] Using fallback input:', window._originalTvInput);
              }
            });
          } catch(e) {
            console.warn('[HDMI] Exception getting current input:', e);
            window._originalTvInput = {
              type: 1, // TV type
              index: 0
            };
          }
        }

        // STEP 2: Save back data and set view
        Main.addBackData("liveTv");
        view = "liveTv";
        presentPagedetails.view = view;

        // STEP 3: Show empty page
        macro("#mainContent").html(Util.hdmiInputEmptyPage());
        macro("#mainContent").show();
        document.body.style.background = "none";

        // STEP 4: Switch to HDMI input
        if (typeof hcap !== "undefined" && hcap.externalinput) {
          hcap.mode.setHcapMode({
            mode: hcap.mode.HCAP_MODE_2,
            onSuccess: function () {
              console.log('[HDMI] Set HCAP_MODE_2 successfully');
              
              // Switch HDMI Input
              hcap.externalinput.setCurrentExternalInput({
                type: type,
                index: index,
                onSuccess: function () {
                  console.log('[HDMI] Switched to HDMI input type=' + type + ' index=' + index);
                  startHdmiMonitor(type, index);
                },
                onFailure: function (f) {
                  console.error('[HDMI] Switch failed: ' + f.errorMessage);
                  Main.previousPage();
                  hcap.mode.setHcapMode({ mode: hcap.mode.HCAP_MODE_1 });
                  window._originalTvInput = null;
                } 
              });
            },
            onFailure: function (f) {
              console.error('[HDMI] Failed to set HCAP mode: ' + f.errorMessage);
              Main.previousPage();
              hcap.mode.setHcapMode({ mode: hcap.mode.HCAP_MODE_1 });
              window._originalTvInput = null;
            }
          });
        } else {
          console.warn('[HDMI] HCAP not available');
          Main.previousPage();
        }
      }
      else if (action === "restart") {
        rebootTv();
      }
      else {
        ensureAppInstalled("com.webos.app.btspeakerapp");
      }
      break;
    }
    case tvKeyCode.Exit: {
      stopHdmiMonitor();
      // Stop any HCAP media and restore normal mode, then go back
      try { stopAndClearMedia(); } catch(e){ console.warn('stopAndClearMedia failed', e); }

      try { Main.previousPage(); } catch(e) { console.warn('Main.previousPage threw', e); }
      try {
        if (window.hcap && hcap.mode && typeof hcap.mode.setHcapMode === 'function') {
          hcap.mode.setHcapMode({
            mode: hcap.mode.HCAP_MODE_1,
          })
        }
      }catch (e) { console.warn('setHcapMode on return threw', e); }
      break;
    }
    case 8:
    case tvKeyCode.Return:
    case 10009: {
      // Stop any HCAP media and restore normal mode, then go back
      stopHdmiMonitor();
      try { stopAndClearMedia(); } catch(e){ console.warn('stopAndClearMedia failed', e); }

      try { Main.previousPage(); } catch(e) { console.warn('Main.previousPage threw', e); }
      try {
        if (window.hcap && hcap.mode && typeof hcap.mode.setHcapMode === 'function') {
          hcap.mode.setHcapMode({
            mode: hcap.mode.HCAP_MODE_1,
          })
        }
      }catch (e) { console.warn('setHcapMode on return threw', e); }
      break;
    }

    default:
      break;
  }
}

Navigation.EmptyLiveNavigation = function (event) {
  var keycode = (window.event) ? event.keyCode : event.which;
  
  switch (keycode) {
    case tvKeyCode.ArrowLeft:
    case tvKeyCode.ArrowRight:
    case tvKeyCode.ArrowUp:
    case tvKeyCode.ArrowDown:
    case tvKeyCode.ChannelUp:
    case tvKeyCode.ChannelDown:
    case tvKeyCode.Enter: {
      break;
    }
    
    case 8:
    case tvKeyCode.Return:
    case tvKeyCode.Exit:
    case 10009: {
      console.log('[HDMI Exit] Starting HDMI exit sequence from EmptyLiveNavigation...');
      stopHdmiMonitor();
      
      // Step 1: Switch back to original TV input to stop HDMI audio
      if (typeof hcap !== "undefined" && hcap.externalinput) {
        try {
          var originalInput = window._originalTvInput || {
            type: hcap.externalinput.ExternalInputType.TV,
            index: 0
          };
          
          console.log('[HDMI Exit] Switching back to original input:', originalInput);
          
          hcap.externalinput.setCurrentExternalInput({
            type: originalInput.type,
            index: originalInput.index,
            onSuccess: function () {
              console.log('[HDMI Exit] âœ… Successfully restored original input - HDMI audio stopped');
              
              // Step 2: Set HCAP mode back to normal
              try {
                hcap.mode.setHcapMode({
                  mode: hcap.mode.HCAP_MODE_1,
                  onSuccess: function() {
                    console.log('[HDMI Exit] âœ… Successfully set HCAP_MODE_1');
                    
                    // Step 3: Navigate back to previous page
                    try { 
                      Main.previousPage(); 
                      document.body.style.background = "#000";
                    } catch(e) { 
                      console.warn('[HDMI Exit] Main.previousPage threw', e); 
                    }
                    
                    // Clear saved input
                    window._originalTvInput = null;
                  },
                  onFailure: function(f) {
                    console.warn('[HDMI Exit] Failed to set HCAP_MODE_1:', f);
                    // Still navigate back even if mode change fails
                    try { 
                      Main.previousPage(); 
                      document.body.style.background = "#000";
                    } catch(e) {}
                    window._originalTvInput = null;
                  }
                });
              } catch(e) {
                console.warn('[HDMI Exit] setHcapMode threw exception:', e);
                try { 
                  Main.previousPage(); 
                  document.body.style.background = "#000";
                } catch(e2) {}
                window._originalTvInput = null;
              }
            },
            onFailure: function (f) {
              console.error('[HDMI Exit] âŒ Failed to restore original input:', f.errorMessage);
              
              // Even if input switch fails, still try to clean up and go back
              try {
                hcap.mode.setHcapMode({ 
                  mode: hcap.mode.HCAP_MODE_1,
                  onSuccess: function() {
                    console.log('[HDMI Exit] Mode set to 1 despite input switch failure');
                  },
                  onFailure: function(f2) {
                    console.warn('[HDMI Exit] Mode change also failed:', f2);
                  }
                });
              } catch(e) {
                console.warn('[HDMI Exit] Mode change exception:', e);
              }
              
              try { 
                Main.previousPage(); 
                document.body.style.background = "#000";
              } catch(e) {
                console.warn('[HDMI Exit] Navigation failed:', e);
              }
              
              window._originalTvInput = null;
            }
          });
        } catch(e) {
          console.error('[HDMI Exit] âŒ Exception during HDMI exit:', e);
          
          // Fallback cleanup
          try { 
            hcap.mode.setHcapMode({ mode: hcap.mode.HCAP_MODE_1 }); 
          } catch(e2) {
            console.warn('[HDMI Exit] Fallback mode change failed:', e2);
          }
          
          try { 
            Main.previousPage(); 
            document.body.style.background = "#000";
          } catch(e2) {
            console.warn('[HDMI Exit] Fallback navigation failed:', e2);
          }
          
          window._originalTvInput = null;
        }
      } else {
        // No HCAP available - just navigate back
        console.warn('[HDMI Exit] âš ï¸ HCAP not available - simple navigation (audio may continue)');
        
        try { 
          Main.previousPage(); 
          document.body.style.background = "#000";
        } catch(e) {
          console.warn('[HDMI Exit] Simple navigation failed:', e);
        }
      }
      
      break;
    }
  }
}

Navigation.popupKeyhandler = function (event) {
  var keycode = (window.event) ? event.keyCode : event.which;
  var id = macro('.popupFocus').attr("id");

  switch (keycode) {
    case tvKeyCode.ArrowLeft: {
      splitData = id.split("-")
      if (splitData[0] == "popupBtn" && macro("#popupBtn-" + (parseInt(splitData[1]) - 1)).length > 0) {
        macro('.popupFocus').removeClass('popupFocus');
        macro("#popupBtn-" + (parseInt(splitData[1]) - 1)).addClass('popupFocus');
      }
      break;
    }

    case tvKeyCode.ArrowRight: {
      splitData = id.split("-")
      if(splitData[0] == "popupBtn" && macro("#popupBtn-" + (parseInt(splitData[1]) + 1)).length > 0) {
        macro('.popupFocus').removeClass('popupFocus');
        macro("#popupBtn-" + (parseInt(splitData[1]) + 1)).addClass('popupFocus');
      }
      break;
    }

    case tvKeyCode.ArrowUp: {
      break;
    }
    case tvKeyCode.ArrowDown: {
      break;
    }
    case tvKeyCode.Enter: {
      splitData = id.split("-")
      if(Main.popupData.popuptype === "clearData") {
        if(splitData[1] == 0){
          // Cancel Button
          macro("#popUpFDFS").html('');
          Main.popupData = {};
        }
        else if (splitData[1] == 1) {
          // Clear & Checkout (modern or fallback auto-handled)
          macro("#popUpFDFS").html('');
          Main.popupData = {};
          CheckoutManager_requestCheckout();
        }
        else if (splitData[1] == 2) {
          // Clear only (legacy fallback always)
          macro("#popUpFDFS").html('');
          Main.popupData = {};
          CheckoutManager_requestCheckout();
        }
      }else {
        macro("#popUpFDFS").html('');
        Main.popupData = {};
      }
       break;
    }

    case 8:
    case tvKeyCode.Return:
    case tvKeyCode.Exit:
    case 10009: {
      macro("#popUpFDFS").html('');
      Main.popupData = {};
    }
  }
}

Navigation.castingPageNavigation = function (event) {
  var keycode = (window.event) ? event.keyCode : event.which;
  switch (keycode) {
    case tvKeyCode.ArrowLeft:
    case tvKeyCode.ArrowRight:
    case tvKeyCode.ArrowUp:
    case tvKeyCode.ArrowDown:
    case tvKeyCode.Enter: {
      break;
    }
    case tvKeyCode.Exit: {
      Main.previousPage();
      break;
    }
    case 8:
    case tvKeyCode.Return:
    case 10009: {
      Main.previousPage();
      break;
    }
  }
}

// ========================================
// TV GUIDE NAVIGATION
// ========================================

Navigation.lgLgDemoPlayers = function (event) {
  var keycode = (window.event) ? event.keyCode : event.which;
  
  if (presentPagedetails.showingTvGuide === true) {
    
    var focusMode = presentPagedetails.tvGuideFocusMode || 'genre';
    
    // ===== GENRE TAB NAVIGATION MODE =====
    if (focusMode === 'genre') {
      
      var focusedGenre = macro('.genre-focused');
      var currentGenreIndex = 0;
      
      if (focusedGenre && focusedGenre.length > 0) {
        var id = focusedGenre.attr('id');
        if (id) {
          var parts = id.split('-');
          currentGenreIndex = parseInt(parts[2], 10);
        }
      } else {
        macro('#genre-tab-0').addClass('genre-focused');
        return;
      }
      
      var totalGenres = macro('.tv-guide-genre-tab').length;
      
      switch (keycode) {
        
        case tvKeyCode.ArrowLeft: {
          if (currentGenreIndex > 0) {
            macro('.genre-focused').removeClass('genre-focused');
            macro('#genre-tab-' + (currentGenreIndex - 1)).addClass('genre-focused');
            Navigation.scrollGenreIntoView(currentGenreIndex - 1);
          }
          break;
        }
        
        case tvKeyCode.ArrowRight: {
          if (currentGenreIndex < totalGenres - 1) {
            macro('.genre-focused').removeClass('genre-focused');
            macro('#genre-tab-' + (currentGenreIndex + 1)).addClass('genre-focused');
            Navigation.scrollGenreIntoView(currentGenreIndex + 1);
          }
          break;
        }
        
        case tvKeyCode.ArrowDown: {
          console.log('Moving DOWN from genres to channels');
          presentPagedetails.tvGuideFocusMode = 'channel';
          
          // Remove genre-focused
          macro('.genre-focused').removeClass('genre-focused');
          
          // NOW add channel focus
          var firstChannel = macro('.tv-guide-channel-row').first();
          if (firstChannel.length) {
            firstChannel.addClass('channel-row-focused');
            presentPagedetails.lastChannelIndex = 0;
            var channelList = document.getElementById('tvGuideChannelsList');
            if (channelList) {
              channelList.scrollTop = 0;
            }
          }
          break;
        }
        
        case tvKeyCode.ArrowUp: {
          break;
        }
        
        case tvKeyCode.Enter: {
          var selectedGenreBtn = macro('#genre-tab-' + currentGenreIndex);
          var selectedGenre = selectedGenreBtn.attr('data-genre');
          
          // Remember selected genre
          presentPagedetails.selectedGenre = selectedGenre;
          
          // Update active class
          macro('.genre-active').removeClass('genre-active');
          selectedGenreBtn.addClass('genre-active');
          
          // Update ONLY channels list
          Navigation.updateChannelsOnly(selectedGenre);
          break;
        }
        
        case tvKeyCode.Exit:
        case 8:
        case tvKeyCode.Return:
        case 10009: {
          Navigation.closeTvGuide();
          break;
        }
      }
    }
    // ===== CHANNEL LIST NAVIGATION MODE =====
    else {
      
      var focusedRow = macro('.channel-row-focused');
      var currentIndex = 0;
      
      if (focusedRow && focusedRow.length > 0) {
        var id = focusedRow.attr('id');
        if (id) {
          var parts = id.split('-');
          currentIndex = parseInt(parts[3], 10);
          console.log("currentIndex122334----------------->", currentIndex);
        }
      } else {
        macro('#tv-channel-row-0').addClass('channel-row-focused');
        presentPagedetails.lastChannelIndex = 0;
        return;
      }
      
      // Remember last channel position
      presentPagedetails.lastChannelIndex = currentIndex;
      
      var totalChannels = macro('.tv-guide-channel-row').length;
      
      switch (keycode) {
        
        case tvKeyCode.ArrowUp: {
          console.log("currentIndex----------------->", currentIndex);
          console.log("totalChannels----------------->", totalChannels);
          if (currentIndex > 0) {
            macro('.channel-row-focused').removeClass('channel-row-focused');
            macro('#tv-channel-row-' + (currentIndex - 1)).addClass('channel-row-focused');
            presentPagedetails.lastChannelIndex = currentIndex - 1;
            Navigation.scrollChannelIntoView(currentIndex - 1);
          } else {
            console.log('At first channel, moving to genres');
            presentPagedetails.tvGuideFocusMode = 'genre';
            
            // Remove channel focus
            macro('.channel-row-focused').removeClass('channel-row-focused');
            
            // First remove any existing genre-focused class to ensure clean state
            macro('.genre-focused').removeClass('genre-focused');
            
            // Then add focus to the active genre (or first genre if none active)
            var activeGenre = macro('.genre-active');
            if (activeGenre.length) {
              activeGenre.addClass('genre-focused');
            } else {
              macro('#genre-tab-0').addClass('genre-focused');
            }
          }
          break;
        }
        
        case tvKeyCode.ArrowDown: {
          if (currentIndex < totalChannels - 1) {
            macro('.channel-row-focused').removeClass('channel-row-focused');
            macro('#tv-channel-row-' + (currentIndex + 1)).addClass('channel-row-focused');
            presentPagedetails.lastChannelIndex = currentIndex + 1;
            Navigation.scrollChannelIntoView(currentIndex + 1);
          }
          break;
        }
        
        case tvKeyCode.ArrowLeft:
        case tvKeyCode.ArrowRight: {
          break;
        }
        
        case tvKeyCode.Enter: {
          var selectedChannelRow = macro('#tv-channel-row-' + currentIndex);
          var channelId = selectedChannelRow.attr('data-channel-id');
          console.log('Channel selected:', channelId, 'Index:', currentIndex);
          
          // SAVE EXACT POSITION: genre, channel index, and focus mode
          presentPagedetails.savedGenre = presentPagedetails.selectedGenre;
          presentPagedetails.savedChannelIndex = currentIndex;
          presentPagedetails.savedFocusMode = 'channel';  // Return to channel mode
          
          // Find the selected channel in lgLgChannelIdDetails
          var selectedChannel = null;
          for (var i = 0; i < presentPagedetails.lgLgChannelIdDetails.length; i++) {
            if (String(presentPagedetails.lgLgChannelIdDetails[i].channel_id) === String(channelId)) {
              selectedChannel = presentPagedetails.lgLgChannelIdDetails[i];
              break;
            }
          }
          
          if (selectedChannel && selectedChannel.ch_media_static_url) {
            console.log('Playing channel:', selectedChannel.ch_name, 'URL:', selectedChannel.ch_media_static_url);
            
            // Store current channel index for overlay display
            presentPagedetails.currentChannelId = channelId;
            
            // Play the selected channel
            Navigation.playSelectedChannel(selectedChannel.ch_media_static_url);
          } else {
            console.warn('Channel URL not found for channel_id:', channelId);
          }
          
          // Navigate to overlay
          Navigation.closeTvGuide();
          break;
        }
        
        case tvKeyCode.Exit:
        case 8:
        case tvKeyCode.Return:
        case 10009: {
          Navigation.closeTvGuide();
          break;
        }
      }
    }
  } 
  // ===== OVERLAY MODE =====
  else {
    
    switch (keycode) {
      
      case tvKeyCode.ArrowUp:
      case tvKeyCode.ArrowDown: {
        console.log('Opening TV Guide from overlay');
        presentPagedetails.showingTvGuide = true;
        
        // RESTORE SAVED POSITION if available
        if (presentPagedetails.savedGenre) {
          presentPagedetails.selectedGenre = presentPagedetails.savedGenre;
          presentPagedetails.lastChannelIndex = presentPagedetails.savedChannelIndex || 0;
          presentPagedetails.tvGuideFocusMode = presentPagedetails.savedFocusMode || 'channel';
        } else {
          // First time opening
          presentPagedetails.selectedGenre = presentPagedetails.selectedGenre || 'All';
          presentPagedetails.tvGuideFocusMode = 'genre';
          presentPagedetails.lastChannelIndex = 0;
        }

        console.log("Navigation called");
        
        macro('#mainContent').html('');
        macro('#mainContent').html(Util.lgTvGuideFullScreen(presentPagedetails.lgLgChannelIdDetails, presentPagedetails.lgLgChannelMetaDetails));
        macro('#mainContent').show();
        
        // ðŸ”¥ INSTANT SCROLL - No setTimeout needed
        if (presentPagedetails.savedFocusMode === 'channel') {
          // Was in channel mode - restore channel focus
          var channelIndex = presentPagedetails.savedChannelIndex || 0;
          macro('#tv-channel-row-' + channelIndex).addClass('channel-row-focused');
          
          // ðŸ”¥ INSTANT scroll to focused channel WITHOUT smooth animation
          Navigation.scrollChannelIntoViewInstant(channelIndex);
        } else {
          // Was in genre mode - restore genre focus
          var activeGenre = macro('.genre-active');
          if (activeGenre.length) {
            activeGenre.addClass('genre-focused');
          } else {
            macro('#genre-tab-0').addClass('genre-focused');
          }
        }
        break;
      }
      
      case tvKeyCode.ArrowLeft:
      case tvKeyCode.ArrowRight: {
        break;
      }
      
      case tvKeyCode.Enter: {
        var overlay = macro('.lg-tv-overlay');
        if (overlay.length) {
          if (overlay.is(':visible')) {
            overlay.animate({ bottom: "-300px" }, 800, function() {
              overlay.css('display', 'none');
              overlay.css('bottom', '44px');
            });
          } else {
            overlay.css('display', 'flex');
            overlay.animate({ bottom: "44px" }, 800);
            setTimeout(function () {
              if (overlay.is(':visible')) {
                overlay.animate({ bottom: "-300px" }, 800, function () {
                    overlay.css('display', 'none');
                    overlay.css('bottom', '44px');
                  }
                );
              }
            }, 10000);
          }
        }
        break;
      }
      
      case tvKeyCode.Exit:
      case 8:
      case tvKeyCode.Return:
      case 10009: {
        // Stop media playback
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

        try { exitLiveTv(); } catch(e) {}
        break;
      }
    }
  }
};

// Update ONLY channels list
Navigation.updateChannelsOnly = function(selectedGenre) {
  var channelsHtml = Util.updateTvGuideChannels(selectedGenre, 0);
  var channelsList = document.getElementById('tvGuideChannelsList');
  if (channelsList) {
    channelsList.innerHTML = channelsHtml;
  }
  
  // Stay in genre focus mode
  presentPagedetails.tvGuideFocusMode = 'genre';
  presentPagedetails.lastChannelIndex = 0;
  
  setTimeout(function() {
    var channelList = document.getElementById('tvGuideChannelsList');
    if (channelList) {
      channelList.scrollTop = 0;
    }
  }, 50);
};

Navigation.closeTvGuide = function() {
  presentPagedetails.showingTvGuide = false;
  // DON'T reset focus mode - keep it for when we return
  
  macro('#mainContent').html('');
  macro('#mainContent').html(Util.lgLgTvGuideCurrentPlayingOverlay(
    presentPagedetails.lgLgChannelIdDetails,presentPagedetails.lgLgChannelMetaDetails
  ));
  macro('#mainContent').show();
  
  // FIXED: Hide overlay initially to prevent visible jump, then show in correct position
  var overlay = macro(".lg-tv-overlay");
  if (overlay.length) {
    // Step 1: Immediately hide overlay (invisible but positioned correctly)
    overlay.css({
      'opacity': '0',
      'bottom': '44px',
      'display': 'flex'
    });
    
    // Step 2: On next frame, make it visible (already in correct position)
    requestAnimationFrame(function() {
      overlay.css('opacity', '1');
      
      // Auto-hide after 10 seconds
      setTimeout(function () {
        if (overlay.is(':visible')) {
          overlay.animate({ bottom: "-300px" }, 1000, function () {
              overlay.css('display', 'none');
              overlay.css('bottom', '44px');
            }
          );
        }
      }, 10000);
    });
  }
};

// 🔥 REPLACE WITH THIS (in Main.lgLgChannelApiMetaData):
// Show overlay AFTER video starts playing (wait for media to initialize)
setTimeout(function() {
  var overlay = macro(".lg-tv-overlay");
  if (overlay.length) {
    overlay.css('display', 'flex'); // Show overlay
    overlay.css('bottom', '44px');
    
    // Auto-hide after 10 seconds
    setTimeout(function () {
      if (overlay.is(':visible')) {
        overlay.animate(
          { bottom: "-300px" },
          800,
          function () {
            overlay.css('display', 'none');
            overlay.css('bottom', '44px');
          }
        );
      }
    }, 10000);
  }
}, 2000); // Wait 2 seconds for video to start playing

Navigation.scrollChannelIntoViewInstant = function(channelIndex) {
  var channelRow = document.getElementById('tv-channel-row-' + channelIndex);
  var channelList = document.getElementById('tvGuideChannelsList');
  
  if (channelRow && channelList) {
    // Get all channel rows to check if this is the last one
    var allChannels = document.querySelectorAll('.tv-guide-channel-row');
    var totalChannels = allChannels.length;
    var isLastChannel = channelIndex === totalChannels - 1;
    var isSecondLastChannel = channelIndex === totalChannels - 2;
    
    // Calculate the exact scroll position to center the channel
    var rowTop = channelRow.offsetTop;
    var rowHeight = channelRow.offsetHeight;
    var listHeight = channelList.offsetHeight;
    
    // Center the channel in the visible area
    var scrollPosition = rowTop - (listHeight / 2) + (rowHeight / 2);
    
    // For last or second-last channel, add extra scroll to ensure full visibility
    if (isLastChannel) {
      scrollPosition += 60; // Extra scroll for last channel
    } else if (isSecondLastChannel) {
      scrollPosition += 30; // Extra scroll for second-last channel
    }
    
    // Temporarily disable CSS smooth scrolling for instant jump
    var originalScrollBehavior = channelList.style.scrollBehavior;
    channelList.style.scrollBehavior = 'auto';
    
    // INSTANT scroll with no animation - using scrollTop
    channelList.scrollTop = scrollPosition;
    
    // Restore original scroll behavior after instant scroll
    setTimeout(function() {
      channelList.style.scrollBehavior = originalScrollBehavior;
    }, 0);
    
    console.log('Instant scrolled to channel:', channelIndex, 'isLast:', isLastChannel, 'position:', scrollPosition);
  }
};


// Keep the smooth scroll function for arrow key navigation
Navigation.scrollChannelIntoView = function(channelIndex) {
  setTimeout(function() {
    var channelRow = document.getElementById('tv-channel-row-' + channelIndex);
    var channelList = document.getElementById('tvGuideChannelsList');
    
    if (channelRow && channelList) {
      // Get all channel rows to check if this is the last one
      var allChannels = document.querySelectorAll('.tv-guide-channel-row');
      var totalChannels = allChannels.length;
      var isLastChannel = channelIndex === totalChannels - 1;
      var isSecondLastChannel = channelIndex === totalChannels - 2;
      
      // Get positions
      var rowTop = channelRow.offsetTop;
      var rowHeight = channelRow.offsetHeight;
      var listHeight = channelList.offsetHeight;
      
      // Calculate scroll position to center the channel
      var scrollPosition = rowTop - (listHeight / 2) + (rowHeight / 2);
      
      // For last or second-last channel, add extra scroll to ensure full visibility
      if (isLastChannel) {
        scrollPosition += 60; // Extra scroll for last channel
      } else if (isSecondLastChannel) {
        scrollPosition += 30; // Extra scroll for second-last channel
      }
      
      // Smooth scroll to position
      channelList.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
      
      console.log('Scrolled to channel:', channelIndex, 'isLast:', isLastChannel);
    }
  }, 50);
};

Navigation.scrollGenreIntoView = function(genreIndex) {
  setTimeout(function() {
    var genreTab = document.getElementById('genre-tab-' + genreIndex);
    var genreContainer = document.querySelector('.tv-guide-genres');
    
    if (genreTab && genreContainer) {
      // Get all genre tabs to check if this is the last one
      var allGenres = document.querySelectorAll('.tv-guide-genre-tab');
      var totalGenres = allGenres.length;
      var isLastGenre = genreIndex === totalGenres - 1;
      var isSecondLastGenre = genreIndex === totalGenres - 2;
      
      // Get element positions
      var tabRect = genreTab.getBoundingClientRect();
      var containerRect = genreContainer.getBoundingClientRect();
      
      // Calculate scroll position to center the genre tab
      var tabCenter = tabRect.left + (tabRect.width / 2);
      var containerCenter = containerRect.left + (containerRect.width / 2);
      var scrollOffset = tabCenter - containerCenter;
      
      // For last or second-last genre, add extra scroll to ensure full visibility
      if (isLastGenre) {
        scrollOffset += 80; // Extra scroll for last genre
      } else if (isSecondLastGenre) {
        scrollOffset += 40; // Extra scroll for second-last genre
      }
      
      // Smooth scroll to position
      genreContainer.scrollBy({
        left: scrollOffset,
        behavior: 'smooth'
      });
      
      console.log('Scrolled to genre:', genreIndex, 'isLast:', isLastGenre);
    }
  }, 50);
};

// Play selected channel from TV guide
Navigation.playSelectedChannel = function(urlTemplate) {
  if (!urlTemplate) {
    console.error('No URL template provided');
    return;
  }

  console.log('playSelectedChannel called with URL:', urlTemplate);

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

  // Play final URL via HCAP
  function playFinalUrl(finalUrl) {
    if (!finalUrl) {
      console.error('Final URL is empty');
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
          // cleanup previous media
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
              console.error('hcap.Media.createMedia returned null');
              return;
            }
            window._currentHcapMedia = media;
            console.log('createMedia: success');

            // play
            media.play({
              onSuccess: function () {
                console.log('media.play success', finalUrl);
              },
              onFailure: function (f) {
                console.error('media.play failed:', f && f.errorMessage ? f.errorMessage : f);
                try { 
                  media.destroy({ 
                    onSuccess: function () { 
                      window._currentHcapMedia = null; 
                    }, 
                    onFailure: function () { 
                      window._currentHcapMedia = null; 
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

  // Gather HCAP properties and expand macros
  function gatherPropsAndPlay(urlTemplate) {
    var values = {};
    values.DEVICE_ID = '';
    values.DEVICE_MODEL = '';
    values.COUNTRY = '';
    values.APP_NAME = (typeof window.APP_NAME !== 'undefined') ? window.APP_NAME : 'MyApp';
    values.APP_VERSION = (typeof window.APP_VERSION !== 'undefined') ? window.APP_VERSION : '1.0.0';
    values.NONCE = (Math.random().toString(36).substr(2, 9));

    if (window.hcap && hcap.property && hcap.property.getProperty) {
      try {
        hcap.property.getProperty({
          key: 'serial_number',
          onSuccess: function (resp) {
            try { values.DEVICE_ID = resp && resp.value ? resp.value : ''; } catch (e) {}
            try {
              hcap.property.getProperty({
                key: 'model_name',
                onSuccess: function (r2) {
                  try { values.DEVICE_MODEL = r2 && r2.value ? r2.value : ''; } catch (e) {}
                  var final = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
                  console.log('Final URL ready', final);
                  playFinalUrl(final);
                },
                onFailure: function () {
                  var final2 = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
                  playFinalUrl(final2);
                }
              });
            } catch (err2) {
              var final3 = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
              playFinalUrl(final3);
            }
          },
          onFailure: function (f) {
            var fallback = buildMediaUrl(urlTemplate, values, { removeEmptyParams: true });
            playFinalUrl(fallback);
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

  gatherPropsAndPlay(urlTemplate);
};

// ========================================
// LIVE TV GUIDE NAVIGATION
// ========================================

Navigation.demoPlayers = function (event) {
  var keycode = (window.event) ? event.keyCode : event.which;
  
  if (presentPagedetails.showingLiveTvGuide === true) {
    
    // ===== CHANNEL LIST NAVIGATION MODE =====
    var focusedRow = macro('.live-channel-row-focused');
    var currentIndex = 0;
    
    if (focusedRow && focusedRow.length > 0) {
      var id = focusedRow.attr('id');
      if (id) {
        var parts = id.split('-');
        currentIndex = parseInt(parts[4], 10);
      }
    } else {
      macro('#live-tv-channel-row-0').addClass('live-channel-row-focused');
      presentPagedetails.lastLiveChannelIndex = 0;
      return;
    }
    
    // Remember last channel position
    presentPagedetails.lastLiveChannelIndex = currentIndex;
    
    var totalChannels = macro('.live-tv-guide-channel-row').length;
    
    switch (keycode) {
      
      case tvKeyCode.ArrowUp: {
        if (currentIndex > 0) {
          macro('.live-channel-row-focused').removeClass('live-channel-row-focused');
          macro('#live-tv-channel-row-' + (currentIndex - 1)).addClass('live-channel-row-focused');
          presentPagedetails.lastLiveChannelIndex = currentIndex - 1;
          Navigation.scrollLiveTvChannelIntoView(currentIndex - 1);
        }
        break;
      }
      
      case tvKeyCode.ArrowDown: {
        if (currentIndex < totalChannels - 1) {
          macro('.live-channel-row-focused').removeClass('live-channel-row-focused');
          macro('#live-tv-channel-row-' + (currentIndex + 1)).addClass('live-channel-row-focused');
          presentPagedetails.lastLiveChannelIndex = currentIndex + 1;
          Navigation.scrollLiveTvChannelIntoView(currentIndex + 1);
        }
        break;
      }
      
      case tvKeyCode.ArrowLeft:
      case tvKeyCode.ArrowRight: {
        break;
      }
      
      case tvKeyCode.Enter: {
        var selectedChannelRow = macro('#live-tv-channel-row-' + currentIndex);
        var channelUuid = selectedChannelRow.attr('data-channel-uuid');
        console.log('[Live TV Guide] Channel selected:', channelUuid, 'Index:', currentIndex);
        
        // SAVE EXACT POSITION
        presentPagedetails.savedLiveChannelIndex = currentIndex;
        
        // Find the selected channel in liveTvChannelIdDetails
        var selectedChannel = null;
        for (var i = 0; i < presentPagedetails.liveTvChannelIdDetails.length; i++) {
          if (String(presentPagedetails.liveTvChannelIdDetails[i].epg_id) === String(channelUuid)) {
            selectedChannel = presentPagedetails.liveTvChannelIdDetails[i];
            break;
          }
        }
        
        if (selectedChannel) {
          console.log('[Live TV Guide] Playing channel:', selectedChannel);
          
          // Store current channel uuid for overlay display
          presentPagedetails.currentLiveChannelId = channelUuid;
          
          // Play the selected channel (UDP)
          if (selectedChannel.lg_ch_url) {
            var chUrl = selectedChannel.lg_ch_url;

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
                  console.log('[Live TV] Successfully switched to channel');
                },
                onFailure: function (error) {
                  console.error("Failed to change channel via HCAP:", error);
                }
              })
            }

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
                  console.log('[Live TV] Successfully switched to RF channel:', majorNumber + '-' + minorNumber);
                },
                onFailure: function (error) {
                  console.error("[Live TV] Failed to change RF channel via HCAP:", error);
                }
              })
            }

            else if(/^\d+$/.test(chUrl)) {
              var logicalNumber = parseInt(chUrl);

              console.log('[Live TV] Detected RF channel class 1 format (logical number):', chUrl);
              console.log('[Live TV] Logical Channel Number:', logicalNumber);

              hcap.channel.requestChangeCurrentChannel({
                channelType: hcap.channel.ChannelType.RF,
                logicalNumber: logicalNumber,
                rfBroadcastType: hcap.channel.RfBroadcastType.CABLE,
                onSuccess: function () {
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
        } else {
          console.warn('[Live TV Guide] Channel not found for uuid:', channelUuid);
        }
        
        // Navigate to overlay
        Navigation.closeLiveTvGuide();
        break;
      }
      
      case tvKeyCode.Exit:
      case 8:
      case tvKeyCode.Return:
      case 10009: {
        Navigation.closeLiveTvGuide();
        break;
      }
    }
  } 
  // ===== OVERLAY MODE =====
  else {
    
    switch (keycode) {
      
      case tvKeyCode.ArrowUp:
      case tvKeyCode.ArrowDown: {
        console.log('[Live TV] Opening TV Guide from overlay');
        presentPagedetails.showingLiveTvGuide = true;
        
        // Use saved position or default to 0
        presentPagedetails.lastLiveChannelIndex = presentPagedetails.savedLiveChannelIndex || 0;
        
        macro('#mainContent').html('');
        macro('#mainContent').html(Util.liveTvGuideFullScreen(presentPagedetails.liveTvChannelIdDetails, presentPagedetails.liveTvChannelMetaDetails));
        macro('#mainContent').show();
        
        // Instant scroll to focused channel
        var channelIndex = presentPagedetails.lastLiveChannelIndex || 0;
        macro('#live-tv-channel-row-' + channelIndex).addClass('live-channel-row-focused');
        Navigation.scrollLiveTvChannelIntoViewInstant(channelIndex);
        break;
      }
      
      case tvKeyCode.ArrowLeft:
      case tvKeyCode.ArrowRight: {
        break;
      }
      
      case tvKeyCode.Enter: {
        var overlay = macro('.live-tv-overlay');
        if (overlay.length) {
          if (overlay.is(':visible')) {
            overlay.animate({ bottom: "-300px" }, 800, function() {
              overlay.css('display', 'none');
              overlay.css('bottom', '44px');
            });
          } else {
            overlay.css('display', 'flex');
            overlay.animate({ bottom: "44px" }, 800);
            setTimeout(function () {
              if (overlay.is(':visible')) {
                overlay.animate({ bottom: "-300px" }, 800, function () {
                    overlay.css('display', 'none');
                    overlay.css('bottom', '44px');
                  }
                );
              }
            }, 10000);
          }
        }
        break;
      }
      
      case tvKeyCode.Exit:
      case 8:
      case tvKeyCode.Return:
      case 10009: {
        try { 
          if (typeof stopAndClearMedia === 'function') {
            stopAndClearMedia(); 
          }
        } catch(e) {}

        // Stop any intervals
        try {
          if (Main.channelMetaRefreshInterval) {
            clearInterval(Main.channelMetaRefreshInterval);
            Main.channelMetaRefreshInterval = null;
          }
        } catch(e) {}
        
        // Clear current channel and navigate back
        try {
          presentPagedetails.currentLiveChannelId = undefined;
          presentPagedetails.showingLiveTvGuide = false;
          Main.previousPage();
        } catch(e) {}

        // Clean up overlays and UI elements
        try {
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

        try { exitLiveTv(); } catch(e) {}
        break;
      }
    }
  }
};

// Close Live TV Guide and return to overlay
Navigation.closeLiveTvGuide = function() {
  presentPagedetails.showingLiveTvGuide = false;
  
  macro('#mainContent').html('');
  macro('#mainContent').html(Util.liveTvGuideCurrentPlayingOverlay(
    presentPagedetails.liveTvChannelIdDetails, presentPagedetails.liveTvChannelMetaDetails
  ));
  macro('#mainContent').show();
  
  // FIXED: Hide overlay initially to prevent visible jump, then show in correct position
  var overlay = macro(".live-tv-overlay");
  if (overlay.length) {
    // Step 1: Immediately hide overlay (invisible but positioned correctly)
    overlay.css({
      'opacity': '0',
      'bottom': '44px',
      'display': 'flex'
    });
    
    // Step 2: On next frame, make it visible (already in correct position)
    requestAnimationFrame(function() {
      overlay.css('opacity', '1');
      
      // Auto-hide after 10 seconds
      setTimeout(function () {
        if (overlay.is(':visible')) {
          overlay.animate({ bottom: "-300px" }, 1000, function () {
              overlay.css('display', 'none');
              overlay.css('bottom', '44px');
            }
          );
        }
      }, 10000);
    });
  }
};

// Instant scroll for initial guide display
Navigation.scrollLiveTvChannelIntoViewInstant = function(channelIndex) {
  var channelRow = document.getElementById('live-tv-channel-row-' + channelIndex);
  var channelList = document.getElementById('liveTvGuideChannelsList');
  
  if (channelRow && channelList) {
    var allChannels = document.querySelectorAll('.live-tv-guide-channel-row');
    var totalChannels = allChannels.length;
    var isLastChannel = channelIndex === totalChannels - 1;
    var isSecondLastChannel = channelIndex === totalChannels - 2;
    
    var rowTop = channelRow.offsetTop;
    var rowHeight = channelRow.offsetHeight;
    var listHeight = channelList.offsetHeight;
    
    var scrollPosition = rowTop - (listHeight / 2) + (rowHeight / 2);
    
    if (isLastChannel) {
      scrollPosition += 60;
    } else if (isSecondLastChannel) {
      scrollPosition += 30;
    }
    
    var originalScrollBehavior = channelList.style.scrollBehavior;
    channelList.style.scrollBehavior = 'auto';
    channelList.scrollTop = scrollPosition;
    
    setTimeout(function() {
      channelList.style.scrollBehavior = originalScrollBehavior;
    }, 0);
  }
};

// Smooth scroll for arrow key navigation
Navigation.scrollLiveTvChannelIntoView = function(channelIndex) {
  setTimeout(function() {
    var channelRow = document.getElementById('live-tv-channel-row-' + channelIndex);
    var channelList = document.getElementById('liveTvGuideChannelsList');
    
    if (channelRow && channelList) {
      var allChannels = document.querySelectorAll('.live-tv-guide-channel-row');
      var totalChannels = allChannels.length;
      var isLastChannel = channelIndex === totalChannels - 1;
      var isSecondLastChannel = channelIndex === totalChannels - 2;
      
      var rowTop = channelRow.offsetTop;
      var rowHeight = channelRow.offsetHeight;
      var listHeight = channelList.offsetHeight;
      
      var scrollPosition = rowTop - (listHeight / 2) + (rowHeight / 2);
      
      if (isLastChannel) {
        scrollPosition += 60;
      } else if (isSecondLastChannel) {
        scrollPosition += 30;
      }
      
      channelList.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, 50);
};

function clearWarmSleepTimer() {
    try {
      if (warmSleepTimerId) {
        clearInterval(warmSleepTimerId);
        warmSleepTimerId = null;
      }
      warmSleepStartTs = null;
      try {
        // persist cleanup (safe if localStorage not available)
        localStorage.removeItem('gx_warmSleepStartTs');
      } catch (e) {
        console.log('localStorage removeItem failed (gx_warmSleepStartTs):', e);
      }
    } catch (e) {
      console.log('clearWarmSleepTimer error:', e);
    }
}
  
function startWarmSleepTimer() {
    // clear any existing timer first
    clearWarmSleepTimer();
  
    try {
      warmSleepStartTs = Date.now();
      try {
        localStorage.setItem('gx_warmSleepStartTs', String(warmSleepStartTs));
      } catch (e) {
        console.log('localStorage setItem failed (gx_warmSleepStartTs):', e);
      }
  
      // Check every 60 seconds instead of one huge 24h timeout
      warmSleepTimerId = setInterval(function () {
        if (!isWarmMode) {
          // no longer in warm mode → stop checking
          clearWarmSleepTimer();
          return;
        }
  
        var now = Date.now();
        if (warmSleepStartTs && (now - warmSleepStartTs) >= WARM_SLEEP_RESET_MS) {
          console.log('📆 24 hours in WARM reached — calling appStart()');
          clearWarmSleepTimer();
  
          try {
            appStart();
          } catch (e) {
            console.error('Error calling appStart() after 24h warm:', e);
          }
        }
      }, 60 * 1000); // every 1 minute
    } catch (e) {
      console.log('startWarmSleepTimer error:', e);
    }
}
  

Navigation.handlePowerKey = function() {
    // var info = getKeyCode(rawEvt || window.event);
    // var evt = info.evt;
    // try { evt.preventDefault && evt.preventDefault(); } catch (_) {}
  
    console.log("Global Power key pressed — handling warm/normal toggle...");
  
    if (!window.hcap || !hcap.power || !hcap.power.setPowerMode) {
      console.warn("hcap.power API not available on this device; cannot toggle warm mode.");
      return;
    }
  
    function stopPlaybackThen(next) {
      // (your existing stopCurrentChannel + HCAP_MODE_1 + mute logic)
      if (hcap.channel && typeof hcap.channel.stopCurrentChannel === 'function') {
        try {
          hcap.channel.stopCurrentChannel({
            onSuccess: function() {
              console.log("stopCurrentChannel success");
              if (hcap.mode && typeof hcap.mode.setHcapMode === 'function') {
                try {
                  hcap.mode.setHcapMode({
                    mode: hcap.mode.HCAP_MODE_1,
                    onSuccess: function() {
                      console.log("hcap.mode set to HCAP_MODE_1");
                      if (typeof next === 'function') next();
                    },
                    onFailure: function(f) {
                      console.warn("Failed to set HCAP_MODE_1:", f && f.errorMessage);
                      if (typeof next === 'function') next();
                    }
                  });
                } catch (e) {
                  console.warn("Exception calling hcap.mode.setHcapMode:", e);
                  if (typeof next === 'function') next();
                }
              } else {
                if (typeof next === 'function') next();
              }
            },
            onFailure: function(f) {
              console.warn("stopCurrentChannel failed:", f && f.errorMessage);
              if (hcap.mode && typeof hcap.mode.setHcapMode === 'function') {
                try {
                  hcap.mode.setHcapMode({
                    mode: hcap.mode.HCAP_MODE_1,
                    onSuccess: function() {
                      console.log("hcap.mode set to HCAP_MODE_1 (after stop failed)");
                      if (typeof next === 'function') next();
                    },
                    onFailure: function(ff) {
                      console.warn("Failed to set HCAP_MODE_1 (after stop failed):", ff && ff.errorMessage);
                      if (typeof next === 'function') next();
                    }
                  });
                } catch (e) {
                  console.warn("Exception calling hcap.mode.setHcapMode:", e);
                  if (typeof next === 'function') next();
                }
              } else {
                if (typeof next === 'function') next();
              }
            }
          });
          return;
        } catch (e) {
          console.warn("Exception calling stopCurrentChannel:", e);
        }
      }
  
      if (hcap.audio && typeof hcap.audio.setMute === 'function') {
        try {
          hcap.audio.setMute({
            mute: true,
            onSuccess: function() {
              console.log("hcap.audio.setMute(true) succeeded");
              if (typeof next === 'function') next();
            },
            onFailure: function(f) {
              console.warn("hcap.audio.setMute failed:", f && f.errorMessage);
              if (typeof next === 'function') next();
            }
          });
          return;
        } catch (e) {
          console.warn("Exception calling hcap.audio.setMute:", e);
        }
      }
  
      if (typeof next === 'function') next();
    }
  
    function unmuteIfPossible() {
      if (hcap.audio && typeof hcap.audio.setMute === 'function') {
        try {
          hcap.audio.setMute({
            mute: false,
            onSuccess: function(){ console.log("hcap.audio.setMute(false) success"); },
            onFailure: function(f){ console.warn("unmute failed:", f && f.errorMessage); }
          });
        } catch (e) {
          console.warn("Exception calling hcap.audio.setMute(false):", e);
        }
      }
    }
  
    try {
      hcap.power.getPowerMode({
        onSuccess: function(s) {
          var cur = s && s.mode;
  
          if (cur !== hcap.power.PowerMode.WARM) {
            // Going to WARM — stop playback first then set WARM
            stopPlaybackThen(function() {
              try {
                hcap.power.setPowerMode({
                  mode: hcap.power.PowerMode.WARM,
                  onSuccess: function() {
                    isWarmMode = true;
                    disableNavigation = true;
                    console.log("Switched to WARM mode (panel off, app still running)");
  
                    // 🔹 START 24h TIMER HERE
                    startWarmSleepTimer();
                  },
                  onFailure: function(f) {
                    console.error("Failed to set WARM mode:", f && f.errorMessage);
                  }
                });
              } catch (e) {
                console.error("Exception calling setPowerMode(WARM):", e);
              }
            });
          } else {
            // Currently WARM -> set NORMAL, then unmute/restore
            try {
              hcap.power.setPowerMode({
                mode: hcap.power.PowerMode.NORMAL,
                onSuccess: function() {
                  isWarmMode = false;
                  disableNavigation = false;
                  console.log("Switched back to NORMAL mode (panel + board on)");
  
                  // 🔹 CLEAR 24h TIMER HERE (because user came back before timeout)
                  clearWarmSleepTimer();
  
                  if (hcap.mode && typeof hcap.mode.setHcapMode === 'function' &&
                      typeof hcap.mode.HCAP_MODE_2 !== 'undefined') {
                    try {
                      hcap.mode.setHcapMode({
                        mode: hcap.mode.HCAP_MODE_1,
                        onSuccess: function(){},
                        onFailure: function(){}
                      });
                    } catch (e) {}
                  }

                  console.log("view inside------------------------------------------>", view)
  
                  unmuteIfPossible();
                  try { exitLiveTv(); } catch (e) { console.warn("exitLiveTv error after NORMAL:", e); }
                },
                onFailure: function(f) {
                  console.error("Failed to set NORMAL mode:", f && f.errorMessage);
                }
              });
            } catch (e) {
              console.error("Exception calling setPowerMode(NORMAL):", e);
            }
          }
        },
        onFailure: function(f) {
          console.warn("hcap.power.getPowerMode failed:", f && f.errorMessage);
          // fallback: attempt to stop playback then set WARM
          stopPlaybackThen(function() {
            try {
              hcap.power.setPowerMode({
                mode: hcap.power.PowerMode.WARM,
                onSuccess: function() {
                  isWarmMode = true;
                  disableNavigation = true;
                  console.log("Switched to WARM mode (panel off) [fallback]");
  
                  // 🔹 also start timer in fallback
                  startWarmSleepTimer();
                },
                onFailure: function(ff) {
                  console.error("Fallback set WARM failed:", ff && ff.errorMessage);
                }
              });
            } catch (e) {
              console.error("Exception trying fallback setPowerMode(WARM):", e);
            }
          });
        }
      });
    } catch (e) {
      console.error("Exception in handlePowerKey main try:", e);
    }
};