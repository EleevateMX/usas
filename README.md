# U.S. Marshals Service — Centro de Mando (GTAHUB Roleplay)

Sistema interno **multi-usuario** de control de personal, tesorería y Asuntos
Internos para el liderazgo del U.S. Marshals Service en GTA V Roleplay (GTAHUB).
Diseño oscuro estilo GTAHUB fusionado con la identidad de los U.S. Marshals
(navy, oro y la estrella de mariscal).

Frontend estático **sin build** (HTML + JS modular + CSS) sobre **Supabase**
(PostgreSQL + Auth + RLS). Los datos se sincronizan en la nube entre todo el
liderazgo, con permisos por rango (cadena de mando).

---

## 🚀 Cómo usarlo

La app ya viene configurada contra el proyecto Supabase `usms-control`
(ver `assets/js/config.js`). Solo necesitas servirla:

```bash
python3 -m http.server 8080      # luego entra a http://localhost:8080
# o
npx serve .
```

O publícala gratis en **GitHub Pages** / **Netlify** / **Vercel** (es estática)
y compártela por URL con tu liderazgo.

> Nota: requiere abrirse vía `http(s)://` (servidor), no con doble clic
> `file://`, porque usa *ES modules* y autenticación.

### Primer acceso (bootstrap del Director)
La primera persona que entre verá **“Crear Director”**: la cuenta que registre
se convierte automáticamente en **Director** de la agencia. A partir de ahí, el
acceso queda restringido y los nuevos miembros se crean desde **Miembros**.

---

## 👥 Roles y permisos (cadena de mando)

| Rol | Puede |
|---|---|
| **Supervisory** | Ver todo. Editar personal, tesorería y casos OPR. Registrar sanciones. |
| **Directive** | Lo anterior + **editar la Normativa**. |
| **Executive / Director** | Todo lo anterior + **crear miembros y asignar roles**. |

El control lo imponen las políticas **RLS** de la base de datos (no solo la UI).
La gestión de miembros usa una **Edge Function** (`crear-miembro`) que crea
cuentas ya confirmadas; el primer registro es el bootstrap del Director.

---

## 🧭 Módulos

| Módulo | Para qué sirve |
|---|---|
| **Centro de Mando** | KPIs: personal activo, balance, casos OPR abiertos, strikes; banderas de actividad (< 40 h/mes) y últimos casos. |
| **Personal** | Roster de mariscales + **historial disciplinario** por agente (🛡): registra advertencias/strikes citando artículos. |
| **Tesorería** | Ingresos/egresos con categoría, balance y resumen. |
| **Asuntos Internos (OPR)** | Describe el reporte → el sistema **delimita los artículos vulnerados** con su rango de sanción. Exporta el **explanatory** en texto (Art. 86). |
| **Normativa** | Catálogo editable de ~124 artículos (Libros I–V). Edición restringida a Directive+. |
| **Miembros** | Gestión de cuentas y roles (solo Executive/Director). |
| **Respaldo** | Exporta una copia JSON de todos los datos. |

---

## ⚖ Automatizaciones de la normativa

- **Contadores vigentes vs. históricos** (Art. 20): las advertencias salen de la
  cuenta a los ~90 días; el historial completo nunca se borra.
- **Medio strike automático** (Art. 84): al acumular 3 advertencias vigentes, el
  sistema agrega `0.5 strike` y marca esas advertencias como saldadas.
- **Analizador de infracciones**: puntúa los artículos por relevancia (etiquetas
  + texto, ignorando acentos) y muestra el rango de sanción. Usa siempre la
  normativa **vigente y editable** de la base de datos.
- **Exportación de explanatory** con los artículos citados, listo para el
  proceso disciplinario.

---

## 🧱 Arquitectura

```
index.html
assets/
  css/styles.css
  js/
    config.js            URL + clave pública de Supabase
    supabase.js          Cliente Supabase (CDN, sin build)
    auth.js              Login, bootstrap y sesión
    store.js             Capa de datos (Supabase + caché en memoria)
    matcher.js           Motor de coincidencia de infracciones
    normativa-seed.js    Catálogo semilla (referencia; la fuente viva es la BD)
    router.js / app.js   Router + arranque con gate de autenticación
    ui.js                Utilidades (modal, toast, helpers)
    views/               dashboard · personal · finanzas · asuntos · normativa · miembros · respaldo
```

### Base de datos (Supabase, proyecto `usms-control`)
Tablas con RLS: `perfiles`, `personal`, `finanzas`, `normativa`, `casos`,
`caso_articulos`, `sanciones`. Funciones: `mi_rol()`, `es_directiva()`,
`es_admin()`, `sistema_iniciado()`, trigger `handle_new_user` (primer usuario =
Director) y `guard_rol` (impide auto-ascensos). Edge Function: `crear-miembro`.

---

*Uso interno · GTAHUB Roleplay. La normativa incluida es un punto de partida
editable; ajústala a la versión vigente de tu facción.*
