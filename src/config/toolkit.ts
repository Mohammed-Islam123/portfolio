import type { TechnologyId } from "./technologies";

export type ToolGroup = {
  id: string;
  label: string;
  tools: TechnologyId[];
};

export const toolGroups: ToolGroup[] = [
  {
    id: "backend",
    label: "backend",
    tools: ["csharp", "dotnet", "aspnetcore", "efcore", "adonet"],
  },
  {
    id: "databases",
    label: "databases & caching",
    tools: ["postgresql", "sqlserver", "sqlite", "mongodb", "redis"],
  },
  {
    id: "apis",
    label: "APIs & messaging",
    tools: ["signalr", "grpc", "webrtc", "rabbitmq", "jwt", "protobuf"],
  },
  {
    id: "frontend",
    label: "frontend",
    tools: ["react", "nextjs", "typescript", "javascript", "html", "css", "astro", "tailwindcss"],
  },
  {
    id: "mobile",
    label: "mobile",
    tools: ["reactnative", "expo", "flutter"],
  },
  {
    id: "devops",
    label: "DevOps & infrastructure",
    tools: ["docker", "dockercompose", "kubernetes", "aspire", "nginx", "git", "github", "linux", "bash"],
  },
  {
    id: "robotics-iot",
    label: "robotics, IoT & embedded",
    tools: ["ros2", "nav2", "raspberrypi", "jetson", "python", "cplusplus", "esp32", "esp8266", "arduino", "platformio", "mqtt", "uart", "sbus"],
  },
  {
    id: "ai-tools",
    label: "AI coding tools",
    tools: ["claudecode", "codex", "opencode"],
  },
];
