# U.S. Marshals Service — Centro de Mando (GTAHUB Roleplay)

Sistema interno de **control de personal, tesorería y Asuntos Internos** para el
liderazgo del U.S. Marshals Service en GTA V Roleplay (GTAHUB). Diseño oscuro
estilo GTAHUB fusionado con la identidad de los U.S. Marshals (navy, oro y la
estrella de mariscal).

No requiere servidor ni instalación: es una aplicación web estática que corre
en el navegador y guarda los datos localmente (`localStorage`). Puedes
respaldar/compartir todo mediante exportación a JSON.

---

## 🚀 Cómo usarlo

**Opción A — abrir directo:** abre `index.html` en tu navegador.
> Algunos navegadores bloquean *ES modules* sobre `file://`. Si la vista queda
> en blanco, usa la Opción B.

**Opción B — servidor local (recomendado):**
```bash
# Python
python3 -m http.server 8080
# o Node
npx serve .
```
Luego entra a `http://localhost:8080`.

**Opción C — publicar gratis:** sube el repo a **GitHub Pages** (Settings →
Pages → Deploy from branch). Queda accesible para todo tu liderazgo por URL.

---

## 🧭 Módulos

| Módulo | Para qué sirve |
|---|---|
| **Centro de Mando** | KPIs: personal activo, balance de tesorería, casos OPR abiertos, strikes en plantilla, banderas de actividad (< 40 h/mes) y últimos casos. |
| **Personal** | Alta/edición de mariscales: rango, divisiones, estado (Activo/Inactivo/LOA/Suspendido/Retired), horas del mes, advertencias y strikes. Búsqueda instantánea. |
| **Tesorería** | Ingresos/egresos con categoría, responsable y fecha. Balance acumulado y resumen por categoría. |
| **Asuntos Internos (OPR)** | Registra un reporte, describe la situación y el sistema **delimita automáticamente qué artículos de la normativa se vulneran**, con su rango de sanción. Imputa los que correspondan y registra la resolución. |
| **Normativa** | Catálogo completo y **editable** de la normativa interna (≈115 artículos, Libros I–V). Es la fuente que alimenta el analizador de Asuntos Internos. |
| **Respaldo** | Exporta/importa todos los datos en JSON y restablece la información. |

---

## 🛡 Cómo funciona el analizador de infracciones

En **Asuntos Internos → Nuevo reporte**:

1. Describe la situación en lenguaje natural
   (ej.: *"disparó armamento letal en una persecución sin grabación y agredió a un civil"*).
2. Pulsa **Analizar situación**.
3. El motor puntúa cada artículo por relevancia (etiquetas + coincidencia de
   texto, ignorando acentos y mayúsculas) y muestra los más probables con su
   **rango de sanción** (de "advertencia verbal" a "expulsión directa").
4. Marca las infracciones que apliquen para imputarlas al caso y registra la
   sanción final.

> La sugerencia es **orientativa**; la resolución definitiva corresponde al
> explanatory (Arts. 79–91). Cuando edites la normativa, el analizador usa
> automáticamente la versión actualizada.

### Mantener la normativa al día
La normativa cambia con el tiempo. En **Normativa** puedes editar cualquier
artículo (sanción mín./máx., resumen y **etiquetas**), crear artículos nuevos o
desactivar los vencidos. Las **etiquetas** son las palabras clave que alimentan
el analizador: cuantas más relevantes agregues, mejor detecta las infracciones.
El botón **↺ Restaurar** vuelve a la versión original del documento.

---

## 💾 Datos y respaldo

- Todo se guarda en el navegador del dispositivo (no se sube a ningún lado).
- Usa **Respaldo → Descargar** para generar un `.json` y compartirlo con tu
  equipo; cualquiera puede **Importar** ese archivo para trabajar con los mismos
  datos.
- Para edición simultánea entre varias personas, ver *Roadmap*.

---

## 🗺 Roadmap / Recomendaciones

- **Sincronización multi-usuario (Supabase):** migrar el `store` a una base de
  datos para que todo el liderazgo edite en tiempo real con control de acceso
  por rango. La capa de datos ya está aislada en `store.js` para facilitarlo.
- **Historial disciplinario por agente:** vincular automáticamente los casos OPR
  al expediente del mariscal y calcular vencimientos (Art. 20: advertencias a 3
  meses, strikes a 90 días) y reincidencia (Art. 21).
- **Cálculo automático de medio strike** por acumulación 3/3 advertencias
  (Art. 84).
- **Plantillas de explanatory** que exporten el caso con los artículos citados
  (requisito formal del Art. 86).
- **Control de inactividad** (Art. 13): alerta a los 7 días sin reportar.
- **Roles y permisos** (Supervisory / Directive / Executive) según la cadena de
  mando de la normativa.

---

## 🧱 Estructura del proyecto

```
index.html
assets/
  css/styles.css            Tema GTAHUB × U.S. Marshals
  js/
    app.js                  Bootstrap + navegación
    router.js               Router por hash
    store.js                Estado + persistencia (localStorage) + import/export
    matcher.js              Motor de coincidencia de infracciones
    normativa-seed.js       Catálogo semilla de la normativa (editable en la app)
    ui.js                   Utilidades de interfaz (modal, toast, helpers)
    views/                  dashboard · personal · finanzas · asuntos · normativa · respaldo
```

Sin dependencias ni paso de build: JavaScript moderno (ES modules) y CSS puro.

---

*Uso interno · GTAHUB Roleplay. La normativa incluida es un punto de partida
editable; ajústala a la versión vigente de tu facción.*
