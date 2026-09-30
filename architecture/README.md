# Architecture guide

Casework is a multi-case, voice-native investigation game. This guide describes the implemented design for reviewers and contributors, not a transcript of development discussions.

## Reading map

| Document | What it explains |
| --- | --- |
| [Runtime and trust boundaries](runtime.md) | Components, responsibilities, AI authority, and external integrations |
| [Voice and discovery flow](voice-flow.md) | One spoken turn, interruption handling, and the evidence-commit boundary |
| [Data and state](data-model.md) | MongoDB collections, case versioning, state ownership, and transactions |
| [Operations and verification](operations.md) | API surface, setup, deployment target, demo limits, and verification status |
| [Design choices](decisions.md) | The main trade-offs behind the implementation |

## System overview

```mermaid
flowchart TB
    subgraph Browser[Player browser]
        UI[React game<br/>Pinboard and voice interview]
        Audio[Web Audio client<br/>PCM capture and playback]
        UI <--> Audio
    end
    subgraph App[Casework modular Node backend]
        API[HTTP API<br/>Session authorization]
        Rules[Game service<br/>Evidence and resolution rules]
        Dialogue[Dialogue adapter<br/>JSON validation and approval]
        Callback[Voice callback<br/>Signed lease validation]
        Repository[Repository<br/>Transactional document access]
        API --> Rules
        Callback --> Rules
        Rules --> Dialogue
        Rules --> Repository
    end
    Speech[AssemblyAI Voice Agent<br/>STT, turn detection, named TTS]
    LLM[Groq<br/>Structured dialogue]
    Atlas[(MongoDB Atlas)]
    Packs[Versioned case JSON] -->|Validated idempotent import| Atlas
    UI <-->|Same-origin HTTPS actions and acknowledgements| API
    Audio <-->|Temporary-token WebSocket<br/>24 kHz PCM16 audio| Speech
    Speech <-->|Bearer-authenticated streaming callback| Callback
    Dialogue <-->|Permitted context and JSON proposal| LLM
    Repository <--> Atlas
    classDef player fill:#e7eee5,stroke:#45614a,color:#17271c;
    classDef core fill:#f5ead2,stroke:#9c7841,color:#352810;
    classDef external fill:#e8edf6,stroke:#48638a,color:#152438;
    class UI,Audio player;
    class API,Rules,Dialogue,Callback,Repository core;
    class Speech,LLM,Atlas external;
```

## Five invariants

1. **Case truth stays fixed.** AI does not choose the culprit or rewrite published case facts.
2. **The backend owns progress.** The UI and model cannot grant themselves a clue or a win.
3. **Visitors are independent.** Every turn, discovery, and voice lease belongs to a session.
4. **Delivery matters.** An approved spoken reveal does not become evidence until playback acknowledgement passes validation.
5. **Content drives the engine.** Character IDs, prerequisites, partner identity, and proof groups come from case packs rather than case-specific code.

The application uses a single modular backend, not a microservice fleet. Its modules can be tested separately while sharing one transactional persistence boundary.

![Current investigation board](media/investigation-board.jpg)

The 15–30-minute case duration is a design target. The current public deployment and live-voice validation scope appear in [operations](operations.md), so diagrammed capabilities should not be mistaken for a completed production certification.
