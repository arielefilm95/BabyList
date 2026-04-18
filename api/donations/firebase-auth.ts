const FIREBASE_API_KEY = 'AIzaSyCZYW7CDtsGu2zEGeg3w1ZoL_jI2Usjd68';

type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string;
  }>;
};

export const getBearerToken = (request: Request) => {
  const authorizationHeader = request.headers.get('authorization');
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  return token || null;
};

export const getAuthenticatedFirebaseUserId = async (idToken: string) => {
  const lookupResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!lookupResponse.ok) {
    throw new Error('No pudimos validar tu sesion.');
  }

  const lookupData = (await lookupResponse.json()) as FirebaseLookupResponse;
  const authenticatedUserId = lookupData.users?.[0]?.localId;

  if (!authenticatedUserId) {
    throw new Error('Tu sesion no es valida.');
  }

  return authenticatedUserId;
};
