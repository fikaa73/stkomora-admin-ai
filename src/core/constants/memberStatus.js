/**
 * Status člana — jedan izvor istine za formu, spisak i filter.
 *
 * ODBIJEN je zahtjev Komore (23.11.2026): odbijenice su do tada bile upisane
 * kao neaktivne, a trebala im je zasebna grupacija zbog evidencije koga su
 * odbili, ako ponovo podnese zahtjev.
 *
 * Prema sistemu se neaktivan i odbijen ponašaju isto — ne prikazuju se na
 * javnom sajtu, ne zadužuju se članarinom i ne dobijaju opomene. Server to
 * drži kroz prekidač `is_active_member`, koji izvodi iz statusa.
 */
export const MEMBER_STATUS = {
  aktivan: 'aktivan',
  neaktivan: 'neaktivan',
  odbijen: 'odbijen',
};

export const MEMBER_STATUS_OPTIONS = [
  { value: MEMBER_STATUS.aktivan, label: 'Aktivan član' },
  { value: MEMBER_STATUS.neaktivan, label: 'Neaktivan član' },
  { value: MEMBER_STATUS.odbijen, label: 'Odbijen' },
];

export const MEMBER_STATUS_TAG = {
  [MEMBER_STATUS.aktivan]: { color: 'green', label: 'Aktivan' },
  [MEMBER_STATUS.neaktivan]: { color: 'red', label: 'Neaktivan' },
  [MEMBER_STATUS.odbijen]: { color: 'volcano', label: 'Odbijen' },
};

/**
 * Status člana iz odgovora servera. Stariji zapisi (prije kolone member_status)
 * nose samo prekidač, pa se status izvodi iz njega.
 */
export function memberStatusOf(member) {
  const status = member?.member_status;
  if (status && MEMBER_STATUS[status]) return status;
  return member?.is_active_member === false ? MEMBER_STATUS.neaktivan : MEMBER_STATUS.aktivan;
}

export const isOdbijen = (member) => memberStatusOf(member) === MEMBER_STATUS.odbijen;

/** Labela polja za datum i obrazloženje — zavisi od statusa. */
export function statusLabels(status) {
  return status === MEMBER_STATUS.odbijen
    ? {
        datum: 'Datum odbijanja',
        obrazlozenje: 'Osnov odbijanja',
        datumPlaceholder: 'Datum odluke o odbijanju',
        obrazlozenjePlaceholder: 'npr. Nije ispunio uslove za izdavanje licence',
      }
    : {
        datum: 'Datum (npr. preminuo dana)',
        obrazlozenje: 'Obrazloženje',
        datumPlaceholder: 'Izaberite datum',
        obrazlozenjePlaceholder: 'npr. Preminuo',
      };
}
