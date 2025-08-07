# abhī: Meditation Tool

abhī is a meditation tool designed to help users adjust the length of guided meditations and create custom meditation timelines.

## Features

- **Length Adjuster**: Upload an audio file and adjust its duration by intelligently modifying silence periods.
- **Encoder (Labs)**: Create custom meditation sessions by combining instructions, sound cues, and recorded voice.
- **Visual Timeline**: Arrange and manage meditation events on an interactive timeline.
- **Background Sound Mixer**: Add and control ambient background sounds for custom meditations.
- **Audio Export**: Generate and download custom meditation audio files.

## Technologies Used

- Next.js (App Router)
- React
- Tailwind CSS
- shadcn/ui
- Lucide React Icons
- Framer Motion (for animations)
- Web Audio API (for audio processing and synthesis)

## Getting Started

To run this project locally, follow these steps:

1.  **Clone the repository**:
    \`\`\`bash
    git clone https://github.com/your-username/abhi.git
    cd abhi
    \`\`\`
2.  **Install dependencies**:
    \`\`\`bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    \`\`\`
3.  **Run the development server**:
    \`\`\`bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    \`\`\`
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: Reusable React components, including shadcn/ui components.
- `lib/`: Utility functions, types, and meditation data.
- `hooks/`: Custom React hooks.
- `public/`: Static assets.
- `styles/`: Global CSS styles.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.
