import React from 'react'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-6 md:p-8 bg-canvas text-gray-900 dark:text-white font-sans animate-pulse">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Block Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-hairline pb-6">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-4 w-72 bg-gray-150 dark:bg-zinc-800/80 rounded"></div>
          </div>
          <div className="h-10 w-36 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
        </div>

        {/* Top Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-5 rounded-2xl border border-hairline bg-white dark:bg-zinc-900 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-250 dark:bg-zinc-800 shrink-0"></div>
              <div className="space-y-2 flex-1">
                <div className="h-2.5 w-24 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-6 w-12 bg-gray-200 dark:bg-zinc-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Quiz List Header Skeleton */}
        <div className="space-y-4 pt-2">
          <div className="h-3 w-28 bg-gray-200 dark:bg-zinc-800 rounded"></div>
          
          {/* Card Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 p-5 space-y-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Top Badge & Copy Link */}
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
                    <div className="h-3.5 w-14 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                  </div>
                  {/* Title & Metadata */}
                  <div className="space-y-2">
                    <div className="h-4.5 w-3/4 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                    <div className="space-y-2 pt-2">
                      <div className="h-3 w-40 bg-gray-150 dark:bg-zinc-800 rounded"></div>
                      <div className="h-3 w-44 bg-gray-150 dark:bg-zinc-800 rounded"></div>
                      <div className="h-3 w-32 bg-gray-150 dark:bg-zinc-800 rounded"></div>
                    </div>
                  </div>
                </div>
                {/* Footer buttons */}
                <div className="border-t border-hairline pt-4 mt-2 flex justify-between gap-2">
                  <div className="h-8 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
                  <div className="h-8 w-24 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
