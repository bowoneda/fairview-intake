---
name: master-vetting-skill
description: Adversarial verification skill. Never accepts a self report of completion as evidence. Independently reproduces the evidence behind any claim that a phase, task, or milestone is done, before that claim is allowed to stand. Use at every phase boundary on any project with a phased build process, especially where the cost of an undetected error is high (security, compliance, financial calculations, data integrity).
---

# MASTER VETTING SKILL

This skill exists because the single most common failure mode in an agentic or multi-contributor build is a completion claim that was never actually checked, only asserted. A test suite passing is not evidence the tests are the right tests. A checklist marked complete is not evidence the underlying work was verified. This skill is the standing corrective: at every point where something is declared done, it is independently confirmed by direct inspection, not by reading a report about it.

## CORE PRINCIPLE

No self report is trusted. This applies uniformly, including to reports produced by whichever engineer, skill, or process actually did the work being verified. A builder confirming its own build is not independent verification, regardless of how thorough the builder's own testing was. Independent verification means someone or something other than the builder actually runs the check, actually opens the artifact, actually queries the actual system, and actually compares the actual result against an independently derived expectation.

## WHEN TO INVOKE

At every phase boundary in a phased project, before any phase completion document is written or any commit marking a phase closed is made. On any occasion where a piece of work is described as "done," "passing," "verified," or "complete" and that description has not yet been independently checked by this skill. Most valuable on work where an undetected error has real consequences: security boundaries, regulatory or financial calculations, data integrity guarantees, anything touching personally identifiable information.

## PROTOCOL

Step one, gather the claims. Identify exactly what is being asserted as done. Pull the specific checklist items, acceptance criteria, or test case list that defines what "done" means for this phase or task. Vague claims ("the engine works," "security is handled") are not acceptable inputs to this process; if the claim is vague, the first action is to make the builder state it as a specific, checkable list before verification proceeds.

Step two, choose the verification method per claim, matched to what kind of claim it is.

For a data access or isolation claim (for example, tenant isolation, row level security, a permission boundary): do not read the policy code and reason about whether it should work. Actually attempt the access pattern that should be blocked, as the actual constrained actor would attempt it, and observe the actual result.

For a calculation, business logic, or compliance claim: do not trust a test suite written by the same process that wrote the logic being tested. Independently re-derive the expected output from the underlying specification (see the companion Compliance Verification Skill for how that specification itself should be produced and validated) and compare that independently derived value against the system's actual output.

For a generated artifact claim (a document, a report, an exported file): do not trust that the generation code ran without error. Open the actual generated artifact and inspect its actual contents against the actual source data it should reflect.

For a deployment or environment claim: do not assume behavior verified in one environment carries over to another. Re-run the relevant checks against the actual environment being claimed as working, not a different one that happens to share the same code.

Step three, log the actual evidence, not the verdict alone. A record that says "RLS verified" is insufficient. A record that says "attempted a select as tenant A against tenant B's data, received zero rows, attempted at 14:32 against the fairview-staging database" is sufficient. The evidence itself, not a summary judgment about the evidence, is what gets written down.

Step four, on any discrepancy: the claim does not stand, regardless of how much other work has already been built on top of the assumption that it did. The discrepancy is logged immediately, work does not proceed past that point on the assumption the issue is minor, and the underlying issue is fixed and re-verified before the phase or task is considered closed.

Step five, only after every claim for the phase has been independently verified with logged evidence: the phase or task is marked complete, with the evidence attached, not summarized away.

## WHAT THIS SKILL DOES NOT DO

It does not write the underlying code, specification, or design. It does not decide what the acceptance criteria should be; that is set by the project's own planning documents. It exists solely to check, independently, whether what was claimed to be true is actually true, and to refuse to let an unverified claim pass as if it had been checked.

## OUTPUT FORMAT

A verification report per phase or task, listing: each claim checked, the specific method used to check it, the actual evidence obtained, and a final verdict per claim, pass or fail, never omitted or softened into a general impression. A single failed item means the phase is not complete, stated plainly, not buried in a list of otherwise passing items.
