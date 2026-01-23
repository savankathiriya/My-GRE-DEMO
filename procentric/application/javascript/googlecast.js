/**
 * Simple Google Cast for FuboTV - Direct Implementation
 * Handles all 3 Google Cast app IDs
 */

// ============================================================================
// GOOGLE CAST APP IDS
// ============================================================================

var GOOGLE_CAST_APP_IDS = [
  "com.webos.chromecast",                        // Cast Service
  "com.webos.app.commercial.chromecastguide",   // Cast Guide
  "com.webos.chromecast-settings"               // Cast Settings
];

// ============================================================================
// GOOGLE CAST FUNCTIONS
// ============================================================================

/**
 * Register Google Cast Token
 */
Main.registerGoogleCastToken = function() {
  // ⚠️ REPLACE WITH YOUR ACTUAL TOKEN
  var token = "gcTZrTrQyTktcGl1H7onXt0xyt7lXK/9eG17OhSqLgdIwjP2Dm+6ok2u5Cu65/8TWZvOIHL6Auh8WKaM1gGB5evANHyAR9EeJALO3UlUsLtzRZsGvcBOYK1EaAYAvBDELAoG7xR5txoFL7FbT+cGOldUSMRxl2d9kAczGIiebz+zrfWGMjJdwnW8clLmwuA0VGDj+m5Y0F9nDfnHAjT4rcq2+SGxKZCuwz/91nLGOvu5hUS+jJ4InOEKpuNZvYVbIb7Z83xep41VLifnmMZNaTD8iXdUH0c7XO0FKQNUNskG3zwp8UiFtGy+2ISMmYYDSauxyrRY4iY03L9x1HMriw==";
  
  idcap.request("idcap://application/register", {
    parameters: {
      tokenList: [{ id: "com.webos.chromecast", token: token }]
    },
    onSuccess: function() {
      console.log("[Google Cast] Token registered successfully");
    },
    onFailure: function(err) {
      console.error("[Google Cast] Token registration failed: " + err.errorMessage);
    }
  });
};

/**
 * Check if Google Cast apps are installed
 */
Main.checkGoogleCastInstalled = function(callback) {
  idcap.request("idcap://application/list", {
    parameters: { extraInfo: true },
    onSuccess: function(result) {
      var installedApps = {
        service: false,    // com.webos.chromecast
        guide: false,      // com.webos.app.commercial.chromecastguide
        settings: false    // com.webos.chromecast-settings
      };
      
      if (result && result.list) {
        for (var i = 0; i < result.list.length; i++) {
          var app = result.list[i];
          
          if (app.appId === "com.webos.chromecast") {
            installedApps.service = app.installed || false;
          }
          else if (app.appId === "com.webos.app.commercial.chromecastguide") {
            installedApps.guide = app.installed || false;
          }
          else if (app.appId === "com.webos.chromecast-settings") {
            installedApps.settings = app.installed || false;
          }
        }
      }
      
      // All 3 must be installed
      var allInstalled = installedApps.service && installedApps.guide && installedApps.settings;
      
      console.log("[Google Cast] Installation status:");
      console.log("  - Service: " + installedApps.service);
      console.log("  - Guide: " + installedApps.guide);
      console.log("  - Settings: " + installedApps.settings);
      console.log("  - All installed: " + allInstalled);
      
      if (callback) callback(allInstalled, installedApps);
    },
    onFailure: function(err) {
      console.error("[Google Cast] Check failed: " + err.errorMessage);
      if (callback) callback(false);
    }
  });
};

/**
 * Install Google Cast applications
 */
Main.installGoogleCast = function(callback) {
  console.log("[Google Cast] Installing all apps...");
  
  // Install all 3 apps
  idcap.request("idcap://application/install", {
    "parameters": { "appList": GOOGLE_CAST_APP_IDS },
    "onSuccess": function() {
      console.log("[Google Cast] Installation successful");
      if (callback) callback(true);
    },
    "onFailure": function(err) {
      console.error("[Google Cast] Installation failed: " + err.errorMessage);
      if (callback) callback(false);
    }
  });
};

/**
 * Launch Google Cast Guide
 */
Main.launchGoogleCastGuide = function() {
  console.log("[Google Cast] Launching guide...");
  
  // Get room number
  var roomNumber = "Guest Room";
  if (Main.deviceProfile && Main.deviceProfile.room_number) {
    roomNumber = Main.deviceProfile.room_number;
  }
  
  // Generate random password
  var password = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
  
  // Launch parameters
  var params = {
    soft_ap: true,
    room_number: roomNumber,
    tv_name: roomNumber,
    support_message: "For assistance, please contact the front desk",
    password: password,
    channel_number: 0,
    signal_strength: 0,
    is_ssid_hidden: false,
    start_page: "0",
    color_schemes: "default",
    hide_2nd_screen: false
  };
  
  idcap.request("idcap://application/launch", {
    parameters: {
      id: "com.webos.app.commercial.chromecastguide",
      params: params
    },
    onSuccess: function() {
      console.log("[Google Cast] Guide launched successfully");
    },
    onFailure: function(err) {
      console.error("[Google Cast] Guide launch failed: " + err.errorMessage);
    }
  });
};

/**
 * Main function: Handle FuboTV Google Cast launch
 */
Main.handleFuboTVCast = function() {
  console.log("[FuboTV] Starting Google Cast...");
  Main.ShowLoading();
  
  // Step 1: Register token
  Main.registerGoogleCastToken();
  
  // Wait a moment for token registration
  setTimeout(function() {
    
    // Step 2: Check if all apps are installed
    Main.checkGoogleCastInstalled(function(allInstalled, installedApps) {
      
      if (allInstalled) {
        // All apps installed - launch directly
        console.log("[FuboTV] All Google Cast apps already installed");
        Main.HideLoading();
        Main.launchGoogleCastGuide();
      } else {
        // Some apps not installed - install all
        console.log("[FuboTV] Installing Google Cast apps...");
        
        Main.installGoogleCast(function(success) {
          Main.HideLoading();
          
          if (success) {
            // Installation successful - launch guide
            console.log("[FuboTV] Installation complete, launching guide...");
            ensureAppInstalled("com.webos.app.commercial.chromecastguide");
            Main.launchGoogleCastGuide();
          } else {
            // Installation failed
            console.error("[FuboTV] Installation failed");
            alert("Google Cast installation failed. Please try again.");
          }
        });
      }
    });
    
  }, 1000); // Wait 1 second for token registration
};

console.log("[Google Cast] Module loaded - Managing 3 app IDs");