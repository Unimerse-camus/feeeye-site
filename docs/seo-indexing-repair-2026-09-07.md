# Search Console indexing repair — 2026-09-07

Google Search Console reported 35 `Not found (404)` URLs and seven pages excluded by an explicit `noindex` directive. The report was last updated on 2026-09-04 and first detected the new reasons on 2026-09-05.

The seven `noindex` examples are jurisdiction pages for the United States, mainland China, Hong Kong and Singapore. Their exclusion is intentional: FeeEye does not turn restricted-region availability pages into search landing pages.

The 404 examples were concentrated in `/where-to-buy/`. Daily CoinGecko snapshots use a moving Top 150 plus trending set, so a coin that left the current snapshot lost its generated page while Google still knew the older sitemap URL. The repair adds:

- an indexable bilingual `/where-to-buy/` directory;
- bilingual `noindex` availability-unavailable pages for known historical symbols, without archived prices, fees or exchange claims;
- an append-only coin URL registry maintained by future refreshes so a symbol leaving the active snapshot no longer becomes a 404;
- a regression test covering all 35 Search Console example paths and ensuring historical pages stay out of the sitemap.

The separate `refresh-coin-data` failure was not a CoinGecko collection failure. Data collection, offline validation, the candidate commit and the dedicated branch push succeeded. The final PR step failed because the repository setting does not currently permit GitHub Actions to create pull requests. Enabling that repository permission is a separate access-control change and is not performed by this code repair.
