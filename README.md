# abhī Meditation Tool

This is a meditation tool designed to help users adjust the length of guided meditations and create custom meditation timelines.

## Features

### Length Adjuster
- Upload audio files (MP3, WAV, OGG, M4A)
- Adjust the target duration of guided meditations
- Intelligently re-space silence periods
- Detect and analyze silence regions
- Preserve natural pacing or distribute silence evenly
- Download processed audio

### Encoder (Labs)
- Create custom meditation timelines
- Add instructions from a library or custom text
- Integrate musical notes and sound cues
- Record custom voice instructions
- Visualize and edit timeline events
- Mix background sounds
- Export custom meditation audio

## Technologies Used

- Next.js (App Router)
- React
- Tailwind CSS
- shadcn/ui
- Framer Motion for animations
- Web Audio API for audio processing and generation
- Lucide React for icons

## Getting Started

To run this project locally, follow these steps:

1.  **Clone the repository:**
    \`\`\`bash
    git clone https://github.com/your-username/abhi-meditation.git
    cd abhi-meditation
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

    Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Project Structure

-   `app/`: Next.js App Router pages and API routes.
    -   `page.tsx`: Main application logic for both Adjuster and Encoder modes.
    -   `contact/`, `donate/`, `encoder/`, `labs/`: Placeholder or future pages.
-   `components/`: Reusable React components.
    -   `ui/`: shadcn/ui components.
    -   `navigation.tsx`: Application navigation.
    -   `visual-timeline.tsx`: Component for displaying and interacting with the meditation timeline.
-   `lib/`: Utility functions and data.
    -   `audio-utils.ts`: Web Audio API helper functions.
    -   `meditation-data.ts`: Libraries for instructions, sound cues, and musical notes.
    -   `types.ts`: TypeScript interfaces for data structures.
    -   `utils.ts`: General utility functions (e.g., `cn`, `formatTime`, `sleep`).
-   `hooks/`: Custom React hooks.
    -   `use-mobile.tsx`: Hook to detect mobile devices.
    -   `use-toast.ts`: Hook for toast notifications.
-   `public/`: Static assets.
-   `styles/`: Global CSS.
-   `tailwind.config.ts`: Tailwind CSS configuration.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.
\`\`\`
