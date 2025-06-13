# Remore Market – Production Ready

This is the full production-ready version of **Remore Market**, a second-hand fashion marketplace inspired by Vinted.

---

## ✅ Features

- Full Expo + React Native frontend
- Supabase backend (auth, storage, database, edge functions)
- Stripe Connect integration (escrow, payout, refunds)
- Item listings, favorites, reviews, disputes, messages
- Admin panel for analytics and management
- Wallet system with mixed payments
- Modular file structure for easy scaling

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/your-user/remore-market.git
cd remore-market
```

### 2. Setup environment
Copy `.env.example` and fill in your values:
```bash
cp .env.example .env
```

### 3. Install dependencies
```bash
npm install
```

### 4. Run locally
```bash
npx expo start
```

### 5. Deploy Edge Functions (optional)
```bash
supabase functions deploy all
```

---

## 📱 Build for Stores

### Android:
```bash
eas build -p android
```

### iOS:
```bash
eas build -p ios
```

---

## ⚙️ Technologies

- Expo SDK 53+
- Supabase
- Stripe
- TypeScript
- Edge Functions
- Native Payments
