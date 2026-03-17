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

// ============= TUTOR ROUTES =============

app.get('/make-server-824d015e/tutors', async (c) => {
  try {
    const { user } = await getUserFromToken(c.req.raw)
    
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
      .sort((a: any, b: any) => b.rating - a.rating)

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

    const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const application = {
      id: applicationId,
      studentId: user.id,
      tutorId,
      subject,
      message,
      sessionType, // 'online' or 'in-person'
      status: 'pending', // pending, accepted, declined
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

    const sessionId = c.req.param('id')
    const session = await kv.get(`session:${sessionId}`)

    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
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
    const { subject, certificateData, certificateType } = body

    const certId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const certificate = {
      id: certId,
      userId: user.id,
      subject,
      certificateData, // Base64 or file URL
      certificateType, // 'enrollment', 'completion', 'training'
      uploadedAt: new Date().toISOString(),
      verified: false,
    }

    await kv.set(`certificate:${certId}`, certificate)

    // Update user profile
    const profile = await kv.get(`profile:${user.id}`)
    if (!profile.certificates) profile.certificates = []
    profile.certificates.push(certId)
    await kv.set(`profile:${user.id}`, profile)

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
    const { subject, grade, gradeData } = body

    const gradeId = `grade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const gradeRecord = {
      id: gradeId,
      userId: user.id,
      subject,
      grade,
      gradeData, // Base64 or file URL
      uploadedAt: new Date().toISOString(),
    }

    await kv.set(`grade:${gradeId}`, gradeRecord)

    // Update user profile
    const profile = await kv.get(`profile:${user.id}`)
    if (!profile.grades) profile.grades = []
    profile.grades.push(gradeId)
    await kv.set(`profile:${user.id}`, profile)

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

    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const payment = {
      id: paymentId,
      studentId: user.id,
      tutorId,
      sessionId,
      amount,
      paymentMethod,
      status: 'completed',
      commission: amount * 0.15, // 15% commission
      createdAt: new Date().toISOString(),
    }

    await kv.set(`payment:${paymentId}`, payment)

    // Update tutor earnings
    const tutorProfile = await kv.get(`profile:${tutorId}`)
    tutorProfile.totalEarnings = (tutorProfile.totalEarnings || 0) + (amount * 0.85)
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
