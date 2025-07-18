/**
 * Privacy Policy Page for Notion Integration
 */

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="text-muted-foreground mb-4">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Overview</h2>
          <p>
            This privacy policy describes how OmniX handles your data when you use our 
            Notion integration through the Model Context Protocol (MCP).
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Data Collection</h2>
          <p>When you connect your Notion workspace to OmniX, we collect:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>OAuth access tokens to authenticate with Notion</li>
            <li>Workspace information (name, ID)</li>
            <li>Page and database content you explicitly access through our tools</li>
          </ul>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Data Usage</h2>
          <p>We use your data to:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>Provide AI-powered interactions with your Notion workspace</li>
            <li>Execute commands you request through our MCP tools</li>
            <li>Maintain the connection between OmniX and your Notion workspace</li>
          </ul>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Data Storage</h2>
          <p>
            Access tokens are stored securely in environment variables. 
            We do not permanently store your Notion content - data is only 
            accessed when you explicitly use our tools.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Data Sharing</h2>
          <p>
            We do not share your Notion data with third parties. 
            Data is only used within the OmniX application to provide 
            the requested AI functionality.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Security</h2>
          <p>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>OAuth 2.0 authentication</li>
            <li>Secure token storage</li>
            <li>HTTPS encryption for all communications</li>
          </ul>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>Revoke access to your Notion workspace at any time</li>
            <li>Request deletion of stored access tokens</li>
            <li>Contact us about data handling practices</li>
          </ul>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Contact</h2>
          <p>
            For questions about this privacy policy or data handling, 
            contact us at: efebarandurmaz05@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
}