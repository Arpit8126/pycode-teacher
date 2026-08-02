import React from 'react'

// Standalone layout — no sidebar, full screen
// Used for: /verify and any other full-screen pages
export default function StandaloneLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  )
}
