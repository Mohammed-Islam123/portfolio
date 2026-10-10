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
  tech: { label: string; icon: string; brand: string }[];
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
      { label: "C#", icon: "csharp", brand: "#512BD4" },
      { label: "C++", icon: "cplusplus", brand: "#00599C" },
      { label: "Python", icon: "python", brand: "#3776AB" },
      { label: "ROS2", icon: "ros", brand: "#22314E" },
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: "UART", icon: "abbr:UA", brand: "#22D3EE" },
      { label: "WebRTC", icon: "webrtc", brand: "#333333" },
      { label: "Protobuf", icon: "abbr:PB", brand: "#22D3EE" },
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
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: ".NET Aspire", icon: "aspire", brand: "#512BD4" },
      { label: "React", icon: "react", brand: "#61DAFB" },
      { label: "Tailwind CSS", icon: "tailwindcss", brand: "#06B6D4" },
      { label: "Kubernetes", icon: "kubernetes", brand: "#326CE5" },
      { label: "RabbitMQ", icon: "rabbitmq", brand: "#FF6600" },
      { label: "PostgreSQL", icon: "postgresql", brand: "#4169E1" },
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
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: "Gemini", icon: "googlegemini", brand: "#4285F4" },
      { label: "EF Core", icon: "efcore", brand: "#68217A" },
      { label: "PostgreSQL", icon: "postgresql", brand: "#4169E1" },
      { label: "Fuzzy Matching", icon: "abbr:FM", brand: "#F59E0B" },
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
      { label: "React Native", icon: "react", brand: "#61DAFB" },
      { label: "TypeScript", icon: "typescript", brand: "#3178C6" },
      { label: "Python", icon: "python", brand: "#3776AB" },
      { label: "Gemini", icon: "googlegemini", brand: "#4285F4" },
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
      { label: "ESP32", icon: "espressif", brand: "#E7352C" },
      { label: "C++", icon: "cplusplus", brand: "#00599C" },
      { label: "Arduino", icon: "arduino", brand: "#00878F" },
      { label: "SBUS", icon: "abbr:SB", brand: "#22D3EE" },
    ],
    links: [
      {
        label: "source",
        href: "https://github.com/Mohammed-Islam123/Afrobot_Fighting_Robot",
        kind: "repo",
      },
    ],
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
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: "PostgreSQL", icon: "postgresql", brand: "#4169E1" },
      { label: "SignalR", icon: "abbr:SR", brand: "#0078D4" },
      { label: "React", icon: "react", brand: "#61DAFB" },
      { label: "TypeScript", icon: "typescript", brand: "#3178C6" },
    ],
    links: [{ label: "source", href: "https://github.com/Mohammed-Islam123/Dirasati_client", kind: "repo" }],
    accent: "#38BDF8",
  },
  {
    slug: "zmala-system",
    title: "Zmala System",
    year: "2024",
    description:
      "A house arrest tracking bracelet that transmits location telemetry, communicates, and triggers an alarm when the wearer leaves the designated area.",
    image: "/Images/Projects/tracking_bracelet.webp",
    tech: [
      { label: "ESP32", icon: "espressif", brand: "#E7352C" },
      { label: "ESP8266", icon: "espressif", brand: "#E7352C" },
      { label: "C++", icon: "cplusplus", brand: "#00599C" },
      { label: "MQTT", icon: "mqtt", brand: "#660066" },
      { label: "PlatformIO", icon: "platformio", brand: "#FF7F00" },
    ],
    links: [
      { label: "ESP8266 firmware", href: "https://github.com/Mohammed-Islam123/Tracking_Braclet", kind: "repo" },
      { label: "ESP32 firmware", href: "https://github.com/Mohammed-Islam123/Ankle_Tracking_Braclet_esp32", kind: "repo" },
    ],
    accent: "#F59E0B",
  },
];
