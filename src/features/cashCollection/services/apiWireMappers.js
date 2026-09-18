import { mapPendingRequest } from "./pendingRequestMapper";
import { mapTransactionRow } from "./transactionRowMapper";

const displayText = (value) => (value == null ? "" : String(value));

function toWireSort(sort, fieldNames = {}) {
  if (!sort) return sort;
  const [field, direction] = String(sort).split(",", 2);
  const wireField = fieldNames[field] || field;
  return direction ? `${wireField},${direction}` : wireField;
}

function mapPatient(row = {}) {
  return {
    ...row,
    id: displayText(row.cr_num),
    name: displayText(row.pat_name),
    age: row.pat_age,
    sex: displayText(row.pat_sex),
    cr: displayText(row.cr_num),
    ipd: displayText(row.ipd_admission_num),
    account: displayText(row.account_num),
    episode: displayText(row.episode_name),
    status: displayText(row.admission_status),
    isAdmitted:
      typeof row.is_admitted === "boolean" ? row.is_admitted : undefined,
    department: displayText(row.department_name),
    unit: displayText(row.unit_name),
    ward: displayText(row.ward_name),
    bed: displayText(row.bed_name),
    roomType: displayText(row.room_type_name),
    consultant: displayText(row.consultant_name),
    admittedOn: displayText(row.admitted_on),
    category: displayText(row.category_name),
    mobile: displayText(row.mobile_num),
    abhaNumber: displayText(row.abha_num),
    abhaAddress: displayText(row.abha_address),
    eligibleChargeTypeIds: row.eligible_charge_type_ids || [],
    accountOpen: Boolean(row.ipd_account_open),
    refundableDocumentCount: Number(row.refundable_document_count || 0),
    workflowContext: row.workflow_context,
  };
}

function mapTariff(row = {}) {
  return {
    ...row,
    code: displayText(row.tariff_code),
    name: displayText(row.tariff_name),
    group: displayText(row.tariff_group_name),
    rate: row.tariff_rate,
    qty: row.tariff_qty,
    discount: row.tariff_discount_percent,
  };
}

function mapServiceOption(row = {}) {
  return {
    ...row,
    id: displayText(row.hospital_service_id),
    legacyChargeTypeId: displayText(row.legacy_charge_type_id),
    label: displayText(row.hospital_service_name),
    short: displayText(row.hospital_service_short_name),
    title: displayText(row.hospital_service_title),
    description: displayText(row.hospital_service_description),
    tone: displayText(row.display_tone),
    icon: displayText(row.icon_name),
  };
}

function mapBillingOption(row = {}) {
  return {
    ...row,
    id: displayText(row.billing_service_id),
    label: displayText(row.billing_service_name),
    processingServiceId: displayText(row.processing_billing_service_id),
    uiFamily: displayText(row.workflow_family),
    legacyMode: displayText(row.legacy_mode),
  };
}

function mapBillingServicesByHospitalService(source = {}) {
  return Object.fromEntries(
    Object.entries(source).map(([hospitalServiceId, byRequestType]) => [
      hospitalServiceId,
      Object.fromEntries(
        Object.entries(byRequestType || {}).map(([requestType, options]) => [
          requestType,
          (options || []).map(mapBillingOption),
        ]),
      ),
    ]),
  );
}

function mapPaymentOptions(row = {}) {
  return {
    modes: row.payment_modes || [],
    cardTypes: row.payment_card_types || [],
    posTerminals: row.payment_pos_terminals || [],
    restrictionsByCategory: row.payment_restrictions_by_category || {},
    modeDetails: Object.fromEntries(
      Object.entries(row.payment_mode_details || {}).map(([mode, details]) => [
        mode,
        {
          ...details,
          receivedAmountFlag: details.received_amount_flag,
          printNote: details.print_note,
        },
      ]),
    ),
  };
}

function mapPaymentDetailsWire(row = {}) {
  const terminal = row.terminal_payment;
  const manual = row.manual_payment_details;
  return {
    ...row,
    mode: displayText(row.payment_mode),
    description: displayText(row.payment_description),
    summary: displayText(row.payment_summary),
    receivedAmountFlag: row.received_amount_flag,
    receivedAmount: row.received_amount,
    printNote: row.print_note,
    cardType: displayText(row.card_type) || null,
    terminalId: displayText(row.pos_terminal_id) || null,
    terminalApproval: terminal
      ? {
          terminalTransactionId: displayText(terminal.terminal_transaction_id),
          status: displayText(terminal.transaction_status),
          approvalCode: displayText(terminal.payment_approval_code),
          cardLastFour: displayText(terminal.card_last_four),
        }
      : null,
    manualDetails: manual
      ? {
          bankName: displayText(manual.bank_name),
          reference: displayText(manual.payment_reference),
          cardLastFour: displayText(manual.card_last_four) || null,
          transactionDate: displayText(manual.transaction_date),
          cardType: displayText(manual.card_type) || null,
          summary: displayText(manual.payment_summary),
        }
      : null,
  };
}

function toWirePaymentDetails(payment = {}) {
  const terminal = payment.terminalApproval;
  const manual = payment.manualDetails;
  return {
    payment_mode: payment.mode,
    payment_description: payment.description,
    payment_summary: payment.summary,
    received_amount_flag: payment.receivedAmountFlag,
    print_note: payment.printNote,
    card_type: payment.cardType,
    pos_terminal_id: payment.terminalId,
    terminal_payment: terminal
      ? {
          terminal_transaction_id: terminal.terminalTransactionId,
          transaction_status: terminal.status,
          payment_approval_code: terminal.approvalCode,
          card_last_four: terminal.cardLastFour,
        }
      : undefined,
    manual_payment_details: manual
      ? {
          bank_name: manual.bankName,
          payment_reference: manual.reference,
          card_last_four: manual.cardLastFour,
          transaction_date: manual.transactionDate,
          card_type: manual.cardType,
          payment_summary: manual.summary,
        }
      : undefined,
  };
}

export function mapPaymentOptionsWire(row = {}) {
  return mapPaymentOptions(row);
}

export function mapBootstrapWire(row = {}) {
  const facility = row.facility_details || {};
  const queue = row.pending_queue_summary || {};
  const requestFilters = row.request_filter_options || {};
  return {
    ...row,
    todayIso: displayText(row.business_date),
    facility: {
      hospitalCode: displayText(facility.hospital_code),
      shortName: displayText(facility.hospital_short_name),
      city: displayText(facility.city),
      state: displayText(facility.state),
      pincode: displayText(facility.pincode),
      phone: displayText(facility.phone),
      email: displayText(facility.email),
      fax: displayText(facility.fax),
      contactPerson: displayText(facility.contact_person),
      stateCode: displayText(facility.state_code),
      name: displayText(facility.facility_name),
      subtitle: displayText(facility.facility_subtitle),
      address: displayText(facility.facility_address),
      counterName: displayText(facility.counter_name),
      cashierName: displayText(facility.cashier_name),
    },
    serviceOptions: (row.hospital_services || []).map(mapServiceOption),
    billingByService: mapBillingServicesByHospitalService(
      row.billing_services_by_hospital_service,
    ),
    paymentOptions: mapPaymentOptions(row.payment_options),
    queueSummary: {
      pendingCount: displayText(queue.pending_request_count),
      todayPendingCount: displayText(queue.today_pending_request_count),
      cashInDrawer: displayText(queue.cash_in_drawer_amount),
    },
    requestFilterOptions: {
      hospitalServices: requestFilters.hospital_service_names || [],
      requestTypes: requestFilters.req_types || [],
      departments: requestFilters.department_names || [],
    },
    patients: (row.patient_seed_list || []).map(mapPatient),
    requests: (row.pending_request_queue || []).map(mapPendingRequest),
    tariffGroups: row.tariff_group_names || [],
    tariffCatalog: (row.tariff_catalog || []).map(mapTariff),
    collectionModes: row.collection_mode_options || [],
    recentTransactions: (row.recent_transaction_rows || []).map(
      mapTransactionRow,
    ),
    recentEstimates: row.recent_estimate_rows || [],
  };
}

export function mapPatientSearchWire(rows = []) {
  return (rows || []).map(mapPatient);
}

export function mapTariffSearchWire(rows = []) {
  return (rows || []).map(mapTariff);
}

export function mapRequestDetailWire(row = {}) {
  return {
    ...mapPendingRequest(row),
    linkedPatient: mapPatient(row.linked_patient),
    lines: (row.tariff_lines || []).map(mapTariff),
  };
}

export function mapEligibilityWire(row = {}) {
  const workflow = row.workflow_context || {};
  return {
    ...row,
    eligible: Boolean(row.is_eligible),
    code: displayText(row.eligibility_code),
    message: displayText(row.eligibility_message),
    patientContextVersion: displayText(row.pat_context_version),
    workflowContext: row.workflow_context
      ? {
          ...workflow,
          raisingDepartments: workflow.raising_department_names || [],
          episodes: workflow.episode_names || [],
          patientCategories: workflow.patient_category_names || [],
          wards: workflow.ward_names || [],
          roomTypes: workflow.room_type_names || [],
          payableAmount: workflow.payment_payable_amount,
          chargeBreakdown: (workflow.tariff_charge_breakdown || []).map(
            mapTariff,
          ),
        }
      : null,
  };
}

export function mapTerminalPaymentWire(row = {}) {
  return {
    ...row,
    terminalTransactionId: displayText(row.terminal_transaction_id),
    status: displayText(row.transaction_status),
    pollAfterMs: row.terminal_poll_after_ms,
    expiresInSeconds: row.terminal_expires_in_seconds,
    approvalCode: displayText(row.payment_approval_code),
    cardLastFour: displayText(row.card_last_four),
  };
}

export function mapPostedTransactionWire(row = {}) {
  const printable = row.printable_data || {};
  return {
    ...row,
    documentNumber: displayText(row.transaction_document_no),
    status: displayText(row.transaction_status),
    printableData: row.printable_data
      ? {
          ...printable,
          documentNumber: displayText(printable.transaction_document_no),
          documentType: displayText(printable.transaction_document_type),
          documentDate: displayText(printable.transaction_document_date),
          requestDate: displayText(printable.req_date),
          hospitalService: displayText(printable.hospital_service_name),
          billingService: displayText(printable.billing_service_name),
          raisingDepartment: displayText(printable.raising_department_name),
          counter: displayText(
            printable.counter_details?.counter_name || printable.counter_name,
          ),
          cashier: displayText(
            printable.cashier_details?.cashier_name || printable.cashier_name,
          ),
          patient: mapPatient(printable.patient_details),
          lines: (printable.tariff_lines || []).map(mapTariff),
          payment: mapPaymentDetailsWire(printable.payment_details),
          totals: {
            gross: displayText(printable.transaction_totals?.gross_amount),
            discount: displayText(
              printable.transaction_totals?.discount_amount,
            ),
            net: displayText(printable.transaction_totals?.net_amount),
          },
        }
      : undefined,
    resolvedRequestId: displayText(row.resolved_req_no) || null,
    dashboardTransaction: row.dashboard_transaction_row
      ? mapTransactionRow(row.dashboard_transaction_row)
      : null,
  };
}

function mapDashboardBucket(row = {}) {
  return {
    ...row,
    id: displayText(row.dashboard_bucket_id),
    label: displayText(row.dashboard_bucket_label),
    amount: displayText(row.dashboard_bucket_amount),
    count: displayText(row.dashboard_bucket_count),
    percentage: displayText(row.dashboard_bucket_percentage),
    hour: row.collection_hour,
  };
}

export function mapDashboardWire(row = {}) {
  const kpis = row.dashboard_kpis || {};
  const breakdowns = row.dashboard_breakdowns || {};
  const transactions = row.dashboard_recent_transaction_page || {};
  return {
    ...row,
    businessDate: displayText(row.dashboard_business_date),
    version: displayText(row.dashboard_version),
    generatedAt: displayText(row.dashboard_generated_at),
    kpis: {
      totalCollected: displayText(kpis.collection_total_amount),
      refunds: displayText(kpis.refund_total_amount),
      netCollection: displayText(kpis.net_collection_amount),
      bills: displayText(kpis.transaction_count),
      cashInDrawer: displayText(kpis.cash_in_drawer_amount),
      largestCollection: displayText(kpis.largest_collection_amount),
    },
    breakdowns: {
      paymentModes: (breakdowns.payment_mode_buckets || []).map(
        mapDashboardBucket,
      ),
      categories: (breakdowns.category_buckets || []).map(mapDashboardBucket),
      groups: (breakdowns.department_buckets || []).map(mapDashboardBucket),
      requestTypes: (breakdowns.req_type_buckets || []).map(mapDashboardBucket),
    },
    hourlyCollections: (row.hourly_collection_buckets || []).map(
      mapDashboardBucket,
    ),
    recentTransactions: {
      ...transactions,
      items: (transactions.items || []).map(mapTransactionRow),
    },
  };
}

const mapDenomination = (row = {}) => ({
  ...row,
  code: displayText(row.denomination_code),
  kind: displayText(row.denomination_kind),
  value: displayText(row.denomination_value),
  label: displayText(row.denomination_label),
});

export function mapShiftClosePreparationWire(row = {}) {
  return {
    ...row,
    shiftId: displayText(row.shift_id),
    version: displayText(row.shift_version),
    businessDate: displayText(row.shift_business_date),
    status: displayText(row.shift_status),
    canClose: Boolean(row.can_close_shift),
    blockers: (row.shift_blockers || []).map((blocker) => ({
      ...blocker,
      code: displayText(blocker.shift_blocker_code),
      message: displayText(blocker.shift_blocker_message),
      count: displayText(blocker.shift_blocker_count),
    })),
    expectedCash: displayText(row.expected_cash_amount),
    previousSubmittedCash: displayText(row.previous_submitted_cash_amount),
    cumulativeExpectedCash: displayText(row.cumulative_expected_cash_amount),
    segmentNumber: displayText(row.shift_segment_number),
    denominations: (row.denomination_options || []).map(mapDenomination),
  };
}

export function mapClosedShiftWire(row = {}) {
  return {
    ...row,
    shiftId: displayText(row.shift_id),
    version: displayText(row.shift_version),
    status: displayText(row.shift_status),
    businessDate: displayText(row.shift_business_date),
    closedAt: displayText(row.shift_closed_at),
    expectedCash: displayText(row.expected_cash_amount),
    countedCash: row.counted_cash_amount,
    reconciliationMode: displayText(row.reconciliation_mode),
    previousSubmittedCash: displayText(row.previous_submitted_cash_amount),
    cumulativeCash: displayText(row.cumulative_cash_amount),
    segmentNumber: displayText(row.shift_segment_number),
    summaryNumber: displayText(row.shift_summary_number),
  };
}

export function mapOpenShiftWire(row = {}) {
  return {
    ...row,
    shiftId: displayText(row.shift_id),
    version: displayText(row.shift_version),
    businessDate: displayText(row.shift_business_date),
    status: displayText(row.shift_status),
    segmentNumber: displayText(row.shift_segment_number),
    previousSubmittedCash: displayText(row.previous_submitted_cash_amount),
  };
}

export function toPatientSearchQuery(input = {}) {
  const options = typeof input === "object" ? input : { query: input };
  return {
    pat_search: options.query,
    hospital_service_id: options.hospitalServiceId,
    admitted_only: options.admittedOnly,
    exact_cr: options.exactCr,
    page: options.page,
    size: options.size,
    admission_sort: toWireSort(options.sort, { admittedOn: "admitted_on" }),
  };
}

export function toPendingRequestQuery(filters = {}) {
  return {
    page: filters.page,
    size: filters.size,
    req_search: filters.search,
    hospital_service_name: filters.hospitalService,
    req_type: filters.requestType,
    department_name: filters.department,
    category_name: filters.category,
    req_date: filters.date,
    req_sort: toWireSort(filters.sort, {
      date: "req_date",
      amount: "req_amount",
    }),
  };
}

export function toDashboardQuery(filters = {}) {
  return {
    dashboard_date: filters.date,
    payment_mode: filters.paymentMode,
    transaction_status: filters.status,
    collection_hour: filters.hour,
    category_name: filters.category,
    department_name: filters.group,
    req_type: filters.requestType,
  };
}

export function toPendingMetricsQuery(filters = {}) {
  return {
    pending_date: filters.date,
    category_name: filters.category,
    department_name: filters.department,
    hospital_service_name: filters.hospitalService,
    req_type: filters.requestType,
  };
}

export function toTariffQuery(filters = {}) {
  return {
    tariff_group_id: filters.groupId,
    cr_num: filters.crNumber,
    workflow_id: filters.workflowId,
    tariff_search: filters.search,
    hospital_service_id: filters.hospitalServiceId,
    billing_service_id: filters.billingServiceId,
    page: filters.page,
    size: filters.size,
  };
}

export function toPaymentOptionsQuery(context = {}) {
  return {
    cr_num: context.crNumber,
    category_name: context.category,
    hospital_service_id: context.hospitalServiceId,
    billing_service_id: context.billingServiceId,
  };
}

export function toEligibilityCommand(command = {}) {
  return {
    collection_source: command.source,
    req_no: command.requestId,
    req_version: command.requestVersion,
    request_type: command.requestType,
    cr_num: command.crNumber,
    hospital_service_id: command.hospitalServiceId,
    charge_type_id: command.chargeTypeId,
    billing_service_id: command.billingServiceId,
    processing_billing_service_id: command.processingBillingServiceId,
    workflow_id: command.workflowId,
  };
}

export function toTerminalPaymentCommand(command = {}) {
  return {
    payment_mode: command.paymentMode,
    card_type: command.cardType,
    pos_terminal_id: command.terminalId,
    payment_amount: command.amount,
    cr_num: command.crNumber,
    payment_description: command.description,
  };
}

export function toTransactionCommand(command = {}) {
  return {
    collection_source: command.source,
    req_no: command.requestId,
    req_version: command.requestVersion,
    request_type: command.requestType,
    workflow_id: command.workflowId,
    processing_billing_service_id: command.processingBillingServiceId,
    cr_num: command.crNumber,
    pat_context_version: command.patientContextVersion,
    workflow_fields: command.workflowFields,
    tariff_lines: (command.lines || []).map((line) => ({
      tariff_code: line.code,
      tariff_name: line.name,
      tariff_rate: line.rate,
      tariff_qty: line.qty,
      tariff_discount_percent: line.discount,
      tariff_source: line.source,
    })),
    transaction_total: command.displayedTotal,
    payment_details: toWirePaymentDetails(command.payment),
    idempotency_key: command.idempotencyKey,
  };
}

export function toTransactionQuery(filters = {}) {
  return {
    page: filters.page,
    size: filters.size,
    transaction_from_date: filters.from,
    transaction_to_date: filters.to,
    payment_mode: filters.paymentMode,
    transaction_status: filters.status,
  };
}

export function toShiftCloseCommand(command = {}) {
  return {
    shift_version: command.version,
    reconciliation_mode: command.reconciliationMode,
    denomination_counts: (command.denominations || []).map((item) => ({
      denomination_code: item.code,
      denomination_quantity: item.quantity,
    })),
  };
}

export function toShiftReopenCommand(command = {}) {
  return { shift_version: command.version };
}
