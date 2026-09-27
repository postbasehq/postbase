/*
 * Image and video specs per network for /tools/social-media-image-sizes.
 * Checked against each network's own help pages and developer docs on
 * 27 September 2026 (sources listed per network). Where the app and the API
 * differ, the note says so, since that matters for schedulers.
 */

export type Spec = { label: string; size: string; ratio?: [number, number]; note?: string };

export type NetworkSpecs = {
  id: string;
  name: string;
  images: Spec[];
  video: Spec[];
  limits: string[];
  sources: { label: string; url: string }[];
};

export const SPECS: NetworkSpecs[] = [
  {
    id: "instagram",
    name: "Instagram",
    images: [
      { label: "Square post", size: "1080 × 1080", ratio: [1, 1] },
      { label: "Portrait post", size: "1080 × 1350", ratio: [4, 5], note: "Tallest feed ratio (4:5)" },
      { label: "Landscape post", size: "1080 × 566", ratio: [191, 100], note: "Widest feed ratio (1.91:1)" },
      { label: "Story", size: "1080 × 1920", ratio: [9, 16] },
    ],
    video: [
      { label: "Reel", size: "1080 × 1920", ratio: [9, 16], note: "3 s to 15 min via the API, MP4 or MOV, up to 300 MB" },
      { label: "Story video", size: "1080 × 1920", ratio: [9, 16], note: "3–60 s, up to 100 MB (API)" },
    ],
    limits: [
      "Up to 20 photos or videos per carousel in the app (10 via the API)",
      "API images: JPEG only, up to 8 MB, 320–1440 px wide",
      "Feed aspect ratios between 1.91:1 and 4:5",
    ],
    sources: [
      { label: "Instagram image sizes", url: "https://help.instagram.com/1631821640426723" },
      { label: "Instagram API media", url: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media" },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    images: [{ label: "Photo post", size: "1080 × 1920", ratio: [9, 16], note: "JPEG or WebP, up to 1080p, 20 MB each" }],
    video: [
      { label: "Video", size: "1080 × 1920", ratio: [9, 16], note: "MP4 (recommended), MOV or WebM" },
      { label: "Via the API", size: "up to 10 min", note: "Up to 4 GB, 23–60 fps, 360–4096 px per side" },
    ],
    limits: ["Photo posts: up to 35 images", "Caption: up to 2,200 characters", "Some creators are limited to 3, 5 or 10 minutes via the API"],
    sources: [{ label: "TikTok media transfer guide", url: "https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide" }],
  },
  {
    id: "youtube",
    name: "YouTube",
    images: [
      { label: "Thumbnail", size: "1280 × 720 or larger", ratio: [16, 9], note: "Up to 3840 × 2160; 2 MB from mobile, 50 MB from desktop" },
      { label: "Shorts thumbnail", size: "2160 × 3840", ratio: [9, 16] },
      { label: "Channel banner", size: "2560 × 1440", ratio: [16, 9], note: "Keep text in the 1235 × 338 safe area; up to 6 MB" },
      { label: "Profile picture", size: "800 × 800 (common)", ratio: [1, 1], note: "Square, under 1 MB" },
    ],
    video: [
      { label: "Standard video", size: "1920 × 1080", ratio: [16, 9] },
      { label: "Short", size: "1080 × 1920", ratio: [9, 16], note: "Square or vertical, up to 3 minutes" },
    ],
    limits: ["Title: up to 100 characters", "Description: up to 5,000 bytes", "Upload size: up to 256 GB via the API"],
    sources: [
      { label: "Thumbnails", url: "https://support.google.com/youtube/answer/72431" },
      { label: "Banner and profile", url: "https://support.google.com/youtube/answer/10456525" },
      { label: "Shorts", url: "https://support.google.com/youtube/answer/15424877" },
    ],
  },
  {
    id: "x",
    name: "X",
    images: [
      { label: "In-post image", size: "1600 × 900", ratio: [16, 9], note: "Common choice; up to 5 MB, JPG, PNG, GIF or WEBP" },
      { label: "Header", size: "1500 × 500", ratio: [3, 1] },
      { label: "Profile photo", size: "400 × 400", ratio: [1, 1], note: "Up to 2 MB" },
    ],
    video: [
      { label: "Video", size: "1920 × 1080", ratio: [16, 9], note: "Aspect ratio 1:3 to 3:1, H.264 + AAC" },
      { label: "Length", size: "up to 20 min", note: "Via the API, up to 8 GB (Premium: 125 min, 16 GB). In the app: 140 s for non-Premium" },
    ],
    limits: ["Up to 4 images, or 1 GIF, or 1 video per post", "Animated GIFs up to 15 MB", "280 characters per post (links count as 23)"],
    sources: [
      { label: "X media best practices", url: "https://docs.x.com/x-api/media/quickstart/best-practices" },
      { label: "X videos", url: "https://help.x.com/en/using-x/x-videos" },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    images: [
      { label: "Post image", size: "1080 wide", ratio: [1, 1], note: "At least 552 × 276; ratios from 3:1 to 4:5; up to 5 MB" },
      { label: "Link preview image", size: "1200 × 627", ratio: [191, 100] },
      { label: "Profile background", size: "1584 × 396", ratio: [4, 1], note: "Under 8 MB" },
      { label: "Company page cover", size: "1512 × 256", ratio: [59, 10], note: "LinkedIn's current figure (up to 3 MB)" },
      { label: "Company logo", size: "400 × 400", ratio: [1, 1] },
    ],
    video: [{ label: "Video", size: "256 × 144 to 4096 × 2304", note: "3 s to 10 min (15 min on desktop), up to 5 GB, MP4" }],
    limits: ["Up to 20 images per post", "Documents (PDF, PPT, DOC) up to 300 pages", "3,000 characters per post"],
    sources: [
      { label: "Post images", url: "https://www.linkedin.com/help/linkedin/answer/a527229" },
      { label: "Page images", url: "https://www.linkedin.com/help/linkedin/answer/a563309" },
      { label: "Video specs", url: "https://www.linkedin.com/help/linkedin/answer/a1311816" },
    ],
  },
  {
    id: "facebook",
    name: "Facebook",
    images: [
      { label: "Feed image", size: "1440 × 1800", ratio: [4, 5], note: "Ratios from 1.91:1 to 4:5 work in the feed" },
      { label: "Page cover", size: "820 × 312", ratio: [205, 78], note: "Display size on desktop" },
      { label: "Profile picture", size: "320 × 320", ratio: [1, 1], note: "Minimum upload size" },
    ],
    video: [{ label: "Reel", size: "1080 × 1920", ratio: [9, 16], note: "3–90 s via the API, MP4, 24–60 fps" }],
    limits: ["Feed images up to 30 MB", "Long videos up to 4 hours and 10 GB"],
    sources: [
      { label: "Feed image specs", url: "https://www.facebook.com/business/ads-guide/update/image/facebook-feed" },
      { label: "Reels publishing", url: "https://developers.facebook.com/docs/video-api/guides/reels-publishing" },
    ],
  },
  {
    id: "threads",
    name: "Threads",
    images: [{ label: "Image", size: "1440 wide", note: "JPEG or PNG, up to 8 MB, 320–1440 px wide" }],
    video: [{ label: "Video", size: "1080 × 1920", ratio: [9, 16], note: "Up to 5 min and 1 GB, MP4 or MOV" }],
    limits: ["Carousels of 2–20 items", "500 characters per post"],
    sources: [{ label: "Threads API", url: "https://developers.facebook.com/docs/threads/overview" }],
  },
  {
    id: "bluesky",
    name: "Bluesky",
    images: [{ label: "Image", size: "up to 2 MB", note: "Up to 4 per post; add alt text" }],
    video: [{ label: "Video", size: "up to 10 min", note: "MP4, up to 300 MB (raised in August 2026 from 3 min)" }],
    limits: ["300 characters per post", "Links need to be marked up to be clickable (schedulers do this for you)"],
    sources: [
      { label: "Image lexicon", url: "https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/embed/images.json" },
      { label: "Video lexicon", url: "https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/embed/video.json" },
    ],
  },
  {
    id: "mastodon",
    name: "Mastodon",
    images: [{ label: "Image", size: "up to 16 MB", note: "Up to 33 megapixels; JPEG, PNG, GIF or WEBP" }],
    video: [{ label: "Video", size: "up to 99 MB", note: "Up to about 3840 × 2160; MP4, WebM or MOV" }],
    limits: ["Up to 4 attachments per post", "500 characters per post", "Figures are mastodon.social's; other instances can differ"],
    sources: [{ label: "mastodon.social instance config", url: "https://mastodon.social/api/v2/instance" }],
  },
];
