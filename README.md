# Independence Pathway Platform (IPP)

A full-stack web app for Reena × York University C4 Design Lab.

---

## 🔥 Firebase Setup (5 minutes)

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `independence-pathway-platform`
3. Disable Google Analytics (not needed) → **Create project**

### 2. Enable Authentication
1. In your project → **Authentication** → **Get started**
2. Click **Email/Password** → Enable it → **Save**

### 3. Create Firestore Database
1. **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for now) → **Next**
3. Pick a region close to you (e.g. `us-east1`) → **Done**

### 4. Get Your Config
1. Click the ⚙️ gear → **Project settings**
2. Under **Your apps** → click the `</>` Web icon → Register app
3. Name it `ipp-web` → **Register app**
4. Copy the `firebaseConfig` object

### 5. Paste Config into the App
Open `src/firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123",
};
```

### 6. Apply Firestore Rules (Optional but recommended)
1. In Firestore → **Rules** tab
2. Replace the content with what's in `firestore.rules`
3. **Publish**

---

## 🚀 Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## 👤 First-Time Setup

1. Go to the app → **Sign up** as **Admin**
2. Sign in as Admin → **Directory** tab → **Add Organization**
3. Add a few organizations (Reena, Community Living Toronto, etc.)
4. Sign out → Sign up as **Caseworker**
5. Sign out → Sign up as **Family** and complete the intake

---

## 🏗️ Project Structure

```
src/
├── firebase.js              ← Firebase config (YOU EDIT THIS)
├── index.css                ← Global design system
├── App.jsx                  ← Router + splash
├── main.jsx                 ← Entry point
├── hooks/
│   └── useAuth.jsx          ← Auth context (login, signup, logout)
├── utils/
│   └── matching.js          ← Matching algorithm + timeline generator
├── components/
│   ├── Splash.jsx           ← Animated intro screen
│   ├── Nav.jsx              ← Role-aware navigation
│   └── ProtectedRoute.jsx   ← Route guard by role
└── pages/
    ├── AuthPage.jsx         ← Login + signup (role selection)
    ├── family/
    │   ├── FamilyHome.jsx   ← Family dashboard
    │   ├── IntakePage.jsx   ← 5-step intake form (saves to Firestore)
    │   ├── TimelinePage.jsx ← Generated milestones (interactive)
    │   ├── PortfolioPage.jsx← Digital portfolio from intake data
    │   └── ResourcesPage.jsx← Matched organizations (real algorithm)
    ├── caseworker/
    │   ├── CaseworkerDashboard.jsx
    │   ├── FamiliesList.jsx ← All families with readiness scores
    │   ├── FamilyDetail.jsx ← Full profile + match confirmation
    │   └── MatchesOverview.jsx
    └── admin/
        ├── AdminDashboard.jsx
        ├── ResourceDirectory.jsx ← Add/edit/delete organizations (CRUD)
        └── UsersPage.jsx
```

---

## 🧠 Matching Algorithm

Located in `src/utils/matching.js`. Scores each organization 0–100:

| Factor | Weight |
|--------|--------|
| Support level match | 30 pts |
| Housing type overlap | 25 pts |
| Geographic region | 20 pts |
| Readiness score vs minimum | 15 pts |
| Has current openings | 10 pts |

**Readiness Score** is computed from the 6 life-skills questions in the intake:
cooking, budgeting, transit, medication, hygiene, communication.
Each scored 1–4 (full support → independent). Expressed as 0–100.

---

## 🌐 Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Public dir: dist
# Single-page app: Yes
npm run build
firebase deploy
```

Your app will be live at `https://your-project.web.app`

---

## 🗄️ Firestore Collections

| Collection | Purpose |
|------------|---------|
| `users`    | User profiles with role |
| `intakes`  | Family intake assessments (uid = user uid) |
| `matches`  | Caseworker-confirmed placement matches |
| `organizations` | Resource directory entries |

---

Built with React + Vite + Firebase · Reena × York University · C4 Design Lab · 2026
