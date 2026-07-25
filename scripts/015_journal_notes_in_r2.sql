-- Moves note bodies out of Postgres and into R2, leaving the table as an index.
--
-- Each note becomes a markdown file at {user_id}/notes/{slug}.md carrying full YAML
-- frontmatter, so this table stops being the source of truth and becomes a cache of what the
-- files already say. That is the point: the index can be rebuilt by listing the bucket, which
-- is what makes a later move off Postgres a re-import rather than a data migration.
--
-- Nothing is dropped here. `content_md` is kept in sync alongside the file so existing notes
-- keep working and there is a fallback if a read from storage fails; it can be dropped once
-- every row has a note_key.

-- R2 object key for this note's markdown file. NULL means the body still lives in content_md.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS note_key TEXT;

-- Denormalised list preview, so rendering the note list never needs to read from storage.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS preview TEXT;

CREATE INDEX IF NOT EXISTS idx_journal_entries_note_key ON journal_entries(note_key);

-- Attachments move under {user_id}/attachments/ so that `![[attachments/x.jpg]]` inside a note
-- resolves against the same prefix once the bucket is treated as a vault.
COMMENT ON COLUMN journal_attachments.storage_key IS
  'R2 object key, {user_id}/attachments/{filename} for newly uploaded journal attachments.';
