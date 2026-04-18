import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

const MAX_DONATION_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_DONATION_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
const FIREBASE_API_KEY = 'AIzaSyCZYW7CDtsGu2zEGeg3w1ZoL_jI2Usjd68';

type DonationUploadPayload = {
  userId?: string;
};

type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string;
  }>;
};

const getBearerToken = (request: Request) => {
  const authorizationHeader = request.headers.get('authorization');
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  return token || null;
};

const parseUploadPayload = (clientPayload: string | null): DonationUploadPayload => {
  if (!clientPayload) return {};

  try {
    return JSON.parse(clientPayload) as DonationUploadPayload;
  } catch {
    throw new Error('Carga invalida: no pudimos leer los datos de la imagen.');
  }
};

const assertAllowedDonationPath = (pathname: string, userId: string) => {
  if (!pathname.startsWith(`donations/${userId}/`)) {
    throw new Error('No tienes permiso para subir imagenes en esa ruta.');
  }
};

const getAuthenticatedFirebaseUserId = async (idToken: string) => {
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
    throw new Error('No pudimos validar tu sesion para subir imagenes.');
  }

  const lookupData = (await lookupResponse.json()) as FirebaseLookupResponse;
  const authenticatedUserId = lookupData.users?.[0]?.localId;

  if (!authenticatedUserId) {
    throw new Error('Tu sesion no es valida para subir imagenes.');
  }

  return authenticatedUserId;
};

export async function POST(request: Request) {
  const idToken = getBearerToken(request);

  if (!idToken) {
    return Response.json(
      { error: 'Debes iniciar sesion para subir imagenes.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const authenticatedUserId = await getAuthenticatedFirebaseUserId(idToken);

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { userId } = parseUploadPayload(clientPayload);

        if (!userId || userId !== authenticatedUserId) {
          throw new Error('No tienes permiso para subir imagenes para esta cuenta.');
        }

        assertAllowedDonationPath(pathname, authenticatedUserId);

        return {
          allowedContentTypes: ALLOWED_DONATION_IMAGE_TYPES,
          maximumSizeInBytes: MAX_DONATION_IMAGE_SIZE_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'No pudimos subir la imagen.' },
      { status: 400 }
    );
  }
}
