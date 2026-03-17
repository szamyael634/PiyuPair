# PiyuPair - User Guide

## Overview
A comprehensive tutoring marketplace platform with role-based access for Students, Tutors, and Administrators.

## Features Implemented

### Student Features
- ✅ Browse and search for qualified tutors
- ✅ Upload enrollment certificates (system suggests tutors based on subject)
- ✅ Upload grades (system suggests tutors if grade < 75%)
- ✅ Submit activities/assignments to tutors
- ✅ Apply for tutoring sessions
- ✅ Pay tutors online (payment processing system)
- ✅ Message tutors
- ✅ Video call integration
- ✅ Google Classroom-like interface for activities

### Tutor Features
- ✅ Accept/decline student applications
- ✅ Manage multiple student sessions
- ✅ Google Classroom-like section (post activities, view submissions)
- ✅ Accept payments online
- ✅ Track earnings and session stats
- ✅ Message students
- ✅ Video call with students
- ✅ Set hourly rates and offer discounts
- ✅ Must be approved by admin before accepting students

### Admin Features
- ✅ Approve/reject tutor applications
- ✅ View submitted credentials and certificates
- ✅ Smart dashboard with analytics:
  - Total students, tutors, sessions
  - Total commission and revenue
  - Top-rated tutors
  - Top-performing tutors
- ✅ 15% commission on all transactions
- ✅ View all pending approvals

### Extra Features
- ✅ Students can apply as tutors (with credentials)
- ✅ Video call interface for remote tutoring
- ✅ Messaging system for tutor-student communication
- ✅ Dashboard shows top-rated and top-performing tutors
- ✅ Verified tutors can offer discounts (shown in dashboard)
- ✅ Smart tutor suggestions based on:
  - Uploaded certificates (by subject)
  - Uploaded grades (low grades trigger suggestions)
- ✅ Rating and review system

## User Roles

### 1. Student
- Auto-approved upon registration
- Can browse tutors, apply for sessions, upload documents
- Access to classroom and video calls once accepted by tutor

### 2. Tutor
- Requires admin approval before becoming active
- Can accept/decline student applications
- Manage classroom activities and sessions
- Track earnings (85% of payment, 15% commission to platform)

### 3. Admin
- Full access to platform analytics
- Approve/reject tutor applications
- View all user credentials
- Monitor platform performance

## Getting Started

### First-Time Setup
1. Visit the home page
2. Click "Sign Up"
3. Choose your role (Student or Tutor)
4. Fill in required information:
   - Students: Name, email, password, bio
   - Tutors: Above + subjects, qualifications, hourly rate, experience

### For Students
1. After login, access your dashboard
2. **Browse Tutors**: Search by subject, rating, or hourly rate
3. **Upload Certificates**: Get matched tutors for specific subjects
4. **Upload Grades**: Receive tutor suggestions if performance is low
5. **Apply to Tutors**: Send application with message
6. **Once Accepted**: Access classroom and video calls

### For Tutors
1. After signup, wait for admin approval
2. Once approved, access your dashboard
3. **Manage Applications**: Accept or decline student requests
4. **Create Activities**: Post assignments and materials in classroom
5. **Track Performance**: View earnings, ratings, and session count

### For Admins
1. Login with admin credentials
2. **Review Pending Approvals**: Approve or reject tutor applications
3. **View Credentials**: Check tutor qualifications and certificates
4. **Monitor Analytics**: Track platform growth and revenue

## Payment System
- Students pay tutors through the platform
- 15% commission goes to admin/platform
- 85% goes to tutor
- Tutors can track total earnings in dashboard

## Rating System
- Students can rate tutors after sessions
- Average rating displayed on tutor profiles
- Top-rated tutors featured in dashboard

## Communication
- **Messages**: Real-time messaging between students and tutors
- **Video Calls**: Built-in video calling for remote sessions
- **Classroom**: Activity posting and submission system

## Smart Matching
The system intelligently suggests tutors based on:
1. **Certificate Upload**: Matches tutors teaching that subject
2. **Grade Upload**: If grade < 75%, suggests top tutors in that subject
3. **Subject Preference**: Filter and search by specific subjects
4. **Rating**: Sort by highest-rated tutors
5. **Availability**: Shows active, approved tutors only

## Technical Stack
- **Frontend**: React, React Router, Tailwind CSS
- **Backend**: Supabase (Auth, Functions, Storage)
- **Database**: Supabase KV Store
- **Real-time**: Supabase Auth Sessions
- **File Storage**: Base64 encoding (can be upgraded to Supabase Storage)

## Security
- Role-based access control
- Protected routes (auth required)
- Admin-only endpoints
- Session-based authentication
- Email confirmation for new accounts

## Future Enhancements
Consider adding:
- Real WebRTC for video calls (Twilio, Agora)
- Stripe/PayPal payment integration
- Email notifications
- Calendar/scheduling system
- Advanced analytics with charts
- Mobile app version
- Live chat support
