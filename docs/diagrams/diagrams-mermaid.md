# IMEP — UML Diagrams (Mermaid)

> **To preview:** Open this file in VS Code → press `Ctrl + Shift + V`
> No extensions or Java needed — VS Code renders Mermaid natively.

---

## 1. Use Case Diagram

```mermaid
graph LR
    S(("👤 Student"))
    IS(("👤 Industry\nSupervisor"))
    ISup(("👤 Institution\nSupervisor"))
    A(("👤 Admin"))
    SYS(("⚙️ System\nCron"))

    subgraph AUTH["🔐 Auth & Onboarding"]
        a1["Register Account"]
        a2["Login"]
        a3["Reset Password"]
        a4["Complete Onboarding"]
        a5["Manage Sessions"]
        a6["Update Profile"]
    end

    subgraph STU["📋 Student Features"]
        s1["View Dashboard"]
        s2["GPS Check-In"]
        s3["GPS Check-Out"]
        s4["Report Violation Reason"]
        s5["View Attendance History"]
        s6["Create Daily Log Entry"]
        s7["Upload Weekly Summary Image"]
        s8["View Logbook Weeks"]
        s9["View Grades"]
        s10["Nominate Supervisor"]
    end

    subgraph IND["🏭 Industry Supervisor Features"]
        i1["View Assigned Students"]
        i2["View Student Logbook"]
        i3["Submit Supervisor Grade"]
        i4["Comment on Logbook Week"]
        i5["View Student Attendance"]
    end

    subgraph INST["🏫 Institution Supervisor Features"]
        p1["View All Students"]
        p2["Assign Internship"]
        p3["View Grades Overview"]
        p4["View Leaderboard"]
        p5["Search Students & Supervisors"]
    end

    subgraph MSG["💬 Messaging & Notifications"]
        m1["Send Message"]
        m2["View Conversations"]
        m3["Receive Push Notification"]
        m4["View Notification History"]
        m5["Register FCM Token"]
    end

    subgraph ADM["🔧 Admin Features"]
        d1["View System Statistics"]
        d2["Manage Users"]
        d3["Deactivate / Activate User"]
        d4["Edit Attendance Records"]
        d5["Sync Logbook Weeks"]
        d6["Submit Grade on Behalf"]
    end

    subgraph JOB["🤖 Automated System Jobs"]
        j1["Lock Logbook Week\n— Every Sunday 5 PM"]
        j2["Calculate Grades Weekly\nAtt 0-20 + Logbook 0-30"]
        j3["Send Submission Reminder"]
        j4["Flag Missing Checkout"]
        j5["Alert Absence"]
    end

    S --> AUTH & STU & MSG
    IS --> AUTH & IND & MSG
    ISup --> AUTH & INST & MSG
    A --> ADM
    SYS --> JOB

    s2 -.->|"extend: if late\nor outside geofence"| s4
    s3 -.->|"extend: if\nearly departure"| s4
    s6 -.->|"extend: after\n5 days done"| s7
    j3 & j4 & j5 -.->|"include: fires"| m3
```

---

## 2a. Sequence Diagram — Registration, Onboarding & Login

```mermaid
sequenceDiagram
    actor User
    participant FE as React Frontend
    participant API as Express API /auth
    participant SVC as Auth Service
    participant DB as MongoDB
    participant TK as Token Service

    rect rgb(235, 245, 251)
        Note over User,TK: REGISTRATION
        User->>FE: Fill form (name, email, password, role)
        FE->>API: POST /api/auth/register
        API->>SVC: register(req, res)
        SVC->>DB: User.findOne({ email })
        DB-->>SVC: null — email available
        SVC->>SVC: bcrypt.hash(password, 12)
        SVC->>DB: User.create({...userData})
        DB-->>SVC: User document saved
        SVC->>TK: generateAccessToken(userId, role)
        SVC->>TK: generateRefreshToken(userId)
        TK-->>SVC: accessToken + refreshToken
        SVC->>DB: Session.create({ userId, refreshToken, device, ip })
        SVC-->>API: { user, accessToken }
        API-->>FE: 201 + Set-Cookie: refreshToken (httpOnly)
        FE-->>User: Redirect → /onboarding/:role
    end

    rect rgb(234, 250, 241)
        Note over User,DB: ONBOARDING (Student)
        User->>FE: Fill onboarding form\n(university, company, work location, dates)
        FE->>API: POST /api/student/onboarding\nAuthorization: Bearer token
        API->>API: protect: verify JWT
        API->>API: authorize(['student'])
        API->>DB: StudentProfile.create({...})
        DB-->>API: Profile saved
        API->>DB: User.updateOne({ isOnboardingComplete: true })
        API-->>FE: 200 { isOnboardingComplete: true }
        FE-->>User: Redirect → /student/dashboard
    end

    rect rgb(254, 249, 231)
        Note over User,DB: LOGIN
        User->>FE: Enter email + password
        FE->>API: POST /api/auth/login
        API->>SVC: login(req, res)
        SVC->>DB: User.findOne({ email }).select('+password')
        DB-->>SVC: User document
        SVC->>SVC: bcrypt.compare(password, hash)
        SVC->>TK: generateAccessToken() + generateRefreshToken()
        SVC->>DB: Session.findOneAndUpdate (upsert)
        SVC->>DB: User.updateOne({ lastLogin: now })
        SVC-->>API: { user, accessToken }
        API-->>FE: 200 + Set-Cookie: refreshToken
        FE-->>User: Redirect → role dashboard
    end

    rect rgb(245, 238, 248)
        Note over FE,API: SILENT TOKEN REFRESH (on 401)
        FE->>API: POST /api/auth/refresh\n(Cookie: refreshToken)
        API->>DB: Session.findOne({ refreshToken })
        DB-->>API: Session valid
        API->>TK: generateAccessToken(userId, role)
        TK-->>API: new accessToken
        API-->>FE: 200 { accessToken }
        FE->>FE: Redux: update token — retry original request
    end
```

---

## 2b. Sequence Diagram — GPS Attendance Check-In & Check-Out

```mermaid
sequenceDiagram
    actor Student
    participant FE as React Frontend
    participant GEO as Browser Geolocation
    participant API as Express API /attendance
    participant DB as MongoDB
    participant NS as Notification Service

    rect rgb(234, 250, 241)
        Note over Student,NS: GPS CHECK-IN
        Student->>FE: Tap "Check In"
        FE->>GEO: navigator.geolocation.getCurrentPosition()
        GEO-->>FE: { latitude, longitude }
        FE->>API: POST /api/attendance/checkin { lat, lng }
        API->>API: protect + authorize(['student'])
        API->>DB: Fetch Internship (isActive) + StudentProfile
        DB-->>API: { internship, workLocation }

        alt Already checked in today
            API-->>FE: 409 Already checked in today
        else Outside geofence (> 200m)
            API->>API: calcDistance(student ↔ workLocation)
            API-->>FE: 422 GEOFENCE_VIOLATION { distance, radius }
            FE-->>Student: Show blocked — Xm from work zone
        else Late check-in, no reason provided
            API->>API: watTime(now) — isLate = after shift_start + 30min
            API-->>FE: 422 { requiresReason: true, type: late_checkin }
            FE-->>Student: Prompt for late check-in reason
            Student->>FE: Enter reason
            FE->>API: POST /checkin { lat, lng, violationReason }
        else Within geofence + on time (happy path)
            API->>DB: Attendance.findOneAndUpdate upsert\n{ status: present, checkIn: {time, lat, lng, isLate} }
            DB-->>API: Record saved
            API->>NS: Notify industrySupervisor + institutionSupervisor
            API-->>FE: 200 { record }
            FE-->>Student: Show Checked In ✓ card
        end
    end

    rect rgb(254, 249, 231)
        Note over Student,NS: GPS CHECK-OUT
        Student->>FE: Tap "Check Out"
        FE->>GEO: getCurrentPosition()
        GEO-->>FE: { latitude, longitude }
        FE->>API: POST /api/attendance/checkout { lat, lng }
        API->>DB: Find today's Attendance record
        DB-->>API: Record with checkIn set, no checkOut

        alt Early checkout, no reason
            API->>API: isEarlyDeparture = before endH-1 hour WAT
            API-->>FE: 422 { requiresReason: true, type: early_checkout }
            FE-->>Student: Prompt for early departure reason
            Student->>FE: Enter reason
            FE->>API: POST /checkout { lat, lng, violationReason }
        else Normal checkout
            API->>DB: record.checkOut = { time, lat, lng, isEarlyDeparture }
            DB-->>API: Saved
            API->>NS: Notify supervisors
            API-->>FE: 200 { record }
            FE-->>Student: Show Checked Out ✓
        end
    end

    rect rgb(245, 238, 248)
        Note over API,DB: NIGHTLY CRON — Flag Missing Checkouts
        API->>DB: Find Attendance where checkIn set AND checkOut null AND date=today
        DB-->>API: [ records ]
        API->>DB: Bulk update missedCheckout = true
        API->>NS: Push notification → each student: "You forgot to check out"
    end
```

---

## 2c. Sequence Diagram — Logbook Entry & Weekly Submission

```mermaid
sequenceDiagram
    actor Student
    actor IS as Industry Supervisor
    participant FE as React Frontend
    participant API as Express API /logbook
    participant CLD as Cloudinary
    participant DB as MongoDB
    participant CRON as BullMQ Cron

    rect rgb(245, 238, 248)
        Note over Student,DB: VIEW LOGBOOK WEEKS
        Student->>FE: Navigate to Logbook page
        FE->>API: GET /api/logbook/weeks
        API->>DB: LogbookWeek.find({ student })
        DB-->>API: [ LogbookWeek[] ]
        API-->>FE: 200 { weeks }
        FE-->>Student: Show weeks with lock status & progress
    end

    rect rgb(235, 245, 251)
        Note over Student,DB: SUBMIT DAILY LOG ENTRY
        Student->>FE: Select day, fill log form\n(activities, skills, challenges, plan)
        FE->>API: POST /api/logbook/weeks/:weekId/entries
        API->>DB: Check LogbookWeek.isLocked

        alt Week is locked
            DB-->>API: isLocked: true
            API-->>FE: 403 Week is locked
            FE-->>Student: Show read-only notice
        else Week is open
            DB-->>API: isLocked: false
            API->>DB: DailyLogEntry.findOneAndUpdate (upsert)
            API->>DB: Count completed days
            DB-->>API: { entry, completedDays }
            API-->>FE: 200 { entry, completedDays }
            FE-->>Student: Progress bar updates (e.g. 3/5 days)
        end
    end

    rect rgb(234, 250, 241)
        Note over Student,CLD: UPLOAD WEEKLY IMAGE (after 5 days)
        Student->>FE: Attach summary image
        FE->>API: POST /api/logbook/weeks/:weekId/image (multipart)
        API->>CLD: multer → cloudinary.uploader.upload(buffer)
        CLD-->>API: { secure_url, public_id }
        API->>DB: LogbookWeek.update({ weeklyImage: secure_url })
        DB-->>API: Updated
        API-->>FE: 200 { weeklyImage: url }
        FE-->>Student: Show image + Week Complete ✓ badge
    end

    rect rgb(254, 249, 231)
        Note over IS,DB: SUPERVISOR COMMENT
        IS->>FE: Open student's logbook week
        FE->>API: GET /api/industry/students/:sid/logbook/:weekId
        API->>DB: LogbookWeek.findById().populate entries
        DB-->>API: { week, entries }
        API-->>FE: 200 { week, entries }
        IS->>FE: Write comment
        FE->>API: POST /api/logbook/weeks/:weekId/comment { comment }
        API->>DB: Push to LogbookWeek.supervisorComments
        API-->>FE: 200 comment saved
        FE-->>IS: Comment saved ✓
    end

    rect rgb(245, 238, 248)
        Note over CRON,DB: AUTO-LOCK — Every Sunday 5 PM
        CRON->>DB: Find open weeks where weekEndDate < now
        DB-->>CRON: [ expiredWeeks ]
        CRON->>DB: Bulk set isLocked = true
        CRON->>CRON: Push notification → "Week N is now locked"
    end
```

---

## 2d. Sequence Diagram — Grade Calculation

```mermaid
sequenceDiagram
    participant CRON as BullMQ Cron
    participant DB as MongoDB
    actor IS as Industry Supervisor
    participant FE as React Frontend
    participant API as Express API /industry
    actor Student

    rect rgb(234, 250, 241)
        Note over CRON,DB: AUTOMATED SYSTEM SCORE — Weekly Job
        CRON->>DB: Internship.find({ isActive: true })
        DB-->>CRON: [ Internship[] ]

        loop For each student internship
            CRON->>DB: Attendance.find({ student, week dates })
            DB-->>CRON: [ Attendance[] ]
            CRON->>CRON: attendanceScore = presentDays / totalDays × 20
            CRON->>DB: LogbookWeek + DailyLogEntry count
            DB-->>CRON: completedDays
            CRON->>CRON: logbookScore = completedDays / 5 × 30
            CRON->>CRON: systemScore = attendanceScore + logbookScore  (max 50)
            CRON->>DB: Grade.findOneAndUpdate upsert\n{ attendanceScore, logbookScore, systemScore }
            DB-->>CRON: Grade saved
        end
    end

    rect rgb(245, 238, 248)
        Note over IS,API: MANUAL SUPERVISOR GRADING
        IS->>FE: Open Grading page
        FE->>API: GET /api/industry/grading
        API->>DB: Fetch assigned students + their Grades
        DB-->>API: [ { student, grades[] }[] ]
        API-->>FE: 200 { studentsWithGrades }
        FE-->>IS: Show grading table

        IS->>FE: Enter supervisorScore (0–50) + note
        FE->>API: POST /api/industry/grading/:studentId/week/:weekId\n{ supervisorScore: 40, supervisorNote }
        API->>DB: Grade.findOne({ student, logbookWeek })
        DB-->>API: Grade { systemScore: 38 }
        API->>DB: Grade.update\n{ supervisorScore: 40, totalScore: 38+40=78 }
        DB-->>API: Updated
        API-->>FE: 200 { grade }
        FE-->>IS: Grade row shows 78/100
    end

    rect rgb(235, 245, 251)
        Note over Student,API: STUDENT VIEWS GRADES
        Student->>FE: Open Grades page
        FE->>API: GET /api/student/grades
        API->>DB: Grade.find({ student }).sort({ weekNumber: 1 })
        DB-->>API: [ Grade[] ]
        API-->>FE: 200 { grades }
        FE-->>Student: Show breakdown per week\nAttendance | Logbook | Supervisor | Total
    end
```

---

## 3a. Activity Diagram — Student Internship Lifecycle

```mermaid
flowchart TD
    classDef student fill:#EBF5FB,stroke:#2E86C1,color:#000
    classDef instSup fill:#EAFAF1,stroke:#27AE60,color:#000
    classDef indSup  fill:#F5EEF8,stroke:#8E44AD,color:#000
    classDef system  fill:#FEF9E7,stroke:#E67E22,color:#000
    classDef decision fill:#FADBD8,stroke:#E74C3C,color:#000

    START([● Start]):::student --> REG

    REG["👤 Student: Register Account\nfirstName · lastName · email · password · role"]:::student
    REG --> LOGIN["👤 Student: Login"]:::student
    LOGIN --> ONBOARD["👤 Student: Complete Onboarding\nuniversity · company · work location · dates"]:::student
    ONBOARD --> ASSIGN["🏫 Institution Supervisor:\nAssign Internship to Student"]:::instSup
    ASSIGN --> DASH["👤 Student Dashboard Activated"]:::student

    DASH --> WEEK_LOOP

    subgraph WEEK_LOOP["── Weekly Loop ──────────────────────────────────────────"]
        direction TD
        CHECKIN["👤 GPS Check-In"]:::student --> GEO_OK{Within 200m\ngeofence?}:::decision
        GEO_OK -->|No - Blocked| BLOCKED["❌ Check-in blocked\nShow distance error"]:::student
        GEO_OK -->|Yes| LATE{Arriving late?\nafter shift_start + 30m}:::decision
        LATE -->|Yes| LATE_REASON["👤 Enter late reason\nViolation recorded"]:::student
        LATE -->|No| WORK
        LATE_REASON --> WORK

        WORK["👤 Daily work activities"]:::student
        WORK --> LOG["👤 Write Daily Log Entry\nactivities · skills · challenges · plan"]:::student
        LOG --> CHECKOUT["👤 GPS Check-Out"]:::student
        CHECKOUT --> EARLY{Early departure?\nbefore endH-1h:30m}:::decision
        EARLY -->|Yes| EARLY_REASON["👤 Enter early departure reason"]:::student
        EARLY -->|No| DAYS_DONE
        EARLY_REASON --> DAYS_DONE

        DAYS_DONE{5 days\ncomplete?}:::decision
        DAYS_DONE -->|No - Next day| CHECKIN
        DAYS_DONE -->|Yes| IMG["👤 Upload Weekly Summary Image\nStored on Cloudinary"]:::student

        IMG --> SYS_LOCK["⚙️ System (Sunday 5PM):\nAuto-lock LogbookWeek\nPush notif: Week Locked"]:::system
        SYS_LOCK --> IS_REVIEW["🏭 Industry Supervisor:\nReview weekly entries + image\nAdd comment / feedback"]:::indSup
        IS_REVIEW --> IS_GRADE["🏭 Industry Supervisor:\nSubmit grade 0–50 + note"]:::indSup
        IS_GRADE --> SYS_CALC["⚙️ System (Weekly Cron):\nattendanceScore = presentDays/total × 20\nlogbookScore = completedDays/5 × 30\ntotalScore = systemScore + supervisorScore"]:::system
        SYS_CALC --> GRADE_VIEW["👤 Student: View weekly grade breakdown\nAttendance | Logbook | Supervisor | Total"]:::student

        SYS_CALC --> MISS["⚙️ System (Nightly):\nFlag missedCheckout\nSend reminder notifications"]:::system
    end

    GRADE_VIEW --> DONE{Internship\nperiod over?}:::decision
    DONE -->|No| WEEK_LOOP
    DONE -->|Yes| END_STUDENT["👤 Internship Ends"]:::student

    END_STUDENT --> OVERVIEW["🏫 Institution Supervisor:\nView Final Grades Overview\nView Leaderboard"]:::instSup

    OVERVIEW --> STOP([● End]):::student
```

---

## 3b. Activity Diagram — GPS Check-In Process

```mermaid
flowchart TD
    classDef student fill:#EBF5FB,stroke:#2E86C1,color:#000
    classDef backend fill:#EAFAF1,stroke:#27AE60,color:#000
    classDef decision fill:#FADBD8,stroke:#E74C3C,color:#000

    START([● Start]):::student --> OPEN["👤 Open Attendance Page"]:::student
    OPEN --> TAP["👤 Tap Check In button"]:::student
    TAP --> GPS_REQ["👤 Request GPS Location\nnavigator.geolocation.getCurrentPosition"]:::student
    GPS_REQ --> GPS_OK{GPS permission\ngranted?}:::decision
    GPS_OK -->|No| GPS_ERR["❌ Show: Location access required"]:::student
    GPS_ERR --> STOP1([● Stop])
    GPS_OK -->|Yes| GET_LOC["👤 Receive latitude, longitude"]:::student
    GET_LOC --> SEND["👤 POST /api/attendance/checkin\n{ latitude, longitude }"]:::student

    SEND --> JWT{JWT token\nvalid?}:::backend
    JWT -->|No| U401["⚠️ 401 Unauthorized"]:::backend
    U401 --> STOP2([● Stop])
    JWT -->|Yes| INTERN{Active\ninternship found?}:::backend
    INTERN -->|No| U403["⚠️ 403 Not linked to internship"]:::backend
    U403 --> STOP3([● Stop])
    INTERN -->|Yes| ALREADY{Already checked\nin today?}:::backend
    ALREADY -->|Yes| U409["⚠️ 409 Already checked in"]:::backend
    U409 --> STOP4([● Stop])
    ALREADY -->|No| DIST["🟢 calcDistance\nstudent ↔ workLocation"]:::backend

    DIST --> GEO{Within 200m\ngeofence radius?}:::decision
    GEO -->|No| GEO_BLOCK["⚠️ 422 GEOFENCE_VIOLATION\n{ distanceFromOffice, radius, code }"]:::backend
    GEO_BLOCK --> SHOW_BLOCK["👤 Show: Xm from work zone\nCheck-in blocked"]:::student
    SHOW_BLOCK --> STOP5([● Stop])

    GEO -->|Yes| WAT["🟢 Convert to WAT time (UTC+1)\nCheck shift start + 30min deadline"]:::backend
    WAT --> ISLATE{Checking in\nlate?}:::decision

    ISLATE -->|Yes, no reason| LATE422["⚠️ 422 requiresReason: true\ntype: late_checkin"]:::backend
    LATE422 --> LATE_PROMPT["👤 Prompt: Enter late check-in reason"]:::student
    LATE_PROMPT --> ENTER_REASON["👤 Enter reason text"]:::student
    ENTER_REASON --> SEND

    ISLATE -->|No — on time| SAVE_OK
    ISLATE -->|Yes + reason provided| SAVE_LATE["🟢 Save violation\n{ type: late_checkin, reason, recordedAt }"]:::backend
    SAVE_LATE --> SAVE_OK

    SAVE_OK["🟢 Upsert Attendance record\n{ status: present/late, checkIn: {time, lat, lng, isLate} }"]:::backend
    SAVE_OK --> NOTIFY["🟢 Notify supervisors via FCM\n{ Student Checked In at HH:MM · location }"]:::backend
    NOTIFY --> OK200["🟢 200 { success: true, data: record }"]:::backend
    OK200 --> SHOW_OK["👤 Show Checked In ✓\nwith time and location"]:::student
    SHOW_OK --> STOP6([● End])
```

---

## 3c. Activity Diagram — Logbook Submission Process

```mermaid
flowchart TD
    classDef student fill:#F5EEF8,stroke:#8E44AD,color:#000
    classDef backend fill:#EAFAF1,stroke:#27AE60,color:#000
    classDef cloud   fill:#EBF5FB,stroke:#2E86C1,color:#000
    classDef indSup  fill:#FEF9E7,stroke:#E67E22,color:#000
    classDef system  fill:#FADBD8,stroke:#E74C3C,color:#000
    classDef decision fill:#FADBD8,stroke:#E74C3C,color:#000

    START([● Start]):::student --> NAV["👤 Student: Navigate to Logbook page\nGET /api/logbook/weeks"]:::student
    NAV --> WEEKS["👤 View list of LogbookWeeks\nwith lock status & completion"]:::student
    WEEKS --> SELECT["👤 Select a week"]:::student
    SELECT --> LOCKED{Week\nlocked?}:::decision
    LOCKED -->|Yes| READ_ONLY["👤 Show read-only view\nWeek is locked for editing"]:::student
    READ_ONLY --> STOP1([● Stop])
    LOCKED -->|No| EDITOR["👤 Open week editor"]:::student

    EDITOR --> DAY_LOOP

    subgraph DAY_LOOP["── Repeat Mon – Fri ──────────────────────────────"]
        direction TD
        SEL_DAY["👤 Select a day\nMonday / Tuesday / Wednesday / Thursday / Friday"]:::student
        SEL_DAY --> FILL["👤 Fill Daily Log Entry form\n• Activities Carried Out\n• Skills Learned\n• Challenges Encountered\n• Plan for Tomorrow"]:::student
        FILL --> SUBMIT_ENTRY["👤 Submit entry\nPOST /api/logbook/weeks/:weekId/entries"]:::student
        SUBMIT_ENTRY --> API_ENTRY["🟢 Backend: Upsert DailyLogEntry\nCount completed days\nReturn { entry, completedDays }"]:::backend
        API_ENTRY --> PROGRESS["👤 Progress bar updates\ne.g. 3 of 5 days done"]:::student
        PROGRESS --> FIVE{All 5 days\ncomplete?}:::decision
        FIVE -->|No| SEL_DAY
    end

    FIVE -->|Yes| IMG_UP["👤 Upload Weekly Summary Image\nPOST /api/logbook/weeks/:weekId/image"]:::student
    IMG_UP --> CLOUD["☁️ Cloudinary: Upload image buffer\nReceive { secure_url }"]:::cloud
    CLOUD --> SAVE_IMG["🟢 Backend: Update LogbookWeek.weeklyImage\nReturn 200 { weeklyImage: url }"]:::backend
    SAVE_IMG --> COMPLETE["👤 Show Week Complete ✓ badge"]:::student

    COMPLETE --> IS_REVIEW["🏭 Industry Supervisor:\nReceive notification → review entries + image"]:::indSup
    IS_REVIEW --> IS_COMMENT["🏭 Industry Supervisor:\nWrite comment on the week"]:::indSup
    IS_COMMENT --> SAVE_CMT["🟢 Backend: Save to LogbookWeek.supervisorComments\nPush notification to student"]:::backend
    SAVE_CMT --> STU_NOTIF["👤 Student: Receive comment notification\nView supervisor feedback"]:::student

    STU_NOTIF --> SYS_LOCK["⚙️ System: Sunday 5 PM\nAuto-lock week (isLocked = true)\nPush: Your logbook for Week N is locked"]:::system
    SYS_LOCK --> IS_GRADE["🏭 Industry Supervisor:\nSubmit manual grade 0–50 + note"]:::indSup
    IS_GRADE --> SYS_GRADE["⚙️ System: Calculate total grade\ntotalScore = systemScore + supervisorScore"]:::system
    SYS_GRADE --> VIEW_GRADE["👤 Student: View final grade for this week"]:::student
    VIEW_GRADE --> STOP2([● End])
```

---

## 3d. Activity Diagram — Password Reset Process

```mermaid
flowchart TD
    classDef user    fill:#EBF5FB,stroke:#2E86C1,color:#000
    classDef backend fill:#EAFAF1,stroke:#27AE60,color:#000
    classDef email   fill:#FEF9E7,stroke:#E67E22,color:#000
    classDef decision fill:#FADBD8,stroke:#E74C3C,color:#000

    START([● Start]):::user --> CLICK["👤 User: Click Forgot Password\non login page"]:::user
    CLICK --> ENTER_EMAIL["👤 Enter registered email address"]:::user
    ENTER_EMAIL --> SUBMIT["👤 Submit\nPOST /api/auth/forgot-password { email }"]:::user

    SUBMIT --> FIND_USER["🟢 Backend: User.findOne({ email })"]:::backend
    FIND_USER --> EXISTS{User exists\nin database?}:::decision

    EXISTS -->|No| RETURN200["🟢 Return 200 generic success\n⚠️ No user enumeration —\nsame response either way"]:::backend
    RETURN200 --> SHOW_MSG["👤 Show: If that email is registered\nyou will receive a link shortly"]:::user
    SHOW_MSG --> STOP1([● Stop])

    EXISTS -->|Yes| GEN_TOKEN["🟢 Generate cryptographic token\ncrypto.randomBytes - SHA-256 hash\nStore in User.resetPasswordToken\nExpiry: now + 1 hour"]:::backend
    GEN_TOKEN --> SEND_EMAIL["📧 Email Service (Nodemailer):\nCompose email with reset link\n/reset-password?token=rawToken\nSend via Gmail SMTP"]:::email

    SEND_EMAIL --> CHECK_EMAIL["👤 User: Check inbox\nClick reset link"]:::user
    CHECK_EMAIL --> NEW_PW["👤 Enter new password\nConfirm new password"]:::user
    NEW_PW --> SUBMIT2["👤 Submit\nPOST /api/auth/reset-password\n{ token, newPassword }"]:::user

    SUBMIT2 --> VERIFY["🟢 Backend: Hash incoming token\nFind user where token matches\nAND expiry > now"]:::backend
    VERIFY --> VALID{Token valid\nand not expired?}:::decision

    VALID -->|No| ERR400["⚠️ 400: Reset link is invalid\nor has expired"]:::backend
    ERR400 --> SHOW_ERR["👤 Show error message\nUser clicks Forgot Password again"]:::user
    SHOW_ERR --> STOP2([● Stop])

    VALID -->|Yes| HASH_PW["🟢 bcrypt.hash(newPassword, 12)\nUpdate user.password"]:::backend
    HASH_PW --> CLEAR["🟢 Clear resetPasswordToken\nClear resetPasswordExpiry\nDelete all active Sessions\n(logs out all devices)"]:::backend
    CLEAR --> SUCCESS["🟢 Return 200 Password reset successful"]:::backend
    SUCCESS --> REDIRECT["👤 Redirect to Login page"]:::user
    REDIRECT --> LOGIN["👤 Login with new password"]:::user
    LOGIN --> STOP3([● End])
```
