// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { OID_US_REALM_CDA_HEADER } from './oids';
import {
  OID_CMS_QRDA_CATEGORY_I,
  OID_EMEASURE_REFERENCE_QDM,
  OID_MEASURE_REFERENCE,
  OID_MEASURE_SECTION,
  OID_MEASURE_SECTION_QDM,
  OID_PATIENT_DATA_SECTION,
  OID_PATIENT_DATA_SECTION_QDM_V8,
  OID_PATIENT_DATA_SECTION_QDM_V8_CMS,
  OID_QDM_BASED_QRDA,
  OID_QRDA_CATEGORY_I,
  OID_REPORTING_PARAMETERS_ACT,
  OID_REPORTING_PARAMETERS_ACT_CMS,
  OID_REPORTING_PARAMETERS_SECTION,
  OID_REPORTING_PARAMETERS_SECTION_CMS,
} from './qrda-oids';
import { CcdaTemplateId } from './types';

/**
 * QRDA Category I Template IDs for the document header
 */
export const QRDA_CATEGORY_I_TEMPLATE_IDS: CcdaTemplateId[] = [
  { '@_root': OID_US_REALM_CDA_HEADER, '@_extension': '2015-08-01' },
  { '@_root': OID_QRDA_CATEGORY_I, '@_extension': '2017-08-01' },
  { '@_root': OID_QDM_BASED_QRDA, '@_extension': '2021-08-01' },
  { '@_root': OID_CMS_QRDA_CATEGORY_I, '@_extension': '2022-02-01' },
];

/**
 * QRDA Measure Section Template IDs
 */
export const QRDA_MEASURE_SECTION_TEMPLATE_IDS: CcdaTemplateId[] = [
  { '@_root': OID_MEASURE_SECTION },
  { '@_root': OID_MEASURE_SECTION_QDM },
];

/**
 * QRDA Reporting Parameters Section Template IDs
 */
export const QRDA_REPORTING_PARAMETERS_TEMPLATE_IDS: CcdaTemplateId[] = [
  { '@_root': OID_REPORTING_PARAMETERS_SECTION },
  { '@_root': OID_REPORTING_PARAMETERS_SECTION_CMS, '@_extension': '2016-03-01' },
];

/**
 * QRDA Patient Data Section Template IDs
 */
export const QRDA_PATIENT_DATA_SECTION_TEMPLATE_IDS: CcdaTemplateId[] = [
  { '@_root': OID_PATIENT_DATA_SECTION },
  { '@_root': OID_PATIENT_DATA_SECTION_QDM_V8, '@_extension': '2021-08-01' },
  { '@_root': OID_PATIENT_DATA_SECTION_QDM_V8_CMS, '@_extension': '2022-02-01' },
];

/**
 * QRDA Measure Reference Template IDs
 */
export const QRDA_MEASURE_REFERENCE_TEMPLATE_IDS: CcdaTemplateId[] = [
  { '@_root': OID_MEASURE_REFERENCE },
  { '@_root': OID_EMEASURE_REFERENCE_QDM },
];

/**
 * QRDA Reporting Parameters Act Template IDs
 */
export const QRDA_REPORTING_PARAMETERS_ACT_TEMPLATE_IDS: CcdaTemplateId[] = [
  { '@_root': OID_REPORTING_PARAMETERS_ACT },
  { '@_root': OID_REPORTING_PARAMETERS_ACT_CMS, '@_extension': '2016-03-01' },
];
