"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { CustomTooltip } from "@/components/custom-tooltip"

export default function AuthPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { login, isLoading: authLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Try logging in with owner credentials first
      if (username === 'ownerams' && password === 'pass5key') {
        await login(username, password);
        return;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // Use the login function from AuthContext
      await login(username, password);
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1f2b] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <CustomTooltip content="Enter your username">
              <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                Username
              </label>
            </CustomTooltip>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#2a2f3d] border border-[#3a3f4d] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <CustomTooltip content="Enter your password">
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
            </CustomTooltip>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#2a2f3d] border border-[#3a3f4d] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your password"
            />
          </div>

          <CustomTooltip content="Click to log in">
            <button
              type="submit"
              disabled={isLoading || authLoading}
              className="w-full bg-white text-black py-2 px-4 rounded-md hover:bg-gray-100 transition-colors duration-200"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </CustomTooltip>
        </form>

        <div className="mt-6 text-center">
          <CustomTooltip content="Create a new account">
            <Link href="/auth/signup" className="text-indigo-400 hover:text-indigo-300 text-sm">
              Need an account? Sign Up
            </Link>
          </CustomTooltip>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-900/80 text-white rounded-md"
          >
            <p>Login failed</p>
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

