# STUDYWISE - AI MODES GUIDE

## 🤖 Three AI Modes Explained

StudyWise now supports **three AI modes** for generating topics, quizzes, and summaries:

### 1. **Free (Rule-based)** ⚡
- **Cost**: ₹0 / month
- **Speed**: Instant
- **How it works**: Pattern matching and algorithms
- **Quality**: Good for basic syllabus parsing
- **Always available**: Yes, built-in fallback

### 2. **Local AI (Ollama)** 🖥️
- **Cost**: ₹0 / month (runs on your machine)
- **Speed**: Fast (depends on your hardware)
- **How it works**: Local LLM (Phi-3 model)
- **Quality**: Better than Free mode
- **Privacy**: 100% local, nothing sent to cloud

### 3. **Cloud AI (OpenAI)** ☁️
- **Cost**: ~₹0.50 / month for typical use
- **Speed**: Very fast
- **How it works**: GPT-4o-mini API
- **Quality**: Best accuracy and context understanding
- **Requires**: Admin to set API key

---

## 📋 Quick Setup

### Option 1: Free Mode (Default)
**No setup needed!** This mode works out of the box.

### Option 2: Local AI (Ollama)

#### Windows Setup:
1. **Download Ollama**
   - Go to https://ollama.ai
   - Download Windows installer
   - Run installer

2. **Install AI Model**
   ```bash
   # Open PowerShell or CMD
   ollama pull phi3
   ```

3. **Verify Installation**
   ```bash
   ollama run phi3 "Hello, test"
   # Should respond with AI-generated text
   ```

4. **Done!** Go to Settings in StudyWise and select "Local AI (Ollama)"

#### macOS/Linux Setup:
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull model
ollama pull phi3

# Test
ollama run phi3 "Hello"
```

### Option 3: Cloud AI (OpenAI)

**For Admins Only:**

1. **Get OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Create account and add payment method ($5 minimum)
   - Click "Create new secret key"
   - Copy key (starts with `sk-...`)

2. **Set in Backend**
   ```bash
   cd studywise/backend
   # Edit .env file
   ```
   
   Add this line:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

3. **Restart Backend**
   ```bash
   python app.py
   ```

4. **Done!** Users can now select "Cloud AI (OpenAI)" in Settings

---

## 🔧 Settings Page Guide

### Accessing Settings
1. Open StudyWise
2. Click "Settings" in the sidebar
3. You'll see three AI mode options

### Understanding the Status Badges

- **🟢 Ready** - Mode is available and working
- **🟡 Not detected** - Mode needs setup (Ollama not installed)
- **🟡 Not configured** - Mode needs admin setup (OpenAI key missing)
- **🔴 Error** - Something went wrong

### Testing Modes
- Click "Test All Modes" to check availability
- Each mode shows real-time status
- Automatic fallback if selected mode unavailable

---

## 🎯 When to Use Each Mode

### Use **Free Mode** when:
- ✅ You want zero cost
- ✅ You need instant responses
- ✅ Basic topic extraction is enough
- ✅ You're just testing the app

### Use **Ollama** when:
- ✅ You want better quality than Free
- ✅ You care about privacy (no data sent to cloud)
- ✅ You have decent hardware (4GB+ RAM recommended)
- ✅ You're willing to download ~2GB model once

### Use **Cloud AI** when:
- ✅ You want the best possible quality
- ✅ You need accurate quiz generation
- ✅ You're okay with small API costs
- ✅ Admin has configured OpenAI key

---

## 💡 Automatic Fallback

StudyWise is smart about AI modes:

1. **You select**: "Cloud AI"
2. **Cloud AI unavailable?** → Falls back to Ollama
3. **Ollama unavailable?** → Falls back to Free

**You'll always get a result**, and we'll show a toast notification explaining what mode was used.

Example:
```
⚠️ Cloud AI not configured — using Local AI (Ollama) instead
```

---

## 🔍 Troubleshooting

### "Ollama not detected"

**Check if Ollama is running:**
```bash
# Windows (PowerShell)
Get-Process ollama

# macOS/Linux
ps aux | grep ollama
```

**If not running, start it:**
```bash
ollama serve
```

**Test connection:**
```bash
curl http://localhost:11434/api/tags
# Should return JSON with models list
```

### "Cloud AI not configured"

**For users:**
- Contact your admin to set `OPENAI_API_KEY` in backend `.env` file
- Use Free or Ollama mode meanwhile

**For admins:**
1. Check `.env` file exists in `backend/` folder
2. Verify `OPENAI_API_KEY=sk-...` is set
3. Restart backend: `python app.py`
4. Test at http://localhost:5000/api/ai/cloud-status

### "Backend not responding"

**Check backend is running:**
```bash
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
python app.py
```

**Check port 5000 is free:**
```bash
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000
```

---

## 📊 Performance Comparison

| Feature | Free | Ollama | Cloud |
|---------|------|--------|-------|
| Topic extraction quality | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Quiz generation quality | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Speed | Instant | 2-5s | 1-3s |
| Cost | ₹0 | ₹0 | ~₹0.50/mo |
| Privacy | ✅ | ✅✅✅ | ⚠️ Cloud |
| Setup | None | Medium | Easy (admin) |

---

## 🚀 Advanced Configuration

### Changing Ollama Model

Default model is `phi3`. To use a different model:

1. **Edit backend `.env`:**
   ```
   OLLAMA_MODEL=llama2
   OLLAMA_BASE_URL=http://localhost:11434
   ```

2. **Pull the model:**
   ```bash
   ollama pull llama2
   ```

3. **Restart backend**

### Changing OpenAI Model

Default is `gpt-4o-mini`. To change:

Edit `backend/services/ai_service.py`:
```python
model="gpt-4o-mini"  # Change to gpt-4 for better quality
```

**Note:** GPT-4 costs ~20x more than GPT-4o-mini

---

## 💰 Cost Breakdown

### Typical Monthly Usage:
- 10 syllabus uploads → ~500 tokens each
- 50 quiz generations → ~300 tokens each

**Free Mode**: ₹0
**Ollama**: ₹0 (electricity ~₹5)
**Cloud AI**: ~₹0.30-0.50

### OpenAI Pricing (as of 2024):
- GPT-4o-mini: $0.15 / 1M tokens (input)
- GPT-4o-mini: $0.60 / 1M tokens (output)

**Typical use = ~20,000 tokens/month = ₹0.40**

---

## 🎓 For College Projects

All three modes demonstrate ML/AI concepts:

1. **Free Mode**: Rule-based algorithms (heuristics, pattern matching)
2. **Ollama**: Local inference with open-source LLMs
3. **Cloud AI**: API integration with commercial LLMs

**Project Report Talking Points:**
- Hybrid AI architecture
- Automatic fallback mechanisms
- Cost-performance tradeoffs
- Privacy considerations in AI deployment

---

## 📞 Support

**Can't get Ollama working?**
- Use Free mode or Cloud mode
- Check Ollama docs: https://ollama.ai/docs

**Cloud AI not working?**
- Verify API key is correct
- Check OpenAI account has credits
- Look at backend logs for errors

**General issues?**
- Check browser console (F12)
- Check backend terminal output
- Ensure all dependencies installed: `pip install -r requirements.txt`

---

## ✅ Quick Checklist

Before using StudyWise with AI modes:

- [ ] Backend is running (`python app.py`)
- [ ] Frontend is open (`index.html` or settings page)
- [ ] Decided which mode to use
- [ ] If Ollama: Installed and model pulled
- [ ] If Cloud: Admin set API key
- [ ] Tested mode in Settings page
- [ ] Ready to upload syllabi!

---

**You're all set!** 🎉

Start with Free mode and upgrade to Ollama or Cloud when you need better quality.
