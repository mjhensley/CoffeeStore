
    (function() {
      var cdnOrigin = "https://cdn.shopify.com";
      var scripts = ["/cdn/shopifycloud/checkout-web/assets/c1/polyfills.BVYsYAdG.js","/cdn/shopifycloud/checkout-web/assets/c1/app.BNcocglo.js","/cdn/shopifycloud/checkout-web/assets/c1/locale-en.B2NhC9SG.js","/cdn/shopifycloud/checkout-web/assets/c1/page-OnePage.IUktF9dW.js","/cdn/shopifycloud/checkout-web/assets/c1/LocalizationExtensionField.L9m3hi5e.js","/cdn/shopifycloud/checkout-web/assets/c1/RememberMeDescriptionText.CjdxC8A_.js","/cdn/shopifycloud/checkout-web/assets/c1/ShopPayOptInDisclaimer.jVmgl8dH.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentButtons.B9uYBjQh.js","/cdn/shopifycloud/checkout-web/assets/c1/StockProblemsLineItemList.CkqgO-3t.js","/cdn/shopifycloud/checkout-web/assets/c1/LocalPickup.DJ6yUfvs.js","/cdn/shopifycloud/checkout-web/assets/c1/useEditorShopPayNavigation.BS2OC5ik.js","/cdn/shopifycloud/checkout-web/assets/c1/VaultedPayment.CiRZ09mw.js","/cdn/shopifycloud/checkout-web/assets/c1/SeparatePaymentsNotice.B4OZNY_t.js","/cdn/shopifycloud/checkout-web/assets/c1/PayButtonSection.0TdsV7qc.js","/cdn/shopifycloud/checkout-web/assets/c1/ShipmentBreakdown.A2odwWCY.js","/cdn/shopifycloud/checkout-web/assets/c1/MerchandiseModal.B1He4ZJ-.js","/cdn/shopifycloud/checkout-web/assets/c1/StackedMerchandisePreview.Cbqm0aYY.js","/cdn/shopifycloud/checkout-web/assets/c1/component-ShopPayVerificationSwitch.D-Gtn0YJ.js","/cdn/shopifycloud/checkout-web/assets/c1/useSubscribeMessenger.TNmDtbpP.js","/cdn/shopifycloud/checkout-web/assets/c1/index.BD-6mRnI.js"];
      var styles = ["/cdn/shopifycloud/checkout-web/assets/c1/assets/app.DUrLZWzb.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/OnePage.CxYkJKrl.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/LocalizationExtensionField.Ca9titpM.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/LocalPickup.BvrdqG-K.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/ShopPayVerificationSwitch.WW3cs_z5.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/useEditorShopPayNavigation.CBpWLJzT.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/VaultedPayment.OxMVm7u-.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/StackedMerchandisePreview.D6OuIVjc.css"];
      var fontPreconnectUrls = [];
      var fontPrefetchUrls = [];
      var imgPrefetchUrls = ["https://cdn.shopify.com/s/files/1/0495/9446/6472/files/stumptowncoffee_favicon_logo_x320.png?v=1723138132"];

      function preconnect(url, callback) {
        var link = document.createElement('link');
        link.rel = 'dns-prefetch preconnect';
        link.href = url;
        link.crossOrigin = '';
        link.onload = link.onerror = callback;
        document.head.appendChild(link);
      }

      function preconnectAssets() {
        var resources = [cdnOrigin].concat(fontPreconnectUrls);
        var index = 0;
        (function next() {
          var res = resources[index++];
          if (res) preconnect(res, next);
        })();
      }

      function prefetch(url, as, callback) {
        var link = document.createElement('link');
        if (link.relList.supports('prefetch')) {
          link.rel = 'prefetch';
          link.fetchPriority = 'low';
          link.as = as;
          if (as === 'font') link.type = 'font/woff2';
          link.href = url;
          link.crossOrigin = '';
          link.onload = link.onerror = callback;
          document.head.appendChild(link);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onloadend = callback;
          xhr.send();
        }
      }

      function prefetchAssets() {
        var resources = [].concat(
          scripts.map(function(url) { return [url, 'script']; }),
          styles.map(function(url) { return [url, 'style']; }),
          fontPrefetchUrls.map(function(url) { return [url, 'font']; }),
          imgPrefetchUrls.map(function(url) { return [url, 'image']; })
        );
        var index = 0;
        function run() {
          var res = resources[index++];
          if (res) prefetch(res[0], res[1], next);
        }
        var next = (self.requestIdleCallback || setTimeout).bind(self, run);
        next();
      }

      function onLoaded() {
        try {
          if (parseFloat(navigator.connection.effectiveType) > 2 && !navigator.connection.saveData) {
            preconnectAssets();
            prefetchAssets();
          }
        } catch (e) {}
      }

      if (document.readyState === 'complete') {
        onLoaded();
      } else {
        addEventListener('load', onLoaded);
      }
    })();
  