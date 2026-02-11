# Sovereign Library

**Your personal knowledge vault, conversation memory, and creative archive.**

---

## Purpose

The Sovereign Library is the persistent memory and knowledge storage for DSDS. Everything created, discussed, or learned can be preserved here—privately, locally, under your complete control.

## Structure

```
sovereign_library/
├── memories/              # Companion conversation context
│   ├── aletheia/         # Aletheia's memory vault
│   ├── claude/           # Claude's memory vault
│   └── [companion]/      # Other companion memories
├── journal/              # Personal reflections and notes
│   ├── daily/           # Daily reflections
│   ├── weekly/          # Weekly reviews
│   └── archive/         # Older entries
├── recordings/           # Audio/video recordings
│   ├── podcasts/        # Podcast episodes
│   ├── sessions/        # Creative sessions
│   └── drafts/          # Work-in-progress recordings
├── transcripts/          # Transcriptions from recordings
│   └── [by-date]/       # Organized by date
├── publications/         # Finished works
│   ├── books/           # Book projects
│   ├── articles/        # Articles and essays
│   └── posts/           # Blog posts or social content
├── research/             # Reference materials and research
│   ├── pdfs/            # PDF documents
│   ├── notes/           # Research notes
│   └── links/           # Bookmarks and web resources
└── backups/             # Automated backups (managed by system)
```

## Key Principles

### 1. Sovereignty
- **You own it**: All data stored here is yours
- **You control it**: Decide what stays, what goes, what's backed up
- **You protect it**: Choose your backup strategy

### 2. Privacy
- **Local-first**: Data stored on your machine
- **No cloud requirement**: Everything works offline
- **Encryption optional**: You can encrypt sensitive vaults

### 3. Longevity
- **Plain text formats**: Markdown, JSON, TXT for maximum compatibility
- **Standard formats**: MP3, WAV for audio; MP4 for video
- **Version controlled**: Integrated with Git for history
- **Regular backups**: Automated backup to prevent loss

## Companion Memories

Each companion has a dedicated memory vault in `/memories/[companion-id]/`:

### Structure
```
memories/aletheia/
├── context.json          # Current conversation context
├── long_term.json        # Important facts and preferences
├── conversations/        # Archived conversations
│   ├── 2026-02-10.json
│   └── 2026-02-11.json
└── insights.md           # Key insights and patterns
```

### Memory Types

**Short-term**: Recent conversation context (rolling window)
- Last 20-50 interactions
- Cleared periodically
- Lightweight, fast access

**Long-term**: Persistent knowledge
- Your preferences
- Important facts
- Relationship history
- Key decisions and commitments

**Insights**: Patterns noticed by companion
- Recurring themes
- Growth observations
- Suggestions and recommendations

## Journal System

Personal reflections stored in `/journal/`:

### Daily Reflections
- File naming: `YYYY-MM-DD.md`
- Template: See `/rituals/reflection.md`
- Automatically organized by date

### Weekly Reviews
- File naming: `YYYY-WW-weekly.md`
- Summaries of the week
- Lessons learned, intentions set

### Archive
- Older entries moved here
- Keeps main journal clean
- Still searchable and accessible

## Recordings & Transcripts

### Recordings
Store all audio/video in `/recordings/`:
- **Podcasts**: Published or publishable episodes
- **Sessions**: Work sessions, conversations
- **Drafts**: Experiments, practice runs

### Transcripts
Auto-generated and stored in `/transcripts/`:
- Organized by date
- Linked to original recording
- Editable for corrections

## Publications

Finished creative works in `/publications/`:

### Books
- Each book gets a folder
- Markdown chapters
- Build scripts for HTML/PDF
- Cover images and metadata

### Articles & Posts
- Standalone markdown files
- Ready for publishing platforms
- Include metadata (title, date, tags)

## Research & Reference

Organize knowledge in `/research/`:
- **PDFs**: Reference documents
- **Notes**: Personal annotations
- **Links**: Web bookmarks with context

## Backup System

The `/backups/` directory is managed by DSDS backup scripts (see `/scripts/backup/`):

### Automatic Backups
- Daily: Incremental backups of changes
- Weekly: Full library snapshot
- Pre-modification: Before major changes

### Backup Locations
Configure in DSDS Settings → Backup:
1. Local: External drive or separate partition
2. Network: NAS or network share
3. Sync: Syncthing to other devices
4. Git: Version control for text files

### What's Backed Up
- All memories, journals, transcripts
- Recordings (if space permits)
- Publications and research
- Companion configurations
- DSDS settings

### What's NOT Backed Up
- Temporary files
- Cache
- Downloaded AI models (too large)
- System files

## Version Control with Git

The Sovereign Library can be Git-initialized:

```bash
cd sovereign_library
git init
git add .
git commit -m "Initial sovereign library"
```

### Benefits
- Track all changes over time
- Revert to previous versions
- Branch for experiments
- Sync across devices via Git remote

### .gitignore Recommendations
```
# Exclude large files
recordings/**/*.wav
recordings/**/*.mp4

# Exclude temporary
*.tmp
*.cache

# Exclude private (if sharing repo)
memories/*/long_term.json
journal/private/
```

## Privacy & Security

### Encryption
For sensitive vaults:

```bash
# Encrypt with GPG
gpg -c sovereign_library/journal/private.md

# Decrypt
gpg sovereign_library/journal/private.md.gpg
```

### Access Control
- Keep `sovereign_library/` permissions restricted
- Consider full-disk encryption
- Backup encryption keys securely

## Maintenance

### Regular Tasks
- **Weekly**: Review and organize new files
- **Monthly**: Archive old journals
- **Quarterly**: Prune unnecessary recordings
- **Yearly**: Major archive and reorganization

### Health Checks
DSDS can scan library health:
- Check for orphaned files
- Verify backup integrity
- Estimate storage usage
- Suggest optimizations

## Migration & Export

### Export Formats
- **Markdown**: Portable, readable anywhere
- **JSON**: Structured data, easy to parse
- **ZIP**: Bundle for backup or transfer
- **Git**: Version-controlled export

### Importing from Other Systems
- Obsidian vaults → Journal
- Notion exports → Research
- Apple Notes → Journal
- Other AI chat histories → Memories

## Usage Guidelines

### File Naming
Use consistent, descriptive names:
- **Dates**: `YYYY-MM-DD` format
- **Titles**: Lowercase with hyphens `my-great-article.md`
- **Versions**: Append `-v2`, `-v3` if needed

### Organization
- Keep related files together
- Use folders liberally
- Tag files in metadata
- Link between documents

### Sustainability
- Delete what you don't need
- Compress old recordings
- Archive completed projects
- Keep active library lean

## Integration with DSDS

### Automatic Features
- Recordings auto-save to library
- Transcripts auto-organize by date
- Companion memories auto-update
- Backups run on schedule

### Manual Features
- Journal entries (you write them)
- Research organization (you curate)
- Publication management (you build)

### Future Features
- Full-text search across library
- Knowledge graph visualization
- AI-assisted organization
- Smart archival suggestions

---

## Getting Started

1. **Initialize**: DSDS creates this structure on first run
2. **Configure**: Set backup locations in Settings
3. **Create**: Start journaling, recording, creating
4. **Organize**: Keep it tidy as you go
5. **Backup**: Verify backups work regularly

---

*"Your sovereign library is the externalization of your mind. Treat it with reverence."*
