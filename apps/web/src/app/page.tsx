import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Community Economy Core
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#666' }}>
        A double-entry bookkeeping system for community currencies and points.
      </p>

      <div
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ marginBottom: '1rem' }}>Features</h2>
        <ul style={{ lineHeight: '1.8', marginLeft: '1.5rem' }}>
          <li>Multi-currency support per community</li>
          <li>Double-entry accounting system</li>
          <li>Real-time balance tracking</li>
          <li>Webhook integration for events</li>
          <li>RESTful API for external services</li>
        </ul>

        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #eee' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-block',
              background: '#0070f3',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
            }}
          >
            Go to Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
