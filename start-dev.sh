#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"
exec npm run dev
