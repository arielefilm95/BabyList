import { del } from '@vercel/blob';
import { getAuthenticatedFirebaseUserId, getBearerToken } from './firebase-auth.js';

type DeleteDonationImagesBody = {
  userId?: string;
  urls?: string[];
};

const assertAllowedDonationImageUrl = (urlValue: string, userId: string) => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlValue);
  } catch {
    throw new Error('Hay una imagen con URL invalida.');
  }

  if (!parsedUrl.hostname.endsWith('.blob.vercel-storage.com')) {
    throw new Error('Hay una imagen fuera del almacenamiento permitido.');
  }

  const normalizedPathname = decodeURIComponent(parsedUrl.pathname);
  if (!normalizedPathname.startsWith(`/donations/${userId}/`)) {
    throw new Error('No tienes permiso para borrar una de esas imagenes.');
  }
};

export async function DELETE(request: Request) {
  const idToken = getBearerToken(request);

  if (!idToken) {
    return Response.json(
      { error: 'Debes iniciar sesion para borrar imagenes.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as DeleteDonationImagesBody;
    const authenticatedUserId = await getAuthenticatedFirebaseUserId(idToken);
    const userId = body.userId?.trim();
    const urls = Array.isArray(body.urls) ? body.urls.filter((urlValue): urlValue is string => typeof urlValue === 'string' && Boolean(urlValue.trim())) : [];

    if (!userId || userId !== authenticatedUserId) {
      throw new Error('No tienes permiso para borrar imagenes de esta cuenta.');
    }

    if (!urls.length) {
      return Response.json({ deleted: 0 });
    }

    urls.forEach((urlValue) => {
      assertAllowedDonationImageUrl(urlValue, authenticatedUserId);
    });

    await del(urls);

    return Response.json({ deleted: urls.length });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'No pudimos borrar las imagenes.' },
      { status: 400 }
    );
  }
}
