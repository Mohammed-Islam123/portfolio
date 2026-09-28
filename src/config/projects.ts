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
  tech: { label: string; icon: string; brand: string }[];
  links: { label: string; href: string; kind: "case" | "repo" | "live" | "doc" }[];
  accent: string;
};

export const projects: Project[] = [
  {
    slug: "delivery-bot",
    title: "DeliveryBot",
    year: "2025",
    description:
      "A fully autonomous delivery robot system with a web dashboard, real time multi camera streaming, manual override, and ROS 2 based autonomous navigation.",
    tech: [
      { label: "WebRTC", icon: "webrtc", brand: "#333333" },
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: "Python", icon: "python", brand: "#3776AB" },
      { label: "ESP32", icon: "espressif", brand: "#E7352C" },
      { label: "C++", icon: "cplusplus", brand: "#00599C" },
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
    tech: [
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: ".NET Aspire", icon: "dotnet", brand: "#512BD4" },
      { label: "React", icon: "react", brand: "#61DAFB" },
      { label: "SignalR", icon: "abbr:SR", brand: "#0078D4" },
      { label: "Tailwind CSS", icon: "tailwindcss", brand: "#06B6D4" },
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
    tech: [
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: "Gemini", icon: "abbr:AI", brand: "#4285F4" },
      { label: "EF Core", icon: "abbr:EF", brand: "#68217A" },
      { label: "PostgreSQL", icon: "postgresql", brand: "#4169E1" },
      { label: "Fuzzy Matching", icon: "abbr:FM", brand: "#F59E0B" },
    ],
    links: [],
    accent: "#8B5CF6",
  },
  {
    slug: "afrobot-fighting-robot",
    title: "Afrobot Fighting Robot",
    year: "2025",
    description:
      "An ESP32-powered radio-controlled fighting robot with SBUS input, dual-motor PWM drive control, configurable dead zones, signal-loss failsafe behavior, and weapon activation.",
    tech: [
      { label: "ESP32", icon: "espressif", brand: "#E7352C" },
      { label: "C++", icon: "cplusplus", brand: "#00599C" },
      { label: "PlatformIO", icon: "platformio", brand: "#FF7F00" },
      { label: "SBUS", icon: "abbr:SB", brand: "#22D3EE" },
      { label: "PWM", icon: "abbr:PW", brand: "#34D399" },
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
      "A role-aware school-management frontend for administering teachers, students, employees, classes, attendance, and convocations.",
    tech: [
      { label: "React", icon: "react", brand: "#61DAFB" },
      { label: "TypeScript", icon: "typescript", brand: "#3178C6" },
      { label: "Vite", icon: "vite", brand: "#646CFF" },
      { label: "Zustand", icon: "abbr:ZU", brand: "#443E38" },
      { label: "Tailwind CSS", icon: "tailwindcss", brand: "#06B6D4" },
    ],
    links: [{ label: "source", href: "https://github.com/Mohammed-Islam123/Dirasati_client", kind: "repo" }],
    accent: "#38BDF8",
  },
  {
    slug: "booking-dz",
    title: "BookingDZ",
    year: "2025",
    description:
      "An ASP.NET Core booking API for apartment listings and reservations, organised around domain, application, infrastructure, and API layers.",
    tech: [
      { label: "ASP.NET Core", icon: "dotnet", brand: "#512BD4" },
      { label: "C#", icon: "csharp", brand: "#512BD4" },
      { label: "Docker", icon: "docker", brand: "#2496ED" },
      { label: "OpenAPI", icon: "openapiinitiative", brand: "#6BA539" },
    ],
    links: [{ label: "source", href: "https://github.com/Mohammed-Islam123/BookingDz", kind: "repo" }],
    accent: "#34D399",
  },
  {
    slug: "gps-tracking-bracelet",
    title: "GPS Tracking Bracelet",
    year: "2024",
    description:
      "A GPS safety-tracking bracelet that publishes location and battery telemetry over GSM/GPRS and MQTT.",
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
