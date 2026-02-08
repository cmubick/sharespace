# Password Gate Implementation

This ShareSpace frontend includes a password-protected login gate that must be passed before accessing the main application.

## Features

- ✅ Login screen with password prompt
- ✅ Hint text display: "Vladamir's nickname"
- ✅ Password stored in environment variables (`VITE_APP_PASSWORD`)
- ✅ localStorage-based session management
- ✅ Protected routes using React Router
- ✅ Logout button that clears session
- ✅ Dark mode minimal UI
- ✅ Mobile responsive design

## Components

### `/src/pages/LoginPage.tsx`
Main login page component with:
- Password input field
- Hint text display
- Error message handling
- Form submission handling
- Redirect to home on correct password

### `/src/components/ProtectedRoute.tsx`
Route wrapper component that:
- Checks localStorage for `sharespace_access` flag
- Redirects unauthenticated users to `/login`
- Wraps protected routes

### `/src/styles/LoginPage.css`
Dark mode styling for the login page with:
- Gradient backgrounds
- Smooth transitions and hover effects
- Mobile responsive layout
- Form input focus states

## Configuration

### Environment Variables
Create a `.env.local` file in the frontend directory:

```env
# Password for the gate (default: "shitbird")
VITE_APP_PASSWORD=shitbird

# Hint text shown to users (default: "Vladamir's nickname")
VITE_PASSWORD_HINT=Vladamir's nickname
```

## Usage

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Access the app:**
   - Navigate to `http://localhost:5173/`
   - You'll be redirected to `/login`
   - Enter the password (default: ` `)
   - Click "Enter" to access the app

3. **Logout:**
   - Click the "Logout" button in the header
   - localStorage is cleared, session ends
   - You're redirected back to `/login`

## Security Notes

⚠️ **This is a CLIENT-SIDE ONLY implementation** - suitable for light access control only.

- Password is stored in environment variables (not hardcoded)
- Access flag is stored in browser localStorage
- No backend validation is performed
- **Do not use for sensitive data protection**
- For production use, implement proper backend authentication

## Future Enhancements

- [ ] Backend password validation
- [ ] User authentication system
- [ ] Session tokens with expiration
- [ ] Rate limiting on failed attempts
- [ ] Password reset functionality

## File Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── LoginPage.tsx          # Login page component
│   ├── components/
│   │   └── ProtectedRoute.tsx     # Route protection wrapper
│   ├── styles/
│   │   └── LoginPage.css          # Login page styling
│   ├── App.tsx                    # Updated with Router and logout
│   ├── App.css                    # Dark mode app styling
│   └── index.css                  # Global dark mode styles
├── .env.local                     # Environment configuration
└── package.json                   # Updated with react-router-dom
```

## Styling

- **Theme:** Dark mode with gradients
- **Colors:** Dark grays (#1a1a1a, #2d2d2d), light text (#ffffff)
- **Accent:** Cyan blue (#0ea5e9) for inputs and buttons
- **Status:** Red (#ef4444) for logout button
- **Responsive:** Mobile-friendly breakpoint at 480px
