# Licensed radio tracks

Place audio files you are licensed to use in this directory with these exact names:

- `360.mp3`
- `von-dutch.mp3`
- `apple.mp3`
- `club-classics.mp3`

Add the filenames you provide to `manifest.json`, for example:

```json
{
  "files": ["360.mp3", "von-dutch.mp3", "apple.mp3", "club-classics.mp3"]
}
```

The player plays each file once, then advances to the next available song like a radio. It does not loop one song forever.

If a file is missing, tapping that song opens the device audio picker. Selected files stay on the device for the current browser session and are never uploaded. MP3, M4A, AAC, WAV, OGG, Opus, and FLAC files are accepted when the browser supports them.

This project intentionally does not download or bundle commercial recordings. Add only audio you have permission to use.
