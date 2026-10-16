# Technology logo sources

Official assets are kept locally in their original colors:

- `csharp.png`: https://github.com/dotnet/vscode-csharp/blob/main/images/csharpIcon.png
- `efcore.svg`: https://github.com/dotnet/efcore/blob/main/logo/ef-logo.svg
- `aspire.svg`: https://microsoft.github.io/aspire-brand/logo/aspire-icon-32.svg

Gemini uses the existing `simple-icons` package (`siGooglegemini`), sourced from https://gemini.google.com.

## Additional assets collected on 2026-10-15

These are original downloads, with their shapes and colors unchanged.
`src/config/technologies.ts` selects artwork for both the toolkit and projects;
`TechIcon.astro` renders those entries. Simple Icons entries retain their own
source and brand-guidelines metadata in the catalog.

| File | Original source |
| --- | --- |
| `dotnet.svg` | https://raw.githubusercontent.com/dotnet/brand/main/logo/dotnet-logo.svg |
| `grpc.svg` | https://raw.githubusercontent.com/cncf/artwork/main/projects/grpc/icon/color/grpc-icon-color.svg |
| `grpc-white.svg` | https://raw.githubusercontent.com/cncf/artwork/main/projects/grpc/icon/white/grpc-icon-white.svg |
| `sqlserver.svg` | https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/1065066-Icon-SQLServer-16x16 |
| `ros.svg` | https://raw.githubusercontent.com/openrobotics/artwork/master/ros_logo.svg |
| `nav2.png` | https://docs.nav2.org/rolling/assets/nav2_logo_48x48.png |
| `nav2-wordmark.png` | https://docs.nav2.org/rolling/assets/nav2_logo_with_text.png |
| `opencode.svg` | https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/identity/mark.svg |
| `opencode-light.svg` | https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/identity/mark-light.svg |
| `openai.png` | https://developers.openai.com/favicon.png |

### Identity and display notes

- `sqlserver.svg` is linked by [Microsoft's SQL Server product page](https://www.microsoft.com/en-us/sql-server). It is not an Azure SQL icon.
- `ros.svg` is the ROS wordmark, not a separate ROS 2 mark. Open Robotics lists [CC BY-NC 4.0 and its trademark policy](https://github.com/openrobotics/artwork#license); retain source attribution when using it.
- Nav2's [official documentation](https://docs.nav2.org/rolling/) supplies both images. The icon is 70 by 70 pixels despite its source filename; the wordmark is 1188 by 500 pixels. Do not enlarge the small icon for project artwork.
- OpenCode's [brand page](https://opencode.ai/brand) provides brand guidance. Both local SVGs come from the project's identity package; preserve their supplied backgrounds and colors.
- Keep the official .NET and gRPC wordmarks intact rather than cropping them into new symbols.

### Remaining icon decisions

- The installed `simple-icons` package already covers most frontend, mobile, database, infrastructure, and hardware vendor brands. Reuse its source and guidelines metadata instead of downloading duplicate copies.
- Claude Code uses Claude's brand mark from `siClaude`, as requested; this is not a distinct Claude Code logo.
- A Codex-specific icon, a SignalR-specific icon, and a distinct ROS 2 icon have not been verified in this collection. Keep these decisions explicit rather than assigning unrelated artwork.
- ESP32 and Jetson can reference Espressif and NVIDIA respectively, but those are vendor marks, not device-specific logos.

## Shared catalog choices

- ASP.NET Core uses the .NET mark; ROS 2 uses the ROS mark; Docker Compose uses the Docker mark; React Native uses the React mark.
- Next.js, Expo, GitHub, WebRTC, ROS, JWT, SQLite, and MQTT use monochrome glyphs so they remain visible in both site themes. OpenCode and gRPC use their supplied light and dark assets.
- Codex CLI uses the original OpenAI favicon from its developer site, as requested. This is the OpenAI mark rather than a Codex-specific logo.
- SignalR, ADO.NET, Protocol Buffers, UART, SBUS, and fuzzy matching currently have text labels without invented logo substitutes.
- The ROS wordmark and Nav2 wordmark remain available for larger placements; the toolkit uses the ROS glyph and small Nav2 icon.
