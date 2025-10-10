#!/usr/bin/env bash
echo "Deploying command-center function"
supabase functions deploy command-center --no-verify-jwt
