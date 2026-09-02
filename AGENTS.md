# SkillBridge Developer & Agent Guidelines

SkillBridge is an enterprise skill-matching and placement platform with:
- **Frontend**: React 19 + TypeScript + Vite + TanStack Start + Tailwind CSS
- **Backend**: PHP 8.2+ REST API with PostgreSQL (Neon Cloud)
- **AI Intelligence**: Google Gemini 3.7 Flash (`gemini-3.7-flash`)

## Standards
- Keep TypeScript strict with zero type errors (`npx tsc --noEmit`).
- Ensure all API endpoints are authenticated with JWT and enforce strict RBAC/IDOR protections.
- Do not expose secret API keys or credentials in client-side code.
