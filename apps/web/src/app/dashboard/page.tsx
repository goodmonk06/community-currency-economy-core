import Link from 'next/link';
import { fetchCommunities } from '@/lib/api';

export default async function DashboardPage() {
  const data = await fetchCommunities();
  const communities = data.communities || [];

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Dashboard</h1>

      <div
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ marginBottom: '1.5rem' }}>Communities</h2>

        {communities.length === 0 ? (
          <p style={{ color: '#666' }}>
            No communities found. Run the seed script to create demo data.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {communities.map((community: any) => (
              <Link
                key={community.id}
                href={`/dashboard/communities/${community.id}`}
                style={{
                  display: 'block',
                  padding: '1.5rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                }}
              >
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                  {community.name}
                </h3>
                <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                  Slug: {community.slug}
                </p>
                <div style={{ fontSize: '0.9rem', color: '#888' }}>
                  {community.currencies?.length || 0} currencies •{' '}
                  {community._count?.accounts || 0} accounts •{' '}
                  {community._count?.ledgerEntries || 0} transactions
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
