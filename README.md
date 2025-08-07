# abhī Meditation Tool

This project is a meditation tool designed to help users adjust the length of guided meditations and create custom meditation timelines.

## Features

### Length Adjuster
- Upload an audio file (MP3, WAV, OGG, M4A).
- Set a target duration for the meditation.
- Intelligently adjusts silence periods to fit the target duration.
- Provides audio analysis (content duration, silence duration, number of pauses).
- Offers basic and advanced settings for fine-tuning the adjustment process.
- Supports high compatibility mode for better playback on mobile devices.

### Encoder (Labs)
- Create custom meditation timelines.
- Add instructions with associated sound cues.
- Record voice instructions directly within the app.
- Mix background ambient sounds with adjustable volumes.
- Visual timeline editor to arrange and adjust events.
- Export the custom meditation as an audio file.

## Technologies Used

- Next.js (App Router)
- React
- Tailwind CSS
- shadcn/ui
- Framer Motion for animations
- Web Audio API for audio processing and recording

## Getting Started

To run this project locally:

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
    \`\`\`

3.  **Run the development server:**
    \`\`\`bash
    npm run dev
    # or
    yarn dev
    \`\`\`

    Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Project Structure

- `app/`: Next.js App Router pages and layouts.
- `components/`: Reusable React components, including shadcn/ui components.
- `hooks/`: Custom React hooks.
- `lib/`: Utility functions, data, and types.
- `public/`: Static assets.
- `styles/`: Global CSS.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.
