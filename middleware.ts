import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    "/",
    "/api/health",
    "/api/webhook(.*)",
    "/manifest.json",
    "/share",
    "/file-handler",
    "/api/csrf"
  ],
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: [
    "/api/webhook(.*)",
    "/_next/(.*)",
    "/favicon.ico",
    "/manifest.json",
    "/api/csrf",
    "/(.*\\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$)",
    "/(.well-known/.*)"
  ],
  // Add additional configuration for production
  debug: process.env.NODE_ENV === 'development',
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};