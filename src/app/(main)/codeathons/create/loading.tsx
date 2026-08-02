import React from 'react'

export default function CreateCodeathonLoading() {
  return (
    <div className="min-h-screen p-6 md:p-8 bg-canvas text-gray-900 dark:text-white font-sans animate-pulse">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Block Skeleton */}
        <div className="flex justify-between items-center border-b border-hairline pb-5">
          <div className="space-y-2">
            <div className="h-6 w-40 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-3.5 w-60 bg-gray-150 dark:bg-zinc-800 rounded"></div>
          </div>
          <div className="h-9 w-24 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
        </div>

        {/* Form and Selection Split Columns Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Properties Form Skeleton (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-6 rounded-2xl border border-hairline bg-white dark:bg-zinc-900 shadow-sm space-y-6">
              <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-800 rounded"></div>
              
              {/* Properties Form Rows */}
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-2.5 w-24 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                  <div className="h-10 w-full bg-gray-100 dark:bg-zinc-800/40 rounded-xl border border-hairline"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Challenges Selector Skeleton (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-2xl border border-hairline bg-white dark:bg-zinc-900 shadow-sm flex flex-col min-h-[600px] justify-between">
              <div className="space-y-4">
                {/* Search / Filter header */}
                <div className="flex justify-between items-center border-b border-hairline pb-4">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                  <div className="h-8 w-44 bg-gray-100 dark:bg-zinc-800/40 rounded-lg"></div>
                </div>

                {/* Challenges Pool Checklist items */}
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-hairline bg-canvas flex justify-between items-center">
                      <div className="space-y-2 flex-1 pr-4">
                        <div className="h-3 w-1/2 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                        <div className="h-2.5 w-1/3 bg-gray-150 dark:bg-zinc-800 rounded"></div>
                      </div>
                      <div className="h-4.5 w-12 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button footer */}
              <div className="border-t border-hairline pt-4 mt-6 flex justify-between items-center">
                <div className="h-3.5 w-32 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-11 w-40 bg-gray-250 dark:bg-zinc-700 rounded-full"></div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
