'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'
import { Calendar, Clock, Check, ArrowRight, FolderKanban, ShieldCheck, Search, Eye, X, BookOpen, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { enrichQuestionDetails } from '@/lib/questionFormatter'

export default function CreateCodeathonPage() {
  const router = useRouter()
  const supabase = createClient() as any

  // Seeding list
  const [questions, setQuestions] = useState<any[]>(LOCAL_QUESTIONS)
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false)

  const categories = [
    { id: 'python-ifelse', name: '1. Control Flow (If/Else)', desc: 'Boolean expressions, relational operators, conditional branching' },
    { id: 'python-loops', name: '2. Loops & Math Logic', desc: 'For/while iterations, primes, Fibonacci, and number properties' },
    { id: 'python-patterns', name: '3. Pattern Printing', desc: 'Nested loops generating stars, numbers, and character grids' },
    { id: 'python-strings', name: '4. String Methods & Algorithms', desc: 'Slicing, splits, joins, substring indexing, and string algorithms' },
    { id: 'python-lists-arrays', name: '5. Lists & Array Algorithms', desc: 'List comprehensions, rotation, chunking, binary search, sorting, two-pointer techniques' },
    { id: 'python-dicts', name: '6. Dictionaries & Sets', desc: 'Frequency count, hash maps, key-value lookup operations' },
    { id: 'python-oop', name: '7. OOP, Lambdas & Exceptions', desc: 'Classes, encapsulation, inheritance, property decorators, dunders, custom errors' },
    { id: 'numpy', name: '8. NumPy Scientific Computing', desc: 'N-dimensional arrays, mathematical vectorization, matrix transformations' },
    { id: 'pandas', name: '9. Pandas Data Science & Analysis', desc: 'DataFrames, null handling, indexing, group-by, merging, filtering datasets' },
    { id: 'matplotlib-seaborn', name: '10. Matplotlib & Seaborn Visuals', desc: 'Bar plots, line charts, scatter plots, canvas styling, and distributions' }
  ]

  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    'python-ifelse': true,
    'python-loops': true,
    'python-patterns': true,
    'python-strings': true,
    'python-lists-arrays': true,
    'python-dicts': true,
    'python-oop': true,
    'numpy': true,
    'pandas': true,
    'matplotlib-seaborn': true
  })

  const toggleCategory = (catId: string) => {
    setExpandedCats(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }))
  }

  // Form inputs
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState<number | ''>('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')

  // Custom details requirement checkbox indicators
  const [requireRollNumber, setRequireRollNumber] = useState(false)
  const [requireCourse, setRequireCourse] = useState(false)
  const [requireSection, setRequireSection] = useState(false)

  // Selected questions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [step, setStep] = useState(1)

  // Inline validation error flags
  const [titleError, setTitleError] = useState(false)
  const [startError, setStartError] = useState(false)
  const [endError, setEndError] = useState(false)
  const [endBeforeStartError, setEndBeforeStartError] = useState(false)

  // Modal State
  const [previewQuestion, setPreviewQuestion] = useState<any | null>(null)

  // Custom alert toast notification
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })
  const showToast = (message: string) => {
    setToast({ message, visible: true })
  }

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }))
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [toast.visible])

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoadingQuestions(true)
      try {
        const { data, error } = await supabase
          .from('coding_questions')
          .select('id, title, category, difficulty, points, description, starter_code')
          .order('id', { ascending: true })

        if (!error && data && data.length > 0) {
          setQuestions(data)
        }
      } catch (err) {
        console.error('Failed to fetch DB questions, using local seeding:', err)
      } finally {
        setLoadingQuestions(false)
      }
    }

    fetchQuestions()
  }, [supabase])

  const handleToggleQuestion = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleSaveCodeathon = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const startDateTime = startDate && startTime ? `${startDate}T${startTime}` : ''
    const endDateTime = endDate && endTime ? `${endDate}T${endTime}` : ''

    if (!startDateTime || !endDateTime) {
      setErrorMsg('Validation Error: Please specify both Start Date and End Date.')
      showToast('Validation Error: Please specify both Start Date and End Date.')
      return
    }

    if (selectedIds.size === 0) {
      setErrorMsg('Validation Error: Please select at least one coding challenge from the pool.')
      showToast('Validation Error: Please select at least one coding challenge.')
      return
    }

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      setErrorMsg('Validation Error: The start date/time must be earlier than the end date/time.')
      showToast('The start date must be earlier than the end date.')
      return
    }

    if (duration !== '') {
      const windowMinutes = Math.floor((new Date(endDateTime).getTime() - new Date(startDateTime).getTime()) / (1000 * 60))
      if (duration > windowMinutes) {
        setErrorMsg(`Validation Error: The time limit (${duration} minutes) cannot exceed the total duration of the scheduled time slot (${windowMinutes} minutes).`)
        showToast(`The time limit cannot exceed the slot window (${windowMinutes} mins).`)
        return
      }
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Teacher session not found.')

      const { error: insertErr } = await supabase
        .from('quizzes')
        .insert({
          title: title.trim(),
          duration_minutes: duration === '' ? null : duration,
          start_time: new Date(startDateTime).toISOString(),
          end_time: new Date(endDateTime).toISOString(),
          coding_question_ids: Array.from(selectedIds),
          creator_id: user.id,
          is_coding_quiz: true,
          is_teacher_quiz: true,
          required_inputs: [
            'Full Name',
            requireRollNumber ? 'Roll Number' : null,
            requireCourse ? 'Course / Class' : null,
            requireSection ? 'Section' : null
          ].filter(Boolean)
        })

      if (insertErr) throw insertErr

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save codeathon.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredQuestions = questions.filter((q) => {
    const matchSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        q.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty
    const matchSection = selectedSection === 'all' || q.category === selectedSection
    return matchSearch && matchDiff && matchSection
  })

  if (success) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center font-sans p-6 text-ink relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes loadingProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          .animate-loading-progress {
            animation: loadingProgress 2s linear forwards;
          }
        `}} />
        
        {/* Glowing background highlights */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none animate-pulse" />

        <div className="max-w-md w-full p-8 rounded-[1.5rem] bg-white dark:bg-[#111216] border border-hairline dark:border-[#232630] shadow-2xl relative z-10 space-y-6 animate-scale-in text-ink dark:text-white">
          
          {/* Minimal success indicator */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Check className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-sans">Status: Active</span>
              <h2 className="text-xl font-extrabold tracking-tight text-ink dark:text-white">Codeathon Published</h2>
            </div>
          </div>

          <div className="border-t border-hairline dark:border-[#232630] pt-4 space-y-3">
            <p className="text-body text-xs font-light leading-relaxed">
              Your programming cohort examination has been successfully scheduled. Students will be able to access the exam workspace at the specified start date.
            </p>

            {/* Quick summary box */}
            <div className="p-4 rounded-xl bg-canvas dark:bg-[#08090b] border border-hairline dark:border-[#232630] space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted font-light">Title</span>
                <span className="font-semibold text-ink dark:text-zinc-200 truncate max-w-[200px]">{title.trim()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted font-light">Time Limit</span>
                <span className="font-semibold text-ink dark:text-zinc-200">{duration ? `${duration} minutes` : 'Untimed'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted font-light">Challenges</span>
                <span className="font-semibold text-ink dark:text-zinc-200">{selectedIds.size} questions</span>
              </div>
            </div>
          </div>

          {/* Loading progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] text-muted uppercase tracking-wider font-sans">
              <span>Syncing with cohort...</span>
              <span>Redirecting</span>
            </div>
            <div className="h-1 w-full bg-surface-soft dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 animate-loading-progress rounded-full" style={{ width: '0%' }} />
            </div>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-canvas dark:bg-[#000000] text-ink font-sans">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        
        {/* Page Title Header */}
        <div className="pb-4 border-b border-hairline dark:border-[#1e1e24] flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white">
              Schedule Codeathon
            </h1>
            <p className="text-muted text-xs mt-1 font-light">Create and publish programming examinations for student cohorts</p>
          </div>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center gap-6 py-4 select-none bg-[#f7f5f0] dark:bg-[#0c0c0e] rounded-3xl border border-[#e2dfd9] dark:border-[#1e1e24]/60 max-w-xl mx-auto">
          <div className="flex items-center gap-3">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step === 1 
                ? 'bg-ink text-canvas shadow-sm dark:bg-white dark:text-black dark:shadow-[0_0_12px_rgba(255,255,255,0.15)]' 
                : 'bg-canvas border border-hairline text-muted dark:bg-[#08080a] dark:border-[#1e1e24] dark:text-[#4e515d]'
            }`}>
              1
            </span>
            <span className={`text-xs font-bold transition-all duration-300 ${
              step === 1 ? 'text-ink dark:text-white' : 'text-muted'
            }`}>
              Details
            </span>
          </div>

          <div className="w-20 h-[1px] bg-[#e2dfd9] dark:bg-[#1e1e24]" />

          <div className="flex items-center gap-3">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step === 2 
                ? 'bg-ink text-canvas shadow-sm dark:bg-white dark:text-black dark:shadow-[0_0_12px_rgba(255,255,255,0.15)]' 
                : 'bg-canvas border border-hairline text-muted dark:bg-[#08080a] dark:border-[#1e1e24] dark:text-[#4e515d]'
            }`}>
              2
            </span>
            <span className={`text-xs font-bold transition-all duration-300 ${
              step === 2 ? 'text-ink dark:text-white' : 'text-muted'
            }`}>
              Questions
            </span>
          </div>
        </div>

        {/* Form Workspace */}
        <form onSubmit={handleSaveCodeathon} className="space-y-6">
          
          {step === 1 ? (
            <div className="space-y-6 animate-scale-in">
              {/* Codeathon Details Card */}
              <div className="p-6 rounded-[1.5rem] bg-white dark:bg-[#0c0c0e] border border-hairline dark:border-[#1e1e24] shadow-sm dark:shadow-xl space-y-6">
                <div className="pb-3 border-b border-hairline dark:border-[#1e1e24]">
                  <h3 className="text-sm font-bold text-ink dark:text-white uppercase tracking-wider">Codeathon Details</h3>
                  <p className="text-xs text-muted font-normal mt-1">Specify the codeathon title, start time, and end time.</p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-muted tracking-wide">Codeathon Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      if (e.target.value.trim()) setTitleError(false)
                    }}
                    placeholder="e.g. Computer Networks - Midterm Exam"
                    className={`w-full px-4 py-3 bg-canvas dark:bg-[#060608] border rounded-xl text-sm placeholder-[#9ca3af] dark:placeholder-[#7e8299] focus:outline-none focus:ring-1 text-ink dark:text-white transition-all font-normal ${
                      titleError
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-hairline dark:border-[#1e1e24] focus:border-primary dark:focus:border-white focus:ring-primary/10 dark:focus:ring-white/10'
                    }`}
                    required
                  />
                  {titleError && (
                    <p className="text-rose-500 text-[11px] font-medium mt-1 animate-scale-in">Please specify the codeathon title.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Date & Time Split Inputs */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-muted tracking-wide">Codeathon Start Time</label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value)
                            if (e.target.value && startTime) setStartError(false)
                          }}
                          className={`w-full pl-4 pr-10 py-3 bg-canvas dark:bg-[#060608] border rounded-xl text-sm text-ink dark:text-white focus:outline-none focus:ring-1 transition-all font-normal ${
                            startError
                              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10'
                              : 'border-hairline dark:border-[#1e1e24] focus:border-primary dark:focus:border-white focus:ring-primary/10 dark:focus:ring-white/10'
                          }`}
                          required
                        />
                        <Calendar className="w-4 h-4 text-muted dark:text-[#8c91a8] absolute right-3.5 top-3.5 pointer-events-none" />
                      </div>
                      <div className="relative w-32">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => {
                            setStartTime(e.target.value)
                            if (startDate && e.target.value) setStartError(false)
                          }}
                          className={`w-full pl-4 pr-10 py-3 bg-canvas dark:bg-[#060608] border rounded-xl text-sm text-ink dark:text-white focus:outline-none focus:ring-1 transition-all font-normal ${
                            startError
                              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10'
                              : 'border-hairline dark:border-[#1e1e24] focus:border-primary dark:focus:border-white focus:ring-primary/10 dark:focus:ring-white/10'
                          }`}
                          required
                        />
                        <Clock className="w-4 h-4 text-muted dark:text-[#8c91a8] absolute right-3 top-3.5 pointer-events-none" />
                      </div>
                    </div>
                    {startError && (
                      <p className="text-rose-500 text-[11px] font-medium mt-1 animate-scale-in">Please specify both start date and start time.</p>
                    )}
                  </div>

                  {/* End Date & Time Split Inputs */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-muted tracking-wide">Codeathon End Time</label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value)
                            if (e.target.value && endTime) {
                              setEndError(false)
                              setEndBeforeStartError(false)
                            }
                          }}
                          className={`w-full pl-4 pr-10 py-3 bg-canvas dark:bg-[#060608] border rounded-xl text-sm text-ink dark:text-white focus:outline-none focus:ring-1 transition-all font-normal ${
                            endError || endBeforeStartError
                              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10'
                              : 'border-hairline dark:border-[#1e1e24] focus:border-primary dark:focus:border-white focus:ring-primary/10 dark:focus:ring-white/10'
                          }`}
                          required
                        />
                        <Calendar className="w-4 h-4 text-muted dark:text-[#8c91a8] absolute right-3.5 top-3.5 pointer-events-none" />
                      </div>
                      <div className="relative w-32">
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => {
                            setEndTime(e.target.value)
                            if (endDate && e.target.value) {
                              setEndError(false)
                              setEndBeforeStartError(false)
                            }
                          }}
                          className={`w-full pl-4 pr-10 py-3 bg-canvas dark:bg-[#060608] border rounded-xl text-sm text-ink dark:text-white focus:outline-none focus:ring-1 transition-all font-normal ${
                            endError || endBeforeStartError
                              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10'
                              : 'border-hairline dark:border-[#1e1e24] focus:border-primary dark:focus:border-white focus:ring-primary/10 dark:focus:ring-white/10'
                          }`}
                          required
                        />
                        <Clock className="w-4 h-4 text-muted dark:text-[#8c91a8] absolute right-3 top-3.5 pointer-events-none" />
                      </div>
                    </div>
                    {endError && (
                      <p className="text-rose-500 text-[11px] font-medium mt-1 animate-scale-in">Please specify both end date and end time.</p>
                    )}
                    {endBeforeStartError && (
                      <p className="text-rose-500 text-[11px] font-medium mt-1 animate-scale-in">The end date/time must be after the start date/time.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Settings Card */}
              <div className="p-6 rounded-[1.5rem] bg-white dark:bg-[#0c0c0e] border border-hairline dark:border-[#1e1e24] shadow-sm dark:shadow-xl space-y-6">
                <div className="pb-3 border-b border-hairline dark:border-[#1e1e24]">
                  <h3 className="text-sm font-bold text-ink dark:text-white uppercase tracking-wider">Time Settings</h3>
                  <p className="text-xs text-muted font-normal mt-1">Define duration constraints for the cohort.</p>
                </div>
                
                <div className="p-5 rounded-2xl bg-canvas dark:bg-[#060608] border border-hairline dark:border-[#1e1e24] max-w-md space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Overall Codeathon Limit</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                      min={1}
                      placeholder="e.g. 60"
                      className="w-full pl-4 pr-12 py-3 bg-white dark:bg-[#060608] border border-hairline dark:border-[#1e1e24] rounded-xl text-sm text-ink dark:text-white focus:outline-none focus:border-primary dark:focus:border-white focus:ring-1 focus:ring-primary/10 dark:focus:ring-white/10 transition-all font-normal"
                    />
                    <span className="absolute right-4 top-3.5 text-xs font-semibold text-muted">min</span>
                  </div>
                  <p className="text-xs text-muted font-normal mt-2 leading-relaxed">
                    Minutes (1-180). Student gets X total minutes across all questions.
                  </p>
                </div>
              </div>

              {/* Required Verification Information Card */}
              <div className="p-6 rounded-[1.5rem] bg-white dark:bg-[#0c0c0e] border border-hairline dark:border-[#1e1e24] shadow-sm dark:shadow-xl space-y-6">
                <div className="pb-3 border-b border-hairline dark:border-[#1e1e24]">
                  <h3 className="text-sm font-bold text-ink dark:text-white uppercase tracking-wider">Verification Settings</h3>
                  <p className="text-xs text-muted font-normal mt-1">Select what registration fields are mandatory for student entry.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Full Name */}
                  <div className="p-4 rounded-xl border border-hairline dark:border-[#1e1e24] bg-canvas/30 dark:bg-[#060608]/30 flex flex-col justify-between h-24">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-ink dark:text-white">Full Name</p>
                      <p className="text-xs text-muted font-light">Compulsory profile check</p>
                    </div>
                    <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded tracking-wide w-fit">Compulsory</span>
                  </div>

                  {/* Roll Number */}
                  <div
                    onClick={() => setRequireRollNumber(!requireRollNumber)}
                    className="p-4 rounded-xl border border-hairline dark:border-[#1e1e24] bg-canvas dark:bg-[#060608] hover:bg-surface-soft dark:hover:bg-[#0e0e12] cursor-pointer transition-all flex flex-col justify-between h-24"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-ink dark:text-white">Roll Number</p>
                      <p className="text-xs text-muted font-light">Require university ID</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted">Status</span>
                      <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${requireRollNumber ? 'bg-primary' : 'bg-gray-300 dark:bg-zinc-900'}`}>
                        <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-transform duration-200 ${requireRollNumber ? 'translate-x-3.5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>

                  {/* Course / Class */}
                  <div
                    onClick={() => setRequireCourse(!requireCourse)}
                    className="p-4 rounded-xl border border-hairline dark:border-[#1e1e24] bg-canvas dark:bg-[#060608] hover:bg-surface-soft dark:hover:bg-[#0e0e12] cursor-pointer transition-all flex flex-col justify-between h-24"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-ink dark:text-white">Course / Class</p>
                      <p className="text-xs text-muted font-light">Require class tags</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted">Status</span>
                      <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${requireCourse ? 'bg-primary' : 'bg-gray-300 dark:bg-zinc-900'}`}>
                        <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-transform duration-200 ${requireCourse ? 'translate-x-3.5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>

                  {/* Section */}
                  <div
                    onClick={() => setRequireSection(!requireSection)}
                    className="p-4 rounded-xl border border-hairline dark:border-[#1e1e24] bg-canvas dark:bg-[#060608] hover:bg-surface-soft dark:hover:bg-[#0e0e12] cursor-pointer transition-all flex flex-col justify-between h-24"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-ink dark:text-white">Section</p>
                      <p className="text-xs text-muted font-light">Require class section</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted">Status</span>
                      <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${requireSection ? 'bg-primary' : 'bg-gray-300 dark:bg-zinc-900'}`}>
                        <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-transform duration-200 ${requireSection ? 'translate-x-3.5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation button at bottom */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    let hasError = false
                    setTitleError(false)
                    setStartError(false)
                    setEndError(false)
                    setEndBeforeStartError(false)

                    if (!title.trim()) {
                      setTitleError(true)
                      hasError = true
                    }
                    if (!startDate || !startTime) {
                      setStartError(true)
                      hasError = true
                    }
                    if (!endDate || !endTime) {
                      setEndError(true)
                      hasError = true
                    }
                    
                    if (hasError) return

                    const startDateTime = `${startDate}T${startTime}`
                    const endDateTime = `${endDate}T${endTime}`
                    if (new Date(startDateTime) >= new Date(endDateTime)) {
                      setEndBeforeStartError(true)
                      return
                    }

                    setErrorMsg('')
                    setStep(2)
                  }}
                  className="px-6 py-3 rounded-full bg-ink dark:bg-white text-canvas dark:text-black hover:opacity-90 dark:hover:bg-gray-200 font-bold text-sm tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md flex items-center gap-2"
                >
                  <span>Next: Select Questions</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-scale-in">
              
              {/* Question Selection Card */}
              <div className="bg-white dark:bg-[#0c0c0e] border border-hairline dark:border-[#1e1e24] rounded-[1.5rem] shadow-sm dark:shadow-xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-hairline dark:border-[#1e1e24] bg-surface-soft dark:bg-[#08080a] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#cc785c]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-ink dark:text-white">
                      Challenges Library ({selectedIds.size} selected)
                    </h3>
                  </div>

                  {/* Search Box */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search challenges..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-canvas dark:bg-[#060608] border border-hairline dark:border-[#1e1e24] rounded-xl text-sm placeholder-[#9ca3af] dark:placeholder-[#7e8299] focus:outline-none focus:ring-1 focus:ring-primary/10 dark:focus:ring-[#cc785c]/10 focus:border-primary dark:focus:border-[#cc785c] text-ink dark:text-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                
                {/* Filters Toolbar */}
                <div className="px-5 py-3 border-b border-hairline dark:border-[#1e1e24] bg-white dark:bg-[#0c0c0e] flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Custom Section/Topic Filter Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                        className="flex items-center justify-between gap-2 pl-3 pr-8 py-1.5 bg-canvas dark:bg-[#060608] border border-hairline dark:border-[#1e1e24] rounded-xl text-[10px] font-bold uppercase tracking-widest font-mono text-gray-550 focus:outline-none focus:ring-1 focus:ring-[#cc785c] focus:border-[#cc785c] text-ink dark:text-white transition-all cursor-pointer select-none"
                      >
                        <span>
                          {selectedSection === 'all'
                            ? 'All Topics'
                            : categories.find(cat => cat.id === selectedSection)?.name.replace(/^\d+\.\s*/, '')}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-450 absolute right-2.5 top-2.5 pointer-events-none" />
                      </button>

                      {isSectionDropdownOpen && (
                        <>
                          {/* Backdrop to close when click outside */}
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsSectionDropdownOpen(false)}
                          />
                          <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#111216] border border-hairline dark:border-[#232630] rounded-xl shadow-2xl py-1 z-50 animate-fade-in overflow-hidden max-h-80 overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSection('all')
                                setIsSectionDropdownOpen(false)
                              }}
                              className={`w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest font-mono hover:bg-surface-soft dark:hover:bg-[#1e1e24] transition-colors border-b border-hairline dark:border-[#232630] ${
                                selectedSection === 'all' ? 'text-[#cc785c]' : 'text-gray-500'
                              }`}
                            >
                              All Topics
                            </button>
                            {categories.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSection(cat.id)
                                  setIsSectionDropdownOpen(false)
                                }}
                                className={`w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest font-mono hover:bg-surface-soft dark:hover:bg-[#1e1e24] transition-colors ${
                                  selectedSection === cat.id ? 'text-[#cc785c]' : 'text-gray-500'
                                }`}
                              >
                                {cat.name.replace(/^\d+\.\s*/, '')}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Difficulty Filter */}
                    <div className="flex items-center gap-1 bg-canvas dark:bg-[#060608] p-0.5 rounded-xl border border-hairline dark:border-[#1e1e24]">
                      {['all', 'easy', 'medium', 'hard'].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setSelectedDifficulty(diff)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest font-mono cursor-pointer transition-all ${
                            selectedDifficulty === diff
                              ? 'bg-[#cc785c] text-white shadow-sm'
                              : 'text-gray-500 hover:text-ink dark:hover:text-white'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected count indicator */}
                  <span className="text-[10px] text-muted font-mono tracking-wider uppercase font-bold">
                    Matching: {filteredQuestions.length} challenges
                  </span>
                </div>

                {/* Challenges listing container */}
                <div className="p-5 space-y-3 overflow-y-auto max-h-[500px] bg-white dark:bg-[#0c0c0e]">
                  {loadingQuestions ? (
                    <div className="space-y-3 animate-pulse">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="p-4 rounded-xl border border-hairline dark:border-[#1e1e24] bg-canvas dark:bg-[#060608] flex justify-between items-center">
                          <div className="space-y-2 flex-1 pr-4">
                            <div className="h-3 w-1/2 bg-surface-soft dark:bg-[#1e1e24] rounded-md"></div>
                            <div className="h-2.5 w-1/3 bg-canvas dark:bg-[#0e0e12] rounded-md"></div>
                          </div>
                          <div className="h-4.5 w-12 bg-surface-soft dark:bg-[#1e1e24] rounded-full"></div>
                        </div>
                      ))}
                    </div>
                  ) : filteredQuestions.length === 0 ? (
                    <div className="py-20 text-center text-muted border border-dashed border-hairline dark:border-[#1e1e24] rounded-2xl bg-canvas dark:bg-[#060608]">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 text-muted/60 animate-bounce" />
                      <p className="text-xs font-light">No matching questions found in library.</p>
                    </div>
                  ) : (
                    categories
                      .filter(cat => selectedSection === 'all' || cat.id === selectedSection)
                      .map((cat) => {
                        const catQuestions = filteredQuestions.filter(q => q.category === cat.id)
                      if (catQuestions.length === 0) return null

                      const isExpanded = expandedCats[cat.id]
                      const catSelectedCount = catQuestions.filter(q => selectedIds.has(q.id)).length

                      return (
                        <div key={cat.id} className="border border-hairline dark:border-[#1e1e24] bg-white dark:bg-[#0c0c0e] rounded-2xl overflow-hidden shadow-sm transition-all mb-4">
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className="w-full px-5 py-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-surface-soft dark:hover:bg-[#0e0e12] transition-all bg-canvas/30 dark:bg-[#060608]/30"
                          >
                            <div className="flex items-center gap-2 select-none">
                              <span className="text-xs font-bold text-ink dark:text-white tracking-tight">{cat.name}</span>
                              {catSelectedCount > 0 && (
                                <span className="px-2 py-0.5 text-[9px] font-bold text-[#cc785c] bg-[#cc785c]/10 rounded-full">
                                  {catSelectedCount} Selected
                                </span>
                              )}
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="p-4 space-y-3 border-t border-hairline dark:border-[#1e1e24] bg-white dark:bg-[#0c0c0e]">
                              {catQuestions.map((q) => {
                                const isChecked = selectedIds.has(q.id)

                                let diffColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                if (q.difficulty === 'medium' || q.difficulty === 'moderate') {
                                  diffColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-440 border-emerald-500/25'
                                } else if (q.difficulty === 'hard') {
                                  diffColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/25'
                                }

                                return (
                                  <div
                                    key={q.id}
                                    onClick={() => handleToggleQuestion(q.id)}
                                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                                      isChecked 
                                        ? 'border-primary bg-primary/[0.02] dark:bg-[#cc785c]/[0.05] shadow-sm' 
                                        : 'border-hairline dark:border-[#1e1e24] bg-white dark:bg-[#060608] hover:bg-surface-soft dark:hover:bg-[#0e0e12] hover:border-gray-400 dark:hover:border-gray-600'
                                    }`}
                                  >
                                    <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                                      <h4 className="text-sm font-bold text-ink dark:text-white truncate transition-colors">{q.title}</h4>
                                      <div className="flex items-center gap-3 text-xs text-muted dark:text-gray-500">
                                        <span className="capitalize font-light">{q.category.replace('-', ' ')}</span>
                                        <span>&#8226;</span>
                                        <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-widest ${diffColor}`}>{q.difficulty}</span>
                                        <span>&#8226;</span>
                                        <span className="text-muted dark:text-gray-400 font-bold">{q.points} PTS</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                      {/* Preview button */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setPreviewQuestion(q)
                                        }}
                                        className="px-3 py-1.5 rounded-xl border border-hairline dark:border-[#1e1e24] bg-canvas dark:bg-[#0e0e12] hover:bg-surface-soft dark:hover:bg-[#1e1e24] text-xs font-bold text-ink dark:text-white cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                      >
                                        Preview
                                      </button>

                                      {/* Custom styled checkbox */}
                                      <div 
                                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                          isChecked 
                                            ? 'bg-[#cc785c] border-[#cc785c] text-white scale-105 shadow-md shadow-[#cc785c]/10' 
                                            : 'border-gray-300 dark:border-[#1e1e24] bg-white dark:bg-[#060608] hover:border-gray-400 dark:hover:border-gray-550'
                                        }`}
                                      >
                                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5] text-white" />}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Error messages block */}
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-450 text-sm font-semibold animate-scale-in flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Navigation buttons at bottom */}
              <div className="flex justify-between items-center pt-4 border-t border-hairline dark:border-[#1e1e24]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-full border border-hairline dark:border-[#1e1e24] bg-white dark:bg-[#060608] hover:bg-surface-soft dark:hover:bg-[#0e0e12] text-ink dark:text-white font-bold text-sm uppercase tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  Back to Details
                </button>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-full bg-ink dark:bg-white text-canvas dark:text-black hover:opacity-90 dark:hover:bg-gray-200 disabled:opacity-50 font-bold text-sm uppercase tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Codeathon'}
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Toast Alert Notification */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up max-w-sm w-full bg-[#0c0c0e] border border-[#1e1e24] rounded-2xl shadow-2xl p-4 flex gap-3 text-white">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-0.5 select-none">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-200">Validation Alert</span>
              <button 
                onClick={() => setToast(prev => ({ ...prev, visible: false }))}
                className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 font-normal leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Question Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 select-none animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setPreviewQuestion(null)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#111216] border border-hairline dark:border-[#232630] rounded-3xl shadow-xl overflow-hidden z-10 animate-scale-in text-ink dark:text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-hairline dark:border-[#232630] bg-surface-soft dark:bg-[#0e0f13]">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{previewQuestion.category.replace('-', ' ')}</span>
                <h3 className="text-sm font-extrabold text-ink dark:text-white leading-tight">{previewQuestion.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="p-1.5 rounded-full hover:bg-surface-soft dark:hover:bg-canvas text-muted hover:text-ink dark:hover:text-white transition-colors cursor-pointer border border-hairline dark:border-[#232630] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-ink dark:text-white">
              <div className="flex gap-2">
                <span className={`px-2.5 py-0.5 rounded-full border text-[9px] uppercase font-bold tracking-widest ${
                  previewQuestion.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/25' :
                  (previewQuestion.difficulty === 'medium' || previewQuestion.difficulty === 'moderate') ? 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/25' :
                  'bg-red-500/10 text-red-650 dark:text-red-455 border-red-500/25'
                }`}>
                  {previewQuestion.difficulty}
                </span>
                <span className="px-2.5 py-0.5 rounded-full border border-hairline dark:border-[#232630] bg-canvas dark:bg-[#08090b] text-[9px] uppercase font-bold tracking-widest text-muted dark:text-gray-500">
                  {previewQuestion.points} points
                </span>
              </div>

              <div 
                className="text-body dark:text-[#a09d96] leading-relaxed font-light text-xs space-y-4 font-sans markdown-body select-text"
                dangerouslySetInnerHTML={{ __html: enrichQuestionDetails(previewQuestion) }}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-soft dark:bg-[#0e0f13] border-t border-hairline dark:border-[#232630] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 rounded-full border border-hairline dark:border-[#232630] hover:bg-surface-soft dark:hover:bg-[#1a1b22] text-ink dark:text-white text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleQuestion(previewQuestion.id)
                  setPreviewQuestion(null)}
                }
                className="px-4 py-2 rounded-full bg-primary hover:opacity-90 text-on-primary text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1"
              >
                {selectedIds.has(previewQuestion.id) ? 'Deselect Challenge' : 'Select Challenge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
