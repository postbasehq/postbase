-- Add Mastodon as a supported channel platform.
alter type platform add value if not exists 'mastodon';
