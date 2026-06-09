// ===========================================================================
//  USMS Control — Catálogo de manuales (enApp = incluido como lectura interna)
// ===========================================================================
export const MANUALES = [
  { slug: 'introduccion', titulo: 'Manual de Introducción', url: 'https://docs.google.com/document/d/158WAPFMsTpS41Aj-n5nNAkUd7FlfWecSUmfDuyu_PcI/edit', enApp: true },
  { slug: 'imagen', titulo: 'Código de Imagen', url: 'https://docs.google.com/document/d/1KgG007bHtdcpi6fSBlpbGJuHfFB62H6gEr4Le7OU3pk/edit', enApp: true },
  { slug: 'comunicaciones', titulo: 'Manual de Comunicaciones', url: 'https://docs.google.com/document/d/19g-axP6GIa1fp5OowS9DI4U49W-1sSbXxqv9WJiaIIo/edit', enApp: true },
  { slug: 'unidades', titulo: 'Manual de Unidades', url: 'https://docs.google.com/document/d/1J8QFNRTsqsVAO2BVjco8t73MQ5JJfYHzoyOeVFIaeVo/edit', enApp: true },
  { slug: 'armamento', titulo: 'Manual de Armamento y Material', url: 'https://docs.google.com/document/d/1yUt9jFkFrxZqIWJaWbLaQdq0Nl2_TMdI8Qf7t1hiHrg/edit', enApp: true },
  { slug: 'generales', titulo: 'Procedimientos Generales', url: 'https://docs.google.com/document/d/1-N4qIhCwYVTFZsGu3TLLo6uKrKWsxebKLLOLEIkJADI/edit', enApp: true },
  { slug: 'leo', titulo: 'GTAHUB · Manual de Procedimientos', url: 'https://docs.google.com/document/d/1YuUOvv1_9d87Bp2M-C8rMeWuju14I6JJ-sk9yc43ME4/edit', enApp: true },
  { slug: 'corte', titulo: 'Procedimientos en la Corte', url: 'https://docs.google.com/document/d/1bLX9aKlSX9lVUib4zdrr2dMVyUqAcJjMy5y79Ci4224/edit', enApp: true },
  { slug: 'prision', titulo: 'Procedimientos en Prisión Federal', url: 'https://docs.google.com/document/d/14_w9Ps0nZZjoGLhdNRVwMGD81lI8p-rJOJu_H0l2dJs/edit', enApp: true },
  { slug: 'byc', titulo: 'Manual de Búsqueda y Captura', url: 'https://docs.google.com/document/d/1FES7LbkcaQhyptaekxjoPsVtzEkp1WsQv1IxwhAAHcs/edit', enApp: true },
  { slug: 'traslados', titulo: 'Protección de Traslados y VIP', url: 'https://docs.google.com/document/d/1anWjPY6l0Z7J72ybJTOE-eV5BhUuz0Cv7AzMRNcDXsw/edit', enApp: true },
  { slug: 'primeros_auxilios', titulo: 'Manual de Primeros Auxilios', url: 'https://docs.google.com/document/d/18-8E6t6I9rQzdmxEL6VTUuCU_fa5uBXXsSVKTE1SHbk/edit', enApp: true },
  { slug: 'codigo_penal', titulo: 'GTAHUB · Código Penal Público', url: 'https://docs.google.com/spreadsheets/d/1T0OQ9sSvNyKJB6I7RSEzETJa5Lxnwar_/edit', enApp: false },
];
export const manualBySlug = (s) => MANUALES.find((m) => m.slug === s);
