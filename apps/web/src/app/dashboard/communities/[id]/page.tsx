import Link from 'next/link';
import {
  fetchCommunity,
  fetchAccounts,
  fetchLedger,
} from '@/lib/api';

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [communityData, accountsData, ledgerData] = await Promise.all([
    fetchCommunity(id),
    fetchAccounts(id),
    fetchLedger(id, { limit: 20 }),
  ]);

  const community = communityData.community;
  const accounts = accountsData.accounts || [];
  const entries = ledgerData.entries || [];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: '#0070f3' }}>
          ← Back to Dashboard
        </Link>
      </div>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        {community.name}
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        {community.slug}
      </p>

      {/* Currencies */}
      <div
        style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Currencies
        </h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {community.currencies?.map((currency: any) => (
            <div
              key={currency.id}
              style={{
                padding: '1rem',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                {currency.code} - {currency.name}
              </div>
              {currency.description && (
                <div style={{ color: '#666', fontSize: '0.9rem' }}>
                  {currency.description}
                </div>
              )}
              <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
                Decimals: {currency.decimals}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accounts */}
      <div
        style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Accounts</h2>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                  Display Name
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                  Owner Ref
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account: any) => (
                <tr
                  key={account.id}
                  style={{ borderBottom: '1px solid #f0f0f0' }}
                >
                  <td style={{ padding: '0.75rem' }}>
                    {account.displayName || '-'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#e3f2fd',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                      }}
                    >
                      {account.ownerType}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                    {account.ownerRef}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                    {new Date(account.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Ledger Entries */}
      <div
        style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Recent Transactions
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>From</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>To</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                  Amount
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                  Currency
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                  Reason
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: any) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: '1px solid #f0f0f0' }}
                >
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                    {entry.fromAccount.displayName || entry.fromAccount.ownerRef}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                    {entry.toAccount.displayName || entry.toAccount.ownerRef}
                  </td>
                  <td
                    style={{
                      padding: '0.75rem',
                      fontWeight: 'bold',
                      color: '#2e7d32',
                    }}
                  >
                    {entry.amount}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#fff3e0',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                      }}
                    >
                      {entry.currency.code}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                    {entry.reasonCode}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
