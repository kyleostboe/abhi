# abhī

A meditation tool that allows users to adjust the length of guided meditations by intelligently re-spacing silence periods, or create custom meditations by associating instructions with sound cues along a timeline.

## Features

### Length Adjuster

- Upload an audio file (MP3, WAV, OGG, M4A).
- Set a target duration for the meditation.
- The tool analyzes silence periods and adjusts them to fit the target duration.
- Advanced settings for silence threshold, minimum silence duration, and pacing preservation.
- Download the processed audio.

### Encoder

- Create custom meditation timelines.
- Add instructions from a library or custom text.
- Add musical notes and sound cues.
- Record voice instructions directly within the app.
- Export the custom meditation as an audio file.

## Technologies Used

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion for animations
- Web Audio API for audio processing and generation

## Project Structure

-   `app/`: Next.js App Router pages and layouts.
-   `components/`: Reusable React components, including shadcn/ui components.
-   `hooks/`: Custom React hooks.
-   `lib/`: Utility functions and data, including audio processing logic and meditation data.
-   `public/`: Static assets like images and sounds.
-   `styles/`: Global CSS.

## License

This project is licensed under the MIT License.
