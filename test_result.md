#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
## Iteration 2 — Revisione 1: palette + juice (main agent)
frontend:
  - task: "New palette tokens (theme.ts) dark+light, felt dark green in light, new tokens reward/progress/rare/streak/interactive/feltCenter/scrim/onFelt"
    implemented: true
    working: "NA"
    file: "frontend/src/theme.ts"
    needs_retesting: true
  - task: "Token migration: interactive for selection/links/focus (Pill, tab bar, quiz option, onboarding level, table to-act), brandPrimary only CTA/bet, reward for score, progress for bars"
    implemented: true
    working: "NA"
    file: "frontend/src/ui/components.tsx, app/table.tsx, app/(tabs)/*.tsx, app/quiz/[id].tsx, app/onboarding.tsx, app/report.tsx"
    needs_retesting: true
  - task: "Table radial felt (SVG RadialGradient feltCenter->felt), CountUp on score/pot/stacks, FlashView on hero win, action buttons PressableScale"
    implemented: true
    working: "NA"
    file: "frontend/app/table.tsx"
    needs_retesting: true
  - task: "Motion utilities: PressableScale, CountUp, FlashView, usePressDepth, useMotionEnabled; PrimaryButton lip; haptics wrapper"
    implemented: true
    working: "NA"
    file: "frontend/src/ui/motion.tsx, frontend/src/ui/haptics.ts, frontend/src/ui/components.tsx"
    needs_retesting: true
  - task: "Profile: 'Riduci animazioni' switch (Sistema/Sì/No) persisted in profile.reduceMotion"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/profile.tsx, frontend/src/store/appStore.ts"
    needs_retesting: true
test_plan:
  current_focus: ["Full UI regression after palette+motion refactor: onboarding -> home -> lesson -> quiz -> sim setup -> table actions -> verdict -> report; theme toggle dark/light in Profile; reduce-motion pills"]
agent_communication:
  - agent: "main"
    message: "Palette swapped to gold/teal/blue on near-black; reanimated-based juice added to all controls. Please verify no runtime errors (reanimated on web), all flows still work, numbers render (CountUp), theme switch to Chiaro renders (felt stays green), and Profile reduce-motion pills toggle."

## Iteration 3 — Revisione 2: Home separata dal percorso di studio (main agent)
frontend:
  - task: "New Home tab (app/(tabs)/index.tsx): status row (streak + avg), one progress card -> current lesson, hero CTA 'GIOCA UNA SESSIONE' -> sim setup, pills Ripassa (badge concepts due) + Statistiche"
    implemented: true
    working: "NA"
    needs_retesting: true
  - task: "Study path tab (app/(tabs)/study.tsx) collapsed module cards -> /module/[id] detail screen with lesson list"
    implemented: true
    working: "NA"
    needs_retesting: true
  - task: "Onboarding: 3 screens, <=8 words each, graphic, visible 'Salta' (onboarding-skip)"
    implemented: true
    working: "NA"
    needs_retesting: true
  - task: "streak tracking (activityDays) in appStore; quiz done -> /(tabs)/study; sim setup hint text"
    implemented: true
    working: "NA"
    needs_retesting: true
agent_communication:
  - agent: "main"
    message: "Test the new navigation: onboarding skip + full; home elements and taps (home-progress-card -> lesson L01, home-play -> sim setup, home-review -> study or quiz, home-stats -> stats); study tab module-M1 -> module-screen -> lesson-row-L01 -> lesson -> quiz -> quiz-done returns to study; coming modules not tappable; tabs nav-home/nav-study/nav-sim/nav-stats/nav-profile; theme light on home; persistence of streak after a quiz (home-streak shows '1 giorno')."

## Iteration 4 — Revisione 3 (parte 1): L02 nel nuovo formato a sub-schermate (main agent)
frontend:
  - task: "Paged lesson renderer app/lesson/[id].tsx (exit ✕, position n/7, prev/next, per-slide content; last slide -> quiz); new blocks pretest/exercise (src/features/lesson/blocks.tsx); RichText [[Term]] -> /glossary?q="
    implemented: true
    working: "NA"
    needs_retesting: true
  - task: "Interactive infographics in src/viz/charts.tsx (PotOddsBar slider, EquityWheel, OutsCounter tap, MdfAlphaCurve, ValueBluffTree, SprGauge, RangeGridPaint) + src/ui/Slider.tsx"
    implemented: true
    working: "NA"
    needs_retesting: true
  - task: "L02 rewritten (7 slides) in curriculum.ts; scripts/check-lesson-budget.js; takeaway save -> glossary 'Regole salvate'; mixed review quiz at /quiz/review"
    implemented: true
    working: "NA"
    needs_retesting: true
agent_communication:
  - agent: "main"
    message: "Test L02 at /lesson/L02 (7 sub-screens), old-format lessons still render (L01 single slide with OutsCounter tap), glossary links, save takeaway, review quiz from Home 'Ripassa' after wrong answers, and that simulator verdict/report (EvBarChart, ScoreTimeline) still render."

## Iteration 5 — Revisione 4a: fold equity dal range tracciato (bug fix motore)
frontend:
  - task: "ev.ts fold equity computed from bayesian ranges via bot policy (foldProbForCombo); simController.precomputeEv background; bots calib; npm test with acceptance tests (all green: 29+12+20)"
    implemented: true
    working: "NA"
    needs_retesting: true
agent_communication:
  - agent: "main"
    message: "Verify: `cd /app/frontend && npm test` all green; simulator table still works end to end (actions, verdict sheet shows EV bars with distinct values for bet sizes, report), no UI freeze when the hero node opens; EV bars for Bet/Raise are not all identical/zero."

## Iteration 6 — Revisione 4b: partita continua con feedback non bloccante (main agent)
frontend:
  - task: "Live runner in table.tsx (bots 400–900ms, auto next hand, auto report), persistent score bar (CountUp + flash), FeedbackPill (4s, tappable → VerdictSheet deep dive, pause/resume), review queue badge+sheet, feedback modes coach/scoreOnly/silent in setup, report ended-early card with Ripassa"
    implemented: true
    working: "NA"
    needs_retesting: true
