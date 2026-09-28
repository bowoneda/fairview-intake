---
name: compliance-verification-skill
description: Researches real world regulatory, statutory, or domain specific methodology, produces a calculation or logic specification with fully worked numeric examples covering standard and edge cases, and independently re-derives expected outputs to check built code against, rather than trusting tests written by whoever wrote the logic. Use on any project where a calculation or determination has legal, financial, or regulatory weight, not only where the word compliance appears explicitly.
---

# COMPLIANCE VERIFICATION SKILL

This skill exists because domain specific logic, tax rules, benefit eligibility, licensing thresholds, payroll withholding, insurance rating, and similar, is exactly the kind of logic a general purpose engineering skill tends to get subtly wrong: not through incompetence, but because getting it right requires knowing the actual current rule, not a plausible sounding approximation of it, and because an engineer testing their own implementation of a rule they misunderstood will write tests that confirm the misunderstanding rather than catch it.

## CORE PRINCIPLE

The specification comes from the real world rule, researched directly, not from a secondhand description, a prior job posting, an assumption carried over from a similar past project, or the specification writer's own memory of how a rule like this usually works. Rules of this kind change over time (a threshold gets updated, a formula gets revised, a rate gets adjusted), so the research step explicitly checks for the current version of the rule, not merely a version that used to be correct.

## WHEN TO INVOKE

Any project where a calculation, determination, or eligibility decision carries real world regulatory, legal, tax, or financial weight, even if the project itself is a portfolio piece, a prototype, or built under a fictional wrapper. The fictional wrapper, if one exists, applies to names and jurisdictions, never to the underlying arithmetic or rule logic, which stays accurate to the real world source it is modeled on.

## PROTOCOL

Step one, research the authoritative source. Identify the actual regulation, statute, published methodology, or industry standard the logic is based on. Prefer primary sources (the actual regulatory text, the actual current published guidance) over summaries, and when a summary is used, cross check it against at least one other independent source, since a single blog post or outdated tutorial can carry a rule that was correct once and is no longer. Explicitly check whether the rule has changed recently; a rule that changed within the last few years is exactly the kind of thing an outdated assumption or an outdated job posting is likely to get wrong.

Step two, produce the specification. Write out the methodology in full: every input it depends on, every intermediate calculation step, every threshold or rate involved, and where the specification writer had to make a judgment call because the authoritative source leaves something to implementer or administrator discretion, state that explicitly as a documented project convention rather than presenting it as if it were itself part of the authoritative rule.

Step three, produce worked numeric examples. At minimum: one standard case exercising the ordinary path through the logic, one case at or near a threshold or boundary the logic depends on, confirming which side of the boundary is correct and whether the comparison is inclusive or exclusive, one case exercising whichever branch of the logic is least likely to be tested by accident, for example a case with an unusual or minimal set of inputs, and one case, if the source data can come from more than one path (multiple integrations, connected data versus manually entered data), confirming the logic behaves identically regardless of which path the data arrived through. Every worked example states its inputs, every intermediate value, and its final expected output explicitly, since this is what later verification is checked against.

Step four, hand off the specification as the shared source of truth. The specification, not the eventual code, is what the engineering work is built against, and what any later verification is checked against. If the built code and the specification ever disagree, the specification is authoritative unless research shows the specification itself was wrong, in which case the specification is corrected and the disagreement is re-checked, not silently resolved in favor of whichever value the code happened to produce.

Step five, independently verify the built implementation. This step does not happen at the same time as, or by the same process as, writing the implementation. After the logic is built, take the specification's worked examples and independently re-derive the expected output for each one, without looking at how the implementation calculated it, then compare that independently derived value against the implementation's actual output. A test suite the implementer wrote passing is not a substitute for this step; it may mean only that the implementer's tests share the implementer's own misunderstanding.

Step six, if the underlying real world rule changes after this project is built, the specification is the thing that gets updated first, with the same research rigor as the original, and the verification step is re-run against the updated specification. A stale specification silently drifting out of correctness while the code continues to pass its own tests is exactly the failure this skill exists to prevent.

## WHAT THIS SKILL DOES NOT DO

It does not write the application code that consumes the specification. It does not decide the surrounding product or architecture. It is narrowly scoped to getting the domain logic right and to independently confirming the built logic actually matches what was specified.

## OUTPUT FORMAT

Two documents. A calculation or logic specification, stating the methodology, its sources, its worked examples with full inputs and expected outputs, and any documented project conventions used to fill a gap the authoritative source left open. And, once implementation exists, a verification report stating each worked example, the independently re-derived expected value, the implementation's actual output, and a pass or fail verdict per case, with any failure treated as blocking, not as a minor discrepancy to note and move past.
