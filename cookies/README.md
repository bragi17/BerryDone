# Cookies Directory

This directory stores VGen authentication cookies required for data synchronization.

## Setup

1. Install the [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie) browser extension
2. Log in to [VGen.co](https://vgen.co)
3. Click the EditThisCookie icon and export cookies
4. Save the exported JSON file as `fur31mu.json` in this directory

## File Structure

```
cookies/
└── fur31mu.json  (Required - Your VGen cookies)
```

## Security Notice

⚠️ **IMPORTANT**: Cookie files contain sensitive authentication data.
- Never commit cookie files to version control
- Keep your cookies secure and private
- Cookies are already ignored by `.gitignore`

## Cookie Expiration

VGen cookies may expire after some time. If you encounter authentication errors:
1. Re-export fresh cookies from your browser
2. Replace the old `fur31mu.json` file
3. Try syncing again
