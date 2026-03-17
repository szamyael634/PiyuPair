import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store.ts'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function calculateMatchingScore(student: any, tutor: any, subject?: string) {
  let score = 40

  // Strongly prioritize subject fit.
  if (subject && Array.isArray(tutor?.subjects) && tutor.subjects.includes(subject)) {
    score += 30
  }

  // Reward proven tutor quality.
  const rating = Number(tutor?.rating || 0)
  score += clamp((rating / 5) * 20, 0, 20)

  // Reward experience with diminishing effect.
  const sessions = Number(tutor?.totalSessions || 0)
  score += clamp(Math.log10(sessions + 1) * 8, 0, 8)

  // Student interests alignment contributes additional confidence.
  if (Array.isArray(student?.enrolledSubjects) && subject && student.enrolledSubjects.includes(subject)) {
    score += 2
  }

  return Math.round(clamp(score, 0, 100))
}

function getCommissionRateFromMatchScore(matchScore: number) {
  // Dynamic platform take: 10% at low confidence down to 5% at high confidence.
  const rate = 0.10 - (clamp(matchScore, 0, 100) / 100) * 0.05
  return Number(clamp(rate, 0.05, 0.10).toFixed(4))
}

function estimateAIDetection(text: string, fileUrl?: string) {
  const safeText = (text || '').trim()
  const lower = safeText.toLowerCase()
  const repeatedPhraseCount = (safeText.match(/\b(therefore|moreover|furthermore|in conclusion)\b/gi) || []).length
  const sentenceCount = Math.max(1, safeText.split(/[.!?]+/).filter(Boolean).length)
  const avgSentenceLength = safeText.length / sentenceCount
  const hasUrlOnlySubmission = !safeText && !!fileUrl

  let score = 0
  if (avgSentenceLength > 140) score += 20
  if (repeatedPhraseCount >= 3) score += 15
  if (safeText.length > 1200 && !lower.includes('i ') && !lower.includes('my ')) score += 20
  if (hasUrlOnlySubmission) score += 10

  const flags = []
  if (avgSentenceLength > 140) flags.push('very-long-sentences')
  if (repeatedPhraseCount >= 3) flags.push('template-like-connectors')
  if (safeText.length > 1200 && !lower.includes('i ') && !lower.includes('my ')) flags.push('low-personal-context')
  if (hasUrlOnlySubmission) flags.push('file-only-submission')

  return {
    riskScore: clamp(Math.round(score), 0, 100),
    confidence: score >= 40 ? 'medium' : 'low',
    flags,
    checkedAt: new Date().toISOString(),
  }
}

function evaluateCredentialConsistency(input: {
  subject?: string
  certificateType?: string
  grade?: string | number
  declaredName?: string
  extractedText?: string
}) {
  const extracted = (input.extractedText || '').toLowerCase()
  let matchedChecks = 0
  let totalChecks = 0
  const mismatches: string[] = []

  if (input.subject) {
    totalChecks += 1
    if (extracted.includes(String(input.subject).toLowerCase())) {
      matchedChecks += 1
    } else {
      mismatches.push('subject-not-found-in-document-text')
    }
  }

  if (input.certificateType) {
    totalChecks += 1
    if (extracted.includes(String(input.certificateType).toLowerCase())) {
      matchedChecks += 1
    } else {
      mismatches.push('certificate-type-not-found-in-document-text')
    }
  }

  if (input.grade !== undefined && input.grade !== null && String(input.grade).length > 0) {
    totalChecks += 1
    if (extracted.includes(String(input.grade).toLowerCase())) {
      matchedChecks += 1
    } else {
      mismatches.push('grade-not-found-in-document-text')
    }
  }

  if (input.declaredName) {
    totalChecks += 1
    if (extracted.includes(String(input.declaredName).toLowerCase())) {
      matchedChecks += 1
    } else {
      mismatches.push('declared-name-not-found-in-document-text')
    }
  }

  const consistencyScore = totalChecks > 0 ? Math.round((matchedChecks / totalChecks) * 100) : 0
  return {
    consistencyScore,
    matchedChecks,
    totalChecks,
    mismatches,
    status: consistencyScore >= 70 ? 'likely_match' : 'needs_review',
    checkedAt: new Date().toISOString(),
  }
}

function getLevelFromXp(xp: number) {
  if (xp >= 3000) return 6
  if (xp >= 2000) return 5
  if (xp >= 1200) return 4
  if (xp >= 700) return 3
  if (xp >= 300) return 2
  return 1
}

function getLocalizedMessages(lang: string) {
  const dictionary: Record<string, Record<string, string>> = {
    en: {
      welcome: 'Welcome to PiyuPair',
      sessionFound: 'Session found',
      sessionNotFound: 'Session not found',
      submissionReceived: 'Submission received',
    },
    fil: {
      welcome: 'Maligayang pagdating sa PiyuPair',
      sessionFound: 'Nahanap ang session',
      sessionNotFound: 'Hindi nahanap ang session',
      submissionReceived: 'Natanggap ang sagot',
    },
    es: {
      welcome: 'Bienvenido a PiyuPair',
      sessionFound: 'Sesion encontrada',
      sessionNotFound: 'Sesion no encontrada',
      submissionReceived: 'Entrega recibida',
    },
  }

  return dictionary[lang] || dictionary.en
}

// Helper function to get user from access token
async function getUserFromToken(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1]
  if (!accessToken) {
    return { user: null, error: 'No access token provided' }
  }
  const { data: { user }, error } = await supabase.auth.getUser(accessToken)
  return { user, error }
}

// ============= AUTH ROUTES =============

app.post('/make-server-824d015e/signup', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, name, role, phone, subjects, bio, hourlyRate, qualifications, experience } = body

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    })

    if (error) {
      console.log(`Error creating user during signup: ${error.message}`)
      return c.json({ error: error.message }, 400)
    }

    // Store additional user profile data in KV store
    const userId = data.user.id
    const profile = {
      id: userId,
      email,
      name,
      role, // 'student', 'tutor', or 'admin'
      phone,
      bio: bio || '',
      createdAt: new Date().toISOString(),
      approved: role === 'student' ? true : false, // Students auto-approved, tutors need admin approval
      ...(role === 'tutor' && {
        subjects: subjects || [],
        hourlyRate: hourlyRate || 0,
        qualifications: qualifications || [],
        experience: experience || '',
        rating: 0,
        totalSessions: 0,
        totalEarnings: 0,
        discountOffered: 0,
      }),
      ...(role === 'student' && {
        enrolledSubjects: [],
        currentGrade: '',
      }),
    }

    await kv.set(`profile:${userId}`, profile)

    // If tutor, create pending approval request
    if (role === 'tutor') {
      await kv.set(`pending_approval:${userId}`, {
        userId,
        type: 'tutor_signup',
        profile,
        createdAt: new Date().toISOString(),
        status: 'pending'
      })
    }

    return c.json({ 
      message: 'User created successfully', 
      userId,
      needsApproval: role === 'tutor'
    })
  } catch (error) {
    console.log(`Error in signup route: ${error}`)
    return c.json({ error: 'Signup failed' }, 500)
  }
})

app.post('/make-server-824d015e/auth/sync-profile', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json().catch(() => ({}))
    const requestedRole = body?.role === 'tutor' ? 'tutor' : 'student'

    const existingProfile = await kv.get(`profile:${user.id}`)
    if (existingProfile) {
      return c.json({ profile: existingProfile, created: false })
    }

    const derivedName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'User'

    const profile = {
      id: user.id,
      email: user.email,
      name: derivedName,
      role: requestedRole,
      phone: '',
      bio: '',
      createdAt: new Date().toISOString(),
      approved: requestedRole === 'student',
      ...(requestedRole === 'tutor' && {
        subjects: [],
        hourlyRate: 0,
        qualifications: [],
        experience: '',
        rating: 0,
        totalSessions: 0,
        totalEarnings: 0,
        discountOffered: 0,
      }),
      ...(requestedRole === 'student' && {
        enrolledSubjects: [],
        currentGrade: '',
      }),
    }

    await kv.set(`profile:${user.id}`, profile)

    if (requestedRole === 'tutor') {
      await kv.set(`pending_approval:${user.id}`, {
        userId: user.id,
        type: 'tutor_signup',
        profile,
        createdAt: new Date().toISOString(),
        status: 'pending',
      })
    }

    return c.json({ profile, created: true })
  } catch (error) {
    console.log(`Error syncing OAuth profile: ${error}`)
    return c.json({ error: 'Failed to sync profile' }, 500)
  }
})

// ============= PROFILE ROUTES =============

app.get('/make-server-824d015e/profile', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`profile:${user.id}`)
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    return c.json({ profile })
  } catch (error) {
    console.log(`Error fetching profile: ${error}`)
    return c.json({ error: 'Failed to fetch profile' }, 500)
  }
})

app.put('/make-server-824d015e/profile', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const updates = await c.req.json()
    const existingProfile = await kv.get(`profile:${user.id}`)
    
    if (!existingProfile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    const updatedProfile = { ...existingProfile, ...updates }
    await kv.set(`profile:${user.id}`, updatedProfile)

    return c.json({ profile: updatedProfile })
  } catch (error) {
    console.log(`Error updating profile: ${error}`)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

app.put('/make-server-824d015e/profile/language', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { language } = await c.req.json()
    if (!language) {
      return c.json({ error: 'Language is required' }, 400)
    }

    const profile = await kv.get(`profile:${user.id}`)
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    profile.preferredLanguage = String(language).toLowerCase()
    await kv.set(`profile:${user.id}`, profile)

    return c.json({ profile })
  } catch (error) {
    console.log(`Error updating language: ${error}`)
    return c.json({ error: 'Failed to update language' }, 500)
  }
})

// ============= TUTOR ROUTES =============

app.get('/make-server-824d015e/tutors', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    const studentProfile = user ? await kv.get(`profile:${user.id}`) : null
    
    const subject = c.req.query('subject')
    const minRating = c.req.query('minRating')
    
    const allProfiles = await kv.getByPrefix('profile:')
    const tutors = allProfiles
      .filter((p: any) => p.role === 'tutor' && p.approved === true)
      .filter((t: any) => {
        if (subject && !t.subjects.includes(subject)) return false
        if (minRating && t.rating < parseFloat(minRating)) return false
        return true
      })
      .map((tutor: any) => {
        const matchScore = calculateMatchingScore(studentProfile, tutor, subject || undefined)
        const suggestedCommissionRate = getCommissionRateFromMatchScore(matchScore)
        return {
          ...tutor,
          matchScore,
          suggestedCommissionRate,
        }
      })
      .sort((a: any, b: any) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
        return (b.rating || 0) - (a.rating || 0)
      })

    return c.json({ tutors })
  } catch (error) {
    console.log(`Error fetching tutors: ${error}`)
    return c.json({ error: 'Failed to fetch tutors' }, 500)
  }
})

app.get('/make-server-824d015e/tutor/:id', async (c) => {
  try {
    const tutorId = c.req.param('id')
    const profile = await kv.get(`profile:${tutorId}`)
    
    if (!profile || profile.role !== 'tutor') {
      return c.json({ error: 'Tutor not found' }, 404)
    }

    return c.json({ tutor: profile })
  } catch (error) {
    console.log(`Error fetching tutor: ${error}`)
    return c.json({ error: 'Failed to fetch tutor' }, 500)
  }
})

// ============= APPLICATION ROUTES =============

app.post('/make-server-824d015e/applications', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { tutorId, subject, message, sessionType } = body
    const studentProfile = await kv.get(`profile:${user.id}`)
    const tutorProfile = await kv.get(`profile:${tutorId}`)
    if (!tutorProfile || tutorProfile.role !== 'tutor') {
      return c.json({ error: 'Tutor not found' }, 404)
    }

    if (!tutorProfile || tutorProfile.role !== 'tutor') {
      return c.json({ error: 'Tutor not found' }, 404)
    }

    const matchScore = calculateMatchingScore(studentProfile, tutorProfile, subject)
    const commissionRate = getCommissionRateFromMatchScore(matchScore)

    const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const application = {
      id: applicationId,
      studentId: user.id,
      tutorId,
      subject,
      message,
      sessionType, // 'online' or 'in-person'
      status: 'pending', // pending, accepted, declined
      matchScore,
      commissionRate,
      createdAt: new Date().toISOString(),
    }

    await kv.set(`application:${applicationId}`, application)
    
    // Add to tutor's applications list
    const tutorApps = await kv.get(`tutor_applications:${tutorId}`) || []
    tutorApps.push(applicationId)
    await kv.set(`tutor_applications:${tutorId}`, tutorApps)

    return c.json({ application })
  } catch (error) {
    console.log(`Error creating application: ${error}`)
    return c.json({ error: 'Failed to create application' }, 500)
  }
})

app.get('/make-server-824d015e/applications', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`profile:${user.id}`)
    const allApplications = await kv.getByPrefix('application:')

    let applications = []
    if (profile.role === 'student') {
      applications = allApplications.filter((app: any) => app.studentId === user.id)
    } else if (profile.role === 'tutor') {
      applications = allApplications.filter((app: any) => app.tutorId === user.id)
    } else if (profile.role === 'admin') {
      applications = allApplications
    }

    return c.json({ applications })
  } catch (error) {
    console.log(`Error fetching applications: ${error}`)
    return c.json({ error: 'Failed to fetch applications' }, 500)
  }
})

app.put('/make-server-824d015e/applications/:id', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const applicationId = c.req.param('id')
    const { status } = await c.req.json()

    const application = await kv.get(`application:${applicationId}`)
    if (!application) {
      return c.json({ error: 'Application not found' }, 404)
    }

    application.status = status
    application.updatedAt = new Date().toISOString()
    await kv.set(`application:${applicationId}`, application)

    // If accepted, create a session
    if (status === 'accepted') {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const session = {
        id: sessionId,
        studentId: application.studentId,
        tutorId: application.tutorId,
        subject: application.subject,
        status: 'active',
        createdAt: new Date().toISOString(),
        activities: [],
      }
      await kv.set(`session:${sessionId}`, session)

      // Update tutor stats
      const tutorProfile = await kv.get(`profile:${application.tutorId}`)
      tutorProfile.totalSessions = (tutorProfile.totalSessions || 0) + 1
      await kv.set(`profile:${application.tutorId}`, tutorProfile)
    }

    return c.json({ application })
  } catch (error) {
    console.log(`Error updating application: ${error}`)
    return c.json({ error: 'Failed to update application' }, 500)
  }
})

// ============= SESSION/CLASSROOM ROUTES =============

app.get('/make-server-824d015e/sessions', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`profile:${user.id}`)
    const allSessions = await kv.getByPrefix('session:')

    let sessions = []
    if (profile.role === 'student') {
      sessions = allSessions.filter((s: any) => s.studentId === user.id)
    } else if (profile.role === 'tutor') {
      sessions = allSessions.filter((s: any) => s.tutorId === user.id)
    }

    return c.json({ sessions })
  } catch (error) {
    console.log(`Error fetching sessions: ${error}`)
    return c.json({ error: 'Failed to fetch sessions' }, 500)
  }
})

app.get('/make-server-824d015e/sessions/:id', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`profile:${user.id}`)
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    const sessionId = c.req.param('id')
    const session = await kv.get(`session:${sessionId}`)

    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    if (profile.role === 'student' && session.studentId !== user.id) {
      return c.json({ error: 'Forbidden - You can only access your own sessions' }, 403)
    }

    if (profile.role === 'tutor' && session.tutorId !== user.id) {
      return c.json({ error: 'Forbidden - You can only access your own sessions' }, 403)
    }

    return c.json({ session })
  } catch (error) {
    console.log(`Error fetching session: ${error}`)
    return c.json({ error: 'Failed to fetch session' }, 500)
  }
})

// ============= ACTIVITY ROUTES (like Google Classroom) =============

app.post('/make-server-824d015e/activities', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { sessionId, title, description, type, fileUrl, dueDate } = body

    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const activity = {
      id: activityId,
      sessionId,
      authorId: user.id,
      title,
      description,
      type, // 'assignment', 'material', 'submission'
      fileUrl,
      dueDate,
      createdAt: new Date().toISOString(),
      submissions: [],
    }

    await kv.set(`activity:${activityId}`, activity)

    // Add to session's activities
    const session = await kv.get(`session:${sessionId}`)
    session.activities.push(activityId)
    await kv.set(`session:${sessionId}`, session)

    return c.json({ activity })
  } catch (error) {
    console.log(`Error creating activity: ${error}`)
    return c.json({ error: 'Failed to create activity' }, 500)
  }
})

app.get('/make-server-824d015e/activities/:sessionId', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const sessionId = c.req.param('sessionId')
    const session = await kv.get(`session:${sessionId}`)

    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    const activities = []
    for (const actId of session.activities || []) {
      const activity = await kv.get(`activity:${actId}`)
      if (activity) activities.push(activity)
    }

    return c.json({ activities })
  } catch (error) {
    console.log(`Error fetching activities: ${error}`)
    return c.json({ error: 'Failed to fetch activities' }, 500)
  }
})

app.post('/make-server-824d015e/activities/:id/submit', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const activityId = c.req.param('id')
    const { fileUrl, notes } = await c.req.json()

    const activity = await kv.get(`activity:${activityId}`)
    if (!activity) {
      return c.json({ error: 'Activity not found' }, 404)
    }

    const submission = {
      studentId: user.id,
      fileUrl,
      notes,
      aiDetection: estimateAIDetection(notes || '', fileUrl),
      submittedAt: new Date().toISOString(),
      grade: null,
      feedback: null,
    }

    activity.submissions.push(submission)
    await kv.set(`activity:${activityId}`, activity)

    return c.json({ submission })
  } catch (error) {
    console.log(`Error submitting activity: ${error}`)
    return c.json({ error: 'Failed to submit activity' }, 500)
  }
})

// ============= CERTIFICATE & DOCUMENT UPLOAD ROUTES =============

app.post('/make-server-824d015e/upload-certificate', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { subject, certificateData, certificateType, extractedText, declaredName } = body

    const profile = await kv.get(`profile:${user.id}`)
    const credentialCheck = evaluateCredentialConsistency({
      subject,
      certificateType,
      extractedText,
      declaredName: declaredName || profile?.name,
    })

    const certId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const certificate = {
      id: certId,
      userId: user.id,
      subject,
      certificateData, // Base64 or file URL
      certificateType, // 'enrollment', 'completion', 'training'
      uploadedAt: new Date().toISOString(),
      verified: credentialCheck.status === 'likely_match',
      credentialCheck,
    }

    await kv.set(`certificate:${certId}`, certificate)

    // Update user profile
    const refreshedProfile = await kv.get(`profile:${user.id}`)
    if (!refreshedProfile.certificates) refreshedProfile.certificates = []
    refreshedProfile.certificates.push(certId)
    await kv.set(`profile:${user.id}`, refreshedProfile)

    return c.json({ certificate })
  } catch (error) {
    console.log(`Error uploading certificate: ${error}`)
    return c.json({ error: 'Failed to upload certificate' }, 500)
  }
})

app.post('/make-server-824d015e/upload-grade', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { subject, grade, gradeData, extractedText, declaredName } = body

    const profile = await kv.get(`profile:${user.id}`)
    const credentialCheck = evaluateCredentialConsistency({
      subject,
      grade,
      extractedText,
      declaredName: declaredName || profile?.name,
    })

    const gradeId = `grade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const gradeRecord = {
      id: gradeId,
      userId: user.id,
      subject,
      grade,
      gradeData, // Base64 or file URL
      credentialCheck,
      uploadedAt: new Date().toISOString(),
    }

    await kv.set(`grade:${gradeId}`, gradeRecord)

    // Update user profile
    const refreshedProfile = await kv.get(`profile:${user.id}`)
    if (!refreshedProfile.grades) refreshedProfile.grades = []
    refreshedProfile.grades.push(gradeId)
    await kv.set(`profile:${user.id}`, refreshedProfile)

    // Suggest tutors based on low grade
    if (parseFloat(grade) < 75) {
      const tutors = await kv.getByPrefix('profile:')
      const suggestedTutors = tutors
        .filter((t: any) => t.role === 'tutor' && t.subjects.includes(subject) && t.approved)
        .sort((a: any, b: any) => b.rating - a.rating)
        .slice(0, 3)

      return c.json({ gradeRecord, suggestedTutors })
    }

    return c.json({ gradeRecord })
  } catch (error) {
    console.log(`Error uploading grade: ${error}`)
    return c.json({ error: 'Failed to upload grade' }, 500)
  }
})

// ============= MESSAGE ROUTES =============

app.get('/make-server-824d015e/messages/:otherUserId', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const otherUserId = c.req.param('otherUserId')
    const conversationKey = [user.id, otherUserId].sort().join('_')
    
    const messages = await kv.get(`messages:${conversationKey}`) || []

    return c.json({ messages })
  } catch (error) {
    console.log(`Error fetching messages: ${error}`)
    return c.json({ error: 'Failed to fetch messages' }, 500)
  }
})

app.post('/make-server-824d015e/messages', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { recipientId, content } = await c.req.json()
    const conversationKey = [user.id, recipientId].sort().join('_')
    
    const messages = await kv.get(`messages:${conversationKey}`) || []
    const newMessage = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      recipientId,
      content,
      timestamp: new Date().toISOString(),
      read: false,
    }

    messages.push(newMessage)
    await kv.set(`messages:${conversationKey}`, messages)

    return c.json({ message: newMessage })
  } catch (error) {
    console.log(`Error sending message: ${error}`)
    return c.json({ error: 'Failed to send message' }, 500)
  }
})

app.get('/make-server-824d015e/conversations', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const allMessages = await kv.getByPrefix('messages:')
    const conversations = new Map()

    for (const messageArray of allMessages) {
      if (!Array.isArray(messageArray) || messageArray.length === 0) continue
      
      const lastMessage = messageArray[messageArray.length - 1]
      const otherUserId = lastMessage.senderId === user.id ? lastMessage.recipientId : lastMessage.senderId
      
      if (lastMessage.senderId === user.id || lastMessage.recipientId === user.id) {
        if (!conversations.has(otherUserId)) {
          const otherProfile = await kv.get(`profile:${otherUserId}`)
          conversations.set(otherUserId, {
            userId: otherUserId,
            userName: otherProfile?.name || 'Unknown',
            lastMessage: lastMessage.content,
            timestamp: lastMessage.timestamp,
            unread: !lastMessage.read && lastMessage.recipientId === user.id
          })
        }
      }
    }

    return c.json({ conversations: Array.from(conversations.values()) })
  } catch (error) {
    console.log(`Error fetching conversations: ${error}`)
    return c.json({ error: 'Failed to fetch conversations' }, 500)
  }
})

// ============= PAYMENT ROUTES =============

app.post('/make-server-824d015e/payments', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { tutorId, sessionId, amount, paymentMethod } = body

    const studentProfile = await kv.get(`profile:${user.id}`)
    const tutorProfile = await kv.get(`profile:${tutorId}`)
    const session = sessionId ? await kv.get(`session:${sessionId}`) : null
    const subject = session?.subject

    let matchScore = calculateMatchingScore(studentProfile, tutorProfile, subject)
    let commissionRate = getCommissionRateFromMatchScore(matchScore)

    // Prefer accepted application-level score when available.
    const allApplications = await kv.getByPrefix('application:')
    const acceptedApplication = allApplications
      .filter((app: any) => app.studentId === user.id && app.tutorId === tutorId && app.status === 'accepted')
      .sort((a: any, b: any) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
        return bTime - aTime
      })[0]

    if (acceptedApplication?.matchScore) {
      matchScore = Number(acceptedApplication.matchScore)
      commissionRate = Number(acceptedApplication.commissionRate || getCommissionRateFromMatchScore(matchScore))
    }

    const commission = Number((amount * commissionRate).toFixed(2))
    const tutorNetAmount = Number((amount - commission).toFixed(2))

    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const payment = {
      id: paymentId,
      studentId: user.id,
      tutorId,
      sessionId,
      amount,
      paymentMethod,
      status: 'completed',
      matchScore,
      commissionRate,
      commission,
      tutorNetAmount,
      createdAt: new Date().toISOString(),
    }

    await kv.set(`payment:${paymentId}`, payment)

    // Update tutor earnings
    tutorProfile.totalEarnings = (tutorProfile.totalEarnings || 0) + tutorNetAmount
    await kv.set(`profile:${tutorId}`, tutorProfile)

    return c.json({ payment })
  } catch (error) {
    console.log(`Error processing payment: ${error}`)
    return c.json({ error: 'Failed to process payment' }, 500)
  }
})

// ============= RATING ROUTES =============

app.post('/make-server-824d015e/ratings', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { tutorId, sessionId, rating, review } = body

    const ratingId = `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const ratingRecord = {
      id: ratingId,
      studentId: user.id,
      tutorId,
      sessionId,
      rating, // 1-5
      review,
      createdAt: new Date().toISOString(),
    }

    await kv.set(`rating:${ratingId}`, ratingRecord)

    // Update tutor's average rating
    const allRatings = await kv.getByPrefix('rating:')
    const tutorRatings = allRatings.filter((r: any) => r.tutorId === tutorId)
    const avgRating = tutorRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / tutorRatings.length

    const tutorProfile = await kv.get(`profile:${tutorId}`)
    tutorProfile.rating = avgRating
    tutorProfile.totalReviews = tutorRatings.length
    await kv.set(`profile:${tutorId}`, tutorProfile)

    return c.json({ rating: ratingRecord })
  } catch (error) {
    console.log(`Error submitting rating: ${error}`)
    return c.json({ error: 'Failed to submit rating' }, 500)
  }
})

// ============= LEARNING PATH ROUTES =============

app.post('/make-server-824d015e/learning-paths', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const { title, objective, moduleTitles = [] } = body

    const pathId = `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const modules = moduleTitles.map((name: string, index: number) => ({
      id: `module_${index + 1}`,
      title: name,
      completed: false,
      score: null,
      completedAt: null,
    }))

    const path = {
      id: pathId,
      studentId: user.id,
      title,
      objective,
      modules,
      progressPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await kv.set(`learning_path:${pathId}`, path)
    return c.json({ learningPath: path })
  } catch (error) {
    console.log(`Error creating learning path: ${error}`)
    return c.json({ error: 'Failed to create learning path' }, 500)
  }
})

app.get('/make-server-824d015e/learning-paths', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const allPaths = await kv.getByPrefix('learning_path:')
    const learningPaths = allPaths.filter((p: any) => p.studentId === user.id)
    return c.json({ learningPaths })
  } catch (error) {
    console.log(`Error fetching learning paths: ${error}`)
    return c.json({ error: 'Failed to fetch learning paths' }, 500)
  }
})

app.put('/make-server-824d015e/learning-paths/:id/progress', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const pathId = c.req.param('id')
    const { moduleId, completed, score } = await c.req.json()
    const path = await kv.get(`learning_path:${pathId}`)

    if (!path || path.studentId !== user.id) {
      return c.json({ error: 'Learning path not found' }, 404)
    }

    path.modules = (path.modules || []).map((m: any) =>
      m.id === moduleId
        ? {
            ...m,
            completed: !!completed,
            score: score ?? m.score,
            completedAt: completed ? new Date().toISOString() : null,
          }
        : m,
    )

    const completedCount = path.modules.filter((m: any) => m.completed).length
    path.progressPercent = path.modules.length > 0 ? Math.round((completedCount / path.modules.length) * 100) : 0
    path.updatedAt = new Date().toISOString()

    await kv.set(`learning_path:${pathId}`, path)

    const gamificationKey = `gamification:${user.id}`
    const game = (await kv.get(gamificationKey)) || { xp: 0, badges: [], level: 1, updatedAt: null }
    if (completed) {
      game.xp += 50
      game.level = getLevelFromXp(game.xp)
      if (path.progressPercent === 100 && !game.badges.includes('Path Finisher')) {
        game.badges.push('Path Finisher')
      }
      game.updatedAt = new Date().toISOString()
      await kv.set(gamificationKey, game)
    }

    return c.json({ learningPath: path, gamification: game })
  } catch (error) {
    console.log(`Error updating learning path progress: ${error}`)
    return c.json({ error: 'Failed to update progress' }, 500)
  }
})

app.get('/make-server-824d015e/learning-paths/:id/analytics', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const pathId = c.req.param('id')
    const path = await kv.get(`learning_path:${pathId}`)
    if (!path || path.studentId !== user.id) {
      return c.json({ error: 'Learning path not found' }, 404)
    }

    const modules = path.modules || []
    const completedModules = modules.filter((m: any) => m.completed)
    const averageScore = completedModules.length > 0
      ? completedModules.reduce((sum: number, m: any) => sum + Number(m.score || 0), 0) / completedModules.length
      : 0

    return c.json({
      analytics: {
        pathId,
        title: path.title,
        progressPercent: path.progressPercent || 0,
        modulesTotal: modules.length,
        modulesCompleted: completedModules.length,
        averageScore: Number(averageScore.toFixed(2)),
        lastUpdatedAt: path.updatedAt,
      },
    })
  } catch (error) {
    console.log(`Error fetching learning path analytics: ${error}`)
    return c.json({ error: 'Failed to fetch analytics' }, 500)
  }
})

// ============= INTERACTIVE ASSESSMENT ROUTES =============

app.post('/make-server-824d015e/assessments', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const { sessionId, title, questions = [] } = body

    const assessmentId = `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const assessment = {
      id: assessmentId,
      sessionId,
      title,
      createdBy: user.id,
      questions,
      createdAt: new Date().toISOString(),
    }

    await kv.set(`assessment:${assessmentId}`, assessment)
    return c.json({ assessment })
  } catch (error) {
    console.log(`Error creating assessment: ${error}`)
    return c.json({ error: 'Failed to create assessment' }, 500)
  }
})

app.get('/make-server-824d015e/assessments/:sessionId', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const sessionId = c.req.param('sessionId')
    const assessments = (await kv.getByPrefix('assessment:')).filter((a: any) => a.sessionId === sessionId)
    return c.json({ assessments })
  } catch (error) {
    console.log(`Error fetching assessments: ${error}`)
    return c.json({ error: 'Failed to fetch assessments' }, 500)
  }
})

app.post('/make-server-824d015e/assessments/:id/submit', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const assessmentId = c.req.param('id')
    const { answers = [] } = await c.req.json()
    const assessment = await kv.get(`assessment:${assessmentId}`)

    if (!assessment) {
      return c.json({ error: 'Assessment not found' }, 404)
    }

    const questions = assessment.questions || []
    let correct = 0
    for (const q of questions) {
      const selected = answers.find((a: any) => a.questionId === q.id)?.answer
      if (selected !== undefined && selected === q.correctAnswer) {
        correct += 1
      }
    }

    const scorePercent = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
    const submissionId = `assessment_submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const submission = {
      id: submissionId,
      assessmentId,
      studentId: user.id,
      answers,
      scorePercent,
      submittedAt: new Date().toISOString(),
    }

    await kv.set(`assessment_submission:${submissionId}`, submission)

    const gamificationKey = `gamification:${user.id}`
    const game = (await kv.get(gamificationKey)) || { xp: 0, badges: [], level: 1, updatedAt: null }
    game.xp += scorePercent >= 80 ? 80 : 40
    game.level = getLevelFromXp(game.xp)
    if (scorePercent >= 90 && !game.badges.includes('Assessment Ace')) {
      game.badges.push('Assessment Ace')
    }
    game.updatedAt = new Date().toISOString()
    await kv.set(gamificationKey, game)

    return c.json({ submission, gamification: game })
  } catch (error) {
    console.log(`Error submitting assessment: ${error}`)
    return c.json({ error: 'Failed to submit assessment' }, 500)
  }
})

// ============= GAMIFICATION ROUTES =============

app.get('/make-server-824d015e/gamification/profile', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const game = (await kv.get(`gamification:${user.id}`)) || {
      xp: 0,
      level: 1,
      badges: [],
      updatedAt: null,
    }
    return c.json({ gamification: game })
  } catch (error) {
    console.log(`Error fetching gamification profile: ${error}`)
    return c.json({ error: 'Failed to fetch gamification profile' }, 500)
  }
})

// ============= REAL-TIME SCHEDULING ROUTES =============

app.post('/make-server-824d015e/scheduling/availability', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { slots = [] } = await c.req.json()
    const availability = {
      tutorId: user.id,
      slots,
      updatedAt: new Date().toISOString(),
    }

    await kv.set(`availability:${user.id}`, availability)
    return c.json({ availability })
  } catch (error) {
    console.log(`Error updating availability: ${error}`)
    return c.json({ error: 'Failed to update availability' }, 500)
  }
})

app.get('/make-server-824d015e/scheduling/availability/:tutorId', async (c) => {
  try {
    const tutorId = c.req.param('tutorId')
    const availability = await kv.get(`availability:${tutorId}`)
    return c.json({ availability: availability || { tutorId, slots: [] } })
  } catch (error) {
    console.log(`Error fetching availability: ${error}`)
    return c.json({ error: 'Failed to fetch availability' }, 500)
  }
})

app.post('/make-server-824d015e/scheduling/bookings', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { tutorId, slot, subject } = await c.req.json()
    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const booking = {
      id: bookingId,
      studentId: user.id,
      tutorId,
      slot,
      subject,
      status: 'requested',
      createdAt: new Date().toISOString(),
    }

    await kv.set(`booking:${bookingId}`, booking)
    return c.json({ booking })
  } catch (error) {
    console.log(`Error creating booking: ${error}`)
    return c.json({ error: 'Failed to create booking' }, 500)
  }
})

app.get('/make-server-824d015e/scheduling/bookings', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const profile = await kv.get(`profile:${user.id}`)
    const allBookings = await kv.getByPrefix('booking:')
    const bookings = allBookings.filter((b: any) => {
      if (profile?.role === 'tutor') return b.tutorId === user.id
      if (profile?.role === 'admin') return true
      return b.studentId === user.id
    })

    return c.json({ bookings })
  } catch (error) {
    console.log(`Error fetching bookings: ${error}`)
    return c.json({ error: 'Failed to fetch bookings' }, 500)
  }
})

// ============= MULTI-LANGUAGE ROUTES =============

app.get('/make-server-824d015e/i18n/messages', async (c) => {
  try {
    const lang = String(c.req.query('lang') || 'en').toLowerCase()
    return c.json({ lang, messages: getLocalizedMessages(lang) })
  } catch (error) {
    console.log(`Error fetching localized messages: ${error}`)
    return c.json({ error: 'Failed to fetch localized messages' }, 500)
  }
})

// ============= ADMIN ROUTES =============

app.get('/make-server-824d015e/admin/pending-approvals', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`profile:${user.id}`)
    if (profile.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403)
    }

    const pendingApprovals = await kv.getByPrefix('pending_approval:')
    const filteredApprovals = pendingApprovals.filter((a: any) => a.status === 'pending')

    return c.json({ approvals: filteredApprovals })
  } catch (error) {
    console.log(`Error fetching pending approvals: ${error}`)
    return c.json({ error: 'Failed to fetch approvals' }, 500)
  }
})

app.put('/make-server-824d015e/admin/approve/:userId', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`profile:${user.id}`)
    if (profile.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403)
    }

    const targetUserId = c.req.param('userId')
    const { approved } = await c.req.json()

    const targetProfile = await kv.get(`profile:${targetUserId}`)
    targetProfile.approved = approved
    await kv.set(`profile:${targetUserId}`, targetProfile)

    // Update approval status
    const approval = await kv.get(`pending_approval:${targetUserId}`)
    if (approval) {
      approval.status = approved ? 'approved' : 'rejected'
      approval.approvedBy = user.id
      approval.approvedAt = new Date().toISOString()
      await kv.set(`pending_approval:${targetUserId}`, approval)
    }

    return c.json({ success: true })
  } catch (error) {
    console.log(`Error approving user: ${error}`)
    return c.json({ error: 'Failed to approve user' }, 500)
  }
})

app.get('/make-server-824d015e/admin/dashboard', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`profile:${user.id}`)
    if (profile.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403)
    }

    // Get statistics
    const allProfiles = await kv.getByPrefix('profile:')
    const allPayments = await kv.getByPrefix('payment:')
    const allSessions = await kv.getByPrefix('session:')
    const allRatings = await kv.getByPrefix('rating:')

    const students = allProfiles.filter((p: any) => p.role === 'student')
    const tutors = allProfiles.filter((p: any) => p.role === 'tutor' && p.approved)
    const pendingTutors = allProfiles.filter((p: any) => p.role === 'tutor' && !p.approved)

    const totalCommission = allPayments.reduce((sum: number, p: any) => sum + (p.commission || 0), 0)
    const totalRevenue = allPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    const totalCommissionRate = allPayments.reduce((sum: number, p: any) => sum + (p.commissionRate || 0), 0)
    const averageCommissionRate = allPayments.length > 0 ? totalCommissionRate / allPayments.length : 0

    const commissionByBand = {
      high: { count: 0, commissionTotal: 0, minScore: 80, maxScore: 100 },
      medium: { count: 0, commissionTotal: 0, minScore: 60, maxScore: 79 },
      low: { count: 0, commissionTotal: 0, minScore: 0, maxScore: 59 },
    }

    for (const payment of allPayments) {
      const score = Number(payment?.matchScore ?? 0)
      const commission = Number(payment?.commission ?? 0)
      if (score >= 80) {
        commissionByBand.high.count += 1
        commissionByBand.high.commissionTotal += commission
      } else if (score >= 60) {
        commissionByBand.medium.count += 1
        commissionByBand.medium.commissionTotal += commission
      } else {
        commissionByBand.low.count += 1
        commissionByBand.low.commissionTotal += commission
      }
    }

    // Top tutors
    const topRatedTutors = tutors
      .filter((t: any) => t.rating > 0)
      .sort((a: any, b: any) => b.rating - a.rating)
      .slice(0, 5)

    const topPerformingTutors = tutors
      .sort((a: any, b: any) => b.totalSessions - a.totalSessions)
      .slice(0, 5)

    return c.json({
      stats: {
        totalStudents: students.length,
        totalTutors: tutors.length,
        pendingApprovals: pendingTutors.length,
        totalSessions: allSessions.length,
        totalCommission,
        totalRevenue,
        averageCommissionRate,
        commissionByBand,
      },
      topRatedTutors,
      topPerformingTutors,
    })
  } catch (error) {
    console.log(`Error fetching admin dashboard: ${error}`)
    return c.json({ error: 'Failed to fetch dashboard data' }, 500)
  }
})

app.get('/make-server-824d015e/admin/credentials/:userId', async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw)
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`profile:${user.id}`)
    if (profile.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403)
    }

    const targetUserId = c.req.param('userId')
    const targetProfile = await kv.get(`profile:${targetUserId}`)

    const certificates = []
    if (targetProfile.certificates) {
      for (const certId of targetProfile.certificates) {
        const cert = await kv.get(`certificate:${certId}`)
        if (cert) certificates.push(cert)
      }
    }

    return c.json({ profile: targetProfile, certificates })
  } catch (error) {
    console.log(`Error fetching credentials: ${error}`)
    return c.json({ error: 'Failed to fetch credentials' }, 500)
  }
})

// ============= DASHBOARD/STATS ROUTES =============

app.get('/make-server-824d015e/top-tutors', async (c) => {
  try {
    const allProfiles = await kv.getByPrefix('profile:')
    const tutors = allProfiles.filter((p: any) => p.role === 'tutor' && p.approved)

    const topRated = tutors
      .filter((t: any) => t.rating > 0)
      .sort((a: any, b: any) => b.rating - a.rating)
      .slice(0, 10)

    const topPerforming = tutors
      .sort((a: any, b: any) => b.totalSessions - a.totalSessions)
      .slice(0, 10)

    const withDiscounts = tutors
      .filter((t: any) => t.discountOffered > 0)
      .sort((a: any, b: any) => b.discountOffered - a.discountOffered)

    return c.json({ topRated, topPerforming, withDiscounts })
  } catch (error) {
    console.log(`Error fetching top tutors: ${error}`)
    return c.json({ error: 'Failed to fetch top tutors' }, 500)
  }
})

Deno.serve(app.fetch)
