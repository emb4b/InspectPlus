export type SyncEntityName =
  | 'establishments'
  | 'inspection_reports'
  | 'purpose_of_inspection'
  | 'survey_reports'
  | 'compliance_air'
  | 'compliance_water'
  | 'compliance_hazwaste'
  | 'compliance_eia';

export interface SyncEntitySchema {
  entity: SyncEntityName;
  primaryKey: string;
  localPrimaryKey: string;
  updatedAtField: string | null;
  deletedAtField: string | null;
  softDelete: boolean;
  pushEnabled: boolean;
  pullEnabled: boolean;
  fields: Record<string, string>;
}

export const syncSchema: Record<SyncEntityName, SyncEntitySchema> = {
  establishments: {
    entity: 'establishments',
    primaryKey: 'estab_id',
    localPrimaryKey: 'estabId',
    updatedAtField: 'updated_at',
    deletedAtField: null,
    softDelete: false,
    pushEnabled: true,
    pullEnabled: true,
    fields: {
      estab_id: 'estabId',
      inspector_uid: 'inspectorUid',
      name: 'name',
      address: 'address',
      province: 'province',
      nature_of_business: 'natureOfBusiness',
      status: 'status',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      sync_status: 'syncStatus',
      device_id: 'deviceId',
    },
  },

  inspection_reports: {
    entity: 'inspection_reports',
    primaryKey: 'report_id',
    localPrimaryKey: 'reportId',
    updatedAtField: 'updated_at',
    deletedAtField: 'deleted_at',
    softDelete: true,
    pushEnabled: true,
    pullEnabled: true,
    fields: {
      report_id: 'reportId',
      estab_id: 'estabId',
      inspector_uid: 'inspectorUid',
      report_type: 'reportType',
      report_control_number: 'reportControlNumber',
      inspection_date: 'inspectionDate',
      snapshot: 'snapshot',
      permits_snapshot: 'permitsSnapshot',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      deleted_at: 'deletedAt',
      is_archived: 'isArchived',
      sync_status: 'syncStatus',
      device_id: 'deviceId',
    },
  },

  purpose_of_inspection: {
    entity: 'purpose_of_inspection',
    primaryKey: 'purpose_id',
    localPrimaryKey: 'purposeId',
    updatedAtField: null,
    deletedAtField: null,
    softDelete: false,
    pushEnabled: true,
    pullEnabled: true,
    fields: {
      purpose_id: 'purposeId',
      report_id: 'reportId',
      verify_new_application: 'verifyNewApplication',
      verify_renewal: 'verifyRenewal',
      verify_modification: 'verifyModification',
      application_type: 'applicationType',
      determine_compliance: 'determineCompliance',
      investigate_complaint: 'investigateComplaint',
      check_voluntary_commitment: 'checkVoluntaryCommitment',
      voluntary_commitment_type: 'voluntaryCommitmentType',
      others_specify: 'othersSpecify',
    },
  },

  survey_reports: {
    entity: 'survey_reports',
    primaryKey: 'survey_id',
    localPrimaryKey: 'surveyId',
    updatedAtField: 'updated_at',
    deletedAtField: 'deleted_at',
    softDelete: true,
    pushEnabled: true,
    pullEnabled: true,
    fields: {
      survey_id: 'surveyId',
      estab_id: 'estabId',
      inspector_uid: 'inspectorUid',
      report_control_number: 'reportControlNumber',
      inspection_date: 'inspectionDate',
      project_name: 'projectName',
      reference_code: 'referenceCode',
      proponent_name: 'proponentName',
      contact_person: 'contactPerson',
      contact_position: 'contactPosition',
      contact_number: 'contactNumber',
      email: 'email',
      project_location: 'projectLocation',
      geo_lat: 'geoLat',
      geo_lng: 'geoLng',
      area_size: 'areaSize',
      purpose: 'purpose',
      document_type: 'documentType',
      project_status: 'projectStatus',
      physical_parameters: 'physicalParameters',
      biological_parameters: 'biologicalParameters',
      socioeconomic_parameters: 'socioeconomicParameters',
      other_findings: 'otherFindings',
      remarks_recommendations: 'remarksRecommendations',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      deleted_at: 'deletedAt',
      is_archived: 'isArchived',
      sync_status: 'syncStatus',
      device_id: 'deviceId',
    },
  },

  compliance_air: {
    entity: 'compliance_air',
    primaryKey: 'compliance_id',
    localPrimaryKey: 'complianceId',
    updatedAtField: null,
    deletedAtField: null,
    softDelete: false,
    pushEnabled: true,
    pullEnabled: true,
    fields: {
      compliance_id: 'complianceId',
      report_id: 'reportId',
      emission_sources: 'emissionSources',
      checklist_dao_2004_26: 'checklistDao200426',
      checklist_dao_2000_81: 'checklistDao200081',
      checklist_emb_mc: 'checklistEmbMc',
      pto_conditions: 'ptoConditions',
      other_observations: 'otherObservations',
      remarks_recommendations: 'remarksRecommendations',
      documents_reviewed: 'documentsReviewed',
    },
  },

  compliance_water: {
    entity: 'compliance_water',
    primaryKey: 'compliance_id',
    localPrimaryKey: 'complianceId',
    updatedAtField: null,
    deletedAtField: null,
    softDelete: false,
    pushEnabled: true,
    pullEnabled: true,
    fields: {
      compliance_id: 'complianceId',
      report_id: 'reportId',
      water_sources: 'waterSources',
      wastewater_sources: 'wastewaterSources',
      abstracted_water_quality: 'abstractedWaterQuality',
      has_wwtp: 'hasWwtp',
      wwtp_type: 'wwtpType',
      wwtp_details: 'wwtpDetails',
      wwtp_components: 'wwtpComponents',
      wwtp_condition: 'wwtpCondition',
      wwtp_under_construction: 'wwtpUnderConstruction',
      sampling_points: 'samplingPoints',
      previous_inspection_summary: 'previousInspectionSummary',
      checklist_dao_2005_10: 'checklistDao200510',
      dp_conditions: 'dpConditions',
      other_observations: 'otherObservations',
      remarks_recommendations: 'remarksRecommendations',
      documents_reviewed: 'documentsReviewed',
    },
  },

  compliance_hazwaste: {
    entity: 'compliance_hazwaste',
    primaryKey: 'compliance_id',
    localPrimaryKey: 'complianceId',
    updatedAtField: null,
    deletedAtField: null,
    softDelete: false,
    pushEnabled: true,
    pullEnabled: true,
    fields: {
      compliance_id: 'complianceId',
      report_id: 'reportId',
      hazwaste_generator_id: 'hazwasteGeneratorId',
      hazwaste_id_date_issued: 'hazwasteIdDateIssued',
      waste_types_generated: 'wasteTypesGenerated',
      checklist_registration: 'checklistRegistration',
      checklist_storage: 'checklistStorage',
      checklist_packaging: 'checklistPackaging',
      checklist_labeling: 'checklistLabeling',
      checklist_transport: 'checklistTransport',
      checklist_emergency: 'checklistEmergency',
      checklist_personnel_training: 'checklistPersonnelTraining',
      checklist_manifest_system: 'checklistManifestSystem',
      hwid_conditions: 'hwidConditions',
      other_observations: 'otherObservations',
      remarks_recommendations: 'remarksRecommendations',
      documents_reviewed: 'documentsReviewed',
    },
  },

  compliance_eia: {
    entity: 'compliance_eia',
    primaryKey: 'compliance_id',
    localPrimaryKey: 'complianceId',
    updatedAtField: null,
    deletedAtField: null,
    softDelete: false,
    pushEnabled: true,
    pullEnabled: true,
    fields: {
      compliance_id: 'complianceId',
      report_id: 'reportId',
      checklist_dao_2003_30: 'checklistDao200330',
      ecc_emp_conditions: 'eccEmpConditions',
      other_observations: 'otherObservations',
      remarks_recommendations: 'remarksRecommendations',
      documents_reviewed: 'documentsReviewed',
    },
  },
};

export const coreSyncEntities: SyncEntityName[] = [
  'establishments',
  'inspection_reports',
  'survey_reports',
];

export function getSyncEntitySchema(entity: SyncEntityName): SyncEntitySchema {
  return syncSchema[entity];
}

export function getBackendFieldMap(entity: SyncEntityName): Record<string, string> {
  return syncSchema[entity].fields;
}

export function getLocalFieldMap(entity: SyncEntityName): Record<string, string> {
  const backendToLocal = syncSchema[entity].fields;

  return Object.fromEntries(
    Object.entries(backendToLocal).map(([backendField, localField]) => [
      localField,
      backendField,
    ])
  );
}