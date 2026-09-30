# Voice Native Mystery Architecture

This directory records the decisions and open questions for a reusable, voice-first murder mystery application. The source handoff is `Voice_Native_Murder_Mystery_Project_Handoff.docx` on the Desktop. The handoff's single showcase case is an example, not the product's content limit.

## Current scope

- Solo play, one active case per visitor; several visitors can play independently through the public link.
- Public-link web app, designed primarily for desktop/laptop browsers; no native app in the first release.
- A reusable case catalog, targeting 3–4 distinct stories for the project initially; no fixed long-term catalog size.
- Each playable case has facts decided before play, with a stable solution and validated character knowledge, evidence, and proof path.
- Normal case target: roughly 15–30 minutes of play. Voice interrogation, interruption, contradiction discovery, detective assistance, and accusation are core interactions.
- September 30, 2026 is the hackathon submission date; the implementation is by one developer with AI assistance.

## Documents

- [Requirements and questions](requirements.md)
- [Decisions and trade-offs](decisions.md)
- [High-level design (working draft)](hld.md)
- [Components and responsibilities (working draft)](components.md)
- [Case source research](case-sourcing.md)
- [First case bible: Grange House (draft)](cases/grange-house.md)
- [Important flows](flows.md)
- [Data model (working draft)](data-model.md)
- [Dialogue response contract (draft)](dialogue-contract.md)
- [Reusable case-pack contract](case-pack-contract.md)
- [Submission implementation plan](implementation-plan.md)
- [Implementation checkpoint and remaining gates](implementation-status.md)
- [Named-voice protocol prototype](../prototype/voice-agent/README.md) (experiment, not final architecture)

We will add data-model and implementation documents as those parts are discussed and decided.
