# notegraph Ontology Specification

> A standards-aligned knowledge graph profile for modeling written knowledge, imported documents, human work, AI-agent work, problem solving, provenance, and reusable operational memory — designed to run entirely on a local device in an embedded property-graph database.

**Project:** notegraph
**Namespace:** `ng:` / `https://notegraph.local/ns#`
**Primary graph engine:** LadybugDB (embedded property graph, Cypher)
**System of record:** local content files on disk (+ LadybugDB as a rebuildable projection)
**Status:** Draft specification
**Ontology version:** `0.2.0`

**Lineage:** notegraph reuses the [`knotes`](https://github.com/marinoscar/knotes) ontology near-wholesale — the two projects share a data model. This document adapts it for notegraph's local-first, desktop delivery: LadybugDB instead of a Neo4j server, local content files instead of Postgres + object storage as the system of record, and a provenance/agent layer centered on the **GitHub Copilot SDK** and a **local embedding model** instead of multi-provider cloud LLMs.

---

## 1. Purpose

notegraph is a personal knowledge workspace where notes, documents, tasks, decisions, problems, and AI-agent work summaries become searchable, connected, reusable, and auditable — all on the user's own machine.

The ontology exists to give that workspace a stable semantic structure. It should let a person ask not only, "What did I read or write?" but also:

- What happened?
- Who was involved?
- What was discussed?
- What did I decide?
- What work was created?
- What work was completed?
- What problem did I solve?
- What did I try that failed?
- What finally worked?
- Which human or AI agent did the work?
- Which steps, commands, files, tools, or decisions mattered?
- What reusable lesson, runbook, or pattern should be used next time?

The goal is **not** to invent a new ontology from scratch. notegraph defines an **application profile** that reuses established vocabularies where possible and introduces `ng:`-specific terms only where existing standards do not cover the product's needs.

notegraph models seven major dimensions of knowledge work:

1. **Content** — documents, notes, chunks, quotes, and other artifacts. *(Transcripts, utterances, and scripts are part of the profile but deferred until notegraph adds local audio; see §15.)*
2. **Concepts** — topics, ideas, themes, aliases, taxonomies, and semantic relationships.
3. **Human work** — events, meetings, tasks, actions, decisions, outcomes, commitments, and deliverables.
4. **People and relationships** — people, organizations, roles, interests, preferences, person facts, expertise, and relationship memory.
5. **Problem solving** — problems, symptoms, hypotheses, attempts, outcomes, resolutions, runbooks, procedures, steps, and lessons learned.
6. **Agent work** — AI/coding/automation agent runs, steps, tool use, commands, observations, errors, file changes, code changes, decision points, reusable patterns, and generated runbooks.
7. **Provenance and governance** — where information came from, how it was generated, who or what generated it, what evidence supports it, and whether it has been reviewed.

The ontology supports hybrid retrieval across lexical search, vector similarity, and graph traversal — **all executed locally** against LadybugDB. It is designed for LadybugDB as a practical property graph while remaining aligned with common semantic-web vocabularies for future export to RDF/JSON-LD.

---

## 2. Standards Profile

notegraph uses standards as a vocabulary source, not as a prison. The storage model is an embedded property graph, but the concepts align with known standards so the graph stays explainable and portable.

| Area | Standard / Pattern | notegraph Use |
|---|---|---|
| Common entities | Schema.org | `Person`, `Organization`, `Event`, `CreativeWork`, `DigitalDocument`, `Project`, broad real-world entities |
| Concepts and taxonomies | SKOS | `Concept`, preferred labels, aliases, broader/narrower/related concepts |
| Provenance | PROV-O | `Agent`, `Activity`, `Entity`, generated-by, derived-from, used, attributed-to |
| Annotations | Web Annotation Data Model | notes, highlights, comments, anchors, document offsets |
| Actions and activity feed | ActivityStreams-style model | actor/action/object/target/result/instrument patterns |
| AI/coding/automation execution | notegraph-specific + PROV-O-inspired | `SoftwareAgent`, `AgentRun`, `AgentStep`, `ToolUse`, `CommandRun`, `CodeChange` |
| Troubleshooting and operational memory | notegraph-specific | `Problem`, `Symptom`, `Attempt`, `Resolution`, `Procedure`, `Runbook`, `ReusablePattern` |

Recommended namespace prefixes:

```text
schema:  https://schema.org/
skos:    http://www.w3.org/2004/02/skos/core#
prov:    http://www.w3.org/ns/prov#
oa:      http://www.w3.org/ns/oa#
as:      https://www.w3.org/ns/activitystreams#
ng:      https://notegraph.local/ns#
```

---

## 3. Design Principles

### 3.1 Reuse Before Inventing

Use Schema.org, SKOS, PROV-O, Web Annotation, and ActivityStreams-style patterns first. Add `ng:` terms only when the app needs concepts the standards do not cover well, such as `Chunk`, `AgentRun`, `ToolUse`, `Runbook`, or `PersonFact`.

### 3.2 Content Is Evidence, Not Knowledge by Itself

A document, note, terminal log, or agent-work summary is evidence. The knowledge graph is built from people, concepts, decisions, actions, tasks, problems, resolutions, code changes, and relationships extracted or curated from that evidence.

Every generated knowledge object should point back to the source chunk, page, paragraph, command output, file diff, or document offset that supports it.

### 3.3 Human Work and AI-Agent Work Are Both First-Class

notegraph should not assume that only humans create or consume knowledge. Humans, AI agents, automation agents, and local system workers can all perform activities and generate artifacts.

The ontology therefore models:

```text
Agent
├── Person
├── Organization
└── SoftwareAgent
```

A person can capture a meeting note, write a document, or complete a task. A software agent can inspect files, run commands, observe errors, modify code, and generate a runbook. Both are captured with provenance.

### 3.4 Preserve the Trace, Then Distill the Knowledge

Raw logs are useful for auditability; they are not always useful for reuse. notegraph separates:

1. **Execution trace** — detailed events, tool calls, files read, commands run, outputs, errors, diffs, and decisions.
2. **Distilled knowledge** — the reusable problem summary, root cause, resolution, procedure, runbook, reusable pattern, and lesson learned.

The trace answers, "What exactly happened?" The distilled knowledge answers, "What should I do next time?" (In practice, notegraph captures agent work as a **distilled markdown summary** rather than a full trace — see VISION.md §4.5.)

### 3.5 Failed Attempts Are Valuable

A good problem-solving memory stores not only the final solution but what did not work, so the system can answer: Did I already try this? Why did that attempt fail? What worked instead? What should I check first next time?

### 3.6 LadybugDB Is a Projection

The **local content files on disk** — markdown notes, imported documents, and agent-work summaries — are the system of record. LadybugDB is a denormalized graph projection optimized for traversal, exploration, semantic (vector) search, and structural retrieval.

The graph must be rebuildable from the content files plus stored extraction outputs. Never treat LadybugDB as the only source of truth: wiping the database and re-projecting from disk must always reproduce an equivalent graph.

### 3.7 Practical Property Graph Modeling

notegraph uses a LadybugDB property graph, not a pure RDF/OWL implementation. The ontology may use external vocabulary names and alignments, but the implementation remains idiomatic Cypher.

```cypher
(:Concept {prefLabel: "Ontology Governance"})
(:Chunk)-[:MENTIONS {confidence: 0.92}]->(:Concept)
(:Concept)-[:BROADER_THAN]->(:Concept)
(:Decision)-[:SUPPORTED_BY]->(:Chunk)
(:SoftwareAgent)-[:PERFORMED]->(:AgentRun)
(:AgentRun)-[:HAS_STEP]->(:AgentStep)
(:Problem)-[:RESOLVED_BY]->(:Resolution)
(:Resolution)-[:GENERATED_RUNBOOK]->(:Runbook)
```

### 3.8 Local-First and Private by Construction

Extraction and the assistant are the only steps that reach the network, and they route through exactly one provider (the GitHub Copilot SDK). Embeddings are computed locally. Governance metadata (sensitivity, review status) exists partly so that a private, on-device graph never quietly surfaces sensitive facts even to the local AI features. See §9.

---

## 4. Ontology Layers

```text
notegraph Knowledge Graph Profile
├── Agent Layer
│   ├── Agent
│   ├── Person
│   ├── Organization
│   ├── SoftwareAgent      (e.g. GitHub Copilot, a coding agent, notegraph workers)
│   ├── ServiceAgent       (e.g. the local embedding model)
│   └── ModelAgent         (a specific model served via the Copilot SDK)
│
├── Relationship Intelligence Layer
│   ├── PersonFact
│   ├── Interest
│   ├── Preference
│   ├── Role
│   ├── Expertise
│   └── RelationshipNote
│
├── Content Layer
│   ├── Document
│   ├── Note
│   ├── Chunk
│   ├── Quote
│   ├── Artifact
│   ├── Transcript        (deferred — requires local audio; see §15)
│   ├── Utterance         (deferred — requires local audio; see §15)
│   └── Script            (deferred)
│
├── Concept Layer
│   ├── Concept
│   ├── ConceptScheme     (v2)
│   ├── Claim             (v2)
│   ├── Theme
│   └── TopicCluster      (v2)
│
├── Activity / Work Layer
│   ├── Event
│   ├── Meeting
│   ├── Workshop
│   ├── Presentation
│   ├── Project
│   ├── Task
│   ├── Action
│   ├── Decision
│   ├── Commitment
│   ├── Outcome
│   └── Deliverable
│
├── Problem Resolution Layer
│   ├── Problem
│   ├── Symptom
│   ├── Hypothesis
│   ├── Attempt
│   ├── RootCause
│   ├── Resolution
│   ├── Procedure
│   ├── Step
│   ├── Runbook
│   ├── Environment
│   └── LessonLearned
│
├── Agent Work / Execution Trace Layer
│   ├── AgentTask
│   ├── AgentRun
│   ├── AgentStep
│   ├── ToolUse
│   ├── CommandRun
│   ├── FileRead
│   ├── FileChange
│   ├── CodeChange
│   ├── Observation
│   ├── Error
│   ├── DecisionPoint
│   ├── ReusablePattern
│   └── GeneratedArtifact
│
├── Provenance Layer
│   ├── Source
│   ├── ImportJob
│   ├── ParsingJob
│   ├── EmbeddingJob        (local model)
│   ├── ExtractionJob
│   ├── GraphProjectionJob
│   ├── AiInvocation        (a Copilot SDK call)
│   └── Review
│
└── Annotation Layer
    ├── Annotation
    ├── Highlight
    ├── Comment
    └── Anchor
```

---

## 5. Core Node Labels

### 5.1 `:Agent`

An actor capable of performing work or generating information. External alignment: PROV-O `prov:Agent`. Implement as `:Agent` plus subtype labels.

```cypher
(:Agent:Person {displayName: "Oscar Marin"})
(:Agent:SoftwareAgent {name: "GitHub Copilot", agentType: "coding_agent"})
(:Agent:SoftwareAgent {name: "Claude Code", agentType: "coding_agent"})
(:Agent:SoftwareAgent {name: "notegraph ingestion worker", agentType: "worker"})
(:Agent:ServiceAgent {name: "local-embedding-model", agentType: "embedding_service"})
(:Agent:ModelAgent {name: "gpt-4o", provider: "GitHub Copilot"})
```

Typical properties:

```text
id, ownerId, name, displayName, agentType, provider,
version, runtime, capabilities, createdAt, updatedAt, ontologyVersion
```

Typical relationships:

```text
(:Agent)-[:PERFORMED]->(:Action|:AgentRun|:ToolUse)
(:Agent)-[:GENERATED]->(:Document|:Note|:Resolution|:Runbook|:CodeChange)
(:Agent)-[:WAS_RESPONSIBLE_FOR]->(:Activity|:Task|:Problem)
```

### 5.2 `:Person`

A human identity. External alignment: Schema.org `schema:Person`, PROV-O `prov:Person`.

```text
(:Person)-[:ATTENDED]->(:Event)
(:Person)-[:ORGANIZED]->(:Event)
(:Person)-[:REQUESTED]->(:AgentRun)
(:Person)-[:PERFORMED]->(:Action)
(:Person)-[:ASSIGNED_TO]->(:Task)
(:Person)-[:AUTHORED]->(:Document|:Note)
(:Person)-[:WORKS_FOR]->(:Organization)
(:Person)-[:HAS_ROLE]->(:Role)
(:Person)-[:HAS_FACT]->(:PersonFact)
(:Person)-[:HAS_INTEREST]->(:Interest)
(:Person)-[:HAS_PREFERENCE]->(:Preference)
(:Person)-[:CARES_ABOUT]->(:Concept)
(:Person)-[:EXPERT_IN]->(:Concept)
(:Person)-[:INVOLVED_IN]->(:Project)
```

### 5.3 `:SoftwareAgent`

A coding agent, automation agent, LLM-based agent, workflow runner, or local system worker. In notegraph the primary software agents are:

```text
GitHub Copilot          (the v1 AI provider, via the Copilot SDK)
Claude Code             (or another coding agent whose work is captured)
notegraph ingestion worker
notegraph graph projection worker
local embedding model   (as a ServiceAgent)
```

Typical properties:

```text
id, ownerId, name, agentType, provider, version,
runtime, environment, capabilities, createdAt, updatedAt, ontologyVersion
```

Recommended `agentType` values:

```text
coding_agent
automation_agent
llm_agent
service_agent
worker
embedding_service
graph_projection_worker
```

Typical relationships:

```text
(:SoftwareAgent)-[:PERFORMED]->(:AgentRun)
(:SoftwareAgent)-[:USED_TOOL]->(:ToolUse)
(:SoftwareAgent)-[:GENERATED]->(:CodeChange|:Document|:Runbook|:Resolution)
(:SoftwareAgent)-[:OPERATED_IN]->(:Environment)
```

### 5.4 `:PersonFact`

A discrete fact, memory, observation, or relationship-intelligence item about a person — for example: *"Joe prefers concise executive summaries."* *"Joe is focused on deployment automation."* *"Joe has budget authority for the platform modernization project."*

Typical properties:

```text
id, ownerId, type, statement, normalizedValue, sensitivity,
confidence, reviewStatus, visibility, createdAt, lastConfirmedAt, updatedAt, ontologyVersion
```

Recommended `type` values: `interest`, `preference`, `professional_context`, `personal_context`, `communication_style`, `expertise`, `relationship_note`, `follow_up_context`.

Recommended `sensitivity` values: `public`, `business`, `personal`, `sensitive`, `restricted`.

Typical relationships:

```text
(:Person)-[:HAS_FACT]->(:PersonFact)
(:PersonFact)-[:ABOUT]->(:Person)
(:PersonFact)-[:SUPPORTED_BY]->(:Chunk|:Document|:Note|:AgentStep)
(:PersonFact)-[:CAPTURED_DURING]->(:Event)
(:PersonFact)-[:RELATED_TO]->(:Concept|:Project|:Organization|:Interest|:Preference)
(:PersonFact)-[:WAS_GENERATED_BY]->(:ExtractionJob|:AgentRun)
```

Governance rule: AI-extracted personal facts default to `reviewStatus = 'unreviewed'`. Sensitive personal facts require explicit user acceptance before being used in retrieval or summaries — including by the local AI assistant.

### 5.5 `:Organization`

A company, institution, team, client, or vendor. External alignment: Schema.org `schema:Organization`.

```text
(:Person)-[:WORKS_FOR]->(:Organization)
(:Project)-[:FOR_ORGANIZATION]->(:Organization)
(:Event)-[:HOSTED_BY]->(:Organization)
(:Document)-[:ABOUT]->(:Organization)
(:Chunk)-[:MENTIONS]->(:Organization)
(:Problem)-[:OCCURRED_AT]->(:Organization)
```

### 5.6 `:Project`

A planned effort, workstream, product, client initiative, research effort, or personal build. External alignment: Schema.org `schema:Project`.

```text
(:Project)-[:FOR_ORGANIZATION]->(:Organization)
(:Event)-[:PART_OF]->(:Project)
(:Task)-[:PART_OF]->(:Project)
(:AgentRun)-[:WORKED_ON]->(:Project)
(:Problem)-[:RELATED_TO]->(:Project)
(:Deliverable)-[:PART_OF]->(:Project)
(:Document)-[:RELATED_TO]->(:Project)
(:Concept)-[:RELEVANT_TO]->(:Project)
```

### 5.7 `:Concept`

A topic, idea, theme, domain concept, or controlled-vocabulary term. External alignment: SKOS `skos:Concept`.

Typical properties:

```text
id, ownerId, prefLabel, altLabels, hiddenLabels, summary,
source, confidence, createdAt, updatedAt, ontologyVersion
```

The `Concept` node also carries a locally-computed `embedding` used for concept dedup and semantic search (stored in LadybugDB's vector index).

Typical relationships:

```text
(:Concept)-[:BROADER_THAN]->(:Concept)
(:Concept)-[:NARROWER_THAN]->(:Concept)
(:Concept)-[:RELATED_TO {weight}]->(:Concept)
(:Concept)-[:SAME_AS]->(:Concept)
(:Chunk)-[:ABOUT]->(:Concept)
(:Chunk)-[:MENTIONS]->(:Concept)
(:Task)-[:RELATED_TO]->(:Concept)
(:Event)-[:DISCUSSED]->(:Concept)
(:Decision)-[:ABOUT]->(:Concept)
(:Problem)-[:RELATED_TO]->(:Concept)
(:Runbook)-[:APPLIES_TO]->(:Concept)
(:ReusablePattern)-[:APPLIES_TO]->(:Concept)
```

### 5.8 `:Document`, `:Note`, and `:Chunk`

The content layer preserves the evidence that supports the graph.

`Chunk` is the atomic content unit. In notegraph v1 a chunk is a **note paragraph** or a **document paragraph**. (When local audio arrives, a chunk may also be a transcript utterance; see §15.) A chunk may also be a quote, terminal-log segment, command output, or agent-trace excerpt.

Typical relationships:

```text
(:Document|:Note)-[:HAS_CHUNK {order}]->(:Chunk)
(:Chunk)-[:MENTIONS {confidence}]->(:Person|:Organization|:Concept|:Project|:Problem)
(:Chunk)-[:ABOUT {confidence}]->(:Concept)
(:Chunk)-[:SUPPORTS]->(:Claim|:Decision|:Task|:Outcome|:Resolution|:PersonFact)
(:Chunk)-[:WAS_DERIVED_FROM]->(:Source)
(:Note)-[:ANNOTATES]->(:Chunk)
```

Recommended implementation:

```cypher
(:Chunk {
  id: "...",
  text: "We should explore AI for code review.",
  orderIndex: 42,
  pageNumber: 3,
  charOffset: 1180,
  sourceType: "document"
})
```

Each `Chunk` carries a locally-computed `embedding` in LadybugDB's vector index, enabling offline semantic search.

### 5.9 `:Event`

Something that happens in time and possibly a place. External alignment: Schema.org `schema:Event`. In notegraph v1, events are typically captured *as notes* (e.g. meeting notes) rather than from audio.

```cypher
(:Event:Meeting {eventType: "meeting"})
(:Event:Workshop {eventType: "workshop"})
(:Event:Presentation {eventType: "presentation"})
(:Event:DebuggingSession {eventType: "debugging_session"})
```

```text
(:Person)-[:ATTENDED]->(:Event)
(:Person)-[:ORGANIZED]->(:Event)
(:SoftwareAgent)-[:PARTICIPATED_IN]->(:Event)
(:Event)-[:PART_OF]->(:Project)
(:Event)-[:PRODUCED]->(:Note|:Decision|:Task|:Deliverable|:Outcome|:Problem|:Runbook)
(:Event)-[:DISCUSSED]->(:Concept)
(:Event)-[:USED]->(:Document|:Tool)
(:Event)-[:HAS_NOTE]->(:Note)
```

### 5.10 `:Task`

Planned or assigned work. A task is planned work; an action is performed work; an agent task is a task delegated to or performed by a software agent.

```text
(:Task)-[:ASSIGNED_TO]->(:Person|:SoftwareAgent)
(:Task)-[:CREATED_IN]->(:Event)
(:Task)-[:PART_OF]->(:Project)
(:Task)-[:RELATED_TO]->(:Concept)
(:Task)-[:USES]->(:Document|:Chunk|:Tool)
(:Task)-[:RESULTED_IN]->(:Outcome|:Deliverable|:CodeChange|:Runbook)
(:Task)-[:EVIDENCED_BY]->(:Chunk|:Document|:Action|:AgentRun)
(:Decision)-[:CREATED]->(:Task)
(:AgentRun)-[:WORKED_ON]->(:Task)
```

### 5.11 `:Action`

Something that was done. External alignment: ActivityStreams-style action model + PROV-O activity model. Grammar: `actor -> action -> object -> target/result/instrument`.

```text
(:Person|:SoftwareAgent)-[:PERFORMED]->(:Action)
(:Action)-[:OBJECT]->(:Task|:Document|:Note|:Chunk|:File|:Problem)
(:Action)-[:RESULT]->(:Outcome|:Deliverable|:Document|:Note|:CodeChange|:Runbook)
(:Action)-[:OCCURRED_DURING]->(:Event|:AgentRun)
(:Action)-[:USED]->(:Document|:Tool|:Service|:Command)
(:Action)-[:RELATED_TO]->(:Concept|:Project|:Problem)
```

### 5.12 `:Decision`, `:Outcome`, `:Deliverable`, and `:Commitment`

The structured results of work.

```text
(:Decision)-[:MADE_IN]->(:Event|:AgentRun)
(:Decision)-[:MADE_BY]->(:Person|:Organization|:SoftwareAgent)
(:Decision)-[:ABOUT]->(:Concept|:Project|:Task|:Problem)
(:Decision)-[:SUPPORTED_BY]->(:Chunk|:Document|:AgentStep|:ToolUse)
(:Decision)-[:CREATED]->(:Task|:AgentTask)
(:Decision)-[:SUPERSEDES]->(:Decision)

(:Outcome)-[:RESULT_OF]->(:Task|:Action|:Attempt|:AgentRun)
(:Deliverable)-[:RESULT_OF]->(:Task|:Action|:AgentRun|:Event)
(:Deliverable)-[:BASED_ON]->(:Document|:Chunk|:CodeChange)
(:Commitment)-[:MADE_BY]->(:Person|:Organization|:SoftwareAgent)
(:Commitment)-[:MADE_IN]->(:Event|:AgentRun)
(:Commitment)-[:CREATED]->(:Task)
```

---

## 6. Problem Resolution Layer

Problem solving is first-class. notegraph should remember not only the solution but the path taken to reach it.

### 6.1 Purpose

```text
Problem → Symptoms → Context → Hypotheses → Attempts → Outcomes → Root Cause → Resolution → Procedure → Runbook → Lesson Learned
```

The purpose is to make problems reusable. Next time a similar issue happens, notegraph surfaces the known fix, failed attempts, environmental context, and step-by-step runbook.

### 6.2 Core Labels

```text
:Problem  :Symptom  :Hypothesis  :Attempt  :RootCause
:Resolution  :Procedure  :Step  :Runbook  :Environment  :LessonLearned
```

### 6.3 `:Problem`

An issue, obstacle, defect, failure, confusing situation, or recurring pain point.

Typical properties:

```text
id, ownerId, title, description, problemType, status, severity,
firstObservedAt, resolvedAt, recurrenceCount, createdAt, updatedAt, ontologyVersion
```

Recommended `problemType` values: `technical_issue`, `coding_issue`, `infrastructure_issue`, `process_issue`, `data_issue`, `deployment_issue`, `research_question`, `personal_productivity_issue`.

```text
(:Person|:SoftwareAgent)-[:ENCOUNTERED]->(:Problem)
(:Problem)-[:HAS_SYMPTOM]->(:Symptom)
(:Problem)-[:OCCURRED_IN]->(:Environment)
(:Problem)-[:AFFECTS]->(:Repository|:Application|:Service|:Project)
(:Problem)-[:RELATED_TO]->(:Concept)
(:Problem)-[:HAD_HYPOTHESIS]->(:Hypothesis)
(:Problem)-[:HAD_ATTEMPT]->(:Attempt)
(:Problem)-[:HAS_ROOT_CAUSE]->(:RootCause)
(:Problem)-[:RESOLVED_BY]->(:Resolution)
(:Problem)-[:TAUGHT]->(:LessonLearned)
(:Problem)-[:SIMILAR_TO]->(:Problem)
(:Problem)-[:SUPPORTED_BY]->(:Chunk|:Note|:AgentRun|:ToolUse|:CommandRun)
```

### 6.4 `:Attempt`

Something tried while solving a problem. Store both failed and successful attempts.

Typical properties:

```text
id, ownerId, title, actionSummary, attemptOrder, status,
startedAt, endedAt, result, notes, createdAt, ontologyVersion
```

Recommended `result` values: `failed`, `partially_worked`, `succeeded`, `inconclusive`, `abandoned`.

```text
(:Problem)-[:HAD_ATTEMPT]->(:Attempt)
(:Attempt)-[:PERFORMED_BY]->(:Person|:SoftwareAgent)
(:Attempt)-[:USED]->(:Tool|:CommandRun|:Document|:Service)
(:Attempt)-[:HAD_OUTCOME]->(:Outcome)
(:Attempt)-[:OBSERVED]->(:Observation|:Error|:Symptom)
(:Attempt)-[:SUPPORTED_BY]->(:Chunk|:Note|:AgentStep|:ToolUse)
```

### 6.5 `:Resolution`

What actually resolved or mitigated the problem.

```text
(:Problem)-[:RESOLVED_BY]->(:Resolution)
(:Resolution)-[:ADDRESSED]->(:Symptom|:Error|:RootCause)
(:Resolution)-[:HAS_PROCEDURE]->(:Procedure)
(:Resolution)-[:GENERATED_RUNBOOK]->(:Runbook)
(:Resolution)-[:SUPPORTED_BY]->(:Chunk|:Note|:AgentStep|:CommandRun|:CodeChange)
(:Resolution)-[:APPLIES_TO]->(:Environment|:Repository|:Application|:Concept)
```

### 6.6 `:Runbook`

A reusable operational guide derived from a resolution or a repeated successful process.

Typical properties:

```text
id, ownerId, title, summary, appliesWhen, knownNonSolutions,
lastSuccessfulUseAt, confidence, reviewStatus, createdAt, updatedAt, ontologyVersion
```

```text
(:Resolution)-[:GENERATED_RUNBOOK]->(:Runbook)
(:Runbook)-[:APPLIES_TO]->(:Environment|:Repository|:Application|:Concept|:Problem)
(:Runbook)-[:HAS_TRIGGER_SYMPTOM]->(:Symptom)
(:Runbook)-[:HAS_STEP {order}]->(:Step)
(:Runbook)-[:DERIVED_FROM]->(:Problem|:AgentRun|:Event)
(:Runbook)-[:SUPERSEDES]->(:Runbook)
```

### 6.7 Worked Example

```text
Problem: Local dev server won't start after dependency upgrade
Symptoms:
- "module not found" on boot
- Works on a teammate's machine
- Started after upgrading the build tool

Attempts:
1. Reinstalled node_modules — failed
2. Cleared the build cache — failed
3. Pinned the build tool to the prior minor version — succeeded

Root cause:
Breaking change in the build tool's resolver in the new minor version

Resolution:
Pin the build tool version; add a lockfile check to CI

Runbook:
1. Read the boot error and note the failing module
2. Diff the lockfile against the last known-good commit
3. Pin the offending dependency to the prior version
4. Reinstall and re-run
5. Record the pin and open a follow-up to upgrade deliberately
```

This lets notegraph answer: *How did I fix this last time? What did I try that did not work? Which exact steps worked? What should I check first next time?*

---

## 7. Agent Work and Execution Trace Layer

This layer captures work performed by coding agents, automation agents, LLM agents, and notegraph's own local workers — such as GitHub Copilot, Claude Code, or the ingestion/projection workers.

### 7.1 Purpose

Turn AI-agent execution into reusable operational memory, capturing: goal, context, inputs, files inspected, commands run, tools used, observations, errors, decisions made, attempts tried, changes made, outputs produced, tests run, final result, reusable pattern, and runbook for next time.

This lets notegraph answer: *How did the agent solve this kind of issue last time? What files usually change for this type of feature? What command fixed the deployment issue? Which failed attempts should the next agent avoid?*

### 7.2 Core Labels

```text
:AgentTask  :AgentRun  :AgentStep  :ToolUse  :CommandRun
:FileRead  :FileChange  :CodeChange  :Observation  :Error
:DecisionPoint  :ReusablePattern  :GeneratedArtifact
```

### 7.3 `:AgentTask`

A task intended for or performed by a software agent.

```text
id, ownerId, title, goal, status, priority,
requestedAt, startedAt, completedAt, createdAt, updatedAt, ontologyVersion
```

```text
(:Person)-[:REQUESTED]->(:AgentTask)
(:AgentTask)-[:ASSIGNED_TO]->(:SoftwareAgent)
(:AgentTask)-[:PART_OF]->(:Project)
(:AgentTask)-[:RELATED_TO]->(:Problem|:Concept|:Repository|:Application)
(:AgentTask)-[:HAS_RUN]->(:AgentRun)
(:AgentTask)-[:RESULTED_IN]->(:CodeChange|:Document|:Runbook|:Resolution|:Deliverable)
```

### 7.4 `:AgentRun`

One execution of an agent trying to complete a goal.

```text
id, ownerId, goal, status, startedAt, endedAt, summary,
model, provider, runtime, environment, confidence, createdAt, ontologyVersion
```

In notegraph, `provider` is typically `github_copilot` (or the coding agent whose summary was captured), and `model` is the model that agent used. Recommended `status` values: `queued`, `running`, `succeeded`, `failed`, `partial`, `cancelled`, `needs_human_review`.

```text
(:SoftwareAgent)-[:PERFORMED]->(:AgentRun)
(:Person)-[:REQUESTED]->(:AgentRun)
(:AgentRun)-[:WORKED_ON]->(:Problem|:Task|:Project|:Repository|:Application|:Document)
(:AgentRun)-[:HAS_STEP {order}]->(:AgentStep)
(:AgentRun)-[:USED]->(:Tool|:Repository|:Document|:Environment)
(:AgentRun)-[:PRODUCED]->(:CodeChange|:Document|:Resolution|:Runbook|:Deliverable)
(:AgentRun)-[:DERIVED_PATTERN]->(:ReusablePattern)
(:AgentRun)-[:DERIVED_LESSON]->(:LessonLearned)
(:AgentRun)-[:RESOLVED]->(:Problem)
(:AgentRun)-[:SUPPORTED_BY]->(:Chunk)     # the agent-work summary chunk(s)
```

### 7.5 `:AgentStep`

An ordered step inside an agent run.

```text
id, ownerId, orderIndex, actionType, summary, reasoningSummary,
timestamp, status, createdAt, ontologyVersion
```

Do **not** store private chain-of-thought. Store a brief, user-safe reasoning summary if needed, e.g. *"The agent inspected the projection step because the failing test suggested a missing graph relationship."*

```text
(:AgentRun)-[:HAS_STEP]->(:AgentStep)
(:AgentStep)-[:USED_TOOL]->(:ToolUse)
(:AgentStep)-[:READ]->(:Document|:CodeFile|:Chunk|:Log)
(:AgentStep)-[:MODIFIED]->(:CodeFile|:Document)
(:AgentStep)-[:OBSERVED]->(:Observation|:Error)
(:AgentStep)-[:MADE_DECISION]->(:DecisionPoint)
(:AgentStep)-[:PRODUCED]->(:FileChange|:CodeChange|:Note|:Observation)
(:AgentStep)-[:SUPPORTED_BY]->(:Chunk|:CommandRun|:ToolUse)
```

### 7.6 `:ToolUse` and `:CommandRun`

A tool call or command execution performed by an agent (read file, run tests, query database, create commit, …).

```text
id, ownerId, toolName, action, inputSummary, outputSummary,
status, startedAt, endedAt, exitCode, createdAt, ontologyVersion
```

```text
(:AgentStep)-[:USED_TOOL]->(:ToolUse)
(:ToolUse)-[:PRODUCED]->(:Observation|:Error|:GeneratedArtifact|:CommandRun)
(:ToolUse)-[:USED]->(:Tool|:Service|:Repository|:Environment)
(:CommandRun)-[:HAD_OUTPUT]->(:Chunk|:Log|:Observation)
(:CommandRun)-[:OBSERVED]->(:Error)
```

### 7.7 `:CodeChange` and `:FileChange`

Files modified and code changes produced by an agent or person.

```text
id, ownerId, repository, branch, commitSha, filePath,
changeType, summary, linesAdded, linesRemoved, createdAt, ontologyVersion
```

```text
(:AgentRun|:Action)-[:PRODUCED]->(:CodeChange)
(:CodeChange)-[:MODIFIED]->(:CodeFile)
(:CodeChange)-[:RESOLVED]->(:Problem)
(:CodeChange)-[:IMPLEMENTED]->(:Requirement|:Task|:AgentTask)
(:CodeChange)-[:SUPPORTED_BY]->(:AgentStep|:ToolUse|:CommandRun)
(:CodeChange)-[:PART_OF]->(:PullRequest|:Commit|:Repository)
```

### 7.8 `:ReusablePattern`

A distilled lesson that applies beyond one incident — e.g. *"When adding a new ontology node type, update the ontology doc, the LadybugDB schema, the projection step, and tests together."*

```text
id, ownerId, title, problemPattern, solutionPattern, antiPatterns,
confidence, reviewStatus, createdAt, updatedAt, ontologyVersion
```

```text
(:ReusablePattern)-[:DERIVED_FROM]->(:AgentRun|:Problem|:Resolution|:Event)
(:ReusablePattern)-[:APPLIES_TO]->(:Concept|:Repository|:Module|:Problem|:Runbook)
(:ReusablePattern)-[:SUPPORTED_BY]->(:AgentStep|:Error|:CodeChange|:CommandRun|:Chunk)
(:ReusablePattern)-[:SUPERSEDES]->(:ReusablePattern)
```

### 7.9 Coding-Agent Example

```text
AgentTask:  Add PersonFact support to the notegraph ontology projection.
Agent:      GitHub Copilot (via the Copilot SDK)  [or Claude Code]
Inputs:     ONTOLOGY.md, LadybugDB schema, projection step, existing graph tests

AgentRun steps:
1. Read ontology spec.
2. Inspected existing Concept projection.
3. Added PersonFact to the LadybugDB schema + uniqueness constraint.
4. Updated the projection step.
5. Added a test for Person -[:HAS_FACT]-> PersonFact.
6. Ran the focused test, then the full graph suite.

Output:  code changes, passing tests, updated docs
ReusablePattern:
When adding a new ontology node type, update the ontology doc, graph schema,
projection step, tests, and documentation together.
```

---

## 8. Relationship Vocabulary

### 8.1 Core Relationships

```text
OWNS  CONTAINS  HAS_CHUNK  PART_OF  MENTIONS  SOURCE_OF  ABOUT
RELATED_TO  BROADER_THAN  NARROWER_THAN  SAME_AS
SUPPORTED_BY  WAS_DERIVED_FROM  WAS_GENERATED_BY  WAS_ATTRIBUTED_TO  ANNOTATES
```

`SOURCE_OF` usage: `(:Document)-[:SOURCE_OF]->(:Note)` or `(:Note)-[:SOURCE_OF]->(:Note)` — connects a source content node to notes and extracted entities derived from it, so traversal can move from a source into the graph_nodes and typed entities it produced. See §9.1.

### 8.2 People and Relationship Relationships

```text
WORKS_FOR  MEMBER_OF  HAS_ROLE  HAS_FACT  HAS_INTEREST
HAS_PREFERENCE  CARES_ABOUT  EXPERT_IN  INVOLVED_IN  CAPTURED_DURING
```

### 8.3 Work and Event Relationships

```text
ATTENDED  ORGANIZED  PRESENTED_AT  PARTICIPATED_IN  PRODUCED
DISCUSSED  USED  ASSIGNED_TO  CREATED_IN  RESULTED_IN
PERFORMED  OBJECT  RESULT  MADE_IN  MADE_BY  CREATED  SUPERSEDES
```

### 8.4 Problem Resolution Relationships

```text
ENCOUNTERED  HAS_SYMPTOM  OCCURRED_IN  AFFECTS  HAD_HYPOTHESIS
HAD_ATTEMPT  HAS_ROOT_CAUSE  RESOLVED_BY  ADDRESSED  HAS_PROCEDURE
HAS_STEP  GENERATED_RUNBOOK  APPLIES_TO  TAUGHT  SIMILAR_TO
```

### 8.5 Agent Work Relationships

```text
REQUESTED  WORKED_ON  HAS_RUN  HAS_STEP  USED_TOOL  READ  MODIFIED
OBSERVED  MADE_DECISION  PRODUCED  DERIVED_PATTERN  DERIVED_LESSON
RESOLVED  IMPLEMENTED  HAD_OUTPUT
```

---

## 9. Governance and Safety Rules

### 9.1 Source Traceability

Every generated concept, decision, task, outcome, person fact, problem, resolution, runbook, reusable pattern, and relationship must be traceable to one or more supporting evidence nodes.

Required pattern:

```text
Generated object -> SUPPORTED_BY -> Chunk / AgentStep / ToolUse / CommandRun / CodeChange
Evidence -> PART_OF / WAS_DERIVED_FROM -> Source
Source -> WAS_GENERATED_BY -> Job / AgentRun / Service
```

When a graph node (Event, Task, Decision, Resolution, …) is accepted or edited, it receives both a fine-grained evidence edge and a source shortcut:

```cypher
(node)-[:SUPPORTED_BY]->(:Chunk)          // fine-grained provenance for detail traversal
(:Note|:Document)-[:MENTIONS]->(node)      // single-hop shortcut from the source content
```

The `SUPPORTED_BY` edge preserves which exact chunk (and order) justifies the node; the `MENTIONS` shortcut lets overview queries connect source content to graph nodes in one hop without traversing Chunk stubs.

**No-orphans invariant.** An accepted or edited node is always connected to its source `Note` or `Document` in the LadybugDB projection. Accepting or editing a node cascades acceptance to its chunk links, and the projection step falls back to a node's non-rejected chunk links rather than producing an orphan. Because the content files on disk are the system of record, `Rebuild graph` re-projects a consistent, orphan-free graph at any time.

### 9.2 User-Curated Knowledge Wins

If a user edits, merges, renames, approves, or rejects an extracted item, that curated version takes precedence over future extractions.

### 9.3 Review Status

Generated objects include: `reviewStatus`, `confidence`, `source`, `extractionJobId` or `agentRunId`, `createdAt`, `updatedAt`, `ontologyVersion`.

Recommended `reviewStatus` values: `unreviewed`, `accepted`, `edited`, `rejected`, `merged`, `superseded`.

### 9.4 Personal Facts Require Sensitivity Handling

Person facts carry a sensitivity classification: `public`, `business`, `personal`, `sensitive`, `restricted`.

- Business facts can be used in normal retrieval.
- Personal facts can be used if accepted or explicitly allowed.
- Sensitive facts are not auto-surfaced unless the user explicitly asks **and** the fact is user-approved.
- AI-extracted sensitive facts default to `unreviewed` and are hidden from normal summaries — including from the local AI assistant.

### 9.5 Agent Runs Should Not Store Private Chain-of-Thought

Agent runs may store goals, steps, tool inputs/outputs, observed errors, file changes, concise reasoning summaries, final explanations, and reusable lessons. They must not store hidden chain-of-thought. Use concise, user-safe summaries of why a step was taken.

### 9.6 Failed Attempts Should Be Preserved

Failed attempts are a high-value part of the graph. Do not delete them just because a final resolution exists.

### 9.7 LadybugDB Must Stay Rebuildable

Store canonical records as content files on disk, keep original imported documents, and rebuild LadybugDB through a deterministic projection step. The graph is always reconstructible from the files plus stored extraction outputs.

### 9.8 Duplicate Resolution: Profile-Based Disambiguation

Entity deduplication does not operate on names alone. A name match is a trigger for investigation, not a verdict. notegraph resolves entities by profile, not by label:

1. **Candidate generation** — fuzzy name matching combined with local vector similarity on the entity's embedding surfaces probable duplicates.
2. **Dossier building** — for each candidate pair, assemble a contextual dossier from each entity's local graph neighborhood (co-occurring concepts, organizations, people, events) plus the supporting source chunks.
3. **AI adjudication** — the `entity_disambiguation` task (via the Copilot SDK) receives both dossiers and returns `same` / `different` / `uncertain`, with a confidence score, a rationale, and corroborating vs. distinguishing signals.
4. **Resolution** — applied by mode: `manual` (queue all for review), `confidence` (auto-merge at/above a threshold), or `autonomous` (resolve confident pairs, queue uncertain ones).

**Curated entities are protected**: an entity with `reviewStatus = 'accepted' | 'edited'` is never auto-merged with another curated entity; the curated entity is the canonical survivor. **Merged entities are tombstoned** (`reviewStatus = 'merged'`, `mergedIntoId` → survivor) and removed from the projection but retained via the content files, so the graph can always be rebuilt. **Confirmed-distinct pairs persist** so future scans skip them. A `SAME_AS` edge is reserved for high-confidence conceptual equivalence the user chooses to keep as separate nodes.

---

## 10. LadybugDB Implementation Guidance

### 10.1 Use Multiple Labels for Subtypes

```cypher
(:Agent:Person {displayName: "Oscar Marin"})
(:Agent:SoftwareAgent {name: "GitHub Copilot"})
(:Event:Meeting {eventType: "meeting"})
(:Chunk {sourceType: "document"})
(:Document:Deliverable {deliverableType: "memo"})
(:Problem:TechnicalIssue {problemType: "technical_issue"})
```

*(Label-modeling idioms vary by engine; confirm LadybugDB's support for multiple labels and per-label constraints against the pinned version, and fall back to a `nodeType` property where a secondary label isn't supported.)*

### 10.2 Keep IDs Stable

Every projected node uses the same stable ID as its source record (derived deterministically from the content file + offset), so re-projection is idempotent.

```cypher
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (n:Person) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT concept_id IF NOT EXISTS FOR (n:Concept) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT chunk_id IF NOT EXISTS FOR (n:Chunk) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT event_id IF NOT EXISTS FOR (n:Event) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT problem_id IF NOT EXISTS FOR (n:Problem) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT agent_run_id IF NOT EXISTS FOR (n:AgentRun) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT runbook_id IF NOT EXISTS FOR (n:Runbook) REQUIRE n.id IS UNIQUE;
```

### 10.3 Store Confidence on Generated Relationships

```cypher
(:Chunk)-[:MENTIONS {
  confidence: 0.91,
  extractionJobId: "...",
  model: "gpt-4o",
  provider: "github_copilot",
  ontologyVersion: "0.2.0"
}]->(:Concept)
```

### 10.4 Vector Index for Local Semantic Search

`Chunk` and `Concept` embeddings are computed by the **local** embedding model and indexed in LadybugDB's vector index so semantic search runs entirely on-device. *(Confirm the exact vector-index creation/query API for the pinned LadybugDB version — see VISION.md §11.)*

### 10.5 Do Not Over-Node Simple Properties

Make something a node when it needs independent identity and relationships. Good nodes: `Person`, `PersonFact`, `Concept`, `Event`, `Task`, `Decision`, `Problem`, `Resolution`, `Runbook`, `AgentRun`, `ToolUse`, `CodeChange`, `ReusablePattern`. Keep `status`, `priority`, `confidence`, `sourceType`, `exitCode`, timestamps as **properties**, not nodes. Avoid noisy nodes like `(:Status {name: "open"})`.

---

## 11. Retrieval Patterns

### 11.1 Hybrid Retrieval (all local)

A typical query combines, entirely on-device:

1. **Lexical search** — exact terms, names, commands, file paths, error messages.
2. **Vector search** — semantically similar chunks and summaries, via LadybugDB's vector index over local embeddings.
3. **Graph traversal** — expand from people, concepts, projects, problems, agent runs, or runbooks.
4. **Rank fusion** — deduplicate and rank by relevance, recency, confidence, and evidence quality.

### 11.2 Problem Reuse Retrieval

When the user asks "Have I solved this before?": extract symptoms/errors/concepts → find similar `Problem`/`Error`/`Symptom`/`Runbook` nodes → traverse to prior `Attempt`/`Resolution`/`AgentRun`/`ReusablePattern` → surface what worked, what didn't, exact steps, evidence, last successful use, and confidence.

### 11.3 Agent Task Bootstrapping

Before starting an AI-agent task, retrieve relevant memory: similar prior `AgentTask`/`AgentRun`/`Problem`/`Error`/`ReusablePattern`, applicable `Runbook`/`Procedure`, and the files/commands/pitfalls from prior work — then give the agent a short context pack (known solution pattern, likely files, commands to run, prior failures, acceptance criteria, relevant chunks). This is one of the highest-value uses of the ontology.

---

## 12. Example Cypher Queries

### 12.1 Which project notes discussed AI for code review?

```cypher
MATCH (project:Project)<-[:RELATED_TO]-(note:Note)-[:HAS_CHUNK]->(chunk:Chunk)-[:ABOUT|MENTIONS]->(concept:Concept)
WHERE (
  concept.prefLabel IN ["AI for Code Review", "Code Review Automation"]
  OR (concept)-[:RELATED_TO|BROADER_THAN|NARROWER_THAN*1..2]-(:Concept {prefLabel: "AI for Code Review"})
)
RETURN project, note, chunk, concept
ORDER BY note.createdAt DESC;
```

### 12.2 What should I remember about Joe before the next meeting?

```cypher
MATCH (person:Person {displayName: $personName})
OPTIONAL MATCH (person)-[:WORKS_FOR|MEMBER_OF]->(org:Organization)
OPTIONAL MATCH (person)-[:HAS_ROLE]->(role:Role)
OPTIONAL MATCH (person)-[:HAS_FACT]->(fact:PersonFact)
WHERE fact.reviewStatus IN ["accepted", "edited"]
  AND fact.sensitivity IN ["business", "personal"]
OPTIONAL MATCH (fact)-[:SUPPORTED_BY]->(evidence)
RETURN person, org, role, fact, evidence
ORDER BY fact.lastConfirmedAt DESC, fact.createdAt DESC;
```

### 12.3 How did I fix this issue last time?

```cypher
MATCH (problem:Problem)-[:HAS_SYMPTOM]->(symptom:Symptom),
      (problem)-[:RESOLVED_BY]->(resolution:Resolution)-[:GENERATED_RUNBOOK]->(runbook:Runbook)
WHERE problem.title CONTAINS $keyword OR symptom.text CONTAINS $symptomText
OPTIONAL MATCH (problem)-[:HAD_ATTEMPT]->(attempt:Attempt)-[:HAD_OUTCOME]->(outcome:Outcome)
OPTIONAL MATCH (runbook)-[:HAS_STEP]->(step:Step)
RETURN problem, symptom, attempt, outcome, resolution, runbook, step
ORDER BY problem.resolvedAt DESC, step.orderIndex ASC;
```

### 12.4 What did the coding agent try last time this error happened?

```cypher
MATCH (error:Error)<-[:OBSERVED]-(step:AgentStep)<-[:HAS_STEP]-(run:AgentRun)<-[:PERFORMED]-(agent:SoftwareAgent)
WHERE error.message CONTAINS $errorText
OPTIONAL MATCH (run)-[:HAS_STEP]->(allSteps:AgentStep)
OPTIONAL MATCH (run)-[:PRODUCED]->(change:CodeChange)
OPTIONAL MATCH (run)-[:DERIVED_PATTERN]->(pattern:ReusablePattern)
RETURN agent, run, error, allSteps, change, pattern
ORDER BY run.endedAt DESC, allSteps.orderIndex ASC;
```

### 12.5 Which files usually change when adding a new ontology node type?

```cypher
MATCH (pattern:ReusablePattern)-[:APPLIES_TO]->(:Concept {prefLabel: "Ontology Node Type"})
OPTIONAL MATCH (pattern)<-[:DERIVED_PATTERN]-(run:AgentRun)-[:PRODUCED]->(change:CodeChange)
RETURN pattern, collect(DISTINCT change.filePath) AS files, collect(DISTINCT run.summary) AS examples;
```

### 12.6 What runbook should I give the coding agent before it starts?

```cypher
MATCH (runbook:Runbook)-[:APPLIES_TO]->(concept:Concept)
WHERE concept.prefLabel IN $taskConcepts
OPTIONAL MATCH (runbook)-[:HAS_STEP]->(step:Step)
OPTIONAL MATCH (runbook)<-[:GENERATED_RUNBOOK]-(resolution:Resolution)<-[:RESOLVED_BY]-(problem:Problem)
RETURN runbook, step, problem, resolution
ORDER BY runbook.lastSuccessfulUseAt DESC, step.orderIndex ASC;
```

### 12.7 Which recurring problems should become automated checks?

```cypher
MATCH (problem:Problem)-[:SIMILAR_TO*0..1]-(similar:Problem)
WITH problem, count(DISTINCT similar) AS recurrence
WHERE recurrence >= 2 OR problem.recurrenceCount >= 2
OPTIONAL MATCH (problem)-[:RESOLVED_BY]->(:Resolution)-[:GENERATED_RUNBOOK]->(runbook:Runbook)
RETURN problem, recurrence, runbook
ORDER BY recurrence DESC, problem.recurrenceCount DESC;
```

### 12.8 Which generated facts or runbooks need review?

```cypher
MATCH (n)
WHERE n.reviewStatus = "unreviewed"
  AND any(label IN labels(n) WHERE label IN ["PersonFact", "Runbook", "ReusablePattern", "Resolution", "Concept"])
RETURN labels(n) AS labels, n
ORDER BY n.createdAt DESC;
```

---

## 13. Scenarios for Leveraging the Ontology

**Scenario 1 — Corpus intelligence.** *"Across all my project notes and documents, who is focused on improving code review with AI?"* Path: `Organization → Person → Note/Document → Chunk → Concept`. Returns relevant people, their roles, the documents/notes where the topic appears, related concepts, and any tasks/decisions produced — with evidence links to exact paragraphs.

**Scenario 2 — Relationship memory before a meeting.** *"What should I remember about Joe before I meet him again?"* Path: `Person → Role / Organization / PersonFact / Interest / Preference / Event / Task`. Separates business facts from personal facts and never surfaces unreviewed or sensitive information casually.

**Scenario 3 — Troubleshooting reuse.** *"This broke again. What fixed it last time?"* Path: `Problem → Symptom → Attempt → Outcome → Resolution → Runbook → Step`. Stores the difference between what was tried and what worked.

**Scenario 4 — Coding agent solves a recurring failure.** *"This test is failing again. How did the agent fix this last time?"* Path: `Error → AgentStep → AgentRun → CodeChange → Resolution → ReusablePattern → Runbook`. The next agent session starts from an operational memory pack instead of scratch.

**Scenario 5 — Feature implementation memory.** *"I need to add a new ontology node type. What files and steps are usually involved?"* Path: `ReusablePattern → AgentRun → CodeChange → CodeFile → Repository`. Turns prior agent effort into a reusable engineering playbook.

**Scenario 6 — Document/presentation reuse.** *"Help me build a piece about ontology governance using things I've written before."* Path: `Concept → Chunk → Document / Note → Quote / Deliverable`. Connects written memory, concepts, and deliverables.

**Scenario 7 — Agent handoff and continuity.** *"Give a new coding agent everything it needs to continue this work."* Path: `Project → AgentTask → AgentRun → CodeChange / Decision / Problem / Runbook / ReusablePattern`. Converts scattered agent logs into a structured onboarding packet.

**Scenario 8 — Operational improvement.** *"What recurring issues should I automate?"* Path: `Problem → Similar Problem → Resolution → Runbook → ReusablePattern → Automation Opportunity`. Turns troubleshooting history into an automation backlog.

**Scenario 9 — Governance and trust review.** *"Which extracted facts, runbooks, and patterns should I review?"* Path: `Generated Object → reviewStatus / confidence / sensitivity / supported evidence`. Keeps the graph trustworthy instead of letting unreviewed AI output become invisible truth.

**Scenario 10 — Personal operating-system memory.** *"What did I accomplish this month, and what knowledge did I create?"* Path: `Person → Action / Task / AgentRun / Deliverable / Problem / Resolution / Runbook / Concept`. Models work output, not just stored files.

---

## 14. Suggested Ingestion Pipelines

All stages run locally except the extraction step, which uses the Copilot SDK.

### 14.1 Note Ingestion

```text
Note (markdown) → Semantic chunks → Local embeddings → Entity extraction (Copilot SDK)
              → Concepts / People / Tasks / Decisions → LadybugDB projection
```

### 14.2 Document Ingestion

```text
Document → Local parse (mammoth/pdfjs) → Semantic chunks → Local embeddings
        → Entity extraction (Copilot SDK) → Concepts / Claims / Tasks / Decisions → LadybugDB projection
```

### 14.3 Problem Capture

```text
Note / log / screenshot text → Problem extraction → Symptoms → Attempts → Resolution → Runbook → ReusablePattern
```

### 14.4 Coding Agent Summary Ingestion

```text
Agent-work markdown summary (local inbox) → AgentRun → AgentSteps → ToolUse / CommandRun / FileChange / Error
                                          → CodeChange → Resolution → ReusablePattern → Runbook
```

### 14.5 Agent Memory Pack Generation

```text
New task → retrieve similar Problems / AgentRuns / Runbooks / Patterns (local hybrid search)
        → summarize context → provide to coding agent → capture new run → update graph
```

---

## 15. Minimum Viable Ontology

For v1, implement these labels first:

```text
Agent  Person  SoftwareAgent  Organization  Project
Concept  Document  Note  Chunk
Event  Meeting  Task  Action  Decision  Deliverable
PersonFact
Problem  Symptom  Attempt  Resolution  Procedure  Step  Runbook
AgentTask  AgentRun  AgentStep  ToolUse  CommandRun  Error  CodeChange  ReusablePattern
Source  ExtractionJob  AiInvocation
```

Required v1 relationships:

```text
OWNS  HAS_CHUNK  PART_OF  MENTIONS  ABOUT  RELATED_TO  BROADER_THAN  SAME_AS
SUPPORTED_BY  WAS_DERIVED_FROM  WAS_GENERATED_BY  ANNOTATES
WORKS_FOR  HAS_FACT  ATTENDED  PRODUCED  DISCUSSED  ASSIGNED_TO  RESULTED_IN  PERFORMED  USED
ENCOUNTERED  HAS_SYMPTOM  HAD_ATTEMPT  HAD_OUTCOME  RESOLVED_BY  HAS_PROCEDURE  HAS_STEP
GENERATED_RUNBOOK  APPLIES_TO
REQUESTED  WORKED_ON  HAS_RUN  USED_TOOL  READ  MODIFIED  OBSERVED  DERIVED_PATTERN  DERIVED_LESSON
```

Defer until a later version:

```text
Transcript  Utterance  Script  Speaker        (require local audio — see VISION.md §4.6)
ConceptScheme  TopicCluster  Claim  Commitment  Milestone  Risk  Requirement
Review workflow UI  Formal ontology migration UI  Advanced SHACL-style validation
Automatic sensitive-fact classifier  Agent performance comparison dashboard
```

**Gating rules for projection:**
- Only `reviewStatus = 'accepted'` or `'edited'` entities are projected into LadybugDB. `unreviewed` and `rejected` never reach the graph view.
- Content nodes (`Note`, `Document`) default to `reviewStatus = 'accepted'` at creation (they are evidence).
- Extracted entities default to `unreviewed` and must be curated before projection.
- `Rebuild graph` wipes and rebuilds the full projection from the content files on disk at any time. Ordering: typed entities first, then general graph nodes, then edges.

---

## 16. Future Interoperability

Although notegraph starts as a LadybugDB property graph, the ontology is documented well enough to support future export to RDF/JSON-LD:

1. Map node labels to namespace-prefixed classes.
2. Map relationship types to namespace-prefixed predicates.
3. Export node IDs as stable IRIs.
4. Export selected properties as JSON-LD attributes.
5. Preserve provenance and source links.
6. Export `AgentRun` and `Problem` traces as PROV-O-inspired activities and entities.

Example future IRI pattern:

```text
https://notegraph.local/id/concept/{id}
https://notegraph.local/id/chunk/{id}
https://notegraph.local/id/event/{id}
https://notegraph.local/id/task/{id}
https://notegraph.local/id/problem/{id}
https://notegraph.local/id/agent-run/{id}
https://notegraph.local/id/runbook/{id}
```

LadybugDB's interoperability with columnar/relational formats (Parquet, Arrow, DuckDB) also provides a practical bulk-export path for the underlying tables.

---

## 17. Summary

notegraph does not create a new ontology from scratch. It defines a practical application profile — reusing the knotes model and established standards, extending them only where necessary, and grounding the whole thing in a local, embedded property graph.

The recommended profile is:

```text
Schema.org        for people, organizations, events, projects, and creative works
SKOS              for concepts, labels, aliases, and concept hierarchies
PROV-O            for provenance, agents, activities, generation, derivation, attribution
Web Annotation    for notes, highlights, comments, and anchors
ActivityStreams   for human and system actions
notegraph Person Profile        for relationship intelligence, interests, preferences, person facts with evidence
notegraph Problem Resolution    for problems, symptoms, attempts, resolutions, procedures, runbooks
notegraph Agent Work            for software agents, execution summaries, tool use, code changes, errors, patterns, runbooks
notegraph Core                  for chunks, documents, notes, embeddings, and their provenance
```

The center of the model is not a document or a meeting. The center is the full loop of human and AI-assisted work:

```text
Event → Artifact → Chunk → Concept
Event → Decision → Task → Action → Outcome → Deliverable
Problem → Attempt → Outcome → Resolution → Runbook → ReusablePattern
AgentTask → AgentRun → AgentStep → ToolUse / Error / CodeChange → Resolution → Runbook
Deliverable → Document → Chunk → Concept
```

The practical north star is simple:

> notegraph should remember not just information, but the work required to create, understand, apply, fix, and reuse that information — all on your own machine, private by construction.
