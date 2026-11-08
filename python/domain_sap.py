"""
domain_sap.py — the Python port of the SAP & Transformation edition
(src/domain-sap.js). Same 21 tasks, same guidance, same protections,
estimated by the same engine. Built from public SAP work shapes only.
"""

from token_core import estimate_task

STRIP = "Strip system IDs, hostnames, user IDs and partner numbers before pasting."
STRIP_DATA = "Strip real material, customer and vendor numbers; keep the structure, lose the identifiers."
STRIP_VALUES = "Strip pricing, contract values and any export-controlled or personal data."

_PROTECTIONS = {
    STRIP: STRIP, STRIP_DATA: STRIP_DATA, STRIP_VALUES: STRIP_VALUES,
}

SAP_TASKS = [
    {"id": 'SAP-01', "area": 'Run', "name": 'Incident analysis summary', "taskType": 'summarise', "typicalInputTokens": 900,
     "guidance": 'Ask for cause, impact and next step as three separate lines.', "protection": STRIP},
    {"id": 'SAP-02', "area": 'Run', "name": 'Root cause & fix summary', "taskType": 'draft', "typicalInputTokens": 1200,
     "guidance": 'Give the model the timeline first; RCA quality follows chronology.', "protection": STRIP},
    {"id": 'SAP-03', "area": 'Run', "name": 'Customer update from work notes', "taskType": 'draft', "typicalInputTokens": 500,
     "guidance": 'Work notes are written for resolvers; ask for a rewrite, not a summary.', "protection": STRIP},
    {"id": 'SAP-04', "area": 'Run', "name": 'Enhancement request sizing summary', "taskType": 'extract', "typicalInputTokens": 1000,
     "guidance": 'Extract scope, effort drivers and risks as lists, not prose.', "protection": STRIP_VALUES},
    {"id": 'SAP-05', "area": 'Run', "name": 'Defect triage summary', "taskType": 'summarise', "typicalInputTokens": 1600,
     "guidance": 'Paste the defect list as a table; grouping quality doubles.', "protection": STRIP},
    {"id": 'SAP-06', "area": 'Run', "name": 'How-to guide from a resolved issue', "taskType": 'draft', "typicalInputTokens": 800,
     "guidance": 'Resolved once is an answer; written as a guide it is an asset.', "protection": STRIP},
    {"id": 'SAP-07', "area": 'Build', "name": 'Functional specification draft', "taskType": 'draft', "typicalInputTokens": 1500,
     "guidance": 'Specify the output sections up front or the draft rambles.', "protection": STRIP_DATA},
    {"id": 'SAP-08', "area": 'Build', "name": 'Test script from a specification', "taskType": 'draft', "typicalInputTokens": 1400,
     "guidance": 'Ask for steps, data needs and expected results in columns.', "protection": STRIP_DATA},
    {"id": 'SAP-09', "area": 'Build', "name": 'Code review summary', "taskType": 'code', "typicalInputTokens": 2500,
     "guidance": 'Review in chunks by object; one giant paste loses the thread.', "protection": STRIP},
    {"id": 'SAP-10', "area": 'Build', "name": 'Interface mapping summary', "taskType": 'extract', "typicalInputTokens": 1800,
     "guidance": 'Mappings are tables; never let the model narrate them.', "protection": STRIP_DATA},
    {"id": 'SAP-11', "area": 'Build', "name": 'Role & authorisation impact summary', "taskType": 'classify', "typicalInputTokens": 1100,
     "guidance": 'Ask what changes, who is affected, what to test — in that order.', "protection": STRIP},
    {"id": 'SAP-12', "area": 'Build', "name": 'Report / data extraction specification', "taskType": 'extract', "typicalInputTokens": 900,
     "guidance": 'Name the output format in the prompt; it caps the reply size.', "protection": STRIP_DATA},
    {"id": 'SAP-13', "area": 'Transform', "name": 'Fit-gap analysis summary', "taskType": 'summarise', "typicalInputTokens": 2200,
     "guidance": 'Requirements in, gaps out; keep the two lists visibly separate.', "protection": STRIP_VALUES},
    {"id": 'SAP-14', "area": 'Transform', "name": 'Process design narrative', "taskType": 'draft', "typicalInputTokens": 1600,
     "guidance": 'Give the model the process steps; it writes the story around them.', "protection": STRIP_DATA},
    {"id": 'SAP-15', "area": 'Transform', "name": 'Data migration mapping & cleansing summary', "taskType": 'extract', "typicalInputTokens": 2400,
     "guidance": 'Rules and exceptions as tables; sample rows anonymised.', "protection": STRIP_DATA},
    {"id": 'SAP-16', "area": 'Transform', "name": 'UAT evidence summary', "taskType": 'summarise', "typicalInputTokens": 1800,
     "guidance": 'Tested / passed / open, three counts before any narrative.', "protection": STRIP},
    {"id": 'SAP-17', "area": 'Transform', "name": 'Cutover readiness summary', "taskType": 'summarise', "typicalInputTokens": 2000,
     "guidance": 'Readiness by workstream, blockers named; no averages hiding a red.', "protection": STRIP},
    {"id": 'SAP-18', "area": 'Transform', "name": 'Stakeholder change communication', "taskType": 'draft', "typicalInputTokens": 400,
     "guidance": 'Small input, controlled output: give audience, date and the one action.', "protection": STRIP_VALUES},
    {"id": 'SAP-19', "area": 'Transform', "name": 'Steering pack narrative', "taskType": 'summarise', "typicalInputTokens": 2600,
     "guidance": 'Executives read the first three lines; spend your tokens there.', "protection": STRIP_VALUES},
    {"id": 'SAP-20', "area": 'Transform', "name": 'Hypercare daily report', "taskType": 'summarise', "typicalInputTokens": 1500,
     "guidance": 'Same shape every day; a fixed template is the cheapest prompt.', "protection": STRIP},
    {"id": 'SAP-21', "area": 'Transform', "name": 'Training FAQ draft', "taskType": 'draft', "typicalInputTokens": 700,
     "guidance": 'Draft from the questions users actually asked, not the manual.', "protection": STRIP},
]


def estimate_sap_task(task_id, model_id="gpt-6", runs_per_day=10):
    task = next((t for t in SAP_TASKS if t["id"] == task_id), None)
    if task is None:
        raise ValueError("Unknown SAP task: " + task_id)
    estimate = estimate_task(
        task["typicalInputTokens"], task["taskType"], model_id, runs_per_day
    )
    return {"task": task, "estimate": estimate}
