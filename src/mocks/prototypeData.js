// Standalone design-review fixtures only. The HBIMS bundle does not import this file.
import {
  WorkflowFamily,
  RequestChargeType,
} from "../contracts/cashCollection.contract.js";

const serviceOptions = [
  {
    id: "opd-normal",
    legacyChargeTypeId: "1",
    label: "OPD Normal",
    short: "OPD",
    title: "Routine outpatient service",
    description: "Collect for an existing outpatient visit or service.",
    tone: "blue",
    icon: "stethoscope",
  },
  {
    id: "opd-special",
    legacyChargeTypeId: "4",
    label: "OPD Special",
    short: "SP",
    title: "Specialty clinic visit",
    description: "Collect for specialty and scheduled clinic services.",
    tone: "violet",
    icon: "spark",
  },
  {
    id: "ipd",
    legacyChargeTypeId: "2",
    label: "IPD",
    short: "IPD",
    title: "Inpatient account",
    description: "Post advance, service or part payment against admission.",
    tone: "teal",
    icon: "bed",
  },
  {
    id: "emergency",
    legacyChargeTypeId: "3",
    label: "Emergency",
    short: "ER",
    title: "Emergency services",
    description: "Collect against a live emergency episode.",
    tone: "coral",
    icon: "pulse",
  },
];

// Supplied by the service-specific billing API in HBIMS.  The direct flow must
// never reuse an IPD list for OPD or Emergency.
const billingByService = {
  "opd-normal": {
    Receipt: [
      {
        id: "10",
        label: "Service",
        processingServiceId: "10",
        uiFamily: WorkflowFamily.TARIFF_ENTRY,
        legacyMode: "OFFRECSER",
      },
    ],
    Refund: [
      {
        id: "10",
        label: "Service",
        processingServiceId: "10",
        uiFamily: WorkflowFamily.SERVICE_REFUND,
        legacyMode: "OFFREFUNDSER",
      },
    ],
    Estimation: [
      {
        id: "10",
        label: "Service",
        processingServiceId: "10",
        uiFamily: WorkflowFamily.TARIFF_ENTRY,
        legacyMode: "OFFESTIMATION",
      },
    ],
  },
  "opd-special": {
    Receipt: [
      {
        id: "10",
        label: "Service-Spl. Clinic",
        processingServiceId: "10",
        uiFamily: WorkflowFamily.TARIFF_ENTRY,
        legacyMode: "OFFRECSER",
      },
    ],
    Refund: [
      {
        id: "10",
        label: "Service-Spl. Clinic",
        processingServiceId: "10",
        uiFamily: WorkflowFamily.SERVICE_REFUND,
        legacyMode: "OFFREFUNDSER",
      },
    ],
    Estimation: [
      {
        id: "10",
        label: "Service-Spl. Clinic",
        processingServiceId: "10",
        uiFamily: WorkflowFamily.TARIFF_ENTRY,
        legacyMode: "OFFESTIMATION",
      },
    ],
  },
  ipd: {
    Receipt: [
      {
        id: "11",
        label: "Service",
        processingServiceId: "11",
        uiFamily: WorkflowFamily.TARIFF_ENTRY,
        legacyMode: "OFFRECSER",
      },
      {
        id: "19",
        label: "Advance",
        processingServiceId: "19",
        uiFamily: WorkflowFamily.ACCOUNT_PAYMENT,
        legacyMode: "OFFRECADV",
      },
      {
        id: "13",
        label: "Package",
        processingServiceId: "13",
        uiFamily: WorkflowFamily.PACKAGE_ENTRY,
        legacyMode: "OFFRECPACK",
      },
      {
        id: "20",
        label: "Part Payment",
        processingServiceId: "20",
        uiFamily: WorkflowFamily.ACCOUNT_PAYMENT,
        legacyMode: "OFFRECPARTPAY",
      },
      {
        id: "35",
        label: "Bill Settlement",
        processingServiceId: "21",
        uiFamily: WorkflowFamily.BILL_SETTLEMENT,
        legacyMode: "ONLINEFINALSETTLEMENT",
      },
    ],
    Refund: [
      {
        id: "11",
        label: "Service",
        processingServiceId: "11",
        uiFamily: WorkflowFamily.SERVICE_REFUND,
        legacyMode: "OFFREFUNDSER",
      },
      {
        id: "19",
        label: "Advance",
        processingServiceId: "19",
        uiFamily: WorkflowFamily.ADVANCE_REFUND,
        legacyMode: "OFFREFUNDADMCANCEL",
      },
      {
        id: "13",
        label: "Package",
        processingServiceId: "13",
        uiFamily: WorkflowFamily.PACKAGE_REFUND,
        legacyMode: "OFFREFUNDSER",
      },
      {
        id: "20",
        label: "Part Payment",
        processingServiceId: "20",
        uiFamily: WorkflowFamily.PART_PAYMENT_REFUND,
        legacyMode: "OFFREFUNDPARTPAYCANCEL",
      },
      {
        id: "35",
        label: "Bill Settlement",
        processingServiceId: "21",
        uiFamily: WorkflowFamily.BILL_SETTLEMENT_REFUND,
        legacyMode: "SERVER_RESOLVED",
      },
    ],
    Estimation: [
      {
        id: "11",
        label: "Service",
        processingServiceId: "11",
        uiFamily: WorkflowFamily.TARIFF_ENTRY,
        legacyMode: "OFFESTIMATION",
      },
      {
        id: "13",
        label: "Package",
        processingServiceId: "13",
        uiFamily: WorkflowFamily.PACKAGE_ENTRY,
        legacyMode: "OFFESTIMATION",
      },
    ],
  },
  emergency: {
    Receipt: [
      {
        id: "12",
        label: "Service",
        processingServiceId: "12",
        uiFamily: WorkflowFamily.TARIFF_ENTRY,
        legacyMode: "OFFRECSER",
      },
    ],
    Refund: [
      {
        id: "12",
        label: "Service",
        processingServiceId: "12",
        uiFamily: WorkflowFamily.SERVICE_REFUND,
        legacyMode: "OFFREFUNDSER",
      },
    ],
    Estimation: [
      {
        id: "12",
        label: "Service",
        processingServiceId: "12",
        uiFamily: WorkflowFamily.TARIFF_ENTRY,
        legacyMode: "OFFESTIMATION",
      },
    ],
  },
};

const TODAY_ISO = "2024-09-03";
const DAY_MS = 86400000;
const isoMinus = (days) =>
  new Date(new Date(`${TODAY_ISO}T12:00:00`).getTime() - days * DAY_MS)
    .toISOString()
    .slice(0, 10);
const crNo = (serial) => {
  const digits = "939112" + String(600000000 + serial).padStart(9, "0");
  return `${digits.slice(0, 5)} ${digits.slice(5, 10)} ${digits.slice(10)}`;
};
const displayDate = (iso) => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};
const rajeshSettlementBreakdown = [
  {
    code: "BED-2041",
    name: "General ward bed charge / day",
    group: "Accommodation",
    rate: 1200,
    qty: 6,
    discount: 0,
  },
  {
    code: "CONS-215",
    name: "Specialist review",
    group: "Consultation",
    rate: 800,
    qty: 3,
    discount: 0,
  },
  {
    code: "INV-3410",
    name: "Lipid profile",
    group: "Investigation",
    rate: 900,
    qty: 1,
    discount: 0,
  },
  {
    code: "INV-3312",
    name: "ECG — 12 lead",
    group: "Investigation",
    rate: 350,
    qty: 2,
    discount: 0,
  },
  {
    code: "INV-3455",
    name: "Liver function test",
    group: "Investigation",
    rate: 650,
    qty: 1,
    discount: 0,
  },
  {
    code: "INV-3521",
    name: "Kidney function test",
    group: "Investigation",
    rate: 750,
    qty: 1,
    discount: 0,
  },
  {
    code: "INV-3540",
    name: "Blood sugar — fasting",
    group: "Investigation",
    rate: 150,
    qty: 1,
    discount: 0,
  },
  {
    code: "INV-3562",
    name: "HbA1c",
    group: "Investigation",
    rate: 700,
    qty: 1,
    discount: 0,
  },
  {
    code: "INV-3588",
    name: "Thyroid profile — T3/T4/TSH",
    group: "Investigation",
    rate: 950,
    qty: 1,
    discount: 0,
  },
  {
    code: "INV-3603",
    name: "Urine routine examination",
    group: "Investigation",
    rate: 200,
    qty: 1,
    discount: 0,
  },
  {
    code: "INV-3617",
    name: "Electrolytes panel",
    group: "Investigation",
    rate: 550,
    qty: 1,
    discount: 0,
  },
  {
    code: "INV-3629",
    name: "Coagulation profile — PT/INR",
    group: "Investigation",
    rate: 480,
    qty: 1,
    discount: 0,
  },
  {
    code: "PROC-5501",
    name: "IV cannulation",
    group: "Procedure",
    rate: 250,
    qty: 2,
    discount: 0,
  },
  {
    code: "PHR-7001",
    name: "Pharmacy consumables",
    group: "Pharmacy",
    rate: 1260,
    qty: 1,
    discount: 0,
  },
];

const patients = [
  {
    id: "1",
    name: "Rajesh Kumar Mehta",
    age: 48,
    sex: "Male",
    cr: crNo(1),
    ipd: "2024 0260 0046",
    account: "2024 1726 0045",
    episode: "IPD / General Medicine",
    status: "Admitted",
    department: "General Medicine",
    unit: "Medicine Unit 2",
    ward: "Ward 4B",
    bed: "Bed 12",
    roomType: "General ward",
    consultant: "Dr M. S. Siddiqui",
    admittedOn: "03/09/2024 · 11:47",
    category: "General — CGHS",
    mobile: "98xxx 41207",
    eligibleChargeTypeIds: ["2"],
    accountOpen: true,
    refundableDocumentCount: 2,
    workflowContext: {
      raisingDepartments: ["General Medicine"],
      episodes: ["03-Sep-2024 / IPD"],
      patientCategories: ["General — CGHS"],
      wards: ["Ward 4B"],
      roomTypes: ["General ward"],
      payableAmount: 17390,
      chargeBreakdown: rajeshSettlementBreakdown,
    },
  },
  {
    id: "2",
    name: "Sunita Rao",
    age: 34,
    sex: "Female",
    cr: crNo(2),
    ipd: "—",
    account: "2024 1711 0288",
    episode: "OPD / Cardiology",
    status: "Visited today",
    department: "Cardiology",
    unit: "Cardio Unit 1",
    ward: "—",
    bed: "—",
    roomType: "—",
    consultant: "Dr A. Bhatnagar",
    admittedOn: "—",
    category: "General",
    mobile: "99xxx 30514",
    eligibleChargeTypeIds: ["1", "4"],
    accountOpen: false,
    refundableDocumentCount: 1,
  },
  {
    id: "3",
    name: "Vikram Singh",
    age: 61,
    sex: "Male",
    cr: crNo(3),
    ipd: "2024 0260 0071",
    account: "2024 1726 0113",
    episode: "IPD / Orthopaedics",
    status: "Admitted",
    department: "Orthopaedics",
    unit: "Ortho Unit 1",
    ward: "Ward 2A",
    bed: "Bed 08",
    roomType: "General ward",
    consultant: "Dr P. Raghavan",
    admittedOn: "02/09/2024 · 09:20",
    category: "General",
    mobile: "97xxx 88420",
    eligibleChargeTypeIds: ["2"],
    accountOpen: true,
    refundableDocumentCount: 1,
    workflowContext: {
      raisingDepartments: ["Orthopaedics"],
      episodes: ["02-Sep-2024 / IPD"],
      patientCategories: ["General"],
      wards: ["Ward 2A"],
      roomTypes: ["General ward"],
      payableAmount: 8800,
    },
  },
];

const fixturePatientNames = [
  "Ajay Deshmukh",
  "Meena Kumari",
  "Anita Verma",
  "Imran Qureshi",
  "Kavita Sharma",
  "Rohan Gupta",
  "Farida Khan",
  "Deepak Yadav",
  "Neha Joshi",
  "Mohan Lal",
  "Pooja Nair",
  "Arjun Patel",
  "Shabana Ali",
  "Nitin Kulkarni",
  "Rekha Das",
  "Suresh Iyer",
  "Priya Menon",
  "Harish Chandra",
  "Lakshmi Devi",
  "Sameer Sheikh",
  "Asha Rani",
  "Gopal Mishra",
  "Nandini Bose",
  "Tariq Ahmed",
  "Seema Jain",
  "Rahul Kapoor",
  "Mary Thomas",
];
const fixtureDepartments = [
  "Cardiology",
  "General Medicine",
  "Orthopaedics",
  "Gynaecology",
  "Paediatrics",
  "Neurology",
  "ENT",
  "Ophthalmology",
  "Nephrology",
  "Dermatology",
  "Pulmonology",
  "Gastroenterology",
  "Urology",
  "Oncology",
];
const fixtureCategories = [
  "General",
  "General — CGHS",
  "ESIC",
  "Ayushman Bharat",
  "Corporate",
  "BPL",
  "Private",
  "Staff / Dependant",
  "Railway",
  "Defence — ECHS",
  "Insurance — TPA",
  "State Scheme",
  "Senior Citizen",
];
patients.push(
  ...fixturePatientNames.map((name, index) => {
    const number = index + 4;
    const inpatient = index % 3 === 0;
    const department = fixtureDepartments[index % fixtureDepartments.length];
    const category = fixtureCategories[(index * 3) % fixtureCategories.length];
    return {
      id: String(number),
      name,
      age: 19 + ((index * 7) % 58),
      sex: index % 2 ? "Female" : "Male",
      cr: crNo(index + 4),
      ipd: inpatient ? `2024 0260 ${String(80 + index).padStart(4, "0")}` : "—",
      account: `2024 1726 ${String(140 + index).padStart(4, "0")}`,
      episode: `${inpatient ? "IPD" : "OPD"} / ${department}`,
      status: inpatient ? "Admitted" : "Visited today",
      department,
      unit: `${department} Unit ${(index % 3) + 1}`,
      ward: inpatient ? `Ward ${(index % 5) + 1}${index % 2 ? "A" : "B"}` : "—",
      bed: inpatient ? `Bed ${String(3 + index).padStart(2, "0")}` : "—",
      roomType: inpatient ? "General ward" : "—",
      consultant: `Dr ${String.fromCharCode(65 + (index % 20))}. Kumar`,
      admittedOn: inpatient ? "02/09/2024 · 08:30" : "—",
      category,
      mobile: `9${6 + (index % 4)}xxx ${String(21000 + index * 193).slice(-5)}`,
      eligibleChargeTypeIds: inpatient ? ["2"] : ["1", "4"],
      accountOpen: inpatient,
      refundableDocumentCount: index % 4 === 0 ? 1 : 0,
      workflowContext: inpatient
        ? {
            raisingDepartments: [department],
            episodes: ["02-Sep-2024 / IPD"],
            patientCategories: ["General"],
            wards: [`Ward ${(index % 5) + 1}${index % 2 ? "A" : "B"}`],
            roomTypes: ["General ward"],
            payableAmount: 1000 + index * 225,
          }
        : undefined,
    };
  }),
);

const requests = [
  {
    id: "ADJ-2024-0882",
    dateIso: isoMinus(0),
    patient: "Rajesh Kumar Mehta",
    cr: crNo(1),
    type: RequestChargeType.IPD_FINAL_ADJUSTMENT,
    location: "Ward 4B · Bed 12",
    date: "03/09/2024",
    amount: "17,390.00",
    waiting: "1h 04m",
    raisedBy: "Ward 4B nursing station",
    department: "General Medicine",
    category: patients[0].category,
    lines: rajeshSettlementBreakdown,
  },
  {
    id: "REF-2024-0193",
    dateIso: isoMinus(0),
    patient: "Sunita Rao",
    cr: crNo(2),
    type: RequestChargeType.OPD_REFUND,
    location: "OPD Cardiology",
    date: "03/09/2024",
    amount: "1,240.00",
    waiting: "2h 21m",
    raisedBy: "OPD Cardiology desk",
    department: "Cardiology",
    category: patients[1].category,
    lines: [
      {
        code: "CONS-101",
        name: "Consultation — Cardiology",
        group: "Consultation",
        rate: 600,
        qty: 1,
        discount: 0,
      },
      {
        code: "INV-3312",
        name: "ECG — 12 lead",
        group: "Investigation",
        rate: 350,
        qty: 1,
        discount: 0,
      },
      {
        code: "INV-2201",
        name: "Complete blood count",
        group: "Investigation",
        rate: 290,
        qty: 1,
        discount: 0,
      },
    ],
  },
  {
    id: "BIL-2024-1142",
    dateIso: isoMinus(0),
    patient: "Ajay Deshmukh",
    cr: crNo(4),
    type: RequestChargeType.IPD_ADVANCE_DEPOSIT,
    location: "Ward 2A",
    date: "03/09/2024",
    amount: "8,000.00",
    waiting: "3h 18m",
    raisedBy: "Ward 2A nursing station",
    department: "Orthopaedics",
    category: patients[3].category,
    lines: [
      {
        code: "ADV-0001",
        name: "Admission advance deposit",
        group: "Advance",
        rate: 8000,
        qty: 1,
        discount: 0,
      },
    ],
  },
  {
    id: "REF-2024-0182",
    dateIso: isoMinus(0),
    patient: "Meena Kumari",
    cr: crNo(5),
    type: RequestChargeType.IPD_ADVANCE_REFUND,
    location: "Ward 1B",
    date: "03/09/2024",
    amount: "2,450.00",
    waiting: "5h 06m",
    raisedBy: "Ward 1B nursing station",
    department: "Gynaecology",
    category: patients[4].category,
    lines: [
      {
        code: "ADV-0002",
        name: "Advance refund — unutilised balance",
        group: "Advance",
        rate: 2450,
        qty: 1,
        discount: 0,
      },
    ],
  },
];

// Part Payment cannot arrive as a billing request in HBIMS — OFFRECPARTPAY only
// runs through the direct-collection screen, so the request-based queue must
// never generate or display that charge type.
const fixtureRequestTypes = [
  RequestChargeType.OPD_SERVICE,
  RequestChargeType.IPD_ADVANCE_DEPOSIT,
  RequestChargeType.INVESTIGATION_CHARGES,
  RequestChargeType.PACKAGE_COLLECTION,
  RequestChargeType.OPD_REFUND,
];
// The queue's Charge Type column shows the request TYPE, but the Tariff Name
// column inside each request must show an actual tariff line, not that same
// category label repeated back — pick a real catalog-style item per type.
const requestLineOptions = {
  [RequestChargeType.OPD_SERVICE]: [
    {
      code: "CONS-118",
      name: "Consultation — General Medicine",
      group: "Consultation",
    },
    {
      code: "CONS-101",
      name: "Consultation — Cardiology",
      group: "Consultation",
    },
    { code: "CONS-215", name: "Specialist review", group: "Consultation" },
  ],
  [RequestChargeType.IPD_ADVANCE_DEPOSIT]: [
    { code: "ADV-0001", name: "Admission advance deposit", group: "Advance" },
  ],
  [RequestChargeType.INVESTIGATION_CHARGES]: [
    { code: "INV-2201", name: "Complete blood count", group: "Investigation" },
    { code: "INV-3410", name: "Lipid profile", group: "Investigation" },
    { code: "INV-3455", name: "Liver function test", group: "Investigation" },
    { code: "INV-3312", name: "ECG — 12 lead", group: "Investigation" },
  ],
  [RequestChargeType.PACKAGE_COLLECTION]: [
    { code: "PKG-9001", name: "Day Care Package — General", group: "Package" },
    {
      code: "PKG-9002",
      name: "Maternity Package — Normal Delivery",
      group: "Package",
    },
  ],
  [RequestChargeType.OPD_REFUND]: [
    {
      code: "CONS-118",
      name: "Consultation — General Medicine",
      group: "Consultation",
    },
    { code: "INV-3410", name: "Lipid profile", group: "Investigation" },
    { code: "INV-2201", name: "Complete blood count", group: "Investigation" },
  ],
};
requests.push(
  ...patients.slice(3, 24).map((patient, index) => {
    const isRefund = index % 7 === 6;
    const amount = 480 + ((index * 735) % 11800);
    const requestType = isRefund
      ? RequestChargeType.OPD_REFUND
      : fixtureRequestTypes[index % (fixtureRequestTypes.length - 1)];
    const offset = 0;
    const elapsedMinutes = 20 + index * 37;
    const lineOptions = requestLineOptions[requestType];
    const linePick = lineOptions[index % lineOptions.length];
    return {
      id: `${isRefund ? "REF" : "BIL"}-2024-${String(1200 + index).padStart(4, "0")}`,
      patient: patient.name,
      cr: patient.cr,
      type: requestType,
      location:
        patient.ipd === "—"
          ? `OPD ${patient.department}`
          : `${patient.ward} · ${patient.bed}`,
      dateIso: isoMinus(offset),
      date: displayDate(isoMinus(offset)),
      amount: amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      waiting: `${Math.floor(elapsedMinutes / 60)}h ${String(elapsedMinutes % 60).padStart(2, "0")}m`,
      raisedBy: `${patient.department} desk`,
      department: patient.department,
      category: patient.category,
      lines: [
        {
          code: `${linePick.code}-${String(1800 + index)}`,
          name: linePick.name,
          group: linePick.group,
          rate: amount,
          qty: 1,
          discount: 0,
        },
      ],
    };
  }),
);

const tariffGroups = [
  "All groups",
  "Consultation",
  "Accommodation",
  "Investigation",
  "Radiology",
  "Procedure",
  "Pharmacy",
];

const tariffCatalog = [
  {
    code: "CONS-101",
    name: "Consultation — Cardiology",
    group: "Consultation",
    rate: 600,
  },
  {
    code: "CONS-215",
    name: "Specialist review",
    group: "Consultation",
    rate: 800,
  },
  {
    code: "CONS-118",
    name: "Consultation — General Medicine",
    group: "Consultation",
    rate: 400,
  },
  {
    code: "BED-2041",
    name: "General ward bed charge / day",
    group: "Accommodation",
    rate: 1200,
  },
  {
    code: "BED-2088",
    name: "Private room charge / day",
    group: "Accommodation",
    rate: 3500,
  },
  {
    code: "INV-2201",
    name: "Complete blood count",
    group: "Investigation",
    rate: 290,
  },
  {
    code: "INV-3312",
    name: "ECG — 12 lead",
    group: "Investigation",
    rate: 350,
  },
  {
    code: "INV-3410",
    name: "Lipid profile",
    group: "Investigation",
    rate: 900,
  },
  {
    code: "INV-3455",
    name: "Liver function test",
    group: "Investigation",
    rate: 650,
  },
  {
    code: "RAD-4102",
    name: "Chest X-ray — PA view",
    group: "Radiology",
    rate: 450,
  },
  {
    code: "RAD-4260",
    name: "Ultrasound — abdomen",
    group: "Radiology",
    rate: 1100,
  },
  { code: "PROC-5501", name: "IV cannulation", group: "Procedure", rate: 250 },
  {
    code: "PROC-5620",
    name: "Dressing — minor",
    group: "Procedure",
    rate: 180,
  },
  { code: "PROC-5744", name: "Nebulisation", group: "Procedure", rate: 220 },
  {
    code: "PHR-7001",
    name: "Pharmacy consumables",
    group: "Pharmacy",
    rate: 1260,
  },
  {
    code: "PHR-7112",
    name: "Surgical disposables kit",
    group: "Pharmacy",
    rate: 540,
  },
];

const collectionModes = [
  {
    mode: "Cash",
    amount: "18,650.00",
    value: 18650,
    count: 11,
    color: "#0a8a8e",
  },
  {
    mode: "UPI",
    amount: "12,480.00",
    value: 12480,
    count: 24,
    color: "#4a7ad6",
  },
  {
    mode: "Card",
    amount: "14,190.00",
    value: 14190,
    count: 5,
    color: "#7659d3",
  },
  {
    mode: "Cheque",
    amount: "3,000.00",
    value: 3000,
    count: 2,
    color: "#d78319",
  },
];

// Transactions carry the patient's department + category so the shift
// dashboard can break collections down by, and cross-filter on, those
// dimensions. Derived from the patient record here; the real backend returns
// them on the transaction row directly (see TRANSACTION-TABLES-API.md).
const patientByCr = new Map(patients.map((row) => [row.cr, row]));
const segmentFor = (cr) => {
  const patient = patientByCr.get(cr);
  return {
    department: patient?.department || "General Medicine",
    category: patient?.category || "General",
  };
};

const recentTransactions = [
  {
    no: "REC-2024-088241",
    patient: "Rajesh Kumar Mehta",
    dateIso: isoMinus(0),
    cr: crNo(1),
    mode: "Cash",
    amount: "4,280.00",
    time: "10:38 AM",
    status: "Completed",
    requestType: RequestChargeType.IPD_FINAL_ADJUSTMENT,
    ...segmentFor(crNo(1)),
  },
  {
    no: "REC-2024-088240",
    patient: "Anita Verma",
    dateIso: isoMinus(0),
    cr: crNo(6),
    mode: "UPI",
    amount: "860.00",
    time: "10:31 AM",
    status: "Completed",
    requestType: RequestChargeType.OPD_SERVICE,
    ...segmentFor(crNo(6)),
  },
  {
    no: "REF-2024-000912",
    patient: "Meena Kumari",
    dateIso: isoMinus(0),
    cr: crNo(5),
    mode: "Cash",
    amount: "2,450.00",
    time: "10:12 AM",
    status: "Refunded",
    requestType: RequestChargeType.OPD_REFUND,
    ...segmentFor(crNo(5)),
  },
  {
    no: "REC-2024-088239",
    patient: "Imran Qureshi",
    dateIso: isoMinus(0),
    cr: crNo(7),
    mode: "Card",
    amount: "11,400.00",
    time: "09:57 AM",
    status: "Completed",
    requestType: RequestChargeType.INVESTIGATION_CHARGES,
    ...segmentFor(crNo(7)),
  },
  {
    no: "REC-2024-088238",
    patient: "Sunita Rao",
    dateIso: isoMinus(0),
    cr: crNo(2),
    mode: "Cash",
    amount: "1,240.00",
    time: "09:44 AM",
    status: "Completed",
    requestType: RequestChargeType.OPD_SERVICE,
    ...segmentFor(crNo(2)),
  },
];

const fixturePaymentModes = ["Cash", "UPI", "Card", "Cheque"];
const to12Time = (hour24, minute) => {
  const suffix = hour24 < 12 ? "AM" : "PM";
  const h = (hour24 % 12 || 12).toString().padStart(2, "0");
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
};

// A full day of today's counter activity: ~72 transactions spread across
// 08:00–20:00, every payment mode, and a wide spread of patient categories
// and departments (rotated independently of the patient so every segment
// slice is represented), with a handful of refunds so the dashboard has
// something to break down.
const todayPatients = patients.slice(3);
recentTransactions.push(
  ...Array.from({ length: 72 }, (_, index) => {
    const patient = todayPatients[(index * 5) % todayPatients.length];
    const refunded = index % 9 === 4;
    const value = 300 + ((index * 1373) % 15200);
    const hour = 8 + Math.floor((index * 12) / 72); // 08 → 19
    const minute = (index * 17) % 60;
    return {
      no: `${refunded ? "REF" : "REC"}-2024-${String((refunded ? 970 : 88190) + index).padStart(6, "0")}`,
      dateIso: isoMinus(0),
      patient: patient.name,
      cr: patient.cr,
      mode: fixturePaymentModes[(index * 3) % fixturePaymentModes.length],
      amount: value.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      time: to12Time(hour, minute),
      status: refunded ? "Refunded" : "Completed",
      requestType: refunded
        ? Math.floor(index / 9) % 2 === 0
          ? RequestChargeType.OPD_REFUND
          : RequestChargeType.IPD_ADVANCE_REFUND
        : fixtureRequestTypes[index % (fixtureRequestTypes.length - 1)],
      department: fixtureDepartments[(index * 5) % fixtureDepartments.length],
      category: fixtureCategories[(index * 4 + 1) % fixtureCategories.length],
    };
  }),
);
// Keep a short trail of earlier days for context in future date filters.
recentTransactions.push(
  ...patients.slice(6, 20).map((patient, index) => {
    const value = 450 + ((index * 811) % 9200);
    return {
      no: `REC-2024-${String(87990 - index).padStart(6, "0")}`,
      dateIso: isoMinus(1 + (index % 12)),
      patient: patient.name,
      cr: patient.cr,
      mode: fixturePaymentModes[index % fixturePaymentModes.length],
      amount: value.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      time: to12Time(10 + (index % 6), (index * 13) % 60),
      status: index % 10 === 9 ? "Refunded" : "Completed",
      department: patient.department,
      category: patient.category,
    };
  }),
);

const recentEstimates = [
  {
    no: "EST-2024-00421",
    patient: patients[0].name,
    cr: patients[0].cr,
    service: "IPD / General Medicine",
    amount: "₹12,160.00",
    date: "03/09/2024",
    status: "Printed",
  },
  {
    no: "EST-2024-00420",
    patient: patients[1].name,
    cr: patients[1].cr,
    service: "OPD / Cardiology",
    amount: "₹1,240.00",
    date: "03/09/2024",
    status: "Draft",
  },
  {
    no: "EST-2024-00419",
    patient: patients[2].name,
    cr: patients[2].cr,
    service: "Emergency / Trauma",
    amount: "₹8,800.00",
    date: "02/09/2024",
    status: "Printed",
  },
];

const allPaymentModes = ["Cash", "Card", "UPI", "Cheque"];
const cardTypes = ["Debit Card", "Credit Card"];
const posTerminals = ["T1", "T2", "T3"];
const prototypeCashInDrawer = recentTransactions
  .filter((row) => row.dateIso === TODAY_ISO && row.mode === "Cash")
  .reduce(
    (total, row) =>
      total +
      (row.status === "Completed"
        ? Number(String(row.amount).replace(/,/g, ""))
        : row.status === "Refunded"
          ? -Number(String(row.amount).replace(/,/g, ""))
          : 0),
    0,
  );

/** Standalone review data. HBIMS mounting requires an explicitly injected model. */
export const PROTOTYPE_DATA = Object.freeze({
  todayIso: TODAY_ISO,
  facility: Object.freeze({
    name: "HBIMS Hospital",
    subtitle: "Hospital Billing & Information Management",
  }),
  queueSummary: Object.freeze({
    pendingCount: requests.length,
    todayPendingCount: requests.filter((row) => row.dateIso === TODAY_ISO)
      .length,
    cashInDrawer: prototypeCashInDrawer.toFixed(2),
  }),
  requestFilterOptions: Object.freeze({
    chargeTypes: Object.freeze(
      [...new Set(requests.map((row) => row.type))].sort(),
    ),
    departments: Object.freeze(
      [...new Set(requests.map((row) => row.department))].sort(),
    ),
  }),
  serviceOptions,
  billingByService,
  patients,
  requests,
  tariffGroups,
  tariffCatalog,
  collectionModes,
  recentTransactions,
  recentEstimates,
  paymentOptions: Object.freeze({
    modes: allPaymentModes,
    cardTypes,
    posTerminals,
    restrictionsByCategory: Object.freeze({
      CGHS: Object.freeze({ Cheque: "not permitted for the CGHS category" }),
    }),
  }),
});
