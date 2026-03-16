/**
 * Google Cast Implementation - Following LG Pro:Centric Documentation
 * Version: 1.3 (May 6, 2025)
 * Handles service monitoring, token registration, installation, and launch
 *
 * Steps implemented (per PDF):
 *  1. Event listener - chromecast_status_changed
 *  2. Event listener - application_registration_result_received
 *  3. Register Google Cast token (per reboot)
 *  4. Download & install Google Cast service
 *  5. Set human readable device name
 *  6. Launch guest-facing Google Cast Guide application
 *  7. Clear credentials / casting data  (handled via security_level in main app)
 *  8. Enable DIAL protocol (optional - Netflix / YouTube / YouTubeTV)
 *  9. Block mDNS discovery traffic (optional - gateway approach)
 */

// ============================================================================
// GOOGLE CAST APP IDS
// ============================================================================

var GOOGLE_CAST_APP_IDS = [
  "com.webos.chromecast",                       // Cast Service (v3.25.80+ already in firmware)
  "com.webos.app.commercial.chromecastguide",   // Cast Guide
  "com.webos.chromecast-settings"               // Cast Settings (TOS / privacy)
];

// ============================================================================
// GOOGLE CAST STATE MANAGEMENT
// ============================================================================

var GoogleCastState = {
  tokenRegistered: false,
  serviceStatus: "Inactive",   // Inactive | Active | Starting | Ready | Casting
  isInstalling: false,
  installationAttempts: 0,
  maxInstallationAttempts: 3,
  dialEnabled: false
};

// ============================================================================
// STEP 2: EVENT LISTENERS
// ============================================================================

/**
 * Step 2a: Monitor Google Cast service activity.
 * Lifecycle: Inactive/Active → Starting → Ready ↔ Casting
 */
document.addEventListener(
  "idcap::chromecast_status_changed",
  function (event) {
    var status = event.status || "Unknown";
    GoogleCastState.serviceStatus = status;

    console.log("[Google Cast] Status changed: " + status);

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
      default:
        console.log("[Google Cast] Unknown status: " + status);
    }
  },
  false
);

console.log("[Google Cast] Status monitoring listener registered");

/**
 * Step 2b: Monitor token registration results.
 * Must be registered BEFORE calling registerGoogleCastToken().
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
        console.error("[Google Cast] Token registration FAILED - Platform does NOT support Google Cast");
      }
    },
    false
  );

  console.log("[Google Cast] Token registration monitoring listener registered");
}

// ============================================================================
// STEP 3: REGISTER GOOGLE CAST TOKEN
// ============================================================================

/**
 * Step 3: Register the Google Cast SI token.
 * IMPORTANT: Must be called after EVERY reboot.
 * Token must match the same company info as other registered tokens (e.g. Netflix).
 */
Main.registerGoogleCastToken = function () {
  // ⚠️  REPLACE WITH YOUR ACTUAL SIGNED TOKEN FROM LG
  var token = Main.lgSettings.google_cast_app_token

  console.log("[Google Cast] Registering token...");

  idcap.request("idcap://application/register", {
    parameters: {
      tokenList: [{ id: "com.webos.chromecast", token: token }]
    },
    onSuccess: function () {
      console.log("[Google Cast] Token registered successfully");
      GoogleCastState.tokenRegistered = true;
    },
    onFailure: function (err) {
      console.error("[Google Cast] Token registration failed: " + err.errorMessage);
      GoogleCastState.tokenRegistered = false;
    }
  });
};

// ============================================================================
// STEP 4: INSTALL / CHECK GOOGLE CAST APPS
// ============================================================================

/**
 * Step 4a: Check whether Google Cast apps are already installed.
 * callback(allInstalled: boolean, installedApps: object)
 */
Main.checkGoogleCastInstalled = function (callback) {
  console.log("[Google Cast] Checking installation status...");

  idcap.request("idcap://application/list", {
    parameters: { extraInfo: true },
    onSuccess: function (result) {
      var installedApps = {
        service: false,   // com.webos.chromecast
        guide: false,     // com.webos.app.commercial.chromecastguide
        settings: false   // com.webos.chromecast-settings
      };

      if (result && result.list) {
        for (var i = 0; i < result.list.length; i++) {
          var app = result.list[i];
          if (app.appId === "com.webos.chromecast") {
            installedApps.service = app.installed || false;
          } else if (app.appId === "com.webos.app.commercial.chromecastguide") {
            installedApps.guide = app.installed || false;
          } else if (app.appId === "com.webos.chromecast-settings") {
            installedApps.settings = app.installed || false;
          }
        }
      }

      // Guide + Settings are mandatory; service may be baked into firmware v3.25.80+
      var allInstalled = installedApps.guide && installedApps.settings;

      console.log("[Google Cast] Installation status:");
      console.log("  - Service  : " + installedApps.service + " (may be in firmware v3.25.80+)");
      console.log("  - Guide    : " + installedApps.guide);
      console.log("  - Settings : " + installedApps.settings);
      console.log("  - Ready    : " + allInstalled);

      if (callback) callback(allInstalled, installedApps);
    },
    onFailure: function (err) {
      console.error("[Google Cast] App list check failed: " + err.errorMessage);
      if (callback) callback(false, null);
    }
  });
};

/**
 * Step 4b: Install Google Cast applications.
 * Note: com.webos.chromecast is bundled in firmware v3.25.80+ and does not need installing.
 * Retries up to maxInstallationAttempts times on failure.
 */
Main.installGoogleCast = function (callback) {
  if (GoogleCastState.isInstalling) {
    console.warn("[Google Cast] Installation already in progress");
    return;
  }

  GoogleCastState.isInstalling = true;
  GoogleCastState.installationAttempts++;

  console.log("[Google Cast] Installing apps (Attempt "
    + GoogleCastState.installationAttempts + "/"
    + GoogleCastState.maxInstallationAttempts + ")...");

  idcap.request("idcap://application/install", {
    parameters: {
      appList: GOOGLE_CAST_APP_IDS
    },
    onSuccess: function () {
      console.log("[Google Cast] Installation request accepted");
      GoogleCastState.isInstalling = false;

      // Allow time for the install to complete before verifying
      setTimeout(function () {
        Main.checkGoogleCastInstalled(function (allInstalled) {
          if (allInstalled) {
            console.log("[Google Cast] Installation verified");
            GoogleCastState.installationAttempts = 0;
            if (callback) callback(true);
          } else {
            console.warn("[Google Cast] Installation incomplete");
            if (GoogleCastState.installationAttempts < GoogleCastState.maxInstallationAttempts) {
              setTimeout(function () { Main.installGoogleCast(callback); }, 3000);
            } else {
              console.error("[Google Cast] Max installation attempts reached");
              GoogleCastState.installationAttempts = 0;
              if (callback) callback(false);
            }
          }
        });
      }, 5000);
    },
    onFailure: function (err) {
      console.error("[Google Cast] Installation request failed: " + err.errorMessage);
      GoogleCastState.isInstalling = false;

      if (GoogleCastState.installationAttempts < GoogleCastState.maxInstallationAttempts) {
        setTimeout(function () { Main.installGoogleCast(callback); }, 3000);
      } else {
        console.error("[Google Cast] Max installation attempts reached");
        GoogleCastState.installationAttempts = 0;
        if (callback) callback(false);
      }
    }
  });
};

// ============================================================================
// STEP 5: SET HUMAN READABLE DEVICE NAME
// ============================================================================

/**
 * Step 5: Set the TV name visible in the cast picker.
 * Must be called AFTER room_number is set (tv_name is reset when room_number changes).
 * A reboot is required for the new name to take effect.
 */
Main.setGoogleCastDeviceName = function (tvName, callback) {
  if (!tvName) {
    console.warn("[Google Cast] setGoogleCastDeviceName: no name provided, skipping");
    if (callback) callback(false);
    return;
  }

  console.log("[Google Cast] Setting TV name: " + tvName);

  idcap.request("idcap://configuration/property/set", {
    parameters: {
      key: "tv_name",
      value: tvName
    },
    onSuccess: function () {
      console.log("[Google Cast] TV name set to '" + tvName + "' (reboot required to take effect)");
      if (callback) callback(true);
    },
    onFailure: function (err) {
      console.error("[Google Cast] Failed to set TV name: " + err.errorMessage);
      if (callback) callback(false);
    }
  });
};

// ============================================================================
// STEP 6: LAUNCH GUEST-FACING GOOGLE CAST GUIDE APPLICATION
// ============================================================================

/**
 * Step 6: Launch the Google Cast Guide application (v1.3.1 or higher required).
 * All parameters follow documentation v1.3 (May 6, 2025).
 */
Main.launchGoogleCastGuide = function () {
  console.log("[Google Cast] Launching guide application...");

  // Derive room / TV name from device profile if available
  var roomNumber = "Guest Room";
  var tvName     = "Guest Room TV";

  if (Main.deviceProfile && Main.deviceProfile.room_number) {
    roomNumber = Main.deviceProfile.room_number;
    tvName     = "Room " + Main.deviceProfile.room_number + " TV";
  }

  // Generate a random 10-digit SoftAP password each session
  var password = Math.floor(Math.random() * 9000000000 + 1000000000).toString();

  var params = {
    soft_ap        : true,
    room_number    : roomNumber,
    tv_name        : tvName,
    support_message: "For assistance, please contact the front desk",
    password       : password,
    channel_number : 0,          // 0 = random channel 1-165
    signal_strength: 0,
    is_ssid_hidden : false,
    start_page     : "0",        // 0: QR code page (default)
    color_schemes  : "default",  // "default" | "toned_down"
    hide_2nd_screen: false
  };

  idcap.request("idcap://application/launch", {
    parameters: {
      id    : "com.webos.app.commercial.chromecastguide",
      params: params
    },
    onSuccess: function () {
      console.log("[Google Cast] Guide application launched successfully");
    },
    onFailure: function (err) {
      console.error("[Google Cast] Guide launch failed: " + err.errorMessage);
      utilities.genricPopup("Google Cast is not available. Please try again later.", "info");
    }
  });
};

// ============================================================================
// STEP 8: ENABLE DIAL PROTOCOL (Optional)
// ============================================================================

/**
 * Step 8: Enable the DIAL protocol.
 *
 * DIAL is required for Netflix and YouTube / YouTubeTV casting support —
 * these apps use DIAL rather than the standard Google Cast protocol.
 * This is independent of the Google Cast service and should be called
 * once during application initialisation if DIAL casting is required.
 *
 * Note: The PDF (section 8) shows idcap://configuration/property/get but
 * the intent is clearly to SET the value to "1" to enable the protocol,
 * consistent with all other property-enable calls (security_level,
 * block_mdns_port, tv_name).  The correct URI is property/set.
 *
 * callback(success: boolean)
 */
Main.enableDialProtocol = function (callback) {
  console.log("[Google Cast] Enabling DIAL protocol (Netflix / YouTube / YouTubeTV)...");

  idcap.request("idcap://configuration/property/set", {
    parameters: {
      key  : "dial",
      value: "1"
    },
    onSuccess: function () {
      console.log("[Google Cast] DIAL protocol enabled successfully");
      GoogleCastState.dialEnabled = true;
      if (callback) callback(true);
    },
    onFailure: function (err) {
      console.error("[Google Cast] Failed to enable DIAL protocol: " + err.errorMessage);
      GoogleCastState.dialEnabled = false;
      if (callback) callback(false);
    }
  });
};

// ============================================================================
// STEP 9: BLOCK mDNS DISCOVERY (Optional - Gateway Approach)
// ============================================================================

/**
 * Step 9: Block mDNS discovery ports at the TV firewall.
 * Use this when a gateway device is handling TV isolation instead of SoftAP.
 * When SoftAP is active this blocking is applied automatically — no need to call.
 *
 * Ports blocked on Ethernet & WLAN interfaces:
 *   udp:5353  (mDNS)
 *   tcp:8443
 *   tcp:8009
 *
 * value "1" = block  |  value "0" = allow (default)
 *
 * callback(success: boolean)
 */
Main.blockMdnsDiscovery = function (block, callback) {
  var value = block ? "1" : "0";
  var action = block ? "Blocking" : "Allowing";
  console.log("[Google Cast] " + action + " mDNS discovery ports...");

  idcap.request("idcap://configuration/property/set", {
    parameters: {
      key  : "block_mdns_port",
      value: value
    },
    onSuccess: function () {
      console.log("[Google Cast] mDNS ports " + (block ? "blocked" : "unblocked") + " successfully");
      if (callback) callback(true);
    },
    onFailure: function (err) {
      console.error("[Google Cast] Failed to set mDNS block state: " + err.errorMessage);
      if (callback) callback(false);
    }
  });
};

// ============================================================================
// MAIN HANDLER: COMPLETE GOOGLE CAST FLOW
// ============================================================================

/**
 * Main entry point called from the UI (e.g. when guest taps "Cast" tile).
 *
 * Flow:
 *  1. Register SI token  (mandatory every reboot)
 *  2. Enable DIAL        (optional, non-blocking)
 *  3. Wait for token registration result
 *  4. Verify / install Google Cast apps
 *  5. Wait for service to reach Ready state
 *  6. Launch Guide application
 */
Main.handleGoogleCast = function () {
  console.log("[Google Cast] ---- Starting Google Cast flow ----");
  Main.ShowLoading();

  // Step 3: Register SI token — result comes via event listener (step 2b)
  Main.registerGoogleCastToken();

  // Step 8: Enable DIAL — non-blocking, runs in parallel with token registration
  Main.enableDialProtocol(function (dialSuccess) {
    if (dialSuccess) {
      console.log("[Google Cast] DIAL active — Netflix/YouTube casting supported");
    } else {
      console.warn("[Google Cast] DIAL not enabled — Netflix/YouTube DIAL casting unavailable");
    }
  });

  // Wait for token registration event to be processed
  setTimeout(function () {

    if (!GoogleCastState.tokenRegistered) {
      console.error("[Google Cast] Token not registered — aborting");
      Main.HideLoading();
      utilities.genricPopup("Google Cast is not available on this device.", "info");
      return;
    }

    // Step 4: Verify installation
    Main.checkGoogleCastInstalled(function (allInstalled) {

      if (allInstalled) {
        console.log("[Google Cast] All apps present — checking service state");
        Main._waitForServiceReady();
      } else {
        console.log("[Google Cast] Apps missing — starting installation");
        Main.installGoogleCast(function (success) {
          Main.HideLoading();
          if (success) {
            console.log("[Google Cast] Installation complete — waiting for service");
            setTimeout(function () { Main._waitForServiceReady(); }, 2000);
          } else {
            console.error("[Google Cast] Installation failed");
            utilities.genricPopup(
              "Google Cast installation failed. Please try again or contact support.", "info"
            );
          }
        });
      }
    });

  }, 1500); // Allow time for token registration callback
};

/**
 * Internal helper: poll until service reaches Ready/Active, then launch guide.
 * Timeout after 30 seconds — launches anyway to avoid blocking the guest.
 */
Main._waitForServiceReady = function () {
  if (GoogleCastState.serviceStatus === "Ready" ||
      GoogleCastState.serviceStatus === "Active") {
    console.log("[Google Cast] Service ready — launching guide");
    Main.HideLoading();
    Main.launchGoogleCastGuide();
    return;
  }

  console.log("[Google Cast] Waiting for service to become ready...");

  var waitCount  = 0;
  var maxWait    = 30; // seconds

  var checkInterval = setInterval(function () {
    waitCount++;
    console.log("[Google Cast] Service status check " + waitCount + "/" + maxWait
      + " — current: " + GoogleCastState.serviceStatus);

    if (GoogleCastState.serviceStatus === "Ready" ||
        GoogleCastState.serviceStatus === "Active") {
      clearInterval(checkInterval);
      Main.HideLoading();
      Main.launchGoogleCastGuide();
    } else if (waitCount >= maxWait) {
      clearInterval(checkInterval);
      Main.HideLoading();
      console.warn("[Google Cast] Service not ready after " + maxWait + "s — launching anyway");
      Main.launchGoogleCastGuide();
    }
  }, 1000);
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// Register event listeners immediately on script load
initTokenRegistrationMonitoring();

console.log("[Google Cast] Module loaded — LG Pro:Centric Documentation v1.3 | DIAL support included");