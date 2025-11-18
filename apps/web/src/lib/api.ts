const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchCommunities() {
  const res = await fetch(`${API_URL}/communities`);
  if (!res.ok) throw new Error('Failed to fetch communities');
  return res.json();
}

export async function fetchCommunity(communityId: string) {
  const res = await fetch(`${API_URL}/communities/${communityId}`);
  if (!res.ok) throw new Error('Failed to fetch community');
  return res.json();
}

export async function fetchAccounts(communityId: string) {
  const res = await fetch(`${API_URL}/communities/${communityId}/accounts`);
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return res.json();
}

export async function fetchLedger(communityId: string, params?: {
  accountId?: string;
  limit?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.accountId) queryParams.set('accountId', params.accountId);
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const url = `${API_URL}/communities/${communityId}/ledger${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch ledger');
  return res.json();
}

export async function fetchAccountBalance(
  communityId: string,
  accountId: string
) {
  const res = await fetch(
    `${API_URL}/communities/${communityId}/accounts/${accountId}/balance`
  );
  if (!res.ok) throw new Error('Failed to fetch balance');
  return res.json();
}
