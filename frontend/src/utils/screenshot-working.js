/**
 * Working Screenshot Detector
 * Detects PrintScreen and applies visual effects
 */

class WorkingScreenshotDetector {
  constructor(onDetected) {
    this.onDetected = onDetected;
    this.isActive = false;
    this.warningBanner = null;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;

    // Create warning banner
    this.createWarningBanner();

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('keyup', this.handleKeyUp, true);
    
    console.log('✅ Screenshot detector started');
  }

  stop() {
    this.isActive = false;
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('keyup', this.handleKeyUp, true);
    
    if (this.warningBanner) {
      this.warningBanner.remove();
    }
  }

  createWarningBanner() {
    this.warningBanner = document.createElement('div');
    this.warningBanner.id = 'screenshot-warning';
    this.warningBanner.innerHTML = `
      <div style="
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(to right, rgba(239, 68, 68, 0.1), rgba(251, 146, 60, 0.1));
        border-top: 2px solid rgba(239, 68, 68, 0.3);
        padding: 10px 20px;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: #ef4444;
        backdrop-filter: blur(10px);
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span style="font-weight: 500;">🔒 Encrypted - Screenshots are monitored and logged</span>
      </div>
    `;
    document.body.appendChild(this.warningBanner);
  }

  handleKeyDown = (e) => {
    // PrintScreen detection
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      console.log('🚨 PrintScreen detected!');
      this.triggerDetection('print_screen_key');
      e.preventDefault();
      return false;
    }

    // Mac: Cmd+Shift+3/4/5
    if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
      console.log('🚨 Mac screenshot shortcut detected!');
      this.triggerDetection('mac_screenshot');
    }

    // Windows: Win+Shift+S
    if (e.key === 's' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
      console.log('🚨 Snipping tool detected!');
      this.triggerDetection('snipping_tool');
    }
  };

  handleKeyUp = (e) => {
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      this.triggerDetection('print_screen_release');
    }
  };

  triggerDetection(method) {
    console.log(`📸 Screenshot attempt: ${method}`);

    // Visual effects
    this.showFlash();
    this.blurContent();
    this.pulseWarning();

    // Call callback
    if (this.onDetected) {
      this.onDetected({
        method,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      });
    }
  }

  showFlash() {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      z-index: 99999;
      pointer-events: none;
      animation: flashAnim 0.3s ease-out;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flashAnim {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes blurAnim {
        0% { filter: blur(0px); }
        50% { filter: blur(10px); }
        100% { filter: blur(0px); }
      }
      @keyframes pulseAnim {
        0%, 100% { transform: scale(1); background: rgba(239, 68, 68, 0.1); }
        50% { transform: scale(1.02); background: rgba(239, 68, 68, 0.3); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
  }

  blurContent() {
    const protectedElements = document.querySelectorAll('[data-protected="true"]');
    protectedElements.forEach(el => {
      el.style.animation = 'blurAnim 2s ease-out';
      setTimeout(() => {
        el.style.animation = '';
      }, 2000);
    });
  }

  pulseWarning() {
    if (this.warningBanner) {
      const inner = this.warningBanner.firstElementChild;
      inner.style.animation = 'pulseAnim 0.5s ease-in-out 3';
      setTimeout(() => {
        inner.style.animation = '';
      }, 1500);
    }
  }
}

export default WorkingScreenshotDetector;