'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Upload, AlertCircle, RefreshCw, XCircle, CheckCircle, Clock, BookOpen, Users, Award, ChevronRight, ShieldAlert } from 'lucide-react'

export default function VerificationGatePage() {
  const router = useRouter()
  const supabase = createClient() as any

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [application, setApplication] = useState<any>(null)

  // Form states
  const [fullName, setFullName] = useState('')
  const [institution, setInstitution] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!file) {
      setErrorMsg('Please select and upload your teacher ID card image.')
      return
    }

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session not found.')

      const fileExt = file.name.split('.').pop()
      const filePath = `ids/${user.id}_${Date.now()}.${fileExt}`

      const { error: uploadErr } = await supabase.storage
        .from('teacher-ids')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadErr) {
        throw new Error(`Upload failed: ${uploadErr.message}. Make sure the 'teacher-ids' bucket exists in Supabase.`)
      }

      const { data: { publicUrl } } = supabase.storage
        .from('teacher-ids')
        .getPublicUrl(filePath)

      const { error: dbErr } = await supabase
        .from('teacher_applications')
        .insert({
          user_id: user.id,
          full_name: fullName.trim(),
          institution: institution.trim(),
          id_card_url: publicUrl,
          status: 'pending'
        })

      if (dbErr) throw dbErr

      const { data: freshApp } = await supabase
        .from('teacher_applications')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setApplication(freshApp)
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification submit failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleResetApplication = () => {
    setShowResetConfirm(true)
  }

  const performResetApplication = async () => {
    setLoading(true)
    setErrorMsg('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('teacher_applications').delete().eq('user_id', user.id)

      setApplication(null)
      setFullName('')
      setInstitution('')
      setFile(null)
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (f: File | null) => {
    setFile(f)
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(f ? URL.createObjectURL(f) : null)
  }

  // ─── Left Branding Panel ────────────────────────────────────────────────────
  const LeftPanel = () => (
    <div className="flex flex-col justify-between h-full bg-gradient-to-br from-violet-950 via-[#13101f] to-[#0b0c10] p-10 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-60px] right-[-60px] w-[260px] h-[260px] rounded-full bg-indigo-600/15 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] rounded-full bg-purple-700/10 blur-[80px] pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">PyCode Teacher</span>
      </div>

      {/* Center content */}
      <div className="space-y-8 relative z-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-semibold tracking-wider">
            <Award className="w-3.5 h-3.5" />
            INSTRUCTOR PORTAL
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Teach thousands<br />of future coders
          </h2>
          <p className="text-gray-400 text-sm font-light leading-relaxed max-w-xs">
            Complete verification to unlock your instructor dashboard and start publishing courses.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {[
            { icon: <ShieldCheck className="w-4 h-4" />, title: 'Submit Your Credentials', desc: 'Upload your teacher ID and institution name' },
            { icon: <Clock className="w-4 h-4" />, title: 'Quick Review (24–48h)', desc: 'Our team verifies your application' },
            { icon: <BookOpen className="w-4 h-4" />, title: 'Publish Courses', desc: 'Create quizzes and track student progress' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
                {step.icon}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{step.title}</p>
                <p className="text-gray-500 text-xs font-light mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { label: 'Students', value: '2,400+' },
            { label: 'Courses', value: '180+' },
            { label: 'Instructors', value: '60+' },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-2xl bg-white/5 border border-white/8 text-center">
              <p className="text-white font-bold text-lg leading-none">{stat.value}</p>
              <p className="text-gray-500 text-[10px] mt-1 font-mono uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer quote */}
      <p className="text-gray-600 text-xs font-light relative z-10">
        &ldquo;The best teachers don't give you answers — they spark the questions.&rdquo;
      </p>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] font-sans text-white flex select-none animate-pulse">
        {/* Left branding panel */}
        <div className="hidden lg:block w-2/5 shrink-0 h-full">
          <LeftPanel />
        </div>
        {/* Right content panel skeleton */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-lg space-y-8">
            <div className="space-y-3">
              <div className="h-8 w-48 bg-zinc-800 rounded"></div>
              <div className="h-4 w-72 bg-zinc-850 rounded"></div>
            </div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-24 bg-zinc-800 rounded"></div>
                  <div className="h-11 w-full bg-zinc-900/60 rounded-2xl border border-zinc-800"></div>
                </div>
              ))}
              <div className="h-12 w-full bg-zinc-800 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] font-sans text-white flex select-none">
      {/* Left branding panel — 40% width */}
      <div className="hidden lg:block w-2/5 shrink-0 h-full">
        <LeftPanel />
      </div>

      {/* Right content panel — 60% width, scrollable */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 overflow-y-auto">
        <div className="w-full max-w-lg">

          {/* ── STATE 1: FORM ── */}
          {!application && (
            <div className="space-y-8 animate-fade-in">
              {/* Header */}
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Instructor Verification</h1>
                <p className="text-gray-500 text-sm font-light">
                  Submit your credentials to verify your instructor status and unlock your dashboard.
                </p>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-light">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleApply} className="space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest font-mono">Full Legal Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Arthur Pendelton"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm placeholder-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all font-light"
                    required
                  />
                </div>

                {/* Institution */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest font-mono">Institution / School</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Stanford University"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm placeholder-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all font-light"
                    required
                  />
                </div>

                {/* ID Card Upload */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest font-mono">Teacher ID Card Image</label>

                  {imagePreviewUrl ? (
                    <div className="space-y-2">
                      <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                        <img
                          src={imagePreviewUrl}
                          alt="ID Card Preview"
                          className="w-full max-h-56 object-contain"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[11px] text-emerald-400 font-mono truncate max-w-[240px]">{file?.name}</span>
                        </div>
                        <label className="text-[11px] text-violet-400 hover:text-violet-300 cursor-pointer font-semibold transition-colors">
                          Change Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-3 w-full h-36 border-2 border-dashed border-white/15 rounded-2xl cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group relative">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      />
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-violet-500/10 group-hover:border-violet-500/30 transition-all">
                        <Upload className="w-5 h-5 text-gray-500 group-hover:text-violet-400 transition-colors" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400 font-light">Click or drag your ID card here</p>
                        <p className="text-xs text-gray-600 mt-0.5">JPG, PNG, WEBP — up to 10MB</p>
                      </div>
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold tracking-wide transition-all disabled:opacity-50 shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploading ? (
                    <span className="animate-pulse">Uploading & Submitting...</span>
                  ) : (
                    <>
                      Submit Verification Application
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ── STATE 2: PENDING ── */}
          {application && application.status === 'pending' && (
            <div className="space-y-8 animate-fade-in">
              {/* Status badge */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest font-mono mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Under Review
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Application Submitted</h2>
                </div>
              </div>

              <p className="text-gray-400 text-sm font-light leading-relaxed">
                Your ID verification application has been received and is currently under review by our administrators. You will be granted full instructor access automatically upon approval — typically within 24–48 hours.
              </p>

              {/* Application summary card */}
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 font-mono">Your Application</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider font-mono mb-1">Full Name</p>
                    <p className="text-white font-semibold text-sm">{application.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider font-mono mb-1">Institution</p>
                    <p className="text-white font-semibold text-sm">{application.institution}</p>
                  </div>
                </div>
              </div>

              {/* Steps progress */}
              <div className="space-y-3">
                {[
                  { label: 'Application submitted', done: true },
                  { label: 'Under admin review', done: false, active: true },
                  { label: 'Verification approved', done: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                      step.done
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : step.active
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                        : 'bg-white/5 border-white/10 text-gray-600'
                    }`}>
                      {step.done ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </div>
                    <span className={`text-sm font-light ${step.done || step.active ? 'text-white' : 'text-gray-600'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.refresh()}
                className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Status
              </button>
            </div>
          )}

          {/* ── STATE 3: REJECTED ── */}
          {application && application.status === 'rejected' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                  <XCircle className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest font-mono mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Rejected
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Application Rejected</h2>
                </div>
              </div>

              <p className="text-gray-400 text-sm font-light leading-relaxed">
                Unfortunately, your instructor verification application was rejected. Please review the reason below and re-submit with corrected information.
              </p>

              {application.rejection_notes && (
                <div className="p-5 bg-red-500/8 border border-red-500/20 rounded-2xl space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 font-mono">Reason for Rejection</p>
                  <p className="text-gray-300 text-sm font-light leading-relaxed">{application.rejection_notes}</p>
                </div>
              )}

              <button
                onClick={handleResetApplication}
                className="w-full py-3.5 rounded-2xl bg-red-650 hover:bg-red-600 text-white text-sm font-bold tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-650/20"
              >
                <RefreshCw className="w-4 h-4" />
                Re-apply with New Documents
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Custom themed confirm modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#15171e] border border-[#232630] text-center shadow-2xl space-y-6 text-white animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Re-apply Verification?</h3>
              <p className="text-gray-400 text-sm font-light leading-relaxed">
                Are you sure you want to delete your previous verification application and re-submit new details?
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all duration-200 border border-white/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowResetConfirm(false)
                  await performResetApplication()
                }}
                className="flex-1 py-3.5 rounded-2xl bg-red-650 hover:bg-red-600 text-white text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Re-apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
