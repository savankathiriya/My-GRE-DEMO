/**
 * Google Cast Implementation - Following LG Pro:Centric Documentation
 * Version: 1.3 (May 6, 2025)
 * Handles service monitoring, token registration, installation, and launch
 */

// ============================================================================
// GOOGLE CAST APP IDS
// ============================================================================

var GOOGLE_CAST_APP_IDS = [
  "com.webos.chromecast",                        // Cast Service (v3.25.80+ included in firmware)
  "com.webos.app.commercial.chromecastguide",   // Cast Guide
  "com.webos.chromecast-settings"               // Cast Settings
];

// ============================================================================
// GOOGLE CAST STATE MANAGEMENT
// ============================================================================

var GoogleCastState = {
  tokenRegistered: false,
  serviceStatus: "Inactive",  // Inactive, Starting, Ready, Casting
  isInstalling: false,
  installationAttempts: 0,
  maxInstallationAttempts: 3
};

// ============================================================================
// EVENT LISTENERS (Step 1 & 2 from documentation)
// ============================================================================

/**
 * Monitor Google Cast service activity
 * Status: Inactive/Active, Starting, Ready, Casting
 */
  document.addEventListener(
    "idcap::chromecast_status_changed",
    function (event) {
      var status = event.status || "Unknown";
      GoogleCastState.serviceStatus = status;
      
      console.log("[Google Cast] Status changed:------------------------------------------------------------------------> " + status);
      
      // Handle different status states
      switch (status) {
        case "Inactive":
          console.log("[Google Cast] Service available to install");
          break;
        case "Active":
          console.log("[Google Cast] Service has been installed");
          break;
        case "Starting":
          console.log("[Google Cast] Service is booting up");
          break;
        case "Ready":
          console.log("[Google Cast] Service ready for casting");
          break;
        case "Casting":
          console.log("[Google Cast] Device is currently casting");
          break;
      }
    },
    false
  );
  
  console.log("[Google Cast] Status monitoring initialized");

/**
 * Monitor token registration results
 */
function initTokenRegistrationMonitoring() {
  document.addEventListener(
    "idcap::application_registration_result_received",
    function (event) {
      console.log("[Google Cast] Token registration result received", event);
      
      if (event.tokenResult && event.tokenResult === "success") {
        GoogleCastState.tokenRegistered = true;
        console.log("[Google Cast] Token registration successful - Platform supports Google Cast");
      } else {
        GoogleCastState.tokenRegistered = false;
        console.error("[Google Cast] Token registration failed - Platform does NOT support Google Cast");
      }
    },
    false
  );
  
  console.log("[Google Cast] Token registration monitoring initialized");
}

// ============================================================================
// GOOGLE CAST FUNCTIONS
// ============================================================================

/**
 * Step 3: Register Google Cast Token
 * IMPORTANT: Must be called after each reboot
 */
Main.registerGoogleCastToken = function() {
  // ⚠️ REPLACE WITH YOUR ACTUAL TOKEN
  var token = "gcTZrTrQyTktcGl1H7onXt0xyt7lXK/9eG17OhSqLgdIwjP2Dm+6ok2u5Cu65/8TWZvOIHL6Auh8WKaM1gGB5evANHyAR9EeJALO3UlUsLtzRZsGvcBOYK1EaAYAvBDELAoG7xR5txoFL7FbT+cGOldUSMRxl2d9kAczGIiebz+zrfWGMjJdwnW8clLmwuA0VGDj+m5Y0F9nDfnHAjT4rcq2+SGxKZCuwz/91nLGOvu5hUS+jJ4InOEKpuNZvYVbIb7Z83xep41VLifnmMZNaTD8iXdUH0c7XO0FKQNUNskG3zwp8UiFtGy+2ISMmYYDSauxyrRY4iY03L9x1HMriw==";
  
  console.log("[Google Cast] Registering token...");
  
  idcap.request("idcap://application/register", {
    parameters: {
      tokenList: [{ id: "com.webos.chromecast", token: token }]
    },
    onSuccess: function() {
      console.log("[Google Cast] Token registered successfully");
      GoogleCastState.tokenRegistered = true;
    },
    onFailure: function(err) {
      console.error("[Google Cast] Token registration failed: " + err.errorMessage);
      GoogleCastState.tokenRegistered = false;
    }
  });
};

/**
 * Step 4: Check if Google Cast apps are installed
 */
Main.checkGoogleCastInstalled = function(callback) {
  console.log("[Google Cast] Checking installation status...");
  
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
      
      // All apps must be installed (service might be in firmware v3.25.80+)
      var allInstalled = installedApps.guide && installedApps.settings;
      
      console.log("[Google Cast] Installation status:");
      console.log("  - Service: " + installedApps.service);
      console.log("  - Guide: " + installedApps.guide);
      console.log("  - Settings: " + installedApps.settings);
      console.log("  - All installed: " + allInstalled);
      
      if (callback) callback(allInstalled, installedApps);
    },
    onFailure: function(err) {
      console.error("[Google Cast] Check failed: " + err.errorMessage);
      if (callback) callback(false, null);
    }
  });
};

/**
 * Step 4: Install Google Cast applications
 * Note: com.webos.chromecast included in firmware v3.25.80+
 */
Main.installGoogleCast = function(callback) {
  if (GoogleCastState.isInstalling) {
    console.warn("[Google Cast] Installation already in progress");
    return;
  }
  
  GoogleCastState.isInstalling = true;
  GoogleCastState.installationAttempts++;
  
  console.log("[Google Cast] Installing apps (Attempt " + GoogleCastState.installationAttempts + "/" + GoogleCastState.maxInstallationAttempts + ")...");
  
  // Install all 3 apps (service might already be in firmware)
  idcap.request("idcap://application/install", {
    parameters: { 
      appList: GOOGLE_CAST_APP_IDS
    },
    onSuccess: function() {
      console.log("[Google Cast] Installation request successful");
      GoogleCastState.isInstalling = false;
      
      // Wait for installation to complete, then verify
      setTimeout(function() {
        Main.checkGoogleCastInstalled(function(allInstalled) {
          if (allInstalled) {
            console.log("[Google Cast] Installation verified successfully");
            GoogleCastState.installationAttempts = 0;
            if (callback) callback(true);
          } else {
            console.warn("[Google Cast] Installation incomplete, retrying...");
            
            if (GoogleCastState.installationAttempts < GoogleCastState.maxInstallationAttempts) {
              // Retry installation
              setTimeout(function() {
                Main.installGoogleCast(callback);
              }, 3000);
            } else {
              console.error("[Google Cast] Max installation attempts reached");
              GoogleCastState.installationAttempts = 0;
              if (callback) callback(false);
            }
          }
        });
      }, 5000); // Wait 5 seconds for installation
    },
    onFailure: function(err) {
      console.error("[Google Cast] Installation failed: " + err.errorMessage);
      GoogleCastState.isInstalling = false;
      
      if (GoogleCastState.installationAttempts < GoogleCastState.maxInstallationAttempts) {
        // Retry installation
        setTimeout(function() {
          Main.installGoogleCast(callback);
        }, 3000);
      } else {
        console.error("[Google Cast] Max installation attempts reached");
        GoogleCastState.installationAttempts = 0;
        if (callback) callback(false);
      }
    }
  });
};

/**
 * Step 5: Set human readable name for device (optional)
 * Should be called after room_number is set
 */
Main.setGoogleCastDeviceName = function(tvName, callback) {
  if (!tvName) {
    console.warn("[Google Cast] No TV name provided, using room number");
    return;
  }
  
  console.log("[Google Cast] Setting TV name: " + tvName);
  
  idcap.request("idcap://configuration/property/set", {
    parameters: {
      key: "tv_name",
      value: tvName
    },
    onSuccess: function() {
      console.log("[Google Cast] TV name set successfully (reboot required for effect)");
      if (callback) callback(true);
    },
    onFailure: function(err) {
      console.error("[Google Cast] Failed to set TV name: " + err.errorMessage);
      if (callback) callback(false);
    }
  });
};

/**
 * Step 6: Launch Google Cast Guide Application
 */
Main.launchGoogleCastGuide = function() {
  console.log("[Google Cast] Launching guide...");
  
  // Get room number
  var roomNumber = "Guest Room";
  var tvName = "Guest Room TV";
  
  if (Main.deviceProfile && Main.deviceProfile.room_number) {
    roomNumber = "roomNumber - " + Main.deviceProfile.room_number;
    tvName = Main.deviceProfile.room_number + " TV";
  }
  
  // Generate random password (10 digits)
  var password = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
  
  // Launch parameters (following documentation v1.3)
  var params = {
    soft_ap: true,
    room_number: roomNumber,
    tv_name: tvName,
    support_message: "For assistance, please contact the front desk",
    password: password,
    channel_number: 0,          // 0 = random channel between 1-165
    signal_strength: 0,
    is_ssid_hidden: false,
    start_page: "0",            // 0: QR code page (default)
    color_schemes: "default",   // "default" or "toned_down"
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
      
      // Show user-friendly error
      utilities.genricPopup("Google Cast is not available. Please try again later.", 'info');
    }
  });
};

/**
 * Main Handler: Complete Google Cast flow with proper checks
 */
Main.handleGoogleCast = function() {
  console.log("[Google Cast] Starting Google Cast flow...");
  Main.ShowLoading();
  
  // Step 1: Register token (required after each reboot)
  Main.registerGoogleCastToken();
  
  // Wait for token registration
  setTimeout(function() {
    
    // Step 2: Check if token was registered successfully
    if (!GoogleCastState.tokenRegistered) {
      console.error("[Google Cast] Token not registered - aborting");
      Main.HideLoading();
      
      utilities.genricPopup("Google Cast is not available on this device.", 'info');
      return;
    }
    
    // Step 3: Check installation status
    Main.checkGoogleCastInstalled(function(allInstalled, installedApps) {
      
      if (allInstalled) {
        // All apps installed - check service status
        console.log("[Google Cast] All apps installed");
        
        if (GoogleCastState.serviceStatus === "Ready" || GoogleCastState.serviceStatus === "Active") {
          // Service is ready - launch guide immediately
          console.log("[Google Cast] Service ready - launching guide");
          Main.HideLoading();
          Main.launchGoogleCastGuide();
        } else {
          // Service not ready yet - wait and check again
          console.log("[Google Cast] Service not ready yet, waiting...");
          
          var waitCount = 0;
          var maxWait = 30; // 30 seconds max wait
          
          var checkInterval = setInterval(function() {
            waitCount++;
            console.log("[Google Cast] Waiting for service... (" + waitCount + "/" + maxWait + ")");
            
            if (GoogleCastState.serviceStatus === "Ready" || GoogleCastState.serviceStatus === "Active") {
              clearInterval(checkInterval);
              Main.HideLoading();
              Main.launchGoogleCastGuide();
            } else if (waitCount >= maxWait) {
              clearInterval(checkInterval);
              Main.HideLoading();
              console.warn("[Google Cast] Service not ready after waiting - launching anyway");
              Main.launchGoogleCastGuide();
            }
          }, 1000);
        }
        
      } else {
        // Not all apps installed - start installation
        console.log("[Google Cast] Apps not installed - starting installation...");
        
        Main.installGoogleCast(function(success) {
          Main.HideLoading();
          
          if (success) {
            console.log("[Google Cast] Installation complete - launching guide");
            
            // Wait a moment for service to be ready
            setTimeout(function() {
              Main.launchGoogleCastGuide();
            }, 2000);
          } else {
            console.error("[Google Cast] Installation failed");
            
            utilities.genricPopup("Google Cast installation failed. Please try again or contact support.", 'info');
          }
        });
      }
    });
    
  }, 1500); // Wait 1.5 seconds for token registration
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize event listeners immediately
// initGoogleCastMonitoring();
initTokenRegistrationMonitoring();

console.log("[Google Cast] Module loaded - Following LG Pro:Centric Documentation v1.3");