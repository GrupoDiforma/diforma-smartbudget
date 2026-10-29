/**
 * logistica.js — Fase 2: Logística y Cotización (PDF carta).
 * ETAPA 1 · PASO 1: prueba de concepto del documento (hoja Letter, membrete HTML,
 * tabla de ítems, T&C, firma y paginación "Página X de Y").
 *
 * Todo corre en el navegador. El PDF se genera con la impresión nativa
 * (Chrome/Edge: "Guardar como PDF"), sin servidor ni librerías externas.
 * Los datos de este archivo son de EJEMPLO; en pasos siguientes vendrán de
 * Odoo, de la ficha comercial y de Ajustes.
 */

/* ------------------------------------------------------------------ */
/* Datos de ejemplo (estructura = la que usará Ajustes más adelante)  */
/* ------------------------------------------------------------------ */

const LOG_MEMBRETE_DEMO = {
    logo: "assets/membrete-demo/logo-diforma.png",
    qr: "assets/membrete-demo/qr-diforma.png",
    web: "www.diformagroup.com",
    oficinas: [
        {
            titulo: "USA Office",
            tel: "561- 927- 8476",
            dir1: "1701 Sunset Harbour DR UNIT 706",
            dir2: "<b>Miami Beach</b> FL 33139. United States"
        },
        {
            titulo: "Production Facility",
            tel: "+57 315 899 4202",
            dir1: "Cra 90 No. 17b – 9",
            dir2: "<b>Bogotá D.C – Colombia</b>"
        }
    ]
};

const LOG_FIRMA_DEMO = {
    nombre: "Nombre del Comercial",
    cargo: "Cargo del comercial",
    correo: "comercial@grupodiforma.com",
    telefono: "+1 (561) 000 0000 / +57 (300) 000 0000",
    web: "https://www.diformainstore.com"
};

/** Ítems de ejemplo. Medidas en cm; se convierten a pulgadas en inglés. */
const LOG_ITEMS_DEMO = [
    {
        nombre: { es: "EXHIBIDOR DE PISO", en: "FLOOR DISPLAY" },
        desc: {
            es: "Estructura metálica con 4 repisas y 4 ruedas con freno; acabado en pintura electrostática; cabezote con impresión digital.",
            en: "Constructed with a metal frame featuring 4 product display shelves and 4 locking casters; electrostatic paint finish; header with digital printing."
        },
        dim: [50, 50, 182],
        emp: [56, 37, 110],
        undXEmp: 1,
        qty: 1000,
        unit: 231
    },
    {
        nombre: { es: "END CAP", en: "END CAP" },
        desc: {
            es: "Compuesto por backing impreso 2 caras y pedestal con estructura principal metálica terminada en pintura electrostática, forrado con PS e impresión de vinilo adhesivo.",
            en: "Composed of a double-sided printed backing and pedestal with a main metal structure finished in electrostatic paint, covered with PS and adhesive vinyl print."
        },
        dim: [120, 65, 160],
        emp: [125, 70, 165],
        undXEmp: 1,
        qty: 1,
        unit: 900
    },
    {
        nombre: { es: "DISPLAY MOSTRADOR", en: "COUNTER DISPLAY" },
        desc: {
            es: "Bandeja en PS termoformado con canastillas en spectar.",
            en: "Thermoformed PS tray with spectar baskets."
        },
        dim: [35, 25, 30],
        emp: [40, 30, 35],
        undXEmp: 10,
        qty: 100,
        unit: 28
    },
    {
        nombre: { es: "STICKER PRODUCTO", en: "PRODUCT STICKER" },
        desc: {
            es: "Sticker vinil (3 artes).",
            en: "Vinyl sticker (3 artworks)."
        },
        dim: null,
        emp: null,
        undXEmp: 0,
        qty: 930,
        unit: 1.1
    }
];

const LOG_ENVIOS_DEMO = [
    {
        desc: {
            es: "Servicio de transporte de entrega a un punto de Envigado (2 cajas)",
            en: "Delivery transport service to one location in Envigado (2 boxes)"
        },
        qty: 1,
        unit: 142
    },
    {
        desc: {
            es: "Servicio de transporte de entrega a un punto de Bogotá",
            en: "Delivery transport service to one location in Bogotá"
        },
        qty: 2,
        unit: 110
    }
];

/** Anchos de columna por defecto, en % del ancho de la tabla. */
const LOG_COLUMNAS_DEMO = [
    { k: "img", w: 12 },
    { k: "cod", w: 11 },
    { k: "desc", w: 39 },
    { k: "qty", w: 10 },
    { k: "pu", w: 13 },
    { k: "sub", w: 15 }
];

/** Alto por defecto de la imagen (y por tanto de la fila), en pulgadas. */
const LOG_ALTO_IMG_DEFAULT_IN = 0.6;
const LOG_ALTO_IMG_MIN_IN = 0.3;
const LOG_ALTO_IMG_MAX_IN = 3;
const LOG_ANCHO_COL_MIN_PCT = 5;

/**
 * Diseño ajustable por el usuario (se conserva al cambiar idioma/ítems en la vista).
 * cols: anchos en % · filaAlto: alto de imagen/fila en pulgadas por índice de ítem.
 */
let logLayout = {
    cols: LOG_COLUMNAS_DEMO.map(function (c) { return { k: c.k, w: c.w }; }),
    filaAlto: {}
};

function logLayoutReset_() {
    logLayout = {
        cols: LOG_COLUMNAS_DEMO.map(function (c) { return { k: c.k, w: c.w }; }),
        filaAlto: {}
    };
}

/* Textos fijos por idioma. Los T&C se editan en Ajustes (Paso 5) y se guardan en CONFIG_GLOBAL.tyc. */
const LOG_TEXTOS = {
    es: {
        ciudad: "Bogotá",
        pagina: "Página",
        de: "de",
        senores: "Señores:",
        atn: "Atn.",
        titulo: "COTIZACIÓN PROYECTO #",
        tituloCons: "CONSOLIDADO PROYECTO #",
        saludo: "Apreciados señores:",
        intro: "De acuerdo a su amable solicitud, nos permitimos presentarles la siguiente propuesta:",
        cols: { img: "Imagen", cod: "Código de proyecto", desc: "Descripción", qty: "Cantidad", pu: "Precio unitario", sub: "Precio sub total" },
        dim: "Dimensiones generales",
        emp: "Empaque",
        undEmp: "und. por caja",
        secEnvios: "LOGÍSTICA",
        totProductos: "PRECIO SUB TOTAL",
        totEnvios: "PRECIO TOTAL LOGÍSTICA",
        granTotal: "GRAN TOTAL",
        incoterm: "Incoterm",
        destino: "Destino",
        tycTitulo: "TÉRMINOS Y CONDICIONES DE NEGOCIACIÓN",
        cierre: "Esperamos que esta propuesta cumpla con todas sus expectativas. Quedamos a su entera disposición para resolver cualquier inquietud o realizar los ajustes necesarios.",
        despedida: "Cordialmente,",
        tyc: [
            {
                t: "PRE-PRODUCCIÓN",
                items: [
                    ["Alcance de la cotización:", "Grupo Diforma incluye dentro del valor de esta propuesta la adaptación de artes o archivos gráficos suministrados por el cliente para el desarrollo del proyecto. No se incluye el costo por concepto de diseño gráfico conceptual, retoque de imágenes ni la compra de imágenes de bancos fotográficos."],
                    ["Validez de la propuesta:", "{{validez}} días calendario a partir de la fecha de emisión."],
                    ["Prototipos y muestras:", "La elaboración de cualquier tipo de muestra o prototipo será cobrada si no es seguida por una Orden de Compra formal que asegure la producción del proyecto. En caso de aprobarse el proyecto, el valor de esta muestra se amortizará en el costo total de la producción, pero los gastos de envío correrán por cuenta del cliente. Esta condición aplica siempre y cuando el prototipo no exceda un valor unitario de {{tope_prototipo}} y la orden final sea superior a {{min_orden_prototipo}}."]
                ]
            },
            {
                t: "PRODUCCIÓN",
                items: [
                    ["Inicio:", "Toda solicitud de producción requiere el respaldo de una Orden de Compra formal por parte del cliente, la cual debe incluir el valor de transportes, montajes y bodegajes, según el tipo de proyecto a desarrollar."],
                    ["Plazo de producción:", "Entre {{plazo_prod}} días hábiles (excluyendo domingos y días festivos en Colombia), contados a partir del cumplimiento de las condiciones estipuladas en el siguiente punto."],
                    ["Plazo de entrega:", "El tiempo de entrega estipulado comenzará a correr una vez se cumplan estrictamente las siguientes condiciones: (i) Recepción formal de la Orden de Compra, (ii) Pago efectivo del anticipo (si aplica), (iii) Aprobación formal y por escrito de un prototipo o primera unidad por parte del cliente, (iv) Recepción de los artes finalizados en alta resolución y medidas por parte del cliente (si aplica)."],
                    ["Modificaciones:", "Cualquier cambio en las especificaciones, materiales o cantidades acordadas en la cotización inicial, una vez iniciada la producción, se considerará un servicio adicional y generará sobrecostos a cargo del cliente."]
                ]
            },
            {
                t: "BODEGAJE, TRANSPORTE E INSTALACIÓN",
                items: [
                    ["Bodegaje:", "Toda mercancía finalizada dentro del periodo acordado podrá permanecer en las instalaciones de Grupo Diforma por un máximo de {{dias_bodega}} días sin costo adicional antes de su despacho. A partir de esta fecha, se generará un cobro adicional por concepto de bodegaje a cargo del cliente (dependiendo del volumen y fragilidad)."],
                    ["Transporte:", "En caso de que el cliente contrate los servicios de transporte con Grupo Diforma, la información de entrega (dirección exacta, contacto, teléfono y correo) deberá suministrarse con anticipación para su efectiva coordinación. De lo contrario, o por factores de terceros (cambios en itinerarios de transportadoras, aerolíneas o navieras), los tiempos de entrega al destino final podrán sufrir variaciones sin previo aviso. Todo sobrecosto generado en la operación logística por causas ajenas a Grupo Diforma será asumido por el cliente."],
                    ["Instalación:", "Si el cliente contrata los servicios de instalación y montaje con Grupo Diforma, deberá proveer con anticipación la dirección exacta, personas de contacto, horarios y cualquier información relevante del lugar para asegurar una correcta coordinación. Toda instalación o montaje cancelado o retrasado por causas ajenas a Grupo Diforma generará un costo adicional."],
                    ["Fecha de entrega:", "Por determinar."]
                ]
            },
            {
                t: "TÉRMINOS DE PAGO",
                items: [
                    ["Estructura:", "{{anticipo}} de anticipo y {{saldo}} contra entrega. Cualquier retraso en el pago del anticipo generará un retraso proporcional en la fecha de entrega acordada."],
                    ["Acuerdos adicionales:", "Cualquier condición o forma de pago diferente a la estipulada generará costos financieros adicionales a la propuesta inicial."]
                ]
            },
            {
                t: "PROPIEDAD INTELECTUAL",
                items: [
                    ["", "Todos los diseños, especificaciones e ideas técnicas presentadas son propiedad intelectual exclusiva de Grupo Diforma, y están protegidos por las leyes de derechos de autor, salvo que el cliente sea el propietario original o haya adquirido dicha propiedad mediante un acuerdo expreso y por escrito con Grupo Diforma. De lo contrario, el cliente solo tiene permiso de uso para este proyecto en específico."]
                ]
            },
            {
                t: "SERVICIO POST VENTA",
                items: [
                    ["Cobertura:", "Grupo Diforma ofrece una garantía de {{garantia}} meses contra defectos de fabricación. Esta garantía no cubre daños ocasionados por maltrato, uso inadecuado o desgaste natural."],
                    ["Validez:", "La garantía únicamente se hará efectiva una vez Grupo Diforma haya recibido el pago total de la factura."],
                    ["Cuidados:", "Grupo Diforma entregará un instructivo de armado y manipulación del producto con el fin de asegurar su uso correcto y prolongar su vida útil."]
                ]
            }
        ]
    },
    en: {
        ciudad: "Miami",
        pagina: "Page",
        de: "of",
        senores: "",
        atn: "Atn.",
        titulo: "QUOTATION PROJECT #",
        tituloCons: "CONSOLIDATED PROJECT #",
        saludo: "Dear Ms. or Mr.,",
        intro: "Thank you for your inquiry. Regarding your request, please find our quotation below:",
        cols: { img: "Image", cod: "Project code", desc: "Description", qty: "Quantity", pu: "Unit Price", sub: "Extended Price" },
        dim: "Dimensions",
        emp: "Packaging",
        undEmp: "units per box",
        secEnvios: "LOGISTICS",
        totProductos: "SUBTOTAL PRICE",
        totEnvios: "TOTAL LOGISTICS PRICE",
        granTotal: "GRAND TOTAL",
        incoterm: "Incoterm",
        destino: "Destination",
        tycTitulo: "TERMS AND CONDITIONS",
        cierre: "We look forward to exceeding your expectations. Should you have any questions or require further clarification, please do not hesitate to contact us.",
        despedida: "Sincerely,",
        tyc: [
            {
                t: "PRE-PRODUCTION",
                items: [
                    ["Scope of Estimate:", "This estimate includes adjustments to client-supplied artwork or creative files for project development. It does not include the conception of new graphic artworks or the licensing of stock images from professional databases."],
                    ["Proposal Validity:", "This proposal remains valid for {{validez}} calendar days from the date of issue."],
                    ["Prototypes and Samples:", "The creation of a prototype or sample will be billed if it is not followed by a formal Purchase Order from the client. The sample price will depend on its production cost, and all shipping fees will be at the client's expense. This charge applies unless the prototype's unit value is under {{tope_prototipo}} and the final order value exceeds {{min_orden_prototipo}}."]
                ]
            },
            {
                t: "PRODUCTION",
                items: [
                    ["Commencement:", "Production will begin upon receipt of the official Purchase Order, which must include freight, assembly, and storage costs as outlined in the agreed estimate sent by Diforma Group."],
                    ["Production Timeline:", "{{plazo_prod_en}} business days (excluding Sundays and Colombian public holidays), commencing once the conditions stipulated in the following point are met."],
                    ["Delivery Timeline:", "The delivery schedule is strictly dependent on the completion of the following conditions: (i) Official receipt of the Purchase Order, (ii) Receipt of the advance payment (if applicable), (iii) Formal written approval of the prototype or first unit by the client (if applicable), (iv) Delivery of final, high-resolution artworks by the client (if applicable)."],
                    ["Modifications:", "Any changes to quantities, concepts, materials, or specifications not stipulated in this proposal or the initial Purchase Order will be considered additional services and will incur extra costs."]
                ]
            },
            {
                t: "STORAGE, FREIGHT AND INSTALLATION",
                items: [
                    ["Storage:", "Finished goods may remain at Diforma Group’s facilities for a maximum of {{dias_bodega}} days post-production at no extra cost. After this period, a storage fee will be applied based on the size, quantity, weight, and fragility of the goods."],
                    ["Freight:", "If you choose our transport services, Diforma Group must receive all logistics information in advance (exact address, on-site contact name, phone number, and email) to ensure effective coordination. Failure to provide this, or reliance on third-party carriers (airlines/shipping companies), may result in delivery variations without prior notice. Any extra charges arising from additional logistics, handling, or unforeseen delays outside of Diforma Group's control will be billed to the client."],
                    ["Installation:", "If you choose our installation services, Diforma Group must receive the exact address, site contact details, and any other relevant site information in advance to ensure proper coordination."],
                    ["Delivery Date:", "To be determined."]
                ]
            },
            {
                t: "PAYMENT TERMS",
                items: [
                    ["Structure:", "{{anticipo}} advance deposit, {{saldo}} upon delivery. Any delays in the advance payment will result in corresponding delays to the production and delivery schedule."],
                    ["Alternative Arrangements:", "Any payment agreements outside of these terms may incur additional costs."]
                ]
            },
            {
                t: "INTELLECTUAL PROPERTY",
                items: [
                    ["", "All designs, specifications, and technical ideas remain the exclusive property of Diforma Group, unless pre-owned by the client or explicitly transferred via a formal written agreement. Otherwise, the client is granted a license for single-project use only. Diforma Group retains authorship and ownership of all artworks and ideas, which are protected by applicable federal, state, and international copyright and statutory laws."]
                ]
            },
            {
                t: "AFTER-SALES SERVICE AND WARRANTIES",
                items: [
                    ["Coverage:", "Diforma Group provides a {{garantia}}-month warranty against manufacturing defects. This warranty does not cover damages resulting from improper handling or misuse."],
                    ["Validity:", "This warranty will only become effective once Diforma Group has received full payment for the invoice."],
                    ["Care:", "Diforma Group will provide usage instructions to ensure proper handling and maximize the product's lifespan."]
                ]
            }
        ]
    }
};

const LOG_TYC_VARS_DEF_ = {
    validez: "30",
    tope_prototipo: "$200 USD",
    min_orden_prototipo: "$10,000 USD",
    plazo_prod: "25 y 30",
    plazo_prod_en: "25 to 30",
    dias_bodega: "10",
    anticipo: "50%",
    saldo: "50%",
    garantia: "3"
};

function logTycDefault_(idioma) {
    const T = LOG_TEXTOS[idioma === "en" ? "en" : "es"];
    return {
        titulo: T.tycTitulo,
        secciones: T.tyc.map(function (sec, i) {
            return {
                id: "s" + (i + 1),
                t: sec.t,
                items: sec.items.map(function (par) { return { k: par[0] || "", v: par[1] || "" }; })
            };
        })
    };
}

function logTycClonar_(o) { return JSON.parse(JSON.stringify(o == null ? null : o)); }

/** Biblioteca completa (es + en + variables de empresa). Si no hay nada en Ajustes, usa los textos actuales. */
function logTycDoc_() {
    const raw = (typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.tyc) ? CONFIG_GLOBAL.tyc : {};
    const vars = Object.assign({}, LOG_TYC_VARS_DEF_, raw.vars || {});
    return {
        vars: vars,
        es: raw.es && Array.isArray(raw.es.secciones) && raw.es.secciones.length ? logTycClonar_(raw.es) : logTycDefault_("es"),
        en: raw.en && Array.isArray(raw.en.secciones) && raw.en.secciones.length ? logTycClonar_(raw.en) : logTycDefault_("en")
    };
}

function logTycVarsCotizacion_(idioma) {
    const D = logisticaDatosDoc_(idioma);
    const mon = logQuote.moneda || "USD";
    const nd = logDecimales_();
    const tots = logTotales_(idioma);
    const escs = logEscList_();
    const total = tots[escs.length ? escs[0].id : ""] || 0;
    return {
        cliente: D.cliente || "",
        codigo: D.codigo || "",
        ciudad: D.ciudad || "",
        fecha: D.fecha || "",
        comercial: D.firmaNombre || "",
        moneda: mon,
        total: logFmtMoneda_(total, idioma, nd)
    };
}

function logTycAplicar_(txt, vars) {
    return String(txt || "").replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, function (_, k) {
        const v = vars[k];
        return v == null ? "{{" + k + "}}" : String(v);
    });
}

window.logTycDoc_ = logTycDoc_;
window.logTycDefault_ = logTycDefault_;
window.logTycVarsDef_ = function () { return Object.assign({}, LOG_TYC_VARS_DEF_); };

function logMembreteDefault_() {
    return {
        logo: "",
        qr: "",
        firmaImg: "",
        web: LOG_MEMBRETE_DEMO.web,
        oficinas: LOG_MEMBRETE_DEMO.oficinas.map(function (of) {
            return {
                titulo: of.titulo,
                tel: of.tel,
                dir1: of.dir1,
                dir2: String(of.dir2 || "").replace(/<[^>]+>/g, "")
            };
        })
    };
}

function logEsDataUrl_(s) {
    return /^data:image\//i.test(String(s || ""));
}

/** Membrete de Ajustes + archivos locales de respaldo (logo/QR de Edwin). */
function logMembreteDoc_() {
    const raw = (typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.membrete) ? CONFIG_GLOBAL.membrete : {};
    const def = logMembreteDefault_();
    const ofis = Array.isArray(raw.oficinas) && raw.oficinas.length
        ? raw.oficinas.map(function (of) {
            return {
                titulo: of.titulo || "",
                tel: of.tel || "",
                dir1: of.dir1 || "",
                dir2: String(of.dir2 || "").replace(/<[^>]+>/g, "")
            };
        })
        : def.oficinas;
    return {
        logo: logEsDataUrl_(raw.logo) ? raw.logo : LOG_MEMBRETE_DEMO.logo,
        qr: logEsDataUrl_(raw.qr) ? raw.qr : LOG_MEMBRETE_DEMO.qr,
        firmaImg: logEsDataUrl_(raw.firmaImg) ? raw.firmaImg : "",
        web: (raw.web != null && String(raw.web).trim()) ? String(raw.web).trim() : def.web,
        oficinas: ofis
    };
}

window.logMembreteDoc_ = logMembreteDoc_;
window.logMembreteDefault_ = logMembreteDefault_;

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function logEsc_(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Número con separadores según idioma: es → 1.023,00 · en → 1,023.00 */
function logFmtNum_(n, idioma, nd) {
    const dd = nd == null ? 2 : nd;
    const neg = n < 0;
    const partes = Math.abs(Number(n) || 0).toFixed(dd).split(".");
    const miles = idioma === "en" ? "," : ".";
    const dec = idioma === "en" ? "." : ",";
    const ent = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, miles);
    return (neg ? "-" : "") + ent + (dd > 0 ? dec + partes[1] : "");
}

/** Moneda: es → "$ 1.023,00" · en → "$1,023.00" (nd = decimales). */
function logFmtMoneda_(n, idioma, nd) {
    return idioma === "en" ? "$" + logFmtNum_(n, "en", nd) : "$ " + logFmtNum_(n, "es", nd);
}

/** Decimales de los precios de esta cotización: 0 sin centavos, 1 o 2. */
function logDecimales_() {
    const n = Number(logQuote && logQuote.decimales);
    return n === 1 || n === 2 ? n : 0;
}

function logRedondear_(n) {
    const x = Number(n);
    if (!isFinite(x)) return n;
    return Number(x.toFixed(logDecimales_()));
}

/** Texto escrito a mano → número, según las convenciones del idioma. null si no se entiende. */
function logParseNum_(txt, idioma) {
    let s = String(txt == null ? "" : txt).replace(/[^\d.,\-]/g, "");
    if (!s) return null;
    if (idioma === "en") s = s.replace(/,/g, "");
    else s = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
}

function logFmtFecha_(d, idioma) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return idioma === "en" ? mm + "/" + dd + "/" + yy : dd + "/" + mm + "/" + yy;
}

/** Medidas [a,b,c] en cm → "50 × 50 × 182 cm" o '19.69" × 19.69" × 71.65"'. */
function logFmtMedidas_(cm, idioma) {
    if (!cm) return "";
    if (idioma === "en") {
        return cm.map(function (v) { return (v / 2.54).toFixed(2) + "\""; }).join(" × ");
    }
    return cm.join(" × ") + " cm";
}

const LOG_THUMB_SVG_ = "data:image/svg+xml;utf8," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'>" +
    "<rect width='120' height='90' fill='#eceff1'/>" +
    "<polygon points='20,70 48,38 66,58 80,44 102,70' fill='#b0bec5'/>" +
    "<circle cx='86' cy='26' r='8' fill='#cfd8dc'/></svg>"
);

/* ------------------------------------------------------------------ */
/* Datos reales del proyecto (cabecera y firma)                        */
/* ------------------------------------------------------------------ */

/**
 * Lo que el usuario edita directo sobre la hoja se guarda en logCab.over (por campo).
 * Si cambia el proyecto, esas ediciones se descartan. Lo que no se edita se calcula
 * en cada render a partir del proyecto abierto y de los datos de Odoo.
 */
let logCab = { codigo: "", over: {}, idiomaPara: "", idiomaManual: false, sistemaManual: false };

/** Último resultado de Odoo (contacto y comercial) para el proyecto abierto. */
let logOdoo = { codigo: "", data: null, estado: "idle", mensaje: "" };

/** Código del proyecto de la cotización (la primera fila), no el presupuesto abierto en Costos. */
function logCodigoProyectoCotizacion_() {
    const filas = (logQuote && logQuote.filas) || [];
    const fila = filas.find(function (f) { return f.tipo === "item" && String(f.proy || "").trim(); });
    if (fila) return String(fila.proy).trim();
    const p = logisticaLeerProyecto_();
    return p.hayProyecto ? p.codigo : "";
}

/** La cabecera sigue al presupuesto de Costos solo si la cotización es de ese mismo proyecto y no es una guardada. */
function logCotizacionSigueAlProyectoAbierto_() {
    if (logQuote && logQuote.abierta) return false;
    const cod = logCodigoProyectoCotizacion_();
    if (!cod) return true;
    const p = logisticaLeerProyecto_();
    return p.codigo === cod;
}

function logisticaLeerProyecto_() {
    const v = function (id) {
        const el = document.getElementById(id);
        return el ? String(el.value || "").trim() : "";
    };
    const nombre = v("noProyecto");
    const codigo = (typeof codigoOportunidadLimpio_ === "function")
        ? (codigoOportunidadLimpio_(v("inputCodigo")) || codigoOportunidadLimpio_(nombre))
        : (v("inputCodigo") || nombre.split(/\s+/)[0] || "").trim();
    let idioma = "es";
    try { idioma = localeProyectoActual().idioma === "en" ? "en" : "es"; } catch (e) { /* sin locale: español */ }
    return {
        hayProyecto: !!codigo,
        codigo: codigo,
        nombre: nombre,
        cliente: v("cliente"),
        comercial: v("comercial"),
        version: window.versionActivaId || "V1",
        idioma: idioma
    };
}

/** Valores de cabecera y firma para el render (ediciones del usuario > Odoo > proyecto > ejemplo). */
function logisticaDatosDoc_(idioma) {
    const T = LOG_TEXTOS[idioma];
    const p = logisticaLeerProyecto_();
    const codQuote = logCodigoProyectoCotizacion_();
    const sigue = logCotizacionSigueAlProyectoAbierto_();
    if (sigue && (p.codigo || "") !== logCab.codigo) {
        logCab.codigo = p.codigo || "";
        logCab.over = {};
        logCab.idiomaPara = "";
    }
    const demo = !codQuote && !p.hayProyecto;
    const od = codQuote && logOdoo.codigo === codQuote ? logOdoo.data : null;
    const con = (od && od.contacto) || {};
    const com = (od && od.comercial) || {};
    const ov = logCab.over;
    const pick = function (campo, auto) {
        return Object.prototype.hasOwnProperty.call(ov, campo) ? ov[campo] : auto;
    };
    const f = LOG_FIRMA_DEMO;
    return {
        demo: demo,
        ciudad: pick("ciudad", T.ciudad),
        fecha: pick("fecha", logFmtFecha_(new Date(), idioma)),
        cliente: pick("cliente", demo ? "CLIENTE DE EJEMPLO S.A." : ((sigue ? p.cliente : "") || (od && od.cliente) || "")),
        contacto: pick("contacto", demo ? "Nombre del Contacto" : (con.nombre || "")),
        cargoContacto: pick("cargoContacto", demo ? "Cargo del Contacto" : (con.cargo || "")),
        codigo: (function () {
            const auto = demo ? "17999-A-V1" : (logCodigoPrimeraFila_() || (p.codigo + (p.version ? "-" + p.version : "")) || "");
            /* Consolidado: el # del encabezado sigue siempre la 1.ª fila (no el cab guardado ni el de Costos). */
            if (logTipoDoc_(idioma) === "CONS") return auto;
            return pick("codigo", auto);
        })(),
        firmaNombre: pick("firmaNombre", demo ? f.nombre : (com.nombre || (sigue ? p.comercial : "") || "")),
        firmaCargo: pick("firmaCargo", demo ? f.cargo : (com.cargo || "")),
        firmaCorreo: pick("firmaCorreo", demo ? f.correo : (com.correo || "")),
        firmaTelefono: pick("firmaTelefono", demo ? f.telefono : (com.telefono || "")),
        firmaWeb: pick("firmaWeb", demo ? f.web : (com.web || ""))
    };
}

function logisticaPintarEstado_() {
    const el = document.getElementById("logOdooEstado");
    if (!el) return;
    const p = logisticaLeerProyecto_();
    const codQuote = logCodigoProyectoCotizacion_() || p.codigo;
    let html;
    if (!p.hayProyecto && logQuote.abierta) {
        html = "<i class=\"bi bi-folder2-open me-1\"></i>Mostrando la cotización guardada " + logEsc_(logQuote.abierta.numero) + ". Para agregar versiones de un proyecto, ábrelo en Ingeniería de Costos.";
    } else if (!p.hayProyecto) {
        html = "<i class=\"bi bi-info-circle me-1\"></i>Sin proyecto abierto: se muestran datos de ejemplo. Busca un código en Ingeniería de Costos.";
    } else if (logOdoo.estado === "cargando") {
        html = "<span class=\"spinner-border spinner-border-sm me-1\"></span>Leyendo contacto y comercial en Odoo…";
    } else if (logOdoo.estado === "ok") {
        const av = (logOdoo.data && logOdoo.data.avisos) || [];
        html = av.length
            ? "<i class=\"bi bi-exclamation-triangle text-warning me-1\"></i>Odoo cargado con avisos: " + logEsc_(av.join(" ")) + " Puedes completar los datos directo sobre la hoja."
            : "<i class=\"bi bi-check-circle text-success me-1\"></i>Datos de Odoo cargados (proyecto " + logEsc_(codQuote) + "). Todo es editable sobre la hoja.";
    } else if (logOdoo.estado === "error") {
        html = "<i class=\"bi bi-x-circle text-danger me-1\"></i>No se pudo leer Odoo: " + logEsc_(logOdoo.mensaje) + " Completa los datos a mano sobre la hoja.";
    } else {
        html = "<i class=\"bi bi-info-circle me-1\"></i>Proyecto " + logEsc_(codQuote) + ".";
    }
    if (p.hayProyecto) {
        let img;
        if (logImgOdoo.codigo !== codQuote || logImgOdoo.estado === "idle") img = "";
        else if (logImgOdoo.estado === "cargando") img = "<span class=\"spinner-border spinner-border-sm me-1\"></span>Buscando la imagen en Odoo…";
        else if (logImgOdoo.estado === "ok") img = "<i class=\"bi bi-image text-success me-1\"></i>Imagen de Odoo lista" + (logImgOdoo.campo ? " (" + logEsc_(logImgOdoo.campo) + ")" : "") + ". Clic en la miniatura para cambiarla.";
        else if (logImgOdoo.estado === "sin") img = "<i class=\"bi bi-image text-warning me-1\"></i>El proyecto no tiene imagen en Odoo: haz clic en la miniatura para subir una.";
        else img = "<i class=\"bi bi-x-circle text-danger me-1\"></i>No se pudo leer la imagen de Odoo: " + logEsc_(logImgOdoo.mensaje) + " Puedes subirla a mano.";
        if (img) html += "<br>" + img;
    }
    el.innerHTML = html;
    logisticaAvisoProyectoCostos_();
}

function logNormCod_(s) {
    return String(s || "").trim().toUpperCase();
}

/** Código que se ve en la hoja (la primera fila), no el presupuesto abierto en Costos. */
function logCodigoEnHoja_() {
    const filas = (logQuote && logQuote.filas) || [];
    const fila = filas.find(function (f) { return f.tipo === "item" && String(f.proy || "").trim(); });
    if (fila) return String(fila.proy).trim();
    if (logQuote && logQuote.abierta) return String(logQuote.codigo || "").trim();
    return "";
}

/** Código de proyecto sin sufijo -V1 / -V2 (para buscar en el historial de Costos). */
function logCodigoProyectoBase_(s) {
    return String(s || "").trim().replace(/-V\d+$/i, "");
}

function logisticaAvisoProyectoCostos_() {
    const el = document.getElementById("logAvisoProyecto");
    if (!el) return;
    const p = logisticaLeerProyecto_();
    const hoja = logCodigoEnHoja_();
    const a = logQuote && logQuote.abierta;
    const codCotiz = logCodigoProyectoBase_(logCodigoPrimeraFila_() || hoja) || logCodigoProyectoBase_(hoja);
    const distinto = !!(p.hayProyecto && hoja && logNormCod_(logCodigoProyectoBase_(p.codigo)) !== logNormCod_(logCodigoProyectoBase_(hoja)));
    if (!distinto && !(a && codCotiz && !p.hayProyecto)) {
        el.className = "d-none";
        el.innerHTML = "";
        return;
    }
    const cual = a ? (a.numero || a.id || hoja) : hoja;
    const btns = [];
    if (distinto) {
        btns.push("<button type=\"button\" class=\"btn btn-sm btn-primary\" onclick=\"logisticaTomarProyectoCostos_()\" title=\"Cierra esta cotización y arma una nueva con el proyecto abierto en Costos\">Cotizar " + logEsc_(p.codigo) + "</button>");
    }
    if (codCotiz) {
        btns.push("<button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"logisticaAbrirProyectoCotizacionEnCostos_()\" title=\"Abre en Costos el presupuesto de esta cotización (1.ª fila / título)\">Abrir " + logEsc_(codCotiz) + " en Costos</button>");
    }
    let texto;
    if (distinto) {
        texto = "<i class=\"bi bi-exclamation-triangle me-1\"></i>En <b>Costos</b> tienes abierto <b>" + logEsc_(p.codigo) + "</b>, pero esta pestaña sigue con la cotización <b>" + logEsc_(cual) + "</b>. "
            + "<span class=\"d-block small mt-1 mb-0\">Si pulsas «Cotizar " + logEsc_(p.codigo) + "», se cierra esta cotización y se empieza una nueva con el proyecto de Costos. "
            + "Si quieres trabajar el presupuesto de esta cotización, usa «Abrir " + logEsc_(codCotiz || "…") + " en Costos».</span>";
    } else {
        texto = "<i class=\"bi bi-info-circle me-1\"></i>Cotización <b>" + logEsc_(cual) + "</b> sin proyecto abierto en Costos. Puedes abrir <b>" + logEsc_(codCotiz) + "</b> en Presupuestos.";
    }
    el.className = "alert alert-warning py-2 px-3 mb-2 d-flex flex-wrap align-items-center justify-content-between gap-2";
    el.innerHTML = "<div class=\"flex-grow-1\">" + texto + "</div>"
        + (btns.length ? "<div class=\"d-flex flex-wrap gap-2\">" + btns.join("") + "</div>" : "");
}

function logisticaTomarProyectoCostos_() {
    logQuote.inicializado = false;
    logQuote.abierta = null;
    logQuote.sucio = false;
    logQuote.codigo = "";
    logCab = { codigo: "", over: {}, idiomaPara: "", idiomaManual: false, sistemaManual: false };
    logOdoo = { codigo: "", data: null, estado: "idle", mensaje: "" };
    logisticaSincronizarProyecto();
    if (typeof mostrarNotificacion === "function") {
        const p = logisticaLeerProyecto_();
        mostrarNotificacion(p.codigo ? ("Cotización armada con " + p.codigo + ".") : "Cotización armada con el proyecto de Costos.", "success");
    }
}

/** Abre en Ingeniería de Costos el presupuesto ligado a esta cotización (código de la 1.ª fila). */
async function logisticaAbrirProyectoCotizacionEnCostos_() {
    const bruto = logCodigoPrimeraFila_() || logCodigoEnHoja_();
    const codigo = logCodigoProyectoBase_(bruto);
    if (!codigo) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("No hay código de proyecto en esta cotización.", "warning");
        return;
    }
    if (typeof listaHistorialCostos_ !== "function" || typeof cargarProyectoBD !== "function") {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("No se pudo abrir el historial de Costos.", "danger");
        return;
    }
    if (typeof mostrarEsperaNube === "function") mostrarEsperaNube("Buscando " + codigo + " en Costos…");
    try {
        const lista = await listaHistorialCostos_();
        const filas = (lista && lista.filas) || [];
        let hit = typeof proyectoGuardadoPorCodigo_ === "function" ? proyectoGuardadoPorCodigo_(filas, codigo) : null;
        if (!hit && typeof normCodigoProyecto_ === "function") {
            const n = normCodigoProyecto_(codigo);
            hit = filas.find(function (p) {
                const np = normCodigoProyecto_(p.noProyecto || p.id || "");
                return np === n || np.indexOf(n) === 0 || n.indexOf(np) === 0;
            }) || null;
        }
        if (!hit || !hit.id) {
            if (typeof mostrarNotificacion === "function") {
                mostrarNotificacion("No encontré el presupuesto " + codigo + " en el historial de Costos.", "warning");
            }
            return;
        }
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
        await cargarProyectoBD(hit.id);
        const tab = document.getElementById("tabBtnIngenieria");
        if (tab) tab.click();
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("Proyecto " + (hit.noProyecto || codigo) + " abierto en Costos.", "success");
        }
    } catch (err) {
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("No se pudo abrir el proyecto: " + ((err && err.message) || err), "danger");
        }
    } finally {
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
    }
}
window.logisticaAbrirProyectoCotizacionEnCostos_ = logisticaAbrirProyectoCotizacionEnCostos_;

/** Textos candidatos para cruzar una fila congelada con un elemento del grupal. */
function logTextosIdentidadFila_(fila) {
    const out = [];
    const push = function (s) {
        s = String(s || "").trim().toLowerCase();
        if (s && out.indexOf(s) < 0) out.push(s);
    };
    const ov = (fila && fila.over) || {};
    const sn = (fila && fila.snap) || {};
    const f = sn.ficha || {};
    push(ov.titulo);
    push(f.titulo);
    push(sn.nombre);
    if (f.titulo && sn.nombre && f.titulo !== sn.nombre) {
        push(String(sn.nombre).trim() + " — " + String(f.titulo).trim());
        push(String(sn.nombre).trim() + " - " + String(f.titulo).trim());
    }
    return out;
}

/** ¿La versión de Costos es grupal con varias piezas? */
function logVersionEsGrupalMulti_(ver) {
    return !!(ver && Array.isArray(ver.elementos) && ver.elementos.length > 1);
}

/**
 * Cotizaciones viejas no guardaban `elem`. Si falta, intenta emparejar por título/nombre
 * con los elementos de la versión en Costos. Vacío = no se pudo resolver.
 */
function logResolverElemFila_(fila) {
    const ver = logVersiones_().find(function (x) { return logVerIgual_(x.id, fila.ver); })
        || logVersiones_().find(function (x) { return logVerIgual_(x.id, window.versionActivaId); });
    const elems = (ver && ver.elementos) || [];
    if (fila.elem && elems.some(function (e) { return String(e.id) === String(fila.elem); })) {
        return String(fila.elem);
    }
    if (!elems.length) return "";
    if (elems.length === 1) return String(elems[0].id);
    const claves = logTextosIdentidadFila_(fila);
    if (!claves.length) return "";
    let hit = elems.find(function (e) {
        const n = String(e.nombre || "").trim().toLowerCase();
        return n && claves.indexOf(n) >= 0;
    });
    if (!hit) {
        hit = elems.find(function (e) {
            const t = String((e.fichaComercial && e.fichaComercial.titulo) || "").trim().toLowerCase();
            const n = String(e.nombre || "").trim().toLowerCase();
            return claves.some(function (clave) {
                return (t && (t === clave || clave.indexOf(t) >= 0 || t.indexOf(clave) >= 0))
                    || (n && (clave.indexOf(n) >= 0 || n.indexOf(clave) >= 0));
            });
        });
    }
    return hit ? String(hit.id) : "";
}

/** Escalas previas de la fila (array del snap, o síntesis q/lote de cotizaciones viejas). */
function logEscalasPrevFila_(fila) {
    const sn = (fila && fila.snap) || null;
    const out = [];
    const push = function (id, q, puCop) {
        if (id == null || id === "") return;
        if (out.some(function (e) { return e.id === id; })) return;
        out.push({ id: id, q: q != null ? Number(q) : null, puCop: puCop != null ? Number(puCop) : null });
    };
    if (sn && Array.isArray(sn.escalas) && sn.escalas.length) {
        sn.escalas.forEach(function (e) {
            if (e) push(e.id, e.q, e.puCop);
        });
    } else if (sn && sn.q != null && fila.lote) {
        push(fila.lote, sn.q, sn.puCop);
    }
    if (fila && fila.opc) {
        Object.keys(fila.opc).forEach(function (escId) {
            const id = fila.opc[escId];
            const known = out.find(function (e) { return e.id === id; });
            push(id, known ? known.q : null, known ? known.puCop : null);
        });
    }
    if (fila && fila.lote) push(fila.lote, null, null);
    return out;
}

/** Cruza ids de escala viejos→nuevos por cantidad (los ids pueden cambiar al recalcular). */
function logRemapLotesFila_(fila, pr, escalasPrev) {
    if (!pr || !pr.escalas || !pr.escalas.length) return;
    const prev = Array.isArray(escalasPrev) ? escalasPrev : [];
    const mapId = {};
    prev.forEach(function (old) {
        if (!old || old.id == null) return;
        const neu = (old.q != null && isFinite(Number(old.q))
            ? pr.escalas.find(function (e) { return Number(e.q) === Number(old.q); })
            : null)
            || pr.escalas.find(function (e) { return e.id === old.id; });
        if (neu) mapId[old.id] = neu.id;
    });
    const resolver = function (loteId) {
        if (loteId == null || loteId === "") return loteId;
        if (mapId[loteId]) return mapId[loteId];
        if (pr.escalas.some(function (e) { return e.id === loteId; })) return loteId;
        const old = prev.find(function (e) { return e && e.id === loteId; });
        if (old && old.q != null && isFinite(Number(old.q))) {
            const neu = pr.escalas.find(function (e) { return Number(e.q) === Number(old.q); });
            if (neu) return neu.id;
        }
        /* sin pista de cantidad: no adivinar Q1; dejar el id (la fila avisará si no hay precio) */
        return loteId;
    };
    const nuevoLote = resolver(fila.lote);
    if (nuevoLote && pr.escalas.some(function (e) { return e.id === nuevoLote; })) fila.lote = nuevoLote;
    else if (!pr.escalas.some(function (e) { return e.id === fila.lote; })) fila.lote = pr.escalas[0].id;
    if (fila.opc) {
        Object.keys(fila.opc).forEach(function (escId) {
            const r = resolver(fila.opc[escId]);
            if (r && pr.escalas.some(function (e) { return e.id === r; })) fila.opc[escId] = r;
        });
    }
}

/**
 * Reescribe ficha/precios de una fila desde Costos sin romper escenarios (opc/excl)
 * ni la identidad de pieza en un grupal. Devuelve true si hubo precios.
 * opts.ver: fuerza esa versión (p. ej. al elegir V1 en la ficha). Sin opts, alinea a la versión abierta en Costos.
 */
function logisticaRefrescarFilaDesdeCostos_(fila, opts) {
    if (!fila || fila.tipo !== "item") return false;
    opts = opts || {};
    const p = logisticaLeerProyecto_();
    if (opts.ver) {
        fila.ver = opts.ver;
    } else if (p.hayProyecto && logNormCod_(p.codigo) === logNormCod_(fila.proy) && window.versionActivaId) {
        /* Botón refrescar / actualizar desde Costos: trae la versión que se está trabajando. */
        fila.ver = window.versionActivaId;
    } else if (fila.ver && window.versionActivaId && !logVersiones_().some(function (x) { return logVerIgual_(x.id, fila.ver); })) {
        fila.ver = window.versionActivaId;
    }
    try { if (typeof snapshotVersionActual === "function") snapshotVersionActual(); } catch (eSnap) { /* memoria */ }
    const ver = logVersiones_().find(function (x) { return logVerIgual_(x.id, fila.ver); });
    const escalasPrev = logEscalasPrevFila_(fila);
    const elemId = logResolverElemFila_(fila);
    if (elemId) fila.elem = elemId;
    /* grupal multi-pieza sin elem resuelto: no aplicar el precio de la pieza activa a todas */
    if (logVersionEsGrupalMulti_(ver) && !fila.elem) return false;
    const pr = logPreciosVersion_(fila.ver, fila.elem || "");
    if (!pr || !pr.escalas || !pr.escalas.length) return false;
    logRemapLotesFila_(fila, pr, escalasPrev);
    const esc = pr.escalas.find(function (e) { return e.id === fila.lote; }) || pr.escalas[0];
    const origen = typeof logComisionDesdeCostos_ === "function" ? logComisionDesdeCostos_() : { pct: 0, fee: 0 };
    const ficha = logFichaVersion_(fila.ver, fila.elem || "") || {};
    let nombre = "";
    if (fila.elem && ver && ver.elementos) {
        const elObj = ver.elementos.find(function (e) { return String(e.id) === String(fila.elem); });
        nombre = (elObj && elObj.nombre) || "";
    }
    if (!nombre) nombre = logNombreSinCodigo_(p.nombre, String(fila.proy || "").trim() || p.codigo);
    fila.snap = {
        ficha: JSON.parse(JSON.stringify(ficha)),
        q: esc ? esc.q : null,
        puCop: esc ? esc.puCop : null,
        escalas: pr.escalas.map(function (e) { return { id: e.id, q: e.q, puCop: e.puCop }; }),
        trm: logTrm_() || pr.trm || null,
        nombre: nombre,
        pctCom: origen.pct,
        feeCom: origen.fee
    };
    /* Partida: preferir la de la ficha viva de Costos; si no, conservar la de la cotización. */
    const partFicha = logPartidaFmt_((ficha && ficha.partida) || "");
    if (partFicha) {
        fila.partida = partFicha;
        fila.snap.ficha.partida = partFicha;
    } else if (typeof fila.partida === "string" && fila.partida) {
        fila.snap.ficha.partida = logPartidaFmt_(fila.partida);
    }
    /* solo suelta precios/cantidades escritos a mano; conserva textos y opc/excl */
    if (fila.over) {
        Object.keys(fila.over).forEach(function (k) {
            if (k === "unit" || k.indexOf("unit:") === 0 || k === "qty" || k.indexOf("qty:") === 0) delete fila.over[k];
        });
    }
    delete fila.puFijo;
    return true;
}

/**
 * Actualiza filas de esta cotización con ficha y precios vivos del presupuesto
 * abierto en Costos (mismo código de proyecto). Sirve sobre todo cuando la hoja
 * vino del historial (precios congelados) y en Costos ya se recalcularon márgenes.
 * No reescribe opc/excl ni convierte todas las piezas en la activa.
 * En CONS solo actualiza las filas del proyecto abierto en Costos.
 */
function logisticaActualizarPresupuestoDesdeCostos_() {
    try { if (typeof snapshotVersionActual === "function") snapshotVersionActual(); } catch (e) { /* se usa lo que haya en memoria */ }
    const p = logisticaLeerProyecto_();
    if (!p.hayProyecto) {
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("Abre en Costos el presupuesto del que quieres traer los precios.", "warning");
        }
        return;
    }
    const cod = logNormCod_(p.codigo);
    const todas = ((logQuote && logQuote.filas) || []).filter(function (f) { return f.tipo === "item"; });
    const filas = todas.filter(function (f) { return logNormCod_(f.proy) === cod; });
    const otras = todas.length - filas.length;
    if (!filas.length) {
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("Ninguna fila de esta cotización es del proyecto " + p.codigo + " abierto en Costos.", "warning");
        }
        return;
    }
    let ok = 0;
    let sinPrecio = 0;
    filas.forEach(function (fila) {
        if (logisticaRefrescarFilaDesdeCostos_(fila)) ok++;
        else sinPrecio++;
    });
    const trm = logTrmDesdeCostos_();
    if (trm > 0) {
        logQuote.trm = trm;
        const inpTrm = document.getElementById("logTRM");
        if (inpTrm) inpTrm.value = trm;
        filas.forEach(function (fila) {
            if (fila.snap) fila.snap.trm = trm;
        });
    }
    /* Precios vivos traen la comisión de Costos: alinear el % de la cotización. */
    logComisionSincronizarDesdeCostos_({ forzar: true });
    logMarcarSucio_();
    logisticaRefrescarTabla_();
    if (typeof mostrarNotificacion !== "function") return;
    const extraOtras = otras ? (" " + otras + " de otro proyecto no se tocaron.") : "";
    if (ok && !sinPrecio) {
        mostrarNotificacion("Presupuesto actualizado con los precios de Costos (" + p.codigo + ")." + extraOtras, "success");
    } else if (ok) {
        mostrarNotificacion("Se actualizaron " + ok + " fila(s). " + sinPrecio + " sin poder cruzar pieza/precios en Costos." + extraOtras, "warning");
    } else {
        mostrarNotificacion("No se pudo actualizar: genera la matriz en Costos o revisa que cada pieza de la cotización exista en el grupal." + extraOtras, "warning");
    }
}

/** Pide a Odoo el contacto y el comercial del proyecto de la cotización. force=true ignora lo ya cargado. */
async function logisticaCargarOdoo_(force) {
    const codigo = logCodigoProyectoCotizacion_();
    if (!codigo) { logisticaPintarEstado_(); return; }
    if (!force && logOdoo.codigo === codigo && (logOdoo.estado === "ok" || logOdoo.estado === "cargando")) {
        logisticaPintarEstado_();
        return;
    }
    logOdoo = { codigo: codigo, data: null, estado: "cargando", mensaje: "" };
    logisticaPintarEstado_();
    try {
        if (typeof realizarPeticionBD !== "function") throw new Error("Servicio no disponible.");
        const resp = await realizarPeticionBD({ action: "odoo_cotizacion_datos", codigo: codigo });
        if (!resp || !resp.exito) throw new Error((resp && resp.mensaje) || "Sin respuesta.");
        if (logCodigoProyectoCotizacion_() !== codigo) return;
        logOdoo = { codigo: codigo, data: resp.data || {}, estado: "ok", mensaje: "" };
    } catch (e) {
        if (logCodigoProyectoCotizacion_() !== codigo) return;
        const m = String((e && e.message) || e);
        logOdoo = {
            codigo: codigo,
            data: null,
            estado: "error",
            mensaje: /Acción no válida/i.test(m) ? "falta pegar el backend.gs actualizado en Apps Script." : m
        };
    }
    logisticaPintarEstado_();
    logisticaActualizarVista();
}

/** Al abrir la pestaña: adopta el idioma del proyecto, repinta y trae datos de Odoo si faltan. */
function logisticaSincronizarProyecto() {
    try { if (typeof snapshotVersionActual === "function") snapshotVersionActual(); } catch (e) { /* se usan las versiones tal como están */ }
    const p = logisticaLeerProyecto_();
    if (logCotizacionSigueAlProyectoAbierto_() && (p.codigo || "") !== logCab.codigo) {
        logCab.codigo = p.codigo || "";
        logCab.over = {};
        logCab.idiomaPara = "";
        logCab.idiomaManual = false;
        logCab.sistemaManual = false;
    }
    const sel = document.getElementById("logIdioma");
    const selS = document.getElementById("logSistema");
    if (sel && p.hayProyecto && logCotizacionSigueAlProyectoAbierto_() && !logCab.idiomaManual) {
        sel.value = p.idioma;
        logCab.idiomaPara = p.codigo;
    }
    if (selS && p.hayProyecto && logCotizacionSigueAlProyectoAbierto_() && !logCab.sistemaManual) {
        let sis = "metrico";
        try { sis = localeProyectoActual().sistema === "imperial" ? "imperial" : "metrico"; } catch (e) { /* cm */ }
        selS.value = sis;
    }
    logComisionSincronizarDesdeCostos_();
    logisticaActualizarVista();
    logisticaCargarOdoo_(false);
    logisticaCargarImagenOdoo_(false);
    logisticaAvisoProyectoCostos_();
}

/* ------------------------------------------------------------------ */
/* Filas reales de la cotización (Paso 3)                              */
/* ------------------------------------------------------------------ */

/**
 * logQuote.filas: cada fila es
 *   { uid, tipo: "item" | "libre" | "seccion" | "obs" | "envio", proy, ver, lote, over: {...}, img }
 *  - item: viene de una versión del proyecto (ficha comercial + precio de una escala).
 *  - libre / seccion / obs: se escriben a mano sobre la hoja (obs = párrafo de observaciones).
 *  - envio: flete u otro cargo de despacho (valor a mano). En el PDF van al bloque LOGÍSTICA.
 *  - over: lo que el usuario cambió directo en la hoja (gana sobre lo automático).
 *  - img: imagen subida a mano (miniatura reducida). Si no hay, se usa la de Odoo.
 *  - env: Incoterm + destino (Paso 1 Etapa 2). El cubicaje se calcula; el flete no.
 * Todo vive en memoria hasta el Paso 7 (historial en la hoja Cotizaciones).
 */
let logQuote = { codigo: "", inicializado: false, moneda: "COP", totales: true, uid: 0, filas: [], abierta: null, sucio: false, modo: "unica", escenarios: [], escUid: 0, texto: { titulo: true, desc: "full", medidas: true }, env: { incoterm: "EXW", incotermOtro: "", destinoCiudad: "", destinoPais: "", destinoPuerto: "" } };

function logTextoDef_() { return { titulo: true, desc: "full", medidas: true }; }

function logTexto_() {
    const t = logQuote.texto || {};
    return {
        titulo: t.titulo !== false,
        desc: t.desc === "lite" || t.desc === "off" ? t.desc : "full",
        medidas: t.medidas !== false
    };
}

/** Primera frase, o ~140 caracteres si no hay punto cercano. */
function logDescLite_(txt) {
    const s = String(txt || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    const m = s.match(/^(.{40,220}?[.!?])(\s|$)/);
    if (m) return m[1];
    if (s.length <= 140) return s;
    return s.slice(0, 137).replace(/\s+\S*$/, "") + "…";
}

/** Imagen del proyecto traída de Odoo (ya reducida a miniatura). */
let logImgOdoo = { codigo: "", estado: "idle", url: "", campo: "", mensaje: "" };
let logImgUidPend = "";
/** La hoja es un iframe que se recarga: mientras carga no se puede tocar su tabla. */
let logFrameListo = false;
let logRefrescoPend = false;
/** Resultado que se pone en la hoja (lado mayor) y original que se conserva para poder volver a editar. */
const LOG_IMG_MAX_PX = 1000;
const LOG_IMG_SRC_PX = 1600;

function logNuevoUid_() {
    logQuote.uid += 1;
    return "f" + logQuote.uid;
}

function logVersiones_() {
    return Array.isArray(window.versionesPresupuesto) ? window.versionesPresupuesto : [];
}

function logFilaPorUid_(uid) {
    return logQuote.filas.find(function (f) { return f.uid === uid; }) || null;
}

function logMonedaPorDefecto_() {
    try { return mercadoEsExportacion() ? "USD" : "COP"; } catch (e) { return "COP"; }
}

function logTrmDesdeCostos_() {
    const sim = parseFloat((document.getElementById("simTRM") || {}).value);
    if (sim > 0) return sim;
    if (typeof trmActualGlobal === "number" && trmActualGlobal > 0) return trmActualGlobal;
    return 0;
}

function logTrm_() {
    const n = Number(logQuote && logQuote.trm);
    if (n > 0) return n;
    return logTrmDesdeCostos_() || 1;
}

/** El costo logístico nacional se escribe en COP. Si la hoja está en USD, se pasa con el TRM de esta cotización. */
function logMonedaDesdeCop_(n) {
    const x = Number(n);
    if (!isFinite(x)) return n;
    if (!logQuote || logQuote.moneda !== "USD") return x;
    return x / (logTrm_() || 1);
}

function logImgRefElemento_(elemId, verId) {
    if (!elemId) return "";
    if (typeof window.imgRefCotizacionElemento === "function") {
        const r = window.imgRefCotizacionElemento(elemId, verId);
        if (r) return r;
    }
    const vers = logVersiones_();
    const ver = verId ? vers.find(function (v) { return String(v.id) === String(verId); }) : null;
    const lista = ver ? [ver] : vers;
    for (let i = 0; i < lista.length; i++) {
        const els = (lista[i] && lista[i].elementos) || [];
        const el = els.find(function (e) { return String(e.id) === String(elemId); });
        if (el && el.imgRef) return el.imgRef;
    }
    return "";
}

/**
 * Pieza viva en Costos si el código abierto coincide (para leer el pin «En cotización»).
 * La imagen Grupo/Odoo del proyecto NO es pin de pieza.
 */
function logElementoVivoCostos_(proy, elemId, nombreHint) {
    const p = typeof logisticaLeerProyecto_ === "function" ? logisticaLeerProyecto_() : null;
    if (!p || !p.hayProyecto || !proy || logNormCod_(p.codigo) !== logNormCod_(proy)) return null;
    const vers = window.versionesPresupuesto || [];
    const nom = String(nombreHint || "").trim().toLowerCase();
    let porNombre = null;
    for (let i = 0; i < vers.length; i++) {
        const els = (vers[i] && vers[i].elementos) || [];
        if (elemId) {
            const hit = els.find(function (e) { return e && String(e.id) === String(elemId); });
            if (hit) return hit;
        }
        if (nom && !porNombre) {
            porNombre = els.find(function (e) {
                if (!e) return false;
                const n = String(e.nombre || "").trim().toLowerCase();
                const t = String((e.fichaComercial && e.fichaComercial.titulo) || "").trim().toLowerCase();
                return n === nom || t === nom || (n && nom.indexOf(n) >= 0) || (t && nom.indexOf(t) >= 0);
            }) || null;
        }
    }
    return porNombre;
}

/** Pin de cotización de un elemento: data URL y/o imgRef de Drive. Null si solo hay Grupo/Odoo. */
function logPinImgDeElemento_(el) {
    if (!el) return null;
    const out = {};
    if (el.imgCotizacion && /^data:image\//.test(el.imgCotizacion)) out.img = el.imgCotizacion;
    if (el.imgRef) out.imgRef = el.imgRef;
    return (out.img || out.imgRef) ? out : null;
}

/** Pin de cotización de un individual abierto en Costos (vive en la versión, no en elementos). */
function logPinImgIndividualAbierto_(proy, verId) {
    const abierto = typeof logisticaLeerProyecto_ === "function" ? logisticaLeerProyecto_() : null;
    const cod = String((abierto && abierto.codigo) || "").trim();
    if (!cod || String(proy || "").trim() !== cod) return null;
    const vers = window.versionesPresupuesto || [];
    const ver = verId
        ? vers.find(function (v) { return String(v.id) === String(verId); })
        : (vers.find(function (v) { return String(v.id) === String(window.versionActivaId || ""); }) || vers[0]);
    if (!ver || (ver.elementos && ver.elementos.length)) return null;
    return logPinImgDeElemento_(ver);
}

function logNombrePreImg_(fila) {
    const codigo = String((fila && fila.proy) || (logisticaLeerProyecto_() || {}).codigo || "").trim();
    if (!codigo || !fila || !fila.elem) return "";
    const k = String(fila.ver || "V1") + ":" + String(fila.elem);
    return "PRE-img_" + codigo.replace(/[^\w\-]/g, "_") + "_" + k.replace(/[^\w]/g, "_") + ".jpg";
}

function logAsegurarImgRefFila_(fila) {
    if (!fila || fila.imgRef || logEsTextoFila_(fila) || fila.tipo === "envio") return fila && fila.imgRef || "";
    if (logImgEditada_(fila)) return "";
    if (fila.elem) {
        const ref = logImgRefElemento_(fila.elem, fila.ver);
        if (ref) fila.imgRef = ref;
    } else if (fila.tipo === "item") {
        const pin = logPinImgIndividualAbierto_(fila.proy, fila.ver);
        if (pin && pin.imgRef) fila.imgRef = pin.imgRef;
    }
    return fila.imgRef || "";
}

function logEstamparImgRefElemento_(elemId, verId, ref) {
    if (!elemId || !ref) return;
    const vers = typeof logVersiones_ === "function" ? logVersiones_() : (window.versionesPresupuesto || []);
    const ver = verId ? vers.find(function (v) { return String(v.id) === String(verId); }) : null;
    const lista = ver ? [ver] : vers;
    for (let i = 0; i < lista.length; i++) {
        const els = (lista[i] && lista[i].elementos) || [];
        const el = els.find(function (e) { return String(e.id) === String(elemId); });
        if (!el) continue;
        el.imgRef = ref;
        if (typeof programarGuardarSesion === "function") programarGuardarSesion();
        return;
    }
}

function logMercadoElegido_() {
    const m = logQuote && logQuote.env && logQuote.env.mercado;
    if (m === "EXPORTACION" || m === "NACIONAL") return m;
    const lineas = (logQuote && logQuote.env && logQuote.env.lineas) || [];
    if (lineas.some(function (ln) { return /^nal_/.test(ln.tipo); })) return "NACIONAL";
    if (lineas.some(function (ln) { return /^(origen|flete_interno|flete_principal|seguro|destino|duties|taxes|courier)$/.test(ln.tipo); })) return "EXPORTACION";
    try {
        if (typeof mercadoEsExportacion === "function" && mercadoEsExportacion()) return "EXPORTACION";
    } catch (e) {}
    const tipo = (logQuote && (logQuote.tipo || logQuote.tipoPresupuesto)) || "";
    return /EXPORT/i.test(String(tipo)) ? "EXPORTACION" : "NACIONAL";
}

function logEsCotizacionExterior_() {
    return logMercadoElegido_() === "EXPORTACION";
}

function logEtiquetaGranTotal_(T, mon, esEn) {
    return logEnvTitulo_("gran", T, mon, esEn);
}

const LOG_MODALIDADES_ = ["courier", "aerea", "fcl", "lcl", "terrestre"];
const LOG_INCOTERM_MATRIZ_ = {
    /* EXW (Ex Works): sin costos logísticos del vendedor. */
    EXW: { o: 0, i: 0, p: 0, s: 0, d: 0, du: 0, tx: 0, sea: 0 },
    FCA: { o: 1, i: 1, p: 0, s: 0, d: 0, du: 0, tx: 0, sea: 0 },
    FAS: { o: 1, i: 1, p: 0, s: 0, d: 0, du: 0, tx: 0, sea: 1 },
    FOB: { o: 1, i: 1, p: 0, s: 0, d: 0, du: 0, tx: 0, sea: 1 },
    CFR: { o: 1, i: 1, p: 1, s: 0, d: 0, du: 0, tx: 0, sea: 1 },
    CIF: { o: 1, i: 1, p: 1, s: 1, d: 0, du: 0, tx: 0, sea: 1 },
    CPT: { o: 1, i: 1, p: 1, s: 0, d: 0, du: 0, tx: 0, sea: 0 },
    CIP: { o: 1, i: 1, p: 1, s: 1, d: 0, du: 0, tx: 0, sea: 0 },
    DAP: { o: 1, i: 1, p: 1, s: 0, d: 1, du: 0, tx: 0, sea: 0 },
    DPU: { o: 1, i: 1, p: 1, s: 0, d: 1, du: 0, tx: 0, sea: 0 },
    DDP: { o: 1, i: 1, p: 1, s: 1, d: 1, du: 1, tx: 1, sea: 0 }
};
const LOG_PAISES_ = [
    ["Colombia", "CO"], ["Estados Unidos", "US"], ["United States", "US"], ["USA", "US"],
    ["Puerto Rico", "PR"], ["México", "MX"], ["Mexico", "MX"], ["Ecuador", "EC"],
    ["Venezuela", "VE"], ["Perú", "PE"], ["Peru", "PE"], ["Chile", "CL"],
    ["España", "ES"], ["Spain", "ES"], ["Panamá", "PA"], ["Panama", "PA"],
    ["Costa Rica", "CR"], ["Guatemala", "GT"], ["República Dominicana", "DO"], ["Dominican Republic", "DO"],
    ["Trinidad y Tobago", "TT"], ["Trinidad and Tobago", "TT"]
];
/** Nombre en inglés → ISO, solo donde el inglés no coincide con el español ya
 * normalizado (sin tildes). Odoo, una cotización vieja o una tarifa escrita a
 * mano pueden traer el país en inglés; sin esto, Alemania/Francia/Brasil y
 * otros no resolvían código y las tarifas, ciudades y aranceles no casaban. */
const LOG_PAISES_EN_ = {
    "united states": "US", "united states of america": "US", "america": "US",
    "united kingdom": "GB", "great britain": "GB",
    "spain": "ES", "germany": "DE", "france": "FR", "italy": "IT",
    "portuguese republic": "PT", "netherlands": "NL", "holland": "NL", "the netherlands": "NL",
    "belgium": "BE", "switzerland": "CH", "luxembourg": "LU",
    "ireland": "IE", "iceland": "IS", "denmark": "DK", "norway": "NO",
    "sweden": "SE", "finland": "FI", "greece": "GR", "poland": "PL",
    "czechia": "CZ", "czech republic": "CZ", "slovakia": "SK", "slovenia": "SI",
    "croatia": "HR", "hungary": "HU", "romania": "RO", "bulgaria": "BG",
    "lithuania": "LT", "latvia": "LV", "estonia": "EE", "belarus": "BY",
    "ukraine": "UA", "russia": "RU", "russian federation": "RU",
    "turkey": "TR", "turkiye": "TR", "cyprus": "CY",
    "brazil": "BR", "belize": "BZ", "grenada": "GD",
    "antigua and barbuda": "AG", "saint lucia": "LC", "st lucia": "LC",
    "saint vincent and the grenadines": "VC", "french guiana": "GF",
    "martinique": "MQ", "curacao": "CW",
    "japan": "JP", "south korea": "KR", "korea": "KR", "north korea": "KP",
    "taiwan": "TW", "thailand": "TH", "singapore": "SG", "malaysia": "MY",
    "philippines": "PH", "cambodia": "KH", "myanmar": "MM", "burma": "MM",
    "bangladesh": "BD", "pakistan": "PK", "saudi arabia": "SA",
    "united arab emirates": "AE", "uae": "AE", "qatar": "QA", "oman": "OM",
    "jordan": "JO", "lebanon": "LB", "iraq": "IQ",
    "kazakhstan": "KZ", "uzbekistan": "UZ", "kyrgyzstan": "KG",
    "tajikistan": "TJ", "turkmenistan": "TM",
    "morocco": "MA", "algeria": "DZ", "tunisia": "TN", "libya": "LY",
    "egypt": "EG", "south africa": "ZA", "kenya": "KE", "ethiopia": "ET",
    "ivory coast": "CI", "cote d ivoire": "CI", "cape verde": "CV",
    "mauritius": "MU", "mozambique": "MZ",
    "new zealand": "NZ", "fiji": "FJ", "papua new guinea": "PG"
};
/** Catálogo completo (nombre en español y código ISO). Odoo lo reemplaza cuando el backend ya tiene odoo_paises. */
const LOG_PAISES_ISO_ = "AF:Afganistán|AL:Albania|DE:Alemania|AD:Andorra|AO:Angola|AI:Anguila|AG:Antigua y Barbuda|SA:Arabia Saudí|DZ:Argelia|AR:Argentina|AM:Armenia|AW:Aruba|AU:Australia|AT:Austria|AZ:Azerbaiyán|BS:Bahamas|BD:Bangladés|BB:Barbados|BH:Baréin|BE:Bélgica|BZ:Belice|BJ:Benín|BM:Bermudas|BY:Bielorrusia|BO:Bolivia|BQ:Bonaire, San Eustaquio y Saba|BA:Bosnia y Herzegovina|BW:Botsuana|BR:Brasil|BN:Brunéi|BG:Bulgaria|BF:Burkina Faso|BI:Burundi|BT:Bután|CV:Cabo Verde|KH:Camboya|CM:Camerún|CA:Canadá|QA:Catar|TD:Chad|CZ:Chequia|CL:Chile|CN:China|CY:Chipre|VA:Ciudad del Vaticano|CO:Colombia|KM:Comoras|CG:Congo|KP:Corea del Norte|KR:Corea del Sur|CR:Costa Rica|CI:Costa de Marfil|HR:Croacia|CU:Cuba|CW:Curazao|DK:Dinamarca|DM:Dominica|EC:Ecuador|EG:Egipto|SV:El Salvador|AE:Emiratos Árabes Unidos|ER:Eritrea|SK:Eslovaquia|SI:Eslovenia|ES:España|US:Estados Unidos|EE:Estonia|SZ:Esuatini|ET:Etiopía|PH:Filipinas|FI:Finlandia|FJ:Fiyi|FR:Francia|GA:Gabón|GM:Gambia|GE:Georgia|GH:Ghana|GI:Gibraltar|GD:Granada|GR:Grecia|GL:Groenlandia|GP:Guadalupe|GU:Guam|GT:Guatemala|GF:Guayana Francesa|GG:Guernsey|GN:Guinea|GQ:Guinea Ecuatorial|GW:Guinea-Bisáu|GY:Guyana|HT:Haití|HN:Honduras|HK:Hong Kong|HU:Hungría|IN:India|ID:Indonesia|IQ:Irak|IR:Irán|IE:Irlanda|IS:Islandia|KY:Islas Caimán|CC:Islas Cocos|CK:Islas Cook|FO:Islas Feroe|FK:Islas Malvinas|MP:Islas Marianas del Norte|MH:Islas Marshall|PN:Islas Pitcairn|SB:Islas Salomón|TC:Islas Turcas y Caicos|VG:Islas Vírgenes Británicas|VI:Islas Vírgenes de los Estados Unidos|AX:Islas Åland|IL:Israel|IT:Italia|JM:Jamaica|JP:Japón|JE:Jersey|JO:Jordania|KZ:Kazajistán|KE:Kenia|KG:Kirguistán|KI:Kiribati|XK:Kosovo|KW:Kuwait|LA:Laos|LS:Lesoto|LV:Letonia|LB:Líbano|LR:Liberia|LY:Libia|LI:Liechtenstein|LT:Lituania|LU:Luxemburgo|MO:Macao|MK:Macedonia del Norte|MG:Madagascar|MY:Malasia|MW:Malaui|MV:Maldivas|ML:Malí|MT:Malta|MA:Marruecos|MQ:Martinica|MU:Mauricio|MR:Mauritania|YT:Mayotte|MX:México|FM:Micronesia|MD:Moldavia|MC:Mónaco|MN:Mongolia|ME:Montenegro|MS:Montserrat|MZ:Mozambique|MM:Myanmar|NA:Namibia|NR:Nauru|NP:Nepal|NI:Nicaragua|NE:Níger|NG:Nigeria|NU:Niue|NO:Noruega|NC:Nueva Caledonia|NZ:Nueva Zelanda|OM:Omán|NL:Países Bajos|PK:Pakistán|PW:Palaos|PS:Palestina|PA:Panamá|PG:Papúa Nueva Guinea|PY:Paraguay|PE:Perú|PF:Polinesia Francesa|PL:Polonia|PT:Portugal|PR:Puerto Rico|GB:Reino Unido|CF:República Centroafricana|CD:República Democrática del Congo|DO:República Dominicana|RE:Reunión|RW:Ruanda|RO:Rumanía|RU:Rusia|EH:Sáhara Occidental|WS:Samoa|AS:Samoa Americana|BL:San Bartolomé|KN:San Cristóbal y Nieves|SM:San Marino|MF:San Martín|SX:Sint Maarten|PM:San Pedro y Miquelón|VC:San Vicente y las Granadinas|SH:Santa Elena|LC:Santa Lucía|ST:Santo Tomé y Príncipe|SN:Senegal|RS:Serbia|SC:Seychelles|SL:Sierra Leona|SG:Singapur|SY:Siria|SO:Somalia|LK:Sri Lanka|ZA:Sudáfrica|SD:Sudán|SS:Sudán del Sur|SE:Suecia|CH:Suiza|SR:Surinam|SJ:Svalbard y Jan Mayen|TH:Tailandia|TW:Taiwán|TZ:Tanzania|TJ:Tayikistán|IO:Territorio Británico del Océano Índico|TL:Timor Oriental|TG:Togo|TK:Tokelau|TO:Tonga|TT:Trinidad y Tobago|TN:Túnez|TM:Turkmenistán|TR:Turquía|TV:Tuvalu|UA:Ucrania|UG:Uganda|UY:Uruguay|UZ:Uzbekistán|VU:Vanuatu|VE:Venezuela|VN:Vietnam|WF:Wallis y Futuna|YE:Yemen|DJ:Yibuti|ZM:Zambia|ZW:Zimbabue";

function logEnvDef_() {
    return {
        modalidad: "aerea", incoterm: "EXW",
        destinoCiudad: "", destinoPais: "", destinoCodigo: "", destinoPuerto: "",
        destinoTitulo: "",
        contenedores: { c20: 0, c40: 0, c40hc: 0 },
        contenedoresManual: false, embarques: 1,
        activo: true, modoCosto: "detalle", resumenPct: 100, mercado: "",
        margenPct: logMargenEmpresa_(),
        margenNal: { envio: 30, montaje: 30, bodega: 30, otro: 30 },
        titSubProd: "", titSubLog: "", titGran: "",
        cubM3: null, cubPeso: null, cubKgVol: null,
        lineas: [],
        porEsc: {}
    };
}

/** Estado logístico de una opción (escenario). Sin porEsc (cotizaciones viejas) vale el global para todas. */
function logEnvEscNorm_(src, base) {
    const s = src && typeof src === "object" ? src : {};
    const b = base || {};
    const emb = parseInt(s.embarques != null ? s.embarques : b.embarques, 10);
    const modRaw = String(s.modalidad != null ? s.modalidad : (b.modalidad || "aerea"));
    const modalidad = LOG_MODALIDADES_.indexOf(modRaw) >= 0 ? modRaw : (b.modalidad || "aerea");
    let incoterm = String(s.incoterm != null ? s.incoterm : (b.incoterm || "EXW")).toUpperCase();
    if (!LOG_INCOTERM_MATRIZ_[incoterm]) incoterm = b.incoterm || "EXW";
    if (logEnvIncotermsDe_(modalidad).indexOf(incoterm) < 0) {
        const avail = logEnvIncotermsDe_(modalidad);
        /* Aérea/terrestre no admiten FAS/FOB/…: preferir CIP (común) antes que EXW vacío de filas. */
        incoterm = avail.indexOf("CIP") >= 0 ? "CIP" : (avail[0] || "EXW");
    }
    const modoRaw = s.modoCosto != null ? s.modoCosto : b.modoCosto;
    const pctRaw = s.resumenPct != null ? s.resumenPct : b.resumenPct;
    const pctN = Number(pctRaw);
    const out = {
        /* Incluir logística en esta opción (independiente del switch global). Defecto: sí. */
        activo: s.activo === false ? false : true,
        /* Detalle vs Una línea (y % visible) por opción. */
        modoCosto: modoRaw === "resumen" ? "resumen" : "detalle",
        resumenPct: isFinite(pctN) ? Math.min(100, Math.max(0, pctN)) : 100,
        /* Cada opción puede tener su modalidad / Incoterm / destino. */
        modalidad: modalidad,
        incoterm: incoterm,
        destinoCiudad: String(s.destinoCiudad != null ? s.destinoCiudad : (b.destinoCiudad || "")).trim(),
        destinoPais: logPaisEnEspanol_(String(s.destinoPais != null ? s.destinoPais : (b.destinoPais || "")).trim()),
        destinoCodigo: String(s.destinoCodigo != null ? s.destinoCodigo : (b.destinoCodigo || "")).trim().toUpperCase(),
        destinoPuerto: String(s.destinoPuerto != null ? s.destinoPuerto : (b.destinoPuerto || "")).trim(),
        destinoTitulo: String(s.destinoTitulo != null ? s.destinoTitulo : (b.destinoTitulo || "")).trim(),
        contenedores: logContenedoresNorm_(s.contenedores || b.contenedores),
        contenedoresManual: s.contenedoresManual != null ? !!s.contenedoresManual : !!b.contenedoresManual,
        embarques: isFinite(emb) && emb > 0 ? emb : 1,
        cubM3: logCubNum_(s.cubM3 != null ? s.cubM3 : b.cubM3),
        cubPeso: logCubNum_(s.cubPeso != null ? s.cubPeso : b.cubPeso),
        cubKgVol: logCubNum_(s.cubKgVol != null ? s.cubKgVol : b.cubKgVol),
        valores: {}, fuentes: {}, notas: {}, pcts: {}
    };
    if (!out.destinoCodigo && out.destinoPais) out.destinoCodigo = logEnvCodigoDePais_(out.destinoPais) || "";
    ["valores", "fuentes", "notas", "pcts"].forEach(function (k) {
        if (s[k] && typeof s[k] === "object") Object.keys(s[k]).forEach(function (id) { out[k][id] = s[k][id]; });
    });
    /* Simulador 3D por opción: capturas (data o ref Drive). El packing vive en datos.sim3d. */
    if (s.sim3d && typeof s.sim3d === "object") out.sim3d = s.sim3d;
    if (s.sim3dImg) out.sim3dImg = String(s.sim3dImg);
    if (s.sim3dImgRef) out.sim3dImgRef = String(s.sim3dImgRef);
    return out;
}

/** Vista efectiva de envío para una opción (o el global si no hay escId). */
function logEnvVistaEsc_(escId) {
    const e = logEnv_();
    if (!escId) {
        return {
            modalidad: e.modalidad,
            incoterm: e.incoterm,
            destinoCiudad: e.destinoCiudad,
            destinoPais: e.destinoPais,
            destinoCodigo: e.destinoCodigo,
            destinoPuerto: e.destinoPuerto,
            destinoTitulo: e.destinoTitulo || ""
        };
    }
    const st = logEnvEscDe_(e, escId) || logEnvEscSemilla_(e);
    return {
        modalidad: st.modalidad || e.modalidad,
        incoterm: st.incoterm || e.incoterm,
        destinoCiudad: st.destinoCiudad || e.destinoCiudad,
        destinoPais: st.destinoPais || e.destinoPais,
        destinoCodigo: st.destinoCodigo || e.destinoCodigo,
        destinoPuerto: st.destinoPuerto || e.destinoPuerto,
        destinoTitulo: st.destinoTitulo != null && String(st.destinoTitulo).trim()
            ? String(st.destinoTitulo).trim()
            : (e.destinoTitulo || "")
    };
}

function logEnvModalidad_(escId) {
    return logEnvVistaEsc_(escId).modalidad;
}

function logEnvIncoterm_(escId) {
    return logEnvVistaEsc_(escId).incoterm;
}
function logEnvEscSemilla_(e) {
    const out = logEnvEscNorm_(null, e || {});
    ((e && e.lineas) || []).forEach(function (ln) {
        if (ln.valor != null && isFinite(Number(ln.valor))) out.valores[ln.id] = Number(ln.valor);
        if (ln.fuente) out.fuentes[ln.id] = ln.fuente;
        if (ln.notas) out.notas[ln.id] = ln.notas;
        if (ln.pct != null && isFinite(Number(ln.pct))) out.pcts[ln.id] = Number(ln.pct);
    });
    return out;
}
/** Estado por opción: el guardado, o una semilla desde el global si esta cotización aún no lo trae. */
function logEnvEscDe_(e, escId) {
    if (!e || !escId) return null;
    if (e.porEsc && e.porEsc[escId]) return logEnvEscNorm_(e.porEsc[escId], e);
    return logEnvEscSemilla_(e);
}
/** Igual, pero asegura y devuelve el objeto guardado en env.porEsc para poder escribirlo. */
function logEnvEsc_(escId) {
    const e = logEnv_();
    if (!escId) return null;
    if (!e.porEsc || typeof e.porEsc !== "object") e.porEsc = {};
    if (!e.porEsc[escId]) e.porEsc[escId] = logEnvEscSemilla_(e);
    else {
        /* Normalizar sin pisar modalidad propia con el global de la pestaña activa. */
        const raw = e.porEsc[escId];
        const base = Object.assign({}, e, {
            modalidad: raw.modalidad != null ? raw.modalidad : e.modalidad,
            incoterm: raw.incoterm != null ? raw.incoterm : e.incoterm
        });
        e.porEsc[escId] = logEnvEscNorm_(raw, base);
    }
    return e.porEsc[escId];
}
function logEscKeyTipo_(tipo) {
    return tipo ? ("t:" + tipo) : "";
}
function logEscLeerMap_(mapa, ln, asNum) {
    if (!mapa || !ln) return asNum ? null : "";
    let v;
    if (Object.prototype.hasOwnProperty.call(mapa, ln.id)) v = mapa[ln.id];
    else if (ln.tipo && Object.prototype.hasOwnProperty.call(mapa, logEscKeyTipo_(ln.tipo))) v = mapa[logEscKeyTipo_(ln.tipo)];
    else return asNum ? null : "";
    if (asNum) return v != null && isFinite(Number(v)) ? Number(v) : null;
    return v != null ? String(v) : "";
}
function logEscValor_(ln, escId) {
    if (!ln) return null;
    if (!escId) return ln.valor != null && isFinite(Number(ln.valor)) ? Number(ln.valor) : null;
    const st = logEnvEscDe_(logEnv_(), escId);
    const v = st ? logEscLeerMap_(st.valores, ln, true) : null;
    if (v != null) return v;
    return ln.valor != null && isFinite(Number(ln.valor)) ? Number(ln.valor) : null;
}
function logEscPct_(ln, escId) {
    if (!ln) return null;
    if (escId) {
        const st = logEnvEscDe_(logEnv_(), escId);
        const v = st ? logEscLeerMap_(st.pcts, ln, true) : null;
        if (v != null) return v;
    }
    return ln.pct != null && isFinite(Number(ln.pct)) ? Number(ln.pct) : null;
}
function logEscFuente_(ln, escId) {
    if (!ln) return "";
    if (escId) {
        const st = logEnvEscDe_(logEnv_(), escId);
        const v = st ? logEscLeerMap_(st.fuentes, ln, false) : "";
        if (v) return v;
    }
    return ln.fuente || "";
}
function logEscNotas_(ln, escId) {
    if (!ln) return "";
    if (escId) {
        const st = logEnvEscDe_(logEnv_(), escId);
        if (st && st.notas) {
            if (Object.prototype.hasOwnProperty.call(st.notas, ln.id)) return String(st.notas[ln.id] || "");
            const kt = logEscKeyTipo_(ln.tipo);
            if (kt && Object.prototype.hasOwnProperty.call(st.notas, kt)) return String(st.notas[kt] || "");
        }
    }
    return ln.notas || "";
}
function logEscEscribirCosto_(st, ln, tipo, valor, fuente, notas) {
    const kt = logEscKeyTipo_(tipo);
    if (st) {
        if (kt) {
            if (valor != null) st.valores[kt] = valor; else delete st.valores[kt];
            if (fuente) st.fuentes[kt] = fuente; else delete st.fuentes[kt];
            st.notas[kt] = notas || "";
        }
        if (ln && ln.id) {
            if (valor != null) st.valores[ln.id] = valor; else delete st.valores[ln.id];
            if (fuente) st.fuentes[ln.id] = fuente; else delete st.fuentes[ln.id];
            st.notas[ln.id] = notas || "";
        }
    }
    if (ln) {
        ln.valor = valor;
        ln.fuente = fuente || "";
        ln.notas = notas || "";
    }
}

/** Env efectivo para liquidar tarifas de una opción (modalidad/destino propios). */
function logEnvParaTarifa_(escId) {
    const e = logEnv_();
    const vista = logEnvVistaEsc_(escId || "");
    return Object.assign({}, e, {
        modalidad: vista.modalidad,
        incoterm: vista.incoterm,
        destinoCiudad: vista.destinoCiudad,
        destinoPais: vista.destinoPais,
        destinoCodigo: vista.destinoCodigo,
        destinoPuerto: vista.destinoPuerto
    });
}

/** Catálogo vivo. null hasta que llega Odoo; mientras tanto se usa la lista corta. */
var logPaisesCat_ = null;
var logCiudadesOdoo_ = [];
var logCiudadesApp_ = [];
var logCiudadesOcultas_ = {};
/** Alias viejo→nombre canónico: clave `pais|nombreNorm` → nombre actual. Cotizaciones históricas siguen resolviendo. */
var logCiudadesAlias_ = {};
var logCiudadesAsegurando_ = {};
var logCiudadesHojaLista_ = {};
var logCiudadesPublicarPend_ = {};
var logCiudadesEstado_ = { clase: "is-info", texto: "Las ciudades quedan en la app, ligadas al país. Odoo solo completa un país la primera vez." };
var LOG_PAISES_LOCAL_ = "smartbudget_paises_odoo";
var LOG_CIUDADES_LOCAL_ = "smartbudget_ciudades_app";

var logPaisesBaseCache_ = null;
function logPaisesBase_() {
    if (logPaisesBaseCache_) return logPaisesBaseCache_;
    logPaisesBaseCache_ = String(LOG_PAISES_ISO_ || "").split("|").map(function (p) {
        const i = p.indexOf(":");
        return { codigo: p.slice(0, i).trim(), nombre: p.slice(i + 1).trim() };
    }).filter(function (x) { return x.codigo && x.nombre; });
    return logPaisesBaseCache_;
}

function logPaisesFuente_() {
    if (logPaisesCat_ && logPaisesCat_.length > 20) return logPaisesCat_;
    return logPaisesBase_();
}

/** Nombre normalizado → ISO, armado una vez. Recorrer el catálogo en cada
 * ciudad o tarifa congelaba la pestaña al abrir una cotización. */
var logPaisIndice_ = null;
var logPaisPorCodigo_ = null;
function logPaisIndiceOlvidar_() {
    logPaisIndice_ = null;
    logPaisPorCodigo_ = null;
}
function logPaisIndiceArmar_() {
    if (logPaisIndice_) return;
    const porNom = {};
    const porCod = {};
    LOG_PAISES_.forEach(function (x) {
        const n = logTarNorm_(x[0]);
        if (n && !porNom[n]) porNom[n] = x[1];
    });
    Object.keys(LOG_PAISES_EN_).forEach(function (k) { porNom[k] = LOG_PAISES_EN_[k]; });
    logPaisesFuente_().forEach(function (x) {
        const cod = String(x.codigo || "").trim().toUpperCase();
        const n = logTarNorm_(x.nombre);
        if (!cod) return;
        porCod[cod] = x.nombre;
        if (n) porNom[n] = cod;
        porNom[cod.toLowerCase()] = cod;
    });
    logPaisIndice_ = porNom;
    logPaisPorCodigo_ = porCod;
}

function logEnvCodigoDePais_(pais) {
    const p = logTarNorm_(pais);
    if (!p) return "";
    logPaisIndiceArmar_();
    return logPaisIndice_[p] || "";
}

/** Clave de país para diccionarios: el ISO si se resuelve (el idioma del
 * nombre deja de importar), si no el nombre normalizado. */
function logPaisClave_(pais) {
    return logTarCodigoPais_(pais) || logTarNorm_(pais);
}

function logPaisDeCodigo_(cod) {
    const c = String(cod || "").trim().toUpperCase();
    if (!c) return "";
    logPaisIndiceArmar_();
    return logPaisPorCodigo_[c] || "";
}

/** Cualquier grafía (EN/ES/ISO) → nombre en español del catálogo. Así la
 * cotización, el menú y la hoja hablan el mismo idioma. */
function logPaisEnEspanol_(pais) {
    const raw = String(pais || "").trim();
    if (!raw) return "";
    const cod = logEnvCodigoDePais_(raw);
    if (!cod) return raw;
    return logPaisDeCodigo_(cod) || raw;
}

function logPaisNombreEs_(codigo, nombre) {
    const cod = String(codigo || "").trim().toUpperCase();
    if (!cod) return String(nombre || "").trim();
    const es = logPaisesBase_().find(function (x) { return x.codigo === cod; });
    return (es && es.nombre) || String(nombre || "").trim();
}

function logPaisesEnEspanol_(lista) {
    const vistos = {};
    const out = [];
    (lista || []).forEach(function (x) {
        const codigo = String((x && x.codigo) || "").trim().toUpperCase();
        const nombre = logPaisNombreEs_(codigo, x && x.nombre);
        if (!codigo || !nombre || vistos[codigo]) return;
        vistos[codigo] = 1;
        out.push({ nombre: nombre, codigo: codigo });
    });
    return out;
}

function logPaisesAplicar_(lista) {
    const es = logPaisesEnEspanol_(lista);
    if (!es.length) return;
    logPaisesCat_ = es;
    logPaisIndiceOlvidar_();
    const e = logQuote && logQuote.env;
    if (e && e.destinoPais) {
        e.destinoPais = logPaisEnEspanol_(e.destinoPais);
        if (typeof logPintarSelectPais_ === "function") logPintarSelectPais_(e.destinoPais);
    }
    if (!e || !e.destinoPais || e.destinoCodigo) return;
    const cod = logEnvCodigoDePais_(e.destinoPais);
    if (!cod) return;
    e.destinoCodigo = cod;
    const el = document.getElementById("logDestCodigo");
    if (el && !String(el.value || "").trim()) el.value = cod;
}

function logPaisesLeerLocal_() {
    try {
        const o = JSON.parse(localStorage.getItem(LOG_PAISES_LOCAL_) || "null");
        if (o && Array.isArray(o.data) && o.data.length > 20) return o.data;
    } catch (e) {}
    return null;
}

async function logCargarPaises_() {
    const local = logPaisesLeerLocal_();
    if (local) logPaisesAplicar_(local);
    if (!localStorage.getItem("smartbudget_token")) return;
    if (!(typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.gasUrl)) return;
    try {
        const r = await realizarPeticionBD({ action: "odoo_paises" }, { timeoutMs: 25000 });
        if (!r || !r.exito || !Array.isArray(r.data) || r.data.length < 20) return;
        const lista = logPaisesEnEspanol_(r.data);
        if (lista.length < 20) return;
        logPaisesAplicar_(lista);
        try { localStorage.setItem(LOG_PAISES_LOCAL_, JSON.stringify({ t: Date.now(), data: lista })); } catch (e2) {}
    } catch (e) { /* sin el backend nuevo sigue la lista corta */ }
}

function logCiudadesEstadoPoner_(clase, texto) {
    logCiudadesEstado_ = { clase: clase || "is-info", texto: texto || "" };
    if (window.logTarTab === "ciudades" && typeof logCiudadesPintar_ === "function") logCiudadesPintar_();
    else if (typeof logCiudadesBotonGuardar_ === "function") logCiudadesBotonGuardar_();
}

function logCiudadesAppClave_(pais, nombre) {
    /* Por ISO: la misma ciudad bajo «Estados Unidos» y «United States»
       es una sola, no dos entradas en la lista local. */
    return logPaisClave_(pais) + "|" + logTarNorm_(nombre);
}

function logCiudadesAppLeer_() {
    try {
        const o = JSON.parse(localStorage.getItem(LOG_CIUDADES_LOCAL_) || "null");
        if (o && Array.isArray(o.data)) {
            logCiudadesApp_ = o.data.filter(function (x) { return x && x.nombre && x.pais; });
        }
        logCiudadesOcultas_ = (o && o.ocultas && typeof o.ocultas === "object") ? o.ocultas : {};
        if (o && o.alias && typeof o.alias === "object") logCiudadesAlias_ = o.alias;
    } catch (e) {}
    try {
        const t = typeof logTarAsegurar_ === "function" ? logTarAsegurar_() : window.logTarifas;
        if (t && t.ciudadesAlias && typeof t.ciudadesAlias === "object") {
            Object.keys(t.ciudadesAlias).forEach(function (k) {
                if (t.ciudadesAlias[k]) logCiudadesAlias_[k] = t.ciudadesAlias[k];
            });
        }
    } catch (e2) {}
    logLugaresManuales_().forEach(function (x) { logCiudadesAppMeter_(x, true); });
}

function logCiudadesAppGuardarLocal_() {
    try {
        localStorage.setItem(LOG_CIUDADES_LOCAL_, JSON.stringify({
            t: Date.now(),
            data: logCiudadesApp_,
            ocultas: logCiudadesOcultas_,
            alias: logCiudadesAlias_
        }));
    } catch (e) {}
    try {
        const t = typeof logTarAsegurar_ === "function" ? logTarAsegurar_() : window.logTarifas;
        if (t) t.ciudadesAlias = logCiudadesAlias_;
    } catch (e2) {}
}

/** Resuelve nombre histórico → nombre canónico actual (cadena de alias). */
function logCiudadAliasCanon_(pais, nombre) {
    let nom = String(nombre || "").trim();
    if (!nom) return "";
    let guard = 0;
    while (guard++ < 24) {
        const k = logCiudadesAppClave_(pais, nom);
        const next = logCiudadesAlias_[k];
        if (!next || logTarNorm_(next) === logTarNorm_(nom)) break;
        nom = String(next).trim();
    }
    return nom;
}

function logCiudadAliasRegistrar_(pais, nombreAntiguo, nombreNuevo) {
    const pa = String(pais || "").trim();
    const oldN = String(nombreAntiguo || "").trim();
    const newN = String(nombreNuevo || "").trim();
    if (!pa || !oldN || !newN) return;
    logCiudadesAlias_[logCiudadesAppClave_(pa, oldN)] = newN;
    const oldNorm = logTarNorm_(oldN);
    Object.keys(logCiudadesAlias_).forEach(function (k) {
        if (logTarNorm_(logCiudadesAlias_[k]) === oldNorm) logCiudadesAlias_[k] = newN;
    });
}

/**
 * Renombra ciudad/puerto sin romper tarifas ni cotización abierta.
 * Registra alias para que cotizaciones guardadas con el nombre viejo sigan resolviendo.
 */
function logCiudadRenombrar_(pais, nombreAntiguo, nombreNuevo, id) {
    const pa = String(pais || "").trim();
    const oldN = String(nombreAntiguo || "").trim();
    const newN = String(nombreNuevo || "").trim();
    if (!pa) return { ok: false, mensaje: "Elige el país." };
    if (!oldN) return { ok: false, mensaje: "Falta el nombre actual." };
    if (!newN) return { ok: false, mensaje: "Escribe el nombre nuevo." };
    if (logTarNorm_(oldN) === logTarNorm_(newN)) {
        if (oldN !== newN) {
            /* Solo cambio de mayúsculas/acentos: actualiza texto canónico. */
        } else {
            return { ok: true, mismo: true };
        }
    }
    const kOld = logCiudadesAppClave_(pa, oldN);
    const kNew = logCiudadesAppClave_(pa, newN);
    if (kOld !== kNew) {
        const choc = logCiudadesCatalogo_(pa).some(function (x) {
            return logCiudadesAppClave_(x.pais, x.nombre) === kNew;
        });
        if (choc) return { ok: false, mensaje: newN + " ya está en " + pa + "." };
    }

    function mismaFila_(c) {
        if (!c) return false;
        if (id && c.id && String(c.id) === String(id)) return true;
        return logCiudadesAppClave_(c.pais, c.nombre) === kOld;
    }

    let tocada = false;
    logCiudadesApp_.forEach(function (c) {
        if (!mismaFila_(c)) return;
        c.nombre = newN;
        c.pais = pa;
        tocada = true;
    });
    logLugaresManuales_().forEach(function (x) {
        if (!mismaFila_(x)) return;
        x.nombre = newN;
        x.pais = pa;
        tocada = true;
    });
    if (!tocada) {
        logCiudadesAppMeter_({
            id: id || ("lg" + Date.now().toString(36)),
            nombre: newN,
            pais: pa,
            uso: "ciudad"
        }, true);
    }

    if (logCiudadesOcultas_[kOld]) {
        logCiudadesOcultas_[kNew] = 1;
        delete logCiudadesOcultas_[kOld];
    }

    const t = typeof logTarAsegurar_ === "function" ? logTarAsegurar_() : window.logTarifas;
    if (t) {
        const matchPais_ = function (f) { return f && logTarMismoPais_(pa, f.pais); };
        const matchNom_ = function (val) { return logTarNorm_(val) === logTarNorm_(oldN); };
        (t.aereo || []).forEach(function (f) {
            if (matchPais_(f) && matchNom_(f.ciudad)) f.ciudad = newN;
        });
        (t.destino || []).forEach(function (f) {
            if (matchPais_(f) && matchNom_(f.ciudad)) f.ciudad = newN;
        });
        (t.fcl || []).forEach(function (f) {
            if (matchPais_(f) && matchNom_(f.puerto)) f.puerto = newN;
        });
        (t.lcl || []).forEach(function (f) {
            if (matchPais_(f) && matchNom_(f.puerto)) f.puerto = newN;
        });
    }

    if (typeof logQuote !== "undefined" && logQuote && logQuote.env) {
        const e = logQuote.env;
        const mismoPais = !e.destinoPais || logTarMismoPais_(pa, e.destinoPais);
        if (mismoPais) {
            if (logTarNorm_(e.destinoCiudad) === logTarNorm_(oldN)) e.destinoCiudad = newN;
            if (logTarNorm_(e.destinoPuerto) === logTarNorm_(oldN)) e.destinoPuerto = newN;
        }
    }
    ["logDestCiudad", "logDestPuerto"].forEach(function (eid) {
        const el = document.getElementById(eid);
        if (el && logTarNorm_(el.value) === logTarNorm_(oldN)) {
            if (el.tagName === "SELECT") {
                const opt = Array.prototype.find.call(el.options || [], function (o) {
                    return logTarNorm_(o.value) === logTarNorm_(oldN);
                });
                if (opt) opt.value = newN;
                if (opt) opt.textContent = newN;
            }
            el.value = newN;
        }
    });

    logCiudadAliasRegistrar_(pa, oldN, newN);
    logCiudadesAppGuardarLocal_();
    if (typeof logRefrescarCiudadesEnv_ === "function") logRefrescarCiudadesEnv_(false);
    if (typeof logCiudadesPublicarPais_ === "function") logCiudadesPublicarPais_(pa);
    const tab = window.logTarTab;
    if ((tab === "aereo" || tab === "destino" || tab === "fcl" || tab === "lcl") && typeof logTarPintar_ === "function") {
        if (typeof logTarFlush_ === "function") logTarFlush_();
        logTarPintar_();
    }
    return { ok: true };
}

function logCiudadesAppMeter_(x, silencio) {
    const nombre = String((x && x.nombre) || "").trim();
    const pais = String((x && x.pais) || "").trim();
    if (!nombre || !pais) return false;
    const k = logCiudadesAppClave_(pais, nombre);
    if (logCiudadesOcultas_[k]) return false;
    const ya = logCiudadesApp_.some(function (c) { return logCiudadesAppClave_(c.pais, c.nombre) === k; });
    if (ya) return false;
    const uso = x.uso === "puerto" || x.uso === "ambas" ? x.uso : "ciudad";
    logCiudadesApp_.push({ id: x.id || ("ci" + Date.now().toString(36) + logCiudadesApp_.length.toString(36)), nombre: nombre, pais: pais, uso: uso });
    if (!silencio) logCiudadesAppGuardarLocal_();
    return true;
}

function logCiudadesUsoNorm_(uso) {
    return uso === "puerto" || uso === "ambas" ? uso : "ciudad";
}

function logCiudadesAppDePais_(pais) {
    return logCiudadesApp_.filter(function (x) { return x && logTarMismoPais_(pais, x.pais); });
}

function logCiudadUsoCambiar_(pais, nombre, uso, id) {
    const nom = String(nombre || "").trim();
    const pa = String(pais || "").trim();
    if (!nom || !pa) return;
    const u = logCiudadesUsoNorm_(uso);
    const k = logCiudadesAppClave_(pa, nom);
    if (logCiudadesOcultas_[k]) delete logCiudadesOcultas_[k];
    let row = logCiudadesApp_.find(function (c) { return logCiudadesAppClave_(c.pais, c.nombre) === k; });
    if (!row) {
        row = { id: id || ("lg" + Date.now().toString(36)), nombre: nom, pais: pa, uso: u };
        logCiudadesApp_.push(row);
    } else {
        row.uso = u;
    }
    const manual = logLugaresManuales_().find(function (x) { return x && logCiudadesAppClave_(x.pais, x.nombre) === k; });
    if (manual) manual.uso = u;
    logCiudadesAppGuardarLocal_();
    if (typeof logRefrescarCiudadesEnv_ === "function") logRefrescarCiudadesEnv_(false);
    logCiudadesPublicarPais_(pa);
}

function logCiudadesOdooAplicar_(lista) {
    let n = 0;
    (lista || []).forEach(function (x) {
        if (logCiudadesAppMeter_({ nombre: x.nombre, pais: x.pais, uso: "ciudad" }, true)) n++;
    });
    if (n) logCiudadesAppGuardarLocal_();
    logCiudadesOdoo_ = logCiudadesApp_;
    if (typeof logRefrescarCiudadesEnv_ === "function") logRefrescarCiudadesEnv_(false);
    const tab = window.logTarTab;
    if ((tab === "aereo" || tab === "destino") && typeof logTarFlush_ === "function" && typeof logTarPintar_ === "function") {
        logTarFlush_();
        logTarPintar_();
    }
    if (tab === "ciudades" && typeof logCiudadesPintar_ === "function") logCiudadesPintar_();
}

function logLugaresManuales_() {
    const t = typeof logTarAsegurar_ === "function" ? logTarAsegurar_() : null;
    if (!t) return [];
    if (!Array.isArray(t.lugares)) t.lugares = [];
    return t.lugares;
}

function logCiudadesCatalogo_(pais) {
    const p = String(pais || "").trim();
    const map = {};
    const rank = { App: 4, Tarifa: 2 };
    function put(nombre, paisItem, uso, origen, id) {
        const nom = String(nombre || "").trim();
        const pa = String(paisItem || "").trim();
        if (!nom || !pa) return;
        if (p && !logTarMismoPais_(p, pa)) return;
        const k = logCiudadesAppClave_(pa, nom);
        if (logCiudadesOcultas_[k]) return;
        const item = { nombre: nom, pais: pa, uso: uso || "ciudad", origen: origen, id: id || "" };
        const prev = map[k];
        if (!prev || (rank[origen] || 0) > (rank[prev.origen] || 0)) map[k] = item;
        else if (prev.origen === origen && uso === "puerto" && prev.uso === "ciudad") prev.uso = "ambas";
        else if (prev.origen === origen && uso === "ciudad" && prev.uso === "puerto") prev.uso = "ambas";
    }
    (logCiudadesApp_ || []).forEach(function (x) { put(x.nombre, x.pais, x.uso || "ciudad", "App", x.id); });
    const t = window.logTarifas;
    if (t) {
        (t.aereo || []).forEach(function (f) { put(f && f.ciudad, f && f.pais, "ciudad", "Tarifa", ""); });
        (t.destino || []).forEach(function (f) { put(f && f.ciudad, f && f.pais, "ciudad", "Tarifa", ""); });
        (t.fcl || []).forEach(function (f) { put(f && f.puerto, f && f.pais, "puerto", "Tarifa", ""); });
        (t.lcl || []).forEach(function (f) { put(f && f.puerto, f && f.pais, "puerto", "Tarifa", ""); });
    }
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
        return a.nombre.localeCompare(b.nombre, "es");
    });
}

function logCiudadesParaPais_(pais) {
    return logCiudadesCatalogo_(pais).filter(function (x) { return x.uso !== "puerto"; }).map(function (x) { return x.nombre; });
}

function logLugarManualAgregar_(pais, nombre, uso) {
    const nom = String(nombre || "").trim();
    const pa = String(pais || "").trim();
    const u = uso === "puerto" || uso === "ambas" ? uso : "ciudad";
    if (!pa) return { ok: false, mensaje: "Elige el país." };
    if (!nom) return { ok: false, mensaje: "Escribe el nombre." };
    const k = logCiudadesAppClave_(pa, nom);
    if (logCiudadesOcultas_[k]) delete logCiudadesOcultas_[k];
    const ya = logCiudadesCatalogo_(pa).some(function (x) { return logTarNorm_(x.nombre) === logTarNorm_(nom); });
    if (ya) return { ok: false, mensaje: nom + " ya está en " + pa + "." };
    const row = { id: "lg" + Date.now().toString(36), nombre: nom, pais: pa, uso: u };
    logCiudadesAppMeter_(row, true);
    logCiudadesAppGuardarLocal_();
    logLugaresManuales_().push(row);
    if (typeof logRefrescarCiudadesEnv_ === "function") logRefrescarCiudadesEnv_(false);
    logCiudadesPublicarPais_(pa);
    return { ok: true };
}

function logLugarManualQuitar_(id) {
    const lista = logLugaresManuales_();
    const i = lista.findIndex(function (x) { return x && x.id === id; });
    if (i >= 0) lista.splice(i, 1);
    const j = logCiudadesApp_.findIndex(function (x) { return x && x.id === id; });
    if (j >= 0) {
        logCiudadesOcultas_[logCiudadesAppClave_(logCiudadesApp_[j].pais, logCiudadesApp_[j].nombre)] = 1;
        logCiudadesApp_.splice(j, 1);
        logCiudadesAppGuardarLocal_();
    }
    if (typeof logRefrescarCiudadesEnv_ === "function") logRefrescarCiudadesEnv_(false);
}

function logCiudadesTomar_(lista, pais, desdeHoja) {
    const filas = (lista || []).map(function (x) {
        return { nombre: String(x.nombre || "").trim(), pais: String(x.pais || pais || "").trim(), uso: logCiudadesUsoNorm_(x.uso), id: x.id || "" };
    }).filter(function (x) { return x.nombre && x.pais && (!pais || logTarMismoPais_(pais, x.pais)); });
    if (!filas.length) return 0;
    if (desdeHoja) {
        filas.forEach(function (x) {
            const k = logCiudadesAppClave_(x.pais, x.nombre);
            const row = logCiudadesApp_.find(function (c) { return logCiudadesAppClave_(c.pais, c.nombre) === k; });
            if (!row) logCiudadesAppMeter_(x, true);
            else if (!(row.uso && row.uso !== "ciudad" && x.uso === "ciudad")) row.uso = x.uso;
        });
        logCiudadesAppGuardarLocal_();
        logCiudadesOdoo_ = logCiudadesApp_;
    } else {
        logCiudadesOdooAplicar_(filas);
    }
    return logCiudadesAppDePais_(pais || filas[0].pais).length;
}

function logCiudadesCargandoPais_(pais) {
    const k = logPaisClave_(String(pais || "").trim());
    return !!(k && logCiudadesAsegurando_[k] === 1);
}

function logCiudadesHayCarga_() {
    return Object.keys(logCiudadesAsegurando_).some(function (k) { return logCiudadesAsegurando_[k] === 1; });
}

/** Guardar lo decide el conjunto de ajustes en la nube, no solo esta pestaña. */
function logCiudadesBotonGuardar_() {
    if (typeof ajustesNubeBotonGuardar_ === "function") ajustesNubeBotonGuardar_();
}

async function logCiudadesPublicarPais_(pais) {
    if (!pais || typeof realizarPeticionBD !== "function") return null;
    if (!localStorage.getItem("smartbudget_token")) return null;
    if (!(typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.gasUrl)) return null;
    const k = logPaisClave_(pais);
    /* Reemplazar el país en la hoja con una lista a medias borra las ciudades que todavía no llegaron. */
    if (!k || !logCiudadesHojaLista_[k]) {
        if (k) logCiudadesPublicarPend_[k] = pais;
        return null;
    }
    const filas = logCiudadesAppDePais_(pais).map(function (x) {
        return { id: x.id, nombre: x.nombre, pais: pais, uso: x.uso || "ciudad" };
    });
    if (!filas.length) return null;
    const email = localStorage.getItem("smartbudget_email") || "";
    try {
        return await realizarPeticionBD({ action: "ciudades_reemplazar", pais: pais, filas: filas, email: email }, { timeoutMs: 90000 });
    } catch (e) {
        return { exito: false, mensaje: (e && e.message) || "" };
    }
}

var logCiudadesEmpujando_ = false;
async function logCiudadesEmpujarLocal_() {
    if (logCiudadesEmpujando_ || !logCiudadesApp_.length) return;
    if (!localStorage.getItem("smartbudget_token") || typeof realizarPeticionBD !== "function") return;
    if (!(typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.gasUrl)) return;
    logCiudadesEmpujando_ = true;
    try {
        const r = await realizarPeticionBD({ action: "ciudades_consultar", pais: "" }, { timeoutMs: 30000 });
        if (!r || !r.exito || !Array.isArray(r.data)) return;
        logCiudadesTomar_(r.data, "", true);
        r.data.forEach(function (x) {
            const kk = logPaisClave_(x.pais);
            if (kk) logCiudadesHojaLista_[kk] = true;
        });
        logCiudadesApp_.forEach(function (x) {
            const kk = logPaisClave_(x.pais);
            if (kk) logCiudadesHojaLista_[kk] = true;
        });
        const enHoja = {};
        r.data.forEach(function (x) { enHoja[logCiudadesAppClave_(x.pais, x.nombre)] = 1; });
        const paises = {};
        logCiudadesApp_.forEach(function (x) {
            if (!enHoja[logCiudadesAppClave_(x.pais, x.nombre)]) paises[x.pais] = 1;
        });
        const lista = Object.keys(paises);
        for (let i = 0; i < lista.length; i++) {
            const res = await logCiudadesPublicarPais_(lista[i]);
            if (res && /Acci[oó]n no v[aá]lida|Permisos/i.test(String(res.mensaje || ""))) break;
        }
    } catch (e) {}
    finally { logCiudadesEmpujando_ = false; }
}

async function logCiudadesAsegurarPais_(pais) {
    const p = String(pais || "").trim();
    const k = logPaisClave_(p);
    if (!k || logCiudadesAsegurando_[k]) return;
    logCiudadesAsegurando_[k] = 1;
    logCiudadesBotonGuardar_();
    const ya = logCiudadesAppDePais_(p).length;
    if (!ya) logCiudadesEstadoPoner_("is-info", "Trayendo las ciudades de " + p + " a la app…");
    let trajo = ya;
    try {
        if (localStorage.getItem("smartbudget_token") && typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.gasUrl && typeof realizarPeticionBD === "function") {
            const guardadas = await realizarPeticionBD({ action: "ciudades_consultar", pais: p }, { timeoutMs: 25000 });
            if (guardadas && /Acci[oó]n no v[aá]lida/i.test(String(guardadas.mensaje || ""))) {
                logCiudadesAsegurando_[k] = 0;
                logCiudadesEstadoPoner_("is-warn", "La dirección publicada sigue en la versión vieja. En Apps Script: Implementar, Administrar implementaciones, el lápiz de la que ya está en uso, Versión nueva, Implementar. No crees otra implementación.");
                return;
            }
            if (guardadas && guardadas.exito && Array.isArray(guardadas.data)) {
                if (guardadas.data.length) trajo = logCiudadesTomar_(guardadas.data, p, true);
                logCiudadesHojaLista_[k] = true;
                const enHoja = {};
                guardadas.data.forEach(function (x) { enHoja[logTarNorm_(x.nombre)] = 1; });
                const faltan = logCiudadesAppDePais_(p).filter(function (x) { return !enHoja[logTarNorm_(x.nombre)]; });
                const pend = logCiudadesPublicarPend_[k];
                delete logCiudadesPublicarPend_[k];
                if (faltan.length || pend) logCiudadesPublicarPais_(p);
            }
            if (!logCiudadesAppDePais_(p).length) {
                const cod = typeof logEnvCodigoDePais_ === "function" ? logEnvCodigoDePais_(p) : "";
                const r = await realizarPeticionBD({ action: "odoo_ciudades", pais: p, codigo: cod }, { timeoutMs: 60000 });
                const data = (r && r.exito && Array.isArray(r.data)) ? r.data : [];
                const dePais = data.filter(function (x) { return logTarMismoPais_(p, x.pais); });
                if (dePais.length && data.length > dePais.length + 5) {
                    logCiudadesTomar_(data, "");
                    trajo = logCiudadesAppDePais_(p).length;
                } else if (dePais.length) {
                    trajo = logCiudadesTomar_(dePais, p);
                    logCiudadesPublicarPais_(p);
                } else if (!trajo && r && r.mensaje && !/Indica el país/i.test(r.mensaje)) {
                    logCiudadesAsegurando_[k] = 0;
                    logCiudadesEstadoPoner_("is-warn", "No pude traer " + p + " desde Odoo. Puedes agregar las ciudades aquí; quedan en la app.");
                    return;
                }
            }
        }
    } catch (e) {
        if (!trajo) {
            logCiudadesAsegurando_[k] = 0;
            logCiudadesEstadoPoner_("is-warn", "No pude traer " + p + ". Escríbela arriba y agrégala: queda en la app, sin Odoo.");
            return;
        }
    }
    logCiudadesAsegurando_[k] = 2;
    const n = logCiudadesAppDePais_(p).length;
    logCiudadesEstadoPoner_("is-ok", n
        ? (n + " ciudades de " + p + " quedan en la app. Si falta una, agrégala arriba. No vuelve a hacer falta Odoo para usarla.")
        : ("Todavía no hay ciudades de " + p + " en la app. Escríbela arriba y agrégala."));
}

function logCargarCiudades_() {
    logCiudadesAppLeer_();
    const n = logCiudadesApp_.length;
    if (n) {
        logCiudadesOdoo_ = logCiudadesApp_;
        if (typeof logRefrescarCiudadesEnv_ === "function") logRefrescarCiudadesEnv_(false);
        logCiudadesEstadoPoner_("is-ok", n + " ciudades ya están en la app. Elige el país para verlas o agregar otra.");
    } else {
        logCiudadesEstadoPoner_("is-info", "Las ciudades quedan en la app, ligadas al país. Elige un país: si Odoo las tiene, se copian una vez. Después puedes sumar las que falten.");
    }
    const env = typeof logEnv_ === "function" ? logEnv_() : {};
    const loc = (typeof localeProyecto !== "undefined" && localeProyecto && localeProyecto.pais) || "";
    const pais = (env && env.destinoPais) || loc || "";
    if (pais) logCiudadesAsegurarPais_(pais);
    logCiudadesEmpujarLocal_();
}

function logContenedoresNorm_(src) {
    const o = src && typeof src === "object" ? src : {};
    const n = function (k) {
        const v = parseInt(o[k], 10);
        return isFinite(v) && v > 0 ? v : 0;
    };
    return { c20: n("c20"), c40: n("c40"), c40hc: n("c40hc") };
}

/** Cubicaje útil de planificación. No es una tarifa: Edwin puede corregir las cantidades. */
var LOG_CONT_CAP_ = [
    { k: "c20", m3: 28, kg: 21700, et: "20'" },
    { k: "c40", m3: 58, kg: 26500, et: "40'" },
    { k: "c40hc", m3: 68, kg: 26500, et: "40HC" }
];

function logSugerirContenedores_(m3, kg) {
    m3 = Math.max(0, Number(m3) || 0);
    kg = Math.max(0, Number(kg) || 0);
    if (!(m3 > 0) && !(kg > 0)) return null;
    const cap = { c20: LOG_CONT_CAP_[0], c40: LOG_CONT_CAP_[1], c40hc: LOG_CONT_CAP_[2] };
    const porVol = m3 > 0 ? Math.ceil(m3 / cap.c20.m3) : 0;
    const porKg = kg > 0 ? Math.ceil(kg / cap.c20.kg) : 0;
    const tope = Math.min(30, Math.max(1, porVol, porKg));
    let best = null;
    let a, b, c;
    for (a = 0; a <= tope; a++) {
        for (b = 0; b <= tope - a; b++) {
            for (c = 0; c <= tope - a - b; c++) {
                if (!a && !b && !c) continue;
                const vol = a * cap.c20.m3 + b * cap.c40.m3 + c * cap.c40hc.m3;
                const peso = a * cap.c20.kg + b * cap.c40.kg + c * cap.c40hc.kg;
                if (vol + 1e-6 < m3 || peso + 1e-6 < kg) continue;
                const n = a + b + c;
                const waste = vol - m3;
                if (!best || n < best.n || (n === best.n && waste < best.waste - 0.01) ||
                    (n === best.n && Math.abs(waste - best.waste) < 0.01 && c > best.c40hc)) {
                    best = { c20: a, c40: b, c40hc: c, n: n, waste: waste };
                }
            }
        }
    }
    return best;
}

function logContenedoresTexto_(mix) {
    if (!mix) return "";
    const bits = [];
    if (mix.c20) bits.push(mix.c20 + "×20'");
    if (mix.c40) bits.push(mix.c40 + "×40'");
    if (mix.c40hc) bits.push(mix.c40hc + "×40HC");
    return bits.join(" + ");
}

function logAplicarContenedoresSugeridos_(e, cub, escId) {
    if (typeof logQuote !== "undefined" && logQuote && logQuote.env && e && logQuote.env !== e) e = logQuote.env;
    const kg = Math.max(Number(cub && cub.pesoKg) || 0, Number(cub && cub.kgVol) || 0);
    const sug = logSugerirContenedores_(Number(cub && cub.m3) || 0, kg);
    if (!sug || !e || e.modalidad !== "fcl") return sug;
    if (escId) {
        const st = logEnvEsc_(escId);
        if (!st || st.contenedoresManual) return sug;
        st.contenedoresManual = false;
        st.contenedores = { c20: sug.c20, c40: sug.c40, c40hc: sug.c40hc };
        return sug;
    }
    if (e.contenedoresManual) return sug;
    e.contenedoresManual = false;
    e.contenedores = { c20: sug.c20, c40: sug.c40, c40hc: sug.c40hc };
    return sug;
}

function logEnvIncotermsDe_(mod) {
    const sea = mod === "fcl" || mod === "lcl";
    return Object.keys(LOG_INCOTERM_MATRIZ_).filter(function (k) {
        return sea || !LOG_INCOTERM_MATRIZ_[k].sea;
    });
}

function logCubNum_(v) {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return isFinite(n) && n >= 0 ? n : null;
}

function logEnvNormalizar_(src) {
    const d = logEnvDef_();
    const e = src || {};
    const mod = String(e.modalidad || "aerea");
    d.modalidad = LOG_MODALIDADES_.indexOf(mod) >= 0 ? mod : "aerea";
    const inc = String(e.incoterm || "EXW").toUpperCase();
    d.incoterm = LOG_INCOTERM_MATRIZ_[inc] ? inc : "EXW";
    if (logEnvIncotermsDe_(d.modalidad).indexOf(d.incoterm) < 0) {
        const avail = logEnvIncotermsDe_(d.modalidad);
        d.incoterm = avail.indexOf("CIP") >= 0 ? "CIP" : (avail[0] || "EXW");
    }
    d.destinoCiudad = String(e.destinoCiudad || "").trim();
    d.destinoPais = logPaisEnEspanol_(String(e.destinoPais || "").trim());
    d.destinoCodigo = String(e.destinoCodigo || "").trim().toUpperCase();
    if (!d.destinoCodigo && d.destinoPais) d.destinoCodigo = logEnvCodigoDePais_(d.destinoPais) || "";
    d.destinoPuerto = String(e.destinoPuerto || "").trim();
    d.destinoTitulo = String(e.destinoTitulo || "").trim();
    d.contenedores = logContenedoresNorm_(e.contenedores);
    const sumaCont = d.contenedores.c20 + d.contenedores.c40 + d.contenedores.c40hc;
    if (e.contenedoresManual === false) d.contenedoresManual = false;
    else if (e.contenedoresManual === true) d.contenedoresManual = true;
    else d.contenedoresManual = sumaCont > 0;
    const emb = parseInt(e.embarques, 10);
    d.embarques = isFinite(emb) && emb > 0 ? emb : 1;
    d.activo = e.activo === false ? false : true;
    d.mercado = e.mercado === "EXPORTACION" ? "EXPORTACION" : (e.mercado === "NACIONAL" ? "NACIONAL" : "");
    d.modoCosto = e.modoCosto === "resumen" ? "resumen" : "detalle";
    const pct = Number(e.resumenPct);
    d.resumenPct = isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 100;
    d.margenPct = Object.prototype.hasOwnProperty.call(e, "margenPct") ? logMargenClamp_(e.margenPct) : 0;
    const nalSrc = (e.margenNal && typeof e.margenNal === "object") ? e.margenNal : null;
    d.margenNal = {
        envio: nalSrc && Object.prototype.hasOwnProperty.call(nalSrc, "envio") ? logMargenClamp_(nalSrc.envio) : 0,
        montaje: nalSrc && Object.prototype.hasOwnProperty.call(nalSrc, "montaje") ? logMargenClamp_(nalSrc.montaje) : 0,
        bodega: nalSrc && Object.prototype.hasOwnProperty.call(nalSrc, "bodega") ? logMargenClamp_(nalSrc.bodega) : 0,
        otro: nalSrc && Object.prototype.hasOwnProperty.call(nalSrc, "otro") ? logMargenClamp_(nalSrc.otro) : 0
    };
    d.titSubProd = String(e.titSubProd || "");
    d.titSubLog = /PRECIO TOTAL ENV[IÍ]OS|TOTAL SHIPPING PRICE/i.test(String(e.titSubLog || "")) ? "" : String(e.titSubLog || "");
    d.titGran = String(e.titGran || "");
    d.cubM3 = logCubNum_(e.cubM3);
    d.cubPeso = logCubNum_(e.cubPeso);
    d.cubKgVol = logCubNum_(e.cubKgVol);
    d.plantilla = String(e.plantilla || "");
    d.lineas = Array.isArray(e.lineas) ? e.lineas.map(function (ln, i) {
        return {
            id: ln.id || ("c" + (i + 1)),
            tipo: String(ln.tipo || "libre"),
            concepto: String(ln.concepto || ""),
            conceptoManual: !!ln.conceptoManual,
            valor: ln.valor === "" || ln.valor == null || !isFinite(Number(ln.valor)) ? null : Number(ln.valor),
            pct: ln.pct === "" || ln.pct == null || !isFinite(Number(ln.pct)) ? null : Number(ln.pct),
            notas: String(ln.notas || ""),
            fuente: (ln.fuente === "[Estimado IA]" || ln.fuente === "Aranceles" || ln.fuente === "[Catálogo]") ? ln.fuente : "",
            base: (ln.base === "CIF" || ln.base === "EXW" || ln.base === "CIF+DUTY") ? ln.base : "",
            arancelManual: !!ln.arancelManual,
            arancelFirma: String(ln.arancelFirma || "").slice(0, 120),
            arancelNota: String(ln.arancelNota || "").slice(0, 180)
        };
    }) : [];
    d.porEsc = {};
    if (e.porEsc && typeof e.porEsc === "object") {
        Object.keys(e.porEsc).forEach(function (k) { d.porEsc[k] = logEnvEscNorm_(e.porEsc[k], e); });
    }
    /* Simulador 3D global: capturas / refs. Bundle pesado solo en memoria o datos.sim3d. */
    if (e.sim3d && typeof e.sim3d === "object") d.sim3d = e.sim3d;
    if (e.sim3dImg) d.sim3dImg = String(e.sim3dImg);
    if (e.sim3dImgRef) d.sim3dImgRef = String(e.sim3dImgRef);
    if (e.sim3dBundle && typeof e.sim3dBundle === "object") d.sim3dBundle = e.sim3dBundle;
    if (e.sim3dRef) d.sim3dRef = String(e.sim3dRef);
    return d;
}

function logEnv_() {
    /* No reemplazar el objeto en cada lectura: Generar/aplicar escriben en lineas
       y un normalize intermedio dejaba esos valores en una copia huérfana. */
    if (!logQuote.env) {
        logQuote.env = logEnvNormalizar_(null);
        return logQuote.env;
    }
    const e = logQuote.env;
    if (!Array.isArray(e.lineas)) e.lineas = [];
    if (!e.porEsc || typeof e.porEsc !== "object") e.porEsc = {};
    if (!e.contenedores || typeof e.contenedores !== "object") e.contenedores = { c20: 0, c40: 0, c40hc: 0 };
    if (!e.margenNal || typeof e.margenNal !== "object") e.margenNal = { envio: 0, montaje: 0, bodega: 0, otro: 0 };
    return e;
}

/**
 * Modalidad + cifra clave para PDF / «Una línea»:
 * FCL → contenedores; LCL → m³; Aéreo/Courier → kg cobrados (máx. real/vol).
 */
function logEnvDetalleFlete_(esEn, escId) {
    const e = logEnv_();
    const mod = logEnvModalidad_(escId);
    const cub = typeof logCubicajeTotal_ === "function"
        ? logCubicajeTotal_(esEn ? "en" : "es", escId)
        : { m3: 0, pesoKg: 0, kgVol: 0 };
    if (mod === "fcl") {
        const st = escId ? logEnvEscDe_(e, escId) : null;
        const txt = logContenedoresTexto_(logContenedoresNorm_(st ? st.contenedores : e.contenedores));
        return txt ? ("FCL " + txt) : "FCL";
    }
    if (mod === "lcl") {
        const m3 = Number(cub.m3) || 0;
        if (!(m3 > 0)) return "LCL";
        return "LCL " + logFmtM3_(m3, esEn ? "en" : "es");
    }
    if (mod === "aerea" || mod === "courier") {
        const nom = mod === "courier" ? "Courier" : (esEn ? "Air" : "Aéreo");
        const kg = Math.max(Number(cub.pesoKg) || 0, Number(cub.kgVol) || 0);
        if (!(kg > 0)) return nom;
        const um = typeof logPesoUmDoc_ === "function" ? logPesoUmDoc_() : "kg";
        const val = typeof logKgADoc_ === "function" ? logKgADoc_(kg) : kg;
        const n = Math.round(Number(val) * 100) / 100;
        return nom + " " + logFmtNum_(n, esEn ? "en" : "es", n % 1 ? 2 : 0) + " " + um;
    }
    if (mod === "terrestre") return esEn ? "Land freight" : "Terrestre";
    return "";
}

/** Título del monto logístico en modo «Una línea»: título base + modalidad/detalle. */
function logEnvTituloResumen_(T, mon, esEn, escId) {
    const base = logEnvTitulo_("log", T, mon, esEn, escId);
    const det = logEnvDetalleFlete_(esEn, escId);
    if (!det) return base;
    const marca = mon ? (" · " + mon) : "";
    if (marca && base.length >= marca.length
        && base.slice(-marca.length).toUpperCase() === marca.toUpperCase()) {
        return (base.slice(0, -marca.length) + " · " + det + marca).trim();
    }
    if (base.toUpperCase().indexOf(det.toUpperCase()) >= 0) return base;
    return (base + " · " + det).trim();
}

function logEnvFilasImpresas_(lineas, esEn, escId) {
    const out = [];
    let unificado = false;
    const duties = lineas.filter(function (ln) { return ln.tipo === "duties"; });
    const taxes = lineas.filter(function (ln) { return ln.tipo === "taxes"; });
    const juntos = duties.length && taxes.length;
    lineas.forEach(function (ln) {
        if (ln.tipo !== "duties" && ln.tipo !== "taxes") {
            let label = ln.concepto || logEnvEtiquetaTipo_(ln.tipo, logEnvModalidad_(escId), esEn);
            if (ln.tipo === "flete_principal") {
                const det = logEnvDetalleFlete_(esEn, escId);
                if (det && label.toUpperCase().indexOf(det.toUpperCase()) < 0) label += " (" + det + ")";
            }
            out.push({ label: label, ln: ln });
            return;
        }
        if (juntos) {
            if (unificado) return;
            unificado = true;
            out.push({ label: esEn ? "Duties and Taxes" : "Duties y Taxes", grupo: duties.concat(taxes) });
            return;
        }
        out.push({ label: ln.concepto || logEnvEtiquetaTipo_(ln.tipo, logEnvModalidad_(escId), esEn), ln: ln });
    });
    return out;
}

function logEnvEtiquetaTipo_(tipo, mod, esEn) {
    const air = mod === "aerea";
    const sea = mod === "fcl" || mod === "lcl";
    if (tipo === "origen") return air
        ? (esEn ? "Origin costs (includes local trucking)" : "Costos en origen (incluye flete terrestre local)")
        : (esEn ? "Origin costs" : "Costos en origen");
    if (tipo === "flete_interno") return sea
        ? (esEn ? "Inland freight (Bogotá – port)" : "Flete terrestre (Bogotá – puerto)")
        : (esEn ? "Inland freight" : "Flete terrestre");
    if (tipo === "flete_principal") return air
        ? (esEn ? "Air freight" : "Flete aéreo")
        : (esEn ? "Ocean freight" : "Flete marítimo");
    if (tipo === "seguro") return esEn ? "Insurance" : "Seguro";
    if (tipo === "destino") return esEn ? "Destination costs" : "Costos en destino";
    if (tipo === "duties") return "Duties";
    if (tipo === "taxes") return "Taxes";
    if (tipo === "courier") return esEn ? "Consolidated shipping cost" : "Costo logístico consolidado";
    if (tipo === "nal_envio") return esEn ? "Domestic shipping" : "Envío nacional";
    if (tipo === "nal_montaje") return esEn ? "Installation" : "Montaje e instalación";
    if (tipo === "nal_bodega") return esEn ? "Warehousing" : "Bodegaje";
    if (tipo === "nal_otro") return esEn ? "Other" : "Otro";
    return esEn ? "Additional cost" : "Costo adicional";
}

function logEnvTiposActivos_(mod, inc, exterior) {
    if (!exterior) return ["nal_envio", "nal_montaje", "nal_bodega", "nal_otro"];
    if (mod === "courier") return ["courier"];
    const m = LOG_INCOTERM_MATRIZ_[inc] || LOG_INCOTERM_MATRIZ_.EXW;
    const air = mod === "aerea";
    const land = mod === "terrestre";
    const tipos = [];
    if (m.o) tipos.push("origen");
    if (m.i && !air) tipos.push("flete_interno");
    if (m.p && !land) tipos.push("flete_principal");
    if (m.s) tipos.push("seguro");
    if (m.d) tipos.push("destino");
    if (m.du) tipos.push("duties");
    if (m.tx) tipos.push("taxes");
    return tipos;
}

function logEnvFirma_(e, exterior) {
    return (exterior ? "x" : "n") + "|" + e.modalidad + "|" + e.incoterm;
}

/** Tipos de costo de TODAS las opciones (p. ej. courier + aéreo). Así no se borran líneas al saltar de modalidad. */
function logEnvTiposUnion_(exterior) {
    const e = logEnv_();
    const escs = logEscList_();
    const out = [];
    const add_ = function (tipos) {
        (tipos || []).forEach(function (t) {
            if (!t || t === "libre") return;
            if (out.indexOf(t) < 0) out.push(t);
        });
    };
    if (!escs.length) {
        add_(logEnvTiposActivos_(e.modalidad, e.incoterm, exterior));
    } else {
        escs.forEach(function (esc) {
            const v = logEnvVistaEsc_(esc.id);
            add_(logEnvTiposActivos_(v.modalidad, v.incoterm, exterior));
        });
    }
    /* Conservar tipos ya presentes o con valor guardado (t:tipo), aunque la modalidad
       de una opción se lea mal al saltar de pestaña. */
    (e.lineas || []).forEach(function (ln) { if (ln && ln.tipo) add_([ln.tipo]); });
    if (e.porEsc && typeof e.porEsc === "object") {
        Object.keys(e.porEsc).forEach(function (k) {
            const st = e.porEsc[k];
            if (!st || !st.valores) return;
            Object.keys(st.valores).forEach(function (key) {
                if (key.indexOf("t:") === 0) add_([key.slice(2)]);
            });
        });
    }
    return out;
}

function logEnvAsegurarLineas_(esEn, forzar, escId) {
    const e = logEnv_();
    const exterior = logEsCotizacionExterior_();
    const vista = logEnvVistaEsc_(escId || (logEscList_().length ? logOpcionUiAsegurar_() : ""));
    const tiposUnion = logEnvTiposUnion_(exterior);
    /* Firma por unión de tipos: cambiar de Courier↔Aéreo en otra opción no destruye la plantilla. */
    const firma = (exterior ? "x" : "n") + "|U|" + tiposUnion.slice().sort().join(",");
    /* Si plantilla coincide pero no hay filas, hay que reconstruir (bug al cambiar de opción/Incoterm). */
    if (!forzar && e.plantilla === firma && (e.lineas || []).length) {
        e.lineas.forEach(function (ln) {
            if (ln.tipo === "libre" || ln.conceptoManual) return;
            /* Etiqueta según la opción activa (aéreo vs courier). */
            if (logEnvTiposActivos_(vista.modalidad, vista.incoterm, exterior).indexOf(ln.tipo) >= 0) {
                ln.concepto = logEnvEtiquetaTipo_(ln.tipo, vista.modalidad, esEn);
            }
        });
        return e.lineas;
    }
    const prev = e.lineas || [];
    /* Sin opciones y EXW: vacío. Con opciones, la unión manda (una opción EXW no borra las demás). */
    const esExwSolo = exterior && !logEscList_().length && String(vista.incoterm || "").toUpperCase() === "EXW";
    const libres = esExwSolo ? [] : prev.filter(function (ln) { return ln.tipo === "libre"; });
    const usados = {};
    let n = 0;
    prev.forEach(function (ln) { n = Math.max(n, parseInt(String(ln.id).replace(/\D/g, ""), 10) || 0); });
    e.lineas = esExwSolo ? [] : tiposUnion.map(function (tipo) {
        const old = prev.find(function (ln) { return ln.tipo === tipo && !usados[ln.id]; });
        if (old) usados[old.id] = true;
        n += 1;
        return {
            id: old ? old.id : ("c" + n),
            tipo: tipo,
            concepto: (old && old.conceptoManual)
                ? old.concepto
                : logEnvEtiquetaTipo_(tipo, vista.modalidad, esEn),
            conceptoManual: !!(old && old.conceptoManual),
            valor: old ? old.valor : null,
            pct: old ? old.pct : null,
            notas: old ? old.notas : "",
            fuente: old && (old.fuente === "[Estimado IA]" || old.fuente === "Aranceles" || old.fuente === "[Catálogo]") ? old.fuente : "",
            base: old && (old.base === "CIF" || old.base === "EXW" || old.base === "CIF+DUTY") ? old.base : "",
            arancelManual: !!(old && old.arancelManual),
            arancelFirma: old ? String(old.arancelFirma || "") : "",
            arancelNota: old ? String(old.arancelNota || "") : ""
        };
    }).concat(libres);
    e.plantilla = firma;
    return e.lineas;
}

/** Líneas de costo para una opción (tipos según su modalidad/Incoterm), sin mutar el global. */
function logEnvLineasDeEsc_(escId, esEn) {
    const e = logEnv_();
    const exterior = logEsCotizacionExterior_();
    const vista = logEnvVistaEsc_(escId);
    if (exterior && String(vista.incoterm || "").toUpperCase() === "EXW") return [];
    const tipos = logEnvTiposActivos_(vista.modalidad, vista.incoterm, exterior);
    const prev = e.lineas || [];
    const usados = {};
    let n = 0;
    prev.forEach(function (ln) { n = Math.max(n, parseInt(String(ln.id).replace(/\D/g, ""), 10) || 0); });
    const tipadas = tipos.map(function (tipo) {
        const old = prev.find(function (ln) { return ln.tipo === tipo && !usados[ln.id]; });
        if (old) usados[old.id] = true;
        n += 1;
        return {
            id: old ? old.id : ("c" + n),
            tipo: tipo,
            concepto: (old && old.conceptoManual) ? old.concepto : logEnvEtiquetaTipo_(tipo, vista.modalidad, esEn),
            conceptoManual: !!(old && old.conceptoManual),
            valor: old ? old.valor : null,
            pct: old ? old.pct : null,
            notas: old ? old.notas : "",
            fuente: old ? old.fuente : "",
            base: old ? old.base : "",
            arancelManual: !!(old && old.arancelManual)
        };
    });
    const libres = prev.filter(function (ln) { return ln.tipo === "libre"; });
    return tipadas.concat(libres);
}

function logMargenEmpresa_() {
    const g = typeof CONFIG_GLOBAL !== "undefined" ? CONFIG_GLOBAL : null;
    if (g && g.logMargenPct != null && g.logMargenPct !== "" && isFinite(Number(g.logMargenPct))) return logMargenClamp_(g.logMargenPct);
    return 30;
}

function logMargenClamp_(v) {
    const n = Number(v);
    if (!isFinite(n)) return 0;
    return Math.min(200, Math.max(0, n));
}

function logMargenClaveNal_(tipo) {
    if (tipo === "nal_envio") return "envio";
    if (tipo === "nal_montaje") return "montaje";
    if (tipo === "nal_bodega") return "bodega";
    if (tipo === "nal_otro") return "otro";
    return "";
}

/** Margen que se suma al costo para la cotización. Duties y Taxes no llevan. */
function logMargenDeLinea_(ln) {
    if (!ln || ln.tipo === "duties" || ln.tipo === "taxes") return 0;
    const e = logEnv_();
    const clave = logMargenClaveNal_(ln.tipo);
    if (!logEsCotizacionExterior_()) return clave ? (Number(e.margenNal[clave]) || 0) : 0;
    if (clave) return 0;
    return Number(e.margenPct) || 0;
}

function logMargenTituloCosto_(ln) {
    if (!ln) return "Costo.";
    if (ln.tipo === "duties" || ln.tipo === "taxes") return "Este valor sale en la cotización. No lleva margen.";
    const m = logMargenDeLinea_(ln);
    const base = (ln.fuente ? ln.fuente + ". " : "") + "Costo.";
    if (ln.valor == null || !m) return base + " Sin margen, este valor sale en la cotización.";
    const mon = (logQuote && logQuote.moneda) || "COP";
    return base + " En la cotización sale " + logEnvValorLinea_(ln, null) + " " + mon + ".";
}

function logCifExtra_(escId) {
    let s = 0;
    let alguna = false;
    (logEnv_().lineas || []).forEach(function (ln) {
        if (ln.tipo !== "origen" && ln.tipo !== "flete_interno" && ln.tipo !== "flete_principal" && ln.tipo !== "seguro") return;
        const v = logEscValor_(ln, escId);
        if (v == null) return;
        s += v;
        alguna = true;
    });
    return alguna ? s : 0;
}

function logDutySobre_(baseProd, escId) {
    const lineas = (logQuote && logQuote.env && logQuote.env.lineas) || [];
    const ln = lineas.find(function (x) { return x.tipo === "duties"; });
    const pct = logEscPct_(ln, escId);
    const valor = logEscValor_(ln, escId);
    if (ln && pct == null && valor != null) return valor;
    if (!ln || pct == null) return 0;
    const cif = ln.base === "CIF";
    let b = baseProd;
    if (cif) {
        const extra = logCifExtra_(escId);
        if (!(extra > 0)) return null;
        b = baseProd + extra;
    }
    return b * pct / 100;
}

function logEnvBasePct_(ln, baseProd, escId) {
    if (baseProd == null || !isFinite(baseProd)) return null;
    if (ln && ln.base === "CIF+DUTY") {
        const cif = logEnvBasePct_({ base: "CIF" }, baseProd, escId);
        const duty = logDutySobre_(baseProd, escId);
        if (cif == null || duty == null) return null;
        return cif + duty;
    }
    if (ln && ln.base === "CIF") {
        const extra = logCifExtra_(escId);
        if (!(extra > 0)) return null;
        return baseProd + extra;
    }
    return baseProd;
}

function logEnvValorLinea_(ln, baseProd, escId) {
    if (!ln) return null;
    let base = null;
    const valorEsc = logEscValor_(ln, escId);
    const pctEsc = logEscPct_(ln, escId);
    if (valorEsc != null) base = valorEsc;
    else if ((ln.tipo === "duties" || ln.tipo === "taxes") && pctEsc != null) {
        const b = logEnvBasePct_(ln, baseProd, escId);
        if (b == null) return null;
        base = b * pctEsc / 100;
    }
    if (base == null || !isFinite(base)) return null;
    let out = base * (1 + logMargenDeLinea_(ln) / 100);
    if (!logEsCotizacionExterior_() && valorEsc != null) out = logMonedaDesdeCop_(out);
    return logRedondear_(out);
}

var logAranceles = { filas: null, pedido: false };

function logArancelDigitos_(s) {
    return String(s || "").replace(/\D/g, "");
}

function logArancelNorm_(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function logArancelBuscar_(filas, partida) {
    const d = logArancelDigitos_(partida);
    if (d.length < 4) return null;
    let best = null;
    let amb = false;
    filas.forEach(function (r) {
        const rd = logArancelDigitos_(r.partida);
        if (!rd) return;
        const n = Math.min(d.length, rd.length);
        if (d.slice(0, n) !== rd.slice(0, n)) return;
        if (!best || rd.length > logArancelDigitos_(best.partida).length) {
            best = r;
            amb = false;
        } else if (rd.length === logArancelDigitos_(best.partida).length &&
            (r.dutiesPct !== best.dutiesPct || r.taxesPct !== best.taxesPct || r.dutiesBase !== best.dutiesBase || r.taxesBase !== best.taxesBase)) {
            amb = true;
        }
    });
    if (!best) return null;
    return amb ? { ambiguo: true } : best;
}

function logBasesPorPartida_(idioma, k) {
    const map = {};
    (logQuote.filas || []).forEach(function (fila) {
        if (fila.tipo !== "item" && fila.tipo !== "libre") return;
        if (fila.demo != null) return;
        const sub = logSub_(logFilaValores_(fila, idioma, k));
        if (sub == null) return;
        const f = logComisionFactor_(fila) || 1;
        const key = logArancelDigitos_(fila.partida).slice(0, 10) || "_";
        map[key] = (map[key] || 0) + sub / f;
    });
    return map;
}

function logMontoSobreBase_(exw, pct, kind, peso, duty, escId) {
    if (exw == null || pct == null || !isFinite(Number(pct))) return null;
    let b = Number(exw);
    if (kind === "CIF" || kind === "CIF+DUTY") {
        const extra = logCifExtra_(escId);
        if (!(extra > 0) || !(peso > 0)) return null;
        b = Number(exw) + extra * (Number(exw) / peso);
    }
    if (kind === "CIF+DUTY") {
        if (duty == null || !isFinite(Number(duty))) return null;
        b += Number(duty);
    }
    return b * Number(pct) / 100;
}

function logAplicarConceptoArancel_(ln, filasPais, bases, firma, escId) {
    if (!ln || ln.arancelManual) return false;
    if (ln.arancelFirma && ln.arancelFirma !== firma) ln.arancelManual = false;
    if (ln.arancelManual) return false;
    const campo = ln.tipo === "duties" ? "duties" : "taxes";
    const partes = [];
    const sin = [];
    let mezcla = false;
    let kind = "";
    Object.keys(bases).forEach(function (key) {
        if (!(bases[key] > 0)) return;
        if (key === "_") { sin.push("sin partida"); return; }
        const hit = logArancelBuscar_(filasPais, key);
        if (!hit || hit.ambiguo) { sin.push(key); return; }
        let pct = hit[campo + "Pct"];
        const baseKind = (hit[campo + "Base"] === "CIF" || hit[campo + "Base"] === "EXW" || hit[campo + "Base"] === "CIF+DUTY") ? hit[campo + "Base"] : "";
        if (campo === "taxes" && /importador/i.test(hit.nota || "")) pct = 0;
        if (pct == null || !isFinite(Number(pct))) { sin.push(key); return; }
        if (!kind) kind = baseKind || "EXW";
        else if ((baseKind || "EXW") !== kind) mezcla = true;
        partes.push({
            key: key, exw: bases[key], pct: Number(pct), kind: baseKind || "EXW", nota: hit.nota || "",
            dPct: hit.dutiesPct == null ? null : Number(hit.dutiesPct),
            dKind: hit.dutiesBase === "CIF" ? "CIF" : "EXW"
        });
    });
    if (!partes.length) return false;
    const notaCat = (partes.map(function (p) { return p.nota; }).filter(Boolean)[0] || "").slice(0, 180);
    const notaPrev = ln.arancelNota || "";
    const antes = [ln.pct, ln.base, ln.valor, ln.fuente, ln.notas].join("|");
    ln.fuente = "Aranceles";
    ln.arancelFirma = firma;
    const ponerNota_ = function (txt) {
        const t = String(txt || "").trim().slice(0, 400);
        if (!ln.notas || ln.notas === notaPrev) ln.notas = t;
        ln.arancelNota = t;
    };
    const detalle = partes.map(function (p) {
        return (p.key && p.key !== "_" ? logPartidaFmt_(p.key) : "") + " " + p.pct + "%";
    }).join(" · ");
    if (sin.length) {
        ln.pct = null;
        ln.valor = null;
        ln.base = "";
        ponerNota_(("Sin tasa: " + sin.join(", ") + ". " + notaCat).trim());
    } else if (mezcla) {
        const peso = partes.reduce(function (s, p) { return s + p.exw; }, 0);
        let suma = 0;
        let ok = true;
        partes.forEach(function (p) {
            let duty = 0;
            if (p.kind === "CIF+DUTY" && p.dPct != null) {
                duty = logMontoSobreBase_(p.exw, p.dPct, p.dKind === "CIF" ? "CIF" : "EXW", peso, 0, escId);
                if (duty == null) ok = false;
            }
            const m = logMontoSobreBase_(p.exw, p.pct, p.kind, peso, duty || 0, escId);
            if (m == null) ok = false;
            else suma += m;
        });
        ln.pct = null;
        ln.base = "";
        ln.valor = ok ? Math.round(suma * 100) / 100 : null;
        ponerNota_(("Bases distintas. Valor sumado por partida. " + detalle + (notaCat ? ". " + notaCat : "")).trim());
    } else {
        const peso = partes.reduce(function (s, p) { return s + p.exw; }, 0);
        const mix = peso ? partes.reduce(function (s, p) { return s + p.exw * p.pct; }, 0) / peso : null;
        ln.valor = null;
        ln.pct = mix == null ? null : Math.round(mix * 1000) / 1000;
        ln.base = kind || "EXW";
        const varios = partes.some(function (p) { return p.pct !== partes[0].pct; });
        ponerNota_(varios ? ("Porcentajes distintos, prorrateados por valor. " + detalle).slice(0, 400) : notaCat);
    }
    if (escId) {
        const st = logEnvEsc_(escId);
        if (st) {
            if (ln.pct != null) st.pcts[ln.id] = ln.pct; else delete st.pcts[ln.id];
            if (ln.valor != null) st.valores[ln.id] = ln.valor; else delete st.valores[ln.id];
            st.fuentes[ln.id] = ln.fuente || "";
            st.notas[ln.id] = ln.notas || "";
        }
    }
    const despues = [ln.pct, ln.base, ln.valor, ln.fuente, ln.notas].join("|");
    return antes !== despues;
}

function logAplicarAranceles_() {
    if (!logEsCotizacionExterior_() || !logAranceles.filas || !logAranceles.filas.length) return false;
    const e = logEnv_();
    const cod = String(e.destinoCodigo || logEnvCodigoDePais_(e.destinoPais) || "").toUpperCase();
    const pais = logArancelNorm_(e.destinoPais);
    if (!cod && !pais) return false;
    const alias = { US: ["usa", "eeuu", "estados unidos", "united states"], PR: ["puerto rico"], MX: ["mexico"], GB: ["reino unido", "uk"] };
    const filasPais = logAranceles.filas.filter(function (r) {
        if (cod && String(r.codigo || "").toUpperCase() === cod) return true;
        /* La fila puede no traer código y nombrar el país en el otro idioma. */
        if (cod && logEnvCodigoDePais_(r.pais) === cod) return true;
        const n = logArancelNorm_(r.pais);
        if (pais && n === pais) return true;
        const lista = cod && alias[cod];
        return !!(lista && lista.indexOf(n) >= 0);
    });
    if (!filasPais.length) return false;
    const idioma = (typeof logisticaLeerOpciones_ === "function" ? logisticaLeerOpciones_().idioma : "es");
    const clavesAr = logEscList_().length ? logEscList_().map(function (x) { return x.id; }) : [""];
    let cambio = false;
    clavesAr.forEach(function (k) {
        const bases = logBasesPorPartida_(idioma, k);
        const firma = cod + "|" + k + "|" + Object.keys(bases).sort().join(",");
        (e.lineas || []).forEach(function (ln) {
            if (ln.tipo !== "duties" && ln.tipo !== "taxes") return;
            if (logAplicarConceptoArancel_(ln, filasPais, bases, firma, k)) cambio = true;
        });
    });
    if (cambio && typeof logMarcarSucio_ === "function") logMarcarSucio_();
    return cambio;
}

function logArancelResumen_() {
    if (!logEsCotizacionExterior_()) return null;
    const out = {};
    (logEnv_().lineas || []).forEach(function (ln) {
        if (ln.fuente !== "Aranceles" || (ln.tipo !== "duties" && ln.tipo !== "taxes")) return;
        const pct = ln.pct == null ? "" : (ln.pct + "%");
        const base = ln.base ? (" sobre " + ln.base) : "";
        const nota = ln.notas ? (" · " + ln.notas) : "";
        out[ln.tipo] = (pct + base + nota).trim();
    });
    return Object.keys(out).length ? out : null;
}

async function logCargarAranceles_() {
    if (logAranceles.filas || logAranceles.pedido) return;
    if (!localStorage.getItem("smartbudget_token")) return;
    if (!(typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.gasUrl)) return;
    logAranceles.pedido = true;
    try {
        const r = await realizarPeticionBD({ action: "aranceles_consultar" }, { timeoutMs: 25000 });
        if (!r || !r.exito || !r.data) {
            logAranceles.pedido = false; /* reintento: fallo o backend sin la acción */
            return;
        }
        logAranceles.filas = r.data.filas || [];
        if (typeof pintarTablaPartidas === "function") pintarTablaPartidas();
        if (typeof logPintarSelectPaisCliente_ === "function") logPintarSelectPaisCliente_();
        const elAct = typeof elementoActivoObj_ === "function" ? elementoActivoObj_() : null;
        if (typeof logPintarSelectPartida_ === "function") {
            logPintarSelectPartida_(elAct && elAct.fichaComercial ? elAct.fichaComercial.partida : "");
        }
        /* Siempre repintar cotización: el select de partida filtra por Aranceles del destino Envío. */
        if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
        if (logAplicarAranceles_()) {
            if (typeof logisticaPintarEnv_ === "function") logisticaPintarEnv_(true);
            if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
        }
    } catch (e) {
        logAranceles.pedido = false; /* el backend publicado todavía no tiene esta acción */
    }
}

/**
 * ¿Sale logística en la hoja?
 * Un solo switch #logCostosOn:
 * - Sin opciones: e.activo.
 * - Con opciones: porEsc[escId].activo (e.activo=false legado apaga todas).
 */
function logEnvActivo_(escId) {
    const e = logEnv_();
    if (e.activo === false) return false;
    if (!escId) return true;
    const st = logEnvEscDe_(e, escId);
    return !(st && st.activo === false);
}

/** Detalle | Una línea: por opción si hay porEsc; si no, el global. */
function logEnvModoCosto_(escId) {
    const e = logEnv_();
    if (escId && e.porEsc && e.porEsc[escId] && e.porEsc[escId].modoCosto != null) {
        return e.porEsc[escId].modoCosto === "resumen" ? "resumen" : "detalle";
    }
    return e.modoCosto === "resumen" ? "resumen" : "detalle";
}

function logEnvResumenPct_(escId) {
    const e = logEnv_();
    let n = null;
    if (escId && e.porEsc && e.porEsc[escId] && e.porEsc[escId].resumenPct != null) {
        n = Number(e.porEsc[escId].resumenPct);
    }
    if (n == null || !isFinite(n)) n = Number(e.resumenPct);
    return isFinite(n) ? Math.min(100, Math.max(0, n)) : 100;
}

function logEnvSuma_(baseProd, escId) {
    if (!logEnvActivo_(escId)) return 0;
    let s = 0;
    let alguna = false;
    const lineas = escId
        ? logEnvLineasDeEsc_(escId, (typeof logisticaLeerOpciones_ === "function" && logisticaLeerOpciones_().idioma === "en"))
        : (logEnv_().lineas || []);
    lineas.forEach(function (ln) {
        const v = logEnvValorLinea_(ln, baseProd, escId);
        if (v == null) return;
        s += v;
        alguna = true;
    });
    return alguna ? s : 0;
}

function logSufijoMon_(txt, mon) {
    let t = String(txt || "").trim();
    const marca = " · " + mon;
    if (t.toUpperCase().indexOf(marca.toUpperCase()) >= 0) return t;
    t = t.replace(new RegExp("\\s*\\(" + String(mon || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\)\\s*$", "i"), "");
    return (t.replace(/\s+/g, " ").trim() + marca).trim();
}

function logEnvTitulo_(cual, T, mon, esEn, escId) {
    const e = logEnv_();
    const vista = logEnvVistaEsc_(escId || "");
    let custom = cual === "prod" ? e.titSubProd : (cual === "log" ? e.titSubLog : e.titGran);
    const viejos = [
        "PRECIO TOTAL (ANTES DE IVA) (" + mon + ")",
        "TOTAL PRICE (BEFORE VAT) (" + mon + ")",
        "PRECIO SUBTOTAL (" + mon + ")",
        "SUBTOTAL PRICE (" + mon + ")",
        "PRECIO TOTAL LOGÍSTICA (" + mon + ")",
        "PRECIO TOTAL LOGISTICA (" + mon + ")",
        "TOTAL LOGISTICS PRICE (" + mon + ")"
    ];
    if (viejos.some(function (v) { return String(custom || "").trim().toUpperCase() === v.toUpperCase(); })) custom = "";
    const conMoneda_ = function (txt) { return logSufijoMon_(txt, mon); };
    const escMon_ = function (s) { return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    const quitarMonedaFinal_ = function (t) {
        return String(t || "").trim()
            .replace(new RegExp("\\s*·\\s*" + escMon_(mon) + "\\s*$", "i"), "")
            .replace(new RegExp("\\s*\\(" + escMon_(mon) + "\\)\\s*$", "i"), "")
            .trim();
    };
    if (cual !== "gran" && String(custom || "").trim()) return String(custom).trim();
    if (cual === "prod") {
        if (!logEsCotizacionExterior_()) return logSufijoMon_(esEn ? "SUBTOTAL PRICE" : "PRECIO SUBTOTAL", mon);
        return logSufijoMon_(esEn ? "EXW SUBTOTAL PRICE" : "PRECIO SUBTOTAL EXWORKS", mon);
    }
    if (cual === "log") return logSufijoMon_(esEn ? "TOTAL LOGISTICS PRICE" : "PRECIO TOTAL LOGÍSTICA", mon);
    /* Título editado a mano en el PDF: se respeta tal cual (ya no se vuelve a pegar la ciudad de tarifas). */
    if (cual === "gran" && String(custom || "").trim()) {
        return conMoneda_(quitarMonedaFinal_(custom));
    }
    if (cual === "gran" && typeof logPagoAsegurar_ === "function" && logPagoAsegurar_().iva) {
        return logSufijoMon_(esEn ? "TOTAL PRICE BEFORE VAT" : "PRECIO TOTAL ANTES DE IVA", mon);
    }
    if (!logEsCotizacionExterior_()) {
        return conMoneda_(esEn ? "GRAND TOTAL BEFORE VAT" : "GRAN TOTAL SIN IVA");
    }
    const cabeza = esEn ? "GRAND TOTAL" : "GRAN TOTAL";
    /* Ciudad del título: destinoTitulo (p. ej. Dover) o, si vacío, la de tarifas (Tampa). */
    const ciudad = String(vista.destinoTitulo || vista.destinoCiudad || "").trim().toUpperCase();
    const cod = (vista.destinoCodigo || "").trim().toUpperCase();
    const incNow = String(vista.incoterm || "EXW").toUpperCase();
    return conMoneda_(cabeza + " " + incNow + (ciudad ? " " + ciudad : "") + (cod ? " " + cod : ""));
}

function logEnvLineaPdf_(T, esEn, escId) {
    if (!logEsCotizacionExterior_()) return "";
    const vista = logEnvVistaEsc_(escId || "");
    const dest = [vista.destinoCiudad, vista.destinoCodigo || vista.destinoPais].filter(Boolean).join(", ");
    let s = (T.incoterm || "Incoterm") + ": " + vista.incoterm;
    if (dest) s += " · " + (T.destino || (esEn ? "Destination" : "Destino")) + ": " + dest;
    return s;
}

function logEsEnvio_(fila) {
    return !!(fila && fila.tipo === "envio");
}

/** Título de sección u observaciones: ocupan todo el ancho, sin precio, y respetan excl por opción. */
function logEsTextoFila_(fila) {
    return !!(fila && (fila.tipo === "seccion" || fila.tipo === "obs" || fila.tipo === "sim3d"));
}

function logEsSim3dFila_(fila) {
    return !!(fila && fila.tipo === "sim3d");
}

/** Layout de la captura 3D en la hoja (guardado en fila.over). */
function logSim3dLayoutDe_(fila) {
    const ov = (fila && fila.over) || {};
    let w = parseInt(ov.sim3dW, 10);
    if (!isFinite(w) || w < 40 || w > 100) w = 100;
    const align = (ov.sim3dAlign === "left" || ov.sim3dAlign === "right") ? ov.sim3dAlign : "center";
    /* La captura no fuerza hoja propia; el salto lo marca «Hoja nueva» de la opción. */
    return { w: w, align: align, salto: false };
}

/** Imagen + nota. En vivo prioriza data URL (imprime bien); Drive solo como respaldo. */
function logSim3dDatosDe_(escId) {
    const env = typeof logEnv_ === "function" ? logEnv_() : {};
    const caps = (typeof window.slPdfCapturesParaHoja === "function" ? window.slPdfCapturesParaHoja() : null) || window._slPdfCaptures || {};
    const urlDe_ = function (st, capKey) {
        if (!st && !capKey) return "";
        if (st && st.sim3dImg && /^data:/i.test(String(st.sim3dImg))) return st.sim3dImg;
        if (caps[capKey] && /^data:/i.test(String(caps[capKey]))) return caps[capKey];
        if (st && st.sim3dImg) return st.sim3dImg;
        if (caps[capKey]) return caps[capKey];
        if (st && st.sim3dImgRef && typeof logUrlImgDrive_ === "function") return logUrlImgDrive_(st.sim3dImgRef);
        return "";
    };
    if (escId) {
        const st = env.porEsc && env.porEsc[escId];
        return { img: urlDe_(st, escId), meta: (st && st.sim3d) || null, key: escId };
    }
    return { img: urlDe_(env, "base"), meta: env.sim3d || null, key: "base" };
}

/** Clave de captura 3D (opción origen). La fila ya no vive dentro del contenedor. */
function logSim3dEscKey_(fila) {
    if (!fila) return "";
    const ov = (fila.over && typeof fila.over === "object") ? fila.over : {};
    if (ov.sim3dEsc) return String(ov.sim3dEsc);
    if (fila.escId) return String(fila.escId);
    return "";
}

/**
 * Vista 3D vive DENTRO de su opción (escId), al final del contenedor, arrastrable.
 * Migra filas viejas que solo tenían over.sim3dEsc (fuera de contenedores).
 */
function logNormalizarFilasSim3dEnOpcion_() {
    let cambio = false;
    (logQuote.filas || []).forEach(function (f) {
        if (!f || f.tipo !== "sim3d") return;
        if (!f.over || typeof f.over !== "object") f.over = {};
        if (f.escId) {
            if (f.over.sim3dEsc !== f.escId) { f.over.sim3dEsc = f.escId; cambio = true; }
        } else if (f.over.sim3dEsc) {
            f.escId = String(f.over.sim3dEsc);
            cambio = true;
        }
    });
    return cambio;
}

/** Compat: nombre viejo → nueva normalización. */
function logNormalizarFilasSim3dFuera_() {
    return logNormalizarFilasSim3dEnOpcion_();
}

/** Quita capturas y filas Vista 3D de la cotización abierta (memoria + caps). */
function logLimpiarCapturasSim3dTodas_() {
    const env = typeof logEnv_ === "function" ? logEnv_() : null;
    if (env) {
        delete env.sim3dImg;
        delete env.sim3dImgRef;
        delete env.sim3d;
        delete env.sim3dRef;
        delete env.sim3dBundle;
        delete env.sim3dState;
        if (env.porEsc && typeof env.porEsc === "object") {
            Object.keys(env.porEsc).forEach(function (k) {
                const st = env.porEsc[k];
                if (!st) return;
                delete st.sim3dImg;
                delete st.sim3dImgRef;
                delete st.sim3d;
                delete st.sim3dState;
            });
        }
    }
    if (logQuote && Array.isArray(logQuote.filas)) {
        logQuote.filas = logQuote.filas.filter(function (f) { return !f || f.tipo !== "sim3d"; });
    }
    if (typeof window.slLimpiarCaptura === "function") {
        /* limpia caps conocidas */
    }
    window._slPdfCaptures = {};
    if (typeof window.slPdfCapturesParaHoja === "function") {
        try {
            const caps = window.slPdfCapturesParaHoja();
            Object.keys(caps || {}).forEach(function (k) {
                if (typeof window.slLimpiarCaptura === "function") window.slLimpiarCaptura(k);
            });
        } catch (eC) { /* noop */ }
    }
    return true;
}

function logSim3dHtmlFila_(fila, nCols, esEn, escId) {
    const key = escId || logSim3dEscKey_(fila) || "base";
    const datos = logSim3dDatosDe_(key === "base" ? "" : key);
    /* Sin imagen real no se imprime nada (ni placeholder): evita romper opciones 2…n al reabrir. */
    if (!datos.img) return "";
    const lay = logSim3dLayoutDe_(fila);
    /* Nunca embeber data: en srcdoc. Drive/http sí; data URL se inyecta al cargar el iframe. */
    const src = /^data:/i.test(String(datos.img)) ? "" : String(datos.img).replace(/"/g, "");
    const ml = lay.align === "left" ? "0 auto 0 0" : (lay.align === "right" ? "0 0 0 auto" : "0 auto");
    let h = "<tr class=\"it it-sim3d\"" + (lay.salto ? " data-salto=\"1\"" : "") +
        " data-r=\"" + (fila && fila.uid ? fila.uid : "") + "\"" +
        (key && key !== "base" ? " data-e=\"" + logEsc_(key) + "\"" : "") + ">" +
        "<td colspan=\"" + nCols + "\" style=\"padding:10px 6px 14px;\">" +
        "<div class=\"log-sim3d-frame\" data-r=\"" + (fila && fila.uid ? fila.uid : "") + "\" title=\"" +
        (esEn ? "Click to resize / align" : "Clic para tamaño / alineación") + "\" style=\"width:" + lay.w + "%;margin:" + ml + ";\">" +
        "<img data-sim3d=\"" + logEsc_(key) + "\" data-r=\"" + (fila && fila.uid ? fila.uid : "") + "\" src=\"" + src + "\" alt=\"Simulador 3D\"/>" +
        "</div></td></tr>";
    return h;
}

/** Refs Drive de capturas Vista 3D (base + por opción). */
function logSim3dRefsPendientes_() {
    const env = typeof logEnv_ === "function" ? logEnv_() : null;
    if (!env) return [];
    const out = [];
    if (env.sim3dImgRef) out.push({ key: "base", ref: String(env.sim3dImgRef), st: env });
    const pe = env.porEsc || {};
    Object.keys(pe).forEach(function (escId) {
        const st = pe[escId];
        if (st && st.sim3dImgRef) out.push({ key: escId, ref: String(st.sim3dImgRef), st: st });
    });
    return out;
}

/** Escribe data URL en env + buffer de capturas (preview/PDF). */
function logSim3dPonerImg_(key, data) {
    if (!data || !/^data:image\//i.test(data)) return;
    const env = typeof logEnv_ === "function" ? logEnv_() : null;
    if (!env) return;
    if (key === "base") {
        env.sim3dImg = data;
    } else {
        if (!env.porEsc) env.porEsc = {};
        if (!env.porEsc[key]) env.porEsc[key] = {};
        env.porEsc[key].sim3dImg = data;
    }
    if (typeof window.slPonerCaptura === "function") {
        try { window.slPonerCaptura(key, data); } catch (eR) { /* noop */ }
    } else {
        if (!window._slPdfCaptures) window._slPdfCaptures = {};
        window._slPdfCaptures[key] = data;
    }
}

/**
 * Baja capturas 3D desde IDB / Drive (refs tras guardar).
 * Recargar imágenes también fuerza esto.
 */
async function logisticaHidatarSim3dImgs_(opts) {
    opts = opts || {};
    const lista = logSim3dRefsPendientes_();
    if (!lista.length) return 0;
    let ok = 0;
    for (let i = 0; i < lista.length; i++) {
        const it = lista[i];
        const ya = it.st && it.st.sim3dImg;
        if (ya && /^data:image\//i.test(ya) && !opts.forzar) {
            logSim3dPonerImg_(it.key, ya);
            ok++;
            continue;
        }
        let data = "";
        if (typeof logIdbGetImg_ === "function") {
            try { data = await logIdbGetImg_(it.ref); } catch (e0) { data = ""; }
        }
        if ((!data || !/^data:image\//i.test(data)) && typeof realizarPeticionBD === "function") {
            try {
                const r = await realizarPeticionBD({ action: "cotizacion_imagenes", ids: [it.ref], modo: "blob" }, { timeoutMs: 60000 });
                data = r && r.exito && r.data ? (r.data[it.ref] || "") : "";
            } catch (e1) { data = ""; }
        }
        if (data && /^data:image\//i.test(data)) {
            if (typeof logIdbPutImg_ === "function") logIdbPutImg_(it.ref, data);
            logSim3dPonerImg_(it.key, data);
            ok++;
        }
    }
    return ok;
}

/**
 * Rellena capturas 3D en el iframe y, si hay paginador, recoloca una vez tras cargar.
 */
function logisticaInyectarSim3dImgs_(doc, opts) {
    opts = opts || {};
    if (!doc) return Promise.resolve();
    const hydrate = opts.sinHidatar
        ? Promise.resolve(0)
        : logisticaHidatarSim3dImgs_({ forzar: !!opts.forzar }).catch(function () { return 0; });
    return hydrate.then(function () {
        const imgs = Array.prototype.slice.call(doc.querySelectorAll("img[data-sim3d]"));
        imgs.forEach(function (img) {
            const key = img.getAttribute("data-sim3d") || "base";
            const cur = (img.getAttribute("src") || "").trim();
            if (cur && /^data:/i.test(cur) && img.complete && img.naturalWidth) return;
            const d = logSim3dDatosDe_(key === "base" ? "" : key);
            if (d.img) {
                img.setAttribute("src", d.img);
                img.onerror = function () {
                    if (img.dataset.sim3dfb) return;
                    img.dataset.sim3dfb = "1";
                    logisticaHidatarSim3dImgs_({ forzar: true }).then(function () {
                        const d2 = logSim3dDatosDe_(key === "base" ? "" : key);
                        if (d2.img && d2.img !== img.getAttribute("src")) img.setAttribute("src", d2.img);
                    });
                };
            }
        });
        const pending = imgs.filter(function (img) {
            const s = (img.getAttribute("src") || "").trim();
            return s && !img.complete;
        });
        const paginar_ = function () {
            if (opts.sinPaginar) return;
            try {
                if (doc.defaultView && typeof doc.defaultView.recolocarPaginas_ === "function") {
                    doc.defaultView.recolocarPaginas_();
                }
            } catch (eR) { /* noop */ }
        };
        if (!pending.length) {
            paginar_();
            return;
        }
        return new Promise(function (resolve) {
            let left = pending.length;
            const done = function () {
                left -= 1;
                if (left > 0) return;
                paginar_();
                resolve();
            };
            pending.forEach(function (img) {
                img.addEventListener("load", done);
                img.addEventListener("error", done);
            });
        });
    });
}

function logisticaAbrirEditorSim3d_(uid) {
    const fila = logFilaPorUid_(uid);
    if (!fila || fila.tipo !== "sim3d") return;
    const lay = logSim3dLayoutDe_(fila);
    const uidEl = document.getElementById("logSim3dUid");
    const rango = document.getElementById("logSim3dAncho");
    const lbl = document.getElementById("logSim3dAnchoLbl");
    if (uidEl) uidEl.value = uid;
    if (rango) rango.value = String(lay.w);
    if (lbl) lbl.textContent = lay.w + "%";
    document.querySelectorAll("#logSim3dAlignGroup [data-align]").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-align") === lay.align);
    });
    const modal = document.getElementById("modalLogSim3d");
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).show();
}

/** Aplica ancho/alineación en vivo sobre el iframe (para ver si cabe en el hueco). */
function logisticaPreviewSim3dLayout_(uid, w, align) {
    const f = document.getElementById("logFrame");
    const doc = f && f.contentDocument;
    if (!doc || !uid) return;
    const ml = align === "left" ? "0 auto 0 0" : (align === "right" ? "0 0 0 auto" : "0 auto");
    const ww = isFinite(w) ? Math.max(40, Math.min(100, w)) : 100;
    doc.querySelectorAll(".log-sim3d-frame[data-r=\"" + uid + "\"]").forEach(function (el) {
        el.style.width = ww + "%";
        el.style.margin = ml;
    });
    try {
        if (doc.defaultView && typeof doc.defaultView.recolocarPaginas_ === "function") {
            doc.defaultView.recolocarPaginas_();
            /* El paginador recrea el DOM: reaplicar ancho y reactivar clic. */
            doc.querySelectorAll(".log-sim3d-frame[data-r=\"" + uid + "\"]").forEach(function (el) {
                el.style.width = ww + "%";
                el.style.margin = ml;
            });
            logisticaActivarClicSim3d_(doc);
        }
    } catch (e) { /* noop */ }
}

function logisticaInitEditorSim3d_() {
    if (window._logSim3dEditorOk) return;
    window._logSim3dEditorOk = true;
    const rango = document.getElementById("logSim3dAncho");
    const lbl = document.getElementById("logSim3dAnchoLbl");
    const leerAlign_ = function () {
        const act = document.querySelector("#logSim3dAlignGroup [data-align].active");
        return act ? act.getAttribute("data-align") : "center";
    };
    if (rango && lbl) {
        rango.addEventListener("input", function () {
            lbl.textContent = rango.value + "%";
            const uid = ((document.getElementById("logSim3dUid") || {}).value || "");
            logisticaPreviewSim3dLayout_(uid, parseInt(rango.value, 10), leerAlign_());
        });
    }
    document.querySelectorAll("#logSim3dAlignGroup [data-align]").forEach(function (b) {
        b.addEventListener("click", function () {
            document.querySelectorAll("#logSim3dAlignGroup [data-align]").forEach(function (x) { x.classList.remove("active"); });
            b.classList.add("active");
            const uid = ((document.getElementById("logSim3dUid") || {}).value || "");
            const w = parseInt((document.getElementById("logSim3dAncho") || {}).value, 10);
            logisticaPreviewSim3dLayout_(uid, w, b.getAttribute("data-align") || "center");
        });
    });
    const ok = document.getElementById("logSim3dOk");
    if (ok) {
        ok.addEventListener("click", function () {
            const uid = ((document.getElementById("logSim3dUid") || {}).value || "");
            const fila = logFilaPorUid_(uid);
            if (!fila) return;
            if (!fila.over) fila.over = {};
            const w = parseInt((document.getElementById("logSim3dAncho") || {}).value, 10);
            fila.over.sim3dW = isFinite(w) ? Math.max(40, Math.min(100, w)) : 100;
            const act = document.querySelector("#logSim3dAlignGroup [data-align].active");
            fila.over.sim3dAlign = act ? act.getAttribute("data-align") : "center";
            /* Salto de página = «Hoja nueva» de la opción; la captura ya no fuerza hoja propia. */
            delete fila.over.sim3dSalto;
            logMarcarSucio_();
            const modal = document.getElementById("modalLogSim3d");
            if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();
            logisticaActualizarVista({ sinFilas: true });
        });
    }
}

/** Ya no se usa como apéndice: la Vista 3D va tras cada Gran Total vía TrasGran. */
function logSim3dHtmlAlFinal_(nCols, esEn) {
    void nCols; void esEn;
    return "";
}

/** Filas Vista 3D ligadas a una opción (o a base sin opciones), tras el Gran Total. */
function logSim3dHtmlTrasGran_(escId, nCols, esEn) {
    const key = String(escId || "");
    const datos = logSim3dDatosDe_(key);
    /* Solo con captura real. Meta de «Aplicar a Logística» o filas huérfanas no pintan el PDF. */
    if (!datos.img) return "";
    let filas = (logQuote.filas || []).filter(function (f) {
        if (!f || f.tipo !== "sim3d") return false;
        const k = logSim3dEscKey_(f);
        if (key) return k === key;
        return !k || k === "base";
    });
    if (!filas.length) {
        filas = [{ uid: "", tipo: "sim3d", over: { sim3dEsc: key || undefined, sim3dW: 100, sim3dAlign: "center", sim3dSalto: false } }];
    }
    return filas.map(function (f) {
        return logSim3dHtmlFila_(f, nCols, esEn, key || "");
    }).join("");
}

/** Opción activa en las pestañas de las fichas (Costos, Comisión, etc.). */
let logOpcionUiSel_ = "";

function logOpcionUiAsegurar_() {
    const escs = logEscList_();
    if (!escs.length) { logOpcionUiSel_ = ""; return ""; }
    if (!escs.some(function (x) { return x.id === logOpcionUiSel_; })) logOpcionUiSel_ = escs[0].id;
    if (!logEnvEscSel_ || !escs.some(function (x) { return x.id === logEnvEscSel_; })) logEnvEscSel_ = logOpcionUiSel_;
    else if (logOpcionUiSel_ !== logEnvEscSel_) logEnvEscSel_ = logOpcionUiSel_;
    return logOpcionUiSel_;
}

function logClaveProyFila_(fila) {
    if (!fila || fila.tipo !== "item") return "";
    return String(fila.proy || "") + "|" + String(fila.ver || "") + "|" + String(fila.elem || "");
}

/** Huella del render de una ficha (img propia, pin En cotización, Odoo o vacío). */
function logRenderIdFila_(fila) {
    if (!fila) return "";
    const huellaData_ = function (u) {
        const s = String(u || "");
        if (!s) return "";
        if (/^data:image\//i.test(s)) {
            return "data:" + s.length + ":" + s.slice(22, 58) + ":" + s.slice(-32);
        }
        return "url:" + s.slice(0, 160);
    };
    if (fila.imgRef) return "ref:" + String(fila.imgRef);
    if (fila.img) {
        const h = huellaData_(fila.img);
        if (h) return h;
    }
    if (fila.tipo === "item" && fila.elem) {
        const vivo = typeof logElementoVivoCostos_ === "function"
            ? logElementoVivoCostos_(fila.proy, fila.elem, (fila.snap && fila.snap.nombre) || "")
            : null;
        const pin = typeof logPinImgDeElemento_ === "function" ? logPinImgDeElemento_(vivo) : null;
        if (pin && pin.imgRef) return "ref:" + String(pin.imgRef);
        if (pin && pin.img) {
            const hp = huellaData_(pin.img);
            if (hp) return hp;
        }
        if (typeof window.imagenCotizacionElemento === "function") {
            const deElem = window.imagenCotizacionElemento(fila.elem);
            const he = huellaData_(deElem);
            if (he) return he;
        }
        return "elem:" + String(fila.elem);
    }
    if (fila.tipo === "item" && logImgOdoo && logImgOdoo.url && logImgOdoo.codigo === fila.proy) {
        return "odoo:" + String(fila.proy);
    }
    return "none";
}

/**
 * Zona libre (fuera de opciones): agrupa cantidades solo si es el mismo proyecto
 * y el mismo render. Render distinto → líneas aparte en el PDF.
 */
function logClaveAgrupacionZonaLibre_(fila) {
    if (!fila || fila.tipo !== "item") return "";
    const proy = logClaveProyFila_(fila);
    if (!proy) return "";
    return proy + "|" + logRenderIdFila_(fila);
}

/** Filas de producto/texto de una opción (modelo contenedor: fila.escId). */
function logFilasDeEsc_(escId) {
    const todas = logQuote.filas || [];
    if (!escId) return todas.filter(function (f) { return !logEsEnvio_(f); });
    return todas.filter(function (f) {
        if (logEsEnvio_(f)) return false;
        if (f.escId) return f.escId === escId;
        /* legado: sin escId, entra si no está excluida */
        return !(f.excl && f.excl[escId]);
    });
}

/**
 * Migra cotizaciones viejas (excl/opc en una sola fila) al modelo contenedor:
 * una copia por opción donde no estaba excluida.
 * Importante: clonar opc/lote ANTES de mutar la fila; si no, la 1.ª opción
 * borra opc y las demás heredan la cantidad de la opción 1.
 */
function logMigrarFilasAContenedores_() {
    const escs = logQuote.escenarios || [];
    if (!escs.length) return false;
    const filas = logQuote.filas || [];
    /* Solo migra legado excl/opc → copias. No toca cotizaciones ya en zona libre + opciones. */
    if (filas.some(function (f) { return !!f.escId; })) return false;
    if (!filas.some(function (f) { return (f.excl && Object.keys(f.excl).length) || (f.opc && Object.keys(f.opc).length); })) return false;
    const out = [];
    let cambio = false;
    filas.forEach(function (fila) {
        if (logEsEnvio_(fila)) { out.push(fila); return; }
        const destinos = escs.filter(function (e) { return !(fila.excl && fila.excl[e.id]); });
        if (!destinos.length) destinos.push(escs[0]);
        const opc = (fila.opc && typeof fila.opc === "object") ? Object.assign({}, fila.opc) : {};
        const loteBase = fila.lote || "";
        const escalas = logEscalasFila_(fila) || [];
        let ini = escalas.findIndex(function (s) { return s.id === loteBase; });
        if (ini < 0) ini = 0;
        destinos.forEach(function (e, i) {
            const copia = JSON.parse(JSON.stringify(fila));
            if (i > 0) copia.uid = logNuevoUid_();
            copia.escId = e.id;
            if (Object.prototype.hasOwnProperty.call(opc, e.id) && opc[e.id]) {
                copia.lote = opc[e.id];
            } else if (escalas.length) {
                /* Mismo criterio que logOpcCompletar_: escala siguiente por índice de opción. */
                const s = escalas[Math.min(ini + i, Math.max(0, escalas.length - 1))];
                if (s) copia.lote = s.id;
            }
            delete copia.excl;
            delete copia.opc;
            /* Overrides del modelo viejo eran unit:eId; el unit suelto era de la ficha y no salía en el PDF. */
            logNormalizarOverTrasMigrar_(copia, e.id);
            out.push(copia);
            cambio = true;
        });
    });
    if (!cambio) return false;
    logQuote.filas = out;
    return true;
}

/** Tras migrar a contenedor: deja solo el override de esa opción (claves planas). */
function logNormalizarOverTrasMigrar_(fila, escId) {
    if (!fila) return;
    const ov = (fila.over && typeof fila.over === "object") ? fila.over : {};
    const unitEsc = Object.prototype.hasOwnProperty.call(ov, "unit:" + escId) ? ov["unit:" + escId] : null;
    const qtyEsc = Object.prototype.hasOwnProperty.call(ov, "qty:" + escId) ? ov["qty:" + escId] : null;
    Object.keys(ov).forEach(function (k) {
        if (k === "unit" || k === "qty" || k.indexOf("unit:") === 0 || k.indexOf("qty:") === 0) delete ov[k];
    });
    if (unitEsc != null) ov.unit = unitEsc;
    if (qtyEsc != null) ov.qty = qtyEsc;
    fila.over = ov;
    if (unitEsc == null && typeof logQuedanPreciosFijos_ === "function" && !logQuedanPreciosFijos_(fila)) delete fila.puFijo;
}

/**
 * Cotizaciones ya migradas con over.unit clonado a todas las opciones (no coincidía con el PDF).
 * Si el mismo unit/qty está en todas las copias del producto, se quita y manda el snap/escala.
 */
function logRepararOverClonadoLegado_() {
    const grupos = {};
    (logQuote.filas || []).forEach(function (f) {
        if (!f || !f.escId || f.tipo !== "item") return;
        const k = String(f.proy || "") + "|" + String(f.ver || "") + "|" + String(f.elem || "");
        (grupos[k] = grupos[k] || []).push(f);
    });
    Object.keys(grupos).forEach(function (k) {
        const g = grupos[k];
        if (g.length < 2) return;
        ["unit", "qty"].forEach(function (campo) {
            const vals = g.map(function (f) {
                return f.over && Object.prototype.hasOwnProperty.call(f.over, campo) ? f.over[campo] : null;
            });
            if (vals.some(function (v) { return v == null; })) return;
            if (!vals.every(function (v) { return v === vals[0]; })) return;
            g.forEach(function (f) {
                delete f.over[campo];
                if (typeof logQuedanPreciosFijos_ === "function" && !logQuedanPreciosFijos_(f)) delete f.puFijo;
            });
        });
    });
}

function logDuplicarFilaEnEsc_(uid, escIdDest) {
    const fila = logFilaPorUid_(uid);
    if (!fila || logEsEnvio_(fila) || !escIdDest) return null;
    const copia = JSON.parse(JSON.stringify(fila));
    copia.uid = logNuevoUid_();
    copia.escId = escIdDest;
    delete copia.excl;
    delete copia.opc;
    const i = logQuote.filas.indexOf(fila);
    logQuote.filas.splice(i < 0 ? logQuote.filas.length : i + 1, 0, copia);
    logMarcarSucio_();
    return copia;
}

/** Mueve una ficha a una opción (escId) o a la zona libre (escIdDest vacío). */
function logMoverFilaAEsc_(uid, escIdDest, antesDeUid) {
    const fila = logFilaPorUid_(uid);
    if (!fila || logEsEnvio_(fila)) return false;
    if (escIdDest) fila.escId = escIdDest;
    else delete fila.escId;
    delete fila.excl;
    delete fila.opc;
    const sin = (logQuote.filas || []).filter(function (f) { return f.uid !== uid; });
    let at = sin.length;
    if (antesDeUid) {
        const j = sin.findIndex(function (f) { return f.uid === antesDeUid; });
        if (j >= 0) at = j;
    } else {
        let last = -1;
        sin.forEach(function (f, i) {
            const enDest = escIdDest ? f.escId === escIdDest : !f.escId;
            if (enDest && !logEsEnvio_(f)) last = i;
        });
        at = last < 0 ? sin.length : last + 1;
    }
    sin.splice(at, 0, fila);
    logQuote.filas = sin;
    logMarcarSucio_();
    return true;
}

/** Pinta pestañas de opción en una ficha. onExtraHtml_(escId) puede devolver HTML a la derecha. */
function logisticaPintarOpcTabs_(boxId, onExtraHtml_) {
    const box = document.getElementById(boxId);
    if (!box) return;
    const escs = logEscList_();
    if (!escs.length) {
        box.classList.add("d-none");
        box.innerHTML = "";
        return;
    }
    const idioma = logisticaLeerOpciones_().idioma;
    const sel = logOpcionUiAsegurar_();
    const extra = typeof onExtraHtml_ === "function" ? (onExtraHtml_(sel) || "") : "";
    box.classList.remove("d-none");
    box.innerHTML = "<span class=\"log-opc-tabs-lab\">Editando:</span>" +
        "<div class=\"d-flex flex-wrap align-items-center gap-1\">" + escs.map(function (x, i) {
            return "<button type=\"button\" class=\"btn btn-sm " + (x.id === sel ? "btn-primary" : "btn-outline-primary") + "\" data-opctab=\"" + logEsc_(x.id) + "\">" +
                logEsc_(logEscNombre_(x, i, idioma)) + "</button>";
        }).join("") + "</div>" + (extra ? "<div class=\"log-opc-tabs-actions\">" + extra + "</div>" : "");
}

function logisticaOnOpcTabClick_(ev) {
    const b = ev.target && ev.target.closest ? ev.target.closest("[data-opctab]") : null;
    if (!b) return;
    /* Guarda la opción que se estaba editando antes de cambiar de pestaña. */
    try { logisticaLeerEnvUi_(); } catch (err) { /* ok */ }
    logOpcionUiSel_ = b.getAttribute("data-opctab") || "";
    logEnvEscSel_ = logOpcionUiSel_;
    logisticaPintarEnv_(true);
    logisticaPintarComision_();
    logisticaPintarDescuento_();
    logisticaPintarPago_();
    logisticaPintarOpcTabsTodas_();
    if (typeof logisticaActualizarVista === "function") logisticaActualizarVista({ sinFilas: true });
}

function logisticaPintarOpcTabsTodas_() {
    const escs = logEscList_();
    if (!escs.length) {
        ["logOpcTabsComision", "logOpcTabsDescuento", "logOpcTabsEnvio", "logOpcTabsIa", "logOpcTabsPago", "logEnvEscTabs"].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) { el.classList.add("d-none"); el.innerHTML = ""; }
        });
        return;
    }
    logOpcionUiAsegurar_();
    const idioma = logisticaLeerOpciones_().idioma;
    const esEn = idioma === "en";
    const sel = logOpcionUiSel_;
    logisticaPintarOpcTabs_("logEnvEscTabs", null);
    const persoBtn_ = function (kind, hay) {
        if (!hay) return "";
        return "<span class=\"log-opc-perso\">" + (esEn ? "Custom" : "Personalizado") + "</span>" +
            "<button type=\"button\" class=\"btn btn-sm btn-link px-1\" data-opc-reset=\"" + kind + "\">" + (esEn ? "Use for all" : "Usar en todas") + "</button>";
    };
    logisticaPintarOpcTabs_("logOpcTabsComision", function () {
        return persoBtn_("comision", !!(logQuote.comision && logQuote.comision.porEsc && logQuote.comision.porEsc[sel]));
    });
    logisticaPintarOpcTabs_("logOpcTabsDescuento", function () {
        return persoBtn_("descuento", !!(logQuote.descuento && logQuote.descuento.porEsc && logQuote.descuento.porEsc[sel]));
    });
    logisticaPintarOpcTabs_("logOpcTabsEnvio", null);
    logisticaPintarOpcTabs_("logOpcTabsIa", null);
    logisticaPintarOpcTabs_("logOpcTabsPago", function () {
        return persoBtn_("pago", !!(logQuote.pago && logQuote.pago.porEsc && logQuote.pago.porEsc[sel]));
    });
}

function logHayEnvios_() {
    return (logQuote.filas || []).some(logEsEnvio_);
}

/** Volumen de una caja de empaque en m³. Null si faltan las 3 medidas. Acepta ficha plana o {ancho,fondo,alto,um}. */
function logVolCajaM3_(ficha) {
    if (!ficha) return null;
    const w = Number(ficha.empAncho != null ? ficha.empAncho : ficha.ancho);
    const d = Number(ficha.empFondo != null ? ficha.empFondo : ficha.fondo);
    const h = Number(ficha.empAlto != null ? ficha.empAlto : ficha.alto);
    if (!(w > 0 && d > 0 && h > 0)) return null;
    const f = ficha.um === "in" ? 0.0254 : 0.01;
    return w * f * d * f * h * f;
}

/** Lista de tipos de caja de una ficha (multi-caja o legado de 1). */
function logEmpCajasDeFicha_(ficha) {
    if (typeof window.fichaEmpCajasDe_ === "function") return window.fichaEmpCajasDe_(ficha || {});
    const f = ficha || {};
    if (Array.isArray(f.empCajas) && f.empCajas.length) return f.empCajas;
    return [{
        nombre: "",
        ancho: f.empAncho,
        fondo: f.empFondo,
        alto: f.empAlto,
        und: f.empUnd,
        peso: f.empPeso,
        porPieza: ""
    }];
}

function logFmtM3_(n, idioma) {
    if (n == null || !isFinite(n)) return "—";
    const s = n.toFixed(n >= 10 ? 2 : 3);
    return (idioma === "en" ? s : s.replace(".", ",")) + " m³";
}

/** Aérea: cm³/6.000. Courier: cm³/5.000. El resto de modalidades no tiene kg vol. */
function logKgVolDivisor_(escId) {
    if (typeof logEsCotizacionExterior_ === "function" && !logEsCotizacionExterior_()) return null;
    const k = escId != null && escId !== ""
        ? escId
        : (logEscList_().length ? (logEnvEscSel_ || logOpcionUiSel_ || "") : "");
    const mod = logEnvModalidad_(k);
    if (mod === "aerea") return 6000;
    if (mod === "courier") return 5000;
    return null;
}

/** Medidas de la caja en cm. La ficha puede estar en pulgadas. Acepta plana o tipo de caja. */
function logCajaCm_(ficha) {
    if (!ficha) return null;
    const pos_ = function (a, b) {
        const n = Number(a);
        if (isFinite(n) && n > 0) return n;
        const m = Number(b);
        return (isFinite(m) && m > 0) ? m : null;
    };
    const w = pos_(ficha.empAncho, ficha.ancho);
    const d = pos_(ficha.empFondo, ficha.fondo);
    const h = pos_(ficha.empAlto, ficha.alto);
    if (!(w > 0 && d > 0 && h > 0)) return null;
    const f = ficha.um === "in" ? 2.54 : 1;
    return { w: w * f, d: d * f, h: h * f };
}

/** Peso real de una caja, en kg. La ficha lo guarda en kg (cm) o lb (in). */
function logPesoCajaKg_(ficha) {
    if (!ficha) return null;
    const n = Number(ficha.empPeso != null ? ficha.empPeso : ficha.peso);
    if (!(n > 0)) return null;
    return ficha.um === "in" ? n / 2.2046226218 : n;
}

function logPesoUmDoc_() {
    return (document.getElementById("logSistema") || {}).value === "imperial" ? "lb" : "kg";
}

function logKgADoc_(kg) {
    if (kg == null || !isFinite(kg)) return null;
    return logPesoUmDoc_() === "lb" ? kg * 2.2046226218 : kg;
}

/** Kg volumétricos de una caja. Null si la modalidad no es aérea ni courier, o faltan medidas. */
function logKgVolCaja_(ficha, escId) {
    const div = logKgVolDivisor_(escId);
    const caja = logCajaCm_(ficha);
    if (!div || !caja) return null;
    return caja.w * caja.d * caja.h / div;
}

function logCubicajeFila_(fila, idioma, escId) {
    if (!fila || fila.tipo !== "item") return null;
    const f = (fila.snap && fila.snap.ficha) || logFichaVersion_(fila.ver, fila.elem) || {};
    const v = logFilaValores_(fila, idioma, escId);
    const qty = Number(v.qty);
    if (!(qty > 0) || v.excl) return null;
    const tipos = logEmpCajasDeFicha_(f);
    let totalCajas = 0;
    let m3 = 0;
    let kgVol = 0;
    let peso = 0;
    let undRef = null;
    let volRef = null;
    let alguna = false;
    tipos.forEach(function (caja) {
        const tipo = {
            ancho: caja.ancho, fondo: caja.fondo, alto: caja.alto,
            peso: caja.peso, um: f.um
        };
        const vol = logVolCajaM3_(tipo);
        const und = Number(caja.und);
        const porPieza = Number(caja.porPieza);
        let nCajas = null;
        if (und > 0) nCajas = Math.ceil(qty / und);
        else if (porPieza > 0) nCajas = qty * porPieza;
        if (nCajas == null || !(nCajas > 0) || vol == null) return;
        alguna = true;
        totalCajas += nCajas;
        m3 += nCajas * vol;
        if (undRef == null && und > 0) undRef = und;
        if (volRef == null) volRef = vol;
        const kgCaja = logKgVolCaja_(tipo, escId);
        if (kgCaja != null) kgVol += nCajas * kgCaja;
        const pesoCaja = logPesoCajaKg_(tipo);
        if (pesoCaja != null) peso += nCajas * pesoCaja;
    });
    if (!alguna) {
        /* Legado: una sola caja en campos planos. */
        const und = Number(f.empUnd);
        const vol = logVolCajaM3_(f);
        const cajas = und > 0 ? Math.ceil(qty / und) : null;
        const m3L = cajas != null && vol != null ? cajas * vol : null;
        const kgCaja = logKgVolCaja_(f, escId);
        const kgVolL = cajas != null && kgCaja != null ? cajas * kgCaja : null;
        const pesoCaja = logPesoCajaKg_(f);
        const pesoL = cajas != null && pesoCaja != null ? cajas * pesoCaja : null;
        return { qty: qty, und: und, cajas: cajas, volCaja: vol, m3: m3L, kgVol: kgVolL, pesoKg: pesoL };
    }
    return {
        qty: qty,
        und: undRef,
        cajas: totalCajas,
        volCaja: volRef,
        m3: m3,
        kgVol: kgVol > 0 ? kgVol : null,
        pesoKg: peso > 0 ? peso : null
    };
}

function logCubicajeAuto_(idioma, escId) {
    const escs = logEscList_();
    const k = escId != null ? escId : (escs.length ? escs[0].id : "");
    let cajas = 0, m3 = 0, kgVol = 0, pesoKg = 0, filasPeso = 0, filasOk = 0, filasSin = 0, filas = 0;
    (logQuote.filas || []).forEach(function (fila) {
        if (fila.tipo !== "item") return;
        filas++;
        const c = logCubicajeFila_(fila, idioma, k);
        if (!c || c.cajas == null || c.m3 == null) { filasSin++; return; }
        cajas += c.cajas;
        m3 += c.m3;
        if (c.kgVol != null) kgVol += c.kgVol;
        if (c.pesoKg != null) { pesoKg += c.pesoKg; filasPeso++; }
        filasOk++;
    });
    return { cajas: cajas, m3: m3, kgVol: kgVol, pesoKg: pesoKg, filasPeso: filasPeso, filasOk: filasOk, filasSin: filasSin, filas: filas };
}

function logCubicajeTotal_(idioma, escId) {
    const auto = logCubicajeAuto_(idioma, escId);
    const e = typeof logEnv_ === "function" ? logEnv_() : {};
    const out = {
        cajas: auto.cajas, m3: auto.m3, kgVol: auto.kgVol, pesoKg: auto.pesoKg,
        filasPeso: auto.filasPeso, filasOk: auto.filasOk, filasSin: auto.filasSin, filas: auto.filas,
        auto: auto
    };
    const st = escId ? logEnvEscDe_(e, escId) : null;
    const cubM3 = st ? st.cubM3 : e.cubM3;
    const cubPeso = st ? st.cubPeso : e.cubPeso;
    const cubKgVol = st ? st.cubKgVol : e.cubKgVol;
    if (cubM3 != null) out.m3 = cubM3;
    if (cubPeso != null) { out.pesoKg = cubPeso; if (cubPeso > 0) out.filasPeso = Math.max(out.filasPeso, 1); }
    if (cubKgVol != null) out.kgVol = cubKgVol;
    return out;
}

/** Precios (COP) de todas las escalas de una versión, con el mismo motor AIU del simulador. */
function logVerIgual_(a, b) {
    return String(a || "").trim().toUpperCase() === String(b || "").trim().toUpperCase();
}

function logPreciosVersion_(verId, elemId) {
    try {
        if (typeof calcularPreciosVersion_ !== "function") return null;
        const v = logVersiones_().find(function (x) { return logVerIgual_(x.id, verId); });
        if (!v) return null;
        if (elemId && v.elementos && v.elementos.length) {
            const el = v.elementos.find(function (e) { return String(e.id) === String(elemId); });
            if (!el) return null;
            const viva = logVerIgual_(verId, window.versionActivaId) &&
                String(elemId) === String(window.elementoActivoId || v.elementoActivoId);
            if (viva) return calcularPreciosVersion_(v);
            return calcularPreciosVersion_(Object.assign({}, v, {
                id: String(v.id) + "::" + el.id,
                matrizItems: el.matrizItems || [],
                escalas: el.escalas && el.escalas.length ? el.escalas : v.escalas
            }));
        }
        return calcularPreciosVersion_(v);
    } catch (e) {
        return null;
    }
}

/** Ficha comercial de una versión (la abierta se lee en vivo de la pantalla). */
function logFichaVersion_(verId, elemId) {
    const viva = logVerIgual_(verId, window.versionActivaId) &&
        (!elemId || String(elemId) === String(window.elementoActivoId || ""));
    if (viva && typeof leerFichaComercialUI === "function") {
        return leerFichaComercialUI();
    }
    const v = logVersiones_().find(function (x) { return logVerIgual_(x.id, verId); });
    if (elemId && v && v.elementos) {
        const el = v.elementos.find(function (e) { return String(e.id) === String(elemId); });
        if (el) return el.fichaComercial || {};
    }
    return (v && v.fichaComercial) || {};
}

/** Medidas de la ficha ([ancho, fondo, alto]) en la unidad con que se guardaron. */
function logUmCoti_() {
    const sel = document.getElementById("logSistema");
    if (sel && (sel.value === "imperial" || sel.value === "metrico")) return sel.value === "imperial" ? "in" : "cm";
    try { return localeProyectoActual().sistema === "imperial" ? "in" : "cm"; } catch (e) { return "cm"; }
}

function logConvertirUm_(vals, desde, hacia) {
    if (!vals || desde === hacia) return vals;
    const k = desde === "cm" && hacia === "in" ? (1 / 2.54) : (desde === "in" && hacia === "cm" ? 2.54 : 1);
    return vals.map(function (x) {
        const n = Number(x);
        if (x === "" || x == null || !isFinite(n)) return x;
        return +(n * k).toFixed(2);
    });
}

function logFmtMedidasFicha_(vals, um, idioma) {
    const v = vals.map(function (x) {
        const n = (x === "" || x == null) ? null : Number(x);
        return n != null && isFinite(n) && n > 0 ? n : null;
    });
    if (v.every(function (x) { return x == null; })) return "";
    const f = function (x) {
        const s = x == null ? "–" : String(+x.toFixed(2));
        return idioma === "en" ? s : s.replace(".", ",");
    };
    return um === "in" ? v.map(function (x) { return f(x) + "\""; }).join(" × ") : v.map(f).join(" × ") + " cm";
}

/* --- opciones: contenedores opcionales; sin ellos todo vive en zona libre (rangos agrupados) --- */

/** Opciones creadas (vacío = solo zona libre). Ya no hay toggle Cantidad única / Opciones. */
function logEscList_() {
    return Array.isArray(logQuote.escenarios) ? logQuote.escenarios : [];
}

function logSincronizarModoDesdeEscenarios_() {
    logQuote.modo = (logQuote.escenarios || []).length ? "esc" : "unica";
}

function logEscNombre_(e, i, idioma) {
    return (e.nombre && String(e.nombre).trim()) || ((idioma === "en" ? "Option " : "Opción ") + (i + 1));
}

function logNuevoEscId_() {
    logQuote.escUid = (logQuote.escUid || 0) + 1;
    return "e" + logQuote.escUid;
}

/** Escalas (id, q) disponibles para una fila de proyecto: las congeladas si viene del historial, o las vivas. */
function logEscalasFila_(fila) {
    const sn = fila.snap;
    if (sn) {
        if (Array.isArray(sn.escalas) && sn.escalas.length) return sn.escalas;
        return sn.q != null ? [{ id: fila.lote, q: sn.q, puCop: sn.puCop }] : [];
    }
    const pr = logPreciosVersion_(fila.ver, fila.elem);
    return pr ? pr.escalas : [];
}

/** A cada escenario sin decisión le asigna la escala siguiente a la de la fila (o lo deja sin incluir si no hay más). */
function logOpcCompletar_(fila) {
    if (fila.tipo !== "item") return;
    const escalas = logEscalasFila_(fila);
    if (!escalas.length) return;
    if (!fila.lote) fila.lote = escalas[0].id;
    fila.opc = fila.opc || {};
    fila.excl = fila.excl || {};
    let ini = escalas.findIndex(function (e) { return e.id === fila.lote; });
    if (ini < 0) ini = 0;
    (logQuote.escenarios || []).forEach(function (e, i) {
        if (Object.prototype.hasOwnProperty.call(fila.opc, e.id) || Object.prototype.hasOwnProperty.call(fila.excl, e.id)) return;
        /* por defecto el ítem entra en todas las opciones: si no hay más escalas, se reusa la última */
        const s = escalas[Math.min(ini + i, Math.max(0, escalas.length - 1))];
        if (s) fila.opc[e.id] = s.id;
    });
}

function logNuevaFilaItem_(verId, proy, elemId, loteId, escId) {
    const pr = logPreciosVersion_(verId, elemId);
    let l = null;
    if (loteId && pr && pr.escalas) l = pr.escalas.find(function (e) { return e.id === loteId; }) || null;
    if (!l) l = pr && pr.escalas.length ? pr.escalas[0] : null;
    const fila = { uid: logNuevoUid_(), tipo: "item", proy: proy || "", ver: verId, elem: elemId || "", lote: l ? l.id : "", over: {} };
    const ref = logImgRefElemento_(elemId, verId);
    if (ref) fila.imgRef = ref;
    /* Por defecto zona libre (sin escId). Solo asigna opción si el llamador lo pide. */
    if (escId) fila.escId = escId;
    logAsegurarPartida_(fila);
    return fila;
}

/** Una ficha por producto/pieza (primera escala). Otras Q = duplicar en zona libre. */
function logNuevasFilasItemPorEscalas_(verId, proy, elemId, escId) {
    void escId;
    return [logNuevaFilaItem_(verId, proy, elemId, "", "")];
}

function logisticaAgregarEscenario_() {
    if ((logQuote.escenarios || []).length >= 6) return;
    if (!logQuote.escenarios) logQuote.escenarios = [];
    logQuote.escenarios.push({ id: logNuevoEscId_(), nombre: "" });
    logSincronizarModoDesdeEscenarios_();
    logMarcarSucio_();
    logisticaRefrescarTabla_();
}

/** Quita una opción; sus fichas vuelven a la zona libre (conservan Q/precio). */
function logisticaQuitarEscenario_(id) {
    const resto = (logQuote.escenarios || []).filter(function (e) { return e.id !== id; });
    if (resto.length === (logQuote.escenarios || []).length) return;
    logQuote.escenarios = resto;
    (logQuote.filas || []).forEach(function (f) {
        if (f.escId === id) delete f.escId;
        if (f.opc) delete f.opc[id];
        if (f.excl) delete f.excl[id];
        if (f.over) { delete f.over["qty:" + id]; delete f.over["unit:" + id]; }
    });
    if (logEnv_().porEsc) delete logEnv_().porEsc[id];
    if (logQuote.comision && logQuote.comision.porEsc) delete logQuote.comision.porEsc[id];
    if (logQuote.descuento && logQuote.descuento.porEsc) delete logQuote.descuento.porEsc[id];
    if (logQuote.pago && logQuote.pago.porEsc) delete logQuote.pago.porEsc[id];
    logSincronizarModoDesdeEscenarios_();
    logMarcarSucio_();
    logisticaRefrescarTabla_();
}

let logEscFirmaPintada = "";
function logEscFirma_() {
    return logQuote.modo + "|" + (logQuote.escenarios || []).map(function (e) { return e.id + "=" + (e.nombre || "") + (e.hojaNueva ? "#salto" : ""); }).join(",");
}

/** Contenedores se pintan en logFilasLista. Migración legado excl/opc si aplica. */
function logisticaPintarEscenarios_(soloSiCambio) {
    const box = document.getElementById("logEscPanel");
    if (box) { box.classList.add("d-none"); box.innerHTML = ""; }
    const btnAddOp = document.getElementById("btnLogAgregarOpcion");
    if (btnAddOp) btnAddOp.classList.remove("d-none");
    if ((logQuote.escenarios || []).length) logMigrarFilasAContenedores_();
    logSincronizarModoDesdeEscenarios_();
    logEscFirmaPintada = logEscFirma_();
    void soloSiCambio;
}

/** Sortable: zona libre + opciones; filas se mueven entre contenedores. */
function logisticaInitContenedoresSortable_() {
    const lista = document.getElementById("logFilasLista");
    if (!lista || typeof Sortable === "undefined") return;
    if (lista._logBucketSort) {
        try { lista._logBucketSort.destroy(); } catch (err) { /* ok */ }
        lista._logBucketSort = null;
    }
    (lista._logFilaSorts || []).forEach(function (s) {
        try { s.destroy(); } catch (err2) { /* ok */ }
    });
    lista._logFilaSorts = [];
    if (!logEscList_().length) return;
    lista._logBucketSort = Sortable.create(lista, {
        handle: ".log-opc-bucket-grip",
        draggable: ".log-opc-bucket[data-e]",
        animation: 150,
        onEnd: function () {
            const orden = [].map.call(lista.querySelectorAll(".log-opc-bucket[data-e]"), function (n) { return n.getAttribute("data-e"); });
            const esc = logQuote.escenarios || [];
            if (orden.length !== esc.length) return;
            const nuevo = orden.map(function (id) { return esc.find(function (e) { return e.id === id; }); }).filter(Boolean);
            if (nuevo.length !== esc.length) return;
            logQuote.escenarios = nuevo;
            logNormalizarFilasSim3dEnOpcion_();
            const por = {};
            (logQuote.filas || []).forEach(function (f) {
                if (!f || logEsEnvio_(f)) return;
                const k = f.escId || "_";
                (por[k] || (por[k] = [])).push(f);
            });
            const out = [];
            (por._ || []).forEach(function (f) { out.push(f); });
            nuevo.forEach(function (e) { (por[e.id] || []).forEach(function (f) { out.push(f); }); });
            (logQuote.filas || []).forEach(function (f) {
                if (logEsEnvio_(f) && out.indexOf(f) < 0) out.push(f);
            });
            logQuote.filas = out.filter(function (f, i, a) { return a.indexOf(f) === i; });
            if (logCab.over) delete logCab.over.codigo;
            logMarcarSucio_();
            logisticaRefrescarTabla_();
        }
    });
    lista.querySelectorAll(".log-opc-bucket-list").forEach(function (ul) {
        /* Vista 3D se arrastra igual que proyectos entre Rangos y opciones. */
        const s = Sortable.create(ul, {
            handle: ".log-fila-grip",
            draggable: ".log-fila",
            group: "log-filas-bucket",
            animation: 150,
            ghostClass: "log-opc-drop-over",
            onAdd: function (evt) {
                const uid = evt.item.getAttribute("data-r");
                const fila = logFilaPorUid_(uid);
                const escId = ul.getAttribute("data-e") || "";
                if (fila && fila.tipo === "sim3d") {
                    if (escId) {
                        fila.escId = escId;
                        if (!fila.over) fila.over = {};
                        fila.over.sim3dEsc = escId;
                    } else {
                        delete fila.escId;
                        if (fila.over) delete fila.over.sim3dEsc;
                    }
                    logMarcarSucio_();
                    logisticaRefrescarTabla_();
                    return;
                }
                const antes = evt.item.nextElementSibling && evt.item.nextElementSibling.getAttribute("data-r");
                logMoverFilaAEsc_(uid, escId, antes || "");
                logisticaRefrescarTabla_();
            },
            onUpdate: function () {
                const escId = ul.getAttribute("data-e") || "";
                const uids = [].map.call(ul.querySelectorAll(".log-fila[data-r]"), function (n) { return n.getAttribute("data-r"); });
                const deEsc = uids.map(function (id) { return logFilaPorUid_(id); }).filter(Boolean);
                const otras = (logQuote.filas || []).filter(function (f) {
                    if (!f) return false;
                    if (logEsEnvio_(f)) return true;
                    if (deEsc.indexOf(f) >= 0) return false;
                    if (escId) return f.escId !== escId;
                    return !!f.escId;
                });
                logQuote.filas = [];
                deEsc.forEach(function (f) {
                    if (escId) {
                        f.escId = escId;
                        if (f.tipo === "sim3d") {
                            if (!f.over) f.over = {};
                            f.over.sim3dEsc = escId;
                        }
                    } else {
                        delete f.escId;
                        if (f.tipo === "sim3d" && f.over) delete f.over.sim3dEsc;
                    }
                    logQuote.filas.push(f);
                });
                (logQuote.escenarios || []).forEach(function (e) {
                    if (e.id === escId) return;
                    otras.filter(function (f) { return f.escId === e.id; }).forEach(function (f) { logQuote.filas.push(f); });
                });
                otras.filter(function (f) { return !f.escId || logEsEnvio_(f); }).forEach(function (f) {
                    if (logQuote.filas.indexOf(f) < 0) logQuote.filas.push(f);
                });
                if (logCab.over) delete logCab.over.codigo;
                logMarcarSucio_();
                logisticaRefrescarTabla_();
            }
        });
        lista._logFilaSorts.push(s);
    });
}

function logisticaEventosEscenarios_(ev) {
    const t = ev.target;
    const bucket = t.closest && t.closest(".log-opc-bucket[data-e], .log-esc-item[data-e]");
    if (ev.type === "input") {
        const inp = t.closest && t.closest("[data-esc-nombre]");
        if (!inp || !bucket) return;
        const e = (logQuote.escenarios || []).find(function (x) { return x.id === bucket.getAttribute("data-e"); });
        if (!e) return;
        e.nombre = inp.value;
        logEscFirmaPintada = logEscFirma_();
        logMarcarSucio_();
        if (typeof logisticaActualizarVista === "function") logisticaActualizarVista({ sinFilas: true });
        return;
    }
    const baseSalto = t.closest && t.closest("[data-base-salto]");
    if (baseSalto) {
        logQuote.baseHojaNueva = !!baseSalto.checked;
        logMarcarSucio_();
        logisticaRefrescarTabla_();
        return;
    }
    const salto = t.closest && t.closest("[data-esc-salto]");
    if (salto && bucket) {
        const escSalto = (logQuote.escenarios || []).find(function (x) { return x.id === bucket.getAttribute("data-e"); });
        if (!escSalto) return;
        escSalto.hojaNueva = !!salto.checked;
        logEscFirmaPintada = logEscFirma_();
        logMarcarSucio_();
        logisticaRefrescarTabla_();
        return;
    }
    const add = t.closest && t.closest("[data-esc-add], #btnLogAgregarOpcion");
    if (add) {
        logisticaAgregarEscenario_();
        return;
    }
    const del = t.closest && t.closest("[data-esc-del]");
    if (del && bucket) logisticaQuitarEscenario_(bucket.getAttribute("data-e"));
}

/** Reordena los escenarios según el orden en que quedaron sus filas en el panel (tras arrastrar). */
function logisticaReordenarEscenariosDesdeDom_() {
    const box = document.getElementById("logEscPanel");
    if (!box) return;
    const orden = [].map.call(box.querySelectorAll(".log-esc-item[data-e]"), function (n) { return n.getAttribute("data-e"); });
    const esc = logQuote.escenarios || [];
    if (orden.length !== esc.length) return;
    const nuevo = orden.map(function (id) { return esc.find(function (e) { return e.id === id; }); }).filter(Boolean);
    if (nuevo.length !== esc.length || nuevo.every(function (e, i) { return e === esc[i]; })) return;
    logQuote.escenarios = nuevo;
    logEscFirmaPintada = "";
    logMarcarSucio_();
    logisticaRefrescarTabla_();
}

function logFilasDemo_() {
    return LOG_ITEMS_DEMO.map(function (it, i) {
        return { uid: logNuevoUid_(), tipo: "libre", demo: i, over: {} };
    });
}

/** Si cambió el proyecto abierto, arma las filas iniciales (versión abierta, o ejemplo si no hay proyecto). */
function logAsegurarFilas_() {
    const p = logisticaLeerProyecto_();
    const clave = p.hayProyecto ? p.codigo : "";
    /* Una cotización ya abierta o con cambios se conserva. El aviso ofrece pasar al proyecto de Costos. */
    if (logQuote.inicializado && (logQuote.codigo === clave || logQuote.abierta || logQuote.sucio)) return;
    if (typeof window.slResetAlCambiarCotizacion === "function") {
        try { window.slResetAlCambiarCotizacion(); } catch (eR0) { /* noop */ }
    }
    window._slPdfCaptures = {};
    logQuote = {
        codigo: clave,
        inicializado: true,
        moneda: p.hayProyecto ? logMonedaPorDefecto_() : "USD",
        trm: logTrmDesdeCostos_(),
        totales: true,
        uid: 0,
        filas: [],
        abierta: null,
        sucio: false,
        modo: "unica",
        escenarios: [],
        escUid: 0,
        baseHojaNueva: false,
        texto: logTextoDef_(),
        env: logEnvDef_(),
        comision: null,
        decimales: 0
    };
    logQuote.env.mercado = logMercadoElegido_();
    logQuote.comision = logComisionNormalizar_(logComisionDesdeCostos_());
    logLayout.filaAlto = {};
    if (!p.hayProyecto) {
        logQuote.filas = logFilasDemo_();
    } else if (typeof esPresupuestoGrupal === "function" && esPresupuestoGrupal()) {
        if (typeof snapshotVersionActual === "function") snapshotVersionActual();
        const ver = logVersiones_().find(function (x) { return String(x.id) === String(p.version); });
        const elems = (ver && ver.elementos) || [];
        logQuote.filas = elems.length
            ? elems.map(function (el) { return logNuevaFilaItem_(p.version, p.codigo, el.id); })
            : [logNuevaFilaItem_(p.version, p.codigo)];
    } else {
        logQuote.filas = [logNuevaFilaItem_(p.version, p.codigo)];
    }
    logIaReiniciar_();
    logOlvidarFirmaInsumos_();
    logDestinoPaisTocado_ = false;
    logDestinoCiudadTocado_ = false;
    logAplicarPaisCliente_();
    const sel = document.getElementById("logMoneda");
    if (sel) sel.value = logQuote.moneda;
    if (!logQuote.trm) logQuote.trm = logTrmDesdeCostos_();
    const inpTrm = document.getElementById("logTRM");
    if (inpTrm) inpTrm.value = logTrm_() || "";
    const dec = document.getElementById("logDecimales");
    if (dec) dec.value = String(logDecimales_());
}

/** Valores que se muestran en una fila: automáticos (ficha + motor de precios) y luego lo editado a mano. */
function logFilaValores_(fila, idioma, escId) {
    const ov = fila.over || {};
    const has = function (k) { return Object.prototype.hasOwnProperty.call(ov, k); };
    /* Contenedor (fila.escId): la ficha ya es de una opción → overrides en claves planas.
     * Legado (una fila, varias opciones): overrides unit:eId / qty:eId. */
    const enContenedor = !!fila.escId;
    const escEfec = escId || fila.escId || "";
    const ek = (!enContenedor && escEfec) ? (":" + escEfec) : "";
    let fuera = false;
    if (escId) {
        if (fila.escId) fuera = fila.escId !== escId;
        else fuera = true; /* zona libre no entra en totales de una opción */
    }
    let loteSel = fila.lote;
    if (!fila.escId && escEfec && fila.opc && Object.prototype.hasOwnProperty.call(fila.opc, escEfec)) loteSel = fila.opc[escEfec];
    if (!loteSel && fila.tipo === "item" && !fila.snap) {
        const pr0 = logPreciosVersion_(fila.ver, fila.elem);
        if (pr0 && pr0.escalas && pr0.escalas[0]) loteSel = pr0.escalas[0].id;
    }
    const v = { tipo: fila.tipo, cod: "", titulo: "", desc: "", dimTxt: "", empTxt: "", qty: 1, unit: null, img: fila.img || "", aviso: "", excl: fuera };
    if (fila.tipo === "seccion" || fila.tipo === "obs" || fila.tipo === "sim3d") {
        v.titulo = has("titulo") ? ov.titulo : (fila.tipo === "sim3d" ? "Vista 3D" : "");
        return v;
    }
    const T = LOG_TEXTOS[idioma];
    if (fila.demo != null) {
        const it = LOG_ITEMS_DEMO[fila.demo % LOG_ITEMS_DEMO.length];
        v.cod = "17999-" + "ABCD".charAt(fila.demo % 4);
        v.titulo = it.nombre[idioma];
        v.desc = it.desc[idioma];
        v.dimTxt = it.dim ? logFmtMedidas_(it.dim, idioma) : "";
        v.empTxt = it.emp ? logFmtMedidas_(it.emp, idioma) + (it.undXEmp ? " · " + it.undXEmp + " " + T.undEmp : "") : "";
        v.qty = it.qty;
        v.unit = it.unit;
    } else if (fila.tipo === "item") {
        /* si la fila viene del historial (snap) se usan los valores congelados al guardar */
        const sn = fila.snap || null;
        const f = sn ? (sn.ficha || {}) : logFichaVersion_(fila.ver, fila.elem);
        const pr = sn ? { trm: sn.trm } : logPreciosVersion_(fila.ver, fila.elem);
        let esc;
        if (sn) {
            esc = Array.isArray(sn.escalas) ? sn.escalas.find(function (e) { return e.id === loteSel; }) : null;
            if (!esc && loteSel === fila.lote && sn.q != null && sn.puCop != null) esc = { q: sn.q, puCop: sn.puCop };
            if (esc && esc.puCop == null) esc = null;
        } else {
            esc = pr ? pr.escalas.find(function (e) { return e.id === loteSel; }) : null;
        }
        const nombreProy = sn ? (sn.nombre || "") : (logisticaLeerProyecto_().nombre || "").replace(/^\S+\s*/, "");
        const umFicha = f.um === "in" ? "in" : "cm";
        const umDoc = logUmCoti_();
        v.cod = fila.proy || "";
        let nomElem = "";
        if (fila.elem) {
            const verEl = logVersiones_().find(function (x) { return logVerIgual_(x.id, fila.ver); });
            const elObj = verEl && verEl.elementos ? verEl.elementos.find(function (e) { return String(e.id) === String(fila.elem); }) : null;
            nomElem = (elObj && elObj.nombre) || "";
        }
        v.titulo = nomElem ? (f.titulo && f.titulo !== nomElem ? nomElem + " — " + f.titulo : nomElem) : (f.titulo || nombreProy);
        v.desc = f.descripcion || "";
        v.dimTxt = logFmtMedidasFicha_(logConvertirUm_([f.dimAncho, f.dimFondo, f.dimAlto], umFicha, umDoc), umDoc, idioma);
        const tiposEmp = logEmpCajasDeFicha_(f);
        const bitsEmp = tiposEmp.map(function (c) {
            const med = logFmtMedidasFicha_(logConvertirUm_([c.ancho, c.fondo, c.alto], umFicha, umDoc), umDoc, idioma);
            if (!med) return "";
            let t = (c.nombre ? String(c.nombre) + " " : "") + med;
            if (Number(c.und) > 0) t += " · " + Number(c.und) + " " + ((T && T.undEmp) || (idioma === "en" ? "units per box" : "und/emp"));
            else if (Number(c.porPieza) > 0) t += " · " + Number(c.porPieza) + (idioma === "en" ? " box/pc" : " caja/pza");
            return t;
        }).filter(Boolean);
        if (bitsEmp.length) v.empTxt = bitsEmp.join(" · ");
        else {
            v.empTxt = logFmtMedidasFicha_(logConvertirUm_([f.empAncho, f.empFondo, f.empAlto], umFicha, umDoc), umDoc, idioma);
            if (v.empTxt && Number(f.empUnd) > 0) v.empTxt += " · " + Number(f.empUnd) + " " + ((T && T.undEmp) || (idioma === "en" ? "units per box" : "und/emp"));
        }
        if (esc) {
            v.qty = esc.q;
            v.unit = logQuote.moneda === "USD" ? esc.puCop / (logTrm_() || pr.trm || 1) : esc.puCop;
        } else {
            v.aviso = "Esta versión no tiene precios calculados (genera la matriz primero).";
        }
    }
    ["cod", "titulo", "desc"].forEach(function (k) { if (has(k)) v[k] = ov[k]; });
    /* lo escrito a mano: contenedor = claves planas; legado multi-opción = unit:eId */
    const ovDe = function (k) {
        if (enContenedor) {
            if (has(k)) return { v: ov[k] };
            if (fila.escId && has(k + ":" + fila.escId)) return { v: ov[k + ":" + fila.escId] };
            return null;
        }
        if (ek && has(k + ek)) return { v: ov[k + ek] };
        if (escEfec && fila.tipo !== "item" && has(k)) return { v: ov[k] };
        if (!escEfec && has(k)) return { v: ov[k] };
        return null;
    };
    const oq = ovDe("qty");
    if (oq) v.qty = oq.v;
    const ou = ovDe("unit");
    if (ou) v.unit = ou.v;
    if (v.excl) { v.qty = null; v.unit = null; v.aviso = ""; }
    else if (typeof v.unit === "number" && !logEsTextoFila_(fila) && !logEsEnvio_(fila)) v.unit = v.unit * logComisionFactor_(fila);
    if (typeof v.unit === "number" && logEsEnvio_(fila) && !logEsCotizacionExterior_()) v.unit = logMonedaDesdeCop_(v.unit);
    if (typeof v.unit === "number") v.unit = logRedondear_(v.unit);
    if (!v.img && fila.tipo === "item") {
        if (fila.elem) {
            /* Pieza de grupal: solo el pin «En cotización», nunca la imagen Grupo/Odoo del proyecto */
            const vivo = logElementoVivoCostos_(fila.proy, fila.elem, v.titulo || (fila.snap && fila.snap.nombre));
            const pin = logPinImgDeElemento_(vivo);
            if (pin && pin.img) v.img = pin.img;
            else if (typeof window.imagenCotizacionElemento === "function") {
                const deElem = window.imagenCotizacionElemento(fila.elem);
                if (deElem) v.img = deElem;
            }
        } else {
            const pinInd = logPinImgIndividualAbierto_(fila.proy, fila.ver);
            if (pinInd && pinInd.img) v.img = pinInd.img;
            else if (logImgOdoo.url && logImgOdoo.codigo === fila.proy) v.img = logImgOdoo.url;
        }
    }
    return v;
}

function logSub_(v) {
    if (v.excl) return null;
    return (typeof v.qty === "number" && typeof v.unit === "number") ? v.qty * v.unit : null;
}

function logColVisible_(k) {
    return logLayout.cols.some(function (c) { return c.k === k; });
}

/** Tabla de ítems completa (colgroup + títulos + filas + total). Se puede regenerar sin recargar la hoja. */
const LOG_NUM_KEYS_ = ["qty", "pu", "sub"];

/** Las mismas columnas que en cantidad única. Con escenarios, qty/pu/sub se apilan (una fila por opción). */
function logGeometriaCols_() {
    const lay = logLayout.cols;
    return {
        esc: logEscList_().length > 0,
        scale: 1,
        cols: lay.map(function (c, i) { return { k: c.k, w: c.w, e: "", li: i, pc: i }; })
    };
}

/** Subtotal de proyectos sin la comisión elegida en esta cotización. Es la base de arancel e impuesto. */
function logBaseLogistica_(idioma, k) {
    let s = 0;
    (logQuote.filas || []).forEach(function (fila) {
        if (logEsTextoFila_(fila) || logEsEnvio_(fila)) return;
        if (k === "" || k == null) {
            if (fila.escId && logEscList_().length) return;
        } else if (fila.escId !== k) {
            return;
        }
        const sub = logSub_(logFilaValores_(fila, idioma, k || ""));
        if (sub == null) return;
        const f = logComisionFactor_(fila) || 1;
        s += sub / f;
    });
    return s;
}

/** Totales partidos: productos, envíos y gran total. Claves = opciones y, si hay fichas libres, "". */
function logTotalesPartes_(idioma) {
    const escs = logEscList_();
    const hayBase = (logQuote.filas || []).some(function (f) {
        return !logEsEnvio_(f) && !logEsTextoFila_(f) && f.tipo !== "sim3d" && !f.escId;
    });
    const claves = escs.length
        ? (hayBase ? [""].concat(escs.map(function (e) { return e.id; })) : escs.map(function (e) { return e.id; }))
        : [""];
    const vacio = function () { const o = {}; claves.forEach(function (k) { o[k] = 0; }); return o; };
    const prod = vacio();
    const env = vacio();
    const gran = vacio();
    logQuote.filas.forEach(function (fila) {
        if (logEsTextoFila_(fila)) return;
        claves.forEach(function (k) {
            /* Clave "": solo fichas de zona libre. Clave de opción: solo esa opción. */
            if (k === "") {
                if (fila.escId) return;
            } else if (fila.escId !== k) {
                return;
            }
            const s = logSub_(logFilaValores_(fila, idioma, k === "" ? "" : k));
            if (s == null) return;
            if (logEsEnvio_(fila)) {
                if (!logEnvActivo_(k || undefined)) return;
                env[k] += s;
            } else prod[k] += s;
            gran[k] += s;
        });
    });
    claves.forEach(function (k) {
        const L = logEnvSuma_(logBaseLogistica_(idioma, k), k || undefined);
        env[k] += L;
        gran[k] += L;
    });
    const desc = vacio();
    claves.forEach(function (k) {
        desc[k] = logDescuentoActivo_(k) ? logRedondear_((prod[k] || 0) * logDescuentoPct_(k) / 100) : 0;
        gran[k] += desc[k];
    });
    return { prod: prod, env: env, gran: gran, desc: desc };
}

/** Cómo se imprime: el % oculto entra a los productos; el visible queda en logística. El gran total no cambia. */
function logEnvPresentacion_(idioma) {
    const partes = logTotalesPartes_(idioma);
    const claves = Object.keys(partes.prod);
    const pres = { prod: {}, env: {}, gran: {}, desc: partes.desc || {}, shares: {} };
    claves.forEach(function (k) {
        const escK = k && String(k).indexOf("r:") === 0 ? "" : k;
        const pct = logEnvModoCosto_(escK) === "resumen" ? logEnvResumenPct_(escK) / 100 : 1;
        const base = partes.prod[k] || 0;
        const L = partes.env[k] || 0;
        const oculto = L * (1 - pct);
        pres.prod[k] = base + oculto;
        pres.env[k] = L - oculto;
        pres.gran[k] = partes.gran[k] || 0;
        logQuote.filas.forEach(function (fila) {
            if (logEsTextoFila_(fila) || logEsEnvio_(fila)) return;
            if (k === "" && fila.escId) return;
            if (k && fila.escId !== k) return;
            const s = logSub_(logFilaValores_(fila, idioma, k || ""));
            pres.shares[k + "|" + fila.uid] = (s != null && base > 0 && oculto) ? oculto * (s / base) : 0;
        });
    });
    return pres;
}

/** Gran total (productos + envíos). Lo usa el historial y el nombre de archivo. */
function logTotales_(idioma) {
    return logTotalesPartes_(idioma).gran;
}

/** Fila del proyecto abierto, sin congelar. El historial (snap) no entra. */
function logFilaSiguePresupuesto_(fila) {
    if (!fila || fila.tipo !== "item" || fila.snap || fila.demo != null) return false;
    if (!logVerIgual_(fila.ver || "V1", window.versionActivaId || "V1")) return false;
    const p = typeof logisticaLeerProyecto_ === "function" ? logisticaLeerProyecto_() : { codigo: "" };
    if (p.codigo && fila.proy && String(fila.proy) !== String(p.codigo)) return false;
    return true;
}

function logFirmaPrecios_(pr) {
    if (!pr || !pr.escalas) return "";
    return pr.escalas.map(function (e) {
        return e.id + ":" + e.q + ":" + Math.round((Number(e.puCop) || 0) * 100);
    }).join("|");
}

function logPrecioEscrito_(fila) {
    if (!fila || !fila.over) return false;
    if (fila.over.unit != null || fila.over.qty != null) return true;
    return Object.keys(fila.over).some(function (k) { return /^(unit|qty):/.test(k); });
}

/** Si el presupuesto cambió, suelta el precio escrito en la hoja para que vuelva a salir el de la matriz. */
function logAlinearPrecioVivo_(fila) {
    if (!logFilaSiguePresupuesto_(fila)) return;
    const pr = logPreciosVersion_(fila.ver, fila.elem);
    const firma = logFirmaPrecios_(pr);
    if (!firma) return;
    if (logPrecioEscrito_(fila) && (!fila.precioFirma || fila.precioFirma !== firma)) {
        delete fila.over.qty;
        Object.keys(fila.over).forEach(function (k) {
            if (/^qty:/.test(k)) delete fila.over[k];
        });
        /* Un precio puesto a mano en Proyectos se queda en la cotización aunque Costos cambie. */
        if (!fila.puFijo) {
            delete fila.over.unit;
            Object.keys(fila.over).forEach(function (k) {
                if (/^unit:/.test(k)) delete fila.over[k];
            });
        }
    }
    fila.precioFirma = firma;
}

function logAlinearPreciosVivos_() {
    (logQuote && logQuote.filas || []).forEach(logAlinearPrecioVivo_);
}

let logPintandoHoja_ = 0;
let logTrasPresupuestoTimer_ = 0;
let logInsumosFirma_ = null;
let logRecalcPendiente_ = false;

function logOlvidarFirmaInsumos_() {
    logInsumosFirma_ = null;
    logRecalcPendiente_ = false;
}

/** Medidas, empaque y cantidades: mueven el cubicaje y los contenedores. */
function logFirmaCargaLog_() {
    const bits = [];
    let sis = "metrico";
    try { sis = localeProyectoActual().sistema; } catch (e) { /* cm */ }
    bits.push("sis:" + sis);
    (logQuote.filas || []).forEach(function (fila) {
        if (!fila || fila.tipo !== "item" || fila.snap || fila.demo != null) return;
        if (!logFilaSiguePresupuesto_(fila)) return;
        const f = logFichaVersion_(fila.ver, fila.elem) || {};
        const pr = logPreciosVersion_(fila.ver, fila.elem);
        const qs = (pr && pr.escalas) ? pr.escalas.map(function (e) { return e.id + ":" + e.q; }).join(",") : "";
        const empKey = Array.isArray(f.empCajas) && f.empCajas.length
            ? f.empCajas.map(function (c) {
                return [c.nombre, c.ancho, c.fondo, c.alto, c.und, c.peso, c.porPieza].join(",");
            }).join("|")
            : [f.empAncho, f.empFondo, f.empAlto, f.empUnd, f.empPeso].join(",");
        bits.push([fila.uid, f.um || sis, f.dimAncho, f.dimFondo, f.dimAlto, empKey, qs].join("~"));
    });
    return bits.join("||");
}

/** Precio y TRM: mueven seguro, cargos en % y el valor EXW. */
function logFirmaValorLog_() {
    const trmEl = document.getElementById("simTRM");
    const bits = ["trm:" + ((trmEl && trmEl.value) || "")];
    (logQuote.filas || []).forEach(function (fila) {
        if (!fila || fila.tipo !== "item" || fila.snap || fila.demo != null) return;
        if (!logFilaSiguePresupuesto_(fila)) return;
        const pr = logPreciosVersion_(fila.ver, fila.elem);
        bits.push(fila.uid + "~" + logFirmaPrecios_(pr));
    });
    return bits.join("||");
}

function logHayCalculoLog_() {
    if (logIa && (logIa.analizado || logIa.diagnostico)) return true;
    const lineas = (logQuote && logQuote.env && logQuote.env.lineas) || [];
    const porEsc = (logQuote && logQuote.env && logQuote.env.porEsc) || {};
    return lineas.some(function (ln) {
        if ((ln.fuente === "[Catálogo]" || ln.fuente === "[Estimado IA]") && (ln.valor != null || ln.notas)) return true;
        return Object.keys(porEsc).some(function (k) {
            const st = porEsc[k] || {};
            return st.fuentes && (st.fuentes[ln.id] === "[Catálogo]" || st.fuentes[ln.id] === "[Estimado IA]");
        });
    });
}

function logBorrarCalculoLog_(resetCont) {
    const e = logEnv_();
    (e.lineas || []).forEach(function (ln) {
        const esCat = ln.fuente === "[Catálogo]" || ln.fuente === "[Estimado IA]";
        let esCatEsc = false;
        if (e.porEsc) Object.keys(e.porEsc).forEach(function (k) {
            const st = e.porEsc[k];
            if (st.fuentes && (st.fuentes[ln.id] === "[Catálogo]" || st.fuentes[ln.id] === "[Estimado IA]")) {
                esCatEsc = true;
                if (esCat || esCatEsc) { delete st.valores[ln.id]; delete st.fuentes[ln.id]; delete st.notas[ln.id]; }
            }
        });
        if (!esCat && !esCatEsc) return;
        ln.valor = null;
        ln.notas = "";
        ln.fuente = "";
    });
    if (resetCont && e) {
        if (!e.contenedoresManual) e.contenedores = { c20: 0, c40: 0, c40hc: 0 };
        if (e.porEsc) Object.keys(e.porEsc).forEach(function (k) {
            const st = e.porEsc[k];
            if (st && !st.contenedoresManual) st.contenedores = { c20: 0, c40: 0, c40hc: 0 };
        });
    }
    if (logIa) {
        if (logIa.historial && logIa.historial.length) {
            logIa.historial.push({ role: "nota", text: "El presupuesto cambió. Este análisis ya no aplica. Pulsa Análisis costos logísticos otra vez." });
        }
        logIa.analizado = false;
        logIa.diagnostico = "";
        logIa.sugerencia = "";
        logIa.motivo = "";
        logIa.fase = logIa.historial && logIa.historial.length ? "entrevista" : "inicio";
    }
    logRecalcPendiente_ = true;
    if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
    if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion("El presupuesto cambió. Borré el cálculo logístico de este borrador. Hay que analizarlo otra vez.", "warning");
    }
    if (typeof logIaPintar_ === "function") logIaPintar_();
}

/** Borrador sin guardar: si Costos mueve medidas, cantidad o precio, el cálculo logístico deja de servir. */
function logRevisarInsumosLog_() {
    if (!logQuote || !logQuote.inicializado) return;
    const firma = logFirmaCargaLog_() + "#" + logFirmaValorLog_();
    if (logQuote.abierta) {
        logInsumosFirma_ = firma;
        return;
    }
    if (logInsumosFirma_ == null) {
        logInsumosFirma_ = firma;
        return;
    }
    if (logInsumosFirma_ === firma) return;
    const prevCarga = logInsumosFirma_.split("#")[0];
    const carga = firma.split("#")[0];
    logInsumosFirma_ = firma;
    if (!logHayCalculoLog_()) return;
    logBorrarCalculoLog_(carga !== prevCarga);
}

function logisticaTrasPresupuesto_() {
    if (!logQuote || !logQuote.inicializado) return;
    if (logTrasPresupuestoTimer_) clearTimeout(logTrasPresupuestoTimer_);
    logTrasPresupuestoTimer_ = setTimeout(function () {
        logTrasPresupuestoTimer_ = 0;
        try { if (typeof snapshotVersionActual === "function") snapshotVersionActual(); } catch (e) { /* sigue con la matriz en memoria */ }
        logRevisarInsumosLog_();
        logComisionSincronizarDesdeCostos_();
        logAlinearPreciosVivos_();
        if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
    }, 40);
}

function logisticaTablaHTML_(idioma) {
    logAsegurarFilas_();
    logNormalizarFilasSim3dFuera_();
    logAlinearPreciosVivos_();
    logEnvAsegurarLineas_(idioma === "en");
    const T = LOG_TEXTOS[idioma];
    const esEn = idioma === "en";
    const geo = logGeometriaCols_();
    const cols = geo.cols;
    const n = cols.length;
    const escs = geo.esc ? logEscList_() : [];
    const mon = logQuote.moneda;
    const nd = logDecimales_();
    let pres = logEnvPresentacion_(idioma);
    const edr = function (fila, campo, valor, ph, e) {
        return "<span class=\"ed\" data-r=\"" + fila.uid + "\" data-f=\"" + campo + "\"" + (e ? " data-e=\"" + e + "\"" : "") + " data-ph=\"" + logEsc_(ph) + "\">" + logEsc_(valor) + "</span>";
    };
    const edTit = function (clave, texto) {
        return "<span class=\"ed\" data-env=\"" + clave + "\">" + logEsc_(texto) + "</span>";
    };
    const celdaNum_ = function (c, fila, ve, eId) {
        const ea = eId ? " data-e=\"" + eId + "\"" : "";
        if (ve.excl) return "<td class=\"r x\" data-k=\"" + c.k + "\"" + ea + ">—</td>";
        let sub = logSub_(ve);
        const share = pres.shares[(eId || "") + "|" + fila.uid] || 0;
        if (sub != null && share) sub += share;
        let unit = (sub != null && ve.qty) ? sub / ve.qty : ve.unit;
        if (typeof unit === "number") {
            unit = logRedondear_(unit);
            sub = ve.qty != null ? logRedondear_(unit * ve.qty) : logRedondear_(sub);
        }
        if (c.k === "qty") return "<td class=\"r\" data-k=\"qty\"" + ea + ">" + edr(fila, "qty", ve.qty == null ? "" : logFmtNum_(ve.qty, idioma, Number.isInteger(ve.qty) ? 0 : 2), "0", eId) + "</td>";
        if (c.k === "pu") {
            const precio = unit == null ? "" : logFmtMoneda_(unit, idioma, nd);
            /* Con flete escondido en el precio, editarlo guardaría el flete como venta. Se cambia en Detalle. */
            if (share) {
                const aviso = esEn
                    ? "This price includes prorated logistics. Switch costs to Detail to edit it."
                    : "Este precio incluye logística prorrateada. Pasa los costos a Detalle para editarlo.";
                return "<td class=\"r\" data-k=\"pu\"" + ea + "><span class=\"pu-lock\" title=\"" + logEsc_(aviso) + "\">" + logEsc_(precio) + "</span></td>";
            }
            return "<td class=\"r\" data-k=\"pu\"" + ea + ">" + edr(fila, "unit", precio, "$ 0", eId) + "</td>";
        }
        return "<td class=\"r\" data-k=\"sub\"" + ea + ">" + (sub == null ? "" : logFmtMoneda_(sub, idioma, nd)) + "</td>";
    };
    /**
     * Zona libre (sin escId): varias Q se apilan solo si comparten proyecto y render.
     * Render distinto → líneas aparte. Dentro de una opción: sin agrupar.
     */
    /* Vista 3D vive fuera de contenedores (sin escId) pero NO es zona libre de rangos:
     * si entra aquí, aparece un Subtotal/Gran Total $0 antes de la Opción 1. */
    const listaBase = (logQuote.filas || []).filter(function (f) {
        return !logEsEnvio_(f) && f.tipo !== "sim3d" && (!escs.length || !f.escId);
    });
    const logRangosBase_ = function (lista) {
        const items = (lista || []).filter(function (f) { return f.tipo === "item" || f.tipo === "libre"; });
        if (items.length < 2) return null;
        const claves = items.map(logClaveAgrupacionZonaLibre_);
        if (!claves[0] || !claves.every(function (c) { return c && c === claves[0]; })) return null;
        return items;
    };
    const rangosBase = logRangosBase_(listaBase);
    const rangosUnica = !escs.length ? rangosBase : null;
    const renderListaAgrupada_ = function (listaU, conSalto) {
        let html = "";
        let iu = 0;
        while (iu < listaU.length) {
            const fila = listaU[iu];
            const v0 = logFilaValores_(fila, idioma, "");
            if (fila.tipo === "sim3d") { iu++; continue; /* tras gran total */ }
            if (fila.tipo === "seccion" || fila.tipo === "obs") {
                const phSec = fila.tipo === "obs"
                    ? (esEn ? "Observations" : "Observaciones")
                    : (esEn ? "Section title" : "Título de la sección");
                html += "<tr class=\"" + (fila.tipo === "obs" ? "obs" : "sec") + "\" data-r=\"" + fila.uid + "\"><td colspan=\"" + n + "\">" +
                    edr(fila, "titulo", v0.titulo, phSec) + "</td></tr>";
                iu++;
                continue;
            }
            const clave = logClaveAgrupacionZonaLibre_(fila);
            const grupo = [fila];
            if (clave) {
                while (iu + grupo.length < listaU.length) {
                    const nxt = listaU[iu + grupo.length];
                    if (logEsTextoFila_(nxt) || logClaveAgrupacionZonaLibre_(nxt) !== clave) break;
                    grupo.push(nxt);
                }
            }
            const rs = grupo.length;
            const alto = logLayout.filaAlto[grupo[0].uid] || LOG_ALTO_IMG_DEFAULT_IN;
            const tx = logTexto_();
            let medidas = "";
            if (tx.medidas) {
                if (v0.dimTxt) medidas += "<div class=\"it-med\"><b>" + logEsc_(T.dim) + ":</b> " + logEsc_(v0.dimTxt) + "</div>";
                if (v0.empTxt) medidas += "<div class=\"it-med\"><b>" + logEsc_(T.emp) + ":</b> " + logEsc_(v0.empTxt) + "</div>";
            }
            grupo.forEach(function (fG, gi) {
                const ve = logFilaValores_(fG, idioma, "");
                const celdas = cols.map(function (c) {
                    if (LOG_NUM_KEYS_.indexOf(c.k) >= 0) return celdaNum_(c, fG, ve, "");
                    if (gi > 0) return "";
                    const span = rs > 1 ? " rowspan=\"" + rs + "\"" : "";
                    if (c.k === "img") {
                        return "<td class=\"c td-img\" data-k=\"img\"" + span + " style=\"height:" + (alto + 0.12).toFixed(3) + "in\">" +
                            "<img class=\"thumb\" data-r=\"" + fG.uid + "\" style=\"height:" + alto.toFixed(3) + "in\" src=\"" + logEsc_(v0.img || LOG_THUMB_SVG_) + "\" alt=\"\"></td>";
                    }
                    if (c.k === "cod") return "<td class=\"c\" data-k=\"cod\"" + span + ">" + edr(fG, "cod", v0.cod, esEn ? "Code" : "Código") + "</td>";
                    let bloque = "";
                    if (tx.titulo) bloque += "<div class=\"it-nom\">" + edr(fG, "titulo", v0.titulo, esEn ? "Title" : "Título") + "</div>";
                    if (tx.desc === "full") bloque += "<div class=\"it-desc\">" + edr(fG, "desc", v0.desc, esEn ? "Description" : "Descripción") + "</div>";
                    else if (tx.desc === "lite") {
                        const lite = logDescLite_(v0.desc);
                        bloque += "<div class=\"it-desc it-desc-lite\" title=\"" + logEsc_(v0.desc) + "\">" + logEsc_(lite) + "</div>";
                    }
                    return "<td data-k=\"desc\"" + span + ">" + bloque + medidas + "</td>";
                }).join("");
                const esSalto = !!(conSalto && !html && !gi);
                html += "<tr class=\"it" + (gi ? " it-cont" : "") + (esSalto ? " esc-salto" : "") + "\"" +
                    (esSalto ? " data-salto=\"1\"" : "") + " data-r=\"" + fG.uid + "\">" + celdas + "</tr>";
            });
            iu += grupo.length;
        }
        return html;
    };
    let filasHtml = "";
    /* Zona libre: agrupa solo mismo proyecto + mismo render. Con opciones, solo fichas sin escId. */
    if (listaBase.length) filasHtml += renderListaAgrupada_(listaBase, !!logQuote.baseHojaNueva);
    const logOn = logEnvActivo_();
    const enviosAll = logQuote.filas.filter(logEsEnvio_);
    const envios = logOn ? enviosAll : [];
    const hayProducto = logQuote.filas.some(function (f) { return f.tipo !== "envio"; });
    if (!hayProducto && !envios.length) {
        filasHtml = "<tr class=\"vacio\"><td colspan=\"" + n + "\" style=\"text-align:center;color:#9e9e9e;padding:18px\">" +
            (esEn ? "No rows yet: use “Add row”." : "Aún no hay filas: usa «Agregar fila».") + "</td></tr>";
    }
    let partes = logTotalesPartes_(idioma);
    let tClaves = escs.length ? escs.map(function (e) { return e.id; }) : [""];
    let presBaseRangos = null;
    let tClavesBase = [""];
    /* Varias Q del mismo proyecto en zona libre: totales apilados por rango (no se suman). */
    if (rangosBase) {
        tClavesBase = rangosBase.map(function (f) { return "r:" + f.uid; });
        const vac = function () { const o = {}; tClavesBase.forEach(function (k) { o[k] = 0; }); return o; };
        const partesB = { prod: vac(), env: vac(), gran: vac(), desc: vac() };
        rangosBase.forEach(function (fila, idx) {
            const k = "r:" + fila.uid;
            const sub = logSub_(logFilaValores_(fila, idioma, "")) || 0;
            partesB.prod[k] = sub;
            const L = logEnvActivo_("") ? logEnvSuma_(logBaseLogistica_(idioma, ""), "") : 0;
            partesB.env[k] = idx === 0 ? L : 0;
            const desc = logDescuentoActivo_("") ? logRedondear_(sub * logDescuentoPct_("") / 100) : 0;
            partesB.desc[k] = desc;
            partesB.gran[k] = sub + partesB.env[k] + desc;
        });
        const pctVis = logEnvModoCosto_("") === "resumen" ? (logEnvResumenPct_("") / 100) : 1;
        presBaseRangos = { prod: {}, env: {}, gran: {}, desc: partesB.desc, shares: {} };
        tClavesBase.forEach(function (k) {
            const base = partesB.prod[k] || 0;
            const L = partesB.env[k] || 0;
            const oculto = L * (1 - pctVis);
            presBaseRangos.prod[k] = base + oculto;
            presBaseRangos.env[k] = L - oculto;
            presBaseRangos.gran[k] = partesB.gran[k] || 0;
        });
        if (rangosUnica) {
            tClaves = tClavesBase;
            partes = partesB;
            pres = presBaseRangos;
        }
    }
    const filaMontos_ = function (cls, kind, etiquetaHtml, montos) {
        let html = "";
        tClaves.forEach(function (k, i) {
            const lab = i === 0
                ? "<td colspan=\"" + (n - 1) + "\" class=\"r\"" + (tClaves.length > 1 ? " rowspan=\"" + tClaves.length + "\"" : "") + ">" + etiquetaHtml + "</td>"
                : "";
            html += "<tr class=\"" + cls + "\">" + lab + "<td class=\"r tot-val\" data-kind=\"" + kind + "\" data-e=\"" + k + "\">" +
                logFmtMoneda_(montos[k] || 0, idioma, nd) + "</td></tr>";
        });
        return html;
    };
    const filaMonto1_ = function (cls, kind, etiquetaHtml, monto, k) {
        return "<tr class=\"" + cls + "\"><td colspan=\"" + (n - 1) + "\" class=\"r\">" + etiquetaHtml + "</td><td class=\"r tot-val\" data-kind=\"" + kind + "\" data-e=\"" + k + "\">" +
            logFmtMoneda_(monto || 0, idioma, nd) + "</td></tr>";
    };
    /* Dentro de una opción: cada ficha independiente (sin rowspan / sin compartir render). */
    const filasProductoEsc_ = function (k) {
        let h = "";
        logFilasDeEsc_(k).filter(function (f) { return !!f.escId; }).forEach(function (fila) {
            const v = logFilaValores_(fila, idioma, k);
            if (fila.tipo === "sim3d") return; /* se imprime después del gran total */
            if (fila.tipo === "seccion" || fila.tipo === "obs") {
                const phSec = fila.tipo === "obs"
                    ? (esEn ? "Observations" : "Observaciones")
                    : (esEn ? "Section title" : "Título de la sección");
                h += "<tr class=\"" + (fila.tipo === "obs" ? "obs" : "sec") + "\" data-r=\"" + fila.uid + "\" data-e=\"" + k + "\"><td colspan=\"" + n + "\">" +
                    edr(fila, "titulo", v.titulo, phSec) + "</td></tr>";
                return;
            }
            const alto = logLayout.filaAlto[fila.uid] || LOG_ALTO_IMG_DEFAULT_IN;
            const tx = logTexto_();
            let medidas = "";
            if (tx.medidas) {
                if (v.dimTxt) medidas += "<div class=\"it-med\"><b>" + logEsc_(T.dim) + ":</b> " + logEsc_(v.dimTxt) + "</div>";
                if (v.empTxt) medidas += "<div class=\"it-med\"><b>" + logEsc_(T.emp) + ":</b> " + logEsc_(v.empTxt) + "</div>";
            }
            const celdas = cols.map(function (c) {
                if (LOG_NUM_KEYS_.indexOf(c.k) >= 0) return celdaNum_(c, fila, v, k);
                if (c.k === "img") {
                    return "<td class=\"c td-img\" data-k=\"img\" style=\"height:" + (alto + 0.12).toFixed(3) + "in\">" +
                        "<img class=\"thumb\" data-r=\"" + fila.uid + "\" style=\"height:" + alto.toFixed(3) + "in\" src=\"" + logEsc_(v.img || LOG_THUMB_SVG_) + "\" alt=\"\"></td>";
                }
                if (c.k === "cod") return "<td class=\"c\" data-k=\"cod\">" + edr(fila, "cod", v.cod, esEn ? "Code" : "Código") + "</td>";
                let bloque = "";
                if (tx.titulo) bloque += "<div class=\"it-nom\">" + edr(fila, "titulo", v.titulo, esEn ? "Title" : "Título") + "</div>";
                if (tx.desc === "full") bloque += "<div class=\"it-desc\">" + edr(fila, "desc", v.desc, esEn ? "Description" : "Descripción") + "</div>";
                else if (tx.desc === "lite") {
                    const lite = logDescLite_(v.desc);
                    bloque += "<div class=\"it-desc it-desc-lite\" title=\"" + logEsc_(v.desc) + "\">" + logEsc_(lite) + "</div>";
                }
                return "<td data-k=\"desc\">" + bloque + medidas + "</td>";
            }).join("");
            h += "<tr class=\"it\" data-r=\"" + fila.uid + "\" data-e=\"" + k + "\">" + celdas + "</tr>";
        });
        return h;
    };
    const bloqueSeccionEsc_ = function (e, idx) {
        const k = e.id;
        const nombreOp = logEscNombre_(e, idx, idioma);
        const cubK = logCubicajeTotal_(idioma, k);
        const pesoK = Math.max(Number(cubK.pesoKg) || 0, Number(cubK.kgVol) || 0);
        const detFlete = logEnvDetalleFlete_(esEn, k);
        let cab = (esEn ? "OPTION " : "OPCIÓN ") + (idx + 1) + (e.nombre && String(e.nombre).trim() ? " — " + String(e.nombre).trim().toUpperCase() : "");
        const salto = !!e.hojaNueva && (idx > 0 || listaBase.length > 0);
        let h = "<tr class=\"sec esc-sec" + (salto ? " esc-salto" : "") + "\"" + (salto ? " data-salto=\"1\"" : "") + "><td colspan=\"" + n + "\">" + logEsc_(cab) + "</td></tr>";
        h += filasProductoEsc_(k);
        const logOnK = logEnvActivo_(k);
        const enviosK = logOnK ? enviosAll.filter(function (fila) {
            return !logFilaValores_(fila, idioma, k).excl;
        }) : [];
        const envLineasK = logOnK ? logEnvLineasDeEsc_(k, esEn).filter(function (ln) {
            if (ln.tipo === "libre" && !String(ln.concepto || "").trim() && ln.valor == null) return false;
            return true;
        }) : [];
        const hayLogK = enviosK.length || envLineasK.length;
        const descOnK = logDescuentoActivo_(k);
        if (hayLogK || (descOnK && logQuote.filas.length)) {
            h += filaMonto1_("tot tot-sub tot-prod", "prod", edTit("titSubProd", logEnvTitulo_("prod", T, mon, esEn, k)), pres.prod[k], k);
        }
        if (descOnK && logQuote.filas.length) {
            h += filaMonto1_("tot tot-desc", "desc", edTit("titDesc", logDescuentoEtiqueta_(esEn)) + logDescuentoNotaHtml_(), (pres.desc || {})[k], k);
        }
        if (hayLogK) {
            let titLog = (T.secEnvios || "Logística") + " — " + nombreOp;
            if (detFlete) titLog += " · " + detFlete;
            /* Si el detalle ya trae m³ (LCL) o kg (aéreo), no repetir. En FCL sí suman volumen/peso. */
            const modK = logEnvModalidad_(k);
            if (modK === "fcl" || !detFlete) {
                if (Number(cubK.m3) > 0) titLog += " · " + logFmtM3_(cubK.m3, idioma);
                if (pesoK > 0) titLog += " · " + logFmtNum_(Math.round(pesoK * 100) / 100, idioma, 2) + " kg";
            }
            h += "<tr class=\"sec-gap\"><td colspan=\"" + n + "\"></td></tr>";
            h += "<tr class=\"sec\"><td colspan=\"" + n + "\">" + logEsc_(titLog) + "</td></tr>";
            if (logEnvModoCosto_(k) === "resumen") {
                h += filaMonto1_("it it-env", "env", edTit("titSubLog", logEnvTituloResumen_(T, mon, esEn, k)), pres.env[k], k);
            } else {
                enviosK.forEach(function (fila) {
                    const v0 = logFilaValores_(fila, idioma, k);
                    h += filaMonto1_("it it-env", "env", edr(fila, "titulo", v0.titulo, esEn ? "Freight" : "Envío"), logSub_(v0) || 0, k);
                });
                logEnvFilasImpresas_(envLineasK, esEn, k).forEach(function (item) {
                    const base = logBaseLogistica_(idioma, k);
                    let monto = 0;
                    if (item.grupo) {
                        let s = 0, alguna = false;
                        item.grupo.forEach(function (ln) {
                            const v = logEnvValorLinea_(ln, base, k);
                            if (v == null) return;
                            s += v; alguna = true;
                        });
                        monto = alguna ? s : 0;
                    } else {
                        const v = logEnvValorLinea_(item.ln, base, k);
                        monto = v == null ? 0 : v;
                    }
                    h += filaMonto1_("it it-env", "env", logEsc_(item.label), monto, k);
                });
                if (envLineasK.length + enviosK.length > 1) {
                    h += filaMonto1_("tot tot-sub tot-log", "env", edTit("titSubLog", logEnvTitulo_("log", T, mon, esEn, k)), pres.env[k], k);
                }
            }
        }
        if (mostrarGran) {
            h += filaMonto1_("tot gran", "gran", edTit("titGran", logEnvTitulo_("gran", T, mon, esEn, k)), pres.gran[k], k);
            if (typeof logPagoAsegurar_ === "function") {
                const pago = logPagoDeEsc_(k);
                if (pago.iva || pago.anticipo) {
                    const m = logPagoMontos_((pres.gran && pres.gran[k]) || 0, k);
                    if (pago.iva) h += filaMonto1_("tot tot-pago", "pago", edTit("titConIva", logPagoEtiqueta_("conIva", esEn, mon)), m.conIva, k);
                    if (pago.anticipo) {
                        h += filaMonto1_("tot tot-pago", "pago", edTit("titAnt", logPagoEtiqueta_("anticipo", esEn, mon)), m.anticipo, k);
                        h += filaMonto1_("tot tot-pago", "pago", edTit("titSaldo", logPagoEtiqueta_("saldo", esEn, mon)), m.saldo, k);
                    }
                }
            }
        }
        /* Vista 3D justo después del Gran Total / pago de esta opción (fuera del bucket sortable). */
        h += logSim3dHtmlTrasGran_(k, n, esEn);
        return h;
    };
    const mostrarGran = !!logQuote.totales && logQuote.filas.length;
    const envLineas = logOn ? logEnv_().lineas.filter(function (ln) {
        if (ln.tipo === "libre" && !String(ln.concepto || "").trim() && ln.valor == null) return false;
        return true;
    }) : [];
    const hayLog = envios.length || envLineas.length;
    let bloqueLog = "";
    const descOn = logDescuentoActivo_();
    if (hayLog) {
        bloqueLog += filaMontos_("tot tot-sub tot-prod", "prod", edTit("titSubProd", logEnvTitulo_("prod", T, mon, esEn)), pres.prod);
    } else if (descOn && logQuote.filas.length) {
        bloqueLog += filaMontos_("tot tot-sub tot-prod", "prod", edTit("titSubProd", logSufijoMon_(esEn ? "SUBTOTAL PRICE" : "PRECIO SUBTOTAL", mon)), pres.prod);
    }
    if (descOn && logQuote.filas.length) {
        bloqueLog += filaMontos_("tot tot-desc", "desc", edTit("titDesc", logDescuentoEtiqueta_(esEn)) + logDescuentoNotaHtml_(), pres.desc || {});
    }
    if (hayLog) {
        bloqueLog += "<tr class=\"sec-gap\"><td colspan=\"" + n + "\"></td></tr>";
        bloqueLog += "<tr class=\"sec\"><td colspan=\"" + n + "\">" + logEsc_(T.secEnvios) + "</td></tr>";
        if (logEnvModoCosto_("") === "resumen") {
            bloqueLog += filaMontos_("it it-env", "env", edTit("titSubLog", logEnvTituloResumen_(T, mon, esEn)), pres.env);
        } else {
            envios.forEach(function (fila) {
                const v0 = logFilaValores_(fila, idioma, "");
                const montos = {};
                tClaves.forEach(function (k) { montos[k] = logSub_(logFilaValores_(fila, idioma, k)) || 0; });
                bloqueLog += filaMontos_("it it-env", "env", edr(fila, "titulo", v0.titulo, esEn ? "Freight" : "Envío"), montos);
            });
            logEnvFilasImpresas_(envLineas, esEn).forEach(function (item) {
                const montos = {};
                tClaves.forEach(function (k) {
                    const base = logBaseLogistica_(idioma, k);
                    if (item.grupo) {
                        let s = 0;
                        let alguna = false;
                        item.grupo.forEach(function (ln) {
                            const v = logEnvValorLinea_(ln, base, k);
                            if (v == null) return;
                            s += v;
                            alguna = true;
                        });
                        montos[k] = alguna ? s : 0;
                    } else {
                        const v = logEnvValorLinea_(item.ln, base, k);
                        montos[k] = v == null ? 0 : v;
                    }
                });
                bloqueLog += filaMontos_("it it-env", "env", logEsc_(item.label), montos);
            });
            if (envLineas.length + envios.length > 1) {
                bloqueLog += filaMontos_("tot tot-sub tot-log", "env", edTit("titSubLog", logEnvTitulo_("log", T, mon, esEn)), pres.env);
            }
        }
    }
    /* Vista 3D: tras el Gran Total de cada opción (bloqueSeccionEsc_) o del único Gran Total. */
    let totalHtml = "";
    if (escs.length) {
        /* Totales de zona libre solo si hay productos/rangos reales (no filas vacías ni Vista 3D). */
        const listaBaseProd = listaBase.filter(function (f) {
            return f && (f.tipo === "item" || f.tipo === "libre");
        });
        if (listaBaseProd.length) {
            const tClavesSave = tClaves;
            const bag = presBaseRangos || {
                prod: { "": (pres.prod && pres.prod[""]) || 0 },
                env: { "": (pres.env && pres.env[""]) || 0 },
                gran: { "": (pres.gran && pres.gran[""]) || 0 },
                desc: { "": (pres.desc && (pres.desc[""] || 0)) || 0 }
            };
            tClaves = presBaseRangos ? tClavesBase : [""];
            if (hayLog || descOn) {
                filasHtml += filaMontos_("tot tot-sub tot-prod", "prod", edTit("titSubProd", logEnvTitulo_("prod", T, mon, esEn)), bag.prod);
            }
            if (descOn) {
                filasHtml += filaMontos_("tot tot-desc", "desc", edTit("titDesc", logDescuentoEtiqueta_(esEn)) + logDescuentoNotaHtml_(), bag.desc || {});
            }
            if (mostrarGran) {
                filasHtml += filaMontos_("tot gran", "gran", edTit("titGran", logEnvTitulo_("gran", T, mon, esEn)), bag.gran);
            }
            tClaves = tClavesSave;
        }
        filasHtml += escs.map(function (e, idx) { return bloqueSeccionEsc_(e, idx); }).join("");
    } else {
        filasHtml += bloqueLog;
        if (mostrarGran) totalHtml += filaMontos_("tot gran", "gran", edTit("titGran", logEnvTitulo_("gran", T, mon, esEn)), pres.gran);
    }
    if (!escs.length && mostrarGran && typeof logPagoAsegurar_ === "function") {
        const pago = logPagoAsegurar_();
        if (pago.iva || pago.anticipo) {
            const conIva = {}, ant = {}, sal = {};
            tClaves.forEach(function (k) {
                const m = logPagoMontos_((pres.gran && pres.gran[k]) || 0);
                conIva[k] = m.conIva;
                ant[k] = m.anticipo;
                sal[k] = m.saldo;
            });
            if (pago.iva) totalHtml += filaMontos_("tot tot-pago", "pago", edTit("titConIva", logPagoEtiqueta_("conIva", esEn, mon)), conIva);
            if (pago.anticipo) {
                totalHtml += filaMontos_("tot tot-pago", "pago", edTit("titAnt", logPagoEtiqueta_("anticipo", esEn, mon)), ant);
                totalHtml += filaMontos_("tot tot-pago", "pago", edTit("titSaldo", logPagoEtiqueta_("saldo", esEn, mon)), sal);
            }
        }
    }
    /* Sin opciones: Vista 3D inmediatamente después del Gran Total (y pago). */
    if (!escs.length) totalHtml += logSim3dHtmlTrasGran_("", n, esEn);
    const colgroup = "<colgroup>" + cols.map(function (c) { return "<col style=\"width:" + c.w + "%\">"; }).join("") + "</colgroup>";
    const rzAttr = function (idx) {
        if (idx >= cols.length - 1) return "";
        return " data-rz=\"" + cols[idx].li + "\" data-rz2=\"" + cols[idx + 1].li + "\" data-pc=\"" + cols[idx].pc + "\" data-pc2=\"" + cols[idx + 1].pc + "\" data-sc=\"1\"";
    };
    const logThHtml_ = function (c) {
        const b = "<br>";
        if (c.k === "cod") return esEn ? "Project" + b + "code" : "Código de" + b + "proyecto";
        if (c.k === "pu") return (esEn ? "Unit" + b + "price" : "Precio" + b + "unitario") + " · " + logEsc_(mon);
        if (c.k === "sub") return esEn ? "Subtotal" + b + "price" : "Precio" + b + "subtotal";
        return logEsc_(T.cols[c.k] || c.k);
    };
    const thead = "<thead><tr>" + cols.map(function (c, i) {
        return "<th data-c=\"" + c.k + "\"" + rzAttr(i) + ">" + logThHtml_(c) + "</th>";
    }).join("") + "</tr></thead>";
    return "<table class=\"items\">" + colgroup + thead + "<tbody>" + filasHtml + totalHtml + "</tbody></table>";
}

/** Recalcula subtotales y total sobre la hoja ya pintada (mientras se escribe, sin perder el foco). */
function logisticaRecalcularCeldas_(doc) {
    const idioma = logisticaLeerOpciones_().idioma;
    const nd = logDecimales_();
    const claves = logEscList_().length ? logEscList_().map(function (e) { return e.id; }) : [""];
    claves.forEach(function (k) {
        logQuote.filas.forEach(function (fila) {
            if (logEsTextoFila_(fila)) return;
            const sub = logSub_(logFilaValores_(fila, idioma, k));
            const td = doc.querySelector("tr.it[data-r=\"" + fila.uid + "\"] td[data-k=\"sub\"]" + (k ? "[data-e=\"" + k + "\"]" : ""));
            if (td && !td.classList.contains("x")) td.textContent = sub == null ? "" : logFmtMoneda_(sub, idioma, nd);
        });
    });
    const pres = logEnvPresentacion_(idioma);
    doc.querySelectorAll(".tot-val").forEach(function (tt) {
        const kind = tt.getAttribute("data-kind") || "gran";
        const bag = pres[kind] || pres.gran;
        const v = bag[tt.getAttribute("data-e") || ""];
        if (v != null) tt.textContent = logFmtMoneda_(v, idioma, nd);
    });
}

/** Regenera solo la tabla dentro de la hoja (conserva el scroll y lo escrito en cabecera/firma). */
function logisticaRefrescarTabla_() {
    /* La hoja se vuelve a armar entera: así el orden, el alta, la baja y el duplicado se ven al momento. */
    if (!logFrameListo) { logRefrescoPend = true; logisticaPintarFilas_(); return; }
    logisticaActualizarVista();
}

/* --- columnas visibles (se reparte el 100 % entre las que quedan) --- */

function logisticaAlternarColumna_(k, on) {
    const cols = logLayout.cols;
    const idx = cols.findIndex(function (c) { return c.k === k; });
    if (!on) {
        if (idx < 0 || cols.length <= 2) return false;
        const w = cols[idx].w;
        cols.splice(idx, 1);
        cols.forEach(function (c) { c.w = +(c.w * 100 / (100 - w)).toFixed(2); });
    } else {
        if (idx >= 0) return true;
        const def = LOG_COLUMNAS_DEMO.find(function (c) { return c.k === k; });
        if (!def) return false;
        const suma = cols.reduce(function (a, c) { return a + c.w; }, 0) || 100;
        cols.forEach(function (c) { c.w = +(c.w * (100 - def.w) / suma).toFixed(2); });
        const orden = LOG_COLUMNAS_DEMO.map(function (c) { return c.k; });
        let pos = cols.findIndex(function (c) { return orden.indexOf(c.k) > orden.indexOf(k); });
        if (pos < 0) pos = cols.length;
        cols.splice(pos, 0, { k: k, w: def.w });
    }
    const dif = +(100 - cols.reduce(function (a, c) { return a + c.w; }, 0)).toFixed(2);
    cols[cols.length - 1].w = +(cols[cols.length - 1].w + dif).toFixed(2);
    return true;
}

function logisticaPintarColumnas_() {
    document.querySelectorAll("#logColsMenu input[data-col]").forEach(function (chk) {
        chk.checked = logColVisible_(chk.getAttribute("data-col"));
    });
    const tot = document.getElementById("logTotChk");
    if (tot) tot.checked = !!logQuote.totales;
    const tx = logTexto_();
    const tit = document.getElementById("logTxtTitulo");
    const med = document.getElementById("logTxtMedidas");
    if (tit) tit.checked = tx.titulo;
    if (med) med.checked = tx.medidas;
    document.querySelectorAll("input[name=\"logDescModo\"]").forEach(function (r) { r.checked = r.value === tx.desc; });
}

/* --- imágenes: Odoo (automática) o subida a mano --- */

function logReducirImagen_(src, maxPx, calidad) {
    return window.reducirImagenJpeg(src, maxPx, calidad);
}

/** Pide a Odoo la imagen del proyecto de la cotización y la reduce a miniatura. */
async function logisticaCargarImagenOdoo_(force) {
    const codigo = logCodigoProyectoCotizacion_();
    if (!codigo) return;
    if (!force && logImgOdoo.codigo === codigo && logImgOdoo.estado !== "idle" && logImgOdoo.estado !== "error") return;
    logImgOdoo = { codigo: codigo, estado: "cargando", url: "", campo: "", mensaje: "" };
    logisticaPintarEstado_();
    /* la descarga se comparte con el visor del Paso 2 (connectors.js): no se pide dos veces */
    const r = await window.traerImagenOdoo(codigo, !!force);
    if (logCodigoProyectoCotizacion_() !== codigo) return;
    logImgOdoo = { codigo: codigo, estado: r.estado, url: r.url || "", orig: r.orig, campo: r.campo || "", mensaje: r.mensaje || "" };
    logisticaPintarEstado_();
    logisticaRefrescarTabla_();
}

/* --- editor de imagen: girar, recortar (acerca), proporción; conserva el original --- */

let logImgEd = null;

/** Imagen original disponible para una fila: pin de pieza, subida a mano; Odoo solo si no es pieza de grupal. */
function logImgFuente_(fila) {
    if (fila.imgSrc) return fila.imgSrc;
    if (fila.img) return fila.img;
    if (fila.elem) {
        const vivo = logElementoVivoCostos_(fila.proy, fila.elem, fila.snap && fila.snap.nombre);
        const pin = logPinImgDeElemento_(vivo);
        if (pin && pin.img) return pin.img;
        if (typeof window.imagenCotizacionElemento === "function") {
            const deElem = window.imagenCotizacionElemento(fila.elem);
            if (deElem) return deElem;
        }
        return "";
    }
    if (fila.tipo === "item") {
        const pinInd = logPinImgIndividualAbierto_(fila.proy, fila.ver);
        if (pinInd && pinInd.img) return pinInd.img;
        if (logImgOdoo.orig && logImgOdoo.codigo === fila.proy) return logImgOdoo.orig;
    }
    return "";
}

var _logIdbP = null;
function logIdbDb_() {
    if (_logIdbP) return _logIdbP;
    _logIdbP = new Promise(function (ok, bad) {
        try {
            const req = indexedDB.open("smartbudget_log", 1);
            req.onupgradeneeded = function () {
                if (!req.result.objectStoreNames.contains("img")) req.result.createObjectStore("img");
            };
            req.onsuccess = function () { ok(req.result); };
            req.onerror = function () { bad(req.error); };
        } catch (e) { bad(e); }
    });
    return _logIdbP;
}
function logIdbGetImg_(fid) {
    if (!fid) return Promise.resolve("");
    return logIdbDb_().then(function (db) {
        return new Promise(function (ok) {
            const q = db.transaction("img", "readonly").objectStore("img").get(fid);
            q.onsuccess = function () { ok(q.result || ""); };
            q.onerror = function () { ok(""); };
        });
    }).catch(function () { return ""; });
}
function logIdbPutImg_(fid, data) {
    if (!fid || !data || !/^data:image\//.test(data)) return Promise.resolve();
    return logIdbDb_().then(function (db) {
        return new Promise(function (ok) {
            const q = db.transaction("img", "readwrite").objectStore("img").put(data, fid);
            q.onsuccess = function () { ok(); };
            q.onerror = function () { ok(); };
        });
    }).catch(function () {});
}

function logUrlImgDrive_(fid) {
    return "https://lh3.googleusercontent.com/d/" + encodeURIComponent(fid) + "=s1200";
}

function logisticaImgBlob_(fila) {
    const ref = fila && (fila.imgRef || fila.srcRef);
    if (!ref || fila._imgBlob) return;
    fila._imgBlob = true;
    realizarPeticionBD({ action: "cotizacion_imagenes", ids: [ref], modo: "blob" }, { timeoutMs: 60000 }).then(function (r) {
        const u = r && r.exito && r.data ? r.data[ref] : "";
        if (!u || !/^data:image\//.test(u)) return;
        logIdbPutImg_(ref, u);
        logisticaPonerImgFila_(fila.uid, u);
    }).catch(function () {});
}

function logisticaPonerImgFila_(uid, src) {
    const fila = logFilaPorUid_(uid);
    if (fila) fila.img = src;
    const aplicar = function (img) {
        if (/^https:\/\/lh3\.googleusercontent\.com\//.test(String(src || ""))) {
            img.onerror = function () {
                if (img.dataset.fb) return;
                img.dataset.fb = "1";
                const dueña = logFilaPorUid_(uid);
                if (dueña) logisticaImgBlob_(dueña);
            };
        }
        img.src = src;
    };
    const f = document.getElementById("logFrame");
    const doc = f && f.contentDocument;
    if (doc) doc.querySelectorAll("img.thumb[data-r=\"" + uid + "\"]").forEach(aplicar);
    const btn = document.querySelector("#logFilasLista .log-fila[data-r=\"" + uid + "\"] .log-fila-img");
    if (btn) {
        btn.innerHTML = src ? "<img alt=\"\">" : "<i class=\"bi bi-image\"></i>";
        const mini = btn.querySelector("img");
        if (mini) aplicar(mini);
    }
}

async function logisticaHidatarImgsCache_(filas) {
    await Promise.all((filas || []).map(function (f) {
        if (!f.imgRef || (f.img && /^data:image\//.test(f.img))) return Promise.resolve();
        return logIdbGetImg_(f.imgRef).then(function (c) { if (c) f.img = c; });
    }));
}

function logCargaBar_(html) {
    const el = document.getElementById("logCargaBar");
    if (!el) return;
    if (!html) {
        el.classList.add("d-none");
        el.innerHTML = "";
        return;
    }
    el.classList.remove("d-none");
    el.innerHTML = html;
}

function logBotonBusy_(id, on, label) {
    const b = document.getElementById(id);
    if (!b) return;
    if (on) {
        if (!b.dataset.html0) b.dataset.html0 = b.innerHTML;
        b.disabled = true;
        b.innerHTML = "<span class=\"spinner-border spinner-border-sm me-1\"></span>" + (label || "Cargando…");
    } else {
        b.disabled = false;
        if (b.dataset.html0) b.innerHTML = b.dataset.html0;
    }
}

function logisticaFilasImgPendientes_() {
    return (logQuote.filas || []).filter(function (f) {
        return (f.imgRef || f.srcRef) && !/^data:image\//.test(f.img || "");
    });
}

function logisticaAvisarImgsPendientes_() {
    const n = logisticaFilasImgPendientes_().length;
    if (!n) { logCargaBar_(""); return; }
    logCargaBar_("Faltan " + n + " foto" + (n === 1 ? "" : "s") + " para el PDF. " +
        "<button type=\"button\" class=\"btn btn-link btn-sm p-0 align-baseline\" id=\"btnLogImgsHint\">Recargar imágenes</button>");
    const hint = document.getElementById("btnLogImgsHint");
    if (hint) hint.addEventListener("click", function () { logisticaRecargarImgs_(); });
}

let _logImgsP = null;

async function logisticaTraerImgsFaltantes_() {
    const abierta = logQuote.abierta;
    const filas = logisticaFilasImgPendientes_();
    if (!filas.length) { logCargaBar_(""); return; }
    filas.forEach(function (f) {
        if (logQuote.abierta !== abierta) return;
        if (f.imgRef) logisticaPonerImgFila_(f.uid, logUrlImgDrive_(f.imgRef));
    });
    return logisticaRecargarImgs_({ silencio: true, filas: filas, auto: true });
}

/** Baja de Drive los renders que no quedaron en la hoja (cotización guardada). Con «todas», también intenta Odoo si no hay imgRef. */
async function logisticaRecargarImgs_(opts) {
    opts = opts || {};
    if (_logImgsP && !opts.todas) return _logImgsP;
    let filas = opts.filas || (opts.todas
        ? (logQuote.filas || []).filter(function (f) {
            return f.tipo === "item" && (f.imgRef || f.srcRef || !(f.img && /^data:image\//.test(f.img)));
        })
        : logisticaFilasImgPendientes_());
    const abierta = logQuote.abierta;
    const trabajo = (async function () {
        const t0 = Date.now();
        let ok = 0;
        let fail = 0;
        /* Vista 3D: refs Drive tras guardar / al forzar Recargar. */
        try {
            const n3 = await logisticaHidatarSim3dImgs_({ forzar: !!opts.todas });
            if (n3) ok += n3;
        } catch (e3) { /* sigue con fotos de ítems */ }
        if (!filas.length) {
            if (ok) {
                logisticaActualizarVista();
                if (!opts.silencio && typeof mostrarNotificacion === "function") {
                    mostrarNotificacion("Imágenes 3D listas en la previsualización.", "success");
                }
            } else if (!opts.silencio && typeof mostrarNotificacion === "function") {
                mostrarNotificacion("No hay fotos pendientes. Si el PDF salió en blanco, pulsa PDF otra vez.", "info");
            }
            logCargaBar_("");
            return ok;
        }
        for (let i = 0; i < filas.length; i++) {
            if (logQuote.abierta !== abierta) break;
            const fila = filas[i];
            if (fila.img && /^data:image\//.test(fila.img) && !opts.todas) { ok++; continue; }
            logCargaBar_("Cargando fotos " + (i + 1) + " de " + filas.length + " · " + Math.floor((Date.now() - t0) / 1000) + " s");
            if (typeof textoEsperaNube === "function" && opts.espera) {
                textoEsperaNube("Trayendo render " + (i + 1) + " de " + filas.length + "…");
            }
            /* 1) Pin vivo en Costos (mismo código) — manda sobre Grupo/Odoo */
            if (fila.elem) {
                logAplicarImgElementoAjeno_(fila, null);
                if (fila.img && /^data:image\//.test(fila.img)) {
                    logisticaPonerImgFila_(fila.uid, fila.img);
                    ok++;
                    continue;
                }
                if (!fila.imgRef) {
                    const vivo = logElementoVivoCostos_(fila.proy, fila.elem, fila.snap && fila.snap.nombre);
                    const pin = logPinImgDeElemento_(vivo);
                    if (pin && pin.imgRef) fila.imgRef = pin.imgRef;
                }
            }
            const ref = fila.imgRef || fila.srcRef;
            if (ref) {
                fila._imgBlob = false;
                try {
                    const r = await realizarPeticionBD({ action: "cotizacion_imagenes", ids: [ref], modo: "blob" }, { timeoutMs: 60000 });
                    const u = r && r.exito && r.data ? (r.data[ref] || "") : "";
                    if (u && /^data:image\//.test(u)) {
                        logIdbPutImg_(ref, u);
                        fila.img = u;
                        fila._imgBlob = true;
                        logisticaPonerImgFila_(fila.uid, u);
                        ok++;
                        continue;
                    }
                } catch (e) { /* sin blob */ }
            }
            /* Odoo = imagen Grupo del proyecto: solo filas individuales (sin pieza) */
            if (!fila.elem) {
                const cod = String(fila.proy || "").trim();
                if (cod && typeof window.traerImagenOdoo === "function") {
                    try {
                        const rO = await window.traerImagenOdoo(cod, !!opts.todas);
                        if (rO && rO.estado === "ok" && rO.url) {
                            fila.img = rO.url;
                            fila.imgSrc = rO.orig;
                            logisticaPonerImgFila_(fila.uid, rO.url);
                            ok++;
                            continue;
                        }
                    } catch (e2) { /* sin imagen */ }
                }
            }
            fail++;
        }
        if (logQuote.abierta === abierta) {
            logCargaBar_("");
            if (ok) {
                logisticaRefrescarTabla_();
                logisticaActualizarVista();
            }
            if (fail) logisticaAvisarImgsPendientes_();
            if (!opts.silencio && typeof mostrarNotificacion === "function") {
                if (ok && !fail) mostrarNotificacion("Imágenes listas. Ya puedes bajar el PDF.", "success");
                else if (ok) mostrarNotificacion("Llegaron " + ok + " de " + filas.length + " fotos. Pulsa Recargar imágenes otra vez.", "warning");
                else mostrarNotificacion("No se pudieron traer las fotos (Drive u Odoo). Reintenta o súbelas a mano en la miniatura.", "danger");
            } else if (opts.auto && fail && typeof mostrarNotificacion === "function") {
                mostrarNotificacion("Algunas fotos no bajaron. Usa Recargar imágenes.", "warning");
            }
        }
        return ok;
    })();
    _logImgsP = trabajo;
    try { return await trabajo; } finally { if (_logImgsP === trabajo) _logImgsP = null; }
}

/** true si la imagen se giró o recortó; si no, el original no se guarda aparte (basta la imagen visible). */
function logImgEditada_(fila) {
    const ed = fila.imgEdit;
    if (!ed || !ed.n) return false;
    return (ed.rot || 0) % 360 !== 0 || ed.n.x > 0.002 || ed.n.y > 0.002 || ed.n.w < 0.998 || ed.n.h < 0.998;
}

function logImgQuitar_(fila) {
    delete fila.img;
    delete fila.imgSrc;
    delete fila.imgEdit;
    delete fila.imgRef;
    delete fila.srcRef;
    logMarcarSucio_();
}

/** Dibuja la imagen girada `rot` grados, escalada por `esc`, en el canvas `cv`. */
function logImgPintarRotada_(cv, im, rot, esc) {
    const sw = im.naturalWidth || 800;
    const sh = im.naturalHeight || 600;
    const swap = rot % 180 !== 0;
    cv.width = Math.max(1, Math.round((swap ? sh : sw) * esc));
    cv.height = Math.max(1, Math.round((swap ? sw : sh) * esc));
    const cx = cv.getContext("2d");
    cx.fillStyle = "#fff";
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.save();
    cx.translate(cv.width / 2, cv.height / 2);
    cx.rotate(rot * Math.PI / 180);
    cx.drawImage(im, -sw * esc / 2, -sh * esc / 2, sw * esc, sh * esc);
    cx.restore();
}

async function logisticaAbrirEditorImagen_(uid, yaCargada) {
    const fila = logFilaPorUid_(uid);
    if (!fila || logEsTextoFila_(fila) || fila.tipo === "envio") return;
    let refPix = "";
    if (fila.srcRef && !/^data:image\//.test(fila.imgSrc || "")) refPix = fila.srcRef;
    else if (fila.imgRef && !/^data:image\//.test(fila.img || "")) refPix = fila.imgRef;
    if (refPix) {
        /* el recorte necesita píxeles: Drive solo al editar, no al abrir la cotización */
        try {
            if (typeof mostrarNotificacion === "function") mostrarNotificacion("Trayendo la imagen original…", "info");
            const r = await realizarPeticionBD({ action: "cotizacion_imagenes", ids: [refPix], modo: "blob" }, { timeoutMs: 60000 });
            const u = r && r.exito && r.data ? r.data[refPix] : "";
            if (u && /^data:image\//.test(u)) {
                if (refPix === fila.srcRef) fila.imgSrc = u;
                else { fila.img = u; logIdbPutImg_(refPix, u); }
            }
        } catch (e) { /* se edita sobre la imagen visible */ }
    }
    const fuente = logImgFuente_(fila);
    if (!fuente) { logisticaElegirImagen_(uid); return; } /* sin imagen: primero se sube una */
    const im = new Image();
    im.onload = function () {
        const ed = fila.imgEdit || {};
        logImgEd = {
            uid: uid, im: im, src: fuente,
            rot: ed.rot || 0,
            aspect: 0,
            n: ed.n ? { x: ed.n.x, y: ed.n.y, w: ed.n.w, h: ed.n.h } : { x: 0, y: 0, w: 1, h: 1 }
        };
        const el = document.getElementById("modalLogImg");
        if (!el) return;
        bootstrap.Modal.getOrCreateInstance(el).show();
        /* el modal debe estar visible para medir; se dibuja al abrir (shown) o ya */
        if (el.classList.contains("show")) logImgDibujar_();
    };
    im.onerror = function () {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("No se pudo abrir la imagen.", "danger");
    };
    im.src = fuente;
}

function logImgDibujar_() {
    const ed = logImgEd;
    const cv = document.getElementById("logImgCv");
    if (!ed || !cv) return;
    const sw = ed.im.naturalWidth || 800;
    const sh = ed.im.naturalHeight || 600;
    const swap = ed.rot % 180 !== 0;
    const rw = swap ? sh : sw;
    const rh = swap ? sw : sh;
    const esc = Math.min(640 / rw, 400 / rh, 1.5);
    logImgPintarRotada_(cv, ed.im, ed.rot, esc);
    logImgPosCrop_();
}

function logImgPosCrop_() {
    const ed = logImgEd;
    const cv = document.getElementById("logImgCv");
    const box = document.getElementById("logImgCrop");
    if (!ed || !cv || !box) return;
    const W = cv.width, H = cv.height, n = ed.n;
    box.style.left = (n.x * W) + "px";
    box.style.top = (n.y * H) + "px";
    box.style.width = (n.w * W) + "px";
    box.style.height = (n.h * H) + "px";
    box.classList.toggle("lock", ed.aspect > 0);
    const sw = ed.im.naturalWidth || 800, sh = ed.im.naturalHeight || 600;
    const swap = ed.rot % 180 !== 0;
    const rw = swap ? sh : sw, rh = swap ? sw : sh;
    const info = document.getElementById("logImgInfo");
    if (info) {
        const ow = Math.round(n.w * rw), oh = Math.round(n.h * rh);
        const f = Math.min(1, LOG_IMG_MAX_PX / Math.max(ow, oh, 1));
        info.textContent = "Recorte: " + ow + " × " + oh + " px · se guarda a " + Math.round(ow * f) + " × " + Math.round(oh * f) + " px";
    }
}

function logImgFijarAspecto_(asp) {
    const ed = logImgEd;
    const cv = document.getElementById("logImgCv");
    if (!ed || !cv) return;
    ed.aspect = asp;
    if (asp > 0) {
        const W = cv.width, H = cv.height;
        let w, h;
        if (W / H > asp) { h = H; w = H * asp; } else { w = W; h = W / asp; }
        ed.n = { x: (W - w) / 2 / W, y: (H - h) / 2 / H, w: w / W, h: h / H };
    }
    document.querySelectorAll("#modalLogImg [data-asp]").forEach(function (b) {
        b.classList.toggle("active", parseFloat(b.getAttribute("data-asp")) === asp);
    });
    logImgPosCrop_();
}

/** Arrastre del recorte: mover (cuerpo) o redimensionar (bordes y esquinas). */
function logImgIniciarArrastre_(ev) {
    const ed = logImgEd;
    const cv = document.getElementById("logImgCv");
    const box = document.getElementById("logImgCrop");
    const h = ev.target.getAttribute("data-h");
    if (!ed || !cv || !h) return;
    ev.preventDefault();
    try { box.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ }
    const W = cv.width, H = cv.height;
    const sx = ev.clientX, sy = ev.clientY;
    const n0 = { x: ed.n.x, y: ed.n.y, w: ed.n.w, h: ed.n.h };
    const MIN = 0.04;
    const mover = function (e) {
        const dx = (e.clientX - sx) / W;
        const dy = (e.clientY - sy) / H;
        let l = n0.x, t = n0.y, r = n0.x + n0.w, b = n0.y + n0.h;
        if (h === "move") {
            l = Math.max(0, Math.min(1 - n0.w, n0.x + dx));
            t = Math.max(0, Math.min(1 - n0.h, n0.y + dy));
            r = l + n0.w;
            b = t + n0.h;
        } else if (ed.aspect > 0) {
            /* proporción fija: solo esquinas, se ancla la esquina opuesta */
            const sxDir = h.indexOf("e") >= 0 ? 1 : -1;
            const syDir = h.indexOf("s") >= 0 ? 1 : -1;
            const ax = sxDir > 0 ? n0.x : n0.x + n0.w;
            const ay = syDir > 0 ? n0.y : n0.y + n0.h;
            const cx = (sxDir > 0 ? n0.x + n0.w : n0.x) + dx;
            let w = Math.abs(cx - ax);
            const maxW = Math.min(sxDir > 0 ? 1 - ax : ax, ((syDir > 0 ? 1 - ay : ay) * H * ed.aspect) / W);
            w = Math.max(MIN, Math.min(w, maxW));
            const hh = (w * W) / (ed.aspect * H);
            l = sxDir > 0 ? ax : ax - w;
            r = sxDir > 0 ? ax + w : ax;
            t = syDir > 0 ? ay : ay - hh;
            b = syDir > 0 ? ay + hh : ay;
        } else {
            if (h.indexOf("w") >= 0) l = Math.max(0, Math.min(r - MIN, n0.x + dx));
            if (h.indexOf("e") >= 0) r = Math.min(1, Math.max(l + MIN, n0.x + n0.w + dx));
            if (h.indexOf("n") >= 0) t = Math.max(0, Math.min(b - MIN, n0.y + dy));
            if (h.indexOf("s") >= 0) b = Math.min(1, Math.max(t + MIN, n0.y + n0.h + dy));
        }
        ed.n = { x: l, y: t, w: r - l, h: b - t };
        logImgPosCrop_();
    };
    const soltar = function () {
        box.removeEventListener("pointermove", mover);
        box.removeEventListener("pointerup", soltar);
        box.removeEventListener("pointercancel", soltar);
    };
    box.addEventListener("pointermove", mover);
    box.addEventListener("pointerup", soltar);
    box.addEventListener("pointercancel", soltar);
}

/** Aplica giro + recorte sobre el original a alta resolución y guarda el resultado en la fila. */
function logImgAplicar_() {
    const ed = logImgEd;
    const fila = ed && logFilaPorUid_(ed.uid);
    if (!ed || !fila) return;
    const full = document.createElement("canvas");
    logImgPintarRotada_(full, ed.im, ed.rot, 1);
    const cx0 = Math.round(ed.n.x * full.width), cy0 = Math.round(ed.n.y * full.height);
    const cw = Math.max(1, Math.round(ed.n.w * full.width)), ch = Math.max(1, Math.round(ed.n.h * full.height));
    const f = Math.min(1, LOG_IMG_MAX_PX / Math.max(cw, ch));
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(cw * f));
    out.height = Math.max(1, Math.round(ch * f));
    out.getContext("2d").drawImage(full, cx0, cy0, cw, ch, 0, 0, out.width, out.height);
    const editada = (ed.rot || 0) % 360 !== 0 || ed.n.x > 0.002 || ed.n.y > 0.002 || ed.n.w < 0.998 || ed.n.h < 0.998;
    if (!editada) {
        fila.imgEdit = null;
        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogImg")).hide();
        return;
    }
    fila.img = out.toDataURL("image/jpeg", 0.9);
    if (fila.imgSrc !== ed.src) delete fila.srcRef;
    if (fila.imgRef && !fila.srcRef) fila.srcRef = fila.imgRef;
    delete fila.imgRef;
    logMarcarSucio_();
    fila.imgSrc = ed.src;
    fila.imgEdit = { rot: ed.rot, n: { x: ed.n.x, y: ed.n.y, w: ed.n.w, h: ed.n.h } };
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogImg")).hide();
    logisticaRefrescarTabla_();
}

function logImgInitEditor_() {
    const modal = document.getElementById("modalLogImg");
    if (!modal) return;
    const box = document.getElementById("logImgCrop");
    if (box && !box.querySelector("[data-h]")) {
        box.innerHTML = ["move", "n", "s", "e", "w", "nw", "ne", "sw", "se"].map(function (h) {
            return "<span class=\"lic-h lic-" + h + "\" data-h=\"" + h + "\"></span>";
        }).join("");
        box.addEventListener("pointerdown", logImgIniciarArrastre_);
    }
    modal.addEventListener("shown.bs.modal", function () {
        document.querySelectorAll("#modalLogImg [data-asp]").forEach(function (b) { b.classList.toggle("active", parseFloat(b.getAttribute("data-asp")) === 0); });
        logImgDibujar_();
    });
    modal.addEventListener("click", function (ev) {
        const b = ev.target.closest("[data-lacc]");
        if (!b || !logImgEd) return;
        const acc = b.getAttribute("data-lacc");
        if (acc === "rotL" || acc === "rotR") {
            logImgEd.rot = (logImgEd.rot + (acc === "rotR" ? 90 : 270)) % 360;
            logImgEd.n = { x: 0, y: 0, w: 1, h: 1 };
            logImgEd.aspect = 0;
            logImgDibujar_();
            logImgFijarAspecto_(0);
        } else if (acc === "reset") {
            logImgEd.rot = 0;
            logImgEd.n = { x: 0, y: 0, w: 1, h: 1 };
            logImgEd.aspect = 0;
            logImgDibujar_();
            logImgFijarAspecto_(0);
        } else if (acc === "asp") {
            logImgFijarAspecto_(parseFloat(b.getAttribute("data-asp")) || 0);
        } else if (acc === "otra") {
            const uid = logImgEd.uid;
            bootstrap.Modal.getOrCreateInstance(modal).hide();
            logisticaElegirImagen_(uid);
        } else if (acc === "quitar") {
            const fila = logFilaPorUid_(logImgEd.uid);
            if (fila) logImgQuitar_(fila);
            bootstrap.Modal.getOrCreateInstance(modal).hide();
            logisticaRefrescarTabla_();
        } else if (acc === "ok") {
            logImgAplicar_();
        }
    });
}

function logisticaElegirImagen_(uid) {
    let inp = document.getElementById("logFileImg");
    if (!inp) {
        inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "image/*";
        inp.id = "logFileImg";
        inp.style.display = "none";
        inp.addEventListener("change", function () {
            const file = inp.files && inp.files[0];
            const fila = logFilaPorUid_(logImgUidPend);
            inp.value = "";
            if (!file || !fila) return;
            const rd = new FileReader();
            rd.onload = function () {
                logReducirImagen_(rd.result, LOG_IMG_SRC_PX, 0.9).then(function (orig) {
                    return logReducirImagen_(orig, LOG_IMG_MAX_PX).then(function (url) {
                        fila.imgSrc = orig;
                        fila.imgEdit = null;
                        fila.img = url;
                        delete fila.imgRef;
                        delete fila.srcRef;
                        logMarcarSucio_();
                        logisticaRefrescarTabla_();
                        logisticaAbrirEditorImagen_(fila.uid, true);
                    });
                }).catch(function () {
                    if (typeof mostrarNotificacion === "function") mostrarNotificacion("No se pudo leer esa imagen.", "danger");
                });
            };
            rd.readAsDataURL(file);
        });
        document.body.appendChild(inp);
    }
    logImgUidPend = uid;
    inp.click();
}

/* --- panel de filas (fuera de la hoja): ordenar, duplicar, borrar, versión y escala --- */

function logisticaPintarMenuAgregar_() {
    const menu = document.getElementById("logAddMenu");
    if (!menu) return;
    const p = logisticaLeerProyecto_();
    let html = "";
    /* Versión/Q viven en la ficha; aquí solo se agrega una ficha del proyecto abierto (versión actual). */
    if (p.hayProyecto && p.version) {
        html += "<li><button type=\"button\" class=\"dropdown-item\" data-add=\"item\" data-ver=\"" + logEsc_(p.version) + "\"><i class=\"bi bi-box-seam me-2\"></i>Proyecto abierto (" + logEsc_(p.version) + ")</button></li>" +
            "<li><hr class=\"dropdown-divider\"></li>";
    }
    html += "<li><button type=\"button\" class=\"dropdown-item\" data-add=\"otro\"><i class=\"bi bi-collection me-2\"></i>De otro proyecto (nube)</button></li>" +
        "<li><button type=\"button\" class=\"dropdown-item\" data-add=\"libre\"><i class=\"bi bi-pencil-square me-2\"></i>Fila libre (escrita a mano)</button></li>" +
        "<li><button type=\"button\" class=\"dropdown-item\" data-add=\"seccion\"><i class=\"bi bi-layout-text-sidebar me-2\"></i>Sección (título)</button></li>" +
        "<li><button type=\"button\" class=\"dropdown-item\" data-add=\"obs\"><i class=\"bi bi-chat-left-text me-2\"></i>Observaciones</button></li>" +
        "<li><button type=\"button\" class=\"dropdown-item\" data-add=\"sim3d\"><i class=\"bi bi-box me-2\"></i>Vista 3D (Simulador)</button></li>";
    menu.innerHTML = html;
}

/** Comisión de venta de esta cotización. El % sale del presupuesto; la base es solo el precio de los proyectos. */
function logComisionDesdeCostos_() {
    const sel = document.getElementById("simComision");
    const pct = sel ? parseFloat(sel.value) : 0;
    const opt = sel && sel.selectedOptions && sel.selectedOptions[0];
    const fee = parseFloat((document.getElementById("simFee") || {}).value);
    const p = isNaN(pct) ? 0 : pct;
    let nombre = "";
    if (typeof listaComisiones === "function") {
        const hit = listaComisiones().find(function (r) { return Math.abs(Number(r.pct) - p) < 0.001; });
        if (hit) nombre = hit.nombre;
    }
    if (!nombre && opt) {
        nombre = String(opt.textContent || "").replace(/\s*\([^)]*%\)\s*$/, "").trim();
    }
    return {
        pct: p,
        pctBase: p,
        nombre: nombre,
        fee: isNaN(fee) ? 0 : fee,
        valorManual: null
    };
}

/**
 * Trae el % de comisión desde Costos (#simComision) a la cotización abierta.
 * Si el usuario ya desvió el % respecto al origen (pct ≠ pctBase u override por opción),
 * no se pisa — salvo forzar (p. ej. «Actualiza Presupuesto»).
 * Cotizaciones del historial (abierta) tampoco se tocan sin forzar.
 */
function logComisionSincronizarDesdeCostos_(opts) {
    opts = opts || {};
    if (!logQuote || !logQuote.inicializado) return false;
    if (logQuote.abierta && !opts.forzar) return false;
    const c = logComisionAsegurar_();
    const d = logComisionDesdeCostos_();
    const desviada = Math.abs((Number(c.pct) || 0) - (Number(c.pctBase) || 0)) > 0.001
        || (c.porEsc && Object.keys(c.porEsc).length)
        || (c.valorManual && Object.keys(c.valorManual).length);
    if (desviada && !opts.forzar) return false;
    const mismo = Math.abs((Number(c.pct) || 0) - d.pct) < 0.001
        && Math.abs((Number(c.pctBase) || 0) - d.pct) < 0.001
        && Math.abs((Number(c.fee) || 0) - d.fee) < 0.001
        && String(c.nombre || "") === String(d.nombre || "");
    if (mismo) return false;
    c.pct = d.pct;
    c.pctBase = d.pct;
    c.fee = d.fee;
    c.nombre = d.nombre;
    c.valorManual = null;
    c.porEsc = {};
    return true;
}

function logComisionNormalizar_(o) {
    o = o || {};
    const pct = Number(o.pct);
    const pctBase = Number(o.pctBase);
    const fee = Number(o.fee);
    const manual = {};
    if (o.valorManual && typeof o.valorManual === "object") {
        Object.keys(o.valorManual).forEach(function (k) {
            const n = Number(o.valorManual[k]);
            if (!isNaN(n)) manual[k] = n;
        });
    }
    const porEsc = {};
    if (o.porEsc && typeof o.porEsc === "object") {
        Object.keys(o.porEsc).forEach(function (k) {
            const pe = o.porEsc[k] || {};
            const p = Number(pe.pct);
            if (!isNaN(p)) porEsc[k] = { pct: Math.max(0, p) };
        });
    }
    return {
        pct: isNaN(pct) ? 0 : Math.max(0, pct),
        pctBase: isNaN(pctBase) ? (isNaN(pct) ? 0 : Math.max(0, pct)) : Math.max(0, pctBase),
        nombre: String(o.nombre || ""),
        fee: isNaN(fee) ? 0 : fee,
        valorManual: Object.keys(manual).length ? manual : null,
        porEsc: porEsc
    };
}

function logComisionAsegurar_() {
    if (!logQuote.comision) logQuote.comision = logComisionNormalizar_(logComisionDesdeCostos_());
    else logQuote.comision = logComisionNormalizar_(logQuote.comision);
    return logQuote.comision;
}

/** Comisión efectiva de una opción (override) o la global. */
function logComisionDeEsc_(escId) {
    const c = logComisionAsegurar_();
    if (escId && c.porEsc && c.porEsc[escId] && c.porEsc[escId].pct != null) {
        return { pct: Number(c.porEsc[escId].pct) || 0, fee: c.fee, nombre: c.nombre, pctBase: c.pctBase, override: true };
    }
    return { pct: c.pct, fee: c.fee, nombre: c.nombre, pctBase: c.pctBase, override: false };
}

function logComisionEscribirPct_(pct, soloEsc) {
    const c = logComisionAsegurar_();
    const n = Math.max(0, Number(pct) || 0);
    if (soloEsc && logEscList_().length) {
        const id = logOpcionUiAsegurar_();
        c.porEsc = c.porEsc || {};
        c.porEsc[id] = { pct: n };
    } else {
        c.pct = n;
        c.porEsc = {};
    }
    return c;
}

function logComisionLista_() {
    if (typeof listaComisiones === "function") return listaComisiones();
    if (typeof parseComisiones === "function") return parseComisiones(typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.comisiones);
    return [];
}

/** Comisión que ya trae el precio de la fila: la del simulador si el precio está vivo, o la congelada en el snap. */
function logComisionOrigen_(fila) {
    const c = logComisionAsegurar_();
    if (fila && fila.tipo === "item" && !fila.snap) {
        const d = logComisionDesdeCostos_();
        return { pct: d.pct, fee: d.fee };
    }
    if (fila && fila.snap && fila.snap.pctCom != null && !isNaN(Number(fila.snap.pctCom))) {
        const fee = Number(fila.snap.feeCom);
        return { pct: Number(fila.snap.pctCom), fee: isNaN(fee) ? (Number(c.fee) || 0) : fee };
    }
    return { pct: Number(c.pctBase) || 0, fee: Number(c.fee) || 0 };
}

/** Pasa el precio guardado (con la comisión de origen) al % elegido en esta cotización. Envíos no se tocan. */
function logComisionFactor_(fila) {
    if (!fila || logEsTextoFila_(fila) || logEsEnvio_(fila)) return 1;
    const c = logComisionDeEsc_(fila.escId || logOpcionUiSel_ || "");
    const o = logComisionOrigen_(fila);
    const den = 100 + (Number(o.pct) || 0) + (Number(o.fee) || 0);
    const feeEnPrecio = logDescuentoActivo_(fila.escId) ? 0 : (Number(o.fee) || 0);
    const num = 100 + (Number(c.pct) || 0) + feeEnPrecio;
    if (!(den > 0)) return 1;
    return num / den;
}

/** El precio de venta ya trae la comisión encima del precio sin ella: valor = subtotal × % / (100 + % + fee). */
function logComisionValor_(base, pct, fee) {
    const den = 100 + (Number(pct) || 0) + (Number(fee) || 0);
    if (!(den > 0)) return 0;
    return (Number(base) || 0) * (Number(pct) || 0) / den;
}

/** Línea de descuento o recargo. Apagada, el Fee libre sigue dentro del precio. */
function logDescuentoAsegurar_() {
    if (!logQuote.descuento) {
        const fee = Number(logComisionAsegurar_().fee) || 0;
        logQuote.descuento = { activo: false, pct: fee, titulo: "", tituloManual: false, pctManual: false, nota: "", porEsc: {} };
    }
    if (logQuote.descuento.nota == null) logQuote.descuento.nota = "";
    if (!logQuote.descuento.porEsc || typeof logQuote.descuento.porEsc !== "object") logQuote.descuento.porEsc = {};
    return logQuote.descuento;
}

function logDescuentoNota_() {
    return String(logDescuentoAsegurar_().nota || "").replace(/\s+/g, " ").trim();
}

function logDescuentoNotaHtml_() {
    const t = logDescuentoNota_();
    if (!t) return "";
    return "<div class=\"tot-nota\"><span class=\"ed\" data-env=\"notaDesc\">" + logEsc_(t) + "</span></div>";
}

function logDescuentoDeEsc_(escId) {
    const d = logDescuentoAsegurar_();
    if (escId && d.porEsc && d.porEsc[escId]) {
        const pe = d.porEsc[escId];
        return {
            activo: pe.activo != null ? !!pe.activo : !!d.activo,
            pct: pe.pct != null ? Number(pe.pct) || 0 : logDescuentoPctGlobal_(),
            override: true
        };
    }
    return { activo: !!d.activo, pct: logDescuentoPctGlobal_(), override: false };
}

function logDescuentoPctGlobal_() {
    const d = logDescuentoAsegurar_();
    if (d.pctManual || (logQuote && logQuote.abierta)) return Number(d.pct) || 0;
    const vivo = parseFloat((document.getElementById("simFee") || {}).value);
    if (!isNaN(vivo)) return vivo;
    return Number(d.pct) || 0;
}

function logDescuentoActivo_(escId) {
    return !!logDescuentoDeEsc_(escId || "").activo;
}

function logDescuentoPct_(escId) {
    return logDescuentoDeEsc_(escId || "").pct;
}

function logDescuentoEtiqueta_(esEn) {
    const d = logDescuentoAsegurar_();
    if (d.tituloManual && String(d.titulo || "").trim()) return String(d.titulo).trim();
    const pct = logDescuentoPct_();
    const idioma = esEn ? "en" : "es";
    const nombre = pct > 0 ? (esEn ? "Surcharge" : "Recargo") : (esEn ? "Discount" : "Descuento");
    return nombre + " " + logFmtNum_(pct, idioma, 2) + "%";
}

function logisticaPintarDescuento_() {
    const btn = document.getElementById("logDescuentoLock");
    const pctEl = document.getElementById("logDescuentoPct");
    const notaEl = document.getElementById("logDescuentoNota");
    const info = document.getElementById("logDescuentoInfo");
    if (!btn || !pctEl) return;
    const d = logDescuentoAsegurar_();
    const escs = logEscList_();
    const escId = escs.length ? logOpcionUiAsegurar_() : "";
    const de = logDescuentoDeEsc_(escId);
    const pct = de.pct;
    if (document.activeElement !== pctEl) pctEl.value = String(pct);
    if (notaEl && document.activeElement !== notaEl) notaEl.value = d.nota || "";
    btn.className = "btn btn-sm " + (de.activo ? "btn-diforma-blue" : "btn-outline-secondary");
    btn.innerHTML = de.activo ? "<i class=\"bi bi-lock-fill\"></i>" : "<i class=\"bi bi-unlock\"></i>";
    btn.title = de.activo
        ? "Candado cerrado: la línea sale en la cotización. Clic para quitarla y devolver el fee al precio."
        : "Candado abierto: el fee sigue dentro del precio. Clic para sacar la línea.";
    if (!info || info.contains(document.activeElement)) return;
    const idioma = logisticaLeerOpciones_().idioma;
    const partes = logTotalesPartes_(idioma);
    const k = escId || "";
    const monto = (partes.desc && partes.desc[k]) || 0;
    const mon = logQuote.moneda || "COP";
    info.textContent = de.activo
        ? ((idioma === "en" ? "On the quote: " : "En la cotización: ") + logFmtMoneda_(monto, "es", logDecimales_()) + " " + mon + (de.override ? (idioma === "en" ? " (custom)" : " (personalizado)") : ""))
        : (idioma === "en" ? "Off. The fee stays inside the unit price." : "Apagado. El fee sigue dentro del precio unitario.");
}

function logisticaOnDescuento_(ev) {
    const t = ev.target;
    if (!t) return;
    const d = logDescuentoAsegurar_();
    const escs = logEscList_();
    const escId = escs.length ? logOpcionUiAsegurar_() : "";
    if (t.id === "logDescuentoLock" || (t.closest && t.closest("#logDescuentoLock"))) {
        if (escId) {
            d.porEsc = d.porEsc || {};
            const pe = d.porEsc[escId] || { pct: logDescuentoPct_(escId), activo: d.activo };
            pe.activo = !logDescuentoDeEsc_(escId).activo;
            pe.pct = pe.pct != null ? pe.pct : logDescuentoPct_(escId);
            d.porEsc[escId] = pe;
        } else {
            d.activo = !d.activo;
            if (!d.pctManual) d.pct = logDescuentoPct_();
        }
        if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
        logisticaActualizarVista();
        return;
    }
    if (t.id === "logDescuentoPct") {
        const n = parseFloat(String(t.value).replace(",", "."));
        const pct = isNaN(n) ? 0 : n;
        if (escId) {
            d.porEsc = d.porEsc || {};
            d.porEsc[escId] = d.porEsc[escId] || { activo: d.activo };
            d.porEsc[escId].pct = pct;
            d.porEsc[escId].activo = logDescuentoDeEsc_(escId).activo;
        } else {
            d.pct = pct;
            d.pctManual = true;
        }
        if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
        if (logDescuentoActivo_(escId)) logisticaActualizarVista();
        else logisticaPintarDescuento_();
        return;
    }
    if (t.id === "logDescuentoNota") {
        d.nota = String(t.value || "");
        if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
        if (logDescuentoActivo_(escId)) logisticaActualizarVista();
    }
}

function logPagoPctAnticipoDef_() {
    const vars = (typeof logTycDoc_ === "function") ? logTycDoc_().vars : LOG_TYC_VARS_DEF_;
    const n = parseFloat(String((vars && vars.anticipo) || "50").replace(",", ".").replace("%", ""));
    return isFinite(n) ? n : 50;
}

function logPagoDef_() {
    return { iva: false, ivaPct: 19, anticipo: false, anticipoPct: logPagoPctAnticipoDef_(), titConIva: "", titAnt: "", titSaldo: "", porEsc: {} };
}

function logPagoAsegurar_() {
    if (!logQuote.pago) logQuote.pago = logPagoDef_();
    const p = logQuote.pago;
    const ivaPct = Number(p.ivaPct);
    const ant = Number(p.anticipoPct);
    p.iva = !!p.iva;
    p.anticipo = !!p.anticipo;
    p.ivaPct = isFinite(ivaPct) ? Math.min(100, Math.max(0, ivaPct)) : 19;
    p.anticipoPct = isFinite(ant) ? Math.min(100, Math.max(0, ant)) : logPagoPctAnticipoDef_();
    p.titConIva = String(p.titConIva || "");
    p.titAnt = String(p.titAnt || "");
    p.titSaldo = String(p.titSaldo || "");
    if (!p.porEsc || typeof p.porEsc !== "object") p.porEsc = {};
    return p;
}

function logPagoDeEsc_(escId) {
    const p = logPagoAsegurar_();
    if (escId && p.porEsc && p.porEsc[escId]) {
        const pe = p.porEsc[escId];
        return {
            iva: pe.iva != null ? !!pe.iva : p.iva,
            ivaPct: pe.ivaPct != null ? Number(pe.ivaPct) : p.ivaPct,
            anticipo: pe.anticipo != null ? !!pe.anticipo : p.anticipo,
            anticipoPct: pe.anticipoPct != null ? Number(pe.anticipoPct) : p.anticipoPct,
            titConIva: p.titConIva, titAnt: p.titAnt, titSaldo: p.titSaldo,
            override: true
        };
    }
    return { iva: p.iva, ivaPct: p.ivaPct, anticipo: p.anticipo, anticipoPct: p.anticipoPct, titConIva: p.titConIva, titAnt: p.titAnt, titSaldo: p.titSaldo, override: false };
}

function logPagoMontos_(gran, escId) {
    const p = escId ? logPagoDeEsc_(escId) : logPagoAsegurar_();
    const base = Number(gran) || 0;
    const iva = p.iva ? logRedondear_(base * (Number(p.ivaPct) || 0) / 100) : 0;
    const conIva = logRedondear_(base + iva);
    const baseAnt = p.iva ? conIva : base;
    const anticipo = p.anticipo ? logRedondear_(baseAnt * (Number(p.anticipoPct) || 0) / 100) : 0;
    const saldo = p.anticipo ? logRedondear_(baseAnt - anticipo) : 0;
    return { base: base, iva: iva, conIva: conIva, anticipo: anticipo, saldo: saldo };
}

function logPagoEtiqueta_(cual, esEn, mon) {
    const p = logPagoAsegurar_();
    let custom = cual === "conIva" ? p.titConIva : (cual === "anticipo" ? p.titAnt : p.titSaldo);
    if (/^\s*PRECIO TOTAL \(CON IVA|\s*TOTAL PRICE \(INCLUDING|\s*ANTICIPO DEL |\s*ADVANCE PAYMENT |\s*SALDO PENDIENTE \(|\s*BALANCE DUE \(/i.test(String(custom || ""))) custom = "";
    if (String(custom || "").trim()) return String(custom).trim();
    if (cual === "conIva") {
        const pct = logFmtNum_(p.ivaPct, esEn ? "en" : "es", p.ivaPct % 1 ? 1 : 0);
        return logSufijoMon_(esEn ? "TOTAL PRICE WITH " + pct + "% VAT" : "PRECIO TOTAL CON IVA " + pct + "%", mon);
    }
    if (cual === "anticipo") {
        const pct = logFmtNum_(p.anticipoPct, esEn ? "en" : "es", p.anticipoPct % 1 ? 1 : 0);
        return logSufijoMon_(esEn ? "ADVANCE PAYMENT " + pct + "%" : "ANTICIPO " + pct + "%", mon);
    }
    return logSufijoMon_(esEn ? "BALANCE DUE" : "SALDO PENDIENTE", mon);
}

let logPagoPintando_ = false;
function logisticaPintarPago_() {
    const escs = logEscList_();
    const escId = escs.length ? logOpcionUiAsegurar_() : "";
    const p = escId ? logPagoDeEsc_(escId) : logPagoAsegurar_();
    logPagoPintando_ = true;
    const setChk = function (id, on) {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.checked = !!on;
    };
    const setNum = function (id, n) {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = n;
    };
    try {
        setChk("logPagoIva", p.iva);
        setChk("logPagoAnticipo", p.anticipo);
        setNum("logPagoIvaPct", p.ivaPct);
        setNum("logPagoAnticipoPct", p.anticipoPct);
    } finally { logPagoPintando_ = false; }
    const info = document.getElementById("logPagoInfo");
    if (!info || info.contains(document.activeElement)) return;
    if (!p.iva && !p.anticipo) {
        info.textContent = "Apagado. El PDF termina en el gran total.";
        return;
    }
    const idioma = logisticaLeerOpciones_().idioma;
    const k = escId || "";
    const gran = (logTotalesPartes_(idioma).gran || {})[k] || 0;
    const m = logPagoMontos_(gran, escId || undefined);
    const mon = logQuote.moneda || "COP";
    const bits = [];
    if (p.iva) bits.push((idioma === "en" ? "With VAT: " : "Con IVA: ") + logFmtMoneda_(m.conIva, "es", logDecimales_()) + " " + mon);
    if (p.anticipo) bits.push((idioma === "en" ? "Advance: " : "Anticipo: ") + logFmtMoneda_(m.anticipo, "es", logDecimales_()) + " · " + (idioma === "en" ? "Balance: " : "Saldo: ") + logFmtMoneda_(m.saldo, "es", logDecimales_()) + " " + mon);
    if (p.override) bits.push(idioma === "en" ? "(custom option)" : "(opción personalizada)");
    info.textContent = bits.join(" · ");
}

function logisticaOnPago_(ev) {
    if (logPagoPintando_) return;
    const t = ev.target;
    if (!t) return;
    const escs = logEscList_();
    const escId = escs.length ? logOpcionUiAsegurar_() : "";
    const base = logPagoAsegurar_();
    const write_ = function (campo, val) {
        if (escId) {
            base.porEsc = base.porEsc || {};
            base.porEsc[escId] = base.porEsc[escId] || {};
            base.porEsc[escId][campo] = val;
        } else {
            base[campo] = val;
        }
    };
    if (t.id === "logPagoIva") write_("iva", !!t.checked);
    else if (t.id === "logPagoAnticipo") write_("anticipo", !!t.checked);
    else if (t.id === "logPagoIvaPct") {
        const n = parseFloat(String(t.value).replace(",", "."));
        write_("ivaPct", isNaN(n) ? 19 : n);
    } else if (t.id === "logPagoAnticipoPct") {
        const n = parseFloat(String(t.value).replace(",", "."));
        write_("anticipoPct", isNaN(n) ? logPagoPctAnticipoDef_() : n);
    } else return;
    if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
    logisticaActualizarVista();
}

function logisticaFeeLibreCambio_() {
    if (!logQuote || !logQuote.inicializado || logQuote.abierta) return;
    const d = logQuote.descuento;
    if (d && d.pctManual) return;
    if (d && d.activo) logisticaActualizarVista();
    else if (typeof logisticaPintarDescuento_ === "function") logisticaPintarDescuento_();
}

function logisticaPintarComision_() {
    const sel = document.getElementById("logComisionSel");
    const pctEl = document.getElementById("logComisionPct");
    const box = document.getElementById("logComisionValores");
    if (!sel || !pctEl || !box) return;
    const c = logComisionAsegurar_();
    const escs = logEscList_();
    const escId = escs.length ? logOpcionUiAsegurar_() : "";
    const ce = logComisionDeEsc_(escId);
    const rows = logComisionLista_();
    const activo = document.activeElement;
    if (activo !== sel) {
        let elegido = -1;
        rows.forEach(function (r, i) {
            if (elegido < 0 && Math.abs(r.pct - ce.pct) < 0.001 && (!c.nombre || r.nombre === c.nombre || String(c.nombre).indexOf(r.nombre) >= 0)) elegido = i;
        });
        if (elegido < 0) {
            rows.forEach(function (r, i) { if (elegido < 0 && Math.abs(r.pct - ce.pct) < 0.001) elegido = i; });
        }
        sel.innerHTML = rows.map(function (r, i) {
            return "<option value=\"" + i + "\">" + logEsc_(r.nombre) + " (" + logFmtNum_(r.pct, "es", 1) + "%)</option>";
        }).join("") + "<option value=\"custom\">Otro %</option>";
        sel.value = elegido < 0 ? "custom" : String(elegido);
    }
    if (activo !== pctEl) pctEl.value = String(ce.pct);
    if (box.contains(activo)) return;
    const idioma = logisticaLeerOpciones_().idioma;
    const bases = logTotalesPartes_(idioma).prod;
    const claves = escs.length ? escs : [{ id: "", nombre: "" }];
    const mon = logQuote.moneda || "COP";
    const nd = logDecimales_();
    box.innerHTML = claves.map(function (e, i) {
        const k = e.id || "";
        const base = bases[k] || 0;
        const ck = logComisionDeEsc_(k);
        const calc = logComisionValor_(base, ck.pct, logDescuentoActivo_(k) ? 0 : c.fee);
        const manual = c.valorManual && Object.prototype.hasOwnProperty.call(c.valorManual, k);
        const val = manual ? c.valorManual[k] : calc;
        const etiqueta = escs.length ? logEscNombre_(e, i, idioma) : "Valor";
        return "<div class=\"d-flex align-items-center gap-2 mb-1\">" +
            "<div class=\"small flex-grow-1\"><div class=\"fw-semibold\">" + logEsc_(etiqueta) + (ck.override ? " · pers." : "") + "</div>" +
            "<div class=\"text-muted\">Base proyectos " + logFmtMoneda_(base, "es", nd) + " " + logEsc_(mon) + "</div></div>" +
            "<input type=\"number\" class=\"form-control form-control-sm text-end\" style=\"width:120px\" step=\"" + (nd ? "0.01" : "1") + "\" data-com-val=\"" + logEsc_(k) + "\" value=\"" + (nd ? Number(val).toFixed(2) : String(Math.round(val))) + "\" title=\"Comisión incluida en el precio de venta. Si cambias el %, el precio de la cotización se recalcula y este valor también.\">" +
            "</div>";
    }).join("");
}

function logisticaOnComision_(ev) {
    const t = ev.target;
    if (!t) return;
    const c = logComisionAsegurar_();
    const escs = logEscList_();
    const escId = escs.length ? logOpcionUiAsegurar_() : "";
    if (t.id === "logComisionSel") {
        if (t.value === "custom") return;
        const hit = logComisionLista_()[Number(t.value)];
        if (!hit) return;
        logComisionEscribirPct_(hit.pct, !!escId);
        if (!escId) c.nombre = hit.nombre;
        c.valorManual = null;
    } else if (t.id === "logComisionPct") {
        const n = parseFloat(t.value);
        logComisionEscribirPct_(isNaN(n) ? 0 : n, !!escId);
        if (!escId) c.nombre = "";
        c.valorManual = null;
    } else if (t.getAttribute && t.getAttribute("data-com-val") != null) {
        const k = t.getAttribute("data-com-val");
        const n = t.value === "" ? NaN : Number(t.value);
        if (!c.valorManual) c.valorManual = {};
        if (isNaN(n)) delete c.valorManual[k];
        else c.valorManual[k] = n;
        if (c.valorManual && !Object.keys(c.valorManual).length) c.valorManual = null;
        if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
        logisticaPintarComision_();
        return;
    } else return;
    if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
    logisticaActualizarVista();
}

var LOG_PARTIDAS_BASE_ = [
    { codigo: "3926.90.00.00", nombre: "Displays plásticos" },
    { codigo: "3926.90.90.00", nombre: "Displays plásticos" },
    { codigo: "3926.90.90.90", nombre: "Displays plásticos" },
    { codigo: "3926.90.97.00", nombre: "Displays plásticos" },
    { codigo: "3926.90.99.00", nombre: "Displays plásticos" },
    { codigo: "4819.10.00.00", nombre: "Cajas de cartón corrugado" },
    { codigo: "4819.20.00.00", nombre: "Cajas plegadizas" },
    { codigo: "4908.90.90.00", nombre: "Calcomanías" },
    { codigo: "4911.10.00.00", nombre: "Impresos publicitarios y catálogos" },
    { codigo: "4911.10.90.00", nombre: "Impresos publicitarios y catálogos" },
    { codigo: "4911.10.90.90", nombre: "Impresos publicitarios y catálogos" },
    { codigo: "4911.10.99.00", nombre: "Impresos publicitarios y catálogos" },
    { codigo: "4911.99.00.00", nombre: "Demás impresos publicitarios" },
    { codigo: "7310.29.90.00", nombre: "Envases de hojalata" },
    { codigo: "8418.50.00.00", nombre: "Neveras comerciales" },
    { codigo: "9403.20.00.00", nombre: "Exhibidores metálicos" },
    { codigo: "9403.20.00.11", nombre: "Displays metálicos" },
    { codigo: "9403.20.13.00", nombre: "Exhibidores metálicos" },
    { codigo: "9403.20.93.00", nombre: "Displays metálicos" },
    { codigo: "9403.20.99.00", nombre: "Exhibidores metálicos" },
    { codigo: "9403.20.99.01", nombre: "Displays metálicos" },
    { codigo: "9403.60.00.00", nombre: "Exhibidores de madera" },
    { codigo: "9403.60.19.00", nombre: "Exhibidores de madera" },
    { codigo: "9403.70.00.00", nombre: "Exhibidores plásticos" },
    { codigo: "9403.70.11.00", nombre: "Exhibidor de plástico" },
    { codigo: "9403.70.91.00", nombre: "Displays plásticos" },
    { codigo: "9403.70.99.00", nombre: "Exhibidores plásticos" },
    { codigo: "9403.80.00.00", nombre: "Exhibidores de cartón" },
    { codigo: "9403.80.01.00", nombre: "Exhibidores de cartón" },
    { codigo: "9403.89.00.00", nombre: "Exhibidores de cartón" },
    { codigo: "9405.60.00.00", nombre: "Caja de luz publicitaria" }
];

function logPartidaFmt_(raw) {
    const d = String(raw || "").replace(/\D/g, "");
    if (d.length < 6) return String(raw || "").trim().slice(0, 24);
    const p = (d.length >= 10 ? d.slice(0, 10) : d.padEnd(10, "0"));
    return p.slice(0, 4) + "." + p.slice(4, 6) + "." + p.slice(6, 8) + "." + p.slice(8, 10);
}

function logNormalizarPartida_(raw) {
    if (!raw) return null;
    const codigo = logPartidaFmt_(raw.codigo);
    const nombre = String(raw.nombre || "").trim();
    if (logArancelDigitos_(codigo).length < 6 || !nombre) return null;
    return { codigo: codigo, nombre: nombre.slice(0, 80) };
}

function logPaisArancelMatch_(r, pais) {
    if (!pais) return true;
    if (!r) return false;
    const cod = String(logEnvCodigoDePais_(pais) || "").toUpperCase();
    const n = logArancelNorm_(pais);
    if (cod && String(r.codigo || "").toUpperCase() === cod) return true;
    if (cod && logEnvCodigoDePais_(r.pais) === cod) return true;
    if (n && logArancelNorm_(r.pais) === n) return true;
    /* Misma familia de alias que logAplicarAranceles_ (PR/US/MX…). */
    const alias = { US: ["usa", "eeuu", "estados unidos", "united states"], PR: ["puerto rico"], MX: ["mexico"], GB: ["reino unido", "uk"], PA: ["panama"] };
    const lista = cod && alias[cod];
    return !!(lista && lista.indexOf(logArancelNorm_(r.pais)) >= 0);
}

function logPartidasDesdeArancel_(paisFiltro) {
    const filas = ((logAranceles && logAranceles.filas) || []).filter(function (r) {
        return !paisFiltro || logPaisArancelMatch_(r, paisFiltro);
    });
    const nombres = {};
    LOG_PARTIDAS_BASE_.forEach(function (p) { nombres[logArancelDigitos_(p.codigo)] = p.nombre; });
    const map = {};
    filas.forEach(function (r) {
        const codigo = logPartidaFmt_(r.partida);
        if (logArancelDigitos_(codigo).length < 6) return;
        if (!map[codigo]) map[codigo] = { codigo: codigo, nombre: "", paises: {} };
        const nom = String(r.descripcion || "").trim();
        if (nom && !map[codigo].nombre) map[codigo].nombre = nom;
        if (r.pais) map[codigo].paises[r.pais] = true;
    });
    return Object.keys(map).sort().map(function (k) {
        const p = map[k];
        if (!p.nombre) p.nombre = nombres[logArancelDigitos_(p.codigo)] || "Partida";
        p.paises = Object.keys(p.paises).sort();
        return p;
    });
}

function logPartidasBaseLista_() {
    return LOG_PARTIDAS_BASE_.map(function (p) { return { codigo: p.codigo, nombre: p.nombre, paises: [] }; });
}

/** Maestro de partidas (lista de arriba en Ajustes): base + CONFIG + las que ya existen en Aranceles. */
function logListaPartidasMaestro_() {
    const base = logPartidasBaseLista_();
    const enBase = {};
    base.forEach(function (p) { enBase[p.codigo] = true; });
    let raw = (typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL) ? CONFIG_GLOBAL.partidas : null;
    if (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch (e) { raw = null; }
    }
    let saved = [];
    if (Array.isArray(raw)) {
        const vistos = {};
        saved = raw.map(logNormalizarPartida_).filter(Boolean).filter(function (p) {
            if (vistos[p.codigo]) return false;
            vistos[p.codigo] = true;
            return true;
        });
    }
    const tienen = {};
    saved.forEach(function (p) { tienen[p.codigo] = p; });
    const out = base.map(function (p) { return tienen[p.codigo] || p; });
    saved.forEach(function (p) { if (!enBase[p.codigo]) out.push(p); });
    /* Toda partida que aparezca en Aranceles entra al maestro (misma familia 0000.00.00.00). */
    logPartidasDesdeArancel_().forEach(function (p) {
        if (!p || !p.codigo) return;
        if (out.some(function (x) { return x.codigo === p.codigo; })) return;
        out.push({ codigo: p.codigo, nombre: p.nombre || "Partida", paises: p.paises || [] });
    });
    out.sort(function (a, b) { return String(a.codigo).localeCompare(String(b.codigo)); });
    return out.length ? out : base;
}

/**
 * Lista de partidas. opts.pais: solo las del maestro que tienen tasa en Aranceles para ese país
 * (Costos = país cliente; Cotizaciones = destino Envío). Sin país = maestro completo (admin).
 * Si el catálogo aún no cargó, dispara la lectura y devuelve [] (el select muestra "Cargando…").
 */
function logListaPartidas_(opts) {
    opts = opts || {};
    const pais = String(opts.pais != null ? opts.pais : "").trim();
    const maestro = logListaPartidasMaestro_();
    if (!pais) return maestro;
    if (!logAranceles.filas) {
        if (typeof logCargarAranceles_ === "function") logCargarAranceles_();
        return [];
    }
    const delPais = {};
    logPartidasDesdeArancel_(pais).forEach(function (p) { delPais[p.codigo] = p; });
    return maestro.filter(function (p) { return !!delPais[p.codigo]; }).map(function (p) {
        const hit = delPais[p.codigo];
        return { codigo: p.codigo, nombre: p.nombre || (hit && hit.nombre) || "Partida", paises: (hit && hit.paises) || [pais] };
    });
}

function logPaisCliente_() {
    if (typeof localeProyectoActual === "function") return String(localeProyectoActual().pais || "").trim();
    return "";
}

function logPaisEnvio_() {
    const escUi = logEscList_().length ? logOpcionUiAsegurar_() : "";
    const vista = logEnvVistaEsc_(escUi);
    return String((vista && vista.destinoPais) || "").trim();
}

function logPaisesDelListado_() {
    const vistos = {};
    ((logAranceles && logAranceles.filas) || []).forEach(function (r) {
        const p = String(r.pais || "").trim();
        if (p) vistos[p] = true;
    });
    const cliente = logPaisCliente_();
    if (cliente) vistos[cliente] = true;
    return Object.keys(vistos).sort(function (a, b) {
        return logArancelNorm_(a).localeCompare(logArancelNorm_(b));
    });
}

function logPartidaValidaEnPais_(codigo, pais) {
    const fmt = logPartidaFmt_(codigo || "");
    if (!fmt || !pais) return !fmt;
    return logListaPartidas_({ pais: pais }).some(function (p) { return p.codigo === fmt; });
}

function logTextoPartida_(fila) {
    if (!fila || (fila.tipo !== "item" && fila.tipo !== "libre")) return "";
    const f = fila.tipo === "item"
        ? ((fila.snap && fila.snap.ficha) || logFichaVersion_(fila.ver, fila.elem) || {})
        : {};
    const ov = fila.over || {};
    let nom = "";
    if (fila.elem) {
        const verEl = logVersiones_().find(function (x) { return logVerIgual_(x.id, fila.ver); });
        const elObj = verEl && verEl.elementos ? verEl.elementos.find(function (e) { return String(e.id) === String(fila.elem); }) : null;
        nom = (elObj && elObj.nombre) || "";
    }
    return [nom, f.titulo, f.descripcion, ov.titulo, ov.desc].filter(Boolean).join("\n");
}

/** Una sola familia de material. Si la ficha mezcla dos, no elige. opts.pais limita al catálogo del país. */
function logSugerirPartida_(texto, opts) {
    const t = String(texto || "");
    const pais = opts && opts.pais != null ? String(opts.pais).trim() : "";
    const ok = {};
    logListaPartidas_(pais ? { pais: pais } : {}).forEach(function (p) { ok[p.codigo] = true; });
    if (pais && !Object.keys(ok).length) return { codigo: "", ambiguo: false, sinCatalogo: true };
    const reglas = [
        { codigo: "9403.20.00.00", re: /met[aá]lic|acero|aluminio|\bmetal\b/i },
        { codigo: "9403.60.00.00", re: /madera|\bmdf\b|triplay|\bwood\b/i },
        { codigo: "9403.70.00.00", re: /cartonplast|polionda|polipropileno/i },
        { codigo: "3926.90.90.90", re: /displays?\s+pl[aá]stic/i },
        { codigo: "9403.70.00.00", re: /pl[aá]stic|acr[ií]lic|termoform/i },
        { codigo: "9403.89.00.00", re: /cart[oó]n(?!plast)|plegadiz/i },
        { codigo: "4911.10.00.00", re: /cat[aá]logo|volante|impresos?\s+publicitari/i },
        { codigo: "4819.10.00.00", re: /caja[s]?\s+(de\s+)?cart[oó]n\s+corrugado/i },
        { codigo: "4819.20.00.00", re: /caja[s]?\s+plegadiz/i },
        { codigo: "4908.90.90.00", re: /calcoman/i },
        { codigo: "7310.29.90.00", re: /hojalata/i },
        { codigo: "8418.50.00.00", re: /nevera|refrigerad/i },
        { codigo: "9405.60.00.00", re: /caja de luz|light\s*box/i }
    ];
    const hits = [];
    reglas.forEach(function (r) {
        if (!ok[r.codigo] || !r.re.test(t) || hits.indexOf(r.codigo) >= 0) return;
        hits.push(r.codigo);
    });
    if (hits.indexOf("3926.90.90.90") >= 0) {
        const i = hits.indexOf("9403.70.00.00");
        if (i >= 0) hits.splice(i, 1);
    }
    if (hits.indexOf("4819.10.00.00") >= 0 || hits.indexOf("4819.20.00.00") >= 0) {
        const i = hits.indexOf("9403.89.00.00");
        if (i >= 0) hits.splice(i, 1);
    }
    if (hits.length === 1) return { codigo: hits[0], ambiguo: false };
    return { codigo: "", ambiguo: hits.length > 1 };
}

function logElementoDeFila_(fila) {
    if (!fila || !fila.elem) return null;
    const ver = logVersiones_().find(function (x) { return logVerIgual_(x.id, fila.ver); });
    if (!ver || !ver.elementos) return null;
    return ver.elementos.find(function (e) { return String(e.id) === String(fila.elem); }) || null;
}

function logPartidaDeElemento_(fila) {
    const el = logElementoDeFila_(fila);
    const deEl = el && el.fichaComercial ? el.fichaComercial.partida : "";
    if (deEl) return logPartidaFmt_(deEl);
    if (fila && String(fila.elem) && typeof elementoActivoObj_ === "function") {
        const activo = elementoActivoObj_();
        if (activo && String(activo.id) === String(fila.elem) && activo.fichaComercial && activo.fichaComercial.partida) {
            return logPartidaFmt_(activo.fichaComercial.partida);
        }
    }
    return "";
}

function logEscribirPartidaFicha_(fila, codigo) {
    const fmt = codigo ? logPartidaFmt_(codigo) : "";
    const el = logElementoDeFila_(fila);
    if (el) {
        el.fichaComercial = el.fichaComercial || {};
        el.fichaComercial.partida = fmt;
    }
    if (typeof elementoActivoObj_ === "function") {
        const activo = elementoActivoObj_();
        if (activo && fila && String(activo.id) === String(fila.elem)) {
            activo.fichaComercial = activo.fichaComercial || {};
            activo.fichaComercial.partida = fmt;
            const sel = document.getElementById("fichaPartida");
            if (sel && document.activeElement !== sel) sel.value = fmt;
        }
    }
    if (fila) {
        fila.partida = fmt;
        /* Congelado: la cotización guarda la partida en snap.ficha al serializar. */
        if (fila.snap) {
            fila.snap.ficha = fila.snap.ficha || {};
            fila.snap.ficha.partida = fmt;
        }
    }
}

/** Restaura partida desde el snap/ficha si la fila aún no la trae (cotizaciones viejas). */
function logMigrarPartidasFilas_() {
    (logQuote.filas || []).forEach(function (fila) {
        if (!fila || fila.demo != null || (fila.tipo !== "item" && fila.tipo !== "libre")) return;
        /* Si ya vino en el JSON (aunque vacía), no pisar. */
        if (Object.prototype.hasOwnProperty.call(fila, "partida") && typeof fila.partida === "string") return;
        const deSnap = fila.snap && fila.snap.ficha ? fila.snap.ficha.partida : "";
        if (deSnap) {
            fila.partida = logPartidaFmt_(deSnap);
            return;
        }
        const deFicha = logPartidaDeElemento_(fila);
        if (deFicha) fila.partida = deFicha;
    });
}

function logAsegurarPartida_(fila) {
    if (!fila || fila.demo != null || (fila.tipo !== "item" && fila.tipo !== "libre")) return;
    if (typeof fila.partida === "string") return;
    const pais = logPaisEnvio_() || logPaisCliente_();
    const deSnap = fila.snap && fila.snap.ficha ? logPartidaFmt_(fila.snap.ficha.partida || "") : "";
    if (deSnap && (!pais || logPartidaValidaEnPais_(deSnap, pais))) { fila.partida = deSnap; return; }
    const deFicha = logPartidaDeElemento_(fila);
    if (deFicha && (!pais || logPartidaValidaEnPais_(deFicha, pais))) { fila.partida = deFicha; return; }
    const s = logSugerirPartida_(logTextoPartida_(fila), { pais: pais });
    if (s.codigo) logEscribirPartidaFicha_(fila, s.codigo);
}

function logPintarSelectPartida_(valor) {
    const sel = document.getElementById("fichaPartida");
    if (!sel) return;
    const pais = logPaisCliente_();
    if (pais && !logAranceles.filas && typeof logCargarAranceles_ === "function") logCargarAranceles_();
    const cargando = !!(pais && !logAranceles.filas);
    const lista = cargando ? [] : logListaPartidas_({ pais: pais });
    let actual = logPartidaFmt_(valor || "");
    let html = "<option value=\"\">" + (cargando
        ? "Cargando partidas…"
        : (pais ? "Partida arancelaria (" + pais + ")" : "Elige país del cliente primero")) + "</option>";
    let esta = !actual;
    lista.forEach(function (p) {
        if (p.codigo === actual) esta = true;
        html += "<option value=\"" + logEsc_(p.codigo) + "\">" + logEsc_(p.codigo + " · " + p.nombre) + "</option>";
    });
    if (!cargando && actual && !esta) {
        /* Partida de otro país: no se ofrece; se limpia. */
        actual = "";
        if (typeof elementoActivoObj_ === "function") {
            const el = elementoActivoObj_();
            if (el) {
                el.fichaComercial = el.fichaComercial || {};
                el.fichaComercial.partida = "";
                (logQuote.filas || []).forEach(function (fila) {
                    if (String(fila.elem) === String(el.id)) fila.partida = "";
                });
            }
        }
    }
    sel.innerHTML = html;
    sel.value = actual;
    sel.disabled = cargando;
    sel.title = cargando
        ? "Cargando catálogo de Aranceles…"
        : (pais
            ? ("Solo partidas de Aranceles para " + pais + ". No se imprime.")
            : "Indica el país del cliente (Odoo) para ver partidas. No se imprime.");
}

function logPintarSelectPaisCliente_() {
    const sel = document.getElementById("fichaPaisCliente");
    if (!sel) return;
    const actual = logPaisCliente_();
    const paises = logPaisesDelListado_();
    let html = "<option value=\"\">País cliente —</option>";
    let esta = !actual;
    paises.forEach(function (p) {
        if (logArancelNorm_(p) === logArancelNorm_(actual)) esta = true;
        html += "<option value=\"" + logEsc_(p) + "\"" + (logArancelNorm_(p) === logArancelNorm_(actual) ? " selected" : "") + ">" + logEsc_(p) + "</option>";
    });
    if (actual && !esta) html += "<option value=\"" + logEsc_(actual) + "\" selected>" + logEsc_(actual) + "</option>";
    sel.innerHTML = html;
    if (actual) sel.value = actual;
}

function logAlCambiarPaisCliente_() {
    const sel = document.getElementById("fichaPaisCliente");
    if (!sel) return;
    const pais = String(sel.value || "").trim();
    if (typeof cambiarLocaleProyecto === "function") cambiarLocaleProyecto({ pais: pais });
    else if (typeof aplicarLocaleProyecto === "function") aplicarLocaleProyecto({ pais: pais }, { silencio: true });
    const el = typeof elementoActivoObj_ === "function" ? elementoActivoObj_() : null;
    const partida = el && el.fichaComercial ? el.fichaComercial.partida : "";
    logPintarSelectPartida_(partida);
    if (partida && !logPartidaValidaEnPais_(partida, pais)) {
        logAlCambiarPartidaFicha_();
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("La partida ya no aplica a " + (pais || "este país") + ". Quedó en blanco; configúrala en Ajustes → Logística → Aranceles si hace falta.", "info");
        }
    }
}

function logValidarPartidasPorPaisEnvio_() {
    const pais = logPaisEnvio_();
    if (!pais) return;
    let limpio = 0;
    (logQuote.filas || []).forEach(function (fila) {
        if (fila.tipo !== "item" && fila.tipo !== "libre") return;
        const p = logPartidaFmt_(fila.partida || logPartidaDeElemento_(fila) || "");
        if (!p) return;
        if (logPartidaValidaEnPais_(p, pais)) return;
        logEscribirPartidaFicha_(fila, "");
        limpio += 1;
    });
    if (limpio && typeof mostrarNotificacion === "function") {
        mostrarNotificacion(limpio === 1
            ? "Se quitó 1 partida que no está en Aranceles para " + pais + "."
            : ("Se quitaron " + limpio + " partidas que no están en Aranceles para " + pais + "."), "info");
    }
}

function logAlCambiarPartidaFicha_() {
    const sel = document.getElementById("fichaPartida");
    if (!sel || typeof elementoActivoObj_ !== "function") return;
    const el = elementoActivoObj_();
    if (!el) return;
    const fmt = sel.value ? logPartidaFmt_(sel.value) : "";
    el.fichaComercial = el.fichaComercial || {};
    el.fichaComercial.partida = fmt;
    (logQuote.filas || []).forEach(function (fila) {
        if (String(fila.elem) !== String(el.id)) return;
        fila.partida = fmt;
    });
    if (logAplicarAranceles_()) logisticaPintarEnv_(true);
    if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
}

function logHtmlPartida_(fila) {
    if (!fila || fila.demo != null || (fila.tipo !== "item" && fila.tipo !== "libre")) return "";
    const pais = logPaisEnvio_();
    /* Destino Envío (p. ej. Panamá) manda; el país del cliente (p. ej. Puerto Rico) no. */
    if (pais && !logAranceles.filas && typeof logCargarAranceles_ === "function") logCargarAranceles_();
    const cargando = !!(pais && !logAranceles.filas);
    logAsegurarPartida_(fila);
    const sug = cargando ? { codigo: "", ambiguo: false } : logSugerirPartida_(logTextoPartida_(fila), { pais: pais });
    const lista = cargando ? [] : logListaPartidas_({ pais: pais });
    let actual = logPartidaFmt_(fila.partida || "");
    if (!cargando && actual && pais && !logPartidaValidaEnPais_(actual, pais)) {
        actual = "";
        fila.partida = "";
    }
    let ops = "<option value=\"\">" + (cargando ? "Cargando partidas…" : (pais ? "Sin partida" : "Elige destino en Envío")) + "</option>";
    let esta = !actual;
    lista.forEach(function (p) {
        if (p.codigo === actual) esta = true;
        ops += "<option value=\"" + logEsc_(p.codigo) + "\"" + (p.codigo === actual ? " selected" : "") + ">" +
            logEsc_(p.codigo + " · " + p.nombre) + "</option>";
    });
    if (actual && !esta) actual = "";
    let titulo = cargando
        ? "Cargando catálogo de Aranceles del destino Envío…"
        : (pais
            ? ("Solo partidas de " + pais + " (destino Envío). No sale en el PDF.")
            : "Elige el país de destino en Envío. No sale en el PDF.");
    if (sug.ambiguo && !actual) titulo = "La ficha menciona más de un material. Elige la partida. No sale en el PDF.";
    else if (actual && actual === sug.codigo) titulo = "Sugerida desde la ficha comercial. No sale en el PDF.";
    return "<label class=\"log-partida\" title=\"" + logEsc_(titulo) + "\"><span>Partida arancelaria</span>" +
        "<select class=\"form-select form-select-sm\" data-acc=\"partida\"" + (cargando ? " disabled" : "") + ">" + ops + "</select></label>";
}

window.logNormalizarPartida = logNormalizarPartida_;
window.logListaPartidas = logListaPartidas_;
window.logPartidasDesdeArancel = logPartidasDesdeArancel_;
window.logSugerirPartida = logSugerirPartida_;
window.logPintarSelectPartida = logPintarSelectPartida_;
window.logPintarSelectPaisCliente = logPintarSelectPaisCliente_;
window.logAlCambiarPaisCliente = logAlCambiarPaisCliente_;
window.logAlCambiarPartidaFicha = logAlCambiarPartidaFicha_;
window.logPartidaFmt = logPartidaFmt_;
window.logPaisesDelListado = logPaisesDelListado_;
window.logPaisCliente = logPaisCliente_;
window.logPaisEnvio = logPaisEnvio_;
if (typeof pintarTablaPartidas === "function") pintarTablaPartidas();

function logMonedaEtiqueta_() {
    return logQuote && logQuote.moneda === "USD" ? "USD" : "COP";
}

function logQuedanPreciosFijos_(fila) {
    if (!fila || !fila.over) return false;
    if (fila.over.unit != null) return true;
    return Object.keys(fila.over).some(function (k) { return /^unit:/.test(k); });
}

/** El número que se ve en la ficha vuelve a la base que guarda la fila (antes de comisión, o en COP si es envío). */
function logPrecioMostradoABase_(fila, n) {
    if (logEsEnvio_(fila) && !logEsCotizacionExterior_()) {
        if (logQuote && logQuote.moneda === "USD") return n * (logTrm_() || 1);
        return n;
    }
    return n / (logComisionFactor_(fila) || 1);
}

/** Escribe el precio unitario solo en la cotización. Vacío, o igual al de Costos, vuelve al precio calculado. */
function logEscribirPrecioFila_(fila, txt, escId) {
    if (!fila.over) fila.over = {};
    const idioma = logisticaLeerOpciones_().idioma;
    /* Contenedor: precio propio de la ficha. Legado multi-opción: unit:eId. */
    const clave = fila.escId ? "unit" : (escId ? "unit:" + escId : "unit");
    const limpio = String(txt == null ? "" : txt).trim();
    if (!limpio) {
        delete fila.over[clave];
        if (!logQuedanPreciosFijos_(fila)) delete fila.puFijo;
        return true;
    }
    const n = logParseNum_(limpio, idioma);
    if (n == null) return false;
    const previo = fila.over[clave];
    delete fila.over[clave];
    const auto = logFilaValores_(fila, idioma, fila.escId || escId || "");
    const tol = logDecimales_() === 0 ? 0.51 : 0.02;
    if (auto.unit != null && Math.abs(n - Number(auto.unit)) <= tol) {
        if (!logQuedanPreciosFijos_(fila)) delete fila.puFijo;
    } else {
        fila.over[clave] = logPrecioMostradoABase_(fila, n);
        fila.puFijo = true;
    }
    if (fila.over[clave] == null && previo != null && auto.unit == null) {
        fila.over[clave] = previo;
        fila.puFijo = true;
    }
    return true;
}

let logPrecioHojaTimer_ = 0;
function logProgramarHojaPrecio_() {
    clearTimeout(logPrecioHojaTimer_);
    logPrecioHojaTimer_ = setTimeout(function () {
        logPrecioHojaTimer_ = 0;
        logisticaActualizarVista({ sinFilas: true });
    }, 180);
}

function logHtmlCampo_(etiq, control) {
    return "<label class=\"log-campo\"><span>" + etiq + "</span>" + control + "</label>";
}

function logHtmlPrecioCampo_(fila, idioma, escId) {
    const v = logFilaValores_(fila, idioma, escId || "");
    const txt = v.unit == null ? "" : logFmtNum_(v.unit, idioma, logDecimales_());
    const fijo = fila.puFijo ? " log-pu-fijo" : "";
    return "<label class=\"log-campo log-campo-pu\"><span>Precio unitario <em>" + logMonedaEtiqueta_() + "</em></span>" +
        "<span class=\"log-pu" + fijo + "\"><em>$</em><input type=\"text\" inputmode=\"decimal\" autocomplete=\"off\" class=\"form-control form-control-sm\" data-acc=\"unit\" data-e=\"" + logEsc_(escId || "") + "\" value=\"" + logEsc_(txt) + "\" title=\"Este precio es solo de la cotización. Costos no cambia.\"></span></label>";
}

function logHtmlSelectCantidad_(fila, escalas, acc, extra) {
    const ops = (escalas || []).map(function (e) {
        return "<option value=\"" + logEsc_(e.id) + "\"" + (e.id === fila.lote ? " selected" : "") + ">Q " + logFmtNum_(e.q, "es", 0) + "</option>";
    }).join("") || "<option value=\"\">sin precios</option>";
    return "<select class=\"form-select form-select-sm\" data-acc=\"" + acc + "\"" + (extra || "") + ">" + ops + "</select>";
}

/** HTML de una tarjeta de fila (sin desplegables por opción: el contenedor define la opción). */
function logHtmlTarjetaFila_(fila, idioma, vers, p, escs) {
    const v = logFilaValores_(fila, idioma, fila.escId || "");
    const grip = "<span class=\"log-fila-grip\" title=\"Arrastra para reordenar o mover de opción\"><i class=\"bi bi-grip-vertical\"></i></span>";
    let accDup = "<button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-acc=\"dup\" title=\"Duplicar (mismo contenedor)\"><i class=\"bi bi-files\"></i></button>";
    if (escs.length) {
        accDup += "<button type=\"button\" class=\"btn btn-sm btn-outline-primary\" data-acc=\"dup-otra\" title=\"Duplicar a otra opción o a la zona libre\"><i class=\"bi bi-copy\"></i></button>";
    }
    const acc = "<span class=\"log-fila-acc\">" + accDup +
        "<button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-acc=\"del\" title=\"Quitar de la cotización\"><i class=\"bi bi-trash\"></i></button></span>";
    if (logEsSim3dFila_(fila)) {
        const escKey = logSim3dEscKey_(fila);
        const datos = logSim3dDatosDe_(escKey);
        const tit = logEsc_(v.titulo || "Vista 3D");
        let origen = "";
        if (escKey && escs && escs.length) {
            const ix = escs.findIndex(function (e) { return e.id === escKey; });
            if (ix >= 0) origen = "<span class=\"badge text-bg-primary\">" + (ix + 1) + "</span>";
        }
        const estado = datos.img
            ? "<span class=\"small text-success\"><i class=\"bi bi-check2-circle\"></i> Captura lista</span>"
            : "<span class=\"small text-muted\">Sin captura: Simulador → Vista 3D PDF</span>";
        const thumb = datos.img
            ? "<img src=\"" + String(datos.img).replace(/"/g, "") + "\" alt=\"\" style=\"max-height:48px;border:1px solid #ddd;border-radius:4px;\">"
            : "<i class=\"bi bi-box\" style=\"font-size:1.4rem;opacity:.45\"></i>";
        const layBtn = "<button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-acc=\"sim3d-lay\" title=\"Tamaño y alineación en el PDF\"><i class=\"bi bi-arrows-fullscreen\"></i></button>";
        return "<div class=\"log-fila log-fila-simple log-fila-sim3d\" data-r=\"" + fila.uid + "\"><div class=\"log-fila-top\">" + grip +
            "<span class=\"badge text-bg-dark\">Vista 3D</span>" + origen +
            "<span class=\"log-fila-tit\">" + tit + "</span>" +
            "<button type=\"button\" class=\"log-fila-img\" data-acc=\"sim3d-lay\" title=\"Tamaño y alineación en el PDF\">" + thumb + "</button>" +
            estado + "<span class=\"log-fila-acc\">" + layBtn + accDup +
            "<button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-acc=\"del\" title=\"Quitar de la cotización\"><i class=\"bi bi-trash\"></i></button></span></div></div>";
    }
    if (logEsTextoFila_(fila)) {
        const badge = fila.tipo === "obs"
            ? "<span class=\"badge text-bg-info\">Observaciones</span>"
            : "<span class=\"badge text-bg-secondary\">Sección</span>";
        const tit = logEsc_(v.titulo || (fila.tipo === "obs" ? "(sin texto)" : "(sin título)"));
        return "<div class=\"log-fila log-fila-simple\" data-r=\"" + fila.uid + "\"><div class=\"log-fila-top\">" + grip + badge +
            "<span class=\"log-fila-tit\">" + tit + "</span>" + acc + "</div></div>";
    }
    if (logEsEnvio_(fila)) {
        return "<div class=\"log-fila\" data-r=\"" + fila.uid + "\"><div class=\"log-fila-top\">" + grip +
            "<span class=\"badge text-bg-warning\">Envío</span><span class=\"log-fila-tit\">" + logEsc_(v.titulo || "(flete / envío)") + "</span>" + acc + "</div>" +
            "<div class=\"log-fila-campos\">" + logHtmlPrecioCampo_(fila, idioma, fila.escId || "") + "</div></div>";
    }
    let marca = "";
    let campos = "";
    const img = "<button type=\"button\" class=\"log-fila-img\" data-acc=\"img\" title=\"Editar imagen: acercar, recortar o girar\">" +
        (v.img ? "<img src=\"" + logEsc_(v.img) + "\" alt=\"\">" : "<i class=\"bi bi-image\"></i>") + "</button>";
    if (fila.tipo === "item" && fila.snap) {
        const escalasSnap = logEscalasFila_(fila);
        const mismoProy = p.hayProyecto && logNormCod_(p.codigo) === logNormCod_(fila.proy);
        const puedeCambiarVer = mismoProy && vers.length > 0;
        if (puedeCambiarVer) {
            const optV = vers.map(function (x) {
                return "<option value=\"" + logEsc_(x.id) + "\"" + (logVerIgual_(x.id, fila.ver) ? " selected" : "") + ">" + logEsc_(x.id) + "</option>";
            }).join("");
            campos += logHtmlCampo_("Versión", "<select class=\"form-select form-select-sm\" data-acc=\"ver\" title=\"Cambia a otra versión del proyecto abierto en Costos\">" + optV + "</select>");
            marca = "<span class=\"badge text-bg-light border\" title=\"Vino del historial; al cambiar versión se releen ficha y precio de Costos\"><i class=\"bi bi-snow2\"></i></span>" +
                "<button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-acc=\"refrescar\" title=\"Vuelve a leer ficha y precio de la versión abierta en Costos\"><i class=\"bi bi-arrow-repeat\"></i></button>";
        } else {
            marca = "<span class=\"badge text-bg-light border\" title=\"Precio y ficha tal como se guardaron\"><i class=\"bi bi-snow2 me-1\"></i>" + logEsc_(fila.ver || "") + "</span>" +
                (mismoProy
                    ? "<button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-acc=\"refrescar\" title=\"Vuelve a leer ficha y precio del proyecto abierto\"><i class=\"bi bi-arrow-repeat\"></i></button>"
                    : "");
        }
        if (escalasSnap.length) campos += logHtmlCampo_("Cantidad", logHtmlSelectCantidad_(fila, escalasSnap, "lote", ""));
    } else if (fila.tipo === "item") {
        const pr = logPreciosVersion_(fila.ver, fila.elem);
        const optV = vers.map(function (x) {
            return "<option value=\"" + logEsc_(x.id) + "\"" + (logVerIgual_(x.id, fila.ver) ? " selected" : "") + ">" + logEsc_(x.id) + "</option>";
        }).join("");
        campos += logHtmlCampo_("Versión", "<select class=\"form-select form-select-sm\" data-acc=\"ver\">" + optV + "</select>");
        const escalas = pr && pr.escalas.length ? pr.escalas : [];
        if (escalas.length) campos += logHtmlCampo_("Cantidad", logHtmlSelectCantidad_(fila, escalas, "lote", ""));
    }
    campos += logHtmlPrecioCampo_(fila, idioma, fila.escId || "");
    const identidad = img + "<span class=\"log-fila-id\"><span class=\"badge " + (fila.tipo === "item" ? "text-bg-primary" : "text-bg-light border") + "\">" +
        (fila.tipo === "item" ? "Proyecto" : "Libre") + "</span>" +
        "<span class=\"log-fila-tit\"><b>" + logEsc_(v.cod) + "</b> " + logEsc_(v.titulo) +
        (v.aviso ? " <span class=\"text-danger\" title=\"" + logEsc_(v.aviso) + "\"><i class=\"bi bi-exclamation-triangle\"></i></span>" : "") +
        "</span></span>" +
        (fila.img ? "<button type=\"button\" class=\"btn btn-sm btn-link text-muted p-0\" data-acc=\"noimg\" title=\"Quitar la imagen subida (vuelve la de Odoo)\"><i class=\"bi bi-x-circle\"></i></button>" : "") +
        marca;
    return "<div class=\"log-fila\" data-r=\"" + fila.uid + "\"><div class=\"log-fila-top\">" + grip + identidad + acc + "</div>" +
        (campos ? "<div class=\"log-fila-campos\">" + campos + "</div>" : "") +
        logHtmlPartida_(fila) + "</div>";
}

function logisticaPintarFilas_() {
    const box = document.getElementById("logFilasLista");
    if (!box) return;
    logAsegurarFilas_();
    const activo = document.activeElement;
    if (activo && activo.getAttribute && activo.getAttribute("data-acc") === "unit" && box.contains(activo)) {
        logisticaPintarBadge_();
        return;
    }
    logisticaPintarBadge_();
    logisticaPintarMenuAgregar_();
    logisticaPintarColumnas_();
    logisticaPintarEscenarios_(true);
    const idioma = logisticaLeerOpciones_().idioma;
    const esEn = idioma === "en";
    const escs = logEscList_();
    const vers = logVersiones_();
    const p = logisticaLeerProyecto_();
    if (!logQuote.trm) logQuote.trm = logTrmDesdeCostos_();
    const inpTrm = document.getElementById("logTRM");
    if (inpTrm && document.activeElement !== inpTrm) inpTrm.value = logTrm_() || "";
    const nota = document.getElementById("logMonedaNota");
    if (nota) nota.textContent = "";
    logisticaPintarEnv_();
    logNormalizarFilasSim3dEnOpcion_();
    /** Productos primero, Vista 3D al final del mismo contenedor. */
    const ordenFilasBucket_ = function (filas) {
        const prod = [];
        const s3 = [];
        (filas || []).forEach(function (f) {
            if (!f) return;
            if (f.tipo === "sim3d") s3.push(f);
            else prod.push(f);
        });
        return prod.concat(s3);
    };
    if (escs.length) {
        const baseFilas = ordenFilasBucket_((logQuote.filas || []).filter(function (f) {
            return !logEsEnvio_(f) && !f.escId;
        }));
        const baseCuerpo = baseFilas.map(function (fila) { return logHtmlTarjetaFila_(fila, idioma, vers, p, escs); }).join("") ||
            "<div class=\"log-opc-bucket-empty\">" + (esEn ? "Same project + different Q here share image and description." : "Mismo proyecto con distinta Q aquí: comparten imagen y descripción.") + "</div>";
        let html = "<div class=\"log-opc-bucket log-opc-bucket-base\" data-base=\"1\">" +
            "<div class=\"log-opc-bucket-h\">" +
            "<span class=\"badge text-bg-secondary\">" + (esEn ? "Ranges" : "Rangos") + "</span>" +
            "<span class=\"small text-muted flex-grow-1\">" + (esEn ? "Outside options · shared render" : "Fuera de opciones · render compartido") + "</span>" +
            "<label class=\"log-esc-salto\"><input type=\"checkbox\" class=\"form-check-input\" data-base-salto" + (logQuote.baseHojaNueva ? " checked" : "") + "> " + (esEn ? "New sheet" : "Hoja nueva") + "</label>" +
            "</div>" +
            "<div class=\"log-opc-bucket-list\" data-e=\"\">" + baseCuerpo + "</div></div>";
        html += escs.map(function (e, i) {
            const filas = ordenFilasBucket_(logFilasDeEsc_(e.id).filter(function (f) { return !!f.escId; }));
            const cuerpo = filas.map(function (fila) { return logHtmlTarjetaFila_(fila, idioma, vers, p, escs); }).join("") ||
                "<div class=\"log-opc-bucket-empty\">" + (esEn ? "Drop projects here. Cards inside an option stay independent." : "Suelta proyectos aquí. Dentro de una opción cada ficha va aparte.") + "</div>";
            const puedeSalto = i > 0 || baseFilas.filter(function (f) { return f.tipo !== "sim3d"; }).length > 0;
            return "<div class=\"log-opc-bucket\" data-e=\"" + logEsc_(e.id) + "\">" +
                "<div class=\"log-opc-bucket-h\">" +
                "<span class=\"log-opc-bucket-grip log-esc-grip\" title=\"" + (esEn ? "Reorder options" : "Reordenar opciones") + "\"><i class=\"bi bi-grip-vertical\"></i></span>" +
                "<span class=\"badge text-bg-primary\">" + (i + 1) + "</span>" +
                "<input type=\"text\" class=\"form-control form-control-sm\" data-esc-nombre value=\"" + logEsc_(e.nombre || "") + "\" placeholder=\"" + logEsc_(logEscNombre_({}, i, idioma)) + "\" title=\"Nombre de la opción\">" +
                "<label class=\"log-esc-salto\"><input type=\"checkbox\" class=\"form-check-input\" data-esc-salto" + (e.hojaNueva && puedeSalto ? " checked" : "") + (puedeSalto ? "" : " disabled") + "> " + (esEn ? "New sheet" : "Hoja nueva") + "</label>" +
                "<button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-esc-del title=\"Quitar opción\"><i class=\"bi bi-x-lg\"></i></button>" +
                "</div>" +
                "<div class=\"log-opc-bucket-list\" data-e=\"" + logEsc_(e.id) + "\">" + cuerpo + "</div></div>";
        }).join("");
        box.innerHTML = html;
    } else {
        const filas = ordenFilasBucket_((logQuote.filas || []).filter(function (f) { return !logEsEnvio_(f); }));
        const cuerpo = filas.map(function (fila) { return logHtmlTarjetaFila_(fila, idioma, vers, p, []); }).join("") ||
            "<div class=\"text-muted small p-2\">Sin filas todavía.</div>";
        box.innerHTML = "<div class=\"log-opc-bucket log-opc-bucket-base\" data-base=\"1\">" +
            "<div class=\"log-opc-bucket-h\">" +
            "<span class=\"badge text-bg-secondary\">" + (esEn ? "Ranges" : "Rangos") + "</span>" +
            "<span class=\"small text-muted flex-grow-1\">" + (esEn ? "Same project · shared render" : "Mismo proyecto · render compartido") + "</span>" +
            "<label class=\"log-esc-salto\"><input type=\"checkbox\" class=\"form-check-input\" data-base-salto" + (logQuote.baseHojaNueva ? " checked" : "") + "> " + (esEn ? "New sheet" : "Hoja nueva") + "</label>" +
            "</div>" +
            "<div class=\"log-opc-bucket-list\" data-e=\"\">" + cuerpo + "</div></div>";
    }
    logisticaInitContenedoresSortable_();
    logisticaInitSortableUnica_();
    logisticaPintarOpcTabsTodas_();
    logisticaPintarComision_();
    logisticaPintarDescuento_();
    logisticaPintarPago_();
}

function logisticaAccionFila_(ev) {
    const t = ev.target.closest("[data-acc]");
    const row = ev.target.closest(".log-fila");
    if (!t || !row) return;
    const fila = logFilaPorUid_(row.getAttribute("data-r"));
    if (!fila) return;
    const acc = t.getAttribute("data-acc");
    if (ev.type === "change") {
        if (acc === "partida") {
            logEscribirPartidaFicha_(fila, t.value);
            logMarcarSucio_();
            logAplicarAranceles_();
            logisticaPintarEnv_(true);
            if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
            return;
        }
        if (acc === "ver" || acc === "lote") logMarcarSucio_();
        if (acc === "ver") {
            fila.ver = t.value;
            if (fila.snap) {
                if (!logisticaRefrescarFilaDesdeCostos_(fila, { ver: t.value }) && typeof mostrarNotificacion === "function") {
                    mostrarNotificacion("Costos no tiene precios para " + t.value + ". Abre esa versión y genera la matriz primero.", "warning");
                }
            } else {
                const pr = logPreciosVersion_(fila.ver, fila.elem);
                fila.lote = pr && pr.escalas.length ? pr.escalas[0].id : "";
                fila.over = {};
                delete fila.puFijo;
                delete fila.opc;
                delete fila.excl;
            }
        } else if (acc === "lote") {
            fila.lote = t.value;
            delete fila.over.qty;
            delete fila.over.unit;
            if (!logQuedanPreciosFijos_(fila)) delete fila.puFijo;
        } else { return; }
        logisticaRefrescarTabla_();
        return;
    }
    if (acc === "sim3d-lay") {
        logisticaAbrirEditorSim3d_(fila.uid);
        return;
    }
    if (acc !== "img") logMarcarSucio_();
    if (acc === "img") { logisticaAbrirEditorImagen_(fila.uid); }
    else if (acc === "refrescar") {
        if (!logisticaRefrescarFilaDesdeCostos_(fila) && typeof mostrarNotificacion === "function") {
            mostrarNotificacion("Costos no tiene precios calculados para esta fila. Genera la matriz primero.", "warning");
        }
        logisticaRefrescarTabla_();
    }
    else if (acc === "noimg") { logImgQuitar_(fila); logisticaRefrescarTabla_(); }
    else if (acc === "dup") {
        const copia = JSON.parse(JSON.stringify(fila));
        copia.uid = logNuevoUid_();
        if (fila.escId) copia.escId = fila.escId;
        const i = logQuote.filas.indexOf(fila);
        logQuote.filas.splice(i + 1, 0, copia);
        if (logLayout.filaAlto[fila.uid]) logLayout.filaAlto[copia.uid] = logLayout.filaAlto[fila.uid];
        logisticaRefrescarTabla_();
    } else if (acc === "dup-otra") {
        const escs = logEscList_();
        if (!escs.length) return;
        const idioma = logisticaLeerOpciones_().idioma;
        let destId = "";
        let destNom = idioma === "en" ? "Ranges (shared)" : "Rangos (compartido)";
        if (fila.escId) {
            const ix = escs.findIndex(function (x) { return x.id === fila.escId; });
            const sig = escs[ix + 1] || null;
            if (sig) {
                destId = sig.id;
                destNom = logEscNombre_(sig, ix + 1, idioma);
            }
        } else {
            destId = escs[0].id;
            destNom = logEscNombre_(escs[0], 0, idioma);
        }
        if (destId) logDuplicarFilaEnEsc_(fila.uid, destId);
        else {
            const copia = JSON.parse(JSON.stringify(fila));
            copia.uid = logNuevoUid_();
            delete copia.escId;
            const i = logQuote.filas.indexOf(fila);
            logQuote.filas.splice(i + 1, 0, copia);
            if (logLayout.filaAlto[fila.uid]) logLayout.filaAlto[copia.uid] = logLayout.filaAlto[fila.uid];
            logMarcarSucio_();
        }
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion((idioma === "en" ? "Copied to " : "Duplicada en ") + destNom, "success");
        }
        logisticaRefrescarTabla_();
    } else if (acc === "del") {
        logQuote.filas.splice(logQuote.filas.indexOf(fila), 1);
        delete logLayout.filaAlto[fila.uid];
        logisticaRefrescarTabla_();
    }
}

/* --- consolidado: agregar una versión guardada de otro proyecto (sin cambiar el abierto) --- */

let logOtro = { lista: [], q: "", id: "", payload: null, selElem: {} };

function logCodigoDePayload_(p) {
    const cab = (p && p.cabecera) || {};
    /* Preferir noProyecto (código limpio); nombreProyecto puede traer «17717-B 17661-B TITULO». */
    const id = String(cab.noProyecto || "").trim();
    if (id && !/\s/.test(id)) return id;
    if (typeof codigoOportunidadLimpio_ === "function") {
        const limpio = codigoOportunidadLimpio_(id || cab.nombreProyecto || "");
        if (limpio) return limpio;
    }
    const nom = String(cab.nombreProyecto || cab.noProyecto || "").trim();
    return (nom.split(/\s+/)[0] || "").trim();
}

function logVersionesDePayload_(p) {
    p = p || {};
    if (Array.isArray(p.versiones) && p.versiones.length) return p.versiones;
    return [{
        id: "V1",
        comentario: "",
        tipoPresupuesto: p.cabecera && p.cabecera.tipoPresupuesto,
        matrizItems: p.matrizItems || p.items || [],
        escalas: p.escalas || p.lotes || [{ id: "l1", q: 1 }],
        fichaComercial: p.fichaComercial || {}
    }];
}

/** Precios de una versión individual ajena (sin elementos). No usa la matriz del proyecto abierto. */
function logPreciosVersionAjenaIndiv_(ver) {
    if (!ver || typeof calcularPreciosVersion_ !== "function") return null;
    const copia = JSON.parse(JSON.stringify(ver));
    copia.id = "_ext_" + String(ver.id || "V1");
    delete copia.elementos;
    return calcularPreciosVersion_(copia);
}

/**
 * Precios de una versión ajena. En grupal la matriz vive en cada elemento, no en ver.matrizItems;
 * sin este cruce el modal de consolidado marcaba «sin precios» en todos los grupales.
 */
function logPreciosVersionAjena_(ver) {
    if (!ver || typeof calcularPreciosVersion_ !== "function") return null;
    const elems = Array.isArray(ver.elementos) ? ver.elementos : [];
    if (!elems.length) return logPreciosVersionAjenaIndiv_(ver);
    const conMatriz = elems.find(function (el) { return el && (el.matrizItems || []).length; }) || elems[0];
    return logPreciosVersionAjenaIndiv_(Object.assign({}, ver, {
        matrizItems: (conMatriz && conMatriz.matrizItems) || [],
        escalas: (conMatriz && conMatriz.escalas && conMatriz.escalas.length)
            ? conMatriz.escalas
            : (ver.escalas || []),
        fichaComercial: (conMatriz && conMatriz.fichaComercial) || ver.fichaComercial || {}
    }));
}

/** Escalas (con precio si se puede) de una pieza ajena. */
function logEscalasDeElementoAjeno_(ver, el) {
    if (!ver) return [];
    if (!el) {
        const pr0 = logPreciosVersionAjenaIndiv_(ver);
        return (pr0 && pr0.escalas) ? pr0.escalas : ((ver.escalas || []).map(function (e) {
            return { id: e.id, q: Number(e.q) || 1, puCop: e.puCop != null ? e.puCop : null };
        }));
    }
    const copia = Object.assign({}, ver, {
        matrizItems: el.matrizItems || [],
        escalas: el.escalas && el.escalas.length ? el.escalas : (ver.escalas || []),
        fichaComercial: el.fichaComercial || ver.fichaComercial || {}
    });
    const pr = logPreciosVersionAjenaIndiv_(copia);
    if (pr && pr.escalas && pr.escalas.length) return pr.escalas;
    const crudas = (el.escalas && el.escalas.length) ? el.escalas : (ver.escalas || []);
    return (crudas || []).map(function (e) {
        return { id: e.id, q: Number(e.q) || 1, puCop: e.puCop != null ? e.puCop : null };
    });
}

/**
 * Escalas (Q) del modal: solo las de las piezas elegidas.
 * Varias piezas → intersección (cantidades que todas tienen). Una sola → las suyas.
 */
function logEscalasUiVersionAjena_(ver, elemsSel) {
    if (!ver) return [];
    const todos = Array.isArray(ver.elementos) ? ver.elementos.filter(Boolean) : [];
    const elems = (elemsSel && elemsSel.length) ? elemsSel : todos;
    if (!todos.length) return logEscalasDeElementoAjeno_(ver, null);
    if (!elems.length) return [];
    const listas = elems.map(function (el) { return logEscalasDeElementoAjeno_(ver, el); });
    if (listas.length === 1) return listas[0].slice().sort(function (a, b) { return (Number(a.q) || 0) - (Number(b.q) || 0); });
    const base = {};
    (listas[0] || []).forEach(function (e) {
        const q = Number(e.q) || 1;
        base[q] = { id: e.id, q: q, puCop: e.puCop != null ? e.puCop : null };
    });
    for (let i = 1; i < listas.length; i++) {
        const qs = {};
        (listas[i] || []).forEach(function (e) { qs[Number(e.q) || 1] = true; });
        Object.keys(base).forEach(function (q) {
            if (!qs[q]) delete base[q];
        });
    }
    return Object.keys(base).map(Number).sort(function (a, b) { return a - b; }).map(function (q) { return base[q]; });
}

/** Elige la escala por id o por Q. Si exacta=false y no hay match, usa la primera (compat). */
function logElegirEscalaPorLoteOQ_(escalas, loteId, qHint, exacta) {
    if (!escalas || !escalas.length) return null;
    if (loteId != null && loteId !== "" && escalas.some(function (e) { return e.id === loteId; })) {
        return escalas.find(function (e) { return e.id === loteId; });
    }
    if (qHint != null && qHint !== "" && isFinite(Number(qHint))) {
        const hit = escalas.find(function (e) { return Number(e.q) === Number(qHint); });
        if (hit) return hit;
    }
    return exacta ? null : escalas[0];
}

function logNuevaFilaCongelada_(p, ver, loteId, qHint) {
    const codigo = logCodigoDePayload_(p);
    const pr = logPreciosVersionAjena_(ver);
    const escalas = pr && pr.escalas ? pr.escalas.map(function (e) { return { id: e.id, q: e.q, puCop: e.puCop }; }) : [];
    const primera = logElegirEscalaPorLoteOQ_(escalas, loteId, qHint);
    const ficha = ver.fichaComercial || p.fichaComercial || {};
    const nombre = logNombreSinCodigo_((p.cabecera && p.cabecera.nombreProyecto) || "", codigo);
    const fila = {
        uid: logNuevoUid_(),
        tipo: "item",
        proy: codigo,
        ver: ver.id || "V1",
        lote: primera ? primera.id : "",
        over: {},
        snap: {
            ficha: JSON.parse(JSON.stringify(ficha)),
            q: primera ? primera.q : null,
            puCop: primera ? primera.puCop : null,
            trm: logTrm_() || (pr ? pr.trm : null),
            nombre: nombre,
            escalas: escalas,
            pctCom: logComisionDesdeCostos_().pct,
            feeCom: logComisionDesdeCostos_().fee
        }
    };
    if ((logQuote.escenarios || []).length) logOpcCompletar_(fila);
    logAsegurarPartida_(fila);
    return fila;
}

function logisticaPintarOtroProyecto_() {
    const box = document.getElementById("logOtroLista");
    const tit = document.getElementById("logOtroTitulo");
    const sub = document.getElementById("logOtroSub");
    const volver = document.getElementById("logOtroVolver");
    const buscar = document.getElementById("logOtroBuscar");
    if (!box) return;
    if (volver) volver.classList.toggle("d-none", !logOtro.payload);
    if (buscar) buscar.classList.toggle("d-none", !!logOtro.payload);
    if (tit) tit.textContent = logOtro.payload ? "Elige la versión" : "De otro proyecto";
    if (sub) {
        sub.textContent = logOtro.payload
            ? "Se agrega congelada (ficha y precios de la nube). En un grupal marca las piezas y luego la cantidad. El proyecto abierto no cambia."
            : "Proyectos guardados en Costos (nube). Elige uno y luego una versión.";
    }
    if (logOtro.payload) {
        const p = logOtro.payload;
        const codigo = logCodigoDePayload_(p);
        const vers = logVersionesDePayload_(p);
        logOtro.selElem = logOtro.selElem || {};
        box.innerHTML = vers.map(function (ver) {
            const elems = Array.isArray(ver.elementos) ? ver.elementos.filter(Boolean) : [];
            const nPiezas = elems.length;
            if (nPiezas > 1 && !logOtro.selElem[ver.id]) {
                const ini = {};
                elems.forEach(function (el) { if (el && el.id != null) ini[el.id] = true; });
                logOtro.selElem[ver.id] = ini;
            }
            const sel = logOtro.selElem[ver.id] || {};
            const elegidas = nPiezas > 1
                ? elems.filter(function (el) { return sel[el.id] !== false; })
                : elems;
            const nSel = elegidas.length;
            const escalas = logEscalasUiVersionAjena_(ver, nPiezas > 1 ? elegidas : null);
            const nota = (ver.comentario ? "<div class=\"text-muted small\">" + logEsc_(ver.comentario) + "</div>" : "")
                + (nPiezas > 1 ? "<div class=\"text-muted small\">Grupal · marca piezas; las Q son solo las comunes a las elegidas</div>" : "");
            let piezasHtml = "";
            if (nPiezas > 1) {
                piezasHtml = "<div class=\"log-otro-piezas mt-2\">" +
                    "<div class=\"d-flex flex-wrap align-items-center gap-2 mb-1\">" +
                    "<span class=\"small fw-semibold\">Piezas (" + nSel + "/" + nPiezas + ")</span>" +
                    "<button type=\"button\" class=\"btn btn-sm btn-link p-0\" data-oe-all=\"" + logEsc_(ver.id) + "\">Todas</button>" +
                    "<button type=\"button\" class=\"btn btn-sm btn-link p-0\" data-oe-none=\"" + logEsc_(ver.id) + "\">Ninguna</button>" +
                    "</div>" +
                    elems.map(function (el) {
                        if (!el) return "";
                        const nom = String(el.nombre || (el.fichaComercial && el.fichaComercial.titulo) || el.id || "Pieza").trim();
                        const on = sel[el.id] !== false;
                        const qs = logEscalasDeElementoAjeno_(ver, el).map(function (e) {
                            return "Q " + logFmtNum_(e.q, "es", 0);
                        }).join(" · ");
                        return "<label class=\"form-check log-otro-pieza\">" +
                            "<input class=\"form-check-input\" type=\"checkbox\" data-oe-ver=\"" + logEsc_(ver.id) + "\" data-oe-id=\"" + logEsc_(el.id) + "\"" + (on ? " checked" : "") + ">" +
                            "<span class=\"form-check-label\"><span>" + logEsc_(nom) + "</span>" +
                            (qs ? "<span class=\"text-muted d-block\" style=\"font-size:0.75rem\">" + logEsc_(qs) + "</span>" : "<span class=\"text-danger d-block\" style=\"font-size:0.75rem\">sin escalas</span>") +
                            "</span></label>";
                    }).join("") +
                    "</div>";
            }
            let botones;
            if (!nSel && nPiezas > 1) {
                botones = "<span class=\"badge text-bg-light border\">Marca al menos una pieza</span>";
            } else if (escalas.length) {
                botones = escalas.map(function (e) {
                    return "<button type=\"button\" class=\"btn btn-sm btn-outline-primary\" data-over=\"" + logEsc_(ver.id) + "\" data-oq=\"" + logEsc_(e.id) + "\" data-oq-q=\"" + logEsc_(e.q) + "\">Q " + logFmtNum_(e.q, "es", 0) + "</button>";
                }).join("");
            } else {
                botones = "<span class=\"badge text-bg-light border\">" + (nPiezas > 1 ? "Sin cantidad común entre las piezas elegidas" : "sin precios") + "</span>";
            }
            return "<div class=\"list-group-item\" data-over-block=\"" + logEsc_(ver.id) + "\"><b>" + logEsc_(codigo) + " · " + logEsc_(ver.id) + "</b>" +
                nota + piezasHtml + "<div class=\"d-flex flex-wrap gap-1 mt-2\">" + botones + "</div></div>";
        }).join("") || "<div class=\"text-muted p-3\">Este presupuesto no tiene versiones.</div>";
        return;
    }
    const q = String(logOtro.q || "").toLowerCase();
    const abierto = logisticaLeerProyecto_().codigo;
    const filas = (logOtro.lista || []).filter(function (h) {
        if (!q) return true;
        return (h.noProyecto + " " + h.cliente + " " + h.requerimiento + " " + h.id).toLowerCase().indexOf(q) >= 0;
    });
    box.innerHTML = filas.map(function (h) {
        const mismo = abierto && (h.noProyecto === abierto || String(h.noProyecto).indexOf(abierto) === 0);
        return "<button type=\"button\" class=\"list-group-item list-group-item-action\" data-oid=\"" + logEsc_(h.id) + "\">" +
            "<div class=\"d-flex justify-content-between gap-2\"><span><b class=\"text-danger\">" + logEsc_(h.noProyecto) + "</b> " +
            logEsc_(h.requerimiento || "") + (mismo ? " <span class=\"badge text-bg-light border\">abierto ahora</span>" : "") +
            "</span><span class=\"badge " + (h.tipo === "EXPORTACION" ? "bg-dark" : "bg-primary") + "\">" + logEsc_(h.tipo || "") + "</span></div>" +
            "<div class=\"small text-muted\">" + logEsc_(h.cliente || "S/N") + (h.fechaGuardado ? " · " + logEsc_(h.fechaGuardado) : "") + "</div></button>";
    }).join("") || "<div class=\"text-muted p-3\">" + (logOtro.lista.length ? "Ninguno coincide con la búsqueda." : "No hay proyectos en la nube. En Costos, ábrelo y pulsa Guardar en Nube.") + "</div>";
}

async function logisticaAbrirOtroProyecto_() {
    const p = logisticaLeerProyecto_();
    if (!p.hayProyecto) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Abre primero el proyecto principal en Costos. El consolidado se arma sobre ese.", "warning");
        return;
    }
    logAsegurarFilas_();
    logOtro = { lista: [], q: "", id: "", payload: null, selElem: {} };
    const buscar = document.getElementById("logOtroBuscar");
    if (buscar) { buscar.value = ""; buscar.classList.remove("d-none"); }
    const volver = document.getElementById("logOtroVolver");
    if (volver) volver.classList.add("d-none");
    const tit = document.getElementById("logOtroTitulo");
    const sub = document.getElementById("logOtroSub");
    if (tit) tit.textContent = "De otro proyecto";
    if (sub) sub.textContent = "Proyectos guardados en Costos (nube). Elige uno y luego una versión.";
    const box = document.getElementById("logOtroLista");
    if (box) box.innerHTML = "<div class=\"text-center py-4\"><span class=\"spinner-border spinner-border-sm me-2\"></span>Cargando historial de Costos…</div>";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogOtro")).show();
    if (typeof mostrarEsperaNube === "function") mostrarEsperaNube("Cargando historial de Costos…");
    try {
        const r = await realizarPeticionBD({ action: "listar" });
        if (!r || !r.exito) throw new Error((r && r.mensaje) || "Sin respuesta.");
        logOtro.lista = r.data || [];
    } catch (e) {
        if (box) box.innerHTML = "<div class=\"text-danger p-3\">No se pudo listar: " + logEsc_((e && e.message) || e) + "</div>";
        return;
    } finally {
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
    }
    logisticaPintarOtroProyecto_();
}

async function logisticaElegirOtroProyecto_(id) {
    const box = document.getElementById("logOtroLista");
    if (box) box.innerHTML = "<div class=\"text-center py-4\"><span class=\"spinner-border spinner-border-sm me-2\"></span>Leyendo versiones…</div>";
    if (typeof mostrarEsperaNube === "function") mostrarEsperaNube("Leyendo versiones del proyecto…");
    try {
        const r = await realizarPeticionBD({ action: "obtener", id: id });
        if (!r || !r.exito || !r.data) throw new Error((r && r.mensaje) || "Sin respuesta.");
        logOtro.id = id;
        logOtro.payload = r.data;
        logOtro.selElem = {};
    } catch (e) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("No se pudo abrir: " + ((e && e.message) || e), "danger");
        logOtro.payload = null;
        logOtro.selElem = {};
    } finally {
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
    }
    logisticaPintarOtroProyecto_();
}

/** Piezas marcadas en el modal (grupal). Si no hay selección guardada, todas. */
function logElemsElegidosAjena_(ver) {
    const elems = (ver && Array.isArray(ver.elementos)) ? ver.elementos.filter(Boolean) : [];
    if (elems.length <= 1) return elems;
    const sel = (logOtro.selElem && logOtro.selElem[ver.id]) || {};
    return elems.filter(function (el) { return sel[el.id] !== false; });
}

/**
 * Aplica el pin «En cotización» a la fila.
 * Prioridad: pieza viva en Costos (mismo código) → datos del elemento importado.
 * Nunca usa la imagen Grupo/Odoo del proyecto.
 */
function logAplicarImgElementoAjeno_(fila, el) {
    if (!fila) return;
    const nom = (el && el.nombre)
        || (fila.snap && fila.snap.nombre)
        || (el && el.fichaComercial && el.fichaComercial.titulo)
        || "";
    if (el && el.id && !fila.elem) fila.elem = el.id;
    const vivo = logElementoVivoCostos_(fila.proy, fila.elem || (el && el.id), nom);
    const pin = logPinImgDeElemento_(vivo) || logPinImgDeElemento_(el);
    if (!pin) return;
    if (pin.imgRef) fila.imgRef = pin.imgRef;
    if (pin.img) {
        fila.img = pin.img;
        if (fila.imgRef) logIdbPutImg_(fila.imgRef, pin.img);
    }
}

/** Tras importar: pin vivo / Drive. Odoo (Grupo) solo en filas individuales sin pieza. */
function logisticaHidratarImgsTrasImport_(filas) {
    filas = (filas || []).filter(Boolean);
    if (!filas.length) return;
    filas.forEach(function (f) { logAplicarImgElementoAjeno_(f, null); });
    const conRef = filas.filter(function (f) {
        return (f.imgRef || f.srcRef) && !(f.img && /^data:image\//.test(f.img));
    });
    const fin = function () {
        logisticaRefrescarTabla_();
        logisticaAvisarImgsPendientes_();
    };
    const promesa = conRef.length
        ? logisticaRecargarImgs_({ filas: conRef, silencio: true, auto: true })
        : Promise.resolve(0);
    Promise.resolve(promesa).then(function () {
        /* Releer pin vivo por si Costos lo tenía en memoria y Drive falló */
        filas.forEach(function (f) {
            const cur = logFilaPorUid_(f.uid) || f;
            if (cur.img && /^data:image\//.test(cur.img)) return;
            logAplicarImgElementoAjeno_(cur, null);
        });
        const individuales = filas.filter(function (f) {
            const cur = logFilaPorUid_(f.uid) || f;
            return !cur.elem && !(cur.img && /^data:image\//.test(cur.img));
        });
        if (!individuales.length || typeof window.traerImagenOdoo !== "function") return null;
        const porCod = {};
        individuales.forEach(function (f) {
            const c = String(f.proy || "").trim();
            if (!c) return;
            (porCod[c] = porCod[c] || []).push(f.uid);
        });
        return Promise.all(Object.keys(porCod).map(function (cod) {
            return window.traerImagenOdoo(cod, false).then(function (r) {
                if (!r || r.estado !== "ok") return;
                porCod[cod].forEach(function (uid) {
                    const f = logFilaPorUid_(uid);
                    if (!f || f.elem || (f.img && /^data:image\//.test(f.img))) return;
                    f.img = r.url;
                    f.imgSrc = r.orig;
                });
            }).catch(function () {});
        }));
    }).then(fin).catch(fin);
}

function logisticaAgregarVersionAjena_(verId, loteId, qHint) {
    const p = logOtro.payload;
    if (!p) return;
    const ver = logVersionesDePayload_(p).find(function (v) { return String(v.id) === String(verId); });
    if (!ver) return;
    const codigo = logCodigoDePayload_(p);
    const abierto = logisticaLeerProyecto_();
    const aplicarLoteExacto_ = function (f, escalasVivas) {
        const esc = logElegirEscalaPorLoteOQ_(escalasVivas || logEscalasFila_(f), loteId, qHint, true);
        if (!esc) return false;
        f.lote = esc.id;
        return true;
    };
    const nuevas = [];
    let fila;
    if (abierto.codigo && abierto.codigo === codigo) {
        const elems = logElemsElegidosAjena_(ver);
        if ((ver.elementos || []).length) {
            if (!elems.length) {
                if (typeof mostrarNotificacion === "function") mostrarNotificacion("Marca al menos una pieza para importar.", "warning");
                return;
            }
            let ok = 0;
            let sinQ = 0;
            elems.forEach(function (el) {
                const f = logNuevaFilaItem_(ver.id, codigo, el.id);
                if (!aplicarLoteExacto_(f)) { sinQ++; return; }
                logAplicarImgElementoAjeno_(f, el);
                logQuote.filas.push(f);
                nuevas.push(f);
                ok++;
            });
            if (!ok) {
                if (typeof mostrarNotificacion === "function") {
                    mostrarNotificacion("Ninguna pieza marcada tiene la cantidad Q " + logFmtNum_(qHint, "es", 0) + ".", "warning");
                }
                return;
            }
            logMarcarSucio_();
            bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogOtro")).hide();
            logisticaRefrescarTabla_();
            logisticaHidratarImgsTrasImport_(nuevas);
            if (typeof mostrarNotificacion === "function") {
                let msg = "Agregadas " + ok + " pieza" + (ok === 1 ? "" : "s") + " de " + codigo + " " + (ver.id || "");
                if (sinQ) msg += " · " + sinQ + " sin esa cantidad";
                mostrarNotificacion(msg, sinQ ? "warning" : "success");
            }
            return;
        }
        fila = logNuevaFilaItem_(ver.id, codigo);
        if (!aplicarLoteExacto_(fila)) {
            if (typeof mostrarNotificacion === "function") mostrarNotificacion("Esa cantidad no existe en el presupuesto.", "warning");
            return;
        }
    } else if (ver.elementos && ver.elementos.length) {
        const elems = logElemsElegidosAjena_(ver);
        if (!elems.length) {
            if (typeof mostrarNotificacion === "function") mostrarNotificacion("Marca al menos una pieza para importar.", "warning");
            return;
        }
        let ok = 0;
        let sinQ = 0;
        elems.forEach(function (el) {
            const copiaVer = Object.assign({}, ver, {
                matrizItems: el.matrizItems || [],
                escalas: el.escalas && el.escalas.length ? el.escalas : ver.escalas,
                fichaComercial: el.fichaComercial || ver.fichaComercial || {}
            });
            delete copiaVer.elementos;
            const escalasEl = logEscalasDeElementoAjeno_(ver, el);
            const esc = logElegirEscalaPorLoteOQ_(escalasEl, loteId, qHint, true);
            if (!esc) { sinQ++; return; }
            const f = logNuevaFilaCongelada_(p, copiaVer, esc.id, esc.q);
            f.elem = el.id;
            logAplicarImgElementoAjeno_(f, el);
            if (f.snap) {
                f.snap.nombre = el.nombre || f.snap.nombre;
                if (f.snap.ficha && !f.snap.ficha.titulo) f.snap.ficha.titulo = el.nombre || "";
            }
            logQuote.filas.push(f);
            nuevas.push(f);
            ok++;
        });
        if (!ok) {
            if (typeof mostrarNotificacion === "function") {
                mostrarNotificacion("Ninguna pieza marcada tiene la cantidad Q " + logFmtNum_(qHint, "es", 0) + ".", "warning");
            }
            return;
        }
        logMarcarSucio_();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogOtro")).hide();
        logisticaRefrescarTabla_();
        logisticaHidratarImgsTrasImport_(nuevas);
        if (typeof mostrarNotificacion === "function") {
            let msg = (logTipoDoc_(logisticaLeerOpciones_().idioma) === "CONS" ? "CONS · " : "") + "Agregadas " + ok + " pieza" + (ok === 1 ? "" : "s") + " de " + codigo;
            if (sinQ) msg += " · " + sinQ + " sin esa cantidad";
            mostrarNotificacion(msg, sinQ ? "warning" : "success");
        }
        return;
    } else {
        fila = logNuevaFilaCongelada_(p, ver, loteId, qHint);
        const escOk = logElegirEscalaPorLoteOQ_((fila.snap && fila.snap.escalas) || [], loteId, qHint, true);
        if (!escOk) {
            if (typeof mostrarNotificacion === "function") mostrarNotificacion("Esa cantidad no existe en el presupuesto.", "warning");
            return;
        }
    }
    logQuote.filas.push(fila);
    nuevas.push(fila);
    logMarcarSucio_();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogOtro")).hide();
    logisticaRefrescarTabla_();
    logisticaHidratarImgsTrasImport_(nuevas);
    if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion((logTipoDoc_(logisticaLeerOpciones_().idioma) === "CONS" ? "CONS · " : "") + "Agregada " + codigo + " " + (ver.id || ""), "success");
    }
}

function logisticaInitOtroProyecto_() {
    const buscar = document.getElementById("logOtroBuscar");
    if (buscar) buscar.addEventListener("input", function () { logOtro.q = buscar.value; logisticaPintarOtroProyecto_(); });
    const volver = document.getElementById("logOtroVolver");
    if (volver) volver.addEventListener("click", function () {
        logOtro.payload = null;
        logOtro.selElem = {};
        logisticaPintarOtroProyecto_();
    });
    const box = document.getElementById("logOtroLista");
    if (box) {
        box.addEventListener("change", function (ev) {
            const t = ev.target;
            if (!t || !t.getAttribute || !t.getAttribute("data-oe-id")) return;
            const verId = t.getAttribute("data-oe-ver");
            const elId = t.getAttribute("data-oe-id");
            logOtro.selElem = logOtro.selElem || {};
            logOtro.selElem[verId] = logOtro.selElem[verId] || {};
            logOtro.selElem[verId][elId] = !!t.checked;
            /* Reponer botones Q: solo cantidades de las piezas marcadas */
            logisticaPintarOtroProyecto_();
        });
        box.addEventListener("click", function (ev) {
            const all = ev.target.closest("[data-oe-all]");
            if (all) {
                const verId = all.getAttribute("data-oe-all");
                const ver = logVersionesDePayload_(logOtro.payload || {}).find(function (v) { return String(v.id) === String(verId); });
                const ini = {};
                ((ver && ver.elementos) || []).forEach(function (el) { if (el && el.id != null) ini[el.id] = true; });
                logOtro.selElem = logOtro.selElem || {};
                logOtro.selElem[verId] = ini;
                logisticaPintarOtroProyecto_();
                return;
            }
            const none = ev.target.closest("[data-oe-none]");
            if (none) {
                const verId = none.getAttribute("data-oe-none");
                const ver = logVersionesDePayload_(logOtro.payload || {}).find(function (v) { return String(v.id) === String(verId); });
                const ini = {};
                ((ver && ver.elementos) || []).forEach(function (el) { if (el && el.id != null) ini[el.id] = false; });
                logOtro.selElem = logOtro.selElem || {};
                logOtro.selElem[verId] = ini;
                logisticaPintarOtroProyecto_();
                return;
            }
            if (ev.target.closest(".log-otro-pieza") || ev.target.closest("[data-oe-id]")) return;
            const verBtn = ev.target.closest("[data-oq]");
            if (verBtn && !verBtn.disabled) {
                logisticaAgregarVersionAjena_(verBtn.getAttribute("data-over"), verBtn.getAttribute("data-oq"), verBtn.getAttribute("data-oq-q"));
                return;
            }
            const proy = ev.target.closest("[data-oid]");
            if (proy) logisticaElegirOtroProyecto_(proy.getAttribute("data-oid"));
        });
    }
}

function logisticaAgregarFila_(ev) {
    const b = ev.target.closest("[data-add]");
    if (!b) return;
    const tipo = b.getAttribute("data-add");
    const p = logisticaLeerProyecto_();
    let fila;
    if (tipo === "otro") { logisticaAbrirOtroProyecto_(); return; }
    if (tipo === "item") {
        const verId = b.getAttribute("data-ver");
        const ver = logVersiones_().find(function (x) { return logVerIgual_(x.id, verId); });
        /* Siempre a zona libre: individual = 1 ficha; grupal = 1 ficha por elemento. */
        if (ver && ver.elementos && ver.elementos.length) {
            ver.elementos.forEach(function (el) {
                logQuote.filas.push(logNuevaFilaItem_(verId, p.codigo, el.id));
            });
            logMarcarSucio_();
            logisticaRefrescarTabla_();
            return;
        }
        logQuote.filas.push(logNuevaFilaItem_(verId, p.codigo));
        logMarcarSucio_();
        logisticaRefrescarTabla_();
        return;
    }
    else if (tipo === "seccion") fila = { uid: logNuevoUid_(), tipo: "seccion", over: {} };
    else if (tipo === "obs") fila = { uid: logNuevoUid_(), tipo: "obs", over: {} };
    else if (tipo === "sim3d") {
        fila = {
            uid: logNuevoUid_(),
            tipo: "sim3d",
            over: { titulo: "Vista 3D", sim3dW: 100, sim3dAlign: "center", sim3dSalto: false }
        };
        const escAct = logEscList_().length ? (logOpcionUiSel_ || logOpcionUiAsegurar_() || "") : "";
        if (escAct) {
            fila.escId = escAct;
            fila.over.sim3dEsc = escAct;
        }
        logQuote.filas.push(fila);
        logMarcarSucio_();
        logisticaRefrescarTabla_();
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("Fila Vista 3D creada al final de la opción. En Simulador pulsa «Vista 3D PDF» para capturar.", "info");
        }
        return;
    }
    else if (tipo === "envio") fila = { uid: logNuevoUid_(), tipo: "envio", over: { qty: 1 } };
    else fila = { uid: logNuevoUid_(), tipo: "libre", over: { qty: 1 } };
    logQuote.filas.push(fila);
    logMarcarSucio_();
    logisticaRefrescarTabla_();
}

/* ------------------------------------------------------------------ */
/* Historial de cotizaciones (Paso 7): guardar, listar y reabrir       */
/* ------------------------------------------------------------------ */

const LOG_CAMPOS_CAB = ["ciudad", "fecha", "cliente", "contacto", "cargoContacto", "codigo", "firmaNombre", "firmaCargo", "firmaCorreo", "firmaTelefono", "firmaWeb"];
let logHist = [];

function logMarcarSucio_() {
    logQuote.sucio = true;
    logisticaPintarBadge_();
}

function logisticaPintarBadge_() {
    const el = document.getElementById("logQuoteBadge");
    if (!el) return;
    const a = logQuote.abierta;
    const nombre = logNombreArchivoPdf_(logisticaLeerOpciones_().idioma);
    el.innerHTML = (a
        ? "<i class=\"bi bi-folder2-open me-1\"></i>" + logEsc_(nombre) + " · " + logEsc_(a.id) + " Rev " + a.rev
        : "<i class=\"bi bi-file-earmark-plus me-1\"></i>" + logEsc_(nombre || "Cotización nueva (sin guardar)")) +
        (logQuote.sucio ? " <span class=\"text-warning-emphasis\">· cambios sin guardar</span>" : "");
}

/** COT / QUOT según idioma; CONS si hay ítems de más de un proyecto. */
function logTipoDoc_(idioma) {
    logAsegurarFilas_();
    const proys = {};
    logQuote.filas.forEach(function (f) { if (f.tipo === "item" && f.proy) proys[f.proy] = 1; });
    return Object.keys(proys).length > 1 ? "CONS" : (idioma === "en" ? "QUOT" : "COT");
}

/** Palabras del archivo PDF (y del número en historial). CONS/COT/QUOT se guardan por dentro. */
function logPrefijoArchivo_(idioma) {
    if (logTipoDoc_(idioma) === "CONS") return idioma === "en" ? "Consolidated" : "Consolidado";
    return idioma === "en" ? "Quotation" : "Cotizacion";
}

/** Código del primer ítem de la lista (el usuario lo define arrastrando esa fila arriba). */
function logCodigoPrimeraFila_() {
    logAsegurarFilas_();
    const esItem_ = function (f) { return f && f.tipo === "item" && (f.proy || f.ver); };
    let fila = null;
    const escs = logEscList_();
    if (escs.length) {
        /* Con opciones: 1.ª fila de la 1.ª opción (como en el PDF); si está vacía, zona libre. */
        const deOp = (typeof logFilasDeEsc_ === "function" ? logFilasDeEsc_(escs[0].id) : []).filter(esItem_);
        fila = deOp[0] || (logQuote.filas || []).find(function (f) { return esItem_(f) && !f.escId; }) || null;
    } else {
        fila = (logQuote.filas || []).find(esItem_) || null;
    }
    if (fila) {
        const codigo = String(fila.proy || "").trim();
        const ver = String(fila.ver || "").trim();
        if (codigo && ver && codigo.toLowerCase().indexOf("-" + ver.toLowerCase()) < 0) return codigo + "-" + ver;
        return codigo || ver;
    }
    const p = logisticaLeerProyecto_();
    if (p.codigo) return p.codigo + (p.version ? "-" + p.version : "");
    return "";
}

/** No. Proyecto sin el código. El código ya va en la columna Proyecto del historial. */
function logNombreSinCodigo_(texto, codigo) {
    let t = String(texto || "").replace(/\s+/g, " ").trim();
    const c = String(codigo || "").trim();
    if (!t) return "";
    if (c && t.toLowerCase().indexOf(c.toLowerCase()) === 0) {
        t = t.slice(c.length).replace(/^[\s\-–—:]+/, "").trim();
    }
    return t;
}

/** Nombre del historial: el campo No. Proyecto de cada presupuesto, sin el código. */
function logNombreHistorial_() {
    const p = logisticaLeerProyecto_();
    const out = [];
    const push = function (n) {
        const s = String(n || "").trim();
        if (s && out.indexOf(s) < 0) out.push(s);
    };
    (logQuote.filas || []).forEach(function (fila) {
        if (fila.tipo !== "item") return;
        const cod = String(fila.proy || "").trim();
        if (cod && p.codigo && cod === p.codigo) {
            push(logNombreSinCodigo_(p.nombre, cod));
            return;
        }
        if (fila.snap && fila.snap.nombre) push(String(fila.snap.nombre).trim());
    });
    return out.join(" · ");
}

function logHistPartes_(h) {
    const bruto = String((h && (h.proyectos || h.proyecto)) || "");
    const corte = bruto.indexOf(" | ");
    const codigos = corte >= 0 ? bruto.slice(0, corte) : bruto;
    const nombre = (h && h.nombre) ? String(h.nombre) : (corte >= 0 ? bruto.slice(corte + 3) : "");
    return { codigos: codigos, nombre: nombre };
}

/** Código de proyecto → No. Proyecto del presupuesto, ya sin el código. null = aún no se consultó. */
var logPresuNombres = null;

function logIndexarNombresPresupuesto_(lista) {
    const map = {};
    (lista || []).forEach(function (h) {
        const bruto = String(h.noProyecto || "").trim();
        const tok = (bruto.split(/\s+/)[0] || "").trim();
        const texto = String(h.requerimiento || "").trim() || bruto;
        [tok, bruto].forEach(function (c) {
            if (!c || map[c]) return;
            const nom = logNombreSinCodigo_(texto, c);
            if (nom) map[c] = nom;
        });
    });
    logPresuNombres = map;
}

/** Lee el historial de Costos y arma el nombre que debe verse en Guardadas, también en cotizaciones viejas. */
async function logisticaCargarNombresPresupuesto_() {
    try {
        const r = await realizarPeticionBD({ action: "listar" }, { timeoutMs: 25000 });
        if (!r || !r.exito) return logPresuNombres;
        logIndexarNombresPresupuesto_(r.data || []);
    } catch (e) { /* si falla, el historial conserva el nombre que se guardó con la cotización */ }
    return logPresuNombres;
}

/** Nombre visible: el No. Proyecto actual de cada código. Si el presupuesto no está en la nube, queda el que se guardó. */
function logNombreHistVisible_(h) {
    const hp = logHistPartes_(h);
    const map = logPresuNombres;
    if (!map) return hp.nombre;
    const codigos = String(hp.codigos || (h && h.proyecto) || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    const nombres = [];
    let hallados = 0;
    codigos.forEach(function (c) {
        const n = map[c];
        if (!n) return;
        hallados++;
        if (nombres.indexOf(n) < 0) nombres.push(n);
    });
    return hallados ? nombres.join(" · ") : hp.nombre;
}

function logNombreArchivoPdf_(idioma) {
    const pre = logPrefijoArchivo_(idioma);
    const cod = logCodigoPrimeraFila_();
    return cod ? (pre + " " + cod) : pre;
}

/** Código de nube para el PDF (solo si la cotización ya está guardada). */
function logRefNubePdf_() {
    const a = logQuote && logQuote.abierta;
    if (!a || !a.id) return "";
    const id = String(a.id).trim();
    const rev = Number(a.rev);
    return id + (isFinite(rev) ? " · Rev " + rev : "");
}

function logisticaSincronizarTituloPdf_(doc) {
    const nombre = logNombreArchivoPdf_(logisticaLeerOpciones_().idioma);
    try { if (doc) doc.title = nombre; } catch (e) { /* el print usa el título de la ventana */ }
    return nombre;
}

/** Arma lo que se guarda: textos, filas, diseño y valores congelados. Las imágenes van aparte (a Drive). */
function logisticaSerializar_(idioma) {
    /* Volcar UI → env antes de congelar (Una línea, margen, destino, costos por opción…). */
    try { logisticaLeerEnvUi_(); } catch (eUi) { /* ok */ }
    const D = logisticaDatosDoc_(idioma);
    const cab = {};
    LOG_CAMPOS_CAB.forEach(function (k) { cab[k] = D[k]; });
    const p = logisticaLeerProyecto_();
    const clon = function (o) { return JSON.parse(JSON.stringify(o == null ? null : o)); };
    const imagenes = [];
    const proyectos = [];
    /* Persistir Simulador 3D → env, luego sacar data URLs / bundle a Drive. */
    if (typeof window.slPersistirEnEnv === "function") {
        try { window.slPersistirEnEnv(); } catch (eP0) { /* noop */ }
    }
    const envParaGuardar = clon(logEnv_());
    let sim3dParaDatos = null;
    (function extraerSim3dParaDrive_(envObj) {
        if (!envObj) return;
        if (envObj.sim3dImg && /^data:image\//.test(envObj.sim3dImg)) {
            imagenes.push({ k: "sim3d:base", data: envObj.sim3dImg });
            delete envObj.sim3dImg;
        }
        const pe = envObj.porEsc || {};
        Object.keys(pe).forEach(function (escId) {
            const st = pe[escId];
            if (!st) return;
            if (st.sim3dImg && /^data:image\//.test(st.sim3dImg)) {
                imagenes.push({ k: "sim3d:" + escId, data: st.sim3dImg });
                delete st.sim3dImg;
            }
            delete st.sim3dState;
        });
        delete envObj.sim3dState;
        let raw = envObj.sim3dBundle;
        delete envObj.sim3dBundle;
        if (!raw && typeof window.slExportarEstado === "function") {
            try { raw = window.slExportarEstado(); } catch (eE0) { raw = null; }
        }
        if (raw && typeof window.slCompactarEstadoParaGuardar === "function") {
            try { sim3dParaDatos = window.slCompactarEstadoParaGuardar(raw); } catch (eC) { sim3dParaDatos = raw; }
        } else {
            sim3dParaDatos = raw;
        }
        if (sim3dParaDatos) sim3dParaDatos.captures = {};
        /* Bundle compacto → archivo JSON en Drive (bóveda Cotizaciones); en la hoja solo queda la ref. */
        if (sim3dParaDatos) {
            try {
                const js = JSON.stringify(sim3dParaDatos);
                if (js.length > 4000) {
                    const b64 = btoa(unescape(encodeURIComponent(js)));
                    imagenes.push({ k: "sim3d:bundle", data: "data:application/json;base64," + b64 });
                    sim3dParaDatos = { v: sim3dParaDatos.v || 1, activo: sim3dParaDatos.activo || 0, drive: true };
                }
            } catch (eB64) { /* si falla btoa, se deja el JSON compacto en la hoja */ }
        }
        if (envObj.sim3dRef) {
            /* Se reescribe tras subir; conservar mientras no haya bundle nuevo. */
        }
    })(envParaGuardar);
    const filas = logQuote.filas.map(function (fila) {
        const v = logFilaValores_(fila, idioma);
        const c = { uid: fila.uid, tipo: fila.tipo, proy: fila.proy || "", ver: fila.ver || "", lote: fila.lote || "", over: clon(fila.over || {}) };
        if (fila.elem) c.elem = fila.elem;
        if (fila.puFijo) c.puFijo = true;
        /* Contenedor de opción: sin esto, al reabrir todo cae en Rangos. */
        if (fila.escId) c.escId = String(fila.escId);
        if (fila.opc && Object.keys(fila.opc).length) c.opc = clon(fila.opc);
        if (fila.excl && Object.keys(fila.excl).length) c.excl = clon(fila.excl);
        if (fila.demo != null) c.demo = fila.demo;
        if (fila.tipo === "item") {
            if (fila.snap) {
                c.snap = clon(fila.snap);
            } else {
                const pr = logPreciosVersion_(fila.ver, fila.elem);
                const esc = pr ? pr.escalas.find(function (e) { return e.id === fila.lote; }) : null;
                const origen = logComisionDesdeCostos_();
                c.snap = {
                    ficha: clon(logFichaVersion_(fila.ver, fila.elem)),
                    q: esc ? esc.q : null,
                    puCop: esc ? esc.puCop : null,
                    escalas: pr ? pr.escalas.map(function (e) { return { id: e.id, q: e.q, puCop: e.puCop }; }) : [],
                    trm: logTrm_() || (pr ? pr.trm : null),
                    nombre: logNombreSinCodigo_(p.nombre, String(fila.proy || "").trim() || p.codigo),
                    pctCom: origen.pct,
                    feeCom: origen.fee
                };
            }
            if (c.snap && c.snap.pctCom == null) {
                const o = logComisionAsegurar_();
                c.snap.pctCom = o.pctBase;
                c.snap.feeCom = o.fee;
            }
            if (c.snap && p.codigo && String(fila.proy || "").trim() === p.codigo) {
                c.snap.nombre = logNombreSinCodigo_(p.nombre, p.codigo);
            }
            if (fila.proy && proyectos.indexOf(fila.proy) < 0) proyectos.push(fila.proy);
        }
        /* Partida arancelaria por fila (opción o zona libre): debe sobrevivir al guardar/abrir. */
        if (fila.tipo === "item" || fila.tipo === "libre") {
            let part = typeof fila.partida === "string" ? logPartidaFmt_(fila.partida) : "";
            if (!part && c.snap && c.snap.ficha) part = logPartidaFmt_(c.snap.ficha.partida || "");
            if (!part) part = logPartidaFmt_(logPartidaDeElemento_(fila) || "");
            c.partida = part;
            if (c.snap) {
                c.snap.ficha = c.snap.ficha || {};
                c.snap.ficha.partida = part;
            }
        }
        if (fila.imgEdit) c.imgEdit = clon(fila.imgEdit);
        logAsegurarImgRefFila_(fila);
        if (fila.imgRef) c.imgRef = fila.imgRef;
        if (fila.srcRef) c.srcRef = fila.srcRef;
        if (!logEsTextoFila_(fila) && fila.tipo !== "envio") {
            if (v.img && !fila.imgRef && /^data:image\/(jpeg|png)/.test(v.img)) {
                /* Si se recortó/giró, no mandar preNombre: el servidor reutilizaría el PRE-img original y descartaría el JPEG editado. */
                const pre = logImgEditada_(fila) ? "" : (logNombrePreImg_(fila) || "");
                const pack = { k: fila.uid + ":img", data: v.img };
                if (pre) pack.preNombre = pre;
                imagenes.push(pack);
            }
            if (logImgEditada_(fila) && fila.imgSrc && !fila.srcRef && /^data:image\/(jpeg|png)/.test(fila.imgSrc)) imagenes.push({ k: fila.uid + ":src", data: fila.imgSrc });
        }
        return c;
    });
    const tipo = logTipoDoc_(idioma);
    /* total que se lista en el historial: el de la cantidad única o el de la primera opción */
    const totales = logTotales_(idioma);
    const total = totales[logEscList_().length ? logEscList_()[0].id : ""] || 0;
    const codigoArchivo = logCodigoPrimeraFila_() || cab.codigo;
    return {
        tipo: tipo,
        numero: logPrefijoArchivo_(idioma) + (codigoArchivo ? " " + codigoArchivo : ""),
        proyecto: logCodigoPrimeraFila_() || proyectos[0] || p.codigo || "",
        proyectos: proyectos.join(", ") + (function () {
            const nom = logNombreHistorial_();
            return nom ? " | " + nom : "";
        })(),
        total: total,
        imagenes: imagenes,
        datos: {
            v: 1,
            idioma: idioma,
            moneda: logQuote.moneda,
            trm: logTrm_(),
            decimales: logDecimales_(),
            totales: !!logQuote.totales,
            texto: clon(logTexto_()),
            modo: (logQuote.escenarios || []).length ? "esc" : "unica",
            escenarios: clon(logQuote.escenarios || []),
            escUid: logQuote.escUid || 0,
            baseHojaNueva: !!logQuote.baseHojaNueva,
            margenMm: parseFloat((document.getElementById("logMargen") || {}).value) || 16,
            sistema: (document.getElementById("logSistema") || {}).value === "imperial" ? "imperial" : "metrico",
            cab: cab,
            env: envParaGuardar,
            comision: clon(logComisionAsegurar_()),
            descuento: (function () {
                const d = logDescuentoAsegurar_();
                return { activo: !!d.activo, pct: logDescuentoPctGlobal_(), titulo: d.titulo || "", tituloManual: !!d.tituloManual, pctManual: true, nota: logDescuentoNota_(), porEsc: d.porEsc || {} };
            })(),
            pago: (function () {
                const p = logPagoAsegurar_();
                return { iva: !!p.iva, ivaPct: p.ivaPct, anticipo: !!p.anticipo, anticipoPct: p.anticipoPct, titConIva: p.titConIva || "", titAnt: p.titAnt || "", titSaldo: p.titSaldo || "", porEsc: p.porEsc || {} };
            })(),
            nombre: logNombreHistorial_(),
            layout: { cols: clon(logLayout.cols), filaAlto: clon(logLayout.filaAlto) },
            filas: filas,
            /* Estado del Simulador 3D: compacto en hoja o stub {drive:true} + sim3dRef en Drive. */
            sim3d: sim3dParaDatos,
            sim3dRef: (envParaGuardar && envParaGuardar.sim3dRef) ? String(envParaGuardar.sim3dRef) : undefined
        }
    };
}

/** Códigos de proyecto presentes en la cotización / Costos abierto. */
function logisticaCodigosProyectoCot_() {
    const codes = {};
    (logQuote.filas || []).forEach(function (f) {
        const c = String((f && f.proy) || "").trim();
        if (f && f.tipo === "item" && c) codes[c] = 1;
    });
    const p = typeof logisticaLeerProyecto_ === "function" ? logisticaLeerProyecto_() : {};
    if (p && p.codigo) codes[String(p.codigo).trim()] = 1;
    return Object.keys(codes).filter(Boolean);
}

/**
 * Si hay cotizaciones guardadas del mismo proyecto (y ojalá mismo número),
 * devuelve la revisión más reciente del mejor match. Evita guardar un C-nuevo a ciegas.
 */
function logisticaMatchCotExistente_(lista) {
    const codes = logisticaCodigosProyectoCot_();
    if (!codes.length || !lista || !lista.length) return null;
    const idioma = logisticaLeerOpciones_().idioma;
    const numeroWant = String(logNombreArchivoPdf_(idioma) || "").replace(/\s+/g, " ").trim().toLowerCase();
    const hits = lista.filter(function (h) {
        const proy = String(h.proyecto || "") + " " + String(h.proyectos || "") + " " + String(h.numero || "");
        return codes.some(function (c) { return proy.indexOf(c) >= 0; });
    });
    if (!hits.length) return null;
    const porId = {};
    hits.forEach(function (h) {
        const id = String(h.id || "");
        if (!id) return;
        if (!porId[id] || (Number(h.rev) || 0) > (Number(porId[id].rev) || 0)) porId[id] = h;
    });
    const cands = Object.keys(porId).map(function (k) { return porId[k]; });
    cands.sort(function (a, b) {
        const aN = String(a.numero || "").replace(/\s+/g, " ").trim().toLowerCase() === numeroWant ? 1 : 0;
        const bN = String(b.numero || "").replace(/\s+/g, " ").trim().toLowerCase() === numeroWant ? 1 : 0;
        if (aN !== bN) return bN - aN;
        const ta = String(a.creado || "");
        const tb = String(b.creado || "");
        if (ta !== tb) return ta < tb ? 1 : -1;
        return String(b.id).localeCompare(String(a.id));
    });
    const best = cands[0];
    if (!best) return null;
    return {
        id: String(best.id),
        rev: Number(best.rev) || 1,
        numero: String(best.numero || ""),
        comentario: String(best.comentario || ""),
        cliente: String(best.cliente || "")
    };
}

function logisticaDestinoGuardar_() {
    return logQuote.abierta || logQuote.guardarExistente || null;
}

function logisticaPintarModalGuardar_(idioma) {
    const a = logQuote.abierta;
    const det = !a ? logQuote.guardarExistente : null;
    const dest = a || det;
    const num = document.getElementById("logGuardarNumero");
    if (num) num.textContent = logNombreArchivoPdf_(idioma);
    const com = document.getElementById("logGuardarCom");
    if (com && !(com.value || "").trim()) com.value = (dest && dest.comentario) || "";
    const sub = document.getElementById("logGuardarSub");
    const bMisma = document.getElementById("btnLogGuardarMisma");
    const bRev = document.getElementById("btnLogGuardarRev");
    const bNueva = document.getElementById("btnLogGuardarNueva");
    if (a) {
        if (sub) sub.textContent = "Estás editando " + a.id + " Rev " + a.rev + ". «Guardar» reescribe esa revisión. «Rev siguiente» la conserva y crea otra. «Cotización nueva» asigna un C-xxxxx distinto.";
        if (bMisma) {
            bMisma.classList.remove("d-none");
            bMisma.innerHTML = "<i class=\"bi bi-save me-1\"></i>Guardar (reescribir Rev " + a.rev + ")";
        }
        if (bRev) {
            bRev.classList.remove("d-none");
            bRev.innerHTML = "<i class=\"bi bi-layers me-1\"></i>Guardar como Rev " + (a.rev + 1) + " de " + logEsc_(a.id);
        }
        if (bNueva) bNueva.classList.remove("d-none");
    } else if (det) {
        if (sub) {
            sub.innerHTML = "<span class=\"text-warning-emphasis fw-semibold\">Ya existe "
                + logEsc_(det.numero || "una cotización") + " (" + logEsc_(det.id) + " · Rev " + det.rev
                + ")</span> de este proyecto. Si guardas sin elegir, podrías duplicar o pisar trabajo previo. Elige cómo continuar:";
        }
        /* Por defecto: nueva revisión (no pisa la Rev actual). */
        if (bRev) {
            bRev.classList.remove("d-none");
            bRev.classList.remove("btn-outline-secondary");
            bRev.classList.add("btn-diforma-blue");
            bRev.innerHTML = "<i class=\"bi bi-layers me-1\"></i>Guardar como Rev " + (det.rev + 1) + " de " + logEsc_(det.id);
        }
        if (bMisma) {
            bMisma.classList.remove("d-none");
            bMisma.classList.remove("btn-diforma-blue");
            bMisma.classList.add("btn-outline-secondary");
            bMisma.innerHTML = "<i class=\"bi bi-exclamation-triangle me-1\"></i>Reescribir Rev " + det.rev + " de " + logEsc_(det.id);
        }
        if (bNueva) bNueva.classList.remove("d-none");
    } else {
        if (sub) sub.textContent = "Se guarda con los precios y textos de ahora. Las imágenes que ya están en Drive no se vuelven a subir.";
        if (bMisma) {
            bMisma.classList.remove("d-none");
            bMisma.classList.add("btn-diforma-blue");
            bMisma.classList.remove("btn-outline-secondary");
            bMisma.innerHTML = "<i class=\"bi bi-save me-1\"></i>Guardar";
        }
        if (bRev) {
            bRev.classList.add("d-none");
            bRev.classList.add("btn-outline-secondary");
            bRev.classList.remove("btn-diforma-blue");
        }
        if (bNueva) bNueva.classList.add("d-none");
    }
}

async function logisticaAbrirGuardar_() {
    const p = logisticaLeerProyecto_();
    if (!logQuote.filas.some(function (f) { return !logEsTextoFila_(f); })) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Agrega al menos una fila antes de guardar.", "warning");
        return;
    }
    if (!p.hayProyecto && logQuote.filas.some(function (f) { return f.demo != null; })) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Abre un proyecto en Ingeniería de Costos: lo que se ve ahora son datos de ejemplo.", "warning");
        return;
    }
    const idioma = logisticaLeerOpciones_().idioma;
    logQuote.guardarExistente = null;
    if (!logQuote.abierta) {
        const estado = document.getElementById("logGuardarEstado");
        if (estado) estado.innerHTML = "<span class=\"spinner-border spinner-border-sm me-1\"></span>Buscando cotizaciones previas de este proyecto…";
        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogGuardar")).show();
        logisticaPintarModalGuardar_(idioma);
        try {
            const lista = await logisticaCargarHistorial_(false);
            logQuote.guardarExistente = logisticaMatchCotExistente_(lista || []);
        } catch (eHist) {
            logQuote.guardarExistente = null;
        }
        if (estado) estado.innerHTML = "";
    }
    logisticaPintarModalGuardar_(idioma);
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogGuardar")).show();
}

async function logisticaReusarRendersPresupuesto_() {
    (logQuote.filas || []).forEach(logAsegurarImgRefFila_);
    const pedir = [];
    (logQuote.filas || []).forEach(function (fila) {
        if (fila.imgRef || logEsTextoFila_(fila) || fila.tipo === "envio" || logImgEditada_(fila)) return;
        const pre = logNombrePreImg_(fila);
        if (pre) pedir.push({ k: fila.uid + ":img", preNombre: pre });
    });
    if (!pedir.length || typeof realizarPeticionBD !== "function") return;
    try {
        const r = await realizarPeticionBD({ action: "resolver_imagenes_cotizacion", imagenes: pedir }, { timeoutMs: 30000 });
        const refs = (r && r.exito && (r.refs || (r.data && r.data.refs))) || {};
        Object.keys(refs).forEach(function (k) {
            const fila = logFilaPorUid_(k.split(":")[0]);
            if (!fila || !refs[k]) return;
            fila.imgRef = refs[k];
            logEstamparImgRefElemento_(fila.elem, fila.ver, refs[k]);
        });
    } catch (e) { /* si el backend aún no tiene esta acción, el guardado sube el data URL */ }
}

async function logisticaGuardar_(modo) {
    const idioma = logisticaLeerOpciones_().idioma;
    const info = document.getElementById("logGuardarEstado");
    const paso = function (msg) {
        if (info) info.innerHTML = "<span class=\"spinner-border spinner-border-sm me-1\"></span>" + msg;
        if (typeof mostrarEsperaNube === "function" && !_logGuardarEspera) {
            mostrarEsperaNube(msg);
            _logGuardarEspera = true;
        } else if (typeof textoEsperaNube === "function") textoEsperaNube(msg);
    };
    const botones = document.querySelectorAll("#modalLogGuardar button[data-sv]");
    botones.forEach(function (b) { b.disabled = true; });
    _logGuardarEspera = false;
    try {
        paso("Revisando las imágenes…");
        await logisticaReusarRendersPresupuesto_();
        const S = logisticaSerializar_(idioma);
        const comentario = ((document.getElementById("logGuardarCom") || {}).value || "").trim();
        const abiertaAntes = logisticaDestinoGuardar_();
        if ((modo === "misma" || modo === "rev") && !abiertaAntes) {
            throw new Error("No hay una cotización previa vinculada. Elige «Guardar» (nueva) o vuelve a abrir el diálogo.");
        }
        if (modo === "nueva") logQuote.guardarExistente = null;
        const nImg = S.imagenes.length;
        paso(nImg ? ("Subiendo " + nImg + " imagen" + (nImg === 1 ? "" : "es") + " a Drive…") : (modo === "misma" ? "Reescribiendo esta revisión…" : "Guardando la cotización…"));
        const resp = await realizarPeticionBD({
            action: "guardar_cotizacion",
            email: localStorage.getItem("smartbudget_email") || "",
            modo: modo,
            id: (modo === "rev" || modo === "misma") && abiertaAntes ? abiertaAntes.id : "",
            rev: modo === "misma" && abiertaAntes ? abiertaAntes.rev : "",
            numero: S.numero, tipo: S.tipo, proyecto: S.proyecto, proyectos: S.proyectos,
            cliente: S.datos.cab.cliente, idioma: idioma, moneda: logQuote.moneda,
            total: S.total, comentario: comentario,
            datos: JSON.stringify(S.datos), imagenes: S.imagenes
        }, { timeoutMs: 180000 });
        if (!resp || !resp.exito) throw new Error((resp && resp.mensaje) || "Sin respuesta.");
        paso("Listo. Actualizando la lista…");
        const d = resp.data || {};
        const refs = d.refs || {};
        Object.keys(refs).forEach(function (k) {
            if (k.indexOf("sim3d:") === 0) {
                const env = logEnv_();
                const escId = k.slice(6);
                if (escId === "bundle") {
                    env.sim3dRef = refs[k];
                    return;
                }
                if (escId === "base") {
                    env.sim3dImgRef = refs[k];
                    /* Mantener data URL en memoria para la preview; Drive solo respalda. */
                    if (env.sim3dImg && typeof logIdbPutImg_ === "function") logIdbPutImg_(refs[k], env.sim3dImg);
                    if (env.sim3dImg) logSim3dPonerImg_("base", env.sim3dImg);
                } else {
                    if (!env.porEsc) env.porEsc = {};
                    if (!env.porEsc[escId]) env.porEsc[escId] = {};
                    env.porEsc[escId].sim3dImgRef = refs[k];
                    if (env.porEsc[escId].sim3dImg && typeof logIdbPutImg_ === "function") {
                        logIdbPutImg_(refs[k], env.porEsc[escId].sim3dImg);
                    }
                    if (env.porEsc[escId].sim3dImg) logSim3dPonerImg_(escId, env.porEsc[escId].sim3dImg);
                }
                return;
            }
            const par = k.split(":");
            const fila = logFilaPorUid_(par[0]);
            if (!fila) return;
            if (par[1] === "img") {
                if (!fila.img) fila.img = logFilaValores_(fila, idioma).img;
                fila.imgRef = refs[k];
                if (fila.img) logIdbPutImg_(refs[k], fila.img);
                if (!logImgEditada_(fila)) logEstamparImgRefElemento_(fila.elem, fila.ver, refs[k]);
            } else {
                fila.srcRef = refs[k];
            }
        });
        logQuote.abierta = { id: d.id, rev: d.rev, numero: d.numero || S.numero, comentario: comentario };
        logQuote.guardarExistente = null;
        logQuote.sucio = false;
        logisticaPintarBadge_();
        logisticaPintarEstado_();
        logisticaActualizarVista();
        logisticaAnunciarGuardada_({
            id: d.id, rev: d.rev, numero: d.numero || S.numero, tipo: S.tipo,
            proyecto: S.proyecto, proyectos: S.proyectos, nombre: (S.datos && S.datos.nombre) || "",
            cliente: S.datos.cab.cliente, idioma: idioma, moneda: logQuote.moneda,
            total: S.total, creado: logFechaAhora_(),
            usuario: localStorage.getItem("smartbudget_email") || "", comentario: comentario
        });
        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogGuardar")).hide();
        if (info) info.textContent = "";
        let aviso = "Cotización guardada: " + d.id + " Rev " + d.rev + ".";
        let tipoAviso = "success";
        if (modo === "nueva") {
            aviso = "Nueva cotización " + d.id + " Rev " + d.rev + " (independiente de " + ((abiertaAntes && abiertaAntes.id) || "la anterior") + ").";
        } else if (modo === "misma" && abiertaAntes && Number(d.rev) !== Number(abiertaAntes.rev)) {
            aviso = "Se creó la Rev " + d.rev + " en lugar de reescribir la " + abiertaAntes.rev + ". Publica el backend.gs de esta misma implementación.";
            tipoAviso = "warning";
        } else if (modo === "misma") {
            aviso = "Reescrita " + d.id + " Rev " + d.rev + ".";
        } else if (modo === "rev") {
            aviso = "Nueva revisión: " + d.id + " Rev " + d.rev + ".";
        }
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(aviso, tipoAviso);
    } catch (e) {
        const m = String((e && e.message) || e);
        if (info) info.innerHTML = "<span class=\"text-danger\"><i class=\"bi bi-x-circle me-1\"></i>" + logEsc_(/Acción no válida/i.test(m) ? "falta pegar el backend.gs actualizado en Apps Script." : m) + "</span>";
    } finally {
        _logGuardarEspera = false;
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
        botones.forEach(function (b) { b.disabled = false; });
    }
}

var _logGuardarEspera = false;

function logFechaAhora_() {
    const d = new Date();
    const p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

function logisticaAnunciarGuardada_(fila) {
    let prev = logHistCache.data;
    if (!prev) {
        const local = logisticaLeerHistLocal_();
        prev = local && local.data;
    }
    if (!prev) prev = Array.isArray(logHist) ? logHist : [];
    const data = [fila].concat(prev.filter(function (h) {
        return !(String(h.id) === String(fila.id) && Number(h.rev) === Number(fila.rev));
    }));
    logHist = data;
    logHistCache = { t: Date.now(), data: data };
    logisticaGuardarHistLocal_(data);
}

function logisticaQuitarGuardada_(id, rev) {
    const prev = logHistCache.data || (Array.isArray(logHist) ? logHist : []);
    const data = prev.filter(function (h) {
        return !(String(h.id) === String(id) && Number(h.rev) === Number(rev));
    });
    logHist = data;
    logHistCache = { t: Date.now(), data: data };
    logisticaGuardarHistLocal_(data);
}

async function logisticaEliminarGuardada_(id, rev, btn) {
    if (!btn) return;
    if (btn.getAttribute("data-ok") !== "1") {
        btn.setAttribute("data-ok", "1");
        btn.textContent = "¿Borrar?";
        btn.classList.remove("btn-outline-danger");
        btn.classList.add("btn-danger");
        window.setTimeout(function () {
            if (!btn.isConnected || btn.getAttribute("data-ok") !== "1") return;
            btn.removeAttribute("data-ok");
            btn.classList.remove("btn-danger");
            btn.classList.add("btn-outline-danger");
            btn.innerHTML = "<i class=\"bi bi-trash\"></i>";
        }, 4000);
        return;
    }
    btn.disabled = true;
    try {
        const r = await realizarPeticionBD({ action: "eliminar_cotizacion", id: id, rev: rev }, { timeoutMs: 90000 });
        if (!r || !r.exito) throw new Error((r && r.mensaje) || "Sin respuesta.");
        logisticaQuitarGuardada_(id, rev);
        if (logQuote.abierta && String(logQuote.abierta.id) === String(id) && Number(logQuote.abierta.rev) === Number(rev)) {
            logQuote.abierta = null;
            logQuote.sucio = true;
            logisticaPintarBadge_();
            logisticaPintarEstado_();
        }
        logisticaPintarHistorial_();
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Se borró " + id + " Rev " + rev + ".", "success");
    } catch (e) {
        btn.disabled = false;
        btn.removeAttribute("data-ok");
        const m = String((e && e.message) || e);
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion(/Acción no válida/i.test(m) ? "Para borrar hay que publicar el backend.gs actualizado." : ("No se pudo borrar: " + m), "danger");
        }
    }
}

var logHistCache = { t: 0, data: null };
var LOG_HIST_LOCAL_ = "smartbudget_hist_cots";
var _logHistP = null;

function logisticaInvalidarHist_() { logHistCache = { t: 0, data: null }; }

function logisticaLeerHistLocal_() {
    try {
        const o = JSON.parse(localStorage.getItem(LOG_HIST_LOCAL_) || "null");
        if (o && Array.isArray(o.data)) return o;
    } catch (e) {}
    return null;
}

function logisticaGuardarHistLocal_(data) {
    try { localStorage.setItem(LOG_HIST_LOCAL_, JSON.stringify({ t: Date.now(), data: data || [] })); } catch (e) {}
}

async function logisticaCargarHistorial_(force, onStatus) {
    if (!force && logHistCache.data && (Date.now() - logHistCache.t) < 180000) {
        logHist = logHistCache.data;
        return logHist;
    }
    if (_logHistP) {
        if (typeof onStatus === "function") onStatus("Consultando cotizaciones guardadas…");
        return _logHistP;
    }
    _logHistP = (async function () {
        let ultimo = null;
        for (let i = 0; i < 3; i++) {
            if (typeof onStatus === "function") {
                onStatus(i === 0 ? "Consultando cotizaciones guardadas…" : "Reintento " + (i + 1) + " de 3…");
            }
            try {
                const r = await realizarPeticionBD({ action: "listar_cotizaciones" }, { timeoutMs: 25000 });
                if (!r || !r.exito) throw new Error((r && r.mensaje) || "Sin respuesta.");
                logHist = r.data || [];
                logHistCache = { t: Date.now(), data: logHist };
                logisticaGuardarHistLocal_(logHist);
                return logHist;
            } catch (e) {
                ultimo = e;
                if (/Acceso no autorizado/i.test(String((e && e.message) || e))) break;
                await new Promise(function (ok) { setTimeout(ok, 350 * (i + 1)); });
            }
        }
        throw ultimo;
    })();
    try { return await _logHistP; } finally { _logHistP = null; }
}

function logisticaPrefetchHistorial_() {
    if (!localStorage.getItem("smartbudget_token")) return;
    if (!(CONFIG_GLOBAL && CONFIG_GLOBAL.gasUrl)) return;
    if (logHistCache.data && (Date.now() - logHistCache.t) < 180000) return;
    logisticaCargarHistorial_(false).catch(function () { /* se pide de nuevo al abrir Guardadas */ });
}

async function logisticaAbrirHistorial_() {
    const el = document.getElementById("modalLogHist");
    if (!el) return;
    bootstrap.Modal.getOrCreateInstance(el).show();
    const cuerpo = document.getElementById("logHistLista");
    if (!logHistCache.data) {
        const local = logisticaLeerHistLocal_();
        if (local) logHistCache = { t: local.t || Date.now(), data: local.data };
    }
    if (logHistCache.data) {
        logHist = logHistCache.data;
        logisticaPintarHistorial_();
    } else if (cuerpo) {
        cuerpo.innerHTML = "<tr><td colspan=\"8\" class=\"text-center py-5\"><div class=\"spinner-border text-danger mb-2\"></div><div class=\"fw-semibold\">Cargando cotizaciones guardadas…</div><div class=\"small text-muted\">La nube puede tardar unos segundos.</div></td></tr>";
    }
    const hayCache = !!logHistCache.data;
    logBotonBusy_("btnLogHistorial", true, "Cargando…");
    if (!hayCache && typeof mostrarEsperaNube === "function") mostrarEsperaNube("Cargando cotizaciones guardadas…");
    let nombresP = Promise.resolve(null);
    try {
        nombresP = logisticaCargarNombresPresupuesto_();
        await logisticaCargarHistorial_(!hayCache, function (msg) {
            if (typeof textoEsperaNube === "function") textoEsperaNube(msg);
        });
        await nombresP;
        logisticaPintarHistorial_();
    } catch (e) {
        const m = String((e && e.message) || e);
        try { await nombresP; } catch (e2) { /* el nombre guardado sigue valiendo */ }
        if (logHistCache.data) {
            logHist = logHistCache.data;
            logisticaPintarHistorial_();
            if (typeof mostrarNotificacion === "function") mostrarNotificacion("Mostrando la lista en caché. " + m, "warning");
            return;
        }
        if (cuerpo) cuerpo.innerHTML = "<tr><td colspan=\"8\" class=\"text-center text-danger py-4\">" +
            logEsc_(/Acción no válida/i.test(m) ? "Falta pegar el backend.gs actualizado en Apps Script." : m) +
            "<div class=\"mt-2\"><button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"logisticaAbrirHistorial_()\">Reintentar</button></div></td></tr>";
    } finally {
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
        logBotonBusy_("btnLogHistorial", false);
    }
}

function logisticaPintarHistorial_() {
    const cuerpo = document.getElementById("logHistLista");
    if (!cuerpo) return;
    const q = ((document.getElementById("logHistBuscar") || {}).value || "").trim().toLowerCase();
    const ult = {};
    logHist.forEach(function (h) { ult[h.id] = Math.max(ult[h.id] || 0, h.rev); });
    const sel = logHist.filter(function (h) {
        const hp = logHistPartes_(h);
        const nom = logNombreHistVisible_(h);
        return !q || (h.numero + " " + h.cliente + " " + hp.codigos + " " + nom + " " + h.id + " " + h.comentario).toLowerCase().indexOf(q) >= 0;
    });
    cuerpo.innerHTML = sel.map(function (h) {
        const nd = h.moneda === "COP" ? 0 : 2;
        const hp = logHistPartes_(h);
        return "<tr><td><b>" + logEsc_(h.numero) + "</b><div class=\"small text-muted\">" + logEsc_(h.id) + " · Rev " + h.rev + (h.rev < ult[h.id] ? " (anterior)" : "") + "</div></td>" +
            "<td>" + logEsc_(h.cliente) + "</td>" +
            "<td class=\"small\">" + logEsc_(logNombreHistVisible_(h)) + "</td>" +
            "<td class=\"small\">" + logEsc_(hp.codigos || h.proyecto) + "</td>" +
            "<td class=\"text-end text-nowrap\">" + logFmtMoneda_(h.total, "es", nd) + " " + logEsc_(h.moneda) + "</td>" +
            "<td class=\"small text-nowrap\">" + logEsc_(h.creado) + "<div class=\"text-muted\">" + logEsc_(h.usuario.split("@")[0]) + "</div></td>" +
            "<td class=\"small\">" + logEsc_(h.comentario) + "</td>" +
            "<td class=\"text-end text-nowrap\"><button type=\"button\" class=\"btn btn-sm btn-diforma-blue\" data-hid=\"" + logEsc_(h.id) + "\" data-hrev=\"" + h.rev + "\">Abrir</button>" +
            "<button type=\"button\" class=\"btn btn-sm btn-outline-danger ms-1\" data-hdel=\"" + logEsc_(h.id) + "\" data-hrevdel=\"" + h.rev + "\" title=\"Borrar esta revisión\"><i class=\"bi bi-trash\"></i></button></td></tr>";
    }).join("") || "<tr><td colspan=\"8\" class=\"text-center text-muted py-4\">No hay cotizaciones guardadas" + (q ? " con ese filtro" : "") + ".</td></tr>";
}

/** Reabre una cotización guardada: texto y precios congelados, imágenes desde Drive en segundo plano. */
async function logisticaAbrirGuardada_(id, rev) {
    if (logQuote.sucio) {
        const ok = typeof window.mostrarConfirmacionApp === "function"
            ? await window.mostrarConfirmacionApp({
                titulo: "Cambios sin guardar",
                subtitulo: "Cotización actual",
                mensaje: "Hay cambios sin guardar en la cotización actual. ¿Abrir la guardada y descartarlos?",
                okTexto: "Abrir y descartar",
                cancelarTexto: "Seguir editando",
                peligro: true
            })
            : window.confirm("Hay cambios sin guardar en la cotización actual. ¿Abrir la guardada y descartarlos?");
        if (!ok) return;
    }
    const histEl = document.getElementById("modalLogHist");
    if (histEl && histEl.classList.contains("show")) {
        bootstrap.Modal.getOrCreateInstance(histEl).hide();
    }
    if (typeof mostrarEsperaNube === "function") mostrarEsperaNube("Abriendo la cotización…");
    let d;
    try {
        if (typeof textoEsperaNube === "function") textoEsperaNube("Leyendo la cotización en la nube…");
        const r = await realizarPeticionBD({ action: "obtener_cotizacion", id: id, rev: rev }, { timeoutMs: 90000 });
        if (!r || !r.exito) throw new Error((r && r.mensaje) || "Sin respuesta.");
        d = r.data;
    } catch (e) {
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("No se pudo abrir: " + ((e && e.message) || e), "danger");
        return;
    }
    /* Evita que capturas/escenas 3D de la cotización anterior contaminen el PDF nuevo. */
    if (typeof window.slResetAlCambiarCotizacion === "function") {
        try { window.slResetAlCambiarCotizacion(); } catch (eR) { /* noop */ }
    }
    window._slPdfCaptures = {};
    const g = d.datos || {};
    const p = logisticaLeerProyecto_();
    const filaCot = (g.filas || []).find(function (f) { return f && f.tipo === "item" && String(f.proy || "").trim(); });
    const clave = (filaCot && String(filaCot.proy).trim()) || (p.hayProyecto ? p.codigo : "");
    let maxUid = 0;
    (g.filas || []).forEach(function (f) { maxUid = Math.max(maxUid, parseInt(String(f.uid).replace(/\D/g, ""), 10) || 0); });
    logQuote = {
        codigo: clave, inicializado: true,
        moneda: g.moneda === "USD" ? "USD" : "COP",
        trm: Number(g.trm) > 0 ? Number(g.trm) : logTrmDesdeCostos_(),
        totales: g.totales !== false,
        uid: maxUid,
        filas: g.filas || [],
        abierta: { id: d.id, rev: d.rev, numero: d.numero, comentario: String(d.comentario || "") },
        sucio: false,
        texto: (function () {
            const d = logTextoDef_();
            const t = g.texto || {};
            if (t.titulo === false) d.titulo = false;
            if (t.desc === "lite" || t.desc === "off") d.desc = t.desc;
            if (t.medidas === false) d.medidas = false;
            return d;
        })(),
        modo: g.modo === "esc" && Array.isArray(g.escenarios) && g.escenarios.length ? "esc" : "unica",
        escenarios: Array.isArray(g.escenarios) ? g.escenarios.map(function (e) { return { id: e.id, nombre: e.nombre || "", hojaNueva: !!e.hojaNueva }; }) : [],
        escUid: parseInt(g.escUid, 10) || 0,
        baseHojaNueva: !!g.baseHojaNueva,
        env: logEnvNormalizar_(g.env || {}),
        comision: g.comision ? logComisionNormalizar_(g.comision) : logComisionNormalizar_(logComisionDesdeCostos_()),
        descuento: g.descuento ? {
            activo: !!g.descuento.activo,
            pct: Number(g.descuento.pct) || 0,
            titulo: String(g.descuento.titulo || ""),
            tituloManual: !!g.descuento.tituloManual,
            pctManual: g.descuento.pctManual !== false,
            nota: String(g.descuento.nota || ""),
            porEsc: g.descuento.porEsc && typeof g.descuento.porEsc === "object" ? g.descuento.porEsc : {}
        } : null,
        pago: g.pago ? {
            iva: !!g.pago.iva,
            ivaPct: Number(g.pago.ivaPct) || 19,
            anticipo: !!g.pago.anticipo,
            anticipoPct: Number(g.pago.anticipoPct) || logPagoPctAnticipoDef_(),
            titConIva: String(g.pago.titConIva || ""),
            titAnt: String(g.pago.titAnt || ""),
            titSaldo: String(g.pago.titSaldo || ""),
            porEsc: g.pago.porEsc && typeof g.pago.porEsc === "object" ? g.pago.porEsc : {}
        } : null,
        decimales: Number(g.decimales) === 1 || Number(g.decimales) === 2 ? Number(g.decimales) : 0
    };
    logIaReiniciar_();
    logOlvidarFirmaInsumos_();
    logDestinoPaisTocado_ = !!(logQuote.env && String(logQuote.env.destinoPais || "").trim());
    logDestinoCiudadTocado_ = !!(logQuote.env && String(logQuote.env.destinoCiudad || "").trim());
    if (!logDestinoPaisTocado_) logAplicarPaisCliente_();
    /* Radios Detalle/Una línea: el HTML trae Detalle marcado; alinear YA con el env cargado
       para que un leerEnvUi previo al primer paint no pise «Una línea». */
    (function syncModoCostoRadios_() {
        const e0 = logQuote.env || {};
        let modo = e0.modoCosto === "resumen" ? "resumen" : "detalle";
        const esc0 = logEscList_().length ? (logOpcionUiSel_ || (logEscList_()[0] && logEscList_()[0].id) || "") : "";
        if (esc0 && e0.porEsc && e0.porEsc[esc0] && e0.porEsc[esc0].modoCosto != null) {
            modo = e0.porEsc[esc0].modoCosto === "resumen" ? "resumen" : "detalle";
        }
        document.querySelectorAll("input[name=\"logModoCosto\"]").forEach(function (r) { r.checked = r.value === modo; });
        const pctEl = document.getElementById("logResumenPct");
        if (pctEl) {
            const pct = esc0 && e0.porEsc && e0.porEsc[esc0] && e0.porEsc[esc0].resumenPct != null
                ? e0.porEsc[esc0].resumenPct : e0.resumenPct;
            if (pct != null && isFinite(Number(pct))) pctEl.value = String(pct);
        }
    })();
    logQuote.escenarios.forEach(function (e) { logQuote.escUid = Math.max(logQuote.escUid, parseInt(String(e.id).replace(/\D/g, ""), 10) || 0); });
    logSincronizarModoDesdeEscenarios_();
    if ((logQuote.escenarios || []).length) logMigrarFilasAContenedores_();
    if ((logQuote.escenarios || []).length) logRepararOverClonadoLegado_();
    logMigrarPartidasFilas_();
    logLayout = {
        cols: (g.layout && g.layout.cols && g.layout.cols.length ? g.layout.cols : LOG_COLUMNAS_DEMO).map(function (c) { return { k: c.k, w: c.w }; }),
        filaAlto: (g.layout && g.layout.filaAlto) || {}
    };
    logCab.codigo = clave;
    logCab.over = g.cab ? JSON.parse(JSON.stringify(g.cab)) : {};
    /* Cotizaciones viejas guardaban en cab.codigo el proyecto de Costos; en consolidado manda la 1.ª fila. */
    if (logCab.over && logTipoDoc_(g.idioma === "en" ? "en" : "es") === "CONS") delete logCab.over.codigo;
    logCab.idiomaPara = clave;
    const setv = function (idEl, val) { const el = document.getElementById(idEl); if (el && val != null) el.value = val; };
    setv("logIdioma", g.idioma === "en" ? "en" : "es");
    setv("logSistema", g.sistema === "imperial" ? "imperial" : "metrico");
    logCab.idiomaManual = true;
    logCab.sistemaManual = g.sistema === "imperial" || g.sistema === "metrico";
    setv("logMoneda", logQuote.moneda);
    setv("logTRM", logQuote.trm || logTrmDesdeCostos_() || "");
    setv("logDecimales", String(logDecimales_()));
    setv("logMargen", g.margenMm || 16);
    try {
        if (typeof textoEsperaNube === "function") textoEsperaNube("Preparando el documento…");
        await Promise.race([
            logisticaHidatarImgsCache_(logQuote.filas),
            new Promise(function (ok) { setTimeout(ok, 2500); })
        ]);
    } finally {
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
    }
    try {
        /* Restaurar Simulador 3D: JSON en hoja o archivo en Drive (sim3dRef). */
        await logisticaRestaurarSim3d_(g);
        try { await logisticaHidatarSim3dImgs_({}); } catch (eH3) { /* preview sin 3D aún */ }
        logisticaActualizarVista();
        logisticaPintarEstado_();
        logisticaPintarBadge_();
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("Abierta " + d.numero + " (" + d.id + " Rev " + d.rev + ").", "success");
        }
        logisticaTraerImgsFaltantes_();
    } catch (eVista) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Se abrió, pero la hoja no se pudo pintar: " + ((eVista && eVista.message) || eVista), "warning");
    }
}

async function logisticaRestaurarSim3d_(g) {
    if (!logQuote.env) logQuote.env = logEnvNormalizar_(null);
    let st = g && g.sim3d ? g.sim3d : null;
    const ref = (g && g.sim3dRef) || (logQuote.env && logQuote.env.sim3dRef) || "";
    if ((!st || st.drive) && ref && typeof realizarPeticionBD === "function") {
        try {
            const r = await realizarPeticionBD({ action: "cotizacion_imagenes", ids: [ref], modo: "blob" }, { timeoutMs: 60000 });
            const raw = r && r.exito && r.data ? r.data[ref] : "";
            if (raw && typeof raw === "string") {
                let jsonTxt = raw;
                const m = raw.match(/^data:[^;]+;base64,(.+)$/);
                if (m) {
                    try { jsonTxt = decodeURIComponent(escape(atob(m[1]))); } catch (eA) {
                        try { jsonTxt = atob(m[1]); } catch (eB) { jsonTxt = ""; }
                    }
                }
                if (jsonTxt) st = JSON.parse(jsonTxt);
            }
        } catch (eFetch) { console.warn("sim3d Drive restore:", eFetch); }
    }
    if (st && st.drive) st = null;
    if (st) {
        logQuote.env.sim3dBundle = st;
        if (ref) logQuote.env.sim3dRef = ref;
        if (typeof window.slImportarEstado === "function") {
            try { window.slImportarEstado(st); } catch (eSl) { console.warn("sim3d restore:", eSl); }
        }
    }
}

function logisticaInitHistorial_() {
    const on = function (id, fn) { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    on("btnLogGuardar", function () { logisticaAbrirGuardar_(); });
    on("btnLogHistorial", logisticaAbrirHistorial_);
    on("btnLogGuardarNueva", function () { logisticaGuardar_("nueva"); });
    on("btnLogGuardarRev", function () { logisticaGuardar_("rev"); });
    on("btnLogGuardarMisma", function () {
        logisticaGuardar_(logisticaDestinoGuardar_() ? "misma" : "nueva");
    });
    const modalG = document.getElementById("modalLogGuardar");
    if (modalG) {
        modalG.addEventListener("hidden.bs.modal", function () {
            const bMisma = document.getElementById("btnLogGuardarMisma");
            const bRev = document.getElementById("btnLogGuardarRev");
            if (bMisma) {
                bMisma.classList.add("btn-diforma-blue");
                bMisma.classList.remove("btn-outline-secondary");
            }
            if (bRev) {
                bRev.classList.add("btn-outline-secondary");
                bRev.classList.remove("btn-diforma-blue");
            }
        });
    }
    const buscar = document.getElementById("logHistBuscar");
    if (buscar) buscar.addEventListener("input", logisticaPintarHistorial_);
    const lista = document.getElementById("logHistLista");
    if (lista) {
        lista.addEventListener("click", function (ev) {
            const del = ev.target.closest("[data-hdel]");
            if (del) {
                ev.preventDefault();
                logisticaEliminarGuardada_(del.getAttribute("data-hdel"), parseInt(del.getAttribute("data-hrevdel"), 10), del);
                return;
            }
            const b = ev.target.closest("[data-hid]");
            if (!b) return;
            logisticaAbrirGuardada_(b.getAttribute("data-hid"), parseInt(b.getAttribute("data-hrev"), 10));
        });
    }
    logisticaPintarBadge_();
    logisticaInitOtroProyecto_();
}

/* ------------------------------------------------------------------ */
/* Constructor del documento (HTML autocontenido para pantalla + PDF)  */
/* ------------------------------------------------------------------ */

/**
 * @param {{idioma?:string, filas?:number, margenMm?:number}} opts
 * @returns {string} documento HTML completo (se usa en iframe y se imprime)
 */
/** Bloque opcional del Simulador 3D en el PDF (capturas + nota de ocupación). */
function logSim3dHtmlBloque_(nCols, esEn) {
    const env = typeof logEnv_ === "function" ? logEnv_() : {};
    const partes = [];
    function pushCap(titulo, img, meta) {
        if (!img && !(meta && meta.nota)) return;
        let h = "<tr class=\"sec-gap\"><td colspan=\"" + nCols + "\"></td></tr>";
        h += "<tr class=\"sec\"><td colspan=\"" + nCols + "\">" + logEsc_(titulo) + "</td></tr>";
        if (meta && meta.nota) {
            h += "<tr class=\"it\"><td colspan=\"" + nCols + "\" style=\"font-size:8pt;color:#444;\">" + logEsc_(meta.nota) + "</td></tr>";
        }
        if (img) {
            h += "<tr class=\"it\"><td colspan=\"" + nCols + "\" style=\"text-align:center;padding:6px 0;\">" +
                "<img src=\"" + String(img).replace(/"/g, "") + "\" alt=\"Simulador 3D\" style=\"max-width:100%;max-height:220px;border:1px solid #ddd;\"/>" +
                "</td></tr>";
        }
        partes.push(h);
    }
    const titBase = esEn ? "3D load simulation" : "Simulación 3D de carga";
    if (env.sim3dImg || (env.sim3d && env.sim3d.nota)) pushCap(titBase, env.sim3dImg, env.sim3d);
    const escs = typeof logEscList_ === "function" ? logEscList_() : [];
    escs.forEach(function (e, i) {
        const st = env.porEsc && env.porEsc[e.id];
        if (!st) return;
        if (!st.sim3dImg && !(st.sim3d && st.sim3d.nota)) return;
        const nom = typeof logEscNombre_ === "function" ? logEscNombre_(e, i, esEn ? "en" : "es") : ("Opción " + (i + 1));
        pushCap(titBase + " — " + nom, st.sim3dImg, st.sim3d);
    });
    if (typeof window.slPdfCapturesParaHoja === "function") {
        const caps = window.slPdfCapturesParaHoja() || {};
        Object.keys(caps).forEach(function (k) {
            if (!caps[k]) return;
            const ya = (k === "base" && env.sim3dImg) || (env.porEsc && env.porEsc[k] && env.porEsc[k].sim3dImg);
            if (ya) return;
            pushCap(titBase, caps[k], null);
        });
    }
    return partes.join("");
}

function logisticaConstruirHTML(opts, imprimir) {
    const o = opts || {};
    const idioma = o.idioma === "en" ? "en" : "es";
    const margenMm = Math.max(5, Math.min(40, parseFloat(o.margenMm) || 16));
    const T = LOG_TEXTOS[idioma];
    const M = logMembreteDoc_();
    const D = logisticaDatosDoc_(idioma);
    const prefijo = logTipoDoc_(idioma);
    const nombreDoc = logNombreArchivoPdf_(idioma);
    /* Campo editable directo sobre la hoja (solo pantalla; en el PDF es texto normal). */
    const ed = function (campo, valor, ph) {
        return "<span class=\"ed\" data-f=\"" + campo + "\" data-ph=\"" + logEsc_(ph) + "\">" + logEsc_(valor) + "</span>";
    };
    const esEn = idioma === "en";

    const tablaHtml = logisticaTablaHTML_(idioma);

    /* --- T&C (biblioteca de Ajustes + variables de la cotización) --- */
    const tycDoc = logTycDoc_();
    const tycLib = idioma === "en" ? tycDoc.en : tycDoc.es;
    const tycVars = Object.assign({}, tycDoc.vars, logTycVarsCotizacion_(idioma));
    let tycHtml = "";
    (tycLib.secciones || []).forEach(function (sec) {
        tycHtml += "<div class=\"tyc-sec\"><div class=\"tyc-t\">&bull; " + logEsc_(logTycAplicar_(sec.t, tycVars)) + "</div>";
        (sec.items || []).forEach(function (par, idx) {
            tycHtml += "<p class=\"tyc-p\"><span class=\"tyc-n\">" + (idx + 1) + ".</span> " +
                (par.k ? "<b>" + logEsc_(logTycAplicar_(par.k, tycVars)) + "</b> " : "") +
                logEsc_(logTycAplicar_(par.v, tycVars)) + "</p>";
        });
        tycHtml += "</div>";
    });

    /* --- membrete --- */
    const oficinasHtml = M.oficinas.map(function (of) {
        return "<div class=\"ftr-col\">" +
            "<div class=\"ftr-tit\"><i class=\"bi bi-building-fill\"></i> " + logEsc_(of.titulo) + "</div>" +
            "<div><i class=\"bi bi-telephone-fill\"></i> " + logEsc_(of.tel) + "</div>" +
            "<div class=\"ftr-dir\"><i class=\"bi bi-geo-alt-fill\"></i><span>" + logEsc_(of.dir1) + (of.dir2 ? "<br>" + logEsc_(of.dir2) : "") + "</span></div>" +
            "</div>";
    }).join("");

    return "<!DOCTYPE html><html lang=\"" + idioma + "\"><head><meta charset=\"utf-8\">" +
        "<title>" + logEsc_(nombreDoc) + "</title>" +
        "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css\">" +
        "<style>" +
        ":root{--rojo:#cf1f2e;--gris:#3b3b3d;--gris-tabla:#5a5f66;--mx:" + margenMm + "mm;--hdr-h:1.05in;--ftr-h:1in;}" +
        "*{box-sizing:border-box}" +
        "html,body{margin:0;padding:0}" +
        "body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#1f1f1f;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
        /* membrete: encabezado */
        ".hdr{position:relative;height:var(--hdr-h);width:100%;background:#fff;overflow:hidden}" +
        ".hdr-red{position:absolute;left:0;top:.6in;height:.14in;width:56%;background:var(--rojo)}" +
        ".hdr-dark{position:absolute;left:56%;top:.6in;height:.14in;width:5%;background:var(--gris);clip-path:polygon(0 0,100% 0,78% 100%,0 100%);margin-left:-.01in}" +
        ".hdr-logo{position:absolute;right:15%;top:.26in;height:.7in;width:auto}" +
        ".hdr-dots{position:absolute;right:.5in;top:.56in;width:.5in;height:.34in;background:radial-gradient(circle,#c4c4c4 1.3px,transparent 1.7px) 0 0/10px 10px}" +
        ".hdr-ref{position:absolute;left:var(--mx);top:.14in;font-size:7pt;color:#9a9a9a;letter-spacing:.03em;z-index:2}" +
        /* membrete: pie — en .page va absoluto al fondo (Chrome print ignora flex-grow del body). */
        ".ftr{position:relative;z-index:2;width:100%;height:auto;min-height:var(--ftr-h);flex:0 0 auto;overflow:hidden;background:#fff;padding:0 var(--mx);display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:.08in}" +
        ".page>.ftr{position:absolute;left:0;right:0;bottom:0;height:var(--ftr-h);min-height:var(--ftr-h);max-height:var(--ftr-h);flex:none;box-sizing:border-box}" +
        ".ftr-line{position:relative;border-top:1px solid #d9d9d9;margin-bottom:.1in;height:0}" +
        ".ftr-line i{position:absolute;right:0;top:-5px;width:9px;height:9px;background:#555}" +
        ".ftr-row{display:flex;align-items:center;gap:.28in}" +
        ".ftr-qr{height:.7in;width:auto}" +
        ".ftr-col{font-size:7.6pt;color:#444;line-height:1.35}" +
        ".ftr-col i{color:var(--rojo);margin-right:4px}" +
        ".ftr-tit{font-size:9pt;font-weight:700;color:#111;margin-bottom:2px}" +
        ".ftr-dir{display:flex;align-items:flex-start}" +
        ".ftr-dir span{display:block}" +
        ".ftr-web{margin-left:auto;background:var(--rojo);color:#fff;font-weight:700;font-size:8.5pt;padding:7px 14px;border-radius:2px;white-space:nowrap}" +
        /* cuerpo */
        ".paper{width:100%;border-collapse:collapse}" +
        ".paper>tbody>tr>td{padding:0 var(--mx)}" +
        ".sp-h{height:calc(var(--hdr-h) + .05in)}" +
        ".sp-f{height:calc(var(--ftr-h) + .05in)}" +
        ".fecha{margin-top:.1in}" +
        ".dest{margin-top:.18in}" +
        ".dest b{font-size:10.5pt}" +
        ".titulo{margin:.22in 0 .12in;font-size:11.5pt;font-weight:700;color:var(--rojo);letter-spacing:.02em}" +
        ".intro{margin:0 0 .14in}" +
        /* tabla ítems */
        ".items{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.6pt}" +
        ".items thead{display:table-header-group}" +
        ".items thead th{background:var(--gris-tabla);color:#fff;height:auto;min-height:.46in;line-height:1.15;padding:5px 3px;font-size:7pt;text-transform:uppercase;text-align:center;font-weight:700;border-right:1px solid #7b8088;position:relative;vertical-align:middle;white-space:normal}" +
        ".items thead th:last-child{border-right:0}" +
        ".items td{padding:5px 6px;border-bottom:1px solid #d9d9d9;vertical-align:middle;position:relative}" +
        ".items tr{break-inside:avoid;page-break-inside:avoid}" +
        ".items tr.it-sim3d{break-inside:avoid;page-break-inside:avoid}" +
        ".items tr.it-sim3d[data-salto=\"1\"]{break-before:page;page-break-before:always}" +
        ".log-sim3d-frame{text-align:center;background:#eef2f7;border:1px solid #b8c4d4;padding:3px;box-sizing:border-box;cursor:pointer}" +
        ".log-sim3d-frame img{width:100%;max-width:100%;max-height:5.2in;height:auto;object-fit:contain;display:block;margin:0 auto;pointer-events:none}" +
        ".log-sim3d-page{margin:.12in 0 .2in;padding:0;cursor:pointer}" +
        ".log-sim3d-page .log-sim3d-frame{max-width:100%;box-sizing:border-box}" +
        ".log-sim3d-ph{font-size:9pt;color:#888;padding:18px;border:1px dashed #ccc;text-align:center}" +
        ".items td.c{text-align:center}" +
        ".items td.r{text-align:right;white-space:nowrap}" +
        /* escenarios apilados: misma tabla; las opciones extra solo añaden qty/pu/sub */
        ".items tr.it-cont{break-before:avoid;page-break-before:avoid}" +
        ".items tr.it-cont td{border-top:1px solid #d9d9d9}" +
        ".items td.x{color:#aaa;text-align:center}" +
        ".items td[rowspan]{vertical-align:middle}" +
        ".td-img{overflow:hidden}" +
        ".thumb{width:100%;max-width:100%;height:.6in;object-fit:contain;display:block;margin:0 auto}" +
        ".it-nom{font-weight:700;margin-bottom:2px}" +
        ".it-desc{color:#333}" +
        ".it-desc-lite{font-size:8.2pt;color:#444}" +
        ".it-med{color:#555;font-size:8pt;margin-top:2px}" +
        ".items tr.sec{break-after:avoid;page-break-after:avoid}" +
        ".items tr.esc-salto{break-before:page;page-break-before:always}" +
        ".items tr.sec-gap td{height:10px;padding:0;border:0;background:#fff}" +
        ".items tr.sec td,.items tr.tot td,.items tr.tot-pago td{height:.28in;padding-top:0;padding-bottom:0;box-sizing:border-box}" +
        ".items tr.sec td{background:#f1f1f2;color:var(--rojo);font-weight:700;letter-spacing:.04em;font-size:8.2pt;border-bottom:1px solid #d9d9d9}" +
        ".items tr.obs td{background:#fff;color:#333;font-weight:400;letter-spacing:0;font-size:8.2pt;line-height:1.35;padding:7px 8px;border-bottom:1px solid #e8e8e8;white-space:pre-wrap}" +
        ".items tr.obs .ed{font-weight:400;color:#333}" +
        ".items tr.esc-sec td{background:var(--gris);color:#fff;font-size:9pt;letter-spacing:.05em}" +
        ".items tr.tot td{border-bottom:1px solid #d9d9d9;border-top:0;font-weight:700;font-size:8.4pt}" +
        ".items tr.tot-sub td{background:#f4f4f5;color:#111}" +
        ".items tr.tot-prod td{background:#fff;color:#111}" +
        ".items tr.tot-log td{background:#f4f4f5;color:#111}" +
        ".items tr.tot-desc td{background:#fff;color:#111;font-size:8.4pt}" +
        ".items tr.tot-desc .tot-nota{display:block;margin-top:1px;font-weight:400;font-size:7.4pt;line-height:1.25;color:#444;white-space:normal}" +
        ".items tr.tot-pago td{background:#e8e8e8;color:#111;border-top:0;border-bottom:1px solid #fff;font-size:8.4pt}" +
        ".items tr.tot-pago:last-child td{border-bottom:0}" +
        ".items tr.it-env td{background:transparent}" +
        ".items tr.gran td{background:var(--rojo);color:#fff;border-top:0;border-bottom:0;font-size:8.4pt}" +
        ".log-inc{margin:0 0 .12in;font-size:8.6pt;color:#333}" +
        /* T&C */
        ".tyc-wrap{break-before:page;page-break-before:always}" +
        ".tyc-h{font-size:10.5pt;font-weight:700;color:var(--rojo);margin:.04in 0 .12in}" +
        ".tyc-sec{margin-bottom:.06in}" +
        ".tyc-t{font-weight:700;font-size:8.2pt;margin-bottom:2px;break-after:avoid}" +
        ".tyc-p{margin:0 0 2px;font-size:7.3pt;line-height:1.27;text-align:justify;break-inside:avoid}" +
        ".tyc-n{display:inline-block;min-width:11px}" +
        ".cierre{margin:.08in 0 .05in;font-size:8.4pt;break-inside:avoid}" +
        ".firma{break-inside:avoid;margin-top:.08in;font-size:11pt;line-height:1.35}" +
        ".firma-img{display:block;height:1.05in;width:auto;max-width:3.1in;object-fit:contain;margin:.12in 0 .04in}" +
        ".firma .nom{font-weight:700;font-size:12.5pt;margin-top:.28in}" +
        ".firma.has-img .nom{margin-top:.04in}" +
        /* pantalla */
        "@media screen{" +
        "html,body{overflow:hidden}" +
        "body{background:#fff}" +
        /* campos editables directo sobre la hoja (solo pantalla) */
        ".ed{border-radius:2px;outline:1px dashed transparent;outline-offset:1px;cursor:text;min-width:1ch}" +
        ".pu-lock{cursor:default}" +
        ".ed:hover{outline-color:#90caf9;background:#f3f9ff}" +
        ".ed:focus{outline:1px solid #2196f3;background:#fff;color:#111}" +
        ".items tr.gran .ed,.items tr.gran .ed:hover{color:#fff;background:transparent;outline:none}" +
        ".items tr.gran .ed:focus,.items tr.gran .ed:focus-visible{color:#111;background:transparent;outline:none;caret-color:#111}" +
        ".ed:empty:before{content:attr(data-ph);color:#b0b7c0;font-style:italic;font-weight:400}" +
        /* controladores de arrastre (solo pantalla, nunca en el PDF) */
        ".rz{position:absolute;z-index:6;opacity:0;transition:opacity .12s}" +
        ".rz-c{top:0;bottom:0;right:0;width:12px;cursor:col-resize;z-index:8}" +
        ".rz-c:after{content:\"\";position:absolute;left:4px;top:12%;bottom:12%;width:3px;background:#ff8a80;border-radius:2px}" +
        ".rz-r{left:0;right:0;bottom:0;height:10px;cursor:row-resize}" +
        ".rz-r:after{content:\"\";position:absolute;top:4px;left:12%;right:12%;height:3px;background:#2196f3;border-radius:2px}" +
        ".items thead th:hover>.rz,.items tr.it:hover .td-img>.rz,.rz:hover,body.rz-on .rz-act{opacity:1}" +
        "body.rz-on{user-select:none;-webkit-user-select:none}" +
        "body.rz-on.rz-col,body.rz-on.rz-col *{cursor:col-resize!important}" +
        "body.rz-on.rz-row,body.rz-on.rz-row *{cursor:row-resize!important}" +
        "body{background:#e6e8ee}" +
        ".page{width:8.5in;height:11in;margin:0 auto 18px;background:#fff;box-shadow:0 8px 28px rgba(0,0,0,.18);display:flex;flex-direction:column;position:relative;overflow:hidden}" +
        /* Reserva el alto del pie: Chrome print no respeta flex-grow para empujar el .ftr. */
        ".page-body{flex:1 1 auto;min-height:0;overflow:hidden;padding:0;padding-bottom:calc(var(--ftr-h) + .06in);box-sizing:border-box}" +
        ".page-inner{margin:0 var(--mx);padding-bottom:.12in;box-sizing:border-box;min-width:0}" +
        ".page.crece .page-body{overflow:visible}" +
        ".page .pnum{position:absolute;right:var(--mx);bottom:calc(var(--ftr-h) + .04in);font-size:7.5pt;color:#777;z-index:3}" +
        ".page.crece{height:auto;min-height:11in;overflow:visible}" +
        ".sp-h,.sp-f{display:none}" +
        "body.paginado .sheet{display:none}" +
        "}" +
        /* impresión / PDF: Carta exacta; márgenes internos vía --mx en .page-inner / .ftr. */
        "@page{size:Letter;margin:0}" +
        "@media print{" +
        "html,body{background:#fff!important;margin:0!important;padding:0!important;width:8.5in!important;min-width:8.5in!important;max-width:8.5in!important}" +
        ".rz{display:none!important}" +
        ".ed:empty{display:none}" +
        ".ln:has(.ed:empty){display:none}" +
        "body.paginado .sheet{display:none!important}" +
        "body.paginado .pages{display:block!important;zoom:1!important;transform:none!important;width:8.5in!important;margin:0!important;padding:0!important}" +
        "body.paginado .page{width:8.5in!important;height:11in!important;min-height:11in!important;max-width:8.5in!important;margin:0!important;padding:0!important;box-shadow:none!important;page-break-after:always;break-after:page;overflow:hidden!important;position:relative!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
        "body.paginado .page:last-child{page-break-after:auto;break-after:auto}" +
        "body.paginado .page.crece{height:auto!important;min-height:11in!important;overflow:visible!important}" +
        "body.paginado .page-body{padding-bottom:calc(var(--ftr-h) + .06in)!important}" +
        "body.paginado .page-inner{margin-left:var(--mx)!important;margin-right:var(--mx)!important}" +
        "body.paginado .page>.ftr{position:absolute!important;left:0!important;right:0!important;bottom:0!important;height:var(--ftr-h)!important;min-height:var(--ftr-h)!important;max-height:var(--ftr-h)!important;padding-left:var(--mx)!important;padding-right:var(--mx)!important}" +
        /* Página X de Y encima del pie (no usar el pie del navegador: márgenes «Ninguno»). */
        "body.paginado .page .pnum{display:block!important;position:absolute!important;right:var(--mx)!important;bottom:calc(var(--ftr-h) + .04in)!important;font-size:7.5pt!important;color:#777!important;z-index:3!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
        "body:not(.paginado) .pages{display:none!important}" +
        "body:not(.paginado) .hdr{position:fixed;top:0;left:0;right:0;z-index:5}" +
        "body:not(.paginado) .ftr{position:fixed;bottom:0;left:0;right:0;z-index:5;height:var(--ftr-h)}" +
        "body:not(.paginado) .paper>thead{display:table-header-group}" +
        "body:not(.paginado) .paper>tfoot{display:table-footer-group}" +
        "body:not(.paginado) .sp-h,.sp-f{display:block}" +
        "}" +
        "</style></head><body>" +
        "<div class=\"sheet\">" +
        "<div class=\"hdr\">" + (logRefNubePdf_() ? "<span class=\"hdr-ref\">" + logEsc_(logRefNubePdf_()) + "</span>" : "") + "<span class=\"hdr-red\"></span><span class=\"hdr-dark\"></span><span class=\"hdr-dots\"></span><img class=\"hdr-logo\" src=\"" + logEsc_(M.logo) + "\" alt=\"Diforma Group\"></div>" +
        "<table class=\"paper\">" +
        "<thead><tr><td><div class=\"sp-h\"></div></td></tr></thead>" +
        "<tfoot><tr><td><div class=\"sp-f\"></div></td></tr></tfoot>" +
        "<tbody>" +
        /* datos de cabecera */
        "<tr><td>" +
        "<div class=\"fecha\">" + ed("ciudad", D.ciudad, esEn ? "City" : "Ciudad") + ", " + ed("fecha", D.fecha, esEn ? "Date" : "Fecha") + "</div>" +
        "<div class=\"dest\">" + (T.senores ? "<div class=\"ln\">" + logEsc_(T.senores) + "</div>" : "") +
        "<div class=\"ln\"><b>" + ed("cliente", D.cliente, esEn ? "Client" : "Cliente") + "</b></div>" +
        "<div class=\"ln\">" + logEsc_(T.atn) + " " + ed("contacto", D.contacto, esEn ? "Contact name" : "Nombre del contacto") + "</div>" +
        "<div class=\"ln\">" + ed("cargoContacto", D.cargoContacto, esEn ? "Contact title" : "Cargo del contacto") + "</div></div>" +
        "<div class=\"titulo\">" + logEsc_(prefijo === "CONS" ? T.tituloCons : T.titulo) + " " + ed("codigo", D.codigo, esEn ? "Code" : "Código") + "</div>" +
        "<p class=\"intro\"><b>" + logEsc_(T.saludo) + "</b><br>" + logEsc_(T.intro) + "</p>" +
        "<p class=\"log-inc\" id=\"logIncotermLinea\">" + logEsc_(logEnvLineaPdf_(T, esEn)) + "</p>" +
        "</td></tr>" +
        /* tabla */
        "<tr><td>" + tablaHtml + "</td></tr>" +
        /* T&C + firma */
        "<tr><td><div class=\"tyc-wrap\"><div class=\"tyc-h\">" + logEsc_(logTycAplicar_(tycLib.titulo || T.tycTitulo, tycVars)) + "</div>" + tycHtml +
        "<p class=\"cierre\">" + logEsc_(T.cierre) + "</p>" +
        "<div class=\"firma" + (M.firmaImg ? " has-img" : "") + "\">" + logEsc_(T.despedida) +
        (M.firmaImg ? "<img class=\"firma-img\" src=\"" + logEsc_(M.firmaImg) + "\" alt=\"\">" : "") +
        "<div class=\"nom\">" + ed("firmaNombre", D.firmaNombre, esEn ? "Sales rep name" : "Nombre del comercial") + "</div>" +
        "<div class=\"ln\">" + ed("firmaCargo", D.firmaCargo, esEn ? "Title" : "Cargo") + "</div>" +
        "<div class=\"ln\">" + ed("firmaCorreo", D.firmaCorreo, esEn ? "Email" : "Correo") + "</div>" +
        "<div class=\"ln\">" + ed("firmaTelefono", D.firmaTelefono, esEn ? "Phone" : "Teléfono") + "</div>" +
        "<div class=\"ln\">" + ed("firmaWeb", D.firmaWeb, esEn ? "Website" : "Sitio web") + "</div>" +
        "</div></div></td></tr>" +
        "</tbody></table>" +
        "<div class=\"ftr\"><div class=\"ftr-line\"><i></i></div><div class=\"ftr-row\">" +
        "<img class=\"ftr-qr\" src=\"" + logEsc_(M.qr) + "\" alt=\"QR\">" + oficinasHtml +
        "<div class=\"ftr-web\"><i class=\"bi bi-globe2\"></i> " + logEsc_(M.web) + "</div>" +
        "</div></div>" +
        "</div>" +
        (imprimir ? "" : "<script>(function(){" +
        "var ETI='" + (esEn ? "Page" : "Página") + "';" +
        "var DE='" + (esEn ? "of" : "de") + "';" +
        "function hoja(){return document.querySelector('.sheet');}" +
        "function tomar(){" +
        "var sheet=hoja();" +
        "var pages=document.querySelector('.pages');" +
        "var intro=[],rows=[],thead=null,colg=null,tyc=null,hdr=null,ftr=null;" +
        "if(sheet){hdr=sheet.querySelector('.hdr');ftr=sheet.querySelector('.ftr');}" +
        "if(pages&&pages.querySelector('.page')){" +
        "var pageList=[].slice.call(pages.querySelectorAll('.page'));" +
        "if(pageList[0]){var h0=pageList[0].querySelector('.hdr');var f0=pageList[0].querySelector('.ftr');if(h0)hdr=h0;if(f0)ftr=f0;}" +
        "pageList.forEach(function(p,pi){" +
        "var b=p.querySelector('.page-body');if(!b)return;" +
        "var root=b.querySelector('.page-inner')||b;" +
        "[].forEach.call([].slice.call(root.childNodes),function(n){" +
        "if(n.nodeType!==1){if(pi===0&&n.nodeType===3&&String(n.textContent||'').trim())intro.push(n);return;}" +
        "if(n.classList.contains('tyc-wrap')){tyc=n;return;}" +
        "if(n.classList.contains('log-sim3d-page')){" +
        "var tr=document.createElement('tr');tr.className='it it-sim3d';" +
        "if(n.getAttribute('data-salto')==='1')tr.setAttribute('data-salto','1');" +
        "var uidS=n.getAttribute('data-r')||'';var frS=n.querySelector('.log-sim3d-frame,[data-r]');" +
        "if(!uidS&&frS)uidS=frS.getAttribute('data-r')||'';if(uidS)tr.setAttribute('data-r',uidS);" +
        "var td=document.createElement('td');td.colSpan=99;while(n.firstChild)td.appendChild(n.firstChild);tr.appendChild(td);rows.push(tr);return;" +
        "}" +
        "if(n.tagName==='TABLE'||n.classList.contains('items')){" +
        "if(!thead)thead=n.querySelector('thead');if(!colg)colg=n.querySelector('colgroup');" +
        "[].forEach.call(n.querySelectorAll('tbody>tr'),function(tr){rows.push(tr);});return;" +
        "}" +
        "if(pi===0)intro.push(n);" +
        "});" +
        "});" +
        "if(!tyc)tyc=pages.querySelector('.tyc-wrap');" +
        "}else if(sheet){" +
        "var trs=sheet.querySelectorAll('.paper>tbody>tr');" +
        "if(trs[0])intro=[].slice.call(trs[0].cells[0].childNodes).filter(function(n){return n.nodeType===1||(n.nodeType===3&&String(n.textContent||'').trim());});" +
        "var t0=trs[1]&&trs[1].querySelector('table.items');" +
        "if(t0){thead=t0.querySelector('thead');colg=t0.querySelector('colgroup');rows=[].slice.call(t0.querySelectorAll('tbody>tr'));}" +
        "tyc=trs[2]&&trs[2].querySelector('.tyc-wrap');" +
        "}" +
        "return {hdr:hdr,ftr:ftr,intro:intro,rows:rows,thead:thead,colg:colg,tyc:tyc};" +
        "}" +
        "function armar(pack){" +
        "var hold=document.createElement('div');" +
        "pack.intro.forEach(function(n){hold.appendChild(n);});" +
        "pack.rows.forEach(function(n){hold.appendChild(n);});" +
        "if(pack.tyc)hold.appendChild(pack.tyc);" +
        "if(pack.thead)hold.appendChild(pack.thead);" +
        "if(pack.colg)hold.appendChild(pack.colg);" +
        "var viejo=document.querySelector('.pages');if(viejo)viejo.parentNode.removeChild(viejo);" +
        "var pages=document.createElement('div');pages.className='pages';document.body.appendChild(pages);" +
        "function paginaDe_(el){return el&&el.closest?el.closest('.page'):null;}" +
        "function page(){var p=document.createElement('section');p.className='page';if(pack.hdr)p.appendChild(pack.hdr.cloneNode(true));var b=document.createElement('div');b.className='page-body';var inn=document.createElement('div');inn.className='page-inner';b.appendChild(inn);p.appendChild(b);if(pack.ftr)p.appendChild(pack.ftr.cloneNode(true));var num=document.createElement('div');num.className='pnum';p.appendChild(num);pages.appendChild(p);return inn;}" +
        "function tabla(vivo){var t=document.createElement('table');t.className='items';if(pack.colg)t.appendChild(vivo?pack.colg:pack.colg.cloneNode(true));if(pack.thead)t.appendChild(vivo?pack.thead:pack.thead.cloneNode(true));var tb=document.createElement('tbody');t.appendChild(tb);return t;}" +
        "var body=page();" +
        "pack.intro.forEach(function(n){body.appendChild(n);});" +
        "var table=tabla(true);body.appendChild(table);var tb=table.tBodies[0];" +
        "function limite(b){var pg=paginaDe_(b);var f=pg&&pg.querySelector('.ftr');var y=f?f.getBoundingClientRect().top:b.getBoundingClientRect().bottom;return y-6;}" +
        "function noCabe(b,row){return row.getBoundingClientRect().bottom>limite(b);}" +
        "function marcarCrece_(b){var pg=paginaDe_(b);if(pg)pg.classList.add('crece');}" +
        "function paginaOcupada_(){return (tb&&tb.rows.length>0)||!!(body&&body.querySelector('.log-sim3d-page'));}" +
        "function sim3dFueraTabla_(b,row){" +
        "var td=row.querySelector('td');var wrap=document.createElement('div');wrap.className='log-sim3d-page';" +
        "if(row.getAttribute('data-salto'))wrap.setAttribute('data-salto','1');" +
        "if(row.getAttribute('data-r'))wrap.setAttribute('data-r',row.getAttribute('data-r'));" +
        "if(td){while(td.firstChild)wrap.appendChild(td.firstChild);}" +
        "b.appendChild(wrap);return wrap;" +
        "}" +
        "function paginaSoloSim3d_(row){" +
        "body=page();sim3dFueraTabla_(body,row);" +
        "if(noCabe(body,body.lastChild))marcarCrece_(body);" +
        "table=tabla(false);body.appendChild(table);tb=table.tBodies[0];" +
        "}" +
        "function nuevaPaginaTabla_(){body=page();table=tabla(false);body.appendChild(table);tb=table.tBodies[0];}" +
        "pack.rows.forEach(function(row){" +
        "if(row.classList.contains('it-sim3d')){" +
        "if(row.getAttribute('data-salto')&&paginaOcupada_()){paginaSoloSim3d_(row);return;}" +
        "tb.appendChild(row);" +
        "if(noCabe(body,row)){tb.removeChild(row);paginaSoloSim3d_(row);}" +
        "return;" +
        "}" +
        "if(row.getAttribute('data-salto')&&paginaOcupada_()){nuevaPaginaTabla_();}" +
        "tb.appendChild(row);" +
        "var pasa=noCabe(body,row);" +
        "if(pasa&&tb.rows.length===1){marcarCrece_(body);return;}" +
        "if(pasa&&tb.rows.length>1){" +
        "tb.removeChild(row);" +
        "var ant=tb.rows.length?tb.rows[tb.rows.length-1]:null;" +
        "var llevar=null;" +
        "if(ant&&ant.classList.contains('sec')){llevar=ant;tb.removeChild(ant);}" +
        "else if(row.classList.contains('it-cont')&&ant&&(ant.classList.contains('it')||ant.classList.contains('it-cont'))){llevar=ant;tb.removeChild(ant);}" +
        "body=page();table=tabla(false);body.appendChild(table);tb=table.tBodies[0];" +
        "if(llevar)tb.appendChild(llevar);" +
        "tb.appendChild(row);" +
        "if(noCabe(body,row))marcarCrece_(body);" +
        "}" +
        "});" +
        "if(pack.tyc){body=page();body.appendChild(pack.tyc);if(body.scrollHeight>body.clientHeight)marcarCrece_(body);}" +
        "var lista=[].slice.call(pages.querySelectorAll('.page'));" +
        "lista.forEach(function(p,i){var n=p.querySelector('.pnum');if(n)n.textContent=ETI+' '+(i+1)+' '+DE+' '+lista.length;});" +
        "[].forEach.call(pages.querySelectorAll('table.items'),function(t){if(!t.querySelector('tbody tr.it:not(.it-env):not(.it-sim3d)')){var th=t.querySelector('thead');if(th)th.parentNode.removeChild(th);}if(!t.querySelector('tbody tr')){if(t.parentNode)t.parentNode.removeChild(t);}});" +
        "document.body.classList.add('paginado');" +
        "}" +
        "window.recolocarPaginas_=function(){var pack=tomar();if(!pack.hdr)return;armar(pack);};" +
        "window.recolocarPaginas_();" +
        "})();</script>") + "</body></html>";
}

/* UI de la pestaña (vista previa + botón PDF)                         */
/* ------------------------------------------------------------------ */

function logSetSiNoFoco_(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (document.activeElement === el) return;
    const v = val == null ? "" : String(val);
    if (el.value !== v) el.value = v;
}

function logisticaLeerEnvUi_() {
    const prev = logEnv_();
    const mod = ((document.getElementById("logModalidad") || {}).value) || prev.modalidad;
    const inc = String(((document.getElementById("logIncoterm") || {}).value) || prev.incoterm).toUpperCase();
    let modalidad = LOG_MODALIDADES_.indexOf(mod) >= 0 ? mod : prev.modalidad;
    let incoterm = LOG_INCOTERM_MATRIZ_[inc] ? inc : prev.incoterm;
    if (logEnvIncotermsDe_(modalidad).indexOf(incoterm) < 0) {
        const avail = logEnvIncotermsDe_(modalidad);
        incoterm = avail.indexOf("CIP") >= 0 ? "CIP" : (avail[0] || "EXW");
    }
    const destinoCiudad = ((document.getElementById("logDestCiudad") || {}).value || "").trim();
    const destinoPais = ((document.getElementById("logDestPais") || {}).value || "").trim();
    const destinoCodigo = ((document.getElementById("logDestCodigo") || {}).value || "").trim().toUpperCase();
    const destinoPuerto = ((document.getElementById("logDestPuerto") || {}).value || "").trim();
    const destinoTitulo = ((document.getElementById("logDestTitulo") || {}).value || "").trim();
    /* Con opciones: modalidad/Incoterm/destino van a la opción activa; el global refleja esa opción. */
    const escAct = logEscList_().length ? (logEnvEscSel_ || logOpcionUiAsegurar_()) : "";
    if (escAct) {
        if (!prev.porEsc || typeof prev.porEsc !== "object") prev.porEsc = {};
        if (!prev.porEsc[escAct]) prev.porEsc[escAct] = logEnvEscSemilla_(prev);
        const st = prev.porEsc[escAct];
        st.modalidad = modalidad;
        st.incoterm = incoterm;
        st.destinoCiudad = destinoCiudad;
        st.destinoPais = destinoPais;
        st.destinoCodigo = destinoCodigo;
        st.destinoPuerto = destinoPuerto;
        st.destinoTitulo = destinoTitulo;
    }
    prev.modalidad = modalidad;
    prev.incoterm = incoterm;
    prev.destinoCiudad = destinoCiudad;
    prev.destinoPais = destinoPais;
    prev.destinoCodigo = destinoCodigo;
    prev.destinoPuerto = destinoPuerto;
    prev.destinoTitulo = destinoTitulo;
    prev.contenedores = logContenedoresNorm_({
        c20: (document.getElementById("logC20") || {}).value,
        c40: (document.getElementById("logC40") || {}).value,
        c40hc: (document.getElementById("logC40hc") || {}).value
    });
    const embEl = document.getElementById("logEmbarques");
    if (embEl) {
        const n = parseInt(embEl.value, 10);
        prev.embarques = isFinite(n) && n > 0 ? n : 1;
    }
    const modo = document.querySelector("input[name=\"logModoCosto\"]:checked");
    /* Si ningún radio está marcado (p. ej. HTML aún no pintado tras abrir), no pisar el valor cargado. */
    if (modo && (modo.value === "resumen" || modo.value === "detalle")) {
        prev.modoCosto = modo.value === "resumen" ? "resumen" : "detalle";
    }
    const sw = document.getElementById("logCostosOn");
    if (sw) {
        const escSw = logEscList_().length ? (logEnvEscSel_ || logOpcionUiAsegurar_()) : "";
        if (escSw) {
            /* Un solo Incluir: con opciones escribe en la opción activa. */
            prev.activo = true;
            if (!prev.porEsc || typeof prev.porEsc !== "object") prev.porEsc = {};
            if (!prev.porEsc[escSw]) prev.porEsc[escSw] = logEnvEscSemilla_(prev);
            prev.porEsc[escSw].activo = !!sw.checked;
        } else {
            prev.activo = !!sw.checked;
        }
    }
    const mer = document.getElementById("logMercado");
    if (mer && (mer.value === "EXPORTACION" || mer.value === "NACIONAL")) prev.mercado = mer.value;
    const pct = Number((document.getElementById("logResumenPct") || {}).value);
    if (isFinite(pct)) prev.resumenPct = Math.min(100, Math.max(0, pct));
    /* Una línea / % visible también por opción (como Incluir). */
    if (escAct && prev.porEsc && prev.porEsc[escAct]) {
        prev.porEsc[escAct].modoCosto = prev.modoCosto === "resumen" ? "resumen" : "detalle";
        prev.porEsc[escAct].resumenPct = prev.resumenPct;
    }
    const mg = document.getElementById("logMargenLog");
    if (mg) prev.margenPct = String(mg.value || "").trim() === "" ? 0 : logMargenClamp_(mg.value);
    const cubDe_ = function (id) {
        const el = document.getElementById(id);
        if (!el) return undefined;
        return logCubNum_(String(el.value || "").trim() === "" ? null : el.value);
    };
    const cubM3 = cubDe_("logCubM3");
    const cubPeso = cubDe_("logCubPeso");
    const cubKgVol = cubDe_("logCubKgVol");
    if (cubM3 !== undefined) prev.cubM3 = cubM3;
    if (cubPeso !== undefined) prev.cubPeso = cubPeso;
    if (cubKgVol !== undefined) prev.cubKgVol = cubKgVol;
    /* valores por opción de la tabla de Envío (contenedores, cubicaje, embarques) */
    const escBox = document.getElementById("logEscEnvBox");
    if (escBox) {
        escBox.querySelectorAll("[data-op][data-campo]").forEach(function (inp) {
            const op = inp.getAttribute("data-op");
            const campo = inp.getAttribute("data-campo");
            if (!op || !campo) return;
            if (!prev.porEsc || typeof prev.porEsc !== "object") prev.porEsc = {};
            if (!prev.porEsc[op]) prev.porEsc[op] = logEnvEscSemilla_(prev);
            const st = prev.porEsc[op];
            const t = String(inp.value || "").trim();
            const num = t === "" ? null : Number(String(t).replace(",", "."));
            if (campo === "activo") st.activo = inp.type === "checkbox" ? !!inp.checked : true;
            else if (campo === "c20" || campo === "c40" || campo === "c40hc") st.contenedores[campo] = num != null && isFinite(num) && num > 0 ? Math.floor(num) : 0;
            else if (campo === "embarques") st.embarques = num != null && isFinite(num) && num > 0 ? Math.floor(num) : 1;
            else if (campo === "cubM3" || campo === "cubPeso" || campo === "cubKgVol") st[campo] = num != null && isFinite(num) && num >= 0 ? num : null;
        });
    }
    const box = document.getElementById("logEnvLineas");
    if (box) {
        /* Con opciones siempre hay escSel (fallback a la pestaña activa); si no, los
           costos quedan solo en ln.valor y se pierden al reconstruir Courier↔Aéreo. */
        const escSel = logEscList_().length
            ? (logEnvEscSel_ || logOpcionUiAsegurar_() || "")
            : "";
        let stSel = null;
        if (escSel) {
            if (!prev.porEsc || typeof prev.porEsc !== "object") prev.porEsc = {};
            if (!prev.porEsc[escSel]) prev.porEsc[escSel] = logEnvEscSemilla_(prev);
            stSel = prev.porEsc[escSel];
        }
        box.querySelectorAll("[data-lid]").forEach(function (row) {
            const ln = prev.lineas.find(function (x) { return x.id === row.getAttribute("data-lid"); });
            if (!ln) return;
            const val = row.querySelector("[data-lv]");
            const pctEl = row.querySelector("[data-lp]");
            const nota = row.querySelector("[data-ln]");
            const nom = row.querySelector("[data-lc]");
            const arancel = ln.tipo === "duties" || ln.tipo === "taxes";
            let valorNuevo = ln.valor;
            let pctNuevo = ln.pct;
            if (val) {
                const t = String(val.value || "").trim();
                const nuevo = t === "" ? null : Number(String(t).replace(",", "."));
                valorNuevo = nuevo != null && isFinite(nuevo) ? nuevo : null;
            }
            if (pctEl) {
                const t = String(pctEl.value || "").trim();
                const nuevo = t === "" ? null : Number(String(t).replace(",", "."));
                pctNuevo = nuevo != null && isFinite(nuevo) ? nuevo : null;
            }
            /* Costo pintado desde el % (data-auto-val): no tratarlo como edición manual ni guardarlo como valor fijo. */
            const autoAttr = val ? val.getAttribute("data-auto-val") : null;
            const esAuto = arancel && ln.valor == null && autoAttr != null && autoAttr !== "" &&
                valorNuevo != null && Math.abs(Number(autoAttr) - valorNuevo) < 0.02;
            const kt = logEscKeyTipo_(ln.tipo);
            if (arancel && pctEl && pctNuevo !== ln.pct) {
                ln.fuente = "";
                ln.arancelManual = true;
                ln.pct = pctNuevo;
                ln.valor = null;
                if (val) val.value = "";
                if (prev.porEsc) Object.keys(prev.porEsc).forEach(function (k) {
                    delete prev.porEsc[k].valores[ln.id];
                    if (kt) delete prev.porEsc[k].valores[kt];
                    if (pctNuevo == null) {
                        delete prev.porEsc[k].pcts[ln.id];
                        if (kt) delete prev.porEsc[k].pcts[kt];
                    } else {
                        prev.porEsc[k].pcts[ln.id] = pctNuevo;
                        if (kt) prev.porEsc[k].pcts[kt] = pctNuevo;
                    }
                });
            } else if (arancel && esAuto) {
                /* Costo solo visual desde el %: no guardar valor fijo ni marcar manual. */
            } else if (arancel && val && valorNuevo !== ln.valor) {
                ln.fuente = "";
                ln.arancelManual = true;
                ln.valor = valorNuevo;
                ln.pct = null;
                if (pctEl) pctEl.value = "";
                if (prev.porEsc) Object.keys(prev.porEsc).forEach(function (k) {
                    delete prev.porEsc[k].pcts[ln.id];
                    if (kt) delete prev.porEsc[k].pcts[kt];
                    if (valorNuevo == null) {
                        delete prev.porEsc[k].valores[ln.id];
                        if (kt) delete prev.porEsc[k].valores[kt];
                    } else {
                        prev.porEsc[k].valores[ln.id] = valorNuevo;
                        if (kt) prev.porEsc[k].valores[kt] = valorNuevo;
                    }
                });
            } else if (stSel && val) {
                /* Guardar por id y por tipo: al reconstruir líneas (Courier↔Aéreo) el id puede cambiar. */
                if (valorNuevo == null) {
                    delete stSel.valores[ln.id];
                    if (kt) delete stSel.valores[kt];
                } else {
                    stSel.valores[ln.id] = valorNuevo;
                    if (kt) stSel.valores[kt] = valorNuevo;
                }
                delete stSel.fuentes[ln.id];
                if (kt) delete stSel.fuentes[kt];
                if (!escSel || escSel === (logEscList_()[0] || {}).id) ln.valor = valorNuevo;
                if (pctEl) {
                    ln.pct = pctNuevo;
                    if (pctNuevo == null) {
                        delete stSel.pcts[ln.id];
                        if (kt) delete stSel.pcts[kt];
                    } else {
                        stSel.pcts[ln.id] = pctNuevo;
                        if (kt) stSel.pcts[kt] = pctNuevo;
                    }
                }
            } else {
                if (val) ln.valor = valorNuevo;
                if (pctEl) ln.pct = pctNuevo;
            }
            if (nota) ln.notas = nota.value || "";
            const mgN = row.querySelector("[data-lmg]");
            if (mgN) {
                const k = mgN.getAttribute("data-lmg");
                if (k && prev.margenNal) prev.margenNal[k] = String(mgN.value || "").trim() === "" ? 0 : logMargenClamp_(mgN.value);
            }
            if (nom) {
                const nuevo = nom.value || "";
                const base = logEnvEtiquetaTipo_(ln.tipo, prev.modalidad, (document.getElementById("logIdioma") || {}).value === "en");
                ln.concepto = nuevo;
                ln.conceptoManual = ln.tipo === "libre" ? true : nuevo.trim() !== base;
            }
        });
    }
    logQuote.env = logEnvNormalizar_(prev);
}

function logLugaresDestino_() {
    const t = typeof logTarAsegurar_ === "function" ? logTarAsegurar_() : null;
    if (!t) return [];
    const out = [];
    function add(lugar, pais) {
        const nombre = String(lugar || "").trim();
        if (!nombre) return;
        out.push({ lugar: nombre, pais: String(pais || "").trim() });
    }
    (t.aereo || []).forEach(function (f) { add(f && f.ciudad, f && f.pais); });
    (t.destino || []).forEach(function (f) { add(f && f.ciudad, f && f.pais); });
    (t.fcl || []).forEach(function (f) { add(f && f.puerto, f && f.pais); });
    (t.lcl || []).forEach(function (f) { add(f && f.puerto, f && f.pais); });
    (logCiudadesOdoo_ || []).forEach(function (c) { add(c && c.nombre, c && c.pais); });
    (logCiudadesApp_ || []).forEach(function (c) {
        if (!c || c.uso === "puerto") return;
        add(c.nombre, c.pais);
    });
    logLugaresManuales_().forEach(function (x) {
        if (!x || x.uso === "puerto") return;
        add(x.nombre, x.pais);
    });
    const body = document.getElementById("logTarBody");
    const tab = window.logTarTab;
    if (body && (tab === "aereo" || tab === "destino" || tab === "fcl" || tab === "lcl")) {
        const kLugar = (tab === "fcl" || tab === "lcl") ? "puerto" : "ciudad";
        body.querySelectorAll("tr[data-id]").forEach(function (tr) {
            const lugar = (tr.querySelector("[data-k='" + kLugar + "']") || {}).value;
            const pais = (tr.querySelector("[data-k='pais']") || {}).value;
            add(lugar, pais);
        });
    }
    return out;
}

function logNombresLugar_(pais, soloPuerto) {
    logTarAsegurar_();
    let todos = logLugaresDestino_();
    if (soloPuerto) {
        const t = logTarAsegurar_();
        todos = [];
        (t.fcl || []).forEach(function (f) { if (f && String(f.puerto || "").trim()) todos.push({ lugar: String(f.puerto).trim(), pais: String(f.pais || "").trim() }); });
        (t.lcl || []).forEach(function (f) { if (f && String(f.puerto || "").trim()) todos.push({ lugar: String(f.puerto).trim(), pais: String(f.pais || "").trim() }); });
        logLugaresManuales_().forEach(function (x) {
            if (x && (x.uso === "puerto" || x.uso === "ambas") && String(x.nombre || "").trim()) {
                todos.push({ lugar: String(x.nombre).trim(), pais: String(x.pais || "").trim() });
            }
        });
        (logCiudadesApp_ || []).forEach(function (x) {
            if (x && (x.uso === "puerto" || x.uso === "ambas") && String(x.nombre || "").trim()) {
                todos.push({ lugar: String(x.nombre).trim(), pais: String(x.pais || "").trim() });
            }
        });
    }
    const p = String(pais || "").trim();
    const fuente = p ? todos.filter(function (x) { return x.pais && logTarMismoPais_(p, x.pais); }) : todos;
    const vistos = {};
    const out = [];
    fuente.forEach(function (x) {
        const k = logTarNorm_(x.lugar);
        if (!k || vistos[k]) return;
        vistos[k] = 1;
        out.push(x.lugar);
    });
    out.sort(function (a, b) { return a.localeCompare(b, "es"); });
    return out;
}

function logTarCodigoPais_(s) {
    const t = String(s || "").trim();
    if (!t) return "";
    const porNombre = typeof logEnvCodigoDePais_ === "function" ? logEnvCodigoDePais_(t) : "";
    if (porNombre) return porNombre;
    if (/^[a-z]{2}$/i.test(t)) return t.toUpperCase();
    return "";
}

function logTarMismoPais_(a, b) {
    const ca = logTarCodigoPais_(a);
    const cb = logTarCodigoPais_(b);
    if (ca && cb) return ca === cb;
    const na = (ca && typeof logPaisDeCodigo_ === "function" && logPaisDeCodigo_(ca)) || a;
    const nb = (cb && typeof logPaisDeCodigo_ === "function" && logPaisDeCodigo_(cb)) || b;
    return logTarSi_(na, nb);
}

function logCiudadesDePais_(pais) {
    const deCat = logCiudadesParaPais_(pais);
    const out = deCat.length ? deCat.slice() : logCiudadesTarifa_(pais);
    /* En marítimo el destino suele nombrarse por su puerto (Everglades = Port
       Everglades): si ese puerto está registrado para el país, también es una
       ciudad de destino válida. Sin esto, una cotización guardada con esa
       ciudad se veía en el select pero el Análisis la rechazaba. */
    let mod = "";
    try { mod = String((logEnv_() || {}).modalidad || ""); } catch (e) { mod = ""; }
    if (mod === "fcl" || mod === "lcl") {
        const vistos = {};
        out.forEach(function (c) { vistos[logTarNorm_(c)] = 1; });
        logPuertosTarifa_(pais).forEach(function (p) {
            const k = logTarNorm_(p);
            if (!k || vistos[k]) return;
            vistos[k] = 1;
            out.push(p);
        });
        out.sort(function (a, b) { return a.localeCompare(b, "es"); });
    }
    return out;
}

function logPintarSelectPuerto_(actual, pais) {
    const el = document.getElementById("logDestPuerto");
    if (!el || el.tagName !== "SELECT") {
        logPintarPuertosLista_(pais);
        return String(actual || "").trim();
    }
    const lista = typeof logPuertosTarifa_ === "function" ? logPuertosTarifa_(pais) : [];
    const ahora = String(actual || "").trim();
    const norm = logTarNorm_(ahora);
    let html = "<option value=\"\">Puerto</option>";
    let visto = !ahora;
    lista.forEach(function (c) {
        const sel = logTarNorm_(c) === norm;
        if (sel) visto = true;
        html += "<option value=\"" + logEsc_(c) + "\"" + (sel ? " selected" : "") + ">" + logEsc_(c) + "</option>";
    });
    if (ahora && !visto) html += "<option value=\"" + logEsc_(ahora) + "\" selected>" + logEsc_(ahora) + "</option>";
    if (el.getAttribute("data-opts") !== html) {
        el.innerHTML = html;
        el.setAttribute("data-opts", html);
    }
    if (el.value !== ahora) el.value = ahora;
    return ahora;
}
function logCiudadesTarifa_(pais) { return logNombresLugar_(pais, false); }
function logPuertosTarifa_(pais) { return logNombresLugar_(pais, true); }

/** Una sola ciudad que sí corresponde al país. No elige Miami si el cliente es otro. */
function logCiudadPorDefecto_(pais) {
    const lista = logCiudadesDePais_(pais);
    return lista.length === 1 ? lista[0] : "";
}

function logPaisUnicoDeLugar_(lugar) {
    const n = logTarNorm_(lugar);
    if (!n) return "";
    const vistos = {};
    logLugaresDestino_().forEach(function (x) {
        if (logTarNorm_(x.lugar) !== n || !x.pais) return;
        vistos[x.pais] = 1;
    });
    const keys = Object.keys(vistos);
    return keys.length === 1 ? keys[0] : "";
}

function logRefrescarCiudadesEnv_(leerPantalla) {
    if (leerPantalla && typeof logTarFlush_ === "function") logTarFlush_();
    const e = typeof logEnv_ === "function" ? logEnv_() : {};
    const pais = ((document.getElementById("logDestPais") || {}).value || e.destinoPais || "").trim();
    const sel = document.getElementById("logDestCiudad");
    const ciudad = ((sel || {}).value || e.destinoCiudad || "").trim();
    const puerto = ((document.getElementById("logDestPuerto") || {}).value || e.destinoPuerto || "").trim();
    logPintarSelectCiudad_(ciudad, pais);
    logPintarSelectPuerto_(puerto, pais);
    if (typeof logAplicarFaltasAnalisis_ === "function") logAplicarFaltasAnalisis_();
}

function logPintarSelectCiudad_(actual, pais) {
    const el = document.getElementById("logDestCiudad");
    if (!el || el.tagName !== "SELECT") return;
    const lista = logCiudadesDePais_(pais);
    let ahora = String(actual || "").trim();
    if (ahora && typeof logCiudadAliasCanon_ === "function") {
        const canon = logCiudadAliasCanon_(pais, ahora);
        if (canon && logTarNorm_(canon) !== logTarNorm_(ahora)) {
            const enLista = lista.some(function (c) { return logTarNorm_(c) === logTarNorm_(canon); });
            if (enLista) {
                ahora = canon;
                if (logQuote && logQuote.env) logQuote.env.destinoCiudad = canon;
            }
        }
    }
    if (!ahora && !logDestinoCiudadTocado_) {
        const def = logCiudadPorDefecto_(pais);
        if (def) {
            ahora = def;
            if (logQuote && logQuote.env) logQuote.env.destinoCiudad = def;
        }
    }
    const norm = logTarNorm_(ahora);
    const normCanon = typeof logCiudadAliasCanon_ === "function" ? logTarNorm_(logCiudadAliasCanon_(pais, ahora)) : norm;
    let html = "<option value=\"\">Elige</option>";
    let visto = !ahora;
    lista.forEach(function (c) {
        const sel = logTarNorm_(c) === norm || logTarNorm_(c) === normCanon;
        if (sel) visto = true;
        html += "<option value=\"" + logEsc_(c) + "\"" + (sel ? " selected" : "") + ">" + logEsc_(c) + "</option>";
    });
    if (ahora && !visto) html += "<option value=\"" + logEsc_(ahora) + "\" selected>" + logEsc_(ahora) + "</option>";
    if (el.getAttribute("data-opts") !== html) {
        el.innerHTML = html;
        el.setAttribute("data-opts", html);
    }
    if (el.value !== ahora) el.value = ahora;
    return ahora;
}

function logPintarPuertosLista_(pais) {
    const dl = document.getElementById("logPuertosLista");
    if (!dl) return;
    const html = logPuertosTarifa_(pais).map(function (p) { return "<option value=\"" + logEsc_(p) + "\"></option>"; }).join("");
    if (dl.getAttribute("data-opts") !== html) {
        dl.innerHTML = html;
        dl.setAttribute("data-opts", html);
    }
}

function logEnListaTarifa_(nombre, lista, pais) {
    const n = logTarNorm_(nombre);
    if (!n) return false;
    const canon = (pais && typeof logCiudadAliasCanon_ === "function")
        ? logTarNorm_(logCiudadAliasCanon_(pais, nombre))
        : n;
    return (lista || []).some(function (x) {
        const xn = logTarNorm_(x);
        if (xn === n || xn === canon) return true;
        if (pais && typeof logCiudadAliasCanon_ === "function") {
            const xc = logTarNorm_(logCiudadAliasCanon_(pais, x));
            if (xc === n || xc === canon) return true;
        }
        return false;
    });
}

function logFaltasAnalisis_() {
    const faltas = [];
    const e = typeof logEnv_ === "function" ? logEnv_() : {};
    const exterior = typeof logEsCotizacionExterior_ === "function" && logEsCotizacionExterior_();
    const inc = String(e.incoterm || "EXW").toUpperCase();
    const tipos = typeof logEnvTiposActivos_ === "function" ? logEnvTiposActivos_(e.modalidad, inc, exterior) : [];
    if (exterior && inc !== "EXW") {
        const ciudad = String(e.destinoCiudad || "").trim();
        const ciudades = logCiudadesDePais_(e.destinoPais);
        const esMarF = e.modalidad === "fcl" || e.modalidad === "lcl";
        if (!ciudades.length) faltas.push({ id: "logDestCiudad", msg: esMarF ? "No hay ciudades ni puertos en Ajustes → Logística para este país. Agrega la tarifa y elige la ciudad." : "No hay ciudades en Ajustes → Logística para este país. Agrega la tarifa y elige la ciudad." });
        else if (!ciudad) faltas.push({ id: "logDestCiudad", msg: "Elige la ciudad de destino. La lista sale de Ajustes → Logística." });
        else if (!logEnListaTarifa_(ciudad, ciudades, e.destinoPais)) faltas.push({ id: "logDestCiudad", msg: esMarF ? "Esa ciudad no está en las ciudades ni en los puertos de este país. Elige una de la lista o regístrala en Ajustes → Logística → Ciudades." : "Esa ciudad no está en las tarifas de este país. Elige una de la lista." });
        if (!String(e.destinoPais || "").trim()) faltas.push({ id: "logDestPais", msg: "Falta el país de destino." });
    }
    const mar = e.modalidad === "fcl" || e.modalidad === "lcl";
    if (mar && exterior && inc !== "EXW" && (tipos.indexOf("flete_principal") >= 0 || tipos.indexOf("flete_interno") >= 0)) {
        const puertos = logPuertosTarifa_(e.destinoPais);
        if (puertos.length) {
            const puerto = String(e.destinoPuerto || "").trim();
            const okPuerto = logEnListaTarifa_(puerto, puertos);
            const okCiudad = !puerto && puertos.some(function (p) { return logTarSi_(e.destinoCiudad, p); });
            if (!okPuerto && !okCiudad) faltas.push({ id: "logDestPuerto", msg: "El puerto tiene que coincidir con una tarifa marítima. Si lo dejas vacío, la ciudad debe ser ese puerto." });
        }
    }
    const clavesF = logEscList_().length ? logEscList_().map(function (x) { return x.id; }) : [""];
    clavesF.forEach(function (k, idx) {
        const vista = typeof logEnvVistaEsc_ === "function" ? logEnvVistaEsc_(k) : { modalidad: e.modalidad, incoterm: inc };
        const tiposK = typeof logEnvTiposActivos_ === "function"
            ? logEnvTiposActivos_(vista.modalidad, vista.incoterm, exterior)
            : tipos;
        const cub = typeof logCubicajeTotal_ === "function" ? logCubicajeTotal_("es", k) : { m3: 0, pesoKg: 0, kgVol: 0 };
        const kg = Math.max(Number(cub.pesoKg) || 0, Number(cub.kgVol) || 0);
        const m3 = Number(cub.m3) || 0;
        const stF = k ? logEnvEscDe_(e, k) : null;
        const cont = stF ? stF.contenedores : (e.contenedores || {});
        const nCont = (Number(cont.c20) || 0) + (Number(cont.c40) || 0) + (Number(cont.c40hc) || 0);
        const op = k ? (logEscNombre_(logEscList_()[idx] || {}, idx, "es") + ": ") : "";
        if (tiposK.indexOf("flete_principal") >= 0 && vista.modalidad === "aerea" && !(kg > 0)) {
            faltas.push({ id: "logCubPeso", msg: op + "Falta el peso real o el volumétrico. Complétalo en el cubicaje o en el empaque de la ficha." });
            faltas.push({ id: "logCubKgVol" });
        }
        if (tiposK.indexOf("flete_principal") >= 0 && vista.modalidad === "lcl" && !(m3 > 0) && !(Number(cub.pesoKg) > 0)) {
            faltas.push({ id: "logCubM3", msg: op + "Falta el volumen o el peso para el flete LCL." });
            faltas.push({ id: "logCubPeso" });
        }
        if (vista.modalidad === "fcl" && (tiposK.indexOf("flete_principal") >= 0 || tiposK.indexOf("flete_interno") >= 0) && !(nCont > 0) && !(m3 > 0) && !(kg > 0)) {
            faltas.push({ id: "logCubM3", msg: op + "Falta el volumen, el peso o la cantidad de contenedores." });
            faltas.push({ id: "logCubPeso" });
            faltas.push({ id: "logC20" });
            faltas.push({ id: "logC40" });
            faltas.push({ id: "logC40hc" });
        }
        if (tiposK.indexOf("seguro") >= 0) {
            const exw = typeof logTarExwCotizacion_ === "function" ? logTarExwCotizacion_(k) : { monto: 0, moneda: "USD" };
            if (!(exw.monto > 0)) {
                faltas.push({ id: "", msg: op + "Falta el precio de los proyectos para calcular el seguro." });
            } else if (exw.moneda !== "USD" && !(typeof logTarTrm_ === "function" && logTarTrm_() > 0)) {
                faltas.push({ id: "logTRM", msg: op + "Falta la TRM (en Documento o en Ajustes → Logística) para pasar el valor a USD y calcular el seguro." });
            }
        }
    });
    return faltas;
}

function logMsgsFaltas_(faltas) {
    const out = [];
    (faltas || []).forEach(function (f) {
        if (f && f.msg && out.indexOf(f.msg) < 0) out.push(f.msg);
    });
    return out;
}

function logAplicarFaltasAnalisis_() {
    let faltas = [];
    try { faltas = logFaltasAnalisis_(); } catch (e) { faltas = []; }
    const ids = {};
    faltas.forEach(function (f) { if (f && f.id) ids[f.id] = 1; });
    ["logDestCiudad", "logDestPais", "logDestPuerto", "logCubM3", "logCubPeso", "logCubKgVol", "logC20", "logC40", "logC40hc", "logTRM"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("log-req", !!ids[id]);
    });
    const box = document.getElementById("logIaFaltan");
    const msgs = logMsgsFaltas_(faltas);
    if (box) {
        box.textContent = msgs.join(" ");
        box.classList.toggle("d-none", !msgs.length);
    }
    const btnA = document.getElementById("btnLogIaAnalisis");
    if (btnA) {
        const ocupado = !!(logIa && logIa.ocupado);
        btnA.disabled = ocupado || msgs.length > 0;
        btnA.title = msgs.join(" ");
    }
    return faltas;
}

function logPintarRecalcAviso_() {
    const el = document.getElementById("logRecalcAviso");
    if (!el) return;
    if (!logRecalcPendiente_) {
        el.textContent = "";
        el.classList.add("d-none");
        return;
    }
    el.textContent = "Cambió un dato de Costos que mueve esta logística (medidas, empaque, cantidad o precio). Borré el cálculo de este borrador. Pulsa Análisis costos logísticos para calcularlo de nuevo.";
    el.classList.remove("d-none");
}

/** Peso facturable (kg): mayor entre real y volumétrico. */
function logPesoFacturableKg_(cub) {
    return Math.max(Number(cub && cub.pesoKg) || 0, Number(cub && cub.kgVol) || 0);
}

function logisticaPintarPesoFacturable_(cub, idioma, mod) {
    const wrap = document.getElementById("logCubPesoFactWrap");
    const valEl = document.getElementById("logCubPesoFact");
    const notaEl = document.getElementById("logCubPesoFactNota");
    const volLab = document.getElementById("logCubKgVolLab");
    const esEn = idioma === "en";
    const air = mod === "aerea" || mod === "courier";
    if (volLab) volLab.classList.toggle("d-none", !air);
    if (wrap) wrap.classList.toggle("d-none", !air);
    if (!air || !valEl) return;
    const real = Number(cub && cub.pesoKg) || 0;
    const vol = Number(cub && cub.kgVol) || 0;
    const fact = Math.max(real, vol);
    const um = typeof logPesoUmDoc_ === "function" ? logPesoUmDoc_() : "kg";
    const shown = typeof logKgADoc_ === "function" ? logKgADoc_(fact) : fact;
    if (!(fact > 0)) {
        valEl.textContent = "—";
        if (notaEl) notaEl.textContent = "";
        return;
    }
    valEl.textContent = logFmtNum_(Math.round(Number(shown) * 100) / 100, idioma, shown % 1 ? 2 : 0) + " " + um;
    if (!notaEl) return;
    if (vol > real + 0.0001) notaEl.textContent = esEn ? "(volumetric)" : "(volumétrico)";
    else if (real > vol + 0.0001) notaEl.textContent = esEn ? "(actual)" : "(real)";
    else notaEl.textContent = esEn ? "(same)" : "(iguales)";
}

function logisticaPintarCubicaje_() {
    const nota = document.getElementById("logCubNota");
    const idioma = logisticaLeerOpciones_().idioma;
    const esEn = idioma === "en";
    const escUi = logEscList_().length ? (logEnvEscSel_ || logOpcionUiAsegurar_()) : "";
    const c = logCubicajeTotal_(idioma, escUi || undefined);
    const auto = c.auto || c;
    const e = logEnv_();
    const vista = logEnvVistaEsc_(escUi);
    const ph = function (n) {
        if (!(Number(n) > 0)) return "0";
        return String(Math.round(Number(n) * 1000) / 1000);
    };
    const m3 = document.getElementById("logCubM3");
    const peso = document.getElementById("logCubPeso");
    const vol = document.getElementById("logCubKgVol");
    if (m3) m3.placeholder = ph(auto.m3);
    if (peso) peso.placeholder = ph(auto.pesoKg);
    if (vol) vol.placeholder = ph(auto.kgVol);
    logSetSiNoFoco_("logCubM3", e.cubM3);
    logSetSiNoFoco_("logCubPeso", e.cubPeso);
    logSetSiNoFoco_("logCubKgVol", e.cubKgVol);
    const volLab = document.getElementById("logCubKgVolLab");
    const divVol = logKgVolDivisor_(escUi || undefined);
    if (volLab) {
        const txtLab = volLab.childNodes[0];
        if (txtLab && txtLab.nodeType === 3) {
            txtLab.textContent = divVol
                ? (esEn ? ("Vol. kg ÷" + divVol.toLocaleString("en-US") + " ") : ("Kg vol ÷" + divVol.toLocaleString("es-CO") + " "))
                : (esEn ? "Vol. kg " : "Kg vol ");
        }
        volLab.title = divVol
            ? (esEn
                ? ("Volumetric weight = cm³ ÷ " + divVol + (vista.modalidad === "courier" ? " (courier)" : " (air)") + ". Empty uses packaging.")
                : ("Peso volumétrico = cm³ ÷ " + divVol + (vista.modalidad === "courier" ? " (courier)" : " (aéreo)") + ". Vacío usa el empaque."))
            : (esEn ? "Only for air/courier." : "Solo aplica en aéreo/courier.");
    }
    logisticaPintarPesoFacturable_(c, idioma, vista.modalidad);
    if (!nota) return;
    const bits = [];
    if (c.filas) bits.push(logFmtNum_(c.cajas, idioma, 0) + (esEn ? " boxes from packaging" : " cajas del empaque"));
    if (divVol && (vista.modalidad === "aerea" || vista.modalidad === "courier")) {
        bits.push(esEn
            ? ("Vol. factor ÷" + divVol + (vista.modalidad === "courier" ? " courier" : " air"))
            : ("Factor vol. ÷" + divVol.toLocaleString("es-CO") + (vista.modalidad === "courier" ? " courier" : " aéreo")));
    }
    if (e.cubM3 != null || e.cubPeso != null || e.cubKgVol != null) bits.push(esEn ? "A typed value replaces the calculation. Clear it to use packaging again." : "Lo escrito reemplaza el cálculo. Bórralo para volver al empaque.");
    else if (!c.filas) bits.push(esEn ? "Type the figures, or complete packaging on the commercial sheet." : "Escribe las cifras, o completa el empaque en la ficha.");
    nota.textContent = bits.join(" · ");
}

let logEnvPintando_ = 0;
let logEnvEscSel_ = "";

function logisticaPintarEscEnv_() {
    const box = document.getElementById("logEscEnvBox");
    const escs = logEscList_();
    const e = logEnv_();
    const idioma = logisticaLeerOpciones_().idioma;
    const contWrap = document.getElementById("logContenedores");
    const embWrap = document.getElementById("logEmbarquesWrap");
    const cubWrap = document.getElementById("logCubica");
    if (!escs.length) {
        if (box) { box.classList.add("d-none"); box.innerHTML = ""; }
        if (cubWrap) cubWrap.classList.remove("d-none");
        logEnvEscSel_ = "";
        return;
    }
    const sel = logOpcionUiAsegurar_();
    logEnvEscSel_ = sel;
    if (contWrap) contWrap.classList.add("d-none");
    if (embWrap) embWrap.classList.add("d-none");
    if (cubWrap) cubWrap.classList.add("d-none");
    if (!box) return;
    if (document.activeElement && box.contains(document.activeElement)) return;
    box.classList.remove("d-none");
    /* Solo la opción activa (las pestañas ya eligen cuál). Evita duplicar Opción 1 + Opción 2. */
    const x = escs.find(function (o) { return o.id === sel; }) || escs[0];
    const i = escs.indexOf(x);
    const st = logEnvEsc_(x.id);
    const vista = logEnvVistaEsc_(x.id);
    const esFcl = vista.modalidad === "fcl";
    const esAir = vista.modalidad === "aerea" || vista.modalidad === "courier";
    const esEn = idioma === "en";
    const cub = logCubicajeTotal_(idioma, x.id);
    const auto = cub.auto || cub;
    const sug = esFcl ? logSugerirContenedores_(cub.m3, Math.max(Number(cub.pesoKg) || 0, Number(cub.kgVol) || 0)) : null;
    const ph = function (n) { return Number(n) > 0 ? String(Math.round(Number(n) * 1000) / 1000) : "0"; };
    const op = logEsc_(x.id);
    const factKg = logPesoFacturableKg_(cub);
    const umP = typeof logPesoUmDoc_ === "function" ? logPesoUmDoc_() : "kg";
    const factShown = typeof logKgADoc_ === "function" ? logKgADoc_(factKg) : factKg;
    let factTxt = "—";
    let factNota = "";
    if (factKg > 0) {
        factTxt = logFmtNum_(Math.round(Number(factShown) * 100) / 100, idioma, factShown % 1 ? 2 : 0) + " " + umP;
        const real = Number(cub.pesoKg) || 0;
        const volN = Number(cub.kgVol) || 0;
        if (volN > real + 0.0001) factNota = esEn ? "(volumetric)" : "(volumétrico)";
        else if (real > volN + 0.0001) factNota = esEn ? "(actual)" : "(real)";
        else factNota = esEn ? "(same)" : "(iguales)";
    }
    let h = esFcl ? "<div class=\"log-esc-calc-title\">" + (esEn ? "Container calculation" : "Cálculo de contenedores") + "</div>" : "";
    h += "<div class=\"log-esc-card\">" +
        "<div class=\"log-esc-card-h\">" +
        "<b>" + logEsc_(logEscNombre_(x, i, idioma)) + "</b>" +
        "<span>" + (auto.cajas || 0) + (esEn ? " boxes" : " cajas") + "</span>";
    if (esFcl) {
        h += "<button type=\"button\" class=\"btn btn-sm btn-outline-primary log-esc-cont-calc\" data-esc-calc=\"" + op + "\" title=\"" + (esEn ? "Recalculate containers for this option" : "Recalcular contenedores de esta opción") + "\">" + (esEn ? "Calculate" : "Calcular") + "</button>";
    }
    h += "</div>";
    if (esFcl && sug) {
        h += "<div class=\"log-esc-sug text-muted\">" + (esEn ? "Suggested: " : "Sugerido: ") + logEsc_(logContenedoresTexto_(sug)) + "</div>";
    }
    h += "<div class=\"log-esc-fields" + (esFcl ? " log-esc-fields-fcl" : "") + "\">" +
        "<label>m³<input class=\"form-control form-control-sm text-end\" type=\"number\" min=\"0\" step=\"0.001\" data-op=\"" + op + "\" data-campo=\"cubM3\" placeholder=\"" + ph(auto.m3) + "\" value=\"" + (st.cubM3 == null ? "" : st.cubM3) + "\"></label>" +
        "<label>" + (esEn ? "Actual wt kg" : "Peso real kg") + "<input class=\"form-control form-control-sm text-end\" type=\"number\" min=\"0\" step=\"0.01\" data-op=\"" + op + "\" data-campo=\"cubPeso\" placeholder=\"" + ph(auto.pesoKg) + "\" value=\"" + (st.cubPeso == null ? "" : st.cubPeso) + "\"></label>";
    if (esAir) {
        const divAir = logKgVolDivisor_(x.id) || (vista.modalidad === "courier" ? 5000 : 6000);
        const labVol = esEn
            ? ("Vol. kg ÷" + divAir.toLocaleString("en-US"))
            : ("Kg vol ÷" + divAir.toLocaleString("es-CO"));
        h += "<label title=\"" + logEsc_(esEn
            ? ("cm³ ÷ " + divAir + (vista.modalidad === "courier" ? " for courier" : " for air"))
            : ("cm³ ÷ " + divAir + (vista.modalidad === "courier" ? " en courier" : " en aéreo"))) + "\">" +
            logEsc_(labVol) + "<input class=\"form-control form-control-sm text-end\" type=\"number\" min=\"0\" step=\"0.01\" data-op=\"" + op + "\" data-campo=\"cubKgVol\" placeholder=\"" + ph(auto.kgVol) + "\" value=\"" + (st.cubKgVol == null ? "" : st.cubKgVol) + "\"></label>";
        h += "<div class=\"log-cub-fact\" title=\"" + (esEn ? "Greater of actual and volumetric weight" : "Mayor entre peso real y volumétrico") + "\">" +
            "<span class=\"log-cub-fact-lab\">" + (esEn ? "Chargeable wt" : "Peso facturable") + "</span>" +
            "<span class=\"log-cubica-num\">" + logEsc_(factTxt) + "</span>" +
            "<span class=\"log-cub-fact-nota\">" + logEsc_(factNota) + "</span></div>";
    }
    if (esFcl) {
        h += "<label>20'<input class=\"form-control form-control-sm text-end\" type=\"number\" min=\"0\" step=\"1\" data-op=\"" + op + "\" data-campo=\"c20\" data-cont=\"1\" value=\"" + (st.contenedores.c20 || "") + "\"></label>" +
            "<label>40'<input class=\"form-control form-control-sm text-end\" type=\"number\" min=\"0\" step=\"1\" data-op=\"" + op + "\" data-campo=\"c40\" data-cont=\"1\" value=\"" + (st.contenedores.c40 || "") + "\"></label>" +
            "<label>40HC<input class=\"form-control form-control-sm text-end\" type=\"number\" min=\"0\" step=\"1\" data-op=\"" + op + "\" data-campo=\"c40hc\" data-cont=\"1\" value=\"" + (st.contenedores.c40hc || "") + "\"></label>";
    }
    h += "<label>" + (esEn ? "Shipments" : "Embarques") + "<input class=\"form-control form-control-sm text-end\" type=\"number\" min=\"1\" step=\"1\" data-op=\"" + op + "\" data-campo=\"embarques\" value=\"" + (st.embarques || 1) + "\"></label>";
    h += "</div></div>";
    box.innerHTML = h + "<div class=\"text-muted log-esc-nota\">" + (esEn
        ? "This card is for the selected option only. Switch tabs to edit another option’s modality, Incoterm and cubicage."
        : "Esta ficha es solo de la opción seleccionada. Cambia de pestaña para editar modalidad, Incoterm y cubicaje de otra.") + "</div>";
    void e;
}
let logDestinoPaisTocado_ = false;
let logDestinoCiudadTocado_ = false;
let logPaisClientePedido_ = "";

/** Si el proyecto abierto no trae país, lo pide a Odoo una vez (country_id del lead). */
function logPedirPaisCliente_() {
    if (logDestinoPaisTocado_) return;
    if (logQuote && logQuote.abierta && String((logQuote.env || {}).destinoPais || "").trim()) return;
    let ya = "";
    try { ya = String((typeof localeProyectoActual === "function" ? localeProyectoActual() : {}).pais || "").trim(); } catch (err) { ya = ""; }
    if (ya) return;
    const cod = typeof logisticaLeerProyecto_ === "function" ? String((logisticaLeerProyecto_().codigo || "")).trim() : "";
    if (!cod || logPaisClientePedido_ === cod || typeof realizarPeticionBD !== "function") return;
    logPaisClientePedido_ = cod;
    realizarPeticionBD({ action: "odoo_buscar", codigo: cod }, { timeoutMs: 75000 }).then(function (data) {
        if (logPaisClientePedido_ !== cod) return;
        if (!data || !data.exito || !data.data || typeof mapearLocaleOdoo !== "function") return;
        const pais = String((mapearLocaleOdoo(data.data) || {}).pais || "").trim();
        if (!pais || typeof aplicarLocaleProyecto !== "function") return;
        if (typeof localeProyectoActual === "function" && localeProyectoActual().pais) return;
        aplicarLocaleProyecto({ pais: pais }, { silencio: true });
        if (!logEnvPintando_ && typeof logisticaPintarEnv_ === "function") logisticaPintarEnv_();
    }).catch(function () { /* sin país de Odoo: el campo sigue vacío */ });
}

/** País y código del envío: el del cliente, mientras el usuario no lo cambie y la cotización no traiga otro. */
function logAplicarPaisCliente_() {
    if (logDestinoPaisTocado_) return;
    if (!logQuote || !logQuote.env) return;
    if (logQuote.abierta && String(logQuote.env.destinoPais || "").trim()) return;
    if (String(logQuote.env.destinoPais || "").trim()) return;
    let pais = "";
    try {
        pais = String((typeof localeProyectoActual === "function" ? localeProyectoActual() : {}).pais || "").trim();
    } catch (err) { pais = ""; }
    if (!pais) { logPedirPaisCliente_(); return; }
    pais = logPaisEnEspanol_(pais);
    logQuote.env.destinoPais = pais;
    const cod = typeof logEnvCodigoDePais_ === "function" ? logEnvCodigoDePais_(pais) : "";
    if (cod && !String(logQuote.env.destinoCodigo || "").trim()) logQuote.env.destinoCodigo = cod;
    if (!logDestinoCiudadTocado_ && !String(logQuote.env.destinoCiudad || "").trim()) {
        const unica = logCiudadPorDefecto_(pais);
        if (unica) logQuote.env.destinoCiudad = unica;
    }
    if (logEnvPintando_) return;
    if (typeof logPintarSelectPais_ === "function") logPintarSelectPais_(pais);
    const codEl = document.getElementById("logDestCodigo");
    const ciuEl = document.getElementById("logDestCiudad");
    if (codEl && cod && document.activeElement !== codEl && !String(codEl.value || "").trim()) codEl.value = cod;
    if (ciuEl && logQuote.env.destinoCiudad && document.activeElement !== ciuEl && !ciuEl.value) ciuEl.value = logQuote.env.destinoCiudad;
    if (typeof logRefrescarCiudadesEnv_ === "function") logRefrescarCiudadesEnv_(true);
}

function logEnvSumaValor_() {
    const e = logEnv_();
    if (!e || e.activo === false) return null;
    const idioma = (typeof logisticaLeerOpciones_ === "function" ? logisticaLeerOpciones_().idioma : "es");
    const escs = logEscList_();
    const escId = escs.length
        ? (escs.some(function (x) { return x.id === logEnvEscSel_; }) ? logEnvEscSel_ : escs[0].id)
        : "";
    /* Total con margen incluido: logEnvSuma_ aplica el margen de cada línea
       (Duties y Taxes no llevan) y, con escenarios, usa los valores de la
       opción que se está editando. Es el total que sale en la hoja. */
    const total = logEnvSuma_(logBaseLogistica_(idioma, escId), escId);
    return total > 0 ? total : null;
}

function logPintarEnvSuma_() {
    const el = document.getElementById("logEnvSuma");
    if (!el) return;
    const suma = logEnvSumaValor_();
    if (suma == null) {
        el.hidden = true;
        el.textContent = "";
        return;
    }
    const idioma = logisticaLeerOpciones_().idioma;
    const esEn = idioma === "en";
    const mon = (logQuote && logQuote.moneda) || "USD";
    const nd = mon === "COP" ? 0 : 2;
    const escs = logEscList_();
    const escId = escs.length
        ? (escs.some(function (x) { return x.id === logEnvEscSel_; }) ? logEnvEscSel_ : escs[0].id)
        : "";
    const partes = logTotalesPartes_(idioma);
    const gran = Number((partes.gran || {})[escId]) || 0;
    const fmtPct = function (n) {
        const s = n.toFixed(1);
        return esEn ? s : s.replace(".", ",");
    };
    let lab = esEn ? "Logistics total" : "Total logística";
    if (escs.length) {
        const i = escs.findIndex(function (x) { return x.id === escId; });
        lab += " · " + logEscNombre_(escs[i], i, idioma);
    }
    const e = logEnv_();
    const margenTxt = logEsCotizacionExterior_()
        ? (esEn ? "margin " : "margen ") + fmtPct(Number(e.margenPct) || 0) + "% " + (esEn ? "incl." : "incl.")
        : (esEn ? "margin incl." : "margen incl.");
    let pctTxt = margenTxt;
    if (gran > 0) {
        pctTxt += " · " + fmtPct(suma / gran * 100) + (esEn ? "% of grand total" : "% del gran total");
    }
    el.hidden = false;
    el.innerHTML = "<span class=\"log-env-suma-lab\">" + logEsc_(lab) + "</span>" +
        "<span class=\"log-env-suma-val\">" + logFmtMoneda_(suma, idioma, nd) + " " + logEsc_(mon) + "</span>" +
        "<span class=\"log-env-suma-pct\">" + logEsc_(pctTxt) + "</span>";
}

function logisticaPintarEnv_(forzar) {
    logEnvPintando_++;
    try {
    const idioma = logisticaLeerOpciones_().idioma;
    const esEn = idioma === "en";
    const exterior = logEsCotizacionExterior_();
    logAplicarPaisCliente_();
    const escUi = logEscList_().length ? logOpcionUiAsegurar_() : "";
    logEnvEscSel_ = escUi;
    /* Refleja la opción activa en el global (para código que aún lee env.modalidad) y asegura sus líneas. */
    if (escUi) {
        const st = logEnvEsc_(escUi);
        const e0 = logEnv_();
        e0.modalidad = st.modalidad || e0.modalidad;
        e0.incoterm = st.incoterm || e0.incoterm;
        e0.destinoCiudad = st.destinoCiudad != null ? st.destinoCiudad : e0.destinoCiudad;
        e0.destinoPais = st.destinoPais != null ? st.destinoPais : e0.destinoPais;
        e0.destinoCodigo = st.destinoCodigo != null ? st.destinoCodigo : e0.destinoCodigo;
        e0.destinoPuerto = st.destinoPuerto != null ? st.destinoPuerto : e0.destinoPuerto;
        if (st.destinoTitulo != null) e0.destinoTitulo = st.destinoTitulo;
    }
    logEnvAsegurarLineas_(esEn, false, escUi);
    logAplicarAranceles_();
    const e = logEnv_();
    const vista = logEnvVistaEsc_(escUi);
    const modSel = document.getElementById("logModalidad");
    if (modSel) {
        const opts = [
            ["courier", esEn ? "Courier" : "Courier"],
            ["aerea", esEn ? "Air" : "Aérea"],
            ["fcl", esEn ? "Sea FCL" : "Marítimo FCL"],
            ["lcl", esEn ? "Sea LCL" : "Marítimo LCL"],
            ["terrestre", esEn ? "Land" : "Terrestre"]
        ];
        const html = opts.map(function (o) {
            return "<option value=\"" + o[0] + "\"" + (o[0] === vista.modalidad ? " selected" : "") + ">" + o[1] + "</option>";
        }).join("");
        const tienen = [].map.call(modSel.options, function (o) { return o.value; }).join(",");
        if (tienen !== opts.map(function (o) { return o[0]; }).join(",")) modSel.innerHTML = html;
        logSetSiNoFoco_("logModalidad", vista.modalidad);
    }
    const incSel = document.getElementById("logIncoterm");
    if (incSel) {
        const incs = logEnvIncotermsDe_(vista.modalidad);
        const html = incs.map(function (k) {
            return "<option value=\"" + k + "\"" + (k === vista.incoterm ? " selected" : "") + ">" + k + "</option>";
        }).join("");
        const tienen = [].map.call(incSel.options, function (o) { return o.value; }).join(",");
        if (tienen !== incs.join(",")) incSel.innerHTML = html;
        logSetSiNoFoco_("logIncoterm", vista.incoterm);
    }
    const paisElegido = logPintarSelectPais_(vista.destinoPais);
    const ciudadElegida = logPintarSelectCiudad_(vista.destinoCiudad, paisElegido || vista.destinoPais);
    const puertoElegido = logPintarSelectPuerto_(vista.destinoPuerto, paisElegido || vista.destinoPais);
    logSetSiNoFoco_("logDestCiudad", ciudadElegida || vista.destinoCiudad);
    logSetSiNoFoco_("logDestCodigo", vista.destinoCodigo || logEnvCodigoDePais_(paisElegido || vista.destinoPais));
    logSetSiNoFoco_("logDestPuerto", puertoElegido || vista.destinoPuerto);
    const phTit = (vista.destinoCiudad || "").trim() || (esEn ? "Same as tariff city" : "Igual a ciudad de tarifas");
    const elTit = document.getElementById("logDestTitulo");
    if (elTit) elTit.placeholder = phTit;
    logSetSiNoFoco_("logDestTitulo", vista.destinoTitulo || "");
    const modoUi = escUi ? logEnvModoCosto_(escUi) : (e.modoCosto === "resumen" ? "resumen" : "detalle");
    const pctUi = escUi ? logEnvResumenPct_(escUi) : e.resumenPct;
    e.modoCosto = modoUi;
    e.resumenPct = pctUi;
    logSetSiNoFoco_("logResumenPct", pctUi);
    const costosOn = escUi ? logEnvActivo_(escUi) : (e.activo !== false);
    const swOn = document.getElementById("logCostosOn");
    if (swOn && document.activeElement !== swOn) swOn.checked = costosOn;
    const cuerpo = document.getElementById("logCostosCuerpo");
    const tools = document.getElementById("logCostosTools");
    if (cuerpo) cuerpo.classList.toggle("d-none", !costosOn);
    if (tools) tools.classList.toggle("d-none", !costosOn);
    const esExwUi = exterior && String(vista.incoterm || "").toUpperCase() === "EXW";
    const btnLibre = document.getElementById("btnLogEnvLibre");
    const btnReset = document.getElementById("btnLogEnvReset");
    if (btnLibre) btnLibre.classList.toggle("d-none", esExwUi);
    if (btnReset) btnReset.classList.toggle("d-none", esExwUi);
    /* Con costos apagados se ocultan Detalle/margen/filas; las pestañas de opción siguen visibles arriba. */
    document.querySelectorAll("input[name=\"logModoCosto\"]").forEach(function (r) { r.checked = r.value === modoUi; });
    const selMer = document.getElementById("logMercado");
    if (selMer && document.activeElement !== selMer) selMer.value = exterior ? "EXPORTACION" : "NACIONAL";
    ["logModalidadWrap", "logIncotermWrap", "logDestPaisWrap", "logDestCodigoWrap", "logDestTituloWrap"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("d-none", !exterior);
    });
    const pctWrap = document.getElementById("logResumenPctWrap");
    if (pctWrap) pctWrap.classList.toggle("d-none", modoUi !== "resumen");
    const margenWrap = document.getElementById("logMargenWrap");
    if (margenWrap) margenWrap.classList.toggle("d-none", !exterior);
    logSetSiNoFoco_("logMargenLog", e.margenPct);
    const contEsc = escUi ? (logEnvEscDe_(e, escUi) || {}) : e;
    const cont = (contEsc.contenedores || e.contenedores) || { c20: 0, c40: 0, c40hc: 0 };
    logSetSiNoFoco_("logC20", cont.c20 || "");
    logSetSiNoFoco_("logC40", cont.c40 || "");
    logSetSiNoFoco_("logC40hc", cont.c40hc || "");
    const contWrap = document.getElementById("logContenedores");
    if (contWrap) contWrap.classList.toggle("d-none", vista.modalidad !== "fcl" || !!escUi);
    logSetSiNoFoco_("logEmbarques", (contEsc.embarques != null ? contEsc.embarques : e.embarques) || 1);
    const embWrap = document.getElementById("logEmbarquesWrap");
    if (embWrap) embWrap.classList.toggle("d-none", !exterior || !!escUi);
    const contNota = document.getElementById("logContNota");
    if (contNota) {
        const cubNota = typeof logCubicajeTotal_ === "function" ? logCubicajeTotal_("es", escUi || undefined) : { m3: 0, pesoKg: 0, kgVol: 0 };
        const sugNota = logSugerirContenedores_(cubNota.m3, Math.max(Number(cubNota.pesoKg) || 0, Number(cubNota.kgVol) || 0));
        const escrito = logContenedoresTexto_(cont);
        const calc = logContenedoresTexto_(sugNota);
        const manual = contEsc.contenedoresManual != null ? contEsc.contenedoresManual : e.contenedoresManual;
        if (manual && escrito) contNota.textContent = "Escrito: " + escrito + (calc && calc !== escrito ? ". El cálculo da " + calc + "." : ".");
        else if (escrito) contNota.textContent = "Calculado: " + escrito + ". Útiles: 20' 28 m³, 40' 58 m³, 40HC 68 m³.";
        else if (calc) contNota.textContent = "Sugerido: " + calc + ". El análisis lo escribe aquí.";
        else contNota.textContent = "Falta el volumen o el peso para calcular contenedores.";
    }
    logisticaPintarEscEnv_();
    if (typeof logisticaPintarOpcTabsTodas_ === "function") logisticaPintarOpcTabsTodas_();
    /* Tras pintar pestañas, asegurar otra vez por si cambió la opción activa. */
    if (!(e.lineas || []).length) logEnvAsegurarLineas_(esEn, true, escUi);
    const box = document.getElementById("logEnvLineas");
    if (!forzar && box && document.activeElement && box.contains(document.activeElement)) {
        logisticaPintarCubicaje_();
        logPintarEnvSuma_();
        return;
    }
    if (box) {
        const tiposActivosUi = logEnvTiposActivos_(vista.modalidad, vista.incoterm, exterior);
        let lineasUi = (e.lineas && e.lineas.length) ? e.lineas : logEnvLineasDeEsc_(escUi || "", esEn);
        /* Con opciones de distinta modalidad, e.lineas es la unión: en UI solo la modalidad activa. */
        lineasUi = lineasUi.filter(function (ln) {
            return ln.tipo === "libre" || tiposActivosUi.indexOf(ln.tipo) >= 0;
        });
        if ((!e.lineas || !e.lineas.length) && lineasUi.length) e.lineas = lineasUi;
        const escSuma = escUi || (logEscList_().length ? logOpcionUiAsegurar_() : "");
        const baseLogUi = logEsCotizacionExterior_() ? logBaseLogistica_(idioma, escSuma) : null;
        box.innerHTML = lineasUi.map(function (ln) {
            const claveNal = logMargenClaveNal_(ln.tipo);
            const arancel = ln.tipo === "duties" || ln.tipo === "taxes";
            const pctSel = logEscList_().length ? logEscPct_(ln, logEnvEscSel_) : ln.pct;
            const notasSel = logEscList_().length ? logEscNotas_(ln, logEnvEscSel_) : (ln.notas || "");
            const valorSel = logEscList_().length ? logEscValor_(ln, logEnvEscSel_) : ln.valor;
            const fuenteSel = logEscList_().length ? logEscFuente_(ln, logEnvEscSel_) : ln.fuente;
            const baseTip = ln.base
                ? ("% aplicado. No sale en el PDF. Base " + ln.base + ".")
                : "% aplicado. No sale en el PDF. Si no hay valor fijo, se calcula sobre el precio de los proyectos sin la comisión.";
            /* Duties/Taxes: mostrar el costo liquidado aunque solo viva el % (como en el PDF). */
            let valorMostrar = valorSel;
            let autoVal = "";
            if (arancel && valorSel == null && pctSel != null && baseLogUi != null) {
                const calc = logEnvValorLinea_(ln, baseLogUi, escSuma);
                if (calc != null && isFinite(calc)) {
                    valorMostrar = Math.round(calc * 100) / 100;
                    autoVal = String(valorMostrar);
                }
            }
            const pctInline = arancel
                ? "<input class=\"form-control form-control-sm log-env-pct\" data-lp type=\"number\" step=\"0.01\" placeholder=\"%\" title=\"" + logEsc_(baseTip) + "\" value=\"" + (pctSel == null ? "" : pctSel) + "\">" +
                    "<span class=\"log-env-pct-mark\" aria-hidden=\"true\">%</span>"
                : "";
            const margen = (!arancel && claveNal && !exterior)
                ? "<input class=\"form-control form-control-sm\" data-lmg=\"" + claveNal + "\" type=\"number\" min=\"0\" max=\"200\" step=\"1\" placeholder=\"%\" title=\"Margen de esta fila. Se suma al costo en la cotización y no se imprime.\" value=\"" + e.margenNal[claveNal] + "\">"
                : "";
            const nota = arancel
                ? "<input class=\"form-control form-control-sm log-env-nota\" data-ln type=\"text\" maxlength=\"400\" placeholder=\"Observación\" data-tip=\"" + logEsc_(notasSel) + "\" title=\"Se guarda con la cotización. No sale en el PDF. En la hoja, Duties y Taxes se imprimen sumados en una sola fila.\" value=\"" + logEsc_(notasSel) + "\">"
                : "";
            const conceptoInp = "<input class=\"form-control form-control-sm log-concepto-tip\" data-lc type=\"text\" maxlength=\"80\" data-tip=\"" + logEsc_(notasSel || ln.notas || "") + "\" value=\"" + logEsc_(ln.concepto) + "\">";
            const conc = arancel
                ? ("<span class=\"log-env-conc\">" + conceptoInp + pctInline + "</span>")
                : conceptoInp;
            return "<div class=\"log-env-row" + (arancel ? " is-arancel" : "") + "\" data-lid=\"" + logEsc_(ln.id) + "\">" +
                "<span class=\"log-env-grip\" title=\"Arrastrar\"><i class=\"bi bi-grip-vertical\"></i></span>" +
                conc +
                "<input class=\"form-control form-control-sm text-end" + (fuenteSel === "[Estimado IA]" ? " log-ia-est" : "") + (fuenteSel === "[Catálogo]" ? " log-cat" : "") + (autoVal ? " log-env-auto" : "") + "\" data-lv type=\"number\" step=\"0.01\" placeholder=\"" + (exterior ? "Costo" : "Costo COP") + "\" title=\"" + logEsc_(logMargenTituloCosto_(ln)) + "\"" + (autoVal ? " data-auto-val=\"" + logEsc_(autoVal) + "\"" : "") + " value=\"" + (valorMostrar == null ? "" : valorMostrar) + "\">" +
                margen + nota +
                "<button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-ldup title=\"Duplicar\"><i class=\"bi bi-copy\"></i></button>" +
                "<button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-ldel title=\"Quitar\"><i class=\"bi bi-trash\"></i></button>" +
                "</div>";
        }).join("") || ("<div class=\"text-muted small\">" + (
            esExwUi
                ? (esEn ? "EXW (Ex Works) has no logistics cost lines." : "EXW (Ex Works) no incluye conceptos de costos logísticos.")
                : (esEn ? "No rows for this Incoterm. Use Restore or the free row." : "Sin filas para este Incoterm. Usa Restaurar o la fila libre.")
        ) + "</div>");
        logActivarTipConcepto_();
        logisticaOrdenEnv_();
    }
    logisticaPintarCubicaje_();
    logPintarEnvSuma_();
    } finally {
        logEnvPintando_--;
        logAplicarFaltasAnalisis_();
    }
}

let logEnvSort = null;
function logisticaOrdenEnv_() {
    const box = document.getElementById("logEnvLineas");
    if (!box) return;
    if (logEnvSort) { try { logEnvSort.destroy(); } catch (e) { /* ya no está */ } logEnvSort = null; }
    box.querySelectorAll(".log-env-grip").forEach(function (grip) {
        grip.onpointerdown = function (ev) {
            if (ev.button !== 0) return;
            ev.preventDefault();
            ev.stopPropagation();
            const row = grip.closest(".log-env-row");
            if (!row) return;
            try { grip.setPointerCapture(ev.pointerId); } catch (err) { /* el arrastre sigue con los eventos del documento */ }
            const y0 = ev.clientY;
            let moved = false;
            const mover = function (e) {
                if (Math.abs(e.clientY - y0) > 3) moved = true;
                const bajo = document.elementFromPoint(e.clientX, e.clientY);
                const over = bajo && bajo.closest ? bajo.closest(".log-env-row") : null;
                if (!over || over === row || !box.contains(over)) return;
                const r = over.getBoundingClientRect();
                box.insertBefore(row, e.clientY < r.top + r.height / 2 ? over : over.nextSibling);
            };
            const soltar = function () {
                document.removeEventListener("pointermove", mover);
                document.removeEventListener("pointerup", soltar);
                document.removeEventListener("pointercancel", soltar);
                if (!moved) return;
                const e = logEnv_();
                const ids = [].map.call(box.querySelectorAll("[data-lid]"), function (r) { return r.getAttribute("data-lid"); });
                e.lineas.sort(function (a, b) { return ids.indexOf(String(a.id)) - ids.indexOf(String(b.id)); });
                logMarcarSucio_();
                logisticaRefrescarTabla_();
            };
            document.addEventListener("pointermove", mover);
            document.addEventListener("pointerup", soltar);
            document.addEventListener("pointercancel", soltar);
        };
    });
}

function logisticaOnEnvUi_(ev) {
    if (logEnvPintando_) return;
    const t = ev && ev.target;
    const btnDel = t && t.closest ? t.closest("[data-ldel]") : null;
    const btnDup = t && t.closest ? t.closest("[data-ldup]") : null;
    if (btnDel) {
        const row = btnDel.closest("[data-lid]");
        const e = logEnv_();
        e.lineas = e.lineas.filter(function (ln) { return ln.id !== (row && row.getAttribute("data-lid")); });
        logMarcarSucio_();
        logisticaPintarEnv_(true);
        logisticaRefrescarTabla_();
        return;
    }
    if (btnDup) {
        logisticaLeerEnvUi_();
        const row = btnDup.closest("[data-lid]");
        const e = logEnv_();
        const id = row && row.getAttribute("data-lid");
        const i = e.lineas.findIndex(function (ln) { return ln.id === id; });
        if (i >= 0) {
            const src = e.lineas[i];
            e.lineas.splice(i + 1, 0, {
                id: "c" + Date.now(),
                tipo: src.tipo,
                concepto: src.concepto,
                conceptoManual: true,
                valor: src.valor,
                pct: src.pct,
                notas: src.notas,
                fuente: (src.fuente === "[Estimado IA]" || src.fuente === "Aranceles" || src.fuente === "[Catálogo]") ? src.fuente : "",
                base: src.base || "",
                arancelManual: !!src.arancelManual,
                arancelFirma: src.arancelFirma || "",
                arancelNota: src.arancelNota || ""
            });
        }
        logMarcarSucio_();
        logisticaPintarEnv_(true);
        logisticaRefrescarTabla_();
        return;
    }
    const accion = t && t.closest ? t.closest("#btnLogEnvLibre, #btnLogEnvReset") : null;
    if (accion && accion.id === "btnLogEnvReset") {
        const e = logEnv_();
        e.plantilla = "";
        e.lineas = [];
        const escR = logEscList_().length ? (logEnvEscSel_ || logOpcionUiAsegurar_()) : "";
        logEnvAsegurarLineas_((document.getElementById("logIdioma") || {}).value === "en", true, escR);
        logMarcarSucio_();
        logisticaPintarEnv_(true);
        logisticaRefrescarTabla_();
        return;
    }
    if (accion && accion.id === "btnLogEnvLibre") {
        const escL = logEscList_().length ? (logEnvEscSel_ || logOpcionUiAsegurar_()) : "";
        if (logEsCotizacionExterior_() && String(logEnvVistaEsc_(escL).incoterm || "").toUpperCase() === "EXW") return;
        const e = logEnv_();
        if (escL) {
            const st = logEnvEsc_(escL);
            if (st) st.activo = true;
            e.activo = true;
        } else {
            e.activo = true;
        }
        e.lineas.push({ id: "c" + Date.now(), tipo: "libre", concepto: "", valor: null, pct: null, notas: "" });
        logMarcarSucio_();
        logisticaPintarEnv_(true);
        logisticaRefrescarTabla_();
        return;
    }
    /* Un clic en el agarre no debe redibujar: si no, el arrastre se cancela y la fila vuelve a su sitio. */
    if (ev && ev.type === "click") return;
    const modAntes = logQuote.env && logQuote.env.modalidad;
    const antes = modAntes + "|" + (logQuote.env && logQuote.env.incoterm) + "|" + (logQuote.env && logQuote.env.mercado);
    const incAntes = logQuote.env && logQuote.env.incoterm;
    logisticaLeerEnvUi_();
    if (t && t.id === "logDestPais") {
        logDestinoPaisTocado_ = true;
        if (typeof logValidarPartidasPorPaisEnvio_ === "function") logValidarPartidasPorPaisEnvio_();
    }
    if (t && t.id === "logDestCiudad") logDestinoCiudadTocado_ = true;
    if (t && t.id === "logDestCiudad" && logQuote.env && !logQuote.env.destinoPais) {
        const paisCiudad = logPaisUnicoDeLugar_(logQuote.env.destinoCiudad);
        if (paisCiudad) {
            logQuote.env.destinoPais = logPaisEnEspanol_(paisCiudad);
            const codCiudad = logEnvCodigoDePais_(paisCiudad);
            if (codCiudad) logQuote.env.destinoCodigo = codCiudad;
        }
    }
    if (t && (t.id === "logC20" || t.id === "logC40" || t.id === "logC40hc")) logQuote.env.contenedoresManual = true;
    /* Solo si el usuario cambia Modalidad/Incoterm/Mercado a mano (no al saltar de opción). */
    if (t && (t.id === "logModalidad" || t.id === "logIncoterm" || t.id === "logMercado")
        && (logQuote.env.modalidad !== modAntes || logQuote.env.incoterm !== incAntes || t.id === "logMercado")) {
        const escClr = logEscList_().length ? (logEnvEscSel_ || logOpcionUiAsegurar_()) : "";
        const stClr = escClr && logQuote.env.porEsc ? logQuote.env.porEsc[escClr] : null;
        const exteriorClr = logEsCotizacionExterior_();
        const incClr = logQuote.env.incoterm;
        /* Solo tipos de la modalidad anterior/nueva de ESTA opción — no los de Courier/Aéreo de otras. */
        const tiposClr = {};
        logEnvTiposActivos_(modAntes, incAntes, exteriorClr).forEach(function (tp) { tiposClr[tp] = 1; });
        logEnvTiposActivos_(logQuote.env.modalidad, incClr, exteriorClr).forEach(function (tp) { tiposClr[tp] = 1; });
        logQuote.env.lineas.forEach(function (ln) {
            if (!ln || !tiposClr[ln.tipo]) return;
            if (!ln.fuente && !(stClr && stClr.fuentes && (stClr.fuentes[ln.id] || stClr.fuentes[logEscKeyTipo_(ln.tipo)]))) return;
            /* Limpiar catálogo/IA de la opción activa; no tocar valores manuales de otras opciones. */
            if (stClr) {
                delete stClr.valores[ln.id];
                delete stClr.fuentes[ln.id];
                delete stClr.pcts[ln.id];
                const kt = logEscKeyTipo_(ln.tipo);
                if (kt) {
                    delete stClr.valores[kt];
                    delete stClr.fuentes[kt];
                    delete stClr.pcts[kt];
                }
            }
            if (!escClr || escClr === (logEscList_()[0] || {}).id) {
                ln.valor = null;
                ln.pct = null;
                ln.fuente = "";
                ln.base = "";
                ln.arancelManual = false;
                ln.arancelFirma = "";
            }
        });
    }
    /* Al cambiar aéreo ↔ courier el kg vol usa otro divisor (6000 vs 5000): soltar override de ESA opción. */
    if (t && t.id === "logModalidad" && logQuote.env.modalidad !== modAntes) {
        const airAntes = modAntes === "aerea" || modAntes === "courier";
        const airAhora = logQuote.env.modalidad === "aerea" || logQuote.env.modalidad === "courier";
        if (airAntes || airAhora) {
            const escM = logEscList_().length ? (logEnvEscSel_ || logOpcionUiAsegurar_()) : "";
            if (escM && logQuote.env.porEsc && logQuote.env.porEsc[escM]) logQuote.env.porEsc[escM].cubKgVol = null;
            else if (!escM) logQuote.env.cubKgVol = null;
        }
    }
    if (t && (t.id === "logIncoterm" || t.id === "logMercado" || t.id === "logDestTitulo")
        && (logQuote.env.incoterm !== incAntes || t.id === "logMercado" || t.id === "logDestTitulo")) {
        logQuote.env.titGran = "";
    }
    if (t && t.id === "logMercado") logQuote.env.plantilla = "";
    logMarcarSucio_();
    const despues = logQuote.env.modalidad + "|" + logQuote.env.incoterm + "|" + logQuote.env.mercado;
    const estructural = antes !== despues || (t && (t.id === "logModalidad" || t.id === "logIncoterm" || t.id === "logMercado" || t.id === "logCostosOn" || t.name === "logModoCosto"));
    if (estructural) {
        logEnvAsegurarLineas_(logisticaLeerOpciones_().idioma === "en");
        logisticaActualizarVista();
        return;
    }
    logisticaPintarEnv_();
    logisticaRefrescarTabla_();
}

function logisticaLeerOpciones_() {
    return {
        idioma: (document.getElementById("logIdioma") || {}).value || "es",
        margenMm: (document.getElementById("logMargen") || {}).value || "16"
    };
}

function logisticaAjustarAltoFrame_() {
    const f = document.getElementById("logFrame");
    const doc = f && f.contentDocument;
    if (!f || !doc || !doc.documentElement) return;
    const pages = doc.querySelector(".pages");
    if (!pages) {
        f.style.height = Math.max(1056, doc.documentElement.scrollHeight) + "px";
        return;
    }
    const z = parseFloat(pages.style.zoom) || 1;
    const previo = pages.style.zoom;
    pages.style.zoom = "1";
    const alto = pages.offsetHeight || pages.scrollHeight || 1056;
    pages.style.zoom = previo;
    f.style.height = Math.ceil(alto * z) + 12 + "px";
}

let logZoom = "fit";
let logZoomTick = 0;

function logisticaAplicarZoom_() {
    const f = document.getElementById("logFrame");
    const doc = f && f.contentDocument;
    const stage = document.querySelector(".log-stage");
    const pages = doc && doc.querySelector(".pages");
    if (!pages || !stage || !f) return;
    const page = pages.querySelector(".page");
    const bar = stage.querySelector(".log-zoom");
    /* No forzar height en línea: pelea con el grid y crea una 2ª scrollbar. */
    stage.style.height = "";
    stage.style.maxHeight = "";
    const previo = pages.style.zoom;
    pages.style.zoom = "1";
    const pw = (page && page.offsetWidth) || 816;
    const ph = (page && page.offsetHeight) || 1056;
    pages.style.zoom = previo || "1";
    const barH = (bar ? bar.offsetHeight : 32) + 8;
    const roomW = Math.max(200, f.clientWidth || (stage.clientWidth - 20));
    const roomH = Math.max(240, (stage.clientHeight || 480) - barH);
    let z = typeof logZoom === "number" ? logZoom : 1;
    if (logZoom === "fit") {
        z = Math.min(roomW / pw, roomH / ph);
        z = Math.max(0.28, Math.min(1.15, Math.floor(z * 100) / 100));
    }
    pages.style.zoom = String(z);
    const lbl = document.getElementById("logZoomLbl");
    if (lbl) lbl.textContent = Math.round(z * 100) + "%";
    logisticaAjustarAltoFrame_();
}

function logisticaZoomPaso_(dir) {
    const lbl = document.getElementById("logZoomLbl");
    let z = logZoom === "fit" ? (parseInt((lbl && lbl.textContent) || "100", 10) / 100) : logZoom;
    if (!isFinite(z) || z <= 0) z = 1;
    z = Math.max(0.35, Math.min(1.5, Math.round((z + dir * 0.1) * 100) / 100));
    logZoom = z;
    logisticaAplicarZoom_();
}

/**
 * Agrega a la vista previa los controladores de arrastre:
 *  - borde derecho de cada título → ancho de columna (se reparte con la columna vecina);
 *  - borde inferior de la imagen → alto de esa fila (Mayús = todas las filas).
 * No forman parte del PDF (CSS @media print los oculta).
 */


function logHacerEditable_(doc, el) {
    el.setAttribute("contenteditable", "plaintext-only");
    if (el.contentEditable !== "plaintext-only") el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "false");
    el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); el.blur(); }
    });
    el.addEventListener("paste", function (e) {
        e.preventDefault();
        const txt = ((e.clipboardData || window.clipboardData).getData("text") || "").replace(/\s+/g, " ");
        doc.execCommand("insertText", false, txt);
    });
}

function logisticaActivarEdicion_(doc) {
    /* campos de texto editables directo sobre la hoja (cabecera y firma) */
    doc.querySelectorAll(".ed:not([data-r])").forEach(function (el) {
        if (el.getAttribute("data-on")) return;
        el.setAttribute("data-on", "1");
        logHacerEditable_(doc, el);
        el.addEventListener("input", function () {
            const envK = el.getAttribute("data-env");
            const txt = el.textContent.replace(/\s+/g, " ").trim();
            if (envK === "titDesc") {
                const d = logDescuentoAsegurar_();
                d.titulo = txt;
                d.tituloManual = !!txt;
            } else if (envK === "notaDesc") {
                logDescuentoAsegurar_().nota = txt;
                const notaEl = document.getElementById("logDescuentoNota");
                if (notaEl && document.activeElement !== notaEl) notaEl.value = txt;
            } else if (envK === "titConIva" || envK === "titAnt" || envK === "titSaldo") {
                logPagoAsegurar_()[envK] = txt;
            } else if (envK && logQuote.env) {
                logQuote.env[envK] = txt;
            } else {
                logCab.over[el.getAttribute("data-f")] = txt;
            }
            logMarcarSucio_();
        });
    });
    logisticaActivarTabla_(doc);
}

/** Controles de la tabla de ítems: texto editable por fila, imagen (clic) y arrastres de ancho/alto. */
function logisticaActivarClicSim3d_(doc) {
    if (!doc) return;
    doc.querySelectorAll(".log-sim3d-frame, .log-sim3d-page, img[data-sim3d]").forEach(function (el) {
        if (el.getAttribute("data-on-sim3d")) return;
        el.setAttribute("data-on-sim3d", "1");
        el.style.cursor = "pointer";
        el.addEventListener("click", function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            let uid = el.getAttribute("data-r") || "";
            if (!uid && el.querySelector) {
                const inner = el.querySelector("[data-r]");
                if (inner) uid = inner.getAttribute("data-r") || "";
            }
            if (!uid && el.closest) {
                const host = el.closest("[data-r]");
                if (host) uid = host.getAttribute("data-r") || "";
            }
            if (uid) logisticaAbrirEditorSim3d_(uid);
        });
    });
}

function logisticaActivarTabla_(doc) {
    logisticaActivarClicSim3d_(doc);
    const tablas = doc.querySelectorAll("table.items");
    if (!tablas.length) return;
    const idioma = logisticaLeerOpciones_().idioma;
    tablas.forEach(function (tabla, idxTabla) {

    tabla.querySelectorAll(".ed[data-r]").forEach(function (el) {
        const fila = logFilaPorUid_(el.getAttribute("data-r"));
        const campo = el.getAttribute("data-f");
        if (!fila) return;
        logHacerEditable_(doc, el);
        const numerico = campo === "qty" || campo === "unit";
        const escId = el.getAttribute("data-e") || ""; /* con escenarios, lo escrito vale solo para esa opción */
        const clave = escId ? campo + ":" + escId : campo;
        el.addEventListener("input", function () {
            if (logPintandoHoja_) return;
            logMarcarSucio_();
            const txt = el.textContent.replace(/\s+/g, " ").trim();
            if (numerico) {
                if (txt === "") { delete fila.over[clave]; }
                else {
                    const n = logParseNum_(txt, idioma);
                    if (n == null) return;
                    const previo = fila.over[clave];
                    delete fila.over[clave];
                    const auto = logFilaValores_(fila, idioma, escId);
                    const autoN = campo === "qty" ? auto.qty : auto.unit;
                    const tol = logDecimales_() === 0 ? 0.51 : 0.02;
                    if (autoN != null && Math.abs(n - Number(autoN)) <= tol) {
                        /* el número es el del presupuesto: no se congela */
                    } else if (campo === "unit") fila.over[clave] = n / (logComisionFactor_(fila) || 1);
                    else fila.over[clave] = n;
                    if (fila.over[clave] == null && previo != null && autoN == null) fila.over[clave] = previo;
                }
            } else {
                fila.over[campo] = txt;
            }
            logisticaRecalcularCeldas_(doc);
        });
        if (numerico) {
            el.addEventListener("blur", function () {
                const v = logFilaValores_(fila, idioma, escId);
                const n = campo === "qty" ? v.qty : v.unit;
                if (n == null) { el.textContent = ""; return; }
                el.textContent = campo === "qty"
                    ? logFmtNum_(n, idioma, Number.isInteger(n) ? 0 : 2)
                    : logFmtMoneda_(n, idioma, logDecimales_());
            });
        }
    });

    tabla.querySelectorAll("img.thumb").forEach(function (img) {
        img.title = "Editar imagen: acercar, recortar o girar";
        img.style.cursor = "pointer";
        img.addEventListener("click", function () { logisticaAbrirEditorImagen_(img.getAttribute("data-r")); });
    });
    tabla.querySelectorAll("thead th[data-rz]").forEach(function (th) {
        const i = parseInt(th.getAttribute("data-rz"), 10);
        const j = parseInt(th.getAttribute("data-rz2"), 10);
        const pc = parseInt(th.getAttribute("data-pc"), 10);
        const pc2 = parseInt(th.getAttribute("data-pc2"), 10);
        const sc = parseFloat(th.getAttribute("data-sc")) || 1;
        const h = doc.createElement("span");
        h.className = "rz rz-c";
        h.title = "Arrastra para ajustar el ancho";
        th.appendChild(h);
        h.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            try { h.setPointerCapture(ev.pointerId); } catch (err) { /* sin captura: el arrastre sigue por eventos del controlador */ }
            const startX = ev.clientX;
            const ancho = tabla.getBoundingClientRect().width || 1;
            const w0 = logLayout.cols[i].w;
            const w1 = logLayout.cols[j].w;
            doc.body.classList.add("rz-on", "rz-col");
            h.classList.add("rz-act");
            const mover = function (e) {
                let d = (((e.clientX - startX) / ancho) * 100) / sc;
                d = Math.max(LOG_ANCHO_COL_MIN_PCT - w0, Math.min(w1 - LOG_ANCHO_COL_MIN_PCT, d));
                logLayout.cols[i].w = +(w0 + d).toFixed(2);
                logLayout.cols[j].w = +(w1 - d).toFixed(2);
                const wa = (logLayout.cols[i].w * sc) + "%";
                const wb = (logLayout.cols[j].w * sc) + "%";
                doc.querySelectorAll("table.items colgroup").forEach(function (cg) {
                    const cs = cg.querySelectorAll("col");
                    if (cs[pc]) cs[pc].style.width = wa;
                    if (cs[pc2]) cs[pc2].style.width = wb;
                });
            };
            const soltar = function () {
                doc.removeEventListener("pointermove", mover);
                doc.removeEventListener("pointerup", soltar);
                doc.removeEventListener("pointercancel", soltar);
                doc.body.classList.remove("rz-on", "rz-col");
                h.classList.remove("rz-act");
                logisticaAjustarAltoFrame_();
            };
            doc.addEventListener("pointermove", mover);
            doc.addEventListener("pointerup", soltar);
            doc.addEventListener("pointercancel", soltar);
        });
    });

    tabla.querySelectorAll("tr.it:not(.it-env)").forEach(function (tr) {
        const td = tr.querySelector(".td-img");
        if (!td) return;
        const h = doc.createElement("span");
        h.className = "rz rz-r";
        h.title = "Arrastra para ajustar el alto (Mayús: todas las filas)";
        td.appendChild(h);
        h.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            try { h.setPointerCapture(ev.pointerId); } catch (err) { /* sin captura: el arrastre sigue por eventos del controlador */ }
            const startY = ev.clientY;
            const idx = tr.getAttribute("data-r");
            const h0 = logLayout.filaAlto[idx] || LOG_ALTO_IMG_DEFAULT_IN;
            doc.body.classList.add("rz-on", "rz-row");
            h.classList.add("rz-act");
            const aplicar = function (fila, alto) {
                const celda = fila.querySelector(".td-img");
                const img = fila.querySelector(".thumb");
                if (celda) celda.style.height = (alto + 0.12).toFixed(3) + "in";
                if (img) img.style.height = alto.toFixed(3) + "in";
                logLayout.filaAlto[fila.getAttribute("data-r")] = alto;
            };
            const mover = function (e) {
                let alto = h0 + (e.clientY - startY) / 96;
                alto = Math.max(LOG_ALTO_IMG_MIN_IN, Math.min(LOG_ALTO_IMG_MAX_IN, alto));
                if (e.shiftKey) {
                    doc.querySelectorAll("table.items tr.it:not(.it-env)").forEach(function (fila) { aplicar(fila, alto); });
                } else {
                    aplicar(tr, alto);
                }
            };
            const soltar = function () {
                doc.removeEventListener("pointermove", mover);
                doc.removeEventListener("pointerup", soltar);
                doc.removeEventListener("pointercancel", soltar);
                doc.body.classList.remove("rz-on", "rz-row");
                h.classList.remove("rz-act");
                logisticaAjustarAltoFrame_();
            };
            doc.addEventListener("pointermove", mover);
            doc.addEventListener("pointerup", soltar);
            doc.addEventListener("pointercancel", soltar);
        });
    });
    });
}

function logisticaRestablecerDiseno() {
    logLayoutReset_();
    logisticaActualizarVista();
    if (typeof mostrarNotificacion === "function") mostrarNotificacion("Anchos y altos restablecidos.", "success");
}

function logisticaActualizarVista(opts) {
    const f = document.getElementById("logFrame");
    if (!f) return;
    const stage = document.querySelector(".log-stage");
    const scroll = stage ? stage.scrollTop : 0;
    logFrameListo = false;
    f.onload = function () {
        logFrameListo = true;
        const doc = f.contentDocument;
        /* Capturas 3D + zoom (sin paginador DOM: hoja continua). */
        Promise.resolve(logisticaInyectarSim3dImgs_(doc)).then(function () {
            try { logisticaActivarEdicion_(doc); } catch (e) { /* la vista sigue funcionando sin controladores */ }
            logisticaAplicarZoom_();
            if (stage) stage.scrollTop = scroll;
            if (logRefrescoPend) { logRefrescoPend = false; logisticaRefrescarTabla_(); }
            try {
                doc.fonts.ready.then(function () { logisticaAplicarZoom_(); if (stage) stage.scrollTop = scroll; });
                Array.prototype.forEach.call(doc.images, function (img) {
                    if (!img.complete) img.addEventListener("load", logisticaAplicarZoom_);
                });
            } catch (e2) { /* sin acceso a fuentes: se conserva el alto calculado */ }
        });
    };
    logPintandoHoja_++;
    try {
        f.srcdoc = logisticaConstruirHTML(logisticaLeerOpciones_());
        if (!(opts && opts.sinFilas)) logisticaPintarFilas_();
    } finally {
        logPintandoHoja_ = Math.max(0, logPintandoHoja_ - 1);
    }
}

async function logisticaDescargarPDF() {
    const f = document.getElementById("logFrame");
    if (!f) return;
    const pend = logisticaFilasImgPendientes_();
    const haySim3d = logSim3dRefsPendientes_().some(function (it) {
        return !(it.st && it.st.sim3dImg && /^data:image\//i.test(it.st.sim3dImg));
    });
    if (pend.length || haySim3d) {
        if (typeof mostrarEsperaNube === "function") mostrarEsperaNube("Trayendo las imágenes para el PDF…");
        try {
            if (pend.length) await logisticaRecargarImgs_({ silencio: true, espera: true, filas: pend });
            else await logisticaHidatarSim3dImgs_({ forzar: true });
        } finally { if (typeof ocultarEsperaNube === "function") ocultarEsperaNube(); }
    }
    const tituloOriginal = document.title;
    /* Misma vista que la preview: script de páginas + inyección 3D (sin thead en solo-foto). */
    f.onload = function () {
        const w = f.contentWindow;
        if (!w) return;
        Promise.resolve(logisticaInyectarSim3dImgs_(w.document)).then(function () {
            try {
                const pages = w.document.querySelector(".pages");
                if (pages) { pages.style.zoom = "1"; pages.style.transform = ""; }
            } catch (eZ) { /* noop */ }
            try { document.title = w.document.title || logNombreArchivoPdf_(logisticaLeerOpciones_().idioma); } catch (e) { document.title = logNombreArchivoPdf_(logisticaLeerOpciones_().idioma); }
            const restaurar = function () {
                document.title = tituloOriginal;
                w.removeEventListener("afterprint", restaurar);
                logisticaActualizarVista();
            };
            w.addEventListener("afterprint", restaurar);
            if (typeof mostrarNotificacion === "function") {
                mostrarNotificacion("En el diálogo: Destino 'Guardar como PDF', tamaño Carta, márgenes 'Ninguno' y desactiva 'Encabezados y pies de página'.", "info");
            }
            /* 2 frames: layout estable antes de print (evita escala de Chrome). */
            w.requestAnimationFrame(function () {
                w.requestAnimationFrame(function () {
                    w.focus();
                    w.print();
                });
            });
        });
    };
    /* imprimir=false → corre recolocarPaginas_ (igual que la preview). */
    f.srcdoc = logisticaConstruirHTML(logisticaLeerOpciones_(), false);
}

function logListaPaises_() {
    const vistos = {};
    const out = [];
    logPaisesFuente_().forEach(function (x) {
        if (vistos[x.codigo]) return;
        vistos[x.codigo] = 1;
        out.push(x.nombre);
    });
    out.sort(function (a, b) { return a.localeCompare(b, "es"); });
    return out;
}

/** País siempre en español, con la misma flecha que Ciudad. */
function logPintarSelectPais_(actual) {
    const el = document.getElementById("logDestPais");
    if (!el) return String(actual || "").trim();
    const ahora = logPaisEnEspanol_(actual);
    if (el.tagName !== "SELECT") {
        if (document.activeElement !== el) el.value = ahora;
        return ahora;
    }
    const lista = logListaPaises_();
    const norm = logTarNorm_(ahora);
    let html = "<option value=\"\">País</option>";
    let visto = !ahora;
    lista.forEach(function (n) {
        const sel = logTarNorm_(n) === norm;
        if (sel) visto = true;
        html += "<option value=\"" + logEsc_(n) + "\"" + (sel ? " selected" : "") + ">" + logEsc_(n) + "</option>";
    });
    if (ahora && !visto) html += "<option value=\"" + logEsc_(ahora) + "\" selected>" + logEsc_(ahora) + "</option>";
    if (el.getAttribute("data-opts") !== html) {
        el.innerHTML = html;
        el.setAttribute("data-opts", html);
    }
    if (document.activeElement !== el && el.value !== ahora) el.value = ahora;
    return ahora;
}
function logListaCodigos_() {
    const vistos = {};
    const out = [];
    logPaisesFuente_().forEach(function (x) {
        if (vistos[x.codigo]) return;
        vistos[x.codigo] = 1;
        out.push(x.codigo);
    });
    return out;
}
function logCombo_(inputId, menuId, opciones, alElegir) {
    const input = document.getElementById(inputId);
    const menu = document.getElementById(menuId);
    if (!input || !menu || input.getAttribute("data-combo")) return;
    input.setAttribute("data-combo", "1");
    const leer = function () { return typeof opciones === "function" ? (opciones() || []) : (opciones || []); };
    const pintar = function (q) {
        const s = String(q || "").trim().toLowerCase();
        const list = leer().filter(function (o) { return !s || String(o).toLowerCase().indexOf(s) >= 0; });
        menu.innerHTML = list.map(function (o) {
            return "<button type=\"button\" data-v=\"" + logEsc_(o) + "\">" + logEsc_(o) + "</button>";
        }).join("");
        menu.hidden = !list.length;
    };
    input.addEventListener("focus", function () { pintar(""); });
    input.addEventListener("input", function () { pintar(input.value); });
    input.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") menu.hidden = true;
    });
    input.addEventListener("blur", function () { setTimeout(function () { menu.hidden = true; }, 180); });
    menu.addEventListener("mousedown", function (ev) {
        const b = ev.target.closest("button");
        if (!b) return;
        ev.preventDefault();
        input.value = b.getAttribute("data-v") || "";
        menu.hidden = true;
        if (alElegir) alElegir(input.value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
    });
}

/* ------------------------------------------------------------------ */
/* Asistente de logística: chat propio. No toca el de Costos.         */
/* ------------------------------------------------------------------ */

let logIa = { fase: "inicio", historial: [], sugerencia: "", motivo: "", ocupado: false, analizado: false, diagnostico: "" };

function logIaReiniciar_() {
    logIa = { fase: "inicio", historial: [], sugerencia: "", motivo: "", ocupado: false, analizado: false, diagnostico: "" };
    logIaPintar_();
}

function logIaEtiquetaMod_(mod) {
    return { courier: "Courier", aerea: "Aérea", fcl: "Marítimo FCL", lcl: "Marítimo LCL", terrestre: "Terrestre" }[mod] || "";
}

function logIaHtml_(txt) {
    return logEsc_(txt).replace(/\n/g, "<br>");
}

function logIaPintar_() {
    const box = document.getElementById("logIaBox");
    if (box) {
        if (!logIa.historial.length) {
            box.innerHTML = "<div class=\"text-muted text-center\" style=\"font-size:0.75rem;margin-top:28px;\">Pulsa Análisis costos logísticos para ver qué cubre el catálogo y cómo salen Duties/Taxes. Luego Generar datos logísticos los escribe en la ficha.</div>";
        } else {
            box.innerHTML = logIa.historial.map(function (h) {
                const cls = h.role === "user" ? "log-ia-user" : (h.role === "nota" ? "log-ia-nota" : "log-ia-model");
                return "<div class=\"log-ia-msg " + cls + "\">" + logIaHtml_(h.text) + "</div>";
            }).join("");
            box.scrollTop = box.scrollHeight;
        }
    }
    const btnG = document.getElementById("btnLogIaGenerar");
    const btnA = document.getElementById("btnLogIaAnalisis");
    const btnE = document.getElementById("btnLogIaEnviar");
    const inp = document.getElementById("logIaInput");
    if (btnA) btnA.disabled = !!logIa.ocupado;
    logAplicarFaltasAnalisis_();
    logPintarRecalcAviso_();
    if (btnE) btnE.disabled = !!logIa.ocupado;
    if (inp) inp.disabled = !!logIa.ocupado;
    if (btnG) {
        btnG.disabled = !!logIa.ocupado || !logIa.analizado;
        btnG.title = logIa.analizado ? "Llena las filas del envío con el catálogo." : "Se enciende después del análisis.";
        btnG.classList.toggle("btn-diforma-blue", !!logIa.analizado);
        btnG.classList.toggle("btn-outline-secondary", !logIa.analizado);
    }
    const sug = document.getElementById("logIaSugerencia");
    if (!sug) return;
    const et = logIaEtiquetaMod_(logIa.sugerencia);
    if (!et) { sug.classList.add("d-none"); sug.innerHTML = ""; return; }
    const actual = logEnv_().modalidad;
    const igual = actual === logIa.sugerencia;
    const exterior = logEsCotizacionExterior_();
    let html = "<b>Sugiere " + logEsc_(et) + ".</b> " + logEsc_(logIa.motivo || "");
    if (igual) html += " Es la modalidad que está elegida.";
    else if (exterior) html += " <button type=\"button\" class=\"btn btn-sm btn-outline-primary ms-1\" id=\"btnLogIaUsarMod\">Usar " + logEsc_(et) + "</button>";
    else html += " Para usarla, pasa la cotización a Exportación.";
    sug.innerHTML = html;
    sug.classList.remove("d-none");
    const btn = document.getElementById("btnLogIaUsarMod");
    if (btn) btn.addEventListener("click", logIaUsarModalidad_);
}

function logIaUsarModalidad_() {
    const mod = logIa.sugerencia;
    if (!logIaEtiquetaMod_(mod) || !logEsCotizacionExterior_()) return;
    const sel = document.getElementById("logModalidad");
    if (!sel || sel.value === mod) return;
    sel.value = mod;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
}

function logIaContexto_() {
    const idioma = logisticaLeerOpciones_().idioma;
    logEnvAsegurarLineas_(idioma === "en", false);
    const e = logEnv_();
    const cub = logCubicajeTotal_(idioma);
    const opcionesCtx = logEscList_().map(function (x, i) {
        const ck = logCubicajeTotal_(idioma, x.id);
        const stk = logEnvEscDe_(e, x.id);
        return {
            opcion: logEscNombre_(x, i, idioma),
            cajas: ck.cajas, m3: Math.round(ck.m3 * 1000) / 1000,
            pesoKg: Math.round(ck.pesoKg * 100) / 100, kgVol: Math.round(ck.kgVol * 100) / 100,
            valorMercancia: typeof logTarValorMercancia_ === "function" ? logTarValorMercancia_(x.id) : 0,
            contenedores: stk ? stk.contenedores : e.contenedores,
            embarques: stk ? stk.embarques : (e.embarques || 1)
        };
    });
    return {
        mercado: logEsCotizacionExterior_() ? "EXPORTACION" : "NACIONAL",
        modalidadElegida: e.modalidad,
        incoterm: logEsCotizacionExterior_() ? e.incoterm : "",
        ciudad: e.destinoCiudad,
        pais: e.destinoPais,
        codigoPais: e.destinoCodigo,
        arancel: logArancelResumen_(),
        puerto: e.destinoPuerto,
        moneda: logQuote.moneda === "USD" ? "USD" : "COP",
        valorMercancia: typeof logTarValorMercancia_ === "function" ? logTarValorMercancia_() : 0,
        cubicaje: {
            cajas: cub.cajas,
            m3: Math.round(cub.m3 * 1000) / 1000,
            pesoKg: Math.round(cub.pesoKg * 100) / 100,
            kgVol: Math.round(cub.kgVol * 100) / 100,
            pesoCobroKg: Math.round(Math.max(Number(cub.pesoKg) || 0, Number(cub.kgVol) || 0) * 100) / 100,
            filasSinEmpaque: cub.filasSin
        },
        embarques: e.embarques || 1,
        contenedores: e.contenedores || { c20: 0, c40: 0, c40hc: 0 },
        contenedoresManual: !!e.contenedoresManual,
        opciones: opcionesCtx,
        avisoRango: typeof logTarAvisoRango_ === "function" ? logTarAvisoRango_() : "",
        filasAbiertas: (e.lineas || []).filter(function (ln) { return ln.tipo !== "libre"; }).map(function (ln) {
            return { tipo: ln.tipo, concepto: ln.concepto, valor: ln.valor, pct: ln.pct };
        })
    };
}

function logIaPrompt_(modo) {
    const oficio = (typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.promptLogistico)
        ? String(CONFIG_GLOBAL.promptLogistico).trim()
        : "";
    const ctx = logIaContexto_();
    const hist = logIa.historial.filter(function (h) { return h.role === "user" || h.role === "model"; }).slice(-12);
    const tipos = (ctx.filasAbiertas || []).map(function (f) { return f.tipo; }).join(", ") || "(ninguna)";
    return (oficio || "Ayuda a cotizar el envío de displays de Diforma.") + `

=== REGLAS DEL SISTEMA (mandan sobre el texto de Ajustes) ===
Eres el asistente de logística de SmartBudget. Chat interno, SIEMPRE en español claro.
ESTILO: frases cortas, una idea por línea. Evita jerga (no digas "contexto", "JSON", "filasAbiertas", "kgVol"). Habla como a un comercial: "flete", "destino", "partida", "contenedor".
No tocas precios de proyectos, comisión, descuento ni el gran total. Solo hablas del envío.
La modalidad, el destino y el Incoterm los elige la persona. Puedes SUGIRIR una modalidad (courier, aerea, fcl, lcl, terrestre) y por qué. PROHIBIDO decir que ya la cambiaste.
Si el catálogo no tiene tarifa para esa ciudad y ese modo, un estimado solo entra con fuente citada (naviera/aerolínea/courier con fecha u otra oferta del país). Sin cita no inventes cifra. Fuente del estimado: "[Estimado IA]".
Sin tarifa LCL para comparar: desde 10 m³ sugiere FCL; si no, LCL. Con ambas, compara totales. No cambies el Incoterm.
DUTIES Y TAXES: si el diagnóstico ya trae %, base (EXW/CIF/CIF+DUTY) o un aviso de partida faltante, explícalo en 1–2 frases. No inventes ni cambies esos %. No llevan margen.
PESO: si pesoKg es 0 y kgVol > 0, el flete aéreo usa kgVol (pesoCobroKg). PROHIBIDO pedir el peso real.
ORIGEN Y SEGURO: origen depende solo de la modalidad. Seguro = % de valorMercancia. Si valorMercancia > 0, no digas que falta.
RANGO AÉREO: si avisoRango trae texto, repítelo tal cual.
CONTENEDORES Y EMBARQUES: la app ya calculó mix y embarques. No inventes otra cantidad. PROHIBIDO decir que ya cambiaste modalidad, contenedores o embarques.
PAPEL: las cifras de Ajustes las escribe la app al generar. Tú aclaras huecos y respondes. No reescribas el catálogo.
Valores en ${ctx.moneda}, totales del envío. Escribe COSTO sin margen. Filas abiertas: ${tipos}.

CONTEXTO
${JSON.stringify(ctx)}

HISTORIAL
${hist.map(function (h) { return (h.role === "user" ? "Persona" : "Asistente") + ": " + h.text; }).join("\n")}

DIAGNÓSTICO (no lo contradigas)
${logIa.diagnostico || "(todavía no hay análisis)"}

${modo === "generar"
        ? `MODO: GENERAR DATOS.
Una sola frase clara de lo que vas a llenar. AL FINAL un JSON sin markdown:
{"modalidadSugerida":"aerea","motivo":"una frase","lineas":[{"tipo":"origen","valor":0,"fuente":"[Estimado IA]"}]}
modalidadSugerida: courier, aerea, fcl, lcl, terrestre (vacía en nacional).
lineas solo con tipos de filasAbiertas. Sin destino o sin cajas: lineas [] y di qué falta.`
        : `MODO: ENTREVISTA.
Máximo 5 líneas, claras. Usa el diagnóstico. No inventes faltantes que el diagnóstico ya negó.
PROHIBIDO cifras nuevas de flete y PROHIBIDO arreglo lineas.
Pregunta solo lo que falte: ciudad vacía, país, cajas/empaque, puerto marítimo. No preguntes peso real si kgVol > 0.
Si puedes opinar, una frase de modalidad y cierra con:
{"modalidadSugerida":"aerea","motivo":"una frase"}
Si no hay base, no envíes JSON.`}
`;
}

function logIaLeerJson_(texto) {
    if (!texto) return null;
    let raw = String(texto);
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) raw = fenced[1];
    const i = raw.indexOf("{");
    if (i < 0) return null;
    const fin = raw.lastIndexOf("}");
    if (fin <= i) return null;
    try {
        const o = JSON.parse(raw.slice(i, fin + 1));
        return o && typeof o === "object" && !Array.isArray(o) ? o : null;
    } catch (e) {
        return null;
    }
}

function logIaTextoVisible_(texto, json) {
    let t = String(texto || "").replace(/```(?:json)?[\s\S]*?```/gi, "").trim();
    if (json) {
        const i = t.indexOf("{");
        if (i >= 0) t = t.slice(0, i).trim();
    }
    return t;
}

function logIaTomarSugerencia_(obj) {
    const mod = String((obj && obj.modalidadSugerida) || "").trim().toLowerCase();
    if (!logIaEtiquetaMod_(mod)) return;
    logIa.sugerencia = mod;
    logIa.motivo = String((obj && obj.motivo) || "").trim().slice(0, 220);
}

function logActivarTipConcepto_() {
    let tip = document.getElementById("mtxFloatTip");
    if (!tip) {
        tip = document.createElement("div");
        tip.id = "mtxFloatTip";
        tip.className = "mtx-float-tip";
        document.body.appendChild(tip);
    }
    const bind_ = function (el) {
        el.onmouseenter = function (e) {
            const txt = el.getAttribute("data-tip") || el.value || "";
            if (!txt) return;
            tip.textContent = txt;
            tip.style.display = "block";
            tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 360) + "px";
            tip.style.top = (e.clientY + 16) + "px";
        };
        el.onmousemove = function (e) {
            if (tip.style.display !== "block") return;
            tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 360) + "px";
            tip.style.top = (e.clientY + 16) + "px";
        };
        el.onmouseleave = function () { tip.style.display = "none"; };
        if (el.getAttribute("data-ln") != null) {
            el.oninput = function () { el.setAttribute("data-tip", el.value || ""); };
        }
    };
    document.querySelectorAll("#logEnvLineas .log-concepto-tip, #logEnvLineas [data-ln]").forEach(bind_);
}

function logTarNorm_(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function logTarVacio_() {
    return { origen: [], interno: [], aereo: [], fcl: [], lcl: [], seguro: [], destino: [] };
}

function logTarAsegurar_() {
    if (window.logTarifas && window.logTarifas.origen) return window.logTarifas;
    let raw = (typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.logTarifas) || null;
    if (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch (e) { raw = null; }
    }
    const base = logTarVacio_();
    if (raw && typeof raw === "object") {
        Object.keys(base).forEach(function (k) {
            base[k] = Array.isArray(raw[k]) ? raw[k] : [];
        });
    }
    /* Sheets devuelve `equipo` como número (20, 40): se normaliza a texto para que las comparaciones no fallen. */
    Object.keys(base).forEach(function (k) {
        if (!Array.isArray(base[k])) return;
        base[k].forEach(function (f) { if (f && f.equipo != null && f.equipo !== "") f.equipo = String(f.equipo); });
    });
    base.conceptos = (raw && raw.conceptos && typeof raw.conceptos === "object") ? raw.conceptos : { origen: [], destino: [] };
    base.lugares = (raw && Array.isArray(raw.lugares)) ? raw.lugares : [];
    base.ciudadesAlias = (raw && raw.ciudadesAlias && typeof raw.ciudadesAlias === "object") ? raw.ciudadesAlias : (logCiudadesAlias_ || {});
    if (base.ciudadesAlias && typeof base.ciudadesAlias === "object") {
        Object.keys(base.ciudadesAlias).forEach(function (k) {
            if (base.ciudadesAlias[k]) logCiudadesAlias_[k] = base.ciudadesAlias[k];
        });
    }
    window.logTarConceptos = base.conceptos;
    window.logTarifas = base;
    logTarSemillaSiVacio_();
    return base;
}

function logTarFila_(o) {
    return Object.assign({
        preferida: "S", proveedor: "IFS", origen: "Bogotá", moneda: "USD",
        minimo: "", maximo: "", forma: "fijo", baseVar: "valor", aplica: "embarque", equipo: ""
    }, o);
}

function logTarSemillaSiVacio_() {
    const t = window.logTarifas;
    if (!t) return;
    if (!t.origen.length) t.origen = logTarSemillaOrigen_();
    if (!t.destino.length) t.destino = logTarSemillaMiami_();
    if (!t.interno.length) t.interno = logTarSemillaInterno_();
    if (!t.seguro.length) t.seguro = logTarSemillaSeguro_();
    logTarCompletarDestino_();
}

function logTarSemillaInterno_() {
    return [
        logTarFila_({ id: "ifs-i-air", modalidad: "aerea", salida: "El Dorado", equipo: "", precio: 470000, moneda: "COP", fecha: "2026-10-08" }),
        logTarFila_({ id: "ifs-i-fcl20", modalidad: "fcl", salida: "Cartagena", equipo: "20", precio: 5100000, moneda: "COP", fecha: "2026-10-06" }),
        logTarFila_({ id: "ifs-i-fcl40", modalidad: "fcl", salida: "Cartagena", equipo: "40", precio: 6600000, moneda: "COP", fecha: "2026-10-06" }),
        logTarFila_({ id: "ifs-i-lcl", modalidad: "lcl", salida: "Cartagena", equipo: "", precio: 4690000, moneda: "COP", fecha: "2025-07-23" })
    ];
}

function logTarSemillaSeguro_() {
    return [
        logTarFila_({ id: "ifs-s-air", modalidad: "aerea", precio: 0.4, minimo: 75, fecha: "2026-10-08" }),
        logTarFila_({ id: "ifs-s-fcl", modalidad: "fcl", precio: 0.4, minimo: 75, fecha: "2026-10-06" }),
        logTarFila_({ id: "ifs-s-lcl", modalidad: "lcl", precio: 0.4, minimo: 60, fecha: "2025-07-23" })
    ];
}

function logTarSemillaOrigen_() {
    const air = "2026-10-08";
    const fcl = "2026-10-06";
    const lcl = "2025-07-23";
    return [
        logTarFila_({ id: "ifs-a-due-carrier", modalidad: "aerea", concepto: "Due Carrier", precio: 60, fecha: air }),
        logTarFila_({ id: "ifs-a-due-agent", modalidad: "aerea", concepto: "Due Agent", precio: 70, fecha: air }),
        logTarFila_({ id: "ifs-a-airport", modalidad: "aerea", concepto: "Airport Charges", forma: "variable", baseVar: "peso", precio: 0.05, minimo: 75, fecha: air }),
        logTarFila_({ id: "ifs-a-ams", modalidad: "aerea", concepto: "AMS", precio: 75, fecha: air }),
        logTarFila_({ id: "ifs-a-agencia", modalidad: "aerea", concepto: "Agenciamiento", forma: "variable", baseVar: "valor", precio: 0.35, minimo: 559300, moneda: "COP", fecha: air }),
        logTarFila_({ id: "ifs-a-sae", modalidad: "aerea", concepto: "SAE", precio: 49000, moneda: "COP", fecha: air }),
        logTarFila_({ id: "ifs-a-planilla", modalidad: "aerea", concepto: "Planilla", precio: 49000, moneda: "COP", fecha: air }),
        logTarFila_({ id: "ifs-a-operativos", modalidad: "aerea", concepto: "Gastos operativos", precio: 280000, moneda: "COP", fecha: air }),
        logTarFila_({ id: "ifs-a-camion", modalidad: "aerea", concepto: "Camión urbano", precio: 470000, moneda: "COP", fecha: air }),
        logTarFila_({ id: "ifs-f-doc", modalidad: "fcl", concepto: "Document fee", precio: 89.25, fecha: fcl }),
        logTarFila_({ id: "ifs-f-maniobras", modalidad: "fcl", concepto: "Maniobras", precio: 150, aplica: "contenedor", fecha: fcl }),
        logTarFila_({ id: "ifs-f-ams", modalidad: "fcl", concepto: "AMS", precio: 95, fecha: fcl }),
        logTarFila_({ id: "ifs-f-retiro", modalidad: "fcl", concepto: "Retiro en Bogotá", precio: 250, aplica: "contenedor", fecha: fcl }),
        logTarFila_({ id: "ifs-f-doccharge", modalidad: "fcl", concepto: "Document charge", precio: 60, fecha: fcl }),
        logTarFila_({ id: "ifs-f-security", modalidad: "fcl", concepto: "Security manifest", precio: 50, fecha: fcl }),
        logTarFila_({ id: "ifs-f-waybill", modalidad: "fcl", concepto: "Sea waybill", precio: 50, fecha: fcl }),
        logTarFila_({ id: "ifs-f-agencia", modalidad: "fcl", concepto: "Agenciamiento", forma: "variable", baseVar: "valor", precio: 0.35, minimo: 559300, moneda: "COP", fecha: fcl }),
        logTarFila_({ id: "ifs-f-sae", modalidad: "fcl", concepto: "SAE", precio: 49000, moneda: "COP", fecha: fcl }),
        logTarFila_({ id: "ifs-f-planilla", modalidad: "fcl", concepto: "Planilla", precio: 49000, moneda: "COP", fecha: fcl }),
        logTarFila_({ id: "ifs-f-operativos", modalidad: "fcl", concepto: "Gastos operativos", precio: 280000, moneda: "COP", fecha: fcl }),
        logTarFila_({ id: "ifs-f-solas", modalidad: "fcl", concepto: "SOLAS", precio: 90000, moneda: "COP", aplica: "contenedor", fecha: fcl }),
        logTarFila_({ id: "ifs-l-cons", modalidad: "lcl", concepto: "Consolidación", forma: "variable", baseVar: "wm", precio: 21.42, minimo: 101.15, maximo: 220.15, fecha: lcl }),
        logTarFila_({ id: "ifs-l-bl", modalidad: "lcl", concepto: "Emisión BL", precio: 71.4, fecha: lcl }),
        logTarFila_({ id: "ifs-l-mount", modalidad: "lcl", concepto: "Mounting", forma: "variable", baseVar: "wm", precio: 5, fecha: lcl }),
        logTarFila_({ id: "ifs-l-sprc", modalidad: "lcl", concepto: "Ingreso SPRC", precio: 50, fecha: lcl }),
        logTarFila_({ id: "ifs-l-handling", modalidad: "lcl", concepto: "Handling", precio: 60, fecha: lcl }),
        logTarFila_({ id: "ifs-l-solas", modalidad: "lcl", concepto: "SOLAS", precio: 59.5, fecha: lcl }),
        logTarFila_({ id: "ifs-l-admon", modalidad: "lcl", concepto: "Admon fee", precio: 50, fecha: lcl }),
        logTarFila_({ id: "ifs-l-trasbordo", modalidad: "lcl", concepto: "Trasbordo", forma: "variable", baseVar: "wm", precio: 19, fecha: lcl }),
        logTarFila_({ id: "ifs-l-booking", modalidad: "lcl", concepto: "Booking congestion", precio: 90, fecha: lcl }),
        logTarFila_({ id: "ifs-l-agencia", modalidad: "lcl", concepto: "Agenciamiento", forma: "variable", baseVar: "valor", precio: 0.35, minimo: 511700, moneda: "COP", fecha: lcl }),
        logTarFila_({ id: "ifs-l-sae", modalidad: "lcl", concepto: "SAE", precio: 53550, moneda: "COP", fecha: lcl }),
        logTarFila_({ id: "ifs-l-planilla", modalidad: "lcl", concepto: "Planilla", precio: 53550, moneda: "COP", fecha: lcl }),
        logTarFila_({ id: "ifs-l-operativos", modalidad: "lcl", concepto: "Gastos operativos", precio: 309400, moneda: "COP", fecha: lcl })
    ];
}

function logTarSemillaMiami_() {
    const fecha = "2025-04-08";
    const base = { modalidad: "aerea", pais: "Estados Unidos", ciudad: "Miami", fecha: fecha };
    return [
        logTarFila_(Object.assign({ id: "ifs-m-ams", concepto: "AMS", precio: 75 }, base)),
        logTarFila_(Object.assign({ id: "ifs-m-delivery", concepto: "Door delivery", precio: 350 }, base)),
        logTarFila_(Object.assign({ id: "ifs-m-handling", concepto: "Local handling", precio: 125 }, base)),
        logTarFila_(Object.assign({ id: "ifs-m-entry", concepto: "Customs entry", precio: 185 }, base)),
        logTarFila_(Object.assign({ id: "ifs-m-bond", concepto: "Single entry bond", forma: "variable", baseVar: "valor", precio: 0.85, minimo: 95 }, base)),
        logTarFila_(Object.assign({ id: "ifs-m-messenger", concepto: "Messenger", precio: 70 }, base)),
        logTarFila_(Object.assign({ id: "ifs-m-oper", concepto: "Operational charges", precio: 75 }, base))
    ];
}

function logTarSemillaSanJuan_() {
    const fecha = "2026-10-08";
    const base = { modalidad: "aerea", pais: "Puerto Rico", ciudad: "San Juan", fecha: fecha };
    const sobre = "Delivery, Warehouse Transfer";
    return [
        logTarFila_(Object.assign({ id: "ifs-sj-delivery", concepto: "Delivery", forma: "variable", baseVar: "peso", precio: 0.35, minimo: 150 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-transfer", concepto: "Warehouse Transfer", forma: "variable", baseVar: "peso", precio: 0.2, minimo: 70 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-fuel", concepto: "Fuel surcharge", forma: "variable", baseVar: "cargos", baseCargos: sobre, precio: 42 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-fuel2", concepto: "Emergency inland fuel", forma: "variable", baseVar: "cargos", baseCargos: sobre, precio: 29 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-handling", concepto: "Handling", precio: 125 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-tax", concepto: "Tax clearance", precio: 95 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-messenger", concepto: "Messenger fee", precio: 65 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-doc", concepto: "Doc turnover", precio: 50 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-thc", concepto: "Airline THC", precio: 175 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-oper", concepto: "Operational charges", precio: 60 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-entry", concepto: "Customs entry", precio: 175 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-cmsg", concepto: "Customs messenger", precio: 35 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-hmf", concepto: "Harbor maintenance fee", forma: "variable", baseVar: "valor", precio: 0.125 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-mpf", concepto: "Merchandise processing fee", forma: "variable", baseVar: "valor", precio: 0.3464, minimo: 31.67 }, base)),
        logTarFila_(Object.assign({ id: "ifs-sj-bond", concepto: "Single entry bond", forma: "variable", baseVar: "valor", precio: 0.7, minimo: 70 }, base))
    ];
}

function logTarCompletarDestino_() {
    const t = window.logTarifas;
    if (!t) return;
    if (!Array.isArray(t.destino)) t.destino = [];
    const hay = t.destino.some(function (f) {
        return logTarNorm_(f.pais) === "puerto rico" && logTarNorm_(f.ciudad) === "san juan" && f.modalidad === "aerea";
    });
    if (hay) return;
    logTarSemillaSanJuan_().forEach(function (f) { t.destino.push(f); });
}

function logTarConceptoClave_(s) {
    const n = logTarNorm_(s);
    const alias = {
        "door delivery": "delivery",
        "local handling": "handling",
        "customs entry services fee": "customs entry",
        "us customs messenger fee": "customs messenger",
        "customs messenger fee": "customs messenger",
        "single transaction bond": "single entry bond",
        "document turnover": "doc turnover",
        "harbour maintenance fee": "harbor maintenance fee"
    };
    return alias[n] || n;
}

function logTarConceptoIgual_(a, b) {
    const x = logTarConceptoClave_(a);
    const y = logTarConceptoClave_(b);
    return !!x && x === y;
}

function logTarNumCarta_(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    let s = String(v).trim().replace(/\s/g, "");
    if (!s) return null;
    if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0) s = s.replace(/,/g, "");
    else if (s.indexOf(",") >= 0) s = s.replace(",", ".");
    const n = Number(s);
    return isFinite(n) ? n : null;
}

function logTarCartaFuera_(concepto) {
    const n = logTarNorm_(concepto);
    return /section 301|\bduties\b|\barancel\b|flete aereo|air freight|due carrier|due agent|airport charge|seguro internacional|\bsae\b|planilla de traslado|camion urbano|gastos en origen|al costo/.test(n);
}

function logTarFechaCarta_(v) {
    const s = String(v || "").trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    const dma = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (dma) return dma[3] + "-" + ("0" + dma[2]).slice(-2) + "-" + ("0" + dma[1]).slice(-2);
    return (typeof logTarHoy_ === "function") ? logTarHoy_() : "";
}

function logTarFilaDesdeCarta_(item, meta) {
    const concepto = String(item && item.concepto || "").replace(/\s+/g, " ").trim();
    if (!concepto || logTarCartaFuera_(concepto)) return null;
    const precio = logTarNumCarta_(item.precio);
    if (!(precio > 0)) return null;
    const sobre = String(item.sobre || item.baseVar || "").toLowerCase();
    const formas = { peso: 1, volumen: 1, wm: 1, valor: 1, cargos: 1 };
    if (item.forma === "variable" && !formas[sobre]) return null;
    const variable = item.forma === "variable" || (!item.forma && !!formas[sobre]);
    const baseVar = variable ? sobre : "valor";
    const minimo = logTarNumCarta_(item.minimo);
    const fila = logTarFila_({
        concepto: concepto,
        modalidad: meta.modalidad,
        pais: meta.pais,
        ciudad: meta.ciudad,
        forma: variable ? "variable" : "fijo",
        baseVar: baseVar,
        precio: precio,
        minimo: minimo != null && minimo > 0 ? minimo : "",
        moneda: String(item.moneda || "USD").toUpperCase() === "COP" ? "COP" : "USD",
        proveedor: String(meta.proveedor || item.proveedor || "IFS").slice(0, 40),
        fecha: logTarFechaCarta_(item.fecha || meta.fecha),
        preferida: "S",
        aplica: "embarque"
    });
    if (fila.forma === "variable" && fila.baseVar === "cargos") {
        fila.baseCargos = String(item.baseCargos || "").split(/[,;]+/).map(function (x) { return x.trim(); }).filter(Boolean).join(", ");
        if (!fila.baseCargos) return null;
    }
    return fila;
}

function logTarNormalizarCarta_(raw, meta) {
    const lista = raw && Array.isArray(raw.cargos) ? raw.cargos : [];
    const vistos = [];
    const fuera = [];
    const filas = [];
    lista.forEach(function (item) {
        const concepto = String(item && item.concepto || "").trim();
        if (concepto && logTarCartaFuera_(concepto)) { fuera.push(concepto); return; }
        const fila = logTarFilaDesdeCarta_(item, {
            pais: meta.pais,
            ciudad: meta.ciudad,
            modalidad: meta.modalidad,
            proveedor: raw.proveedor || meta.proveedor,
            fecha: raw.fecha || meta.fecha
        });
        if (!fila) {
            if (concepto) fuera.push(concepto);
            return;
        }
        const prev = vistos.findIndex(function (f) { return logTarConceptoIgual_(f.concepto, fila.concepto); });
        if (prev >= 0) {
            filas[prev] = fila;
            vistos[prev] = fila;
            return;
        }
        vistos.push(fila);
        filas.push(fila);
    });
    return { filas: filas, fuera: fuera };
}

function logTarDestinoDeRuta_(pais, ciudad, mod) {
    return ((window.logTarifas && window.logTarifas.destino) || []).filter(function (f) {
        return String(f.modalidad || "") === mod && logTarMismoPais_(pais, f.pais) && logTarNorm_(f.ciudad) === logTarNorm_(ciudad);
    });
}

function logTarTxtFilaDestino_(f) {
    if (!f) return "";
    const forma = f.forma === "variable" ? (f.baseVar === "cargos" ? (f.precio + " % sobre " + (f.baseCargos || "")) : (f.baseVar === "peso" ? (f.precio + " / kg") : (f.baseVar === "valor" ? (f.precio + " %") : (f.precio + " / " + f.baseVar)))) : String(f.precio);
    const min = f.minimo !== "" && f.minimo != null ? (", mín. " + f.minimo) : "";
    return f.concepto + " · " + forma + " " + (f.moneda || "USD") + min;
}

function logTarDestinoCruzar_(pais, ciudad, mod, filasNuevas) {
    const actuales = logTarDestinoDeRuta_(pais, ciudad, mod);
    const usados = {};
    const actualiza = [];
    const agrega = [];
    filasNuevas.forEach(function (nuevo) {
        const prev = actuales.filter(function (f) { return !usados[f.id] && logTarConceptoIgual_(f.concepto, nuevo.concepto); });
        if (!prev.length) { agrega.push(nuevo); return; }
        usados[prev[0].id] = 1;
        prev.slice(1).forEach(function (extra) { usados[extra.id] = "dup"; });
        const igual = Number(prev[0].precio) === Number(nuevo.precio)
            && String(prev[0].forma || "fijo") === nuevo.forma
            && String(prev[0].baseVar || "") === String(nuevo.baseVar || "")
            && String(prev[0].minimo == null ? "" : prev[0].minimo) === String(nuevo.minimo == null ? "" : nuevo.minimo)
            && String(prev[0].moneda || "USD") === nuevo.moneda
            && logTarNorm_(prev[0].baseCargos || "") === logTarNorm_(nuevo.baseCargos || "");
        actualiza.push({ antes: prev[0], despues: nuevo, igual: igual, duplicados: prev.slice(1) });
    });
    const quita = actuales.filter(function (f) { return !usados[f.id] || usados[f.id] === "dup"; });
    return { actualiza: actualiza, agrega: agrega, quita: quita };
}

function logTarDestinoAplicarCarta_(pais, ciudad, mod, cruce) {
    const t = window.logTarifas;
    if (!t || !Array.isArray(t.destino) || !cruce) return { n: 0 };
    const quitar = {};
    (cruce.quita || []).forEach(function (f) { if (f && f.id) quitar[f.id] = 1; });
    (cruce.actualiza || []).forEach(function (x) {
        (x.duplicados || []).forEach(function (d) { if (d && d.id) quitar[d.id] = 1; });
        const row = t.destino.find(function (f) { return f.id === x.antes.id; });
        if (!row) return;
        ["concepto", "forma", "baseVar", "baseCargos", "precio", "minimo", "moneda", "proveedor", "fecha", "aplica"].forEach(function (k) {
            if (x.despues[k] != null) row[k] = x.despues[k];
        });
        if (row.forma !== "variable" || row.baseVar !== "cargos") row.baseCargos = "";
        row.preferida = "S";
        row.pais = pais;
        row.ciudad = ciudad;
        row.modalidad = mod;
    });
    (cruce.agrega || []).forEach(function (f) {
        f.id = (typeof logTarId_ === "function") ? logTarId_() : ("lt" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36));
        f.pais = pais;
        f.ciudad = ciudad;
        f.modalidad = mod;
        f.preferida = "S";
        t.destino.push(f);
    });
    t.destino = t.destino.filter(function (f) { return !quitar[f.id]; });
    const vistos = {};
    t.destino = t.destino.filter(function (f) {
        if (!logTarMismoPais_(pais, f.pais) || logTarNorm_(f.ciudad) !== logTarNorm_(ciudad) || String(f.modalidad || "") !== mod) return true;
        const clave = logTarConceptoClave_(f.concepto);
        if (vistos[clave]) return false;
        vistos[clave] = 1;
        return true;
    });
    return { n: (cruce.agrega || []).length + (cruce.actualiza || []).length };
}

function logTarGrupo_(tab, f) {
    const n = logTarNorm_;
    if (tab === "origen") return String(f.modalidad || "") + "|" + n(f.concepto);
    if (tab === "interno") {
        if (f.modalidad === "lcl" && f.cobro === "escala") return "lcl|escala|" + n(f.salida) + "|" + String(f.desde == null ? "" : f.desde) + "|" + String(f.hasta == null ? "" : f.hasta);
        return String(f.modalidad || "") + "|" + String(f.equipo || "");
    }
    if (tab === "aereo") return n(f.pais) + "|" + n(f.ciudad);
    if (tab === "fcl") return n(f.pais) + "|" + n(f.puerto) + "|" + String(f.equipo || "");
    if (tab === "lcl") return n(f.pais) + "|" + n(f.puerto);
    if (tab === "seguro") return String(f.modalidad || "");
    if (tab === "destino") return n(f.pais) + "|" + n(f.ciudad) + "|" + String(f.modalidad || "") + "|" + n(f.concepto);
    return String(f.id || "");
}

function logTarMeses_() {
    const el = document.getElementById("cfgLogMeses");
    const n = Number(el && el.value !== "" ? el.value : ((typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.logMeses) || 6));
    return n > 0 ? n : 6;
}

function logTarTrm_() {
    const el = document.getElementById("cfgLogTrm");
    let n = Number(el && el.value !== "" ? el.value : ((typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.logTrm) || 0));
    /* Cotización abierta: usar la TRM del documento si Ajustes no la tiene. */
    if (!(n > 0) && logQuote && Number(logQuote.trm) > 0) n = Number(logQuote.trm);
    if (!(n > 0)) {
        const inp = document.getElementById("logTRM");
        const m = Number(inp && inp.value);
        if (m > 0) n = m;
    }
    return n > 0 ? n : 0;
}

function logTarUsd_(precio, moneda) {
    if (precio === "" || precio == null) return null;
    const n = Number(precio);
    if (!isFinite(n)) return null;
    if (String(moneda || "USD").toUpperCase() !== "COP") return n;
    const trm = logTarTrm_();
    if (!(trm > 0)) return null;
    return n / trm;
}

function logTarFecha_(f) {
    const m = String((f && f.fecha) || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function logTarVieja_(f) {
    const fecha = logTarFecha_(f);
    if (!fecha) return false;
    fecha.setMonth(fecha.getMonth() + logTarMeses_());
    return fecha.getTime() < Date.now();
}

function logTarFechaTxt_(f) {
    const m = String((f && f.fecha) || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
}

function logTarAvisoFecha_(f) {
    if (!logTarVieja_(f)) return "";
    return "Tarifa del " + logTarFechaTxt_(f) + ". Sigue en uso. Conviene cotizar de nuevo.";
}

function logTarSi_(a, b) {
    const x = logTarNorm_(a);
    const y = logTarNorm_(b);
    if (!x || !y) return false;
    return x.indexOf(y) >= 0 || y.indexOf(x) >= 0;
}

function logTarPreferidas_(lista) {
    return (lista || []).filter(function (f) { return f.preferida === "S"; });
}

function logTarCtx_(e, cub, valor, escId) {
    const st = escId && e ? logEnvEscDe_(e, escId) : null;
    const c = (st ? st.contenedores : (e && e.contenedores)) || {};
    const kg = Math.max(Number(cub && cub.pesoKg) || 0, Number(cub && cub.kgVol) || 0);
    const m3 = Number(cub && cub.m3) || 0;
    const c20 = Number(c.c20) || 0;
    const c40 = Number(c.c40) || 0;
    const c40hc = Number(c.c40hc) || 0;
    const emb = parseInt(st ? st.embarques : (e && e.embarques), 10);
    return {
        kg: kg, pesoReal: Number(cub && cub.pesoKg) || 0, m3: m3, ton: kg / 1000, valor: Number(valor) || 0,
        c20: c20, c40: c40, c40hc: c40hc, contN: c20 + c40 + c40hc,
        embarques: isFinite(emb) && emb > 0 ? emb : 1
    };
}

function logTarExwCotizacion_(escId) {
    try {
        const idioma = (typeof logisticaLeerOpciones_ === "function" && logisticaLeerOpciones_().idioma) || "es";
        const pres = logEnvPresentacion_(idioma);
        const keys = Object.keys(pres.prod || {});
        let monto = 0;
        if (escId && keys.indexOf(escId) >= 0) {
            monto = Number(pres.prod[escId]) || 0;
        } else if (!escId || escId === "") {
            /* Sin opción: suma productos ("" o rangos r:uid). */
            keys.forEach(function (k) {
                if (k === "" || String(k).indexOf("r:") === 0) monto += Number(pres.prod[k]) || 0;
            });
            if (!(monto > 0) && keys[0]) monto = Number(pres.prod[keys[0]]) || 0;
        } else if (keys[0]) {
            monto = Number(pres.prod[keys[0]]) || 0;
        }
        return { monto: isFinite(monto) ? monto : 0, moneda: logQuote && logQuote.moneda === "USD" ? "USD" : "COP" };
    } catch (e) { return { monto: 0, moneda: "USD" }; }
}

function logTarValorMercancia_(escId) {
    const exw = logTarExwCotizacion_(escId);
    if (!(exw.monto > 0)) return 0;
    if (exw.moneda === "USD") return exw.monto;
    const trm = logTarTrm_();
    return trm > 0 ? exw.monto / trm : 0;
}

function logTarCargoVariable_(f, ctx) {
    if (f.baseVar === "cargos") return { falta: "El porcentaje sobre otros cargos se liquida en Destino." };
    const pct = Number(f.precio);
    if (f.baseVar === "peso") {
        const usd = logTarUsd_(f.precio, f.moneda);
        if (usd == null) return { faltaTrm: true };
        if (!(ctx.kg > 0)) return { falta: "Falta el peso para " + (f.concepto || "este cargo") + "." };
        return { usd: usd * ctx.kg };
    }
    if (f.baseVar === "volumen") {
        const usd = logTarUsd_(f.precio, f.moneda);
        if (usd == null) return { faltaTrm: true };
        if (!(ctx.m3 > 0)) return { falta: "Falta el volumen para " + (f.concepto || "este cargo") + "." };
        return { usd: usd * ctx.m3 };
    }
    if (f.baseVar === "wm") {
        const usd = logTarUsd_(f.precio, f.moneda);
        if (usd == null) return { faltaTrm: true };
        const wm = Math.max(ctx.ton || 0, ctx.m3 || 0);
        if (!(wm > 0)) return { falta: "Falta el peso o el volumen para " + (f.concepto || "este cargo") + "." };
        return { usd: usd * wm };
    }
    if (!isFinite(pct)) return { falta: "Falta el porcentaje de " + (f.concepto || "este cargo") + "." };
    if (!(ctx.valor > 0)) return { falta: "Falta el valor de la mercancía para " + (f.concepto || "este cargo") + "." };
    return { usd: ctx.valor * pct / 100 };
}

function logTarCargoFijo_(f, ctx, veces) {
    const usd = logTarUsd_(f.precio, f.moneda);
    if (usd == null) return { faltaTrm: true };
    let n = Math.max(1, parseInt(ctx && ctx.embarques, 10) || 1);
    /* Destino/origen: Contenedor 20 / 40 / 40HC / 40+40HC → solo ese equipo (evita cobrar doble DTHC). */
    const eqTar = String(f.equipo || "").toLowerCase().replace(/\s+/g, "");
    if (eqTar === "20" || eqTar === "40" || eqTar === "40hc" || eqTar === "40/40hc" || eqTar === "40+40hc") {
        if (eqTar === "20") n = Number(ctx.c20) || 0;
        else if (eqTar === "40") n = Number(ctx.c40) || 0;
        else if (eqTar === "40hc") n = Number(ctx.c40hc) || 0;
        else n = (Number(ctx.c40) || 0) + (Number(ctx.c40hc) || 0);
        if (!(n > 0)) return { skip: true };
    } else if (f.aplica === "contenedor") {
        n = veces != null ? veces : ctx.contN;
        if (!(n > 0)) return { falta: "Falta la cantidad de contenedores para " + (f.concepto || "este cargo") + "." };
    }
    return { usd: usd * n };
}

function logTarConMinimo_(usd, f) {
    if (usd == null) return null;
    if (f.minimo === "" || f.minimo == null) return usd;
    const min = logTarUsd_(f.minimo, f.moneda);
    if (min == null) return null;
    return usd < min ? min : usd;
}

function logTarLiquidarFila_(f, ctx) {
    if (f.forma === "variable" && f.baseVar === "cargos") return { falta: "El porcentaje sobre otros cargos se liquida en Destino." };
    const r = (f.forma === "variable") ? logTarCargoVariable_(f, ctx) : logTarCargoFijo_(f, ctx);
    if (r.skip || r.faltaTrm || r.falta) return r;
    let usd = logTarConMinimo_(r.usd, f);
    if (usd == null) return { falta: "Falta la TRM en Ajustes para el mínimo de " + (f.concepto || "este cargo") + "." };
    if (f.maximo !== "" && f.maximo != null) {
        const max = logTarUsd_(f.maximo, f.moneda);
        if (max == null) return { falta: "Falta la TRM en Ajustes para el máximo de " + (f.concepto || "este cargo") + "." };
        if (usd > max) usd = max;
    }
    return { usd: usd };
}

function logTarSumarConceptos_(filas, ctx, notas) {
    let suma = 0;
    let uso = 0;
    let trm = false;
    filas.forEach(function (f) {
        const r = logTarLiquidarFila_(f, ctx);
        if (r.skip) return;
        if (r.faltaTrm) { trm = true; return; }
        if (r.falta) { notas.push(r.falta); return; }
        const usd = r.usd;
        suma += usd;
        uso += 1;
        const av = logTarAvisoFecha_(f);
        const cita = (f.concepto || "Cargo") + (f.proveedor ? " · " + f.proveedor : "");
        notas.push(av ? cita + ". " + av : cita);
    });
    return { suma: suma, uso: uso, trm: trm };
}

function logTarFilasMod_(filas, mod) {
    const pref = logTarPreferidas_(filas).filter(function (f) {
        return f.modalidad === mod || f.modalidad === "todas";
    });
    const propios = {};
    pref.forEach(function (f) {
        if (f.modalidad === mod) propios[logTarNorm_(f.concepto)] = 1;
    });
    return pref.filter(function (f) {
        return f.modalidad === mod || !propios[logTarNorm_(f.concepto)];
    });
}

function logTarAplicarOrigen_(e, ctx, notas) {
    /* DTHC es un cargo de destino, no de origen (validado por Edwin, 22 oct 2026): no se liquida en Origen
       aunque la fila siga cargada en Ajustes. La semilla ya no lo trae; en Ajustes se puede borrar la fila. */
    const filas = logTarFilasMod_(logTarAsegurar_().origen, e.modalidad).filter(function (f) {
        return logTarNorm_(f.concepto).indexOf("dthc") !== 0;
    });
    if (!filas.length) return { suma: 0, uso: 0 };
    return logTarSumarConceptos_(filas, ctx, notas);
}

function logTarKgInternoLcl_(f, ctx) {
    const factor = Number(f.factor);
    const kgM3 = isFinite(factor) && factor > 0 ? factor : 400;
    const real = Number(ctx.pesoReal) || 0;
    const vol = (Number(ctx.m3) || 0) * kgM3;
    return { kgM3: kgM3, real: real, vol: vol, fact: Math.max(real, vol), porVol: vol > 0 && vol >= real };
}

function logTarInternoLclUnitario_(f) {
    return f.cobro === "kg";
}

function logTarNotaKgInterno_(k, ctx) {
    return k.porVol
        ? ("volumen " + (Math.round((Number(ctx.m3) || 0) * 100) / 100) + " m³ × " + k.kgM3 + " kg")
        : ("peso real " + (Math.round(k.real * 100) / 100) + " kg");
}

function logTarAplicarInternoLclEscala_(filas, ctx, notas) {
    const muestra = logTarKgInternoLcl_(filas[0], ctx);
    if (!(muestra.fact > 0)) {
        notas.push("Falta el volumen o el peso para el flete interno LCL.");
        return { suma: 0, uso: 0 };
    }
    const hits = [];
    filas.forEach(function (f) {
        const k = logTarKgInternoLcl_(f, ctx);
        const desde = f.desde === "" || f.desde == null ? 0 : Number(f.desde);
        const hasta = f.hasta === "" || f.hasta == null ? Infinity : Number(f.hasta);
        if (!isFinite(desde) || !isFinite(hasta) || hasta < desde) return;
        if (k.fact >= desde && k.fact <= hasta) hits.push({ f: f, k: k, desde: desde });
    });
    if (!hits.length) {
        notas.push("No hay escala de flete interno LCL para " + (Math.round(muestra.fact * 100) / 100) + " kg facturables (" + logTarNotaKgInterno_(muestra, ctx) + ").");
        return { suma: 0, uso: 0 };
    }
    hits.sort(function (a, b) { return a.desde - b.desde; });
    const hit = hits[hits.length - 1];
    const f = hit.f;
    const precio = Number(f.precio);
    if (!(precio > 0)) {
        notas.push("Falta el precio de la escala " + (f.desde || 0) + "–" + (f.hasta || "") + " kg.");
        return { suma: 0, uso: 0 };
    }
    const usd = logTarUsd_(precio, f.moneda);
    if (usd == null) {
        notas.push("Falta la TRM en Ajustes para pasar COP a USD.");
        return { suma: 0, uso: 0 };
    }
    const av = logTarAvisoFecha_(f);
    notas.push((f.salida || "Puerto") + " · escala " + (f.desde || 0) + "–" + (f.hasta === "" || f.hasta == null ? "…" : f.hasta) + " kg · " + logTarNotaKgInterno_(hit.k, ctx) + (f.proveedor ? " · " + f.proveedor : "") + (av ? ". " + av : ""));
    return { suma: usd, uso: 1 };
}

function logTarAplicarInternoLcl_(filas, ctx, notas) {
    const escalas = filas.filter(function (f) { return f.cobro === "escala"; });
    if (escalas.length) return logTarAplicarInternoLclEscala_(escalas, ctx, notas);
    const unit = filas.filter(logTarInternoLclUnitario_);
    if (!unit.length) {
        return logTarSumarConceptos_(filas.map(function (f) { return Object.assign({}, f, { forma: "fijo", aplica: "embarque", concepto: f.salida || "Flete interno" }); }), ctx, notas);
    }
    const f = unit[0];
    const precio = Number(f.precio);
    const tope = String(f.moneda || "USD").toUpperCase() === "COP" ? 100000 : 30;
    if (isFinite(precio) && precio >= tope) {
        notas.push("El precio del flete interno LCL parece un viaje completo, no una tarifa por kg. Escribe la tarifa por kg o déjalo en Cobro Viaje.");
        return { suma: 0, uso: 0 };
    }
    const k = logTarKgInternoLcl_(f, ctx);
    if (!(k.fact > 0)) {
        notas.push("Falta el volumen o el peso para el flete interno LCL.");
        return { suma: 0, uso: 0 };
    }
    if (!(precio > 0)) {
        notas.push("Falta la tarifa por kg del flete interno LCL.");
        return { suma: 0, uso: 0 };
    }
    const rate = logTarUsd_(precio, f.moneda);
    if (rate == null) {
        notas.push("Falta la TRM en Ajustes para pasar COP a USD.");
        return { suma: 0, uso: 0 };
    }
    const calculado = rate * k.fact;
    const usd = logTarConMinimo_(calculado, f);
    if (usd == null) {
        notas.push("Falta la TRM en Ajustes para el mínimo del flete interno LCL.");
        return { suma: 0, uso: 0 };
    }
    const av = logTarAvisoFecha_(f);
    const baseTxt = logTarNotaKgInterno_(k, ctx);
    const minTxt = usd > calculado + 0.0001 ? " · mínimo" : "";
    notas.push((f.salida || "Puerto") + " · " + baseTxt + minTxt + (f.proveedor ? " · " + f.proveedor : "") + (av ? ". " + av : ""));
    if (unit.length > 1) notas.push("Hay otro flete interno LCL preferido. Entré el primero.");
    return { suma: usd, uso: 1 };
}

function logTarAplicarInterno_(e, ctx, notas) {
    const filas = logTarPreferidas_(logTarAsegurar_().interno).filter(function (f) {
        return f.modalidad === e.modalidad;
    });
    if (!filas.length) return { suma: 0, uso: 0 };
    if (e.modalidad === "lcl") return logTarAplicarInternoLcl_(filas, ctx, notas);
    if (e.modalidad !== "fcl") {
        return logTarSumarConceptos_(filas.map(function (f) { return Object.assign({}, f, { forma: "fijo", aplica: "embarque", concepto: f.salida || "Flete interno" }); }), ctx, notas);
    }
    let suma = 0;
    let uso = 0;
    let trm = false;
    ["20", "40", "40hc"].forEach(function (eq) {
        const n = eq === "20" ? ctx.c20 : (eq === "40" ? ctx.c40 : ctx.c40hc);
        if (!(n > 0)) return;
        const row = filas.find(function (f) { return String(f.equipo) === eq; });
        if (!row) {
            notas.push("No hay flete interno preferido para contenedor " + eq + ".");
            return;
        }
        const usd = logTarUsd_(row.precio, row.moneda);
        if (usd == null) { trm = true; return; }
        suma += usd * n;
        uso += 1;
        const av = logTarAvisoFecha_(row);
        notas.push((row.salida || "Puerto") + " · " + eq + (row.proveedor ? " · " + row.proveedor : "") + (av ? ". " + av : ""));
    });
    if (trm) notas.push("Falta la TRM en Ajustes para pasar COP a USD.");
    return { suma: suma, uso: uso };
}

function logTarCorteAereo_(kg) {
    if (kg >= 500) return { k: "r500", et: "+500" };
    if (kg >= 300) return { k: "r300", et: "+300" };
    if (kg >= 100) return { k: "r100", et: "+100" };
    return { k: "r45", et: "+45" };
}

function logTarRangoAereo_(f, kg) {
    const corte = logTarCorteAereo_(kg);
    const v = f[corte.k];
    if (v !== "" && v != null && isFinite(Number(v))) return { rate: Number(v), corte: corte.k, et: corte.et };
    return { rate: null, corte: corte.k, et: corte.et, falta: true };
}

function logTarAvisoRango_() {
    const e = typeof logEnv_ === "function" ? logEnv_() : null;
    if (!e || e.modalidad !== "aerea") return "";
    const ciudad = String(e.destinoCiudad || "").trim();
    const pais = String(e.destinoPais || "").trim();
    if (!ciudad || !pais) return "";
    const cub = typeof logCubicajeTotal_ === "function" ? logCubicajeTotal_("es") : { pesoKg: 0, kgVol: 0 };
    const kg = Math.max(Number(cub.pesoKg) || 0, Number(cub.kgVol) || 0);
    if (!(kg > 0)) return "";
    logTarAsegurar_();
    const filas = logTarPreferidas_(logTarAsegurar_().aereo).filter(function (f) {
        return logTarMismoPais_(pais, f.pais) && logTarSi_(ciudad, f.ciudad);
    });
    if (!filas.length) return "";
    const rango = logTarRangoAereo_(filas[0], kg);
    if (!rango.falta) return "";
    const kgTxt = (Math.round(kg * 100) / 100).toLocaleString("es-CO");
    return "Falta la tarifa " + rango.et + " para " + ciudad + ", " + pais + ". Con " + kgTxt + " kg ese es el rango que aplica. Llénala en Ajustes → Logística → Aéreo. No se usa otro rango.";
}

function logTarAplicarAereo_(e, ctx, notas) {
    const filas = logTarPreferidas_(logTarAsegurar_().aereo).filter(function (f) {
        return logTarMismoPais_(e.destinoPais || e.destinoCodigo, f.pais) && logTarSi_(e.destinoCiudad, f.ciudad);
    });
    if (!filas.length) return { suma: 0, uso: 0 };
    if (!(ctx.kg > 0)) {
        notas.push("Falta el peso para el flete aéreo.");
        return { suma: 0, uso: 0 };
    }
    const f = filas[0];
    const rango = logTarRangoAereo_(f, ctx.kg);
    if (!rango || rango.falta || !isFinite(rango.rate)) {
        notas.push("Falta la tarifa " + ((rango && rango.et) || "") + " para " + (e.destinoCiudad || "esta ciudad") + (e.destinoPais ? ", " + e.destinoPais : "") + ". Llénala en Ajustes → Logística → Aéreo.");
        return { suma: 0, uso: 0 };
    }
    let rate = logTarUsd_(rango.rate, f.moneda);
    if (rate == null) {
        notas.push("Falta la TRM en Ajustes para pasar COP a USD.");
        return { suma: 0, uso: 0 };
    }
    let usd = logTarConMinimo_(rate * ctx.kg, f);
    if (usd == null) {
        notas.push("Falta la TRM en Ajustes para el mínimo del flete aéreo.");
        return { suma: 0, uso: 0 };
    }
    if (f.fsIncluido !== "S") {
        const fs = logTarUsd_(f.fsKg, f.moneda);
        if (fs == null && f.fsKg !== "" && f.fsKg != null) {
            notas.push("Falta la TRM para el recargo de combustible.");
        } else if (fs) usd += fs * ctx.kg;
    }
    const av = logTarAvisoFecha_(f);
    notas.push((f.ciudad || "Destino") + " · " + (rango.et || "+45") + " kg" + (f.aerolinea ? " · " + f.aerolinea : "") + (f.proveedor ? " · " + f.proveedor : "") + (av ? ". " + av : ""));
    if (filas.length > 1) notas.push("Hay otra ruta preferida al mismo destino. Entré la primera.");
    return { suma: usd, uso: 1 };
}

function logTarOtrosUsd_(f, veces, notas) {
    let s = 0;
    (f.otros || []).forEach(function (o) {
        if (!o || o.precio === "" || o.precio == null) return;
        const usd = logTarUsd_(o.precio, o.moneda || f.moneda);
        if (usd == null) {
            notas.push("Falta la TRM para " + (o.nombre || "un cargo del flete") + ".");
            return;
        }
        s += usd * veces;
        if (o.nombre) notas.push(o.nombre);
    });
    return s;
}

function logTarAplicarFcl_(e, ctx, notas) {
    const filas = logTarPreferidas_(logTarAsegurar_().fcl).filter(function (f) {
        return logTarMismoPais_(e.destinoPais || e.destinoCodigo, f.pais) && logTarSi_(e.destinoPuerto || e.destinoCiudad, f.puerto);
    });
    if (!filas.length) return { suma: 0, uso: 0 };
    let suma = 0;
    let uso = 0;
    ["20", "40", "40hc"].forEach(function (eq) {
        const n = eq === "20" ? ctx.c20 : (eq === "40" ? ctx.c40 : ctx.c40hc);
        if (!(n > 0)) return;
        const row = filas.find(function (f) { return String(f.equipo) === eq; });
        if (!row) {
            notas.push("No hay flete FCL preferido " + eq + " para este puerto.");
            return;
        }
        const usd = logTarUsd_(row.precio, row.moneda);
        if (usd == null) {
            notas.push("Falta la TRM en Ajustes para pasar COP a USD.");
            return;
        }
        suma += usd * n + logTarOtrosUsd_(row, n, notas);
        uso += 1;
        const av = logTarAvisoFecha_(row);
        notas.push((row.puerto || "Puerto") + " · " + eq + (row.naviera ? " · " + row.naviera : "") + (row.proveedor ? " · " + row.proveedor : "") + (av ? ". " + av : ""));
    });
    return { suma: suma, uso: uso };
}

function logTarAplicarLcl_(e, ctx, notas) {
    const filas = logTarPreferidas_(logTarAsegurar_().lcl).filter(function (f) {
        return logTarMismoPais_(e.destinoPais || e.destinoCodigo, f.pais) && logTarSi_(e.destinoPuerto || e.destinoCiudad, f.puerto);
    });
    if (!filas.length) return { suma: 0, uso: 0 };
    const f = filas[0];
    const wm = Math.max(ctx.ton, ctx.m3);
    if (!(wm > 0)) {
        notas.push("Falta el peso o el volumen para el flete LCL.");
        return { suma: 0, uso: 0 };
    }
    const rate = logTarUsd_(f.precio, f.moneda);
    if (rate == null) {
        notas.push("Falta la TRM en Ajustes para pasar COP a USD.");
        return { suma: 0, uso: 0 };
    }
    const usd = logTarConMinimo_(rate * wm, f);
    if (usd == null) {
        notas.push("Falta la TRM en Ajustes para el mínimo del flete LCL.");
        return { suma: 0, uso: 0 };
    }
    const av = logTarAvisoFecha_(f);
    notas.push((f.puerto || "Puerto") + " · mayor entre " + (Math.round(ctx.ton * 100) / 100) + " ton y " + (Math.round(ctx.m3 * 100) / 100) + " m³" + (f.proveedor ? " · " + f.proveedor : "") + (av ? ". " + av : ""));
    return { suma: usd, uso: 1 };
}

function logTarAplicarSeguro_(e, ctx, notas) {
    const filas = logTarPreferidas_(logTarAsegurar_().seguro).filter(function (f) { return f.modalidad === e.modalidad; });
    if (!filas.length) return { suma: 0, uso: 0 };
    const f = filas[0];
    if (!(ctx.valor > 0)) {
        notas.push("Falta el valor de la mercancía para el seguro.");
        return { suma: 0, uso: 0 };
    }
    const pct = Number(f.precio);
    if (!isFinite(pct)) return { suma: 0, uso: 0 };
    const usd = logTarConMinimo_(ctx.valor * pct / 100, f);
    if (usd == null) {
        notas.push("Falta la TRM para el mínimo del seguro.");
        return { suma: 0, uso: 0 };
    }
    const av = logTarAvisoFecha_(f);
    notas.push("Seguro " + pct + " %" + (f.proveedor ? " · " + f.proveedor : "") + (av ? ". " + av : ""));
    return { suma: usd, uso: 1 };
}

function logTarCargosBase_(f, montos) {
    const tokens = String(f.baseCargos || "").split(/[,;]+/).map(function (s) { return logTarNorm_(s); }).filter(Boolean);
    if (!tokens.length) return { falta: "Indica sobre qué cargos va el porcentaje de " + (f.concepto || "este cargo") + "." };
    let base = 0;
    let n = 0;
    Object.keys(montos).forEach(function (nom) {
        const ok = tokens.some(function (t) { return nom === t || (t.length >= 4 && nom.indexOf(t) >= 0); });
        if (!ok || montos[nom] == null) return;
        base += montos[nom];
        n += 1;
    });
    if (!n) return { falta: "No encontré " + f.baseCargos + " para calcular " + (f.concepto || "este cargo") + "." };
    return { base: base };
}

function logTarNotaDestino_(f, extra) {
    const av = logTarAvisoFecha_(f);
    const cita = (f.concepto || "Cargo") + (extra ? " · " + extra : "") + (f.proveedor ? " · " + f.proveedor : "");
    return av ? cita + ". " + av : cita;
}

function logTarDetalleDestino_(f) {
    if (f.forma !== "variable") return "";
    if (f.baseVar === "peso") return f.precio + " / kg";
    if (f.baseVar === "volumen") return f.precio + " / m³";
    if (f.baseVar === "wm") return f.precio + " / ton o m³";
    if (f.baseVar === "cargos") return f.precio + " % sobre " + (f.baseCargos || "otros cargos");
    return f.precio + " %";
}

function logTarAplicarDestino_(e, ctx, notas) {
    const filas = logTarFilasMod_(logTarAsegurar_().destino, e.modalidad).filter(function (f) {
        return logTarMismoPais_(e.destinoPais || e.destinoCodigo, f.pais) && logTarSi_(e.destinoCiudad, f.ciudad);
    });
    if (!filas.length) return { suma: 0, uso: 0 };
    const montos = {};
    const listos = {};
    let suma = 0;
    let uso = 0;
    filas.forEach(function (f) {
        if (f.forma === "variable" && f.baseVar === "cargos") return;
        const r = logTarLiquidarFila_(f, ctx);
        if (r.skip) return;
        if (r.faltaTrm || r.falta) { notas.push(r.falta || "Falta la TRM en Ajustes para pasar COP a USD."); return; }
        const key = logTarNorm_(f.concepto);
        montos[key] = (montos[key] || 0) + r.usd;
        listos[f.id] = r.usd;
        suma += r.usd;
        uso += 1;
    });
    const sobre = {};
    filas.forEach(function (f) {
        if (!(f.forma === "variable" && f.baseVar === "cargos")) return;
        const b = logTarCargosBase_(f, montos);
        if (b.falta) { notas.push(b.falta); return; }
        const pct = Number(f.precio);
        if (!isFinite(pct)) { notas.push("Falta el porcentaje de " + (f.concepto || "este cargo") + "."); return; }
        let usd = logTarConMinimo_(b.base * pct / 100, f);
        if (usd == null) { notas.push("Falta la TRM en Ajustes para el mínimo de " + (f.concepto || "este cargo") + "."); return; }
        sobre[f.id] = usd;
        suma += usd;
        uso += 1;
    });
    filas.forEach(function (f) {
        if (listos[f.id] == null && sobre[f.id] == null) return;
        notas.push(logTarNotaDestino_(f, logTarDetalleDestino_(f)));
    });
    return { suma: suma, uso: uso };
}

function logTarAplicarTipo_(tipo, e, ctx, notas) {
    if (tipo === "origen") return logTarAplicarOrigen_(e, ctx, notas);
    if (tipo === "flete_interno") return logTarAplicarInterno_(e, ctx, notas);
    if (tipo === "flete_principal" && e.modalidad === "aerea") return logTarAplicarAereo_(e, ctx, notas);
    if (tipo === "flete_principal" && e.modalidad === "fcl") return logTarAplicarFcl_(e, ctx, notas);
    if (tipo === "flete_principal" && e.modalidad === "lcl") return logTarAplicarLcl_(e, ctx, notas);
    if (tipo === "seguro") return logTarAplicarSeguro_(e, ctx, notas);
    if (tipo === "destino") return logTarAplicarDestino_(e, ctx, notas);
    return { suma: 0, uso: 0 };
}

function logTarSimularDestino_(inp) {
    logTarAsegurar_();
    const e = {
        modalidad: inp.modalidad || "fcl",
        destinoPais: inp.pais || "",
        destinoCiudad: inp.ciudad || "",
        destinoPuerto: inp.puerto || "",
        contenedores: { c20: Number(inp.c20) || 0, c40: Number(inp.c40) || 0, c40hc: Number(inp.c40hc) || 0 }
    };
    const ctx = logTarCtx_(e, { pesoKg: Number(inp.kg) || 0, kgVol: 0, m3: Number(inp.m3) || 0 }, inp.valor);
    const notas = [];
    const r = logTarAplicarDestino_(e, ctx, notas);
    return { total: Math.round((r.suma || 0) * 100) / 100, notas: notas, uso: r.uso || 0 };
}

/**
 * Simula Duties/Taxes con cifras a mano (misma lógica de bases EXW / CIF / CIF+DUTY).
 * inp: { pais, partida, exw, flete, seguro, origen }
 */
function logAraSimular_(inp) {
    const pais = String((inp && inp.pais) || "").trim();
    const partida = logPartidaFmt_((inp && inp.partida) || "");
    const exw = Number(inp && inp.exw) || 0;
    const flete = Number(inp && inp.flete) || 0;
    const seguro = Number(inp && inp.seguro) || 0;
    const origen = Number(inp && inp.origen) || 0;
    const notas = [];
    if (!pais) return { duties: null, taxes: null, total: 0, notas: ["Elige el país."], uso: 0 };
    if (!partida || logArancelDigitos_(partida).length < 6) return { duties: null, taxes: null, total: 0, notas: ["Elige la partida."], uso: 0 };
    if (!(exw > 0)) return { duties: null, taxes: null, total: 0, notas: ["Indica el valor de la mercancía (EXW)."], uso: 0 };
    const filas = ((logAranceles && logAranceles.filas) || []).filter(function (r) { return logPaisArancelMatch_(r, pais); });
    if (!filas.length) return { duties: null, taxes: null, total: 0, notas: ["No hay filas de Aranceles para " + pais + "."], uso: 0 };
    const hit = logArancelBuscar_(filas, partida);
    if (!hit) return { duties: null, taxes: null, total: 0, notas: ["No hay tasa para la partida " + partida + " en " + pais + "."], uso: 0 };
    if (hit.ambiguo) return { duties: null, taxes: null, total: 0, notas: ["Hay más de una tasa para " + partida + " en " + pais + ". Revisa el catálogo."], uso: 0 };
    const extraCif = origen + flete + seguro;
    const cif = exw + extraCif;
    const baseMonto_ = function (kind, dutyUsd) {
        const k = kind || "EXW";
        if (k === "CIF" || k === "CIF+DUTY") {
            if (!(extraCif > 0)) return { falta: "Para base " + k + " indica flete, seguro u origen." };
            let b = cif;
            if (k === "CIF+DUTY") {
                if (dutyUsd == null || !isFinite(dutyUsd)) return { falta: "Falta el Duty para base CIF+DUTY." };
                b += dutyUsd;
            }
            return { base: b, label: k };
        }
        return { base: exw, label: "EXW" };
    };
    let dutiesUsd = null;
    let taxesUsd = null;
    const dPct = hit.dutiesPct;
    const dKind = hit.dutiesBase || "EXW";
    if (dPct != null && isFinite(Number(dPct))) {
        const bd = baseMonto_(dKind, 0);
        if (bd.falta) notas.push("Duties: " + bd.falta);
        else {
            dutiesUsd = Math.round(bd.base * Number(dPct) / 100 * 100) / 100;
            notas.push("Duties: " + dPct + "% sobre " + bd.label + " (" + bd.base.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD) → " + dutiesUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD.");
        }
    } else {
        notas.push("Duties: sin porcentaje en el catálogo.");
    }
    let tPct = hit.taxesPct;
    const tKind = hit.taxesBase || "EXW";
    if (/importador/i.test(hit.nota || "")) {
        tPct = 0;
        notas.push("Taxes: la observación indica que lo paga el importador → 0.");
    }
    if (tPct != null && isFinite(Number(tPct))) {
        const bt = baseMonto_(tKind, dutiesUsd);
        if (bt.falta) notas.push("Taxes: " + bt.falta);
        else {
            taxesUsd = Math.round(bt.base * Number(tPct) / 100 * 100) / 100;
            notas.push("Taxes: " + tPct + "% sobre " + bt.label + " (" + bt.base.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD) → " + taxesUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD.");
        }
    } else if (!/importador/i.test(hit.nota || "")) {
        notas.push("Taxes: sin porcentaje en el catálogo.");
    }
    if (hit.nota) notas.push("Nota catálogo: " + hit.nota);
    const total = (dutiesUsd || 0) + (taxesUsd || 0);
    return {
        duties: dutiesUsd,
        taxes: taxesUsd,
        total: Math.round(total * 100) / 100,
        notas: notas,
        uso: (dutiesUsd != null || taxesUsd != null) ? 1 : 0,
        hit: { partida: partida, pais: pais, dutiesPct: dPct, dutiesBase: dKind, taxesPct: hit.taxesPct, taxesBase: tKind }
    };
}
window.logAraSimular = logAraSimular_;

function logCostosAjustarSugerencia_() {
    const sug = logIa && logIa.sugerencia;
    if (sug !== "fcl" && sug !== "lcl") return;
    logTarAsegurar_();
    const hay = (window.logTarifas.lcl || []).some(function (f) { return f.preferida === "S"; });
    if (hay) return;
    let maxM3 = 0;
    (logEscList_().length ? logEscList_().map(function (x) { return x.id; }) : [""]).forEach(function (k) {
        const c = typeof logCubicajeTotal_ === "function" ? logCubicajeTotal_("es", k) : { m3: 0 };
        maxM3 = Math.max(maxM3, Number(c.m3) || 0);
    });
    logIa.sugerencia = maxM3 >= 10 ? "fcl" : "lcl";
}

function logCostosAplicarFilas_() {
    logTarAsegurar_();
    const escs = logEscList_();
    const claves = escs.length ? escs.map(function (x) { return x.id; }) : [""];
    const escUi = escs.length ? logOpcionUiAsegurar_() : "";
    /* Sin opciones: escUi="" y se liquida sobre el env global (proyectos en zona libre). */
    logEnvAsegurarLineas_(false, false, escUi || undefined);
    const avisos = [];
    let n = 0;
    const bagPorOp = {};
    claves.forEach(function (k) {
        const envLive = logEnv_();
        const eK = logEnvParaTarifa_(k);
        const tiposK = logEnvTiposActivos_(eK.modalidad, eK.incoterm, logEsCotizacionExterior_());
        const nombreOp = k ? (logEscNombre_(escs.find(function (x) { return x.id === k; }) || {}, claves.indexOf(k), "es") + ": ") : "";
        if (logEsCotizacionExterior_() && String(eK.incoterm || "").toUpperCase() === "EXW") {
            avisos.push(nombreOp + "EXW no tiene filas de costo logístico.");
            return;
        }
        if (!tiposK.length) {
            avisos.push(nombreOp + "Este Incoterm no abre filas de costo.");
            return;
        }
        const cub = typeof logCubicajeTotal_ === "function" ? logCubicajeTotal_("es", k) : { m3: 0, kgVol: 0, pesoKg: 0 };
        const valor = logTarValorMercancia_(k);
        if (typeof logAplicarContenedoresSugeridos_ === "function") logAplicarContenedoresSugeridos_(envLive, cub, k);
        const ctx = logTarCtx_(envLive, cub, valor, k);
        const bag = {};
        tiposK.forEach(function (tipo) {
            if (tipo === "duties" || tipo === "taxes" || tipo === "libre") return;
            const notas = [];
            const r = logTarAplicarTipo_(tipo, eK, ctx, notas);
            notas.forEach(function (t) {
                if (/conviene cotizar|falta la tarifa/i.test(t) && avisos.indexOf(nombreOp + t) < 0) avisos.push(nombreOp + t);
            });
            if (!r.uso) {
                if (notas.length) bag[tipo] = { valor: null, fuente: "", notas: notas.join("\n"), ok: false };
                return;
            }
            let suma = r.suma;
            if (logQuote && logQuote.moneda !== "USD") {
                const trm = logTarTrm_();
                if (!(trm > 0)) {
                    bag[tipo] = { valor: null, fuente: "", notas: "Falta la TRM para pasar el costo a COP.", ok: false };
                    avisos.push(nombreOp + "Falta la TRM para pasar el costo a COP.");
                    return;
                }
                suma *= trm;
            }
            bag[tipo] = { valor: Math.round(suma * 100) / 100, fuente: "[Catálogo]", notas: notas.join("\n"), ok: true };
            n += 1;
        });
        bagPorOp[k || "_"] = bag;
    });
    /* Escribir sobre el env actual (misma referencia que verá la ficha). */
    const env = logEnv_();
    claves.forEach(function (k) {
        const bag = bagPorOp[k || "_"] || {};
        let st = null;
        if (k) {
            if (!env.porEsc || typeof env.porEsc !== "object") env.porEsc = {};
            if (!env.porEsc[k]) env.porEsc[k] = logEnvEscSemilla_(env);
            st = env.porEsc[k];
        }
        const escribeLn = !escs.length || !k || k === escUi;
        Object.keys(bag).forEach(function (tipo) {
            const b = bag[tipo];
            let ln = (env.lineas || []).find(function (x) { return x.tipo === tipo; });
            if (b.ok && escribeLn && !ln) {
                /* La plantilla activa no tenía la fila: créala para que la ficha la muestre. */
                let maxN = 0;
                (env.lineas || []).forEach(function (x) { maxN = Math.max(maxN, parseInt(String(x.id).replace(/\D/g, ""), 10) || 0); });
                ln = {
                    id: "c" + (maxN + 1), tipo: tipo,
                    concepto: logEnvEtiquetaTipo_(tipo, env.modalidad, false),
                    conceptoManual: false, valor: null, pct: null, notas: "", fuente: "", base: "",
                    arancelManual: false, arancelFirma: "", arancelNota: ""
                };
                env.lineas = env.lineas || [];
                env.lineas.push(ln);
            }
            if (b.ok) logEscEscribirCosto_(st, escribeLn ? ln : null, tipo, b.valor, b.fuente, b.notas);
            else if (st) {
                const kt = logEscKeyTipo_(tipo);
                if (kt) st.notas[kt] = b.notas || "";
                if (ln) st.notas[ln.id] = b.notas || "";
            } else if (ln && escribeLn) ln.notas = b.notas || "";
        });
    });
    window.logTarAvisos = avisos;
    return n;
}

function logIaEscribirLineas_(obj) {
    const lista = obj && Array.isArray(obj.lineas) ? obj.lineas : [];
    const e = logEnv_();
    let n = 0;
    lista.forEach(function (item) {
        const tipo = String(item && item.tipo || "").trim();
        const ln = e.lineas.find(function (x) { return x.tipo === tipo && x.tipo !== "libre"; });
        if (!ln) return;
        if ((tipo === "duties" || tipo === "taxes") && ln.fuente === "Aranceles") return;
        const valor = Number(item.valor);
        const pct = Number(item.pct);
        let puso = false;
        if (item.valor != null && item.valor !== "" && isFinite(valor)) {
            ln.valor = valor;
            puso = true;
        }
        if ((tipo === "duties" || tipo === "taxes") && item.pct != null && item.pct !== "" && isFinite(pct)) {
            ln.pct = pct;
            if (item.valor == null || item.valor === "") ln.valor = null;
            puso = true;
        }
        if (!puso) return;
        ln.fuente = "[Estimado IA]";
        n += 1;
    });
    return n;
}

function logIaUsdTxt_(n) {
    const v = Math.round((Number(n) || 0) * 100) / 100;
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD";
}

function logIaPartidasResumen_(escId) {
    const map = {};
    (logQuote.filas || []).forEach(function (fila) {
        if (fila.tipo !== "item" && fila.tipo !== "libre") return;
        if (fila.demo != null) return;
        if (escId && fila.escId && fila.escId !== escId) return;
        if (escId && !fila.escId && logEscList_().length) return;
        const dig = logArancelDigitos_(fila.partida);
        if (dig.length >= 4) map[dig.slice(0, 10)] = true;
    });
    return Object.keys(map);
}

function logIaTxtArancel_(eK, escId) {
    const tipos = logEnvTiposActivos_(eK.modalidad, eK.incoterm, true);
    const pideDu = tipos.indexOf("duties") >= 0;
    const pideTx = tipos.indexOf("taxes") >= 0;
    if (!pideDu && !pideTx) return ["Duties / Taxes: este Incoterm (" + (eK.incoterm || "") + ") no los incluye."];
    const out = [];
    const partidas = logIaPartidasResumen_(escId);
    if (!partidas.length) {
        out.push("Duties / Taxes: faltan partidas arancelarias en las fichas de producto. Sin partida no se liquidan.");
        return out;
    }
    out.push("Duties / Taxes: partidas " + partidas.map(logPartidaFmt_).join(", ") + ".");
    if (!logAranceles.filas || !logAranceles.filas.length) {
        out.push("Aún no cargó el catálogo de aranceles. Al generar se intenta leer y aplicar.");
        return out;
    }
    const cod = String(eK.destinoCodigo || logEnvCodigoDePais_(eK.destinoPais) || "").toUpperCase();
    const pais = logArancelNorm_(eK.destinoPais);
    const filasPais = (logAranceles.filas || []).filter(function (r) {
        if (cod && String(r.codigo || "").toUpperCase() === cod) return true;
        if (cod && logEnvCodigoDePais_(r.pais) === cod) return true;
        return !!(pais && logArancelNorm_(r.pais) === pais);
    });
    if (!filasPais.length) {
        out.push("No hay tasas de Duties/Taxes en el catálogo para " + (eK.destinoPais || "este país") + ".");
        return out;
    }
    const bases = typeof logBasesPorPartida_ === "function" ? logBasesPorPartida_("es", escId) : {};
    partidas.forEach(function (key) {
        const hit = logArancelBuscar_(filasPais, key);
        if (!hit || hit.ambiguo) {
            out.push("· " + logPartidaFmt_(key) + ": sin tasa clara en el catálogo.");
            return;
        }
        const du = hit.dutiesPct != null ? (hit.dutiesPct + "% sobre " + (hit.dutiesBase || "EXW")) : "sin Duties";
        const tx = hit.taxesPct != null ? (hit.taxesPct + "% sobre " + (hit.taxesBase || "EXW")) : "sin Taxes";
        const baseExw = bases[key];
        const mon = baseExw > 0 ? (" · base EXW " + logIaUsdTxt_(baseExw)) : "";
        out.push("· " + logPartidaFmt_(key) + ": Duties " + du + "; Taxes " + tx + mon + ".");
    });
    out.push("Cómo se liquida: EXW = precio de los productos sin comisión. CIF = EXW + origen + flete interno + flete + seguro. CIF+DUTY = CIF + Duties. No llevan margen de logística.");
    return out;
}

function logIaDiagnostico_() {
    const idioma = typeof logisticaLeerOpciones_ === "function" ? logisticaLeerOpciones_().idioma : "es";
    const escUi = logEscList_().length ? logOpcionUiAsegurar_() : "";
    if (typeof logEnvAsegurarLineas_ === "function") logEnvAsegurarLineas_(idioma === "en", false, escUi);
    logTarAsegurar_();
    const e = logEnv_();
    const escs = logEscList_();
    const claves = escs.length ? escs.map(function (x) { return x.id; }) : [""];
    const bloques = [];
    let maxM3 = 0;
    claves.forEach(function (k, idx) {
        const eK = logEnvParaTarifa_(k);
        const tiposK = logEnvTiposActivos_(eK.modalidad, eK.incoterm, logEsCotizacionExterior_());
        const cub = typeof logCubicajeTotal_ === "function" ? logCubicajeTotal_("es", k) : { m3: 0, pesoKg: 0, kgVol: 0 };
        maxM3 = Math.max(maxM3, Number(cub.m3) || 0);
        const exw = logTarExwCotizacion_(k);
        const valor = logTarValorMercancia_(k);
        const sugCont = typeof logAplicarContenedoresSugeridos_ === "function" ? logAplicarContenedoresSugeridos_(e, cub, k) : null;
        const ctx = logTarCtx_(e, cub, valor, k);
        const st = k ? logEnvEscDe_(e, k) : null;
        const nombreOp = k ? logEscNombre_(escs[idx] || {}, idx, "es") : "";
        const mod = logIaEtiquetaMod_(eK.modalidad) || eK.modalidad || "sin modalidad";
        const ciudad = String(eK.destinoCiudad || "").trim();
        const donde = ciudad ? ciudad + (eK.destinoPais ? ", " + eK.destinoPais : "") : "ciudad sin escribir";
        const lineas = [];
        tiposK.forEach(function (tipo) {
            if (tipo === "libre" || tipo === "duties" || tipo === "taxes") return;
            const notas = [];
            const r = logTarAplicarTipo_(tipo, eK, ctx, notas);
            const nombre = logEnvEtiquetaTipo_(tipo, eK.modalidad, false);
            const faltas = notas.filter(function (t) { return /^(Falta|No hay)/.test(t); });
            if (r.uso) lineas.push("· " + nombre + ": " + r.uso + " cargo" + (r.uso === 1 ? "" : "s") + " → " + logIaUsdTxt_(r.suma));
            else if (faltas.length) lineas.push("· " + nombre + ": " + faltas[0]);
            else if (tipo === "flete_principal" || tipo === "destino") lineas.push("· " + nombre + ": no hay tarifa preferida para " + (ciudad || "esta ciudad") + ".");
            else lineas.push("· " + nombre + ": no hay tarifa preferida en Ajustes.");
        });
        const pesoTxt = (Math.round(ctx.kg * 100) / 100).toLocaleString("es-CO");
        const pesoDe = !(Number(cub.pesoKg) > 0) && Number(cub.kgVol) > 0 ? " (volumétricos)" : "";
        const valorTxt = exw.monto > 0
            ? exw.monto.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + exw.moneda + (valor > 0 ? "" : " · falta TRM para %")
            : "sin precio EXW";
        const escrito = logContenedoresTexto_(st ? st.contenedores : e.contenedores);
        const calc = logContenedoresTexto_(sugCont);
        const manual = st ? st.contenedoresManual : e.contenedoresManual;
        bloques.push("");
        if (nombreOp) bloques.push(nombreOp);
        bloques.push(mod + " · " + (eK.incoterm || "") + " · " + donde);
        bloques.push("Cubicaje: " + (Math.round((Number(cub.m3) || 0) * 100) / 100) + " m³ · " + pesoTxt + " kg" + pesoDe + " · " + (ctx.embarques || 1) + " embarque(s).");
        bloques.push("Mercancía EXW: " + valorTxt + ".");
        if (eK.modalidad === "fcl") {
            if (manual && escrito) bloques.push("Contenedores (manual): " + escrito + (calc && calc !== escrito ? " · cálculo " + calc : "") + ".");
            else if (calc) bloques.push("Contenedores: " + calc + ".");
            else bloques.push("Contenedores: falta volumen o peso.");
        }
        bloques.push("Costos del catálogo (Ajustes):");
        if (lineas.length) lineas.forEach(function (l) { bloques.push(l); });
        else bloques.push("· Ninguno aplicable a este Incoterm.");
        if (logEsCotizacionExterior_()) {
            bloques.push("");
            logIaTxtArancel_(eK, k).forEach(function (l) { bloques.push(l); });
        }
    });
    if (escUi) logEnvAsegurarLineas_(idioma === "en", false, escUi);
    if (logEsCotizacionExterior_()) {
        logIa.sugerencia = maxM3 >= 10 ? "fcl" : "lcl";
        logIa.motivo = maxM3 >= 10
            ? "El volumen pasa de 10 m³."
            : "Con " + (Math.round(maxM3 * 100) / 100) + " m³ el consolidado suele salir más económico que un contenedor.";
        if (typeof logCostosAjustarSugerencia_ === "function") logCostosAjustarSugerencia_();
    }
    bloques.push("");
    bloques.push("Siguiente paso: pulsa Generar datos logísticos. Eso escribe en la ficha los costos del catálogo y liquida Duties/Taxes con las partidas. El margen de logística se suma después en la cotización. La modalidad no cambia sola.");
    const texto = bloques.filter(function (x, i) { return x !== "" || (bloques[i - 1] && bloques[i - 1] !== ""); }).join("\n").replace(/\n{3,}/g, "\n\n");
    logIa.diagnostico = texto;
    return texto;
}

async function logIaAplicarLocal_() {
    if (typeof logisticaLeerEnvUi_ === "function") logisticaLeerEnvUi_();
    /* Releer env vivo (misma referencia) después de leer la UI. */
    const e = logEnv_();
    const escUi = logEscList_().length ? logOpcionUiAsegurar_() : "";
    const vistaUi = logEnvVistaEsc_(escUi);
    /* Al generar, enciende Incluir (global o por opción) para que se vea la ficha. */
    if (escUi) {
        if (!e.porEsc || typeof e.porEsc !== "object") e.porEsc = {};
        if (!e.porEsc[escUi]) e.porEsc[escUi] = logEnvEscSemilla_(e);
        e.porEsc[escUi].activo = true;
        e.activo = true;
    } else {
        e.activo = true;
    }
    let exwNota = "";
    if (logEsCotizacionExterior_() && String(vistaUi.incoterm || "").toUpperCase() === "EXW") {
        exwNota = " La opción activa está en EXW: no hay filas de costo logístico que mostrar. Cambia el Incoterm si quieres ver origen, flete, destino, Duties y Taxes.";
    }
    const cat = logCostosAplicarFilas_();
    /* Duties/Taxes: cargar catálogo si hace falta y liquidar con partidas. */
    if (logEsCotizacionExterior_() && !logAranceles.filas && !logAranceles.pedido) {
        try { await logCargarAranceles_(); } catch (err) { /* sin catálogo no se liquidan */ }
    } else if (logEsCotizacionExterior_()) {
        logAplicarAranceles_();
    }
    let arancelTxt = "";
    if (logEsCotizacionExterior_()) {
        const du = (logEnv_().lineas || []).filter(function (ln) { return ln.tipo === "duties" || ln.tipo === "taxes"; });
        const ok = du.filter(function (ln) {
            const fuente = escUi ? logEscFuente_(ln, escUi) : ln.fuente;
            const pct = escUi ? logEscPct_(ln, escUi) : ln.pct;
            const val = escUi ? logEscValor_(ln, escUi) : ln.valor;
            return fuente === "Aranceles" && (pct != null || val != null);
        });
        if (ok.length) {
            arancelTxt = " Duties/Taxes: " + ok.map(function (ln) {
                const pct = escUi ? logEscPct_(ln, escUi) : ln.pct;
                const val = escUi ? logEscValor_(ln, escUi) : ln.valor;
                if (pct != null) return ln.tipo + " " + pct + "%" + (ln.base ? " sobre " + ln.base : "");
                return ln.tipo + " " + logIaUsdTxt_(val);
            }).join("; ") + ".";
        } else if (du.length) {
            arancelTxt = " Duties/Taxes: no se liquidaron (revisa partidas en las fichas o el catálogo de aranceles del país).";
        }
    }
    if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
    if (typeof logisticaPintarEnv_ === "function") logisticaPintarEnv_(true);
    if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
    const caja = document.getElementById("logEnvLineas");
    if (caja && caja.scrollIntoView) caja.scrollIntoView({ block: "nearest" });
    const extra = (window.logTarAvisos || []).join(" ");
    const cuerpo = cat
        ? "Listo. Escribí " + cat + " costo" + (cat === 1 ? "" : "s") + " del catálogo en la ficha de Costos logísticos."
        : ("No pude escribir costos del catálogo en las filas abiertas." + exwNota);
    const nota = cuerpo + arancelTxt +
        (cat ? " La cotización les suma el margen de logística (Duties y Taxes no llevan margen)." : "") +
        " La modalidad no se cambió." +
        (extra ? " " + extra : "");
    logIa.historial.push({ role: "model", text: cuerpo + (arancelTxt ? arancelTxt : "") });
    logIa.historial.push({ role: "nota", text: nota });
    logIa.fase = "datos";
    logIaPintar_();
}

async function logIaConsultar_(modo, textoUsuario) {
    if (logIa.ocupado) return;
    if (modo === "generar" && !logIa.analizado) return;
    if (modo === "entrevista" && !String(textoUsuario || "").trim()) return;
    if (modo === "analisis") {
        const faltas = logFaltasAnalisis_();
        if (faltas.some(function (f) { return f.msg; })) {
            logAplicarFaltasAnalisis_();
            return;
        }
        logRecalcPendiente_ = false;
        logIa.historial.push({ role: "model", text: logIaDiagnostico_() });
        logIa.analizado = true;
        logIa.fase = "entrevista";
        if (typeof logisticaPintarEnv_ === "function") logisticaPintarEnv_(true);
        logIaPintar_();
        return;
    }
    if (modo === "generar") {
        logIa.ocupado = true;
        logIaPintar_();
        if (typeof mostrarEsperaNube === "function") mostrarEsperaNube("Generando los datos logísticos…");
        try {
            await logIaAplicarLocal_();
        } catch (eGen) {
            logIa.historial.push({ role: "nota", text: String((eGen && eGen.message) || eGen) });
            logIaPintar_();
        } finally {
            if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
            logIa.ocupado = false;
            logIaPintar_();
        }
        return;
    }
    logIa.ocupado = true;
    if (modo === "entrevista") logIa.historial.push({ role: "user", text: String(textoUsuario).trim() });
    logIaPintar_();
    if (typeof mostrarEsperaNube === "function") mostrarEsperaNube(modo === "generar" ? "Generando los datos logísticos…" : "Consultando el asistente de logística…");
    try {
        if (typeof realizarPeticionBD !== "function") throw new Error("Servicio no disponible.");
        const pro = !!((document.getElementById("logIaPro") || {}).checked);
        const resp = await realizarPeticionBD({
            action: "gemini_chat",
            modulo: "logistica",
            forzarPro: pro,
            promptText: logIaPrompt_(modo)
        }, { timeoutMs: pro ? 180000 : 120000 });
        if (typeof pintarUsoGemini === "function") pintarUsoGemini(resp && resp.uso);
        if (!resp || !resp.exito) throw new Error((resp && resp.mensaje) || "Sin respuesta.");
        const bruto = (resp.data && resp.data.candidates && resp.data.candidates[0] && resp.data.candidates[0].content && resp.data.candidates[0].content.parts && resp.data.candidates[0].content.parts[0].text) || "";
        const json = logIaLeerJson_(bruto);
        logIaTomarSugerencia_(json);
        logCostosAjustarSugerencia_();
        let nota = "";
        if (modo === "generar") {
            const n = logIaEscribirLineas_(json);
            const cat = logCostosAplicarFilas_();
            if (n || cat) {
                logMarcarSucio_();
                logisticaPintarEnv_(true);
                logisticaRefrescarTabla_();
                const extra = (window.logTarAvisos || []).join(" ");
                nota = cat
                    ? "Apliqué " + cat + " concepto" + (cat === 1 ? "" : "s") + " del catálogo. La modalidad no se cambió." + (extra ? " " + extra : "")
                    : "Escribí " + n + " fila" + (n === 1 ? "" : "s") + " como estimado. La modalidad no se cambió." + (extra ? " " + extra : "");
            } else {
                const extra = (window.logTarAvisos || []).join(" ");
                nota = extra || "No escribí cifras. Revisa lo que falta y vuelve a generar.";
            }
        }
        const visible = logIaTextoVisible_(bruto, json) || (modo === "generar" ? "Listo." : "¿Qué dato del envío puedes completar?");
        logIa.historial.push({ role: "model", text: visible });
        const aviso = typeof logTarAvisoRango_ === "function" ? logTarAvisoRango_() : "";
        if (aviso && visible.indexOf("Aéreo") < 0 && (!nota || nota.indexOf("Aéreo") < 0)) nota = nota ? (nota + " " + aviso) : aviso;
        if (nota) logIa.historial.push({ role: "nota", text: nota });
        if (modo === "analisis") logIa.analizado = true;
        logIa.fase = modo === "generar" ? "datos" : (logIa.analizado ? "entrevista" : "inicio");
    } catch (e) {
        const m = String((e && e.message) || e);
        logIa.historial.push({ role: "nota", text: /Acción no válida/i.test(m) ? "El asistente no respondió. Revisa la sesión e inténtalo otra vez." : m });
    } finally {
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
        logIa.ocupado = false;
        logIaPintar_();
    }
}

function logisticaInitIa_() {
    const btnE = document.getElementById("btnLogIaEnviar");
    const btnG = document.getElementById("btnLogIaGenerar");
    const btnA = document.getElementById("btnLogIaAnalisis");
    const inp = document.getElementById("logIaInput");
    if (btnA) btnA.addEventListener("click", function () { logIaConsultar_("analisis", ""); });
    const btnCont = document.getElementById("logContCalc");
    if (btnCont) btnCont.addEventListener("click", function () {
        const env = logEnv_();
        const clavesC = logEscList_().length ? logEscList_().map(function (x) { return x.id; }) : [""];
        clavesC.forEach(function (k) {
            if (k) { const st = logEnvEsc_(k); if (st) st.contenedoresManual = false; }
            else env.contenedoresManual = false;
            const cub = typeof logCubicajeTotal_ === "function" ? logCubicajeTotal_("es", k) : { m3: 0, pesoKg: 0, kgVol: 0 };
            logAplicarContenedoresSugeridos_(env, cub, k);
        });
        if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
        logisticaPintarEnv_(true);
        if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
    });
    const escBox = document.getElementById("logEscEnvBox");
    if (escBox) {
        const onEscEnv = function (ev) {
            const calc = ev.target && ev.target.closest ? ev.target.closest("[data-esc-calc]") : null;
            const togActivo = ev.target && ev.target.getAttribute && ev.target.getAttribute("data-campo") === "activo";
            logisticaLeerEnvUi_();
            if (calc) {
                const k = calc.getAttribute("data-esc-calc");
                const st = logEnvEsc_(k);
                if (st) st.contenedoresManual = false;
                const cubC = logCubicajeTotal_("es", k);
                logAplicarContenedoresSugeridos_(logEnv_(), cubC, k);
            } else if (ev.target && ev.target.hasAttribute && ev.target.hasAttribute("data-cont")) {
                const st2 = logEnvEsc_(ev.target.getAttribute("data-op"));
                if (st2) st2.contenedoresManual = true;
            }
            /* Al apagar logística de una opción, soltar el foco para que el panel se redibuje. */
            if (togActivo && ev.target && ev.target.blur) ev.target.blur();
            logMarcarSucio_();
            logisticaPintarEnv_(true);
            logisticaRefrescarTabla_();
        };
        escBox.addEventListener("change", onEscEnv);
        escBox.addEventListener("click", function (ev) { if (ev.target && ev.target.closest && ev.target.closest("[data-esc-calc]")) onEscEnv(ev); });
    }
    const envTabs = document.getElementById("logEnvEscTabs");
    if (envTabs) envTabs.addEventListener("click", function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest("[data-opctab]")) {
            logisticaLeerEnvUi_();
            logisticaOnOpcTabClick_(ev);
        }
    });
    if (btnE) btnE.addEventListener("click", function () {
        const t = inp ? inp.value : "";
        if (inp) inp.value = "";
        logIaConsultar_("entrevista", t);
    });
    if (btnG) btnG.addEventListener("click", function () { logIaConsultar_("generar", ""); });
    if (inp) inp.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" && !ev.shiftKey) {
            ev.preventDefault();
            const t = inp.value;
            inp.value = "";
            logIaConsultar_("entrevista", t);
        }
    });
    logIaPintar_();
}

function logisticaInit() {
    if (typeof logTarAsegurar_ === "function") logTarAsegurar_();
    /* Bloquea el scroll de la página mientras Logística está activa: solo scrollean .log-side / .log-stage. */
    const syncLogScrollBody_ = function () {
        const pane = document.getElementById("tabLogistica");
        const on = !!(pane && pane.classList.contains("active"));
        document.body.classList.toggle("logistica-activa", on);
    };
    syncLogScrollBody_();
    document.querySelectorAll('#mainAppTabs [data-bs-toggle="tab"]').forEach(function (btn) {
        btn.addEventListener("shown.bs.tab", syncLogScrollBody_);
    });
    const idi = document.getElementById("logIdioma");
    if (idi) idi.addEventListener("change", function () { logCab.idiomaManual = true; logisticaActualizarVista(); });
    const sis = document.getElementById("logSistema");
    if (sis) sis.addEventListener("change", function () { logCab.sistemaManual = true; logisticaActualizarVista(); });
    const margen = document.getElementById("logMargen");
    if (margen) margen.addEventListener("change", logisticaActualizarVista);
    const selCiudad = document.getElementById("logDestCiudad");
    if (selCiudad) selCiudad.addEventListener("focus", function () { logRefrescarCiudadesEnv_(true); });
    const selPais = document.getElementById("logDestPais");
    if (selPais && !selPais.getAttribute("data-pais-on")) {
        selPais.setAttribute("data-pais-on", "1");
        selPais.addEventListener("change", function () {
            const pais = logPaisEnEspanol_(selPais.value);
            if (pais && selPais.value !== pais) selPais.value = pais;
            const cod = logEnvCodigoDePais_(pais);
            const c = document.getElementById("logDestCodigo");
            if (cod && c) c.value = cod;
            if (typeof logRefrescarCiudadesEnv_ === "function") logRefrescarCiudadesEnv_(true);
            if (!logAranceles.filas && typeof logCargarAranceles_ === "function") logCargarAranceles_();
            if (typeof logValidarPartidasPorPaisEnvio_ === "function") logValidarPartidasPorPaisEnvio_();
            if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
        });
    }
    logCombo_("logDestCodigo", "logCodigoMenu", logListaCodigos_, function (cod) {
        const pais = logPaisDeCodigo_(cod);
        if (pais && typeof logPintarSelectPais_ === "function") logPintarSelectPais_(pais);
    });
    logCargarPaises_();
    logPintarSelectPais_((logQuote && logQuote.env && logQuote.env.destinoPais) || "");
    logCargarCiudades_();
    logCargarAranceles_();
    if (document.getElementById("fichaPartida")) logPintarSelectPartida_("");
    logisticaInitIa_();
    ["logMercado", "logModalidad", "logIncoterm", "logDestCiudad", "logDestPais", "logDestCodigo", "logDestPuerto", "logDestTitulo", "logResumenPct", "logMargenLog", "logCostosOn", "logCubM3", "logCubPeso", "logCubKgVol", "logC20", "logC40", "logC40hc", "logEmbarques"].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("change", logisticaOnEnvUi_);
        if (el.tagName === "INPUT") el.addEventListener("input", logisticaOnEnvUi_);
    });
    document.querySelectorAll("input[name=\"logModoCosto\"]").forEach(function (r) {
        r.addEventListener("change", logisticaOnEnvUi_);
    });
    const envBox = document.getElementById("logEnvLineas");
    if (envBox) {
        envBox.addEventListener("change", logisticaOnEnvUi_);
        envBox.addEventListener("input", logisticaOnEnvUi_);
        envBox.addEventListener("click", logisticaOnEnvUi_);
    }
    const btnLibre = document.getElementById("btnLogEnvLibre");
    if (btnLibre) btnLibre.addEventListener("click", logisticaOnEnvUi_);
    const btnEnvReset = document.getElementById("btnLogEnvReset");
    if (btnEnvReset) btnEnvReset.addEventListener("click", logisticaOnEnvUi_);
    const comCard = document.getElementById("logComisionCard");
    if (comCard) {
        comCard.addEventListener("change", logisticaOnComision_);
        comCard.addEventListener("input", logisticaOnComision_);
    }
    const descCard = document.getElementById("logDescuentoCard");
    if (descCard) {
        descCard.addEventListener("click", logisticaOnDescuento_);
        descCard.addEventListener("input", logisticaOnDescuento_);
        descCard.addEventListener("change", logisticaOnDescuento_);
    }
    const pagoCard = document.getElementById("logPagoCard");
    if (pagoCard) {
        pagoCard.addEventListener("change", logisticaOnPago_);
        pagoCard.addEventListener("input", logisticaOnPago_);
    }
    const zoomOut = document.getElementById("logZoomOut");
    const zoomIn = document.getElementById("logZoomIn");
    const zoomFit = document.getElementById("logZoomFit");
    if (zoomOut) zoomOut.addEventListener("click", function () { logisticaZoomPaso_(-1); });
    if (zoomIn) zoomIn.addEventListener("click", function () { logisticaZoomPaso_(1); });
    if (zoomFit) zoomFit.addEventListener("click", function () { logZoom = "fit"; logisticaAplicarZoom_(); });
    window.addEventListener("resize", function () { if (logZoom === "fit") logisticaAplicarZoom_(); });
    window.addEventListener("scroll", function () {
        if (logZoom !== "fit" || logZoomTick) return;
        logZoomTick = window.requestAnimationFrame(function () {
            logZoomTick = 0;
            logisticaAplicarZoom_();
        });
    }, { passive: true });
    const btn = document.getElementById("btnLogPDF");
    if (btn) btn.addEventListener("click", logisticaDescargarPDF);
    const btnImgs = document.getElementById("btnLogImgs");
    if (btnImgs) btnImgs.addEventListener("click", function () { logisticaRecargarImgs_({ todas: true }); });
    const btnReset = document.getElementById("btnLogReset");
    if (btnReset) btnReset.addEventListener("click", logisticaRestablecerDiseno);
    const tabBtn = document.getElementById("tabBtnLogistica");
    if (tabBtn) {
        tabBtn.addEventListener("shown.bs.tab", function () {
            logisticaSincronizarProyecto();
            logisticaPrefetchHistorial_();
        });
    }
    const btnPresupuesto = document.getElementById("btnLogPresupuesto");
    if (btnPresupuesto) {
        btnPresupuesto.addEventListener("click", function () {
            logisticaActualizarPresupuestoDesdeCostos_();
        });
    }

    logImgInitEditor_();
    logisticaInitEditorSim3d_();
    logisticaInitHistorial_();

    /* moneda, totales, columnas, filas */
    const selMon = document.getElementById("logMoneda");
    if (selMon) {
        selMon.addEventListener("change", function () {
            logQuote.moneda = selMon.value === "USD" ? "USD" : "COP";
            logMarcarSucio_();
            logisticaRefrescarTabla_();
        });
    }
    const inpTrm = document.getElementById("logTRM");
    if (inpTrm) {
        inpTrm.addEventListener("change", function () {
            const n = parseFloat(inpTrm.value);
            logQuote.trm = n > 0 ? n : logTrmDesdeCostos_();
            inpTrm.value = logQuote.trm || "";
            logMarcarSucio_();
            logisticaRefrescarTabla_();
        });
    }
    const selDec = document.getElementById("logDecimales");
    if (selDec) {
        selDec.addEventListener("change", function () {
            const n = Number(selDec.value);
            logQuote.decimales = n === 1 || n === 2 ? n : 0;
            logMarcarSucio_();
            logisticaRefrescarTabla_();
        });
    }
    const menuCols = document.getElementById("logColsMenu");
    if (menuCols) {
        menuCols.addEventListener("change", function (ev) {
            const chk = ev.target;
            logMarcarSucio_();
            if (chk.id === "logTotChk") {
                logQuote.totales = chk.checked;
            } else if (chk.id === "logTxtTitulo") {
                logQuote.texto = logTexto_();
                logQuote.texto.titulo = chk.checked;
            } else if (chk.id === "logTxtMedidas") {
                logQuote.texto = logTexto_();
                logQuote.texto.medidas = chk.checked;
            } else if (chk.name === "logDescModo") {
                logQuote.texto = logTexto_();
                logQuote.texto.desc = chk.value;
            } else if (chk.getAttribute("data-col")) {
                if (!logisticaAlternarColumna_(chk.getAttribute("data-col"), chk.checked)) {
                    chk.checked = !chk.checked;
                    if (typeof mostrarNotificacion === "function") mostrarNotificacion("La tabla necesita al menos dos columnas.", "warning");
                    return;
                }
            }
            logisticaRefrescarTabla_();
        });
    }
    const btnAddOp = document.getElementById("btnLogAgregarOpcion");
    if (btnAddOp) btnAddOp.addEventListener("click", function () { logisticaAgregarEscenario_(); });
    document.addEventListener("click", function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest("[data-opctab]")) logisticaOnOpcTabClick_(ev);
        const reset = ev.target && ev.target.closest ? ev.target.closest("[data-opc-reset]") : null;
        if (reset) {
            const kind = reset.getAttribute("data-opc-reset");
            const id = logOpcionUiAsegurar_();
            if (kind === "comision" && logQuote.comision && logQuote.comision.porEsc) delete logQuote.comision.porEsc[id];
            if (kind === "descuento" && logQuote.descuento && logQuote.descuento.porEsc) delete logQuote.descuento.porEsc[id];
            if (kind === "pago" && logQuote.pago && logQuote.pago.porEsc) delete logQuote.pago.porEsc[id];
            logMarcarSucio_();
            logisticaActualizarVista();
        }
    });
    /* Scroll principal = panel izquierdo (.log-side). No bloquear con preventDefault. */
    const side = document.querySelector(".log-side");
    if (side) {
        side.addEventListener("wheel", function (ev) { ev.stopPropagation(); }, { passive: true });
    }
    const stage = document.querySelector(".log-stage");
    if (stage) {
        stage.addEventListener("wheel", function (ev) { ev.stopPropagation(); }, { passive: true });
    }
    const menuAdd = document.getElementById("logAddMenu");
    if (menuAdd) menuAdd.addEventListener("click", logisticaAgregarFila_);
    const lista = document.getElementById("logFilasLista");
    if (lista) {
        lista.addEventListener("click", function (ev) {
            logisticaEventosEscenarios_(ev);
            logisticaAccionFila_(ev);
        });
        lista.addEventListener("input", logisticaEventosEscenarios_);
        lista.addEventListener("change", function (ev) {
            logisticaEventosEscenarios_(ev);
            logisticaAccionFila_(ev);
        });
        lista.addEventListener("input", function (ev) {
            const t = ev.target;
            if (!t || t.getAttribute("data-acc") !== "unit") return;
            const row = t.closest(".log-fila");
            const fila = row && logFilaPorUid_(row.getAttribute("data-r"));
            if (!fila) return;
            if (!logEscribirPrecioFila_(fila, t.value, t.getAttribute("data-e") || "")) return;
            const caja = t.closest(".log-pu");
            if (caja) caja.classList.toggle("log-pu-fijo", !!fila.puFijo);
            logMarcarSucio_();
            logProgramarHojaPrecio_();
        });
        lista.addEventListener("focusout", function (ev) {
            const t = ev.target;
            if (!t || t.getAttribute("data-acc") !== "unit") return;
            const row = t.closest(".log-fila");
            const fila = row && logFilaPorUid_(row.getAttribute("data-r"));
            if (!fila) return;
            logEscribirPrecioFila_(fila, t.value, t.getAttribute("data-e") || "");
            const idioma = logisticaLeerOpciones_().idioma;
            const v = logFilaValores_(fila, idioma, t.getAttribute("data-e") || "");
            t.value = v.unit == null ? "" : logFmtNum_(v.unit, idioma, logDecimales_());
            const caja = t.closest(".log-pu");
            if (caja) caja.classList.toggle("log-pu-fijo", !!fila.puFijo);
            if (logPrecioHojaTimer_) {
                clearTimeout(logPrecioHojaTimer_);
                logPrecioHojaTimer_ = 0;
                logisticaActualizarVista({ sinFilas: true });
            }
        });
        /* Con opciones, Sortable lo arma logisticaInitContenedoresSortable_. Sin opciones = lista plana. */
        lista._logUnicaSort = null;
    }
    logisticaPintarEstado_();
    /* si la pestaña ya está activa al cargar (último tab persistido o recarga), no llega shown.bs.tab */
    const tab = document.getElementById("tabLogistica");
    if (tab && tab.classList.contains("active")) {
        logisticaSincronizarProyecto();
        logisticaPrefetchHistorial_();
    }
}

function logisticaInitSortableUnica_() {
    const lista = document.getElementById("logFilasLista");
    if (!lista || typeof Sortable === "undefined") return;
    if (lista._logUnicaSort) {
        try { lista._logUnicaSort.destroy(); } catch (err) { /* ok */ }
        lista._logUnicaSort = null;
    }
    if (logEscList_().length) return;
    const ul = lista.querySelector(".log-opc-bucket-list") || lista;
    lista._logUnicaSort = Sortable.create(ul, {
        handle: ".log-fila-grip",
        draggable: ".log-fila",
        animation: 150,
        onEnd: function (evt) {
            if (evt.oldIndex === evt.newIndex) return;
            const uids = [].map.call(ul.querySelectorAll(".log-fila[data-r]"), function (n) { return n.getAttribute("data-r"); });
            const porUid = {};
            (logQuote.filas || []).forEach(function (f) { porUid[f.uid] = f; });
            const ordenadas = uids.map(function (id) { return porUid[id]; }).filter(Boolean);
            const resto = (logQuote.filas || []).filter(function (f) { return uids.indexOf(String(f.uid)) < 0; });
            logQuote.filas = ordenadas.concat(resto);
            if (logCab.over) delete logCab.over.codigo;
            logMarcarSucio_();
            logisticaRefrescarTabla_();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", logisticaInit);
} else {
    logisticaInit();
}
