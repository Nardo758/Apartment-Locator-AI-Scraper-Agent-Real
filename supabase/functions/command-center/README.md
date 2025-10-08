This directory is the Command Center function. It re-uses the existing
implementations from `command-center` but exposes the function at
`/functions/v1/command-center`.

Deploy with:

supabase functions deploy command-center --no-verify-jwt
