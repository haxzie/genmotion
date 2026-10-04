import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic } from "../components/ease";
import { withInter } from "../components/type";
import {
  COL_X, COL_W, bubble, thought, terminal, toolRow, prose, bullets, heading, codeCard, changeCard, table, layout, type Block,
} from "../components/transcript";

/**
 * Global f1042–f1141 (scene frame = global - 1042). Hard cut in after Send is clicked.
 * The agent's run streams in under the prompt and the page scrolls: slowly at first, then
 * whipping through tool calls, change sets and tables, easing out on the summary and tests.
 * A white wipe from the right clears it for the deployment diagram.
 */
const G0 = 1042;

const CSV = `AGENTS.md
accounts.csv
instructions.md
salesforce-governed-demo
AccountName,Website,Industry,Phone,BillingCity,BillingState,BillingCountry,AnnualRevenue,EmployeeCount,DesiredStatus,WarmReason,OwnerNote
Northwind Robotics,https://northwind-robotics.example,Manufacturing,+1-415-555-0101,San Francisco,CA,United States,12500000,180,Cold,Requested pricing for warehouse automation pilot,High-fit manufacturing account; warm after budget confirmation.
Bluebird Logistics,https://bluebird-logistics.example,Transportation,+1-312-555-0188,Chicago,IL,United States,8900000,95,Cold,Asked for integration options with existing dispatch system,Potential expansion account if operations team engages.
Acme Renewals Group,https://acme-renewals.example,Technology,+1-646-555-0134,New York,NY,United States,5400000,62,Cold,Responded to outbound sequence and booked discovery,Use as the primary warm-account demo record.
Pioneer Health Systems,https://pioneer-health.example,Healthcare,+1-617-555-0160,Boston,MA,United States,17600000,240,Cold,Downloaded compliance checklist,Needs careful messaging around security and auditability.
Canyon Retail Co,https://canyon-retail.example,Retail,+1-512-555-0199,Austin,TX,United States,3200000,48,Cold,Asked whether automation supports multi-location teams,Good candidate for a follow-up task when warmed.
Evergreen Energy Partners,https://evergreen-energy.example,Energy,+1-303-555-0116,Denver,CO,United States,22100000,310,Cold,Referred by existing customer,Architect should show routing/escalation automation on warm status.`;

const P = "salesforce-governed-demo/force-app/main/default";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fafbfc");
    fitCamera(camera, height, 50);

    const B: Block[] = [
      bubble("prompt-bubble", "Build a Salesforce warm-account automation. Use the Accounts in `accounts.csv` (here if u can show a nice rectangle with excel logo on side, it would be great!) as the source data. Create them in Salesforce and set each Account’s status to Cold. Then, build an Apex automation that runs when an Account changes from Cold to Warm. The automation should create a follow-up Task for the Account owner, avoid duplicate open follow-up Tasks, and include tests so the logic is easy to review."),
      thought("thought-1", 1),
      terminal("terminal-ls", "ls && cat accounts.csv 2>/dev/null | head -50", CSV),
      toolRow("read-agents", "Read", "read", "AGENTS.md"),
      thought("thought-2", 1),
      toolRow("tool-ls", "Tool", "ls", "force-app/"),
      terminal("terminal-find", "find salesforce-governed-demo -type f", [
        `${P}/classes/WarmAccountAutomationSelector.cls`, `${P}/classes/WarmAccountAutomationSelector.cls-meta.xml`,
        `${P}/classes/WarmAccountAutomationService.cls`, `${P}/classes/WarmAccountAutomationService.cls-meta.xml`,
        `${P}/triggers/AccountWarmStatusTrigger.trigger`, `${P}/triggers/AccountWarmStatusTrigger.trigger-meta.xml`,
      ].join("\n")),
      toolRow("read-skill", "Read", "read", ".limner/skills/salesforce/SKILL.md"),
      toolRow("read-service", "Read", "read", `${P}/classes/WarmAccountAutomationService.cls`),
      toolRow("read-selector", "Read", "read", `${P}/classes/WarmAccountAutomationSelector.cls`),
      toolRow("read-trigger", "Read", "read", `${P}/triggers/AccountWarmStatusTrigger.trigger`),
      thought("thought-3", 1),
      prose("check-connection", "Let me first check the Salesforce connection and confirm the Account.Rating field exists."),
      terminal("terminal-env", `env | grep -E "INSTANCE_URL|ACCESS_TOKEN" | sed 's/=.*/=<set>/'`, "ACCESS_TOKEN=<set>\nINSTANCE_URL=<set>"),
      terminal("terminal-describe", `curl -s "$INSTANCE_URL/services/data/v60.0/sobjects/Account/describe" -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -c "`, `import json,sys
d=json.load(sys.stdin)
for f in d['fields']:
    if f['name'] in ('Rating','Industry') or 'status' in f['name'].lower() or 'lifecycle' in f['name'].lower():
        print(f['name'], f['type'], [pv['value'] for pv in f.get('picklistValues',[])])
"

Industry picklist ['Agriculture', 'Apparel', 'Banking', 'Biotechnology', 'Chemicals', 'Communications', 'Construction', 'Consulting', 'Education', 'Electronics', 'Energy', 'Engineering', 'Entertainment', 'Environmental', 'Finance', 'Food & Beverage', 'Government', 'Healthcare', 'Hospitality', 'Insurance', 'Machinery', 'Manufacturing', 'Media', 'Not For Profit', 'Recreation', 'Retail', 'Shipping', 'Technology', 'Telecommunications', 'Transportation', 'Utilities', 'Other']
Rating picklist ['Hot', 'Warm', 'Cold']
CleanStatus picklist ['Matched', 'Different', 'Acknowledged', 'NotFound', 'Inactive', 'Pending', 'SelectMatch', 'Skipped']`),
      thought("thought-9", 9),
      prose("valid-connection", [{ t: "I've got a valid Salesforce connection, " }, { t: "Rating", mono: true }, { t: " supports " }, { t: "Cold / Warm", mono: true }, { t: ", and the CSV industries all match the standard picklist. Here's the source data:" }]),
      codeCard("accounts-table", `| accounts.csv  ─────────────────────────────────────────────
┌─────────┬───────────────────────────┬───────────────┬────────┬───────┐
│  ▓▓▓▓▓  │ Account                   │ Industry      │ Rev    │ Emp   │
│  ▓ X ▓  ├───────────────────────────┼───────────────┼────────┼───────┤
│  ▓▓▓▓▓  │ Northwind Robotics        │ Manufacturing │ $12.5M │ 180   │
│  Excel  │ Bluebird Logistics        │ Transportation│ $8.9M  │  95   │
│         │ Acme Renewals Group       │ Technology    │ $5.4M  │  62   │
│         │ Pioneer Health Systems    │ Healthcare    │ $17.6M │ 240   │
│         │ Canyon Retail Co          │ Retail        │ $3.2M  │  48   │
│         │ Evergreen Energy Partners │ Energy        │ $22.1M │ 310   │
└─────────┴───────────────────────────┴───────────────┴────────┴───────┘
6 rows • DesiredStatus = Cold • mapped to Account.Rating`),
      prose("stage-change-sets", "Now I'll stage 6 governed create change sets (one per Account, each with its own approval)."),
      codeCard("create-acme", `+ NEW   Account · Acme Renewals Group                         Before −0      After +11
Name            Acme Renewals Group
Website         https://acme-renewals.example
Industry        Technology
Phone           +1-646-555-0134
BillingCity     New York
BillingState    NY
BillingCountry  United States
AnnualRevenue   5400000
NumberOfEmployees  62
Rating          Cold
Description     Governed demo account imported by Assemble. Initial lifecycle status: Cold.
Later changes modified this record — reverting undoes them together.        ⏮ Revert to here`, false),
      prose("all-created", "All 6 accounts created. Now the bulk Cold confirmation update, followed by the Cold→Warm transition for the 3 designated Accounts."),
      thought("thought-4", 1),
      prose("already-cold", "They're already Cold from creation, so no-op — good. Moving to the Warm transition:"),
      changeCard("warm-change", "record update · 3 records", "Warm selected demo Accounts to trigger follow-up automation", [["Account", "Cold", "Warm"], ["Account", "Cold", "Warm"], ["Account", "Cold", "Warm"]]),
      prose("warm-applied", "Warm transition applied. Now I'll finish the Apex automation package — test class, all metadata sidecar files, package.xml, and the two architect markdown docs."),
      toolRow("write-test-meta", "Write", "write", `${P}/classes/WarmAccountAutomationServiceTest.cls-meta.xml`),
      toolRow("write-package", "Write", "write", "salesforce-governed-demo/manifest/package.xml"),
      toolRow("write-overview", "Write", "write", "salesforce-governed-demo/automation/warm-account-automation-overview.md", "ERROR"),
      toolRow("write-notes", "Write", "write", "salesforce-governed-demo/automation/warm-account-architect-notes.md"),
      terminal("terminal-sort", "find salesforce-governed-demo -type f | sort", [
        "salesforce-governed-demo/automation/warm-account-architect-notes.md", "salesforce-governed-demo/automation/warm-account-automation-overview.md",
        `${P}/classes/WarmAccountAutomationSelector.cls`, `${P}/classes/WarmAccountAutomationSelector.cls-meta.xml`,
        `${P}/classes/WarmAccountAutomationService.cls`, `${P}/classes/WarmAccountAutomationService.cls-meta.xml`,
        `${P}/classes/WarmAccountAutomationServiceTest.cls`, `${P}/classes/WarmAccountAutomationServiceTest.cls-meta.xml`,
        `${P}/triggers/AccountWarmStatusTrigger.trigger`, `${P}/triggers/AccountWarmStatusTrigger.trigger-meta.xml`,
        "salesforce-governed-demo/manifest/package.xml",
      ].join("\n")),
      prose("artifacts", "All artifacts in place. Quick verification of the warmed Accounts in the org:"),
      terminal("terminal-query", `curl -s "$INSTANCE_URL/services/data/v60.0/query?q=SELECT+Name,Rating,Industry,AnnualRevenue,NumberOfEmployees+FROM+Account+ORDER+BY+Rating,Name"`, `Name                         Rating  Industry           Revenue    Emp
----------------------------------------------------------------------
Acme Renewals Group          Warm    Technology         5400000     62
Evergreen Energy Partners    Warm    Energy            22100000    310
Northwind Robotics           Warm    Manufacturing     12500000    180
Bluebird Logistics           Cold    Transportation     8900000     95
Canyon Retail Co             Cold    Retail             3200000     48
Pioneer Health Systems       Cold    Healthcare        17600000    240`),
      prose("org-state", "Org state matches the plan. Here's the wrap-up."),
      heading("summary", "Summary"),
      heading("csv-to-sf", "CSV → Salesforce"),
      bullets("summary-list", [
        [{ t: "6 rows read from " }, { t: "accounts.csv", mono: true }, { t: ", all 6 Accounts created as governed change sets (approved & applied), each with " }, { t: "Rating=Cold", mono: true }, { t: " and a Description carrying the warm reason and owner note." }],
        [{ t: "Bulk \"confirm Cold\" update was a no-op (records were already Cold from creation) — no unnecessary DML." }],
        [{ t: "3 Accounts warmed in one governed update: " }, { t: "Acme Renewals Group, Evergreen Energy Partners, Northwind Robotics", bold: true }, { t: " — verified above via SOQL." }],
      ]),
      heading("governed-change-sets", "Governed change sets"),
      table("change-sets-table", ["Type", "Count", "Result"], [["Account creates", "6", "■ approved & applied"], ["Bulk Cold confirmation", "1", "■ no-op (no diff)"], ["Warm transition", "1", "✅ approved & applied"]], [38, 708, 981]),
      prose("reversible", "All are reversible from the Assemble timeline."),
      codeCard("tree", `force-app/main/default/
  triggers/AccountWarmStatusTrigger.trigger        # thin, delegates only
  classes/WarmAccountAutomationService.cls         # main logic, bulk-safe
  classes/WarmAccountAutomationSelector.cls        # centralized SOQL
  classes/WarmAccountAutomationServiceTest.cls     # 8 tests (see below)
  + matching *-meta.xml sidecars @ apiVersion 61.0
manifest/package.xml                               # deployable manifest
automation/warm-account-automation-overview.md     # business + trigger + dedup docs
automation/warm-account-architect-notes.md         # why Apex vs Flow, prod-hardening`),
      heading("behavior", "Behavior implemented"),
      bullets("behavior-list", [
        [{ t: "Detects " }, { t: "Cold → Warm", mono: true }, { t: " via a single " }, { t: "STATUS_FIELD", mono: true }, { t: " constant (swap " }, { t: "Rating", mono: true }, { t: " → " }, { t: "Lifecycle_Status__c", mono: true }, { t: " in one line)." }],
        [{ t: "Creates the required follow-up Task " }, { t: "Not Started", mono: true }, { t: ", " }, { t: "High", mono: true }, { t: ", owner-assigned, " }, { t: "today+2", mono: true }, { t: " )." }],
        [{ t: "Plus a " }, { t: "Strategic", bold: true }, { t: " Task if revenue ≥ $10M or employees ≥ 150 (would hit " }, { t: "Northwind", bold: true }, { t: " and " }, { t: "Evergreen", bold: true }, { t: " in the warmed set)." }],
        [{ t: "Plus a " }, { t: "Regulated-industry", bold: true }, { t: " Task for Healthcare / Financial Services / Energy / Government / Utilities (would hit " }, { t: "Evergreen", bold: true }, { t: ")." }],
        [{ t: "Duplicate prevention", bold: true }, { t: ": one bulked selector SOQL returns " }, { t: "Map<AccountId, Set<Subject>>", mono: true }, { t: "; the service skips inserts whose (Account, Subject) already has an open Task." }],
        [{ t: "One SOQL + one DML per transaction regardless of batch size (asserted by the bulk test)." }],
      ]),
      prose("tests-heading", [{ t: "Tests", bold: true }, { t: " in " }, { t: "WarmAccountAutomationServiceTest", mono: true }], 21, 26),
      bullets("tests-list", [
        [{ t: "Cold→Warm → 1 standard Task with expected fields." }], [{ t: "Warm→Warm → 0 Tasks." }], [{ t: "Cold→Cold → 0 Tasks." }],
        [{ t: "Strategic → standard + strategic." }], [{ t: "Healthcare → standard + regulated, industry appears in description." }],
        [{ t: "Pre-existing open Task → no duplicate." }], [{ t: "20-Account bulk → 20 Tasks, exactly 1 SOQL and 1 DML (via " }, { t: "Limits", mono: true }, { t: " )." }],
        [{ t: "Null/empty inputs → safe no-op." }],
      ], true),
      prose("metadata", [{ t: "Metadata inspection", bold: true }, { t: ": yes, I described the Account object via REST — " }, { t: "Rating", mono: true }, { t: " (Hot/Warm/Cold) and " }, { t: "Industry", mono: true }, { t: " in a sandbox to ship them." }], 21, 14),
      codeCard("deploy-cmd", "sf project deploy start -x manifest/package.xml -o <target>", false),
      prose("apex-deploy", [{ t: "picklists were confirmed before staging any writes. " }, { t: "Apex deployment", bold: true }, { t: ": not performed — I only have record-level governed tools in this run, not metadata deploy. The" }], 21, 24),
      prose("reverting", [{ t: "Reverting the record changes", bold: true }, { t: ": use the Assemble timeline — each of the 7 approved change sets (6 creates + 1 warm update) can be reverted individually. Reverting the warm update flips those 3 back to Cold; reverting the creates deletes the demo Accounts." }], 21, 30),
      toolRow("task-complete", "Tool", "task_complete", "Task marked complete: Created 6 Cold demo Accounts via individual governed change sets, warmed 3 via a governed update, and authored the full Apex automation"),
    ];
    const { tops } = layout(B);
    const doc = new THREE.Group();
    doc.name = "agent-transcript";
    scene.add(doc);
    for (const b of B) {
      b.mesh.position.set(rx(COL_X + COL_W / 2), ry(tops[b.id]! + b.h / 2), 0);
      doc.add(b.mesh);
    }

    // scroll: doc offset = screen y of the doc's top, pinned to anchors measured on the film
    const D = (id: string, screenY: number) => screenY - tops[id]!;
    const offset = glide([
      [1042, D("prompt-bubble", 330)], [1043, D("prompt-bubble", 298)], [1045, D("prompt-bubble", 216)],
      [1048, D("prompt-bubble", 136)], [1060, D("prompt-bubble", 77)], [1072, D("terminal-ls", 28)],
      [1084, D("thought-2", 117)], [1096, D("thought-9", 370)], [1108, D("org-state", 203)],
      [1114, D("behavior", 128)], [1126, D("tests-heading", 73)], [1142, D("tests-heading", 73)],
    ]);
    // streaming: the last blocks arrive on their own clock; the rest as they near the fold
    const LATE: Record<string, number> = { "tests-heading": 1115.5, "tests-list": 1117, metadata: 1119, "deploy-cmd": 1120, "apex-deploy": 1121, reverting: 1122, "task-complete": 1123.5 };
    const EARLY: Record<string, number> = { "prompt-bubble": 1041.5, "thought-1": 1044, "terminal-ls": 1046 };
    const firstSeen: Record<string, number> = {};
    // precompute when each block first crosses the fold (deterministic, frame-only)
    for (let f = 1042; f <= 1142; f++) {
      for (const b of B) {
        if (firstSeen[b.id] !== undefined) continue;
        const top = offset(f) + tops[b.id]!;
        if (top < 1000) firstSeen[b.id] = f - 1;
      }
    }

    // a white wipe from the right clears the page at the end
    const wipeTex = (() => {
      const c = new OffscreenCanvas(512, 4);
      const g = c.getContext("2d")!;
      const gr = g.createLinearGradient(0, 0, 512, 0);
      gr.addColorStop(0, "rgba(253,253,253,0)");
      gr.addColorStop(0.45, "rgba(253,253,253,1)");
      gr.addColorStop(1, "rgba(253,253,253,1)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 512, 4);
      const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const wipe = new THREE.Mesh(new THREE.PlaneGeometry(38.4, 10.8), new THREE.MeshBasicMaterial({ map: wipeTex, transparent: true, depthWrite: false, depthTest: false }));
    wipe.name = "page-wipe";
    wipe.userData.pickable = false;
    wipe.renderOrder = 50;
    scene.add(wipe);

    return ({ frame: local }) => {
      const f = local + G0;
      const off = offset(f);
      doc.position.y = -off * PX;
      for (const b of B) {
        const t0 = LATE[b.id] ?? EARLY[b.id] ?? firstSeen[b.id] ?? 1e9;
        const p = prog(f, t0, 3, outCubic);
        b.mesh.visible = p > 0.01;
        (b.mesh.material as THREE.MeshBasicMaterial).opacity = p;
      }
      const w = prog(f, 1136, 10, outCubic);
      wipe.visible = w > 0;
      wipe.position.set(rx(1920 + 1920 - w * 3000), 0, 0.1);
    };
  });
}
