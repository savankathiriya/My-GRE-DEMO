Main.dbInit = function (callback) {
  var request = window.indexedDB.open("AppCacheDB", 1);

  request.onerror = function (event) {
    console.error("IndexedDB error:", event.target.errorCode);
    if (callback) callback(null);
  };

  request.onsuccess = function (event) {
    Main.db = event.target.result;
    if (callback) callback(Main.db);
  };

  request.onupgradeneeded = function (event) {
    var db = event.target.result;
    if (!db.objectStoreNames.contains("images")) {
      db.createObjectStore("images");
    }
  };
};

Main.cacheImageToDB = function (url, callback, key) {
  key = key || "bgImage";

  if (!url) {
    if (callback) callback(null);
    return;
  }

  if (!Main.db) {
    Main.dbInit(function () {
      Main.cacheImageToDB(url, callback, key);
    });
    return;
  }

  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";

    xhr.onload = function () {
      if (xhr.status == 200) {
        var blob = xhr.response;
        try {
          var tx = Main.db.transaction(["images"], "readwrite");
          var store = tx.objectStore("images");
          var putRequest = store.put(blob, key);

          putRequest.onsuccess = function () {
            try {
              var blobUrl = URL.createObjectURL(blob);
              if (key === "bgImage") Main.cachedBgBlobUrl = blobUrl;
              if (key === "logoImage") Main.cachedPropertyLogo = blobUrl;

              // Cache language icons if applicable
              if (key.indexOf("langIcon_") === 0) {
                Main.cachedLanguageIcons = Main.cachedLanguageIcons || {};
                Main.cachedLanguageIcons[key] = blobUrl;
              }
              if (callback) callback(blobUrl);
            } catch (err) {
              console.error("Error creating object URL from blob:", err);
              if (callback) callback(url);
            }
          };

          putRequest.onerror = function (event) {
            console.error(
              "Error storing image blob in IndexedDB:",
              event.target.errorCode
            );
            try {
              var blobUrl2 = URL.createObjectURL(blob);
              if (key === "bgImage") Main.cachedBgBlobUrl = blobUrl2;
              if (key === "logoImage") Main.cachedPropertyLogo = blobUrl2;
              if (key.indexOf("langIcon_") === 0) {
                Main.cachedLanguageIcons = Main.cachedLanguageIcons || {};
                Main.cachedLanguageIcons[key] = blobUrl2;
              }
              if (callback) callback(blobUrl2);
            } catch (err) {
              console.error(
                "Error creating object URL from blob after failed put:",
                err
              );
              if (callback) callback(url);
            }
          };
        } catch (err) {
          console.error("Error during IndexedDB transaction:", err);
          if (callback) callback(url);
        }
      } else {
        console.warn("Failed to fetch image for caching, status:", xhr.status);
        if (callback) callback(url);
      }
    };

    xhr.onerror = function () {
      console.error("XHR error while fetching image for caching");
      if (callback) callback(url);
    };

    xhr.send();
  } catch (err) {
    console.error("Error caching image to IndexedDB:", err);
    if (callback) callback(url);
  }
};

Main.getCachedImageURL = function (callback) {
  if (!Main.db) {
    Main.dbInit(function () {
      Main.getCachedImageURL(callback);
    });
    return;
  }

  var tx = Main.db.transaction(["images"], "readonly");
  var store = tx.objectStore("images");
  var getRequest = store.get("bgImage");

  getRequest.onsuccess = function (event) {
    var blob = event.target.result;
    if (blob) {
      var url = URL.createObjectURL(blob);
      callback(url);
    } else {
      callback(null);
    }
  };

  getRequest.onerror = function (event) {
    console.error(
      "Error retrieving image from IndexedDB:",
      event.target.errorCode
    );
    callback(null);
  };
};

Main.getBackgroundImageUrl = function (callback) {
  // Check if we have already cached the URL in memory
  if (Main.cachedBgBlobUrl) {
    return callback(Main.cachedBgBlobUrl);
  }

  Main.getCachedImageURL(function (blobUrl) {
    if (blobUrl) {
      Main.cachedBgBlobUrl = blobUrl;
      return callback(blobUrl);
    }

    // Not in IndexedDB, fallback to original URL from API
    var imageUrl =
      Main.templateApiData &&
      Main.templateApiData.menu_screen_bg &&
      Main.templateApiData.menu_screen_bg[0];

    if (!imageUrl) {
      imageUrl = "/images/background_img.png"; // Default image
      return callback(imageUrl);
    }

    // Cache the image to IndexedDB
    Main.cacheImageToDB(imageUrl, function (cachedUrl) {
      Main.cachedBgBlobUrl = cachedUrl || imageUrl;
      callback(Main.cachedBgBlobUrl);
    });
  });
};

Main.getImageUrl = function (key, callback) {
  if (!Main.db) {
    Main.dbInit(function () {
      Main.getImageUrl(key, callback);
    });
    return;
  }

  var cacheKey =
    key === "menu_screen_bg"
      ? "bgImage"
      : key === "property_logo"
      ? "logoImage"
      : key;

  if (key === "menu_screen_bg" && Main.cachedBgBlobUrl) {
    return callback(Main.cachedBgBlobUrl);
  } else if (key === "property_logo" && Main.cachedPropertyLogo) {
    return callback(Main.cachedPropertyLogo);
  }

  try {
    var tx = Main.db.transaction(["images"], "readonly");
    var store = tx.objectStore("images");
    var getRequest = store.get(cacheKey);

    getRequest.onsuccess = function (event) {
       var blob = event.target.result;
       if(blob) {
        var blobUrl = URL.createObjectURL(blob);
        if (key === "menu_screen_bg") Main.cachedBgBlobUrl = blobUrl;
        if (key === "property_logo") Main.cachedPropertyLogo = blobUrl;
        return callback(blobUrl)
       }

      // Not found in DB, compute imageUrl
      var imageUrl = null;
      if(key === "menu_screen_bg"){
        imageUrl = Main.templateApiData && Main.templateApiData.menu_screen_bg && Main.templateApiData.menu_screen_bg[0];
      } else if( key === "property_logo" ){
        var pl = Main.templateApiData && Main.templateApiData.property_logo;
        if (Array.isArray(pl)) imageUrl = pl[0];
        else imageUrl = pl;
      }

      if(!imageUrl){
        var fallback = (key === "menu_screen_bg") ? "/images/background_img.png" : (key === "property_logo") ? "/images/logo.png" : "/images/placeholder.png";
        return callback(fallback);
      }

      // Cache the image to IndexedDB
      Main.cacheImageToDB(imageUrl, function(cachedOrFallback) {
        return callback(cachedOrFallback || imageUrl);
      }, cacheKey)
    };

    getRequest.onerror = function (err) {
      console.error("getImageUrl: indexedDB get error", err)
      var fallback = (key === "menu_screen_bg") ? "/images/background_img.png" : (key === "property_logo") ? "/images/logo.png" : "/images/placeholder.png";
      return callback(fallback);
    };
    
  } catch (err) {
    console.error("Error retrieving image from IndexedDB:", err);
    var fallback2 =
      key === "menu_screen_bg"
        ? "/images/background_img.png"
        : key === "property_logo"
        ? "/images/logo.png"
        : "/images/placeholder.png";
    
    return callback(fallback2);
  }
};
