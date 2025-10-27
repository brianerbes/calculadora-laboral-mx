// --- VALORES CONSTANTES Y LEGALES (Actualizar anualmente) ---
const SALARIO_MINIMO_GENERAL_2025 = 278.80; // Proyección, ajustar con el valor oficial
const SALARIO_MINIMO_FRONTERA_2025 = 419.88; // Proyección, ajustar con el valor oficial
const UMA_DIARIA_2025 = 113.14; // Proyección, ajustar con el valor oficial
const UMA_MENSUAL_2025 = UMA_DIARIA_2025 * 30.4; // 3439.456
const SPE_LIMITE_2025 = 10171.00; // Límite mensual para SPE
const SPE_MONTO_2025 = 474.64;   // Monto mensual fijo SPE

// Tarifa Mensual ISR 2025 (Art. 96 LISR - Anexo 8 RMF 2025)
const TARIFA_ISR_MENSUAL_2025 = [
    { limiteInferior: 0.01, limiteSuperior: 746.04, cuotaFija: 0.00, porcentajeExcedente: 1.92 },
    { limiteInferior: 746.05, limiteSuperior: 6332.05, cuotaFija: 14.32, porcentajeExcedente: 6.40 },
    { limiteInferior: 6332.06, limiteSuperior: 11128.01, cuotaFija: 371.83, porcentajeExcedente: 10.88 },
    { limiteInferior: 11128.02, limiteSuperior: 12935.82, cuotaFija: 893.63, porcentajeExcedente: 16.00 },
    { limiteInferior: 12935.83, limiteSuperior: 15487.71, cuotaFija: 1182.88, porcentajeExcedente: 17.92 },
    { limiteInferior: 15487.72, limiteSuperior: 31236.49, cuotaFija: 1640.18, porcentajeExcedente: 21.36 },
    { limiteInferior: 31236.50, limiteSuperior: 49233.00, cuotaFija: 5004.12, porcentajeExcedente: 23.52 },
    { limiteInferior: 49233.01, limiteSuperior: 93993.90, cuotaFija: 9236.89, porcentajeExcedente: 30.00 },
    { limiteInferior: 93993.91, limiteSuperior: 125325.20, cuotaFija: 22665.17, porcentajeExcedente: 32.00 },
    { limiteInferior: 125325.21, limiteSuperior: 375975.61, cuotaFija: 32691.18, porcentajeExcedente: 34.00 },
    { limiteInferior: 375975.62, limiteSuperior: Infinity, cuotaFija: 117709.72, porcentajeExcedente: 35.00 }
];

// --- URLs de Referencia Legal (Actualizadas y Verificadas) ---
// Nota: Justia es una buena fuente, pero los links directos a fracciones pueden romperse.
// Se enlaza al artículo general para mayor estabilidad. Art. 93 LISR contiene las exenciones.
const URLS_LEGALES = {
    LFT_BASE: "https://mexico.justia.com/federales/leyes/ley-federal-del-trabajo/titulo-",
    LISR_BASE: "https://mexico.justia.com/federales/leyes/ley-del-impuesto-sobre-la-renta/titulo-iv/",
    ART_47: "segundo/capitulo-iv/#articulo-47",
    ART_48: "segundo/capitulo-iv/#articulo-48",
    ART_50: "segundo/capitulo-iv/#articulo-50",
    ART_51: "segundo/capitulo-iv/#articulo-51",
    ART_52: "segundo/capitulo-iv/#articulo-52",
    ART_54: "segundo/capitulo-iv/#articulo-54",
    ART_76: "tercero/capitulo-iv/#articulo-76", // Vacaciones Dignas
    ART_79: "tercero/capitulo-iv/#articulo-79", // Proporcional Vacaciones
    ART_80: "tercero/capitulo-iv/#articulo-80", // Prima Vacacional
    ART_87: "tercero/capitulo-v/#articulo-87", // Aguinaldo
    ART_162: "cuarto/capitulo-iv/#articulo-162", // Prima Antigüedad
    ART_436: "septimo/capitulo-viii/#articulo-436", // Indemnización Terminación Colectiva
    ART_123_CONST: "https://mexico.justia.com/federales/constitucion-politica-de-los-estados-unidos-mexicanos/titulo-sexto/capitulo-i/#articulo-123", // Base Indemnización 3 meses
    LISR_93: "capitulo-i/#articulo-93", // Exenciones ISR (Aquí están las UMAs para Aguinaldo, PV, Indemnizaciones)
    LISR_96: "capitulo-i/#articulo-96", // Tarifa ISR y Procedimiento Especial Separación
    RLISR_174: "https://mexico.justia.com/federales/reglamentos/reglamento-de-la-ley-del-impuesto-sobre-la-renta/titulo-iv/capitulo-i/#articulo-174" // Detalle Procedimiento ISR Separación
};

// --- LÓGICA PRINCIPAL DE LA CALCULADORA ---
document.addEventListener('DOMContentLoaded', () => {
    
    document.getElementById('fechaBaja').value = new Date().toISOString().split('T')[0];
    
    const form = document.getElementById('calculator-form');
    const downloadButton = document.getElementById('download-json');
    const pdfButton = document.getElementById('download-pdf');
    let reporteParaDescargar = null;

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const inputs = {
            fechaIngreso: new Date(document.getElementById('fechaIngreso').value + 'T00:00:00'),
            fechaBaja: new Date(document.getElementById('fechaBaja').value + 'T00:00:00'),
            ingresoUltimoMes: parseFloat(document.getElementById('ingresoUltimoMes').value),
            sdiManual: parseFloat(document.getElementById('sdiManual').value),
            diasAguinaldo: parseInt(document.getElementById('diasAguinaldo').value),
            saldoVacaciones: parseInt(document.getElementById('saldoVacaciones').value),
            motivoBaja: document.getElementById('motivoBaja').value,
            esZonaFronteriza: document.querySelector('input[name="zona_salarial"]:checked').value === 'frontera'
        };

        const esSalarioValido = (!isNaN(inputs.ingresoUltimoMes) && inputs.ingresoUltimoMes > 0) || (!isNaN(inputs.sdiManual) && inputs.sdiManual > 0);
        if (inputs.fechaBaja < inputs.fechaIngreso || !esSalarioValido) {
            alert("Por favor, revise que todos los datos sean correctos. La fecha de baja no puede ser anterior al ingreso y debe ingresar un valor de salario positivo.");
            return;
        }

        const calc = calcularVariablesBase(inputs);
        const finiquito = calcularFiniquito(calc, inputs);
        const liquidacion = calcularLiquidacion(calc, inputs);
        const calculoISR = calcularISR({ calc, inputs, finiquito, liquidacion });

        const totalFiniquito = finiquito.aguinaldo.monto + finiquito.vacaciones.monto + finiquito.primaVacacional.monto;
        const totalLiquidacion = liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto;
        const totalBruto = totalFiniquito + totalLiquidacion;
        const totalNeto = totalBruto - calculoISR.isrTotalRetener;

        reporteParaDescargar = { inputs, calc, finiquito, liquidacion, totalFiniquito, totalLiquidacion, totalBruto, calculoISR, totalNeto };
        
        displayResults(reporteParaDescargar); // Llama a la función que muestra todo
        // Mostrar botones solo después del cálculo
        downloadButton.style.display = 'inline-block';
        pdfButton.style.display = 'inline-block';
    });

    downloadButton.addEventListener('click', () => {
        if (!reporteParaDescargar) { alert("Primero debe realizar un cálculo."); return; }
        const reporteJSON = generarReporteJSON(reporteParaDescargar); // Usar la nueva función detallada
        const jsonString = JSON.stringify(reporteJSON, null, 2);
        descargarArchivo(jsonString, `reporte_liquidacion_${reporteParaDescargar.inputs.fechaBaja.toISOString().split('T')[0]}.json`, 'application/json');
    });
    
    pdfButton.addEventListener('click', () => {
        if (!reporteParaDescargar) { alert("Primero debe realizar un cálculo."); return; }
        generarPDF(reporteParaDescargar); // Usar la función PDF optimizada
    });
});


// --- FUNCIONES DE CÁLCULO BASE (LFT) ---
function calcularVariablesBase(inputs) {
    const antiguedadEnMs = inputs.fechaBaja - inputs.fechaIngreso;
    // Corregir cálculo de antigüedad para evitar negatividad si es menos de 1 día
     if (antiguedadEnMs < 0) {
         alert("La fecha de baja no puede ser anterior a la fecha de ingreso.");
         throw new Error("Fechas inválidas"); // Detener ejecución
     }
    const antiguedadEnAnios = antiguedadEnMs / (1000 * 60 * 60 * 24 * 365.25);
    const antiguedadAniosCompletos = Math.floor(antiguedadEnAnios);
    const diasVacacionesPorLey = getDiasVacacionesPorLey(antiguedadAniosCompletos + 1);
    let SD = 0, SDI = 0, fuenteSDI = '';
    if (!isNaN(inputs.sdiManual) && inputs.sdiManual > 0) {
        SDI = inputs.sdiManual;
        const factorIntegracionAprox = 1 + (inputs.diasAguinaldo / 365) + (diasVacacionesPorLey * 0.25 / 365);
        SD = SDI / factorIntegracionAprox;
        fuenteSDI = "Ingresado manualmente por el usuario";
    } else {
        SD = inputs.ingresoUltimoMes / 30; // Promedio LFT Art. 89
        const parteDiariaAguinaldo = (SD * inputs.diasAguinaldo) / 365;
        const parteDiariaPrimaVacacional = (SD * diasVacacionesPorLey * 0.25) / 365;
        SDI = SD + parteDiariaAguinaldo + parteDiariaPrimaVacacional;
        fuenteSDI = "Autocalculado a partir de ingresos brutos y prestaciones de ley";
    }
    const USMO = SD * 30; // Usar 30 como factor estándar para USMO según práctica Art. 174 RLISR
    return { antiguedadEnAnios, antiguedadAniosCompletos, diasVacacionesPorLey, SD, SDI, fuenteSDI, USMO };
}
function calcularFiniquito(calc, inputs) {
    const inicioDelAnio = new Date(inputs.fechaBaja.getFullYear(), 0, 1);
    const diasTrabajadosEnElAnio = Math.max(0, Math.floor((inputs.fechaBaja - inicioDelAnio) / (1000 * 60 * 60 * 24)) + 1);
    const aguinaldoProporcional = (calc.SD * inputs.diasAguinaldo / 365) * diasTrabajadosEnElAnio;
    const aniversarioEsteAnio = new Date(inputs.fechaBaja.getFullYear(), inputs.fechaIngreso.getMonth(), inputs.fechaIngreso.getDate());
    let ultimoAniversario = aniversarioEsteAnio <= inputs.fechaBaja ? aniversarioEsteAnio : new Date(inputs.fechaBaja.getFullYear() - 1, inputs.fechaIngreso.getMonth(), inputs.fechaIngreso.getDate());
     if (ultimoAniversario > inputs.fechaBaja) { // Caso borde si baja justo antes del aniversario
         ultimoAniversario = new Date(inputs.fechaBaja.getFullYear() - 1, inputs.fechaIngreso.getMonth(), inputs.fechaIngreso.getDate());
     }
    const diasDesdeUltimoAniversario = Math.max(0, Math.floor((inputs.fechaBaja - ultimoAniversario) / (1000 * 60 * 60 * 24)));
    const diasVacacionesProporcionales = (calc.diasVacacionesPorLey / 365) * diasDesdeUltimoAniversario;
    const totalDiasVacaciones = inputs.saldoVacaciones + diasVacacionesProporcionales;
    const montoVacaciones = totalDiasVacaciones * calc.SD;
    const primaVacacional = montoVacaciones * 0.25;
    return { 
        aguinaldo: { monto: aguinaldoProporcional, diasTrabajados: diasTrabajadosEnElAnio }, 
        vacaciones: { monto: montoVacaciones, dias: totalDiasVacaciones, saldo: inputs.saldoVacaciones, proporcionales: diasVacacionesProporcionales }, 
        primaVacacional: { monto: primaVacacional }
    };
}
function calcularLiquidacion(calc, inputs) {
    let indemnizacion90dias = 0;
    let primaAntiguedad = 0;
    let veinteDiasPorAnio = 0;
    switch (inputs.motivoBaja) {
        case 'renuncia': case 'mutuo_consentimiento': case 'fin_contrato':
            if (calc.antiguedadAniosCompletos >= 15) primaAntiguedad = calcularPrimaAntiguedad(calc.SD, calc.antiguedadEnAnios, inputs.esZonaFronteriza);
            break;
        case 'despido_injustificado': case 'terminacion_colectiva':
            indemnizacion90dias = calc.SDI * 90;
            primaAntiguedad = calcularPrimaAntiguedad(calc.SD, calc.antiguedadEnAnios, inputs.esZonaFronteriza);
            break;
        case 'rescisión_trabajador':
            indemnizacion90dias = calc.SDI * 90;
            primaAntiguedad = calcularPrimaAntiguedad(calc.SD, calc.antiguedadEnAnios, inputs.esZonaFronteriza);
            veinteDiasPorAnio = calc.SDI * 20 * calc.antiguedadEnAnios;
            break;
        case 'despido_justificado': case 'muerte_trabajador':
            primaAntiguedad = calcularPrimaAntiguedad(calc.SD, calc.antiguedadEnAnios, inputs.esZonaFronteriza);
            break;
        case 'incapacidad_trabajador':
            indemnizacion90dias = calc.SD * 30; // Art. 54 LFT
            primaAntiguedad = calcularPrimaAntiguedad(calc.SD, calc.antiguedadEnAnios, inputs.esZonaFronteriza);
            break;
    }
    return { indemnizacion90dias: { monto: indemnizacion90dias }, primaAntiguedad: { monto: primaAntiguedad }, veinteDiasPorAnio: { monto: veinteDiasPorAnio } };
}
function calcularPrimaAntiguedad(SD, antiguedadEnAnios, esZonaFronteriza) {
    const salarioMinimo = esZonaFronteriza ? SALARIO_MINIMO_FRONTERA_2025 : SALARIO_MINIMO_GENERAL_2025;
    const topeSalarial = salarioMinimo * 2;
    const baseCalculo = Math.min(SD, topeSalarial); // LFT Art. 486
    return baseCalculo * 12 * antiguedadEnAnios; // LFT Art. 162
}
function getDiasVacacionesPorLey(aniosCompletos) { // Tabla Art. 76 LFT (Reforma Vacaciones Dignas)
    if (aniosCompletos <= 1) return 12; if (aniosCompletos === 2) return 14; if (aniosCompletos === 3) return 16; if (aniosCompletos === 4) return 18; if (aniosCompletos === 5) return 20; if (aniosCompletos >= 6 && aniosCompletos <= 10) return 22; if (aniosCompletos >= 11 && aniosCompletos <= 15) return 24; if (aniosCompletos >= 16 && aniosCompletos <= 20) return 26; if (aniosCompletos >= 21 && aniosCompletos <= 25) return 28; if (aniosCompletos >= 26 && aniosCompletos <= 30) return 30; if (aniosCompletos >= 31) return 32; return 12;
}

// --- FUNCIONES DE CÁLCULO DE ISR ---
function calcularISR(data) {
    const { calc, inputs, finiquito, liquidacion } = data;
    
    // 1. Calcular exenciones parciales LISR Art. 93
    const limiteExentoAG = 30 * UMA_DIARIA_2025; // Frac. XIV
    const montoExentoAG = Math.min(finiquito.aguinaldo.monto, limiteExentoAG);
    const montoGravadoAG = finiquito.aguinaldo.monto - montoExentoAG;

    const limiteExentoPV = 15 * UMA_DIARIA_2025; // Frac. XIV
    const montoExentoPV = Math.min(finiquito.primaVacacional.monto, limiteExentoPV);
    const montoGravadoPV = finiquito.primaVacacional.monto - montoExentoPV;

    const montoTotalIndemnizatorio = liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto;
    let aniosComputablesISR = calc.antiguedadAniosCompletos; // Fracción > 6 meses = 1 año más
    if ((calc.antiguedadEnAnios - calc.antiguedadAniosCompletos) > 0.5) aniosComputablesISR += 1;
    const limiteExentoIND = 90 * UMA_DIARIA_2025 * aniosComputablesISR; // Frac. XIII
    const montoExentoIND = Math.min(montoTotalIndemnizatorio, limiteExentoIND);
    const montoGravadoIND = montoTotalIndemnizatorio - montoExentoIND;

    // 2. Determinar Bases Gravables Separadas
    const BGO = montoGravadoAG + montoGravadoPV + finiquito.vacaciones.monto; // Base Gravable Ordinaria (Vacaciones 100% gravables)
    const BGS = montoGravadoIND; // Base Gravable por Separación

    // 3. Aplicar Algoritmo de Retención (Bifurcación Art. 96 LISR, sexto párrafo)
    const USMO = calc.USMO; 
    let isrTotalRetener = 0;
    let isrOrdNeto = 0, isrSeparacion = 0, tasaEfectiva = 0, procedimientoAplicado = "";

    if (montoTotalIndemnizatorio <= 0 || BGS <= 0) { // Si no hay indemnización, calcular ISR normal sobre finiquito
         procedimientoAplicado = "Regular (Solo Finiquito)";
         const isrBruto = aplicarTarifaISR(BGO);
         const speAplicable = aplicarSPE(BGO);
         isrTotalRetener = Math.max(0, isrBruto - speAplicable);
    } else if (BGS <= USMO) {
        procedimientoAplicado = "Regular Unificado (BGS <= USMO)";
        const baseTotalMes = BGO + BGS;
        const isrBruto = aplicarTarifaISR(baseTotalMes);
        const speAplicable = aplicarSPE(baseTotalMes);
        isrTotalRetener = Math.max(0, isrBruto - speAplicable);
    } else { // BGS > USMO
        procedimientoAplicado = "Especial Tasa Efectiva (BGS > USMO)";
        // ISR Ordinario sobre BGO
        const isrOrdBruto = aplicarTarifaISR(BGO);
        const speAplicableOrd = aplicarSPE(BGO);
        isrOrdNeto = Math.max(0, isrOrdBruto - speAplicableOrd);
        // ISR Separación sobre BGS
        const isrDelUSMO = aplicarTarifaISR(USMO); // SIN restar SPE
        tasaEfectiva = (USMO > 0) ? isrDelUSMO / USMO : 0;
        isrSeparacion = BGS * tasaEfectiva;
        isrTotalRetener = isrOrdNeto + isrSeparacion;
    }
    return { 
        montoExentoAG, montoGravadoAG, limiteExentoAG,
        montoExentoPV, montoGravadoPV, limiteExentoPV,
        montoExentoIND, montoGravadoIND, limiteExentoIND, aniosComputablesISR,
        BGO, BGS, USMO,
        procedimientoAplicado, tasaEfectiva,
        isrOrdNeto, isrSeparacion,
        isrTotalRetener: isrTotalRetener || 0 
    };
}
function aplicarTarifaISR(baseGravable) {
    let isrCausado = 0;
    for (const rango of TARIFA_ISR_MENSUAL_2025) {
        if (baseGravable >= rango.limiteInferior && (baseGravable <= rango.limiteSuperior || rango.limiteSuperior === Infinity)) {
            const excedente = baseGravable - rango.limiteInferior;
            isrCausado = rango.cuotaFija + (excedente * (rango.porcentajeExcedente / 100));
            break; 
        }
    }
    return isrCausado;
}
function aplicarSPE(ingresoGravableMensual) {
    // Nota: Asume pago Feb-Dic 2025. Falta regla transitoria Enero.
    return (ingresoGravableMensual <= SPE_LIMITE_2025) ? SPE_MONTO_2025 : 0;
}


// --- FUNCIONES DE VISUALIZACIÓN Y GENERACIÓN DE REPORTES ---

function displayResults(data) {
    const { finiquito, totalFiniquito, liquidacion, totalLiquidacion, totalBruto, totalNeto } = data;
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    
    // Llenar resultados principales
    document.getElementById('res-aguinaldo').textContent = formatCurrency(finiquito.aguinaldo.monto);
    document.getElementById('res-vacaciones').textContent = formatCurrency(finiquito.vacaciones.monto);
    document.getElementById('res-prima-vacacional').textContent = formatCurrency(finiquito.primaVacacional.monto);
    document.getElementById('res-total-finiquito').textContent = formatCurrency(totalFiniquito);
    document.getElementById('res-indemnizacion').textContent = formatCurrency(liquidacion.indemnizacion90dias.monto);
    document.getElementById('res-prima-antiguedad').textContent = formatCurrency(liquidacion.primaAntiguedad.monto);
    document.getElementById('res-20-dias').textContent = formatCurrency(liquidacion.veinteDiasPorAnio.monto);
    document.getElementById('res-total-liquidacion').textContent = formatCurrency(totalLiquidacion);
    document.getElementById('res-total-bruto').textContent = formatCurrency(totalBruto);
    document.getElementById('res-total-neto').textContent = formatCurrency(totalNeto);
    
    // Llenar detalles explicativos (ahora sin ISR aquí)
    fillDetails(data);

    // Llenar la sección de detalles de ISR
    fillIsrDetails(data);

    // Mostrar contenedores
    document.getElementById('results-container').classList.remove('hidden');
    document.getElementById('isr-details-container').classList.remove('hidden');
}

function fillDetails(data) { // Detalles SIN ISR
    const { finiquito, liquidacion, inputs, calc } = data;
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const { antiguedadEnAnios, SD, SDI } = calc;
    const anios = Math.floor(antiguedadEnAnios);
    const meses = Math.floor((antiguedadEnAnios * 12) % 12);
    const dias = Math.floor((antiguedadEnAnios * 365.25) - (anios * 365.25) - (meses * 30.4375));
    document.getElementById('res-summary-text').textContent = `Cálculo para una antigüedad de ${anios} años, ${meses} meses y ${dias} días.`;

    // Usar lenguaje neutral
    document.getElementById('det-aguinaldo').innerHTML = `
        <b>Explicación:</b> Parte proporcional del aguinaldo anual.<br>
        <b>Fundamento:</b> <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_87}" target="_blank">Art. 87, LFT</a>.<br>
        <b>Fórmula:</b> ((SD x Días Aguinaldo) / 365) x Días del año trabajados.<br>
        <b>Cálculo:</b> ((${formatCurrency(SD)} x ${inputs.diasAguinaldo}) / 365) x ${finiquito.aguinaldo.diasTrabajados} días = ${formatCurrency(finiquito.aguinaldo.monto)}`;

    document.getElementById('det-vacaciones').innerHTML = `
        <b>Explicación:</b> Pago de días de vacaciones no tomados (saldo + proporcional).<br>
        <b>Fundamento:</b> <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_76}" target="_blank">Art. 76</a> y <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_79}" target="_blank">Art. 79, LFT</a>.<br>
        <b>Fórmula:</b> (Saldo pendiente + Días proporcionales) x SD.<br>
        <b>Cálculo:</b> (${inputs.saldoVacaciones} saldo + ${finiquito.vacaciones.proporcionales.toFixed(2)} proporcionales) x ${formatCurrency(SD)} = ${formatCurrency(finiquito.vacaciones.monto)}`;

    document.getElementById('det-prima-vacacional').innerHTML = `
        <b>Explicación:</b> 25% adicional sobre el monto total de vacaciones.<br>
        <b>Fundamento:</b> <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_80}" target="_blank">Art. 80, LFT</a>.<br>
        <b>Fórmula:</b> Monto Vacaciones x 0.25.<br>
        <b>Cálculo:</b> ${formatCurrency(finiquito.vacaciones.monto)} x 0.25 = ${formatCurrency(finiquito.primaVacacional.monto)}`;
    
    const salarioMinimo = inputs.esZonaFronteriza ? SALARIO_MINIMO_FRONTERA_2025 : SALARIO_MINIMO_GENERAL_2025;
    const topeSalarial = salarioMinimo * 2;
    const basePrimaAntiguedad = Math.min(SD, topeSalarial);
    
    document.getElementById('det-prima-antiguedad').innerHTML = `
        <b>Explicación:</b> 12 días de salario por cada año de servicio.<br>
        <b>Fundamento:</b> <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_162}" target="_blank">Art. 162, LFT</a>.<br>
        <b>Fórmula:</b> (Salario Diario Topado a 2 SMG) x 12 x Años de Servicio.<br>
        <b>Cálculo:</b> Base(${formatCurrency(basePrimaAntiguedad)}) x 12 x ${antiguedadEnAnios.toFixed(3)} años = ${formatCurrency(liquidacion.primaAntiguedad.monto)}`;
    
    let textoIndemnizacion = `
        <b>Explicación:</b> 90 días de salario por despido injustificado o terminación colectiva.<br>
        <b>Fundamento:</b> <a href="${URLS_LEGALES.ART_123_CONST}" target="_blank">Art. 123 Const.</a>; <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_50}" target="_blank">Art. 50 LFT</a>; <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_436}" target="_blank">Art. 436 LFT</a>.<br>
        <b>Fórmula:</b> Salario Diario Integrado (SDI) x 90.<br>
        <b>Cálculo:</b> ${formatCurrency(SDI)} x 90 = ${formatCurrency(liquidacion.indemnizacion90dias.monto)}`;
    if (inputs.motivoBaja === 'incapacidad_trabajador') { textoIndemnizacion = `
        <b>Explicación:</b> 1 mes de salario por terminación por incapacidad.<br>
        <b>Fundamento:</b> <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_54}" target="_blank">Art. 54, LFT</a>.<br>
        <b>Fórmula:</b> Salario Diario (SD) x 30.<br>
        <b>Cálculo:</b> ${formatCurrency(SD)} x 30 = ${formatCurrency(liquidacion.indemnizacion90dias.monto)}`; }
    document.getElementById('det-indemnizacion').innerHTML = textoIndemnizacion;
    
    let texto20dias = `
        <b>¡Importante!</b> Este pago es condicional. NO se incluye en una liquidación normal por despido injustificado o cierre de campaña.<br>
        <b>Fundamento:</b> <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_50}" target="_blank">Art. 50</a> y <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_52}" target="_blank">Art. 52, LFT</a>.`;
    if (inputs.motivoBaja === 'rescisión_trabajador') { texto20dias = `
        <b>Explicación:</b> 20 días de salario por año. Corresponde porque la terminación es por una falta grave del patrón (Art. 51).<br>
        <b>Fundamento:</b> <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_52}" target="_blank">Art. 52, LFT</a>.<br>
        <b>Fórmula:</b> Salario Diario Integrado (SDI) x 20 x Años de Servicio.<br>
        <b>Cálculo:</b> ${formatCurrency(SDI)} x 20 x ${antiguedadEnAnios.toFixed(3)} años = ${formatCurrency(liquidacion.veinteDiasPorAnio.monto)}`; }
    document.getElementById('det-20-dias').innerHTML = texto20dias;

    // Usar lenguaje neutral en el Disclaimer
    document.querySelector('.disclaimer').innerHTML = `
        <strong>Aviso Legal:</strong> Este cálculo es una estimación con fines orientativos, basada en los datos proporcionados y en la legislación vigente a la fecha de consulta (2025). Este resultado no constituye asesoría legal ni reemplaza la consulta con un profesional. Para la defensa y reclamación formal de sus derechos laborales, acuda a la Procuraduría Federal de la Defensa del Trabajo (PROFEDET) para recibir asesoría gratuita y personalizada.
    `;
}

// --- NUEVA FUNCIÓN PARA LLENAR EL DESGLOSE DE ISR (con lenguaje neutral) ---
function fillIsrDetails(data) {
    const { calculoISR } = data;
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    
    let isrContent = `
        <p>El cálculo del ISR sobre pagos por separación sigue reglas especiales (<a href="${URLS_LEGALES.LISR_BASE}${URLS_LEGALES.LISR_96}" target="_blank">Art. 96 LISR</a>, <a href="${URLS_LEGALES.RLISR_174}" target="_blank">Art. 174 RLISR</a>). Se separan los ingresos ordinarios de las indemnizaciones.</p>
        
        <h4>1. Cálculo de Partes Exentas (<a href="${URLS_LEGALES.LISR_BASE}${URLS_LEGALES.LISR_93}" target="_blank">Art. 93 LISR</a>)</h4>
        <ul>
            <li><b>Aguinaldo:</b> Exento hasta 30 UMAs (${formatCurrency(calculoISR.limiteExentoAG)}). Monto Exento: ${formatCurrency(calculoISR.montoExentoAG)}.</li>
            <li><b>Prima Vacacional:</b> Exenta hasta 15 UMAs (${formatCurrency(calculoISR.limiteExentoPV)}). Monto Exento: ${formatCurrency(calculoISR.montoExentoPV)}.</li>
            <li><b>Indemnizaciones (3 meses, P. Antigüedad, 20 días/año):</b> Exentas hasta 90 UMAs por año de servicio (${calculoISR.aniosComputablesISR} años computables). Límite Global: ${formatCurrency(calculoISR.limiteExentoIND)}. Monto Exento Total: ${formatCurrency(calculoISR.montoExentoIND)}.</li>
            <li><b>Vacaciones:</b> 100% Gravables.</li>
        </ul>

        <h4>2. Determinación de Bases Gravables</h4>
        <ul>
            <li><b>Base Gravable Ordinaria (BGO):</b> Suma de partes gravadas de Aguinaldo, P. Vacacional y Vacaciones = ${formatCurrency(calculoISR.BGO)}.</li>
            <li><b>Base Gravable por Separación (BGS):</b> Parte gravada de las Indemnizaciones = ${formatCurrency(calculoISR.BGS)}.</li>
        </ul>

        <h4>3. Aplicación del Algoritmo de Retención</h4>
        <ul>
            <li>Procedimiento Aplicado: ${calculoISR.procedimientoAplicado}.</li>
            <li>Último Sueldo Mensual Ordinario (USMO Estimado): ${formatCurrency(calculoISR.USMO)}.</li>
    `;

    if (calculoISR.BGS > calculoISR.USMO) { // Si es el procedimiento especial
        isrContent += `
            <li>Tasa Efectiva (basada en ISR del USMO sin SPE): ${(calculoISR.tasaEfectiva * 100).toFixed(4)}%.</li>
            <li>ISR Ordinario Neto (sobre BGO): ${formatCurrency(calculoISR.isrOrdNeto)}.</li>
            <li>ISR por Separación (BGS x Tasa): ${formatCurrency(calculoISR.isrSeparacion)}.</li>
        `;
    }
     isrContent += `
            <li><b>ISR Total a Retener (Estimado): ${formatCurrency(calculoISR.isrTotalRetener)}</b></li>
        </ul>
    `;

    document.getElementById('isr-details-content').innerHTML = isrContent;
}


// --- FUNCIÓN PARA GENERAR EL JSON VERBOSO (con lenguaje neutral y links) ---
function generarReporteJSON(data) {
    const { inputs, calc, finiquito, liquidacion, totalFiniquito, totalLiquidacion, totalBruto, calculoISR, totalNeto } = data;
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const salarioMinimo = inputs.esZonaFronteriza ? SALARIO_MINIMO_FRONTERA_2025 : SALARIO_MINIMO_GENERAL_2025;
    const topeSalarial = salarioMinimo * 2;
    const basePrimaAntiguedad = Math.min(calc.SD, topeSalarial);
    const anios = Math.floor(calc.antiguedadEnAnios);
    const meses = Math.floor((calc.antiguedadEnAnios * 12) % 12);
    const dias = Math.floor((calc.antiguedadEnAnios * 365.25) - (anios * 365.25) - (meses * 30.4375));
    
    // Función auxiliar para agregar URL a fundamento
    const addUrl = (key) => ({ texto: key, url: URLS_LEGALES[key.replace(/ /g, "_").replace(/\./g, "").toUpperCase()] || `${URLS_LEGALES.LFT_BASE}${URLS_LEGALES[key.split(' ')[0].toUpperCase()]}` || '' });

    const reporte = {
        info_reporte: { version_calculadora: "v6.0 (ISR Separado + Links)", fecha_generacion: new Date().toISOString(), marco_legal: "LFT y LISR, México (Vigente a 2025)" },
        evaluacion_legal_escenario: { escenario_seleccionado: inputs.motivoBaja.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), pago_aplicable: totalLiquidacion > 0 ? "Liquidación Completa + Finiquito" : "Finiquito" },
        datos_de_entrada: { fecha_ingreso: inputs.fechaIngreso.toISOString().split('T')[0], fecha_baja: inputs.fechaBaja.toISOString().split('T')[0], ingreso_bruto_ultimos_30_dias: !isNaN(inputs.ingresoUltimoMes) ? inputs.ingresoUltimoMes : null, sdi_manual_ingresado: !isNaN(inputs.sdiManual) ? inputs.sdiManual : 'No ingresado', dias_aguinaldo_anual: inputs.diasAguinaldo, saldo_vacaciones_previas: inputs.saldoVacaciones, es_zona_fronteriza: inputs.esZonaFronteriza },
        calculos_base: { antiguedad: { anios_decimal: parseFloat(calc.antiguedadEnAnios.toFixed(4)), desglose: `${anios} años, ${meses} meses y ${dias} días` }, salario_diario_sd: { valor: parseFloat(calc.SD.toFixed(2)), fuente: calc.fuenteSDI === 'Ingresado manualmente por el usuario' ? "Estimación inversa" : "Promedio ingresos brutos" }, salario_diario_integrado_sdi: { valor: parseFloat(calc.SDI.toFixed(2)), fuente: calc.fuenteSDI }, vacaciones_anuales_por_ley: { dias: calc.diasVacacionesPorLey } },
        desglose_bruto: {
            finiquito: {
                componentes: [
                    { concepto: "Aguinaldo Proporcional", monto_bruto: parseFloat(finiquito.aguinaldo.monto.toFixed(2)), fundamento_legal: addUrl("ART_87 LFT") },
                    { concepto: "Vacaciones (Saldo + Proporcional)", monto_bruto: parseFloat(finiquito.vacaciones.monto.toFixed(2)), fundamento_legal: addUrl("ART_76 LFT") },
                    { concepto: "Prima Vacacional (25%)", monto_bruto: parseFloat(finiquito.primaVacacional.monto.toFixed(2)), fundamento_legal: addUrl("ART_80 LFT") }
                ], total_finiquito_bruto: parseFloat(totalFiniquito.toFixed(2))
            },
            liquidacion: {
                componentes: [
                    { concepto: "Indemnización Constitucional", monto_bruto: parseFloat(liquidacion.indemnizacion90dias.monto.toFixed(2)), fundamento_legal: addUrl(inputs.motivoBaja === 'incapacidad_trabajador' ? "ART_54 LFT" : "ART_123_CONST") },
                    { concepto: "Prima de Antigüedad (12 días por año)", monto_bruto: parseFloat(liquidacion.primaAntiguedad.monto.toFixed(2)), fundamento_legal: addUrl("ART_162 LFT") },
                    { concepto: "20 Días de Salario por Año", monto_bruto: parseFloat(liquidacion.veinteDiasPorAnio.monto.toFixed(2)), fundamento_legal: addUrl("ART_52 LFT") }
                ], total_liquidacion_bruta: parseFloat(totalLiquidacion.toFixed(2))
            }
        },
        calculo_isr_detallado: { // Sección ISR consolidada y detallada
            fundamento_legal: addUrl("LISR_96"),
            exenciones_aplicadas: [
                 { concepto: "Aguinaldo", monto_exento: parseFloat(calculoISR.montoExentoAG.toFixed(2)), limite: `30 UMAs (${formatCurrency(calculoISR.limiteExentoAG)})`, fundamento: addUrl("LISR_93") }, // Frac XIV
                 { concepto: "Prima Vacacional", monto_exento: parseFloat(calculoISR.montoExentoPV.toFixed(2)), limite: `15 UMAs (${formatCurrency(calculoISR.limiteExentoPV)})`, fundamento: addUrl("LISR_93") }, // Frac XIV
                 { concepto: "Indemnizaciones", monto_exento_total: parseFloat(calculoISR.montoExentoIND.toFixed(2)), limite: `90 UMAs/Año (${calculoISR.aniosComputablesISR} años = ${formatCurrency(calculoISR.limiteExentoIND)})`, fundamento: addUrl("LISR_93") } // Frac XIII
            ],
            bases_gravables: {
                 ordinaria_bgo: parseFloat(calculoISR.BGO.toFixed(2)),
                 separacion_bgs: parseFloat(calculoISR.BGS.toFixed(2))
            },
            procedimiento_retencion: {
                 tipo: calculoISR.procedimientoAplicado,
                 usmo_estimado: parseFloat(calculoISR.USMO.toFixed(2)),
                 tasa_efectiva_aplicada: calculoISR.BGS > calculoISR.USMO ? parseFloat((calculoISR.tasaEfectiva * 100).toFixed(4)) : null,
                 isr_ordinario_neto: calculoISR.BGS > calculoISR.USMO ? parseFloat(calculoISR.isrOrdNeto.toFixed(2)) : null,
                 isr_separacion: calculoISR.BGS > calculoISR.USMO ? parseFloat(calculoISR.isrSeparacion.toFixed(2)) : null,
                 isr_total_a_retener: parseFloat(calculoISR.isrTotalRetener.toFixed(2))
            }
        },
        resumen_neto: {
            total_bruto: formatCurrency(totalBruto),
            isr_retenido_estimado: formatCurrency(calculoISR.isrTotalRetener),
            pago_neto_estimado: formatCurrency(totalNeto),
            nota: "El ISR retenido es una estimación. El cálculo final puede variar ligeramente."
        }
    };
    return reporte;
}

// Función auxiliar para descargar archivos
function descargarArchivo(contenido, nombreArchivo, tipoContenido) {
    const link = document.createElement('a');
    const file = new Blob([contenido], { type: tipoContenido });
    link.href = URL.createObjectURL(file);
    link.download = nombreArchivo;
    document.body.appendChild(link); // Necesario para Firefox
    link.click();
    document.body.removeChild(link); // Limpiar
    URL.revokeObjectURL(link.href);
}

// Importar jsPDF (asumiendo que está incluida en el HTML)
const { jsPDF } = window.jspdf;

// --- FUNCIÓN PARA GENERAR PDF (OPTIMIZADA PARA 1 PÁGINA Y NEUTRAL) ---
function generarPDF(data) {
    const { inputs, calc, finiquito, liquidacion, totalFiniquito, totalLiquidacion, totalBruto, calculoISR, totalNeto } = data;
    // Reducir márgenes y usar fuente más pequeña
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
    const margin = 10; // Reducido de 15 a 10
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;
    const lineSpacing = 1.8; // Reducido para juntar líneas
    const sectionSpacing = 3; // Reducido
    const titleSize = 14;
    const headerSize = 11;
    const bodySize = 9;
    const smallSize = 7;

    // Función addText modificada para tamaños y espaciados reducidos
    const addText = (text, size, weight, align = 'left', spacing = sectionSpacing) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', weight);
        const splitText = doc.splitTextToSize(text, contentWidth);
        splitText.forEach(line => {
             // Ya no se verifica el salto de página para intentar que quepa todo
            doc.text(line, align === 'center' ? pageWidth / 2 : margin, currentY, { align: align });
            currentY += size / lineSpacing; // Usar divisor más grande para juntar líneas
        });
        currentY += spacing;
    };
    const addLine = (spacing = 1) => { // Reducir espacio de línea
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += spacing;
    }
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const formatDate = (date) => date.toLocaleDateString('es-MX', {day: '2-digit', month: '2-digit', year: 'numeric'});

    addText('Reporte de Cálculo Laboral Estimado', titleSize, 'bold', 'center', 4);
    addText(`Generado el: ${formatDate(new Date())}`, smallSize, 'normal', 'center', 5); addLine(3);

    addText('Resumen', headerSize, 'bold', 'left', 2);
    const anios = Math.floor(calc.antiguedadEnAnios); const meses = Math.floor((calc.antiguedadEnAnios * 12) % 12); const dias = Math.floor((calc.antiguedadEnAnios * 365.25) - (anios * 365.25) - (meses * 30.4375));
    addText(`Antigüedad: ${anios}a ${meses}m ${dias}d (${calc.antiguedadEnAnios.toFixed(4)} años)`, bodySize, 'normal');
    addText(`Motivo Baja: ${inputs.motivoBaja.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`, bodySize, 'normal');
    addText(`Total Bruto: ${formatCurrency(totalBruto)}`, bodySize, 'bold');
    addText(`ISR Estimado: ${formatCurrency(calculoISR.isrTotalRetener)}`, bodySize, 'normal');
    addText(`Neto Estimado: ${formatCurrency(totalNeto)}`, bodySize, 'bold', 'left', 4); addLine(3);

    addText('Datos de Entrada', headerSize, 'bold', 'left', 2);
    addText(`Ingreso: ${formatDate(inputs.fechaIngreso)} | Baja: ${formatDate(inputs.fechaBaja)}`, bodySize, 'normal');
    addText(`SD: ${formatCurrency(calc.SD)} | SDI: ${formatCurrency(calc.SDI)} (${calc.fuenteSDI})`, bodySize, 'normal');
    addText(`Aguinaldo: ${inputs.diasAguinaldo} días | Vacaciones Pend.: ${inputs.saldoVacaciones} días`, bodySize, 'normal', 'left', 4); addLine(3);

    addText('A. Finiquito (Bruto)', headerSize, 'bold', 'left', 2);
    addText(`Aguinaldo Prop.: ${formatCurrency(finiquito.aguinaldo.monto)} (Art. 87 LFT)`, bodySize, 'normal');
    addText(`Vacaciones (Saldo+Prop): ${formatCurrency(finiquito.vacaciones.monto)} (Art. 76/79 LFT)`, bodySize, 'normal');
    addText(`Prima Vacacional (25%): ${formatCurrency(finiquito.primaVacacional.monto)} (Art. 80 LFT)`, bodySize, 'normal');
    addText(`Subtotal Finiquito: ${formatCurrency(totalFiniquito)}`, bodySize, 'bold', 'left', 4); addLine(3);

    addText('B. Liquidación (Bruto)', headerSize, 'bold', 'left', 2);
    addText(`Indemnización Const.: ${formatCurrency(liquidacion.indemnizacion90dias.monto)} (${inputs.motivoBaja === 'incapacidad_trabajador' ? 'Art. 54 LFT' : 'Art. 50/436 LFT'})`, bodySize, 'normal');
    const salarioMinimo = inputs.esZonaFronteriza ? SALARIO_MINIMO_FRONTERA_2025 : SALARIO_MINIMO_GENERAL_2025; const topeSalarial = salarioMinimo * 2; const basePrimaAntiguedad = Math.min(calc.SD, topeSalarial);
    addText(`Prima Antigüedad: ${formatCurrency(liquidacion.primaAntiguedad.monto)} (Base: ${formatCurrency(basePrimaAntiguedad)}, Art. 162 LFT)`, bodySize, 'normal');
    addText(`20 Días x Año: ${formatCurrency(liquidacion.veinteDiasPorAnio.monto)} (${inputs.motivoBaja === 'rescisión_trabajador' ? 'Aplica Art. 52 LFT' : 'No aplica'})`, bodySize, 'normal');
    addText(`Subtotal Liquidación: ${formatCurrency(totalLiquidacion)}`, bodySize, 'bold', 'left', 4); addLine(3);

    addText('C. Cálculo ISR Estimado', headerSize, 'bold', 'left', 2);
    addText(`Exenciones (Art. 93 LISR): Aguinaldo: ${formatCurrency(calculoISR.montoExentoAG)}, PV: ${formatCurrency(calculoISR.montoExentoPV)}, Indemn.: ${formatCurrency(calculoISR.montoExentoIND)}`, smallSize, 'normal');
    addText(`Bases Gravables: Ordinaria (BGO): ${formatCurrency(calculoISR.BGO)}, Separación (BGS): ${formatCurrency(calculoISR.BGS)}`, smallSize, 'normal');
    addText(`Procedimiento: ${calculoISR.procedimientoAplicado}`, smallSize, 'normal');
    if (calculoISR.BGS > calculoISR.USMO) addText(`Tasa Efectiva: ${(calculoISR.tasaEfectiva * 100).toFixed(4)}% (Basada en USMO ${formatCurrency(calculoISR.USMO)})`, smallSize, 'normal');
    addText(`ISR Total Retenido: ${formatCurrency(calculoISR.isrTotalRetener)}`, bodySize, 'bold', 'left', 4); addLine(3);

    addText('Resultado Final Estimado', headerSize, 'bold', 'left', 2);
    addText(`Total Bruto: ${formatCurrency(totalBruto)}`, bodySize, 'normal');
    addText(`(-) ISR Retenido: ${formatCurrency(calculoISR.isrTotalRetener)}`, bodySize, 'normal');
    addText(`(=) Pago Neto Estimado: ${formatCurrency(totalNeto)}`, bodySize, 'bold', 'left', 5);

    addText('Disclaimer: Cálculo orientativo BRUTO antes de impuestos...', smallSize, 'normal', 'center'); // Acortado y centrado

    doc.save(`Reporte_Liquidacion_${inputs.fechaBaja.toISOString().split('T')[0]}.pdf`);
}

// Función auxiliar para descargar archivos
function descargarArchivo(contenido, nombreArchivo, tipoContenido) {
    const link = document.createElement('a');
    const file = new Blob([contenido], { type: tipoContenido });
    link.href = URL.createObjectURL(file);
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// Importar jsPDF