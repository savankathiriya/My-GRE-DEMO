/* ===============================
   LOCAL CHECKOUT
================================ */
function performLocalCheckout(complete) {

    if (!(window.hcap &&
          hcap.checkout &&
          typeof hcap.checkout.requestCheckout === "function")) {

        console.log("HCAP checkout API not available");
        if (complete) complete(null);
        return;
    }

    showLoadingPopup();

    hcap.checkout.requestCheckout({
        onSuccess: function () {

            hideLoadingPopup();

            macro("#mainContent").html("");
            macro("#mainContent").html(Util.checkoutThankYouScreen());

            destroyAppsThenReboot(complete);
        },

        onFailure: function (err) {
            hideLoadingPopup();
            utilities.genricPopup(
                "Checkout failed: " + ((err && err.errorMessage) || "Unknown"),
                "info"
            );
            if (complete) complete(err);
        }
    });
}

/* ===============================
   DESTROY APPS → REBOOT
================================ */
function destroyAppsThenReboot(complete) {

    if (!(hcap.preloadedApplication &&
          typeof hcap.preloadedApplication.destroyPreloadedApplication === "function")) {
        rebootTV(complete);
        return;
    }

    /* App IDs vary by model */
    var apps = [
        { id: "244115188075859013", name: "Netflix" },
        { id: "144115188075859002", name: "YouTube" }
    ];

    var remaining = apps.length;

    if (remaining === 0) {
        rebootTV(complete);
        return;
    }

    apps.forEach(function (app) {
        try {
            hcap.preloadedApplication.destroyPreloadedApplication({
                id: app.id,
                onSuccess: function () {
                    console.log("✅ " + app.name + " destroyed");
                    done();
                },
                onFailure: function () {
                    console.log("ℹ️ " + app.name + " not running");
                    done();
                }
            });
        } catch (e) {
            done();
        }
    });

    function done() {
        remaining--;
        if (remaining <= 0) {
            rebootTV(complete);
        }
    }
}

/* ===============================
   POWER CONTROL
================================ */
function rebootTV(complete) {

    setTimeout(function () {

        if (hcap.power && typeof hcap.power.reboot === "function") {
            hcap.power.reboot({
                onSuccess: function () {
                    console.log("Reboot success after checkout");
                    if (complete) complete(null);
                },
                onFailure: function (err) {
                    console.warn("Reboot failed", err);
                    powerOffFallback(complete);
                }
            });
            return;
        }

        powerOffFallback(complete);

    }, 5000);
}

function powerOffFallback(complete) {

    if (hcap.power && typeof hcap.power.powerOff === "function") {
        hcap.power.powerOff({
            onSuccess: function () {
                console.log("PowerOff success after checkout");
                if (complete) complete(null);
            },
            onFailure: function () {
                if (complete) complete(null);
            }
        });
        return;
    }

    if (complete) complete(null);
}

/* ===============================
   PMS (OPTIONAL)
================================ */
function tryPmsThenCheckout(complete) {

    if (window.hcap &&
        hcap.pms &&
        typeof hcap.pms.bind === "function") {

        hcap.pms.bind({
            onSuccess: function () {
                performLocalCheckout(complete);
            },
            onFailure: function () {
                utilities.genricPopup(
                    "PMS bind failed, continuing with local checkout",
                    "info"
                );
                performLocalCheckout(complete);
            }
        });
        return;
    }

    performLocalCheckout(complete);
}

/* ===============================
   CHECKOUT ENTRY POINT
================================ */
function CheckoutManager_requestCheckout(complete) {
    try {
        if (window.hcap && typeof hcap.init === "function") {
            hcap.init();
        }
    } catch (e) {}

    tryPmsThenCheckout(complete);
}
