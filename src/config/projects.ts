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
  category: string;
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
    category: "robotics · real-time control",
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
    category: "gym management platform",
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
    slug: "dirasati",
    title: "Dirasati",
    year: "2025",
    category: "education management",
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
    category: "booking API",
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
    category: "IoT · embedded systems",
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
