"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (status === "authenticated") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💰 Money Management
          </h1>
          <p className="text-gray-600 mb-8">
            Take control of your finances with our comprehensive money management solution
          </p>
          
          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 block text-center"
            >
              Sign In
            </Link>
            
            <Link
              href="/auth/signup"
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg transition duration-200 block text-center"
            >
              Create Account
            </Link>
          </div>
          
          <div className="mt-8 text-sm text-gray-500">
            <h3 className="font-medium mb-2">Features:</h3>
            <ul className="space-y-1">
              <li>✅ Multi-user support</li>
              <li>✅ Email verification</li>
              <li>✅ Transaction tracking</li>
              <li>✅ Budget management</li>
              <li>✅ Savings goals</li>
              <li>✅ Account management</li>
            </ul>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 text-xs mb-1">Test Accounts:</h4>
              <p className="text-yellow-700 text-xs">
                Verified: john@example.com<br />
                Unverified: jane@example.com<br />
                Password: password123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}