'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, BarChart3, PlusCircle, LogOut, Sun, Moon, ChevronUp, User, RefreshCw } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [loadingPath, setLoadingPath] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoadingPath(null)
  }, [pathname])

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    fetchUser()

    // Read initial theme setting from documentElement class
    const isLight = !document.documentElement.classList.contains('dark')
    setTheme(isLight ? 'light' : 'dark')

    // Click outside popover to close it
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setTheme('light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setTheme('dark')
    }
  }

  const menuItems = [
    { name: 'Teacher Panel', path: '/dashboard', icon: BarChart3 },
    { name: 'Create Codeathon', path: '/codeathons/create', icon: PlusCircle },
  ]

  return (
    <aside className="w-64 h-screen bg-canvas border-r border-hairline flex flex-col justify-between select-none print:hidden">
      <div>
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)] group-hover:scale-105 transition-transform duration-200">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-ink font-sans">PyCode</h1>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-medium">Codeathon Panel</span>
            </div>
          </Link>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-hairline hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="px-4 space-y-1">
          {menuItems.map((item) => {
            const isLoading = loadingPath === item.path
            const Icon = isLoading ? RefreshCw : item.icon
            const isActive = pathname === item.path

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setLoadingPath(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-primary'
                    : 'text-body hover:bg-surface-soft hover:text-ink border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
                <span className={isLoading ? 'animate-pulse opacity-70' : ''}>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Profile Footer with popup menu */}
      <div className="p-4 border-t border-hairline relative" ref={menuRef}>
        {/* Popover Menu */}
        {showUserMenu && (
          <div className="absolute bottom-[80px] left-4 right-4 bg-canvas/80 border border-hairline rounded-2xl p-2 shadow-2xl backdrop-blur-xl animate-scale-in z-[50] space-y-1">
            <button
              onClick={() => {
                setShowUserMenu(false)
                handleLogout()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-500 hover:bg-red-500/10 rounded-xl font-semibold transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        )}

        {/* Clickable User Card */}
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-surface-soft transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover border border-hairline bg-surface-soft"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary border border-hairline flex items-center justify-center font-bold text-on-primary text-sm shadow-inner">
                {profile?.username ? profile.username.substring(0, 2).toUpperCase() : 'TC'}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-ink truncate max-w-[110px]">
                @{profile?.username || 'teacher'}
              </p>
              <span className="text-[9px] text-semantic-success font-mono uppercase tracking-wider font-semibold">Instructor</span>
            </div>
          </div>
          <ChevronUp className={`w-4 h-4 text-gray-400 group-hover:text-ink transition-all duration-200 ${showUserMenu ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </aside>
  )
}
