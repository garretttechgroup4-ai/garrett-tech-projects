# Field map — property card ↔ PropertyRadar

Request only these fields. Names marked **confirm** must be checked against the PropertyRadar API Reference ("Fields" list on `POST /v1/properties`) before Phase 1 ships; search criteria names and returned field names are not always identical.

| Property card field | PropertyRadar criteria / field | Notes |
| --- | --- | --- |
| Address, ZIP | `Address`, `ZipFive` | |
| Cook County PIN | `APN` | Links to Cook County Clerk recordings |
| Map pin | latitude / longitude — **confirm** | Stored as PostGIS point |
| Property type, units | `PropertyType`, `Units` | |
| Year built / age | `YearBuilt`, `PropertyAge` | |
| Building sq ft | `SqFt` | |
| Lot size | `LotSize` | Width estimated as LotSize ÷ 125, labeled "estimated" |
| Estimated value | `AVM` | Prefilter: $700K+ |
| Equity $ / % | `AvailableEquity`, `EquityPercent` | |
| Open loans / balance | `NumberLoans`, `TotalLoanBalance` | |
| First loan date, amount, purpose | `FirstDate`, `FirstAmount`, `FirstPurpose` | Reverse mortgage visible here |
| Last sale date / price | last transfer fields — **confirm** | Drives "owned 15+ years" |
| Properties owner holds | `NumberPropertiesOwned` | |
| Owner mailing state | `OwnerState`; `isSameState` | Out-of-state flag |
| Vacant | `isSiteVacant` | |
| Distress flags | `inDistress` values: `isExpiredListing`, `isCodeEnforcement`, `isDeceasedProperty`, `inProbateProperty`, `isDeceasedJointTenant`, `isOutOfStateOwner` | |
| Liens | `PropertyHasOpenLiens`, `PropertyHasOpenPersonLiens`, `PropertyOpenLiens` | |
| Divorce | `inDivorce` | Flag only |
| Likely to list | `LikelyListingScore` | |
| Owner age | `Age` | Off until attorney review |
| Owners & relatives | property persons endpoint — **confirm path** | Name, role, age |
| Phones | phone purchase per person — **confirm path** | Line type, status, DNC, litigator flags |

**Never request:** Ethnicity, Gender, MaritalStatus, PresenceOfChildren, ChildAge, AdultChildrenAtHome, Language, Interests, Giving, Religion, Education, Income, Networth, OccupationGroup, BirthMonth.

## Not from PropertyRadar
- **Street / aerial view:** Google Maps Embed or Static Street View, shown live on the card (not stored).
- **Recordings:** deep link to Cook County Clerk search with the PIN.
- **Teardown flag:** Claude vision review of the live image + a person's confirmation (Phase 2).
- **Nearby high sales:** PropertyRadar comparables/transactions near the parcel (Phase 2).
