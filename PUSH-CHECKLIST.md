# PUSH-CHECKLIST.md — what goes into git and GitHub, and what never does

Why this exists. On 2026-11-16 a provider API key reached GitHub. It came in with a third party skill copied from another project, sat in history for seven weeks, and was found only by a scan before the repository was first made public. The project documents had said it was removed. It had not been checked. This file is the rule set that makes that a blocked commit, not a finding after the fact.

The automated half is scripts/push-check.sh. It runs in three places, and a failure in any of them stops the change:
- the pre-commit hook, on what is staged;
- the pre-push hook, on every line the outgoing commits add;
- CI, on the whole tree and the whole history, for every push and pull request.

The hooks live in .githooks/ and are switched on once per clone, with `git config core.hooksPath .githooks`. CI catches a clone where that was skipped, but only after the push, so set it first.

The manual half is the checklists below. The script only finds patterns. A human or agent must still read what is going in.

## NEVER COMMITTED, NEVER PUSHED

Secrets and credentials, in any file, in any form, including docs, comments, examples, tests, and chat transcripts pasted into a file:
- .env files of any kind. The only exception is .env.example, with every value empty.
- API keys, secret keys, access tokens, refresh tokens, webhook secrets, database passwords, and connection strings with a password.
- Supabase secret and service role keys and personal access tokens; Plaid client secrets and access tokens; AWS keys; GitHub tokens; any other provider's key.
- Private keys, certificates with keys (.pem, .key, .p12, .pfx), and SSH keys.
- Staging or production values of any kind. They belong in Vercel and Supabase settings only (CLAUDE.md, separate environments).
- A placeholder that looks like a real value. Write ${NAME} or leave it empty.

Real people and their data:
- Any applicant's data, real or seeded from a real source; any real document (paystub, W-2, tax form, bank statement).
- An SSN other than 000-00-0000; a real account or routing number; a real address, phone number, or date of birth.
- Database exports or dumps, including of fairview-dev, and raw provider responses (Textract output, unredacted Plaid or payroll payloads).
- The user's own personal details: email, full name, and paths on their machine (anything under a Windows, macOS, or Linux home folder). Commit authorship uses the GitHub no-reply address.

Things the project rules forbid:
- A real place from the genericization rule, outside its four governance files (RULES.md has the exact check).
- The Upwork listing text, in any part. Only the genericized scope in MASTER-SPEC-1.md is committed.

Generated and local files:
- node_modules, .next, build output, coverage, test-results, playwright-report, and *.tsbuildinfo.
- Test evidence that is regenerated per run: tests/isolation/reports/ and tests/theming/screenshots/.
- Playwright traces and HAR files, since they hold session cookies and tokens.
- Logs, local databases, git bundles, and backups.
- Supabase CLI state (supabase/.temp, supabase/.branches) and .vercel.
- Local agent state: .claude/settings.local.json, .claude/projects/, memory files, and session scratchpad files.
- Editor and OS files.
- Anything over 5 MB.

Material from another project:
- Not copied in wholesale. A skill, config, or reference from another project is read line by line before it is staged. Anything this project does not use is left out, rather than kept and disabled, because unused files are where secrets hide (the 2026-11-16 key was in an image generation reference this project never used).
- Its install is recorded in MEMORY.md with what was removed and why.

## WHAT IS COMMITTED

- Application source (app, components, lib, proxy.ts), Edge Functions, and migrations.
- Tests and synthetic fixtures. Fixtures are made for this project, in the fictional jurisdiction, with obviously fake names and 000-00-0000.
- Project documents: specifications, rules, vetting and rework records, and MEMORY.md.
- .env.example with empty values; config with no secrets (supabase/config.toml reads secrets with env()).
- CI workflows, which reference GitHub secrets by name only.

## BEFORE EVERY COMMIT

[ ] `git status` and `git diff --cached` read in full. Every staged file is meant to be there.
[ ] No file staged with `git add -A` or `git add .` without reading the list it staged.
[ ] The pre-commit hook ran and printed "push-check: clean (staged)". If hooks are off, run `scripts/push-check.sh --staged`.
[ ] New third party material was read line by line (see above).
[ ] Related fixes go in one commit (RULES.md, commit discipline).

## BEFORE EVERY PUSH

[ ] Pushing to the intended remote and branch: `git remote -v` and `git status -sb`.
[ ] The pre-push hook ran and printed "push-check: clean (history)". If hooks are off, run `scripts/push-check.sh --history HEAD --not --remotes`.
[ ] Nothing uncommitted that the pushed state depends on.
[ ] A force push only with explicit approval, with --force-with-lease, and after a backup bundle.

## BEFORE A REPOSITORY IS CREATED, OR MADE PUBLIC

[ ] `scripts/push-check.sh --history --all` is clean. The whole history is public, not only the latest files.
[ ] Commits rewritten out of history are also gone from GitHub. GitHub keeps them, readable by hash, after a force push. Delete and re-create the repository, or have GitHub support purge them.
[ ] Every secret that was ever committed has been rotated, even if it was removed later.
[ ] The README and repository description contain nothing from the NEVER list.
[ ] The visibility change is the user's decision, confirmed at the time.

## IF SOMETHING SLIPS THROUGH

1. Stop pushing.
2. Rotate or revoke the secret first. Rotation is the fix; removal from git only limits future exposure, since it may already be copied.
3. Remove it from the files, and from history: back up with git bundle, rewrite, verify with `--history --all`, then force push with a lease.
4. Clear what GitHub still holds (see above).
5. Record it in SECURITY.md with the cause, and add a pattern or path to scripts/push-check.sh so the same class cannot pass again. Prove the new pattern fails on the original leak before relying on it.

## FALSE POSITIVES

A finding that is genuinely not a secret is added to .push-check-allow as an exact string, with a comment saying why. Never loosen a pattern to make one finding pass, and never allow-list a real value because it is "only dev" or "only sandbox".
