# IMEP — System Diagrams

**Internship Management & Evaluation Platform**
All diagrams are written in PlantUML. Paste any block at [https://www.plantuml.com/plantuml/uml/](https://www.plantuml.com/plantuml/uml/) to render.

---

## 1. Blueprint (System Architecture)

```plantuml
@startuml IMEP_Architecture
!define RECTANGLE class

skinparam backgroundColor #FFFFFF
skinparam componentStyle rectangle
skinparam defaultFontName Arial

title IMEP — System Architecture Blueprint

actor Student
actor "Industry Supervisor" as IS
actor "Institution Supervisor" as ISup
actor Admin

package "Client Layer (React + Vite)" {
  [Login / Register Pages]
  [Student Dashboard]
  [Industry Supervisor Dashboard]
  [Institution Supervisor Dashboard]
  [Admin Dashboard]
  [Shared Pages (Profile, Security)]
}

package "State Management" {
  [Redux Toolkit Store\n(auth, logbook, attendance,\n grading, messaging, notifications)]
}

package "API Layer (Express.js / Node.js)" {
  [Auth Routes /api/auth]
  [Student Routes /api/student]
  [Logbook Routes /api/logbook]
  [Attendance Routes /api/attendance]
  [Industry Routes /api/industry]
  [Institution Routes /api/institution]
  [Messages Routes /api/messages]
  [Admin Routes /api/admin]
  [Notification Routes /api/notifications]
  [Search Routes /api/search]
  [Me Routes /api/me]
}

package "Middleware" {
  [JWT Auth (protect)]
  [RBAC (authorize)]
  [File Upload (multer)]
  [Error Handler]
  [Onboarding Gate]
}

package "Services" {
  [Auth Service]
  [Email Service (Nodemailer)]
  [Token Service]
  [Search Service]
  [Grade Calculator]
  [Geofence Validator]
}

package "Background Jobs (BullMQ + Redis)" {
  [Weekly Logbook Lock Job]
  [Grade Calculation Job]
  [Weekly Reset Job]
  [Submission Reminder Job]
  [Missing Checkout Flag Job]
  [Absence Alert Job]
}

database "MongoDB Atlas" {
  [User]
  [StudentProfile]
  [IndustrySupervisorProfile]
  [InstitutionSupervisorProfile]
  [Internship]
  [Attendance]
  [LogbookWeek]
  [DailyLogEntry]
  [Grade]
  [Message / Conversation]
  [Notification]
  [Session]
}

cloud "External Services" {
  [Firebase FCM\n(Push Notifications)]
  [Cloudinary\n(File Storage)]
  [Google Maps API\n(Geofence Distance)]
  [Gmail SMTP\n(Email)]
  [Upstash Redis\n(Queue Cache)]
}

Student --> [Login / Register Pages]
IS --> [Industry Supervisor Dashboard]
ISup --> [Institution Supervisor Dashboard]
Admin --> [Admin Dashboard]

[Login / Register Pages] --> [Redux Toolkit Store]
[Student Dashboard] --> [Redux Toolkit Store]

[Redux Toolkit Store] --> [Auth Routes /api/auth] : HTTP/Axios + JWT
[Redux Toolkit Store] --> [Logbook Routes /api/logbook]
[Redux Toolkit Store] --> [Attendance Routes /api/attendance]
[Redux Toolkit Store] --> [Industry Routes /api/industry]
[Redux Toolkit Store] --> [Institution Routes /api/institution]
[Redux Toolkit Store] --> [Messages Routes /api/messages]

[Auth Routes /api/auth] --> [JWT Auth (protect)]
[JWT Auth (protect)] --> [RBAC (authorize)]
[RBAC (authorize)] --> [Auth Service]
[Auth Service] --> [MongoDB Atlas]
[Auth Service] --> [Gmail SMTP\n(Email)]

[Attendance Routes /api/attendance] --> [Geofence Validator]
[Geofence Validator] --> [Google Maps API\n(Geofence Distance)]
[Geofence Validator] --> [MongoDB Atlas]

[Logbook Routes /api/logbook] --> [File Upload (multer)]
[File Upload (multer)] --> [Cloudinary\n(File Storage)]

[Background Jobs (BullMQ + Redis)] --> [MongoDB Atlas]
[Background Jobs (BullMQ + Redis)] --> [Firebase FCM\n(Push Notifications)]
[Background Jobs (BullMQ + Redis)] --> [Gmail SMTP\n(Email)]
[Background Jobs (BullMQ + Redis)] --> [Upstash Redis\n(Queue Cache)]

@enduml
```

---

## 2. Use Case Diagram

```plantuml
@startuml IMEP_UseCaseDiagram

skinparam backgroundColor #FFFFFF
skinparam actorStyle awesome
skinparam defaultFontName Arial
left to right direction

title IMEP — Use Case Diagram

actor Student as S
actor "Industry Supervisor" as IS
actor "Institution Supervisor" as ISup
actor Admin as A
actor "System (Cron)" as SYS

rectangle "Authentication & Onboarding" {
  usecase "Register Account" as UC_REG
  usecase "Login" as UC_LOGIN
  usecase "Reset Password" as UC_RESET
  usecase "Complete Onboarding" as UC_ONBOARD
  usecase "Manage Sessions" as UC_SESSION
  usecase "Update Profile" as UC_PROFILE
}

rectangle "Student Features" {
  usecase "View Dashboard" as UC_STU_DASH
  usecase "Check-In (GPS)" as UC_CHECKIN
  usecase "Check-Out (GPS)" as UC_CHECKOUT
  usecase "Report Violation Reason" as UC_VIOL
  usecase "View Attendance History" as UC_ATT_HIST
  usecase "Create Daily Log Entry" as UC_LOG_ENTRY
  usecase "Upload Weekly Summary Image" as UC_LOG_IMG
  usecase "View Logbook Weeks" as UC_LOG_VIEW
  usecase "View Grades" as UC_GRADES
  usecase "Nominate Supervisor" as UC_NOMINATE
}

rectangle "Industry Supervisor Features" {
  usecase "View Assigned Students" as UC_IS_STUDENTS
  usecase "View Student Logbook" as UC_IS_LOGBOOK
  usecase "Submit Supervisor Grade" as UC_IS_GRADE
  usecase "Comment on Logbook Week" as UC_IS_COMMENT
  usecase "View Student Attendance" as UC_IS_ATT
}

rectangle "Institution Supervisor Features" {
  usecase "View All Students" as UC_ISP_STUDENTS
  usecase "Assign Internship" as UC_ISP_ASSIGN
  usecase "View Grades Overview" as UC_ISP_GRADES
  usecase "View Leaderboard" as UC_ISP_LEAD
  usecase "Search Students & Supervisors" as UC_SEARCH
}

rectangle "Messaging" {
  usecase "Send Message" as UC_MSG_SEND
  usecase "View Conversations" as UC_MSG_VIEW
}

rectangle "Notifications" {
  usecase "Receive Push Notification" as UC_PUSH
  usecase "View Notification History" as UC_NOTIF_VIEW
  usecase "Register FCM Token" as UC_FCM
}

rectangle "Admin Features" {
  usecase "View System Statistics" as UC_ADM_STATS
  usecase "Manage Users" as UC_ADM_USERS
  usecase "Deactivate / Activate User" as UC_ADM_TOGGLE
  usecase "Edit Attendance Records" as UC_ADM_ATT
  usecase "Sync Logbook Weeks" as UC_ADM_SYNC
  usecase "Submit Grade (On Behalf)" as UC_ADM_GRADE
}

rectangle "Automated System Jobs" {
  usecase "Lock Logbook Week (Weekly)" as UC_SYS_LOCK
  usecase "Calculate Grades (Weekly)" as UC_SYS_GRADE
  usecase "Send Submission Reminder" as UC_SYS_REM
  usecase "Flag Missing Checkout" as UC_SYS_CHECKOUT
  usecase "Alert Absence" as UC_SYS_ABS
}

' Student associations
S --> UC_REG
S --> UC_LOGIN
S --> UC_RESET
S --> UC_ONBOARD
S --> UC_SESSION
S --> UC_PROFILE
S --> UC_STU_DASH
S --> UC_CHECKIN
S --> UC_CHECKOUT
S --> UC_VIOL
S --> UC_ATT_HIST
S --> UC_LOG_ENTRY
S --> UC_LOG_IMG
S --> UC_LOG_VIEW
S --> UC_GRADES
S --> UC_NOMINATE
S --> UC_MSG_SEND
S --> UC_MSG_VIEW
S --> UC_PUSH
S --> UC_NOTIF_VIEW
S --> UC_FCM

' Industry Supervisor associations
IS --> UC_LOGIN
IS --> UC_PROFILE
IS --> UC_IS_STUDENTS
IS --> UC_IS_LOGBOOK
IS --> UC_IS_GRADE
IS --> UC_IS_COMMENT
IS --> UC_IS_ATT
IS --> UC_MSG_SEND
IS --> UC_MSG_VIEW
IS --> UC_PUSH

' Institution Supervisor associations
ISup --> UC_LOGIN
ISup --> UC_PROFILE
ISup --> UC_ISP_STUDENTS
ISup --> UC_ISP_ASSIGN
ISup --> UC_ISP_GRADES
ISup --> UC_ISP_LEAD
ISup --> UC_SEARCH
ISup --> UC_MSG_SEND
ISup --> UC_MSG_VIEW
ISup --> UC_PUSH

' Admin associations
A --> UC_LOGIN
A --> UC_ADM_STATS
A --> UC_ADM_USERS
A --> UC_ADM_TOGGLE
A --> UC_ADM_ATT
A --> UC_ADM_SYNC
A --> UC_ADM_GRADE
A --> UC_IS_LOGBOOK

' System Cron associations
SYS --> UC_SYS_LOCK
SYS --> UC_SYS_GRADE
SYS --> UC_SYS_REM
SYS --> UC_SYS_CHECKOUT
SYS --> UC_SYS_ABS

' Include relationships
UC_CHECKIN ..> UC_VIOL : <<include>>\n(if violation)
UC_CHECKOUT ..> UC_VIOL : <<include>>\n(if early)
UC_LOG_ENTRY ..> UC_LOG_IMG : <<extend>>\n(after 5 days)
UC_SYS_REM ..> UC_PUSH : <<include>>
UC_SYS_ABS ..> UC_PUSH : <<include>>
UC_SYS_CHECKOUT ..> UC_PUSH : <<include>>

@enduml
```

---

## 3. Sequence Diagrams

### 3a. User Registration & Login Flow

```plantuml
@startuml IMEP_Seq_Auth

skinparam backgroundColor #FFFFFF
skinparam defaultFontName Arial
skinparam sequenceArrowThickness 2
skinparam sequenceParticipantBorderColor #4A90D9

title IMEP — Sequence: Registration & Login

actor User
participant "React Frontend" as FE
participant "Express API\n/api/auth" as API
participant "Auth Service" as SVC
database "MongoDB" as DB
participant "Email Service\n(Nodemailer)" as EMAIL
participant "Token Service" as TOKEN

== Registration ==
User -> FE : Fill registration form\n(name, email, password, role)
FE -> API : POST /api/auth/register\n{multipart: profile photo optional}
API -> SVC : register(userData)
SVC -> DB : Check email uniqueness
DB --> SVC : Not found (ok)
SVC -> SVC : bcrypt.hash(password, 12)
SVC -> DB : Create User document
DB --> SVC : User created
SVC -> TOKEN : generateAccessToken(userId, role)
SVC -> TOKEN : generateRefreshToken(userId)
TOKEN --> SVC : { accessToken, refreshToken }
SVC -> DB : Save Session (device, IP, refreshToken)
SVC --> API : { user, accessToken }
API --> FE : 201 { user, accessToken }\nSet-Cookie: refreshToken (httpOnly)
FE -> FE : Store accessToken in Redux
FE --> User : Redirect to /onboarding/:role

== Onboarding ==
User -> FE : Complete role-specific form\n(university, company, geofence, etc.)
FE -> API : POST /api/student/onboarding\n(Authorization: Bearer <token>)
API -> API : protect middleware\n→ verify JWT
API -> API : authorize(['student']) check
API -> DB : Save StudentProfile
DB --> API : Profile saved
API --> FE : 200 { isOnboardingComplete: true }
FE -> FE : Update Redux auth state
FE --> User : Redirect to /student/dashboard

== Login ==
User -> FE : Enter email + password
FE -> API : POST /api/auth/login\n{email, password}
API -> SVC : login(email, password)
SVC -> DB : Find user by email
DB --> SVC : User document
SVC -> SVC : bcrypt.compare(password, hash)
SVC -> TOKEN : generateAccessToken()
SVC -> TOKEN : generateRefreshToken()
SVC -> DB : Upsert Session (device, IP)
SVC -> DB : Update lastLogin
SVC --> API : { user, accessToken }
API --> FE : 200 { user, accessToken }\nSet-Cookie: refreshToken (httpOnly)
FE -> FE : Store in Redux + persist
FE --> User : Redirect to role dashboard

== Token Refresh (silent) ==
FE -> API : POST /api/auth/refresh-token\n(Cookie: refreshToken)
API -> TOKEN : verifyRefreshToken(token)
TOKEN -> DB : Find Session by token
DB --> TOKEN : Session valid
TOKEN -> TOKEN : generateAccessToken()
TOKEN --> API : new accessToken
API --> FE : 200 { accessToken }
FE -> FE : Update Redux accessToken
FE --> FE : Retry original failed request

@enduml
```

---

### 3b. GPS Attendance Check-In Flow

```plantuml
@startuml IMEP_Seq_Attendance

skinparam backgroundColor #FFFFFF
skinparam defaultFontName Arial
skinparam sequenceArrowThickness 2

title IMEP — Sequence: GPS Attendance Check-In & Check-Out

actor Student
participant "React Frontend" as FE
participant "Browser\nGeolocation API" as GEO
participant "Express API\n/api/attendance" as API
participant "Geofence\nValidator" as GV
participant "Google Maps\nDistance API" as MAPS
database "MongoDB" as DB
participant "BullMQ Worker" as WORKER

== Check-In ==
Student -> FE : Tap "Check In" button
FE -> GEO : navigator.geolocation.getCurrentPosition()
GEO --> FE : { latitude, longitude }
FE -> API : POST /api/attendance/checkin\n{ lat, lng, timestamp }
API -> API : JWT protect + authorize(['student'])
API -> DB : Fetch StudentProfile\n(workLocation geofence)
DB --> API : { lat, lng, radius }
API -> GV : validateGeofence(studentLoc, workLoc, radius)
GV -> MAPS : GET DistanceMatrix\n(origin, destination)
MAPS --> GV : distance in meters
alt Student within geofence (≤ 200m)
  GV --> API : valid = true
  API -> DB : Create Attendance record\n{ checkInTime, checkInLat, checkInLng,\n  status: 'present', isLate: checkTime > 9am }
  DB --> API : Attendance saved
  API --> FE : 200 { message: 'Checked in', attendance }
  FE --> Student : Show "Checked In" confirmation
else Student outside geofence
  GV --> API : valid = false, distance: Xm
  API -> DB : Create Attendance record\n{ status: 'violation', outsideGeofence: true }
  DB --> API : Saved with violation flag
  API --> FE : 400 { error: 'Outside work zone', distance: Xm }
  FE --> Student : Prompt: "You are Xm away.\nEnter reason for off-site attendance"
  Student -> FE : Submit violation reason
  FE -> API : PATCH /api/attendance/:id/violation\n{ reason }
  API -> DB : Update Attendance.violationReason
  DB --> API : Updated
  API --> FE : 200 { attendance }
  FE --> Student : Show attendance recorded with note
end

== Check-Out ==
Student -> FE : Tap "Check Out"
FE -> GEO : getCurrentPosition()
GEO --> FE : { latitude, longitude }
FE -> API : POST /api/attendance/checkout\n{ lat, lng, timestamp }
API -> DB : Find today's open Attendance record
DB --> API : Attendance (no checkOutTime)
API -> GV : validateGeofence(studentLoc, workLoc, radius)
GV -> MAPS : GET Distance
MAPS --> GV : distance
API -> DB : Update Attendance\n{ checkOutTime, checkOutLat, checkOutLng,\n  isEarlyCheckout: checkTime < 5pm }
DB --> API : Updated
alt Early checkout
  API --> FE : 200 { attendance, earlyCheckout: true }
  FE --> Student : Prompt for early checkout reason
  Student -> FE : Enter reason
  FE -> API : PATCH /api/attendance/:id/early-checkout\n{ reason }
  API -> DB : Save earlyCheckoutReason
  API --> FE : 200 OK
else Normal checkout
  API --> FE : 200 { attendance }
  FE --> Student : Show "Checked Out" confirmation
end

== Nightly Missing Checkout Job ==
WORKER -> DB : Find Attendances where\n checkInTime set AND checkOutTime null\n AND date = today
DB --> WORKER : List of students
WORKER -> DB : Flag attendance.missingCheckout = true
WORKER -> DB : Find student FCM tokens
WORKER -> WORKER : Send push notification\n"You forgot to check out today"

@enduml
```

---

### 3c. Logbook Entry & Weekly Submission

```plantuml
@startuml IMEP_Seq_Logbook

skinparam backgroundColor #FFFFFF
skinparam defaultFontName Arial
skinparam sequenceArrowThickness 2

title IMEP — Sequence: Logbook Entry & Weekly Submission

actor Student
participant "React Frontend" as FE
participant "Express API\n/api/logbook" as API
participant "Multer / Cloudinary" as CLOUD
database "MongoDB" as DB
participant "BullMQ Cron" as CRON

== View Logbook Weeks ==
Student -> FE : Navigate to Logbook page
FE -> API : GET /api/logbook/weeks
API -> DB : Find LogbookWeeks\n{ student: currentUserId }
DB --> API : [ LogbookWeek[] ]
API --> FE : 200 { weeks: [...] }
FE --> Student : Show week list with lock status\nand completion indicators

== Submit Daily Log Entry ==
Student -> FE : Select a day, fill form\n(activities, skills, challenges, next plan)
FE -> API : POST /api/logbook/weeks/:weekId/entries\n{ day, activitiesCarriedOut,\n  skillsLearned, challenges, planForTomorrow }
API -> API : protect + authorize(['student'])
API -> DB : Check LogbookWeek.isLocked
alt Week is locked
  DB --> API : isLocked = true
  API --> FE : 403 { error: 'Week is locked for editing' }
  FE --> Student : Show "Week locked" message
else Week is open
  DB --> API : isLocked = false
  API -> DB : Upsert DailyLogEntry\n{ weekId, day, fields... }
  DB --> API : Entry saved/updated
  API -> DB : Count completed days in week
  DB --> API : completedDays count
  API --> FE : 200 { entry, weekProgress }
  FE --> Student : Show success + update progress bar
end

== Upload Weekly Summary Image (after all 5 days done) ==
Student -> FE : Attach image file for weekly summary
FE -> FE : Check all 5 days complete
FE -> API : POST /api/logbook/weeks/:weekId/image\n(multipart/form-data: image)
API -> CLOUD : multer.upload() → Cloudinary.uploader.upload()
CLOUD --> API : { secure_url, public_id }
API -> DB : Update LogbookWeek.weeklyImage = secure_url
DB --> API : Updated
API --> FE : 200 { weeklyImage: url }
FE --> Student : Show uploaded image preview\n+ "Week Complete" badge

== Weekly Logbook Lock (Automated — Every Sunday 5 PM) ==
CRON -> CRON : Trigger "weekly-lock" job
CRON -> DB : Find all open LogbookWeeks\n where weekEndDate < now
DB --> CRON : [ WeekIds[] ]
CRON -> DB : Bulk update isLocked = true
DB --> CRON : Updated
CRON -> DB : Find affected students' FCM tokens
CRON -> CRON : Broadcast push notification\n"Last week's logbook has been locked"

== Supervisor Comments on Logbook ==
actor "Industry\nSupervisor" as IS
IS -> FE : Open student logbook week
FE -> API : GET /api/industry/students/:sid/logbook/:weekId
API -> DB : Find LogbookWeek + DailyLogEntries
DB --> API : Week data
API --> FE : 200 { week, entries }
FE --> IS : Show week content

IS -> FE : Write comment, click submit
FE -> API : POST /api/logbook/weeks/:weekId/comment\n{ comment }
API -> DB : Push comment to LogbookWeek.supervisorComments
DB --> API : Updated
API --> FE : 200 { comment }
FE --> IS : Comment saved

@enduml
```

---

### 3d. Grading Flow (Automated + Manual)

```plantuml
@startuml IMEP_Seq_Grading

skinparam backgroundColor #FFFFFF
skinparam defaultFontName Arial
skinparam sequenceArrowThickness 2

title IMEP — Sequence: Grade Calculation (Automated + Manual)

participant "BullMQ Cron\nWorker" as CRON
database "MongoDB" as DB
actor "Industry\nSupervisor" as IS
participant "React Frontend" as FE
participant "Express API\n/api/industry" as API
actor Student

== Automated System Score Calculation (Weekly) ==
CRON -> CRON : Trigger "grade-calculation" job
CRON -> DB : Fetch all active Internship records
DB --> CRON : [ Internship[] ]

loop for each student internship
  CRON -> DB : Fetch Attendance records this week
  DB --> CRON : [ Attendance[] ]
  CRON -> CRON : attendanceScore =\n  (daysPresent / totalDays) × 20
  CRON -> DB : Fetch LogbookWeek + DailyLogEntries
  DB --> CRON : week + entries
  CRON -> CRON : logbookScore =\n  (completedEntries / 5) × 30
  CRON -> CRON : systemScore = attendanceScore + logbookScore
  CRON -> DB : Upsert Grade\n{ student, week, systemScore, details }
  DB --> CRON : Grade saved
end

== Manual Supervisor Grading ==
IS -> FE : Navigate to Grading page
FE -> API : GET /api/industry/grading
API -> DB : Find assigned students +\n their Grade records
DB --> API : [ StudentGradeData[] ]
API --> FE : 200 { students, grades }
FE --> IS : Show grading table per week

IS -> FE : Enter supervisor score (0–50)\n+ optional feedback for a student/week
FE -> API : POST /api/industry/grading/:studentId/week/:weekId\n{ supervisorScore, feedback }
API -> API : protect + authorize(['industry_supervisor'])
API -> DB : Find Grade record for student+week
DB --> API : Grade
API -> DB : Update Grade\n{ supervisorScore, feedback,\n  totalScore: systemScore + supervisorScore }
DB --> API : Updated
API --> FE : 200 { grade }
FE --> IS : Show updated grade row

== Student Views Final Grade ==
Student -> FE : Navigate to Grades page
FE -> API : GET /api/student/grades
API -> DB : Find all Grade records for student
DB --> API : [ Grade[] ]
API --> FE : 200 { grades }
FE --> Student : Display per-week breakdown:\n  Attendance / Logbook / Supervisor / Total

== Institution Supervisor Views Grades Overview ==
actor "Institution\nSupervisor" as ISup
ISup -> FE : Navigate to Grades Overview
FE -> API : GET /api/institution/grades
API -> DB : Fetch all students + grades\n under this supervisor
DB --> API : Aggregated grade data
API --> FE : 200 { studentsWithGrades }
FE --> ISup : Show tabular grade overview

ISup -> FE : Navigate to Leaderboard
FE -> API : GET /api/institution/leaderboard
API -> DB : Sort students by totalScore DESC
DB --> API : Ranked list
API --> FE : 200 { leaderboard }
FE --> ISup : Show ranked student list

@enduml
```

---

## 4. Activity Diagrams

### 4a. Student Internship Lifecycle

```plantuml
@startuml IMEP_Activity_Lifecycle

skinparam backgroundColor #FFFFFF
skinparam defaultFontName Arial
skinparam ActivityBorderColor #4A90D9
skinparam ActivityBackgroundColor #EBF5FB

title IMEP — Activity: Student Internship Lifecycle

|Student|
start

:Register Account\n(name, email, password, role=student);

:Verify Email (optional)\nand Login;

:Complete Onboarding\n(university, department, level,\ncompany, internship dates,\nwork location geofence);

:Student Dashboard activated;

fork
  |Student|
  :Daily Activities\n(Attendance + Logbook);

  repeat
    :Check-In at work site\n(GPS validation);
    if (Within geofence?) then (Yes)
      :Record check-in → Present;
    else (No)
      :Prompt violation reason;
      :Record check-in → Violation;
    endif

    :Perform daily work activities;

    :Write Daily Log Entry\n(activities, skills,\nchallenges, next plan);

    :Check-Out at end of day;
    if (Early checkout?) then (Yes)
      :Enter early checkout reason;
    endif

  repeat while (End of work week?) is (No)

  :Upload Weekly Summary Image;

  |System|
  :Sunday 5 PM:\nAuto-lock LogbookWeek;

  |Student|
  :Cannot edit past weeks;

fork again
  |Industry Supervisor|
  :View student logbook\nweekly entries;
  :Add comments/feedback;
  :Submit supervisor grade\n(0–50 points);

fork again
  |System|
  :Weekly:\nCalculate system score\n(Attendance 0–20 +\nLogbook 0–30 = 0–50);
  :Combine with supervisor score\n→ Total (0–100);
  :Update Grade record;

  :Daily:\nCheck missing checkouts;
  :Send reminder notifications;
end fork

|Student|
:View weekly grades\nand feedback;

if (Internship period complete?) then (No)
  :Continue next week;
  backward: Next Week;
else (Yes)
  :Internship ends;
endif

|Institution Supervisor|
:View final grades overview;
:View Leaderboard;
:Generate internship report;

|Student|
stop

@enduml
```

---

### 4b. GPS Attendance Check-In Process

```plantuml
@startuml IMEP_Activity_Checkin

skinparam backgroundColor #FFFFFF
skinparam defaultFontName Arial
skinparam ActivityBorderColor #27AE60
skinparam ActivityBackgroundColor #EAFAF1

title IMEP — Activity: GPS Attendance Check-In Process

|Student (Browser)|
start

:Open Attendance page;
:Tap "Check In" button;

:Request browser geolocation\n(navigator.geolocation.getCurrentPosition);

if (GPS permission granted?) then (No)
  :Show error:\n"Location access required";
  stop
else (Yes)
  :Receive current location\n{ lat, lng };
endif

:Send POST /api/attendance/checkin\n{ lat, lng, timestamp };

|Backend API|
:Authenticate JWT token;

if (Token valid?) then (No)
  :Return 401 Unauthorized;
  stop
else (Yes)
  :Fetch student's registered\nwork location (geofence);
endif

if (Work location registered?) then (No)
  :Return 400:\n"No work location on file";
  stop
else (Yes)
  :Call Google Maps Distance API\nto measure distance;
endif

if (Distance ≤ geofence radius\n(default 200m)?) then (Yes)
  :Create Attendance record\n{ status: 'present' };
  if (Check-in time > 9:00 AM?) then (Yes)
    :Flag: isLate = true;
  else (No)
    :isLate = false;
  endif
  :Return 200 OK;

  |Student (Browser)|
  :Show "Checked In ✓" card;
  :Display check-in time;

else (No — outside zone)
  :Create Attendance record\n{ status: 'violation',\n  outsideGeofence: true };
  :Return 400 + distance info;

  |Student (Browser)|
  :Show distance warning dialog;
  :Prompt: "Enter reason for\noff-site attendance";

  |Student (Browser)|
  :Enter reason text;
  :Submit reason;

  |Backend API|
  :PATCH Attendance.violationReason;
  :Return 200;

  |Student (Browser)|
  :Show "Attendance recorded\nwith note" message;
endif

stop

@enduml
```

---

### 4c. Logbook Weekly Submission Process

```plantuml
@startuml IMEP_Activity_Logbook

skinparam backgroundColor #FFFFFF
skinparam defaultFontName Arial
skinparam ActivityBorderColor #8E44AD
skinparam ActivityBackgroundColor #F5EEF8

title IMEP — Activity: Logbook Weekly Submission Process

|Student|
start

:Navigate to Logbook page;
:View list of LogbookWeeks;

:Select a week to complete;

if (Week is locked?) then (Yes)
  :Show "This week is locked"\nread-only view;
  stop
else (No)
  :Open week editor;
endif

:Student completes daily entries\n(Monday to Friday);

repeat
  :Select a day (Mon/Tue/Wed/Thu/Fri);

  :Fill daily log form:\n- Activities carried out\n- Skills learned\n- Challenges encountered\n- Plan for tomorrow;

  :Submit entry;

  |Backend API|
  :Upsert DailyLogEntry;
  :Count completed days;
  :Return progress;

  |Student|
  :See progress bar update\n(e.g. 3 of 5 days done);

repeat while (All 5 days complete?) is (No)

|Student|
:Upload weekly summary image\n(photo of week's work/site);

|Backend API|
:Upload image to Cloudinary;
:Store image URL in LogbookWeek;
:Mark week as fully submitted;
:Return 200;

|Student|
:Week shows "Complete" badge;
:Wait for supervisor review;

|Industry Supervisor|
:Receive notification\n(student submitted week);
:Review daily entries + image;
:Write comment on the week;

|Student|
:Receive comment notification;
:View supervisor feedback;

|System (Automated)|
:Sunday 5 PM: Lock the week\n(isLocked = true);
:Students cannot edit further;

|Industry Supervisor|
:Submit manual grade\n(0–50 points + feedback);

|System (Automated)|
:Calculate total grade:\nSystem score + Supervisor score;
:Save to Grade record;

|Student|
:View final grade for this week;

stop

@enduml
```

---

### 4d. Password Reset Process

```plantuml
@startuml IMEP_Activity_PasswordReset

skinparam backgroundColor #FFFFFF
skinparam defaultFontName Arial
skinparam ActivityBorderColor #E67E22
skinparam ActivityBackgroundColor #FEF9E7

title IMEP — Activity: Password Reset Process

|User|
start

:Click "Forgot Password"\non login page;
:Enter email address;
:Submit request;

|Backend API|
:POST /api/auth/forgot-password\n{ email };
:Find user by email;

if (User exists?) then (No)
  :Return 200 (security: no user enum);
  note right: Always return success\nto prevent email enumeration
  stop
else (Yes)
  :Generate cryptographic reset token\n(crypto.randomBytes);
  :Hash token and store in DB\nwith 1-hour expiry;
endif

|Email Service|
:Send reset email via Gmail SMTP\n(link: /reset-password?token=xxx);

|User|
:Check inbox, click reset link;
:Enter new password (twice);
:Submit new password;

|Backend API|
:POST /api/auth/reset-password\n{ token, newPassword };
:Hash token, find user with\nmatching unexpired token;

if (Token valid & not expired?) then (No)
  :Return 400: "Token invalid\nor expired";
  |User|
  :Show error, try again;
  stop
else (Yes)
  :bcrypt.hash(newPassword, 12);
  :Update user.passwordHash;
  :Clear reset token fields;
  :Invalidate all existing sessions;
  :Return 200 success;
endif

|User|
:Redirect to login page;
:Login with new password;

stop

@enduml
```

---

## Diagram Rendering Instructions

All diagrams above use **PlantUML** syntax. To render them:

1. **Online (fastest):** Go to [plantuml.com](https://www.plantuml.com/plantuml/uml/) and paste any `@startuml...@enduml` block
2. **VS Code:** Install the **PlantUML** extension by `jebbs`, then open a `.puml` file and press `Alt+D` to preview
3. **Export:** The PlantUML online editor lets you download PNG, SVG, or PDF
4. **IntelliJ / WebStorm:** Install the PlantUML Integration plugin

### Save as `.puml` files
Each diagram block can be saved individually as:
- `architecture.puml`
- `use-case.puml`
- `seq-auth.puml`
- `seq-attendance.puml`
- `seq-logbook.puml`
- `seq-grading.puml`
- `activity-lifecycle.puml`
- `activity-checkin.puml`
- `activity-logbook.puml`
- `activity-password-reset.puml`
