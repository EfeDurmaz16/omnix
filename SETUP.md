# Omnix Setup Guide

## Authentication Setup with Clerk

### 1. Create a Clerk Account
1. Go to [clerk.com](https://clerk.com) and sign up
2. Create a new application
3. Choose your preferred authentication methods (Email + Google recommended)

### 2. Environment Variables
Create a `.env.local` file in the root directory with your Clerk keys:

```env
# Get these from your Clerk Dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# These are already configured
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### 3. Clerk Dashboard Configuration
In your Clerk dashboard:
1. **Paths**: Set sign-in URL to `/login` and sign-up URL to `/signup`
2. **Social Providers**: Enable Google OAuth
3. **Session Management**: Keep default settings
4. **User & Authentication**: Configure as needed

### 4. Run the Application
```bash
npm run dev
```

### 5. Test Authentication
1. Go to `http://localhost:3000`
2. Click "Sign Up" to create an account
3. Test Google login
4. Access the dashboard at `/dashboard`

## Features Available
- ✅ Email/Password authentication
- ✅ Google OAuth
- ✅ Protected routes (dashboard)
- ✅ User profile management
- ✅ Session management
- ✅ Real-time user data

## Next Steps
- Set up a database for user plans and credits
- Integrate real AI APIs
- Add payment processing with Stripe
- Deploy to production 