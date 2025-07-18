/**
 * Terms of Use Page for Notion Integration
 */

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-6">Terms of Use</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="text-muted-foreground mb-4">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Acceptance of Terms</h2>
          <p>
            By connecting your Notion workspace to OmniX, you agree to these terms of use. 
            If you do not agree to these terms, please do not use our Notion integration.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Service Description</h2>
          <p>
            OmniX provides AI-powered tools that integrate with your Notion workspace 
            through the Model Context Protocol (MCP). This allows AI agents to read, 
            create, and modify content in your Notion workspace based on your instructions.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">User Responsibilities</h2>
          <p>You are responsible for:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>Maintaining the security of your Notion workspace</li>
            <li>Using the integration in compliance with Notion's terms of service</li>
            <li>Ensuring you have appropriate permissions for accessed content</li>
            <li>Backing up important data before using AI modification tools</li>
          </ul>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Permitted Use</h2>
          <p>You may use the integration to:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>Search and retrieve information from your Notion workspace</li>
            <li>Create new pages and database entries</li>
            <li>Modify existing content with AI assistance</li>
            <li>Automate workflows within your workspace</li>
          </ul>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Prohibited Use</h2>
          <p>You may not use the integration to:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>Access content you do not have permission to view</li>
            <li>Violate Notion's terms of service or community guidelines</li>
            <li>Attempt to reverse engineer or compromise the integration</li>
            <li>Use the service for illegal or unauthorized purposes</li>
          </ul>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Limitations</h2>
          <p>
            The integration is provided "as is" without warranties. 
            We are not responsible for:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Data loss or corruption in your Notion workspace</li>
            <li>Downtime or service interruptions</li>
            <li>AI-generated content accuracy</li>
            <li>Compatibility with future Notion API changes</li>
          </ul>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Termination</h2>
          <p>
            You may terminate this agreement at any time by:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Disconnecting the integration from your Notion workspace</li>
            <li>Removing the OAuth authorization</li>
            <li>Contacting us to delete stored access tokens</li>
          </ul>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Changes to Terms</h2>
          <p>
            We may update these terms from time to time. 
            Continued use of the integration after changes constitutes acceptance of the new terms.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Contact</h2>
          <p>
            For questions about these terms or the integration, 
            contact us at: efebarandurmaz05@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
}