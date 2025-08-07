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

First, run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Project Structure

- `app/`: Next.js App Router pages and layouts.
- `components/`: Reusable React components, including shadcn/ui components.
- `hooks/`: Custom React hooks.
- `lib/`: Utility functions, data, and types.
- `public/`: Static assets.
- `styles/`: Global CSS.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## License

This project is licensed under the MIT License.
