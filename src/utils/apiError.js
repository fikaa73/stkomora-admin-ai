/**
 * Pretvara grešku sa servera u JEDAN čitljiv tekst.
 *
 * Laravel na 422 vraća { message: { "polje": ["opis"] } } — dakle OBJEKAT.
 * Ako se takav objekat prosto proslijedi Reactu da ga ispiše, React pukne
 * ("Objects are not valid as a React child") i korisnik ne vidi ništa.
 * Zato sve što izlazi odavde MORA biti string.
 */
export function getApiErrorMessage(error, fallback = 'Greška') {
  const data = error?.response?.data;

  const izvuci = (payload) => {
    if (payload == null) return '';
    if (typeof payload === 'string') return payload.trim();
    if (Array.isArray(payload)) {
      for (const stavka of payload) {
        const t = izvuci(stavka);
        if (t) return t;
      }
      return '';
    }
    if (typeof payload === 'object') {
      for (const vrijednost of Object.values(payload)) {
        const t = izvuci(vrijednost);
        if (t) return t;
      }
      return '';
    }
    return String(payload).trim();
  };

  // Laravel: { message: ... } ili { errors: { polje: [...] } }
  const izPoruke = izvuci(data?.message);
  if (izPoruke) return izPoruke;

  const izGresaka = izvuci(data?.errors);
  if (izGresaka) return izGresaka;

  if (typeof data === 'string' && data.trim()) return data.trim();

  if (error?.code === 'ECONNABORTED') return 'Veza sa serverom je istekla. Pokušajte ponovo.';
  if (error?.message === 'Network Error') return 'Nema veze sa serverom.';

  const status = error?.response?.status;
  if (status === 413) return 'Fajl je prevelik za server.';
  if (status === 419 || status === 401) return 'Sesija je istekla. Prijavite se ponovo.';

  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
  return fallback;
}

export default getApiErrorMessage;
