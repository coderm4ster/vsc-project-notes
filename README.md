# Project Notes

A VS Code extension that provides a workspace-specific notes panel. Keep your project notes organized and always within reach, directly in the editor.

## Features

- **Workspace-scoped notes** – each workspace has its own independent note list
- **Create, rename, and delete notes** – full note lifecycle management from the Activity Bar
- **Rich note editor** – opens notes in a dedicated webview panel
- **Persistent storage** – notes are saved per workspace and survive editor restarts

## Usage

1. Click the **Project Notes** icon in the Activity Bar (notepad icon)
2. Use the **+** button to create a new note
3. Click a note to open it in the editor
4. Hover a note to access **rename** and **delete** actions

## Requirements

No external dependencies. Works out of the box with any VS Code workspace.

## Extension Settings

This extension does not contribute any settings at this time.

## Release Notes

### 1.0.1

- Fixed: `noteEditor.html` was missing from the published extension package (caused `ENOENT` errors in remote/SSH environments)
- Improvement: the editor template is now compiled into the extension bundle instead of being read from disk at runtime
- Improvement: auto-save now only triggers when the content has actually changed, eliminating unnecessary saves

### 1.0.0

Initial release of Project Notes.

---

**Enjoy taking notes!**
