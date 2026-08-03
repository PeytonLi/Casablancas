# Licensed radio tracks

Place audio files you are licensed to use in this directory with these exact names:

- `360.mp3`
- `von-dutch.mp3`
- `apple.mp3`
- `club-classics.mp3`
- `b2b.mp3`
- `talk-talk.mp3`
- `guess.mp3`
- `365.mp3`

Add only the filenames you provide to the `files` list in `manifest.json`.
The `optionalFiles` list records the complete supported catalog:

```json
{
  "files": ["360.mp3", "von-dutch.mp3"],
  "optionalFiles": ["360.mp3", "von-dutch.mp3", "apple.mp3", "club-classics.mp3", "b2b.mp3", "talk-talk.mp3", "guess.mp3", "365.mp3"]
}
```

The player plays each file once, then advances to the next available song like a radio. It does not loop one song forever.

If a file is missing, the player automatically uses its built-in original arrangement. It never opens an upload picker.

This project intentionally does not download or bundle commercial recordings. Add only audio you have permission to use.
