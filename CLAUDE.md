# Project Rules

## CRITICAL AUTHENTICATION RULE — DO NOT MODIFY
**STRICT REQUIREMENT:**
Do NOT modify, bypass, or alter the Sign-Up (`/signup`), Forgot Password / Reset Password (`/reset-password`), and Login (`/login`, `/ops/login`) authentication flows under any circumstance.
- The standard Supabase Auth + Resend SMTP verification email flow is permanently locked and working.
- Users must always sign up, verify emails, reset passwords, and authenticate using the existing production Supabase auth pipeline.
