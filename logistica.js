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
    const codigo = (v("inputCodigo") || nombre.split(/\s+/)[0] || "").trim();
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
        codigo: pick("codigo", demo ? "17999-A-V1" : (logCodigoPrimeraFila_() || (p.codigo + (p.version ? "-" + p.version : "")))),
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

function logisticaAvisoProyectoCostos_() {
    const el = document.getElementById("logAvisoProyecto");
    if (!el) return;
    const p = logisticaLeerProyecto_();
    const hoja = logCodigoEnHoja_();
    const distinto = !!(p.hayProyecto && hoja && logNormCod_(p.codigo) !== logNormCod_(hoja));
    if (!distinto) {
        el.className = "d-none";
        el.innerHTML = "";
        return;
    }
    const a = logQuote && logQuote.abierta;
    const cual = a ? (a.numero || a.id || hoja) : hoja;
    const extra = (logQuote && logQuote.sucio) || a ? " Cotizar el de Costos deja esta hoja." : "";
    el.className = "alert alert-warning py-2 px-3 mb-2 d-flex flex-wrap align-items-center justify-content-between gap-2";
    el.innerHTML = "<div><i class=\"bi bi-exclamation-triangle me-1\"></i>En Costos está abierto <b>" + logEsc_(p.codigo) + "</b>. Esta cotización sigue en <b>" + logEsc_(cual) + "</b>." + extra + "</div>"
        + "<button type=\"button\" class=\"btn btn-sm btn-primary\" onclick=\"logisticaTomarProyectoCostos_()\">Cotizar " + logEsc_(p.codigo) + "</button>";
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
 *   { uid, tipo: "item" | "libre" | "seccion" | "envio", proy, ver, lote, over: {...}, img }
 *  - item: viene de una versión del proyecto (ficha comercial + precio de una escala).
 *  - libre / seccion: se escriben a mano sobre la hoja.
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

function logNombrePreImg_(fila) {
    const codigo = String((fila && fila.proy) || (logisticaLeerProyecto_() || {}).codigo || "").trim();
    if (!codigo || !fila || !fila.elem) return "";
    const k = String(fila.ver || "V1") + ":" + String(fila.elem);
    return "PRE-img_" + codigo.replace(/[^\w\-]/g, "_") + "_" + k.replace(/[^\w]/g, "_") + ".jpg";
}

function logAsegurarImgRefFila_(fila) {
    if (!fila || fila.imgRef || fila.tipo === "seccion" || fila.tipo === "envio") return fila && fila.imgRef || "";
    if (logImgEditada_(fila)) return "";
    if (fila.elem) {
        const ref = logImgRefElemento_(fila.elem, fila.ver);
        if (ref) fila.imgRef = ref;
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
/** Catálogo completo (nombre en español y código ISO). Odoo lo reemplaza cuando el backend ya tiene odoo_paises. */
const LOG_PAISES_ISO_ = "AF:Afganistán|AL:Albania|DE:Alemania|AD:Andorra|AO:Angola|AI:Anguila|AG:Antigua y Barbuda|SA:Arabia Saudí|DZ:Argelia|AR:Argentina|AM:Armenia|AW:Aruba|AU:Australia|AT:Austria|AZ:Azerbaiyán|BS:Bahamas|BD:Bangladés|BB:Barbados|BH:Baréin|BE:Bélgica|BZ:Belice|BJ:Benín|BM:Bermudas|BY:Bielorrusia|BO:Bolivia|BQ:Bonaire, San Eustaquio y Saba|BA:Bosnia y Herzegovina|BW:Botsuana|BR:Brasil|BN:Brunéi|BG:Bulgaria|BF:Burkina Faso|BI:Burundi|BT:Bután|CV:Cabo Verde|KH:Camboya|CM:Camerún|CA:Canadá|QA:Catar|TD:Chad|CZ:Chequia|CL:Chile|CN:China|CY:Chipre|VA:Ciudad del Vaticano|CO:Colombia|KM:Comoras|CG:Congo|KP:Corea del Norte|KR:Corea del Sur|CR:Costa Rica|CI:Costa de Marfil|HR:Croacia|CU:Cuba|CW:Curazao|DK:Dinamarca|DM:Dominica|EC:Ecuador|EG:Egipto|SV:El Salvador|AE:Emiratos Árabes Unidos|ER:Eritrea|SK:Eslovaquia|SI:Eslovenia|ES:España|US:Estados Unidos|EE:Estonia|SZ:Esuatini|ET:Etiopía|PH:Filipinas|FI:Finlandia|FJ:Fiyi|FR:Francia|GA:Gabón|GM:Gambia|GE:Georgia|GH:Ghana|GI:Gibraltar|GD:Granada|GR:Grecia|GL:Groenlandia|GP:Guadalupe|GU:Guam|GT:Guatemala|GF:Guayana Francesa|GG:Guernsey|GN:Guinea|GQ:Guinea Ecuatorial|GW:Guinea-Bisáu|GY:Guyana|HT:Haití|HN:Honduras|HK:Hong Kong|HU:Hungría|IN:India|ID:Indonesia|IQ:Irak|IR:Irán|IE:Irlanda|IS:Islandia|KY:Islas Caimán|CC:Islas Cocos|CK:Islas Cook|FO:Islas Feroe|FK:Islas Malvinas|MP:Islas Marianas del Norte|MH:Islas Marshall|PN:Islas Pitcairn|SB:Islas Salomón|TC:Islas Turcas y Caicos|VG:Islas Vírgenes Británicas|VI:Islas Vírgenes de los Estados Unidos|AX:Islas Åland|IL:Israel|IT:Italia|JM:Jamaica|JP:Japón|JE:Jersey|JO:Jordania|KZ:Kazajistán|KE:Kenia|KG:Kirguistán|KI:Kiribati|XK:Kosovo|KW:Kuwait|LA:Laos|LS:Lesoto|LV:Letonia|LB:Líbano|LR:Liberia|LY:Libia|LI:Liechtenstein|LT:Lituania|LU:Luxemburgo|MO:Macao|MK:Macedonia del Norte|MG:Madagascar|MY:Malasia|MW:Malaui|MV:Maldivas|ML:Malí|MT:Malta|MA:Marruecos|MQ:Martinica|MU:Mauricio|MR:Mauritania|YT:Mayotte|MX:México|FM:Micronesia|MD:Moldavia|MC:Mónaco|MN:Mongolia|ME:Montenegro|MS:Montserrat|MZ:Mozambique|MM:Myanmar|NA:Namibia|NR:Nauru|NP:Nepal|NI:Nicaragua|NE:Níger|NG:Nigeria|NU:Niue|NO:Noruega|NC:Nueva Caledonia|NZ:Nueva Zelanda|OM:Omán|NL:Países Bajos|PK:Pakistán|PW:Palaos|PS:Palestina|PA:Panamá|PG:Papúa Nueva Guinea|PY:Paraguay|PE:Perú|PF:Polinesia Francesa|PL:Polonia|PT:Portugal|PR:Puerto Rico|GB:Reino Unido|CF:República Centroafricana|CD:República Democrática del Congo|DO:República Dominicana|RE:Reunión|RW:Ruanda|RO:Rumanía|RU:Rusia|EH:Sáhara Occidental|WS:Samoa|AS:Samoa Americana|BL:San Bartolomé|KN:San Cristóbal y Nieves|SM:San Marino|MF:San Martín|SX:Sint Maarten|PM:San Pedro y Miquelón|VC:San Vicente y las Granadinas|SH:Santa Elena|LC:Santa Lucía|ST:Santo Tomé y Príncipe|SN:Senegal|RS:Serbia|SC:Seychelles|SL:Sierra Leona|SG:Singapur|SY:Siria|SO:Somalia|LK:Sri Lanka|ZA:Sudáfrica|SD:Sudán|SS:Sudán del Sur|SE:Suecia|CH:Suiza|SR:Surinam|SJ:Svalbard y Jan Mayen|TH:Tailandia|TW:Taiwán|TZ:Tanzania|TJ:Tayikistán|IO:Territorio Británico del Océano Índico|TL:Timor Oriental|TG:Togo|TK:Tokelau|TO:Tonga|TT:Trinidad y Tobago|TN:Túnez|TM:Turkmenistán|TR:Turquía|TV:Tuvalu|UA:Ucrania|UG:Uganda|UY:Uruguay|UZ:Uzbekistán|VU:Vanuatu|VE:Venezuela|VN:Vietnam|WF:Wallis y Futuna|YE:Yemen|DJ:Yibuti|ZM:Zambia|ZW:Zimbabue";

function logEnvDef_() {
    return {
        modalidad: "aerea", incoterm: "EXW",
        destinoCiudad: "", destinoPais: "", destinoCodigo: "", destinoPuerto: "",
        activo: true, modoCosto: "detalle", resumenPct: 100, mercado: "",
        margenPct: 20,
        margenNal: { envio: 30, montaje: 30, bodega: 30, otro: 30 },
        titSubProd: "", titSubLog: "", titGran: "",
        lineas: []
    };
}

/** Catálogo vivo. null hasta que llega Odoo; mientras tanto se usa la lista corta. */
var logPaisesCat_ = null;
var LOG_PAISES_LOCAL_ = "smartbudget_paises_odoo";

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

function logEnvCodigoDePais_(pais) {
    const p = String(pais || "").trim().toLowerCase();
    if (!p) return "";
    const hit = logPaisesFuente_().find(function (x) { return String(x.nombre).toLowerCase() === p; });
    if (hit) return hit.codigo;
    const alias = LOG_PAISES_.find(function (x) { return x[0].toLowerCase() === p; });
    return alias ? alias[1] : "";
}

function logPaisDeCodigo_(cod) {
    const c = String(cod || "").trim().toUpperCase();
    if (!c) return "";
    const hit = logPaisesFuente_().find(function (x) { return x.codigo === c; });
    return hit ? hit.nombre : "";
}

function logPaisesAplicar_(lista) {
    if (!lista || !lista.length) return;
    logPaisesCat_ = lista;
    const e = logQuote && logQuote.env;
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
        const lista = r.data.map(function (x) {
            return { nombre: String(x.nombre || "").trim(), codigo: String(x.codigo || "").trim().toUpperCase() };
        }).filter(function (x) { return x.nombre && x.codigo; });
        if (lista.length < 20) return;
        logPaisesAplicar_(lista);
        try { localStorage.setItem(LOG_PAISES_LOCAL_, JSON.stringify({ t: Date.now(), data: lista })); } catch (e2) {}
    } catch (e) { /* sin el backend nuevo sigue la lista corta */ }
}

function logEnvIncotermsDe_(mod) {
    const sea = mod === "fcl" || mod === "lcl";
    return Object.keys(LOG_INCOTERM_MATRIZ_).filter(function (k) {
        return sea || !LOG_INCOTERM_MATRIZ_[k].sea;
    });
}

function logEnvNormalizar_(src) {
    const d = logEnvDef_();
    const e = src || {};
    const mod = String(e.modalidad || "aerea");
    d.modalidad = LOG_MODALIDADES_.indexOf(mod) >= 0 ? mod : "aerea";
    const inc = String(e.incoterm || "EXW").toUpperCase();
    d.incoterm = LOG_INCOTERM_MATRIZ_[inc] ? inc : "EXW";
    if (logEnvIncotermsDe_(d.modalidad).indexOf(d.incoterm) < 0) d.incoterm = "EXW";
    d.destinoCiudad = String(e.destinoCiudad || "").trim();
    d.destinoPais = String(e.destinoPais || "").trim();
    d.destinoCodigo = String(e.destinoCodigo || "").trim().toUpperCase();
    d.destinoPuerto = String(e.destinoPuerto || "").trim();
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
            fuente: (ln.fuente === "[Estimado IA]" || ln.fuente === "Aranceles") ? ln.fuente : "",
            base: (ln.base === "CIF" || ln.base === "EXW" || ln.base === "CIF+DUTY") ? ln.base : "",
            arancelManual: !!ln.arancelManual,
            arancelFirma: String(ln.arancelFirma || "").slice(0, 120),
            arancelNota: String(ln.arancelNota || "").slice(0, 180)
        };
    }) : [];
    return d;
}

function logEnv_() {
    logQuote.env = logEnvNormalizar_(logQuote.env);
    return logQuote.env;
}

function logEnvFilasImpresas_(lineas, esEn) {
    const out = [];
    let unificado = false;
    const duties = lineas.filter(function (ln) { return ln.tipo === "duties"; });
    const taxes = lineas.filter(function (ln) { return ln.tipo === "taxes"; });
    const juntos = duties.length && taxes.length;
    lineas.forEach(function (ln) {
        if (ln.tipo !== "duties" && ln.tipo !== "taxes") {
            out.push({ label: ln.concepto || logEnvEtiquetaTipo_(ln.tipo, logEnv_().modalidad, esEn), ln: ln });
            return;
        }
        if (juntos) {
            if (unificado) return;
            unificado = true;
            out.push({ label: esEn ? "Duties and Taxes" : "Duties y Taxes", grupo: duties.concat(taxes) });
            return;
        }
        out.push({ label: ln.concepto || logEnvEtiquetaTipo_(ln.tipo, logEnv_().modalidad, esEn), ln: ln });
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

function logEnvAsegurarLineas_(esEn, forzar) {
    const e = logEnv_();
    const exterior = logEsCotizacionExterior_();
    const firma = logEnvFirma_(e, exterior);
    if (!forzar && e.plantilla === firma) {
        e.lineas.forEach(function (ln) {
            if (ln.tipo === "libre" || ln.conceptoManual) return;
            ln.concepto = logEnvEtiquetaTipo_(ln.tipo, e.modalidad, esEn);
        });
        return e.lineas;
    }
    const prev = e.lineas || [];
    const tipos = logEnvTiposActivos_(e.modalidad, e.incoterm, exterior);
    const libres = prev.filter(function (ln) { return ln.tipo === "libre"; });
    const usados = {};
    let n = 0;
    prev.forEach(function (ln) { n = Math.max(n, parseInt(String(ln.id).replace(/\D/g, ""), 10) || 0); });
    e.lineas = tipos.map(function (tipo) {
        const old = prev.find(function (ln) { return ln.tipo === tipo && !usados[ln.id]; });
        if (old) usados[old.id] = true;
        n += 1;
        return {
            id: old ? old.id : ("c" + n),
            tipo: tipo,
            concepto: logEnvEtiquetaTipo_(tipo, e.modalidad, esEn),
            conceptoManual: false,
            valor: old ? old.valor : null,
            pct: old ? old.pct : null,
            notas: old ? old.notas : "",
            fuente: old && (old.fuente === "[Estimado IA]" || old.fuente === "Aranceles") ? old.fuente : "",
            base: old && (old.base === "CIF" || old.base === "EXW" || old.base === "CIF+DUTY") ? old.base : "",
            arancelManual: !!(old && old.arancelManual),
            arancelFirma: old ? String(old.arancelFirma || "") : "",
            arancelNota: old ? String(old.arancelNota || "") : ""
        };
    }).concat(libres);
    e.plantilla = firma;
    return e.lineas;
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

function logCifExtra_() {
    let s = 0;
    let alguna = false;
    (logEnv_().lineas || []).forEach(function (ln) {
        if (ln.tipo !== "origen" && ln.tipo !== "flete_interno" && ln.tipo !== "flete_principal" && ln.tipo !== "seguro") return;
        if (ln.valor == null || !isFinite(Number(ln.valor))) return;
        s += Number(ln.valor);
        alguna = true;
    });
    return alguna ? s : 0;
}

function logDutySobre_(baseProd) {
    const lineas = (logQuote && logQuote.env && logQuote.env.lineas) || [];
    const ln = lineas.find(function (x) { return x.tipo === "duties"; });
    if (ln && ln.pct == null && ln.valor != null && isFinite(Number(ln.valor))) return Number(ln.valor);
    if (!ln || ln.pct == null || !isFinite(Number(ln.pct))) return 0;
    const cif = ln.base === "CIF";
    let b = baseProd;
    if (cif) {
        const extra = logCifExtra_();
        if (!(extra > 0)) return null;
        b = baseProd + extra;
    }
    return b * Number(ln.pct) / 100;
}

function logEnvBasePct_(ln, baseProd) {
    if (baseProd == null || !isFinite(baseProd)) return null;
    if (ln && ln.base === "CIF+DUTY") {
        const cif = logEnvBasePct_({ base: "CIF" }, baseProd);
        const duty = logDutySobre_(baseProd);
        if (cif == null || duty == null) return null;
        return cif + duty;
    }
    if (ln && ln.base === "CIF") {
        const extra = logCifExtra_();
        if (!(extra > 0)) return null;
        return baseProd + extra;
    }
    return baseProd;
}

function logEnvValorLinea_(ln, baseProd) {
    if (!ln) return null;
    let base = null;
    if (ln.valor != null && isFinite(ln.valor)) base = Number(ln.valor);
    else if ((ln.tipo === "duties" || ln.tipo === "taxes") && ln.pct != null) {
        const b = logEnvBasePct_(ln, baseProd);
        if (b == null) return null;
        base = b * ln.pct / 100;
    }
    if (base == null || !isFinite(base)) return null;
    let out = base * (1 + logMargenDeLinea_(ln) / 100);
    if (!logEsCotizacionExterior_() && ln.valor != null && isFinite(ln.valor)) out = logMonedaDesdeCop_(out);
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

function logMontoSobreBase_(exw, pct, kind, peso, duty) {
    if (exw == null || pct == null || !isFinite(Number(pct))) return null;
    let b = Number(exw);
    if (kind === "CIF" || kind === "CIF+DUTY") {
        const extra = logCifExtra_();
        if (!(extra > 0) || !(peso > 0)) return null;
        b = Number(exw) + extra * (Number(exw) / peso);
    }
    if (kind === "CIF+DUTY") {
        if (duty == null || !isFinite(Number(duty))) return null;
        b += Number(duty);
    }
    return b * Number(pct) / 100;
}

function logAplicarConceptoArancel_(ln, filasPais, bases, firma) {
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
                duty = logMontoSobreBase_(p.exw, p.dPct, p.dKind === "CIF" ? "CIF" : "EXW", peso, 0);
                if (duty == null) ok = false;
            }
            const m = logMontoSobreBase_(p.exw, p.pct, p.kind, peso, duty || 0);
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
        const n = logArancelNorm_(r.pais);
        if (pais && n === pais) return true;
        const lista = cod && alias[cod];
        return !!(lista && lista.indexOf(n) >= 0);
    });
    if (!filasPais.length) return false;
    const idioma = (typeof logisticaLeerOpciones_ === "function" ? logisticaLeerOpciones_().idioma : "es");
    const bases = logBasesPorPartida_(idioma, "");
    const firma = cod + "|" + Object.keys(bases).sort().join(",");
    let cambio = false;
    (e.lineas || []).forEach(function (ln) {
        if (ln.tipo !== "duties" && ln.tipo !== "taxes") return;
        if (logAplicarConceptoArancel_(ln, filasPais, bases, firma)) cambio = true;
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
        if (!r || !r.exito || !r.data) return;
        logAranceles.filas = r.data.filas || [];
        if (typeof pintarTablaPartidas === "function") pintarTablaPartidas();
        if (typeof logPintarSelectPartida_ === "function" && document.getElementById("fichaPartida")) {
            const el = typeof elementoActivoObj_ === "function" ? elementoActivoObj_() : null;
            logPintarSelectPartida_(el && el.fichaComercial ? el.fichaComercial.partida : "");
        }
        if (logAplicarAranceles_()) {
            logisticaPintarEnv_(true);
            if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
        }
    } catch (e) { /* el backend publicado todavía no tiene esta acción */ }
}

function logEnvActivo_() {
    return logEnv_().activo !== false;
}

function logEnvSuma_(baseProd) {
    if (!logEnvActivo_()) return 0;
    let s = 0;
    let alguna = false;
    logEnv_().lineas.forEach(function (ln) {
        const v = logEnvValorLinea_(ln, baseProd);
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

function logEnvTitulo_(cual, T, mon, esEn) {
    const e = logEnv_();
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
    if (cual !== "gran" && String(custom || "").trim()) return String(custom).trim();
    if (cual === "prod") {
        if (!logEsCotizacionExterior_()) return logSufijoMon_(esEn ? "SUBTOTAL PRICE" : "PRECIO SUBTOTAL", mon);
        return logSufijoMon_(esEn ? "EXW SUBTOTAL PRICE" : "PRECIO SUBTOTAL EXWORKS", mon);
    }
    if (cual === "log") return logSufijoMon_(esEn ? "TOTAL LOGISTICS PRICE" : "PRECIO TOTAL LOGÍSTICA", mon);
    if (cual === "gran" && typeof logPagoAsegurar_ === "function" && logPagoAsegurar_().iva && !String(custom || "").trim()) {
        return logSufijoMon_(esEn ? "TOTAL PRICE BEFORE VAT" : "PRECIO TOTAL ANTES DE IVA", mon);
    }
    if (!logEsCotizacionExterior_()) {
        return conMoneda_(String(custom || "").trim() || (esEn ? "GRAND TOTAL BEFORE VAT" : "GRAN TOTAL SIN IVA"));
    }
    const cabeza = esEn ? "GRAND TOTAL" : "GRAN TOTAL";
    let frase = String(custom || "").trim().replace(new RegExp("\\s*\\(" + mon + "\\)\\s*$", "i"), "").trim();
    frase = frase.replace(/^(GRAND TOTAL|GRAN TOTAL)\s+/i, "").trim();
    const ciudad = (e.destinoCiudad || "").trim().toUpperCase();
    const cod = (e.destinoCodigo || "").trim().toUpperCase();
    const esc_ = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    if (ciudad) frase = frase.replace(new RegExp("\\s+" + esc_(ciudad) + (cod ? "(?:\\s+" + esc_(cod) + ")?" : "") + "\\s*$", "i"), "").trim();
    if (cod) frase = frase.replace(new RegExp("\\s+" + esc_(cod) + "\\s*$", "i"), "").trim();
    const incNow = String(e.incoterm || "EXW").toUpperCase();
    const mInc = /^(EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b\s*(.*)$/i.exec(frase);
    if (!frase) frase = incNow;
    else if (mInc && mInc[1].toUpperCase() !== incNow) frase = incNow;
    else if (mInc) frase = (incNow + " " + (mInc[2] || "")).trim();
    else frase = (incNow + " " + frase).trim();
    return conMoneda_(cabeza + " " + frase + (ciudad ? " " + ciudad : "") + (cod ? " " + cod : ""));
}

function logEnvLineaPdf_(T, esEn) {
    if (!logEsCotizacionExterior_()) return "";
    const e = logEnv_();
    const dest = [e.destinoCiudad, e.destinoCodigo || e.destinoPais].filter(Boolean).join(", ");
    let s = (T.incoterm || "Incoterm") + ": " + e.incoterm;
    if (dest) s += " · " + (T.destino || (esEn ? "Destination" : "Destino")) + ": " + dest;
    return s;
}

function logEsEnvio_(fila) {
    return !!(fila && fila.tipo === "envio");
}

function logHayEnvios_() {
    return (logQuote.filas || []).some(logEsEnvio_);
}

/** Volumen de una caja de empaque en m³. Null si faltan las 3 medidas. */
function logVolCajaM3_(ficha) {
    if (!ficha) return null;
    const w = Number(ficha.empAncho);
    const d = Number(ficha.empFondo);
    const h = Number(ficha.empAlto);
    if (!(w > 0 && d > 0 && h > 0)) return null;
    const f = ficha.um === "in" ? 0.0254 : 0.01;
    return w * f * d * f * h * f;
}

function logFmtM3_(n, idioma) {
    if (n == null || !isFinite(n)) return "—";
    const s = n.toFixed(n >= 10 ? 2 : 3);
    return (idioma === "en" ? s : s.replace(".", ",")) + " m³";
}

/** Aérea: cm³/6.000. Courier: cm³/5.000. El resto de modalidades no tiene kg vol. */
function logKgVolDivisor_() {
    if (typeof logEsCotizacionExterior_ === "function" && !logEsCotizacionExterior_()) return null;
    const mod = logEnv_().modalidad;
    if (mod === "aerea") return 6000;
    if (mod === "courier") return 5000;
    return null;
}

/** Medidas de la caja en cm. La ficha puede estar en pulgadas. */
function logCajaCm_(ficha) {
    if (!ficha) return null;
    const w = Number(ficha.empAncho);
    const d = Number(ficha.empFondo);
    const h = Number(ficha.empAlto);
    if (!(w > 0 && d > 0 && h > 0)) return null;
    const f = ficha.um === "in" ? 2.54 : 1;
    return { w: w * f, d: d * f, h: h * f };
}

/** Peso real de una caja, en kg. La ficha lo guarda en kg (cm) o lb (in). */
function logPesoCajaKg_(ficha) {
    if (!ficha) return null;
    const n = Number(ficha.empPeso);
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
function logKgVolCaja_(ficha) {
    const div = logKgVolDivisor_();
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
    const und = Number(f.empUnd);
    const vol = logVolCajaM3_(f);
    const cajas = und > 0 ? Math.ceil(qty / und) : null;
    const m3 = cajas != null && vol != null ? cajas * vol : null;
    const kgCaja = logKgVolCaja_(f);
    const kgVol = cajas != null && kgCaja != null ? cajas * kgCaja : null;
    const pesoCaja = logPesoCajaKg_(f);
    const peso = cajas != null && pesoCaja != null ? cajas * pesoCaja : null;
    return { qty: qty, und: und, cajas: cajas, volCaja: vol, m3: m3, kgVol: kgVol, pesoKg: peso };
}

function logCubicajeTotal_(idioma) {
    const escs = logEscList_();
    const k = escs.length ? escs[0].id : "";
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

/** Precios (COP) de todas las escalas de una versión, con el mismo motor AIU del simulador. */
function logPreciosVersion_(verId, elemId) {
    try {
        if (typeof calcularPreciosVersion_ !== "function") return null;
        const v = logVersiones_().find(function (x) { return String(x.id) === String(verId); });
        if (!v) return null;
        if (elemId && v.elementos && v.elementos.length) {
            const el = v.elementos.find(function (e) { return String(e.id) === String(elemId); });
            if (!el) return null;
            const viva = String(verId) === String(window.versionActivaId) &&
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
    const viva = String(verId) === String(window.versionActivaId) &&
        (!elemId || String(elemId) === String(window.elementoActivoId || ""));
    if (viva && typeof leerFichaComercialUI === "function") {
        return leerFichaComercialUI();
    }
    const v = logVersiones_().find(function (x) { return String(x.id) === String(verId); });
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

/* --- escenarios (Opción 1…n): columnas lado a lado, cada una con su cantidad/precio por fila --- */

/** Escenarios activos (vacío en modo "cantidad única"). */
function logEscList_() {
    return logQuote.modo === "esc" && Array.isArray(logQuote.escenarios) ? logQuote.escenarios : [];
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

function logNuevaFilaItem_(verId, proy, elemId) {
    const pr = logPreciosVersion_(verId, elemId);
    const l = pr && pr.escalas.length ? pr.escalas[0] : null;
    const fila = { uid: logNuevoUid_(), tipo: "item", proy: proy || "", ver: verId, elem: elemId || "", lote: l ? l.id : "", over: {} };
    const ref = logImgRefElemento_(elemId, verId);
    if (ref) fila.imgRef = ref;
    if ((logQuote.escenarios || []).length) logOpcCompletar_(fila);
    logAsegurarPartida_(fila);
    return fila;
}

function logisticaCambiarModo_(modo) {
    modo = modo === "esc" ? "esc" : "unica";
    if (modo === logQuote.modo) return;
    logQuote.modo = modo;
    if (modo === "esc") {
        if (!(logQuote.escenarios || []).length) {
            logQuote.escenarios = [{ id: logNuevoEscId_(), nombre: "" }, { id: logNuevoEscId_(), nombre: "" }];
        }
        logQuote.filas.forEach(logOpcCompletar_);
    }
    logMarcarSucio_();
    logisticaRefrescarTabla_();
}

function logisticaAgregarEscenario_() {
    if ((logQuote.escenarios || []).length >= 6) return;
    logQuote.escenarios.push({ id: logNuevoEscId_(), nombre: "" });
    logQuote.filas.forEach(logOpcCompletar_);
    logMarcarSucio_();
    logisticaRefrescarTabla_();
}

function logisticaQuitarEscenario_(id) {
    if ((logQuote.escenarios || []).length <= 2) return;
    logQuote.escenarios = logQuote.escenarios.filter(function (e) { return e.id !== id; });
    logQuote.filas.forEach(function (f) {
        if (f.opc) delete f.opc[id];
        if (f.excl) delete f.excl[id];
        if (f.over) { delete f.over["qty:" + id]; delete f.over["unit:" + id]; }
    });
    logMarcarSucio_();
    logisticaRefrescarTabla_();
}

let logEscFirmaPintada = "";
function logEscFirma_() {
    return logQuote.modo + "|" + (logQuote.escenarios || []).map(function (e) { return e.id + "=" + (e.nombre || ""); }).join(",");
}

/** Panel de escenarios (modo, nombres, agregar/quitar). Solo se repinta si cambió su estructura, para no perder el foco al escribir. */
function logisticaPintarEscenarios_(soloSiCambio) {
    const rU = document.getElementById("logModoUnica");
    const rE = document.getElementById("logModoEsc");
    if (rU) rU.checked = logQuote.modo !== "esc";
    if (rE) rE.checked = logQuote.modo === "esc";
    const box = document.getElementById("logEscPanel");
    if (!box) return;
    const firma = logEscFirma_();
    if (soloSiCambio && firma === logEscFirmaPintada) return;
    logEscFirmaPintada = firma;
    box.classList.toggle("d-none", logQuote.modo !== "esc");
    if (logQuote.modo !== "esc") { box.innerHTML = ""; return; }
    const idioma = logisticaLeerOpciones_().idioma;
    const esc = logQuote.escenarios || [];
    box.innerHTML = esc.map(function (e, i) {
        return "<div class=\"log-esc-item\" data-e=\"" + logEsc_(e.id) + "\"><span class=\"badge text-bg-primary\">" + (i + 1) + "</span>" +
            "<input type=\"text\" class=\"form-control form-control-sm\" data-esc-nombre value=\"" + logEsc_(e.nombre || "") + "\" placeholder=\"" + logEsc_(logEscNombre_({}, i, idioma)) + "\" title=\"Nombre de la opción (se ve en la hoja)\">" +
            (esc.length > 2 ? "<button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-esc-del title=\"Quitar esta opción\"><i class=\"bi bi-x-lg\"></i></button>" : "") +
            "</div>";
    }).join("") +
        (esc.length < 6 ? "<button type=\"button\" class=\"btn btn-sm btn-outline-primary\" data-esc-add><i class=\"bi bi-plus-lg me-1\"></i>Agregar opción</button>" : "");
}

function logisticaEventosEscenarios_(ev) {
    const t = ev.target;
    if (ev.type === "input") {
        const inp = t.closest && t.closest("[data-esc-nombre]");
        if (!inp) return;
        const e = (logQuote.escenarios || []).find(function (x) { return x.id === inp.closest("[data-e]").getAttribute("data-e"); });
        if (!e) return;
        e.nombre = inp.value;
        logEscFirmaPintada = logEscFirma_(); /* el panel ya refleja el cambio: no se repinta */
        logMarcarSucio_();
        logisticaRefrescarTabla_();
        return;
    }
    const add = t.closest("[data-esc-add]");
    if (add) { logisticaAgregarEscenario_(); return; }
    const del = t.closest("[data-esc-del]");
    if (del) logisticaQuitarEscenario_(del.closest("[data-e]").getAttribute("data-e"));
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
    const ek = escId ? ":" + escId : "";
    /* escala de la que sale el precio: en un escenario, la elegida para él; si no, la de la fila */
    let loteSel = escId && fila.opc && Object.prototype.hasOwnProperty.call(fila.opc, escId) ? fila.opc[escId] : fila.lote;
    if (!loteSel && fila.tipo === "item" && !fila.snap) {
        const pr0 = logPreciosVersion_(fila.ver, fila.elem);
        if (pr0 && pr0.escalas && pr0.escalas[0]) loteSel = pr0.escalas[0].id;
    }
    const v = { tipo: fila.tipo, cod: "", titulo: "", desc: "", dimTxt: "", empTxt: "", qty: 1, unit: null, img: fila.img || "", aviso: "", excl: !!(escId && fila.excl && fila.excl[escId]) };
    if (fila.tipo === "seccion") {
        v.titulo = has("titulo") ? ov.titulo : "";
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
            const verEl = logVersiones_().find(function (x) { return String(x.id) === String(fila.ver); });
            const elObj = verEl && verEl.elementos ? verEl.elementos.find(function (e) { return String(e.id) === String(fila.elem); }) : null;
            nomElem = (elObj && elObj.nombre) || "";
        }
        v.titulo = nomElem ? (f.titulo && f.titulo !== nomElem ? nomElem + " — " + f.titulo : nomElem) : (f.titulo || nombreProy);
        v.desc = f.descripcion || "";
        v.dimTxt = logFmtMedidasFicha_(logConvertirUm_([f.dimAncho, f.dimFondo, f.dimAlto], umFicha, umDoc), umDoc, idioma);
        v.empTxt = logFmtMedidasFicha_(logConvertirUm_([f.empAncho, f.empFondo, f.empAlto], umFicha, umDoc), umDoc, idioma);
        if (v.empTxt && Number(f.empUnd) > 0) v.empTxt += " · " + Number(f.empUnd) + " " + T.undEmp;
        if (esc) {
            v.qty = esc.q;
            v.unit = logQuote.moneda === "USD" ? esc.puCop / (logTrm_() || pr.trm || 1) : esc.puCop;
        } else {
            v.aviso = "Esta versión no tiene precios calculados (genera la matriz primero).";
        }
    }
    ["cod", "titulo", "desc"].forEach(function (k) { if (has(k)) v[k] = ov[k]; });
    /* lo escrito a mano: por escenario; en filas libres, si no hay dato propio del escenario, vale el general */
    const ovDe = function (k) {
        if (has(k + ek)) return { v: ov[k + ek] };
        if (escId && fila.tipo !== "item" && has(k)) return { v: ov[k] };
        return null;
    };
    const oq = ovDe("qty");
    if (oq) v.qty = oq.v;
    const ou = ovDe("unit");
    if (ou) v.unit = ou.v;
    if (v.excl) { v.qty = null; v.unit = null; v.aviso = ""; }
    else if (typeof v.unit === "number" && fila.tipo !== "seccion" && !logEsEnvio_(fila)) v.unit = v.unit * logComisionFactor_(fila);
    if (typeof v.unit === "number" && logEsEnvio_(fila) && !logEsCotizacionExterior_()) v.unit = logMonedaDesdeCop_(v.unit);
    if (typeof v.unit === "number") v.unit = logRedondear_(v.unit);
    if (!v.img && fila.tipo === "item") {
        const deElem = (fila.elem && typeof window.imagenCotizacionElemento === "function")
            ? window.imagenCotizacionElemento(fila.elem)
            : "";
        if (deElem) v.img = deElem;
        else if (logImgOdoo.url && logImgOdoo.codigo === fila.proy) v.img = logImgOdoo.url;
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
        if (fila.tipo === "seccion" || logEsEnvio_(fila)) return;
        const sub = logSub_(logFilaValores_(fila, idioma, k));
        if (sub == null) return;
        const f = logComisionFactor_(fila) || 1;
        s += sub / f;
    });
    return s;
}

/** Totales partidos: productos, envíos y gran total. Misma forma { e1: n } o { "": n }. */
function logTotalesPartes_(idioma) {
    const escs = logEscList_();
    const claves = escs.length ? escs.map(function (e) { return e.id; }) : [""];
    const vacio = function () { const o = {}; claves.forEach(function (k) { o[k] = 0; }); return o; };
    const prod = vacio();
    const env = vacio();
    const gran = vacio();
    logQuote.filas.forEach(function (fila) {
        if (fila.tipo === "seccion") return;
        claves.forEach(function (k) {
            const s = logSub_(logFilaValores_(fila, idioma, k));
            if (s == null) return;
            if (logEsEnvio_(fila)) {
                if (!logEnvActivo_()) return;
                env[k] += s;
            } else prod[k] += s;
            gran[k] += s;
        });
    });
    claves.forEach(function (k) {
        const L = logEnvSuma_(logBaseLogistica_(idioma, k));
        env[k] += L;
        gran[k] += L;
    });
    const desc = vacio();
    claves.forEach(function (k) {
        desc[k] = logDescuentoActivo_() ? logRedondear_((prod[k] || 0) * logDescuentoPct_() / 100) : 0;
        gran[k] += desc[k];
    });
    return { prod: prod, env: env, gran: gran, desc: desc };
}

/** Cómo se imprime: el % oculto entra a los productos; el visible queda en logística. El gran total no cambia. */
function logEnvPresentacion_(idioma) {
    const partes = logTotalesPartes_(idioma);
    const e = logEnv_();
    const pct = e.modoCosto === "resumen" ? e.resumenPct / 100 : 1;
    const claves = Object.keys(partes.prod);
    const pres = { prod: {}, env: {}, gran: {}, desc: partes.desc || {}, shares: {} };
    claves.forEach(function (k) {
        const base = partes.prod[k] || 0;
        const L = partes.env[k] || 0;
        const oculto = L * (1 - pct);
        pres.prod[k] = base + oculto;
        pres.env[k] = L - oculto;
        pres.gran[k] = partes.gran[k] || 0;
        logQuote.filas.forEach(function (fila) {
            if (fila.tipo === "seccion" || logEsEnvio_(fila)) return;
            const s = logSub_(logFilaValores_(fila, idioma, k));
            pres.shares[k + "|" + fila.uid] = (s != null && base > 0 && oculto) ? oculto * (s / base) : 0;
        });
    });
    return pres;
}

/** Gran total (productos + envíos). Lo usa el historial y el nombre de archivo. */
function logTotales_(idioma) {
    return logTotalesPartes_(idioma).gran;
}

function logisticaTablaHTML_(idioma) {
    logAsegurarFilas_();
    logEnvAsegurarLineas_(idioma === "en");
    const T = LOG_TEXTOS[idioma];
    const esEn = idioma === "en";
    const geo = logGeometriaCols_();
    const cols = geo.cols;
    const n = cols.length;
    const escs = geo.esc ? logEscList_() : [];
    const mon = logQuote.moneda;
    const nd = logDecimales_();
    const pres = logEnvPresentacion_(idioma);
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
    let filasHtml = "";
    logQuote.filas.forEach(function (fila) {
        if (logEsEnvio_(fila)) return;
        const v0 = logFilaValores_(fila, idioma, "");
        if (fila.tipo === "seccion") {
            filasHtml += "<tr class=\"sec\" data-r=\"" + fila.uid + "\"><td colspan=\"" + n + "\">" +
                edr(fila, "titulo", v0.titulo, esEn ? "Section title" : "Título de la sección") + "</td></tr>";
            return;
        }
        const claves = escs.length ? escs.map(function (e) { return e.id; }) : [""];
        const vE = {};
        claves.forEach(function (k) { vE[k] = k ? logFilaValores_(fila, idioma, k) : v0; });
        /* opciones excluidas no ocupan fila; si todas están fuera, se deja una con rayas */
        let stack = claves.filter(function (k) { return !vE[k].excl; });
        if (!stack.length) stack = [claves[0]];
        const rs = stack.length;
        const alto = logLayout.filaAlto[fila.uid] || LOG_ALTO_IMG_DEFAULT_IN;
        const tx = logTexto_();
        let medidas = "";
        if (tx.medidas) {
            if (v0.dimTxt) medidas += "<div class=\"it-med\"><b>" + logEsc_(T.dim) + ":</b> " + logEsc_(v0.dimTxt) + "</div>";
            if (v0.empTxt) medidas += "<div class=\"it-med\"><b>" + logEsc_(T.emp) + ":</b> " + logEsc_(v0.empTxt) + "</div>";
        }
        stack.forEach(function (eId, i) {
            const ve = vE[eId];
            const celdas = cols.map(function (c) {
                if (LOG_NUM_KEYS_.indexOf(c.k) >= 0) return celdaNum_(c, fila, ve, eId);
                if (i > 0) return ""; /* imagen, código y descripción se comparten (rowspan) */
                const span = rs > 1 ? " rowspan=\"" + rs + "\"" : "";
                if (c.k === "img") {
                    return "<td class=\"c td-img\" data-k=\"img\"" + span + " style=\"height:" + (alto + 0.12).toFixed(3) + "in\">" +
                        "<img class=\"thumb\" data-r=\"" + fila.uid + "\" style=\"height:" + alto.toFixed(3) + "in\" src=\"" + logEsc_(v0.img || LOG_THUMB_SVG_) + "\" alt=\"\"></td>";
                }
                if (c.k === "cod") return "<td class=\"c\" data-k=\"cod\"" + span + ">" + edr(fila, "cod", v0.cod, esEn ? "Code" : "Código") + "</td>";
                let bloque = "";
                if (tx.titulo) bloque += "<div class=\"it-nom\">" + edr(fila, "titulo", v0.titulo, esEn ? "Title" : "Título") + "</div>";
                if (tx.desc === "full") {
                    bloque += "<div class=\"it-desc\">" + edr(fila, "desc", v0.desc, esEn ? "Description" : "Descripción") + "</div>";
                } else if (tx.desc === "lite") {
                    const lite = logDescLite_(v0.desc);
                    bloque += "<div class=\"it-desc it-desc-lite\" title=\"" + logEsc_(v0.desc) + "\">" + logEsc_(lite) + "</div>";
                }
                return "<td data-k=\"desc\"" + span + ">" + bloque + medidas + "</td>";
            }).join("");
            filasHtml += "<tr class=\"it" + (i ? " it-cont" : "") + "\" data-r=\"" + fila.uid + "\"" + (eId ? " data-e=\"" + eId + "\"" : "") + ">" + celdas + "</tr>";
        });
    });
    const logOn = logEnvActivo_();
    const envios = logOn ? logQuote.filas.filter(logEsEnvio_) : [];
    const hayProducto = logQuote.filas.some(function (f) { return f.tipo !== "envio"; });
    if (!hayProducto && !envios.length) {
        filasHtml = "<tr class=\"vacio\"><td colspan=\"" + n + "\" style=\"text-align:center;color:#9e9e9e;padding:18px\">" +
            (esEn ? "No rows yet: use “Add row”." : "Aún no hay filas: usa «Agregar fila».") + "</td></tr>";
    }
    const partes = logTotalesPartes_(idioma);
    const tClaves = escs.length ? escs.map(function (e) { return e.id; }) : [""];
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
        if (logEnv_().modoCosto === "resumen") {
            bloqueLog += filaMontos_("it it-env", "env", edTit("titSubLog", logEnvTitulo_("log", T, mon, esEn)), pres.env);
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
                            const v = logEnvValorLinea_(ln, base);
                            if (v == null) return;
                            s += v;
                            alguna = true;
                        });
                        montos[k] = alguna ? s : 0;
                    } else {
                        const v = logEnvValorLinea_(item.ln, base);
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
    filasHtml += bloqueLog;
    let totalHtml = "";
    if (mostrarGran) totalHtml += filaMontos_("tot gran", "gran", edTit("titGran", logEnvTitulo_("gran", T, mon, esEn)), pres.gran);
    if (mostrarGran && typeof logPagoAsegurar_ === "function") {
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
    const colgroup = "<colgroup>" + cols.map(function (c) { return "<col style=\"width:" + c.w + "%\">"; }).join("") + "</colgroup>";
    const rzAttr = function (idx) {
        if (idx >= cols.length - 1) return "";
        return " data-rz=\"" + cols[idx].li + "\" data-rz2=\"" + cols[idx + 1].li + "\" data-pc=\"" + cols[idx].pc + "\" data-pc2=\"" + cols[idx + 1].pc + "\" data-sc=\"1\"";
    };
    const nombreCol = function (c) {
        if (c.k === "pu") return (esEn ? "Unit" : "Precio unit") + " · " + mon;
        return T.cols[c.k];
    };
    const thead = "<thead><tr>" + cols.map(function (c, i) {
        return "<th data-c=\"" + c.k + "\"" + rzAttr(i) + ">" + logEsc_(nombreCol(c)) + "</th>";
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
            if (fila.tipo === "seccion") return;
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

/** Imagen original disponible para una fila: la subida a mano o, si no, la de Odoo. */
function logImgFuente_(fila) {
    if (fila.imgSrc) return fila.imgSrc;
    if (fila.img) return fila.img; /* sin original cargado: se edita sobre la imagen ya guardada */
    if (fila.elem && typeof window.imagenCotizacionElemento === "function") {
        const deElem = window.imagenCotizacionElemento(fila.elem);
        if (deElem) return deElem;
    }
    if (fila.tipo === "item" && logImgOdoo.orig && logImgOdoo.codigo === fila.proy) return logImgOdoo.orig;
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

/** Baja de Drive los renders que no quedaron en la hoja (cotización guardada). */
async function logisticaRecargarImgs_(opts) {
    opts = opts || {};
    if (_logImgsP && !opts.todas) return _logImgsP;
    const filas = opts.filas || (opts.todas
        ? (logQuote.filas || []).filter(function (f) { return f.imgRef || f.srcRef; })
        : logisticaFilasImgPendientes_());
    if (!filas.length) {
        if (!opts.silencio && typeof mostrarNotificacion === "function") {
            mostrarNotificacion("No hay fotos pendientes. Si el PDF salió en blanco, pulsa PDF otra vez.", "info");
        }
        logCargaBar_("");
        return 0;
    }
    const abierta = logQuote.abierta;
    const trabajo = (async function () {
        const t0 = Date.now();
        let ok = 0;
        let fail = 0;
        for (let i = 0; i < filas.length; i++) {
            if (logQuote.abierta !== abierta) break;
            const fila = filas[i];
            const ref = fila.imgRef || fila.srcRef;
            fila._imgBlob = false;
            logCargaBar_("Cargando fotos " + (i + 1) + " de " + filas.length + " · " + Math.floor((Date.now() - t0) / 1000) + " s");
            if (typeof textoEsperaNube === "function" && opts.espera) {
                textoEsperaNube("Trayendo render " + (i + 1) + " de " + filas.length + "…");
            }
            try {
                const r = await realizarPeticionBD({ action: "cotizacion_imagenes", ids: [ref], modo: "blob" }, { timeoutMs: 60000 });
                const u = r && r.exito && r.data ? (r.data[ref] || "") : "";
                if (u && /^data:image\//.test(u)) {
                    logIdbPutImg_(ref, u);
                    fila.img = u;
                    fila._imgBlob = true;
                    logisticaPonerImgFila_(fila.uid, u);
                    ok++;
                } else fail++;
            } catch (e) { fail++; }
        }
        if (logQuote.abierta === abierta) {
            logCargaBar_("");
            if (ok) logisticaRefrescarTabla_();
            if (fail) logisticaAvisarImgsPendientes_();
            if (!opts.silencio && typeof mostrarNotificacion === "function") {
                if (ok && !fail) mostrarNotificacion("Imágenes listas. Ya puedes bajar el PDF.", "success");
                else if (ok) mostrarNotificacion("Llegaron " + ok + " de " + filas.length + " fotos. Pulsa Recargar imágenes otra vez.", "warning");
                else mostrarNotificacion("No se pudieron traer las fotos de Drive. Reintenta en un momento.", "danger");
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
    if (!fila || fila.tipo === "seccion" || fila.tipo === "envio") return;
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
    if (p.hayProyecto) {
        logVersiones_().forEach(function (v) {
            const nota = v.comentario ? " · " + String(v.comentario).slice(0, 28) : "";
            html += "<li><button type=\"button\" class=\"dropdown-item\" data-add=\"item\" data-ver=\"" + logEsc_(v.id) + "\"><i class=\"bi bi-box-seam me-2\"></i>Versión " + logEsc_(v.id) + logEsc_(nota) + "</button></li>";
        });
        html += "<li><hr class=\"dropdown-divider\"></li>";
    }
    html += "<li><button type=\"button\" class=\"dropdown-item\" data-add=\"otro\"><i class=\"bi bi-collection me-2\"></i>De otro proyecto (nube)</button></li>" +
        "<li><button type=\"button\" class=\"dropdown-item\" data-add=\"libre\"><i class=\"bi bi-pencil-square me-2\"></i>Fila libre (escrita a mano)</button></li>" +
        "<li><button type=\"button\" class=\"dropdown-item\" data-add=\"seccion\"><i class=\"bi bi-layout-text-sidebar me-2\"></i>Sección (título)</button></li>";
    menu.innerHTML = html;
}

/** Comisión de venta de esta cotización. El % sale del presupuesto; la base es solo el precio de los proyectos. */
function logComisionDesdeCostos_() {
    const sel = document.getElementById("simComision");
    const pct = sel ? parseFloat(sel.value) : 0;
    const opt = sel && sel.selectedOptions && sel.selectedOptions[0];
    const fee = parseFloat((document.getElementById("simFee") || {}).value);
    const p = isNaN(pct) ? 0 : pct;
    return {
        pct: p,
        pctBase: p,
        nombre: opt ? String(opt.textContent || "").trim() : "",
        fee: isNaN(fee) ? 0 : fee,
        valorManual: null
    };
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
    return {
        pct: isNaN(pct) ? 0 : Math.max(0, pct),
        pctBase: isNaN(pctBase) ? (isNaN(pct) ? 0 : Math.max(0, pct)) : Math.max(0, pctBase),
        nombre: String(o.nombre || ""),
        fee: isNaN(fee) ? 0 : fee,
        valorManual: Object.keys(manual).length ? manual : null
    };
}

function logComisionAsegurar_() {
    if (!logQuote.comision) logQuote.comision = logComisionNormalizar_(logComisionDesdeCostos_());
    else logQuote.comision = logComisionNormalizar_(logQuote.comision);
    return logQuote.comision;
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
    if (!fila || fila.tipo === "seccion" || logEsEnvio_(fila)) return 1;
    const c = logComisionAsegurar_();
    const o = logComisionOrigen_(fila);
    const den = 100 + (Number(o.pct) || 0) + (Number(o.fee) || 0);
    const feeEnPrecio = logDescuentoActivo_() ? 0 : (Number(o.fee) || 0);
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
        logQuote.descuento = { activo: false, pct: fee, titulo: "", tituloManual: false, pctManual: false, nota: "" };
    }
    if (logQuote.descuento.nota == null) logQuote.descuento.nota = "";
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

function logDescuentoActivo_() {
    return !!(logQuote && logQuote.descuento && logQuote.descuento.activo);
}

function logDescuentoPct_() {
    const d = logDescuentoAsegurar_();
    if (d.pctManual || (logQuote && logQuote.abierta)) return Number(d.pct) || 0;
    const vivo = parseFloat((document.getElementById("simFee") || {}).value);
    if (!isNaN(vivo)) return vivo;
    return Number(d.pct) || 0;
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
    const pct = logDescuentoPct_();
    if (document.activeElement !== pctEl) pctEl.value = String(pct);
    if (notaEl && document.activeElement !== notaEl) notaEl.value = d.nota || "";
    btn.className = "btn btn-sm " + (d.activo ? "btn-diforma-blue" : "btn-outline-secondary");
    btn.innerHTML = d.activo ? "<i class=\"bi bi-lock-fill\"></i>" : "<i class=\"bi bi-unlock\"></i>";
    btn.title = d.activo
        ? "Candado cerrado: la línea sale en la cotización. Clic para quitarla y devolver el fee al precio."
        : "Candado abierto: el fee sigue dentro del precio. Clic para sacar la línea.";
    if (!info || info.contains(document.activeElement)) return;
    const idioma = logisticaLeerOpciones_().idioma;
    const partes = logTotalesPartes_(logisticaLeerOpciones_().idioma);
    const escs = logEscList_();
    const k = escs.length ? escs[0].id : "";
    const monto = (partes.desc && partes.desc[k]) || 0;
    const mon = logQuote.moneda || "COP";
    info.textContent = d.activo
        ? ((idioma === "en" ? "On the quote: " : "En la cotización: ") + logFmtMoneda_(monto, "es", logDecimales_()) + " " + mon)
        : (idioma === "en" ? "Off. The fee stays inside the unit price." : "Apagado. El fee sigue dentro del precio unitario.");
}

function logisticaOnDescuento_(ev) {
    const t = ev.target;
    if (!t) return;
    const d = logDescuentoAsegurar_();
    if (t.id === "logDescuentoLock" || (t.closest && t.closest("#logDescuentoLock"))) {
        d.activo = !d.activo;
        if (!d.pctManual) d.pct = logDescuentoPct_();
        if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
        logisticaActualizarVista();
        return;
    }
    if (t.id === "logDescuentoPct") {
        const n = parseFloat(String(t.value).replace(",", "."));
        d.pct = isNaN(n) ? 0 : n;
        d.pctManual = true;
        if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
        if (d.activo) logisticaActualizarVista();
        else logisticaPintarDescuento_();
        return;
    }
    if (t.id === "logDescuentoNota") {
        d.nota = String(t.value || "");
        if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
        if (d.activo) logisticaActualizarVista();
    }
}

function logPagoPctAnticipoDef_() {
    const vars = (typeof logTycDoc_ === "function") ? logTycDoc_().vars : LOG_TYC_VARS_DEF_;
    const n = parseFloat(String((vars && vars.anticipo) || "50").replace(",", ".").replace("%", ""));
    return isFinite(n) ? n : 50;
}

function logPagoDef_() {
    return { iva: false, ivaPct: 19, anticipo: false, anticipoPct: logPagoPctAnticipoDef_(), titConIva: "", titAnt: "", titSaldo: "" };
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
    return p;
}

function logPagoMontos_(gran) {
    const p = logPagoAsegurar_();
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
    const p = logPagoAsegurar_();
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
    const escs = logEscList_();
    const k = escs.length ? escs[0].id : "";
    const gran = (logTotalesPartes_(idioma).gran || {})[k] || 0;
    const m = logPagoMontos_(gran);
    const mon = logQuote.moneda || "COP";
    const bits = [];
    if (p.iva) bits.push((idioma === "en" ? "With VAT: " : "Con IVA: ") + logFmtMoneda_(m.conIva, "es", logDecimales_()) + " " + mon);
    if (p.anticipo) bits.push((idioma === "en" ? "Advance: " : "Anticipo: ") + logFmtMoneda_(m.anticipo, "es", logDecimales_()) + " · " + (idioma === "en" ? "Balance: " : "Saldo: ") + logFmtMoneda_(m.saldo, "es", logDecimales_()) + " " + mon);
    info.textContent = bits.join(" · ");
}

function logisticaOnPago_(ev) {
    if (logPagoPintando_) return;
    const t = ev.target;
    if (!t) return;
    const p = logPagoAsegurar_();
    if (t.id === "logPagoIva") p.iva = !!t.checked;
    else if (t.id === "logPagoAnticipo") p.anticipo = !!t.checked;
    else if (t.id === "logPagoIvaPct") {
        const n = parseFloat(String(t.value).replace(",", "."));
        p.ivaPct = isNaN(n) ? 19 : n;
    } else if (t.id === "logPagoAnticipoPct") {
        const n = parseFloat(String(t.value).replace(",", "."));
        p.anticipoPct = isNaN(n) ? logPagoPctAnticipoDef_() : n;
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
    const rows = logComisionLista_();
    const activo = document.activeElement;
    if (activo !== sel) {
        let elegido = -1;
        rows.forEach(function (r, i) {
            if (elegido < 0 && Math.abs(r.pct - c.pct) < 0.001 && (!c.nombre || r.nombre === c.nombre || String(c.nombre).indexOf(r.nombre) >= 0)) elegido = i;
        });
        if (elegido < 0) {
            rows.forEach(function (r, i) { if (elegido < 0 && Math.abs(r.pct - c.pct) < 0.001) elegido = i; });
        }
        sel.innerHTML = rows.map(function (r, i) {
            return "<option value=\"" + i + "\">" + logEsc_(r.nombre) + " (" + logFmtNum_(r.pct, "es", 1) + "%)</option>";
        }).join("") + "<option value=\"custom\">Otro %</option>";
        sel.value = elegido < 0 ? "custom" : String(elegido);
    }
    if (activo !== pctEl) pctEl.value = String(c.pct);
    if (box.contains(activo)) return;
    const idioma = logisticaLeerOpciones_().idioma;
    const bases = logTotalesPartes_(idioma).prod;
    const escs = logEscList_();
    const claves = escs.length ? escs : [{ id: "", nombre: "" }];
    const mon = logQuote.moneda || "COP";
    const nd = logDecimales_();
    box.innerHTML = claves.map(function (e, i) {
        const k = e.id || "";
        const base = bases[k] || 0;
        const calc = logComisionValor_(base, c.pct, logDescuentoActivo_() ? 0 : c.fee);
        const manual = c.valorManual && Object.prototype.hasOwnProperty.call(c.valorManual, k);
        const val = manual ? c.valorManual[k] : calc;
        const etiqueta = escs.length ? logEscNombre_(e, i, idioma) : "Valor";
        return "<div class=\"d-flex align-items-center gap-2 mb-1\">" +
            "<div class=\"small flex-grow-1\"><div class=\"fw-semibold\">" + logEsc_(etiqueta) + "</div>" +
            "<div class=\"text-muted\">Base proyectos " + logFmtMoneda_(base, "es", nd) + " " + logEsc_(mon) + "</div></div>" +
            "<input type=\"number\" class=\"form-control form-control-sm text-end\" style=\"width:120px\" step=\"" + (nd ? "0.01" : "1") + "\" data-com-val=\"" + logEsc_(k) + "\" value=\"" + (nd ? Number(val).toFixed(2) : String(Math.round(val))) + "\" title=\"Comisión incluida en el precio de venta. Si cambias el %, el precio de la cotización se recalcula y este valor también.\">" +
            "</div>";
    }).join("");
}

function logisticaOnComision_(ev) {
    const t = ev.target;
    if (!t) return;
    const c = logComisionAsegurar_();
    if (t.id === "logComisionSel") {
        if (t.value === "custom") return;
        const hit = logComisionLista_()[Number(t.value)];
        if (!hit) return;
        c.pct = hit.pct;
        c.nombre = hit.nombre;
        c.valorManual = null;
    } else if (t.id === "logComisionPct") {
        const n = parseFloat(t.value);
        c.pct = isNaN(n) ? 0 : Math.max(0, n);
        c.nombre = "";
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

function logPartidasDesdeArancel_() {
    const filas = (logAranceles && logAranceles.filas) || [];
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

function logListaPartidas_() {
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
    if (saved.length && saved.every(function (p) { return enBase[p.codigo]; }) && saved.length >= base.length) return saved;
    const tienen = {};
    saved.forEach(function (p) { tienen[p.codigo] = p; });
    const out = base.map(function (p) { return tienen[p.codigo] || p; });
    saved.forEach(function (p) { if (!enBase[p.codigo]) out.push(p); });
    if (out.length) return out;
    const delExcel = logPartidasDesdeArancel_();
    return delExcel.length ? delExcel : base;
}

function logPaisesDelListado_() {
    const vistos = {};
    ((logAranceles && logAranceles.filas) || []).forEach(function (r) {
        const p = String(r.pais || "").trim();
        if (p) vistos[p] = true;
    });
    return Object.keys(vistos).sort();
}

function logTextoPartida_(fila) {
    if (!fila || (fila.tipo !== "item" && fila.tipo !== "libre")) return "";
    const f = fila.tipo === "item"
        ? ((fila.snap && fila.snap.ficha) || logFichaVersion_(fila.ver, fila.elem) || {})
        : {};
    const ov = fila.over || {};
    let nom = "";
    if (fila.elem) {
        const verEl = logVersiones_().find(function (x) { return String(x.id) === String(fila.ver); });
        const elObj = verEl && verEl.elementos ? verEl.elementos.find(function (e) { return String(e.id) === String(fila.elem); }) : null;
        nom = (elObj && elObj.nombre) || "";
    }
    return [nom, f.titulo, f.descripcion, ov.titulo, ov.desc].filter(Boolean).join("\n");
}

/** Una sola familia de material. Si la ficha mezcla dos, no elige. */
function logSugerirPartida_(texto) {
    const t = String(texto || "");
    const ok = {};
    logListaPartidas_().forEach(function (p) { ok[p.codigo] = true; });
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
    const ver = logVersiones_().find(function (x) { return String(x.id) === String(fila.ver); });
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
    if (fila) fila.partida = fmt;
}

function logAsegurarPartida_(fila) {
    if (!fila || fila.demo != null || (fila.tipo !== "item" && fila.tipo !== "libre")) return;
    if (typeof fila.partida === "string") return;
    const deFicha = logPartidaDeElemento_(fila);
    if (deFicha) { fila.partida = deFicha; return; }
    const s = logSugerirPartida_(logTextoPartida_(fila));
    if (s.codigo) logEscribirPartidaFicha_(fila, s.codigo);
}

function logPintarSelectPartida_(valor) {
    const sel = document.getElementById("fichaPartida");
    if (!sel) return;
    const actual = logPartidaFmt_(valor || "");
    let html = "<option value=\"\">Partida</option>";
    let esta = !actual;
    logListaPartidas_().forEach(function (p) {
        if (p.codigo === actual) esta = true;
        html += "<option value=\"" + logEsc_(p.codigo) + "\">" + logEsc_(p.codigo + " · " + p.nombre) + "</option>";
    });
    if (actual && !esta) html += "<option value=\"" + logEsc_(actual) + "\">" + logEsc_(actual) + "</option>";
    sel.innerHTML = html;
    sel.value = actual;
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
    logAsegurarPartida_(fila);
    const sug = logSugerirPartida_(logTextoPartida_(fila));
    const lista = logListaPartidas_();
    const actual = logPartidaFmt_(fila.partida || "");
    let ops = "<option value=\"\">Sin partida</option>";
    let esta = !actual;
    lista.forEach(function (p) {
        if (p.codigo === actual) esta = true;
        ops += "<option value=\"" + logEsc_(p.codigo) + "\"" + (p.codigo === actual ? " selected" : "") + ">" +
            logEsc_(p.codigo + " · " + p.nombre) + "</option>";
    });
    if (actual && !esta) {
        ops += "<option value=\"" + logEsc_(actual) + "\" selected>" + logEsc_(actual) + "</option>";
    }
    let titulo = "No sale en el PDF. Sirve para calcular Duties y Taxes.";
    if (sug.ambiguo && !actual) titulo = "La ficha menciona más de un material. Elige la partida. No sale en el PDF.";
    else if (actual && actual === sug.codigo) titulo = "Sugerida desde la ficha comercial. No sale en el PDF.";
    return "<label class=\"log-partida\" title=\"" + logEsc_(titulo) + "\"><span>Partida</span>" +
        "<select class=\"form-select form-select-sm\" data-acc=\"partida\">" + ops + "</select></label>";
}

window.logNormalizarPartida = logNormalizarPartida_;
window.logListaPartidas = logListaPartidas_;
window.logPartidasDesdeArancel = logPartidasDesdeArancel_;
window.logSugerirPartida = logSugerirPartida_;
window.logPintarSelectPartida = logPintarSelectPartida_;
window.logAlCambiarPartidaFicha = logAlCambiarPartidaFicha_;
window.logPartidaFmt = logPartidaFmt_;
window.logPaisesDelListado = logPaisesDelListado_;
if (typeof pintarTablaPartidas === "function") pintarTablaPartidas();

function logisticaPintarFilas_() {
    const box = document.getElementById("logFilasLista");
    if (!box) return;
    logAsegurarFilas_();
    logisticaPintarBadge_();
    logisticaPintarMenuAgregar_();
    logisticaPintarColumnas_();
    logisticaPintarEscenarios_(true);
    const idioma = logisticaLeerOpciones_().idioma;
    const escs = logEscList_();
    const vers = logVersiones_();
    const p = logisticaLeerProyecto_();
    if (!logQuote.trm) logQuote.trm = logTrmDesdeCostos_();
    const inpTrm = document.getElementById("logTRM");
    if (inpTrm && document.activeElement !== inpTrm) inpTrm.value = logTrm_() || "";
    const nota = document.getElementById("logMonedaNota");
    if (nota) nota.textContent = "";
    logisticaPintarEnv_();
    box.innerHTML = logQuote.filas.map(function (fila) {
        const v = logFilaValores_(fila, idioma);
        const grip = "<span class=\"log-fila-grip\" title=\"Arrastra para reordenar\"><i class=\"bi bi-grip-vertical\"></i></span>";
        let cuerpo;
        if (fila.tipo === "seccion") {
            cuerpo = "<span class=\"badge text-bg-secondary\">Sección</span><span class=\"log-fila-tit\">" + logEsc_(v.titulo || "(sin título)") + "</span>";
        } else if (logEsEnvio_(fila)) {
            cuerpo = "<span class=\"badge text-bg-warning\">Envío</span><span class=\"log-fila-tit\">" + logEsc_(v.titulo || "(flete / envío)") + "</span>" +
                (v.unit != null ? "<span class=\"text-muted\">" + logFmtMoneda_(v.unit, idioma, logDecimales_()) + "</span>" : "");
        } else {
            const img = "<button type=\"button\" class=\"log-fila-img\" data-acc=\"img\" title=\"Editar imagen: acercar, recortar o girar\">" +
                (v.img ? "<img src=\"" + logEsc_(v.img) + "\" alt=\"\">" : "<i class=\"bi bi-image\"></i>") + "</button>";
            let sels = "";
            if (fila.tipo === "item" && fila.snap) {
                /* viene del historial: valores congelados; la cantidad se elige entre las escalas guardadas */
                const escalasSnap = logEscalasFila_(fila);
                const optQ = !escs.length && escalasSnap.length
                    ? "<select class=\"form-select form-select-sm log-fila-sel\" data-acc=\"lote\" title=\"Escala (cantidad) de la que sale el precio\">" + escalasSnap.map(function (e) {
                        return "<option value=\"" + logEsc_(e.id) + "\"" + (e.id === fila.lote ? " selected" : "") + ">Q " + logFmtNum_(e.q, "es", 0) + "</option>";
                    }).join("") + "</select>"
                    : "";
                sels = optQ + "<span class=\"badge text-bg-light border\" title=\"Precio y ficha tal como se guardaron\"><i class=\"bi bi-snow2 me-1\"></i>" + logEsc_(fila.ver || "") + " · congelada</span>" +
                    (p.hayProyecto && p.codigo === fila.proy
                        ? "<button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-acc=\"refrescar\" title=\"Vuelve a leer ficha y precio del proyecto abierto\"><i class=\"bi bi-arrow-repeat\"></i></button>"
                        : "");
            } else if (fila.tipo === "item") {
                const pr = logPreciosVersion_(fila.ver, fila.elem);
                const optV = vers.map(function (x) {
                    return "<option value=\"" + logEsc_(x.id) + "\"" + (String(x.id) === String(fila.ver) ? " selected" : "") + ">" + logEsc_(x.id) + "</option>";
                }).join("");
                const optQ = pr && pr.escalas.length
                    ? pr.escalas.map(function (e) {
                        return "<option value=\"" + logEsc_(e.id) + "\"" + (e.id === fila.lote ? " selected" : "") + ">Q " + logFmtNum_(e.q, "es", 0) + "</option>";
                    }).join("")
                    : "<option value=\"\">sin precios</option>";
                sels = "<select class=\"form-select form-select-sm log-fila-sel\" data-acc=\"ver\" title=\"Versión del proyecto\">" + optV + "</select>" +
                    (escs.length ? "" : "<select class=\"form-select form-select-sm log-fila-sel\" data-acc=\"lote\" title=\"Escala (cantidad) de la que sale el precio\">" + optQ + "</select>");
            }
            cuerpo = img + "<span class=\"badge " + (fila.tipo === "item" ? "text-bg-primary" : "text-bg-light border") + "\">" + (fila.tipo === "item" ? "Proyecto" : "Libre") + "</span>" +
                "<span class=\"log-fila-tit\"><b>" + logEsc_(v.cod) + "</b> " + logEsc_(v.titulo) + (v.aviso ? " <span class=\"text-danger\" title=\"" + logEsc_(v.aviso) + "\"><i class=\"bi bi-exclamation-triangle\"></i></span>" : "") + "</span>" + sels +
                (fila.img ? "<button type=\"button\" class=\"btn btn-sm btn-link text-muted p-0\" data-acc=\"noimg\" title=\"Quitar la imagen subida (vuelve la de Odoo)\"><i class=\"bi bi-x-circle\"></i></button>" : "");
        }
        /* con escenarios: por cada opción, qué escala (cantidad) usa esta fila o si no entra en ella */
        let porOpcion = "";
        if (escs.length && fila.tipo !== "seccion") {
            const escalas = fila.tipo === "item" ? logEscalasFila_(fila) : [];
            porOpcion = "<div class=\"log-fila-esc\">" + escs.map(function (e, i) {
                const fuera = !!(fila.excl && fila.excl[e.id]);
                const act = fila.opc && Object.prototype.hasOwnProperty.call(fila.opc, e.id) ? fila.opc[e.id] : fila.lote;
                let ops;
                if (fila.tipo === "item") {
                    ops = "<option value=\"\"" + (fuera ? " selected" : "") + ">— no incluir</option>" + escalas.map(function (q) {
                        return "<option value=\"" + logEsc_(q.id) + "\"" + (!fuera && q.id === act ? " selected" : "") + ">Q " + logFmtNum_(q.q, "es", 0) + "</option>";
                    }).join("");
                } else {
                    ops = "<option value=\"1\"" + (fuera ? "" : " selected") + ">Incluida</option><option value=\"\"" + (fuera ? " selected" : "") + ">— no incluir</option>";
                }
                return "<label class=\"log-esc-sel\"><span>" + logEsc_(logEscNombre_(e, i, idioma)) + "</span>" +
                    "<select class=\"form-select form-select-sm\" data-acc=\"lote-e\" data-e=\"" + logEsc_(e.id) + "\">" + ops + "</select></label>";
            }).join("") + "</div>";
        }
        return "<div class=\"log-fila\" data-r=\"" + fila.uid + "\">" + grip + cuerpo +
            "<span class=\"log-fila-acc\"><button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-acc=\"dup\" title=\"Duplicar\"><i class=\"bi bi-files\"></i></button>" +
            "<button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-acc=\"del\" title=\"Quitar de la cotización\"><i class=\"bi bi-trash\"></i></button></span>" +
            logHtmlPartida_(fila) + porOpcion + "</div>";
    }).join("") || "<div class=\"text-muted small p-2\">Sin filas todavía.</div>";
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
        if (acc === "ver" || acc === "lote" || acc === "lote-e") logMarcarSucio_();
        if (acc === "lote-e") {
            const e = t.getAttribute("data-e");
            fila.opc = fila.opc || {};
            fila.excl = fila.excl || {};
            if (t.value === "") {
                fila.excl[e] = true;
            } else {
                delete fila.excl[e];
                if (fila.tipo === "item") fila.opc[e] = t.value;
            }
            delete fila.over["qty:" + e]; /* al cambiar de escala vuelve el precio automático */
            delete fila.over["unit:" + e];
        } else if (acc === "ver") {
            fila.ver = t.value;
            const pr = logPreciosVersion_(fila.ver, fila.elem);
            fila.lote = pr && pr.escalas.length ? pr.escalas[0].id : "";
            fila.over = {};
            fila.opc = {};
            fila.excl = {};
            logOpcCompletar_(fila);
        } else if (acc === "lote") {
            fila.lote = t.value;
            delete fila.over.qty;
            delete fila.over.unit;
        } else { return; }
        logisticaRefrescarTabla_();
        return;
    }
    if (acc !== "img") logMarcarSucio_();
    if (acc === "img") { logisticaAbrirEditorImagen_(fila.uid); }
    else if (acc === "refrescar") {
        delete fila.snap;
        const pr = logPreciosVersion_(fila.ver, fila.elem);
        if (pr && pr.escalas.length && !pr.escalas.some(function (e) { return e.id === fila.lote; })) fila.lote = pr.escalas[0].id;
        fila.over = {};
        fila.opc = {};
        fila.excl = {};
        logOpcCompletar_(fila);
        logisticaRefrescarTabla_();
    }
    else if (acc === "noimg") { logImgQuitar_(fila); logisticaRefrescarTabla_(); }
    else if (acc === "dup") {
        const copia = JSON.parse(JSON.stringify(fila));
        copia.uid = logNuevoUid_();
        const i = logQuote.filas.indexOf(fila);
        logQuote.filas.splice(i + 1, 0, copia);
        if (logLayout.filaAlto[fila.uid]) logLayout.filaAlto[copia.uid] = logLayout.filaAlto[fila.uid];
        logisticaRefrescarTabla_();
    } else if (acc === "del") {
        logQuote.filas.splice(logQuote.filas.indexOf(fila), 1);
        delete logLayout.filaAlto[fila.uid];
        logisticaRefrescarTabla_();
    }
}

/* --- consolidado: agregar una versión guardada de otro proyecto (sin cambiar el abierto) --- */

let logOtro = { lista: [], q: "", id: "", payload: null };

function logCodigoDePayload_(p) {
    const cab = (p && p.cabecera) || {};
    const nom = String(cab.nombreProyecto || cab.noProyecto || "").trim();
    return (nom.split(/\s+/)[0] || String(cab.noProyecto || "")).trim();
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

/** Precios de una versión que no está abierta: no debe usar la matriz del proyecto actual. */
function logPreciosVersionAjena_(ver) {
    if (!ver || typeof calcularPreciosVersion_ !== "function") return null;
    const copia = JSON.parse(JSON.stringify(ver));
    copia.id = "_ext_" + String(ver.id || "V1");
    return calcularPreciosVersion_(copia);
}

function logNuevaFilaCongelada_(p, ver, loteId) {
    const codigo = logCodigoDePayload_(p);
    const pr = logPreciosVersionAjena_(ver);
    const escalas = pr && pr.escalas ? pr.escalas.map(function (e) { return { id: e.id, q: e.q, puCop: e.puCop }; }) : [];
    const primera = escalas.find(function (e) { return e.id === loteId; }) || escalas[0] || null;
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
            ? "Se agrega congelada: ficha y precios de cuando se guardó en la nube. El proyecto abierto no cambia."
            : "Proyectos guardados en Costos (nube). Elige uno y luego una versión.";
    }
    if (logOtro.payload) {
        const p = logOtro.payload;
        const codigo = logCodigoDePayload_(p);
        const vers = logVersionesDePayload_(p);
        box.innerHTML = vers.map(function (ver) {
            const pr = logPreciosVersionAjena_(ver);
            const escalas = pr && pr.escalas ? pr.escalas : [];
            const nota = ver.comentario ? "<div class=\"text-muted small\">" + logEsc_(ver.comentario) + "</div>" : "";
            const botones = escalas.length
                ? escalas.map(function (e) {
                    return "<button type=\"button\" class=\"btn btn-sm btn-outline-primary\" data-over=\"" + logEsc_(ver.id) + "\" data-oq=\"" + logEsc_(e.id) + "\">Q " + logFmtNum_(e.q, "es", 0) + "</button>";
                }).join("")
                : "<span class=\"badge text-bg-light border\">sin precios</span>";
            return "<div class=\"list-group-item\"><b>" + logEsc_(codigo) + " · " + logEsc_(ver.id) + "</b>" +
                nota + "<div class=\"d-flex flex-wrap gap-1 mt-1\">" + botones + "</div></div>";
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
    logOtro = { lista: [], q: "", id: "", payload: null };
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
    } catch (e) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("No se pudo abrir: " + ((e && e.message) || e), "danger");
        logOtro.payload = null;
    } finally {
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
    }
    logisticaPintarOtroProyecto_();
}

function logisticaAgregarVersionAjena_(verId, loteId) {
    const p = logOtro.payload;
    if (!p) return;
    const ver = logVersionesDePayload_(p).find(function (v) { return String(v.id) === String(verId); });
    if (!ver) return;
    const codigo = logCodigoDePayload_(p);
    const abierto = logisticaLeerProyecto_();
    let fila;
    if (abierto.codigo && abierto.codigo === codigo) {
        const elems = ver.elementos || [];
        if (elems.length) {
            elems.forEach(function (el) {
                const f = logNuevaFilaItem_(ver.id, codigo, el.id);
                if (loteId) f.lote = loteId;
                logQuote.filas.push(f);
            });
            logMarcarSucio_();
            bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogOtro")).hide();
            logisticaRefrescarTabla_();
            if (typeof mostrarNotificacion === "function") {
                mostrarNotificacion("Agregadas " + elems.length + " piezas de " + codigo + " " + (ver.id || ""), "success");
            }
            return;
        }
        fila = logNuevaFilaItem_(ver.id, codigo);
    } else if (ver.elementos && ver.elementos.length) {
        ver.elementos.forEach(function (el) {
            const copiaVer = Object.assign({}, ver, {
                matrizItems: el.matrizItems || [],
                escalas: el.escalas && el.escalas.length ? el.escalas : ver.escalas,
                fichaComercial: el.fichaComercial || ver.fichaComercial || {}
            });
            const f = logNuevaFilaCongelada_(p, copiaVer, loteId);
            f.elem = el.id;
            if (el.imgRef) f.imgRef = el.imgRef;
            if (f.snap) {
                f.snap.nombre = el.nombre || f.snap.nombre;
                if (f.snap.ficha && !f.snap.ficha.titulo) f.snap.ficha.titulo = el.nombre || "";
            }
            if (loteId) f.lote = loteId;
            logQuote.filas.push(f);
        });
        logMarcarSucio_();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogOtro")).hide();
        logisticaRefrescarTabla_();
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion((logTipoDoc_(logisticaLeerOpciones_().idioma) === "CONS" ? "CONS · " : "") + "Agregadas " + ver.elementos.length + " piezas de " + codigo, "success");
        }
        return;
    } else {
        fila = logNuevaFilaCongelada_(p, ver, loteId);
    }
    if (loteId) fila.lote = loteId;
    logQuote.filas.push(fila);
    logMarcarSucio_();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogOtro")).hide();
    logisticaRefrescarTabla_();
    if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion((logTipoDoc_(logisticaLeerOpciones_().idioma) === "CONS" ? "CONS · " : "") + "Agregada " + codigo + " " + (ver.id || ""), "success");
    }
    /* imagen de Odoo de ese proyecto, en segundo plano; no toca el visor del proyecto abierto */
    if (fila.tipo === "item" && codigo && typeof window.traerImagenOdoo === "function") {
        const uid = fila.uid;
        window.traerImagenOdoo(codigo, false).then(function (r) {
            const f = logFilaPorUid_(uid);
            if (!f || r.estado !== "ok") return;
            f.img = r.url;
            f.imgSrc = r.orig;
            logisticaRefrescarTabla_();
        }).catch(function () { /* la fila queda sin imagen; se puede subir a mano */ });
    }
}

function logisticaInitOtroProyecto_() {
    const buscar = document.getElementById("logOtroBuscar");
    if (buscar) buscar.addEventListener("input", function () { logOtro.q = buscar.value; logisticaPintarOtroProyecto_(); });
    const volver = document.getElementById("logOtroVolver");
    if (volver) volver.addEventListener("click", function () { logOtro.payload = null; logisticaPintarOtroProyecto_(); });
    const box = document.getElementById("logOtroLista");
    if (box) {
        box.addEventListener("click", function (ev) {
            const ver = ev.target.closest("[data-oq]");
            if (ver && !ver.disabled) { logisticaAgregarVersionAjena_(ver.getAttribute("data-over"), ver.getAttribute("data-oq")); return; }
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
        const ver = logVersiones_().find(function (x) { return String(x.id) === String(verId); });
        if (ver && ver.elementos && ver.elementos.length) {
            ver.elementos.forEach(function (el) {
                logQuote.filas.push(logNuevaFilaItem_(verId, p.codigo, el.id));
            });
            logMarcarSucio_();
            logisticaRefrescarTabla_();
            return;
        }
        fila = logNuevaFilaItem_(verId, p.codigo);
    }
    else if (tipo === "seccion") fila = { uid: logNuevoUid_(), tipo: "seccion", over: {} };
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
    const fila = logQuote.filas.find(function (f) { return f.tipo === "item" && (f.proy || f.ver); });
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
    const D = logisticaDatosDoc_(idioma);
    const cab = {};
    LOG_CAMPOS_CAB.forEach(function (k) { cab[k] = D[k]; });
    const p = logisticaLeerProyecto_();
    const clon = function (o) { return JSON.parse(JSON.stringify(o == null ? null : o)); };
    const imagenes = [];
    const proyectos = [];
    const filas = logQuote.filas.map(function (fila) {
        const v = logFilaValores_(fila, idioma);
        const c = { uid: fila.uid, tipo: fila.tipo, proy: fila.proy || "", ver: fila.ver || "", lote: fila.lote || "", over: clon(fila.over || {}) };
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
        if (fila.imgEdit) c.imgEdit = clon(fila.imgEdit);
        logAsegurarImgRefFila_(fila);
        if (fila.imgRef) c.imgRef = fila.imgRef;
        if (fila.srcRef) c.srcRef = fila.srcRef;
        if (fila.tipo !== "seccion" && fila.tipo !== "envio") {
            if (v.img && !fila.imgRef && /^data:image\/(jpeg|png)/.test(v.img)) {
                const pre = logNombrePreImg_(fila);
                imagenes.push({ k: fila.uid + ":img", data: v.img, preNombre: pre || "" });
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
            modo: logQuote.modo === "esc" ? "esc" : "unica",
            escenarios: clon(logQuote.escenarios || []),
            escUid: logQuote.escUid || 0,
            margenMm: parseFloat((document.getElementById("logMargen") || {}).value) || 16,
            sistema: (document.getElementById("logSistema") || {}).value === "imperial" ? "imperial" : "metrico",
            cab: cab,
            env: clon(logEnv_()),
            comision: clon(logComisionAsegurar_()),
            descuento: (function () {
                const d = logDescuentoAsegurar_();
                return { activo: !!d.activo, pct: logDescuentoPct_(), titulo: d.titulo || "", tituloManual: !!d.tituloManual, pctManual: true, nota: logDescuentoNota_() };
            })(),
            pago: (function () {
                const p = logPagoAsegurar_();
                return { iva: !!p.iva, ivaPct: p.ivaPct, anticipo: !!p.anticipo, anticipoPct: p.anticipoPct, titConIva: p.titConIva || "", titAnt: p.titAnt || "", titSaldo: p.titSaldo || "" };
            })(),
            nombre: logNombreHistorial_(),
            layout: { cols: clon(logLayout.cols), filaAlto: clon(logLayout.filaAlto) },
            filas: filas
        }
    };
}

function logisticaAbrirGuardar_() {
    const p = logisticaLeerProyecto_();
    if (!logQuote.filas.some(function (f) { return f.tipo !== "seccion"; })) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Agrega al menos una fila antes de guardar.", "warning");
        return;
    }
    if (!p.hayProyecto && logQuote.filas.some(function (f) { return f.demo != null; })) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Abre un proyecto en Ingeniería de Costos: lo que se ve ahora son datos de ejemplo.", "warning");
        return;
    }
    const idioma = logisticaLeerOpciones_().idioma;
    const a = logQuote.abierta;
    const num = document.getElementById("logGuardarNumero");
    if (num) num.textContent = logNombreArchivoPdf_(idioma);
    const com = document.getElementById("logGuardarCom");
    if (com) com.value = "";
    const bRev = document.getElementById("btnLogGuardarRev");
    if (bRev) {
        bRev.classList.toggle("d-none", !a);
        if (a) bRev.innerHTML = "<i class=\"bi bi-layers me-1\"></i>Guardar como Rev " + (a.rev + 1) + " de " + logEsc_(a.id);
    }
    const bNueva = document.getElementById("btnLogGuardarNueva");
    if (bNueva) {
        bNueva.className = a ? "btn btn-outline-secondary" : "btn btn-diforma-blue";
        bNueva.innerHTML = "<i class=\"bi bi-save me-1\"></i>" + (a ? "Guardar como cotización nueva" : "Guardar");
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogGuardar")).show();
}

async function logisticaReusarRendersPresupuesto_() {
    (logQuote.filas || []).forEach(logAsegurarImgRefFila_);
    const pedir = [];
    (logQuote.filas || []).forEach(function (fila) {
        if (fila.imgRef || fila.tipo === "seccion" || fila.tipo === "envio" || logImgEditada_(fila)) return;
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
    if (info) info.innerHTML = "<span class=\"spinner-border spinner-border-sm me-1\"></span>Revisando renders del presupuesto…";
    await logisticaReusarRendersPresupuesto_();
    const S = logisticaSerializar_(idioma);
    const comentario = ((document.getElementById("logGuardarCom") || {}).value || "").trim();
    const botones = document.querySelectorAll("#modalLogGuardar button[data-sv]");
    botones.forEach(function (b) { b.disabled = true; });
    if (info) info.innerHTML = "<span class=\"spinner-border spinner-border-sm me-1\"></span>Guardando" + (S.imagenes.length ? " (subiendo " + S.imagenes.length + " imagen" + (S.imagenes.length === 1 ? "" : "es") + " a Drive)" : "") + "…";
    try {
        const resp = await realizarPeticionBD({
            action: "guardar_cotizacion",
            email: localStorage.getItem("smartbudget_email") || "",
            id: modo === "rev" && logQuote.abierta ? logQuote.abierta.id : "",
            numero: S.numero, tipo: S.tipo, proyecto: S.proyecto, proyectos: S.proyectos,
            cliente: S.datos.cab.cliente, idioma: idioma, moneda: logQuote.moneda,
            total: S.total, comentario: comentario,
            datos: JSON.stringify(S.datos), imagenes: S.imagenes
        }, { timeoutMs: 180000 });
        if (!resp || !resp.exito) throw new Error((resp && resp.mensaje) || "Sin respuesta.");
        const d = resp.data || {};
        const refs = d.refs || {};
        Object.keys(refs).forEach(function (k) {
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
        logQuote.abierta = { id: d.id, rev: d.rev, numero: d.numero || S.numero };
        logQuote.sucio = false;
        logisticaPintarBadge_();
        logisticaPintarEstado_();
        logisticaActualizarVista();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogGuardar")).hide();
        logisticaInvalidarHist_();
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Cotización guardada: " + d.id + " Rev " + d.rev + ".", "success");
        if (info) info.textContent = "";
    } catch (e) {
        const m = String((e && e.message) || e);
        if (info) info.innerHTML = "<span class=\"text-danger\"><i class=\"bi bi-x-circle me-1\"></i>" + logEsc_(/Acción no válida/i.test(m) ? "falta pegar el backend.gs actualizado en Apps Script." : m) + "</span>";
    } finally {
        botones.forEach(function (b) { b.disabled = false; });
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
            "<td class=\"text-end\"><button type=\"button\" class=\"btn btn-sm btn-diforma-blue\" data-hid=\"" + logEsc_(h.id) + "\" data-hrev=\"" + h.rev + "\">Abrir</button></td></tr>";
    }).join("") || "<tr><td colspan=\"8\" class=\"text-center text-muted py-4\">No hay cotizaciones guardadas" + (q ? " con ese filtro" : "") + ".</td></tr>";
}

/** Reabre una cotización guardada: texto y precios congelados, imágenes desde Drive en segundo plano. */
async function logisticaAbrirGuardada_(id, rev) {
    if (logQuote.sucio && !window.confirm("Hay cambios sin guardar en la cotización actual. ¿Abrir la guardada y descartarlos?")) return;
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
        abierta: { id: d.id, rev: d.rev, numero: d.numero },
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
        escenarios: Array.isArray(g.escenarios) ? g.escenarios.map(function (e) { return { id: e.id, nombre: e.nombre || "" }; }) : [],
        escUid: parseInt(g.escUid, 10) || 0,
        env: logEnvNormalizar_(g.env || {}),
        comision: g.comision ? logComisionNormalizar_(g.comision) : logComisionNormalizar_(logComisionDesdeCostos_()),
        descuento: g.descuento ? {
            activo: !!g.descuento.activo,
            pct: Number(g.descuento.pct) || 0,
            titulo: String(g.descuento.titulo || ""),
            tituloManual: !!g.descuento.tituloManual,
            pctManual: g.descuento.pctManual !== false,
            nota: String(g.descuento.nota || "")
        } : null,
        pago: g.pago ? {
            iva: !!g.pago.iva,
            ivaPct: Number(g.pago.ivaPct) || 19,
            anticipo: !!g.pago.anticipo,
            anticipoPct: Number(g.pago.anticipoPct) || logPagoPctAnticipoDef_(),
            titConIva: String(g.pago.titConIva || ""),
            titAnt: String(g.pago.titAnt || ""),
            titSaldo: String(g.pago.titSaldo || "")
        } : null,
        decimales: Number(g.decimales) === 1 || Number(g.decimales) === 2 ? Number(g.decimales) : 0
    };
    logIaReiniciar_();
    logQuote.escenarios.forEach(function (e) { logQuote.escUid = Math.max(logQuote.escUid, parseInt(String(e.id).replace(/\D/g, ""), 10) || 0); });
    logLayout = {
        cols: (g.layout && g.layout.cols && g.layout.cols.length ? g.layout.cols : LOG_COLUMNAS_DEMO).map(function (c) { return { k: c.k, w: c.w }; }),
        filaAlto: (g.layout && g.layout.filaAlto) || {}
    };
    logCab.codigo = clave;
    logCab.over = g.cab || {};
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
        logisticaActualizarVista();
        logisticaPintarEstado_();
        logisticaPintarBadge_();
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Abierta " + d.numero + " (" + d.id + " Rev " + d.rev + ").", "success");
        logisticaTraerImgsFaltantes_();
    } catch (eVista) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Se abrió, pero la hoja no se pudo pintar: " + ((eVista && eVista.message) || eVista), "warning");
    }
}

function logisticaInitHistorial_() {
    const on = function (id, fn) { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    on("btnLogGuardar", logisticaAbrirGuardar_);
    on("btnLogHistorial", logisticaAbrirHistorial_);
    on("btnLogGuardarRev", function () { logisticaGuardar_("rev"); });
    on("btnLogGuardarNueva", function () { logisticaGuardar_("nueva"); });
    const buscar = document.getElementById("logHistBuscar");
    if (buscar) buscar.addEventListener("input", logisticaPintarHistorial_);
    const lista = document.getElementById("logHistLista");
    if (lista) {
        lista.addEventListener("click", function (ev) {
            const b = ev.target.closest("[data-hid]");
            if (!b) return;
            bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogHist")).hide();
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
        /* membrete: pie */
        ".ftr{position:relative;z-index:2;width:100%;height:auto;min-height:var(--ftr-h);flex:0 0 auto;overflow:hidden;background:#fff;padding:0 var(--mx);display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:.08in}" +
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
        ".items thead th{background:var(--gris-tabla);color:#fff;height:.28in;line-height:.28in;padding:0 5px;font-size:7.6pt;text-transform:uppercase;text-align:center;font-weight:700;border-right:1px solid #7b8088;position:relative;vertical-align:middle;white-space:nowrap;overflow:hidden}" +
        ".items thead th:last-child{border-right:0}" +
        ".items td{padding:5px 6px;border-bottom:1px solid #d9d9d9;vertical-align:middle;position:relative}" +
        ".items tr{break-inside:avoid;page-break-inside:avoid}" +
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
        ".items tr.sec-gap td{height:10px;padding:0;border:0;background:#fff}" +
        ".items tr.sec td,.items tr.tot td,.items tr.tot-pago td{height:.28in;padding-top:0;padding-bottom:0;box-sizing:border-box}" +
        ".items tr.sec td{background:#f1f1f2;color:var(--rojo);font-weight:700;letter-spacing:.04em;font-size:8.2pt;border-bottom:1px solid #d9d9d9}" +
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
        ".firma{break-inside:avoid;margin-top:.03in;font-size:8.4pt;line-height:1.28}" +
        ".firma-img{display:block;height:.7in;width:auto;max-width:2.4in;object-fit:contain;margin:.1in 0 .02in}" +
        ".firma .nom{font-weight:700;margin-top:.2in}" +
        ".firma.has-img .nom{margin-top:.04in}" +
        /* pantalla */
        "@media screen{" +
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
        ".page-body{flex:1 1 auto;min-height:0;overflow:hidden;padding:0 var(--mx) .28in}" +
        ".page.crece .page-body{overflow:visible}" +
        ".page .pnum{position:absolute;right:var(--mx);bottom:.1in;font-size:7.5pt;color:#777}" +
        ".page.crece{height:auto;min-height:11in;overflow:visible}" +
        ".sp-h,.sp-f{display:none}" +
        "body.paginado .sheet{display:none}" +
        "}" +
        /* impresión / PDF */
        "@page{size:Letter;margin:0 0 .3in 0;" +
        "@bottom-right{content:\"" + T.pagina + " \" counter(page) \" " + T.de + " \" counter(pages);font-family:Arial,Helvetica,sans-serif;font-size:7.5pt;color:#777;padding-right:var(--mx);vertical-align:top}}" +
        "@media print{" +
        "html,body{background:#fff}" +
        ".pages{display:none!important}" +
        ".rz{display:none!important}" +
        ".ed:empty{display:none}" +
        ".ln:has(.ed:empty){display:none}" +
        ".hdr{position:fixed;top:0;left:0;right:0;z-index:5}" +
        ".ftr{position:fixed;bottom:0;left:0;right:0;z-index:5;height:var(--ftr-h)}" +
        ".paper>thead{display:table-header-group}" +
        ".paper>tfoot{display:table-footer-group}" +
        ".sp-h,.sp-f{display:block}" +
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
        "var table=pages.querySelector('table.items');" +
        "if(table){thead=table.querySelector('thead');colg=table.querySelector('colgroup');rows=[].slice.call(table.querySelectorAll('tbody>tr'));" +
        "var host=table.parentNode;[].forEach.call([].slice.call(host.childNodes),function(n){if(n===table)return;if(n.nodeType===1&&n.classList.contains('tyc-wrap')){tyc=n;return;}if(n.nodeType===1||(n.nodeType===3&&String(n.textContent||'').trim()))intro.push(n);});}" +
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
        "function page(){var p=document.createElement('section');p.className='page';if(pack.hdr)p.appendChild(pack.hdr.cloneNode(true));var b=document.createElement('div');b.className='page-body';p.appendChild(b);if(pack.ftr)p.appendChild(pack.ftr.cloneNode(true));var num=document.createElement('div');num.className='pnum';p.appendChild(num);pages.appendChild(p);return b;}" +
        "function tabla(vivo){var t=document.createElement('table');t.className='items';if(pack.colg)t.appendChild(vivo?pack.colg:pack.colg.cloneNode(true));if(pack.thead)t.appendChild(vivo?pack.thead:pack.thead.cloneNode(true));var tb=document.createElement('tbody');t.appendChild(tb);return t;}" +
        "var body=page();" +
        "pack.intro.forEach(function(n){body.appendChild(n);});" +
        "var table=tabla(true);body.appendChild(table);var tb=table.tBodies[0];" +
        "function limite(b){var f=b.parentNode.querySelector('.ftr');var y=f?f.getBoundingClientRect().top:b.getBoundingClientRect().bottom;return y-6;}" +
        "function noCabe(b,row){return row.getBoundingClientRect().bottom>limite(b);}" +
        "pack.rows.forEach(function(row){" +
        "tb.appendChild(row);" +
        "var pasa=noCabe(body,row);" +
        "if(pasa&&tb.rows.length===1){body.parentNode.classList.add('crece');return;}" +
        "if(pasa&&tb.rows.length>1){" +
        "tb.removeChild(row);" +
        "var ant=tb.rows.length?tb.rows[tb.rows.length-1]:null;" +
        "var llevar=null;" +
        "if(ant&&ant.classList.contains('sec')){llevar=ant;tb.removeChild(ant);}" +
        "else if(row.classList.contains('it-cont')&&ant&&(ant.classList.contains('it')||ant.classList.contains('it-cont'))){llevar=ant;tb.removeChild(ant);}" +
        "body=page();table=tabla(false);body.appendChild(table);tb=table.tBodies[0];" +
        "if(llevar)tb.appendChild(llevar);" +
        "tb.appendChild(row);" +
        "if(noCabe(body,row))body.parentNode.classList.add('crece');" +
        "}" +
        "});" +
        "if(pack.tyc){body=page();body.appendChild(pack.tyc);if(body.scrollHeight>body.clientHeight)body.parentNode.classList.add('crece');}" +
        "var lista=[].slice.call(pages.querySelectorAll('.page'));" +
        "lista.forEach(function(p,i){var n=p.querySelector('.pnum');if(n)n.textContent=ETI+' '+(i+1)+' '+DE+' '+lista.length;});" +
        "[].forEach.call(pages.querySelectorAll('table.items'),function(t){if(!t.querySelector('tbody tr.it:not(.it-env)')){var th=t.querySelector('thead');if(th)th.parentNode.removeChild(th);}});" +
        "document.body.classList.add('paginado');" +
        "}" +
        "window.recolocarPaginas_=function(){var pack=tomar();if(!pack.hdr)return;armar(pack);};" +
        "window.recolocarPaginas_();" +
        "})();</script>") + "</body></html>";
}

/* ------------------------------------------------------------------ */
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
    prev.modalidad = LOG_MODALIDADES_.indexOf(mod) >= 0 ? mod : prev.modalidad;
    prev.incoterm = LOG_INCOTERM_MATRIZ_[inc] ? inc : prev.incoterm;
    if (logEnvIncotermsDe_(prev.modalidad).indexOf(prev.incoterm) < 0) prev.incoterm = "EXW";
    prev.destinoCiudad = ((document.getElementById("logDestCiudad") || {}).value || "").trim();
    prev.destinoPais = ((document.getElementById("logDestPais") || {}).value || "").trim();
    prev.destinoCodigo = ((document.getElementById("logDestCodigo") || {}).value || "").trim().toUpperCase();
    prev.destinoPuerto = ((document.getElementById("logDestPuerto") || {}).value || "").trim();
    const modo = document.querySelector("input[name=\"logModoCosto\"]:checked");
    prev.modoCosto = modo && modo.value === "resumen" ? "resumen" : "detalle";
    const sw = document.getElementById("logCostosOn");
    if (sw) prev.activo = !!sw.checked;
    const mer = document.getElementById("logMercado");
    if (mer && (mer.value === "EXPORTACION" || mer.value === "NACIONAL")) prev.mercado = mer.value;
    const pct = Number((document.getElementById("logResumenPct") || {}).value);
    if (isFinite(pct)) prev.resumenPct = Math.min(100, Math.max(0, pct));
    const mg = document.getElementById("logMargenLog");
    if (mg) prev.margenPct = String(mg.value || "").trim() === "" ? 0 : logMargenClamp_(mg.value);
    const box = document.getElementById("logEnvLineas");
    if (box) {
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
            if (arancel && val && valorNuevo !== ln.valor) {
                ln.fuente = "";
                ln.arancelManual = true;
                ln.valor = valorNuevo;
                ln.pct = null;
                if (pctEl) pctEl.value = "";
            } else if (arancel && pctEl && pctNuevo !== ln.pct) {
                ln.fuente = "";
                ln.arancelManual = true;
                ln.pct = pctNuevo;
                ln.valor = null;
                if (val) val.value = "";
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

function logisticaPintarCubicaje_() {
    const el = document.getElementById("logCubica");
    if (!el) return;
    const idioma = logisticaLeerOpciones_().idioma;
    const esEn = idioma === "en";
    const c = logCubicajeTotal_(idioma);
    if (!c.filas) {
        el.innerHTML = "<b>Cubicaje</b>" + (esEn
            ? "Complete packaging on the commercial sheet to estimate boxes and m³."
            : "Completa el empaque en la ficha para estimar cajas y m³.");
        return;
    }
    const div = logKgVolDivisor_();
    const kg = div && c.filasOk
        ? " · <span title=\"" + logEsc_(esEn
            ? "Volumetric weight: L × W × H in cm / " + logFmtNum_(div, "en", 0) + ", times the number of boxes. Not printed."
            : "Kg volumen: ancho × largo × alto en cm / " + logFmtNum_(div, "es", 0) + ", por el número de cajas. No sale en el PDF.") + "\">" +
            logFmtNum_(c.kgVol, idioma, 2) + " kg vol</span>"
        : "";
    const umP = logPesoUmDoc_();
    const peso = c.filasPeso
        ? " · <span title=\"" + logEsc_(esEn
            ? "Actual weight: weight per box times the number of boxes. Not the volumetric weight, and not printed."
            : "Peso real: peso por caja por el número de cajas. No es el kg vol y no sale en el PDF.") + "\">" +
            logFmtNum_(logKgADoc_(c.pesoKg), idioma, 2) + " " + umP + "</span>"
        : "";
    const num = c.filasOk
        ? "<span class=\"log-cubica-num\">" + logFmtNum_(c.cajas, idioma, 0) + (esEn ? " boxes" : " cajas") +
            " · " + logFmtM3_(c.m3, idioma) + peso + kg + "</span>"
        : "<span class=\"text-muted\">" + (esEn ? "No packaging measures yet." : "Aún no hay medidas de empaque.") + "</span>";
    const notaPeso = c.filasOk && c.filasPeso < c.filasOk
        ? "<div class=\"text-muted\">" + (c.filasOk - c.filasPeso) + (esEn
            ? " row(s) without weight per box."
            : " fila(s) sin peso por caja.") + "</div>"
        : "";
    const nota = c.filasSin
        ? "<div class=\"text-muted\">" + c.filasSin + (esEn
            ? " row(s) without box size or units per box."
            : " fila(s) sin medida de caja o und. por caja.") + "</div>"
        : "";
    el.innerHTML = "<b>Cubicaje</b>" + num + nota + notaPeso;
}

function logisticaPintarEnv_(forzar) {
    const idioma = logisticaLeerOpciones_().idioma;
    const esEn = idioma === "en";
    const exterior = logEsCotizacionExterior_();
    if (!logQuote.env || !logQuote.env.destinoPais) {
        try {
            const loc = typeof localeProyectoActual === "function" ? localeProyectoActual() : {};
            if (loc && loc.pais && logQuote.env) {
                logQuote.env.destinoPais = logQuote.env.destinoPais || loc.pais;
                logQuote.env.destinoCodigo = logQuote.env.destinoCodigo || logEnvCodigoDePais_(loc.pais);
            }
        } catch (err) { /* sin locale */ }
    }
    logEnvAsegurarLineas_(esEn);
    logAplicarAranceles_();
    const e = logEnv_();
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
            return "<option value=\"" + o[0] + "\"" + (o[0] === e.modalidad ? " selected" : "") + ">" + o[1] + "</option>";
        }).join("");
        if (modSel.innerHTML !== html) modSel.innerHTML = html;
        logSetSiNoFoco_("logModalidad", e.modalidad);
    }
    const incSel = document.getElementById("logIncoterm");
    if (incSel) {
        const html = logEnvIncotermsDe_(e.modalidad).map(function (k) {
            return "<option value=\"" + k + "\"" + (k === e.incoterm ? " selected" : "") + ">" + k + "</option>";
        }).join("");
        if (incSel.innerHTML !== html) incSel.innerHTML = html;
        logSetSiNoFoco_("logIncoterm", e.incoterm);
    }
    logSetSiNoFoco_("logDestCiudad", e.destinoCiudad);
    logSetSiNoFoco_("logDestPais", e.destinoPais);
    logSetSiNoFoco_("logDestCodigo", e.destinoCodigo);
    logSetSiNoFoco_("logDestPuerto", e.destinoPuerto);
    logSetSiNoFoco_("logResumenPct", e.resumenPct);
    const swOn = document.getElementById("logCostosOn");
    if (swOn && document.activeElement !== swOn) swOn.checked = e.activo !== false;
    const cuerpo = document.getElementById("logCostosCuerpo");
    const tools = document.getElementById("logCostosTools");
    if (cuerpo) cuerpo.classList.toggle("d-none", e.activo === false);
    if (tools) tools.classList.toggle("d-none", e.activo === false);
    document.querySelectorAll("input[name=\"logModoCosto\"]").forEach(function (r) { r.checked = r.value === e.modoCosto; });
    const selMer = document.getElementById("logMercado");
    if (selMer && document.activeElement !== selMer) selMer.value = exterior ? "EXPORTACION" : "NACIONAL";
    ["logModalidadWrap", "logIncotermWrap", "logDestPaisWrap", "logDestCodigoWrap"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("d-none", !exterior);
    });
    const pctWrap = document.getElementById("logResumenPctWrap");
    if (pctWrap) pctWrap.classList.toggle("d-none", e.modoCosto !== "resumen");
    const margenWrap = document.getElementById("logMargenWrap");
    if (margenWrap) margenWrap.classList.toggle("d-none", !exterior);
    logSetSiNoFoco_("logMargenLog", e.margenPct);
    const box = document.getElementById("logEnvLineas");
    if (!forzar && box && document.activeElement && box.contains(document.activeElement)) {
        logisticaPintarCubicaje_();
        return;
    }
    if (box) {
        box.innerHTML = e.lineas.map(function (ln) {
            const claveNal = logMargenClaveNal_(ln.tipo);
            const pct = (ln.tipo === "duties" || ln.tipo === "taxes")
                ? "<input class=\"form-control form-control-sm\" data-lp type=\"number\" step=\"0.01\" placeholder=\"%\" title=\"" + logEsc_(ln.base ? ("Interno. No sale en el PDF. Base " + ln.base + ".") : "Interno. No sale en el PDF. Si no hay valor, el % se aplica al precio de los proyectos sin la comisión de esta cotización.") + "\" value=\"" + (ln.pct == null ? "" : ln.pct) + "\">"
                : (claveNal && !exterior
                    ? "<input class=\"form-control form-control-sm\" data-lmg=\"" + claveNal + "\" type=\"number\" min=\"0\" max=\"200\" step=\"1\" placeholder=\"%\" title=\"Margen de esta fila. Se suma al costo en la cotización y no se imprime.\" value=\"" + e.margenNal[claveNal] + "\">"
                    : "");
            const nota = (ln.tipo === "duties" || ln.tipo === "taxes")
                ? "<input class=\"form-control form-control-sm\" data-ln type=\"text\" maxlength=\"400\" placeholder=\"Observación\" title=\"Se guarda con la cotización. No sale en el PDF. En la hoja, Duties y Taxes se imprimen sumados en una sola fila.\" value=\"" + logEsc_(ln.notas) + "\">"
                : "";
            return "<div class=\"log-env-row\" data-lid=\"" + logEsc_(ln.id) + "\">" +
                "<span class=\"log-env-grip\" title=\"Arrastrar\"><i class=\"bi bi-grip-vertical\"></i></span>" +
                "<input class=\"form-control form-control-sm\" data-lc type=\"text\" maxlength=\"80\" value=\"" + logEsc_(ln.concepto) + "\">" +
                "<input class=\"form-control form-control-sm text-end" + (ln.fuente === "[Estimado IA]" ? " log-ia-est" : "") + "\" data-lv type=\"number\" step=\"0.01\" placeholder=\"" + (exterior ? "Costo" : "Costo COP") + "\" title=\"" + logEsc_(logMargenTituloCosto_(ln)) + "\" value=\"" + (ln.valor == null ? "" : ln.valor) + "\">" +
                pct + nota +
                "<button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-ldup title=\"Duplicar\"><i class=\"bi bi-copy\"></i></button>" +
                "<button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-ldel title=\"Quitar\"><i class=\"bi bi-trash\"></i></button>" +
                "</div>";
        }).join("") || "<div class=\"text-muted small\">Sin filas para este Incoterm. Usa Restaurar o la fila libre.</div>";
        logisticaOrdenEnv_();
    }
    logisticaPintarCubicaje_();
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
                fuente: (src.fuente === "[Estimado IA]" || src.fuente === "Aranceles") ? src.fuente : "",
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
        logEnvAsegurarLineas_((document.getElementById("logIdioma") || {}).value === "en", true);
        logMarcarSucio_();
        logisticaPintarEnv_(true);
        logisticaRefrescarTabla_();
        return;
    }
    if (accion && accion.id === "btnLogEnvLibre") {
        const e = logEnv_();
        e.activo = true;
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
    if (logQuote.env.modalidad !== modAntes || logQuote.env.incoterm !== incAntes || (t && t.id === "logMercado")) {
        logQuote.env.lineas.forEach(function (ln) {
            if (!ln.fuente) return;
            ln.valor = null;
            ln.pct = null;
            ln.fuente = "";
            ln.base = "";
            ln.arancelManual = false;
            ln.arancelFirma = "";
        });
    }
    if (t && (t.id === "logIncoterm" || t.id === "logMercado") && (logQuote.env.incoterm !== incAntes || t.id === "logMercado")) logQuote.env.titGran = "";
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
    const topNow = Math.max(0, stage.getBoundingClientRect().top);
    const altoEsc = Math.max(360, window.innerHeight - topNow - 10);
    stage.style.height = altoEsc + "px";
    stage.style.maxHeight = altoEsc + "px";
    const previo = pages.style.zoom;
    pages.style.zoom = "1";
    const pw = (page && page.offsetWidth) || 816;
    const ph = (page && page.offsetHeight) || 1056;
    pages.style.zoom = previo || "1";
    const st = stage.getBoundingClientRect();
    const visibleH = Math.max(280, Math.min(st.bottom, window.innerHeight) - Math.max(st.top, 0));
    const barH = (bar ? bar.offsetHeight : 32) + 8;
    const roomW = Math.max(200, f.clientWidth || (stage.clientWidth - 20));
    const roomH = Math.max(240, visibleH - barH);
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
function logisticaActivarTabla_(doc) {
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
            logMarcarSucio_();
            const txt = el.textContent.replace(/\s+/g, " ").trim();
            if (numerico) {
                if (txt === "") { delete fila.over[clave]; }
                else {
                    const n = logParseNum_(txt, idioma);
                    if (n != null) fila.over[clave] = campo === "unit" ? n / (logComisionFactor_(fila) || 1) : n;
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

function logisticaActualizarVista() {
    const f = document.getElementById("logFrame");
    if (!f) return;
    const stage = document.querySelector(".log-stage");
    const scroll = stage ? stage.scrollTop : 0;
    logFrameListo = false;
    f.onload = function () {
        logFrameListo = true;
        try { logisticaActivarEdicion_(f.contentDocument); } catch (e) { /* la vista sigue funcionando sin controladores */ }
        logisticaAplicarZoom_();
        if (stage) stage.scrollTop = scroll;
        if (logRefrescoPend) { logRefrescoPend = false; logisticaRefrescarTabla_(); }
        try {
            f.contentDocument.fonts.ready.then(function () { logisticaAplicarZoom_(); if (stage) stage.scrollTop = scroll; });
            Array.prototype.forEach.call(f.contentDocument.images, function (img) {
                if (!img.complete) img.addEventListener("load", logisticaAplicarZoom_);
            });
        } catch (e) { /* sin acceso a fuentes: se conserva el alto calculado */ }
    };
    f.srcdoc = logisticaConstruirHTML(logisticaLeerOpciones_());
    logisticaPintarFilas_();
}

async function logisticaDescargarPDF() {
    const f = document.getElementById("logFrame");
    if (!f) return;
    const pend = logisticaFilasImgPendientes_();
    if (pend.length) {
        if (typeof mostrarEsperaNube === "function") mostrarEsperaNube("Trayendo las imágenes para el PDF…");
        try { await logisticaRecargarImgs_({ silencio: true, espera: true, filas: pend }); }
        finally { if (typeof ocultarEsperaNube === "function") ocultarEsperaNube(); }
    }
    const tituloOriginal = document.title;
    /* La vista en pantalla son hojas ya cortadas y con zoom. El PDF vuelve al documento
       continuo de antes: Chrome lo parte en Carta y muestra la vista previa en esta ventana. */
    f.onload = function () {
        const w = f.contentWindow;
        if (!w) return;
        try { document.title = w.document.title || logNombreArchivoPdf_(logisticaLeerOpciones_().idioma); } catch (e) { document.title = logNombreArchivoPdf_(logisticaLeerOpciones_().idioma); }
        const restaurar = function () {
            document.title = tituloOriginal;
            w.removeEventListener("afterprint", restaurar);
            logisticaActualizarVista();
        };
        w.addEventListener("afterprint", restaurar);
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("En el diálogo: Destino 'Guardar como PDF', tamaño Carta, márgenes 'Predeterminado' y desactiva 'Encabezados y pies de página'.", "info");
        }
        w.focus();
        w.print();
    };
    f.srcdoc = logisticaConstruirHTML(logisticaLeerOpciones_(), true);
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

let logIa = { fase: "entrevista", historial: [], sugerencia: "", motivo: "", ocupado: false };

function logIaReiniciar_() {
    logIa = { fase: "entrevista", historial: [], sugerencia: "", motivo: "", ocupado: false };
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
            box.innerHTML = "<div class=\"text-muted text-center\" style=\"font-size:0.75rem;margin-top:28px;\">Escribe lo que sepas del envío. Si falta un dato, el asistente pregunta. Cuando esté listo, pulsa Generar datos logísticos.</div>";
        } else {
            box.innerHTML = logIa.historial.map(function (h) {
                const cls = h.role === "user" ? "log-ia-user" : (h.role === "nota" ? "log-ia-nota" : "log-ia-model");
                return "<div class=\"log-ia-msg " + cls + "\">" + logIaHtml_(h.text) + "</div>";
            }).join("");
            box.scrollTop = box.scrollHeight;
        }
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
        cubicaje: {
            cajas: cub.cajas,
            m3: Math.round(cub.m3 * 1000) / 1000,
            pesoKg: Math.round(cub.pesoKg * 100) / 100,
            kgVol: Math.round(cub.kgVol * 100) / 100,
            filasSinEmpaque: cub.filasSin
        },
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
Eres el asistente de logística de SmartBudget. El chat es interno y SIEMPRE en español.
No tocas precios de proyectos, comisión, descuento ni el gran total a mano. Solo hablas del envío.
La modalidad, el destino y el Incoterm los elige la persona. Tú puedes SUGIRIR una modalidad (courier, aerea, fcl, lcl, terrestre) y explicar por qué. PROHIBIDO decir que ya la cambiaste.
El catálogo de fletes todavía no está conectado. Si propones un flete, es una conjetura: fuente "[Estimado IA]". PROHIBIDO presentarlo como tarifa de un proveedor. Si el contexto trae arancel, Duties y Taxes ya tienen su % y su base: no los estimes ni los cambies.
No consultes la web ni archivos. Usa solo este contexto y el chat.
Valores en ${ctx.moneda}, totales del envío (no por unidad). Escribe el COSTO, sin margen: la app suma el margen al pasarlo a la cotización. No lo sumes tú. Duties y Taxes pueden ir en pct (porcentaje) en lugar de valor y no llevan margen.
Filas que existen ahora y son las únicas que puedes llenar: ${tipos}.

CONTEXTO
${JSON.stringify(ctx)}

HISTORIAL
${hist.map(function (h) { return (h.role === "user" ? "Persona" : "Asistente") + ": " + h.text; }).join("\n")}

${modo === "generar"
        ? `MODO: GENERAR DATOS.
Escribe un párrafo corto. AL FINAL un único JSON sin markdown:
{"modalidadSugerida":"aerea","motivo":"una frase","lineas":[{"tipo":"origen","valor":0,"fuente":"[Estimado IA]"}]}
modalidadSugerida es una de: courier, aerea, fcl, lcl, terrestre. En nacional puede ir vacía.
lineas solo con tipos de filasAbiertas. Si falta destino en exportación, o faltan cajas, NO inventes cifras: lineas [] y pregunta lo que falta.
Si una fila no tiene base, omítela.`
        : `MODO: ENTREVISTA.
Responde breve, en español. PROHIBIDO dar cifras de flete y PROHIBIDO un arreglo lineas.
Pregunta solo lo que falte para cotizar: destino (ciudad y país) en exportación, cajas o empaque, peso, y en marítimo el puerto si hace falta.
Si ya puedes opinar, sugiere la modalidad más conveniente en una frase y cierra con este JSON (sin cifras):
{"modalidadSugerida":"aerea","motivo":"una frase"}
Si todavía no hay base para sugerir, no envíes JSON. Invita a pulsar Generar datos logísticos solo cuando el destino y el cubicaje alcancen.`}
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

async function logIaConsultar_(modo, textoUsuario) {
    if (logIa.ocupado) return;
    if (modo === "entrevista" && !String(textoUsuario || "").trim()) return;
    logIa.ocupado = true;
    const btnG = document.getElementById("btnLogIaGenerar");
    const btnE = document.getElementById("btnLogIaEnviar");
    if (btnG) btnG.disabled = true;
    if (btnE) btnE.disabled = true;
    if (modo === "generar") logIa.historial.push({ role: "user", text: "Generar datos logísticos" });
    else logIa.historial.push({ role: "user", text: String(textoUsuario).trim() });
    logIaPintar_();
    if (typeof mostrarEsperaNube === "function") mostrarEsperaNube(modo === "generar" ? "Generando los datos logísticos…" : "Consultando el asistente de logística…");
    try {
        if (typeof realizarPeticionBD !== "function") throw new Error("Servicio no disponible.");
        const pro = !!((document.getElementById("logIaPro") || {}).checked);
        const resp = await realizarPeticionBD({
            action: "gemini_chat",
            forzarPro: pro,
            promptText: logIaPrompt_(modo)
        }, { timeoutMs: pro ? 180000 : 120000 });
        if (typeof pintarUsoGemini === "function") pintarUsoGemini(resp && resp.uso);
        if (!resp || !resp.exito) throw new Error((resp && resp.mensaje) || "Sin respuesta.");
        const bruto = (resp.data && resp.data.candidates && resp.data.candidates[0] && resp.data.candidates[0].content && resp.data.candidates[0].content.parts && resp.data.candidates[0].content.parts[0].text) || "";
        const json = logIaLeerJson_(bruto);
        logIaTomarSugerencia_(json);
        let nota = "";
        if (modo === "generar") {
            const n = logIaEscribirLineas_(json);
            if (n) {
                logMarcarSucio_();
                logisticaPintarEnv_(true);
                logisticaRefrescarTabla_();
                nota = "Escribí " + n + " fila" + (n === 1 ? "" : "s") + " como estimado. La modalidad no se cambió.";
            } else nota = "No escribí cifras. Revisa lo que falta y vuelve a generar.";
        }
        const visible = logIaTextoVisible_(bruto, json) || (modo === "generar" ? "Listo." : "¿Qué dato del envío puedes completar?");
        logIa.historial.push({ role: "model", text: visible });
        if (nota) logIa.historial.push({ role: "nota", text: nota });
        logIa.fase = modo === "generar" ? "datos" : "entrevista";
    } catch (e) {
        const m = String((e && e.message) || e);
        logIa.historial.push({ role: "nota", text: /Acción no válida/i.test(m) ? "El asistente no respondió. Revisa la sesión e inténtalo otra vez." : m });
    } finally {
        if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
        logIa.ocupado = false;
        if (btnG) btnG.disabled = false;
        if (btnE) btnE.disabled = false;
        logIaPintar_();
    }
}

function logisticaInitIa_() {
    const btnE = document.getElementById("btnLogIaEnviar");
    const btnG = document.getElementById("btnLogIaGenerar");
    const inp = document.getElementById("logIaInput");
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
    const idi = document.getElementById("logIdioma");
    if (idi) idi.addEventListener("change", function () { logCab.idiomaManual = true; logisticaActualizarVista(); });
    const sis = document.getElementById("logSistema");
    if (sis) sis.addEventListener("change", function () { logCab.sistemaManual = true; logisticaActualizarVista(); });
    const margen = document.getElementById("logMargen");
    if (margen) margen.addEventListener("change", logisticaActualizarVista);
    logCombo_("logDestPais", "logPaisMenu", logListaPaises_, function (pais) {
        const cod = logEnvCodigoDePais_(pais);
        const c = document.getElementById("logDestCodigo");
        if (cod && c) c.value = cod;
    });
    logCombo_("logDestCodigo", "logCodigoMenu", logListaCodigos_, function (cod) {
        const pais = logPaisDeCodigo_(cod);
        const p = document.getElementById("logDestPais");
        if (pais && p) p.value = pais;
    });
    logCargarPaises_();
    logCargarAranceles_();
    if (document.getElementById("fichaPartida")) logPintarSelectPartida_("");
    logisticaInitIa_();
    ["logMercado", "logModalidad", "logIncoterm", "logDestCiudad", "logDestPais", "logDestCodigo", "logDestPuerto", "logResumenPct", "logMargenLog", "logCostosOn"].forEach(function (id) {
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
    const btnOdoo = document.getElementById("btnLogOdoo");
    if (btnOdoo) {
        btnOdoo.addEventListener("click", async function () {
            const codigo = logCodigoProyectoCotizacion_();
            if (!codigo) {
                if (typeof mostrarNotificacion === "function") mostrarNotificacion("Esta cotización no tiene un proyecto para consultar en Odoo.", "warning");
                return;
            }
            const previo = logCab.over;
            await logisticaCargarOdoo_(true);
            if (logOdoo.estado === "ok" && logOdoo.codigo === codigo) {
                logCab.over = {};
                logMarcarSucio_();
                logisticaActualizarVista();
            } else {
                logCab.over = previo;
                logisticaActualizarVista();
            }
            logisticaCargarImagenOdoo_(true);
        });
    }

    logImgInitEditor_();
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
    document.querySelectorAll("input[name=\"logModo\"]").forEach(function (r) {
        r.addEventListener("change", function () { if (r.checked) logisticaCambiarModo_(r.value); });
    });
    const panelEsc = document.getElementById("logEscPanel");
    if (panelEsc) {
        panelEsc.addEventListener("input", logisticaEventosEscenarios_);
        panelEsc.addEventListener("click", logisticaEventosEscenarios_);
    }
    const menuAdd = document.getElementById("logAddMenu");
    if (menuAdd) menuAdd.addEventListener("click", logisticaAgregarFila_);
    const lista = document.getElementById("logFilasLista");
    if (lista) {
        lista.addEventListener("click", logisticaAccionFila_);
        lista.addEventListener("change", logisticaAccionFila_);
        if (typeof Sortable !== "undefined") {
            new Sortable(lista, {
                handle: ".log-fila-grip",
                animation: 150,
                onEnd: function (evt) {
                    if (evt.oldIndex === evt.newIndex) return;
                    const m = logQuote.filas.splice(evt.oldIndex, 1)[0];
                    logQuote.filas.splice(evt.newIndex, 0, m);
                    /* El código del encabezado sigue al primer proyecto. Un código guardado antes no se queda pegado. */
                    if (logCab.over) delete logCab.over.codigo;
                    logMarcarSucio_();
                    logisticaRefrescarTabla_();
                }
            });
        }
    }
    logisticaPintarEstado_();
    /* si la pestaña ya está activa al cargar (último tab persistido o recarga), no llega shown.bs.tab */
    const tab = document.getElementById("tabLogistica");
    if (tab && tab.classList.contains("active")) {
        logisticaSincronizarProyecto();
        logisticaPrefetchHistorial_();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", logisticaInit);
} else {
    logisticaInit();
}
