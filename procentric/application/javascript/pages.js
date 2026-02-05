var Util = {};

Util.splashHtml = function (loadingType) {
  var Text = "";
  var height, width;
  var resolution = macro(window).width();
  if (resolution == 1920) {
    width = 1920;
    height = 1080;
  } else if (resolution == 1280) {
    width = 1280;
    height = 720;
  }

  //background:url(images/splash.png); background-size:cover;backgfround-position:center center;
  Text += '<div class="splash_main">';
  if (loadingType == "video") {
    Text +=
      '<video id="introvideo" width="' +
      width +
      '" height="' +
      height +
      '" autoplay muted>';
    Text += '<source src="intro_video.mp4" type="video/mp4">';
    Text += "</video>";
    Text += "</div>";
  } else {
    Text += '<div class="splash">';
    Text += '<img src="images/logo on blue_1.png">';
    Text += "</div>";
  }
  return Text;
};

Util.downloadingPage = function (progress) {
  var Text = "";

  // Default progress to 0 if not provided
  progress = progress || 0;

  Text += '<div class="downloading-container">';
  Text += '<div id="lottie-background"></div>';
  Text += '  <div class="downloading-content">';

  // Logo
  Text += '    <div class="downloading-logo">';
  Text += '      <img src="images/logo on blue_1.png" alt="GuestXP Logo">';
  Text += "    </div>";

  // Main heading
  Text +=
    '    <h1 class="downloading-heading">Good things coming your way</h1>';

  // Subheading
  Text += '    <p class="downloading-subheading">Don\'t turn off your TV</p>';

  // Progress bar
  Text += '    <div class="downloading-progress-wrapper">';
  Text += '      <div class="downloading-progress-bar">';
  Text +=
    '        <div class="downloading-progress-fill" style="width: ' +
    progress +
    '%"></div>';
  Text += "      </div>";
  Text += "    </div>";

  // Progress text
  Text +=
    '    <p class="downloading-progress-text">Downloaded ' + progress + "%</p>";

  // Footer
  Text += '    <div class="downloading-footer">';
  Text +=
    '      <p class="downloading-powered">powered by <span class="powered-company">@ Macrotech Global</span></p>';
  Text += "    </div>";

  Text += "  </div>";
  Text += "</div>";

  return Text;
};

Util.activationHtml = function (deviceMac) {
  var Text = "";
  
  Text += '<div class="activation-container">';
  Text += '<div class="activation-content">';

  // Title
  Text += '<h2 class="activation-title">GuestXP Hotel TV platform</h2>';

  // Instruction text
  Text +=
    '<p class="activation-instruction">Scan this QR code from your GRE App To activate TV</p>';

  // QR Code container
  Text += '<div class="qr-wrapper">';
  Text += '<div id="qrImage" class="qr-code"></div>';
  Text += "</div>";

  // Device MAC address
  Text += '<p class="device-code">' + deviceMac + "</p>";

  // Refresh timer
  Text +=
    '<p class="refresh-timer" id="refreshTimer">Activation refresh in 5 seconds</p>';

  // Support text
  Text +=
    '<p class="support-text">If you see this screen or need support call 1.888.999.8212</p>';

  // Powered by footer
  Text += '<p class="powered-by">powered by @ Macrotech Global</p>';

  Text += "</div>";
  Text += "</div>";

  return Text;
};

Util.languageSelection = function () {
  var Text = "";
  var bgImage =
    Main.cachedBgBlobUrl ||
    (Main.templateApiData.menu_screen_bg &&
      Main.templateApiData.menu_screen_bg[0]) ||
    "/images/background_img.png";
  var logoImage = Main.cachedPropertyLogo || "/images/logo.png";

  Text += '<div class="language-container">';

  // Background image
  Text +=
    '<img src="' + bgImage + '" alt="Background" class="language-bg-image">';

  // Content overlay
  Text += '<div class="language-content">';

  // Hotel name at top
  // Text += '<div class="hotel-name">Best Western Plus Ottawa City Centre</div>';
  Text += '<div class="welcom-content-wrapper">';
  // Logo thumbnail on top
  Text += '  <div class="logo-welcome">';
  Text += '    <img src="' + logoImage + '" alt="Logo" class="home-logo">';
  Text += "  </div>";

  Text += '  <div class="buttons-welcome-container">';
  // Welcome text
  Text +=
    '<h1 class="language-welcome top_texts_welcom">Welcome Dear Guest</h1>';

  Text += '<div class="line"></div>';

  var languageList = Main.templateApiData.language_detail || [];
  languageList.sort(function (a, b) {
    return a.priority_order - b.priority_order;
  });

  // Language buttons container
  Text += '<div class="language-buttons">';
  for (var i = 0; i < languageList.length; i++) {
    var lang = languageList[i];
    if (!lang.is_active) continue;

    var iconkey = "langIcon_" + (lang.language_uuid || i);
    var iconUrl =
      (Main.cachedLanguageIcons && Main.cachedLanguageIcons[iconkey]) ||
      lang.icon ||
      lang.image ||
      "/images/default-icon.png";
    var name = lang.name ? lang.name.toUpperCase() : "UNKNOWN";
    var uuid = lang.language_uuid || "";

    Text += '<button class="language-btn" uuid="' + uuid + '" id="lang_btn-' + i + '">';
    Text += '<img src="' + iconUrl + '" alt="Flag" class="flag-icon">';
    Text += '<span class="lang-text">' + name + "</span>";
    Text += "</button>";
  }

  Text += "</div>";

  // Language selection text
  Text +=
    '<p class="language-subtitle select_lan">Please Select Your Language</p>';
  Text += "</div>";
  Text += "</div>";

  // Terms and conditions checkbox (static - not functional)
  Text += '<div class="terms-container-wrapper">';
  Text += '<div class="terms-container">';
  Text += '<div class="checkbox-wrapper">';
  Text += '<div class="checkbox-checked"></div>';
  Text += "</div>";
  Text +=
    '<p class="terms-text terms_cond">By clicking, you agree to our Terms & Conditions and Privacy Policy.</p>';
  Text += "</div>";
  Text += "</div>";

  // Footer text
  Text += '<div class="language-footer">';
  Text += '<p class="powered-text">powered by @ Macrotech Global '+appConfig.appVersion+'</p>';
  Text += "</div>";

  Text += "</div>";
  Text += "</div>";

  return Text;
};

Util.homePageHtml = function () {
  var bgImage = Main.getInitialHomeBackgroundUrl();
  var logoImage = Main.cachedPropertyLogo || "/images/logo.png";
  var languageShortCut = "";
  var languageIcon = "";
  var Text = "";

  for (var i = 0; i <= Main.templateApiData.language_detail.length; i++) {
    if (
      presentPagedetails.clickedLanguage ==
      Main.templateApiData.language_detail[i].language_uuid
    ) {
      languageShortCut = Main.templateApiData.language_detail[i].short_code;
      languageIcon = Main.templateApiData.language_detail[i].icon;
      break;
    }
  }

  Text += '<div class="home-container">';

  // Background Image
  Text += '<img src="' + bgImage + '" alt="Background" class="home-bg-image">';

  Text += '<div class="content-container">';
  // Header Section
  Text += '<div class="home-header">';

  // Logo thumbnail on left
  Text += '  <div class="logo-section">';
  Text += '    <img src="' + logoImage + '" alt="Logo" class="home-logo">';
  Text += "  </div>";

  Text += "  <div>";
  // Right side: Greeting + Room + Language
  Text += '  <div class="header-right">';
  Text += '    <span class="greeting">Hi, Dear ' + guestName + "</span>";
  Text +=
    '    <div class="room-number">' + Main.deviceProfile.room_number + "</div>";
  Text += '    <div id="lang_change_icon" class="language-selector">';
  Text +=
    '      <img src="' + languageIcon + '" alt="EN" class="flag-icon-header">';
  Text += '      <span class="lang-code">' + languageShortCut + "</span>";
  Text += "    </div>";
  Text += "  </div>";

  // Weather and Time Section
  Text += '<div class="time-weather-section">';
  Text += '  <div class="weather-info">';
  Text +=
    '    <img src="' +
    Main.weatherDetails.current.condition.icon +
    '" alt="Weather" class="weather-icon">';
  Text +=
    '    <span class="temperature">' +
    Main.weatherDetails.current.temp_c +
    "°C</span>";
  Text += "  </div>";
  Text += '  <div class="time-info">';
  Text += '    <div id="time_now" class="current-time"></div>';
  Text += '    <div id="date_now" class="current-date"></div>';
  Text += "  </div>";
  Text += "</div>";
  Text += "</div>";
  Text += "</div>";

  Text += "</div>";

  // App Grid Section - This will be populated by Navigation.homePageLoad
  Text += '<div class="app-grid-container">';
  Text += '  <div id="menu-inner" class="menu-inner">';
  // Menu items will be injected here by Navigation.homePageLoad
  Text += "  </div>";
  Text += "</div>";

  // Footer
  Text += '<div class="home-footer">';
  Text += '  <p class="footer-text">@MacrotechGlobal</p>';
  Text += "</div>";

  Text += "</div>";

  return Text;
};

Util.DevicesSwitchPage = function () {

  // // try hcap external input discovery
  // if(typeof hcap !== "undefined" && hcap.externalinput) {
  //   try {
  //     hcap.externalinput.getExternalInputList({
  //       onSuccess: function (s) {
  //         var connectedInputs = [];
  //         var pending = (s && s.list) ? s.list.length : 0;
  //         console.log("s------------->", s.list)
  //         if(pending === 0) return buildPage([]);

  //         s.list.forEach(function (input) {
  //           try {
  //             hcap.externalinput.isExternalInputConnected({
  //               type: input.type,
  //               index: input.index,
  //               onSuccess: function (res) {
  //                 if (res && res.isConnected) connectedInputs.push(input);
  //                 if(--pending === 0) buildPage(connectedInputs);
  //               },
  //               onFailure: function () {
  //                 if(--pending === 0) buildPage(connectedInputs)
  //               }
  //             })
  //           } catch (e) {
  //             if (--pending === 0) buildPage(connectedInputs)
  //           }
  //         });
  //       },
  //       onFailure: function () {
  //         buildPage([]);
  //       }
  //     })
  //   } catch (e) {
  //     buildPage([]);
  //   }
  // } else {
  //   var dummyInputs = [
  //     { name: "HDMI 1", type: "HDMI", index: 0 },
  //     { name: "HDMI 2", type: "HDMI", index: 1 }
  //   ];
  //   buildPage(dummyInputs, true);
  // }

  buildPage();

  // function buildPage(connectedInputs, isFallback) {
  function buildPage() {
    // connectedInputs = connectedInputs || [];

    //boxed panel width 1192 x 315 centered
    var Text = '';
    Text += '<div class="devicesContainer">';

    // background (full viewport) with dimmed bg image
    Text += '  <div class="background-image"><img src="images/hdmi_background.png" alt="Background" /></div>';

    // center panel that is the boxed area (1192 x 315)
    Text += '  <div class="device-panel">';
    Text += '    <div class="menu-title">Select Device</div>';
    Text += '    <div class="device-row">';

    // render discovered HDMI inputs (or placeholders)
    // var rendered = 0;
    // for(var i = 0; i < connectedInputs.length; i++){
    //   var input = connectedInputs[i];
    //   var label = input.name || ("HDMI " + (input.index + 1));
    //   var typeAttr = isFallback ? "HDMI" : input.type;
    //   var indexAttr = isFallback ? i : input.index;

    //   Text += '      <div class="device-card menu-btn card-type-hdmi" id="device-btn-' + rendered + '" data-action="input" data-type="' + typeAttr + '" data-index="' + indexAttr + '">';
    //   Text += '        <div class="device-icon"><img src="images/hdmi-port.png" alt="' + label + '" /></div>';
    //   Text += '        <div class="device-label">' + label + '</div>';
    //   Text += '      </div>';
    //   rendered++;
    // }

    // place Bluetooth then Restart so final row becomes exactly: [HDMI cards...] [Bluetooth] [Restart]
    // var bluetoothIndex = rendered;
    Text += '      <div class="device-card menu-btn card-type-bluetooth" id="device-btn-' + 0 + '" data-action="bluetooth">';
    Text += '        <div class="device-icon"><img src="images/bluetooth.png" alt="Bluetooth" /></div>';
    Text += '        <div class="device-label">Bluetooth</div>';
    Text += '      </div>';
    // rendered++;

    // var restartIndex = rendered;
    Text += '      <div class="device-card menu-btn card-type-restart" id="device-btn-' + 1 + '" data-action="restart">';
    Text += '        <div class="device-icon"><img src="images/restart.png" alt="Restart" /></div>';
    Text += '        <div class="device-label">Restart TV</div>';
    Text += '      </div>';
    // rendered++;

    Text += '    </div>'; // device-row
    Text += '  </div>';   // device-panel
    Text += '</div>'; // devicesContainer

    try { macro("#mainContent").html(Text); macro("#mainContent").show(); } catch (e) { console.warn('render devices failed', e); }

    // set initial focus on first visible device card
    try { macro('.imageFocus').removeClass('imageFocus'); macro("#device-btn-0").addClass('imageFocus'); } catch (e) {}

  }
}

Util.hdmiInputEmptyPage = function (){
  var Text = '';
  Text += '<div class="liveTvEmptyPage">';
  Text += '</div>';
  return Text;
}

Util.clearDataPage = function () {
    var Text = '';
    Text += '<div class="popupDiv">'
    Text += '<div class="clearData">'
    Text += '<img src="images/clearData.png" alt="Checkout Icon">'
    Text += '<h2>CLEAR CREDENTIAL</h2>'
    Text += '<p class="celarUpText">Press OK to manually clear your personal credentials for All streaming applications. Your credentials will also be Automatically cleared upon checkout.</p>'
    Text += '<p class="celarDownText">Netflix, Redbull, YouTube</p>'
    Text += '<div class="button-group">'
    Text += '<button class="checkout" id="popupBtn-0">CANCEL</button>'
    Text += '<button class="checkout" id="popupBtn-1">CLEAR & CHECKOUT</button>'
    Text += '<button class="checkout" id="popupBtn-2">CLEAR</button>'
    Text += '</div>'

    Text += '<div class="ending-text">Click BACK button to close</div>'
    Text += '</div>'
      Text += '</div>'
    return Text;
}

Util.showPopup = function () {
  if (Main.popupData) {
    var Text = '';
    Text += '<div class="popupDiv">'
    Text += '<div class="overlay-screen '+Main.popupData.popuptype +'">'
    Text += '<div class="popup-Title">'
    if(!!Main.popupData.headerTitle){
        Text += '<h4 class="popup-Header">' + Main.popupData.headerTitle + '</h4>'
    }
    if(!!Main.popupData.message){
    Text += '<p class="popup-subhead">' + Main.popupData.message + '</p>'
    }
    Text += '</div>'
    Text += '<div class="popup-btn-wrap ">'
    if (Main.popupData.buttonCount == 1) {
      Text += '<button id="popup-btn-1" class="btn-default popup-button" btnType="yes" > ' + Main.popupData.yesText + ' </button>'
    }
    else {
      Text += '<button id="popup-btn-1" class="btn-default popup-button mr70" btnType="yes" source="popupbtn"> ' + Main.popupData.yesText + ' </button>'
      Text += '<button id="popup-btn-2" class="btn-default popup-button " btnType="no" source="popupbtn"> ' + Main.popupData.noText + ' </button>'
    }
    Text += '</div>'
    Text += '</div>'
    Text += '</div>'

    return Text;
    }
}

Util.checkoutThankYouScreen = function() {
  var logoImage = Main.cachedPropertyLogo || '/images/logo.png';
  var Text = '';
  Text += '<div class="checkoutThankYouScreen">'
  Text += '<div class="brand">'
  Text += '<img src="'+logoImage+'" alt="logo">'
  Text += '</div>'

  Text += '<div class="title">Thank you for staying with us!</div>'
  Text += '<div class="subtitle">We hope to see you again soon!</div>'
  Text += '</div>'
  return Text;
}

Util.castingScreen = function () {

  var bgImage =
    Main.cachedBgBlobUrl ||
    (Main.templateApiData &&
      Main.templateApiData.menu_screen_bg &&
      Main.templateApiData.menu_screen_bg[0]) ||
    "/images/background_img.png";

  var logoImage =
    Main.cachedPropertyLogo ||
    "/images/logo.png";

  var weather =
    Main.weatherDetails && Main.weatherDetails.current
      ? Main.weatherDetails.current
      : null;
  
  /* NEW: WIFI SSID */
  var wifiSSID =
    Main.deviceProfile &&
    Main.deviceProfile.property_detail &&
    Main.deviceProfile.property_detail.guest_wifi_ssid
      ? Main.deviceProfile.property_detail.guest_wifi_ssid
      : "";

  /* NEW: ROOM NUMBER */
  var roomNumber =
    Main.deviceProfile && Main.deviceProfile.room_number
      ? Main.deviceProfile.room_number
      : "";
      

  var Text = "";

  /* ================= CONTAINER ================= */
  Text += '<div class="casting-container">';

  /* Background */
  Text += '<img src="' + bgImage + '" class="casting-bg">';

  /* Overlay */
  Text += '<div class="casting-overlay"></div>';

  /* ================= HEADER ================= */
  Text += '<div class="casting-header">';

  /* Logo (left) */
  Text += '<div class="casting-logo">';
  Text += '<img src="' + logoImage + '" alt="Logo">';
  Text += '</div>';

  /* Weather + Time + Date (right) */
  Text += '<div class="casting-info">';

  if (weather) {
    Text += '<div class="casting-weather">';
    Text += '<img src="' + weather.condition.icon + '" alt="Weather">';
    Text += '<span>' + weather.temp_c + '°C</span>';
    Text += '</div>';
  }

  Text += '<div id="time_now" class="casting-time"></div>';
  Text += '<div id="date_now" class="casting-date"></div>';

  Text += '</div>'; // casting-info
  Text += '</div>'; // casting-header

  /* ================= TITLE ================= */
  Text += '<h1 class="casting-title">Link Your Mobile for Chromecast Streaming</h1>';

  /* ================= CARDS ================= */
  Text += '<div class="casting-cards">';

  /* ---------- CARD 1 ---------- */
  Text += '<div class="casting-card card-wifi">';
  Text += '<div class="card-number">1</div>';
  Text += '<img src="images/wifi.png" alt="WiFi">';
  Text += '<p>Connect Wifi</p>';
  if (wifiSSID) {
    Text += '<span class="casting-subtext">' + wifiSSID + '</span>';
  }
  Text += '</div>';

  /* ---------- CARD 2 (QR) ---------- */
  Text += '<div class="casting-card card-qr">';
  Text += '<div class="card-number">2</div>';
  Text += '<div class="qr-wrapper">';
  Text += '<div id="castingQr" class="qr-code"></div>';
  Text += '</div>';
  Text += '<p>Scan Qr Code</p>';
  if (roomNumber) {
    Text += '<span class="casting-subtext">Room ' + roomNumber + '</span>';
  }
  Text += '</div>';

  /* ---------- CARD 3 ---------- */
  Text += '<div class="casting-card card-cast">';
  Text += '<div class="card-number">3</div>';
  Text += '<img src="images/casting.png" alt="Cast">';
  Text += '<p>Cast Now</p>';
  Text += '<span>Open any App<br>Tap on Cast icon to start</span>';
  Text += '</div>';

  Text += '</div>'; // casting-cards

  /* ================= FOOTER ================= */
  Text += '<div class="casting-footer">@ Macrotech Global</div>';

  Text += '</div>'; // casting-container

  return Text;
};

Util.errorCastingScreen = function () {

  var bgImage =
    Main.cachedBgBlobUrl ||
    (Main.templateApiData &&
      Main.templateApiData.menu_screen_bg &&
      Main.templateApiData.menu_screen_bg[0]) ||
    "/images/background_img.png";

  var logoImage =
    Main.cachedPropertyLogo ||
    "/images/logo.png";

  var weather =
    Main.weatherDetails && Main.weatherDetails.current
      ? Main.weatherDetails.current
      : null;
  
  /* NEW: WIFI SSID */
  var wifiSSID =
    Main.deviceProfile &&
    Main.deviceProfile.property_detail &&
    Main.deviceProfile.property_detail.guest_wifi_ssid
      ? Main.deviceProfile.property_detail.guest_wifi_ssid
      : "";
      

  var Text = "";

  /* ================= CONTAINER ================= */
  Text += '<div class="casting-container">';

  /* Background */
  Text += '<img src="' + bgImage + '" class="casting-bg">';

  /* Overlay */
  Text += '<div class="casting-overlay"></div>';

  /* ================= HEADER ================= */
  Text += '<div class="casting-header">';

  /* Logo (left) */
  Text += '<div class="casting-logo">';
  Text += '<img src="' + logoImage + '" alt="Logo">';
  Text += '</div>';

  /* Weather + Time + Date (right) */
  Text += '<div class="casting-info">';

  if (weather) {
    Text += '<div class="casting-weather">';
    Text += '<img src="' + weather.condition.icon + '" alt="Weather">';
    Text += '<span>' + weather.temp_c + '°C</span>';
    Text += '</div>';
  }

  Text += '<div id="time_now" class="casting-time"></div>';
  Text += '<div id="date_now" class="casting-date"></div>';

  Text += '</div>'; // casting-info
  Text += '</div>'; // casting-header

  /* ================= TITLE ================= */
  Text += '<h1 class="casting-title">Link Your Mobile for Chromecast Streaming</h1>';

  /* ================= CARDS ================= */
  Text += '<div class="casting-cards">';

  /* ---------- CARD 1 ---------- */
  Text += '<div class="casting-card card-wifi">';
  Text += '<div class="card-number">1</div>';
  Text += '<img src="images/wifi.png" alt="WiFi">';
  Text += '<p>Connect Wifi</p>';
  if (wifiSSID) {
    Text += '<span class="casting-subtext">' + wifiSSID + '</span>';
  }
  Text += '</div>';

  /* ---------- CARD 2 (QR) ---------- */
  Text += '<div class="casting-card card-qr">';
  Text += '<div class="card-number">2</div>';
  Text += '<div class="qr-wrapper">';
  Text += '<div id="castingQr" class="qr-code">';
  Text += '<img src="images/qr_error.png" id="qrImage" />'
  Text += '</div>';
  Text += '</div>';
  Text += '<p>Service unavailable</p>';
  Text += '</div>';

  /* ---------- CARD 3 ---------- */
  Text += '<div class="casting-card card-cast">';
  Text += '<div class="card-number">3</div>';
  Text += '<img src="images/casting.png" alt="Cast">';
  Text += '<p>Cast Now</p>';
  Text += '<span>Open any App<br>Tap on Cast icon to start</span>';
  Text += '</div>';

  Text += '</div>'; // casting-cards

  /* ================= FOOTER ================= */
  Text += '<div class="casting-footer">@ Macrotech Global</div>';

  Text += '</div>'; // casting-container

  return Text;
};

/*=====================================================
LG CHANNEL DATA SHOWS
===================================================== */
// NEW FUNCTION: Empty page with tuning text and overlay
Util.lgLgLiveTvEmptyPage = function (data, metadata) {
  var Text = '';
  Text += '<div class="lgLgliveTvEmptyPage">';
  Text += '<span class="lgChannel_tuningText" id="lgChannel_tuningText">LG Channels Tuning...</span>';
  Text += Util.lgLgTvGuideCurrentPlayingOverlay(data, metadata);
  Text += '</div>';
  return Text;
};

// TV GUIDE OVERLAY - BOTTOM INFO BAR
Util.lgLgTvGuideCurrentPlayingOverlay = function (channelData, metaData) {

  function toDateLocal(s) {
    if(!s) return null;
    return new Date(s.replace(' ', 'T'));
  }

  function cut(str) {
    if(!str) return '';
    return str.length > 48 ? str.substring(0, 48) + '...' : str;
  }

  function timeRange(start, end) {
    var s = toDateLocal(start), e = toDateLocal(end);
    if (!s || !e) return '';
    var opts = { hour: 'numeric', minute: '2-digit' };
    return s.toLocaleTimeString([], opts) + ' - ' + e.toLocaleTimeString([], opts);
  }

  // function minutesLeft(end) {
  //   var e = toDateLocal(end);
  //   if (!e) return '';
  //   var now = new Date();
  //   var mins = Math.ceil((e - now) / 60000);
  //   if (isNaN(mins)) return '';
  //   return Number(mins < 0 ? 0 : mins)
  // }

  function progressPercent(start, end) {
    var s = toDateLocal(start), e = toDateLocal(end);
    if(!s || !e) return 0;
    var now = new Date();
    var total = e - s;
    var elapsed = now - s;
    if(total <= 0) return 0;
    var percent = (elapsed / total) * 100;
    return Math.max(0, Math.min(100, percent));
  }

  var Text = "";

  // Use the currently selected channel index, or default to first channel


    console.log("presentPagedetails.currentChannelId--------------------->", presentPagedetails.currentChannelId);

    var channel = channelData[0];
    if(normalizeId(presentPagedetails.currentChannelId)){
      channel = channelData.find( function (ch) {
        return String(ch.channel_id) === String(normalizeId(presentPagedetails.currentChannelId));
      })
    }
  // Filter programs for this channel
  var channelEpgId = String(channel.channel_id);
  var channelPrograms = metaData.filter(function (m) {
      return String(m.channel_id) === channelEpgId;
  });

  // Sort programs by start time
  channelPrograms.sort(function (a, b) {
      var as = toDateLocal(a.start_time) ? toDateLocal(a.start_time).getTime() : 0;
      var bs = toDateLocal(b.start_time) ? toDateLocal(b.start_time).getTime() : 0;
      if (as !== bs) return as - bs;
      var ar = typeof a.rn === 'number' ? a.rn : 0;
      var br = typeof b.rn === 'number' ? b.rn : 0;
      return ar - br;
  });

  var current = channelPrograms[0] || null;
  var upcoming = channelPrograms[1] || null;

  var now = new Date();
  var opts = { year: 'numeric', month: '2-digit', day: '2-digit', 
               hour: '2-digit', minute: '2-digit', second: '2-digit' };
  var formattedNow = now.toLocaleString([], opts).replace(',', '');

  var upArrow = "images/angle_up.png";
  var downArrow = "images/angle_down.png";

  Text += '<div class="lg-tv-overlay">';
  Text += '<div class="lg-tv-left">';
  Text += '<img src="' + upArrow + '" class="lg-tv-arrow" alt="Up">';
  Text += '<div class="lg-tv-logo-container">';
  Text += '<img src="' + (channel.ch_icon_url || '') + '" class="lg-tv-logo" alt="Channel Logo">';
  Text += '</div>';
  Text += '<img src="' + downArrow + '" class="lg-tv-arrow" alt="Down">';
  Text += '</div>';
  Text += '<div class="lg-tv-right">';
  Text += '<div class="lg-tv-top">';
  Text += '<span class="lg-tv-channel">' + (channel.ch_name || '') + '</span>';
  Text += '<span class="lg-tv-datetime" id="lgTvDateTime"></span>';
  Text += '</div>';
  Text += '<div class="lg-tv-divider"></div>';
  Text += '<div class="lg-tv-row now-row">';
  Text += '<span class="tag now">Now</span>';
  if(current){
    Text += '<span class="time">' + timeRange(current.start_time, current.end_time) + '</span>';
    Text += '<span class="title">'+ cut(current.program_title || current.broadcast_title || '') +'</span>';
  }else{
    Text += '<span class="title">No schedule</span>';
  }
  
  Text += '</div>';
  Text += '<div class="lg-tv-progress">';
  if(current) {
    Text += '<div class="lg-tv-progress-fill" style="width:' + progressPercent(current.start_time, current.end_time) + '%"></div>';
  }else {
    Text += '<div class="lg-tv-progress-fill" style="width:' + 0 + '%"></div>';
  }
  Text += '</div>';
  Text += '<div class="lg-tv-row next">';
  Text += '<span class="tag">Next</span>';
  if(upcoming) {
      Text += '<span class="time">' + timeRange(upcoming.start_time, upcoming.end_time) + '</span>';
      Text += '<span class="title">' + cut(upcoming.program_title || upcoming.broadcast_title || '') + '</span>';
  }else{
    Text += '<span class="title"> No schedule </span>';
  }
  Text += '</div>';
  Text += '</div>';
  Text += '</div>';

  setInterval(function () {
    var d = new Date();
    var formatted =
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit'
      });

    var el = document.getElementById("lgTvDateTime");
    if (el) el.innerHTML = formatted;
  }, 1000);

  return Text;
};

// TV GUIDE
// RED BORDER ONLY ON NOW SECTION
// Transparent background with video visible
Util.lgTvGuideFullScreen = function (channelData, metaData) {
  var Text = "";

  function toDateLocal(s) {
    if(!s) return null;
    return new Date(s.replace(' ', 'T'));
  }

  function cut(str) {
    if(!str) return '';
    return str.length > 48 ? str.substring(0, 48) + '...' : str;
  }

  function timeRange(start, end) {
    var s = toDateLocal(start), e = toDateLocal(end);
    if (!s || !e) return '';
    var opts = { hour: 'numeric', minute: '2-digit' };
    return s.toLocaleTimeString([], opts) + ' - ' + e.toLocaleTimeString([], opts);
  }

  function progressline(end) {
    var e = toDateLocal(end);
    if (!e) return '';
    var now = new Date();
    var mins = Math.ceil((e - now) / 60000);
    if (isNaN(mins)) return '';
    return Number(mins < 0 ? 0 : mins)
  }

  function minutesLeft(end) {
    var e = toDateLocal(end);
    if (!e) return '';
    var now = new Date();
    var mins = Math.ceil((e - now) / 60000);
    return isNaN(mins) ? '' : (mins < 0 ? 0 : mins) + 'm left';
  }

  function getUniqueGenres(metadata) {
    var genresSet = new Set();
    metadata.forEach(function (item) {
        if (Array.isArray(item.genres)) {
            item.genres.forEach(function (g) {
                genresSet.add(g);
            });
        }
    });
    return Array.from(genresSet);
  }

  var uniqueGenres = getUniqueGenres(metaData);

  var genresWithAll = ["All"].concat(uniqueGenres);

  var selectedGenre = presentPagedetails.selectedGenre || "All";
  var lastChannelIndex = presentPagedetails.lastChannelIndex || 0;


  console.log("selectedGenre--------------------->", selectedGenre);
  
  var channels = [];
  if (selectedGenre === "All") {
    channels = metaData;
  } else {
    for (var i = 0; i < metaData.length; i++) {
      if (metaData[i].genres && metaData[i].genres.indexOf(selectedGenre) !== -1) {
        channels.push(metaData[i]);
      }
    }
  }

  console.log("channels--------------------->", channels);

  Text += '<div class="tv-guide-container">';
  Text += '<div class="tv-guide-header">';
  
  // Genre tabs row
  Text += '<div class="tv-guide-genres">';
  for (var i = 0; i < genresWithAll.length; i++) {
    var activeClass = genresWithAll[i] === selectedGenre ? " genre-active" : "";
    Text += '<button class="tv-guide-genre-tab' + activeClass + '" id="genre-tab-' + i + '" data-genre="' + genresWithAll[i] + '">' + genresWithAll[i] + '</button>';
  }
  Text += '</div>';

  // Column headers
  Text += '<div class="tv-guide-headers">';
  Text += '<div class="tv-guide-col-header">Channels</div>';
  Text += '<div class="tv-guide-col-header">Now</div>';
  Text += '<div class="tv-guide-col-header">Next</div>';
  Text += '</div>';
  
  Text += '</div>';

  // Channel list
  Text += '<div class="tv-guide-channels-list" id="tvGuideChannelsList">';

  if (channelData.length === 0) {
    Text += '<div class="tv-guide-no-channels"><p>No channels available for "' + selectedGenre + '" genre</p></div>';
  } else {
    var rowIndex = 0; // Separate counter for actual rendered rows
    for (var j = 0; j < channelData.length; j++) {
      var ch = channelData[j];
      var channelEpgId = String(ch.channel_id);

      var channelPrograms = channels.filter(function (m) {
        return String(m.channel_id) === channelEpgId;
      })

      if(channelPrograms.length === 0){
        continue;
      }

      // Sort programs by start time
      channelPrograms.sort(function (a, b) {
          var as = toDateLocal(a.start_time) ? toDateLocal(a.start_time).getTime() : 0;
          var bs = toDateLocal(b.start_time) ? toDateLocal(b.start_time).getTime() : 0;
          if (as !== bs) return as - bs;
          var ar = typeof a.rn === 'number' ? a.rn : 0;
          var br = typeof b.rn === 'number' ? b.rn : 0;
          return ar - br;
      });

      var Now = channelPrograms[0] || null;
      var Next = channelPrograms[1] || null;


      
      // ONLY add focus if we're in channel mode AND it's the remembered channel
      var focusClass = "";
      if (presentPagedetails.tvGuideFocusMode === 'channel' && rowIndex === lastChannelIndex) {
        focusClass = " channel-row-focused";
      }

      var shortTitle = (ch.ch_name || '').length > 16 ? (ch.ch_name || '').substring(0, 16) + '...' : (ch.ch_name || '');
      
      // Use rowIndex instead of j for sequential IDs
      Text += '<div class="tv-guide-channel-row' + focusClass + '" id="tv-channel-row-' + rowIndex + '" data-channel-id="' + ch.channel_id + '" data-channel-index="' + rowIndex + '">';
      Text += '<div class="tv-guide-channel-cell"><div class="channel-logo-box"><img src="' + ch.ch_icon_url + '" alt="' + ch.ch_name + '" class="channel-logo-img"></div><div class="channel-name-text">' + shortTitle + '</div></div>';
      if(Now){
        Text += '<div class="tv-guide-now-cell"><div class="now-show-title">' + cut(Now.program_title || Now.broadcast_title || '') + '</div><div class="now-time-badge">' + minutesLeft(Now.end_time) + '</div><div class="now-progress-bar"><div class="now-progress-fill" style="width: ' + progressline(Now.end_time) + '%"></div></div></div>';
      }else {
        Text += '<div class="tv-guide-now-cell"><div class="now-show-title">' + shortTitle + '</div><div class="now-progress-bar"><div class="now-progress-fill" style="width: ' + 0 + '%"></div></div></div>';
      }

      if(Next){
        Text += '<div class="tv-guide-next-cell"><div class="next-show-title">' + cut(Next.program_title || Next.broadcast_title || '') + '</div><div class="next-show-time">' + timeRange(Next.start_time, Next.end_time) + '</div></div>';
      }else {
        Text += '<div class="tv-guide-next-cell"><div class="next-show-title">' + shortTitle + '</div></div>';
      }

      Text += '</div>';
      rowIndex++; // Increment only when we actually add a row
    }
  }

  Text += '</div></div>';
  return Text;
};

Util.updateTvGuideChannels = function(selectedGenre, focusIndex) {

  function toDateLocal(s) {
    if(!s) return null;
    return new Date(s.replace(' ', 'T'));
  }

  function cut(str) {
    if(!str) return '';
    return str.length > 48 ? str.substring(0, 48) + '...' : str;
  }

  function timeRange(start, end) {
    var s = toDateLocal(start), e = toDateLocal(end);
    if (!s || !e) return '';
    var opts = { hour: 'numeric', minute: '2-digit' };
    return s.toLocaleTimeString([], opts) + ' - ' + e.toLocaleTimeString([], opts);
  }

  function progressline(end) {
    var e = toDateLocal(end);
    if (!e) return '';
    var now = new Date();
    var mins = Math.ceil((e - now) / 60000);
    if (isNaN(mins)) return '';
    return Number(mins < 0 ? 0 : mins)
  }

  function minutesLeft(end) {
    var e = toDateLocal(end);
    if (!e) return '';
    var now = new Date();
    var mins = Math.ceil((e - now) / 60000);
    return isNaN(mins) ? '' : (mins < 0 ? 0 : mins) + 'm left';
  }

  var channels = [];

  console.log("selectedGenre----------------->Updated", selectedGenre);
  
  if (selectedGenre === "All") {
    channels = presentPagedetails.lgLgChannelMetaDetails;
  } else {
    for (var i = 0; i < presentPagedetails.lgLgChannelMetaDetails.length; i++) {
      if (presentPagedetails.lgLgChannelMetaDetails[i].genres && presentPagedetails.lgLgChannelMetaDetails[i].genres.indexOf(selectedGenre) !== -1) {
        channels.push(presentPagedetails.lgLgChannelMetaDetails[i]);
      }
    }
  }

  console.log("filtered channels----------------->", channels);

  var Text = "";
  if (presentPagedetails.lgLgChannelIdDetails.length === 0) {
    Text += '<div class="tv-guide-no-channels"><p>No channels available for "' + selectedGenre + '" genre</p></div>';
  } else {
    var rowIndex = 0; // Separate counter for actual rendered rows
    for (var j = 0; j < presentPagedetails.lgLgChannelIdDetails.length; j++) {
      var ch = presentPagedetails.lgLgChannelIdDetails[j];
      var channelEpgId = String(ch.channel_id);

      var channelPrograms = channels.filter(function (m) {
        return String(m.channel_id) === channelEpgId;
      })

      if (channelPrograms.length === 0) {
        continue; // Skip channels with no programs
      }

      console.log("channelPrograms before sort----------------->", channelPrograms);

      // Sort programs by start time
      channelPrograms.sort(function (a, b) {
          var as = toDateLocal(a.start_time) ? toDateLocal(a.start_time).getTime() : 0;
          var bs = toDateLocal(b.start_time) ? toDateLocal(b.start_time).getTime() : 0;
          if (as !== bs) return as - bs;
          var ar = typeof a.rn === 'number' ? a.rn : 0;
          var br = typeof b.rn === 'number' ? b.rn : 0;
          return ar - br;
      });

      console.log("channelPrograms----------------->", channelPrograms);

      var Now = channelPrograms[0] || null;
      var Next = channelPrograms[1] || null;

      var shortTitle = (ch.ch_name || '').length > 16 ? (ch.ch_name || '').substring(0, 16) + '...' : (ch.ch_name || '');
      
      // NO focus class when updating after genre selection
      var focusClass = "";
      
      // Use rowIndex instead of j for sequential IDs
      Text += '<div class="tv-guide-channel-row' + focusClass + '" id="tv-channel-row-' + rowIndex + '" data-channel-id="' + ch.channel_id + '" data-channel-index="' + rowIndex + '">';
      Text += '<div class="tv-guide-channel-cell"><div class="channel-logo-box"><img src="' + ch.ch_icon_url + '" alt="' + ch.ch_name + '" class="channel-logo-img"></div><div class="channel-name-text">' + ch.ch_name + '</div></div>';
      if(Now){
        Text += '<div class="tv-guide-now-cell"><div class="now-show-title">' + cut(Now.program_title || Now.broadcast_title || '') + '</div><div class="now-time-badge">' + minutesLeft(Now.end_time) + '</div><div class="now-progress-bar"><div class="now-progress-fill" style="width: ' + progressline(Now.end_time) + '%"></div></div></div>';
      }else {
        Text += '<div class="tv-guide-now-cell"><div class="now-show-title">' + shortTitle + '</div><div class="now-progress-bar"><div class="now-progress-fill" style="width: ' + 0 + '%"></div></div></div>';
      }

      if(Next){
        Text += '<div class="tv-guide-next-cell"><div class="next-show-title">' + cut(Next.program_title || Next.broadcast_title || '') + '</div><div class="next-show-time">' + timeRange(Next.start_time, Next.end_time) + '</div></div>';
      }else {
        Text += '<div class="tv-guide-next-cell"><div class="next-show-title">' + shortTitle + '</div></div>';
      }

      Text += '</div>';
      rowIndex++; // Increment only when we actually add a row
    }
  }
  return Text;
};

/*=====================================================
LIVE TV CHANNEL DATA SHOWS
===================================================== */

// LIVE TV EMPTY PAGE - Initial loading page
Util.liveTvEmptyPage = function (data, metadata) {
  var Text = '';
  Text += '<div class="liveTvEmptyPage">';
  Text += '<span class="liveChannel_tuningText" id="liveChannel_tuningText">Live TV Tuning...</span>';
  Text += Util.liveTvGuideCurrentPlayingOverlay(data, metadata);
  Text += '</div>';
  return Text;
};

// LIVE TV OVERLAY - BOTTOM INFO BAR (Similar to LG Channels)
Util.liveTvGuideCurrentPlayingOverlay = function (channelData, metaData) {

  function toDateLocal(s) {
    if(!s) return null;
    return new Date(s.replace(' ', 'T'));
  }

  function cut(str) {
    if(!str) return '';
    return str.length > 48 ? str.substring(0, 48) + '...' : str;
  }

  function timeRange(start, end) {
    var s = toDateLocal(start), e = toDateLocal(end);
    if (!s || !e) return '';
    var opts = { hour: 'numeric', minute: '2-digit' };
    return s.toLocaleTimeString([], opts) + ' - ' + e.toLocaleTimeString([], opts);
  }

  // function minutesLeft(end) {
  //   var e = toDateLocal(end);
  //   if (!e) return '';
  //   var now = new Date();
  //   var mins = Math.ceil((e - now) / 60000);
  //   if (isNaN(mins)) return '';
  //   return Number(mins < 0 ? 0 : mins)
  // }

  function progressPercent(start, end) {
    var s = toDateLocal(start), e = toDateLocal(end);
    if(!s || !e) return 0;
    var now = new Date();
    var total = e - s;
    var elapsed = now - s;
    if(total <= 0) return 0;
    var percent = (elapsed / total) * 100;
    return Math.max(0, Math.min(100, percent));
  }

  var Text = "";

  var channel = channelData[0];
  console.log("channelData--------------------->", channelData);
  console.log("channel before selection--------------------->", channel);
  console.log("presentPagedetails.currentLiveChannelId--------------------->", presentPagedetails.currentLiveChannelId);
  if( normalizeId(presentPagedetails.currentLiveChannelId)) {
    console.log("called----------->")
    channel = channelData.find( function (ch) {
      return String(ch.epg_id) === String(normalizeId(presentPagedetails.currentLiveChannelId));
    })
  }
  console.log("Selected channel for overlay--------------------->", channel);
  var defaultIcon = setDefaultIconForChannels(Main.homePageData, "LIVETV")

  // Filter programs for this channel
  var channelEpgId = String(channel.epg_id);
  var channelPrograms = metaData.filter(function (m) {
    return String(m.channel_epg_id) === channelEpgId;
  });

  // Sort programs by start time
  channelPrograms.sort(function (a, b) {
    var as = toDateLocal(a.start_time) ? toDateLocal(a.start_time).getTime() : 0;
    var bs = toDateLocal(b.start_time) ? toDateLocal(b.start_time).getTime() : 0;
    if (as !== bs) return as - bs;
    var ar = typeof a.rn === 'number' ? a.rn : 0;
    var br = typeof b.rn === 'number' ? b.rn : 0;
    return ar - br;
  });

  console.log("channelPrograms for overlay--------------------->", channelPrograms);

  var current = channelPrograms[0] || null;
  var upcoming = channelPrograms[1] || null;

  console.log("current program for overlay--------------------->", current);
  console.log("upcoming program for overlay--------------------->", upcoming);

  var upArrow = "images/angle_up.png";
  var downArrow = "images/angle_down.png";

  Text += '<div class="live-tv-overlay">';
  Text += '<div class="live-tv-left">';
  Text += '<img src="' + upArrow + '" class="live-tv-arrow" alt="Up">';
  Text += '<div class="lg-tv-logo-container">';
  Text += '<img src="' + (channel.icon || '') + '" class="live-tv-logo" onerror="this.src = macro(this).attr(\'altSrc\')" altSrc="'+ defaultIcon.icon + '">';
  Text += '</div>';
  Text += '<img src="' + downArrow + '" class="live-tv-arrow" alt="Down">';
  Text += '</div>';
  Text += '<div class="live-tv-right">';
  Text += '<div class="live-tv-top">';
  Text += '<span class="live-tv-channel">' + (channel.name || channel.title || '') + '</span>';
  Text += '<span class="live-tv-datetime" id="liveTvDateTime"></span>';
  Text += '</div>';
  Text += '<div class="live-tv-divider"></div>';
  Text += '<div class="live-tv-row now-row">';
  Text += '<span class="tag now">Now</span>';
  if(current){
    Text += '<span class="time">' + timeRange(current.start_time, current.end_time) + '</span>';
    Text += '<span class="title">'+ cut(current.program_title || current.broadcast_title || '') +'</span>';
  }else{
    Text += '<span class="title">No schedule</span>';
  }
  
  Text += '</div>';
  Text += '<div class="live-tv-progress">';
  if(current){
    Text += '<div class="live-tv-progress-fill" style="width:' + progressPercent(current.start_time, current.end_time) + '%"></div>';
  }else {
    Text += '<div class="live-tv-progress-fill" style="width:' + 0 + '%"></div>';
  }
  Text += '</div>';
  Text += '<div class="live-tv-row next">';
  Text += '<span class="tag">Next</span>';
  if(upcoming) {
    Text += '<span class="time">' + timeRange(upcoming.start_time, upcoming.end_time) + '</span>';
    Text += '<span class="title">' + cut(upcoming.program_title || upcoming.broadcast_title || '') + '</span>';
  }else{
    Text += '<span class="title"> No schedule </span>';
  }
  Text += '</div>';
  Text += '</div>';
  Text += '</div>';

  setInterval(function () {
    var d = new Date();
    var formatted =
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit'
      });

    var el = document.getElementById("liveTvDateTime");
    if (el) el.innerHTML = formatted;
  }, 1000);

  return Text;
};

// LIVE TV GUIDE - FULL SCREEN (NO GENRE FILTERING)
Util.liveTvGuideFullScreen = function (channelData, metaData) {
  var Text = "";

  function toDateLocal(s) {
    if(!s) return null;
    return new Date(s.replace(' ', 'T'));
  }

  function cut(str) {
    if(!str) return '';
    return str.length > 48 ? str.substring(0, 48) + '...' : str;
  }

  function timeRange(start, end) {
    var s = toDateLocal(start), e = toDateLocal(end);
    if (!s || !e) return '';
    var opts = { hour: 'numeric', minute: '2-digit' };
    return s.toLocaleTimeString([], opts) + ' - ' + e.toLocaleTimeString([], opts);
  }

  function progressline(end) {
    var e = toDateLocal(end);
    if (!e) return '';
    var now = new Date();
    var mins = Math.ceil((e - now) / 60000);
    if (isNaN(mins)) return '';
    return Number(mins < 0 ? 0 : mins)
  }

  function minutesLeft(end) {
    var e = toDateLocal(end);
    if (!e) return '';
    var now = new Date();
    var mins = Math.ceil((e - now) / 60000);
    return isNaN(mins) ? '' : (mins < 0 ? 0 : mins) + 'm left';
  }

  var lastChannelIndex = presentPagedetails.lastLiveChannelIndex || 0;
  var defaultIcon = setDefaultIconForChannels(Main.homePageData, "LIVETV")
  console.log("defaultIcon---------------------->", defaultIcon)

  Text += '<div class="live-tv-guide-container">';
  
  // Header with current time and title
  Text += '<div class="live-tv-guide-header">';
  Text += '<div class="live-tv-guide-time">Current time: <span id="liveGuideCurrentTime"></span></div>';
  Text += '<div class="live-tv-guide-title">Macrotech Guestxp TV Guide</div>';
  Text += '<div class="live-tv-guide-close">Press Back to close <img src="images/undo.png" alt="Back" class="back-icon" /></div>';
  Text += '</div>';

  // Column headers
  Text += '<div class="live-tv-guide-headers">';
  Text += '<div class="live-tv-guide-col-header">Channels</div>';
  Text += '<div class="live-tv-guide-col-header">Now</div>';
  Text += '<div class="live-tv-guide-col-header">Next</div>';
  Text += '</div>';
  
  // Channel list
  Text += '<div class="live-tv-guide-channels-list" id="liveTvGuideChannelsList">';

  if (channelData.length === 0) {
    Text += '<div class="live-tv-guide-no-channels"><p>No channels available</p></div>';
  } else {
    for (var j = 0; j < channelData.length; j++) {
      var ch = channelData[j];
      var channelEpgId = String(ch.epg_id);

      var channelPrograms = metaData.filter(function (m) {
        return String(m.channel_epg_id) === channelEpgId;
      });

      // Sort programs by start time
      channelPrograms.sort(function (a, b) {
        var as = toDateLocal(a.start_time) ? toDateLocal(a.start_time).getTime() : 0;
        var bs = toDateLocal(b.start_time) ? toDateLocal(b.start_time).getTime() : 0;
        if (as !== bs) return as - bs;
        var ar = typeof a.rn === 'number' ? a.rn : 0;
        var br = typeof b.rn === 'number' ? b.rn : 0;
        return ar - br;
      });

      var Now = channelPrograms[0] || null;
      var Next = channelPrograms[1] || null;

      // Add focus if this is the remembered channel
      var focusClass = "";
      if (j === lastChannelIndex) {
        focusClass = " live-channel-row-focused";
      }

      var shortTitle = (ch.title || ch.name || '').length > 16 ? (ch.title || ch.name || '').substring(0, 16) + '...' : (ch.title || ch.name || '');
      
      Text += '<div class="live-tv-guide-channel-row' + focusClass + '" id="live-tv-channel-row-' + j + '" data-channel-uuid="' + ch.epg_id + '" data-channel-index="' + j + '">';
      Text += '<div class="live-tv-guide-channel-cell"><div class="live-channel-logo-box"><img src="' + ch.icon + '" onerror="this.src = macro(this).attr(\'altSrc\')" altSrc="'+ defaultIcon.icon + '" class="live-channel-logo-img"></div><div class="live-channel-name-text">' + shortTitle + '</div></div>';
      
      if(Now){
        Text += '<div class="live-tv-guide-now-cell"><div class="live-now-show-title">' + cut(Now.program_title || Now.broadcast_title || '') + '</div><div class="live-now-time-badge">' + minutesLeft(Now.end_time) + '</div><div class="live-now-progress-bar"><div class="live-now-progress-fill" style="width: ' + progressline(Now.end_time) + '%"></div></div></div>';
      }else {
        Text += '<div class="live-tv-guide-now-cell"><div class="live-now-show-title">' + shortTitle + '</div><div class="live-now-progress-bar"><div class="live-now-progress-fill" style="width: ' + 0 + '%"></div></div></div>';
      }

      if(Next){
        Text += '<div class="live-tv-guide-next-cell"><div class="live-next-show-title">' + cut(Next.program_title || Next.broadcast_title || '') + '</div><div class="live-next-show-time">' + timeRange(Next.start_time, Next.end_time) + '</div></div>';
      }else {
        Text += '<div class="live-tv-guide-next-cell"><div class="live-next-show-title">' + shortTitle + '</div></div>';
      }

      Text += '</div>';
    }
  }

  Text += '</div></div>';

  // Update current time every second
  setTimeout(function() {
    setInterval(function () {
      var d = new Date();
      var formatted = d.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
      var el = document.getElementById("liveGuideCurrentTime");
      if (el) el.innerHTML = formatted;
    }, 1000);
  }, 100);

  return Text;
};

/**
 * ====================================================================
 * ENHANCED UTIL.OURHOTELPAGE
 * Includes automatic navigation initialization
 * Add this to your pages.js file, replacing the existing Util.ourHotelPage
 * ====================================================================
 */

Util.ourHotelPage = function () {
    var html = '';
    
    // 🔥 FIX: Use pixel values and add flexbox centering for overscan compensation
    html += '<div id="our-hotel-container" style="position:fixed; top:0; left:0; width:' + window.innerWidth + 'px; height:' + window.innerHeight + 'px; background:#000; z-index:1000; margin:0; padding:0; overflow:hidden; display:flex; align-items:center; justify-content:center;">';
    html += '  <canvas id="templateCanvas" style="display:block; position:absolute; top:0; left:0;"></canvas>';
    html += '</div>';

    // Render canvas after DOM is fully ready
    setTimeout(function() {
        try {
            console.log('[OurHotel] Starting canvas render...');
            
            // Clean up any existing overlays from previous visits
            if (typeof CanvasRss !== 'undefined' && CanvasRss.cleanup) {
                CanvasRss.cleanup();
            }
            if (typeof CanvasTicker !== 'undefined' && CanvasTicker.cleanup) {
                CanvasTicker.cleanup();
            }
            if (typeof CanvasGif !== 'undefined' && CanvasGif.cleanup) {
                CanvasGif.cleanup();
            }
            if (typeof CanvasSlideshow !== 'undefined' && CanvasSlideshow.cleanup) {
                CanvasSlideshow.cleanup();
            }
            if (typeof CanvasAction !== 'undefined' && CanvasAction.cleanup) {
                CanvasAction.cleanup();
            }
            
            // Render the canvas
            if (typeof renderTemplateCanvas !== 'undefined') {
                renderTemplateCanvas();
            } else if (typeof CanvasRenderer !== 'undefined' && CanvasRenderer.render) {
                CanvasRenderer.render();
            }

            // ✅ Hide loading after canvas render completes
            setTimeout(function() {
                hideLoadingPopup();
                console.log('[OurHotel] ✅ Loading hidden - canvas fully rendered');
            }, 500);

            // Start animation loop for live updates (clocks, etc.)
            console.log('[OurHotel] Starting animation loop for live clock updates...');
            if (typeof CanvasRenderer !== 'undefined' && CanvasRenderer.startAnimationLoop) {
                CanvasRenderer.startAnimationLoop();
                console.log('[OurHotel] ✅ Animation loop started!');
            }

            // Initialize navigation for action buttons
            console.log('[OurHotel] Initializing action navigation...');
            if (typeof Navigation !== 'undefined' && Navigation.initializeOurHotelNavigation) {
                Navigation.initializeOurHotelNavigation();
                console.log('[OurHotel] ✅ Navigation initialized!');
            } else if (typeof CanvasAction !== 'undefined' && CanvasAction.initializeNavigation) {
                setTimeout(function() {
                    if (Main.jsonTemplateData && 
                        Main.jsonTemplateData.template_json &&
                        Main.jsonTemplateData.template_json.elements) {
                        
                        CanvasAction.initializeNavigation(Main.jsonTemplateData.template_json.elements);
                        
                        if (typeof CanvasRenderer !== 'undefined' && CanvasRenderer.refresh) {
                            CanvasRenderer.refresh();
                        }
                    }
                }, 500);
            }
            
        } catch (e) {
            console.error('[OurHotel] Canvas render failed:', e);
            hideLoadingPopup();
            
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
    }, 150);

    return html;
};