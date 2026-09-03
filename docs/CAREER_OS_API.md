# SkillBridge 3.0 — Personal Career Operating System API Reference

All routes require JWT authentication (`Authorization: Bearer <token>`) with student role authorization. Endpoints enforce strict student isolation: the authenticated `student_id` is derived strictly from the JWT session token to prevent IDOR (Insecure Direct Object Reference) vulnerabilities.

---

## 1. Master State & Aggregate Endpoints

### `GET /student/career-os`
Returns the complete aggregated Personal Career Operating System state in a single round-trip, preventing N+1 frontend waterfalls.

**Query Parameters:**
- `role` (optional, string): Filter readiness, gaps, and roadmap against a specific target role.

**Response Structure:**
```json
{
  "student": {
    "id": "std_101",
    "name": "Alex Chen",
    "college": "Tech Institute",
    "program": "Computer Science",
    "experience": "0-1 years"
  },
  "goal": {
    "target_role": "Frontend Developer",
    "secondary_target_role": "Full Stack Developer",
    "career_domain": "Frontend Engineering",
    "target_timeline_weeks": 16,
    "experience_level": "entry"
  },
  "readiness": {
    "target_role": "Frontend Developer",
    "overall_readiness": 72,
    "readiness_score": 72,
    "readiness_tier": "Developing",
    "required_skills_count": 7,
    "verified_skills_count": 5,
    "breakdown": {
      "required_skills_coverage": 71.4,
      "preferred_skills_coverage": 60.0,
      "proficiency_benchmark": 75.0,
      "portfolio_evidence": 80.0
    }
  },
  "gaps": {
    "target_role": "Frontend Developer",
    "readiness_score": 72,
    "strong": [],
    "needs_improvement": [],
    "missing": [],
    "total_gaps": 2
  },
  "next_action": {
    "primary_action": {
      "action_type": "learn_skill",
      "focus_skill": "TypeScript",
      "title": "Learn TypeScript: Production Engineering",
      "rationale": "High-priority blocking prerequisite.",
      "expected_readiness_boost": "+15% Readiness"
    },
    "secondary_actions": []
  },
  "insights": [],
  "reachable_jobs": {
    "tier_summary": {
      "ready_now": 3,
      "nearly_ready": 8,
      "skill_gap": 15,
      "future_target": 33
    },
    "total_opportunities": 59
  },
  "skill_graph": {
    "total_nodes": 10,
    "total_edges": 10,
    "unlocked_count": 6,
    "verified_count": 4,
    "nodes": [],
    "edges": []
  },
  "readiness_history": []
}
```

---

## 2. Career Goal Management

### `GET /student/career-goal`
Fetch the current student's target career goal.

### `POST /student/career-goal` / `PUT /student/career-goal`
Upsert or update career goal. Automatically triggers a historical readiness snapshot in `career_readiness_snapshots`.
**Payload:**
```json
{
  "target_role": "Frontend Developer",
  "secondary_target_role": "Full Stack Developer",
  "career_domain": "Frontend Engineering",
  "target_industry": "Technology",
  "preferred_location": "Remote",
  "experience_level": "entry",
  "target_timeline_weeks": 16
}
```

### `DELETE /student/career-goal`
Deletes the student's career goal.

---

## 3. Skill Graph & DAG Dependencies

### `GET /student/skill-graph`
Returns the topological directed acyclic graph (DAG) of prerequisites for the student's target role.
Nodes are annotated with dynamic DAG statuses:
- `VERIFIED`: Formally verified (confidence $\ge 70\%$).
- `IN_PROGRESS`: Currently being learned or practiced ($25\% \le$ confidence $< 70\%$).
- `AVAILABLE`: All prerequisites satisfied (confidence $\ge 50\%$), ready to learn.
- `LOCKED`: One or more prerequisites unfulfilled.

---

## 4. Learning & Project Progress

### `POST /student/learning/{id}/start`
Marks a curated learning resource as `started` in `student_learning_progress`.

### `POST /student/learning/{id}/complete`
Marks resource as `completed` (progress: 100%). Automatically records an event in `knowledge_evolution_events`.

### `POST /student/projects/{id}/start`
Initiates a capstone project blueprint (`in_progress`).

### `POST /student/projects/{id}/complete`
Submits tangible code evidence with a repository URL:
```json
{
  "repository_url": "https://github.com/student/capstone-project"
}
```
Records code evidence and an immutable evolution ledger entry.

---

## 5. Weekly Career Plan Operations

### `GET /student/weekly-plan`
Returns current Monday-Sunday 7-day personalized micro-tasks.

### `POST /student/weekly-plan/regenerate`
Re-balances and regenerates the weekly schedule based on recent gap progress.

### `POST /student/weekly-plan/task/{id}/toggle`
Toggles completion status (`is_completed`) of a micro-task.

### `POST /student/weekly-plan/task/{id}/skip`
Skips a task while preserving overall weekly time targets.

---

## 6. AI Career Coach Conversation

### `POST /career-coach/message`
Submit a question to the AI Career Coach.
**Payload:**
```json
{
  "message": "What should I focus on after completing React?"
}
```
**Response:**
```json
{
  "reply": "Based on your verified skills, your immediate priority is closing your prerequisite gap in TypeScript...",
  "recommended_next_action": "Master TypeScript: Core Mastery Guide",
  "skills_to_focus_on": ["TypeScript", "State Management"]
}
```
Messages are safely isolated within `<student_data>` XML delimiters and persistently logged in `career_coach_sessions` and `career_coach_messages`.
