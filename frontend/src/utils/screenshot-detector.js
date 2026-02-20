// Screenshot detection and audit logging

class ScreenshotDetector {
  constructor(onScreenshotDetected) {
    this.onScreenshotDetected = onScreenshotDetected;
    this.isActive = false;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;

    // Detect page visibility changes (when user switches apps to take screenshot)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Detect keyboard shortcuts (Ctrl+Shift+S, Cmd+Shift+3/4/5 on Mac, PrtScn on Windows)
    document.addEventListener('keyup', this.handleKeyPress);
    
    // Detect right-click attempts
    document.addEventListener('contextmenu', this.handleContextMenu);
  }

  stop() {
    this.isActive = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('keyup', this.handleKeyPress);
    document.removeEventListener('contextmenu', this.handleContextMenu);
  }

  handleVisibilityChange = () => {
    if (document.hidden) {
      // User switched away - might be taking screenshot
      this.triggerDetection('page_hidden');
    }
  };

  handleKeyPress = (e) => {
    // Windows: PrintScreen
    if (e.key === 'PrintScreen') {
      this.triggerDetection('print_screen_key');
    }
    
    // Mac: Cmd+Shift+3/4/5
    if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
      this.triggerDetection('mac_screenshot_shortcut');
    }
    
    // Windows Snipping Tool: Windows+Shift+S
    if (e.key === 's' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
      this.triggerDetection('snipping_tool');
    }
  };

  handleContextMenu = (e) => {
    // Prevent right-click in chat areas
    if (e.target.closest('[data-protected="true"]')) {
      e.preventDefault();
      this.triggerDetection('context_menu_attempt');
    }
  };

  triggerDetection(method) {
    if (this.onScreenshotDetected) {
      this.onScreenshotDetected({
        method,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      });
    }
  }
}

export default ScreenshotDetector;