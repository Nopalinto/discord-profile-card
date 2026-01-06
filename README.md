<div align="center">

# 🎨 Discord Profile Card Generator

[![Typing SVG](https://readme-typing-svg.herokuapp.com?font=gg+sans&weight=700&size=28&pause=1000&color=5865F2&center=true&vCenter=true&width=600&lines=Generate+Beautiful+Profile+Cards;Real-time+Lanyard+Integration;Fully+Customizable+Themes;Live+Spotify+and+Game+Activity;Deploy+to+Vercel+in+Seconds)](https://git.io/typing-svg)

<a href="https://discord-card.nopalinto.dev">
  <img src="https://i.ibb.co/BV1vXrjp/Screenshot-2026-01-06-185034.png" height="300" alt="Discord Card Preview" />
</a>

<p align="center">
  <b>A modern, feature-rich Next.js application for generating beautiful Discord profile cards.</b><br/>
  Perfect for your GitHub Profile, Portfolio, or Obsidian notes.
</p>

[**✨ Create Your Card**](https://discord-card.nopalinto.dev/)
&nbsp;&nbsp;•&nbsp;&nbsp;
[**🚀 Deploy Your Own**](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnopalinto%2Fdiscord-profile-card)
&nbsp;&nbsp;•&nbsp;&nbsp;
[**🐛 Report Bug**](https://github.com/nopalinto/discord-profile-card/issues)

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)

</div>

---

## ✨ Features

We don't just show data; we make it look good.

| **Core Features** | **Customization** | **Tech Stack** |
| :--- | :--- | :--- |
| 🟢 **Real-time Updates**<br>Updates every second via [Lanyard](https://github.com/Phineas/lanyard). | 🎨 **Themes**<br>Dark, Light, and fully Custom hex colors. | ⚡ **Next.js 16**<br>App Router & Server Actions. |
| 🎵 **Spotify Sync**<br>Shows live song, artist, and album art. | 🔤 **Fonts & Effects**<br>Neon, Gradient, Pop, and 8+ fonts. | 🦕 **Edge Ready**<br>Optimized for fast API responses. |
| 🎮 **Game Activity**<br>Rich presence with images from RAWG API. | 🖼️ **Banners**<br>Supports GIFs and custom banner URLs. | 💾 **Smart Cache**<br>Reduces API limits with localStorage. |
| 🏷️ **Guild Tags**<br>Displays your server badges and flags. | 🛠️ **Toggles**<br>Hide specific elements you don't want. | 📱 **Responsive**<br>Works on mobile, embeds, and iframes. |

---

## 🧰 Live Widgets (New!)

Don't have space for a full card? Use these mini-widgets in your header or footer.

| **Widget** | **Preview** | **Copy Code** |
| :--- | :--- | :--- |
| **Status Shield**<br>Minimal online/offline indicator. | ![Status](https://discord-card.nopalinto.dev/api/badge/status?id=915480322328649758) | `https://discord-card.nopalinto.dev/api/badge/status?id=YOUR_ID` |
| **Mini Spotify**<br>Slim player bar for your footer. | ![Spotify](https://discord-card.nopalinto.dev/api/badge/spotify?id=915480322328649758&width=300) | `https://discord-card.nopalinto.dev/api/badge/spotify?id=YOUR_ID` |

---

## 🚀 Quick Start

Want to use this on your GitHub profile right now? Just replace the ID!

### 1. The "Markdown" Way (Best for READMEs)
Copy this code and change `YOUR_ID` to your Discord User ID.

```markdown
[![Discord Profile](https://discord-card.nopalinto.dev/api/og?id=YOUR_ID)](https://discord-card.nopalinto.dev)
```

### 2. The "Embed" Way (Best for Websites)
Use this iframe to get the full interactive experience.

```html
<iframe 
  src="https://discord-card.nopalinto.dev/embed?id=YOUR_ID" 
  width="380" height="600" 
  allowtransparency="true" frameborder="0"
></iframe>
```

---

## 🛠️ Advanced Configuration

You can customize your card purely through the URL parameters. No coding required.

| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Required**. Your Discord User ID. | `915480322328649758` |
| `colorScheme` | `string` | The visual theme. | `dark`, `light`, `custom` |
| `primaryColor` | `hex` | Main accent color (requires `custom`). | `5865F2` |
| `displayNameFont` | `string` | Font style for your name. | `gg-sans`, `pixel`, `neon` |
| `hideSpotify` | `boolean` | Hides the music player. | `true` |
| `hideActivity` | `boolean` | Hides game status. | `true` |

💡 **Pro Tip:** You can use the [Online Generator](https://discord-card.nopalinto.dev) to build these URLs visually!

---

## 📦 Local Development

Want to run this server yourself?

```bash
# 1. Clone the repo
git clone https://github.com/nopalinto/discord-profile-card.git

# 2. Install dependencies
npm install

# 3. Run the dev server
npm run dev
```
Open `http://localhost:3000` to see your generator.

---

## 🔌 API Credits

This project wouldn't be possible without these amazing open-source APIs:

- **[Lanyard](https://github.com/Phineas/lanyard)** - The backbone of real-time Discord data.
- **[dstn.to](https://dcdn.dstn.to/)** - For comprehensive profile badges and banners.
- **[Lantern](https://github.com/discordplace/lantern)** - For status and platform detection.
- **[RAWG](https://rawg.io/)** - For high-quality game art.

---

<div align="center">
  <b>Made with ❤️ by <a href="https://github.com/nopalinto">Nopalinto</a></b>
</div>
