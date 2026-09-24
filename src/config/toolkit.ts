/**
 * TOOLKIT CONFIG — periodic-table-style stack grid.
 *
 * Each tool has:
 *  - name (lowercase, displayed under the logo)
 *  - icon: simple-icons slug (e.g. "dotnet") OR "abbr:XX" for tools without a logo
 *  - brand: hex color used for the cell's hover border + glow
 *  - years: optional, NOT displayed anywhere (kept for internal record only)
 *  - description: optional long-form note shown in a click popover
 *
 * Tools are grouped into categories; each group renders as a separate
 * 3-column mini-grid with a "// label" header. Filter pills above let
 * users spotlight one category at a time (gorix-style dim-on-hover).
 */

export type Tool = {
  name: string;
  icon: string;
  brand: string;
  /** Optional, NOT displayed anywhere on the cell. Kept for internal
   *  record only — the per-category incrementing ID is the only number
   *  shown to the user. */
  years?: number;
  /**
   * Optional long-form note shown in a popover when the cell is clicked.
   * Use it to describe where the tool was actually used / context that
   * doesn't fit in a tile. Omit on cells where there's nothing to add —
   * cells without a description stay plain (no hover tooltip).
   */
  description?: string;
};

export type ToolGroup = {
  id: string;
  label: string; // "// backend"
  tools: Tool[];
};

export const toolGroups: ToolGroup[] = [
  {
    id: "backend",
    label: "// backend",
    tools: [
      { name: "c# / .net", icon: "dotnet", brand: "#512BD4", years: 4, description: "Primary backend stack. Powers Dirassati (real-time monitoring platform) and the Library API (REST + loan state machine). ASP.NET Core for the web layer, EF Core for persistence with optimistic concurrency, xUnit for tests. Chosen for strong static typing, async-first I/O, and first-class container support." },
      { name: "asp.net core", icon: "dotnet", brand: "#512BD4", years: 4 },
      { name: "ef core", icon: "abbr:EF", brand: "#68217A", years: 3 },
      { name: "rest", icon: "abbr:RE", brand: "#9A9AA6", years: 4 },
      { name: "jwt", icon: "jsonwebtokens", brand: "#D63AFF", years: 3 },
      { name: "signalr", icon: "abbr:SR", brand: "#0078D4", years: 2 },
    ],
  },
  {
    id: "data",
    label: "// data",
    tools: [
      { name: "postgresql", icon: "postgresql", brand: "#4169E1", years: 3, description: "Primary relational store. Used for Dirassati's time-series-ish monitoring data and the Library API's loan/booking state. Reach for it when I need real constraints, CTEs, and EXPLAIN plans I can actually reason about." },
      { name: "redis", icon: "redis", brand: "#DC382D", years: 2, description: "Cache + pub/sub layer. Cuts repeat DB hits in Dirassati and backs the SignalR backplane when a single server isn't enough. Also where I park short-lived rate-limit counters." },
      { name: "sql", icon: "abbr:SQ", brand: "#9A9AA6", years: 4 },
    ],
  },
  {
    id: "frontend",
    label: "// frontend",
    tools: [
      { name: "react", icon: "react", brand: "#61DAFB", years: 3, description: "What I reach for when a backend needs a real admin UI. This very site is Astro. I keep client state lean (server-rendered islands + fetch) and only reach for state libs when the problem actually demands it." },
      { name: "typescript", icon: "typescript", brand: "#3178C6", years: 3 },
      { name: "astro", icon: "astro", brand: "#FF5D01", years: 1 },
      { name: "tailwind", icon: "tailwindcss", brand: "#06B6D4", years: 2 },
      { name: "html5", icon: "html5", brand: "#E34F26", years: 4 },
      { name: "css", icon: "abbr:CS", brand: "#1572B6", years: 4 },
    ],
  },
  {
    id: "devops",
    label: "// devops",
    tools: [
      { name: "docker", icon: "docker", brand: "#2496ED", years: 3, description: "How everything ships. Compose for local stacks (api + postgres + redis in one `up`), multi-stage builds to keep images small. The dev/prod parity it gives you is worth the disk space." },
      { name: "git", icon: "git", brand: "#F05032", years: 4 },
      { name: "linux", icon: "linux", brand: "#FCC624", years: 4 },
      { name: "github actions", icon: "githubactions", brand: "#2088FF", years: 2 },
      { name: "bash", icon: "gnubash", brand: "#4EAA25", years: 3 },
      { name: "nginx", icon: "nginx", brand: "#009639", years: 2 },
    ],
  },
  {
    id: "learning",
    label: "// learning",
    tools: [
      { name: "rust", icon: "rust", brand: "#DEA584", years: 1, description: "Currently learning — picked it for the borrow checker's honesty about ownership, which maps cleanly onto the protocol/networking problems I care about. No production project yet, just exploratory QUIC-adjacent toys." },
      { name: "quic", icon: "abbr:QC", brand: "#FFB000", years: 1 },
      { name: "ros", icon: "ros", brand: "#22B14C", years: 1 },
    ],
  },
];
