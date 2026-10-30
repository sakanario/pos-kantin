/** Jeda animasi bertahap untuk daftar (dibatasi supaya daftar panjang tidak menunggu lama). Server & client. */
export const jeda = (i: number, langkah = 45) => ({ animationDelay: `${Math.min(i, 8) * langkah}ms` });
