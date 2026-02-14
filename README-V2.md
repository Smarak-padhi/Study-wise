# StudyWise - Professional AI-Powered Academic Planner

A production-ready academic planning system with **3 AI modes** for intelligent topic extraction, quiz generation, and progress tracking.

## 🎯 Key Features

- **3 AI Modes**: Free (rule-based), Local AI (Ollama), Cloud AI (OpenAI)
- **Smart Syllabus Processing**: Upload PDF → AI extracts topics automatically
- **Adaptive Quiz Generation**: Mode-aware quiz creation with automatic fallback
- **Rule-Based Study Plans**: Difficulty-based scheduling with time optimization
- **Progress Tracking**: Visual analytics with completion percentages
- **Professional SaaS UI**: Modern gradient design, toast notifications, responsive layout

## 🤖 AI Modes

### 1. Free (Rule-based) - Default
- ✅ Zero cost, instant responses
- ✅ Pattern matching + algorithms
- ✅ Always available as fallback

### 2. Local AI (Ollama)
- ✅ Free, privacy-focused
- ✅ Better quality than Free mode
- ✅ Runs on your machine (4GB+ RAM recommended)
- 📥 Requires: [Ollama installation](https://ollama.ai)

### 3. Cloud AI (OpenAI)
- ✅ Best quality and accuracy
- ✅ Fast API responses
- 💰 ~₹0.50/month typical usage
- 🔑 Requires: Admin to set `OPENAI_API_KEY`

**See [AI_MODES_GUIDE.md](AI_MODES_GUIDE.md) for complete setup instructions.**

## 🏗️ Architecture

**Backend**: Flask + Supabase + Multi-mode AI
**Frontend**: Vanilla HTML/CSS/JS (no frameworks!)
**Database**: PostgreSQL via Supabase
**AI**: OpenAI GPT-4o-mini + Ollama + Rule-based

## 📦 What's New (v2.0)

### Professional UI Refinement
- ✨ SaaS-style design with soft gradients and 2xl rounded corners
- 🍞 Toast notifications (no more alert())
- ⏳ Loading states with skeleton screens
- 📱 Mobile-responsive sidebar with hamburger menu
- 🎨 Consistent design system (CSS variables)

### AI Mode System
- 🔄 Automatic fallback: Cloud → Ollama → Free
- ⚙️ Settings page with real-time status checks
- 📊 Mode indicator in header
- 💬 Toast feedback for mode switches

### Enhanced UX
- ✅ Inline form validation
- 🎯 Empty states with CTAs
- 🔔 Non-blocking error handling
- 📈 Progress bars with smooth animations

## ⚡ Quick Start (5 Minutes)

### 1. Setup Supabase
```bash
# Go to supabase.com → Create project
# Copy URL and anon key
# Run SQL schema from README (scroll down)
```

### 2. Configure Environment
```bash
cd studywise
copy .env.example .env
# Edit .env with your credentials
```

### 3. Install Dependencies
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### 4. Run Backend
```bash
python app.py
# Backend runs on http://localhost:5000
```

### 5. Open Frontend
```
Open frontend/pages/dashboard-v2.html in browser
OR
cd frontend && python -m http.server 8000
```

### 6. (Optional) Enable AI Modes

**For Ollama:**
```bash
# Download from https://ollama.ai
ollama pull phi3
```

**For Cloud AI:**
```bash
# Add to backend/.env:
OPENAI_API_KEY=sk-your-key-from-platform.openai.com
```

## 📊 Database Schema

Run this in Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Syllabus uploads
CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT,
    subject VARCHAR(255),
    extracted_text TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Extracted topics
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty_level VARCHAR(50),
    estimated_hours DECIMAL(5,2),
    sequence_order INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Previous Year Questions
CREATE TABLE pyqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    year INTEGER,
    marks INTEGER,
    difficulty VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Generated quizzes
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255),
    questions JSONB NOT NULL,
    total_questions INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Quiz attempts
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER,
    total_questions INTEGER,
    answers JSONB,
    completed_at TIMESTAMP DEFAULT NOW()
);

-- Study plans
CREATE TABLE study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    plan_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Progress tracking
CREATE TABLE progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    status VARCHAR(50),
    hours_spent DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    last_updated TIMESTAMP DEFAULT NOW()
);
```

## 🎨 UI Components

### Design System
- **Colors**: Soft gradients (purple, pink, blue, green)
- **Typography**: Inter font family
- **Spacing**: 8px base system
- **Radius**: 2xl (24px) for cards
- **Shadows**: Subtle, layered

### Components
- Toast notifications
- Loading spinners & skeletons
- Empty states
- Progress bars
- Radio groups
- Badges
- Alerts

## 📁 Project Structure

```
studywise/
├── backend/
│   ├── app.py                    # Flask entry + AI mode routes
│   ├── config.py                 # Environment config
│   ├── routes/
│   │   ├── upload.py             # Syllabus/PYQ upload (mode-aware)
│   │   ├── quiz.py               # Quiz generation (mode-aware)
│   │   ├── plan.py               # Study plan generation
│   │   ├── dashboard.py          # Analytics
│   │   └── ai_mode.py            # AI mode management (NEW)
│   ├── services/
│   │   ├── ai_service.py         # Multi-mode AI (updated)
│   │   ├── ollama_service.py     # Ollama integration (NEW)
│   │   ├── pdf_processor.py     # PDF extraction
│   │   └── plan_generator.py    # Rule-based planning
│   └── database/
│       └── supabase_client.py    # DB wrapper
├── frontend/
│   ├── pages/
│   │   ├── dashboard-v2.html     # Refined dashboard (NEW)
│   │   ├── settings.html         # AI mode settings (NEW)
│   │   ├── upload.html
│   │   ├── quiz.html
│   │   └── plan.html
│   ├── css/
│   │   ├── design-system.css     # CSS variables (NEW)
│   │   └── saas-components.css   # Toast, badges, etc (NEW)
│   └── js/
│       ├── toast.js              # Toast manager (NEW)
│       ├── api-v2.js             # API wrapper with AI modes (NEW)
│       ├── settings.js           # Settings page logic (NEW)
│       └── dashboard-v2.js       # Dashboard logic (NEW)
├── AI_MODES_GUIDE.md             # Comprehensive AI setup (NEW)
└── README.md                      # This file
```

## 🔧 API Endpoints

### AI Mode Endpoints (NEW)
```
GET  /api/ai/status          # Check Ollama availability
GET  /api/ai/cloud-status    # Check OpenAI configuration
POST /api/ai/mode            # Set user AI mode
GET  /api/ai/mode/<user_id>  # Get current mode
```

### Existing Endpoints
```
POST /api/upload/syllabus    # Upload syllabus (now mode-aware)
POST /api/upload/pyq         # Upload PYQs
GET  /api/upload/uploads/<email>

POST /api/quiz/generate      # Generate quiz (now mode-aware)
POST /api/quiz/submit        # Submit quiz
GET  /api/quiz/history/<email>

POST /api/plan/generate      # Generate study plan
GET  /api/plan/<upload_id>
POST /api/plan/progress/update

GET  /api/dashboard/stats/<email>
GET  /api/dashboard/overview/<email>
```

## 💡 How AI Modes Work

### Automatic Fallback Chain
```
User selects mode → Check availability → Use if available → Else fallback

Example:
1. User chooses "Cloud AI"
2. Backend checks: Is OPENAI_API_KEY set?
   - YES → Use OpenAI
   - NO  → Try Ollama
3. Backend checks: Is Ollama running?
   - YES → Use Ollama
   - NO  → Use Free mode
4. Show toast: "Cloud AI not configured — using Free mode"
```

### Mode Detection
```javascript
// Frontend
AIMode.current // Gets from localStorage
api.setAIMode('ollama') // Saves preference

// Backend
from routes.ai_mode import get_active_mode
mode = get_active_mode(user_id) // Returns: 'free', 'ollama', or 'cloud'
```

## 🚀 Deployment

### Backend (Render/Railway)
```yaml
# Build: pip install -r requirements.txt
# Start: gunicorn app:app
# Environment variables: Copy from .env
```

### Frontend (Vercel/Netlify)
```
# Just upload frontend/ folder
# Or connect GitHub repo
```

### Database
Already on Supabase (cloud-hosted PostgreSQL)

## 💰 Cost Breakdown

- **Supabase**: FREE (500MB database)
- **Free Mode**: ₹0
- **Ollama**: ₹0 (local, uses ~2GB disk + 4GB RAM)
- **Cloud AI**: ~₹0.30-0.50/month
- **Hosting**: FREE (Render/Railway free tier)

**Total: Under ₹1/month for Cloud AI mode, ₹0 otherwise**

## 🎓 For College Projects

### ML/AI Components Demonstrated
1. **NLP**: GPT-4o-mini for text analysis
2. **Local Inference**: Ollama with Phi-3 model
3. **Rule-based ML**: Difficulty classification, time estimation
4. **Hybrid Systems**: Automatic fallback between modes
5. **API Integration**: RESTful design with mode awareness

### Talking Points
- Multi-mode architecture shows understanding of AI tradeoffs
- Automatic fallback demonstrates robust system design
- Cost-performance analysis (free vs local vs cloud)
- Privacy considerations in AI deployment

## 🔍 Troubleshooting

### "Backend not starting"
```bash
cd backend
pip install -r requirements.txt --break-system-packages
python app.py
```

### "Ollama not detected"
```bash
# Install from https://ollama.ai
ollama serve  # Start Ollama
ollama pull phi3  # Download model
```

### "Cloud AI not working"
```
1. Check .env has OPENAI_API_KEY=sk-...
2. Verify API key at platform.openai.com
3. Ensure account has credits ($5 minimum)
4. Restart backend
```

### "Toast notifications not showing"
```
Ensure toast.js is loaded before other scripts:
<script src="../js/toast.js"></script>
<script src="../js/api-v2.js"></script>
```

## 📚 Documentation

- **[AI_MODES_GUIDE.md](AI_MODES_GUIDE.md)** - Complete AI modes setup
- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup guide
- **README.md** (this file) - Complete overview

## 🌟 What's Different from v1.0

| Feature | v1.0 | v2.0 |
|---------|------|------|
| AI Modes | OpenAI only | 3 modes (Free/Ollama/Cloud) |
| UI | Basic CSS | Professional SaaS design |
| Notifications | alert() | Toast notifications |
| Loading | Static text | Skeleton screens |
| Mobile | Partial | Fully responsive |
| Error Handling | Silent failures | Inline validation + toasts |
| Cost | ~₹0.50/mo required | ₹0 with free mode |

## ✅ Production Checklist

- [ ] Backend runs without errors
- [ ] All dependencies installed
- [ ] .env configured with Supabase
- [ ] Database schema created
- [ ] AI mode selected and tested
- [ ] Frontend accessible
- [ ] Toast notifications working
- [ ] Mobile layout verified

## 📞 Support

**General Issues:**
- Check browser console (F12)
- Check backend terminal
- Verify .env file

**AI Mode Issues:**
- See [AI_MODES_GUIDE.md](AI_MODES_GUIDE.md)
- Test each mode in Settings page

**Deployment Help:**
- Backend logs show detailed errors
- CORS issues? Check Flask-CORS setup
- Database errors? Verify Supabase credentials

## 🎉 Ready to Deploy!

StudyWise v2.0 is production-ready with:
- ✅ Professional UI/UX
- ✅ Flexible AI architecture
- ✅ Zero-cost option (Free mode)
- ✅ Privacy-focused option (Ollama)
- ✅ Best-quality option (Cloud)
- ✅ Automatic fallbacks
- ✅ Comprehensive error handling

**Good luck with your project!** 🚀
