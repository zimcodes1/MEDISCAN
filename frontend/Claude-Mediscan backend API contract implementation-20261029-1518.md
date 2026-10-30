# Mediscan backend API contract implementation

**Created:** 10/19/2026 11:50:52  
**Updated:** 10/29/2026 15:13:18  
**Exported:** 10/29/2026 15:18:00  
**Link:** [https://claude.ai/chat/578b9fa4-28bd-4fe4-b52c-4034d02a166a](https://claude.ai/chat/578b9fa4-28bd-4fe4-b52c-4034d02a166a)  

## User:

> 10/19/2026 11:50:52

> File: backend-upload.zip

> File: api-contract.md

```text
i need help refactoring the UI for mediscan

Ran 6 commands, shared files
Slice B is in step6-reports.patch. It applies after step 5 (14 files, none skipped), and the whole patch chain re-applies cleanly from your step-1 tree. Type-check, build and lint are clean, and the stand-in is still absent from the production bundle. 25 behaviour tests pass for the form mapping, submit rules and the stand-in’s report endpoints. Render tests pass with the reports flag both on and off. I haven’t opened it in a browser.

Contract change
Your existing report form is structured: lung fields, side, severity, impression, recommendation and AI agreement. My contract only had three free-text fields, so saving would have thrown most of it away. Contract v3 (section 7) now stores the form as it is, plus a per-finding flagged flag used by the report header. Replace your committed docs/api-contract.md with the new file.

What the patch does
/scans/:id/report:
It loads or starts the report for a scan, using your existing form blocks with the sample data replaced.
Save Draft stores a draft, and Submit stores it and finalises it.
Submitting needs a primary impression, a recommended action, and your agreement with the AI (with a reason if you disagree or partly agree), plus the confirmation checkbox. These rules are my choice, so tell me if you want more required, such as detailed findings.
A finalised report becomes a read-only, printable document, and edits are rejected.
/patient-reports: a real list with All, Drafts and Submitted tabs.
Open Report: the analysis page’s “Write Report (coming soon)” button is now a live Open Report link.
Finalising a report marks its scan reviewed.
Removed:
The two sample-data report pages and the /patient-reports/:id route.
The Export PDF button, which did nothing. Print, then Save as PDF, works.
The hardcoded “MD” credentials. The header shows “MediScan NG” until organisation settings exist (Slice C).
Patient names. Only a patient code is stored, so the report shows that, and the AI “confidence” wording is now “model score (raw output)”.
Try it
Your stand-in (VITE_API_SHIM=1) already covers reports, so just apply the patch and restart:

bash
cd ~/Documents/MEDISCAN
git apply -v --directory=frontend frontend/step6-reports.patch > /tmp/apply6.log 2>&1; echo "exit: $?"
echo "applied: $(grep -c 'Applied patch' /tmp/apply6.log)  skipped: $(grep -c Skipped /tmp/apply6.log)"
Expect applied: 14  skipped: 0. Then:

Open a scan and click Open Report.
Fill in part of the form and save a draft. Reload and check it comes back.
Try to submit with the AI-agreement fields empty and check the missing-field list.
Complete it and submit. You should land on the printable document, and the scan should show as reviewed.
Check /patient-reports for the tabs.
When your backend implements section 7, set VITE_REPORTS=1 in .env.local instead of using the stand-in.

Backend note
A finalised report can’t be edited, which is right as a default. Clinically you’ll eventually want an addendum or amendment workflow, so leave room for that when you design the report table.

Commit when it checks out:

bash
git add frontend/src
git commit -m "Reports: structured editor, drafts, submit, list, printable view (dev shim)"
Next is Slice C, the organisation work: organisation signup, invitations, profile, avatar and organisation settings. It’s the biggest slice because it replaces the staff approval screen. The other option is to start the backend now, since the contract for scans and reports is settled. Which do you want first?


Step6 reports
PATCH 

Api contract
Document·MD 
will it be better to start off the backend now

Listing exact backend files and a safe upload command.
Yes, I’d start the backend now. Slices A and B are built against a contract and a stand-in, and none of it has met a real backend. The longer the integration waits, the more assumptions pile up. The riskiest part of the design is organisation scoping, which touches every query, so it should be done early in the backend. Slice C would also be better built against a real backend than a third round of stand-in code.

I’d work in this order:

Organisations foundation. This is mostly invisible to the frontend, which keeps working as is.
Add an organisations table and organisation_id on users, patients and scans.
Add a migration that backfills your existing rows into one default organisation.
Add the radiologist role.
Scope every existing route to the caller’s organisation, returning 404 for other organisations’ data.
Add isolation tests, such as “user in organisation A cannot see B’s patient”.
Scan workflow (contract sections 1 to 6). When it’s done, set VITE_SCAN_WORKFLOW=1 and remove the stand-in for those endpoints.
Reports (section 7), then VITE_REPORTS=1.
Organisation registration, invitations, organisation settings, profile and avatar, followed by frontend Slice C, built against the real thing.
I’m doing the foundation first because scoping retrofitted after the scan fields would mean rewriting the same queries twice.

Two precautions before we touch it:

Version control. Check whether the backend is in git anywhere: git log --oneline --all -- build/space/backend/main.py | head -3. If that prints nothing, commit a baseline of build/space first so every change we make is a reviewable diff. Leave out .env, dev.db and __pycache__.
Neon. Run the migration on a Neon dev branch first, never straight against production. Create the branch from schema only, with no patient rows.
To send me the code, this zip leaves out secrets, caches, databases and model weights. Run it from the repo root:

bash
cd ~/Documents/MEDISCAN
zip -r backend-upload.zip build/space/backend build/space/migrations build/space/alembic.ini \
  build/space/requirements.txt migrations tests \
  -x "*/__pycache__/*" "*.pyc" "*.env" "*/.env" "*.db" "*/storage_data/*" "*.pt" "*.pth" "*.onnx" "*.safetensors"
It covers the models, schemas, routers, services and core/, which holds auth, dependencies and settings and is where scoping will live. It also covers the Alembic migrations (you have two migrations/ folders, so tell me which one is live) and your tests. Check the zip with unzip -l backend-upload.zip | grep -i env to confirm no .env file slipped in, then upload it.

Once I have it, I’ll start with phase 1. I’ll write the patch, test the migration up and down on SQLite from your code, and write the isolation tests. I can’t test Postgres from here, so the Neon dev-branch run will be yours.
```

i'm refactoring the UI for the mediscan project iv'e reached features that need rows that have not been added to the backend yet so that's what i plan on doing now here's the new api contract and also all the code for the backend go through it    iv'e also attached a summary of the recent changes made  it's the pasted text

## Assistant:

> 10/19/2026 11:52:07

> Flagging the org-wide scan leak and prioritizing visibility questions.
>
> - Reviewing backend code against the updated API contract.
> - Reading memory
> - List contents of uploaded backend zip and check for env files
> - Read models, schemas, core, main
> - Read routers and services
> - Assembling the project structure and checking included files.
> - Read migrations, config, create_admin, requirements
> - Flagging the org-wide scan leak and prioritizing visibility questions.
> - **Done**

I've read the whole backend and the contract, so I'm now checking the two against each other.

> Used tool
>
> - Adding to memory
> - **Done**

I've been through all 43 backend files and the contract. The zip has no `.env`; the only match was `migrations/env.py`. Two things about the upload: the `tests/` folder came through empty, so there is no test setup yet, and only `build/space/migrations` was included. That one is the live one, because `alembic.ini` points `script_location` at it.

## A leak you have today

`scan_service.list_all_scans` has no filter at all. `GET /scans` returns every scan in the database to any logged-in user. The single-scan route is guarded and the list route is not. I'd fix this first, since it exists before any organisation work.

## What the contract changes in the code

- **Scoping:** `get_accessible_patient` and `get_accessible_scan` are the choke points. Putting `organisation_id` checks there covers patients, scans, images and heatmaps. The list queries and `/admin/*` need their own filters, because they don't go through those functions.
- **Ownership rule conflict:** today clinicians only see patients they created. Contract section 0 and the dashboard stats are org-wide, and "any user may mark reviewed" assumes radiologists can see scans they didn't upload. I'd make visibility org-wide and drop the `created_by_id` filter. **This is the one decision I need from you.**
- **Self-registration:** `POST /auth/register` creates users with no organisation, so it has to go. Invites and `register-organisation` replace it. Your existing pending users stay in the default organisation.
- **Suspension:** `get_current_user` should also reject users whose organisation isn't `active`. The contract doesn't say this, but without it suspending an organisation does nothing for users who are already signed in.
- **Platform admin:** with `organisation_id` NOT NULL, the platform admin has to belong to some organisation. I'd put them in the default one. `/platform/*` is the only code that crosses organisations, so it gets its own dependency, and a platform admin gets no access to other organisations' patient data.
- **Migration 0003:** it needs `batch_alter_table` for SQLite. The steps are create `organisations`, insert the default row, add `organisation_id` as nullable, backfill, then set NOT NULL and add the indexes, with a full downgrade.
- **Deploy order:** the new code can't run against the old schema. Run the migration on a Neon dev branch first, then production, then deploy.
- **Duplicated `organisation_id`:** it lives on users, patients and scans. I'd set it on a scan from its patient on save and never from request input, so the two can't disagree.

## Gaps and ambiguities in the contract

1. **Activity feed:** there is no table behind it. `audit_logs` records views and logins with IPs and has no organisation or readable message. I'd add a separate `activities` table written at event time.
2. **Flagging in SQL:** `flagged` is computed, but `/dashboard/stats` has to count it. I'd build one condition from `FLAG_THRESHOLDS` and use it in both the schema and the stats query. The thresholds ship as placeholders until a clinician signs them off. TB is experimental, so it never flags.
3. **"Today" in Africa/Lagos:** Lagos is a fixed UTC+1, so it's easy. I'd add `tzdata` to `requirements.txt` in case the host lacks zone data.
4. **Reports table:** `lung_fields` goes in a JSON column, which works on SQLite and Postgres. `scan_id` gets a unique constraint, and I'd handle two simultaneous first saves. Addenda later can be a separate table.
5. **Un-reviewing:** the contract doesn't say whether `review_status` can go back to `pending`. My default is that it can't once a final report exists.
6. **Password change:** it revokes all refresh tokens, including the caller's own. I'll return 204 and have the frontend sign the user out, unless you'd prefer a fresh token pair.
7. **Invite tokens:** I'd store only the hash, like refresh tokens. The raw token and `invite_url` appear once at creation, so `GET /org/invites` can't show them. That needs a `FRONTEND_URL` setting.
8. **Avatars:** images can't carry a Bearer header, so the frontend has to fetch them as a blob like scan images. I'd reuse `validate_image`, resize, and store under `avatars/`.
9. **`GET /scans` filters:** the contract lists no filters (review status, priority, assignee, flagged). The UI probably needs some, so tell me what it sends.
10. **Smaller points:**
    - Escape `%` and `_` in the patient `q` search.
    - Add rate limits to `register-organisation`, `accept-invite` and password change.
    - Make the last-admin check race-safe.
    - Apply `default_priority` and `auto_assign_to_id` only when the form field is omitted.

## Proposed order

1. Add `tests/` with a SQLite + fake-storage conftest, plus the organisations migration, the `radiologist` role, scoping, the `list_all_scans` fix, and isolation tests (org A can't see org B's patients, scans, images or heatmaps).
2. Scan fields, flagging, `PATCH`, `/staff`, stats, activity.
3. Reports.
4. Org registration, platform approval, invites, profile, avatar, settings.

Should clinicians see all patients in their organisation, as I'd recommend, or only their own? Everything else I'll do as described above unless you object, and I can start step 1 as soon as you answer.

## User:

> 10/19/2026 11:54:55

clinicians should see all patients in their organisation

## Assistant:

> 10/19/2026 11:58:17

> Checking whether earlier file and code changes actually took effect.
>
> - Designing cross-organisation data isolation and access-control test cases.
> - Adding to memory
> - Inspect validation/storage builders and install deps
> - Install deps and init a baseline git repo for diffing
> - Baseline commit and model changes
> - Debugging a shell command chain that stops partway through.
> - Check state after failed baseline commit
> - Checking whether earlier file and code changes actually took effect.
> - **Done**

The baseline commit failed on a bad flag, so I'm re-creating a clean copy of your original code to diff against, then checking which model edits landed.

> Verifying test coverage by checking a reverted filter.
>
> - Create pristine baseline copy and see which edits applied
> - Adding default organisation settings across services and configuration.
> - Apply scoping changes to services, deps, routers
> - Designing admin role rules and patient access checks.
> - Write migration 0003, update create_admin, seed old schema
> - Test migration up/down/up with seeded data and run alembic check
> - Setting up tests and configuration for the migration work.
> - Write test harness, isolation and migration tests, run them
> - Diagnosing a login test failure from an invalid email domain.
> - Fix test email domains and rerun all tests
> - Verifying test coverage by checking a reverted filter.
> - **Done**

All 21 tests pass. I'm now checking that the isolation tests really fail if the scoping is removed, then I'll package the changes as a patch.

> Preparing a build diff excluding cache and test artifacts.
>
> - Mutation check: confirm tests fail when scoping is removed
> - Preparing a build diff excluding cache and test artifacts.
> - Build the patch and verify it applies to the original zip and tests pass
> - Rebuild patch without rsync and verify it applies cleanly
> - Presenting file(s)...
> - **Done**

Phase 1 is done. The patch is `backend-phase1-organisations.patch`: 18 files, applied cleanly to a fresh copy of your zip, and all 21 tests pass on SQLite. I haven't run it against Postgres or Neon.

## What changed

- **Organisations:** there is a new `organisations` table. `users`, `patients` and `scans` each have `organisation_id`, and users also have `is_platform_admin`. `UserRole.radiologist` exists.
- **Visibility is org-wide:** clinicians now see every patient and scan in their organisation. A `created_by_id` is kept only for attribution.
- **Scoping:** patients, scans, images, heatmaps, `GET /scans` and `/admin/*` all filter by the caller's organisation. Another organisation's data returns 404, identical to a missing record.
- **The `GET /scans` leak is fixed.**
- **Scan organisation:** a scan's `organisation_id` is copied from its patient on save, never from request input.
- **Suspended or pending organisations:** their members are locked out on every request, and login and refresh reject them.
- **Migration 0003:** it creates a "Default Organisation" (active) and puts all existing users, patients and scans in it, then makes the column NOT NULL. I ran it up, down and up again with seeded rows on SQLite, and `alembic check` shows no drift from the models.
- **Tests:** `tests/` was empty, so I added the harness (SQLite, temp storage, mock inference). It has 20 isolation tests and a migration test. I confirmed the tests are meaningful: when I removed the scoping from two queries, 5 of them failed.

## Things to know

- **Interim signup:** `POST /auth/register` still works, because your frontend signup uses it. It now puts new users into the default organisation as pending, for that organisation's admin to approve. I'll remove it in phase 4 when invitations arrive.
- **Default organisation name:** the migration and `DEFAULT_ORGANISATION_NAME` must match. Don't rename it before phase 4.
- **Platform admin:** nobody has the flag yet. For your own account you can run `python -m backend.scripts.create_admin ... --platform-admin`, but that creates a new user. Tell me if you'd rather have a one-off script to flag an existing admin.
- **Neon first:** run `alembic upgrade head` on a schema-only dev branch first, then production, and only then deploy, because the new code can't run on the old schema.

## Apply it

```bash
cd ~/Documents/MEDISCAN
git apply -v backend-phase1-organisations.patch
cd build/space && python -m pytest -q
```

Next is phase 2: scan fields, flagging, `PATCH /scans`, `/staff`, stats and activity. Say if you want me to start.

> File: [/mnt/user-data/outputs/backend-phase1-organisations.patch](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/578b9fa4-28bd-4fe4-b52c-4034d02a166a/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fbackend-phase1-organisations.patch)

## User:

> 10/19/2026 12:14:35

i'm currently on a new branch because i'm fixing the UI should i just continue from this same branch for the backend changes

## Assistant:

> 10/19/2026 12:14:46

> Working out whether to return to the backend branch.
>
> - Working out whether to return to the backend branch.
> - **Done**

I'd use a separate branch for the backend work. It's a different kind of change from the UI fixes. The patch only touches `build/space/`, so it won't conflict with your `frontend/` edits, but it has its own deploy order (migration on Neon first, then deploy). It's easier to review, test and revert when it isn't mixed in with UI commits.

Base it on whichever branch your API deploys from, not on the UI branch, or it will carry your unfinished UI changes. A git worktree gives you that without switching branches or touching your UI working tree:

```bash
cd ~/Documents/MEDISCAN
git worktree add ../MEDISCAN-backend -b backend-orgs backend   # replace `backend` with your deploy branch
cd ../MEDISCAN-backend
git apply --check ~/path/to/backend-phase1-organisations.patch   # dry run first
git apply -v ~/path/to/backend-phase1-organisations.patch
cd build/space && python -m pytest -q
git add -A && git commit -m "Organisations foundation: tenancy scoping, migration 0003, isolation tests"
```

- **`.env` is missing in the worktree:** git doesn't copy ignored files like `.env`, `dev.db` or `storage_data/`. Copy your `.env` into `build/space/` before running anything other than the tests. The tests set their own environment, so they run without it.
- **If `--check` fails:** the branch's `build/space` differs from the version you zipped. Send me the error and I'll rebase the patch onto it.
- **Merging later:** when the backend is ready, merge `backend-orgs` into the deploy branch and the UI branch into main separately. Turning on the frontend flags (`VITE_SCAN_WORKFLOW` and the others) then needs both.

## User:

> 10/19/2026 12:56:49

so this worktree is sort of a workaoround for the branches then

## Assistant:

> 10/19/2026 12:56:53

> Explaining how parallel checkouts work without switching branches.
>
> - Explaining how parallel checkouts work without switching branches.
> - **Done**

Kind of, yes. It's a standard git feature, not a hack. It exists for this situation: you need a second branch checked out at the same time without disturbing the first.

A normal branch switch swaps the files in one folder. With your UI work half-finished, you'd have to commit it or stash it first, and then switch back afterwards. A worktree gives the `backend-orgs` branch its own folder (`../MEDISCAN-backend`) that shares the same git history. Your UI branch stays checked out in the original folder, untouched, and you can have an editor open on each.

A few details:
- Each branch can only be checked out in one worktree at a time. Git will refuse if you try to check out `backend-orgs` in two places.
- Commits made in either folder go into the same repository, so merging and pushing work as usual.
- The second folder starts without ignored files like `.env`. Copy those across, as I mentioned.
- When the backend work is merged, `git worktree remove ../MEDISCAN-backend` deletes the folder and leaves the branch intact.

If you'd rather not use a worktree, the plain alternative is to commit your UI work, switch to a backend branch, apply the patch, commit, and switch back. It works fine, but it means switching every time you move between the two.

## User:

> 10/19/2026 12:57:46

i'll just use the worktree then

## Assistant:

> 10/19/2026 12:57:50

> Weighing whether to record the branch workflow preference.
>
> - Weighing whether to record the branch workflow preference.
> - Adding to memory
> - **Done**

Good. Once the patch is applied and committed in the worktree, tell me how the tests go. If `git apply --check` complains, paste the error and I'll adjust the patch.

When you're ready for phase 2 (scan fields, flagging, `PATCH /scans`, `/staff`, stats and activity), I'll build it on top of this branch.

## User:

> 10/19/2026 13:00:58

cd ~/Documents/MEDISCAN
git worktree add ../MEDISCAN-backend -b backend-orgs backend   # replace `backend` with your deploy branch
cd ../MEDISCAN-backend
git apply --check ~/path/to/backend-phase1-organisations.patch   # dry run first
git apply -v ~/path/to/backend-phase1-organisations.patch
cd build/space && python -m pytest -q
git add -A && git commit -m "Organisations foundation: tenancy scoping, migration 0003, isolation tests"     what do you mean i should replace backend with my deploy branch

## Assistant:

> 10/19/2026 13:01:02

> Explaining the git worktree command's starting branch argument.
>
> - Explaining the git worktree command's starting branch argument.
> - **Done**

The last word on the first command, `backend`, is the branch the new `backend-orgs` branch starts from. The full form is:

```bash
git worktree add <folder> -b <new-branch-name> <start-from-branch>
```

I wrote `backend` because you've worked on a branch with that name, so it may already be correct. Replace it only if the code you deploy to FastAPI Cloud comes from a different branch. You want to start from the branch that has your latest working backend, and not from the UI branch you're on now, because that would carry your unfinished UI changes into the backend work.

To check, run this in `~/Documents/MEDISCAN`:

```bash
git branch -a      # lists your branches; the current one has a *
git log --oneline -3 backend   # confirms `backend` has your recent backend commits
```

If `backend` is the branch with your recent backend commits, run the command exactly as written.

The `~/path/to/backend-phase1-organisations.patch` line is also a placeholder. Use the real location of the downloaded file, for example `~/Downloads/backend-phase1-organisations.patch`.

## User:

> 10/19/2026 13:11:54

the backend branch contains the recent backend commits so i'll just run the commands as they are

## Assistant:

> 10/19/2026 13:11:57

> Summarizing results and flagging the patch path caveat.
>
> - Summarizing results and flagging the patch path caveat.
> - **Done**

Yes, run them as written. You only need to put the real path to the patch file in the two `git apply` lines.

You should see:
- **`git apply --check`:** no output, which means it will apply.
- **`git apply -v`:** 18 lines starting with "Applied patch".
- **`pytest`:** `21 passed`.

The tests need `pytest`, `pytest-asyncio`, `aiosqlite` and `email-validator` in your Python environment. They're all in `requirements.txt`, so if you get an import error, run `pip install -r requirements.txt` first.

If any step prints something different, paste the output and I'll sort it out. If everything passes, say so and I'll start phase 2.

## User:

> 10/19/2026 13:22:17

~/Documents/MEDISCAN/frontend$ cd ..                  
git worktree add ../MEDISCAN-backend -b backend-orgs backend   # replace `backend` with your deploy branch
cd ../MEDISCAN-backend
git apply --check backend-phase1-organisations.patch   # dry run first
git apply -v backend-phase1-organisations.patch
cd build/space && python -m pytest -q
git add -A && git commit -m "Organisations foundation: tenancy scoping, migration 0003, isolation tests"
Preparing worktree (new branch 'backend-orgs')
HEAD is now at c9b4c95 chore: ignore local config and docs files
error: can't open patch 'backend-phase1-organisations.patch': No such file or directory
error: can't open patch 'backend-phase1-organisations.patch': No such file or directory
bash: cd: build/space: No such file or directory
On branch backend-orgs
nothing to commit, working tree clean

## Assistant:

> 10/19/2026 13:22:31

> Checking whether the ignore rules keep build files untracked.
>
> - Checking whether the ignore rules keep build files untracked.
> - **Done**

Two separate problems, and both are harmless: nothing was applied and nothing was committed. The worktree itself was created fine.

**1. The patch isn't in the folder you ran from.** The `git apply` lines look for the file in the current directory. Find where you saved it and give the full path:

```bash
ls ~/Downloads/backend-phase1-organisations.patch    # or: find ~ -name 'backend-phase1-organisations.patch' 2>/dev/null
```

**2. `build/space` doesn't exist in the worktree.** The `cd build/space` error means your `backend` branch doesn't track that folder. A worktree only contains tracked files, so the folder is probably untracked or hidden by a `.gitignore` rule. The `chore: ignore local config and docs files` commit may be related. Check from the main folder:

```bash
cd ~/Documents/MEDISCAN
git ls-files build/space | head -3                    # empty = not tracked on your current branch
git -C ../MEDISCAN-backend ls-files build/space | head -3
git check-ignore -v build/space/backend/main.py       # prints the .gitignore rule hiding it, if any
```

Please paste what those print before you continue. If `build/space` really is untracked, don't copy the whole folder into the worktree yet. It contains your `.env`, `dev.db`, `storage_data/` and model weights, which must never be committed. Which of them are ignored decides how to bring in the code safely.

Whichever way it turns out, the patch needs a baseline in git to apply against. Once I see the output, I'll give you exact commands that make that baseline commit without secrets. They'll also confirm that `backend/models/` is included, since you hit that ignore problem on an earlier deploy and the patch adds a new file there.

## User:

> 10/19/2026 13:27:00

ls ~/Downloads/backend-phase1-organisations.patch    # or: find ~ -name 'backend-phase1-organisations.patch' 2>/dev/null
/home/vincent/Downloads/backend-phase1-organisations.patch
 cd ~/Documents/MEDISCAN
git ls-files build/space | head -3                    # empty = not tracked on your current branch
git -C ../MEDISCAN-backend ls-files build/space | head -3
git check-ignore -v build/space/backend/main.py       # prints the .gitignore rule hiding it, if any
build/space/backend/routers/scans.py
build/space/backend/services/scan_service.py

## Assistant:

> 10/19/2026 13:27:11

> Untangling which git branch actually tracks the backend code.
>
> - Untangling which git branch actually tracks the backend code.
> - **Done**

Your output doesn't say which command printed those two lines. My reading is that your UI branch tracks only `scans.py` and `scan_service.py` under `build/space`, and the `backend` branch tracks nothing there, because the worktree has no `build/space` folder. That means the backend code on your `backend` branch is probably at a different path, and `build/space` may be a staging copy. Please don't copy `build/space` into the worktree yet, since it holds your `.env` and databases.

Please run this and paste the result:

```bash
cd ~/Documents/MEDISCAN
git branch --show-current
git ls-tree -r --name-only backend | grep -E '(^|/)(main\.py|alembic\.ini|requirements\.txt)$'
git log --oneline --all -- build/space | head -5
```

The second command shows where `main.py` and `alembic.ini` live on the `backend` branch. If they're at the repo root (`backend/main.py`), the patch paths need to change. I'll regenerate the patch for the right layout, so don't try to force it to apply.

For later, the patch is at `/home/vincent/Downloads/backend-phase1-organisations.patch`.

## User:

> 10/19/2026 13:28:40

git branch --show-current
git ls-tree -r --name-only backend | grep -E '(^|/)(main\.py|alembic\.ini|requirements\.txt)$'                                                                  git log --oneline --all -- build/space | head -5
step1-foundation
alembic.ini
backend/main.py
requirements.txt
222ec43 feat(api): allow listing scans without patient_id; add list_all_scans service

## Assistant:

> 10/19/2026 13:28:52

> Comparing repository layouts to resolve a file path mismatch.
>
> - Comparing repository layouts to resolve a file path mismatch.
> - **Done**

That clears it up: on your `backend` branch the project sits at the repo root (`backend/main.py`, `alembic.ini`, `requirements.txt`), not under `build/space/`. The `build/space/` prefix in my patch comes from the zip layout. You don't need a new patch, because git can strip that prefix. `-p3` removes `a/build/space/`, so `build/space/backend/main.py` becomes `backend/main.py`.

From the worktree, run these as a dry run first:

```bash
cd ~/Documents/MEDISCAN-backend
git apply --check -p3 ~/Downloads/backend-phase1-organisations.patch
ls migrations/versions tests 2>&1 | head -20
```

Please paste the output of both. I'm asking because the patch assumes two things I can't see from here:

- **Migration chain:** the new `0003` file sets `down_revision = "0002"`. If your root `migrations/versions/` has a different head, Alembic will fail with multiple heads or a missing revision.
- **Existing `tests/`:** the patch adds `tests/conftest.py`, `pytest.ini` and two test files. If your root `tests/` already has a `conftest.py`, the patch will refuse to apply over it.
- **Code drift:** your root `backend/` may differ slightly from the `build/space/backend` copy you zipped. If `--check` reports a failed hunk, it names the file, and I'll rebase the patch onto your real code.

If `--check` prints nothing and the `ls` looks compatible, apply it and run the tests:

```bash
git apply -v -p3 ~/Downloads/backend-phase1-organisations.patch
python -m pytest -q
```

If that works, commit with the same message as before.

## User:

> 10/19/2026 13:31:27

cd ~/Documents/MEDISCAN-backend
git apply --check -p3 ~/Downloads/backend-phase1-organisations.patch
ls migrations/versions tests 2>&1 | head -20
error: patch failed: backend/core/config.py:36
error: backend/core/config.py: patch does not apply
error: patch failed: backend/services/scan_service.py:99
error: backend/services/scan_service.py: patch does not apply
error: pytest.ini: already exists in working directory
error: tests/conftest.py: already exists in working directory
migrations/versions:
20260930_0001_initial_schema.py
20260930_0002_add_user_approval.py

tests:
conftest.py
helpers.py
test_auth.py
test_config.py
test_deploy_files.py
test_health.py
test_images.py
test_imaging.py
test_models.py
test_predict.py
test_rate_limit.py
test_remote_inference.py
test_reset_password.py
test_storage.py
test_torch_inference.py

## Assistant:

> 10/19/2026 13:31:36

> Comparing the snapshot repo against the actual codebase's drift.
>
> - Comparing the snapshot repo against the actual codebase's drift.
> - **Done**

Nothing was applied, so your branch is untouched. The errors show that the code I reviewed isn't your current backend.

The zip came from `build/space/`, and your repo root is the live version. It has files my copy lacked: `test_reset_password.py`, `test_remote_inference.py`, `test_torch_inference.py`, `test_deploy_files.py`, and a `tests/helpers.py`. It also has a different `config.py` and `scan_service.py`. The `build/space` copy was an older snapshot.

That affects more than this patch. My review notes were all about the older copy, so I need to redo them against the real code. The two files that failed to apply (`config.py` and `scan_service.py`) are likely where the remote inference and reset-password work landed. Your existing `pytest.ini` and `conftest.py` also mean my test harness has to merge into yours. Your existing tests probably create users without an `organisation_id`, and that column is now NOT NULL, so they will need updating too.

Please send a fresh zip of the real code. `git archive` only includes tracked files, so `.env` and databases can't slip in:

```bash
cd ~/Documents/MEDISCAN-backend
git archive --format=zip -o ~/backend-current.zip HEAD
unzip -l ~/backend-current.zip | grep -iE '\.(env|db|pt|pth|onnx|safetensors)$'   # should print nothing
```

Upload `~/backend-current.zip` here. If the zip is very large, tell me and I'll give you a narrower command. I'll rebuild phase 1 against that code, adapt your existing tests, and send a patch that applies at the repo root with no `-p3` needed.

## User:

> 10/19/2026 14:46:36

> File: backend-current.zip

i created the build directory when i was making changes to the UI and didn't want the test data from the development to affect the deployed backend and also the database i guess i'll just go with your recent suggestion

## Assistant:

> 10/19/2026 14:46:52

> Comparing timestamps across repository versions to find discrepancies.
>
> - Comparing the extracted files against the previous version.
> - Extract current backend and diff against the older build/space copy
> - Comparing project structure and migration files for differences.
> - View diffs of changed backend files
> - Comparing timestamps across repository versions to find discrepancies.
> - Inspect existing test harness and deploy config
> - **Done**

## User:

> 10/20/2026 9:49:53

Continue

## Assistant:

> 10/20/2026 9:53:28

> Reviewing project context before preparing the final response.
>
> - Seeding default organisations so registration and user helpers work.
> - Baseline test run of the real backend
> - Apply old patch with reject to see what conflicts
> - Reviewing patch hunks and tenancy configuration changes.
> - Resolve rejects: config and check scan_service state
> - Adding org-scoped scan listing and loosening patient ID requirements.
> - Add list_all_scans, adapt test harness and isolation tests, run full suite
> - See all failing existing tests and the ownership test
> - Fixing failing tests that construct models without an organization.
> - Updating existing tests to match new org-wide access rules
> - View failing tests to adapt
> - Adjusting test fixtures to separate clinicians across organisations.
> - Find direct model constructions in test_models
> - Adapt existing tests to organisations and org-wide visibility
> - Run the full suite after adapting tests
> - Verifying test suite results and rechecking mutation coverage.
> - Mutation check, rerun, and alembic drift check on the real code
> - Preparing and verifying the organisations patch file.
> - Build v2 patch at repo-root paths and verify on pristine zip
> - Reviewing project context before preparing the final response.
> - **Done**

The v2 patch applies cleanly to your real code and all 205 tests pass. I'm saving a note about the repo layout and then handing over the file.

> Presented file, used tool
>
> - Adding to memory
> - Presenting file(s)...
> - **Done**

I've rebuilt phase 1 against your real code. The new file is `backend-phase1-organisations-v2.patch`. It applies at the repo root with no `-p` flag, touches 22 files, and the full suite passes: 205 passed, 1 skipped, against 184 passed before. Use this one and ignore the earlier patch.

## A correction to my earlier review

I said `GET /scans` leaked every scan to every user. That was true of the `build/space` copy, but not of your `backend` branch. There the route still requires a `patient_id`, so there was no leak. The patch adds the org-wide version, because your UI calls `GET /scans` without a patient, and it is scoped to the caller's organisation from the start. It accepts an empty or `"null"` `patient_id` for the same reason your dev copy did.

## What's in it

- **Everything from the first patch:** the `organisations` table and `organisation_id` on users, patients and scans. It also adds the `radiologist` role, org-scoped patients, scans, images, heatmaps and `/admin/*` (other organisations get 404), and lockout for suspended organisations on every request, login and refresh. Migration 0003 backfills one active "Default Organisation".
- **Your test harness kept:** I extended your `conftest.py` and `helpers.py` instead of replacing them. The `db` fixture now seeds the default organisation, and `make_user` and `token_for` accept an optional `org`.
- **Existing tests updated:** seven in `test_models.py` and four in `test_images.py` and `test_predict.py` that asserted the old "clinicians only see their own patients" rule. They now check that a colleague in the same organisation can see the patient and another organisation gets 404.
- **New tests:** 20 isolation tests and one migration test (backfill, NOT NULL, clean downgrade, run on SQLite). I confirmed they bite: with the scoping removed from three queries, 10 of them fail. `alembic check` reports no drift between models and migrations.

## Apply it

```bash
cd ~/Documents/MEDISCAN-backend
git apply --check ~/Downloads/backend-phase1-organisations-v2.patch
git apply -v ~/Downloads/backend-phase1-organisations-v2.patch
python -m pytest -q
git add -A && git commit -m "Organisations foundation: tenancy scoping, migration 0003, isolation tests"
```

Expect 22 "Applied patch" lines and `205 passed, 1 skipped`.

## Before this reaches production

1. **Neon dev branch first:** run `alembic upgrade head` there and check that the old rows landed in "Default Organisation". Then run it on production, and deploy the code only after that.
2. **Don't rename the default organisation:** the migration and the `DEFAULT_ORGANISATION_NAME` setting must match until phase 4 removes `/auth/register`.
3. **Your platform admin:** nobody has `is_platform_admin` yet. You can get it with `python -m backend.scripts.create_admin ... --platform-admin`. That creates a new user, so tell me if you'd rather have a one-off script that flags your existing admin.
4. **Unrelated oddity:** your `backend/main.py` defines an `origins` list that nothing uses. The CORS middleware reads `settings.cors_origins`, so that list does nothing.

Tell me how the apply and tests go. Phase 2 (scan fields, flagging, `PATCH /scans`, `/staff`, stats and activity) comes next, built on this branch.

> File: [/mnt/user-data/outputs/backend-phase1-organisations-v2.patch](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/578b9fa4-28bd-4fe4-b52c-4034d02a166a/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fbackend-phase1-organisations-v2.patch)

## User:

> 10/20/2026 10:05:29

````text
cd ~/Documents/MEDISCAN-backend
git apply --check ~/Downloads/backend-phase1-organisations-v2.patch
git apply -v ~/Downloads/backend-phase1-organisations-v2.patch
python -m pytest -q
git add -A && git commit -m "Organisations foundation: tenancy scoping, migration 0003, isolation tests"
error: patch failed: backend/core/config.py:36
error: backend/core/config.py: patch does not apply
error: patch failed: backend/core/deps.py:9
error: backend/core/deps.py: patch does not apply
error: patch failed: backend/models/__init__.py:1
error: backend/models/__init__.py: patch does not apply
error: backend/models/organisation.py: already exists in working directory
error: patch failed: backend/models/patient.py:19
error: backend/models/patient.py: patch does not apply
error: patch failed: backend/models/scan.py:19
error: backend/models/scan.py: patch does not apply
error: patch failed: backend/models/user.py:10
error: backend/models/user.py: patch does not apply
error: patch failed: backend/routers/admin.py:20
error: backend/routers/admin.py: patch does not apply
error: patch failed: backend/routers/scans.py:22
error: backend/routers/scans.py: patch does not apply
error: patch failed: backend/scripts/create_admin.py:1
error: backend/scripts/create_admin.py: patch does not apply
error: patch failed: backend/services/auth_service.py:10
error: backend/services/auth_service.py: patch does not apply
error: patch failed: backend/services/patient_service.py:6
error: backend/services/patient_service.py: patch does not apply
error: patch failed: backend/services/scan_service.py:32
error: backend/services/scan_service.py: patch does not apply
error: migrations/versions/20261019_0003_organisations.py: already exists in working directory
error: tests/__init__.py: already exists in working directory
error: patch failed: tests/conftest.py:18
error: tests/conftest.py: patch does not apply
error: patch failed: tests/helpers.py:3
error: tests/helpers.py: patch does not apply
error: patch failed: tests/test_images.py:8
error: tests/test_images.py: patch does not apply
error: tests/test_isolation.py: already exists in working directory
error: tests/test_migration.py: already exists in working directory
error: patch failed: tests/test_models.py:12
error: tests/test_models.py: patch does not apply
error: patch failed: tests/test_predict.py:10
error: tests/test_predict.py: patch does not apply
Checking patch backend/core/config.py...
error: while searching for:
    refresh_token_expire_days: int = 7
    bcrypt_rounds: int = Field(default=12, ge=4, le=15)

    # --- Inference ---
    inference_backend: Literal["mock", "torch", "remote"] = "mock"


error: patch failed: backend/core/config.py:36
error: backend/core/config.py: patch does not apply
Checking patch backend/core/deps.py...
error: while searching for:
from backend.core import security
from backend.core.database import get_session
from backend.core.errors import AuthError
from backend.models import User, UserRole
from backend.services.inference_service import InferenceService
from backend.services.storage_service import StorageService


error: patch failed: backend/core/deps.py:9
error: backend/core/deps.py: patch does not apply
Checking patch backend/models/__init__.py...
error: while searching for:
"""Import every model here so SQLModel.metadata (and Alembic) sees all tables."""
from backend.models.audit import AuditLog
from backend.models.patient import Patient
from backend.models.scan import Finding, Scan, ScanStatus
from backend.models.token import RefreshToken
from backend.models.user import User, UserRole

__all__ = [
    "AuditLog", "Finding", "Patient", "RefreshToken",
    "Scan", "ScanStatus", "User", "UserRole",
]

error: patch failed: backend/models/__init__.py:1
error: backend/models/__init__.py: patch does not apply
Checking patch backend/models/organisation.py...
error: backend/models/organisation.py: already exists in working directory
Checking patch backend/models/patient.py...
error: while searching for:
    )
    sex: str | None = Field(default=None, sa_type=String(10))
    year_of_birth: int | None = Field(default=None)
    # Owner clinician: clinicians only see their own patients, admins see all.
    created_by_id: uuid.UUID = Field(
        foreign_key="users.id", index=True, nullable=False, ondelete="RESTRICT"
    )

error: patch failed: backend/models/patient.py:19
error: backend/models/patient.py: patch does not apply
Checking patch backend/models/scan.py...
error: while searching for:
    only its key and integrity metadata are stored here."""

    __tablename__ = "scans"
    __table_args__ = (Index("ix_scans_patient_created", "patient_id", "created_at"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Deleting a patient deletes their scans (supports erasure requests).
    patient_id: uuid.UUID = Field(
        foreign_key="patients.id", index=True, nullable=False, ondelete="CASCADE"
    )
    uploaded_by_id: uuid.UUID = Field(
        foreign_key="users.id", index=True, nullable=False, ondelete="RESTRICT"
    )

error: patch failed: backend/models/scan.py:19
error: backend/models/scan.py: patch does not apply
Checking patch backend/models/user.py...
error: while searching for:

class UserRole(str, Enum):
    clinician = "clinician"
    admin = "admin"


class User(SQLModel, table=True):

error: patch failed: backend/models/user.py:10
error: backend/models/user.py: patch does not apply
Checking patch backend/routers/admin.py...
error: while searching for:
@router.get("/users", response_model=list[UserPublic])
async def list_users(
    status: Literal["pending", "all"] = "pending",
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(User).order_by(User.created_at)
    if status == "pending":
        stmt = stmt.where(User.is_approved == False)  # noqa: E712
    return (await session.exec(stmt)).all()

error: patch failed: backend/routers/admin.py:20
error: backend/routers/admin.py: patch does not apply
Checking patch backend/routers/scans.py...
error: while searching for:

@router.get("", response_model=list[ScanOut])
async def list_scans(
    patient_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    scans = await scan_service.list_scans(session, user, patient_id, limit, offset)
    return [ScanOut.from_scan(s) for s in scans]



error: patch failed: backend/routers/scans.py:22
error: backend/routers/scans.py: patch does not apply
Checking patch backend/scripts/create_admin.py...
error: while searching for:
"""
    python -m backend.scripts.create_admin --email you@example.com --name "Your Name"
"""
import argparse
import asyncio

error: patch failed: backend/scripts/create_admin.py:1
error: backend/scripts/create_admin.py: patch does not apply
Checking patch backend/services/auth_service.py...
error: while searching for:
from backend.core import security
from backend.core.config import get_settings
from backend.core.errors import AuthError
from backend.models import AuditLog, RefreshToken, User
from backend.models.base import utcnow
from backend.schemas.auth import TokenResponse


error: patch failed: backend/services/auth_service.py:10
error: backend/services/auth_service.py: patch does not apply
Checking patch backend/services/patient_service.py...
error: while searching for:
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.errors import AppError
from backend.models import Patient, User, UserRole
from backend.schemas.patient import PatientCreate
from backend.services.auth_service import audit


error: patch failed: backend/services/patient_service.py:6
error: backend/services/patient_service.py: patch does not apply
Checking patch backend/services/scan_service.py...
error: while searching for:
) -> Scan:
    """Stores image + heatmaps, then the DB rows. If anything fails, objects
    already written are removed so no orphans are left behind."""
    user_id, patient_id = user.id, patient.id
    scan_id = uuid.uuid4()
    image_key = f"scans/{scan_id}.png"  # UUID-only keys: nothing identifying
    written: list[str] = []

error: patch failed: backend/services/scan_service.py:32
error: backend/services/scan_service.py: patch does not apply
Checking patch migrations/versions/20261019_0003_organisations.py...
error: migrations/versions/20261019_0003_organisations.py: already exists in working directory
Checking patch tests/__init__.py...
error: tests/__init__.py: already exists in working directory
Checking patch tests/conftest.py...
error: while searching for:

import backend.models  # noqa: E402,F401
from backend.core import rate_limit  # noqa: E402
from backend.core.database import get_session  # noqa: E402
from backend.main import app  # noqa: E402
from backend.services.inference_service import MockInferenceService  # noqa: E402
from backend.services.storage_service import LocalStorage, S3Storage  # noqa: E402


error: patch failed: tests/conftest.py:18
error: tests/conftest.py: patch does not apply
Checking patch tests/helpers.py...
error: while searching for:
from PIL import Image

from backend.core import security
from backend.models import User, UserRole

PW = "correct-horse-battery"


async def make_user(db, email="dr@example.com", *, role=UserRole.clinician,
                    approved=True, active=True) -> User:
    async with db() as s:
        u = User(email=email, full_name="Dr X", hashed_password=security.hash_password(PW),
                 role=role, is_approved=approved, is_active=active)
        s.add(u)
        await s.commit()
        return u

error: patch failed: tests/helpers.py:3
error: tests/helpers.py: patch does not apply
Checking patch tests/test_images.py...
error: while searching for:
from backend.core import rate_limit as rl
from backend.main import app
from backend.models import AuditLog, UserRole
from tests.helpers import bearer, create_patient, predict_saved, token_for


@pytest.fixture

error: patch failed: tests/test_images.py:8
error: tests/test_images.py: patch does not apply
Checking patch tests/test_isolation.py...
error: tests/test_isolation.py: already exists in working directory
Checking patch tests/test_migration.py...
error: tests/test_migration.py: already exists in working directory
Checking patch tests/test_models.py...
error: while searching for:
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.models import (
    Finding, Patient, RefreshToken, Scan, ScanStatus, User, UserRole,
)
from backend.models.base import utcnow


error: patch failed: tests/test_models.py:12
error: tests/test_models.py: patch does not apply
Checking patch tests/test_predict.py...
error: while searching for:
from backend.main import app
from backend.models import AuditLog, Finding, Scan, UserRole
from backend.services.storage_service import LocalStorage
from tests.helpers import jpeg_bytes, png_bytes, token_for, upload

CONDITIONS = ["Pneumonia", "Cardiomegaly", "Lung Nodule / Mass", "Tuberculosis"]


error: patch failed: tests/test_predict.py:10
error: tests/test_predict.py: patch does not apply
/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/pytest_asyncio/plugin.py:247: PytestDeprecationWarning: The configuration option "asyncio_default_fixture_loop_scope" is unset.
The event loop scope for asynchronous fixtures will default to the fixture caching scope. Future versions of pytest-asyncio will default the loop scope for asynchronous fixtures to function scope. Set the default fixture loop scope explicitly in order to avoid unexpected behavior in the future. Valid fixture loop scopes are: "function", "class", "module", "package", "session"

  warnings.warn(PytestDeprecationWarning(_DEFAULT_FIXTURE_LOOP_SCOPE_UNSET))
........................................................................................................................................ [ 65%]
........................................................................                                                                 [100%]
=============================================================== warnings summary ===============================================================
tests/test_models.py::test_deleting_patient_cascades_to_scans
  /home/vincent/Documents/MEDISCAN-backend/tests/test_models.py:116: DeprecationWarning: 
          🚨 You probably want to use `session.exec()` instead of `session.execute()`.

          This is the original SQLAlchemy `session.execute()` method that returns objects
          of type `Row`, on which you have to call `scalars()` to get the model objects.
  
          For example:
  
          ```Python
          result = await session.execute(select(Hero))
          heroes = result.scalars().all()
          ```
  
          Instead, you could use `exec()`:

          ```Python
          result = await session.exec(select(Hero))
          heroes = result.all()
          ```
          
    await session.execute(Patient.__table__.delete().where(Patient.id == p.id))

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
208 passed, 1 warning in 17.36s
On branch backend-orgs
nothing to commit, working tree clean
````

i applied the patch the first time but forgot to activate the virtual environment so some tests did not run so i ran it again and got this    i'll paste the results from the first and second run  cd ~/Documents/MEDISCAN-backend
git apply --check ~/Downloads/backend-phase1-organisations-v2.patch
git apply -v ~/Downloads/backend-phase1-organisations-v2.patch
python -m pytest -q
git add -A && git commit -m "Organisations foundation: tenancy scoping, migration 0003, isolation tests"
Checking patch backend/core/config.py...
Checking patch backend/core/deps.py...
Checking patch backend/models/__init__.py...
Checking patch backend/models/organisation.py...
Checking patch backend/models/patient.py...
Checking patch backend/models/scan.py...
Checking patch backend/models/user.py...
Checking patch backend/routers/admin.py...
Checking patch backend/routers/scans.py...
Checking patch backend/scripts/create_admin.py...
Checking patch backend/services/auth_service.py...
Checking patch backend/services/patient_service.py...
Checking patch backend/services/scan_service.py...
Checking patch migrations/versions/20261019_0003_organisations.py...
Checking patch tests/__init__.py...
Checking patch tests/conftest.py...
Checking patch tests/helpers.py...
Checking patch tests/test_images.py...
Checking patch tests/test_isolation.py...
Checking patch tests/test_migration.py...
Checking patch tests/test_models.py...
Checking patch tests/test_predict.py...
Applied patch backend/core/config.py cleanly.
Applied patch backend/core/deps.py cleanly.
Applied patch backend/models/__init__.py cleanly.
Applied patch backend/models/organisation.py cleanly.
Applied patch backend/models/patient.py cleanly.
Applied patch backend/models/scan.py cleanly.
Applied patch backend/models/user.py cleanly.
Applied patch backend/routers/admin.py cleanly.
Applied patch backend/routers/scans.py cleanly.
Applied patch backend/scripts/create_admin.py cleanly.
Applied patch backend/services/auth_service.py cleanly.
Applied patch backend/services/patient_service.py cleanly.
Applied patch backend/services/scan_service.py cleanly.
Applied patch migrations/versions/20261019_0003_organisations.py cleanly.
Applied patch tests/__init__.py cleanly.
Applied patch tests/conftest.py cleanly.
Applied patch tests/helpers.py cleanly.
Applied patch tests/test_images.py cleanly.
Applied patch tests/test_isolation.py cleanly.
Applied patch tests/test_migration.py cleanly.
Applied patch tests/test_models.py cleanly.
Applied patch tests/test_predict.py cleanly.
ImportError while loading conftest '/home/vincent/Documents/MEDISCAN-backend/tests/conftest.py'.
tests/conftest.py:9: in <module>
    import boto3  # noqa: E402
    ^^^^^^^^^^^^
E   ModuleNotFoundError: No module named 'boto3'
[backend-orgs 91930c9] Organisations foundation: tenancy scoping, migration 0003, isolation tests
 22 files changed, 518 insertions(+), 59 deletions(-)
 create mode 100644 backend/models/organisation.py
 create mode 100644 migrations/versions/20261019_0003_organisations.py
 create mode 100644 tests/__init__.py
 create mode 100644 tests/test_isolation.py
 create mode 100644 tests/test_migration.py                                                                                                                                                this is from the second run after i activated the virtual environment

## Assistant:

> 10/20/2026 10:05:43

> Confirming the full test suite passed cleanly.
>
> - Confirming the full test suite passed cleanly.
> - Adding to memory
> - **Done**

Phase 1 is in and working. Nothing is wrong in either run.

- **First run:** the patch applied cleanly (22 files) and the commit went through. The `boto3` import error was only the missing virtual environment. The commit still happened because `git add && git commit` ran as a separate command from `pytest`.
- **Second run:** all the "already exists" errors came from applying the patch a second time. Git applies a patch all-or-nothing, so that attempt changed nothing, and "working tree clean" confirms it. The tests then ran in your venv and passed: 208 passed, none failing. The count is higher than my 205 because your environment runs a few tests mine skipped. So commit `91930c9` is tested.

One optional cleanup: the `asyncio_default_fixture_loop_scope` warning was already there before this work. It goes away if you add this line under `[pytest]` in `pytest.ini`:

```
asyncio_default_fixture_loop_scope = function
```

## Before relying on it

1. **Neon dev branch:** create it from schema only, with no patient rows, then run `alembic upgrade head` with `DATABASE_URL` pointing at it. Check that the old users, patients and scans each landed in "Default Organisation". Don't point it at production yet.
2. **Production order:** run the migration on production first, then deploy the code, because the new code can't run on the old schema.
3. **Platform admin:** nobody has `is_platform_admin` yet, and nothing needs it until phase 4.

I'm ready to start phase 2: the scan fields, flagging, `PATCH /scans`, `/staff`, stats and activity. It includes migration 0004 and its tests. Should I go ahead? If so, tell me whether your UI's scan list sends any filters, such as review status, priority or assignee, so I can add them to `GET /scans` in the same pass.

## User:

> 10/20/2026 10:18:19

how do i create the Neon dev branch and also the production order and also the creation of the platform admin

## Assistant:

> 10/20/2026 10:19:23

> Drafting verification queries and switching database connections safely.
>
> - Setting up Neon branching and admin account creation steps.
> - Neon create schema-only branch console docs
> - Drafting fake seed data to test the backfill migration.
> - Check DB URL handling and how migrations are run in deploy
> - Drafting verification queries and switching database connections safely.
> - **Done**

## 1. Create the Neon dev branch (schema only)

In the Neon Console, open your project and go to **Branches → Create branch**. Name it something like `dev-orgs`, choose `production` as the parent, and pick **Schema-only** as the data option. Schema-only branches can be created in the Console, with the CLI (`neon branch create --schema-only`), or through the API. Then click **Connect**, select the new branch, and copy its connection string.

Two caveats:
- A schema-only branch is a root branch, and your plan limits how many root branches a project can have. The feature is also still in Beta. If the option is missing or you're at the limit, create a throwaway second Neon project instead and run `alembic upgrade 0002` there. That is an equally valid test.
- A schema-only branch copies the tables but not their rows, so I expect `alembic_version` to arrive empty. Alembic would then try to rerun migration 0001 and fail.

Run the test in a terminal with your venv active. An environment variable overrides `.env`, so production's connection string stays untouched:

```bash
cd ~/Documents/MEDISCAN-backend
export DATABASE_URL='postgresql://...your-dev-branch-string...'
python -c "from backend.core.config import get_settings as g; print(g()._parsed_db_url.host)"   # confirm this is the dev branch host, not production
alembic current          # if this prints nothing, run:  alembic stamp 0002
```

Your schema has no rows, so the backfill would have nothing to move. Add a few fake rows in the Neon **SQL Editor** (on the dev branch) so it does:

```sql
INSERT INTO users (id,email,hashed_password,full_name,role,is_active,is_approved,created_at,updated_at)
VALUES ('11111111-1111-1111-1111-111111111111','seed@example.com','x','Seed User','admin',true,true,now(),now());
INSERT INTO patients (id,patient_code,created_by_id,created_at)
VALUES ('22222222-2222-2222-2222-222222222222','PT-SEED0001','11111111-1111-1111-1111-111111111111',now());
INSERT INTO scans (id,patient_id,uploaded_by_id,image_key,image_sha256,content_type,size_bytes,status,created_at)
VALUES ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','k',repeat('0',64),'image/png',1,'completed',now());
```

If Postgres rejects a column, paste me the error. I checked this insert on SQLite only. Then run the migration both ways:

```bash
alembic upgrade head
alembic downgrade 0002
alembic upgrade head
```

In the SQL Editor, `SELECT name, status FROM organisations;` should show one row, "Default Organisation", active. Each of your three seed rows should have a non-null `organisation_id`. When it passes, unset the variable with `unset DATABASE_URL`, or just close the terminal.

## 2. Production order

Migrations run from your machine against Neon, as your `deploy/modal_api.py` notes say. Between the migration and the deploy, the old code can't create users, patients or scans, because it doesn't know about the new NOT NULL column. Reads keep working. Keep that gap short.

1. **Dev branch test passes** (above).
2. **Record the "before":** on production, run `SELECT count(*) FROM users;` and the same for `patients` and `scans`.
3. **Make a restore point.** Note the current time, or create a normal branch from production as a backup. A backup branch contains real patient data, so delete it once everything checks out.
4. **Confirm the starting point:** point `DATABASE_URL` at production and run `alembic current`. It should print `0002`. If it prints something else or nothing, stop and tell me.
5. **Migrate:** `alembic upgrade head`.
6. **Check counts:** every row should be in the default organisation, and the totals should match step 2:
   ```sql
   SELECT o.name,
     (SELECT count(*) FROM users    WHERE organisation_id = o.id) AS users,
     (SELECT count(*) FROM patients WHERE organisation_id = o.id) AS patients,
     (SELECT count(*) FROM scans    WHERE organisation_id = o.id) AS scans
   FROM organisations o;
   ```
7. **Deploy the new code straight away**, the way you normally do, then log in, list patients and open a scan.

If something goes wrong before you deploy, `alembic downgrade 0002` undoes the migration. That is safe while no new organisations exist.

If the migration complains about prepared statements, use the direct host (the connection string without `-pooler`). Your `migrations/env.py` is built to handle either.

## 3. Create the platform admin

Nothing in phase 1 uses the flag. It matters from phase 4, when new organisations need approving, so you can do this any time after the production migration. To flag your existing admin account, run this in the Neon SQL Editor on production:

```sql
UPDATE users SET is_platform_admin = true
WHERE email = 'you@example.com' AND role = 'admin';
```

Use your real login email in lowercase, and check that it reports one row updated. The flag grants no access to other organisations' patients, because it only unlocks the platform approval routes I'll add in phase 4.

Paste the output of the dev-branch run, in particular `alembic current` and the `SELECT` from the SQL Editor. Phase 2 is also ready to start whenever you want it.

---

**Sources:**

- [> This page location: Branching > Schema-only branches](https://neon.com/docs/guides/branching-schema-only.md)
- [branching neon api](https://neon.com/docs/guides/branching-neon-api)
- [> This page location: Tools & Workflows > Workflows & CI/CD > Branching with the API](https://neon.com/docs/guides/branching-neon-api.md)
- [branching schema only](https://neon.com/docs/guides/branching-schema-only)
- [neon.com](https://neon.com/docs/ai/skills/neon-postgres-branches/SKILL.md)
- [neon.com](https://neon.com/.well-known/agent-skills/neon-postgres-branches/SKILL.md)
- [In Neon, you can recover a 100 TB database in 1 second. No more fear of breaking production](https://neon.tech/docs/guides/branching-schema-only)

## User:

> 10/20/2026 10:59:33

```text
Traceback (most recent call last):
  File "<string>", line 1, in <module>
    from backend.core.config import get_settings as g; print(g()._parsed_db_url.host)
                                                             ~^^
  File "/home/vincent/Documents/MEDISCAN-backend/backend/core/config.py", line 170, in get_settings
    return Settings()  # type: ignore[call-arg]
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/pydantic_settings/main.py", line 262, in __init__
    super().__init__(**__pydantic_self__.__class__._settings_build_values(sources, init_kwargs))
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/pydantic/main.py", line 263, in __init__
    validated_self = self.__pydantic_validator__.validate_python(data, self_instance=self)
pydantic_core._pydantic_core.ValidationError: 1 validation error for Settings
jwt_secret_key
  Field required [type=missing]
    For further information visit https://errors.pydantic.dev/2.13/v/missing
Traceback (most recent call last):
  File "/home/vincent/Documents/MEDISCAN/backend/venv/bin/alembic", line 6, in <module>
    sys.exit(main())
             ~~~~^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/config.py", line 1039, in main
    CommandLine(prog=prog).main(argv=argv)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/config.py", line 1029, in main
    self.run_cmd(cfg, options)
    ~~~~~~~~~~~~^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/config.py", line 963, in run_cmd
    fn(
    ~~^
        config,
        ^^^^^^^
        *[getattr(options, k, None) for k in positional],
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        **{k: getattr(options, k, None) for k in kwarg},
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/command.py", line 726, in current
    script.run_env()
    ~~~~~~~~~~~~~~^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/script/base.py", line 550, in run_env
    util.load_python_file(self.dir, "env.py")
    ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/util/pyfiles.py", line 114, in load_python_file
    module = load_module_py(module_id, path)
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/util/pyfiles.py", line 132, in load_module_py
    spec.loader.exec_module(module)  # type: ignore
    ~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^
  File "<frozen importlib._bootstrap_external>", line 1026, in exec_module
  File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/env.py", line 11, in <module>
    from backend.core.database import engine
  File "/home/vincent/Documents/MEDISCAN-backend/backend/core/database.py", line 9, in <module>
    settings = get_settings()
  File "/home/vincent/Documents/MEDISCAN-backend/backend/core/config.py", line 170, in get_settings
    return Settings()  # type: ignore[call-arg]
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/pydantic_settings/main.py", line 262, in __init__
    super().__init__(**__pydantic_self__.__class__._settings_build_values(sources, init_kwargs))
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/pydantic/main.py", line 263, in __init__
    validated_self = self.__pydantic_validator__.validate_python(data, self_instance=self)
pydantic_core._pydantic_core.ValidationError: 1 validation error for Settings
jwt_secret_key
  Field required [type=missing]
    For further information visit https://errors.pydantic.dev/2.13/v/missing
```

## Assistant:

> 10/20/2026 10:59:40

> Diagnosing a missing environment configuration error.
>
> - Diagnosing a missing environment configuration error.
> - **Done**

Nothing went wrong, and nothing touched any database. The settings loader stopped because `JWT_SECRET_KEY` isn't set in this terminal. The worktree has no `.env`, since git doesn't copy ignored files, and the app refuses to start without a secret. The error lists only `jwt_secret_key` as missing, which also shows your dev-branch `DATABASE_URL` was picked up correctly.

Don't copy your real `.env` into the worktree. It points at production, and you want this terminal pointed at the dev branch only. Set a throwaway secret instead. The migration never uses it, so any random value works:

```bash
export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export ENVIRONMENT=development
export STORAGE_BACKEND=local

python -c "from backend.core.config import get_settings as g; print(g()._parsed_db_url.host)"
alembic current
```

The first command should print the dev branch's host. Check that it is the dev branch and not production before going further. If `alembic current` prints nothing, run `alembic stamp 0002`, then continue with the seed rows and the up/down/up sequence from my previous message. Paste the output of the host check and `alembic current`.

## User:

> 10/20/2026 11:09:11

```text
alembic upgrade head
alembic downgrade 0002
alembic upgrade head
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 0001, initial schema
Traceback (most recent call last):
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 550, in _prepare_and_execute
    self._rows = deque(await prepared_stmt.fetch(*parameters))
                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 177, in fetch
    data = await self.__bind_execute(args, 0, timeout)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 268, in __bind_execute
    data, status, _ = await self.__do_execute(
                      ^^^^^^^^^^^^^^^^^^^^^^^^
        lambda protocol: protocol.bind_execute(
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            self._state, args, '', limit, True, timeout))
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 257, in __do_execute
    return await executor(protocol)
           ^^^^^^^^^^^^^^^^^^^^^^^^
  File "asyncpg/protocol/protocol.pyx", line 205, in bind_execute
asyncpg.exceptions.DuplicateTableError: relation "users" already exists

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/default.py", line 952, in do_execute
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 585, in execute
    self._adapt_connection.await_(
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self._prepare_and_execute(operation, parameters)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 132, in await_only
    return current.parent.switch(awaitable)  # type: ignore[no-any-return,attr-defined] # noqa: E501
           ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 196, in greenlet_spawn
    value = await result
            ^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 563, in _prepare_and_execute
    self._handle_exception(error)
    ~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 513, in _handle_exception
    self._adapt_connection._handle_exception(error)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 797, in _handle_exception
    raise translated_error from error
sqlalchemy.dialects.postgresql.asyncpg.AsyncAdapt_asyncpg_dbapi.ProgrammingError: <class 'asyncpg.exceptions.DuplicateTableError'>: relation "users" already exists

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/vincent/Documents/MEDISCAN/backend/venv/bin/alembic", line 6, in <module>
    sys.exit(main())
             ~~~~^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/config.py", line 1039, in main
    CommandLine(prog=prog).main(argv=argv)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/config.py", line 1029, in main
    self.run_cmd(cfg, options)
    ~~~~~~~~~~~~^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/config.py", line 963, in run_cmd
    fn(
    ~~^
        config,
        ^^^^^^^
        *[getattr(options, k, None) for k in positional],
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        **{k: getattr(options, k, None) for k in kwarg},
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/command.py", line 487, in upgrade
    script.run_env()
    ~~~~~~~~~~~~~~^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/script/base.py", line 550, in run_env
    util.load_python_file(self.dir, "env.py")
    ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/util/pyfiles.py", line 114, in load_python_file
    module = load_module_py(module_id, path)
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/util/pyfiles.py", line 132, in load_module_py
    spec.loader.exec_module(module)  # type: ignore
    ~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^
  File "<frozen importlib._bootstrap_external>", line 1026, in exec_module
  File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/env.py", line 53, in <module>
    run_migrations_online()
    ~~~~~~~~~~~~~~~~~~~~~^^
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/env.py", line 47, in run_migrations_online
    asyncio.run(run_async_migrations())
    ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/anaconda3/lib/python3.13/asyncio/runners.py", line 195, in run
    return runner.run(main)
           ~~~~~~~~~~^^^^^^
  File "/home/vincent/anaconda3/lib/python3.13/asyncio/runners.py", line 118, in run
    return self._loop.run_until_complete(task)
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^
  File "/home/vincent/anaconda3/lib/python3.13/asyncio/base_events.py", line 725, in run_until_complete
    return future.result()
           ~~~~~~~~~~~~~^^
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/env.py", line 42, in run_async_migrations
    await connection.run_sync(do_run_migrations)
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/ext/asyncio/engine.py", line 888, in run_sync
    return await greenlet_spawn(
           ^^^^^^^^^^^^^^^^^^^^^
        fn, self._proxied, *arg, _require_await=False, **kw
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 203, in greenlet_spawn
    result = context.switch(value)
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/env.py", line 37, in do_run_migrations
    context.run_migrations()
    ~~~~~~~~~~~~~~~~~~~~~~^^
  File "<string>", line 8, in run_migrations
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/runtime/environment.py", line 970, in run_migrations
    self.get_context().run_migrations(**kw)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/runtime/migration.py", line 616, in run_migrations
    step.migration_fn(**kw)
    ~~~~~~~~~~~~~~~~~^^^^^^
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/versions/20260930_0001_initial_schema.py", line 22, in upgrade
    op.create_table('users',
    ~~~~~~~~~~~~~~~^^^^^^^^^
    sa.Column('id', sa.Uuid(), nullable=False),
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<7 lines>...
    sa.PrimaryKeyConstraint('id')
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "<string>", line 8, in create_table
  File "<string>", line 3, in create_table
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/operations/ops.py", line 1323, in create_table
    return operations.invoke(op)
           ~~~~~~~~~~~~~~~~~^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/operations/base.py", line 448, in invoke
    return fn(self, operation)
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/operations/toimpl.py", line 139, in create_table
    operations.impl.create_table(table, **kw)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/ddl/impl.py", line 434, in create_table
    self._exec(schema.CreateTable(table, **kw))
    ~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/ddl/impl.py", line 252, in _exec
    return conn.execute(construct, params)
           ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1421, in execute
    return meth(
        self,
        distilled_parameters,
        execution_options or NO_OPTIONS,
    )
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/sql/ddl.py", line 188, in _execute_on_connection
    return connection._execute_ddl(
           ~~~~~~~~~~~~~~~~~~~~~~~^
        self, distilled_params, execution_options
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1532, in _execute_ddl
    ret = self._execute_context(
        dialect,
    ...<4 lines>...
        compiled,
    )
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1848, in _execute_context
    return self._exec_single_context(
           ~~~~~~~~~~~~~~~~~~~~~~~~~^
        dialect, context, statement, parameters
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1988, in _exec_single_context
    self._handle_dbapi_exception(
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        e, str_statement, effective_parameters, cursor, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 2365, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/default.py", line 952, in do_execute
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 585, in execute
    self._adapt_connection.await_(
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self._prepare_and_execute(operation, parameters)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 132, in await_only
    return current.parent.switch(awaitable)  # type: ignore[no-any-return,attr-defined] # noqa: E501
           ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 196, in greenlet_spawn
    value = await result
            ^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 563, in _prepare_and_execute
    self._handle_exception(error)
    ~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 513, in _handle_exception
    self._adapt_connection._handle_exception(error)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 797, in _handle_exception
    raise translated_error from error
sqlalchemy.exc.ProgrammingError: (sqlalchemy.dialects.postgresql.asyncpg.ProgrammingError) <class 'asyncpg.exceptions.DuplicateTableError'>: relation "users" already exists
[SQL: 
CREATE TABLE users (
        id UUID NOT NULL, 
        email VARCHAR(320) NOT NULL, 
        hashed_password VARCHAR(255) NOT NULL, 
        full_name VARCHAR(200) NOT NULL, 
        role VARCHAR(20) NOT NULL, 
        is_active BOOLEAN NOT NULL, 
        created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
        PRIMARY KEY (id)
)

]
(Background on this error at: https://sqlalche.me/e/20/f405)
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
ERROR [alembic.util.messaging] Destination 0002 is not a valid downgrade target from current head(s)
  FAILED: Destination 0002 is not a valid downgrade target from current head(s)
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 0001, initial schema
Traceback (most recent call last):
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 550, in _prepare_and_execute
    self._rows = deque(await prepared_stmt.fetch(*parameters))
                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 177, in fetch
    data = await self.__bind_execute(args, 0, timeout)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 268, in __bind_execute
    data, status, _ = await self.__do_execute(
                      ^^^^^^^^^^^^^^^^^^^^^^^^
        lambda protocol: protocol.bind_execute(
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            self._state, args, '', limit, True, timeout))
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 257, in __do_execute
    return await executor(protocol)
           ^^^^^^^^^^^^^^^^^^^^^^^^
  File "asyncpg/protocol/protocol.pyx", line 205, in bind_execute
asyncpg.exceptions.DuplicateTableError: relation "users" already exists

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/default.py", line 952, in do_execute
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 585, in execute
    self._adapt_connection.await_(
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self._prepare_and_execute(operation, parameters)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 132, in await_only
    return current.parent.switch(awaitable)  # type: ignore[no-any-return,attr-defined] # noqa: E501
           ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 196, in greenlet_spawn
    value = await result
            ^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 563, in _prepare_and_execute
    self._handle_exception(error)
    ~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 513, in _handle_exception
    self._adapt_connection._handle_exception(error)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 797, in _handle_exception
    raise translated_error from error
sqlalchemy.dialects.postgresql.asyncpg.AsyncAdapt_asyncpg_dbapi.ProgrammingError: <class 'asyncpg.exceptions.DuplicateTableError'>: relation "users" already exists

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/vincent/Documents/MEDISCAN/backend/venv/bin/alembic", line 6, in <module>
    sys.exit(main())
             ~~~~^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/config.py", line 1039, in main
    CommandLine(prog=prog).main(argv=argv)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/config.py", line 1029, in main
    self.run_cmd(cfg, options)
    ~~~~~~~~~~~~^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/config.py", line 963, in run_cmd
    fn(
    ~~^
        config,
        ^^^^^^^
        *[getattr(options, k, None) for k in positional],
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        **{k: getattr(options, k, None) for k in kwarg},
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/command.py", line 487, in upgrade
    script.run_env()
    ~~~~~~~~~~~~~~^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/script/base.py", line 550, in run_env
    util.load_python_file(self.dir, "env.py")
    ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/util/pyfiles.py", line 114, in load_python_file
    module = load_module_py(module_id, path)
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/util/pyfiles.py", line 132, in load_module_py
    spec.loader.exec_module(module)  # type: ignore
    ~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^
  File "<frozen importlib._bootstrap_external>", line 1026, in exec_module
  File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/env.py", line 53, in <module>
    run_migrations_online()
    ~~~~~~~~~~~~~~~~~~~~~^^
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/env.py", line 47, in run_migrations_online
    asyncio.run(run_async_migrations())
    ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/anaconda3/lib/python3.13/asyncio/runners.py", line 195, in run
    return runner.run(main)
           ~~~~~~~~~~^^^^^^
  File "/home/vincent/anaconda3/lib/python3.13/asyncio/runners.py", line 118, in run
    return self._loop.run_until_complete(task)
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^
  File "/home/vincent/anaconda3/lib/python3.13/asyncio/base_events.py", line 725, in run_until_complete
    return future.result()
           ~~~~~~~~~~~~~^^
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/env.py", line 42, in run_async_migrations
    await connection.run_sync(do_run_migrations)
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/ext/asyncio/engine.py", line 888, in run_sync
    return await greenlet_spawn(
           ^^^^^^^^^^^^^^^^^^^^^
        fn, self._proxied, *arg, _require_await=False, **kw
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 203, in greenlet_spawn
    result = context.switch(value)
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/env.py", line 37, in do_run_migrations
    context.run_migrations()
    ~~~~~~~~~~~~~~~~~~~~~~^^
  File "<string>", line 8, in run_migrations
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/runtime/environment.py", line 970, in run_migrations
    self.get_context().run_migrations(**kw)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/runtime/migration.py", line 616, in run_migrations
    step.migration_fn(**kw)
    ~~~~~~~~~~~~~~~~~^^^^^^
  File "/home/vincent/Documents/MEDISCAN-backend/migrations/versions/20260930_0001_initial_schema.py", line 22, in upgrade
    op.create_table('users',
    ~~~~~~~~~~~~~~~^^^^^^^^^
    sa.Column('id', sa.Uuid(), nullable=False),
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<7 lines>...
    sa.PrimaryKeyConstraint('id')
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "<string>", line 8, in create_table
  File "<string>", line 3, in create_table
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/operations/ops.py", line 1323, in create_table
    return operations.invoke(op)
           ~~~~~~~~~~~~~~~~~^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/operations/base.py", line 448, in invoke
    return fn(self, operation)
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/operations/toimpl.py", line 139, in create_table
    operations.impl.create_table(table, **kw)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/ddl/impl.py", line 434, in create_table
    self._exec(schema.CreateTable(table, **kw))
    ~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/alembic/ddl/impl.py", line 252, in _exec
    return conn.execute(construct, params)
           ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1421, in execute
    return meth(
        self,
        distilled_parameters,
        execution_options or NO_OPTIONS,
    )
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/sql/ddl.py", line 188, in _execute_on_connection
    return connection._execute_ddl(
           ~~~~~~~~~~~~~~~~~~~~~~~^
        self, distilled_params, execution_options
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1532, in _execute_ddl
    ret = self._execute_context(
        dialect,
    ...<4 lines>...
        compiled,
    )
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1848, in _execute_context
    return self._exec_single_context(
           ~~~~~~~~~~~~~~~~~~~~~~~~~^
        dialect, context, statement, parameters
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1988, in _exec_single_context
    self._handle_dbapi_exception(
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        e, str_statement, effective_parameters, cursor, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 2365, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/engine/default.py", line 952, in do_execute
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 585, in execute
    self._adapt_connection.await_(
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self._prepare_and_execute(operation, parameters)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 132, in await_only
    return current.parent.switch(awaitable)  # type: ignore[no-any-return,attr-defined] # noqa: E501
           ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 196, in greenlet_spawn
    value = await result
            ^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 563, in _prepare_and_execute
    self._handle_exception(error)
    ~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 513, in _handle_exception
    self._adapt_connection._handle_exception(error)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 797, in _handle_exception
    raise translated_error from error
sqlalchemy.exc.ProgrammingError: (sqlalchemy.dialects.postgresql.asyncpg.ProgrammingError) <class 'asyncpg.exceptions.DuplicateTableError'>: relation "users" already exists
[SQL: 
CREATE TABLE users (
        id UUID NOT NULL, 
        email VARCHAR(320) NOT NULL, 
        hashed_password VARCHAR(255) NOT NULL, 
        full_name VARCHAR(200) NOT NULL, 
        role VARCHAR(20) NOT NULL, 
        is_active BOOLEAN NOT NULL, 
        created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
        PRIMARY KEY (id)
)

]
(Background on this error at: https://sqlalche.me/e/20/f405)
```

## Assistant:

> 10/20/2026 11:09:23

> Comparing production schema against expected migration version.
>
> - Comparing production schema against expected migration version.
> - **Done**

That failure is the empty-`alembic_version` problem I warned about, and it did no damage. It also means my earlier instructions skipped a step: I told you to run `alembic current` and stamp only if it printed nothing, and the commands went straight to `upgrade`.

The dev branch has the tables but Alembic thinks nothing has been applied, so it started at migration 0001 and stopped on `CREATE TABLE users` because that table already exists. Migrations run in a transaction on Postgres, so nothing was changed. The `downgrade` then failed for the same reason: with no recorded version, there is nothing to downgrade from.

## Fix it on the dev branch

First, find out what the branch actually contains. Run this in the Neon SQL Editor, with the dev branch selected:

```sql
SELECT to_regclass('alembic_version');                      -- NULL means the table is missing
SELECT * FROM alembic_version;                              -- zero rows is what I expect
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' ORDER BY 1;                      -- is_approved present => schema is at 0002
```

Then:
1. **Table exists, no rows, and `is_approved` is in the list:** run `alembic stamp 0002` in your terminal, with the same exported variables as before. Then `alembic current` should print `0002`.
2. **Insert the fake seed rows** from my earlier message.
3. **Run the migration both ways:** `alembic upgrade head`, then `alembic downgrade 0002`, then `alembic upgrade head`.

## Check this on production too

If the dev branch really is a copy of production, production's `alembic_version` should hold `0002`. The schema-only copy would have emptied the table, not production's. But if the table doesn't exist at all, production was probably built with `create_all` and never stamped. In that case `alembic upgrade head` there would fail the same way, and it would be better to find that out now. After the dev test passes, I'll give you a read-only check for production before you migrate it. Don't run any `alembic` command against production until then.

Paste the output of the three SQL queries.

## User:

> 10/20/2026 11:12:49

[{
  "to_regclass": "alembic_version"
}]                                                                         
[{
  "column_name": "created_at"
}, {
  "column_name": "email"
}, {
  "column_name": "full_name"
}, {
  "column_name": "hashed_password"
}, {
  "column_name": "id"
}, {
  "column_name": "is_active"
}, {
  "column_name": "is_approved"
}, {
  "column_name": "role"
}, {
  "column_name": "updated_at"
}]

## Assistant:

> 10/20/2026 11:12:55

> Checking the database schema version for the migration state.
>
> - Checking the database schema version for the migration state.
> - **Done**

That output settles it. The table `alembic_version` exists, and `users` has `is_approved`, so the dev branch is at 0002 and the version table is just empty. I assume the middle query returned zero rows, since the editor shows nothing for an empty result. If it did show a row, tell me.

Run these in the same terminal, with the exports from before still active. If you opened a new terminal, set `DATABASE_URL` and the throwaway `JWT_SECRET_KEY` again first.

```bash
cd ~/Documents/MEDISCAN-backend
python -c "from backend.core.config import get_settings as g; print(g()._parsed_db_url.host)"   # must be the dev branch host
alembic stamp 0002
alembic current          # expect: 0002 (head is 0003 now)
```

Then in the Neon SQL Editor, with the dev branch selected, run the three fake-row inserts from my earlier message. After that, run the migration in the terminal:

```bash
alembic upgrade head
alembic downgrade 0002
alembic upgrade head
alembic current          # expect: 0003 (head)
```

Check the result in the SQL Editor:

```sql
SELECT o.name, o.status,
  (SELECT count(*) FROM users    WHERE organisation_id = o.id) AS users,
  (SELECT count(*) FROM patients WHERE organisation_id = o.id) AS patients,
  (SELECT count(*) FROM scans    WHERE organisation_id = o.id) AS scans
FROM organisations o;
```

You should see one row: "Default Organisation", active, with 1, 1 and 1. The downgrade and second upgrade matter as much as the first upgrade, because they prove the migration can be rolled back and reapplied on Postgres.

If any step fails, paste only the last few lines of the error, starting from the line that begins `sqlalchemy.exc`, not the whole traceback. Once this passes, I'll give you the read-only check for production before you migrate it.

## User:

> 10/20/2026 11:14:38

can  i get the fake row inserts again ?

## Assistant:

> 10/20/2026 11:14:42

Here they are. Run them in the Neon SQL Editor with the dev branch selected, and only after `alembic stamp 0002` has succeeded.

```sql
INSERT INTO users (id,email,hashed_password,full_name,role,is_active,is_approved,created_at,updated_at)
VALUES ('11111111-1111-1111-1111-111111111111','seed@example.com','x','Seed User','admin',true,true,now(),now());

INSERT INTO patients (id,patient_code,created_by_id,created_at)
VALUES ('22222222-2222-2222-2222-222222222222','PT-SEED0001','11111111-1111-1111-1111-111111111111',now());

INSERT INTO scans (id,patient_id,uploaded_by_id,image_key,image_sha256,content_type,size_bytes,status,created_at)
VALUES ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','k',repeat('0',64),'image/png',1,'completed',now());
```

They have to run in that order, because the patient refers to the user and the scan refers to both. Check the editor's selected branch first. These rows are fake, but they should only go into the dev branch.

If Postgres rejects one, paste the error message. I checked these only on SQLite, so a column mismatch is possible. The users table has the same columns as in the `CREATE TABLE` in your earlier error, so that insert should be fine. If a patients or scans column is the problem, I'll adjust it.

## User:

> 10/20/2026 11:15:55

![1792491346037_image.png](data:image/webp;base64,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)

## Assistant:

> 10/20/2026 11:16:02

> Diagnosing a duplicate-key error from a partial database seed.
>
> - Diagnosing a duplicate-key error from a partial database seed.
> - **Done**

That error just means the seed user is already there, probably from an earlier attempt that ran the first insert before something else stopped. Nothing is broken. Run this instead, which skips any row that already exists:

```sql
INSERT INTO users (id,email,hashed_password,full_name,role,is_active,is_approved,created_at,updated_at)
VALUES ('11111111-1111-1111-1111-111111111111','seed@example.com','x','Seed User','admin',true,true,now(),now())
ON CONFLICT DO NOTHING;

INSERT INTO patients (id,patient_code,created_by_id,created_at)
VALUES ('22222222-2222-2222-2222-222222222222','PT-SEED0001','11111111-1111-1111-1111-111111111111',now())
ON CONFLICT DO NOTHING;

INSERT INTO scans (id,patient_id,uploaded_by_id,image_key,image_sha256,content_type,size_bytes,status,created_at)
VALUES ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','k',repeat('0',64),'image/png',1,'completed',now())
ON CONFLICT DO NOTHING;
```

Then confirm what's on the branch:

```sql
SELECT (SELECT count(*) FROM users) AS users,
       (SELECT count(*) FROM patients) AS patients,
       (SELECT count(*) FROM scans) AS scans;
```

You want 1, 1 and 1. If any count is higher, there is real data in this branch. That would mean it isn't schema-only or it isn't the branch you think it is. In that case stop and tell me before running any migration. Also check the branch selector at the top of the Neon console and make sure it shows the dev branch, not production.

If the counts are 1, 1 and 1, go back to the terminal and run the stamp and migration steps from my earlier message.

## User:

> 10/20/2026 11:19:57

they all ran as expected

## Assistant:

> 10/20/2026 11:20:02

> Testing database migrations through a sequence of commands.
>
> - Testing database migrations through a sequence of commands.
> - **Done**

Next is the terminal, with the same exports active. If you opened a new terminal, set `DATABASE_URL` to the dev branch string and the throwaway `JWT_SECRET_KEY` again first.

```bash
cd ~/Documents/MEDISCAN-backend
python -c "from backend.core.config import get_settings as g; print(g()._parsed_db_url.host)"   # must be the dev branch host
alembic current        # prints nothing or 0002
alembic stamp 0002     # safe to run even if it already says 0002
alembic current        # expect: 0002

alembic upgrade head
alembic downgrade 0002
alembic upgrade head
alembic current        # expect: 0003 (head)
```

Then run this in the Neon SQL Editor on the dev branch:

```sql
SELECT o.name, o.status,
  (SELECT count(*) FROM users    WHERE organisation_id = o.id) AS users,
  (SELECT count(*) FROM patients WHERE organisation_id = o.id) AS patients,
  (SELECT count(*) FROM scans    WHERE organisation_id = o.id) AS scans
FROM organisations o;
```

The expected result is one row: "Default Organisation", `active`, with 1, 1 and 1. That shows the backfill worked and survived the downgrade and re-upgrade.

If a step fails, paste only the last few lines of the error, starting from the line that begins `sqlalchemy.exc`. Otherwise paste the final `alembic current` output and the query result, and I'll give you the read-only production check.

## User:

> 10/20/2026 11:21:07

alembic upgrade head
alembic downgrade 0002
alembic upgrade head
alembic current          # expect: 0003 (head)
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 0002 -> 0003, organisations: multi-tenancy foundation
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running downgrade 0003 -> 0002, organisations: multi-tenancy foundation
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 0002 -> 0003, organisations: multi-tenancy foundation
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
0003 (head)                                                                                                                                                                                                                       [{
  "name": "Default Organisation",
  "status": "active",
  "users": 1,
  "patients": 1,
  "scans": 1
}]

## Assistant:

> 10/20/2026 11:21:16

> Verifying database migration status on production.
>
> - Verifying database migration status on production.
> - **Done**

The migration works on Postgres. It ran up, down and up again with no errors, `alembic current` shows `0003 (head)`, and the seed rows ended up in "Default Organisation", active, with 1, 1 and 1. This is the Postgres check I couldn't do from my side.

## Check production without changing it

Open the Neon SQL Editor and select the production branch. These queries only read data:

```sql
SELECT * FROM alembic_version;          -- expect exactly one row: 0002
SELECT to_regclass('organisations');    -- expect NULL (the table must not exist yet)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' ORDER BY 1;  -- must include is_approved, must NOT include organisation_id
SELECT (SELECT count(*) FROM users)    AS users,
       (SELECT count(*) FROM patients) AS patients,
       (SELECT count(*) FROM scans)    AS scans;
```

Write down the three counts. After the migration they should match the counts in the "Default Organisation" row. If `alembic_version` is empty or missing, stop and paste the result instead of migrating, because that is the same problem you hit on the dev branch.

## Before you point a terminal at production

1. **Clear the dev settings** with `unset DATABASE_URL JWT_SECRET_KEY`, or just open a fresh terminal, so no command can reach the wrong branch by accident.
2. **Get a restore point.** Note the current time in the Neon console, or create a normal branch from production as a backup. A normal branch contains patient data, so delete it once you're happy.
3. **Run the production steps from my earlier message:** `alembic current` (expect `0002`), then `alembic upgrade head`, then the count query, then deploy the new code straight away.

Run `alembic upgrade head` only once, against production, and nothing else. Don't repeat the downgrade test there.

Keep the dev branch for now. I'll use it to test the phase 2 migration the same way before you touch production again.

If the four queries look right, paste the results and I'll confirm you're clear to migrate. Otherwise tell me when you want phase 2 to start.

## User:

> 10/20/2026 11:46:35

what do i do now

## Assistant:

> 10/20/2026 11:46:44

> Outlining the next steps for the production checks.
>
> - Outlining the next steps for the production checks.
> - **Done**

Run the read-only checks on production first. They change nothing, and they decide whether it's safe to migrate.

1. **Clear the dev settings.** Close the terminal you've been using, or run `unset DATABASE_URL JWT_SECRET_KEY`, so nothing can point at the wrong database by mistake.
2. **Select the production branch** in the Neon SQL Editor and run the four queries from my last message. Check the branch selector first. Paste me the results, including the three counts.
3. **Wait for my go-ahead.** If `alembic_version` shows exactly `0002` and `organisations` doesn't exist yet, I'll confirm you're clear.
4. **Then the production run:**
   - Make a restore point.
   - Run `alembic current`, then `alembic upgrade head`, once.
   - Compare the counts.
   - Merge `backend-orgs` into your `backend` branch and deploy straight away.
   - Log in and open a scan to smoke-test.

Shipping phase 1 alone isn't urgent. The other option is to hold production at its current state, build phase 2 now, and migrate production once for both. That means one production migration window instead of two, and your dev branch is already at `0003` and ready for testing phase 2. The cost is that production stays on the old code for longer, and your UI work can't use the org-scoped `GET /scans` until you deploy.

Do you want to migrate production now, or have me start phase 2 and migrate once at the end?

## User:

> 10/20/2026 11:48:41

[{
  "version_num": "0002"
}]
[{
  "column_name": "created_at"
}, {
  "column_name": "email"
}, {
  "column_name": "full_name"
}, {
  "column_name": "hashed_password"
}, {
  "column_name": "id"
}, {
  "column_name": "is_active"
}, {
  "column_name": "is_approved"
}, {
  "column_name": "role"
}, {
  "column_name": "updated_at"
}]
[{
  "users": 2,
  "patients": 6,
  "scans": 5
}]

## Assistant:

> 10/20/2026 11:48:56

> Outlining production migration steps and deployment commands.
>
> - Outlining production migration steps and deployment commands.
> - **Done**

Production is ready for the migration, and the checks show nothing unexpected.

- **Migration state:** `alembic_version` holds exactly `0002`, so Alembic knows where production stands.
- **Schema:** `users` has `is_approved` and no `organisation_id`, so migration 0003 hasn't been applied or half-applied. The `organisations` check isn't in what you pasted. Since 0003 creates that table and the column in a single transaction, the missing column is enough to tell me it isn't there either.
- **Your counts:** 2 users, 6 patients, 5 scans. This is real data, so the restore point below matters.

## Migrate production

Do this when nobody is using the app. Between the migration and the deploy, the old code can't create patients, scans or sign-ups, though reads keep working.

1. **Restore point:** in the Neon console, make a backup branch from production (normal data copy), or at least note the current time. Delete the backup branch once you're happy, because it holds patient data.
2. **Run the migration** in a terminal, using your real production connection string:

   ```bash
   cd ~/Documents/MEDISCAN-backend        # venv active
   export DATABASE_URL='postgresql://...PRODUCTION string...'
   export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
   export ENVIRONMENT=development STORAGE_BACKEND=local

   python -c "from backend.core.config import get_settings as g; print(g()._parsed_db_url.host)"   # must be the production host
   alembic current          # expect: 0002
   alembic upgrade head     # run exactly once
   alembic current          # expect: 0003 (head)
   unset DATABASE_URL JWT_SECRET_KEY
   ```

3. **Check the counts** in the SQL Editor on production, using the same query as on the dev branch. You should see one "Default Organisation" row, active, with 2 users, 6 patients and 5 scans.
4. **Merge and deploy straight away.** Merge `backend-orgs` into `backend` and deploy it the way you normally do. Then log in, list your patients and open a scan.

If step 2 fails, paste the last few lines of the error. A failed migration rolls back completely. If something breaks after it succeeds, `alembic downgrade 0002` undoes it as long as no new organisations have been created.

You haven't said whether to ship phase 1 alone or hold production until phase 2 is done. Either is fine, since the checks above stay valid. Tell me your choice, and tell me if you're unsure how you deploy.

## User:

> 10/20/2026 11:58:35

i don't think i need to create  a backup branch the production branch all contains data from tests i ran so let's just continue with the changes

## Assistant:

> 10/20/2026 11:58:44

> Clarifying whether to proceed with the production migration now.
>
> - Clarifying whether to proceed with the production migration now.
> - Adding to memory
> - **Done**

That's your call, and it's reasonable when the data is only test data. The migration also has a tested downgrade, so skipping the backup branch costs you very little. Here are the remaining steps. Pick a quiet moment, because between the migration and the deploy the old code can't create patients, scans or sign-ups.

**1. Migrate production.** Use a fresh terminal with the venv active:

```bash
cd ~/Documents/MEDISCAN-backend
export DATABASE_URL='postgresql://...PRODUCTION string...'
export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export ENVIRONMENT=development STORAGE_BACKEND=local

python -c "from backend.core.config import get_settings as g; print(g()._parsed_db_url.host)"   # must be the production host
alembic current          # expect: 0002
alembic upgrade head     # run exactly once
alembic current          # expect: 0003 (head)
unset DATABASE_URL JWT_SECRET_KEY
```

**2. Check the result.** Run this on production in the Neon SQL Editor. You should get one row, "Default Organisation", active, with 2 users, 6 patients and 5 scans:

```sql
SELECT o.name, o.status,
  (SELECT count(*) FROM users    WHERE organisation_id = o.id) AS users,
  (SELECT count(*) FROM patients WHERE organisation_id = o.id) AS patients,
  (SELECT count(*) FROM scans    WHERE organisation_id = o.id) AS scans
FROM organisations o;
```

**3. Deploy right away:**

```bash
git checkout backend && git merge backend-orgs
```

Then deploy as you usually do. Run the merge from your main folder (`MEDISCAN`), not from the worktree, because `backend` is checked out there and git won't let two folders hold the same branch. After deploying, log in, list your patients and open a scan.

**4. Flag yourself as platform admin (optional for now).** Nothing uses it until phase 4, so you can leave it. The SQL is in my earlier message if you want it done.

Tell me how the migration and the deploy go. If you're unsure how your deploy works, tell me what you use (FastAPI Cloud, Modal, something else) and I'll give you the exact commands. After that, phase 2 is next.

## User:

> 10/20/2026 12:57:39

git checkout backend && git merge backend-orgs
error: Your local changes to the following files would be overwritten by checkout:
        build/space/backend/routers/scans.py
        docs/api-contract.md
Please commit your changes or stash them before you switch branches.
Aborting

## Assistant:

> 10/20/2026 12:57:51

> Correcting earlier advice and planning a safe worktree merge.
>
> - Correcting earlier advice and planning a safe worktree merge.
> - **Done**

Nothing was changed. Git refused the checkout because your UI work in the main folder isn't committed. The two files it named, `build/space/backend/routers/scans.py` and `docs/api-contract.md`, are your in-progress UI edits, and your UI branch is still checked out there.

I got this wrong in my last message. I told you to run the merge from the main folder. That would have switched your UI folder to the `backend` branch, which isn't where you want to be working. The merge belongs in the backend worktree, which has nothing uncommitted. Leave the main folder alone.

```bash
cd ~/Documents/MEDISCAN-backend
git status                        # expect: on branch backend-orgs, working tree clean
git checkout backend
git merge --ff-only backend-orgs
git log --oneline -3              # the top commit should be "Organisations foundation..."
```

`--ff-only` is the safe form here. Your `backend` branch has had no commits since `backend-orgs` was created from it, so the merge just moves it forward. If `backend` has gained commits since then, git refuses and changes nothing. Paste the message if that happens.

If `git checkout backend` complains that the branch is in use, run `git worktree list` and paste the output.

After the merge, deploy the way you normally do. If you deploy by pushing that branch, the command is `git push origin backend`. I'm assuming the production migration succeeded and the counts in the SQL check matched (one "Default Organisation" row with 2, 6 and 5). If either didn't, don't deploy yet. Tell me what you saw.

## User:

> 10/20/2026 13:00:47

the backend is hosted on fastapicloud.com

## Assistant:

> 10/20/2026 13:01:10

> Checking how the previous deployment command was run.
>
> - Figuring out how to deploy the FastAPI backend.
> - FastAPI Cloud deploy fastapi deploy command environment variables docs
> - Checking how the previous deployment command was run.
> - **Done**

That changes where you deploy from. The CLI uploads the contents of a folder, not a git branch. That's why the merge and the deploy are two separate steps, and why the folder matters.

`fastapi cloud deploy` deploys the app from a directory, by default the current one. Your UI branch is checked out in `~/Documents/MEDISCAN`, so deploying from there would upload your unfinished UI-branch files instead of the merged backend. Deploy from the worktree.

The link between a folder and your FastAPI Cloud app is stored in a hidden `.fastapicloud` folder. Git ignores it, so the worktree won't have it. `fastapi cloud link` connects a local directory to an existing FastAPI Cloud app. You'll link the worktree once.

```bash
cd ~/Documents/MEDISCAN-backend          # venv active
git checkout backend && git merge --ff-only backend-orgs
git log --oneline -3                      # top commit: "Organisations foundation..."

ls -a | grep fastapicloud                 # expect: only .fastapicloudignore, no .fastapicloud folder
fastapi cloud link                        # choose your existing MediScan app from the list
fastapi deploy
```

Before you run it, check how you deployed last time with `history | grep -i "fastapi"` in your old terminal, or look at the commands in your shell history. Do it the same way, including the folder. If the old deploy used a different entry point, deploy settings or a `pyproject.toml`, the history will show it.

You don't need to change any environment variables for this release. They live in FastAPI Cloud, not in your local `.env`, and the new default-organisation setting already defaults to "Default Organisation", the name the migration created. `fastapi cloud env list` shows the variables currently set on the app, in case you want to look.

Once the deploy finishes, check these in order:
1. Log in to the deployed app.
2. List your patients and open a scan.
3. If anything errors, run `fastapi cloud logs` to see why, and paste me the last lines.

If `fastapi cloud link` doesn't list your app, or asks for a team or login, run `fastapi login` first. Paste whatever it prints if it isn't clear.

---

**Sources:**

- [FastAPI Project - Deployment](https://gitcode.com/GitHub_Trending/fu/full-stack-fastapi-template/blob/master/deployment.md)
- [fastapi deploy cli](https://pypi.org/project/fastapi-deploy-cli/)
- [pypi.org](https://pypi.org/project/fastapi-deploy-cli/0.1.0/)
- [fastapi-cloud-deploy - Man Page](https://www.mankier.com/1/fastapi-cloud-deploy)
- [fastapi deployment guide](https://abdulkareem.is-a.dev/posts/fastapi-deployment-guide/)
- [Package fastapi-cloud-cli](https://www.mankier.com/package/fastapi-cloud-cli)
- [fastapi-cloud - Man Page](https://www.mankier.com/1/fastapi-cloud)

## User:

> 10/20/2026 13:03:20

i deployed last time with the fastapi deploy command

## Assistant:

> 10/20/2026 13:03:25

> Figuring out the right deployment command for the worktree setup.
>
> - Figuring out the right deployment command for the worktree setup.
> - **Done**

Then it's the same command. The only difference is the folder and the one-time link:

```bash
cd ~/Documents/MEDISCAN-backend          # venv active
git checkout backend && git merge --ff-only backend-orgs
fastapi cloud link                        # one time: pick your existing MediScan app
fastapi deploy
```

Deploy from this folder and not from `~/Documents/MEDISCAN`. That folder has your UI branch checked out, so the deploy would upload the old backend code plus your unfinished UI changes, and it would run against a database that now has the organisation columns.

If `fastapi cloud link` doesn't show your app, run `fastapi login` and try again. When the deploy finishes, log in, list your patients and open a scan. If anything fails, run `fastapi cloud logs` and paste the last lines here.

## User:

> 10/20/2026 13:16:31

fastapi cloud logs

 📡 Streaming logs for 0ec2c462-c8af-44e8-90be-0a4b04d4a4ab (Ctrl+C to exit)...
 
 ▕  2026-10-20T12:11:44.718Z 
 ▕  2026-10-20T12:11:44.718Z  ⚡️ Starting FastAPI in production mode
 ▕  2026-10-20T12:11:44.718Z  
 ▕  2026-10-20T12:11:44.719Z     Could not find a default file to run, please provide an explicit path
 ▕  2026-10-20T12:11:44.719Z 
 ▕  2026-10-20T12:14:34.805Z 
 ▕  2026-10-20T12:14:34.806Z  ⚡️ Starting FastAPI in production mode
 ▕  2026-10-20T12:14:34.806Z  
 ▕  2026-10-20T12:14:34.806Z     Could not find a default file to run, please provide an explicit path
 ▕  2026-10-20T12:14:34.806Z 
^C

## Assistant:

> 10/20/2026 13:17:08

> Locating which folder contains the actual deployment config.
>
> - Tracing how the app previously deployed without an entrypoint file.
> - Check repo root for entrypoint/pyproject and fastapicloudignore
> - Investigating project structure and deployment ignore settings.
> - fastapi cli "Could not find a default file to run" entrypoint pyproject [tool.fastapi]
> - Locating which folder contains the actual deployment config.
> - **Done**

Your database and merged code are fine. The deployment can't find your app, which is separate from the migration. The logs show it starting twice and stopping each time on "Could not find a default file to run".

The `fastapi` command looks for an object called `app` in a file named `main.py` (or a couple of variants) and nothing else. Your app lives at `backend/main.py`, so a clean checkout of the repo doesn't match. Your repo has no `pyproject.toml` and no root `main.py`, so the last deploy must have relied on something that exists only in your main folder and not in the worktree. It could be an untracked file, or a different folder you deployed from.

## First, check whether the API is still up

The logs can't tell me whether the previous deployment is still serving. Load your app's `/health` URL in a browser, or log in through the UI. If it's down, the fix below is urgent.

## Find what the old deploy used

The link to your FastAPI Cloud app is stored in a `.fastapicloud` folder, so the folder that contains it is where you deployed from:

```bash
find ~/Documents/MEDISCAN -maxdepth 3 -name ".fastapicloud" -not -path "*/node_modules/*"
ls -a ~/Documents/MEDISCAN
ls -a ~/Documents/MEDISCAN/backend | head -30
```

If any of these exist, paste their contents:
- `pyproject.toml`
- a root-level `main.py` or `app.py`
- anything else in the folder that holds `.fastapicloud` that your repo doesn't have

## The likely fix

If `pyproject.toml` exists in the old folder, copy it into `~/Documents/MEDISCAN-backend` and commit it there. It was the real deploy configuration and just wasn't tracked by git.

If it doesn't exist, the clean fix is a small `pyproject.toml` at the repo root that tells the CLI where the app is. The documented setting is `[tool.fastapi]` with `entrypoint = "backend.main:app"`, and the docs recommend it because FastAPI Cloud may not detect the app otherwise. I want to see what the old folder contained first, though. A `pyproject.toml` can change how FastAPI Cloud installs your dependencies, and I don't want to swap that out from under you and break the build.

Don't redeploy from `~/Documents/MEDISCAN`. It has your UI branch checked out, so it would upload the old backend code and the build folder.

Paste the output of the three commands above, plus the result of your health check.

---

**Sources:**

- [fastapi cli](https://fastapi.tiangolo.com/fastapi-cli/?h=fastapi+cli)
- [github.com](https://github.com/fastapi/fastapi-cli/pull/310/files)
- [fastapi cli](https://fastapi.tiangolo.com/fastapi-cli/)
- [Перейти к содержанию](https://fastapi.tiangolo.com/ru/fastapi-cli/)
- [fastapi cli](https://fastapi.tiangolo.com/ja/fastapi-cli)
- [fastapi cli](https://fastapi.tiangolo.com/zh-hant/fastapi-cli/)
- [Перейти до змісту](https://fastapi.tiangolo.com/uk/fastapi-cli/)

## User:

> 10/20/2026 13:18:48

find ~/Documents/MEDISCAN -maxdepth 3 -name ".fastapicloud" -not -path "*/node_modules/*"
ls -a ~/Documents/MEDISCAN
ls -a ~/Documents/MEDISCAN/backend | head -30
/home/vincent/Documents/MEDISCAN/.fastapicloud
 .
 ..
 backend
 backend-upload.zip
 build
'Claude-MEDISCAN AI backend architecture decisions-20261008-1427.md'
 deploy
 dev.db
 docs
 .env
 eval_metrics_pneumonia_final.json
 .fastapicloud
'files (10)'
 frontend
 .git
 .gitignore
 MediScan_AI_Implementation_Plan_v3.md
 MediScan_NG_Implementation_Plan.md
 migrations
 model_card_pneumonia_final.md
 models
 model_training
 pass
 phase0.md
 pyproject.toml
 .pytest_cache
 .python-version
 README.md
 segmentation_findings.md
 storage_data
 summary.md
 SUMMARY.md
 tests
'train dataset ISNetPneumoniaDatasetUpdatedWork.md'
.
..
core
.env
env.example
.env.local.cors
models
__pycache__
requirements-ml.txt
requirements.txt
routers
schemas
scripts
services
venv

## Assistant:

> 10/20/2026 13:18:57

> Inspecting the project's folder structure and configuration files.
>
> - Inspecting the project's folder structure and configuration files.
> - **Done**

That confirms it. The deploy setup lives at the root of your main folder: `.fastapicloud` (the app link), `pyproject.toml` and `.python-version`. The worktree has none of them, so the platform had nothing telling it where your app is. Your repo's `backend` branch doesn't include them either, so they're probably untracked or ignored in git.

Don't copy them blindly yet. I need to see what they say, because `pyproject.toml` may hold both the entrypoint and your dependency list, and `.python-version` pins the Python version your last working deploy used. Run this and paste the output:

```bash
cd ~/Documents/MEDISCAN
cat pyproject.toml
echo "--- python-version:"; cat .python-version
echo "--- git:"; git status --short pyproject.toml .python-version
git check-ignore -v pyproject.toml .python-version
```

The last two commands show whether git is tracking those files, ignoring them, or has never seen them. If `pyproject.toml` contains any secrets, such as a connection string, replace them with `***` before pasting. I expect it doesn't.

The plan once I see it:
1. Copy `pyproject.toml` and `.python-version` into `~/Documents/MEDISCAN-backend` and commit them to the `backend` branch, so deploys no longer depend on untracked files in a folder that holds your UI work.
2. Link the worktree to your app with `fastapi cloud link`, or copy the `.fastapicloud` folder across. Linking is cleaner because it picks the app from your account.
3. Redeploy from the worktree with `fastapi deploy`.

Also tell me whether the app's `/health` URL answers right now, so I know how urgent this is.

## User:

> 10/21/2026 13:12:11

iv'e redeployed successfully

## Assistant:

> 10/21/2026 13:12:19

> Verifying the redeploy and planning follow-up configuration fixes.
>
> - Verifying the redeploy and planning follow-up configuration fixes.
> - Adding to memory
> - **Done**

Good, phase 1 is live. Production is on migration 0003 and the new code is deployed.

Two things are worth doing before moving on:

1. **Smoke test the deployed app.** Log in, list your patients, open a scan, and upload one new scan. The upload is the important one, because it's the write path that would have failed without the organisation columns. If anything errors, run `fastapi cloud logs` and paste the last lines.

2. **Commit the deploy files so you don't hit this again.** The deploy depends on `pyproject.toml` and `.python-version`. If you copied them into `~/Documents/MEDISCAN-backend`, commit them there:

   ```bash
   cd ~/Documents/MEDISCAN-backend
   git status --short                 # pyproject.toml / .python-version should show as new files
   git add pyproject.toml .python-version
   git commit -m "Track deploy config (entrypoint, Python version)"
   ```

   If `git status` doesn't list them, git is ignoring them. Run `git check-ignore -v pyproject.toml` to see which rule, and tell me. Don't commit `.fastapicloud`, since that's your local link to the app.

Also make sure the `backend` branch ends up with that commit, because `backend` is the branch you merged into earlier and the worktree is still on it. If `git branch --show-current` prints `backend`, you're fine.

Phase 2 is next: the scan fields (priority, projection, exam date, clinical notes, assignee, review status), flagging, `PATCH /scans`, `/staff`, dashboard stats and the activity feed, with migration 0004. Say the word and I'll start. And tell me whether your UI's scan list sends any filters, so I can add them to `GET /scans` in the same pass.

## User:

> 10/21/2026 13:27:05

the requests from the frontend go to the  dev backend for now i'll have to make the requests  go to the deployed backend it was fixed on the other branch the requests only go to the local backend

## Assistant:

> 10/21/2026 13:27:24

> Tracing how the frontend resolves its API base URL.
>
> - Pointing the frontend at the deployed backend instead of local.
> - Find how the frontend chooses its API URL and how CORS is configured
> - Tracing how the frontend resolves its API base URL.
> - **Done**

Switching is a one-line change on the frontend. I can only see the older frontend that ships on your `backend` branch, not your UI branch. That older version reads its API address from `VITE_API_BASE_URL` in `src/lib/api.ts`, and falls back to `https://mediscan.fastapicloud.dev` if the variable isn't set. If your UI branch kept that pattern, pointing the frontend at the deployed backend takes two steps:

```bash
cd ~/Documents/MEDISCAN/frontend
grep -rn "VITE_API_BASE_URL\|localhost:8000\|127.0.0.1" src .env* 2>/dev/null   # find what is hardcoded
```

Then set the variable in `frontend/.env.local` (git-ignored), with your real deployed URL:

```
VITE_API_BASE_URL=https://mediscan.fastapicloud.dev
```

Restart `npm run dev`, because Vite only reads env files at startup. If `grep` shows a hardcoded `localhost` URL in `api.ts` instead, that's the thing to replace with the variable. Paste `api.ts` and I'll show you the exact edit.

Four things to know when you switch:

- **CORS:** the deployed backend only accepts browser requests from origins it's been told about, and the default list is `http://localhost:5173` and `http://localhost:3000`. So `npm run dev` on port 5173 works as is. When you deploy the frontend, for example to Vercel (there's a `vercel.json`), its URL must be added through the `CORS_ORIGINS` setting on FastAPI Cloud. Otherwise the browser blocks every request. It takes a JSON list, like `["https://your-app.vercel.app"]`. Run `fastapi cloud env --help` to see how to set it, or use the dashboard.
- **Different data:** your local `dev.db` and the deployed Neon database are separate. Local test accounts won't exist on the deployed backend, so you'll log in with the two production users.
- **Sign-ups go to pending:** `POST /auth/register` on the deployed backend now creates users in "Default Organisation" as pending. Someone with an admin account there has to approve them.
- **Newer UI features:** the scan workflow fields, reports and organisation pages don't exist on the deployed backend yet. They arrive with phases 2 to 4, so keep the `VITE_SCAN_WORKFLOW`, `VITE_REPORTS` and `VITE_API_SHIM` settings as they are for now. A flag turned on before its backend exists will fail against the deployed server.

Once the frontend talks to the deployed backend, tell me how the smoke test goes: log in, list patients, upload a scan. Then I'll start phase 2, with the `GET /scans` filters your UI needs, if you tell me what it sends.

## User:

> 10/21/2026 13:29:23

grep -rn "VITE_API_BASE_URL\|localhost:8000\|127.0.0.1" src .env* 2>/dev/null   # find what is hardcoded
src/lib/api.ts:4:  import.meta.env.VITE_API_BASE_URL ??
src/lib/api.ts:6:    ? "http://127.0.0.1:7860"
.env.example:2:VITE_API_BASE_URL=https://mediscan.fastapicloud.dev
.env.local:1:VITE_API_BASE_URL=http://127.0.0.1:7860

## Assistant:

> 10/21/2026 13:32:46

> Tracing how the API base URL gets configured.
>
> - Tracing how the API base URL gets configured.
> - **Done**

The hardcoded address isn't the problem. `api.ts` only uses `http://127.0.0.1:7860` as a fallback when `VITE_API_BASE_URL` is unset. Your `.env.local` sets that variable to the local server, so it overrides everything. That one line is what to change.

Edit `frontend/.env.local` so it reads:

```
# VITE_API_BASE_URL=http://127.0.0.1:7860
VITE_API_BASE_URL=https://mediscan.fastapicloud.dev
```

Keeping the local line commented out lets you swap back by moving the `#`. Then stop `npm run dev` and start it again, because Vite reads `.env.local` only at startup.

To confirm it worked, open the browser dev tools on the Network tab, log in, and check that the requests go to `mediscan.fastapicloud.dev` and not `127.0.0.1`. Log in with one of the two production accounts, since your local test users don't exist there.

If the requests are blocked with a CORS error, the origin your dev server runs on isn't on the deployed allow-list. The default covers `http://localhost:5173` and `http://localhost:3000`. If Vite opens on `127.0.0.1:5173` or another port, either browse to `http://localhost:5173` instead or add that origin to `CORS_ORIGINS` on FastAPI Cloud. Paste the exact error if you see it.

Once login, the patient list and a scan upload all work against the deployed backend, tell me and I'll start phase 2.

## User:

> 10/21/2026 14:10:13

upload does not work the button does not respond too

## Assistant:

> 10/21/2026 14:10:23

> Diagnosing why the upload button fails to respond.
>
> - Diagnosing why the upload button fails to respond.
> - **Done**

A button that does nothing usually means the browser never sent a request, but I can't tell yet whether that's the frontend or the backend. Two quick checks will separate them.

## 1. In the browser

Open dev tools (F12), keep both the **Console** and **Network** tabs open, and click upload.
- **A red error in the Console and no new request in the Network tab:** the problem is in the frontend, in the click handler or in a disabled or validation state. Paste me the error.
- **A request to `/predict` appears:** click it and paste the status code and the response body. That is a backend problem.

## 2. Test the deployed backend directly

This skips the frontend entirely. Use any small X-ray image, with your real login and the real API address:

```bash
API=https://mediscan.fastapicloud.dev
curl -s $API/health; echo

read -p "email: " EMAIL; read -s -p "password: " PW; echo
TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" | python -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -s -X POST $API/predict -H "Authorization: Bearer $TOKEN" -F "file=@/path/to/xray.png" | head -c 600; echo
```

`read -s` keeps the password out of your shell history. Without a `patient_id`, the upload isn't saved, which is fine for this test.
- **JSON with findings:** the backend works, and the problem is the frontend.
- **An error:** paste it. If it's a 503 or mentions inference, the deployed server's inference backend setting is the issue, not the code I changed.

Also tell me whether the frontend's upload page was working against your local backend before you switched. If it was, it points to the frontend or the server config.

## User:

> 10/22/2026 10:53:55

it was working against the local backend      Traceback (most recent call last):
  File "<string>", line 1, in <module>
    import sys,json; print(json.load(sys.stdin)["access_token"])
                           ~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^
KeyError: 'access_token'
{"detail":"Not authenticated"}

## Assistant:

> 10/22/2026 10:54:03

> Diagnosing why the login response is missing a token.
>
> - Diagnosing why the login response is missing a token.
> - **Done**

The upload isn't the problem yet. The login step failed, so `$TOKEN` was empty and `/predict` correctly answered "Not authenticated". The `KeyError` means the login response had no `access_token`. It was probably an error message, such as a wrong password, an account waiting for approval, or too many login attempts.

My script hid that message, and it also built the JSON by hand, which breaks if your password contains a quote or a backslash. Use this version, which prints what the server actually said:

```bash
API=https://mediscan.fastapicloud.dev
curl -s $API/health; echo

read -p "email: " EMAIL; read -s -p "password: " PW; echo
export EMAIL PW
python - <<'EOF'
import os, json, urllib.request, urllib.error
req = urllib.request.Request(
    os.environ.get("API", "https://mediscan.fastapicloud.dev") + "/auth/login",
    data=json.dumps({"email": os.environ["EMAIL"], "password": os.environ["PW"]}).encode(),
    headers={"Content-Type": "application/json"})
try:
    r = urllib.request.urlopen(req); body = json.load(r)
    print("status", r.status, "keys:", list(body))
    open("/tmp/token", "w").write(body["access_token"])
except urllib.error.HTTPError as e:
    print("status", e.code, e.read().decode())
EOF
unset PW
```

I use `/tmp/token` only for this test. Don't paste the token anywhere. If it works, upload with:

```bash
curl -s -X POST $API/predict -H "Authorization: Bearer $(cat /tmp/token)" -F "file=@/path/to/xray.png" | head -c 600; echo
rm /tmp/token
```

Paste the line starting with `status`. The usual causes are:
- **401, "Invalid credentials":** wrong email or password. Your two production accounts may differ from your local test ones.
- **403, "Account pending administrator approval":** the account was never approved. I'd expect that only for a self-registered account.
- **403, "Organisation is not active":** the migration didn't backfill the organisation as active. That would be a real bug on my side, so tell me straight away.
- **429:** too many attempts. Wait a few minutes.

If the browser's upload button was dead for the same reason, this also explains it. The frontend is probably logged out, or carrying an old token from the local backend. After a successful login against the deployed backend, clear the site's local storage and log in again.

## User:

> 10/22/2026 10:55:15

where do i add the token

## Assistant:

> 10/22/2026 10:55:19

> Locating where to place the authorization token.
>
> - Locating where to place the authorization token.
> - **Done**

You don't add the token anywhere by hand. The login script saves it to a temporary file, `/tmp/token`, and the upload command reads it from there. That happens in the `-H "Authorization: Bearer $(cat /tmp/token)"` part of the `curl` line. The same terminal session runs both.

Run these in order, in the same terminal:

1. The login script from my last message. When it works it prints `status 200 keys: [...]`.
2. This upload command, with the path to a real image:
   ```bash
   curl -s -X POST https://mediscan.fastapicloud.dev/predict \
     -H "Authorization: Bearer $(cat /tmp/token)" \
     -F "file=@/path/to/xray.png" | head -c 600; echo
   rm /tmp/token
   ```

If step 1 printed an error instead of `status 200`, there's no token to use yet. Paste the `status` line.

If you meant the frontend, the same applies: you never paste a token in. Log in through the UI and it stores and sends the token itself. If the upload button is dead after you switched backends, it is probably still holding an old token from the local server. In the browser dev tools, open **Application → Local Storage**, clear the entries for your site, reload, and log in again with a production account.

## User:

> 10/22/2026 10:56:59

status 403 error code: 1010

## Assistant:

> 10/22/2026 10:57:10

> Crafting a curl-based login workaround with saved tokens.
>
> - Crafting a curl-based login workaround with saved tokens.
> - **Done**

Error 1010 is not from your backend. Your FastAPI app answers with JSON like `{"detail": "..."}`. A bare `error code: 1010` is a block from the network layer in front of it, which rejects requests with a script-like signature. My test script made that request with Python's default user-agent, so it was refused before reaching your code. Browsers and `curl` send different signatures, so this says nothing about your upload button.

Run the login with `curl` instead, and print the status and what the server said:

```bash
API=https://mediscan.fastapicloud.dev
read -p "email: " EMAIL; read -s -p "password: " PW; echo
export EMAIL PW
python -c 'import os,json; print(json.dumps({"email":os.environ["EMAIL"],"password":os.environ["PW"]}))' \
 | curl -s -o /tmp/login.json -w 'status %{http_code}\n' -X POST "$API/auth/login" \
     -H 'Content-Type: application/json' --data-binary @-
unset PW
python -c 'import json; d=json.load(open("/tmp/login.json")); print(d.get("detail") or list(d))'
```

If it prints `status 200` and a list of keys, save the token and upload:

```bash
python -c 'import json; print(json.load(open("/tmp/login.json"))["access_token"])' > /tmp/token
curl -s -X POST "$API/predict" -H "Authorization: Bearer $(cat /tmp/token)" \
  -F "file=@/path/to/xray.png" | head -c 600; echo
rm /tmp/token /tmp/login.json
```

If login prints something else, paste the status line and the message. This is the same response my first script hid behind the `KeyError`.

Separately, the dead button in the browser needs its own check. Open dev tools on the Network tab, click upload, and tell me whether a `/predict` request appears at all and what its status is. If nothing appears, check the Console tab for a red error and paste it.

## User:

> 10/22/2026 11:03:18

let me just test it from swagger UI

## Assistant:

> 10/22/2026 11:03:34

> Diagnosing why API docs are unreachable in production.
>
> - Check whether Swagger docs are enabled and how login/auth is declared
> - Diagnosing why API docs are unreachable in production.
> - **Done**

Swagger UI won't work on the deployed backend. Your `main.py` turns off `/docs` and `/openapi.json` when `ENVIRONMENT` is `production`, so that URL returns a 404. That's a sensible setting for a medical API, and I wouldn't switch it on just to debug.

You have two ways to get what you want.

## Option 1: test the real deployed server from the browser

This is the quickest. It's also the path that's actually failing for you. Open the app against the deployed backend with dev tools on the **Network** tab, log in, and click upload. Tell me:
- whether a `/predict` request appears at all, and its status code
- any red error in the **Console** tab

The earlier 1010 block hit my Python script, so your browser is very unlikely to be affected. `curl` usually isn't either, if you prefer the terminal version.

## Option 2: use Swagger UI locally, against the Neon dev branch

This tests the new code on real Postgres, but it doesn't test the deployed server. The dev branch holds only fake data, so it's safe. In a new terminal with the venv active:

```bash
cd ~/Documents/MEDISCAN-backend
export DATABASE_URL='postgresql://...DEV BRANCH string...'
export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export ENVIRONMENT=development STORAGE_BACKEND=local INFERENCE_BACKEND=mock

python -m backend.scripts.create_admin --email test@example.com --name "Test Admin"   # asks for a password
uvicorn backend.main:app --port 7860
```

Then open `http://127.0.0.1:7860/docs`:
1. Run `POST /auth/login` from the page and copy the `access_token` from the response.
2. Click **Authorize**, paste only the token value (no `Bearer` prefix), and confirm.
3. Run `POST /predict` with an image file.

With `INFERENCE_BACKEND=mock` the findings are fake, which is fine for checking the plumbing. Don't use this setup for anything involving real patient scans.

Paste what the Network tab shows for the upload, or the result from Swagger. The first one tells me whether the deployed app, the frontend, or the server settings is at fault.

## User:

> 10/22/2026 11:05:01

i'll test it locally from my computer iv'e logged  in successfully

## Assistant:

> 10/22/2026 11:05:05

> Confirming local login success and planning the next test.
>
> - Confirming local login success and planning the next test.
> - **Done**

That already tells us something useful. Login works against Postgres with the new code, so the `Default Organisation` check, the user lookup and the migration all behave. That part of the backend is fine.

Next, in the same Swagger page:
1. Click **Authorize** and paste only the `access_token` value (no `Bearer` prefix).
2. Open `POST /predict`, choose **Try it out**, pick an image file, and execute. Leave `patient_id` empty for the first try. That checks inference without saving anything.
3. If that works, run `POST /patients` to create a patient, copy the returned `id`, and run `/predict` again with that `patient_id`. This is the real upload path: it saves the scan with the new `organisation_id`.

Tell me the response code and body for each. A `200` with findings means the backend is healthy, so the dead button on the deployed frontend is something else, probably the stale local token or a frontend state problem. Any error body is what I need to see.

## User:

> 10/23/2026 13:30:53

provide a summary of all changes made and changes left to be  implemented   it  should be a .md file

## Assistant:

> 10/23/2026 13:31:43

> Listing outstanding issues and remaining phases to implement.
>
> - Listing outstanding issues and remaining phases to implement.
> - Write the MediScan backend progress summary as a markdown file
> - Presenting file(s)...
> - **Done**

The summary is in `mediscan-backend-progress.md`. It covers what's done (phase 1, the migration tests, the deploy and the frontend switch), the open issues, and the full plan for phases 2 to 4 with the decisions still pending.

Three items are marked "please confirm" because I haven't seen the output:
- the production migration's count check, which should show one "Default Organisation" row with 2 users, 6 patients and 5 scans
- the merge of `backend-orgs` into `backend`
- the commit of `pyproject.toml` and `.python-version`

The upload problem on the deployed frontend is listed as still open. Send me the result of the Swagger `/predict` tests when you have them, or the Network tab result.

> File: [/mnt/user-data/outputs/mediscan-backend-progress.md](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/578b9fa4-28bd-4fe4-b52c-4034d02a166a/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend-progress.md)

## User:

> 10/24/2026 13:54:58

> File: step6b-upload-feedback.patch

recent changes made

## Assistant:

> 10/24/2026 13:55:42

> Tracing compatibility between new form fields and the deployed backend.
>
> - Investigating a patch about upload feedback changes.
> - Read the uploaded patch overview
> - Read the rest of the patch
> - Tracing compatibility between new form fields and the deployed backend.
> - Add the upload-feedback patch to the progress summary
> - Presenting file(s)...
> - **Done**

I read `step6b-upload-feedback.patch`. It changes only the frontend, in three files, and it targets the dead upload button.

- **Errors now say what failed.** An error from the backend shows its message. A reply with no usable body, such as a proxy block, shows `Request failed (HTTP <status>)`. A timeout and an unreachable server (network or CORS) each get their own message.
- **The upload has a 120-second timeout and progress.** The button reads `Uploading… N%` and then `Analysing…`, and it is disabled while busy. Before, a stalled request could wait forever with no sign of life.
- **The page explains why the button is disabled.** An amber hint says "Select a patient and an image to upload", and failures appear in a red message under the button.

The patch looks correct to me, and I found nothing that would break the upload. It fixes the symptom, not the cause. If the button was only disabled because no patient had loaded, the amber hint will show it. If a request was failing, the real reason will now appear on screen. This is why I'd apply it before testing further. Once it's in, retry the upload against the deployed backend and tell me what the page says. Here's how to read the message:

- **"Cannot reach the server…":** a CORS or address problem. Check the exact origin the dev server runs on and `CORS_ORIGINS` on FastAPI Cloud.
- **`HTTP 403` with no detail:** a block in front of your app, like the 1010 one earlier.
- **A message from your backend:** that's a real backend answer, and I'll tell you what it means.
- **The amber hint, with no patient selected:** the patient list isn't loading. Check for a 401 on `/patients`, which usually means a stale token. Clear local storage and log in again.

The upload code sends `priority`, `assigned_to_id` and the other new fields, but only inside a conditional that is probably the scan-workflow flag. The deployed backend ignores those fields until phase 2. That is harmless, though the UI could look like it saved a priority or assignee when it didn't. Make sure `VITE_SCAN_WORKFLOW` is off against the deployed backend.

I added this patch to `mediscan-backend-progress.md` as section 2.6 and linked it to the open upload issue.

> File: [/mnt/user-data/outputs/mediscan-backend-progress.md](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/578b9fa4-28bd-4fe4-b52c-4034d02a166a/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend-progress.md)

## User:

> 10/24/2026 13:59:30

so what's the next feature to be implemented

## Assistant:

> 10/24/2026 13:59:38

> Deciding what feature to prioritize next.
>
> - Deciding what feature to prioritize next.
> - **Done**

Phase 2, the scan workflow, is next. It's the first piece your UI is waiting on, because the frontend already has the fields and screens for it (`VITE_SCAN_WORKFLOW`), and the deployed backend ignores them.

## What it adds

1. **New scan fields and migration 0004:** `priority`, `projection`, `exam_date`, `clinical_notes`, `assigned_to`, `review_status`, `reviewed_at` and `reviewed_by`. `POST /predict` accepts them as optional form fields.
2. **Flagging:** each finding gets a `flagged` value from per-condition score thresholds, and each scan gets `is_flagged`. TB never flags because it's experimental.
3. **`PATCH /scans/{id}`:** change priority, assignee or review status. Marking a scan reviewed records who did it and when.
4. **`GET /staff`:** the list that fills the assignee dropdown.
5. **`GET /dashboard/stats`:** total, pending, urgent, flagged and reviewed-today counts, scoped to the organisation, with "today" in Lagos time.
6. **`GET /activity`:** the activity feed, backed by a new table.
7. **Patients:** `GET /patients?q=` search, plus `scan_count` and `last_scan_at`.

I'd build it in that order, with tests for each piece, and give you one patch against your real code, as before.

## Two things to know first

- **The flag thresholds will be placeholders.** The right values come from your model's validation results at the sensitivity you want, and a clinician has to sign them off. I'll mark them clearly in the config so nobody mistakes them for reviewed values.
- **`GET /scans` filters:** you haven't said what your UI sends, so I'll add the obvious ones: `review_status`, `priority`, `assigned_to_id` and `flagged`, alongside the existing `patient_id`, `limit` and `offset`. If your UI uses other names, tell me and I'll match them.

The phase 1 release routine applies again: test the 0004 migration on your Neon dev branch (up, down, up), run it on production, deploy, then turn on `VITE_SCAN_WORKFLOW`. Say go and I'll start building.

## User:

> 10/24/2026 13:59:58

go

## Assistant:

> 10/24/2026 14:09:17

> Drafting scan schema changes with migrations and FK constraints.
>
> - Implementing phase two across the scan models and routers.
> - Review current scan/patient code before phase 2
> - Handling blank form fields and validating scan metadata inputs.
> - Gather remaining context for phase 2 design
> - Check how the frontend renders activity messages
> - Drafting scan schema changes with migrations and FK constraints.
> - Add model, config and flagging changes for phase 2
> - Write schemas, activity and dashboard services
> - **Done**

Still on phase 2. The models, schemas, flagging rule, activity feed and dashboard stats are written. I'm now writing the scan service, patient search, the routes and migration 0004, then the tests.

> Updating progress notes and preparing the final summary.
>
> - Write scan service, patient search/stats and approval activity
> - Checking how special characters are escaped in the query.
> - Write routers for scans, predict, patients, staff, dashboard, activity
> - Write migration 0004, test up/down/up and alembic check, run existing tests
> - Outlining test cases for validation, filters, and stats logic.
> - View test helper signatures
> - Fixing test helpers to generate distinct user identities.
> - Write scan workflow tests and run them
> - See why the first-review test failed
> - Diagnosing a timestamp mismatch between two API responses.
> - Fixing a SQLite timezone quirk before writing remaining phase 2 tests
> - Fix timestamp test; add flagging tests and run both files
> - Detailing expected counts and timezone edge cases for dashboard stats.
> - Write stats/feed/staff/patient tests, extend migration test, run full suite
> - Testing mutations to confirm coverage of key safeguards.
> - Mutation checks on the new phase 2 logic
> - Reviewing Postgres-specific risks and preparing patch verification.
> - Add tzdata and env docs, final test run, alembic check, diff summary
> - Untangling commit history across phased edits.
> - Build phase 2 patch and prepare a clean tree with phase 1 applied
> - Verify phase 2 patch applies on top of phase 1 and tests pass
> - Updating progress notes and preparing the final summary.
> - **Done**

The phase 2 patch applies cleanly on top of phase 1 and the full suite passes. I'm updating the progress file and handing over the patch.

> Ran command, presented file, used tool
>
> - Adding to memory
> - Update the progress summary with phase 2 status
> - Presenting file(s)...
> - **Done**

Phase 2 is built and tested. The patch is `backend-phase2-scan-workflow.patch`. It touches 29 files and applies on top of phase 1 with no `-p` flag. The full suite passes: 248 passed and 1 skipped, with 43 new tests. `alembic check` is clean, and deliberately breaking seven of the new rules made the tests fail each time. I haven't run it on Postgres.

## What's in it

- **Scan fields and review state:** migration 0004 adds priority, projection, exam date, clinical notes, assignee and review fields to `scans`, and creates the `activities` table. Existing scans become routine and pending.
- **`POST /predict`:** accepts the new optional fields, treats blank values as missing, and rejects bad values with 422.
- **`PATCH /scans/{id}`:** changes priority, assignee and review status. The first review wins, so who reviewed and when is never overwritten.
- **Flagging:** each finding gets `flagged` and each scan gets `is_flagged`. Experimental findings never flag. I tested the Python rule against the SQL rule used by stats and filters across a grid of scores, and they agree.
- **New endpoints:** `GET /staff`, `GET /dashboard/stats` (Lagos day, `tzdata` added to requirements) and `GET /activity`.
- **Other changes:**
  - `GET /scans` filters: `review_status`, `priority`, `assigned_to_id` (a user id, or `me`) and `flagged`.
  - `GET /patients?q=` search, with `%`, `_` and `\` treated as literal characters.
  - `scan_count` and `last_scan_at` on each patient.

## Check before real use

- **Flag thresholds are 0.5 placeholders for every condition.** They need to come from your validation results and a clinician's sign-off.
- **Activity messages are complete lines** like "Dr Doc uploaded a scan for PT-XXXX", with the actor also returned separately. If your UI prints the actor's name in front of each message, the name will appear twice. Tell me if so and I'll shorten the text.
- **Un-reviewing is allowed for now.** A scan can go back to pending. Phase 3 will block that once a final report exists.

## Apply and release

```bash
cd ~/Documents/MEDISCAN-backend          # venv active
git apply --check ~/Downloads/backend-phase2-scan-workflow.patch
git apply -v ~/Downloads/backend-phase2-scan-workflow.patch
pip install -r requirements.txt           # picks up tzdata
python -m pytest -q                       # expect 248 passed
git add -A && git commit -m "Scan workflow: clinical fields, review state, flagging, staff, stats, activity"
```

Then repeat the release routine from phase 1:
1. On the Neon dev branch, run `alembic upgrade head`, then `alembic downgrade 0003`, then `alembic upgrade head`. The dev branch is already at 0003, so no stamping is needed.
2. Run the migration on production, then deploy.
3. Turn on `VITE_SCAN_WORKFLOW=1`.

Paste the apply and test output, or any error. The updated `mediscan-backend-progress.md` has a phase 2 section too. Reports (phase 3) come next when you're ready.

> File: [/mnt/user-data/outputs/backend-phase2-scan-workflow.patch](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/578b9fa4-28bd-4fe4-b52c-4034d02a166a/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fbackend-phase2-scan-workflow.patch)

> File: [/mnt/user-data/outputs/mediscan-backend-progress.md](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/578b9fa4-28bd-4fe4-b52c-4034d02a166a/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend-progress.md)

## User:

> 10/24/2026 14:15:59

how do i apply the migrations

## Assistant:

> 10/24/2026 14:16:09

> Outlining steps for rolling out the phase-two migration.
>
> - Outlining steps for rolling out the phase-two migration.
> - **Done**

Run the migration in two stages, on the dev branch first and then on production. Both use the same commands against a different connection string. Do this after you've applied the patch and the tests pass.

## 1. Dev branch (the safe rehearsal)

Open a fresh terminal with the venv active:

```bash
cd ~/Documents/MEDISCAN-backend
export DATABASE_URL='postgresql://...DEV BRANCH string...'
export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export ENVIRONMENT=development STORAGE_BACKEND=local

python -c "from backend.core.config import get_settings as g; print(g()._parsed_db_url.host)"   # must be the dev branch host
alembic current          # expect: 0003
alembic upgrade head     # applies 0004
alembic downgrade 0003   # proves it can be undone
alembic upgrade head     # applies it again
alembic current          # expect: 0004 (head)
```

Then check it in the Neon SQL Editor, with the dev branch selected. Your fake seed scan should have picked up the defaults:

```sql
SELECT priority, review_status, assigned_to_id FROM scans;   -- routine, pending, null
SELECT count(*) FROM activities;                              -- 0
```

## 2. Production

When the dev run is clean, open a **new terminal** (or run `unset DATABASE_URL JWT_SECRET_KEY` first), then repeat the same commands with your production connection string:

```bash
export DATABASE_URL='postgresql://...PRODUCTION string...'
export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export ENVIRONMENT=development STORAGE_BACKEND=local

python -c "from backend.core.config import get_settings as g; print(g()._parsed_db_url.host)"   # must be the production host
alembic current          # expect: 0003
alembic upgrade head     # run exactly once; skip the downgrade test here
alembic current          # expect: 0004 (head)
unset DATABASE_URL JWT_SECRET_KEY
```

Then run the same SQL check on production. The old test scans should show `routine` and `pending`.

## 3. Deploy

```bash
cd ~/Documents/MEDISCAN-backend
fastapi deploy
```

This migration is safe to run before the deploy, unlike the organisations one. The new columns have defaults and the new table is unused by the old code, so the app you have live keeps working in between. You only need to deploy soon, not instantly.

If a step fails, a failed migration rolls back completely. Paste the last few lines of the error, starting from the line that begins `sqlalchemy.exc`, and I'll sort it out.

## User:

> 10/24/2026 14:44:27

iv'e redeployed successfully

## Assistant:

> 10/24/2026 14:44:36

> Planning post-deployment verification and next rollout steps.
>
> - Planning post-deployment verification and next rollout steps.
> - Adding to memory
> - **Done**

Phase 2 is live. Now check that it works end to end.

## 1. Check the deployed API

Log in through your frontend against the deployed backend and look at these in the browser's Network tab, or in a local Swagger session against the dev branch:

- `GET /dashboard/stats` returns five numbers.
- `GET /staff` lists your colleagues, with no email addresses.
- `GET /scans` now includes `priority`, `review_status` and `is_flagged` on each scan.

If any of them returns a 500, run `fastapi cloud logs` and paste the last lines. A 500 right after a deploy usually means the production migration didn't run, since the new code reads columns that wouldn't exist yet. I haven't seen the output of your production `alembic upgrade head`, so tell me if you skipped it.

## 2. Turn on the frontend flag

In `frontend/.env.local`, set:

```
VITE_SCAN_WORKFLOW=1
```

Restart `npm run dev`, then try the whole flow: upload a scan with a priority and an assignee, change its priority, mark it reviewed, and watch the dashboard counts and the activity feed update. If your UI uses a stand-in for these endpoints (`VITE_API_SHIM`), switch that off so it's talking to the real backend.

## 3. Two things to watch for

- **Flag thresholds:** every condition is set to 0.5 until a clinician signs off real values, so expect more or fewer flagged scans than will be right in practice.
- **Activity messages:** each one includes the actor's name ("Dr Doc uploaded a scan for PT-XXXX"). If your UI also shows the name next to the message, it will appear twice. Tell me, and I'll shorten the text.

Also make sure the phase 2 changes are committed on the backend branch and that `git status` is clean in the worktree.

When this checks out, I can start phase 3: structured reports, which the finalise step ties to marking a scan reviewed. Or tell me what you saw if something doesn't look right.

## User:

> 10/24/2026 15:43:53

![1792852842915_image.png](data:image/webp;base64,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)

![1792852852775_image.png](data:image/webp;base64,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)

![1792852875843_image.png](data:image/webp;base64,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)

![1792852893476_image.png](data:image/webp;base64,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)

![1792852950187_image.png](data:image/webp;base64,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)

VITE_API_SHIM does not display i think some features got turned off when i was making changes to the frontend i guess i need to send you the frontend files again  and there's a feature of the signup page that needs to be brought back i'll attach the screen shots how do i bundle the frontend files and send them to you i mistakenly removed these pages as i was fixing the frontend  there was also an onboarding animation so i do not know if the code is still there dormant or i removed it

## Assistant:

> 10/24/2026 15:44:40

> Clarifying how the development flag affects visible features.
>
> - Clarifying how the development flag affects visible features.
> - Updating memory
> - **Done**

The pages you removed are probably still recoverable from git, and recovering them exactly is better than me rewriting them. Check git first, then bundle the files.

## 1. Find out whether the code still exists

From the repo root, with your UI branch checked out:

```bash
cd ~/Documents/MEDISCAN
grep -rIn "verify-email\|onboarding\|Email Verified" frontend/src | head -20
git log --all --diff-filter=D --name-only --format='%h %s' -- frontend/src | head -40
git log --all --oneline -S"Email Verified" -- frontend/src | head
```

- **First command:** any hits mean the code is still in your current files, possibly dormant (a page that exists but has no route to it). That is where the animation may be too.
- **Second and third commands:** these list files that were deleted at some point and the commits that removed them, so each page can be restored with `git checkout <commit>^ -- <file>`.

Paste the output of these three. It may be enough on its own.

## 2. Bundle your current frontend

This zip leaves out `node_modules`, build output and your local env file, which are large or may hold settings you don't want to share:

```bash
cd ~/Documents/MEDISCAN
git branch --show-current
zip -r ~/frontend-current.zip frontend \
  -x "frontend/node_modules/*" "frontend/dist/*" "frontend/.vercel/*" "frontend/.env.local" "frontend/.env*.local"
unzip -l ~/frontend-current.zip | grep -iE "node_modules|\.env"   # should list only .env.example
ls -lh ~/frontend-current.zip                                       # a few MB at most
```

It captures your working tree as it is now, including edits you haven't committed. Also print just the names of your env settings, without their values:

```bash
cut -d= -f1 frontend/.env.local
```

## 3. Bundle the version that still has the pages

Your screenshots come from the Vercel site (`mediscan-ng.vercel.app`), which was built from some older commit or branch. Find which one in the Vercel dashboard under **Settings → Git → Production Branch**, or with `git branch -a`. Then:

```bash
git archive --format=zip -o ~/frontend-<branch-name>.zip <branch-name> frontend
```

`git archive` only includes files that git tracks, so nothing secret can slip in. With both zips I can compare them and give you a patch that restores the signup, verification and onboarding pages on your current branch, wired back into the routes.

Upload `frontend-current.zip` and, if you have it, the old-branch zip.

## About `VITE_API_SHIM`

It shouldn't display anything. It switches on a fake backend that answers requests in place of the real one, so there's nothing to see in the UI. It also never goes into a production build. What you'd notice is the pages it backs. Now that scans are real, set `VITE_SCAN_WORKFLOW=1` and leave the shim off. Reports aren't real yet (phase 3), so the reports pages still need `VITE_API_SHIM=1` together with `VITE_REPORTS=1`.

## Screens that go beyond the contract

The screenshots show three things that API contract v3 doesn't cover:
- **Email verification:** the page says "Email Verified (Demo)". Nothing in the contract sends or checks email. Invites are shared as links.
- **Organisation logo upload and "Number of Radiologists":** the contract only has user avatars, and the organisation has no logo or radiologist-count field.
- **The order of the steps:** with real approval, a new organisation stays pending until a platform admin approves it. The onboarding steps (profile, invite team) need a logged-in admin, so they can only run after approval.

When you decide what to do with these, say so. We can keep them as UI-only for now or extend the backend, and I'd rather settle that before phase 4.

## User:

> 10/24/2026 15:47:03

cd ~/Documents/MEDISCAN
grep -rIn "verify-email\|onboarding\|Email Verified" frontend/src | head -20
git log --all --diff-filter=D --name-only --format='%h %s' -- frontend/src | head -40
git log --all --oneline -S"Email Verified" -- frontend/src | head
frontend/src/pages/OrgOnboardingPage.tsx:119:                   // const response = await axios.post('/api/auth/organisations/complete-onboarding/', {
frontend/src/pages/OrgOnboardingPage.tsx:127:                   setErrors({ submit: "Failed to complete onboarding. Please try again." });
frontend/src/pages/EmailVerificationPage.tsx:45:                        navigate("/onboarding");
frontend/src/pages/EmailVerificationPage.tsx:66:                                                        {verified ? "Email Verified!" : "VerifyYour Email"}
frontend/src/pages/EmailVerificationPage.tsx:71:                                                                        Your email has been verified. Redirecting to onboarding...
frontend/src/pages/EmailVerificationPage.tsx:131:                                                                                       Complete onboarding
frontend/src/pages/EmailVerificationPage.tsx:145:                                                               ✓ Email Verified (Demo)
frontend/src/App.tsx:36:                                        path="/verify-email"
frontend/src/App.tsx:39:                                <Route path="/onboarding" element={<OrgOnboardingPage />} />
61af499 Reports: structured editor, drafts, submit, list, printable view (dev shim)

frontend/src/pages/PatientReportPage.tsx
frontend/src/pages/PatientReportViewPage.tsx
a7f940f refactor: rename page components to follow View suffix convention and update page import mapping

frontend/src/pages/caseUploadPage.tsx
6fc2b12 delete: remove frontend integration for previous backend

frontend/src/utils/api.ts
frontend/src/utils/auth.ts
frontend/src/utils/storage.ts
f12041b fix build errors

frontend/src/components/svgs/Github.tsx
931f878 feat: refactor code structure add, onboading pages and

## Assistant:

> 10/24/2026 15:47:27

> Pinpointing the commit that cut the verification redirect.
>
> - Pinpointing the commit that cut the verification redirect.
> - **Done**

Good news: the pages weren't deleted. Both are still in your current files, and neither deleted-files list shows them.

- **`EmailVerificationPage.tsx`** exists and is routed at `/verify-email` in `App.tsx` (line 36).
- **`OrgOnboardingPage.tsx`** exists and is routed at `/onboarding` (line 39).
- **Nothing links to `/verify-email`:** the only match for it in your whole `src` is the route definition itself. So no signup page sends anyone there. The step you removed is most likely the signup page's redirect, not the pages.

Your deleted-file history agrees. It shows the reports pages, an old `caseUploadPage.tsx` rename, old API utilities and a stray icon. Commit `931f878` ("add onboarding pages") is where the "Email Verified" text first appeared, so the pages were never lost.

## Find what the signup page used to do

This finds the signup page and the commits that touched the `/verify-email` link:

```bash
cd ~/Documents/MEDISCAN
grep -rIln "Register Your Organi" frontend/src          # the signup page file
git log --all --oneline -S'"/verify-email"' -- frontend/src
git log --all --oneline -S"framer-motion" -- frontend/package.json
grep -rIln "keyframes\|framer-motion\|lottie\|animate-" frontend/src | head
```

- **Second command:** each commit it lists added or removed a use of that link. The newest one is probably where it was lost, and `git show <commit> -- <signup file>` will show exactly what changed.
- **Third and fourth commands:** these look for the onboarding animation. A library like `framer-motion` removed from `package.json` would be one sign. The `grep` shows whether animation code still sits in a page or component.

Paste the output, or send `frontend-current.zip` as described before.

## What needs backend work later

- **`OrgOnboardingPage.tsx`:** the real API call is commented out (`complete-onboarding`), and that endpoint isn't in API contract v3.
- **`EmailVerificationPage.tsx`:** its button says "Email Verified (Demo)", which is a fake. No email is sent anywhere.

Both stay as UI-only until phase 4. That is where `register-organisation`, invitations and platform approval get built, and I'd line these screens up with it then.

## User:

> 10/24/2026 15:49:04

> File: frontend-current.zip

## Assistant:

> 10/24/2026 15:49:18

> Tracing how the email verification route was replaced.
>
> - Exploring the frontend project's structure and key files.
> - Unzip frontend and list files and dependencies
> - Reviewing the organization signup and onboarding flow.
> - Read routes, feature flags, main entry, env and shim header
> - Tracing how the email verification route was replaced.
> - List files touched by earlier patches and search for animations
> - **Done**

## User:

> 10/26/2026 13:59:55

Continue

## Assistant:

> 10/26/2026 14:00:12

> Explaining the intentional shift to an honest verification page.
>
> - Reviewing the patch diff for removed email verification flow.
> - Read what the honest-ui patch changed in routes, signup and pending pages
> - Explaining the intentional shift to an honest verification page.
> - Read email verification page and look for onboarding animation and navigation into onboarding
> - **Done**

## User:

> 10/27/2026 13:46:40

Continue

## Assistant:

> 10/27/2026 13:47:08

> Weighing honest versus demo options for restoring the flow.
>
> - Weighing honest versus demo options for restoring the flow.
> - Confirm how the API shim and feature flags are gated
> - **Done**

Your files are all here, and nothing was lost by accident. The signup flow was **disconnected on purpose** by an earlier step of the refactor. I read your zip, including the `step4-honest-ui.patch` inside it.

## What happened to the signup flow

- **`EmailVerificationPage.tsx`:** the file is still in your tree, with the "Email Verified!" check-circle swap and the 2-second redirect. It is no longer imported in `App.tsx`.
- **`/verify-email`:** it now redirects to `/pending-approval`. The patch left a comment in `App.tsx` saying the backend approves accounts manually and there is no email verification.
- **`OrganisationSignupPage.tsx`:** it used to navigate to `/verify-email`. It now goes to `/pending-approval`, a new honest page called "Registration received" that says an administrator must approve the account.
- **`OrgOnboardingPage.tsx`:** it is still routed at `/onboarding`, and the progress bars and step switch are intact. Its only entry point was the verification page's "verified" button, so nothing leads there now. Its API call is commented out.
- **The onboarding animation:** the animated pieces are the check-circle swap on the verification page, the progress bars (`transition-all`) and the spinner on the onboarding page. I found no animation library, so you aren't missing a package. If you remember something richer than that, it was probably on the Vercel version only, so send the zip for that branch.

The old flow is also dishonest for users: it says "we sent a verification link" while nothing is sent, and the button is labelled "(Demo)". Restoring it as it was would mislead real signups on a medical product.

## What I'd do

1. **Now: put the old flow back behind a flag, off by default.** `VITE_DEMO_SIGNUP_FLOW=1` would route signup to the verify and onboarding screens as before. That is useful for demos on Vercel, and real users keep seeing the honest page.
2. **In phase 4: make the screens real.** After the platform admin approves an organisation and the admin logs in for the first time, they land on onboarding:
   - Step 1 saves the job title to the profile.
   - Step 2 creates real invites and shows each invite link with a copy button, since no emails are sent.
   - The check-circle animation shows when setup finishes.

   The organisation logo and "Number of Radiologists" fields aren't in the contract, so I'd drop them or keep them UI-only. Say if you want them kept.

## `VITE_API_SHIM`

It is gated by `import.meta.env.DEV`, so it only works under `npm run dev` with `VITE_API_SHIM=1` in `.env.local`. It never runs on Vercel, and it shows nothing itself. It only answers API calls with fake data. It does turn on the scan-workflow and reports flags, and those are what show the extra UI. For the real backend, which now has phase 2, set `VITE_SCAN_WORKFLOW=1` without the shim.

Should I build the flag patch for the old signup flow now, or leave the signup as it is until phase 4? Either way, send the older branch's zip if you want me to compare the animation.

## User:

> 10/28/2026 13:57:20

it's the same animation build the flag patch for  the old signup flow and i need to enable the scan workflow and report flags too since we have added the tables to the backend

## Assistant:

> 10/28/2026 13:57:55

> Checking frontend calls against the backend's parameters and fields.
>
> - Checking how the scan workflow and report flags are set up.
> - Find where the flags are used and which API calls the frontend makes
> - Checking frontend calls against the backend's parameters and fields.
> - Read the frontend API layer for scans, dashboard, staff and upload
> - **Done**

## User:

> 10/29/2026 9:30:40

Continue

## Assistant:

> 10/29/2026 9:33:53

> Weighing how the feed's actor name repeats.
>
> - Reviewing App.tsx routes and feature flags for the signup patch.
> - Read routes, flags, signup navigation and package scripts
> - Checking the verify-page email source and the onboarding route.
> - Check how verify page gets the email and install dependencies
> - Adding a demo signup flow and wiring in the verification page.
> - Baseline type-check and lint before editing
> - Baseline type-check and lint
> - Checking lint errors against the baseline before changing anything.
> - Implement the demo signup flag and type-check and lint
> - Comparing both builds for the navigation target.
> - Building the app with the flag on and off
> - Build with the flag off and on and compare the bundles
> - Checking why the demo text is missing from the build.
> - Create the patch and verify it applies to the original zip and type-checks
> - Updating memory with the flag patch and rollout plan.
> - Check how the activity feed renders messages and actors
> - Weighing how the feed's actor name repeats.
> - Adding to memory
> - Presenting file(s)...
> - **Done**

The old signup flow is back behind a flag, in `step7-demo-signup-flag.patch`. It changes 4 files and applies to your zip from the repo root with plain `git apply`. Type-check passes, lint shows the same 18 errors it had before (none are new), and the app builds both ways. I haven't opened it in a browser.

With `VITE_DEMO_SIGNUP_FLOW=1`, signup goes to the "Verify Your Email" page (the animation is unchanged) and then to onboarding. Without the flag, which is the default, users get the honest pending-approval page. In the flag-off build the demo page is stripped out entirely.

The patch also puts all three flags in `.env.example`. Remember that the demo flow is a prototype. No email is sent, and the onboarding page doesn't save anything. Don't turn it on for real users.

## Apply it

```bash
cd ~/Documents/MEDISCAN                    # your UI branch
git apply --check ~/Downloads/step7-demo-signup-flag.patch
git apply -v ~/Downloads/step7-demo-signup-flag.patch
cd frontend && npm run build               # expect no errors
git add -A && git commit -m "Demo signup flow behind VITE_DEMO_SIGNUP_FLOW"
```

## Flags

**Scan workflow: turn it on now.** I read your frontend's calls against the phase 2 backend. The upload fields, `PATCH /scans`, `/staff`, `/dashboard/stats` and `/activity` all line up. Add this to `frontend/.env.local`:

```
VITE_SCAN_WORKFLOW=1
```

Restart `npm run dev` after any change.

**Reports: please leave `VITE_REPORTS` off for now.** The backend doesn't have reports yet. What we added was the scan workflow (migration 0004). There is no reports table and no `/scans/{id}/report`, `finalise` or `/reports` endpoint. Phase 3 builds those. With the flag on, the report editor and list would call endpoints that return 404, and every save would fail. The flag stays on only with the dev stand-in (`VITE_API_SHIM=1`) under `npm run dev`.

**Vercel:** Vite bakes flags into the build. For the hosted site, set `VITE_SCAN_WORKFLOW=1` under Project Settings → Environment Variables, then redeploy. Setting `VITE_DEMO_SIGNUP_FLOW` there is optional, for demos only.

## One small thing on the activity feed

Your feed shows the message on one line and the person's name underneath, but the messages I wrote already start with the name ("Dr Doc uploaded a scan for PT-XXXX"). It reads fine but repeats the name. I can drop the name from the backend text, giving "Scan uploaded for PT-XXXX", with the name coming from the actor line. That is a one-line change in phase 3 and needs no migration.

Phase 3 builds the report table and endpoints, which finish the report flow. Do you want me to start it?

> File: [/mnt/user-data/outputs/step7-demo-signup-flag.patch](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/578b9fa4-28bd-4fe4-b52c-4034d02a166a/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fstep7-demo-signup-flag.patch)

## User:

> 10/29/2026 9:40:36

yes

## Assistant:

> 10/29/2026 10:03:10

> Writing update message strings for phase 3.
>
> - Adding list and filter rules for finalised reports.
> - Read the frontend reports API layer and the stand-in's error shapes
> - Checking how the frontend's error handler reads the stand-in's messages.
> - Read the required-field labels and the stand-in's report endpoint behaviour
> - Planning tests for the report endpoints and concurrency.
> - Commit phase 2 as the baseline and find activity message uses
> - Writing update message strings for phase 3.
> - Update activity messages, add un-review guard and the Report model
> - Write report schemas, service, router and register it
> - **Done**

Still on phase 3. The report model, schemas, service and routes are written. I'm fixing one import, adding migration 0005, and then writing the report tests.

> Checking whether a timed-out change left files altered.
>
> - Add migration 0005, test it up/down/up with alembic check, run existing tests
> - Write report tests and run them
> - Find why the immutability test failed
> - Adjusting the timezone suffix comparison in the test.
> - Fix the test, run the full suite, and run mutation checks on report rules
> - Investigating two test failures in the full suite.
> - See why the privacy and cascade tests failed
> - Checking whether database logging exposes patient data.
> - Check engine logging settings
> - Choosing hide_parameters to keep patient text out of logs.
> - Closing a privacy gap and fixing a test error
> - Hide SQL parameters in logs, fix tests, run mutation checks on report rules
> - Baseline failures make mutation results meaningless.
> - Look for a leftover mutation from the aborted shell run
> - Rerunning the full test suite and mutation checks.
> - Restore the leftover mutation and rerun the full suite
> - Diagnose the two remaining test failures
> - Choosing a test engine that uses the production factory.
> - See how existing tests enable SQLite foreign keys and build their engine
> - Fix the privacy and cascade tests and rerun the suite
> - Running the mutation checks again on a green baseline.
> - Re-running mutation checks on a clean baseline
> - Rerun mutation checks on a green baseline and confirm the tree is restored
> - Checking whether a timed-out change left files altered.
> - **Done**

The mutation run hit the time limit. A run that stops midway can leave a mutated file in place, so I'm checking the tree against the clean copy first.

> Checking whether the background job survived.
>
> - Check whether the timeout left a mutation behind
> - Checking how the backend copy path would nest.
> - Restore the mutated file and start faster mutation checks in the background
> - Wait for the background mutation checks
> - Check mutation progress
> - Checking whether the background job survived.
> - Verify no mutation was left applied by the stopped background job
> - **Done**

## User:

> 10/29/2026 15:12:47

Continue

## Assistant:

> 10/29/2026 15:13:18

> Setting up mutation runs on a safe project copy.
>
> - Setting up mutation runs on a safe project copy.
> - **Done**

The tree is intact. To make this safe, I'll run the mutation checks on a separate copy of the project so a stopped run can't touch the real code.

> Ran command
>
> - Run mutation checks on a throwaway copy, detached from this shell
> - **Done**

Powered by Claude Exporter (https://www.ai-chat-exporter.net)
