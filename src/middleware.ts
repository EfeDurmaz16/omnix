import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/usage(.*)',
  '/billing(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/pricing',
  '/api/chat', // Allow guest users to use chat API
]);

export default clerkMiddleware(async (auth, req) => {
  // Reduce logging in development for better performance
  if (process.env.NODE_ENV === 'development') {
    // Only log on first load or errors
    if (req.nextUrl.pathname === '/') {
      console.log('Middleware: App loaded');
    }
  } else {
    console.log('Middleware running for:', req.nextUrl.pathname);
  }
  
  // Allow access to public routes
  if (isPublicRoute(req)) {
    if (process.env.NODE_ENV !== 'development') {
      console.log('Public route, allowing access');
    }
    return;
  }
  
  // For API routes, check authentication but don't redirect
  if (req.nextUrl.pathname.startsWith('/api/')) {
    if (process.env.NODE_ENV !== 'development') {
      console.log('API route, checking auth');
    }
    // Let the API route handle authentication
    return;
  }
  
  // Protect all other routes
  if (isProtectedRoute(req)) {
    if (process.env.NODE_ENV !== 'development') {
      console.log('Protected route, protecting');
    }
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}; 