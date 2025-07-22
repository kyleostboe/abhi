# abhī

A meditation tool that allows users to adjust the length of guided meditations by intelligently re-spacing silence periods, or create custom meditations by associating instructions with sound cues along a timeline.

## Features

### Length Adjuster

- Upload an audio file (MP3, WAV, OGG, M4A).
- Set a target duration for the meditation.
- The tool analyzes silence periods and adjusts them to fit the target duration.
- Advanced settings for silence threshold, minimum silence duration, and pacing preservation.
- Download the processed audio.

### Encoder (Labs)

- Create custom meditation timelines.
- Add instructions from a library or custom text.
- Add musical notes and sound cues.
- Record voice instructions directly within the app.
- Mix background ambient sounds with adjustable volumes.
- Export the custom meditation as an audio file.

## Technologies Used

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion for animations
- Web Audio API for audio processing and generation

## Getting Started

1.  **Clone the repository:**
    \`\`\`bash
    git clone https://github.com/your-username/abhi.git
    cd abhi
    \`\`\`
2.  **Install dependencies:**
    \`\`\`bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    \`\`\`
3.  **Run the development server:**
    \`\`\`bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    \`\`\`
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

-   `app/`: Next.js App Router pages and layouts.
-   `components/`: Reusable React components, including shadcn/ui components.
-   `hooks/`: Custom React hooks.
-   `lib/`: Utility functions and data, including audio processing logic and meditation data.
-   `public/`: Static assets like images and sounds.
-   `styles/`: Global CSS.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.
