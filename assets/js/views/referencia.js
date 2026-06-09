// ===========================================================================
//  USMS Control — Apartado de Referencia
//  Contenido estático (estructura, rangos, divisiones, unidades, balizas)
//  extraído de los manuales oficiales del USMS-AN.
// ===========================================================================
import { el } from '../ui.js';
import { icon } from '../icons.js';

const FUNCIONES = [
  'Captura de fugitivos federales, estatales y a nivel nacional.',
  'Traslado y custodia de prisioneros federales o de riesgo crítico.',
  'Asistencia operacional en crisis y operativos multi-departamentales.',
  'Gestión y seguridad de instalaciones correccionales (BCF).',
  'Protección judicial: tribunales, jueces, jurados y fiscales.',
  'Protección de testigos y sus familiares.',
  'Ejecución de órdenes y citaciones judiciales federales.',
  'Incautación y administración de bienes ilícitos.',
  'Búsqueda de personas desaparecidas.',
];

const RANGOS = [
  ['DUSMT', 'Deputy U.S. Marshal Trainee', 'Aspirante en formación por la Training Division. En periodo de pruebas tras aprobar el examen AMTP; equipamiento y unidades básicas.'],
  ['DUSM I', 'Deputy U.S. Marshal I', 'Agente operativo. Acceso a plaza y unidad personal (Buffalo); unidades Bravado, Dinghy, Mule, Verus.'],
  ['DUSM II', 'Deputy U.S. Marshal II', 'Mayoría de unidades y divisiones (IOD, SOG, AOD, certificación Two Wheels). Sublíder mínimo.'],
  ['DUSM III', 'Deputy U.S. Marshal III', 'Canis Terminus; tatuajes autorizados (brazos); líder de división mínimo.'],
  ['DUSM IV', 'Deputy U.S. Marshal IV', 'Unidades de interceptación (Gauntlet Interceptor) y mayor responsabilidad operativa.'],
  ['SDUSM I', 'Supervisory Deputy U.S. Marshal I', 'Supervisory Staff: supervisa el servicio y el personal en campo.'],
  ['SDUSM II', 'Supervisory Deputy U.S. Marshal II', 'Supervisory Staff de mayor jerarquía dentro de la supervisión.'],
  ['CDUSM', 'Chief Deputy U.S. Marshal', 'Jefatura de la agencia (Directive). Gestiona normativa y cuestiones del Supervisory Staff.'],
  ['U.S. Marshal', 'U.S. Marshal (Directiva)', 'Máxima autoridad / Directiva de la agencia (Executive / Director).'],
];

const DIVISIONES = [
  ['IOD', 'Investigative Operations Division', 'Investigación, inteligencia y operaciones encubiertas. Maneja información de delitos federales. Unidades sin marca (Vapid Scout / Granger Unmarked, FIB Buffalo, civiles) y Speedo (compartida con SGU). Pasamontañas y cuellera autorizados.'],
  ['SOG', 'Special Operations Group', 'Intervención táctica, alto riesgo, antidisturbios y apoyo aéreo táctico. Unidades Buzzard, Insurgent, BearCat, RCV y Caracara Pursuit. Pasamontañas autorizado.'],
  ['UMD', 'Unit Management Division', 'Gestión de la flota: asignación, reabastecimiento, plazas, alquileres y certificación Two Wheels. Unidad Mule.'],
  ['AOD', 'Air Operations Division', 'Operaciones aéreas y traslados por aire (Cayo Perico). Unidad Swift; requiere certificación de piloto.'],
  ['TD', 'Training Division', 'Formación de aspirantes (DUSMT), academia y examen AMTP. FTDs (Field Training Deputies). Unidad Verus.'],
  ['SGU', 'Suppression Gang Unit', 'Supresión de bandas y crimen organizado. Comparte la unidad Speedo con la IOD.'],
  ['RAD', 'Resources Administration Division', 'Administración de recursos y finanzas; sanciones económicas por mal uso de material.'],
  ['OPA', 'Office of Public Affairs', 'Relaciones públicas e imagen del USMS; frecuencias y unidades propias.'],
  ['OPR', 'Office of Professional Responsibility (Internal Affairs)', 'Asuntos Internos: tramita denuncias e investiga la conducta de los miembros (Arts. 92-104).'],
];

// --------------------------------- Armamento -------------------------------
const ARM_NOLETAL = [
  ['Taser X-26P', 'DUSMT', 'Alcance 5 m · 50.000 V'],
  ['Cachiporra PR-24', 'DUSMT', 'Porra retráctil'],
  ['Escopeta Less-Lethal (Bean Bag)', 'DUSM II (cert.) / Clave Brawl', 'Remington 870 BeanBag'],
];
const ARM_LETAL = [
  ['Pistola H&K P2000', 'DUSMT', 'Arma principal del deputy'],
  ['Escopeta Remington 870', 'DUSMT', 'Calibre 12'],
  ['MP5 (H&K MP5A4)', 'DUSM I', 'Machine pistol 9 mm'],
  ['M4 (H&K HK416)', 'DUSM III / SOG', 'Rifle (SOG: solo en labores SOG)'],
  ['FN SCAR', 'SDUSM I', 'Rifle modular'],
  ['Escopeta SPAS-12', 'SDUSM I', '12 Gauge'],
  ['Sniper Barret M82', 'SOG certificado', 'Antimaterial'],
];
const ARM_EQUIPO = [
  ['Linterna Maglite ML100', 'DUSMT'],
  ['Tablet Gubernamental', 'DUSM II'],
  ['Walkie-Talkie / ComLink', 'Según labor'],
];
const ESCALADO = [
  'Presencia estándar (uniforme, identificación, postura profesional).',
  'Órdenes verbales y comunicación clara.',
  'Control físico leve (agarres, esposamiento con cooperación).',
  'Técnicas de control (toma al suelo, llaves, presión controlada).',
  'Armas no letales (taser, bean bag, gas OC, PR-24).',
  'Fuerza potencialmente letal (solo ante amenaza inminente de muerte o daño grave).',
];

// ------------------------------ Comunicaciones -----------------------------
const CODIGOS10 = [
  ['10-04', 'Afirmativo'], ['10-05', 'Negativo'], ['10-07', 'Salir de servicio'],
  ['10-08', 'Entrar de servicio'], ['10-09', 'Repetir mensaje'], ['10-14', 'Escolta'],
  ['10-15', 'Traslado de prisionero'], ['10-19', 'En dirección a'], ['10-20', 'Posición actual'],
  ['10-40', 'Situación actual'], ['10-48', 'Mantenimiento de unidad'], ['10-50', 'Sintonizar frecuencia'],
  ['10-61', 'Pausa breve / descanso'],
];
const CLAVES = [
  ['Código 3', 'Emergencia: luces y sirenas'], ['Código 4', 'Situación controlada / finalizada'],
  ['Código 5', 'Vigilancia / guardia'], ['Código 9', 'Fugitivo en visual'],
  ['Código 10', 'Despejar frecuencia'], ['Clave 0', 'Disparos en radio de acción'],
  ['Clave Alpha', 'Asalto al convoy'], ['Clave Robert', 'Solicitud de fuerza letal'],
  ['Clave Brawl', 'Motín / disturbio en la BCF'],
];
const NOMENCL = [
  ['USMS', 'Ordinaria'], ['STF', 'Supervisora'], ['JPATS', 'Transporte de prisioneros'],
  ['SCOT', 'Blindada VIP'], ['AIR', 'Aérea'], ['SEA', 'Acuática'], ['MARY', 'Alta velocidad'],
  ['TOW', 'Grúas'], ['INTEL', 'Inteligencia'], ['ZULU', 'Civil encubierta'],
  ['MIKE', 'SOG especializada'], ['TD / OPA / RAD', 'De división'],
];
const ABREV = [
  ['IC', 'Incident Commander'], ['CC', 'Communications Center'], ['MDC', 'Mobile Data Computer'],
  ['FDB', 'Fugitives Data Base'], ['BYC', 'Búsqueda y Captura'], ['BOLO', 'Be On the Look Of'],
  ['PIT', 'Pursuit Intervention Technique'], ['LEO', 'Law Enforcement Officer'],
  ['LSC', 'Los Santos Court'], ['BCF', 'Bolingbroke Correctional Facility'],
  ['PDA', 'Personal Digital Assistant (chat TS3)'], ['TAC', 'Frecuencia táctica'],
];

const UNIDADES = [
  ['Police Cruiser', 'Sedán', 'DUSMT', 'Ordinaria'],
  ['Bravado Dorado Cruiser', 'SUV', 'DUSM I', 'Ordinaria'],
  ['Granger 3600LX Police', 'SUV', 'DUSM II', 'Ordinaria'],
  ['Vapid Scout', 'SUV', 'DUSM II', 'Ordinaria (Supervisory: color Metálico 61)'],
  ['Canis Terminus', '4x4', 'DUSM III', 'Ordinaria'],
  ['Gauntlet Interceptor', 'Interceptación', 'DUSM IV', 'Interceptación de vehículos'],
  ['Police Transporter', 'Van blindada', 'DUSMT', 'Traslado de detenidos (BCF)'],
  ['Police Prison Bus', 'Bus blindado', 'DUSMT', 'Traslado de detenidos (BCF)'],
  ['XLS', 'SUV blindado', 'DUSMT', 'Traslado de VIP'],
  ['Schafter V12', 'Sedán blindado', 'DUSMT', 'Traslado de VIP'],
  ['Police Bike Sport', 'Motocicleta', 'DUSM II', 'Certificación Two Wheels (UMD)'],
  ['Rental Shuttle Bus', 'Minibús', 'DUSMT', 'Transporte de civiles / academia'],
  ['Dashound', 'Bus', 'DUSMT', 'Transporte de civiles / academia'],
  ['Dinghy', 'Embarcación', 'DUSM I', 'Traslado marítimo'],
  ['Towtruck', 'Grúa', 'DUSMT', 'Remolque de unidades'],
  ['Swift', 'Aeronave', 'DUSM II', 'Exclusiva AOD (certificación piloto)'],
  ['Buzzard', 'Aeronave', 'DUSM II', 'Exclusiva SOG (certificación)'],
  ['Insurgent', 'Combate ligero', 'DUSM II', 'Exclusiva SOG'],
  ['Police BearCat', 'Furgón blindado', 'DUSM II', 'Traslado / SOG'],
  ['RCV', 'Antidisturbios', 'DUSM II', 'Exclusiva SOG'],
  ['Vapid Caracara Pursuit', 'Todo terreno 4x4', 'DUSM II', 'Exclusiva SOG'],
  ['Speedo', 'Van de carga', 'DUSM II', 'Exclusiva IOD (compartida SGU)'],
  ['Vapid Scout Unmarked', 'SUV sin marca', 'DUSM II', 'Exclusiva IOD'],
  ['Granger 3600LX Unmarked', 'SUV sin marca', 'DUSM II', 'Exclusiva IOD'],
  ['FIB Buffalo', 'Sedán sin marca', 'DUSM II', 'Exclusiva IOD'],
  ['Unidades civiles', 'Civil', 'DUSM II', 'Encubierto (ByC / IOD)'],
  ['Mule', 'Camión de carga', 'DUSM I', 'Exclusiva UMD'],
  ['Verus', 'Cuatrimoto', 'DUSM I', 'Exclusiva Training Division'],
  ['Unmarked Cruiser', 'Sedán sin marca', 'Según división', 'Variable por división'],
];

const BALIZAS = [
  ['Verde', '#34d399', 'Unidades ordinarias.'],
  ['Rojo', '#f05252', 'Unidades ordinarias en Búsqueda y Captura.'],
  ['Azul', '#3b82f6', 'Unidades de división o especializadas.'],
  ['Dorado', '#d9b53d', 'Unidades civiles / encubiertas.'],
  ['Estroboscópico', 'linear-gradient(90deg,#f05252,#3b82f6)', 'Unidades en emergencia o prioridad.'],
];

let q = '';

function unidadesFiltradas() {
  return UNIDADES.filter((u) => !q || u.join(' ').toLowerCase().includes(q.toLowerCase()));
}
function renderUnidades() {
  const host = document.getElementById('ref-units');
  if (!host) return;
  host.innerHTML = '';
  unidadesFiltradas().forEach((u) => host.append(el('tr', {}, [
    el('td', {}, el('strong', {}, u[0])), el('td', { class: 'muted' }, u[1]),
    el('td', {}, el('span', { class: 'badge rango' }, u[2])), el('td', { class: 'muted small' }, u[3]),
  ])));
}

export function viewReferencia() {
  const h3 = (ic, t) => el('h3', { class: 'h-ico' }, [icon(ic, 17), t]);

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [el('h2', {}, 'Apartado de Referencia'),
      el('span', { class: 'muted small' }, 'Estructura, rangos, divisiones y flota del USMS-AN')]),

    // La agencia
    el('div', { class: 'card' }, [
      h3('building', 'El U.S. Marshals Service'),
      el('p', { class: 'muted small' }, 'Agencia federal de aplicación de la ley más antigua de los EE.UU. (24 de septiembre de 1789). Brazo ejecutor del poder judicial federal. Jurisdicción federal: todo Los Santos y Cayo Perico. Áreas de influencia: Los Santos Courts y la Bolingbroke Correctional Facility.'),
      el('div', { class: 'lema' }, [
        el('span', { class: 'lema-x' }, [icon('star', 14), 'Justicia']),
        el('span', { class: 'lema-x' }, [icon('star', 14), 'Integridad']),
        el('span', { class: 'lema-x' }, [icon('star', 14), 'Servicio']),
      ]),
      el('div', { class: 'ref-cols' }, FUNCIONES.map((f) => el('div', { class: 'ref-fn' }, [icon('check', 14), el('span', {}, f)]))),
    ]),

    // Rangos
    el('div', { class: 'card no-pad' }, [
      el('div', { class: 'card-head', style: 'padding:16px 18px 0' }, [h3('award', 'Jerarquía y rangos'), null]),
      el('table', { class: 'tbl rows' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Rango'), el('th', {}, 'Nombre'), el('th', {}, 'Descripción')])),
        el('tbody', {}, RANGOS.map((r) => el('tr', {}, [
          el('td', {}, el('span', { class: 'badge rango' }, r[0])),
          el('td', {}, el('strong', {}, r[1])),
          el('td', { class: 'muted small' }, r[2]),
        ]))),
      ]),
    ]),

    // Divisiones
    el('div', { class: 'card' }, [
      h3('layers', 'Divisiones y unidades especiales'),
      el('div', { class: 'div-grid' }, DIVISIONES.map((d) => el('div', { class: 'div-card' }, [
        el('div', { class: 'div-sigla' }, d[0]),
        el('div', {}, [el('strong', {}, d[1]), el('p', { class: 'muted small' }, d[2])]),
      ]))),
    ]),

    // Unidades
    el('div', { class: 'card no-pad' }, [
      el('div', { class: 'card-head', style: 'padding:16px 18px 0' }, [h3('car', 'Flota de unidades'),
        el('input', { class: 'search', style: 'width:240px', placeholder: 'Buscar unidad…',
          oninput: (e) => { q = e.target.value; renderUnidades(); } })]),
      el('table', { class: 'tbl rows' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Unidad'), el('th', {}, 'Tipo'), el('th', {}, 'Rango mín.'), el('th', {}, 'Uso / División')])),
        el('tbody', { id: 'ref-units' }, unidadesFiltradas().map((u) => el('tr', {}, [
          el('td', {}, el('strong', {}, u[0])), el('td', { class: 'muted' }, u[1]),
          el('td', {}, el('span', { class: 'badge rango' }, u[2])), el('td', { class: 'muted small' }, u[3]),
        ]))),
      ]),
    ]),

    // Armamento
    el('div', { class: 'card' }, [
      h3('shield', 'Armamento y equipo'),
      el('div', { class: 'arm-cols' }, [
        el('div', {}, [el('h4', { class: 'arm-h' }, 'No letal'), armTable(ARM_NOLETAL)]),
        el('div', {}, [el('h4', { class: 'arm-h' }, 'Letal'), armTable(ARM_LETAL)]),
      ]),
      el('div', { class: 'arm-cols' }, [
        el('div', {}, [el('h4', { class: 'arm-h' }, 'Equipo estándar'),
          el('div', { class: 'kv-grid' }, ARM_EQUIPO.map((e) => kvRow(e[0], e[1])))]),
        el('div', {}, [el('h4', { class: 'arm-h' }, 'Escalado del uso de la fuerza'),
          el('ol', { class: 'escalado' }, ESCALADO.map((s) => el('li', {}, s)))]),
      ]),
      el('p', { class: 'muted small' }, 'Certificaciones: se solicitan al SOG por Contacto Interno. Pérdidas: material básico = sanción gris; armamento crítico = sanción verde; la reincidencia agrava.'),
    ]),

    // Comunicaciones
    el('div', { class: 'card' }, [
      h3('flag', 'Comunicaciones'),
      el('div', { class: 'comm-cols' }, [
        el('div', {}, [el('h4', { class: 'arm-h' }, 'Códigos 10'), el('div', { class: 'kv-grid mono' }, CODIGOS10.map((c) => kvRow(c[0], c[1])))]),
        el('div', {}, [el('h4', { class: 'arm-h' }, 'Códigos y claves'), el('div', { class: 'kv-grid' }, CLAVES.map((c) => kvRow(c[0], c[1])))]),
      ]),
      el('div', { class: 'comm-cols' }, [
        el('div', {}, [el('h4', { class: 'arm-h' }, 'Nomenclatura de unidades'), el('div', { class: 'kv-grid' }, NOMENCL.map((c) => kvRow(c[0], c[1])))]),
        el('div', {}, [el('h4', { class: 'arm-h' }, 'Abreviaciones'), el('div', { class: 'kv-grid' }, ABREV.map((c) => kvRow(c[0], c[1])))]),
      ]),
    ]),

    // Balizas
    el('div', { class: 'card' }, [
      h3('flag', 'Balizas (códigos de color)'),
      el('div', { class: 'baliza-grid' }, BALIZAS.map((b) => el('div', { class: 'baliza' }, [
        el('span', { class: 'baliza-dot', style: `background:${b[1]}` }),
        el('div', {}, [el('strong', {}, `Código ${b[0]}`), el('div', { class: 'muted small' }, b[2])]),
      ]))),
    ]),
  ]);
}

function armTable(rows) {
  return el('table', { class: 'tbl mini' }, [
    el('tbody', {}, rows.map((r) => el('tr', {}, [
      el('td', {}, el('strong', {}, r[0])),
      el('td', {}, el('span', { class: 'badge rango' }, r[1])),
      r[2] ? el('td', { class: 'muted small' }, r[2]) : null,
    ]))),
  ]);
}
function kvRow(k, v) {
  return el('div', { class: 'kv' }, [el('span', { class: 'kv-k' }, k), el('span', { class: 'kv-v' }, v)]);
}
