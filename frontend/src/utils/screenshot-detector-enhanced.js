/**
 * Enhanced Screenshot Detection System
 * Detects PrintScreen key and applies visual deterrents
 */

class EnhancedScreenshotDetector {
  constructor(onScreenshotDetected) {
    this.onScreenshotDetected = onScreenshotDetected;
    this.isActive = false;
    this.blurTimeout = null;
    this.warningOverlay = null;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;

    // Create warning overlay
    this.createWarningOverlay();

    // Detect keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    
    // Detect page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Detect right-click attempts
    document.addEventListener('contextmenu', this.handleContextMenu);

    // Detect window resize (dev tools)
    window.addEventListener('resize', this.handleResize);
  }

  stop() {
    this.isActive = false;
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('resize', this.handleResize);
    
    if (this.warningOverlay) {
      this.warningOverlay.remove();
    }
  }

  createWarningOverlay() {
    // Create persistent warning overlay
    this.warningOverlay = document.createElement('div');
    this.warningOverlay.id = 'screenshot-warning-overlay';
    this.warningOverlay.innerHTML = `
      <div class="warning-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <span>🔒 Encrypted - Screenshots are monitored</span>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      #screenshot-warning-overlay {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(239, 68, 68, 0.05);
        border-top: 1px solid rgba(239, 68, 68, 0.2);
        padding: 8px 16px;
        z-index: 9998;
        pointer-events: none;
        transition: all 0.3s ease;
      }
      
      #screenshot-warning-overlay .warning-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #ef4444;
        font-size: 12px;
        font-weight: 500;
      }
      
      #screenshot-warning-overlay svg {
        width: 16px;
        height: 16px;
      }
      
      #screenshot-warning-overlay.detected {
        background: rgba(239, 68, 68, 0.2);
        animation: pulse 0.5s ease-in-out 3;
      }
      
      @keyframes pulse {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      
      .chat-content.screenshot-blur {
        filter: blur(10px) !important;
        transition: filter 0.2s ease;
      }
      
      .screenshot-flash {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.8);
        z-index: 9999;
        pointer-events: none;
        animation: flash 0.3s ease-out;
      }
      
      @keyframes flash {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(this.warningOverlay);
  }

  handleKeyDown = (e) => {
    // Detect PrintScreen key (main detection)
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      this.triggerDetection('print_screen_key');
    }
    
    // Mac screenshots: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
    if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
      this.triggerDetection('mac_screenshot_shortcut');
    }
    
    // Windows Snipping Tool: Windows+Shift+S
    if ((e.key === 's' || e.key === 'S') && e.shiftKey && (e.metaKey || e.ctrlKey)) {
      this.triggerDetection('snipping_tool');
    }
  };

  handleKeyUp = (e) => {
    if (e.key === 'PrintScreen') {
      // Additional detection on key release
      this.triggerDetection('print_screen_release');
    }
  };

  handleVisibilityChange = () => {
    if (document.hidden) {
      // User switched away - might be taking screenshot
      this.triggerDetection('page_hidden');
    }
  };

  handleContextMenu = (e) => {
    // Prevent right-click on protected content
    if (e.target.closest('[data-protected="true"]')) {
      e.preventDefault();
      this.triggerDetection('context_menu_attempt');
    }
  };

  handleResize = () => {
    // Detect if window was resized (might indicate dev tools opened)
    const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
    const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
    
    if (widthDiff > 200 || heightDiff > 200) {
      this.triggerDetection('dev_tools_suspected');
    }
  };

  triggerDetection(method) {
    console.warn(`🚨 Screenshot attempt detected: ${method}`);
    
    // Visual feedback
    this.showFlash();
    this.blurContent();
    this.highlightWarning();
    
    // Call callback with detection data
    if (this.onScreenshotDetected) {
      this.onScreenshotDetected({
        method,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`
      });
    }
  }

  showFlash() {
    const flash = document.createElement('div');
    flash.className = 'screenshot-flash';
    document.body.appendChild(flash);
    
    setTimeout(() => {
      flash.remove();
    }, 300);
  }

  blurContent() {
    // Temporarily blur all protected content
    const protectedElements = document.querySelectorAll('[data-protected="true"]');
    protectedElements.forEach(el => {
      el.classList.add('screenshot-blur');
    });
    
    // Remove blur after 2 seconds
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
    
    this.blurTimeout = setTimeout(() => {
      protectedElements.forEach(el => {
        el.classList.remove('screenshot-blur');
      });
    }, 2000);
  }

  highlightWarning() {
    if (this.warningOverlay) {
      this.warningOverlay.classList.add('detected');
      
      setTimeout(() => {
        this.warningOverlay.classList.remove('detected');
      }, 1500);
    }
  }
}

export default EnhancedScreenshotDetector;