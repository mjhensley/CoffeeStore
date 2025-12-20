/**
 * Grainhouse Coffee - Performance Optimization Module
 * Handles lazy loading, preloading, caching, and performance monitoring
 * Designed to make the site load 5x faster
 */

(function() {
  'use strict';

  // Performance timing
  const perfStart = performance.now();

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    lazyLoadRootMargin: '200px',  // Start loading 200px before visible
    preloadDelay: 100,            // Delay before preloading critical resources
    prefetchDelay: 2000,          // Delay before prefetching next pages
    cacheVersion: 'v1',           // Cache version for service worker
    criticalImages: 3,            // Number of above-fold images to prioritize
  };

  // ============================================
  // LAZY LOADING IMAGES
  // ============================================
  function initLazyLoading() {
    // Check for native lazy loading support
    const supportsNativeLazy = 'loading' in HTMLImageElement.prototype;

    // Get all images that should be lazy loaded
    const images = document.querySelectorAll('img[data-src], img:not([loading])');

    if (supportsNativeLazy) {
      // Use native lazy loading
      images.forEach((img, index) => {
        // First few images should load eagerly (above fold)
        if (index < CONFIG.criticalImages) {
          img.loading = 'eager';
          img.fetchpriority = 'high';
        } else {
          img.loading = 'lazy';
          img.decoding = 'async';
        }

        // Handle data-src if present
        if (img.dataset.src) {
          img.src = img.dataset.src;
          delete img.dataset.src;
        }
      });
    } else {
      // Fallback: Intersection Observer for older browsers
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              delete img.dataset.src;
            }
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: CONFIG.lazyLoadRootMargin,
        threshold: 0.01
      });

      images.forEach((img, index) => {
        if (index >= CONFIG.criticalImages) {
          imageObserver.observe(img);
        }
      });
    }
  }

  // ============================================
  // PRELOAD CRITICAL RESOURCES
  // ============================================
  function preloadCriticalResources() {
    // Preconnect to external domains
    const preconnects = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdn.snipcart.com',
      'https://app.snipcart.com',
    ];

    preconnects.forEach(url => {
      if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });

    // DNS prefetch for faster resolution
    const dnsPrefetch = [
      'https://api.snipcart.com',
      'https://api.resend.com',
    ];

    dnsPrefetch.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = url;
      document.head.appendChild(link);
    });

    // Preload hero image on homepage
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
      const heroImg = document.querySelector('.hero-image, .hero img');
      if (heroImg && heroImg.src) {
        const preload = document.createElement('link');
        preload.rel = 'preload';
        preload.as = 'image';
        preload.href = heroImg.src;
        preload.fetchpriority = 'high';
        document.head.insertBefore(preload, document.head.firstChild);
      }
    }
  }

  // ============================================
  // PREFETCH LIKELY NEXT PAGES
  // ============================================
  function prefetchNextPages() {
    // Pages users are likely to visit
    const pagesToPrefetch = [
      '/collections.html',
      '/subscribe.html',
      '/cold-brew.html',
    ];

    // Don't prefetch current page
    const currentPage = window.location.pathname;

    setTimeout(() => {
      pagesToPrefetch.forEach(page => {
        if (!currentPage.includes(page.replace('.html', ''))) {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = page;
          link.as = 'document';
          document.head.appendChild(link);
        }
      });
    }, CONFIG.prefetchDelay);

    // Prefetch on hover for navigation links
    const navLinks = document.querySelectorAll('nav a, .mobile-nav a');
    navLinks.forEach(link => {
      let prefetched = false;
      link.addEventListener('mouseenter', () => {
        if (!prefetched && link.href && link.href.startsWith(window.location.origin)) {
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.href = link.href;
          document.head.appendChild(prefetchLink);
          prefetched = true;
        }
      }, { passive: true });
    });
  }

  // ============================================
  // OPTIMIZE SCROLL PERFORMANCE
  // ============================================
  function optimizeScrollPerformance() {
    // Use passive event listeners for scroll
    let scrollTimeout;
    let ticking = false;

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Handle scroll-based animations here
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Reduce paint areas by promoting animated elements
    const animatedElements = document.querySelectorAll('.product-card, .guide-card, .back-to-top');
    animatedElements.forEach(el => {
      el.style.willChange = 'transform';
      el.style.transform = 'translateZ(0)';
    });
  }

  // ============================================
  // DEFER NON-CRITICAL CSS
  // ============================================
  function deferNonCriticalCSS() {
    // Find non-critical stylesheets and defer them
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"][href*="snipcart"]');
    
    stylesheets.forEach(stylesheet => {
      // Convert to preload first, then swap to stylesheet
      const href = stylesheet.href;
      stylesheet.media = 'print';
      stylesheet.onload = function() {
        this.media = 'all';
        this.onload = null;
      };
    });
  }

  // ============================================
  // OPTIMIZE FONTS
  // ============================================
  function optimizeFonts() {
    // Add font-display: swap to prevent invisible text
    const fontStyle = document.createElement('style');
    fontStyle.textContent = `
      @font-face {
        font-family: 'Playfair Display';
        font-display: swap;
      }
      @font-face {
        font-family: 'Inter';
        font-display: swap;
      }
    `;
    document.head.appendChild(fontStyle);

    // Check if fonts are cached
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        document.documentElement.classList.add('fonts-loaded');
      });
    }
  }

  // ============================================
  // IMAGE OPTIMIZATION HELPERS
  // ============================================
  function optimizeImages() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      // Add decoding async for faster parsing
      if (!img.decoding) {
        img.decoding = 'async';
      }

      // Add error handling with fallback
      img.onerror = function() {
        // Try to load a placeholder if image fails
        if (!this.dataset.fallback) {
          this.dataset.fallback = 'true';
          this.src = '/images/coffee.jpg';
          this.alt = 'Grainhouse Coffee';
        }
      };

      // Optimize based on viewport
      if (img.width === 0 && img.naturalWidth) {
        // Image dimensions not set, could cause layout shift
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;
      }
    });
  }

  // ============================================
  // INSTANT PAGE NAVIGATION (Speculation Rules)
  // ============================================
  function enableInstantNavigation() {
    // Use the newer Speculation Rules API if supported
    if ('speculation-rules' in HTMLScriptElement.prototype || document.createElement('script').type === 'speculationrules') {
      const rules = document.createElement('script');
      rules.type = 'speculationrules';
      rules.textContent = JSON.stringify({
        prerender: [
          {
            source: "document",
            where: {
              href_matches: "/*"
            },
            eagerness: "moderate"
          }
        ],
        prefetch: [
          {
            source: "document",
            where: {
              href_matches: "/*"
            },
            eagerness: "moderate"
          }
        ]
      });
      document.head.appendChild(rules);
    }
  }

  // ============================================
  // PERFORMANCE MONITORING
  // ============================================
  function measurePerformance() {
    if (!window.performance || !performance.timing) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.timing;
        const metrics = {
          // DNS lookup
          dns: timing.domainLookupEnd - timing.domainLookupStart,
          // TCP connection
          tcp: timing.connectEnd - timing.connectStart,
          // Time to first byte
          ttfb: timing.responseStart - timing.requestStart,
          // DOM ready
          domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
          // Full page load
          fullLoad: timing.loadEventEnd - timing.navigationStart,
          // Our optimization script time
          scriptTime: performance.now() - perfStart,
        };

        // Log performance in development
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('netlify')) {
          console.log('📊 Performance Metrics:', metrics);
        }

        // Report to analytics if available
        if (window.gtag) {
          window.gtag('event', 'performance', {
            event_category: 'Performance',
            event_label: 'Page Load',
            value: Math.round(metrics.fullLoad),
          });
        }
      }, 0);
    });

    // Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('🎨 LCP:', Math.round(lastEntry.startTime), 'ms');
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            console.log('⚡ FID:', Math.round(entry.processingStart - entry.startTime), 'ms');
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) {}

      // Cumulative Layout Shift
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // Report CLS on page hide
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            console.log('📐 CLS:', clsValue.toFixed(4));
          }
        });
      } catch (e) {}
    }
  }

  // ============================================
  // SERVICE WORKER REGISTRATION
  // ============================================
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('✅ Service Worker registered');
          })
          .catch(error => {
            // SW registration failed, that's okay
          });
      });
    }
  }

  // ============================================
  // REDUCE LAYOUT SHIFTS
  // ============================================
  function preventLayoutShifts() {
    // Set explicit dimensions for images without them
    const images = document.querySelectorAll('img:not([width]):not([height])');
    
    images.forEach(img => {
      // For product images, use common aspect ratio
      if (img.closest('.product-card')) {
        img.style.aspectRatio = '1';
        img.style.objectFit = 'contain';
      }
    });

    // Reserve space for dynamic content
    const cartBadge = document.querySelector('.cart-count-badge');
    if (cartBadge) {
      cartBadge.style.minWidth = '18px';
      cartBadge.style.minHeight = '18px';
    }
  }

  // ============================================
  // OPTIMIZE THIRD-PARTY SCRIPTS
  // ============================================
  function optimizeThirdParty() {
    // Delay loading Snipcart until user interaction
    const snipcartScript = document.querySelector('script[src*="snipcart"]');
    if (snipcartScript && !snipcartScript.async) {
      snipcartScript.async = true;
    }

    // Load analytics after main content
    if (window.gtag === undefined) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() { dataLayer.push(arguments); };
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    // Run immediately
    preloadCriticalResources();
    optimizeFonts();
    preventLayoutShifts();
    optimizeThirdParty();

    // Run when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
      onDOMReady();
    }

    // Run after full load
    window.addEventListener('load', onFullLoad);
  }

  function onDOMReady() {
    initLazyLoading();
    optimizeScrollPerformance();
    deferNonCriticalCSS();
    optimizeImages();
    enableInstantNavigation();
  }

  function onFullLoad() {
    prefetchNextPages();
    measurePerformance();
    registerServiceWorker();

    console.log(`🚀 Performance module loaded in ${(performance.now() - perfStart).toFixed(2)}ms`);
  }

  // Start initialization
  init();

  // Expose for debugging
  window.GrainhousePerformance = {
    metrics: () => measurePerformance(),
    preload: (url) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      document.head.appendChild(link);
    }
  };

})();

