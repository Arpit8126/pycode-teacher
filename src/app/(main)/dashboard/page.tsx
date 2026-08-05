'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Users, Award, ShieldAlert, FileSpreadsheet, Download, RefreshCw, BarChart2, PlusCircle, Copy, Check, X, Printer, Clock, ArrowRight, HelpCircle, Link2, Search, ExternalLink, ChevronLeft, BookOpen, CheckCircle, Code2, Play, Camera, Settings, ChevronRight, XCircle } from 'lucide-react'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'

// Helper to generate rule-based explanations for common Python/Pandas functions
function generateExplanation(code: string): string[] {
  const lines = code.split('\n')
  return lines.map((line, idx) => {
    const trimmed = line.trim()
    const lineNum = idx + 1

    if (trimmed.startsWith('import ')) {
      return `Line ${lineNum}: Imports a standard library/module to extend capabilities.`
    }
    if (trimmed.startsWith('def ')) {
      const match = trimmed.match(/def\s+(\w+)\(([^)]*)\):/)
      const name = match ? match[1] : 'function'
      const args = match ? match[2] : ''
      return `Line ${lineNum}: Defines function '${name}' taking parameters (${args}).`
    }
    if (trimmed.startsWith('return ')) {
      return `Line ${lineNum}: Completes function execution and returns calculated outputs.`
    }
    if (trimmed.includes('pd.read_csv')) {
      return `Line ${lineNum}: Loads structured CSV data into a Pandas DataFrame object.`
    }
    if (trimmed.includes('np.arange')) {
      return `Line ${lineNum}: Creates an evenly spaced NumPy numeric array range.`
    }
    if (trimmed.includes('.groupby')) {
      return `Line ${lineNum}: Groups the DataFrame rows by specific column categories for aggregation.`
    }
    if (trimmed.includes('plt.plot') || trimmed.includes('plt.hist') || trimmed.includes('plt.scatter')) {
      return `Line ${lineNum}: Renders geometric visual elements onto the Matplotlib plotting canvas.`
    }
    if (trimmed.includes('plt.title') || trimmed.includes('plt.xlabel') || trimmed.includes('plt.ylabel')) {
      return `Line ${lineNum}: Annotates the figure canvas with headers or labels.`
    }
    if (trimmed.includes('.isna().sum()')) {
      return `Line ${lineNum}: Finds and sums missing null values inside column cells.`
    }
    if (trimmed.includes('for ') && trimmed.endsWith(':')) {
      return `Line ${lineNum}: Loops and iterates over elements sequentially.`
    }
    if (trimmed.includes('if ') && trimmed.endsWith(':')) {
      return `Line ${lineNum}: Evaluates a conditional branch expression.`
    }
    if (trimmed.includes(' = ')) {
      const parts = trimmed.split('=')
      return `Line ${lineNum}: Assigns calculated value to target variable '${parts[0].trim()}'.`
    }
    return `Line ${lineNum}: Executes statement '${trimmed.substring(0, 30)}${trimmed.length > 30 ? '...' : ''}'.`
  })
}

function getQuestionTotalCases(verificationScript?: string): number {
  if (!verificationScript) return 1
  
  // 1. Check for literal assignment to total_cases in exec_globals, e.g. exec_globals['total_cases'] = 3
  const literalMatch = verificationScript.match(/exec_globals\[["']total_cases["']\]\s*=\s*(\d+)/)
  if (literalMatch) {
    return parseInt(literalMatch[1], 10)
  }
  
  // 2. Check for literal assignment to total variable: e.g. total = 3 (avoiding total = 0)
  const totalMatches = verificationScript.match(/^\s*total\s*=\s*([1-9]\d*)/m)
  if (totalMatches) {
    return parseInt(totalMatches[1], 10)
  }
  
  // 3. Count increments to total: total += 1
  const totalIncMatches = verificationScript.match(/total\s*\+=\s*1/g)
  if (totalIncMatches && totalIncMatches.length > 0) {
    return totalIncMatches.length
  }
  
  if (!verificationScript.includes('fn = exec_globals') && !verificationScript.includes('assert fn(')) {
    return 1
  }
  return 1
}

export default function TeacherDashboardPage() {
  const supabase = createClient() as any
  const [codeathons, setCodeathons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Attempts count cache mapped by codeathon ID
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({})

  // Active scoreboard preview selection
  const [selectedCodeathon, setSelectedCodeathon] = useState<any>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [attempts, setAttempts] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(false)

  // Student profile view details
  const [viewedStudent, setViewedStudent] = useState<any>(null)
  const [viewedStudentSubs, setViewedStudentSubs] = useState<any[]>([])
  const [viewedStudentRank, setViewedStudentRank] = useState<number>(1)
  const [viewedStudentPercentile, setViewedStudentPercentile] = useState<number>(100)
  const [viewedStudentHeatmap, setViewedStudentHeatmap] = useState<Record<string, number>>({})
  const [loadingStudent, setLoadingStudent] = useState(false)
  const [activeSub, setActiveSub] = useState<any>(null)
  const [explanation, setExplanation] = useState<string[]>([])
  const [showLightbox, setShowLightbox] = useState(false)

  // User search in analytics
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<any[]>([])

  // Overall workspace stats
  const [overallStats, setOverallStats] = useState({
    totalCreated: 0,
    activeNow: 0,
    comingSoon: 0,
  })

  // Load all codeathons created by the teacher
  const loadCodeathons = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: codeathonData, error: qErr } = await supabase
        .from('quizzes')
        .select('*')
        .eq('creator_id', user.id)
        .order('start_time', { ascending: false })

      if (!qErr && codeathonData) {
        setCodeathons(codeathonData)

        // Calculate dynamic dashboard stats
        const now = new Date()
        const active = codeathonData.filter((c: any) => new Date(c.start_time) <= now && new Date(c.end_time) >= now).length
        const soon = codeathonData.filter((c: any) => new Date(c.start_time) > now).length

        setOverallStats({
          totalCreated: codeathonData.length,
          activeNow: active,
          comingSoon: soon,
        })

        // Fetch attempts counts for all quizzes in a single performant query
        const quizIds = codeathonData.map((c: any) => c.id)
        if (quizIds.length > 0) {
          const { data: allAttempts, error: attErr } = await supabase
            .from('quiz_attempts')
            .select('id, quiz_id')
            .in('quiz_id', quizIds)

          if (!attErr && allAttempts) {
            const counts: Record<string, number> = {}
            allAttempts.forEach((a: any) => {
              counts[a.quiz_id] = (counts[a.quiz_id] || 0) + 1
            })
            setAttemptCounts(counts)
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Load detailed attempts and questions for the active analytics scoreboard
  const loadAttempts = async (codeathonId: string, codingQuestionIds: number[] = [], codeathon?: any) => {
    setLoadingAttempts(true)
    try {
      // 1. Fetch questions of this quiz to know categories and points
      if (codingQuestionIds.length > 0) {
        const { data: qData } = await supabase
          .from('coding_questions')
          .select('id, title, points, verification_script')
          .in('id', codingQuestionIds)
        if (qData) {
          setQuestions(qData)
        }
      }

      // 2. Fetch attempts joined with user profile username and full name
      const { data: attemptData, error: attErr } = await supabase
        .from('quiz_attempts')
        .select('*, profiles:user_id(username, full_name)')
        .eq('quiz_id', codeathonId)

      if (attErr) throw attErr
      if (attemptData) {
        const enrichedAttempts = await Promise.all(attemptData.map(async (a: any) => {
          if (a.student_details?.email) {
            return a
          }
          if (a.profiles?.username) {
            const { data: resolvedEmail } = await supabase.rpc('get_email_by_username', {
              username_to_search: a.profiles.username
            })
            if (resolvedEmail) {
              return {
                ...a,
                profiles: {
                  ...a.profiles,
                  email: resolvedEmail
                }
              }
            }
          }
          return a
        }))
        setAttempts(enrichedAttempts)
      }

      // Auto-sweep: if quiz has ended, finalize all incomplete attempts
      const quizEndTime = codeathon?.end_time || selectedCodeathon?.end_time
      if (quizEndTime && new Date(quizEndTime).getTime() < Date.now()) {
        try {
          // Directly sweep via Supabase admin (teacher has service role access via RLS)
          const { data: incompleteAttempts } = await supabase
            .from('quiz_attempts')
            .select('id, user_id, student_details, warnings_count, is_disqualified')
            .eq('quiz_id', codeathonId)
            .is('completed_at', null)

          if (incompleteAttempts && incompleteAttempts.length > 0) {
            const completedAt = new Date().toISOString()
            // Fetch questions for score calc
            const qIds = (await supabase.from('quizzes').select('coding_question_ids').eq('id', codeathonId).maybeSingle())?.data?.coding_question_ids || []
            const { data: qs } = qIds.length > 0 ? await supabase.from('coding_questions').select('id, points, verification_script').in('id', qIds) : { data: [] }
            const qList: any[] = qs || []

            await Promise.all(incompleteAttempts.map(async (attempt: any) => {
              const submittedQs: Record<string, boolean> = attempt.student_details?.submittedQuestions || {}
              const savedSummary: Record<string, { passed: number; total: number }> = attempt.student_details?.testCasesSummary || {}
              let totalPoints = 0; let earnedPoints = 0
              const finalSummary: Record<number, { passed: number; total: number }> = {}
              qList.forEach((q: any) => {
                totalPoints += q.points
                const saved = savedSummary[q.id]
                const qTotal = (saved && saved.total > 0) ? saved.total : getQuestionTotalCases(q.verification_script)
                const qPassed = (!!submittedQs[q.id] && saved) ? (saved.passed || 0) : 0
                if (!!submittedQs[q.id] && saved && saved.total > 0) earnedPoints += (saved.passed / saved.total) * q.points
                finalSummary[q.id] = { passed: qPassed, total: qTotal }
              })
              const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
              const isDisq = attempt.is_disqualified || (attempt.warnings_count || 0) >= 3
              await supabase.from('quiz_attempts').update({
                completed_at: completedAt,
                score: isDisq ? 0 : Math.round(earnedPoints),
                score_percentage: isDisq ? 0 : scorePercentage,
                student_details: { ...attempt.student_details, testCasesSummary: finalSummary }
              }).eq('id', attempt.id)
            }))

            // Reload attempts after sweep
            const { data: freshAttempts } = await supabase
              .from('quiz_attempts')
              .select('*, profiles:user_id(username, full_name)')
              .eq('quiz_id', codeathonId)
            if (freshAttempts) setAttempts(freshAttempts)
          }
        } catch (sweepErr) {
          console.warn('Auto-sweep warning (non-blocking):', sweepErr)
        }
      }
    } catch (err) {
      console.error('Failed to load scoreboard analytics:', err)
    } finally {
      setLoadingAttempts(false)
    }
  }

  useEffect(() => {
    loadCodeathons()
  }, [])

  // Subscribes to realtime updates on attempts for the active scoreboard quiz
  useEffect(() => {
    if (!selectedCodeathon || !showAnalytics) return

    const channel = supabase
      .channel(`realtime-attempts-${selectedCodeathon.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_attempts',
          filter: `quiz_id=eq.${selectedCodeathon.id}`
        },
        () => {
          loadAttempts(selectedCodeathon.id, selectedCodeathon.coding_question_ids, selectedCodeathon)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedCodeathon, showAnalytics])

  const handleOpenAnalytics = async (quiz: any) => {
    setSelectedCodeathon(quiz)
    setShowAnalytics(true)
    await loadAttempts(quiz.id, quiz.coding_question_ids, quiz)
  }

  const handleCloseAnalytics = () => {
    setShowAnalytics(false)
    setSelectedCodeathon(null)
    setAttempts([])
    setQuestions([])
    loadCodeathons() // refresh attempts count on main dashboard
  }

  // Fetch and display a student profile in the slide-over panel
  const handleViewStudent = async (userId: string) => {
    setViewedStudent(null)
    setViewedStudentSubs([])
    setViewedStudentHeatmap({})
    setActiveSub(null)
    setExplanation([])
    setLoadingStudent(true)
    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (prof) {
        // Open the modal instantly with basic profile info
        setViewedStudent(prof)
        
        // Fetch submissions & compute rank in parallel/async
        const subsPromise = supabase
          .from('coding_submissions')
          .select('*, coding_questions(title, points, difficulty)')
          .eq('user_id', userId)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })

        const allSubsPromise = supabase
          .from('coding_submissions')
          .select('user_id, question_id, coding_questions(points)')
          .eq('status', 'accepted')

        const countPromise = supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })

        // Wait for submissions first
        const { data: subs } = await subsPromise
        if (subs) {
          setViewedStudentSubs(subs)
          const counts: Record<string, number> = {}
          subs.forEach((s: any) => {
            const dateStr = new Date(s.created_at).toISOString().split('T')[0]
            counts[dateStr] = (counts[dateStr] || 0) + 1
          })
          setViewedStudentHeatmap(counts)
        }

        // Wait for rank info
        const [allSubsRes, countRes] = await Promise.all([allSubsPromise, countPromise])
        const allSubs = allSubsRes.data
        const profilesCount = countRes.count

        if (allSubs) {
          const userScores: Record<string, number> = {}
          const userUniqueSolved: Record<string, Set<number>> = {}
          allSubs.forEach((sub: any) => {
            const uid = sub.user_id
            const qid = sub.question_id
            const pts = sub.coding_questions?.points || 0
            if (!userUniqueSolved[uid]) { userUniqueSolved[uid] = new Set(); userScores[uid] = 0 }
            if (!userUniqueSolved[uid].has(qid)) { userUniqueSolved[uid].add(qid); userScores[uid] += pts }
          })
          const sortedScores = Object.values(userScores).sort((a, b) => b - a)
          const targetScore = userScores[userId] || 0
          const rankIndex = sortedScores.indexOf(targetScore)
          const finalRank = rankIndex !== -1 ? rankIndex + 1 : sortedScores.length + 1
          const totalUsers = Math.max(profilesCount || 1, Object.keys(userScores).length, 1)
          setViewedStudentRank(finalRank)
          setViewedStudentPercentile(Math.max(1, Math.min(100, Math.round((finalRank / totalUsers) * 100))))
        }
      }
    } catch (e) { 
      console.error(e) 
    } finally { 
      setLoadingStudent(false) 
    }
  }

  // Search users by username or full_name
  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query)
    if (query.trim().length < 1) { setUserSearchResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(6)
    setUserSearchResults(data || [])
  }

  const handleCopyLink = (quizId: string) => {
    const envStudentUrl = process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL;
    let studentUrl = "";

    if (envStudentUrl) {
      studentUrl = `${envStudentUrl.replace(/\/$/, '')}/codeathons/${quizId}/attempt`;
    } else {
      const origin = window.location.origin;
      // Local development fallback (port 3001 -> 3000)
      if (origin.includes(':3001')) {
        studentUrl = origin.replace(':3001', ':3000') + `/codeathons/${quizId}/attempt`;
      } else if (origin.includes('pycode-teacher.vercel.app')) {
        studentUrl = origin.replace('pycode-teacher.vercel.app', 'pycode-student.vercel.app') + `/codeathons/${quizId}/attempt`;
      } else if (origin.includes('-teacher')) {
        studentUrl = origin.replace('-teacher', '-student') + `/codeathons/${quizId}/attempt`;
      } else if (origin.includes('teacher.')) {
        studentUrl = origin.replace('teacher.', '') + `/codeathons/${quizId}/attempt`;
      } else {
        studentUrl = origin + `/codeathons/${quizId}/attempt`;
      }
    }

    navigator.clipboard.writeText(studentUrl)
    setCopiedId(quizId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Calculate detailed aggregates for active scoreboard
  const totalAttempted = attempts.filter(a => a.completed_at).length
  const totalQuizPoints = questions.reduce((acc, q) => acc + (q.points || 0), 0)
  const totalQuestionsCount = questions.length

  let maxCorrected = 0
  let totalCorrected = 0
  let maxPassedCases = 0
  let totalPassedCases = 0
  let maxScore = 0
  let sumScore = 0
  let disqualifiedCount = 0

  // Format student records map
  const parsedAttempts = attempts.map((a) => {
    const summary = a.student_details?.testCasesSummary || {}
    let solvedCount = 0
    let passedCases = 0
    let totalPossibleCases = 0

    questions.forEach((q: any) => {
      const check = summary[q.id]
      const passed = check ? (check.passed || 0) : 0
      const total = (check && check.total > 0) ? check.total : getQuestionTotalCases(q.verification_script)
      passedCases += passed
      totalPossibleCases += total
      if (total > 0 && passed === total) {
        solvedCount++
      }
    })

    if (a.completed_at) {
      if (a.is_disqualified) {
        disqualifiedCount++
      }
      maxCorrected = Math.max(maxCorrected, solvedCount)
      totalCorrected += solvedCount
      maxPassedCases = Math.max(maxPassedCases, passedCases)
      totalPassedCases += passedCases
      maxScore = Math.max(maxScore, a.score || 0)
      sumScore += (a.score || 0)
    }

    // Calculate time taken duration
    let timeTakenStr = 'N/A'
    if (a.started_at && a.completed_at) {
      const diffMs = new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000))
      const mins = Math.floor(diffSecs / 60)
      const secs = diffSecs % 60
      timeTakenStr = `${mins}m ${secs}s`
    } else if (a.started_at && !a.completed_at) {
      const diffMs = new Date().getTime() - new Date(a.started_at).getTime()
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000))
      const mins = Math.floor(diffSecs / 60)
      const secs = diffSecs % 60
      timeTakenStr = `${mins}m ${secs}s (Active)`
    }

    const accuracy = totalPossibleCases > 0 ? Math.round((passedCases / totalPossibleCases) * 100) : 0

    return {
      id: a.id,
      email: a.student_details?.email || a.profiles?.email || `${a.profiles?.username || 'student'}@gla.ac.in`,
      username: a.profiles?.username || 'unknown',
      score: a.score || 0,
      scorePercentage: a.score_percentage || 0,
      solvedCount,
      passedCases,
      totalPossibleCases,
      accuracy,
      timeTakenStr,
      startedAt: a.started_at ? new Date(a.started_at).toLocaleString() : 'N/A',
      completedAt: a.completed_at ? new Date(a.completed_at).toLocaleString() : 'N/A',
      fullName: a.student_details?.fullName || a.profiles?.full_name || 'N/A',
      rollNumber: a.student_details?.rollNumber || 'N/A',
      courseClass: a.student_details?.courseClass || 'N/A',
      section: a.student_details?.section || 'N/A',
      isDisqualified: a.is_disqualified,
      warningsCount: a.warnings_count || 0
    }
  })

  // Sort scoreboards by rank (descending order of score, then descending order of accuracy, then ascending order of time)
  parsedAttempts.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score
    if (y.accuracy !== x.accuracy) return y.accuracy - x.accuracy
    const getSecs = (str: string) => {
      if (str === 'N/A') return 999999
      const matches = str.match(/(\d+)m\s+(\d+)s/)
      if (!matches) return 999999
      return parseInt(matches[1]) * 60 + parseInt(matches[2])
    }
    return getSecs(x.timeTakenStr) - getSecs(y.timeTakenStr)
  })

  const avgCorrected = totalAttempted > 0 ? (totalCorrected / totalAttempted).toFixed(1) : '0.0'
  const avgPassedCases = totalAttempted > 0 ? (totalPassedCases / totalAttempted).toFixed(1) : '0.0'
  const avgScore = totalAttempted > 0 ? (sumScore / totalAttempted).toFixed(1) : '0.0'

  // Print scorecard to PDF
  const handlePrintPDF = () => {
    window.print()
  }

  // Export scorecard to CSV file
  const handleExportCSV = () => {
    if (parsedAttempts.length === 0 || !selectedCodeathon) return

    const headers = [
      'Rank', 'Full Name', 'Roll Number', 'Section', 'Course / Class', 
      'Username', 'Email', 'Score Gained', 'Total Quiz Points', 
      'Questions Solved', 'Total Quiz Questions', 'Passed Test Cases', 
      'Time Taken', 'Warnings Count', 'Accuracy (%)', 'Started At', 'Ended At', 'Status'
    ]

    const rows = parsedAttempts.map((candidate, idx) => [
      idx + 1,
      candidate.fullName,
      candidate.rollNumber,
      candidate.section,
      candidate.courseClass,
      `@${candidate.username}`,
      candidate.email,
      candidate.score,
      totalQuizPoints,
      candidate.solvedCount,
      totalQuestionsCount,
      candidate.passedCases,
      candidate.timeTakenStr,
      candidate.warningsCount,
      `${candidate.accuracy}%`,
      candidate.startedAt,
      candidate.completedAt,
      candidate.isDisqualified ? 'DISQUALIFIED' : 'NORMAL'
    ])

    const csvContent = 
      'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${selectedCodeathon.title.replace(/\s+/g, '_')}_analytics.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Render Full Screen Student Profile exactly like student portal's profile page
  if (viewedStudent) {
    const uniqueAcceptedSubs = Array.from(
      new Map(
        viewedStudentSubs
          .filter(s => s.status === 'accepted')
          .map(s => [s.question_id, s])
      ).values()
    )

    const totalPoints = uniqueAcceptedSubs.reduce((acc, curr: any) => acc + (curr.coding_questions?.points || 0), 0)

    const totalEasy = LOCAL_QUESTIONS.filter(q => q.difficulty === 'easy').length
    const solvedEasy = new Set(viewedStudentSubs.filter(s => s.status === 'accepted' && s.coding_questions?.difficulty === 'easy').map(s => s.question_id)).size

    const totalMedium = LOCAL_QUESTIONS.filter(q => q.difficulty === 'medium').length
    const solvedMedium = new Set(viewedStudentSubs.filter(s => s.status === 'accepted' && s.coding_questions?.difficulty === 'medium').map(s => s.question_id)).size

    const totalHard = LOCAL_QUESTIONS.filter(q => q.difficulty === 'hard').length
    const solvedHard = new Set(viewedStudentSubs.filter(s => s.status === 'accepted' && s.coding_questions?.difficulty === 'hard').map(s => s.question_id)).size

    const totalSolvedCount = solvedEasy + solvedMedium + solvedHard
    const totalQuestionsCount = totalEasy + totalMedium + totalHard

    const percentSolved = totalQuestionsCount > 0 ? (totalSolvedCount / totalQuestionsCount) * 100 : 0
    const radius = 36
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (percentSolved / 100) * circumference

    // LeetCode Standard 2026 Year-View Segmented by Month
    const renderHeatmapGrid = () => {
      const daysInWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const fullMonthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]

      const monthsData = []

      for (let m = 0; m < 12; m++) {
        const startDate = new Date(2026, m, 1)
        const startOffset = startDate.getDay()
        const daysInMonth = new Date(2026, m + 1, 0).getDate()
        const monthDays = []

        // 1. Blanks at the beginning of the month
        for (let i = 0; i < startOffset; i++) {
          monthDays.push({
            type: 'empty',
            key: `empty-${m}-${i}`
          })
        }

        // 2. Active days of the month
        for (let day = 1; day <= daysInMonth; day++) {
          const currentDate = new Date(2026, m, day)
          const yyyy = currentDate.getFullYear()
          const mm = String(currentDate.getMonth() + 1).padStart(2, '0')
          const dd = String(currentDate.getDate()).padStart(2, '0')
          const dateStr = `${yyyy}-${mm}-${dd}`
          const count = viewedStudentHeatmap[dateStr] || 0

          let color = 'bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-hairline-soft hover:border-gray-400 dark:hover:border-hairline'
          if (count === 1) color = 'bg-emerald-200 dark:bg-emerald-900/80 border-emerald-300 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-500'
          if (count === 2) color = 'bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600 hover:border-emerald-600 dark:hover:border-emerald-400'
          if (count >= 3) color = 'bg-emerald-600 dark:bg-emerald-500 border-emerald-700 dark:border-emerald-400 hover:border-emerald-700 dark:hover:border-emerald-300'

          const weekdayName = daysInWeek[currentDate.getDay()]
          const monthName = fullMonthNames[m]

          monthDays.push({
            type: 'day',
            key: dateStr,
            date: currentDate,
            color,
            title: `${weekdayName}, ${monthName} ${day}, ${yyyy}: ${count} submission${count !== 1 ? 's' : ''}`
          })
        }

        // Chunk monthDays into weeks of size 7
        const monthWeeks = []
        for (let i = 0; i < monthDays.length; i += 7) {
          const week = monthDays.slice(i, i + 7)
          // Pad the last week of the month with empty cells so it has exactly 7 elements
          while (week.length < 7) {
            week.push({
              type: 'empty',
              key: `empty-pad-${m}-${week.length}`
            })
          }
          monthWeeks.push(week)
        }

        monthsData.push({
          monthIdx: m,
          name: monthNames[m],
          weeks: monthWeeks
        })
      }

      return (
        <div className="w-full overflow-x-auto p-4 bg-canvas border border-hairline rounded-2xl scrollbar-none shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="min-w-[1100px] flex items-start gap-2">
            <div className="flex flex-col gap-1 text-[8px] font-bold text-gray-400 font-mono pr-1.5 select-none pt-[20px]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="h-4 flex items-center justify-end">{day}</div>
              ))}
            </div>

            <div className="flex items-start gap-1">
              {monthsData.map((m, mIdx) => (
                <div
                  key={m.monthIdx}
                  className={`flex flex-col gap-1 ${
                    mIdx > 0 ? 'ml-3 pl-3 border-l border-dashed border-gray-200 dark:border-gray-700/60' : ''
                  }`}
                >
                  <div className="text-[9px] font-bold text-gray-400 font-mono select-none h-4">
                    {m.name}
                  </div>

                  <div className="flex gap-1">
                    {m.weeks.map((week, wIdx) => (
                      <div key={wIdx} className="grid grid-rows-7 gap-1 flex-shrink-0">
                        {week.map((day) => (
                          day.type === 'empty' ? (
                            <div key={day.key} className="w-4 h-4 rounded-[3px] bg-transparent border border-transparent" />
                          ) : (
                            <div
                              key={day.key}
                              className={`w-4 h-4 rounded-[3px] border transition-all ${day.color}`}
                              title={day.title}
                            />
                          )
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen p-8 bg-canvas text-ink">
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
          
          {/* Header Section with Back Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-hairline pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewedStudent(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline bg-surface-soft hover:bg-surface-card hover:text-primary transition-all text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink mt-2">
                {viewedStudent.full_name || viewedStudent.username}&apos;s Profile
              </h1>
              <p className="text-gray-550 text-xs font-light">
                Viewing student performance analytics and submission logs
              </p>
            </div>
          </div>

          {/* Top Section - Side-by-Side Cards (Solved Problems + Profile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Solved Problems Card */}
            <div className="p-6 rounded-3xl bg-canvas border border-hairline flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] min-h-[200px]">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Solved Problems</h3>
              
              {loadingStudent ? (
                <div className="flex items-center gap-8 py-4 animate-pulse">
                  <div className="w-28 h-28 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center relative">
                    <div className="w-20 h-20 rounded-full bg-canvas" />
                  </div>
                  <div className="flex-1 space-y-4">
                    {[...Array(3)].map((_, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="h-3 w-16 bg-gray-200 dark:bg-zinc-800 rounded" />
                        <div className="w-full h-1.5 rounded-full bg-gray-250 dark:bg-zinc-850" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-8 py-4">
                  {/* Circular Gauge */}
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r={radius} className="stroke-hairline-soft fill-transparent" strokeWidth="4.5" />
                      <circle
                        cx="40" cy="40" r={radius}
                        className="stroke-primary fill-transparent transition-all duration-500 ease-out"
                        strokeWidth="4.5" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                      <span className="text-2xl font-extrabold text-ink leading-none">{totalSolvedCount}</span>
                      <span className="text-[10px] text-gray-400 font-medium mt-1">Solved</span>
                    </div>
                  </div>

                  {/* Progress Breakdown Bars */}
                  <div className="flex-1 space-y-3.5">
                    {/* Easy Row */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-emerald-500">Easy</span>
                        <span className="text-ink font-mono">{solvedEasy}<span className="text-gray-400 font-light">/{totalEasy}</span></span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-hairline-soft overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${totalEasy > 0 ? (solvedEasy / totalEasy) * 100 : 0}%` }} />
                      </div>
                    </div>

                    {/* Medium Row */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-amber-500">Medium</span>
                        <span className="text-ink font-mono">{solvedMedium}<span className="text-gray-400 font-light">/{totalMedium}</span></span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-hairline-soft overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${totalMedium > 0 ? (solvedMedium / totalMedium) * 100 : 0}%` }} />
                      </div>
                    </div>

                    {/* Hard Row */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-red-500">Hard</span>
                        <span className="text-ink font-mono">{solvedHard}<span className="text-gray-400 font-light">/{totalHard}</span></span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-hairline-soft overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${totalHard > 0 ? (solvedHard / totalHard) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Student Profile Card */}
            <div className="p-6 rounded-3xl bg-canvas border border-hairline flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] min-h-[200px] relative">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Student Profile</h3>
                <button
                  onClick={() => setViewedStudent(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/60 dark:bg-canvas/60 hover:bg-white dark:hover:bg-surface-card hover:text-primary hover:border-primary/30 border border-hairline text-gray-550 hover:text-ink text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Go Back
                </button>
              </div>

              <div className="flex items-center gap-5 my-4">
                <div 
                  onClick={() => setShowLightbox(true)}
                  className="relative w-16 h-16 rounded-full border border-hairline overflow-hidden shadow-md group shrink-0 transition-transform duration-300 hover:scale-[1.04] cursor-pointer"
                >
                  {viewedStudent.avatar_url ? (
                    <img src={viewedStudent.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-on-primary text-2xl">
                      {viewedStudent.username ? viewedStudent.username.substring(0, 2).toUpperCase() : 'PY'}
                    </div>
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <h1 className="text-lg font-extrabold tracking-tight text-ink truncate">
                      {viewedStudent.full_name || `@${viewedStudent.username}`}
                    </h1>
                    {viewedStudent.full_name && (
                      <span className="text-[10px] text-gray-550 font-mono truncate shrink-0">(@{viewedStudent.username})</span>
                    )}
                  </div>
                  <p className="text-gray-650 dark:text-gray-300 text-xs font-medium italic line-clamp-1">
                    {viewedStudent.bio || 'No bio written yet.'}
                  </p>
                  <p className="text-gray-500 text-[10px] font-mono leading-none pt-0.5">GLA University Student</p>
                </div>
              </div>

              <div className="flex items-center gap-8 border-t border-black/5 pt-4">
                <div>
                  <p className="text-[9px] text-gray-555 uppercase tracking-widest font-bold font-mono">Workspace Score</p>
                  {loadingStudent ? (
                    <div className="h-6 w-16 bg-gray-250 dark:bg-zinc-800 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-2xl font-extrabold text-primary mt-0.5">{totalPoints} pts</p>
                  )}
                </div>
                <div>
                  <p className="text-[9px] text-gray-555 uppercase tracking-widest font-bold font-mono">Sandbox Rank</p>
                  {loadingStudent ? (
                    <div className="h-6 w-24 bg-gray-255 dark:bg-zinc-800 animate-pulse rounded mt-1" />
                  ) : (
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-2xl font-extrabold text-ink">#{viewedStudentRank}</span>
                      <span className="text-[10px] text-emerald-650 dark:text-emerald-400 font-bold font-mono">
                        (Top {viewedStudentPercentile}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submissions Heatmap */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Submission Heatmap
            </h2>
            {loadingStudent ? (
              <div className="h-28 w-full bg-gray-200 dark:bg-zinc-850 animate-pulse rounded-2xl" />
            ) : (
              <>
                {renderHeatmapGrid()}
                <div className="flex items-center justify-between text-xs text-gray-505 px-2 pt-1">
                  <p>Submission history logs for the year 2026</p>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span>Less</span>
                    <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-hairline-soft" />
                    <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
                    <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
                    <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
                    <span>More</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Solving History list */}
          <div className="space-y-4 max-w-3xl">
            <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <Code2 className="w-5 h-5 text-gray-400" />
              Submission Log History
            </h2>
            
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {loadingStudent ? (
                [...Array(3)].map((_, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-canvas border border-hairline flex items-center justify-between animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-gray-200 dark:bg-zinc-855 rounded" />
                      <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-855 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-zinc-855 rounded-full" />
                  </div>
                ))
              ) : viewedStudentSubs.length === 0 ? (
                <div className="py-12 text-center text-gray-555 bg-canvas rounded-2xl border border-hairline">
                  <p className="text-sm">No submissions recorded yet.</p>
                </div>
              ) : (
                viewedStudentSubs.map((sub) => {
                  const dateStr = new Date(sub.created_at).toLocaleDateString()
                  return (
                    <div
                      key={sub.id}
                      className="p-4 rounded-xl bg-canvas border border-hairline flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-ink">{sub.coding_questions?.title || `Question #${sub.question_id}`}</h3>
                        <p className="text-[10px] text-gray-555 font-light">Submitted {dateStr}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono border bg-block-mint text-emerald-800 border-emerald-200">
                          accepted
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Fullscreen Avatar Lightbox Modal */}
          {showLightbox && (
            <div 
              onClick={() => setShowLightbox(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
            >
              <button 
                onClick={() => setShowLightbox(false)}
                className="absolute top-6 right-6 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 bg-black/40 px-4 py-2 rounded-full transition-all text-xs font-extrabold uppercase tracking-wider cursor-pointer font-mono shadow-lg"
              >
                ✕ Close
              </button>

              <div 
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-md w-full aspect-square flex justify-center items-center p-2 cursor-default animate-scale-in"
              >
                <div className="relative w-72 h-72 md:w-[400px] md:h-[400px] rounded-full border-4 border-white/15 overflow-hidden shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)] select-none bg-zinc-900">
                  {viewedStudent.avatar_url ? (
                    <img 
                      src={viewedStudent.avatar_url} 
                      alt="Avatar Full View" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-on-primary text-8xl uppercase select-none font-mono">
                      {viewedStudent.username ? viewedStudent.username.substring(0, 2).toUpperCase() : 'PY'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Scoreboard View Layout
  if (showAnalytics && selectedCodeathon) {
    return (
      <div className="min-h-screen bg-canvas p-6 md:p-8 font-sans text-gray-900 dark:text-white relative">
        {/* Print stylesheet bindings */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body {
              background: white !important;
              color: #0f172a !important;
            }
            .no-print {
              display: none !important;
            }
            .print-nowrap {
              white-space: nowrap !important;
            }
            .print-full-width {
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              background: white !important;
              color: #0f172a !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              min-width: 0 !important;
            }
            th, td {
              border: 1px solid #cbd5e1 !important;
              padding: 4px 6px !important;
              font-size: 8px !important;
              color: #0f172a !important;
              background: transparent !important;
              white-space: normal !important;
              word-break: break-word !important;
            }
            th {
              background-color: #f1f5f9 !important;
              font-weight: bold !important;
              text-transform: uppercase !important;
            }
            tr {
              page-break-inside: avoid !important;
            }
          }
        `}} />

        <div className="max-w-7xl mx-auto space-y-6 print-full-width">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-200 dark:border-zinc-800 pb-4 no-print">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono">Analytics Scoreboard</span>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{selectedCodeathon.title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-55 dark:hover:bg-zinc-955 text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Export to CSV
              </button>

              <button
                onClick={handlePrintPDF}
                className="px-4 py-2 rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-55 dark:hover:bg-zinc-955 text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Download Report
              </button>

              <button
                onClick={handleCloseAnalytics}
                className="px-4 py-2 rounded-full border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-955 text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>

          {/* Professional Print-only Header Banner */}
          <div className="hidden print:block border border-gray-300 rounded-xl p-4 mb-6 text-black bg-gray-55/10">
            <div className="flex justify-between items-start pb-2 mb-2 border-b border-gray-300">
              <div>
                <div className="text-[8px] font-sans font-bold uppercase tracking-wider text-gray-500">Codeathon Analytics Report</div>
                <h2 className="text-lg font-bold mt-0.5 text-black">{selectedCodeathon.title}</h2>
                {selectedCodeathon.description && (
                  <p className="text-[10px] text-gray-600 mt-1">{selectedCodeathon.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-[8px] font-sans font-bold bg-[#cc785c] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ANALYTICS
                </span>
                <div className="text-[8px] font-sans text-gray-500 mt-1">
                  PK-CD-{selectedCodeathon.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs font-sans">
              <div>
                <div className="text-[7px] font-bold text-gray-500 uppercase tracking-wider">TEST DATE & TIME</div>
                <div className="text-[10px] font-bold text-black mt-0.5">
                  {new Date(selectedCodeathon.start_time).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div>
                <div className="text-[7px] font-bold text-gray-500 uppercase tracking-wider">Total Takers</div>
                <div className="text-[10px] font-bold text-black mt-0.5">{totalAttempted} Candidates</div>
              </div>
              <div>
                <div className="text-[7px] font-bold text-gray-500 uppercase tracking-wider">Class Average Score</div>
                <div className="text-[10px] font-bold text-black mt-0.5">{avgScore} / {totalQuizPoints} PTS</div>
              </div>
            </div>
          </div>

          {/* Analytics Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 print:hidden">
            
            {/* Total Attempted */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-gray-555 dark:text-gray-400 uppercase tracking-widest font-mono">TOTAL ATTEMPTED</span>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">{totalAttempted} <span className="text-xs text-gray-400 font-light">Takers</span></p>
            </div>

            {/* Highest Questions Corrected */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-gray-555 dark:text-gray-400 uppercase tracking-widest font-mono">HIGHEST SOLVED</span>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{maxCorrected} <span className="text-xs text-gray-400 font-light">/ {totalQuestionsCount} Qs</span></p>
            </div>

            {/* Average Questions Corrected */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-gray-555 dark:text-gray-400 uppercase tracking-widest font-mono">AVERAGE SOLVED</span>
              <p className="text-xl font-extrabold text-gray-855 dark:text-gray-200 mt-1">{avgCorrected} <span className="text-xs text-gray-400 font-light">/ {totalQuestionsCount} Qs</span></p>
            </div>

            {/* Highest Test Cases Passed */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-gray-555 dark:text-gray-400 uppercase tracking-widest font-mono">HIGHEST CASES</span>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">{maxPassedCases} <span className="text-xs text-gray-400 font-light">Passed</span></p>
            </div>

            {/* Average Test Cases Passed */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-gray-555 dark:text-gray-400 uppercase tracking-widest font-mono">AVERAGE CASES</span>
              <p className="text-xl font-extrabold text-gray-855 dark:text-gray-200 mt-1">{avgPassedCases} <span className="text-xs text-gray-400 font-light">Passed</span></p>
            </div>

            {/* Highest Score */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-gray-555 dark:text-gray-400 uppercase tracking-widest font-mono">HIGHEST SCORE</span>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{maxScore} <span className="text-xs text-gray-400 font-light">/ {totalQuizPoints} PTS</span></p>
            </div>

            {/* Average Score */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-gray-555 dark:text-gray-400 uppercase tracking-widest font-mono">AVERAGE SCORE</span>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">{avgScore} <span className="text-xs text-gray-400 font-light">/ {totalQuizPoints} PTS</span></p>
            </div>

          </div>

          {/* Student Performance Log Table Container */}
          <div className="border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl overflow-hidden shadow-sm print:border-none print:shadow-none print:rounded-none">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:bg-white print:border-b-2 print:border-gray-300">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white font-mono shrink-0 print:text-base print:text-black print:font-extrabold print:pb-1">
                Student Performance Log
              </h3>
              <div className="flex items-center gap-3 w-full sm:w-auto no-print">
                {/* User Search */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search any student..."
                    value={userSearchQuery}
                    onChange={e => handleUserSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-full text-[11px] border border-hairline bg-canvas focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono placeholder:text-gray-400"
                  />
                  {userSearchResults.length > 0 && (
                    <div className="absolute top-full mt-1.5 left-0 right-0 bg-canvas border border-hairline rounded-xl shadow-2xl z-20 overflow-hidden">
                      {userSearchResults.map((u: any) => (
                        <button
                          key={u.id}
                          onClick={() => { setUserSearchQuery(''); setUserSearchResults([]); handleViewStudent(u.id) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-soft transition-colors text-left cursor-pointer"
                        >
                          {u.avatar_url ? (
                            <img src={u.avatar_url} className="w-7 h-7 rounded-full object-cover border border-hairline" alt="" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary text-[10px] font-bold">
                              {u.username?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-ink">@{u.username}</p>
                            {u.full_name && <p className="text-[10px] text-gray-400">{u.full_name}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {loadingAttempts && (
                  <span className="text-[10px] text-primary animate-pulse font-mono font-bold whitespace-nowrap">SYNCING...</span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1600px] w-full text-left border-collapse text-xs table-auto">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-zinc-900/60 text-gray-555 dark:text-gray-400 border-b border-gray-200 dark:border-zinc-800 font-mono text-[9px] uppercase tracking-wider font-bold whitespace-nowrap">
                    <th className="px-4 py-3 text-center whitespace-nowrap print-nowrap">Rank</th>
                    <th className="px-4 py-3 whitespace-nowrap">Student (Email)</th>
                    <th className="px-4 py-3 whitespace-nowrap print:hidden">Username</th>
                    <th className="px-4 py-3 whitespace-nowrap print-nowrap">Score</th>
                    <th className="px-4 py-3 whitespace-nowrap">Questions</th>
                    <th className="px-4 py-3 whitespace-nowrap">Test Cases</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap print-nowrap">Warnings</th>
                    <th className="px-4 py-3 whitespace-nowrap print:hidden">Time Taken</th>
                    <th className="px-4 py-3 whitespace-nowrap print:hidden">Started At</th>
                    <th className="px-4 py-3 whitespace-nowrap print:hidden">Ended At</th>
                    <th className="px-4 py-3 whitespace-nowrap">Full Name</th>
                    <th className="px-4 py-3 whitespace-nowrap print-nowrap">Roll Number</th>
                    <th className="px-4 py-3 whitespace-nowrap print-nowrap">Section</th>
                    <th className="px-4 py-3 whitespace-nowrap print-nowrap">Course / Class</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap print-nowrap">Accuracy</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap print:hidden">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                  {loadingAttempts && parsedAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-20">
                        <div className="sticky left-0 right-0 mx-auto w-fit flex flex-col items-center gap-2 text-xs text-gray-400 font-light text-center">
                          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                          <span>Loading database scorecard...</span>
                        </div>
                      </td>
                    </tr>
                  ) : parsedAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-20">
                        <div className="sticky left-0 right-0 mx-auto w-fit flex flex-col items-center gap-2 text-xs text-gray-400 font-light text-center">
                          <span>No candidates have completed this exam.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    parsedAttempts.map((candidate, index) => (
                      <tr key={candidate.id} className="transition-colors border-b border-gray-100 dark:border-zinc-800/50">
                        <td className="px-4 py-3 text-center font-bold font-mono text-gray-900 dark:text-gray-100 whitespace-nowrap">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 select-text whitespace-nowrap">{candidate.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap print:hidden">
                           <button
                             onClick={() => {
                               const attempt = attempts.find(a => a.profiles?.username === candidate.username)
                               if (attempt?.user_id) handleViewStudent(attempt.user_id)
                             }}
                             className="font-mono text-primary hover:underline underline-offset-2 flex items-center gap-1 cursor-pointer text-xs whitespace-nowrap"
                           >
                             @{candidate.username}
                             <ExternalLink className="w-2.5 h-2.5 opacity-60 print:hidden" />
                           </button>
                        </td>
                        <td className="px-4 py-3 font-bold font-mono text-gray-900 dark:text-gray-100 whitespace-nowrap print-nowrap">{candidate.score} / {totalQuizPoints}</td>
                        <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100 whitespace-nowrap">{candidate.solvedCount} / {totalQuestionsCount}</td>
                        <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100 whitespace-nowrap">{candidate.passedCases} / {candidate.totalPossibleCases}</td>
                        <td className="px-4 py-3 text-center font-bold font-mono text-amber-600 dark:text-amber-500 whitespace-nowrap print-nowrap">{candidate.warningsCount}</td>
                        <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100 whitespace-nowrap print:hidden">{candidate.timeTakenStr}</td>
                        <td className="px-4 py-3 text-[10px] text-gray-900 dark:text-gray-100 font-mono select-text whitespace-nowrap print:hidden">{candidate.startedAt}</td>
                        <td className="px-4 py-3 text-[10px] text-gray-900 dark:text-gray-100 font-mono select-text whitespace-nowrap print:hidden">{candidate.completedAt}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 select-text whitespace-nowrap">{candidate.fullName}</td>
                        <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100 select-text whitespace-nowrap print-nowrap">{candidate.rollNumber}</td>
                        <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100 select-text whitespace-nowrap print-nowrap">{candidate.section}</td>
                        <td className="px-4 py-3 font-sans text-gray-900 dark:text-gray-100 select-text whitespace-nowrap print-nowrap">{candidate.courseClass}</td>
                        <td className="px-4 py-3 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap print-nowrap">{candidate.accuracy}%</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap print:hidden">
                          {candidate.isDisqualified ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                              Disqualified
                            </span>
                          ) : candidate.completedAt !== 'N/A' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                              Normal
                            </span>
                          ) : new Date(selectedCodeathon?.end_time || 0) < new Date() ? (
                            <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 border border-zinc-500/20 text-zinc-500 dark:text-zinc-400 font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                              Not Submitted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-450 font-mono text-[9px] font-bold uppercase tracking-wider animate-pulse whitespace-nowrap">
                              Attempting
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // Cards List Landing View Layout
  return (
    <div className="min-h-screen p-6 md:p-8 bg-canvas text-gray-900 dark:text-white font-sans">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-zinc-800 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Instructor Analytics Workspace
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-light">Monitor student scores, anti-cheat warnings, and export grade sheets</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Main User Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search any student profile..."
                value={userSearchQuery}
                onChange={e => handleUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-full text-xs border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans placeholder:text-gray-400 text-gray-900 dark:text-white shadow-sm"
              />
              {userSearchResults.length > 0 && (
                <div className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden">
                  {userSearchResults.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => { setUserSearchQuery(''); setUserSearchResults([]); handleViewStudent(u.id) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-850 transition-colors text-left cursor-pointer"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} className="w-7 h-7 rounded-full object-cover border border-hairline" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary text-[10px] font-bold">
                          {u.username?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">@{u.username}</p>
                        {u.full_name && <p className="text-[10px] text-gray-450">{u.full_name}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/codeathons/create"
              className="px-5 py-2.5 rounded-full bg-primary hover:opacity-90 text-on-primary text-xs font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <PlusCircle className="w-4.5 h-4.5" />
              Create Codeathon
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6 animate-pulse">
            {/* Top Stats Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex items-center gap-4">
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
                  <div key={i} className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 space-y-4 shadow-sm flex flex-col justify-between">
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
                    <div className="border-t border-gray-200 dark:border-zinc-800 pt-4 mt-2 flex justify-between gap-2">
                      <div className="h-8 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
                      <div className="h-8 w-24 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : codeathons.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-gray-500 animate-scale-in">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <h3 className="text-gray-900 dark:text-white font-bold text-sm mb-1">No Codeathons Scheduled</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-light">
              You haven&apos;t created any student exams yet. Click the Create Codeathon button above to schedule your first coding evaluation.
            </p>
          </div>
        ) : (
          <>
            {/* Top Workspace Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              
              <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-sm shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-gray-550 dark:text-gray-400 text-[9px] uppercase tracking-wider font-mono font-bold">Total Quizzes Created</h3>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{overallStats.totalCreated}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-gray-555 dark:text-gray-400 text-[9px] uppercase tracking-wider font-mono font-bold">Active Now</h3>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{overallStats.activeNow}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-gray-555 dark:text-gray-400 text-[9px] uppercase tracking-wider font-mono font-bold">Coming Soon</h3>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{overallStats.comingSoon}</p>
                </div>
              </div>

            </div>

            {/* Codeathons card grid */}
            <div className="space-y-4 pt-2">
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500 font-mono">Quizzes list</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {codeathons.map((quiz) => {
                  const now = new Date()
                  const isLive = new Date(quiz.start_time) <= now && new Date(quiz.end_time) >= now
                  const isUpcoming = new Date(quiz.start_time) > now
                  
                  const attemptsCount = attemptCounts[quiz.id] || 0
                  const questionsCount = quiz.coding_question_ids?.length || 0

                  return (
                    <div 
                      key={quiz.id}
                      className="group rounded-2xl border border-gray-200 dark:border-zinc-800/80 border-l-[6px] border-l-primary dark:border-l-primary bg-white dark:bg-zinc-900/40 shadow-sm flex flex-col justify-between overflow-hidden"
                    >
                      <div className="p-5 space-y-4">
                        
                        {/* Header Badges & Actions */}
                        <div className="flex justify-between items-center">
                          {isLive ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.06)] animate-pulse">
                              Active Now
                            </span>
                          ) : isUpcoming ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-[9px] font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(59,130,246,0.06)]">
                              Coming Soon
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-550 dark:text-zinc-400 font-mono text-[9px] font-bold uppercase tracking-wider">
                              Ended
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyLink(quiz.id)}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-all"
                            title="Copy exam link for students"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            {copiedId === quiz.id ? 'Copied!' : 'Copy Link'}
                          </button>
                        </div>

                        {/* Title & Timing Details */}
                        <div className="space-y-2">
                          <h3 className="text-sm font-extrabold text-gray-900 dark:text-zinc-100 leading-snug truncate">{quiz.title}</h3>
                          
                          <div className="space-y-1 text-[11px] text-gray-500 dark:text-zinc-400 font-mono select-text pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400 dark:text-zinc-550 font-extrabold text-[9px] uppercase tracking-wider min-w-[70px] inline-block">Start:</span>
                              <span className="text-gray-800 dark:text-zinc-300 font-medium">
                                {new Date(quiz.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400 dark:text-zinc-550 font-extrabold text-[9px] uppercase tracking-wider min-w-[70px] inline-block">End:</span>
                              <span className="text-gray-800 dark:text-zinc-300 font-medium">
                                {new Date(quiz.end_time).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400 dark:text-zinc-550 font-extrabold text-[9px] uppercase tracking-wider min-w-[70px] inline-block">Limit:</span>
                              <span className="text-gray-800 dark:text-zinc-300 font-semibold text-primary">
                                {quiz.duration_minutes ? `${quiz.duration_minutes} mins` : 'No Limit'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Question and Attempt counts */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <div className="px-3 py-1 rounded-full border border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40 text-[10px] text-gray-655 dark:text-zinc-300 font-mono flex items-center gap-1.5 font-bold">
                            <HelpCircle className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                            <span>{questionsCount} Questions</span>
                          </div>
                          
                          <div className="px-3 py-1 rounded-full border border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40 text-[10px] text-gray-655 dark:text-zinc-300 font-mono flex items-center gap-1.5 font-bold">
                            <Users className="w-3.5 h-3.5 text-gray-450 dark:text-zinc-500" />
                            <span>{attemptsCount} Attempts</span>
                          </div>
                        </div>

                      </div>

                      {/* Floating wide analytics action button inside padding */}
                      <div className="p-5 pt-0">
                        <button
                          type="button"
                          onClick={() => handleOpenAnalytics(quiz)}
                          className="w-full py-2.5 bg-black dark:bg-white hover:bg-neutral-900 dark:hover:bg-neutral-100 text-white dark:text-black rounded-full flex items-center justify-center gap-2 font-extrabold text-[11px] uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                        >
                          <BarChart2 className="w-4 h-4 shrink-0" />
                          View Attempts & Analytics
                        </button>
                      </div>

                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
