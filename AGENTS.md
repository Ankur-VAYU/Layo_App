
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CRITICAL AUTHENTICATION RULE — DO NOT MODIFY
**STRICT REQUIREMENT:**
Do NOT modify, bypass, or alter the Sign-Up (`/signup`), Forgot Password / Reset Password (`/reset-password`), and Login (`/login`, `/ops/login`) authentication flows under any circumstance.
- The standard Supabase Auth + Resend SMTP verification email flow is permanently locked and working.
- Users must always sign up, verify emails, reset passwords, and authenticate using the existing production Supabase auth pipeline.
