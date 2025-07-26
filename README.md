# Abhi Meditation Tool

This is a meditation tool designed to help users create and manage personalized meditation sessions.

## Features

-   **Customizable Timelines:** Create meditation sequences with various events.
-   **Ambient Sounds:** Integrate different ambient sounds into your meditation.
-   **User Authentication:** Securely sign up and log in to save your meditations.
-   **Profile Management:** Manage your user profile and saved meditations.

## Getting Started

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/your-username/abhi-meditation.git
cd abhi-meditation
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
# or
yarn install
\`\`\`

### 3. Set up Supabase

This project uses Supabase for database and authentication.

1.  **Create a new Supabase project:** Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Get your API keys:** From your Supabase project dashboard, navigate to "Project Settings" -> "API" to find your `Project URL` and `anon` key.
3.  **Set up environment variables:** Create a `.env.local` file in the root of your project and add the following:

    \`\`\`env
    NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    \`\`\`

    Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase project URL and anon key.

4.  **Run SQL migrations:** Use the provided SQL scripts to set up your database schema. You can run these directly in the Supabase SQL Editor or use the `StepsCard` interface in v0 if available.

    *   `scripts/01_create_user_profiles_table.sql`
    *   `scripts/02_create_ambient_sounds_table.sql`
    *   `scripts/03_create_meditations_table.sql`

### 4. Run the development server

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

-   `app/`: Next.js App Router pages and layouts.
-   `components/`: Reusable React components, including Shadcn UI components.
-   `lib/`: Utility functions and Supabase client initialization.
-   `hooks/`: Custom React hooks.
-   `scripts/`: SQL migration scripts for Supabase.
-   `styles/`: Global CSS.

## Contributing

Feel free to contribute to this project by opening issues or pull requests.
