# Token Estimator — SAP & Transformation task list v2 (2026-11-08)

Status: BUILT from public SAP work shapes only. No client input, no ticket
content, no system data — every task below is a generic shape of SAP work as
described in public SAP documentation and standard practitioner vocabulary.
This v2 replaces the v1 SAP section (A1–A24), which was structured by copying
the ServiceNow list across and was ruled wrong on 2026-10-29.

Structure: organised the way SAP work itself is organised — Run, Build,
Transform — with the SAP functional area (FI/CO, Procurement, Plan-to-Produce,
SD, Supply Chain, Master Data, HR) as a tag on the task, not a separate list.

Each task carries: the engine task type (drives predicted output), a typical
input size for a real instance of that task, one line of guidance, and the
Minimiser protection for that task (what to strip before anything is pasted
into a model — generic SAP hygiene categories only).

## Run — SAP support work
- SAP-01 Incident analysis summary [summarise] — condense an incident thread into cause, impact, next step
- SAP-02 Root cause & fix summary [draft] — write the RCA narrative from analysis notes
- SAP-03 Customer update from work notes [draft] — turn resolver work notes into a customer-facing update
- SAP-04 Enhancement request sizing summary [extract] — pull scope, effort drivers and risks out of a request
- SAP-05 Defect triage summary [summarise] — group and rank defects in testing or hypercare
- SAP-06 How-to guide from a resolved issue [draft] — turn a resolution into a reusable guide

## Build — SAP technical & design work
- SAP-07 Functional specification draft [draft] — structure a spec from requirements notes
- SAP-08 Test script from a specification [draft] — steps, data needs and expected results
- SAP-09 Code review summary [code] — findings and risks from a code read (ABAP or other)
- SAP-10 Interface mapping summary [extract] — source/target fields and rules from a mapping sheet
- SAP-11 Role & authorisation impact summary [classify] — what changes, who is affected, what to test
- SAP-12 Report / data extraction specification [extract] — selection criteria, fields, output format

## Transform — programme & project work
- SAP-13 Fit-gap analysis summary [summarise] — requirements vs standard capability, gaps listed
- SAP-14 Process design narrative [draft] — the future-state process story for a design document
- SAP-15 Data migration mapping & cleansing summary [extract] — rules, exceptions, cleansing actions
- SAP-16 UAT evidence summary [summarise] — what was tested, what passed, what is still open
- SAP-17 Cutover readiness summary [summarise] — readiness by workstream, blockers, go/no-go inputs
- SAP-18 Stakeholder change communication [draft] — announce a change, a freeze, a downtime window
- SAP-19 Steering pack narrative [summarise] — status, milestones, risks and decisions for executives
- SAP-20 Hypercare daily report [summarise] — volumes, top issues, ageing, escalations
- SAP-21 Training FAQ draft [draft] — answers to the questions users actually ask at go-live

## Minimiser protections (apply across all SAP tasks)
Strip or replace before pasting into any model: system IDs and hostnames,
client-specific transaction variants, user IDs, business partner / customer /
vendor numbers, material numbers tied to a real product, pricing and contract
values, and any export-controlled or personal data. Keep the structure, lose
the identifiers — the estimate and the drafting help survive anonymisation.
