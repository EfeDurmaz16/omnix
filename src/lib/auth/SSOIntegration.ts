/**
 * Single Sign-On (SSO) Integration for Enterprise Customers
 * Supports SAML 2.0, OpenID Connect, and OAuth 2.0
 */

export interface SSOProvider {
  id: string;
  name: string;
  type: 'saml' | 'oidc' | 'oauth';
  enabled: boolean;
  configuration: SSOConfiguration;
  organizationId?: string;
  domains: string[];
  created: Date;
  updated: Date;
}

export interface SSOConfiguration {
  // SAML Configuration
  saml?: {
    entityId: string;
    ssoUrl: string;
    sloUrl?: string;
    certificate: string;
    signatureAlgorithm: 'SHA256' | 'SHA1';
    nameIdFormat: string;
    attributeMapping: Record<string, string>;
  };
  
  // OIDC Configuration
  oidc?: {
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
    responseType: 'code' | 'id_token' | 'token';
    responseMode: 'query' | 'fragment' | 'form_post';
  };
  
  // OAuth Configuration
  oauth?: {
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
}

export interface SSOSession {
  id: string;
  userId: string;
  providerId: string;
  sessionToken: string;
  expiresAt: Date;
  attributes: Record<string, any>;
  created: Date;
  lastAccessed: Date;
}

export interface SSOAuditEvent {
  id: string;
  timestamp: Date;
  event: 'login' | 'logout' | 'login_failed' | 'session_expired' | 'provider_configured';
  userId?: string;
  providerId: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
}

export class SSOIntegrationManager {
  private providers: Map<string, SSOProvider> = new Map();
  private sessions: Map<string, SSOSession> = new Map();
  private auditEvents: SSOAuditEvent[] = [];

  constructor() {
    this.initializeDefaultProviders();
  }

  private initializeDefaultProviders(): void {
    // Add common enterprise providers
    const commonProviders: Partial<SSOProvider>[] = [
      {
        id: 'okta',
        name: 'Okta',
        type: 'saml',
        enabled: false,
        domains: [],
        configuration: {}
      },
      {
        id: 'azure-ad',
        name: 'Azure Active Directory',
        type: 'oidc',
        enabled: false,
        domains: [],
        configuration: {}
      },
      {
        id: 'google-workspace',
        name: 'Google Workspace',
        type: 'oauth',
        enabled: false,
        domains: [],
        configuration: {}
      },
      {
        id: 'onelogin',
        name: 'OneLogin',
        type: 'saml',
        enabled: false,
        domains: [],
        configuration: {}
      },
      {
        id: 'auth0',
        name: 'Auth0',
        type: 'oidc',
        enabled: false,
        domains: [],
        configuration: {}
      }
    ];

    commonProviders.forEach(provider => {
      if (provider.id) {
        this.providers.set(provider.id, {
          ...provider,
          created: new Date(),
          updated: new Date()
        } as SSOProvider);
      }
    });
  }

  // PROVIDER MANAGEMENT
  async configureProvider(config: Omit<SSOProvider, 'created' | 'updated'>): Promise<void> {
    const provider: SSOProvider = {
      ...config,
      created: this.providers.get(config.id)?.created || new Date(),
      updated: new Date()
    };

    this.providers.set(config.id, provider);
    
    await this.auditSSOEvent({
      event: 'provider_configured',
      providerId: config.id,
      ipAddress: 'system',
      userAgent: 'admin_panel',
      details: { providerName: config.name, type: config.type },
      riskLevel: 'medium'
    });

    await this.persistProvider(provider);
    console.log(`🔐 SSO Provider configured: ${provider.name}`);
  }

  async enableProvider(providerId: string, enabled: boolean): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider ${providerId} not found`);

    provider.enabled = enabled;
    provider.updated = new Date();
    
    await this.persistProvider(provider);
    console.log(`🔐 SSO Provider ${enabled ? 'enabled' : 'disabled'}: ${provider.name}`);
  }

  getProvider(providerId: string): SSOProvider | undefined {
    return this.providers.get(providerId);
  }

  getProviderByDomain(domain: string): SSOProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.enabled && provider.domains.includes(domain)) {
        return provider;
      }
    }
    return undefined;
  }

  getAllProviders(): SSOProvider[] {
    return Array.from(this.providers.values());
  }

  getEnabledProviders(): SSOProvider[] {
    return Array.from(this.providers.values()).filter(p => p.enabled);
  }

  // AUTHENTICATION FLOWS
  async initiateSSOLogin(providerId: string, redirectUrl?: string): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.enabled) {
      throw new Error(`Provider ${providerId} not available`);
    }

    let authUrl: string;

    switch (provider.type) {
      case 'saml':
        authUrl = await this.buildSAMLRequest(provider, redirectUrl);
        break;
      case 'oidc':
        authUrl = await this.buildOIDCRequest(provider, redirectUrl);
        break;
      case 'oauth':
        authUrl = await this.buildOAuthRequest(provider, redirectUrl);
        break;
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }

    await this.auditSSOEvent({
      event: 'login',
      providerId,
      ipAddress: 'client',
      userAgent: 'browser',
      details: { redirectUrl },
      riskLevel: 'low'
    });

    return authUrl;
  }

  private async buildSAMLRequest(provider: SSOProvider, redirectUrl?: string): Promise<string> {
    if (!provider.configuration.saml) {
      throw new Error('SAML configuration missing');
    }

    const samlRequest = this.generateSAMLRequest(provider.configuration.saml, redirectUrl);
    const encodedRequest = Buffer.from(samlRequest).toString('base64');
    
    return `${provider.configuration.saml.ssoUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}`;
  }

  private async buildOIDCRequest(provider: SSOProvider, redirectUrl?: string): Promise<string> {
    if (!provider.configuration.oidc) {
      throw new Error('OIDC configuration missing');
    }

    const config = provider.configuration.oidc;
    const state = this.generateState();
    const nonce = this.generateNonce();

    const params = new URLSearchParams({
      response_type: config.responseType,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state: state,
      nonce: nonce
    });

    return `${config.issuer}/auth?${params.toString()}`;
  }

  private async buildOAuthRequest(provider: SSOProvider, redirectUrl?: string): Promise<string> {
    if (!provider.configuration.oauth) {
      throw new Error('OAuth configuration missing');
    }

    const config = provider.configuration.oauth;
    const state = this.generateState();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state: state
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  // SESSION MANAGEMENT
  async createSSOSession(
    userId: string,
    providerId: string,
    attributes: Record<string, any>,
    expiresIn: number = 3600
  ): Promise<SSOSession> {
    const session: SSOSession = {
      id: `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      providerId,
      sessionToken: this.generateSessionToken(),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      attributes,
      created: new Date(),
      lastAccessed: new Date()
    };

    this.sessions.set(session.id, session);
    await this.persistSession(session);
    
    return session;
  }

  async validateSession(sessionId: string): Promise<SSOSession | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await this.invalidateSession(sessionId);
      return null;
    }

    // Update last accessed
    session.lastAccessed = new Date();
    await this.persistSession(session);
    
    return session;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      await this.removeSession(sessionId);
      
      await this.auditSSOEvent({
        event: 'logout',
        userId: session.userId,
        providerId: session.providerId,
        ipAddress: 'client',
        userAgent: 'browser',
        details: { sessionId },
        riskLevel: 'low'
      });
    }
  }

  async handleSSOCallback(
    providerId: string,
    code: string,
    state: string
  ): Promise<{ user: any; session: SSOSession }> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider ${providerId} not found`);

    let userInfo: any;

    switch (provider.type) {
      case 'saml':
        userInfo = await this.processSAMLResponse(provider, code);
        break;
      case 'oidc':
        userInfo = await this.processOIDCCallback(provider, code);
        break;
      case 'oauth':
        userInfo = await this.processOAuthCallback(provider, code);
        break;
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }

    // Create or update user
    const user = await this.createOrUpdateUser(userInfo, provider);
    
    // Create SSO session
    const session = await this.createSSOSession(
      user.id,
      providerId,
      userInfo,
      3600 // 1 hour
    );

    await this.auditSSOEvent({
      event: 'login',
      userId: user.id,
      providerId,
      ipAddress: 'client',
      userAgent: 'browser',
      details: { method: 'sso_callback' },
      riskLevel: 'low'
    });

    return { user, session };
  }

  // UTILITY METHODS
  private generateSAMLRequest(config: any, redirectUrl?: string): string {
    // This is a simplified SAML request - in production use a proper SAML library
    const id = `_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
      <samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                          ID="${id}"
                          Version="2.0"
                          IssueInstant="${timestamp}"
                          Destination="${config.ssoUrl}"
                          AssertionConsumerServiceURL="${config.redirectUri}">
        <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${config.entityId}</saml:Issuer>
      </samlp:AuthnRequest>`;
  }

  private generateState(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  private generateNonce(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  private generateSessionToken(): string {
    return `sso_token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private async processSAMLResponse(provider: SSOProvider, response: string): Promise<any> {
    // This would parse and validate the SAML response
    // For demo purposes, return mock user data
    return {
      email: 'user@example.com',
      name: 'SSO User',
      groups: ['users'],
      attributes: {}
    };
  }

  private async processOIDCCallback(provider: SSOProvider, code: string): Promise<any> {
    // Exchange code for tokens and get user info
    // This is a simplified implementation
    return {
      email: 'user@example.com',
      name: 'OIDC User',
      sub: 'oidc_user_123'
    };
  }

  private async processOAuthCallback(provider: SSOProvider, code: string): Promise<any> {
    // Exchange code for access token and get user info
    // This is a simplified implementation
    return {
      email: 'user@example.com',
      name: 'OAuth User',
      id: 'oauth_user_123'
    };
  }

  private async createOrUpdateUser(userInfo: any, provider: SSOProvider): Promise<any> {
    // This would integrate with your user management system
    return {
      id: `user_${Date.now()}`,
      email: userInfo.email,
      name: userInfo.name,
      ssoProvider: provider.id,
      ssoId: userInfo.sub || userInfo.id,
      created: new Date()
    };
  }

  // PERSISTENCE METHODS
  private async persistProvider(provider: SSOProvider): Promise<void> {
    const providers = JSON.parse(localStorage.getItem('sso_providers') || '{}');
    providers[provider.id] = provider;
    localStorage.setItem('sso_providers', JSON.stringify(providers));
  }

  private async persistSession(session: SSOSession): Promise<void> {
    const sessions = JSON.parse(localStorage.getItem('sso_sessions') || '{}');
    sessions[session.id] = session;
    localStorage.setItem('sso_sessions', JSON.stringify(sessions));
  }

  private async removeSession(sessionId: string): Promise<void> {
    const sessions = JSON.parse(localStorage.getItem('sso_sessions') || '{}');
    delete sessions[sessionId];
    localStorage.setItem('sso_sessions', JSON.stringify(sessions));
  }

  private async auditSSOEvent(event: Omit<SSOAuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: SSOAuditEvent = {
      id: `sso_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event
    };

    this.auditEvents.push(auditEvent);
    
    const events = JSON.parse(localStorage.getItem('sso_audit_events') || '[]');
    events.push(auditEvent);
    
    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    
    localStorage.setItem('sso_audit_events', JSON.stringify(events));
  }

  // REPORTING
  getAuditEvents(limit: number = 100): SSOAuditEvent[] {
    return this.auditEvents.slice(-limit);
  }

  getSSOMetrics(): {
    totalProviders: number;
    enabledProviders: number;
    activeSessions: number;
    recentLogins: number;
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return {
      totalProviders: this.providers.size,
      enabledProviders: this.getEnabledProviders().length,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.expiresAt > now).length,
      recentLogins: this.auditEvents.filter(e => 
        e.event === 'login' && e.timestamp > last24Hours
      ).length
    };
  }
}

// Singleton instance
let ssoManager: SSOIntegrationManager | null = null;

export function getSSOManager(): SSOIntegrationManager {
  if (!ssoManager) {
    ssoManager = new SSOIntegrationManager();
  }
  return ssoManager;
}

export default SSOIntegrationManager;