/**
 * Grainhouse Coffee - Client-Side Bot Detection & Fingerprinting
 * Works with edge functions to block bots and protect the site
 * Only real browsers with JavaScript can pass these checks
 */

(function() {
  'use strict';

  // ============================================
  // FINGERPRINT GENERATION
  // ============================================
  
  /**
   * Generate a unique device fingerprint
   * This helps identify returning visitors and detect bots
   */
  function generateFingerprint() {
    const components = [];

    // Screen properties
    components.push(screen.width + 'x' + screen.height);
    components.push(screen.colorDepth);
    components.push(window.devicePixelRatio || 1);

    // Timezone
    components.push(new Date().getTimezoneOffset());

    // Language
    components.push(navigator.language || navigator.userLanguage);
    components.push((navigator.languages || []).join(','));

    // Platform
    components.push(navigator.platform);

    // Hardware concurrency
    components.push(navigator.hardwareConcurrency || 'unknown');

    // Device memory (if available)
    components.push(navigator.deviceMemory || 'unknown');

    // Touch support
    components.push('ontouchstart' in window ? 'touch' : 'no-touch');
    components.push(navigator.maxTouchPoints || 0);

    // WebGL renderer (unique to GPU)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      components.push('no-webgl');
    }

    // Canvas fingerprint
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Grainhouse Coffee ☕', 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    } catch (e) {
      components.push('no-canvas');
    }

    // Audio context fingerprint
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const audioCtx = new AudioContext();
        components.push(audioCtx.sampleRate);
        audioCtx.close();
      }
    } catch (e) {
      components.push('no-audio');
    }

    // Plugins (legacy but still useful)
    if (navigator.plugins) {
      const plugins = [];
      for (let i = 0; i < Math.min(navigator.plugins.length, 5); i++) {
        plugins.push(navigator.plugins[i].name);
      }
      components.push(plugins.join(','));
    }

    // Create hash from components
    const fingerprint = hashCode(components.join('|||'));
    return fingerprint;
  }

  /**
   * Simple hash function
   */
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // ============================================
  // BOT DETECTION CHECKS
  // ============================================

  /**
   * Perform various checks to detect automated browsers
   */
  function detectBot() {
    const signals = [];
    let score = 0;

    // Check 1: WebDriver property (Selenium, Puppeteer)
    if (navigator.webdriver) {
      signals.push('webdriver');
      score += 100;
    }

    // Check 2: PhantomJS
    if (window.callPhantom || window._phantom) {
      signals.push('phantom');
      score += 100;
    }

    // Check 3: Headless Chrome indicators
    if (navigator.userAgent.includes('HeadlessChrome')) {
      signals.push('headless-chrome');
      score += 100;
    }

    // Check 4: Missing plugins in Chrome
    if (navigator.userAgent.includes('Chrome') && navigator.plugins.length === 0) {
      signals.push('no-plugins');
      score += 30;
    }

    // Check 5: Consistent properties that bots often lack
    if (window.outerWidth === 0 || window.outerHeight === 0) {
      signals.push('zero-dimensions');
      score += 50;
    }

    // Check 6: Notification permission in headless (always denied)
    if ('Notification' in window && Notification.permission === 'denied' && 
        !localStorage.getItem('notification-asked')) {
      signals.push('notification-denied-default');
      score += 20;
    }

    // Check 7: Chrome with missing chrome object
    if (navigator.userAgent.includes('Chrome') && !window.chrome) {
      signals.push('missing-chrome-object');
      score += 40;
    }

    // Check 8: Permissions API behavior
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' })
        .then(result => {
          if (result.state === 'denied' && !localStorage.getItem('notification-asked')) {
            // Suspicious - permission denied without user interaction
          }
        })
        .catch(() => {});
    }

    // Check 9: Language consistency
    if (navigator.language && navigator.languages) {
      if (!navigator.languages.includes(navigator.language)) {
        signals.push('language-mismatch');
        score += 20;
      }
    }

    // Check 10: Browser memory
    if (performance && performance.memory) {
      // Headless browsers often have unusual memory patterns
      const mem = performance.memory;
      if (mem.jsHeapSizeLimit < 100000000) {
        signals.push('low-heap');
        score += 15;
      }
    }

    // Check 11: DevTools Protocol detection
    let devtoolsOpen = false;
    const threshold = 160;
    
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      // DevTools might be open - not necessarily a bot, but worth noting
    }

    // Check 12: Mouse movement (bots often don't move mouse naturally)
    // This is tracked over time - initial check just sets up tracking

    // Check 13: Touch vs Mouse events consistency
    if ('ontouchstart' in window && navigator.maxTouchPoints === 0) {
      signals.push('touch-mismatch');
      score += 15;
    }

    return {
      isBot: score >= 50,
      score: score,
      signals: signals
    };
  }

  // ============================================
  // BEHAVIOR TRACKING
  // ============================================

  let mouseMovements = 0;
  let keyPresses = 0;
  let scrollEvents = 0;
  let interactionScore = 0;

  function trackBehavior() {
    // Track mouse movements
    document.addEventListener('mousemove', () => {
      mouseMovements++;
      if (mouseMovements > 5) interactionScore += 1;
    }, { passive: true });

    // Track key presses
    document.addEventListener('keydown', () => {
      keyPresses++;
      interactionScore += 5;
    }, { passive: true });

    // Track scrolling
    document.addEventListener('scroll', () => {
      scrollEvents++;
      if (scrollEvents > 2) interactionScore += 1;
    }, { passive: true });

    // Track clicks
    document.addEventListener('click', () => {
      interactionScore += 10;
    }, { passive: true });

    // After some time, check if there's been any human-like interaction
    setTimeout(() => {
      if (interactionScore < 5 && !document.hidden) {
        // Very low interaction - might be a bot viewing the page
        console.log('[Fingerprint] Low interaction detected');
      }
    }, 10000);
  }

  // ============================================
  // CHALLENGE TOKEN GENERATION
  // ============================================

  /**
   * Generate a security challenge token
   * Used to verify requests come from our JavaScript
   */
  function generateChallenge() {
    const timestamp = Date.now();
    const fingerprint = generateFingerprint();
    
    // Create a challenge that includes timing and fingerprint
    const challenge = hashCode(`${timestamp}:${fingerprint}:${navigator.userAgent}`);
    
    return {
      token: challenge,
      timestamp: timestamp,
      fingerprint: fingerprint
    };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Generate fingerprint
    const fingerprint = generateFingerprint();
    
    // Run bot detection
    const botCheck = detectBot();
    
    // Store for later use
    window.__GH_FP = fingerprint;
    window.__GH_BOT = botCheck;

    // If bot detected, log but don't block (edge function handles that)
    if (botCheck.isBot) {
      console.warn('[Fingerprint] Bot signals detected:', botCheck.signals);
    }

    // Track behavior for ongoing detection
    trackBehavior();

    // Add fingerprint to all form submissions
    document.addEventListener('submit', function(e) {
      const form = e.target;
      
      // Add hidden fingerprint field
      let fpField = form.querySelector('input[name="_fingerprint"]');
      if (!fpField) {
        fpField = document.createElement('input');
        fpField.type = 'hidden';
        fpField.name = '_fingerprint';
        form.appendChild(fpField);
      }
      fpField.value = fingerprint;
      
      // Add challenge token
      const challenge = generateChallenge();
      let challengeField = form.querySelector('input[name="_challenge"]');
      if (!challengeField) {
        challengeField = document.createElement('input');
        challengeField.type = 'hidden';
        challengeField.name = '_challenge';
        form.appendChild(challengeField);
      }
      challengeField.value = challenge.token;
    });

    // Add fingerprint to fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      // Only modify requests to our own domain
      if (typeof url === 'string' && 
          (url.startsWith('/') || url.includes(window.location.origin))) {
        
        options.headers = options.headers || {};
        
        // Add fingerprint header
        if (options.headers instanceof Headers) {
          options.headers.set('X-Client-Fingerprint', fingerprint);
        } else {
          options.headers['X-Client-Fingerprint'] = fingerprint;
        }
        
        // Add challenge for POST requests
        if (options.method === 'POST') {
          const challenge = generateChallenge();
          if (options.headers instanceof Headers) {
            options.headers.set('X-Security-Challenge', challenge.token);
            options.headers.set('X-Challenge-Timestamp', challenge.timestamp.toString());
          } else {
            options.headers['X-Security-Challenge'] = challenge.token;
            options.headers['X-Challenge-Timestamp'] = challenge.timestamp.toString();
          }
        }
      }
      
      return originalFetch.call(this, url, options);
    };

    console.log('[Fingerprint] Initialized');
  }

  // ============================================
  // HONEYPOT FIELD HELPER
  // ============================================

  /**
   * Add honeypot fields to forms for spam detection
   * Bots often fill all fields, humans leave these empty
   */
  function addHoneypots() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      // Skip if already has honeypot
      if (form.querySelector('.hp-field')) return;
      
      // Create honeypot field (styled to be invisible to humans)
      const honeypot = document.createElement('div');
      honeypot.className = 'hp-field';
      honeypot.setAttribute('aria-hidden', 'true');
      honeypot.style.cssText = 'position: absolute; left: -9999px; top: -9999px;';
      
      honeypot.innerHTML = `
        <label for="website_${Math.random().toString(36).slice(2)}">Website</label>
        <input type="text" name="website" tabindex="-1" autocomplete="off">
      `;
      
      form.appendChild(honeypot);
      
      // Check honeypot on submit
      form.addEventListener('submit', function(e) {
        const hp = this.querySelector('.hp-field input');
        if (hp && hp.value) {
          // Bot filled the honeypot!
          e.preventDefault();
          console.warn('[Fingerprint] Honeypot triggered');
          return false;
        }
      });
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      addHoneypots();
    });
  } else {
    init();
    addHoneypots();
  }

  // Expose API for debugging
  window.GrainhouseFingerprint = {
    getFingerprint: () => window.__GH_FP,
    getBotCheck: () => window.__GH_BOT,
    getInteractionScore: () => interactionScore,
    generateChallenge: generateChallenge
  };

})();

