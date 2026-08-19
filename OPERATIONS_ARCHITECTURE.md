# LAYO GLOBAL OPERATIONS ARCHITECTURE & STANDARD OPERATING PROCEDURE (SOP)
## 2-Hub Bulk Injection Logistics Network (India Hub ➔ Canada Hub ➔ Local Doorstep)

---

## 1. Executive Summary & Core Operational Logic
Layo operates a high-efficiency **2-Hub Bulk Consolidation & Last-Mile Injection** cross-border network connecting India to Canada:
1. **India Hub (Delhi NCR):** Domestic parcel intake from Indian merchants (Myntra, Ajio, Amazon, Nykaa, Boutiques) or personal drop-offs, customer listing matching, unboxing & physical QC, volumetric optimization as per Layo SOP, and bulk consolidation into Master Air Cargo Crates.
2. **Bulk Air Freight (DEL ➔ YYZ):** Master Cargo Crates are airfreighted in bulk (50kg–200kg pallets) at wholesale air cargo rates, slashing cross-border freight costs by 60–80%.
3. **Canada Hub (Toronto GTA):** Layo Canadian operations executive receives the Master Crate, de-consolidates individual customer boxes, attaches local shipping labels, and hands over to Canadian domestic carriers (Canada Post, Purolator, UPS, UniUni) for final doorstep delivery.

---

## 2. The 7 Operational Lifecycle Stages

```
[STAGE 1: DRAFT / PAID] ──► Customer creates booking & places domestic order to India Hub
           │
           ▼
[STAGE 2: RECEIVED_INDIA] ──► Inward scan at Layo India Hub (Delhi NCR)
           │
           ▼
[STAGE 3: QC_REPACKED] ──► Physical item matching against listing, photos, Layo SOP repack
           │
           ▼
[STAGE 4: BULK_CONSOLIDATED] ──► Combined with other orders into Master Air Cargo Box (e.g. CA-101)
           │
           ▼
[STAGE 5: AIRFREIGHT_CANADA] ──► Flight in transit from Delhi (DEL) to Toronto (YYZ)
           │
           ▼
[STAGE 6: RECEIVED_CANADA] ──► Received at Layo Canada Hub (Toronto), de-consolidated
           │
           ▼
[STAGE 7: OUT_FOR_DELIVERY / DELIVERED] ──► Canadian local carrier dispatch (Canada Post/Purolator)
```

---

## 3. Standard Operating Procedures (SOP)

### A. Layo India Hub SOP (Delhi NCR)
1. **Intake & Inward Verification:**
   - Scan courier tracking barcode or enter 4-digit customer Locker ID (e.g. `#7892`).
   - Match incoming merchant package against customer's active locker record.
2. **Unboxing & Customer Listing Match (QC):**
   - Open domestic merchant packaging on the clean inspection table.
   - Match each physical garment/item against the customer's declared in-app checklist.
   - Take 1–2 high-resolution unboxing photos using the mobile viewfinder in `/ops`.
   - Inspect for stains, tears, missing items, or prohibited liquids. (If found, tap `Flag Discrepancy`).
3. **Layo Volumetric Repack (SOP):**
   - Discard heavy merchant cardboard, excessive plastic fillers, and duplicate outer boxes.
   - Neatly fold and vacuum/seal items inside a standard branded **Layo Green Box** (`Box S`, `Box M`, or `Box L`).
   - Weigh on digital scale and record verified gross weight in kg.
4. **Master Cargo Consolidation (Bulk Boxing):**
   - Assign the individual customer box to an active **Master Air Cargo Box** (e.g. `BATCH-CA-801`).
   - Once the Master Box reaches target weight (e.g. 50 kg), seal the pallet and generate the Master Air Cargo Manifest.

---

### B. Layo Canada Hub SOP (Toronto GTA)
1. **Master Box Intake & Customs Clearance:**
   - Receive the bulk Master Cargo Crate from the airline cargo terminal at Pearson Airport (YYZ).
   - Inward the Master Crate in `/ops` under the Canada Hub view.
2. **De-consolidation & Sorting:**
   - Open the Master Crate and sort individual customer Layo Green Boxes by Canadian delivery zones (GTA, Vancouver, Calgary, Montreal, etc.).
3. **Last-Mile Carrier Injection:**
   - Generate and attach local Canadian carrier shipping labels:
     - **Canada Post Expedited Parcel** (Standard national delivery)
     - **Purolator Ground / Express** (Fast regional delivery)
     - **UniUni / Swift** (High-density GTA/Metro doorstep delivery)
   - Scan local Canadian AWB into `/ops` and hand off to the courier driver.
   - Customer automatically receives the local Canadian tracking link.

---

## 4. Zero-Hardware ₹0 Lean Technology Stack
- **Camera Scanning:** In-browser WebRTC viewfinder on any smartphone or tablet.
- **Search:** 4-digit Locker ID instant search bar.
- **Scale:** Standard floor scale with manual digital weight input into `/ops`.
- **Labels:** Standard A4 or 4x6 thermal printer for local carrier labels.
- **Portals:**
  - Customer Locker: `/dashboard` & `/tracking`
  - Floor Operations (India & Canada Hubs): `/ops` & `/ops/login`
  - Master Admin Console: `/admin` & `/admin/login`
