export type SyncStatus =
  | 'pending'
  | 'pending_create'
  | 'pending_update'
  | 'pending_delete'
  | 'synced';

export type ISODateString = string;
export type ISODateTimeString = string;
export type JsonObject = Record<string, unknown>;
export type JsonArray = unknown[];

export interface SyncEntityChanges<TCreated = unknown, TUpdated = TCreated> {
  created: TCreated[];
  updated: TUpdated[];
  deleted: string[];
}

export interface PullChangesResponse {
  changes: {
    establishments: SyncEntityChanges<EstablishmentDTO>;
    inspection_reports: SyncEntityChanges<InspectionReportDTO>;
    purpose_of_inspection: SyncEntityChanges<PurposeOfInspectionDTO>;
    survey_reports: SyncEntityChanges<SurveyReportDTO>;
    compliance_air: SyncEntityChanges<ComplianceAirDTO>;
    compliance_water: SyncEntityChanges<ComplianceWaterDTO>;
    compliance_hazwaste: SyncEntityChanges<ComplianceHazwasteDTO>;
    compliance_eia: SyncEntityChanges<ComplianceEiaDTO>;
  };
  timestamp: number;
}

export interface PushChangesPayload {
  establishments?: SyncEntityChanges<EstablishmentDTO>;
  inspection_reports?: SyncEntityChanges<InspectionReportDTO>;
  purpose_of_inspection?: SyncEntityChanges<PurposeOfInspectionDTO>;
  survey_reports?: SyncEntityChanges<SurveyReportDTO>;
  compliance_air?: SyncEntityChanges<ComplianceAirDTO>;
  compliance_water?: SyncEntityChanges<ComplianceWaterDTO>;
  compliance_hazwaste?: SyncEntityChanges<ComplianceHazwasteDTO>;
  compliance_eia?: SyncEntityChanges<ComplianceEiaDTO>;
}

export interface PushChangesResponse {
  status: 'ok';
}

export interface EstablishmentDTO {
  estab_id: string;
  inspector_uid: string;
  name: string;
  address: string;
  province: string;
  nature_of_business: string;
  status: string;
  created_at?: ISODateTimeString;
  updated_at?: ISODateTimeString;
  sync_status?: SyncStatus | string;
  device_id?: string | null;
}

export interface InspectionReportDTO {
  report_id: string;
  estab_id: string;
  inspector_uid: string;
  report_type: string;
  report_control_number: string;
  inspection_date: ISODateString;
  snapshot: JsonObject;
  permits_snapshot: JsonObject;
  created_at?: ISODateTimeString;
  updated_at?: ISODateTimeString;
  deleted_at?: ISODateTimeString | null;
  is_archived?: boolean;
  sync_status?: SyncStatus | string;
  device_id?: string | null;
}

export interface PurposeOfInspectionDTO {
  purpose_id: string;
  report_id: string;
  verify_new_application?: boolean;
  verify_renewal?: boolean;
  verify_modification?: boolean;
  application_type?: string | null;
  determine_compliance?: boolean;
  investigate_complaint?: boolean;
  check_voluntary_commitment?: boolean;
  voluntary_commitment_type?: string | null;
  others_specify?: string | null;
}

export interface SurveyReportDTO {
  survey_id: string;
  estab_id: string;
  inspector_uid: string;
  report_control_number: string;
  inspection_date: ISODateString;
  project_name: string;
  reference_code?: string | null;
  proponent_name: string;
  contact_person?: string | null;
  contact_position?: string | null;
  contact_number?: string | null;
  email?: string | null;
  project_location: string;
  geo_lat?: number | null;
  geo_lng?: number | null;
  area_size?: number | null;
  purpose: string;
  document_type?: string | null;
  project_status?: string | null;
  physical_parameters?: JsonObject;
  biological_parameters?: JsonObject;
  socioeconomic_parameters?: JsonObject;
  other_findings?: string | null;
  remarks_recommendations?: string | null;
  created_at?: ISODateTimeString;
  updated_at?: ISODateTimeString;
  deleted_at?: ISODateTimeString | null;
  is_archived?: boolean;
  sync_status?: SyncStatus | string;
  device_id?: string | null;
}

export interface ComplianceAirDTO {
  compliance_id: string;
  report_id: string;
  emission_sources?: JsonArray;
  checklist_dao_2004_26?: JsonArray;
  checklist_dao_2000_81?: JsonArray;
  checklist_emb_mc?: JsonArray;
  pto_conditions?: JsonArray;
  other_observations?: string | null;
  remarks_recommendations?: string | null;
  documents_reviewed?: JsonArray;
}

export interface ComplianceWaterDTO {
  compliance_id: string;
  report_id: string;
  water_sources?: JsonArray;
  wastewater_sources?: JsonArray;
  abstracted_water_quality?: JsonArray;
  has_wwtp?: boolean;
  wwtp_type?: string | null;
  wwtp_details?: JsonArray;
  wwtp_components?: JsonArray;
  wwtp_condition?: string | null;
  wwtp_under_construction?: boolean;
  sampling_points?: JsonArray;
  previous_inspection_summary?: JsonObject;
  checklist_dao_2005_10?: JsonArray;
  dp_conditions?: JsonArray;
  other_observations?: string | null;
  remarks_recommendations?: string | null;
  documents_reviewed?: JsonArray;
}

export interface ComplianceHazwasteDTO {
  compliance_id: string;
  report_id: string;
  hazwaste_generator_id?: string | null;
  hazwaste_id_date_issued?: ISODateString | null;
  waste_types_generated?: JsonArray;
  checklist_registration?: JsonArray;
  checklist_storage?: JsonArray;
  checklist_packaging?: JsonArray;
  checklist_labeling?: JsonArray;
  checklist_transport?: JsonArray;
  checklist_emergency?: JsonArray;
  checklist_personnel_training?: JsonArray;
  checklist_manifest_system?: JsonArray;
  hwid_conditions?: JsonArray;
  other_observations?: string | null;
  remarks_recommendations?: string | null;
  documents_reviewed?: JsonArray;
}

export interface ComplianceEiaDTO {
  compliance_id: string;
  report_id: string;
  checklist_dao_2003_30?: JsonArray;
  ecc_emp_conditions?: JsonArray;
  other_observations?: string | null;
  remarks_recommendations?: string | null;
  documents_reviewed?: JsonArray;
}

export interface SyncMetadata {
  lastPulledAt: number | null;
  lastSyncAt?: number | null;
  isSyncing?: boolean;
}

export type CoreSyncEntityName =
  | 'establishments'
  | 'inspection_reports'
  | 'survey_reports';

export type SyncEntityName = keyof PullChangesResponse['changes'];