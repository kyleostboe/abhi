# abhī

Welcome to abhī, your personal meditation companion. This application helps you create and adjust guided meditations to fit your needs.

## Features

- **Length Adjuster**: Modify the duration of existing guided meditations.
- **Encoder (Labs)**: Create custom meditations by associating instructions with sound cues (under development).
- **Personal Library**: Save and manage your created or adjusted meditations (requires login).
- **User Authentication**: Securely create an account and log in to access personalized features.

## Getting Started

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/your-repo/abhi.git
cd abhi
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

### 3. Set up Supabase

This project uses [Supabase](https://supabase.com/) for authentication and data storage.

1.  **Create a new Supabase project**: Go to [Supabase](https://app.supabase.com/) and create a new project.
2.  **Get your API keys**:
    *   Go to `Settings > API` in your Supabase project.
    *   Copy your `Project URL` and `anon public` key.
3.  **Set environment variables**: Create a `.env.local` file in the root of your project and add the following:

    \`\`\`
    NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    \`\`\`
4.  **Run SQL Migrations**: Execute the SQL scripts located in the `scripts/` directory in your Supabase SQL Editor. Start with `001-create-profiles-table.sql`, then `002-create-meditations-table.sql`, and finally `003-create-meditations-table.sql`. This will set up your `profiles` and `meditations` tables, as well as storage buckets and Row Level Security (RLS) policies.

### 4. Run the development server

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
    -   `adjuster/`: Length Adjuster tool page.
    -   `encoder/`: Encoder (Labs) tool page.
    -   `login/`: User login and signup page.
    -   `meditations/`: Personal meditation library page.
-   `components/`: Reusable React components, including Shadcn UI components.
-   `hooks/`: Custom React hooks (e.g., `use-auth`).
-   `lib/`: Utility functions and Supabase client setup.
-   `public/`: Static assets.
-   `scripts/`: SQL scripts for database setup.
-   `styles/`: Global CSS.

## Contributing

Contributions are welcome! Please feel free to open issues or pull requests.

## License

This project is licensed under the MIT License.
\`\`\`
