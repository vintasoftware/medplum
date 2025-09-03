// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Ccda, CcdaCode, CcdaId, CcdaSection, CcdaTemplateId } from './types';

export interface Qrda extends Ccda {
  participant?: QrdaParticipant[];
}

export interface QrdaParticipant {
  '@_typeCode': 'DEV';
  associatedEntity: QrdaAssociatedEntity;
}

export interface QrdaAssociatedEntity {
  '@_classCode': 'RGPR';
  id: CcdaId;
}

export interface QrdaMeasureSection extends Omit<CcdaSection, 'entry'> {
  entry: QrdaMeasureEntry;
}

export interface QrdaMeasureEntry {
  organizer: QrdaMeasureOrganizer;
}

export interface QrdaMeasureOrganizer {
  '@_classCode': 'CLUSTER';
  '@_moodCode': 'EVN';
  templateId: CcdaTemplateId[];
  id: CcdaId;
  statusCode: CcdaCode;
  reference: QrdaMeasureReference;
}

export interface QrdaMeasureReference {
  '@_typeCode': 'REFR';
  externalDocument: QrdaExternalDocument;
}

export interface QrdaExternalDocument {
  '@_classCode': 'DOC';
  '@_moodCode': 'EVN';
  id: CcdaId;
  text: string;
  setId: CcdaId;
}
