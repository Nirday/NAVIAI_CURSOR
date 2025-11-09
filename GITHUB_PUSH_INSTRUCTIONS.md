# Push Code to GitHub - Authentication Options

## Option 1: Personal Access Token (Recommended)

### Step 1: Create Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `Navi AI Deployment`
4. Select expiration: **90 days** (or your preference)
5. Select scopes:
   - ✅ **repo** (Full control of private repositories)
6. Click **"Generate token"**
7. **Copy the token immediately** (you won't see it again!)

### Step 2: Push Using Token

When you run `git push`, it will ask for:
- **Username**: `Nirday` (your GitHub username)
- **Password**: Paste your Personal Access Token (not your GitHub password)

Or use this command:
```bash
git push -u origin main
# When prompted:
# Username: Nirday
# Password: [paste your token here]
```

---

## Option 2: Use SSH (Alternative)

### Step 1: Generate SSH Key (if you don't have one)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Press Enter for no passphrase (or set one)
```

### Step 2: Add SSH Key to GitHub

1. Copy your public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

2. Go to https://github.com/settings/keys
3. Click **"New SSH key"**
4. Title: `Navi AI Mac`
5. Paste the key
6. Click **"Add SSH key"**

### Step 3: Change Remote to SSH

```bash
cd /Users/rasheshmehta/Downloads/Navi_AI_Gemini/navi-ai
git remote set-url origin git@github.com:Nirday/NAVIAI_CURSOR.git
git push -u origin main
```

---

## Option 3: GitHub CLI (If Installed)

```bash
# Install GitHub CLI (if not installed)
brew install gh

# Login
gh auth login

# Push
git push -u origin main
```

---

## Quick Push (After Authentication)

Once authenticated, run:

```bash
cd /Users/rasheshmehta/Downloads/Navi_AI_Gemini/navi-ai
git push -u origin main
```

---

## Which Option Should You Use?

- **Option 1 (Token)**: Easiest, works immediately
- **Option 2 (SSH)**: More secure, better for long-term
- **Option 3 (CLI)**: If you already use GitHub CLI

**Recommendation**: Use **Option 1** for quick deployment, then set up SSH later.

