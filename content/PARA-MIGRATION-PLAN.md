# PARA Method Migration Plan for Second-Brain

## Analysis Date
October 15, 2025

## Current Issues
1. **Unclear categorization**: Mix of projects, areas, and resources without distinction
2. **Numbered prefixes**: `1-yapidoo`, `2-english-learning` - artificial ordering
3. **No clear actionability hierarchy**: Hard to focus on what's active
4. **No archive system**: Completed projects clutter active workspace
5. **Missing CODE workflow**: No clear capture → organize → distill → express flow

## PARA Framework Application

### Decision Flowchart for Content Placement
```
New content arrives → Ask:
├─ Is this for an active project with deadline/goal? → [1-Projects]
├─ Is this an ongoing responsibility/theme? → [2-Areas]
├─ Is this reference material for future use? → [3-Resources]
└─ Is this completed or inactive? → [4-Archives]
```

## Proposed New Structure

```
content/
├── inbox.md                    # ✅ Keep - Capture point (CODE step 1)
├── 1-projects/                 # Active, time-bound outcomes
│   ├── yapidoo-development/    # Currently: 1-yapidoo
│   │   ├── _project-brief.md   # Goal, deadline, outcome
│   │   ├── services/
│   │   └── web/
│   ├── english-learning-bot/   # Currently: 2-english-learning
│   │   ├── _project-brief.md
│   │   └── telegram-bot/
│   ├── kaizen-app/             # Currently: 3-Kaizen
│   │   ├── _project-brief.md
│   │   └── firebase/
│   ├── house-renovation/       # Part of current house/
│   │   ├── _project-brief.md
│   │   ├── fence/
│   │   ├── windows/
│   │   └── heating/
│   ├── beehive-setup-2025/     # Active beekeeping project
│   │   └── _project-brief.md
│   └── tile-installation/      # Currently: плитка/
│       └── _project-brief.md
│
├── 2-areas/                    # Ongoing responsibilities
│   ├── home-maintenance/       # Long-term home care
│   │   ├── index.md
│   │   ├── heating-system.md
│   │   └── utilities.md
│   ├── health-fitness/         # Personal health
│   │   └── index.md
│   ├── finances/               # Money management
│   │   └── budget.md
│   ├── domestic-operations/    # Currently: domestic-tasks/
│   │   ├── index.md
│   │   ├── shelves/
│   │   └── todo.md
│   ├── beekeeping/             # Currently: пасіка/ (ongoing area)
│   │   ├── index.md
│   │   ├── seasonal-care/
│   │   └── equipment/
│   └── soland-inventory/       # Ongoing inventory management
│       ├── index.md
│       └── todo.md
│
├── 3-resources/                # Reference & learning materials
│   ├── software-development/
│   │   ├── authentication/
│   │   ├── frontend/
│   │   └── api-design/
│   ├── productivity/
│   │   ├── para-method.md
│   │   ├── second-brain.md
│   │   └── note-taking.md
│   ├── diy-woodworking/        # Currently: furniture/
│   │   ├── tables/
│   │   ├── easels/
│   │   └── shelves/
│   ├── drones/                 # Reference material
│   │   └── auto-drone.md
│   └── beekeeping-knowledge/   # Reference (vs. ongoing area)
│       ├── queen-rearing.md
│       ├── disease-management.md
│       └── equipment-guides/
│
└── 4-archives/                 # Completed/inactive
    ├── 2024-projects/
    ├── old-documentation/
    └── deprecated/
```

## Migration Strategy

### Phase 1: Preparation (Week 1)
- [ ] Create PARA folder structure
- [ ] Add `_project-brief.md` template
- [ ] Document current file locations
- [ ] Backup current structure

### Phase 2: Categorization (Week 2)
For each current folder, ask:
1. **Has a deadline/goal?** → Projects
2. **Ongoing responsibility?** → Areas  
3. **Reference material?** → Resources
4. **Completed/inactive?** → Archives

#### Classification Decisions

**TO PROJECTS:**
- `1-yapidoo/` → `1-projects/yapidoo-development/`
  - Goal: Launch MVP
  - Deadline: Q4 2025
  
- `2-english-learning/` → `1-projects/english-learning-bot/`
  - Goal: Working Telegram bot
  - Deadline: Q1 2026
  
- `3-Kaizen/` → `1-projects/kaizen-app/`
  - Goal: Firebase integration
  - Deadline: TBD
  
- `плитка/` → `1-projects/tile-installation/`
  - Goal: Complete bathroom tiling
  - Deadline: Winter 2025

**TO AREAS:**
- `domestic-tasks/` → `2-areas/domestic-operations/`
  - Ongoing: Home organization
  
- `пасіка/` (most content) → `2-areas/beekeeping/`
  - Ongoing: Seasonal beekeeping care
  
- `soland-inventory/` → `2-areas/soland-inventory/`
  - Ongoing: Inventory management
  
- `house/` (maintenance docs) → `2-areas/home-maintenance/`
  - Ongoing: Home upkeep

**TO RESOURCES:**
- `furniture/` → `3-resources/diy-woodworking/`
  - Reference: Furniture designs and ideas
  
- `drones/` → `3-resources/drones/`
  - Reference: Drone information
  
- Technical docs from yapidoo → `3-resources/software-development/`

**TO ARCHIVES:**
- Completed project folders
- Old documentation
- Deprecated code examples

### Phase 3: Implementation (Week 3-4)

#### Step 1: Create Structure
```bash
mkdir content/1-projects
mkdir content/2-areas
mkdir content/3-resources
mkdir content/4-archives
```

#### Step 2: Move Content
Use git mv to preserve history:
```bash
git mv content/1-yapidoo content/1-projects/yapidoo-development
git mv content/2-english-learning content/1-projects/english-learning-bot
# etc.
```

#### Step 3: Update Internal Links
- Update all markdown links
- Update navigation.json generation
- Update build scripts

#### Step 4: Add Project Briefs
Create `_project-brief.md` for each project with:
```markdown
# Project: [Name]

## Goal
What outcome are we trying to achieve?

## Deadline
When does this need to be completed?

## Status
- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Completed

## Next Actions
1. 
2. 
3. 

## Resources
Links to relevant resources, areas, or archives
```

### Phase 4: Update Build System (Week 4)

**Changes needed:**
1. **Navigation generation** - Update to show PARA categories
2. **Icons** - Different icons for each PARA category:
   - Projects: 🎯 or 📋
   - Areas: 🔄 or 📊
   - Resources: 📚 or 💡
   - Archives: 📦 or 🗄️
3. **Filtering** - Add ability to filter by PARA category
4. **Active view** - Default view shows only Projects + Areas

## Benefits After Migration

### 1. **Clarity of Action**
- Immediate focus on active projects
- Clear separation of "do now" vs "reference later"

### 2. **Reduced Mental Load**
- No more "where should this go?" decisions
- Clear decision tree for every piece of content

### 3. **Better Workflow (CODE)**
- **Capture** → inbox.md
- **Organize** → PARA folders
- **Distill** → Project briefs & summaries
- **Express** → Output/deliverables

### 4. **Improved Navigation**
- Collapsible PARA categories
- Active projects always visible
- Archives hidden by default

### 5. **Project Lifecycle Management**
- Easy to archive completed projects
- Projects have clear goals and deadlines
- Track progress with project briefs

## Navigation UI Enhancement

### Current Navigation
```
📚 Docs Portal
├─ 📁 1-yapidoo
├─ 📁 2-english-learning
├─ 📁 3-Kaizen
└─ 📁 domestic-tasks
```

### New PARA Navigation
```
📚 Docs Portal
├─ 🎯 Projects (3 active)
│   ├─ yapidoo-development
│   ├─ english-learning-bot
│   └─ kaizen-app
├─ 🔄 Areas (4 ongoing)
│   ├─ home-maintenance
│   ├─ beekeeping
│   ├─ domestic-operations
│   └─ soland-inventory
├─ 📚 Resources
│   ├─ software-development
│   ├─ productivity
│   └─ diy-woodworking
└─ 📦 Archives (collapsed by default)
```

## Technical Implementation Changes

### 1. Update NavigationService.js
```javascript
// Add PARA category detection
getParaCategory(path) {
  if (path.startsWith('1-projects/')) return 'projects';
  if (path.startsWith('2-areas/')) return 'areas';
  if (path.startsWith('3-resources/')) return 'resources';
  if (path.startsWith('4-archives/')) return 'archives';
  return 'uncategorized';
}

// Add category icons
getParaIcon(category) {
  const icons = {
    projects: '🎯',
    areas: '🔄',
    resources: '📚',
    archives: '📦',
    uncategorized: '📄'
  };
  return icons[category] || icons.uncategorized;
}
```

### 2. Update navigation.json Structure
```json
{
  "tree": [
    {
      "name": "Projects",
      "category": "projects",
      "icon": "🎯",
      "activeCount": 3,
      "children": [...]
    },
    {
      "name": "Areas",
      "category": "areas",
      "icon": "🔄",
      "children": [...]
    }
  ]
}
```

### 3. Add Filtering UI
```javascript
// Filter navigation by PARA category
function filterByCategory(category) {
  const categories = ['projects', 'areas', 'resources', 'archives'];
  categories.forEach(cat => {
    const section = document.querySelector(`[data-category="${cat}"]`);
    section.style.display = (category === 'all' || category === cat) 
      ? 'block' : 'none';
  });
}
```

### 4. Add Project Status Badges
```html
<div class="project-status">
  <span class="badge in-progress">In Progress</span>
  <span class="deadline">Due: Dec 31, 2025</span>
</div>
```

## CODE Workflow Integration

### Capture (inbox.md)
```markdown
# Inbox

Quick capture for new ideas, links, notes.

## 2025-10-15
- [ ] Article: PARA method implementation
- [ ] Idea: Add project status dashboard
- [ ] Link: https://...

_Process weekly: Move to appropriate PARA category_
```

### Organize (Weekly Review)
Process inbox → categorize into PARA:
1. What project needs this? → Projects
2. What area? → Areas
3. Future reference? → Resources
4. Old/done? → Archives

### Distill (Active Work)
- Summarize project briefs
- Extract key insights
- Create action items

### Express (Outputs)
- Deploy working applications
- Write documentation
- Share knowledge

## Rollout Timeline

| Week | Tasks | Deliverable |
|------|-------|-------------|
| 1 | Structure + Templates | PARA folders created |
| 2 | Content categorization | Classification complete |
| 3 | Content migration | Files moved |
| 4 | Build system updates | Navigation working |
| 5 | Testing | All links work |
| 6 | Polish + documentation | Ready for use |

## Success Metrics

- [ ] All content categorized into PARA
- [ ] Every project has a project brief
- [ ] Navigation shows PARA categories
- [ ] Archives hidden by default
- [ ] Inbox processed weekly
- [ ] 0 uncategorized files

## Risk Mitigation

**Risk**: Breaking existing links
- **Mitigation**: Use git mv, create redirects

**Risk**: Confusion during transition
- **Mitigation**: Keep old structure accessible for 1 month

**Risk**: Over-categorization
- **Mitigation**: When in doubt, start with Resources

## References

- [PARA Method by Tiago Forte](https://fortelabs.com/blog/para/)
- [Building a Second Brain book](https://www.buildingasecondbrain.com/)
- Current project: e:\brain\second-brain\

---

## CODE Workflow: Detailed Implementation

The CODE method is Tiago Forte's four-step workflow that works in harmony with PARA. While PARA tells you **WHERE** to organize content, CODE tells you **HOW** to process it.

### CODE Overview

```
Capture → Organize → Distill → Express
   ↓          ↓          ↓         ↓
 Store     Categorize  Summarize  Create
```

**Philosophy**: "Your notes should be optimized for RETRIEVAL, not storage."

---

### 1. CAPTURE: Collect What Resonates

**Goal**: Capture information externally so your brain is free for creative thinking.

#### What to Capture

✅ **DO Capture:**
- Ideas that excite you
- Useful quotes or insights
- Links to helpful articles
- Code snippets that solve problems
- Meeting notes with action items
- Personal reflections
- Inspiration for projects

❌ **DON'T Capture:**
- Everything you read (too much noise)
- Information easily Googleable
- Content "just in case" (without purpose)
- Duplicates of what's already saved

#### Capture Principles

**The 12-Second Rule**: If it takes more than 12 seconds to capture, you won't do it consistently.

**The Resonance Test**: Only capture what "resonates" with you:
- Does this surprise me?
- Is this useful for my current projects?
- Does this change my perspective?
- Will I want to reference this later?

#### Capture Tools for Second-Brain

**1. Quick Inbox Entry (inbox.md)**
```markdown
# Inbox

## 2025-10-15 Tuesday

### Quick Captures
- [ ] 14:30 - Idea: Add PARA filtering to navigation
- [ ] 15:45 - Article: https://... (about async/await patterns)
- [ ] 16:20 - Quote: "Organize by actionability, not category" - Tiago Forte
- [ ] 17:00 - TODO: Review PR for authentication service

### Voice Notes
- [ ] Voice memo: Ideas for English learning bot UI

### Meeting Notes
- [ ] Weekly standup - Action: Update Kaizen firebase config

---
_Process on Friday evening: Move items to appropriate PARA folders_
```

**2. Capture Templates**

**Quick Note Template** (`templates/quick-note.md`):
```markdown
# [Title]

**Captured**: 2025-10-15 14:30
**Source**: [URL or person]
**Related to**: [Project/Area/Resource]

## Key Points
- 
- 
- 

## My Thoughts
[Why does this matter? What will I do with it?]

## Next Action
- [ ] 

## Tags
#tag1 #tag2
```

**Meeting Note Template** (`templates/meeting-note.md`):
```markdown
# Meeting: [Title]

**Date**: 2025-10-15
**Attendees**: 
**Project/Area**: 

## Agenda
1. 
2. 
3. 

## Discussion Notes
- 
- 

## Decisions Made
- 
- 

## Action Items
- [ ] [@person] - Task description (due: date)
- [ ] [@person] - Task description (due: date)

## Follow-up
Next meeting: [date]
```

**3. Browser/Reading Captures**

For web articles:
```markdown
## Article: [Title]

**URL**: https://...
**Date captured**: 2025-10-15
**Status**: 🟡 To Read / 🔵 Reading / 🟢 Processed

### Key Highlights
> "Quote from article"
— [Author name]

> "Another important quote"

### My Notes
[What stood out? Why is this relevant?]

### Application
**Could be used for**: [Specific project or area]
**Next action**: [ ] Create proof of concept
```

**4. Code Snippet Captures**

```markdown
## Code: [What it does]

**Language**: JavaScript/Python/etc.
**Source**: [GitHub URL or docs]
**Captured**: 2025-10-15
**Use case**: [Specific problem this solves]

### Code
\`\`\`javascript
// Actual code here
\`\`\`

### Explanation
[How it works]

### When to use
[Scenarios where this is applicable]

### Related
- Link to project: [Project name]
- Similar pattern: [Link]
```

#### Capture Habits

**Daily Capture Routine:**
- **Morning** (9:00 AM): Review inbox, quick capture of overnight ideas
- **Throughout day**: Add items as they come up (12-second rule)
- **End of day** (5:30 PM): Quick brain dump of any remaining thoughts

**Weekly Processing:**
- **Friday 4:00 PM**: Process inbox → Move to PARA
- **Sunday evening**: Review week's captures, distill key insights

#### Capture Metrics

Track your capture effectiveness:
```markdown
## Weekly Capture Review - Week of Oct 15

**Captured this week**: 47 items
**Processed**: 42 items (89%)
**Still in inbox**: 5 items
**Average processing time**: 3 minutes per item

**Top capture sources**:
1. Web articles (18)
2. Meeting notes (12)
3. Random ideas (9)
4. Code snippets (8)

**Action**: Reduce article captures, focus on key insights only
```

---

### 2. ORGANIZE: Place by Actionability (PARA)

**Goal**: Organize content based on how actionable it is, not by topic.

#### The PARA Decision Tree

Every captured item goes through this process:

```
1. Ask: "In which PROJECT will this be most useful?"
   ├─ Yes → Move to 1-projects/[project-name]/
   └─ No → Continue to step 2

2. Ask: "In which AREA will this be most useful?"
   ├─ Yes → Move to 2-areas/[area-name]/
   └─ No → Continue to step 3

3. Ask: "Which RESOURCE category does this belong to?"
   ├─ Yes → Move to 3-resources/[topic]/
   └─ No → Continue to step 4

4. Is this completed or no longer relevant?
   ├─ Yes → Move to 4-archives/
   └─ No → Leave in inbox for later review
```

#### Organizing Examples

**Example 1: Web Article on Authentication**

Capture:
```markdown
📥 Article: "Best Practices for JWT Authentication"
URL: https://...
```

Organize Decision Process:
1. **Project?** → YES - I'm building auth for Yapidoo
2. **Move to**: `1-projects/yapidoo-development/research/jwt-best-practices.md`

**Example 2: Meeting Notes on Home Maintenance**

Capture:
```markdown
📥 Meeting with HVAC technician - Heating system inspection
```

Organize Decision Process:
1. **Project?** → NO - Not a one-time thing
2. **Area?** → YES - Ongoing home maintenance
3. **Move to**: `2-areas/home-maintenance/heating-system-inspection-2025-10.md`

**Example 3: Interesting Article on Productivity**

Capture:
```markdown
📥 Article: "The Psychology of Deep Work"
```

Organize Decision Process:
1. **Project?** → NO
2. **Area?** → NO
3. **Resource?** → YES - General productivity knowledge
4. **Move to**: `3-resources/productivity/deep-work-psychology.md`

#### Organizing Workflow

**Friday Processing Session (60 minutes):**

```markdown
## Inbox Processing - 2025-10-15

### Step 1: Quick Sort (15 min)
Scan inbox and tag each item:
- 🎯 Project-related
- 🔄 Area-related
- 📚 Resource material
- 🗑️ Delete/Archive

### Step 2: Move to PARA (30 min)
Process each tagged item:
- Read/skim the content
- Apply decision tree
- Move to appropriate folder
- Add to project brief if relevant

### Step 3: Update Project Briefs (15 min)
For project-related items:
- Add to "Resources" section of _project-brief.md
- Update "Next Actions" if needed
- Mark as processed: ✅

### Results:
- Processed: 42 items
- Projects updated: 3
- New resources added: 7
- Archived: 2
- Remaining in inbox: 5 (needs more context)
```

#### Organizing Tools

**1. Tagging System**

Use consistent tags for filtering:
```markdown
#project/yapidoo
#area/home-maintenance
#resource/productivity
#status/todo
#status/in-progress
#status/done
#type/article
#type/code
#type/meeting
```

**2. Linked Notes**

Create connections between related content:
```markdown
## Related
- Project: [[1-projects/yapidoo-development/_project-brief]]
- Area: [[2-areas/beekeeping/seasonal-care]]
- Resource: [[3-resources/software-development/authentication]]
```

**3. Quick Move Script**

Create keyboard shortcuts or scripts:
```bash
# Quick move to project
mv inbox/captured-item.md 1-projects/yapidoo-development/

# Quick move to area
mv inbox/captured-item.md 2-areas/home-maintenance/

# Quick move to resources
mv inbox/captured-item.md 3-resources/productivity/
```

---

### 3. DISTILL: Extract the Essence

**Goal**: Progressively summarize content to make it immediately useful.

#### The Progressive Summarization Method

**Layer 1**: Original captured content (full text)
**Layer 2**: **Bold** the important passages (first pass)
**Layer 3**: ==Highlight== the most important sentences (second pass)
**Layer 4**: Executive summary at the top (third pass)
**Layer 5**: Remix into your own original work

#### Distillation in Practice

**Original Capture** (Layer 1):
```markdown
# Article: PARA Method Explained

The PARA method is a system created by Tiago Forte for organizing 
digital information. It stands for Projects, Areas, Resources, and 
Archives. The key innovation is organizing by actionability rather 
than by category or topic. Projects are short-term efforts with 
specific goals and deadlines. Areas are ongoing responsibilities 
without end dates. Resources are reference materials for future use. 
Archives hold inactive items. This system works across all tools 
and platforms.
```

**After Layer 2** (Bold important parts):
```markdown
# Article: PARA Method Explained

The PARA method is a system created by Tiago Forte for organizing 
digital information. It stands for **Projects, Areas, Resources, and 
Archives**. The key innovation is **organizing by actionability rather 
than by category or topic**. **Projects are short-term efforts with 
specific goals and deadlines**. **Areas are ongoing responsibilities 
without end dates**. Resources are reference materials for future use. 
Archives hold inactive items. **This system works across all tools 
and platforms**.
```

**After Layer 3** (Highlight most critical):
```markdown
# Article: PARA Method Explained

The PARA method is a system created by Tiago Forte for organizing 
digital information. It stands for **Projects, Areas, Resources, and 
Archives**. The key innovation is ==**organizing by actionability rather 
than by category or topic**==. **Projects are short-term efforts with 
specific goals and deadlines**. **Areas are ongoing responsibilities 
without end dates**. Resources are reference materials for future use. 
Archives hold inactive items. **This system works across all tools 
and platforms**.
```

**After Layer 4** (Add executive summary):
```markdown
# Article: PARA Method Explained

## 🎯 Key Takeaway
Organize digital content by HOW ACTIONABLE it is (Projects → Areas → 
Resources → Archives), not by topic or category.

## Core Concept
- **Projects**: Active work with deadlines
- **Areas**: Ongoing responsibilities
- **Resources**: Reference material
- **Archives**: Completed/inactive

## Original Article
[Rest of the content...]
```

**Layer 5** (Express - Your own creation):
→ This becomes your PARA Migration Plan document!

#### Distillation Templates

**Project Research Distillation**:
```markdown
# Research Summary: [Topic]

**Project**: [[_project-brief]]
**Date distilled**: 2025-10-15
**Sources**: 3 articles, 2 videos, 1 book chapter

## 🎯 Bottom Line (30 seconds)
[One paragraph - what's the most important thing to know?]

## 💡 Key Insights (2 minutes)
1. [First major insight]
2. [Second major insight]
3. [Third major insight]

## 🔧 Actionable Steps (5 minutes)
- [ ] [Specific action 1]
- [ ] [Specific action 2]
- [ ] [Specific action 3]

## 📚 Deep Dive (15+ minutes)
[Detailed notes with all the context]

### Source 1: [Name]
- Key points...

### Source 2: [Name]
- Key points...

## 🔗 Related
- [[Link to related project]]
- [[Link to related resource]]
```

**Meeting Distillation**:
```markdown
# Meeting Summary: [Title]

## ⚡ TL;DR
[2-3 sentences: What happened and what needs to happen next?]

## ✅ Decisions Made
1. Decision 1 - [Impact]
2. Decision 2 - [Impact]

## 🎯 Action Items (Ordered by priority)
1. 🔴 [Critical] [@owner] Task (Due: date)
2. 🟡 [Important] [@owner] Task (Due: date)
3. 🟢 [Nice to have] [@owner] Task (Due: date)

## 💬 Full Discussion
[Optional: Detailed notes only if needed for reference]
```

**Code Learning Distillation**:
```markdown
# Pattern: [Name]

## 🎯 When to Use
[One sentence describing the use case]

## ✅ Pros & Cons
**Pros**: 
- Benefit 1
- Benefit 2

**Cons**:
- Limitation 1
- Limitation 2

## 💻 Quick Example
\`\`\`javascript
// Minimal working example
\`\`\`

## 📚 Full Explanation
[Detailed explanation only if needed]
```

#### Distillation Schedule

**Immediate** (When organizing):
- Add bold to key passages
- Add one-sentence summary at top

**Weekly** (Friday review):
- Highlight most critical info
- Add executive summaries to important notes

**Monthly** (Last Sunday):
- Review project notes
- Create synthesis documents
- Archive what's no longer needed

#### Distillation Principles

**The 80/20 Rule**: 
- 80% of value comes from 20% of content
- Focus on distilling that 20%

**The Future Self Test**:
- Will my future self understand this in 6 months?
- Is the key insight immediately visible?

**The 10-Second Rule**:
- Can someone grasp the main point in 10 seconds?
- If not, needs more distillation

---

### 4. EXPRESS: Create and Share

**Goal**: Turn your captured, organized, and distilled notes into tangible outputs.

#### Expression Principles

**"Create on the Exhale"**:
- Capturing is breathing in (input)
- Expressing is breathing out (output)
- Balance is essential - can't just consume

**"Show Your Work"**:
- Share intermediate work, not just final products
- Document your process
- Make thinking visible

**"Build with Blocks"**:
- Your notes are building blocks
- Reuse and remix existing content
- Don't start from scratch

#### Expression Formats

**1. Project Deliverables**

```markdown
# Deliverable: [Name]

**Project**: [[_project-brief]]
**Type**: Code / Document / Presentation / etc.
**Status**: Draft / Review / Final
**Deadline**: 2025-10-31

## Purpose
[What is this meant to accomplish?]

## Audience
[Who is this for?]

## Content Sources
Built from these distilled notes:
- [[note-1]]
- [[note-2]]
- [[research-summary]]

## Output
[Link to the actual deliverable]
- GitHub repo: https://...
- Document: https://...
- Presentation: https://...

## Impact
[What happened after sharing this?]
```

**2. Documentation**

Turn project notes into reusable documentation:
```markdown
# How-To: [Process Name]

**Last updated**: 2025-10-15
**Status**: ✅ Tested and working
**Time required**: 30 minutes

## Context
[When would you use this?]

## Prerequisites
- Requirement 1
- Requirement 2

## Steps
1. [Step with screenshot if helpful]
2. [Step with code example]
3. [Step with expected outcome]

## Troubleshooting
**Problem**: [Common issue]
**Solution**: [How to fix]

## Related
- Based on: [[captured-article]]
- See also: [[related-process]]
```

**3. Blog Posts / Articles**

```markdown
# Article: [Title]

**Status**: Draft → Review → Published
**Published**: [Date and URL]
**Audience**: [Who is this for?]

## Origin Story
Built from these captured notes:
- [[note-1]] - Main concept
- [[note-2]] - Supporting example
- [[note-3]] - Technical details

## Key Message
[One sentence - what should readers remember?]

## Outline
1. Hook
2. Problem
3. Solution
4. Examples
5. Call to action

## Draft
[Article content]

## Feedback Received
- [Person]: [Suggestion]
- [Person]: [Suggestion]

## Final Version
[Link to published article]

## Performance
- Views: 
- Engagement:
- Feedback:
```

**4. Presentations**

```markdown
# Presentation: [Title]

**Event**: [Where/when]
**Duration**: 30 minutes
**Audience**: [Who]

## Goal
[What should the audience learn/do after?]

## Source Material
- [[project-research]]
- [[case-study-1]]
- [[code-examples]]

## Outline
1. **Intro** (3 min)
   - Hook: [Attention grabber]
   - Promise: [What they'll learn]

2. **Body** (20 min)
   - Point 1: [Key concept]
   - Point 2: [Supporting example]
   - Point 3: [Practical application]

3. **Conclusion** (5 min)
   - Summary
   - Call to action
   - Q&A

## Slide Deck
[Link to slides]

## Feedback
[Notes from presentation]
```

**5. Code Projects**

```markdown
# Project Output: [Application Name]

**Repository**: https://github.com/...
**Demo**: https://...
**Status**: MVP / Beta / Production

## Built From
Knowledge accumulated from:
- [[authentication-research]]
- [[ui-design-patterns]]
- [[deployment-guide]]

## Features Implemented
- [x] Feature 1 (based on [[note-1]])
- [x] Feature 2 (based on [[note-2]])
- [ ] Feature 3 (planned)

## Key Decisions
1. **Decision**: Use JWT for auth
   - **Based on**: [[jwt-research-summary]]
   - **Rationale**: [Why we chose this]

## Lessons Learned
[What worked, what didn't]

## Next Steps
[What's next for this project]
```

#### Expression Workflow

**Weekly Expression Session** (Sunday 2-4 PM):

```markdown
## Expression Session - 2025-10-15

### 1. Review Projects (20 min)
Which projects need outputs this week?
- Yapidoo: Authentication documentation
- Kaizen: Firebase setup guide
- House: Heating system maintenance log

### 2. Gather Materials (20 min)
Pull together distilled notes for each output:
- Yapidoo: 3 research notes + 2 code examples
- Kaizen: 1 tutorial + 1 config file
- House: 1 meeting note + 1 inspection report

### 3. Create Outputs (60 min)
- [ ] Write auth documentation (30 min)
- [ ] Create Firebase guide (20 min)
- [ ] Update maintenance log (10 min)

### 4. Share & Publish (20 min)
- [ ] Push documentation to GitHub
- [ ] Share guide with team
- [ ] Update home maintenance area
```

#### Expression Habits

**Daily Micro-Expressions**:
- Reply to team member with solution from notes (5 min)
- Share code snippet on Slack (2 min)
- Update project README (10 min)

**Weekly Expressions**:
- Write technical documentation (30-60 min)
- Create how-to guide (30 min)
- Update project status report (15 min)

**Monthly Expressions**:
- Blog post or article (2-4 hours)
- Presentation or talk (4-6 hours)
- Complete project deliverable (varies)

#### Expression Metrics

Track your creative output:
```markdown
## Expression Tracker - October 2025

### Outputs Created
- Documentation: 4 guides
- Blog posts: 1 article
- Code: 2 features shipped
- Presentations: 0
- Internal shares: 12 notes/snippets

### Impact
- Documentation views: 45
- Article reads: 234
- Code stars: 12
- Team feedback: "Really helpful auth guide!"

### Input/Output Ratio
- Captured: 47 notes
- Expressed: 19 outputs
- Ratio: 40% (healthy!)

### Goal for November
Create more presentations, maintain documentation cadence
```

---

## CODE + PARA Integration

### The Complete Workflow

```
┌─────────────────────────────────────────────────┐
│                  CAPTURE                         │
│  Inbox.md - Quick captures throughout day       │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│                 ORGANIZE                         │
│  Apply PARA: Projects → Areas → Resources       │
│  - Friday processing session                    │
│  - Use decision tree                            │
│  - Update project briefs                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│                 DISTILL                          │
│  Progressive Summarization                      │
│  - Bold key passages (immediate)                │
│  - Highlight critical info (weekly)             │
│  - Add executive summaries (monthly)            │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│                 EXPRESS                          │
│  Create Outputs                                 │
│  - Documentation                                │
│  - Code                                         │
│  - Articles/Presentations                       │
│  - Share with others                            │
└─────────────────────────────────────────────────┘
```

### Example: End-to-End Flow

**Monday 10:00 AM - CAPTURE**
```markdown
📥 Inbox: Read article about React Server Components
💭 Could be useful for Yapidoo frontend refactor
```

**Friday 4:30 PM - ORGANIZE**
```markdown
🤔 Decision tree:
   - Active project? YES - Yapidoo development
   - Move to: 1-projects/yapidoo-development/research/

📁 Organized: react-server-components.md
```

**Friday 5:00 PM - DISTILL** (First pass)
```markdown
**Bold** key concepts:
- Server components run on server only
- Reduces JavaScript bundle size
- Better for data fetching

Added 🎯 TL;DR at top
```

**Sunday 2:00 PM - EXPRESS**
```markdown
✍️ Created: 
   - Technical spike document
   - Proof of concept code
   - Recommendation for team review

📤 Shared: 
   - Posted in Slack #frontend
   - Added to project brief
   - Scheduled team discussion
```

**Result**: Article → Actionable project output in 4 days

---

## CODE Implementation Checklist

### Setup Phase
- [ ] Create inbox.md
- [ ] Create capture templates folder
- [ ] Set up Friday processing calendar event
- [ ] Set up Sunday expression calendar event
- [ ] Create CODE tracking template

### Daily Habits
- [ ] Morning: Review inbox (5 min)
- [ ] Throughout day: Quick captures (12-second rule)
- [ ] Evening: Brain dump any remaining thoughts (5 min)

### Weekly Habits
- [ ] Friday 4:00 PM: Process inbox → PARA (60 min)
- [ ] Friday 5:00 PM: First-pass distillation (30 min)
- [ ] Sunday 2:00 PM: Create weekly outputs (2 hours)

### Monthly Review
- [ ] Last Sunday: Review all captures
- [ ] Deep distillation of key notes
- [ ] Archive completed projects
- [ ] Plan next month's expressions

### Quarterly Review
- [ ] Review CODE effectiveness
- [ ] Adjust capture sources
- [ ] Evaluate output quality
- [ ] Set new expression goals

---

## CODE Success Metrics

### Capture Metrics
- **Volume**: 30-50 captures per week (sweet spot)
- **Quality**: 70%+ actually get organized (not junk)
- **Speed**: Average 30 seconds per capture
- **Sources**: Diverse (articles, meetings, ideas, code)

### Organize Metrics
- **Processing rate**: 90%+ of inbox cleared weekly
- **Decision time**: <3 minutes per item
- **PARA distribution**: 40% projects, 30% areas, 25% resources, 5% archives
- **Orphans**: <5 items without clear PARA home

### Distill Metrics
- **First pass**: 100% get bold highlights when organized
- **Second pass**: 30% get executive summaries (most important)
- **Third pass**: 10% get deep synthesis (key insights)
- **Findability**: Can locate needed info in <2 minutes

### Express Metrics
- **Output frequency**: 2-3 significant outputs per week
- **Input/output ratio**: 30-50% (healthy creative output)
- **Reuse rate**: 70%+ of outputs built from existing notes
- **Impact**: Measurable value (views, feedback, results)

---

## CODE Tools & Techniques

### Digital Tools

**For Capture:**
- Mobile notes app (quick voice/text)
- Browser web clipper extension
- Screenshot with annotation tool
- Email to inbox (for email captures)

**For Organize:**
- File system with PARA structure
- Quick move shortcuts/scripts
- Tag-based search
- Link-based connections

**For Distill:**
- Highlighting in markdown
- Summary templates
- Text expander for common phrases
- PDF annotator for documents

**For Express:**
- Writing app with templates
- Code editor with snippets
- Presentation software
- Publishing platform

### Analog Tools

**For Capture:**
- Pocket notebook (Moleskine, Field Notes)
- Voice recorder for audio notes
- Sticky notes for quick thoughts
- Bullet journal for daily log

**For Distill:**
- Physical highlighting of printed notes
- Index cards for key insights
- Mind maps on whiteboard
- Sketching/visual notes

**For Express:**
- Whiteboard for brainstorming
- Paper for drafting
- Physical prototype/mockup
- In-person presentation

---

## CODE Anti-Patterns (What to Avoid)

### Capture Anti-Patterns
❌ **Hoarding**: Saving everything "just in case"
✅ **Solution**: Apply resonance test - only capture what truly matters

❌ **Perfectionism**: Spending 10 minutes formatting a capture
✅ **Solution**: 12-second rule - quick and messy is better than never

❌ **Multiple inboxes**: Scattered across apps and tools
✅ **Solution**: One primary inbox (inbox.md), process regularly

### Organize Anti-Patterns
❌ **Analysis paralysis**: Spending 30 minutes deciding where something goes
✅ **Solution**: Use PARA decision tree, make quick decisions

❌ **Over-categorization**: Creating too many subcategories
✅ **Solution**: Keep PARA structure simple, use search not nesting

❌ **Never processing**: Inbox grows to 500+ items
✅ **Solution**: Weekly processing ritual, inbox zero mindset

### Distill Anti-Patterns
❌ **Distilling everything**: Trying to summarize every captured note
✅ **Solution**: Only distill what you're actively using

❌ **Too much highlighting**: Everything is bold/highlighted
✅ **Solution**: Be selective - if everything is important, nothing is

❌ **Distilling too early**: Summarizing before you understand
✅ **Solution**: Wait until you're using the note in a project

### Express Anti-Patterns
❌ **Perfectionism**: Never shipping because it's not "ready"
✅ **Solution**: Share intermediate work, iterate publicly

❌ **Output without input**: Trying to create from scratch
✅ **Solution**: Build from existing notes, remix existing content

❌ **All input, no output**: Capturing endlessly without creating
✅ **Solution**: 30-50% input/output ratio, schedule expression time

---

## Next Actions

1. [ ] Review and approve this migration plan
2. [ ] Create PARA folder structure
3. [ ] Start categorization spreadsheet
4. [ ] Test migration with one project
5. [ ] Update build scripts for PARA support
