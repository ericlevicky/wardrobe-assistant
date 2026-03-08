import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

async function refreshAccessToken(refreshToken: string) {
  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
  } catch (networkError) {
    throw new Error(`Network error while refreshing token: ${networkError}`);
  }

  const tokens = await response.json();

  if (!response.ok) {
    throw new Error(tokens.error ?? "Failed to refresh access token");
  }

  return {
    accessToken: tokens.access_token as string,
    expiresAt: Math.floor(Date.now() / 1000) + (tokens.expires_in as number),
    refreshToken: (tokens.refresh_token as string | undefined) ?? refreshToken,
  };
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        // token.sub is the Google user ID (stable, unique per Google account)
        token.userId = token.sub;
        return token;
      }

      // Return the token as-is if it hasn't expired yet
      if (typeof token.expiresAt === "number" && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // Access token has expired; try to refresh it
      if (!token.refreshToken) {
        console.error("No refresh token available");
        return { ...token, error: "RefreshAccessTokenError" };
      }

      try {
        const refreshed = await refreshAccessToken(token.refreshToken);
        return {
          ...token,
          accessToken: refreshed.accessToken,
          expiresAt: refreshed.expiresAt,
          refreshToken: refreshed.refreshToken,
        };
      } catch (error) {
        console.error("Error refreshing access token:", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.userId = token.userId as string;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
