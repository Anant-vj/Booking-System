# 🏛️ Hall Booking System

A full-stack web application built with **Next.js**, **Prisma**, and **PostgreSQL** for managing hall booking requests, approvals, and administrative control.

---

## 🚀 Overview

This system allows faculty members to request hall bookings and enables administrators to manage approvals, conflicts, and reports efficiently.

The platform is designed with **role-based access**, **security controls**, and a clean UI for both desktop and mobile users.

---

## 👥 User Roles

### 🔹 Faculty
- Submit booking requests  
- View booking status  
- View calendar of bookings  
- Receive notifications (approval / withdrawal)  
- Change password  

### 🔹 Admin
- Approve / Reject booking requests  
- Withdraw approval (undo action)  
- View booking conflicts before approval  
- Manage halls (add / edit / delete)  
- View reports (daily / weekly / monthly)  
- Monitor login throttling & security logs  

### 🔹 Super Admin
- Manage all admins and faculty *(future scalable)*  

---

## 🔐 Authentication & Security

- Secure login using hashed passwords (**bcrypt**)  
- Rate limiting on login attempts (Throttle system)  
- Session-based authentication using **NextAuth**  
- Optional password change feature  
- Passwords are **NEVER stored in plain text**  

---

## 🔁 Booking Workflow

1. Faculty submits booking request  
2. Admin reviews request  
3. System checks for conflicts  
4. Admin actions:  
   - Approves ✅  
   - Rejects ❌  
   - Withdraws approval 🔄  

---

## ⚠️ Conflict Detection

- Prevents overlapping bookings for the same hall  
- Admin sees conflict indicators before approving  
- Ensures no double booking  

---

## 🔔 Notification System

- Faculty receives notifications when:
  - Booking is approved  
  - Approval is withdrawn  
- Notifications appear in dashboard  
- Optional toast alerts for better UX  

---

## 🏢 Hall Management

Admin can:

- Add new halls  
- Edit hall details (name, capacity)  
- Delete halls *(only if no bookings exist)*  

---

## 📊 Reports System

Admin can generate:

- 📅 Daily report  
- 📆 Weekly report  
- 📈 Monthly report  
- 🧾 Full report export (print/download)  

### Reports include:
- Faculty name  
- Email  
- Hall name  
- Date & time  
- Status  
- Submission time  

---

## 📱 UI/UX Features

- Fully responsive (mobile / tablet / desktop)  
- Clean dashboard sections:
  - Bookings  
  - Calendar  
  - Reports  
  - Security  
- Pagination for large datasets  
- Improved visual hierarchy and spacing  
- College branding with logo support  

---

## 📅 Calendar Integration

- Faculty and Admin can view bookings in calendar format  
- Helps visualize availability  
- Prevents scheduling conflicts  

---

## 🔐 Login Throttling (Security)

- Limits repeated login attempts  
- Blocks suspicious activity  
- Tracks login attempts  
- Admin can view and manage throttled users  

---

## 🔧 Technical Stack

- **Frontend:** Next.js (App Router)  
- **Backend:** Next.js API Routes  
- **Database:** PostgreSQL (Neon)  
- **ORM:** Prisma  
- **Auth:** NextAuth  
- **Styling:** Tailwind CSS  

---

## 🗄️ Database Models

- User (Admin / Faculty / Super Admin)  
- Hall  
- Booking  
- LoginThrottle  
- LoginThrottleAudit  
- Notification  
- PasswordResetToken *(if implemented)*  

---

## 🔄 Pagination

- Faculty bookings limited per page (8 items)  
- Sorted from newest → oldest  
- Improves performance and usability  

---

## 🔑 Password Management

- Users can change password manually  
- Password reset handled securely (no password retrieval)  
- Developer can reset passwords via database if required  

---

## 🧠 System Design Principles

- Secure by default  
- No sensitive data exposure  
- Role-based access control  
- Reversible actions (withdraw approval)  
- Scalable architecture  

---

## 📦 Deployment

- Hosted on **Vercel**  
- Uses environment variables for secrets  
- Database hosted on **Neon PostgreSQL**  

---

## ⚠️ Important Notes

- Passwords are hashed and cannot be retrieved  
- Halls cannot be deleted if bookings exist  
- Booking conflicts must be resolved before approval  
- System logs important security events  

---

## 🎯 Future Enhancements

- Email-based password reset  
- Real-time notifications (WebSockets)  
- Admin user management panel  
- Export reports as PDF/Excel  
- Role-based fine-grained permissions  

---

## ✅ Conclusion

This system provides a **secure, scalable, and user-friendly** solution for managing hall bookings in a college environment, ensuring efficiency, transparency, and control.

---

### 💡 Built for reliability, usability, and real-world deployment.
