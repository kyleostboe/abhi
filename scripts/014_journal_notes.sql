-- Turns journal_entries into notes: markdown content, folders, inline attachments, and the
-- structured metadata a future markdown/Obsidian export needs. Everything here is additive —
-- existing rows keep working, and their plain-text `note` is already valid markdown.

-- ---------------------------------------------------------------------------------------------
-- Folders
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_folders_profile ON journal_folders(profile_id, sort_order);

ALTER TABLE journal_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own journal folders" ON journal_folders;
CREATE POLICY "Users can view their own journal folders"
  ON journal_folders FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can insert their own journal folders" ON journal_folders;
CREATE POLICY "Users can insert their own journal folders"
  ON journal_folders FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update their own journal folders" ON journal_folders;
CREATE POLICY "Users can update their own journal folders"
  ON journal_folders FOR UPDATE
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete their own journal folders" ON journal_folders;
CREATE POLICY "Users can delete their own journal folders"
  ON journal_folders FOR DELETE
  USING (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------------------------
-- Notes (journal_entries, extended)
-- ---------------------------------------------------------------------------------------------

-- A note no longer has to be about a meditation: standalone notes are a first-class case
-- (e.g. a retreat day's own journal), so both meditation columns become nullable.
ALTER TABLE journal_entries ALTER COLUMN meditation_id DROP NOT NULL;
ALTER TABLE journal_entries ALTER COLUMN meditation_title DROP NOT NULL;

-- Markdown body. `note` is kept as the source of truth and simply renamed in intent; existing
-- plain-text values are already valid markdown, so there is nothing to convert.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS content_md TEXT;
UPDATE journal_entries SET content_md = note WHERE content_md IS NULL AND note IS NOT NULL;

-- Title is derived from the first line of the body, stored so the note list doesn't have to
-- parse every note's markdown to render.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS title TEXT;

-- Stable, human-readable identifier. Generated once at creation and never rewritten by a
-- rename, so links between notes (and a future vault export) keep resolving.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES journal_folders(id) ON DELETE SET NULL;

-- Structured practice metadata. Captured now because it cannot be recovered later: a future
-- export writes these straight into YAML frontmatter.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS practice_type TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Per-note typeface override; NULL means "use the app font".
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS font TEXT;

-- Reserved for a future publish/export flow. Nothing reads this yet and every note is private;
-- it exists now purely so adding sharing later needs no migration or backfill.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_profile_slug ON journal_entries(profile_id, slug);
CREATE INDEX IF NOT EXISTS idx_journal_entries_folder ON journal_entries(folder_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_profile_updated ON journal_entries(profile_id, updated_at DESC);

-- ---------------------------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------------------------
-- Files live in R2 under the same presigned-URL scheme as meditation audio; only metadata is
-- stored here. The note body references an attachment by filename, so the markdown stays valid
-- on its own (`![[attachments/<filename>]]`) rather than embedding bytes.
CREATE TABLE IF NOT EXISTS journal_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'audio')),
  storage_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT,
  size_bytes INTEGER,
  duration_ms INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_attachments_entry ON journal_attachments(entry_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_attachments_profile_filename
  ON journal_attachments(profile_id, filename);

ALTER TABLE journal_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own journal attachments" ON journal_attachments;
CREATE POLICY "Users can view their own journal attachments"
  ON journal_attachments FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can insert their own journal attachments" ON journal_attachments;
CREATE POLICY "Users can insert their own journal attachments"
  ON journal_attachments FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update their own journal attachments" ON journal_attachments;
CREATE POLICY "Users can update their own journal attachments"
  ON journal_attachments FOR UPDATE
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete their own journal attachments" ON journal_attachments;
CREATE POLICY "Users can delete their own journal attachments"
  ON journal_attachments FOR DELETE
  USING (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------------------------
-- Meditation slugs
-- ---------------------------------------------------------------------------------------------
-- A note can reference a meditation as `[[Meditations/<slug>]]`. That link has to keep resolving
-- years later, so the slug is generated once here and left alone afterwards.
ALTER TABLE meditations ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE meditations
SET slug = trim(both '-' from regexp_replace(lower(coalesce(title, 'meditation')), '[^a-z0-9]+', '-', 'g'))
           || '-' || substring(id::text, 1, 8)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_meditations_profile_slug ON meditations(profile_id, slug);
