# Tracking US, India, Russia & Iran government sources

## In the app

1. Open **Scraper → Sources → Library** tab.
2. Set language to **EN** (English) for the full set, or **HI** for **PIB India (Hindi)** only.
3. Tap the **Government** category chip (or choose channel **US Govt**, **India Govt**, **Russia Govt**, **Iran Govt** in the channel dropdown).
4. Click **+** on each feed you want, then switch to **Active** to run scrapes on your schedule.

Feeds are defined in `src/lib/source-library.ts` (search for `Government`).

## What’s included (RSS)

| Channel      | Examples |
|-------------|----------|
| **US Govt** | White House news, Defense.gov, DOJ news, NASA breaking |
| **India Govt** | PIB press releases (English + Hindi in library) |
| **Russia Govt** | Kremlin presidential news (English) |
| **Iran Govt** | IRNA English (official news agency) |

## If a feed fails (403, timeout, empty)

Some sites only allow requests from certain regions or block datacenter IPs. Options:

- Run the **backend** from a network that can reach that site (e.g. India for PIB).
- Use **Scraper → Add** and paste the same URL; try increasing retries on the backend if you add them.
- As a fallback, use **HTML listing** on the site’s public news index page (advanced — needs correct selectors).

## Adding more official pages

Use **Add** with type **RSS** when the site exposes `/feed/`, `/rss`, or an `.xml` link. You can copy the URL from the page source or “Subscribe / RSS” links.
