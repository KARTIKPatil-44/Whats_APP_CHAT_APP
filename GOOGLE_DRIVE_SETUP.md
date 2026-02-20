# 🔐 Google Drive Integration Setup - Final Steps

## ✅ Current Status
Your Google Drive credentials have been configured:
- **Client ID**: `265921296101-utjrll0us2ueaqtrmuoosp3uqb3f45ia.apps.googleusercontent.com`
- **Project ID**: `bionic-unity-488012-b4`

---

## 🚨 IMPORTANT: Configure Authorized Origins

You need to add authorized JavaScript origins and redirect URIs in Google Cloud Console.

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select project: **bionic-unity-488012-b4**
3. Navigate to: **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID: `265921296101-utjrll0us2ueaqtrmuoosp3uqb3f45ia`
5. Click **Edit** (pencil icon)

---

### Step 2: Add Authorized JavaScript Origins

Add these URLs to **"Authorized JavaScript origins"**:

```
http://localhost:3000
https://encrypted-messaging-7.preview.emergentagent.com
```

---

### Step 3: Add Authorized Redirect URIs

Add these URLs to **"Authorized redirect URIs"**:

```
http://localhost:3000
http://localhost:3000/
https://encrypted-messaging-7.preview.emergentagent.com
https://encrypted-messaging-7.preview.emergentagent.com/
```

---

### Step 4: Enable Google Drive API

1. In Google Cloud Console, go to: **APIs & Services** → **Library**
2. Search for: **"Google Drive API"**
3. Click on it and press **"Enable"**
4. Wait for confirmation (usually instant)

---

### Step 5: Restart Frontend

```bash
sudo supervisorctl restart frontend
```

Wait ~10 seconds for the app to reload.

---

## 🧪 Testing the Backup Feature

### Test 1: Create a Backup

1. Open app: `http://localhost:3000`
2. Login or register
3. Click **Settings** icon (⚙️) in sidebar
4. Scroll to **"Encrypted Backup"** section
5. Click **"Create Encrypted Backup"**
6. Enter backup password: `MySecureBackup2026!`
7. Confirm password
8. Click **"Create Backup"**
9. **Google OAuth popup will appear** → Click **"Allow"**
10. Wait for success notification

**Expected Result:**
```
✅ "Backup created successfully!"
✅ "Encrypted backup uploaded to Google Drive"
```

---

### Test 2: Verify Backup in Google Drive

**Note:** Backup is stored in hidden `appDataFolder`, not visible in regular Drive UI.

To verify programmatically:
1. Click **"Restore from Backup"** in Settings
2. You should see your backup listed with timestamp

---

### Test 3: Restore from Backup

1. In Settings, click **"Restore from Backup"**
2. Select the backup from list
3. Enter your backup password: `MySecureBackup2026!`
4. Click **"Restore Backup"**
5. Wait for success notification
6. Page will reload with restored data

---

## 🔍 Troubleshooting

### Error: "Google API not loaded"
**Solution:**
- Refresh the page
- Check browser console for errors
- Ensure internet connection is stable

---

### Error: "Failed to authenticate with Google Drive"
**Solution:**
- Verify authorized origins are configured correctly
- Check if Google Drive API is enabled
- Try logging out of Google and logging back in

---

### Error: "Invalid client ID"
**Solution:**
- Double-check the Client ID in `.env` matches Google Cloud Console
- Restart frontend after changing `.env`

---

### Error: "Access denied" or "Insufficient permissions"
**Solution:**
- Check OAuth consent screen is configured
- Add your Google account to test users (if app is not published)
- Verify scope includes `https://www.googleapis.com/auth/drive.appdata`

---

## 🔒 Security Notes

### ✅ What's Secure:
- **Client ID is public** - safe to expose in frontend code
- **Client Secret is NOT used** - OAuth flow doesn't need it in web apps
- **Backup encryption key never leaves client** - derived from user password
- **Google cannot decrypt backups** - zero-knowledge architecture

### ⚠️ Important:
- **Never expose Client Secret in frontend** (already handled - it's not in code)
- **Backup password is never sent to server** - only used locally
- **Google Drive sees only encrypted blobs** - no plaintext access

---

## 📊 What Happens During Backup

```
┌────────────────────────────────────────┐
│         USER'S BROWSER                 │
│                                        │
│  1. User enters password               │
│  2. Export IndexedDB messages          │
│  3. Derive key: PBKDF2(pass, 600K)    │
│  4. Encrypt: AES-256-GCM(data, key)   │
│  5. Upload encrypted blob              │
└────────────────────────────────────────┘
                  │
                  │ OAuth Token
                  ▼
┌────────────────────────────────────────┐
│         GOOGLE DRIVE API               │
│                                        │
│  • Receives: Encrypted binary blob    │
│  • Stores in: appDataFolder (hidden)  │
│  • Cannot decrypt: No key access      │
└────────────────────────────────────────┘
```

---

## 📝 Next Steps After Setup

1. ✅ Configure authorized origins (Steps 1-3 above)
2. ✅ Enable Google Drive API (Step 4)
3. ✅ Restart frontend (Step 5)
4. ✅ Test backup creation
5. ✅ Test restore functionality
6. ✅ Verify audit logs show backup events

---

## 🎉 Ready to Use!

Once you complete the setup above, your app will have:
- ✅ Zero-knowledge encrypted backups
- ✅ Secure Google Drive integration
- ✅ Cross-device restore capability
- ✅ Password-protected backup encryption

**Remember:** Keep your backup password safe - it cannot be recovered if lost!
