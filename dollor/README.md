# $ DOLLOR — Vercel-ready website

This repository preserves the uploaded single-file website design, branding, colors, and animations.

## Deploy to Vercel

1. Create a new GitHub repository and upload `index.html`, `vercel.json`, and `README.md` to the repository root.
2. In Vercel, select **Add New → Project** and import the GitHub repository.
3. Set **Framework Preset** to **Other**, leave **Build Command** empty, and use the repository root as **Root Directory**.
4. Click **Deploy**.

No npm install, environment variables, or build step is required.

## Notes

- The source is a self-contained HTML file with embedded CSS and JavaScript, including bundled 3D/React libraries.
- Only a malformed mobile CSS media rule and a JavaScript null-reference guard were fixed. No copy, graphics, or design elements were replaced.
- Fonts are requested from Google Fonts and therefore require an internet connection.
- Several sections contain original placeholder copy and `#` links; these have deliberately been preserved.
- The WhatsApp badge currently links to the on-page contact section, not an external WhatsApp chat. Add a real contact URL separately if needed.
- Smooth animation performance varies by device GPU and browser; deployment cannot guarantee identical frame rates on all devices.
