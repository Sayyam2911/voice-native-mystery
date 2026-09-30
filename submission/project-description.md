# Casework submission copy

## Project title

Casework: A Voice Investigation

## Short description

Investigate fictional crimes through live character conversations. Work with an AI detective, connect discovered evidence on a pinboard, and solve authored cases whose truth stays fixed while dialogue adapts to your questions.

## Long description

Casework is a browser detective game built around spoken investigation. Players enter a contemporary fictional case, examine scene observations, and question witnesses in distinct named voices. A dark pinboard shows discovered evidence and character portraits. Detective Rowan provides an independent partner line for directions and available investigative leads, while the player remains responsible for the deduction.

The application includes three authored investigations: Grange House, Blackwater Cabin, and The Willowmere Affair. Their case packs define a fixed solution, character knowledge, staged disclosure, and evidence requirements. Players resolve a case by naming the responsible person and selecting supporting evidence, or by earning an eligible verified confession.

AssemblyAI's Voice Agent API handles live speech, named voices, and semantic interruptions. The Casework backend supplies its approved replies through a custom LLM endpoint. Groq returns a structured proposal from permitted context. Backend gates independently check revelation prerequisites, and authored critical speech preserves the case's truth. A spoken discovery enters the board only after validated playback acknowledgement.

React and React Flow power the interface. A modular Node/Express backend persists independent anonymous sessions, turns, and discovery provenance in MongoDB Atlas. Versioned packs allow new cases without case-specific runtime branches. The application does not archive raw audio. Fifty-five deterministic tests cover rules, isolation, security and voice/UI behavior, with separate live Atlas and model checks.

The product explores voice-led interactive fiction and a reusable case-authoring format. A larger catalog or educational reasoning scenarios are future opportunities, not demonstrated commercial outcomes. Current delivery focuses on three cases and temporary browser-bound recovery. Final hosted-voice validation and human pacing playtests remain release checks.

## Suggested technology and category tags

AssemblyAI, Voice AI, Groq, Generative AI, Gaming, Interactive Fiction, React, Node.js, MongoDB Atlas. Use the event's actual available tags and tracks rather than inventing a platform category.

## Links and media

- Repository: https://github.com/Sayyam2911/voice-native-mystery
- Demo platform: Vercel is the configured deployment target. Confirm the actual deployed platform before submitting.
- Application URL: supply the final hosted HTTPS URL after verification.
- Slide presentation: `Casework-Submission.pptx`.
- Cover image: the fresh board screenshot or the deck cover preview.
- Video: record and upload separately. The general [lablab.ai submission guide](https://lablab.ai/ai-articles/hackathon-guidelines) currently calls for a video within five minutes and under 300 MB; check the event-specific form if it differs.

## Submission checklist

- [ ] Confirm event enrollment and team details.
- [ ] Paste the title, short description, long description, and supported tags.
- [ ] Upload a cover and slide presentation.
- [ ] Add the public GitHub repository.
- [ ] Supply a verified application URL and platform.
- [ ] Supply the video presentation link.
- [ ] Confirm event-specific rules and final submission receipt.

These materials do not submit the project or certify event-rule compliance.
