'use client'

import React, { useState, useEffect } from 'react'

interface DesktopOnlyGuardProps {
  children: React.ReactNode
}

export default function DesktopOnlyGuard({ children }: DesktopOnlyGuardProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkScreenSize()
    
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  if (isMobile === null) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col p-6 space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center pb-4 border-b border-hairline">
          <div className="h-6 w-32 bg-gray-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
        </div>
        {/* Body Skeleton */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="h-40 bg-gray-200 dark:bg-zinc-800 rounded-2xl"></div>
            <div className="h-40 bg-gray-200 dark:bg-zinc-800 rounded-2xl"></div>
          </div>
          <div className="h-80 bg-gray-200 dark:bg-zinc-800 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-12 font-sans text-ink select-none">
        <div className="max-w-md w-full text-center space-y-8 animate-scale-in">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-ink font-sans">
              PyCode Teacher
            </h1>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest font-mono mt-2">
              Quiz Analytics Dashboard
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-block-coral border border-hairline shadow-[0_4px_16px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold tracking-tight mb-3 text-ink">Desktop Required</h2>
            <p className="text-gray-700 text-sm leading-relaxed mb-6 font-light">
              The teacher dashboard features complex layouts to schedule exams, review submissions in tables, and inspect code side-by-side. Please log in on a desktop or laptop device.
            </p>

            <div className="py-2.5 px-4 rounded-full bg-canvas border border-hairline text-ink text-xs font-semibold tracking-wide flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Please open on a Laptop or PC
            </div>
          </div>

          <div className="text-xs text-gray-500 font-light">
            <p>&copy; {new Date().getFullYear()} PyCode Inc. All rights reserved.</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
