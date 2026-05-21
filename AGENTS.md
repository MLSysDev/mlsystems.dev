<claude-mem-context>
# Memory Context

# [mlsystems.dev] recent context, 2026-05-21 3:49pm EDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (15,214t read) | 199,094t work | 92% savings

### May 21, 2026

S919 mlsystems.dev playground tools section — UI copy edit to more-tools-lede paragraph (May 21 at 2:53 PM)
S920 mlsystems.dev production-readiness audit and fake data removal — review and fix a community ML platform website to meet professional, production-grade standards (May 21 at 2:54 PM)
2674 2:57p 🟣 Skip-Link CSS Added to global.css; CSS Architecture Discovered
2675 " 🟣 .env.example Created Documenting All Required Environment Variables
2676 2:58p 🟣 GitHub Actions CI Pipeline Created
2677 " 🔵 Astro Type Check Passes Clean After All Refactors
2678 " 🔵 Production Build Succeeds — 32 Pages Built in 2.79s
2679 " 🔵 All Changed Routes Return HTTP 200 on Dev Server
2680 " 🔵 Git Status Reveals Full Session Diff and Untracked Pre-Existing Files
2681 2:59p 🔵 Three Files Had Significant Pre-Session Changes Not Observed in This Session
2682 3:02p ⚖️ ML Community Showcase Platform — Project Intent Defined
2683 " 🔵 mlsystems.dev — Git History Reveals Existing Production-Ready Foundation
2684 " 🔴 Homepage Stats Replaced with Real Content-Derived Counts
2685 " 🔴 /community Page Rewritten to Remove Fake Thread Data
2686 " 🟣 Comments Component Wired to Giscus (GitHub Discussions)
2687 3:03p 🟣 Skip-to-Content Link and Cloudflare Web Analytics Added to Base Layout
2688 " 🟣 GitHub Actions CI Workflow Added for Lint, Type Check, and Build
2689 " 🔵 Uncommitted Work-in-Progress: Tools/Playground Feature
S921 Create .env file for mlsystems.dev static site — configure environment variables for Cloudflare Analytics and Giscus comments without a backend server (May 21 at 3:03 PM)
2690 " ⚖️ Tools Page: Preserve "Coming Soon" Items + Add Per-Tool Detail Links
2691 3:04p ✅ Tools Content Schema: Renamed Tag + Added `core` Field
2692 3:05p 🟣 New Tool Content: Attention Visualizer (Live)
2693 " 🟣 New Tool Content: Throughput Calculator (Live)
2694 " 🟣 New Tool Content: Inference Cost Calculator (Live)
2695 " 🟣 New Tool Content: Model Card Generator (Beta)
2696 " 🟣 New Tool Content: Eval Harness Playground (Beta)
2697 " 🟣 New Tool Content: Kernel Benchmark (Soon)
2698 3:06p 🔵 Playground.tsx: Interactive Tool UI Structure and Active Tools
2699 3:07p 🔄 Extracted Shared UI Primitives to `src/components/tools/_shared.tsx`
2700 " 🔄 ThroughputCalc Extracted to Standalone Component with `compact` Prop
2701 " ⚖️ Static Hosting Architecture: GitHub + Cloudflare Pages (No Backend)
2703 " 🟣 Playground Now Shows "Open Dedicated Page" Link per Active Tool
2702 " 🔵 .env Files Confirmed Gitignored in mlsystems.dev
2704 " 🟣 .env Created for mlsystems.dev with Cloudflare Analytics and Giscus Config
S922 Configure Giscus comment system on giscus.app for mlsystems.dev blog — selecting correct mapping, category, and feature settings (May 21 at 3:08 PM)
2705 3:08p 🟣 Tool Detail Pages: ThroughputCalc Component Embedded Directly in MDX
S923 Add Giscus GitHub Discussions comment widget to mlsystems.dev blog posts (May 21 at 3:08 PM)
2706 " ✅ Playground Index: Core Tools Excluded from "More Tools" Grid
2707 3:09p 🟣 Contributor Docs: `docs/writing-tools.md` Created
2708 " 🔵 Build Passes; Prettier Violation in `docs/writing-tools.md`
2709 3:23p 🟣 Giscus Comment Widget Configured for mlsystems.dev
2710 " ✅ Giscus IDs Populated in .env
2711 " 🔵 Dev Server Logs Show Invalid Hook Call and tabindex Warning
S924 Improve the UI of the Giscus comments section in mlsystems.dev to look more professional (May 21 at 3:24 PM)
2712 3:31p 🔵 Giscus Comments Component Structure in mlsystems.dev
2713 " 🔵 Comments Section Architecture and CSS in mlsystems.dev Blog
2714 3:32p ✅ Giscus Theme Changed to Borderless Variants
2715 " 🟣 Comments.tsx Header and Fallback UI Redesigned with CSS Classes
2716 3:33p 🟣 Giscus Theme Now Syncs Live with Site Dark/Light Mode Toggle
2717 " 🔄 Comments CSS Block Replaced: Old Custom Comment Classes Removed, New Design-System Classes Added
S925 Giscus comment config values (REPO_ID, CATEGORY_ID, redeploy URL) — text vs secret storage type, and data loss risk if values are lost (May 21 at 3:33 PM)
2718 3:36p ⚖️ Blog Comment Restoration Risk: Repo ID and Categories ID Storage Type
S926 ML Community Showcase Platform — .env.example convention for public vs. secret values (May 21 at 3:36 PM)
2719 3:39p ⚖️ ML Community Showcase Platform — Project Initiated
S927 Fix Cloudflare build failure caused by ESLint peer dependency conflict in mlsystems.dev (May 21 at 3:40 PM)
2720 3:41p 🔵 Cloudflare Build Failing: ESLint Peer Dependency Conflict
2721 " 🔵 Root Cause: package.json Specifies eslint@^10.4.0, Incompatible with eslint-plugin-jsx-a11y@6.10.2
2722 " 🔴 Partial Fix: @eslint/js Downgraded from ^10.0.1 to ^9.0.0 in mlsystems.dev
2723 " 🔴 ESLint Downgraded to ^9.0.0 — Cloudflare Build Peer Conflict Resolved
S928 User reported not seeing a tool on the main playground page — Beta tools visible but faded/unavailable; investigation into playground tool visibility and data architecture (May 21 at 3:46 PM)
**Investigated**: - TOOLS array in src/lib/data.ts: only 3 tools defined (throughput-calc, attention-viz, cost-calc), all with tag 'Live' and available: true - MDX content files in src/content/tools/: 9 files total with varying tags (Live, Beta, Soon, Experimental) - Playground page screenshot at localhost:4321/playground confirmed visual state - Tool metadata via grep: 6 core tools (core: true) and 3 community tools - Confirmed tools with tag 'Beta' or 'Soon' appear in UI as faded/disabled placeholders

**Learned**: - The src/lib/data.ts TOOLS array only drives 3 "Live" tools visible via the UI data layer - The Playground.tsx component separately renders all 6 core tools inline, with non-live ones shown as faded disabled tabs - MDX content files now provide dedicated pages at /playground/[slug] for each tool - 'core: true' frontmatter controls which tools appear in Playground tab UI vs community card grid - ThroughputCalc was extracted to src/components/tools/ThroughputCalc.tsx and shared between Playground tabs and dedicated page - Shared UI helpers in src/components/tools/\_shared.tsx (Field, Stat, StatRow) - "Open →" link added to each Playground tab footer pointing to /playground/[id] - Community card grid filters out core tools to prevent duplication - Migration path for remaining 5 inline tools (AttentionViz, CostCalc, etc.) is established but not yet executed

**Completed**: - 6 original core tools preserved unchanged in Playground tabs (Beta/Soon appear disabled as before) - 6 MDX explainer files created for core tools enabling /playground/[id] dedicated pages - ThroughputCalc extracted as standalone reusable component (no duplication) - Shared UI helpers created at src/components/tools/\_shared.tsx - "Open →" links added to all Playground tab footers - Community card grid correctly excludes core tools - docs/writing-tools.md contribution guide added - Build passes (31 pages), prettier formatting clean, verify passes

**Next Steps**: - User was reviewing the live playground page and noticing the faded Beta/Soon tool tabs — this appears to be expected behavior, not a bug - If desired: extract remaining 5 inline core tools (AttentionViz, CostCalc, etc.) from Playground.tsx into standalone components following the ThroughputCalc pattern - Commit this round of changes

Access 199k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
