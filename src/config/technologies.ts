import {
  siArduino, siAstro, siClaude, siCplusplus, siCss, siDocker, siEspressif,
  siExpo, siFlutter, siGit, siGithub, siGnubash, siGooglegemini,
  siHtml5, siJavascript, siJsonwebtokens, siKubernetes, siLinux,
  siMongodb, siMqtt, siNextdotjs, siNginx, siNvidia, siPlatformio,
  siPostgresql, siPython, siRabbitmq, siRaspberrypi, siReact, siRedis,
  siRos, siSqlite, siTailwindcss, siTypescript, siWebrtc,
  type SimpleIcon,
} from "simple-icons";

export type Technology = {
  label: string;
  icon: SimpleIcon | { src: string; lightSrc?: string; source: string } | null;
  monochrome?: boolean;
  /** Optional toolkit caption; omit it to hide the note and its indicator. */
  description?: string;
};

// Toolkit and project configs reference these IDs; names and artwork live here.
export const technologies = {
  csharp: {
    label: "C#",
    icon: { src: "/icons/tech/csharp.png", source: "https://github.com/dotnet/vscode-csharp/blob/main/images/csharpIcon.png" },
  },
  dotnet: {
    label: ".NET",
    icon: { src: "/icons/tech/dotnet.svg", source: "https://github.com/dotnet/brand/blob/main/logo/dotnet-logo.svg" },
  },
  aspnetcore: {
    label: "ASP.NET Core",
    icon: { src: "/icons/tech/dotnet.svg", source: "https://github.com/dotnet/brand/blob/main/logo/dotnet-logo.svg" },
  },
  efcore: {
    label: "EF Core",
    icon: { src: "/icons/tech/efcore.svg", source: "https://github.com/dotnet/efcore/blob/main/logo/ef-logo.svg" },
  },
  adonet: { label: "ADO.NET", icon: null },
  postgresql: {
    label: "PostgreSQL", icon: siPostgresql,
  },
  sqlserver: {
    label: "SQL Server",
    icon: { src: "/icons/tech/sqlserver.svg", source: "https://www.microsoft.com/en-us/sql-server" },
  },
  sqlite: { label: "SQLite", icon: siSqlite, monochrome: true },
  mongodb: { label: "MongoDB", icon: siMongodb },
  redis: {
    label: "Redis", icon: siRedis,
  },
  signalr: {
    label: "SignalR", icon: null,
  },
  grpc: {
    label: "gRPC",
    icon: {
      src: "/icons/tech/grpc-white.svg",
      lightSrc: "/icons/tech/grpc.svg",
      source: "https://github.com/cncf/artwork/tree/main/projects/grpc",
    },
  },
  webrtc: {
    label: "WebRTC", icon: siWebrtc, monochrome: true,
  },
  rabbitmq: {
    label: "RabbitMQ", icon: siRabbitmq,
  },
  jwt: { label: "JWT", icon: siJsonwebtokens, monochrome: true },
  protobuf: { label: "Protocol Buffers", icon: null },
  react: { label: "React", icon: siReact },
  nextjs: { label: "Next.js", icon: siNextdotjs, monochrome: true },
  typescript: { label: "TypeScript", icon: siTypescript },
  javascript: { label: "JavaScript", icon: siJavascript },
  html: { label: "HTML", icon: siHtml5 },
  css: { label: "CSS", icon: siCss },
  astro: { label: "Astro", icon: siAstro },
  tailwindcss: { label: "Tailwind CSS", icon: siTailwindcss },
  reactnative: {
    label: "React Native", icon: siReact,
  },
  expo: { label: "Expo", icon: siExpo, monochrome: true },
  flutter: { label: "Flutter", icon: siFlutter },
  docker: { label: "Docker", icon: siDocker },
  dockercompose: { label: "Docker Compose", icon: siDocker },
  kubernetes: { label: "Kubernetes", icon: siKubernetes },
  aspire: {
    label: "Aspire",
    icon: { src: "/icons/tech/aspire.svg", source: "https://microsoft.github.io/aspire-brand/" },
  },
  nginx: { label: "Nginx", icon: siNginx },
  ros2: { label: "ROS 2", icon: siRos, monochrome: true },
  nav2: {
    label: "Nav2",
    icon: { src: "/icons/tech/nav2.png", source: "https://docs.nav2.org/rolling/" },
  },
  raspberrypi: { label: "Raspberry Pi", icon: siRaspberrypi },
  jetson: { label: "Jetson AGX Xavier", icon: siNvidia },
  python: { label: "Python", icon: siPython },
  cplusplus: { label: "C++", icon: siCplusplus },
  esp32: {
    label: "ESP32", icon: siEspressif,
  },
  esp8266: { label: "ESP8266", icon: siEspressif },
  arduino: { label: "Arduino", icon: siArduino },
  platformio: { label: "PlatformIO", icon: siPlatformio },
  mqtt: {
    label: "MQTT", icon: siMqtt, monochrome: true,
  },
  uart: { label: "UART", icon: null },
  sbus: { label: "SBUS", icon: null },
  gemini: {
    label: "Gemini API", icon: siGooglegemini,
  },
  claudecode: { label: "Claude Code", icon: siClaude },
  codex: {
    label: "Codex CLI",
    icon: { src: "/icons/tech/openai.png", source: "https://developers.openai.com/favicon.png" },
  },
  opencode: {
    label: "OpenCode",
    icon: {
      src: "/icons/tech/opencode.svg",
      lightSrc: "/icons/tech/opencode-light.svg",
      source: "https://opencode.ai/brand",
    },
  },
  git: { label: "Git", icon: siGit },
  github: { label: "GitHub", icon: siGithub, monochrome: true },
  linux: { label: "Linux", icon: siLinux },
  bash: { label: "Bash", icon: siGnubash },
  fuzzymatching: { label: "Fuzzy matching", icon: null },
} satisfies Record<string, Technology>;

export type TechnologyId = keyof typeof technologies;
