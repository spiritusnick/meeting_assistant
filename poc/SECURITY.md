# Security & API Keys

## Environment Variables

This application uses several API keys and sensitive credentials. **NEVER commit these to git!**

### Required API Keys

1. **OpenAI API Key** (`OPENAI_API_KEY`)
   - Used for: Whisper transcription and GPT-4 summarization
   - Get it from: https://platform.openai.com/api-keys
   - Cost: Pay-per-use (approximately $0.01-0.10 per meeting)
   - Security: Keep this secret! It has access to your OpenAI account

2. **Email Credentials** (`EMAIL_USER`, `EMAIL_PASS`)
   - Used for: Sending meeting summaries via email
   - For Gmail: Create app-specific password at https://myaccount.google.com/apppasswords
   - Security: Never use your main password, always use app-specific passwords

### Setup Instructions

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual values:
   ```bash
   nano .env  # or use your preferred editor
   ```

3. Verify `.env` is in `.gitignore` (it should be!):
   ```bash
   grep "^.env$" .gitignore
   ```

### Security Best Practices

1. **API Key Rotation**
   - Rotate your OpenAI API key every 90 days
   - If you suspect a leak, regenerate immediately

2. **Email Security**
   - Always use app-specific passwords, not your main password
   - Enable 2FA on your email account
   - Consider using a dedicated email for the app

3. **Git Safety**
   - The `.gitignore` file prevents committing sensitive files
   - Always check `git status` before committing
   - Never force-add .env files: `git add -f .env` ❌

4. **Sharing Code**
   - When sharing, ensure `.env` is not included
   - Share `.env.example` instead
   - Document which keys are needed without sharing values

### If You Accidentally Commit Secrets

If you accidentally commit API keys:

1. **Immediately revoke the exposed keys**
   - OpenAI: Regenerate API key in dashboard
   - Email: Change app-specific password

2. **Remove from git history**:
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch .env" \
   --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push** (coordinate with team):
   ```bash
   git push --force --all
   ```

### Environment Variable Reference

| Variable | Required | Purpose | Where to Get |
|----------|----------|---------|--------------|
| `OPENAI_API_KEY` | Yes | AI transcription & summaries | https://platform.openai.com/api-keys |
| `EMAIL_USER` | For email | Sender email address | Your email provider |
| `EMAIL_PASS` | For email | App-specific password | Gmail: https://myaccount.google.com/apppasswords |
| `EMAIL_SERVICE` | No | Email provider (default: gmail) | N/A |
| `DATABASE_URL` | Yes | Database location | Auto-generated |
| `DEVICE_NAME` | No | Audio device override | System audio settings |

### Monitoring Usage

- Check OpenAI usage: https://platform.openai.com/usage
- Set up usage alerts in OpenAI dashboard
- Monitor for unusual activity