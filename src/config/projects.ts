import type { TechnologyId } from "./technologies";

/**
 * PROJECTS CONFIG — portfolio cards.
 *
 * Each entry powers the home-page carousel and list view. Actions are
 * optional: only links present here are rendered on a project card.
 */

export type Project = {
  slug: string;
  title: string;
  year: string;
  description: string;
  image?: string;
  tech: TechnologyId[];
  links: { label: string; href: string; kind: "case" | "repo" | "live" | "doc" }[];
  accent: string;
};

export const projects: Project[] = [
  {
    slug: "sahm",
    title: "SAHM",
    year: "2025",
    description:
      "A fully autonomous delivery robot system with a web dashboard, multi-camera streaming, manual control, and ROS2 for autonomous driving.",
    image: "/Images/Projects/sahm.webp",
    tech: [
      "csharp",
      "cplusplus",
      "python",
      "ros2",
      "aspnetcore",
      "uart",
      "webrtc",
      "protobuf",
    ],
    links: [{ label: "source", href: "https://github.com/Mohammed-Islam123/DeliveryBot", kind: "repo" }],
    accent: "#22D3EE",
  },
  {
    slug: "fittech",
    title: "FitTech",
    year: "2026",
    description:
      "A full-stack gym management platform built around a microservices architecture, covering membership and attendance tracking, classes, payments, equipment, workout activity, notifications, and real-time communication. The backend is primarily built with ASP.NET Core, with additional Java services, and uses .NET Aspire to orchestrate the distributed system and its infrastructure during development, including PostgreSQL, RabbitMQ, and Redis. A React frontend provides the user-facing management interface.",
    image: "/Images/Projects/fittech.webp",
    tech: [
      "aspnetcore",
      "aspire",
      "react",
      "tailwindcss",
      "kubernetes",
      "rabbitmq",
      "postgresql",
    ],
    links: [
      { label: "backend", href: "https://github.com/Mohammed-Islam123/FitTech.Backend", kind: "repo" },
      { label: "frontend", href: "https://github.com/Mohammed-Islam123/fitech-app", kind: "repo" },
    ],
    accent: "#A78BFA",
  },
  {
    slug: "note-capture",
    title: "NoteCapture",
    year: "2025",
    description:
      "A smart exam-processing API that turns batches of handwritten exam photos into structured grades using Gemini OCR, validates uploaded class spreadsheets, and fuzzy-matches extracted names against student lists.",
    image: "/Images/Projects/note-capture.webp",
    tech: [
      "aspnetcore",
      "gemini",
      "efcore",
      "postgresql",
      "fuzzymatching",
    ],
    links: [],
    accent: "#8B5CF6",
  },
  {
    slug: "storyfox",
    title: "StoryFox",
    year: "2025",
    description:
      "A mobile app that creates illustrated stories for children, with options for genre, reading level, and main character. Built with React Native and Expo, with a Python Flask API using Gemini to generate the story, cover, and chapter illustrations.",
    image: "/Images/Projects/storyfox.webp",
    tech: [
      "reactnative",
      "typescript",
      "python",
      "gemini",
    ],
    links: [{ label: "source", href: "https://github.com/IsaacBh1/StoryFox", kind: "repo" }],
    accent: "var(--ink-muted)",
  },
  {
    slug: "afrobot-fighting-robot",
    title: "Afrobot Fighting Robot",
    year: "2025",
    image: "/Images/Projects/fighting%20robot.webp",
    description:
      "This is my first ever fighting robot project. I wrote the firmware that lets its operator steer, control speed, and activate the weapon from one transmitter.",
    tech: [
      "esp32",
      "cplusplus",
      "arduino",
      "sbus",
    ],
    links: [],
    accent: "#F97316",
  },
  {
    slug: "dirasati",
    title: "Dirasati",
    year: "2025",
    description:
      "A full-stack school management platform for managing students, teachers, attendance, schedules, payments, and parent-school communication. Built with ASP.NET Core using Vertical Slice Architecture, PostgreSQL, SignalR, and a React + TypeScript frontend.",
    image: "/Images/Projects/dirasati.webp",
    tech: [
      "aspnetcore",
      "postgresql",
      "signalr",
      "react",
      "typescript",
    ],
    links: [{ label: "source", href: "https://github.com/Mohammed-Islam123/Dirasati_client", kind: "repo" }],
    accent: "#38BDF8",
  },
  {
    slug: "house-arrest-bracelet",
    title: "House arrest Bracelet",
    year: "2024",
    description:
      "A house arrest tracking bracelet that transmits location telemetry, communicates, and triggers an alarm when the wearer leaves the designated area.",
    image: "/Images/Projects/tracking_bracelet.webp",
    tech: [
      "esp32",
      "esp8266",
      "cplusplus",
      "mqtt",
      "platformio",
    ],
    links: [],
    accent: "#F59E0B",
  },
];
