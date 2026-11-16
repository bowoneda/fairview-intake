#!/usr/bin/env bash
# push-check.sh: the automated half of PUSH-CHECKLIST.md. It fails (exit 1) on anything that must never reach git.
#
#   scripts/push-check.sh                 every tracked file as it is now (CI, and by hand)
#   scripts/push-check.sh --staged        what is staged for the next commit (the pre-commit hook)
#   scripts/push-check.sh --history ARGS  every line added by the commits ARGS selects, as git log takes them:
#                                         --all for the whole history, or "<sha> --not --remotes" (the pre-push hook)
#
# Allowed exceptions: .push-check-allow, one fixed string per line (# comments). A finding is skipped when its
# output line contains one of them. Every entry needs a comment saying why; review that file like code.
#
# Patterns that would match themselves are split into pieces, so this file passes its own check.
set -uo pipefail

mode="tree"
if [ "${1:-}" = "--staged" ]; then mode="staged"; shift
elif [ "${1:-}" = "--history" ]; then mode="history"; shift; fi
history_args=("$@")

cd "$(git rev-parse --show-toplevel)" || exit 2
fail=0
report() { echo "PUSH-CHECK FAIL [$1]"; echo "$2" | sed 's/^/  /'; fail=1; }

allow_filter() {
  if [ -f .push-check-allow ]; then grep -v -F -f <(grep -v -E '^[[:space:]]*(#|$)' .push-check-allow) || true
  else cat; fi
}

# ---------- 1. Paths that must never be tracked ----------
forbidden_paths='(^|/)\.env($|\.)|(^|/)\.env\.[^/]*$|\.(pem|key|p12|pfx|jks|keystore|bundle|har|dump|sqlite|db|log)$|(^|/)id_(rsa|ed25519|ecdsa)|(^|/)(node_modules|\.next|out|build|coverage|test-results|playwright-report|\.vercel|\.temp|\.branches)/|(^|/)tests/isolation/reports/|(^|/)tests/theming/screenshots/|\.tsbuildinfo$|(^|/)\.claude/(settings\.local\.json|projects/|memory/)|(^|/)\.claude/skills/[^/]+/references/gemini-image-gen\.md$|scratchpad|(^|/)trace\.zip$|(^|/)(Thumbs\.db|\.DS_Store)$'
allowed_paths='(^|/)\.env\.example$'

case "$mode" in
  tree)    paths=$(git ls-files) ;;
  staged)  paths=$(git diff --cached --name-only --diff-filter=ACMR) ;;
  history) paths=$(git log --format= --name-only --diff-filter=ACMR "${history_args[@]}" | sort -u) ;;
esac
bad=$(printf '%s\n' "$paths" | grep -E "$forbidden_paths" | grep -v -E "$allowed_paths" | allow_filter)
[ -n "$bad" ] && report "forbidden path" "$bad"

# ---------- 2. Size: nothing over 5 MB ----------
if [ "$mode" != "history" ]; then
  big=$(printf '%s\n' "$paths" | while IFS= read -r f; do
    [ -f "$f" ] && [ "$(wc -c < "$f")" -gt 5242880 ] && echo "$f"; done)
  [ -n "$big" ] && report "file over 5 MB" "$big"
fi

# ---------- 3. Content patterns ----------
# name|regex (ERE). Each is a class of thing that must never be committed, whatever the file.
rules=(
  "private key|-----BEGIN [A-Z ]*PRIV""ATE KEY"
  "Supabase secret key|sb_secret_[A-Za-z0-9_-]{8,}"
  "Supabase access token|sbp_[a-f0-9]{20,}"
  "JWT|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"
  "AWS access key id|(AKIA|ASIA)[0-9A-Z]{16}"
  "Plaid access token|access-(sandbox|development|production)-[a-f0-9]{8}-[a-f0-9-]{20,}"
  "GitHub token|(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})"
  "Twilio sid or key|(AC|SK)[a-f0-9]{32}"
  "Stripe, OpenAI or Anthropic key|((sk|rk|pk)_(live|test)_[A-Za-z0-9]{16,}|sk-(ant-)?[A-Za-z0-9_-]{24,})"
  "Google API key|AIza[0-9A-Za-z_-]{35}"
  "Slack token|xox[abprs]-[A-Za-z0-9-]{10,}"
  "Mapbox secret token|sk\.eyJ[A-Za-z0-9_-]{20,}"
  "long hex string (API keys of many providers)|(^|[^A-Za-z0-9])[a-fA-F0-9]{30,}([^A-Za-z0-9]|$)"
  "bearer token|[Bb]earer [A-Za-z0-9_.=-]{16,}"
  "quoted secret assignment|(key|secret|token|password|passwd|pwd|credential)s?[\"'\`]?[[:space:]]*[:=][[:space:]]*[\"'\`][A-Za-z0-9_/+.=-]{20,}[\"'\`]"
  "env style secret assignment|[A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|PASSWD)[A-Z0-9_]*=[^[:space:]\$<{\"'#]{12,}"
  "database URL with password|postgres(ql)?://[^:/[:space:]]+:[^@[:space:]]+@"
  "US SSN other than the 000-00-0000 test value|(^|[^0-9-])([1-8][0-9]{2}|0[1-9][0-9]|00[1-9])-[0-9]{2}-[0-9]{4}([^0-9-]|$)"
  "machine path|([A-Za-z]:\\\\Users\\\\|/c/U""sers/|/home/[a-z_][a-z0-9_-]*/|/Users/[A-Za-z][A-Za-z0-9._-]*/)"
)

# Emails: only reserved example domains, test domains, and the GitHub no-reply address.
email_re='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
email_ok='@(example\.(com|org|net)|[A-Za-z0-9.-]+\.(test|example|invalid|localhost)|users\.noreply\.github\.com|anthropic\.com)'

# The genericization check from RULES.md, same pattern and the same four excluded files.
generic_re="chi""cago|illi""nois|cook"" county"
governance='^(CLAUDE\.md|COLLABORATION-1\.md|MASTER-SPEC-1\.md|RULES\.md)$'

scan() { # $1 = regex, $2 = case flag ("-i" or ""); prints "file:line: text" or "commit file: text"
  local re="$1" ci="$2"
  case "$mode" in
    tree)   git grep -n -I $ci -E -e "$re" -- . ':!package-lock.json' ;;
    staged) git grep --cached -n -I $ci -E -e "$re" -- . ':!package-lock.json' ;;
    history)
      git log -p --no-color --no-ext-diff --format='@@COMMIT %h' "${history_args[@]}" -- . ':!package-lock.json' |
        RE="$re" CI="$ci" awk '
          /^@@COMMIT / { c = $2; next }
          /^\+\+\+ /   { f = substr($0, 7); next }
          /^\+/ { line = substr($0, 2); t = (ENVIRON["CI"] == "-i") ? tolower(line) : line
                  if (t ~ ENVIRON["RE"]) print c " " f ": " substr(line, 1, 160) }' ;;
  esac
}

for rule in "${rules[@]}"; do
  name="${rule%%|*}"; re="${rule#*|}"
  hits=$(scan "$re" "" | allow_filter | cut -c1-220)
  [ -n "$hits" ] && report "$name" "$hits"
done

hits=$(scan "$email_re" "" | while IFS= read -r line; do
  others=$(printf '%s\n' "$line" | grep -o -E "$email_re" | grep -v -E "$email_ok")
  [ -n "$others" ] && printf '%s\n' "$line"; done | allow_filter | cut -c1-220)
[ -n "$hits" ] && report "real email address (use example.com or a .test domain)" "$hits"

hits=$(scan "$generic_re" "-i" | GOV="$governance" awk '{
  split($0, a, ":"); f = a[1]; if (index(f, " ") > 0) { split(f, b, " "); f = b[2] }
  if (f !~ ENVIRON["GOV"]) print }' | allow_filter | cut -c1-220)
[ -n "$hits" ] && report "genericization (RULES.md)" "$hits"

if [ "$fail" -ne 0 ]; then
  echo
  echo "Blocked by scripts/push-check.sh. Read PUSH-CHECKLIST.md. A real secret is rotated first, then removed."
  exit 1
fi
echo "push-check: clean ($mode)"
