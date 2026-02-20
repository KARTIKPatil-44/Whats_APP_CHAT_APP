# 🎯 SecureChat - Complete Demo Guide

## 📍 Access URLs

**Frontend:** `http://localhost:3000`  
**Backend API:** `https://encrypted-messaging-7.preview.emergentagent.com/api`

---

## 🚀 Complete Feature Demo (10 Minutes)

### **Part 1: User Registration & Authentication** (2 min)

#### Step 1: Register First User (Alice)
1. Open `http://localhost:3000` in **Chrome/Firefox**
2. Click **"Don't have an account? Sign up"**
3. Fill in:
   - Username: `alice`
   - Email: `alice@demo.com`
   - Password: `SecurePass123!`
   - Confirm Password: `SecurePass123!`
4. Click **"Sign Up"**

**✅ Expected Result:**
- Green toast notification: "Account created! Your encryption keys have been generated"
- Automatic redirect to Dashboard
- Sidebar shows "No contacts yet"

---

#### Step 2: Register Second User (Bob)
1. Open **NEW Incognito/Private window**
2. Go to `http://localhost:3000`
3. Register as:
   - Username: `bob`
   - Email: `bob@demo.com`
   - Password: `SecurePass123!`

**✅ Expected Result:**
- Bob is logged in on second window

---

### **Part 2: User Search & Contact Management** (1 min)

#### Step 3: Alice Finds Bob
**In Alice's window:**
1. Click **"Find Users"** button (green button in sidebar)
2. Type: `bob` in search box
3. See Bob appear in results
4. Click **"Add"** button

**✅ Expected Result:**
- Success toast: "Contact added"
- Automatic redirect to chat with Bob
- Bob appears in Alice's contacts sidebar

---

### **Part 3: Encrypted Messaging** (2 min)

#### Step 4: Send Encrypted Messages

**In Alice's window:**
1. Type: `Hello Bob! This message is end-to-end encrypted 🔒`
2. Click **Send** button (paper plane icon)

**✅ Expected Result:**
- Message appears in **green bubble on right** (sent)
- Timestamp shows "a few seconds ago"
- Check mark icon shows delivery status

**In Bob's window:**
1. Click **"Find Users"** → Search `alice` → Click **"Add"**
2. Click **Alice** in contacts sidebar

**✅ Expected Result:**
- Alice's message appears in **gray bubble on left** (received)
- Message is decrypted and readable

**Reply from Bob:**
1. Type: `Hi Alice! Our conversation is secure 🛡️`
2. Click **Send**

**Back in Alice's window:**
- ✅ Bob's reply appears **instantly** (Socket.IO real-time!)

---

### **Part 4: Screenshot Detection** (1 min)

#### Step 5: Trigger Screenshot Detection

**In Alice's chat window:**
- Press **PrintScreen** key (Windows) or **Cmd+Shift+4** (Mac)
- OR press **Windows+Shift+S** (Snipping Tool)
- OR right-click in chat area

**✅ Expected Result:**
- ⚠️ Orange warning toast: "Screenshot detected - This action has been logged for security"
- Event is recorded in audit log

---

### **Part 6: Audit Logs** (1 min)

#### Step 6: View Security Audit Trail

**In Alice's window:**
1. Click **📄 document icon** in sidebar (next to Settings)

**✅ Expected Result:**
- Terminal-style log viewer with green text on black background
- Shows:
  - Event type: "Screenshot Attempt"
  - Timestamp (e.g., "2 minutes ago")
  - Detection method (e.g., "print_screen_key")
  - Platform info
  - Device details

---

### **Part 7: Settings & Account Info** (1 min)

#### Step 7: View Settings Page

**In Alice's window:**
1. Click **⚙️ gear icon** in sidebar (Settings)

**✅ Expected Result - Settings Page Shows:**

**Account Information:**
- Username: `alice`
- Email: `alice@demo.com`
- User ID: `[unique UUID]`

**Security Status:**
- End-to-end encryption: ✅ **Active**
- Encryption keys: ✅ **Generated**

---

### **Part 8: Delete Account** (2 min)

#### Step 8: Demonstrate Account Deletion

**Still in Settings:**
1. Scroll down to **"Danger Zone"** (red section)
2. Click **"Delete My Account"** button
3. In the confirmation dialog:
   - Enter password: `SecurePass123!`
   - Type confirmation text: `DELETE` (exactly in caps)
4. Click **"Delete Account Permanently"**

**✅ Expected Result:**
- Success toast: "Account deleted successfully - All your data has been permanently removed"
- After 2 seconds, automatic logout
- Redirected to login page

**Verify Deletion:**
- Try logging in with alice@demo.com → ❌ Should fail (user doesn't exist)
- In Bob's window, Alice is removed from contacts

**What Gets Deleted:**
- ✅ User account and profile
- ✅ All sent messages
- ✅ All received messages
- ✅ All contacts
- ✅ User removed from others' contact lists
- ✅ All audit logs
- ✅ All encryption keys

---

## 🔍 Advanced Demo Features

### **Feature 1: Real-time Synchronization**
1. Keep Alice and Bob windows side-by-side
2. Send message from Alice
3. Watch it appear **instantly** in Bob's window (no refresh needed!)

### **Feature 2: Message Persistence**
1. Send messages between Alice and Bob
2. Close browser
3. Re-open and login as Alice
4. Click on Bob in contacts
5. ✅ Previous messages are still there (loaded from encrypted IndexedDB)

### **Feature 3: Multiple Contacts**
1. Create 3rd user (Charlie)
2. Have Alice add both Bob and Charlie
3. Switch between conversations in sidebar
4. ✅ Each conversation is independently encrypted

### **Feature 4: Network Inspection (Prove E2E Encryption)**
1. Open Chrome DevTools (F12) → **Network** tab
2. Send a message
3. Click on `/api/messages` POST request
4. View **Request Payload**:

```json
{
  "receiver_id": "117aad0a...",
  "encrypted_content": "U2FsdGVkX1+abc123...",  // ← Server never sees plaintext!
  "iv": "rnNzM2RmZg==",
  "sender_public_key": "MFkwEw..."
}
```

**✅ Proves:** Server only stores encrypted blobs, never plaintext!

---

## 🎬 Recommended Demo Flow (For Presentations)

**For maximum impact, demo in this order:**

1. **🔐 Registration** (show key generation toast)
   - *Talking Point:* "Encryption keys are generated on-device, never sent to server"

2. **🔍 User Search** (show contact discovery)
   - *Talking Point:* "Privacy-focused search - only shows usernames/emails"

3. **💬 Real-time Messaging** (send messages between two users)
   - *Talking Point:* "Messages encrypted before leaving device, transmitted encrypted, decrypted only on recipient's device"

4. **📸 Screenshot Detection** (trigger warning)
   - *Talking Point:* "Multi-method detection: keyboard shortcuts, page visibility, right-click attempts"

5. **📋 Audit Logs** (show security trail)
   - *Talking Point:* "Complete audit trail for compliance and security monitoring"

6. **⚙️ Settings** (show account info and security status)
   - *Talking Point:* "Transparent security status with clear indicators"

7. **🗑️ Delete Account** (demonstrate complete data removal)
   - *Talking Point:* "GDPR-compliant - complete data deletion including messages sent to others"

8. **🔬 Network Inspection** (show encrypted payloads)
   - *Talking Point:* "Even if server is compromised, messages remain secure"

---

## 🧪 Quick API Test (Without UI)

```bash
API_URL="https://encrypted-messaging-7.preview.emergentagent.com/api"

# Test 1: Health check
curl -X GET "$API_URL/"

# Test 2: Register user
curl -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "password": "Test123!",
    "public_key": "mock_key_123"
  }'

# Test 3: Login
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' | \
  python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

echo "Token: $TOKEN"

# Test 4: Get contacts
curl -X GET "$API_URL/contacts" \
  -H "Authorization: Bearer $TOKEN"

# Test 5: Delete account
curl -X DELETE "$API_URL/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password":"Test123!","confirmation_text":"DELETE"}'
```

---

## 🎤 Key Talking Points

### **Security Architecture:**
1. **"Zero Knowledge"** - Server never has access to plaintext messages
2. **"Client-Side Encryption"** - All encryption/decryption happens in browser
3. **"Perfect Forward Secrecy"** - Each message encrypted with unique IV
4. **"Multi-Factor Protection"** - Screenshot detection, audit logging, password confirmation

### **Privacy Features:**
1. **"Data Sovereignty"** - Users own their data, can delete anytime
2. **"Complete Deletion"** - GDPR-compliant permanent removal
3. **"Encrypted Storage"** - Even local storage uses encryption (IndexedDB)
4. **"Audit Trail"** - Transparent security event logging

### **Technical Implementation:**
1. **"Web Crypto API"** - Native browser encryption (AES-256-GCM)
2. **"Diffie-Hellman"** - ECDH P-384 for key exchange
3. **"Socket.IO"** - Real-time encrypted message delivery
4. **"JWT Authentication"** - Secure token-based auth with bcrypt

---

## 🐛 Troubleshooting

**Issue: Frontend not loading**
```bash
sudo supervisorctl restart frontend
# Wait 10 seconds, then refresh
```

**Issue: Messages not sending**
- Check browser console (F12) for errors
- Look for "Socket connected" message
- Verify backend is running: `curl http://localhost:8001/api/`

**Issue: Audit logs empty**
- Trigger screenshot detection first (press PrintScreen)
- Check: `curl -H "Authorization: Bearer $TOKEN" $API_URL/audit-logs`

**Issue: Delete account not working**
- Verify password is correct
- Confirm you typed "DELETE" exactly (all caps)
- Check browser console for error details

---

## 📊 Success Metrics

After demo, you should have shown:
- ✅ User registration with automatic key generation
- ✅ Real-time encrypted messaging (E2E)
- ✅ Screenshot detection and audit logging
- ✅ User search and contact management
- ✅ Settings page with security status
- ✅ Complete account deletion (GDPR-compliant)
- ✅ Network inspection proving encryption
- ✅ Message persistence (encrypted local storage)

---

## 🎓 Technical Deep Dive Questions & Answers

**Q: How do you ensure the server never sees plaintext?**  
A: Messages are encrypted with Web Crypto API (AES-256-GCM) **before** being sent. Server only receives Base64-encoded ciphertext + IV.

**Q: What happens if I lose my device?**  
A: Encryption keys are session-based. Login from new device generates new key pair. Old messages can't be decrypted without original keys (this is by design for security).

**Q: Can administrators read messages?**  
A: No. Even database administrators only see encrypted blobs. Without the private keys (stored only in user's browser), messages are unreadable.

**Q: How is screenshot detection implemented?**  
A: Multi-method approach:
- Keyboard event listeners (PrintScreen, Cmd+Shift+3/4/5, Windows+Shift+S)
- Page Visibility API (detects tab switches)
- Context menu prevention (right-click blocking in protected areas)

**Q: Is the deletion really permanent?**  
A: Yes. Backend endpoint deletes:
- User record from `users` collection
- All messages (sent AND received) from `messages` collection
- All contacts from `contacts` collection
- User from others' contact lists
- All audit logs from `audit_logs` collection

---

**🎉 You're now ready to deliver a professional demo of SecureChat!**
