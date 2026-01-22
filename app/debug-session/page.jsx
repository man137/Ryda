"use client"

import { useSession } from "next-auth/react"

export default function DebugSession() {
  const { data: session, status } = useSession()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Session Debug Info</h1>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Session Status:</h2>
            <p className="text-blue-600 font-mono">{status}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Session Data:</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>

          {session?.user && (
            <div>
              <h2 className="text-lg font-semibold">User Account Type:</h2>
              <p className="text-green-600 font-mono text-lg">
                {session.user.accountType || 'undefined'}
              </p>
            </div>
          )}

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-semibold text-yellow-800">Instructions:</h3>
            <ul className="text-yellow-700 mt-2 space-y-1">
              <li>• If accountType is "owner", try accessing /admin</li>
              <li>• If accountType is "user" or undefined, you need to update your database</li>
              <li>• Copy this debug info and share it if you need help</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
