'use server'

import { createClient } from '@supabase/supabase-js'

function getQuestionTotalCases(verificationScript: string): number {
  if (!verificationScript) return 1
  
  const totalMatches = verificationScript.match(/^\s*total\s*=\s*([1-9]\d*)/m)
  if (totalMatches) {
    return parseInt(totalMatches[1], 10)
  }
  
  const totalIncMatches = verificationScript.match(/total\s*\+=\s*1/g)
  if (totalIncMatches && totalIncMatches.length > 0) {
    return totalIncMatches.length
  }
  
  if (!verificationScript.includes('fn = exec_globals') && !verificationScript.includes('assert fn(')) {
    return 1
  }
  return 1
}

export async function sweepIncompleteAttempts(codeathonId: number | string) {
  try {
    const quizId = typeof codeathonId === 'string' ? parseInt(codeathonId, 10) : codeathonId
    if (isNaN(quizId)) throw new Error('Invalid codeathonId')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Fetch incomplete attempts
    const { data: incompleteAttempts } = await supabase
      .from('quiz_attempts')
      .select('id, user_id, student_details, warnings_count, is_disqualified')
      .eq('quiz_id', quizId)
      .is('completed_at', null)

    if (!incompleteAttempts || incompleteAttempts.length === 0) {
      return { success: true, swept: 0 }
    }

    const completedAt = new Date().toISOString()
    
    // 2. Fetch questions for score calculation
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('coding_question_ids')
      .eq('id', quizId)
      .maybeSingle()

    const qIds = quizData?.coding_question_ids || []
    const { data: qs } = qIds.length > 0 
      ? await supabase.from('coding_questions').select('id, points, verification_script').in('id', qIds) 
      : { data: [] }
    const qList: any[] = qs || []

    // 3. Finalize each incomplete attempt using service role client
    let swept = 0
    await Promise.all(incompleteAttempts.map(async (attempt: any) => {
      const submittedQs: Record<string, boolean> = attempt.student_details?.submittedQuestions || {}
      const savedSummary: Record<string, { passed: number; total: number }> = attempt.student_details?.testCasesSummary || {}
      let totalPoints = 0
      let earnedPoints = 0
      const finalSummary: Record<number, { passed: number; total: number }> = {}

      qList.forEach((q: any) => {
        totalPoints += q.points
        const saved = savedSummary[q.id]
        const qTotal = (saved && saved.total > 0) ? saved.total : getQuestionTotalCases(q.verification_script)
        const qPassed = (!!submittedQs[q.id] && saved) ? (saved.passed || 0) : 0
        if (!!submittedQs[q.id] && saved && saved.total > 0) {
          earnedPoints += (saved.passed / saved.total) * q.points
        }
        finalSummary[q.id] = { passed: qPassed, total: qTotal }
      })

      const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
      const isDisq = attempt.is_disqualified || (attempt.warnings_count || 0) >= 2

      const { error } = await supabase
        .from('quiz_attempts')
        .update({
          completed_at: completedAt,
          score: isDisq ? 0 : Math.round(earnedPoints),
          score_percentage: isDisq ? 0 : scorePercentage,
          student_details: { ...attempt.student_details, testCasesSummary: finalSummary }
        })
        .eq('id', attempt.id)

      if (!error) swept++
    }))

    return { success: true, swept }
  } catch (err: any) {
    console.error('[sweepIncompleteAttempts] Error:', err)
    return { success: false, error: err.message }
  }
}
