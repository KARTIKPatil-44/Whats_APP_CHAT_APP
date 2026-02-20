# SecureChat Backup & Restore Guide

## How It Works

SecureChat uses **zero-knowledge encrypted backups** stored on Google Drive. Here's what that means:

1. **Your backup password encrypts everything locally** - before any data leaves your device
2. **Google only stores encrypted blobs** - they cannot read your messages
3. **We never see your password** - it's only used in your browser

---

## Creating a Backup

### Step 1: Go to Settings
- Click the **gear icon (⚙️)** in the sidebar
- Or click your username and select **Settings**

### Step 2: Create Encrypted Backup
1. Scroll to the **"Google Drive Backup"** section
2. Click **"Create Encrypted Backup"**
3. A dialog will appear

### Step 3: Set Your Backup Password
- Enter a **strong password** (minimum 12 characters)
- Confirm the password
- **⚠️ IMPORTANT: Remember this password!** If you lose it, your backup cannot be recovered.

### Step 4: Authorize Google Drive
1. Click **"Create Backup"**
2. A Google sign-in popup will appear
3. Sign in with your Google account
4. Click **"Allow"** to grant access

### Step 5: Wait for Upload
- You'll see progress indicators:
  - "Initializing Google Drive..."
  - "Exporting chat data..."
  - "Encrypting backup..."
  - "Uploading to Google Drive..."
- Once complete, you'll see a success message

### What Gets Backed Up
- All your encrypted messages
- Your contact list
- Metadata (message counts, timestamps)

### What's NOT Backed Up
- Your encryption private key (stays on your device)
- Your login password

---

## Restoring from Backup

### When to Restore
- When you set up SecureChat on a new device
- If you clear your browser data
- To recover messages after reinstalling

### Step 1: Go to Settings
- Login to SecureChat with your account
- Click the **gear icon (⚙️)** to access Settings

### Step 2: Restore from Backup
1. Scroll to **"Google Drive Backup"**
2. Click **"Restore from Backup"**
3. Google sign-in popup may appear - authorize it

### Step 3: Select Your Backup
- You'll see a list of available backups
- Each shows:
  - Filename with timestamp
  - Date created
  - File size
- Click to select the backup you want

### Step 4: Enter Backup Password
- Enter the password you used when creating that backup
- Click **"Restore Backup"**

### Step 5: Complete Restore
- Progress will show:
  - "Downloading backup from Google Drive..."
  - "Decrypting backup..."
  - "Restoring data..."
- Success message shows restored message/contact counts
- The page will automatically reload

---

## Troubleshooting

### "Failed to authenticate with Google Drive"
**Solution:**
1. Make sure pop-ups are enabled for this site
2. Try a different browser (Chrome recommended)
3. Check your internet connection
4. Contact the app admin to verify Google Cloud Console setup

### "Invalid password - decryption failed"
**Solution:**
- Double-check you're using the exact password from backup creation
- Passwords are case-sensitive
- If forgotten, that backup cannot be recovered (create a new one)

### "No backups found"
**Cause:**
- You haven't created any backups yet
- You're signed into a different Google account

**Solution:**
- Create your first backup
- Make sure you're using the same Google account

### "This backup belongs to a different user account"
**Cause:**
- The backup was created by a different SecureChat account

**Solution:**
- Login with the correct SecureChat account
- Or create a new backup with your current account

### Google popup blocked
**Solution:**
1. Look for a blocked popup notification in your browser
2. Allow popups for this site
3. Try again

---

## Security Best Practices

### Password Recommendations
- Use at least 16 characters
- Mix uppercase, lowercase, numbers, and symbols
- Don't reuse your login password
- Store your backup password securely (password manager recommended)

### Backup Frequency
- Create a new backup after important conversations
- Weekly backups are a good habit
- After adding new contacts

### Google Account Security
- Use 2-Factor Authentication on your Google account
- Review connected apps periodically
- Use a secure, unique password for Google

---

## Technical Details

### Encryption Specs
- **Key Derivation**: PBKDF2 with 600,000 iterations
- **Encryption**: AES-256-GCM
- **Salt**: User ID + version string (prevents rainbow tables)

### Storage Location
- Backups are stored in Google Drive's **appDataFolder**
- This is a hidden folder only accessible by SecureChat
- Files are not visible in your regular Google Drive

### Data Flow
```
Your Device                    Google Drive
┌──────────────────┐          ┌──────────────────┐
│ Messages         │          │                  │
│ ↓                │          │                  │
│ JSON Export      │          │                  │
│ ↓                │          │                  │
│ Password + Salt  │          │                  │
│ ↓                │          │                  │
│ PBKDF2 Key       │          │                  │
│ ↓                │          │                  │
│ AES-256 Encrypt  │────────> │ Encrypted Blob   │
│                  │          │ (unreadable)     │
└──────────────────┘          └──────────────────┘
```

---

## FAQ

**Q: Can Google read my backup?**
A: No. Your backup is encrypted before upload. Only you (with your password) can decrypt it.

**Q: What if I forget my backup password?**
A: That backup cannot be recovered. Create a new backup with a password you'll remember.

**Q: Can I restore on a different device?**
A: Yes! That's the main purpose. Just login, connect Google Drive, and restore.

**Q: Does restoring delete my current messages?**
A: It adds/overwrites messages from the backup. Consider backing up current data first.

**Q: How large are backups?**
A: Depends on your message count. Typically a few KB to several MB.

**Q: Can I have multiple backups?**
A: Yes. Each backup is saved with a unique timestamp.

---

## Need Help?

If you encounter issues not covered here:
1. Check browser console for error messages (F12 → Console)
2. Ensure Google Drive API is enabled in Google Cloud Console
3. Verify authorized origins are configured correctly
