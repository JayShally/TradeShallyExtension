# Steam Trade History Logger (Week-1 MVP)

## Install
1. Open Chrome → `chrome://extensions`
2. Toggle **Developer mode** (top right)
3. **Load unpacked** → select this folder

## Use
- Log in to Steam in a normal tab.
- Visit `https://steamcommunity.com/my/inventoryhistory/`
    - (Also try `.../my/tradehistory/` and `.../my/tradeoffers/` Accepted tab)
- Open DevTools Console → entries appear as `[STHL entry] { ... }`
- Use the on-page “Steam Logger: ON/OFF” pill to toggle logging.

## Notes
- This MVP only *reads* and logs. No export, no network calls.
- If selectors drift, inspect a history block and adjust the query selectors in `content-script.js`.
