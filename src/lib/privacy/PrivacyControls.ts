/**
 * Privacy Controls System for GDPR, CCPA, and SOC 2 Compliance
 * Manages consent, data subject rights, and privacy preferences
 */

export type ConsentPurpose = 
  | 'analytics' 
  | 'marketing' 
  | 'functional' 
  | 'personalization' 
  | 'ai_training' 
  | 'data_sharing' 
  | 'cookies'
  | 'location'
  | 'biometric';

export type LegalBasis = 
  | 'consent' 
  | 'contract' 
  | 'legal_obligation' 
  | 'vital_interests' 
  | 'public_task' 
  | 'legitimate_interests';

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  legalBasis: LegalBasis;
  consentDate: Date;
  expiryDate?: Date;
  withdrawalDate?: Date;
  ipAddress: string;
  userAgent: string;
  version: string; // Privacy policy version
  mechanism: 'explicit' | 'implicit' | 'opt_in' | 'opt_out';
  metadata: Record<string, any>;
}

export interface DataSubjectRights {
  access: boolean;          // Right to access personal data
  rectification: boolean;   // Right to correct inaccurate data
  erasure: boolean;         // Right to be forgotten
  portability: boolean;     // Right to data portability
  restriction: boolean;     // Right to restrict processing
  objection: boolean;       // Right to object to processing
  withdrawConsent: boolean; // Right to withdraw consent
}

export interface PrivacyPreferences {
  userId: string;
  dataRetention: {
    chatHistory: number;     // days
    userProfile: number;     // days
    analytics: number;       // days
    logs: number;           // days
  };
  sharing: {
    allowThirdParty: boolean;
    allowAnalytics: boolean;
    allowMarketing: boolean;
    allowAITraining: boolean;
  };
  communication: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  dataProcessing: {
    allowProfiling: boolean;
    allowAutomatedDecision: boolean;
    allowCrossBorderTransfer: boolean;
  };
  updated: Date;
}

export interface DataExportRequest {
  id: string;
  userId: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: 'json' | 'csv' | 'xml' | 'pdf';
  dataTypes: string[];
  completedDate?: Date;
  downloadUrl?: string;
  expiryDate?: Date;
  requestedBy: string;
  ipAddress: string;
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partially_completed';
  deletionDate?: Date;
  dataTypes: string[];
  reason: string;
  retentionExceptions: string[];
  requestedBy: string;
  ipAddress: string;
  verificationCode: string;
}

export interface PrivacyAuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  action: 'consent_granted' | 'consent_withdrawn' | 'data_accessed' | 'data_exported' | 'data_deleted' | 'preferences_updated';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  legalBasis?: LegalBasis;
  riskLevel: 'low' | 'medium' | 'high';
}

export class PrivacyControlsManager {
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private privacyPreferences: Map<string, PrivacyPreferences> = new Map();
  private exportRequests: Map<string, DataExportRequest> = new Map();
  private deletionRequests: Map<string, DataDeletionRequest> = new Map();
  private auditEvents: PrivacyAuditEvent[] = [];

  constructor() {
    this.initializeDefaultPreferences();
  }

  private initializeDefaultPreferences(): void {
    // Default privacy preferences for new users
    const defaultPreferences: Omit<PrivacyPreferences, 'userId'> = {
      dataRetention: {
        chatHistory: 365,      // 1 year
        userProfile: 2555,     // 7 years
        analytics: 90,         // 3 months
        logs: 30              // 1 month
      },
      sharing: {
        allowThirdParty: false,
        allowAnalytics: false,
        allowMarketing: false,
        allowAITraining: false
      },
      communication: {
        email: true,
        sms: false,
        push: true,
        inApp: true
      },
      dataProcessing: {
        allowProfiling: false,
        allowAutomatedDecision: false,
        allowCrossBorderTransfer: false
      },
      updated: new Date()
    };

    // Store as template
    localStorage.setItem('default_privacy_preferences', JSON.stringify(defaultPreferences));
  }

  // CONSENT MANAGEMENT
  async recordConsent(
    userId: string,
    purpose: ConsentPurpose,
    granted: boolean,
    legalBasis: LegalBasis,
    metadata: {
      ipAddress: string;
      userAgent: string;
      version: string;
      mechanism: 'explicit' | 'implicit' | 'opt_in' | 'opt_out';
      expiryDays?: number;
    }
  ): Promise<string> {
    const consentRecord: ConsentRecord = {
      id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      purpose,
      granted,
      legalBasis,
      consentDate: new Date(),
      expiryDate: metadata.expiryDays ? 
        new Date(Date.now() + metadata.expiryDays * 24 * 60 * 60 * 1000) : 
        undefined,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      version: metadata.version,
      mechanism: metadata.mechanism,
      metadata: metadata
    };

    // Store consent record
    const userConsents = this.consentRecords.get(userId) || [];
    userConsents.push(consentRecord);
    this.consentRecords.set(userId, userConsents);

    await this.persistConsentRecord(consentRecord);

    // Audit the consent
    await this.auditPrivacyEvent({
      action: granted ? 'consent_granted' : 'consent_withdrawn',
      userId,
      details: { purpose, legalBasis, mechanism: metadata.mechanism },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      legalBasis,
      riskLevel: 'low'
    });

    console.log(`🔒 Consent ${granted ? 'granted' : 'withdrawn'} for ${purpose}: ${userId}`);
    return consentRecord.id;
  }

  async withdrawConsent(
    userId: string,
    purpose: ConsentPurpose,
    metadata: { ipAddress: string; userAgent: string }
  ): Promise<void> {
    const userConsents = this.consentRecords.get(userId) || [];
    const latestConsent = userConsents
      .filter(c => c.purpose === purpose && c.granted && !c.withdrawalDate)
      .sort((a, b) => b.consentDate.getTime() - a.consentDate.getTime())[0];

    if (latestConsent) {
      latestConsent.withdrawalDate = new Date();
      await this.persistConsentRecord(latestConsent);

      await this.auditPrivacyEvent({
        action: 'consent_withdrawn',
        userId,
        details: { purpose, originalConsentId: latestConsent.id },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        riskLevel: 'medium'
      });

      console.log(`🔒 Consent withdrawn for ${purpose}: ${userId}`);
    }
  }

  hasValidConsent(userId: string, purpose: ConsentPurpose): boolean {
    const userConsents = this.consentRecords.get(userId) || [];
    const latestConsent = userConsents
      .filter(c => c.purpose === purpose && c.granted && !c.withdrawalDate)
      .sort((a, b) => b.consentDate.getTime() - a.consentDate.getTime())[0];

    if (!latestConsent) return false;

    // Check if consent has expired
    if (latestConsent.expiryDate && latestConsent.expiryDate < new Date()) {
      return false;
    }

    return true;
  }

  // PRIVACY PREFERENCES
  async updatePrivacyPreferences(
    userId: string,
    preferences: Partial<Omit<PrivacyPreferences, 'userId' | 'updated'>>,
    metadata: { ipAddress: string; userAgent: string }
  ): Promise<void> {
    const currentPreferences = this.privacyPreferences.get(userId) || 
      this.getDefaultPreferences(userId);

    const updatedPreferences: PrivacyPreferences = {
      ...currentPreferences,
      ...preferences,
      userId,
      updated: new Date()
    };

    this.privacyPreferences.set(userId, updatedPreferences);
    await this.persistPrivacyPreferences(updatedPreferences);

    await this.auditPrivacyEvent({
      action: 'preferences_updated',
      userId,
      details: { updatedFields: Object.keys(preferences) },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      riskLevel: 'low'
    });

    console.log(`🔒 Privacy preferences updated: ${userId}`);
  }

  getPrivacyPreferences(userId: string): PrivacyPreferences {
    return this.privacyPreferences.get(userId) || this.getDefaultPreferences(userId);
  }

  private getDefaultPreferences(userId: string): PrivacyPreferences {
    const defaults = JSON.parse(localStorage.getItem('default_privacy_preferences') || '{}');
    return { ...defaults, userId, updated: new Date() };
  }

  // DATA SUBJECT RIGHTS
  async requestDataExport(
    userId: string,
    format: 'json' | 'csv' | 'xml' | 'pdf',
    dataTypes: string[],
    metadata: { requestedBy: string; ipAddress: string }
  ): Promise<string> {
    const request: DataExportRequest = {
      id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      requestDate: new Date(),
      status: 'pending',
      format,
      dataTypes,
      requestedBy: metadata.requestedBy,
      ipAddress: metadata.ipAddress,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    this.exportRequests.set(request.id, request);
    await this.persistExportRequest(request);

    // Start processing asynchronously
    this.processDataExport(request.id);

    await this.auditPrivacyEvent({
      action: 'data_exported',
      userId,
      details: { format, dataTypes, requestId: request.id },
      ipAddress: metadata.ipAddress,
      userAgent: 'api',
      riskLevel: 'medium'
    });

    console.log(`📤 Data export requested: ${request.id}`);
    return request.id;
  }

  async requestDataDeletion(
    userId: string,
    dataTypes: string[],
    reason: string,
    metadata: { requestedBy: string; ipAddress: string }
  ): Promise<string> {
    const request: DataDeletionRequest = {
      id: `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      requestDate: new Date(),
      status: 'pending',
      dataTypes,
      reason,
      retentionExceptions: [],
      requestedBy: metadata.requestedBy,
      ipAddress: metadata.ipAddress,
      verificationCode: this.generateVerificationCode()
    };

    this.deletionRequests.set(request.id, request);
    await this.persistDeletionRequest(request);

    // Start processing asynchronously
    this.processDataDeletion(request.id);

    await this.auditPrivacyEvent({
      action: 'data_deleted',
      userId,
      details: { dataTypes, reason, requestId: request.id },
      ipAddress: metadata.ipAddress,
      userAgent: 'api',
      riskLevel: 'high'
    });

    console.log(`🗑️ Data deletion requested: ${request.id}`);
    return request.id;
  }

  private async processDataExport(requestId: string): Promise<void> {
    const request = this.exportRequests.get(requestId);
    if (!request) return;

    try {
      request.status = 'processing';
      await this.persistExportRequest(request);

      // Simulate data export processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate export data
      const exportData = await this.generateExportData(request.userId, request.dataTypes);
      
      // Create download URL (in production, upload to secure storage)
      const downloadUrl = await this.createSecureDownloadUrl(exportData, request.format);

      request.status = 'completed';
      request.completedDate = new Date();
      request.downloadUrl = downloadUrl;
      
      await this.persistExportRequest(request);
      
      console.log(`✅ Data export completed: ${requestId}`);
    } catch (error) {
      request.status = 'failed';
      await this.persistExportRequest(request);
      console.error(`❌ Data export failed: ${requestId}`, error);
    }
  }

  private async processDataDeletion(requestId: string): Promise<void> {
    const request = this.deletionRequests.get(requestId);
    if (!request) return;

    try {
      request.status = 'processing';
      await this.persistDeletionRequest(request);

      // Simulate data deletion processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check for legal retention requirements
      const retentionExceptions = await this.checkRetentionRequirements(
        request.userId, 
        request.dataTypes
      );

      if (retentionExceptions.length > 0) {
        request.retentionExceptions = retentionExceptions;
        request.status = 'partially_completed';
      } else {
        request.status = 'completed';
      }

      request.deletionDate = new Date();
      await this.persistDeletionRequest(request);
      
      console.log(`✅ Data deletion completed: ${requestId}`);
    } catch (error) {
      request.status = 'failed';
      await this.persistDeletionRequest(request);
      console.error(`❌ Data deletion failed: ${requestId}`, error);
    }
  }

  // UTILITY METHODS
  private generateVerificationCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  private async generateExportData(userId: string, dataTypes: string[]): Promise<any> {
    // This would collect actual user data from various sources
    return {
      userId,
      exportDate: new Date().toISOString(),
      dataTypes,
      data: {
        profile: { /* user profile data */ },
        conversations: { /* chat history */ },
        preferences: this.getPrivacyPreferences(userId),
        consents: this.getUserConsents(userId)
      }
    };
  }

  private async createSecureDownloadUrl(data: any, format: string): Promise<string> {
    // In production, this would upload to secure storage and return signed URL
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    return URL.createObjectURL(blob);
  }

  private async checkRetentionRequirements(
    userId: string, 
    dataTypes: string[]
  ): Promise<string[]> {
    // Check for legal/business requirements to retain certain data
    const exceptions: string[] = [];
    
    // Example: Financial records must be kept for 7 years
    if (dataTypes.includes('financial') || dataTypes.includes('billing')) {
      exceptions.push('Financial records retained for regulatory compliance');
    }
    
    // Example: Audit logs must be kept for compliance
    if (dataTypes.includes('audit_logs')) {
      exceptions.push('Audit logs retained for security compliance');
    }
    
    return exceptions;
  }

  getUserConsents(userId: string): ConsentRecord[] {
    return this.consentRecords.get(userId) || [];
  }

  getExportRequest(requestId: string): DataExportRequest | undefined {
    return this.exportRequests.get(requestId);
  }

  getDeletionRequest(requestId: string): DataDeletionRequest | undefined {
    return this.deletionRequests.get(requestId);
  }

  // PERSISTENCE METHODS
  private async persistConsentRecord(record: ConsentRecord): Promise<void> {
    const records = JSON.parse(localStorage.getItem('consent_records') || '[]');
    records.push(record);
    localStorage.setItem('consent_records', JSON.stringify(records));
  }

  private async persistPrivacyPreferences(preferences: PrivacyPreferences): Promise<void> {
    const prefs = JSON.parse(localStorage.getItem('privacy_preferences') || '{}');
    prefs[preferences.userId] = preferences;
    localStorage.setItem('privacy_preferences', JSON.stringify(prefs));
  }

  private async persistExportRequest(request: DataExportRequest): Promise<void> {
    const requests = JSON.parse(localStorage.getItem('export_requests') || '{}');
    requests[request.id] = request;
    localStorage.setItem('export_requests', JSON.stringify(requests));
  }

  private async persistDeletionRequest(request: DataDeletionRequest): Promise<void> {
    const requests = JSON.parse(localStorage.getItem('deletion_requests') || '{}');
    requests[request.id] = request;
    localStorage.setItem('deletion_requests', JSON.stringify(requests));
  }

  private async auditPrivacyEvent(event: Omit<PrivacyAuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: PrivacyAuditEvent = {
      id: `privacy_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event
    };

    this.auditEvents.push(auditEvent);
    
    const events = JSON.parse(localStorage.getItem('privacy_audit_events') || '[]');
    events.push(auditEvent);
    
    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    
    localStorage.setItem('privacy_audit_events', JSON.stringify(events));
  }

  // REPORTING
  getPrivacyMetrics(): {
    totalUsers: number;
    activeConsents: number;
    pendingExports: number;
    pendingDeletions: number;
    complianceScore: number;
  } {
    const totalUsers = this.privacyPreferences.size;
    const activeConsents = Array.from(this.consentRecords.values())
      .flat()
      .filter(c => c.granted && !c.withdrawalDate).length;
    
    const pendingExports = Array.from(this.exportRequests.values())
      .filter(r => r.status === 'pending' || r.status === 'processing').length;
    
    const pendingDeletions = Array.from(this.deletionRequests.values())
      .filter(r => r.status === 'pending' || r.status === 'processing').length;

    // Calculate compliance score based on various factors
    const complianceScore = this.calculateComplianceScore();

    return {
      totalUsers,
      activeConsents,
      pendingExports,
      pendingDeletions,
      complianceScore
    };
  }

  private calculateComplianceScore(): number {
    // Simplified compliance scoring
    let score = 100;
    
    // Deduct points for pending requests
    const pendingRequests = Array.from(this.exportRequests.values())
      .filter(r => r.status === 'pending').length +
      Array.from(this.deletionRequests.values())
      .filter(r => r.status === 'pending').length;
    
    score -= pendingRequests * 2;
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }
}

// Singleton instance
let privacyManager: PrivacyControlsManager | null = null;

export function getPrivacyManager(): PrivacyControlsManager {
  if (!privacyManager) {
    privacyManager = new PrivacyControlsManager();
  }
  return privacyManager;
}

export default PrivacyControlsManager;