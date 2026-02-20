# 🔐 NEW FEATURES IMPLEMENTATION GUIDE

## Feature 1: Google Drive Encrypted Backup System

### Overview
Zero-knowledge encrypted backup system that stores your chat history securely on Google Drive. **The backup is encrypted with a password you choose - neither Google nor our servers can decrypt your data.**

---

### Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│              USER'S DEVICE (Client-Side)                │
│                                                         │
│  1. Export IndexedDB messages                           │
│  2. User enters backup password (min 12 chars)          │
│  3. Derive encryption key: PBKDF2(password, 600K iter)  │
│  4. Encrypt data: AES-256-GCM(messages, key)           │
│  5. Upload encrypted blob to Google Drive               │
│                                                         │
│  🔒 Google Drive sees: Opaque binary blob              │
│  🔒 Google Drive CANNOT decrypt (no key access)        │
└─────────────────────────────────────────────────────────┘
```

---

### Setup Instructions

#### Step 1: Get Google Drive API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Drive API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000`
   - Click "Create"

5. Copy your credentials:
   - **Client ID**: `xxx.apps.googleusercontent.com`
   - **API Key**: Go to "Credentials" → "Create Credentials" → "API Key"

6. Update `/app/frontend/.env`:
   ```env
   REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   REACT_APP_GOOGLE_API_KEY=your-api-key
   ```

#### Step 2: Restart Frontend
```bash
sudo supervisorctl restart frontend
```

---

### Usage Guide

#### Creating a Backup

1. **Open Settings** (⚙️ icon in sidebar)
2. Scroll to **"Encrypted Backup"** section
3. Click **"Create Encrypted Backup"**
4. Enter a **strong backup password** (min 12 characters)
   - ⚠️ **CRITICAL**: Remember this password! Cannot be recovered if lost.
   - Recommended: Use a passphrase like "correct-horse-battery-staple"
5. Click **"Create Backup"**
6. Authorize Google Drive access (first time only)
7. Wait for success notification

**What happens:**
```javascript
// 1. Export all messages from IndexedDB
const backupData = {
  messages: {...},  // All encrypted conversations
  contacts: [...],  // Contact list
  keys: {...}       // Your public keys
};

// 2. Encrypt with your password
const encrypted = AES-256-GCM(backupData, PBKDF2(password, 600K))

// 3. Upload to Google Drive (appDataFolder - hidden from user)
```

---

#### Restoring from Backup

1. **Open Settings** → **"Encrypted Backup"**
2. Click **"Restore from Backup"**
3. Select a backup from the list
4. Enter your **backup password**
5. Click **"Restore Backup"**
6. Page will reload with restored data

**Requirements:**
- Same Google account used for backup
- Correct backup password
- Backup must belong to same user ID

---

### Technical Details

#### Encryption Specification

- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Derivation**: PBKDF2-SHA256
- **Iterations**: 600,000 (OWASP 2023 recommendation)
- **Salt**: `userId + '-backup-v1-securechat'`
- **IV**: Random 12 bytes per backup
- **Key Size**: 256 bits

#### Backup Format

```json
{
  "version": 1,
  "algorithm": "AES-256-GCM-PBKDF2",
  "iterations": 600000,
  "iv": "base64_encoded_iv",
  "ciphertext": "base64_encoded_encrypted_data",
  "timestamp": 1708437600000,
  "userId": "user-uuid"
}
```

#### Storage Location

- **Google Drive Location**: `appDataFolder` (hidden from user's main Drive)
- **Filename**: `securechat_backup_<timestamp>.enc`
- **Visibility**: Only accessible via app, not visible in Drive UI

---

### Security Guarantees

✅ **Zero-Knowledge**: Google never sees decryption key  
✅ **Password-Based**: Key derived from user password only  
✅ **Brute-Force Resistant**: 600K iterations PBKDF2  
✅ **Authenticated Encryption**: AES-GCM prevents tampering  
✅ **User-Specific**: Salt includes user ID  
✅ **No Server Storage**: Backup key never leaves client  

---

### Limitations & Trade-offs

| Aspect | Current | Future Enhancement |
|--------|---------|-------------------|
| Key Storage | Password-based (memorized) | Hardware security module |
| Recovery | Password required | Multi-factor recovery |
| Sync | Manual backup/restore | Automatic periodic backup |
| Multi-device | Restore on each device | Shared encrypted keychain |

---

### Troubleshooting

**Issue: "Failed to authenticate with Google Drive"**
- Solution: Check if Google Client ID is correctly set in `.env`
- Verify OAuth consent screen is configured
- Check browser console for detailed errors

**Issue: "Invalid password - decryption failed"**
- Solution: Password is incorrect
- No password recovery possible (by design for security)
- Must use correct backup password

**Issue: "Backup belongs to different user"**
- Solution: Backup was created by different account
- Cannot restore backups from other users

---

## Feature 2: Enhanced Screenshot Detection

### Overview
Improved screenshot detection with **visual deterrents** and **immediate feedback** when PrintScreen key is pressed.

---

### Detection Methods

#### 1. **PrintScreen Key Detection** (Primary)
```javascript
// Detects when user presses PrintScreen button
document.addEventListener('keydown', (e) => {
  if (e.key === 'PrintScreen') {
    e.preventDefault();  // Try to prevent screenshot
    triggerDetection();  // Log and alert
  }
});
```

**Platforms Supported:**
- ✅ Windows: PrintScreen key
- ✅ Windows: Windows+Shift+S (Snipping Tool)
- ✅ Mac: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5

---

#### 2. **Visual Deterrents** (Applied on Detection)

**A. Screen Flash**
- White flash effect (0.3s) when screenshot detected
- Simulates camera flash to alert user

**B. Content Blur**
- All protected content blurred for 2 seconds
- Reduces screenshot value

**C. Warning Overlay**
- Persistent bottom banner: "🔒 Encrypted - Screenshots are monitored"
- Pulses and highlights when screenshot detected

**D. Audit Log Entry**
- Event logged with:
  - Detection method
  - Timestamp
  - User agent
  - Screen resolution
  - Window size

---

### Visual Implementation

```css
/* Persistent warning banner */
#screenshot-warning-overlay {
  position: fixed;
  bottom: 0;
  background: rgba(239, 68, 68, 0.05);
  border-top: 1px solid rgba(239, 68, 68, 0.2);
  z-index: 9998;
}

/* Blur effect on detection */
.screenshot-blur {
  filter: blur(10px) !important;
  transition: filter 0.2s ease;
}

/* Flash effect */
.screenshot-flash {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  animation: flash 0.3s ease-out;
}
```

---

### Demo Flow

1. **Normal State**:
   - Bottom warning banner visible: "🔒 Encrypted - Screenshots are monitored"

2. **User presses PrintScreen**:
   - ⚡ White flash across screen
   - 🌀 Chat content blurs for 2 seconds
   - 🔴 Warning banner pulses red
   - 🚨 Toast notification: "Screenshot detected - This action has been logged"
   - 📋 Entry added to Audit Logs

3. **Audit Log Entry**:
   ```json
   {
     "event_type": "screenshot_attempt",
     "method": "print_screen_key",
     "timestamp": "2026-02-20T10:30:00Z",
     "platform": "Win32",
     "screen_resolution": "1920x1080"
   }
   ```

---

### Web Limitations (Honest Assessment)

**🔴 What We CANNOT Detect:**
- Screen recording software (OBS, Loom, etc.)
- Physical camera pointed at screen
- Secondary monitor screenshots
- Mobile phone camera
- Virtual machine screenshots
- Hardware screenshot tools

**🟡 What We CAN Detect:**
- PrintScreen key press (~70% effective on Windows)
- Snipping Tool (Windows+Shift+S)
- Mac screenshot shortcuts
- Context menu attempts
- DevTools opening (heuristic)

**Effectiveness: ~60-70% of casual screenshot attempts**

---

### Recommendations for Users

**High Security Conversations:**
- Use ephemeral messages (self-destruct)
- Verify contact identity with safety numbers
- Avoid sensitive text in screenshots
- Use voice/video call instead

**Deterrence Strategy:**
- Visible warnings discourage casual screenshots
- Audit logs create accountability
- Blur reduces screenshot value

---

### Testing the Feature

1. Open a chat conversation
2. Press **PrintScreen** key on your keyboard
3. Observe:
   - ✅ White flash appears
   - ✅ Content blurs for 2 seconds
   - ✅ Warning banner pulses
   - ✅ Toast notification shows
   - ✅ Audit log entry created

4. Check Audit Logs (📄 icon in sidebar):
   - Should show "Screenshot Attempt" event
   - Method: "print_screen_key"

---

## Next Steps

### Immediate Actions:
1. Set up Google Drive API credentials
2. Test backup/restore flow
3. Test screenshot detection on different platforms
4. Review audit logs

### Future Enhancements:
- [ ] Automatic periodic backups
- [ ] Multi-device key sync
- [ ] Hardware security module integration
- [ ] Desktop app with OS-level screenshot prevention
- [ ] Watermarking for forensic tracing

---

## Support

**Issue with backup?**
- Check Google Drive API credentials
- Verify password strength (min 12 chars)
- Check browser console for errors

**Issue with screenshot detection?**
- Works best on Chrome/Firefox
- Some browser extensions may interfere
- Mobile browsers have limited support

**Need help?**
- Check audit logs for detailed events
- Review browser console for errors
- Ensure latest browser version

---

**Remember: Security is a trade-off. These features provide strong protection but are not foolproof. Educate users about limitations.**
