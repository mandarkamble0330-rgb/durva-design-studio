<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cloud Agent

Local development runs the Next.js app against a native Supabase stack. Docker is not required.

- Install: `bash .cursor/cloud-agent-install.sh`
- Start: `bash .cursor/cloud-agent-start.sh`
- Open http://localhost:3000 or http://127.0.0.1:3000. `allowedDevOrigins` includes `127.0.0.1` so dev assets and hot reload load from that host.
- The start script rewrites `.env.local` from `supabase status`. The local API port is assigned per stack.
- App SQL lives in `lib/supabase/migrations` and is copied into `supabase/migrations` on install.
- Local email confirmation is disabled, so a new account can sign in right away. The register page still shows its confirmation message.
- OpenRouter, Leonardo, and Blender are optional. Auth, projects, and the booth designer read path run without them.
