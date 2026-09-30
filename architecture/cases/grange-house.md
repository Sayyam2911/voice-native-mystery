# Grange House: first case bible

**Status:** Implemented as immutable `grange-house:1`. Contains the full solution. The original discussion draft below is retained as rationale; [the published pack](../../cases/grange-house.json) is authoritative. The implemented confession holdback is the two half-hitches with the cord tail beneath the chair, not the earlier candidate silverware location. See [multi-case validation](catalog-validation.md) for current checks. The pack was not changed while adding the new investigations.

**Source:** Contemporary, standalone adaptation of Arthur Conan Doyle's [“The Adventure of the Abbey Grange”](https://www.gutenberg.org/cache/epub/108/pg108-images.html) from [*The Return of Sherlock Holmes*](https://www.gutenberg.org/ebooks/108). Credit the source in the case details and end credits. Sherlock Holmes and Watson are not characters in the game.

## Design intent

The player investigates an apparent three-person burglary at a private estate. A widow and her longtime aide tell a mutually supporting account. Physical details show that the scene was staged. The actual fatal blow was struck by a visiting maritime officer during a violent confrontation with the victim. The game's challenge is to identify the person who caused the death and reconstruct the cover-up. The question of criminal liability is distinct from that factual finding.

The source's central solution and staged-burglary deception are fixed. The names, 2026 UK setting, added security witness, timings, and modern evidence below are proposed adaptation details. No runtime model may rewrite the approved version once this draft is finalized.

## Player-facing opening

Elliot Vale, owner of the Grange House estate, was found dead in the dining room. The preliminary scene report identifies a bloodied fireplace tool as the likely weapon. His wife Mara says three intruders entered from the terrace, tied her to a chair, killed Elliot, and escaped with silverware. Her aide Tessa supports the account. Local police have asked for a fresh review because the scene and the witnesses do not quite agree. The player can question Mara, Tessa, and estate security lead Owen; a fourth person of interest becomes available through the investigation.

## Canonical truth (spoilers)

Mara and Elliot's marriage was abusive. Jack Hale, a maritime officer who knew Mara years earlier, came to speak with her privately. Elliot entered, struck Mara with a cane, then fought Jack. Jack struck Elliot once with a fireplace tool, fatally. Tessa arrived immediately afterward. The three feared that Jack would be blamed for deliberate murder and that Mara's situation would become public. They staged a burglary: Mara was tied after the death, a third wine glass was prepared to imply three intruders, and silverware was taken only to be hidden in the estate pond. Mara and Tessa copied the description of a recently reported local burglary group. Jack left before the emergency call.

The approved resolution objective is to establish **who struck the fatal blow** and **how the burglary scene was staged**. Its reveal should describe the confrontation without asserting a legal verdict on self-defense.

## Proposed true timeline

| Time | Actual event | Initial player access |
| --- | --- | --- |
| 22:10 | Owen leaves the security console for an unauthorized personal break; recording continues automatically. | Owen denies the lapse. |
| 22:32 | Jack arrives through the service gate and parks out of view of the dining room. The camera captures an incomplete vehicle image. | Gate log can be requested. |
| 22:38 | Mara lets Jack through the unmonitored terrace entrance for a private conversation. | Both initially conceal the meeting. |
| 22:43 | Elliot enters, hits Mara with his cane, and fights Jack. Jack's blow with the fireplace tool kills Elliot. Jack receives a fresh forearm injury. | Injury and scene details can be discovered separately. |
| 22:45 | Tessa hears the disturbance, arrives after the fatal blow, and sees Jack holding the bloodied fireplace tool beside Elliot. | She initially says she arrived only after Mara called for help. |
| 22:48–23:06 | The three stage the room, tie Mara to a chair, set out a third wine glass, and take silverware. | Crime-scene photos and a preliminary report are available. |
| 23:08–23:12 | Jack hides the silverware in the estate pond, leaves by the service route, and drives away. | Pond search and camera record are gated investigations. |
| 23:18 | Mara raises the alarm and reports three burglars. | Incident report is available at briefing. |

The player begins a later review of the incident, when the preliminary scene report exists. This allows the partner to retrieve or cross-check records within a 15–30 minute playthrough without pretending that a laboratory can produce new results in seconds.

## Interrogable people and knowledge boundaries

| Person | What they know | Initial position and reason for withholding |
| --- | --- | --- |
| Mara Vale, widow | Saw the confrontation and Jack's blow; helped stage the scene; knows her prior relationship with Jack. | Repeats the three-intruder account. Protects Jack and wants her abuse kept private. |
| Tessa Wright, aide | Arrived just after the fatal blow; saw Jack holding the fireplace tool beside Elliot, noticed Mara's injuries, and helped stage the scene. Did **not** witness the blow itself. | Corroborates Mara initially. If the staged-scene account is credibly challenged, she prioritizes protecting Mara and can correct her timeline. |
| Owen Pike, security lead | Knows the camera layout and that one vehicle used the service gate. Did **not** see the fight or identify the driver. | Hides his missed-console interval to protect his job. His lapse is a red herring. |
| Jack Hale, maritime officer | Struck Elliot; saw the attack on Mara; staged the scene and hid the silverware. | Becomes interrogable once a lead connects him to the estate. Initially admits old acquaintance but denies being present that night. |

The AI detective partner receives the player's discovered facts and results of bounded investigations. It has no direct access to this canonical-truth section or the source story's ending during play.

## Evidence and discovery paths (proposed)

| ID | Item and source | What it can establish | Discovery path |
| --- | --- | --- | --- |
| E1 | Three-glass scene photo and existing residue note | The third glass appears staged; it does not support Mara's claim that three burglars drank. | Inspect dining-room evidence; ask partner to interpret the residue note. |
| E2 | Chair blood pattern and cut curtain cord | Mara was tied after the fatal injury; the cord was cut and frayed deliberately. | Inspect scene photos and preliminary forensic note. |
| E3 | Two missing silver pieces recovered from the estate pond | The theft was staged or abandoned on the property. | Ask partner to search the grounds or follow the discarded-property lead. |
| E4 | Service-gate recording and vehicle/arrival records | A single visitor arrived and left around the incident; together, records connect that visit to Jack. | Ask Owen about the gate, then ask partner to reconcile logs. |
| E5 | Publicly available account of a recent burglary group and its verified whereabouts that night | Mara's detailed group description was copied from news and does not identify the real visitors. | Ask partner to check the reported group. |
| E6 | Jack's fresh forearm injury and his changing account of the night | He was in a recent struggle consistent with Elliot's cane and concealed his visit. Suggestive, not conclusive alone. | Question Jack after he is unlocked; compare his account with E4. |
| E7 | Mara and Jack's prior connection | Explains why he came and why the witnesses protect him. It is motive/context, not proof of the fatal blow. | Follow a disclosed clue from Tessa or a bounded records search. |
| E8 | Tessa's corrected account | She entered immediately after the impact and saw Jack holding the fireplace tool beside Elliot. She did not see the strike; her account is testimony to the immediate aftermath, not an eyewitness account of the blow. | Present E2 or E3 to Tessa, then press her on when she entered and what she saw. Her correction is recorded as a sourced interview claim. |

Every board card must cite the interview turn or case-file item that revealed it. A clue that is only suggested by a model response does not become confirmed evidence.

## Planned conflicts

1. Mara says she was bound before Elliot was attacked; E2 indicates she was placed in the chair afterward.
2. Mara says the intruders were three strangers; E1 and E5 make that account untenable.
3. Tessa says she arrived only after Mara's alarm; once a verified staging clue undermines that account, she can admit she entered immediately after the impact and helped stage the room. Her corrected account (E8) conflicts with her initial timeline and Mara's account of the intruders' departure.
4. Jack denies visiting that night; E4 conflicts with his timeline. After E4 is shown, his partial admission conflicts with Mara's denial that she knew the visitor.

The partner may suggest candidate contradictions, but the case engine should confirm these against structured claims and evidence IDs.

## Resolution paths (proposed)

- **Evidence-backed accusation:** The player identifies Jack and presents a persuasive reconstruction from independent clues, not courtroom-level proof or a single decisive forensic result. A proposed minimum chain is **E2 or E3** (the burglary scene was staged), **E4** (Jack was present before the alarm), and **E8** (Tessa found him holding the likely weapon immediately after the impact). E6 can corroborate the confrontation; E7 supplies motive/context but does not substitute for any link. Playtesting must confirm that E8's initially unreliable witness is adequately corroborated by the independent records and physical clues.
- **Earned confession:** Jack may admit the fatal blow only after the player confronts him with a verified staging or presence clue and a reason to discuss Mara's safety. His admission must include an authored, previously undisclosed detail that can be checked. A candidate holdback is the precise hiding place of the silverware, followed by recovery. If E3 was already discovered, the case needs a different holdback before this route can be enabled.
- **Insufficient accusation:** Naming Jack without enough proof yields bounded feedback and keeps the case open. An accusation of Mara, Tessa, or Owen does not reveal Jack by elimination.

## Partner role and pacing

The partner can pursue a lead requested by the player and independently check one narrow record, such as the claimed burglar group's whereabouts or the service-gate log. It reports a finding without naming Jack. If the player repeats questions or fails to gain a new clue, hints progress from “test the burglary account” to “compare the chair and glass evidence” to “find who could have used the terrace.” A player should be able to reach a resolution through more than one interview order.

An initial pacing hypothesis is 2–3 minutes for briefing, 9–14 for interviews, 4–6 for evidence/partner investigations, and 3–5 for confrontation and resolution. This is a playtest target, not a guarantee.

## Issues to settle before freezing the case

1. **Locale and cast:** Present-day UK estate and new names are a low-change draft choice. Confirm whether the final setting should remain there.
2. **Proof chain:** E1 and E2 need credible, plainly explained descriptions. Playtest the E2/E3 + E4 + E8 chain for a satisfying reconstruction without implausibly fast lab work or an accidental early solution reveal.
3. **Confession holdback:** Specify at least one valid nonpublic fact for every reachable confession sequence.
4. **Fairness:** Test whether Jack becomes discoverable early enough, whether Owen is a meaningful red herring, and whether all required clues can be found through natural question paraphrases.
