/**
 * SIMPLE WORKING SCREENSHOT DETECTOR
 * Just detects PrintScreen and shows effects
 */

// Create and inject warning banner immediately
function createWarningBanner() {
  const banner = document.createElement('div');
  banner.id = 'screenshot-warning-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, rgba(239,68,68,0.1) 0%, rgba(251,146,60,0.1) 100%);
      border-top: 2px solid rgba(239, 68, 68, 0.4);
      padding: 12px 20px;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: #ef4444;
      backdrop-filter: blur(10px);
      box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span>\ud83d\udd12 Encrypted Chat - Screenshots are monitored and logged</span>
    </div>
  `;
  document.body.appendChild(banner);
  return banner;
}

// Main detector class
class SimpleScreenshotDetector {
  constructor(onDetected) {
    this.onDetected = onDetected;
    this.isActive = false;
    this.banner = null;
  }

  start() {
    if (this.isActive) return;
    
    console.log('🎯 Starting screenshot detector...');
    this.isActive = true;
    
    // Create banner
    this.banner = createWarningBanner();
    console.log('✅ Warning banner created');
    
    // Add listeners with capture phase
    window.addEventListener('keydown', this.handleKeyPress, {capture: true});
    window.addEventListener('keyup', this.handleKeyPress, {capture: true});
    
    console.log('✅ Screenshot detector active!');
  }

  stop() {
    this.isActive = false;
    window.removeEventListener('keydown', this.handleKeyPress, {capture: true});
    window.removeEventListener('keyup', this.handleKeyPress, {capture: true});
    
    if (this.banner) {
      this.banner.remove();
    }
  }

  handleKeyPress = (e) => {
    // Detect PrintScreen
    if (e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen') {
      console.log('🚨 PRINT SCREEN DETECTED!');
      e.preventDefault();
      e.stopPropagation();
      this.triggerDetection('PrintScreen');
      return false;
    }

    // Mac screenshots
    if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
      console.log('🚨 MAC SCREENSHOT DETECTED!');
      this.triggerDetection('Mac Screenshot');
    }

    // Windows snipping tool
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
      console.log('🚨 SNIPPING TOOL DETECTED!');
      this.triggerDetection('Snipping Tool');
    }
  };

  triggerDetection(method) {
    console.log(`📸 Screenshot attempt: ${method}`);

    // Flash effect
    this.showFlash();
    
    // Pulse warning
    this.pulseWarning();
    
    // Blur protected content
    this.blurContent();

    // Call callback
    if (this.onDetected) {
      this.onDetected({
        method,
        timestamp: new Date().toISOString(),
        platform: navigator.platform,
        userAgent: navigator.userAgent
      });
    }
  }

  showFlash() {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: white;
      z-index: 999999;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.3s ease-out;
    `;
    document.body.appendChild(flash);
    
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 300);
    }, 10);
    
    console.log('⚡ Flash effect triggered');
  }

  pulseWarning() {
    if (this.banner) {
      const inner = this.banner.firstElementChild;
      inner.style.transition = 'all 0.3s ease';
      inner.style.transform = 'scale(1.05)';
      inner.style.background = 'rgba(239, 68, 68, 0.3)';
      
      setTimeout(() => {
        inner.style.transform = 'scale(1)';
        inner.style.background = 'linear-gradient(90deg, rgba(239,68,68,0.1) 0%, rgba(251,146,60,0.1) 100%)';
      }, 300);
      
      console.log('📢 Warning pulsed');
    }
  }

  blurContent() {
    const protectedElements = document.querySelectorAll('[data-protected="true"]');
    protectedElements.forEach(el => {
      el.style.filter = 'blur(10px)';
      el.style.transition = 'filter 0.2s ease';
      
      setTimeout(() => {
        el.style.filter = 'blur(0px)';
      }, 2000);
    });
    
    if (protectedElements.length > 0) {
      console.log(`🌀 Blurred ${protectedElements.length} protected elements`);
    }
  }
}

export default SimpleScreenshotDetector;
