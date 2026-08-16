/**
 * PROJECTS CONFIG — realistic backend placeholders.
 * Replace slug, title, year, description, tech, links as real projects land.
 * The carousel renders these as horizontally-scrolling cards; the detail
 * page at /projects/[slug] renders the full `challenge` + `highlights`.
 */

export type Project = {
  slug: string;
  title: string;
  year: string;
  category: string;
  description: string; // short — for the carousel card
  challenge: string; // 1 paragraph — for the detail page
  highlights: string[]; // bullet points — what I built / shipped
  tech: { label: string; icon: string; brand: string }[]; // icon = simple-icons slug or "abbr:XX"
  links: { label: string; href: string; kind: "repo" | "live" | "doc" }[];
  accent: string; // hex — card hover accent
  status?: "shipped" | "in-production" | "experimental" | "wip";
  /**
   * Optional code snippets for the detail page — each rendered with the
   * shared syntax highlighter. Use to show a real piece of the project
   * (a protocol decoder, a state machine, a config) that makes the
   * write-up concrete.
   */
  snippets?: { language: string; label: string; code: string }[];
};

export const projects: Project[] = [
  {
    slug: "dirassati",
    title: "Dirassati",
    year: "2024",
    category: "monitoring platform",
    description:
      "Real-time infrastructure monitoring and alerting platform. Collects metrics, traces, and logs into a unified observability layer with intelligent alert routing and on-call scheduling.",
    challenge:
      "Teams were drowning in alert noise — 200+ alerts/day with 95% noise. The signal was lost in the flood, and on-call burnout was real.",
    highlights: [
      "Reduced alert noise by 94% through correlation + suppression rules",
      "Sub-500ms metric ingestion pipeline with back-pressure handling",
      "Smart on-call scheduling with timezone-aware rotation",
      "Custom DSL for alert routing and escalation policies",
    ],
    tech: [
      { label: "Go", icon: "go", brand: "#00ADD8" },
      { label: "Prometheus", icon: "prometheus", brand: "#E6522C" },
      { label: "Grafana", icon: "grafana", brand: "#F46800" },
      { label: "ClickHouse", icon: "clickhouse", brand: "#FFCC00" },
      { label: "K8s", icon: "kubernetes", brand: "#326CE5" },
    ],
    links: [
      { label: "source", href: "#", kind: "repo" },
      { label: "demo", href: "#", kind: "live" },
    ],
    accent: "#E6522C",
    status: "in-production",
  },
  {
    slug: "reactivities",
    title: "Reactivities",
    year: "2023",
    category: "real-time social",
    description:
      "Full-stack social app with real-time activity feeds, presence, and live comments. SignalR hub fan-out, EF Core with optimistic concurrency, React client.",
    challenge:
      "Real-time at social scale hides two boring problems: presence flicker when connections drop every 30s on mobile, and lost updates when two users edit the same activity. The interesting part was making both invisible to the user without resorting to 'last write wins.'",
    highlights: [
      "SignalR hub with backplane-ready groups; presence tracked per-connection, reconciled to per-user on reconnect.",
      "EF Core optimistic concurrency via rowversion — conflicts surface as 409s, client merges or re-fetches.",
      "Activity feed fan-out via a read-optimized projection; writes hit the write model, reads never touch it.",
      "React client with optimistic UI — edits render locally, roll back on 409 with a toast.",
    ],
    tech: [
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: "React", icon: "react", brand: "#61DAFB" },
      { label: "SignalR", icon: "abbr:SR", brand: "#0078D4" },
      { label: "EF Core", icon: "abbr:EF", brand: "#68217A" },
    ],
    links: [{ label: "repo", href: "#", kind: "repo" }],
    accent: "#61DAFB",
    status: "shipped",
  },
  {
    slug: "library-api",
    title: "Library API",
    year: "2023",
    category: "rest platform",
    description:
      "Book management REST API — advanced search, categorization, user roles, loan state machine. Designed for schema growth; versioned routes, idempotency keys on mutations.",
    challenge:
      "A library API sounds like a tutorial — until you model loans. A book can be on-shelf, held, loaned, overdue, or lost, and the legal transitions between those states are easy to get wrong. The schema had to survive new loan rules added a year later without a rewrite.",
    highlights: [
      "Loan modeled as an explicit state machine; illegal transitions return 409 with the current state, never silently corrupt.",
      "Versioned routes (/v1, /v2) with a thin compatibility layer — old clients keep working while new fields ship.",
      "Idempotency keys on POST/PUT mutations; retries don't double-issue loans.",
      "Search via PostgreSQL full-text + GIN indexes; category facets computed in one round-trip.",
    ],
    tech: [
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: "PostgreSQL", icon: "postgresql", brand: "#4169E1" },
      { label: "JWT", icon: "jsonwebtokens", brand: "#D63AFF" },
      { label: "Docker", icon: "docker", brand: "#2496ED" },
    ],
    links: [{ label: "repo", href: "#", kind: "repo" }],
    accent: "#3DD68C",
    status: "shipped",
  },
  {
    slug: "wire-proxy",
    title: "wire-proxy",
    year: "2024",
    category: "protocol tooling",
    description:
      "A small TCP/TLS inspection proxy for debugging hand-rolled protocols. Prints frames as hex + decoded, replays captured sessions, runs as a single static binary.",
    challenge:
      "When a hand-rolled binary protocol misbehaves, Wireshark can't help — the payloads are opaque. wire-proxy sits in the middle, buffers frames, and prints them as hex + a best-effort decode so you can see what your server actually sent, not what you think it sent.",
    highlights: [
      "Single static Rust binary — ship it to a server with scp, no runtime install.",
      "Pluggable frame decoders; defaults to length-prefixed, custom decoders drop in.",
      "Session capture + replay — record a failing exchange, replay it against a fix offline.",
      "Hex + ASCII side-by-side output, with frame boundaries marked; no more counting bytes by hand.",
    ],
    tech: [
      { label: "Rust", icon: "rust", brand: "#DEA584" },
      { label: "Linux", icon: "linux", brand: "#FCC624" },
      { label: "QUIC", icon: "abbr:QC", brand: "#FFB000" },
    ],
    links: [{ label: "repo", href: "#", kind: "repo" }],
    accent: "#FFB000",
    status: "experimental",
    snippets: [
      {
        language: "rust",
        label: "frame decoder trait",
        code: `/// A frame decoder reads complete frames from a byte buffer.
/// Implementations default to length-prefixed, but custom decoders
/// drop in for any hand-rolled protocol.
pub trait FrameDecoder: Send {
    /// Attempt to decode one frame from \`buf\`.
    /// Returns \`Ok(Some(frame))\` on success, \`Ok(None)\` if the
    /// buffer doesn't yet hold a complete frame (wait for more bytes),
    /// or \`Err\` on a malformed input.
    fn decode(&mut self, buf: &mut BytesMut) -> Result<Option<Frame>;

    /// Human-readable decode of a frame's payload — best-effort,
    /// used for the hex+ASCII side panel.
    fn render(&self, frame: &Frame) -> String;
}

/// Length-prefixed decoder: [u32 BE len][payload].
/// The boring default that handles ~80% of real-world protocols.
pub struct LengthPrefixed;

impl FrameDecoder for LengthPrefixed {
    fn decode(&mut self, buf: &mut BytesMut) -> Result<Option<Frame>> {
        if buf.len() < 4 {
            return Ok(None); // need at least the length prefix
        }
        let len = u32::from_be_bytes(buf[..4].try_into().unwrap()) as usize;
        if buf.len() < 4 + len {
            return Ok(None); // wait for the full payload
        }
        let payload = buf.split_to(4 + len).freeze().split_off(4);
        Ok(Some(Frame::new(payload)))
    }

    fn render(&self, frame: &Frame) -> String {
        // hex + ASCII side-by-side, 16 bytes per line
        frame.payload
            .chunks(16)
            .map(|chunk| {
                let hex: String = chunk.iter()
                    .map(|b| format!("{:02x}", b))
                    .collect::<Vec<_>>()
                    .join(" ");
                let ascii: String = chunk.iter()
                    .map(|&b| if (32..127).contains(&b) { b as char } else '.' })
                    .collect();
                format!("{:48}  {}", hex, ascii)
            })
            .collect::<Vec<_>>()
            .join("\\n")
    }
}`,
      },
    ],
  },
  {
    slug: "ledger-sync",
    title: "ledger-sync",
    year: "2024",
    category: "data pipeline",
    description:
      "Outbox-based CDC pipeline syncing a ledger service to a read store. Exactly-once via idempotency keys, backpressure-aware batcher, dead-letter table for poison rows.",
    challenge:
      "A ledger can never lose a row and never apply one twice. Replicating writes to a read store sounds like 'just use Kafka' — until a poison row blocks the whole partition and the ledger stalls. The pipeline had to guarantee exactly-once without sacrificing the ability to skip-and-quarantine a bad row.",
    highlights: [
      "Transactional outbox pattern — writes + outbox row in one DB transaction, no dual-write inconsistency.",
      "Exactly-once delivery via idempotency keys on the consumer; redeliveries are a no-op.",
      "Backpressure-aware batcher — pulls N rows, waits for acks, never floods the read store.",
      "Dead-letter table for poison rows — a deserialization failure quarantines one row, not the partition.",
    ],
    tech: [
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: "Redis", icon: "redis", brand: "#DC382D" },
      { label: "PostgreSQL", icon: "postgresql", brand: "#4169E1" },
      { label: "GitHub Actions", icon: "githubactions", brand: "#2088FF" },
    ],
    links: [{ label: "repo", href: "#", kind: "repo" }],
    accent: "#FF4F00",
    status: "wip",
    snippets: [
      {
        language: "csharp",
        label: "exactly-once consumer",
        code: `// Exactly-once consumer: redeliveries are a no-op via idempotency key.
// A poison row goes to the dead-letter table, not the retry loop.
public async Task<ConsumeResult> ConsumeAsync(
    OutboxRow row, CancellationToken ct)
{
    // 1. idempotency check — if we've already applied this key, skip.
    var existing = await _readStore.FindAsync(row.IdempotencyKey, ct);
    if (existing is not null)
    {
        // redelivery — ack and move on, don't double-apply
        return ConsumeResult.AlreadyApplied;
    }

    LedgerEntry entry;
    try
    {
        entry = row.Deserialize(); // may throw on poison row
    }
    catch (PoisonRowException ex)
    {
        // quarantine — don't block the partition
        await _deadLetter.QuarantineAsync(row, ex, ct);
        return ConsumeResult.Quarantined;
    }

    // 2. apply to read store with the idempotency key as the unique constraint.
    //    a concurrent redelivery will hit the unique index and 409.
    try
    {
        await _readStore.ApplyAsync(entry, ct);
        return ConsumeResult.Applied;
    }
    catch (UniqueConstraintViolation)
    {
        // another consumer beat us to it — still exactly-once
        return ConsumeResult.AlreadyApplied;
    }
}`,
      },
    ],
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
