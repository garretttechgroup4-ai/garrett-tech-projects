# Field map — PropertyRadar → Deal Finder `Property`

The app's one normalized shape is `Property` in `lib/types.ts`. Every
PropertyRadar field is translated in exactly one place:
`lib/sources/propertyradar.ts#normalize`.

**Status key**
- **ok** — Deal Finder internal; no external dependency.
- **confirm** — best-known PropertyRadar name, *not yet verified against the
  live API*. PropertyRadar's docs were not reachable from the build machine,
  so every PropertyRadar name below is unverified until the first live call.
  Run Phase 1's "API check" (`/api/propertyradar/explore`) with the real key
  and correct this table plus `normalize()` from the actual response.

## API mechanics

| Item | Assumed value | Status |
|---|---|---|
| Base URL | `https://api.propertyradar.com/v1` | confirm |
| Auth | `Authorization: Bearer <PROPERTYRADAR_API>` | confirm |
| Search endpoint | `POST /properties` with body `{ "Criteria": [ { "name": ..., "value": [...] } ] }` | confirm |
| Paging / fields | query `Fields=...&Limit=...&Start=...` | confirm |
| Free count (no purchase) | query `Purchase=0`; count read from `resultCount` (fallback `totalResultCount`) | confirm |
| Purchase records | query `Purchase=1`; charges per record — confirm whether re-downloading the same RadarID is free | confirm |
| Area criterion | Polygon/shape criterion name unknown. App currently sends a lat/lng **bounding box** (`Latitude` / `Longitude` ranges) and trims to the exact drawn shape locally. If a polygon criterion exists, switch to it so the preview count is exact and no records outside the shape are bought. | confirm |
| Rate limits | unknown | confirm |
| Lists endpoint (used by API check) | `GET /lists` | confirm |

## Property fields

| `Property` field | PropertyRadar field | Status |
|---|---|---|
| `id` | `RadarID` (prefixed `pr_`) | confirm |
| `address` | `Address` | confirm |
| `city` / `state` / `zip` | `City` / `State` / `ZipFive` | confirm |
| `lat` / `lng` | `Latitude` / `Longitude` | confirm |
| `propertyType` | `PType` (SFR, MFR, CND, …) → mapped to plain words | confirm |
| `beds` / `baths` | `Beds` / `Baths` | confirm |
| `sqft` / `lotSqft` | `SqFt` / `LotSize` | confirm |
| `yearBuilt` | `YearBuilt` | confirm |
| `estimatedValue` | `AVM` | confirm |
| `equityAmount` | `AvailableEquity` | confirm |
| `equityPercent` | `EquityPercent` | confirm |
| `lastSaleDate` / `lastSalePrice` | `LastTransferRecDate` / `LastTransferValue` | confirm |
| `ownerName` | `Owner` (fallback `OwnerFirstName` + `OwnerLastName`) | confirm |
| `ownerMailingAddress` | `MailAddress`, `MailCity`, `MailState`, `MailZip` | confirm |
| `ownerOccupied` | `isSameMailingOrExempt` / `OwnerOccupied` | confirm |
| `listedForSale` | `isListedForSale` | confirm |
| `raw` | full original record, stored for re-mapping | ok |

## Signals (from `config/scoring.json`)

| Signal id | Derived from | Status |
|---|---|---|
| `pre_foreclosure` | `inForeclosure` = 1 or `ForeclosureStage` present | confirm |
| `tax_delinquent` | `inTaxDelinquency` = 1 | confirm |
| `probate` | `isDeceasedProperty` = 1 or `inProbate` = 1 | confirm |
| `divorce` | `inDivorce` = 1 | confirm |
| `bankruptcy` | `inBankruptcy` = 1 | confirm |
| `liens` | `hasLiens` = 1 or `LienCount` > 0 | confirm |
| `vacant` | `isVacant` = 1 | confirm |
| `absentee_owner` | owner not occupying (see `ownerOccupied`) | confirm |
| `out_of_state_owner` | `MailState` ≠ property `State` | confirm (derived) |
| `high_equity` | `EquityPercent` ≥ threshold in config | confirm (derived) |
| `free_and_clear` | `isFreeAndClear` = 1 or `TotalLoanBalance` = 0 | confirm |
| `long_term_owner` | years since `LastTransferRecDate` ≥ threshold | confirm (derived) |

## Demo data

`data/demo-properties.json` is already in the normalized `Property` shape
(25 fake records in Bucktown and Wicker Park, every signal covered at least
twice). Owner names are fictional.
