# Cookie Authentication Issue - Root Cause & Solution

## 🔍 **Real Issue Identified**

The portfolio picker authentication problem was **NOT** due to missing Authorization headers, but due to **httpOnly cookies not being accessible to client-side JavaScript**.

### **The Problem Chain:**

1. ✅ **Authentication cookies ARE being set** by the API (`access_token`, `refresh_token`, `user`)
2. ✅ **Server-side middleware CAN read cookies** (middleware logs show cookies present)
3. ✅ **Server-side API calls work** (`apiFetchServer` can read cookies via `next/headers`)
4. ❌ **Client-side JavaScript CANNOT read httpOnly cookies** (`document.cookie` is empty)
5. ❌ **Client-side API calls fail** because cookies aren't accessible to add to Authorization headers

## 🔐 **Security Context**

The cookies are correctly set as **`httpOnly: true`** for security:

```typescript
// finatra-api/src/modules/auth/auth.controller.ts
response.cookie('access_token', data.access_token, {
  httpOnly: true, // ✅ SECURE: Not accessible to JavaScript
  sameSite: 'lax', // ✅ SECURE: CSRF protection
  secure: !isDev, // ✅ SECURE: HTTPS in production
  path: '/',
});
```

This is **correct security practice** - authentication tokens should not be accessible to client-side JavaScript to prevent XSS attacks.

## 🛠️ **Correct Solution**

### **Option 1: Pure Cookie Authentication (Recommended)**

Instead of trying to read cookies in JavaScript, rely on the browser automatically sending httpOnly cookies with `credentials: 'include'`:

```typescript
// finatra-client-v1/lib/api/http.ts
export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include', // ✅ Automatically sends httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      // ❌ NO Authorization header needed - cookies handle auth
    },
  });
}
```

### **Option 2: Hybrid Approach (If Authorization headers needed)**

Set a separate non-httpOnly token for client-side access while keeping main tokens secure:

```typescript
// Set both httpOnly (secure) and regular (client-accessible) tokens
response.cookie('access_token', token, { httpOnly: true }); // Server-side
response.cookie('client_token', token, { httpOnly: false }); // Client-side
```

## 🔧 **Implemented Fixes**

### **1. Updated Client-side API calls**

```typescript
// Removed Authorization header logic, rely on cookies
const res = await fetch(url, {
  credentials: 'include', // Browser automatically sends httpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});
```

### **2. Enhanced CORS Configuration**

```typescript
// finatra-api/src/main.ts
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ],
  credentials: true, // ✅ Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
});
```

### **3. Added Debugging Tools**

- **Cookie Test Component**: Shows what cookies are accessible to JavaScript
- **Authentication Guard Debug**: Logs what cookies the API receives
- **Portfolio Debug Component**: Shows authentication status

## 🧪 **Testing & Validation**

### **Expected Behavior:**

1. ✅ **Cookie Test Component** should show empty or limited cookies (httpOnly ones won't appear)
2. ✅ **API Authentication Guard** should log received cookies from browser
3. ✅ **Portfolio API calls** should succeed using cookie authentication
4. ✅ **Debug Component** should show successful portfolio loading

### **Debug Output Should Show:**

```json
{
  "auth": {
    "hasAccessToken": false,     // ✅ Expected - httpOnly cookie
    "hasRefreshToken": false,    // ✅ Expected - httpOnly cookie
    "hasUserCookie": false,      // ✅ Expected - httpOnly cookie
  },
  "authTest": {
    "documentCookies": "",       // ✅ Expected - httpOnly cookies not visible
    "allCookieNames": []         // ✅ Expected - only non-httpOnly cookies visible
  },
  "portfolios": {
    "data": [...],               // ✅ Should work via cookie auth
    "pagination": null
  }
}
```

## 🎯 **Key Insights**

1. **httpOnly cookies are INVISIBLE to JavaScript** - this is by design for security
2. **Browser automatically sends httpOnly cookies** with `credentials: 'include'`
3. **API should receive cookies** even though client JavaScript can't see them
4. **No Authorization header needed** when using cookie authentication
5. **CORS configuration is critical** for cookie-based authentication

## 🚀 **Expected Resolution**

After these changes:

1. ✅ **Client-side API calls** should succeed using cookie authentication
2. ✅ **Portfolio picker** should load and display portfolios
3. ✅ **Authentication flow** works securely without exposing tokens to JavaScript
4. ✅ **Debug tools** provide visibility into the authentication process

The authentication issue should be resolved while maintaining security best practices by keeping sensitive tokens in httpOnly cookies.
