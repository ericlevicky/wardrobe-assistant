"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/wardrobe");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo / Header */}
        <div className="mb-8">
          <div className="text-6xl mb-4">👗</div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            Wardrobe{" "}
            <span className="text-primary-600">Assistant</span>
          </h1>
          <p className="text-xl text-gray-600">
            Your AI-powered personal stylist
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="card text-center">
            <div className="text-3xl mb-2">📸</div>
            <h3 className="font-semibold text-gray-800 mb-1">Catalog Your Closet</h3>
            <p className="text-sm text-gray-600">
              Upload photos of your clothes and let AI organize your wardrobe
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">✨</div>
            <h3 className="font-semibold text-gray-800 mb-1">AI Outfit Suggestions</h3>
            <p className="text-sm text-gray-600">
              Get personalized outfit ideas powered by Gemini AI
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">🪄</div>
            <h3 className="font-semibold text-gray-800 mb-1">Virtual Try-On</h3>
            <p className="text-sm text-gray-600">
              See how outfits look on you with AI-powered styling advice
            </p>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={() => signIn("google")}
          className="inline-flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-8 rounded-xl shadow-md border border-gray-200 transition-all duration-200 hover:shadow-lg text-lg"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-sm text-gray-500">
          Free to use · Powered by Google Gemini AI · Secure login
        </p>
      </div>
    </main>
  );
}
