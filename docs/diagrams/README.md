# IMEP — UML Diagram Files

All diagrams are written in **PlantUML** syntax.

## Files

| File | Diagram | Type |
|------|---------|------|
| `use-case.puml` | Full system use case diagram | Use Case |
| `seq-auth.puml` | Registration → Onboarding → Login + Token Refresh | Sequence |
| `seq-attendance.puml` | GPS Check-In, Check-Out & nightly cron | Sequence |
| `seq-logbook.puml` | Daily log entry, image upload, supervisor comment, auto-lock | Sequence |
| `seq-grading.puml` | Automated grade calc + manual supervisor grading + leaderboard | Sequence |
| `activity-lifecycle.puml` | Full student internship lifecycle (swimlane) | Activity |
| `activity-checkin.puml` | GPS check-in step-by-step with all branches | Activity |
| `activity-logbook.puml` | Logbook submission process end-to-end | Activity |
| `activity-password-reset.puml` | Password reset with security notes | Activity |

## How to Render

### Option 1 — Online (fastest, no install)
1. Open [plantuml.com/plantuml/uml](https://www.plantuml.com/plantuml/uml/)
2. Paste the entire contents of any `.puml` file
3. The diagram renders instantly — download as PNG, SVG, or PDF

### Option 2 — VS Code (recommended for local work)
1. Install the **PlantUML** extension by `jebbs` (Extension ID: `jebbs.plantuml`)
2. Open any `.puml` file
3. Press `Alt + D` to preview the diagram in a side panel
4. Right-click the preview → Export to PNG/SVG

### Option 3 — Command Line
```bash
# requires Java + plantuml.jar
java -jar plantuml.jar docs/diagrams/*.puml
# outputs PNG files next to each .puml file
```
