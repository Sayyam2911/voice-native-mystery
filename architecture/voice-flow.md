# Voice and discovery flow

## One spoken turn

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant Browser
    participant Voice as AssemblyAI Voice Agent
    participant API as Casework backend
    participant DB as MongoDB Atlas
    participant LLM as Groq dialogue model
    Player->>Browser: Select character and start call
    Browser->>API: POST /voice/start with session cookie
    API->>API: Probe public callback and validate selected character
    API->>DB: Reserve expiring voice slot
    API->>Voice: Create named-voice agent with signed callback
    API->>DB: Save active character lease
    API->>Voice: Mint temporary connection token
    API-->>Browser: Agent ID, short-lived token and lease
    Browser->>Voice: Open WebSocket and stream microphone PCM
    Player->>Browser: Ask a question
    Voice->>API: Authenticated custom-LLM request with transcript
    API->>DB: Save pending turn and bounded turn lock
    API->>LLM: Permitted context and nested JSON contract
    LLM-->>API: Dialogue or critical-action proposal
    API->>API: Validate schema, IDs and case prerequisites
    API->>DB: Save approved reply and private candidate
    API-->>Voice: Stream approved plain text as SSE
    Voice-->>Browser: PCM speech and transcript events
    Browser-->>Player: Play reply
    alt Whole approved critical reply finishes locally
        Browser->>API: POST /ack with heard text
        API->>API: Validate approved sentence prefix and idempotency
        API->>DB: Commit discovery, event and state in one transaction
        API-->>Browser: Updated player-visible board
    else Provider confirms a player interruption
        Voice-->>Browser: Interrupted reply status or transcript
        Browser->>Browser: Flush queued audio
        Browser->>API: Acknowledge conservative heard prefix
        API->>DB: Record partial delivery, without incomplete reveal
    end
```

The transcript write happens **before** the model call. The approved reply write happens **before** speech. The discovery write happens **after** validated delivery. Network/model calls run outside database transactions.

## Turn lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Transcript persisted
    Pending --> Approved: Validated response persisted
    Pending --> Failed: Generation fails
    Approved --> Heard: Complete approved reply acknowledged
    Approved --> Interrupted: Partial or empty playback acknowledged
    Heard --> [*]: Eligible discovery committed once
    Interrupted --> [*]: Incomplete critical reveal stays locked
    Failed --> [*]: No discovery
```

The current implementation deliberately requires the **whole short critical reply** before committing its revelation. Sentence-prefix accounting preserves partial transcript text, but finer-grained clue-bearing sentence commitment is future work.

## Interruption and failure behavior

`input.speech.started` alone does not discard an active reply: an acknowledgement such as “uh-huh” may be a back-channel. The client flushes on a confirmed interrupted `reply.done` or `transcript.agent`, handles either order, and ignores late audio for that reply. This follows [AssemblyAI's semantic interruption contract](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/turn-detection-and-interruptions).

| Condition | Client behavior |
| --- | --- |
| Socket session never becomes ready | Visible error after 20 seconds |
| Speech ends, but no reply starts | Pending-response state and a 30-second bound |
| Reply starts without playable audio | Visible error after 30 seconds |
| Microphone capture stops | Visible error after more than six seconds without capture frames |
| Track ends, context pauses, or socket closes unexpectedly | Actionable error and call cleanup |
| Text arrives without audio | No spoken-delivery acknowledgement |
| Call ends during queued playback | No acknowledgement of the unfinished reply |

The microphone meter measures local capture amplitude, not provider recognition. It updates at most five times per second and retains no recording. The evidence graph is memoized, so audio/caption updates do not rebuild board nodes. A new discovery revision still updates the board.

Named voices are fixed for each provider session. Switching contacts ends the current call and creates a new session for the chosen character. No microphone starts merely because a portrait is selected.
