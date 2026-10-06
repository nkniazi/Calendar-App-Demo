# Etsy listing images & video

Outputs (upload these to Etsy):
- `etsy-images/` — 10 listing photos, 3000x2250 (4:3) JPG. Upload in file-name order; `t01-hero.jpg` is the thumbnail.
- `etsy-video/lifebalance-etsy-15s.mp4` — 15 s, 1440x1080, no sound.

Rebuild after changing the planner (run from the project root):
1. `npm run build:etsy` — rebuild the planner first
2. `node scripts/marketing/capture.js` — fresh screenshots into `marketing/raw/` (sample data, fixed date)
3. `node scripts/marketing/render-tiles.js` — images from `marketing/tiles/tiles.html`
4. `node scripts/marketing/render-video.js` — video from `marketing/tiles/video.html` (needs ffmpeg in `marketing/.tools`: `cd marketing/.tools && npm install ffmpeg-static`)

Edit headlines and layout in `marketing/tiles/tiles.html` and `video.html`.
