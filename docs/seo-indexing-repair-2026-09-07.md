# Search Console indexing repair — 2026-09-07

Google Search Console reported 35 `Not found (404)` URLs and seven pages excluded by an explicit `noindex` directive. The report was last updated on 2026-09-04 and first detected the new reasons on 2026-09-05.

The seven `noindex` examples are jurisdiction pages for the United States, mainland China, Hong Kong and Singapore. Their exclusion is intentional: FeeEye does not turn restricted-region availability pages into search landing pages.

The 404 examples were concentrated in `/where-to-buy/`. Daily CoinGecko snapshots use a moving Top 150 plus trending set, so a coin that left the current snapshot lost its generated page while Google still knew the older sitemap URL. The repair adds:

- an indexable bilingual `/where-to-buy/` directory;
- bilingual `noindex` availability-unavailable pages for known historical symbols, without archived prices, fees or exchange claims;
- an append-only coin URL registry maintained by future refreshes so a symbol leaving the active snapshot no longer becomes a 404;
- a regression test covering all 35 Search Console example paths and ensuring historical pages stay out of the sitemap.

The separate `refresh-coin-data` failure was not a CoinGecko collection failure. Data collection, offline validation, the candidate commit and the dedicated branch push succeeded. The final PR step failed because the repository setting does not currently permit GitHub Actions to create pull requests. Enabling that repository permission is a separate access-control change and is not performed by this code repair.

## 2026-09-09 follow-up

After the permission was enabled, the next candidate introduced the legitimate ticker `INDEX`. Its historical symbol-based route collided with the reserved directory file `/where-to-buy/index.html`, and the Phase 27 regression test correctly stopped the refresh before commit or deployment. Phase 27b maps only that reserved ticker to `/where-to-buy/index-token`; all existing coin URLs remain unchanged.

The Phase 27 post-deployment bilingual check also observed one stale `release.json` response immediately after an exact deployment receipt. Phase 27b adds a bounded cache-busted stability check: at most three release reads, followed by the same fail-closed bilingual verification. A permanently mismatched build or revision is still rejected.
