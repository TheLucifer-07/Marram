# ADR 0001: Product name: Marram

**Decision.** The product is named **Marram** (pronounced "MARR-um"). History: Barnraise, then Rafter, then Marram. Rafter was withdrawn at the owner's request because the name already has software and brand usage.

## Why Marram

Marram grass grows on coastal dunes. Its roots and runners bind shifting sand into stable ground. That is the product's job for a small team: plans, people and priorities keep shifting, and Marram gives them one structure that holds, with a named owner for every task and a record nobody can quietly rewrite.

- **Pronunciation and spelling:** two syllables. The one risk is the double "r", so some people will type "Maram". Keep that in mind for search and domains (see below).
- **Tagline:** Hold the work together.
- **Personality:** calm, practical, grounded.
- **Logo:** three grass blades rising from one root point, the tallest in amber.
- **Positioning:** clear ownership and honest progress for teams of roughly 3 to 30; simpler than an enterprise suite, stricter than a spreadsheet.

## Screening performed (and its limits)

About 100 candidate words were generated and screened. Most real words fail immediately: npm, PyPI and GitHub already hold them (for example Cairn, Plinth, Gantry, Tiller, Kestrel, Quorum, Wharf, Larch, Alder, Sorrel). Truss, Joist and Tenon were rejected earlier for existing software products. Rafter was rejected by the owner.

| Check | Marram | Evidence and limit |
|---|---|---|
| npm registry | No package named `marram` | Registry lookup. Not a trademark signal |
| PyPI | No project named `marram` | Registry lookup |
| GitHub repository names containing "marram" | About 68 | GitHub search API. Mostly unrelated; not reviewed one by one |
| Web search for software or SaaS called Marram | No project, task or workflow software found | One standard search. Hits were unrelated: a New Zealand holiday-accommodation company, a beauty and retail startup (marramco.com), an investment firm, a Swiss studio, a music album, a UK housing address. Search results are not exhaustive |
| Dictionary | A coarse grass that stabilizes coastal dunes | Common-word status helps, but means the name is descriptive-adjacent in some trades |

**Not verified, and not claimed:**

- **Domains.** DNS and registrar lookups are not reachable from the authoring environment. Do **not** assume `marram.com`, `marram.app`, `marram.io` or `getmarram.com` are available. Several of the businesses above likely hold `marram` domains.
- **Trademarks.** No USPTO, EUIPO, WIPO or Indian trademark register search was possible. Marram is in use as a mark in other fields (accommodation, retail, finance). Whether it conflicts in software classes (Nice class 9, 42, 45) needs a professional clearance search.
- **App stores and social handles.** Not checked.

**Recommended before public launch:** (1) professional trademark clearance in your target markets, (2) check domain, app-store and social-handle availability, (3) decide on a fallback domain such as `usemarram.com`, `marram.team` or `marramhq.com`, subject to availability.

If clearance fails, the rename is mechanical: the brand string appears in the frontend copy, the Java package `com.marram`, the database name and the documentation, and a repository-wide replace plus renaming the `com/marram` directories covers it.
