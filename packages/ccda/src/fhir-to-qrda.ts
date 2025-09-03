// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import { generateId } from '@medplum/core';
import { Bundle, Patient } from '@medplum/fhirtypes';
import { mapFhirToCcdaDateTime } from './datetime';
import { OID_HL7_REGISTERED_MODELS, OID_LOINC_CODE_SYSTEM } from './oids';
import {
  OID_CCN_SYSTEM,
  OID_CMS_EHR_CERTIFICATION_NUMBER,
  OID_ECQM_VERSION_SPECIFIC_ID,
  OID_ITIN_ID,
  OID_ORGANIZATION_ID,
  OID_PATIENT_ID,
} from './qrda-oids';
import {
  CMS68V14_MEASURE_GUID,
  LOINC_MEASURE_DOCUMENT,
  LOINC_PATIENT_DATA,
  LOINC_QUALITY_MEASURE_REPORT,
  LOINC_REPORTING_PARAMETERS,
  SNOMED_OBSERVATION_PARAMETERS,
} from './qrda-systems';
import {
  QRDA_CATEGORY_I_TEMPLATE_IDS,
  QRDA_MEASURE_REFERENCE_TEMPLATE_IDS,
  QRDA_MEASURE_SECTION_TEMPLATE_IDS,
  QRDA_PATIENT_DATA_SECTION_TEMPLATE_IDS,
  QRDA_REPORTING_PARAMETERS_ACT_TEMPLATE_IDS,
  QRDA_REPORTING_PARAMETERS_TEMPLATE_IDS,
} from './qrda-templates';
import { Qrda, QrdaParticipant } from './qrda-types';

/**
 * Options for FHIR to QRDA conversion
 */
export interface FhirToQrdaOptions {
  /**
   * QRDA category to generate
   */
  category?: 'I' | 'III';

  /**
   * Quality measure information
   */
  measure?: {
    id?: string;
    title?: string;
    version?: string;
    setId?: string;
  };

  /**
   * Reporting period (required)
   */
  reportingPeriod: {
    start: string;
    end: string;
  };

  /**
   * Organization information for document header
   */
  organization?: {
    name?: string;
    id?: string;
    npi?: string;
    address?: {
      line?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };

  /**
   * Author information
   */
  author?: {
    name?: string;
    npi?: string;
  };
}

/**
 * Convert a FHIR bundle to a QRDA Category I document.
 * @param bundle - The FHIR bundle to convert.
 * @param options - QRDA generation options.
 * @returns The QRDA document.
 */
export function convertFhirToQrda(bundle: Bundle, options: FhirToQrdaOptions): Qrda {
  return new FhirToQrdaConverter(bundle, options).convert();
}

/**
 * The FhirToQrdaConverter class is responsible for converting a FHIR bundle to a QRDA document.
 */
class FhirToQrdaConverter {
  private readonly bundle: Bundle;
  private readonly options: FhirToQrdaOptions;
  private readonly patient: Patient;

  /**
   * Creates a new FhirToQrdaConverter for the given FHIR bundle.
   * @param bundle - The FHIR bundle to convert.
   * @param options - QRDA generation options.
   */
  constructor(bundle: Bundle, options: FhirToQrdaOptions) {
    this.bundle = bundle;
    this.options = options;

    // Find patient (required for QRDA)
    const patient = this.findResource<Patient>('Patient');
    if (!patient) {
      throw new Error('Patient not found in bundle');
    }
    this.patient = patient;
  }

  /**
   * Convert the FHIR bundle to a QRDA document.
   * @returns The QRDA document.
   */
  convert(): Qrda {
    const currentDateTime = new Date().toISOString();

    return {
      realmCode: { '@_code': 'US' },
      typeId: {
        '@_root': OID_HL7_REGISTERED_MODELS,
        '@_extension': 'POCD_HD000040',
      },
      templateId: QRDA_CATEGORY_I_TEMPLATE_IDS,
      id: [{ '@_root': generateId() }],
      code: {
        '@_code': LOINC_QUALITY_MEASURE_REPORT,
        '@_codeSystem': OID_LOINC_CODE_SYSTEM,
        '@_codeSystemName': 'LOINC',
        '@_displayName': 'Quality Measure Report',
      },
      title: 'QRDA Incidence Report',
      effectiveTime: [{ '@_value': mapFhirToCcdaDateTime(currentDateTime) }],
      confidentialityCode: { '@_code': 'N', '@_codeSystem': '2.16.840.1.113883.5.25' },
      languageCode: { '@_code': 'en' },
      recordTarget: this.buildRecordTarget(),
      author: this.buildAuthor(currentDateTime),
      custodian: this.buildCustodian(),
      legalAuthenticator: this.buildLegalAuthenticator(currentDateTime),
      participant: this.buildParticipant(),
      documentationOf: this.buildDocumentationOf(),
      component: this.buildStructuredBody(),
    };
  }

  /**
   * Build the record target section with patient demographics
   * @returns The record target section for the QRDA document
   */
  private buildRecordTarget(): Record<string, any> {
    const patientName = this.patient.name?.[0];
    const address = this.patient.address?.[0];
    const telecom = this.patient.telecom?.find((t) => t.system === 'phone');
    const email = this.patient.telecom?.find((t) => t.system === 'email');

    // Extract race and ethnicity extensions - simplified for now
    // TODO: Implement proper extension extraction when available
    const raceCode = '2106-3'; // Default to White
    const ethnicityCode = '2135-2'; // Default to Hispanic or Latino

    return {
      patientRole: {
        id: {
          '@_extension': this.patient.id,
          '@_root': OID_PATIENT_ID,
        },
        addr: address
          ? {
              '@_use': 'HP',
              streetAddressLine: address.line?.[0] ?? '',
              city: address.city ?? '',
              state: address.state ?? '',
              postalCode: address.postalCode ?? '',
              country: address.country || 'US',
            }
          : undefined,
        telecom: [
          telecom ? { '@_use': 'HP', '@_value': `tel:${telecom.value}` } : undefined,
          email ? { '@_use': 'HP', '@_value': `mailto:${email.value}` } : undefined,
        ].filter(Boolean),
        patient: {
          name: {
            given: patientName?.given?.[0] ?? '',
            family: patientName?.family ?? '',
          },
          administrativeGenderCode: {
            '@_code': this.patient.gender,
            '@_codeSystem': '2.16.840.1.113883.5.1',
            '@_codeSystemName': 'AdministrativeGender',
          },
          birthTime: { '@_value': mapFhirToCcdaDateTime(this.patient.birthDate + 'T00:00:00.000Z') },
          raceCode: {
            '@_code': raceCode,
            '@_codeSystem': '2.16.840.1.113883.6.238',
            '@_codeSystemName': 'CDCREC',
          },
          ethnicGroupCode: {
            '@_code': ethnicityCode,
            '@_codeSystem': '2.16.840.1.113883.6.238',
            '@_codeSystemName': 'CDCREC',
          },
          languageCommunication: {
            templateId: [
              { '@_root': '2.16.840.1.113883.3.88.11.83.2', '@_assigningAuthorityName': 'HITSP/C83' },
              { '@_root': '1.3.6.1.4.1.19376.1.5.3.1.2.1', '@_assigningAuthorityName': 'IHE/PCC' },
            ],
            languageCode: { '@_code': 'eng' },
          },
        },
      },
    };
  }

  /**
   * Build the author section
   * @param currentDateTime - The current date/time for the document
   * @returns The author section for the QRDA document
   */
  private buildAuthor(currentDateTime: string): Record<string, any> {
    const authorNpi = this.options.author?.npi || '1250504853';
    const authorName = this.options.author?.name || 'Medplum Test System';
    const orgAddress = this.options.organization?.address;

    return {
      time: { '@_value': mapFhirToCcdaDateTime(currentDateTime) },
      assignedAuthor: {
        id: { '@_extension': authorNpi, '@_root': '2.16.840.1.113883.4.6' },
        addr: {
          streetAddressLine: orgAddress?.line || '123 Happy St',
          city: orgAddress?.city || 'Sunnyvale',
          state: orgAddress?.state || 'CA',
          postalCode: orgAddress?.postalCode || '95008',
          country: orgAddress?.country || 'US',
        },
        telecom: { '@_use': 'WP', '@_value': 'tel:(781)271-3000' },
        assignedAuthoringDevice: {
          manufacturerModelName: authorName,
          softwareName: authorName,
        },
      },
    };
  }

  /**
   * Build the custodian section
   * @returns The custodian section for the QRDA document
   */
  private buildCustodian(): Record<string, any> {
    const orgName = this.options.organization?.name || 'Medplum Test Deck';
    const orgId = this.options.organization?.id || '117323';
    const orgAddress = this.options.organization?.address;

    return {
      assignedCustodian: {
        representedCustodianOrganization: {
          id: { '@_extension': orgId, '@_root': OID_CCN_SYSTEM },
          name: orgName,
          telecom: { '@_use': 'WP', '@_value': 'tel:(781)271-3000' },
          addr: {
            '@_use': 'HP',
            streetAddressLine: orgAddress?.line || '202 Burlington Rd.',
            city: orgAddress?.city || 'Bedford',
            state: orgAddress?.state || 'MA',
            postalCode: orgAddress?.postalCode || '01730',
            country: orgAddress?.country || 'US',
          },
        },
      },
    };
  }

  /**
   * Build the legal authenticator section
   * @param currentDateTime - The current date/time for the document
   * @returns The legal authenticator section for the QRDA document
   */
  private buildLegalAuthenticator(currentDateTime: string): Record<string, any> {
    const orgAddress = this.options.organization?.address;

    return {
      time: { '@_value': mapFhirToCcdaDateTime(currentDateTime) },
      signatureCode: { '@_code': 'S' },
      assignedEntity: {
        id: { '@_root': generateId() },
        addr: {
          streetAddressLine: orgAddress?.line || '123 Happy St',
          city: orgAddress?.city || 'Sunnyvale',
          state: orgAddress?.state || 'CA',
          postalCode: orgAddress?.postalCode || '95008',
          country: orgAddress?.country || 'US',
        },
        telecom: { '@_use': 'WP', '@_value': 'tel:(781)271-3000' },
        assignedPerson: {
          name: {
            given: 'John',
            family: 'Doe',
          },
        },
        representedOrganization: {
          id: { '@_root': OID_ORGANIZATION_ID },
          name: this.options.organization?.name || 'Medplum Test System',
        },
      },
    };
  }

  /**
   * Build the participant section for device information
   * @returns The participant section for the QRDA document
   */
  private buildParticipant(): QrdaParticipant[] {
    return [
      {
        '@_typeCode': 'DEV',
        associatedEntity: {
          '@_classCode': 'RGPR',
          id: { '@_extension': '0015CPV4ZTB4WBU', '@_root': OID_CMS_EHR_CERTIFICATION_NUMBER },
        },
      },
    ];
  }

  /**
   * Build the documentation section
   * @returns The documentation section for the QRDA document
   */
  private buildDocumentationOf(): Record<string, any> {
    const orgAddress = this.options.organization?.address;

    return {
      '@_typeCode': 'DOC',
      serviceEvent: {
        '@_classCode': 'PCPR',
        effectiveTime: {
          low: { '@_nullFlavor': 'UNK' },
          high: { '@_nullFlavor': 'UNK' },
        },
        performer: {
          '@_typeCode': 'PRF',
          time: {
            low: { '@_nullFlavor': 'UNK' },
            high: { '@_nullFlavor': 'UNK' },
          },
          assignedEntity: {
            id: [
              { '@_extension': this.options.author?.npi || '1250504853', '@_root': '2.16.840.1.113883.4.6' },
              { '@_extension': this.options.organization?.id || '117323', '@_root': OID_CCN_SYSTEM },
            ],
            code: {
              '@_code': '207Q00000X',
              '@_codeSystem': '2.16.840.1.113883.6.101',
              '@_codeSystemName': 'Healthcare Provider Taxonomy (HIPAA)',
            },
            addr: {
              '@_use': 'HP',
              streetAddressLine: orgAddress?.line || '202 Burlington Rd.',
              city: orgAddress?.city || 'Bedford',
              state: orgAddress?.state || 'MA',
              postalCode: orgAddress?.postalCode || '01730',
              country: orgAddress?.country || 'US',
            },
            assignedPerson: {
              name: {
                given: 'Sylvia',
                family: 'Joseph',
              },
            },
            representedOrganization: {
              id: { '@_extension': '916854671', '@_root': OID_ITIN_ID },
              addr: {
                '@_use': 'HP',
                streetAddressLine: orgAddress?.line || '202 Burlington Rd.',
                city: orgAddress?.city || 'Bedford',
                state: orgAddress?.state || 'MA',
                postalCode: orgAddress?.postalCode || '01730',
                country: orgAddress?.country || 'US',
              },
            },
          },
        },
      },
    };
  }

  /**
   * Build the structured body with all sections
   * @returns The structured body component for the QRDA document
   */
  private buildStructuredBody(): Record<string, any> {
    return {
      structuredBody: {
        component: [this.buildMeasureSection(), this.buildReportingParametersSection(), this.buildPatientDataSection()],
      },
    };
  }

  /**
   * Build the measure section
   * @returns The measure section for the QRDA document
   */
  private buildMeasureSection(): Record<string, any> {
    const measureId = this.options.measure?.id || 'CMS68v14';
    const measureTitle =
      this.options.measure?.title ||
      'Percentage of visits for which the eligible clinician attests to documenting a list of current medications using all immediate resources available on the date of the encounter';
    const measureVersionId = '8A6D0454-8DF0-2D9F-018D-F6AEBA950637';

    return {
      section: {
        templateId: QRDA_MEASURE_SECTION_TEMPLATE_IDS,
        code: { '@_code': LOINC_MEASURE_DOCUMENT, '@_codeSystem': OID_LOINC_CODE_SYSTEM },
        title: 'Measure Section',
        text: {
          table: {
            '@_border': '1',
            '@_width': '100%',
            thead: {
              tr: {
                th: ['eMeasure Title', 'Version specific identifier'],
              },
            },
            tbody: {
              tr: {
                td: [measureTitle, measureVersionId, ''],
              },
            },
          },
        },
        entry: {
          organizer: {
            '@_classCode': 'CLUSTER',
            '@_moodCode': 'EVN',
            templateId: QRDA_MEASURE_REFERENCE_TEMPLATE_IDS,
            id: { '@_extension': generateId(), '@_root': OID_PATIENT_ID },
            statusCode: { '@_code': 'completed' },
            reference: {
              '@_typeCode': 'REFR',
              externalDocument: {
                '@_classCode': 'DOC',
                '@_moodCode': 'EVN',
                id: { '@_extension': measureVersionId, '@_root': OID_ECQM_VERSION_SPECIFIC_ID },
                text: measureTitle,
                setId: { '@_root': this.options.measure?.setId || CMS68V14_MEASURE_GUID },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Build the reporting parameters section
   * @returns The reporting parameters section for the QRDA document
   */
  private buildReportingParametersSection(): Record<string, any> {
    return {
      section: {
        templateId: QRDA_REPORTING_PARAMETERS_TEMPLATE_IDS,
        code: { '@_code': LOINC_REPORTING_PARAMETERS, '@_codeSystem': OID_LOINC_CODE_SYSTEM },
        title: 'Reporting Parameters',
        text: '',
        entry: {
          '@_typeCode': 'DRIV',
          act: {
            '@_classCode': 'ACT',
            '@_moodCode': 'EVN',
            templateId: QRDA_REPORTING_PARAMETERS_ACT_TEMPLATE_IDS,
            id: { '@_extension': generateId(), '@_root': OID_PATIENT_ID },
            code: {
              '@_code': SNOMED_OBSERVATION_PARAMETERS,
              '@_codeSystem': '2.16.840.1.113883.6.96',
              '@_displayName': 'Observation Parameters',
            },
            effectiveTime: {
              low: { '@_value': mapFhirToCcdaDateTime(this.options.reportingPeriod.start) },
              high: { '@_value': mapFhirToCcdaDateTime(this.options.reportingPeriod.end) },
            },
          },
        },
      },
    };
  }

  /**
   * Build the patient data section
   * @returns The patient data section for the QRDA document
   */
  private buildPatientDataSection(): Record<string, any> {
    const entries: any[] = [];

    // TODO: Add encounter entries
    // TODO: Add intervention entries
    // TODO: Add procedure entries
    // TODO: Add payer entries

    return {
      section: {
        templateId: QRDA_PATIENT_DATA_SECTION_TEMPLATE_IDS,
        code: { '@_code': LOINC_PATIENT_DATA, '@_codeSystem': OID_LOINC_CODE_SYSTEM },
        title: 'Patient Data',
        text: '',
        entry: entries,
      },
    };
  }

  /**
   * Find a resource in the FHIR bundle by resource type.
   * @param resourceType - The type of resource to find.
   * @returns The resource if found, otherwise undefined.
   */
  private findResource<T>(resourceType: string): T | undefined {
    return this.bundle.entry?.find((e) => e.resource?.resourceType === resourceType)?.resource as T;
  }

  /**
   * Find all resources in the FHIR bundle by resource type.
   * @param resourceType - The type of resource to find.
   * @returns Array of resources of the specified type.
   */
  private findResourcesByType<T>(resourceType: string): T[] {
    return (
      this.bundle.entry?.filter((e) => e.resource?.resourceType === resourceType)?.map((e) => e.resource as T) || []
    );
  }
}
