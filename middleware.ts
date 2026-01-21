import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only protect the HISTORY route. 
// We leave 'api/audit' PUBLIC so guests can use it (the backend will handle the logic).
const isProtectedRoute = createRouteMatcher([
  '/api/history(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const session = await auth();
    if (!session.userId) {
      return session.redirectToSignIn();
    }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};