// --- VALORES CONSTANTES Y LEGALES (Actualizar anualmente) ---
const SALARIO_MINIMO_GENERAL_2025 = 278.80;
const SALARIO_MINIMO_FRONTERA_2025 = 419.88;
const UMA_DIARIA_2025 = 113.14;
const UMA_MENSUAL_2025 = UMA_DIARIA_2025 * 30.4;
const SPE_LIMITE_2025 = 10171.00;
const SPE_MONTO_2025 = 474.64;

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

// --- URLs de Referencia Legal ---
const URLS_LEGALES = {
    LFT_BASE: "https://mexico.justia.com/federales/leyes/ley-federal-del-trabajo/titulo-",
    LISR_BASE: "https://mexico.justia.com/federales/leyes/ley-del-impuesto-sobre-la-renta/titulo-iv/",
    ART_47: "segundo/capitulo-iv/#articulo-47", ART_48: "segundo/capitulo-iv/#articulo-48", ART_50: "segundo/capitulo-iv/#articulo-50", ART_51: "segundo/capitulo-iv/#articulo-51", ART_52: "segundo/capitulo-iv/#articulo-52", ART_54: "segundo/capitulo-iv/#articulo-54", ART_76: "tercero/capitulo-iv/#articulo-76", ART_79: "tercero/capitulo-iv/#articulo-79", ART_80: "tercero/capitulo-iv/#articulo-80", ART_87: "tercero/capitulo-v/#articulo-87", ART_162: "cuarto/capitulo-iv/#articulo-162", ART_436: "septimo/capitulo-viii/#articulo-436", ART_89: "tercero/capitulo-vi/#articulo-89", ART_82: "tercero/capitulo-vi/#articulo-82", ART_123_CONST: "https://mexico.justia.com/federales/constitucion-politica-de-los-estados-unidos-mexicanos/titulo-sexto/capitulo-i/#articulo-123", LISR_93: "capitulo-i/#articulo-93", LISR_96: "capitulo-i/#articulo-96", RLISR_174: "https://mexico.justia.com/federales/reglamentos/reglamento-de-la-ley-del-impuesto-sobre-la-renta/titulo-iv/capitulo-i/#articulo-174"
};

// --- LÓGICA PRINCIPAL DE LA CALCULADORA ---
document.addEventListener('DOMContentLoaded', () => {
    
    document.getElementById('fechaBaja').value = new Date().toISOString().split('T')[0];
    
    const form = document.getElementById('calculator-form');
    const btnJsonSimple = document.getElementById('download-json-simple');
    const btnJsonDetailed = document.getElementById('download-json-detailed');
    const btnPdfSimple = document.getElementById('download-pdf-simple');
    const btnPdfDetailed = document.getElementById('download-pdf-detailed');
    let reporteParaDescargar = null;

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        // Obtener días de trabajo seleccionados
        const diasTrabajoCheckboxes = document.querySelectorAll('input[name="diasTrabajo"]:checked');
        const diasTrabajo = Array.from(diasTrabajoCheckboxes).map(cb => parseInt(cb.value, 10));

        const inputs = {
            fechaIngreso: new Date(document.getElementById('fechaIngreso').value + 'T00:00:00'),
            fechaBaja: new Date(document.getElementById('fechaBaja').value + 'T00:00:00'),
            fechaUltimoPago: new Date(document.getElementById('fechaUltimoPago').value + 'T00:00:00'),
            diasTrabajo: diasTrabajo, // Array de números [1, 2, 3, 4, 5]
            ingresoUltimoMes: parseFloat(document.getElementById('ingresoUltimoMes').value),
            sdiManual: parseFloat(document.getElementById('sdiManual').value),
            diasAguinaldo: parseInt(document.getElementById('diasAguinaldo').value),
            saldoVacaciones: parseInt(document.getElementById('saldoVacaciones').value),
            motivoBaja: document.getElementById('motivoBaja').value,
            esZonaFronteriza: document.querySelector('input[name="zona_salarial"]:checked').value === 'frontera'
        };

        const esSalarioValido = (!isNaN(inputs.ingresoUltimoMes) && inputs.ingresoUltimoMes > 0) || (!isNaN(inputs.sdiManual) && inputs.sdiManual > 0);
        if (inputs.fechaBaja < inputs.fechaIngreso || !esSalarioValido || !inputs.fechaUltimoPago) {
            alert("Por favor, revise que todos los datos sean correctos. Las fechas deben ser válidas y debe ingresar un valor de salario (Bruto o SDI).");
            return;
        }

        try { 
            const calc = calcularVariablesBase(inputs);
            const salariosDevengados = calcularSalariosDevengados(inputs, calc); // Calcular salarios adeudados
            const finiquito = calcularFiniquito(calc, inputs);
            const liquidacion = calcularLiquidacion(calc, inputs);
            const calculoISR = calcularISR({ calc, inputs, finiquito, liquidacion, salariosDevengados });

            const totalFiniquito = salariosDevengados.monto + finiquito.aguinaldo.monto + finiquito.vacaciones.monto + finiquito.primaVacacional.monto; // Sumar salarios
            const totalLiquidacion = liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto;
            const totalBruto = totalFiniquito + totalLiquidacion;
            const totalNeto = totalBruto - calculoISR.isrTotalRetener;

            reporteParaDescargar = { inputs, calc, salariosDevengados, finiquito, liquidacion, totalFiniquito, totalLiquidacion, totalBruto, calculoISR, totalNeto };
            
            displayResults(reporteParaDescargar);
            
            btnJsonSimple.style.display = 'inline-block';
            btnJsonDetailed.style.display = 'inline-block';
            btnPdfSimple.style.display = 'inline-block';
            btnPdfDetailed.style.display = 'inline-block';

        } catch (error) {
            console.error("Error en el cálculo:", error);
            alert(`Ocurrió un error al calcular: ${error.message}. Verifique los datos ingresados.`);
             document.getElementById('results-container').classList.add('hidden');
             btnJsonSimple.style.display = 'none'; btnJsonDetailed.style.display = 'none';
             btnPdfSimple.style.display = 'none'; btnPdfDetailed.style.display = 'none';
        }
    });

    // --- LÓGICA DE LOS 4 BOTONES DE DESCARGA ---
    btnJsonSimple.addEventListener('click', () => handleDownload('json', false));
    btnJsonDetailed.addEventListener('click', () => handleDownload('json', true));
    btnPdfSimple.addEventListener('click', () => handleDownload('pdf', false));
    btnPdfDetailed.addEventListener('click', () => handleDownload('pdf', true));

    function handleDownload(format, detailed) {
        if (!reporteParaDescargar) {
            alert("Primero debe realizar un cálculo.");
            return;
        }
        const fileNameBase = `calculo_laboral_${reporteParaDescargar.inputs.fechaBaja.toISOString().split('T')[0]}`;
        
        if (format === 'json') {
            const jsonData = detailed ? generarReporteJSONDetallado(reporteParaDescargar) : generarReporteJSONSimple(reporteParaDescargar);
            const jsonString = JSON.stringify(jsonData, null, 2);
            descargarArchivo(jsonString, `${fileNameBase}_${detailed ? 'detallado' : 'simple'}.json`, 'application/json');
        } else if (format === 'pdf') {
            if (detailed) {
                generarPDFDetallado(reporteParaDescargar, `${fileNameBase}_detallado.pdf`);
            } else {
                generarPDFSimple(reporteParaDescargar, `${fileNameBase}_simple.pdf`);
            }
        }
    }
});


// --- FUNCIONES DE CÁLCULO BASE (LFT) ---
function calcularVariablesBase(inputs) {
    const antiguedadEnMs = inputs.fechaBaja - inputs.fechaIngreso;
     if (antiguedadEnMs < 0) { throw new Error("Fechas inválidas"); }
    const antiguedadEnAnios = antiguedadEnMs / (1000 * 60 * 60 * 24 * 365.25);
    const antiguedadAniosCompletos = Math.floor(antiguedadEnAnios);
    const diasVacacionesPorLey = getDiasVacacionesPorLey(antiguedadAniosCompletos + 1);
    
    let SD = 0, SDI = 0, fuenteSDI = '';

    if (!isNaN(inputs.sdiManual) && inputs.sdiManual > 0) {
        SDI = inputs.sdiManual;
        fuenteSDI = "Ingresado manualmente por el usuario";
        const factorIntegracionExacto = 1 + (inputs.diasAguinaldo / 365) + (diasVacacionesPorLey * 0.25 / 365);
        if (factorIntegracionExacto > 0) {
             SD = SDI / factorIntegracionExacto;
        } else {
             SD = SDI; 
        }
    } else if (!isNaN(inputs.ingresoUltimoMes) && inputs.ingresoUltimoMes > 0) {
        SD = inputs.ingresoUltimoMes / 30;
        const parteDiariaAguinaldo = (SD * inputs.diasAguinaldo) / 365;
        const parteDiariaPrimaVacacional = (SD * diasVacacionesPorLey * 0.25 / 365);
        SDI = SD + parteDiariaAguinaldo + parteDiariaPrimaVacacional;
        fuenteSDI = "Autocalculado a partir de ingresos brutos";
    } else {
        throw new Error("No se proporcionó información salarial válida.");
    }
    const USMO = SD * 30;
    return { antiguedadEnAnios, antiguedadAniosCompletos, diasVacacionesPorLey, SD, SDI, fuenteSDI, USMO };
 }

function calcularSalariosDevengados(inputs, calc) {
    let diasDevengados = 0;
    const diasTrabajoSet = new Set(inputs.diasTrabajo);
    let currentDate = new Date(inputs.fechaUltimoPago.getTime() + (1000 * 60 * 60 * 24)); // Empezar el día SIGUIENTE al último pago

    // Iterar día por día hasta el día ANTERIOR a la baja
    while (currentDate < inputs.fechaBaja) {
        const dayOfWeek = currentDate.getDay(); // Domingo = 0, Lunes = 1, ... Sábado = 6
        if (diasTrabajoSet.has(dayOfWeek)) {
            diasDevengados++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const monto = diasDevengados * calc.SD;
    return { monto, dias: diasDevengados };
}

function calcularFiniquito(calc, inputs) { 
    const inicioDelAnio = new Date(inputs.fechaBaja.getFullYear(), 0, 1);
    const diasTrabajadosEnElAnio = Math.max(0, Math.floor((inputs.fechaBaja - inicioDelAnio) / (1000 * 60 * 60 * 24)) + 1);
    const aguinaldoProporcional = (calc.SD * inputs.diasAguinaldo / 365) * diasTrabajadosEnElAnio;
    const aniversarioEsteAnio = new Date(inputs.fechaBaja.getFullYear(), inputs.fechaIngreso.getMonth(), inputs.fechaIngreso.getDate());
    let ultimoAniversario = aniversarioEsteAnio <= inputs.fechaBaja ? aniversarioEsteAnio : new Date(inputs.fechaBaja.getFullYear() - 1, inputs.fechaIngreso.getMonth(), inputs.fechaIngreso.getDate());
     if (ultimoAniversario > inputs.fechaBaja) { ultimoAniversario = new Date(inputs.fechaBaja.getFullYear() - 1, inputs.fechaIngreso.getMonth(), inputs.fechaIngreso.getDate()); }
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
            indemnizacion90dias = calc.SD * 30;
            primaAntiguedad = calcularPrimaAntiguedad(calc.SD, calc.antiguedadEnAnios, inputs.esZonaFronteriza);
            break;
    }
    return { indemnizacion90dias: { monto: indemnizacion90dias }, primaAntiguedad: { monto: primaAntiguedad }, veinteDiasPorAnio: { monto: veinteDiasPorAnio } };
}
function calcularPrimaAntiguedad(SD, antiguedadEnAnios, esZonaFronteriza) {
    const salarioMinimo = esZonaFronteriza ? SALARIO_MINIMO_FRONTERA_2025 : SALARIO_MINIMO_GENERAL_2025;
    const topeSalarial = salarioMinimo * 2;
    const baseCalculo = Math.min(SD, topeSalarial);
    return baseCalculo * 12 * antiguedadEnAnios;
 }
function getDiasVacacionesPorLey(aniosCompletos) {
    if (aniosCompletos <= 1) return 12; if (aniosCompletos === 2) return 14; if (aniosCompletos === 3) return 16; if (aniosCompletos === 4) return 18; if (aniosCompletos === 5) return 20; if (aniosCompletos >= 6 && aniosCompletos <= 10) return 22; if (aniosCompletos >= 11 && aniosCompletos <= 15) return 24; if (aniosCompletos >= 16 && aniosCompletos <= 20) return 26; if (aniosCompletos >= 21 && aniosCompletos <= 25) return 28; if (aniosCompletos >= 26 && aniosCompletos <= 30) return 30; if (aniosCompletos >= 31) return 32; return 12;
 }

function calcularISR(data) {
    const { calc, inputs, finiquito, liquidacion, salariosDevengados } = data; // Añadir salariosDevengados
    const limiteExentoAG = 30 * UMA_DIARIA_2025; const montoExentoAG = Math.min(finiquito.aguinaldo.monto, limiteExentoAG); const montoGravadoAG = finiquito.aguinaldo.monto - montoExentoAG;
    const limiteExentoPV = 15 * UMA_DIARIA_2025; const montoExentoPV = Math.min(finiquito.primaVacacional.monto, limiteExentoPV); const montoGravadoPV = finiquito.primaVacacional.monto - montoExentoPV;
    const montoTotalIndemnizatorio = liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto;
    let aniosComputablesISR = calc.antiguedadAniosCompletos; if ((calc.antiguedadEnAnios - calc.antiguedadAniosCompletos) > 0.5) aniosComputablesISR += 1;
    const limiteExentoIND = 90 * UMA_DIARIA_2025 * aniosComputablesISR; const montoExentoIND = Math.min(montoTotalIndemnizatorio, limiteExentoIND); const montoGravadoIND = montoTotalIndemnizatorio - montoExentoIND;
    
    // BGO: Sumar salarios devengados (100% gravables)
    const BGO = montoGravadoAG + montoGravadoPV + finiquito.vacaciones.monto + salariosDevengados.monto; 
    const BGS = montoGravadoIND; 
    const USMO = calc.USMO;
    
    let isrTotalRetener = 0, isrOrdNeto = 0, isrSeparacion = 0, tasaEfectiva = 0, procedimientoAplicado = "";
    if (montoTotalIndemnizatorio <= 0 || BGS <= 0) {
         procedimientoAplicado = "Regular (Solo Finiquito)"; const isrBruto = aplicarTarifaISR(BGO); const speAplicable = aplicarSPE(BGO); isrTotalRetener = Math.max(0, isrBruto - speAplicable);
    } else if (BGS <= USMO) {
        procedimientoAplicado = "Regular Unificado (BGS <= USMO)"; const baseTotalMes = BGO + BGS; const isrBruto = aplicarTarifaISR(baseTotalMes); const speAplicable = aplicarSPE(baseTotalMes); isrTotalRetener = Math.max(0, isrBruto - speAplicable);
    } else {
        procedimientoAplicado = "Especial Tasa Efectiva (BGS > USMO)"; const isrOrdBruto = aplicarTarifaISR(BGO); const speAplicableOrd = aplicarSPE(BGO); isrOrdNeto = Math.max(0, isrOrdBruto - speAplicableOrd);
        const isrDelUSMO = aplicarTarifaISR(USMO); tasaEfectiva = (USMO > 0) ? isrDelUSMO / USMO : 0; isrSeparacion = BGS * tasaEfectiva; isrTotalRetener = isrOrdNeto + isrSeparacion;
    }
    return { montoExentoAG, montoGravadoAG, limiteExentoAG, montoExentoPV, montoGravadoPV, limiteExentoPV, montoExentoIND, montoGravadoIND, limiteExentoIND, aniosComputablesISR, BGO, BGS, USMO, procedimientoAplicado, tasaEfectiva, isrOrdNeto, isrSeparacion, isrTotalRetener: isrTotalRetener || 0 };
}
function aplicarTarifaISR(baseGravable) {
    let isrCausado = 0;
    for (const rango of TARIFA_ISR_MENSUAL_2025) { if (baseGravable >= rango.limiteInferior && (baseGravable <= rango.limiteSuperior || rango.limiteSuperior === Infinity)) { const excedente = baseGravable - rango.limiteInferior; isrCausado = rango.cuotaFija + (excedente * (rango.porcentajeExcedente / 100)); break; } }
    return isrCausado;
}
function aplicarSPE(ingresoGravableMensual) {
    return (ingresoGravableMensual <= SPE_LIMITE_2025) ? SPE_MONTO_2025 : 0;
}


// --- FUNCIONES DE VISUALIZACIÓN ---
function displayResults(data) {
    const { finiquito, totalFiniquito, liquidacion, totalLiquidacion, totalBruto, totalNeto, salariosDevengados } = data;
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    
    // Llenar resultados principales (secciones A y B)
    document.getElementById('res-salarios-devengados').textContent = formatCurrency(salariosDevengados.monto); // Nuevo
    document.getElementById('dias-devengados').textContent = salariosDevengados.dias; // Nuevo
    document.getElementById('res-aguinaldo').textContent = formatCurrency(finiquito.aguinaldo.monto);
    document.getElementById('res-vacaciones').textContent = formatCurrency(finiquito.vacaciones.monto);
    document.getElementById('res-prima-vacacional').textContent = formatCurrency(finiquito.primaVacacional.monto);
    document.getElementById('res-total-finiquito').textContent = formatCurrency(totalFiniquito);
    document.getElementById('res-indemnizacion').textContent = formatCurrency(liquidacion.indemnizacion90dias.monto);
    document.getElementById('res-prima-antiguedad').textContent = formatCurrency(liquidacion.primaAntiguedad.monto);
    document.getElementById('res-20-dias').textContent = formatCurrency(liquidacion.veinteDiasPorAnio.monto);
    document.getElementById('res-total-liquidacion').textContent = formatCurrency(totalLiquidacion);
    
    // Llenar resumen final (en la caja azul)
    document.getElementById('res-total-bruto').textContent = formatCurrency(totalBruto);
    document.getElementById('res-isr-retenido-final').textContent = formatCurrency(data.calculoISR.isrTotalRetener);
    document.getElementById('res-total-neto').textContent = formatCurrency(totalNeto); 

    fillDetails(data);
    fillIsrDetails(data);

    document.getElementById('results-container').classList.remove('hidden');
    document.getElementById('isr-details-container').classList.remove('hidden');
}

function fillDetails(data) {
    const { finiquito, liquidacion, inputs, calc, salariosDevengados } = data; // Añadir salariosDevengados
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const { antiguedadEnAnios, SD, SDI } = calc;
    const anios = Math.floor(antiguedadEnAnios);
    const meses = Math.floor((antiguedadEnAnios * 12) % 12);
    const dias = Math.floor((antiguedadEnAnios * 365.25) - (anios * 365.25) - (meses * 30.4375));
    document.getElementById('res-summary-text').textContent = `Cálculo para una antigüedad de ${anios} años, ${meses} meses y ${dias} días.`;

    // Llenar detalle de salarios devengados
    document.getElementById('det-salarios-devengados').innerHTML = `
        <b>Explicación:</b> Pago de los días laborados entre el último corte de pago (${inputs.fechaUltimoPago.toLocaleDateString('es-MX')}) y la fecha de baja.<br>
        <b>Fundamento:</b> <a href="${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_82}" target="_blank">Art. 82, LFT</a>.<br>
        <b>ISR:</b> 100% Gravable (como salario ordinario).<br>
        <b>Fórmula:</b> Salario Diario (SD) x Días Devengados.<br>
        <b>Cálculo:</b> ${formatCurrency(SD)} x ${salariosDevengados.dias} días = ${formatCurrency(salariosDevengados.monto)}`;

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

    document.querySelector('.disclaimer').innerHTML = `
        <strong>Aviso Legal:</strong> Este cálculo es una estimación con fines orientativos, basada en los datos proporcionados y en la legislación vigente a la fecha de consulta (2025). Este resultado no constituye asesoría legal ni reemplaza la consulta con un profesional. Para la defensa y reclamación formal de sus derechos laborales, acuda a la Procuraduría Federal de la Defensa del Trabajo (PROFEDET) para recibir asesoría gratuita y personalizada.<br><small>Herramienta desarrollada por <a href="https://github.com/brianerbes/calculadora-laboral-mx" target="_blank">https://github.com/brianerbes/calculadora-laboral-mx</a></small>
    `;
}

function fillIsrDetails(data) {
    const { calculoISR, salariosDevengados, finiquito } = data;
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    
    let isrContent = `
        <p style="font-size: 14px; margin-bottom: 15px;">El cálculo del ISR sobre pagos por separación sigue reglas especiales (<a href="${URLS_LEGALES.LISR_BASE}${URLS_LEGALES.LISR_96}" target="_blank">Art. 96 LISR</a>, <a href="${URLS_LEGALES.RLISR_174}" target="_blank">Art. 174 RLISR</a>). Se separan los ingresos ordinarios (finiquito) de las indemnizaciones (liquidación).</p>
        
        <h4>1. Cálculo de Partes Exentas (<a href="${URLS_LEGALES.LISR_BASE}${URLS_LEGALES.LISR_93}" target="_blank">Art. 93 LISR</a>)</h4>
        <ul style="font-size: 14px; list-style-position: inside; padding-left: 0;">
            <li><b>Aguinaldo:</b> Exento hasta 30 UMAs (${formatCurrency(calculoISR.limiteExentoAG)}). Monto Exento: <b>${formatCurrency(calculoISR.montoExentoAG)}</b>.</li>
            <li><b>Prima Vacacional:</b> Exenta hasta 15 UMAs (${formatCurrency(calculoISR.limiteExentoPV)}). Monto Exento: <b>${formatCurrency(calculoISR.montoExentoPV)}</b>.</li>
            <li><b>Indemnizaciones:</b> Exentas hasta 90 UMAs/Año (${calculoISR.aniosComputablesISR} años). Límite Global: ${formatCurrency(calculoISR.limiteExentoIND)}. Monto Exento Total: <b>${formatCurrency(calculoISR.montoExentoIND)}</b>.</li>
            <li><b>Salarios Devengados y Vacaciones:</b> 100% Gravables.</li>
        </ul>

        <h4>2. Determinación de Bases Gravables</h4>
        <ul style="font-size: 14px; list-style-position: inside; padding-left: 0;">
            <li><b>Base Gravable Ordinaria (BGO):</b> ${formatCurrency(calculoISR.BGO)} <small>(Suma de Salarios Devengados, Vacaciones y partes gravadas de Aguinaldo y P. Vacacional)</small>.</li>
            <li><b>Base Gravable por Separación (BGS):</b> ${formatCurrency(calculoISR.BGS)} <small>(Parte gravada de las Indemnizaciones)</small>.</li>
        </ul>

        <h4>3. Aplicación del Algoritmo de Retención</h4>
         <ul style="font-size: 14px; list-style-position: inside; padding-left: 0;">
            <li>Procedimiento Aplicado: <b>${calculoISR.procedimientoAplicado}</b>.</li>
            <li>Último Sueldo Mensual Ordinario (USMO Estimado): ${formatCurrency(calculoISR.USMO)}.</li>
    `;

    if (calculoISR.BGS > calculoISR.USMO) { 
        isrContent += `
            <li>Tasa Efectiva Aplicada: <b>${(calculoISR.tasaEfectiva * 100).toFixed(4)}%</b> <small>(Basada en ISR del USMO sin SPE)</small>.</li>
            <li>ISR Ordinario Neto (sobre BGO): ${formatCurrency(calculoISR.isrOrdNeto)}.</li>
            <li>ISR por Separación (BGS x Tasa): ${formatCurrency(calculoISR.isrSeparacion)}.</li>
        `;
    }
     isrContent += `</ul>`; 

    document.getElementById('isr-details-content').innerHTML = isrContent;
    document.getElementById('res-isr-total').textContent = formatCurrency(calculoISR.isrTotalRetener);
}


// --- FUNCIONES PARA GENERAR REPORTES (JSON y PDF) ---
function generarReporteJSONSimple(data) {
    const { inputs, calc, salariosDevengados, totalFiniquito, totalLiquidacion, totalBruto, calculoISR, totalNeto } = data;
    const anios = Math.floor(calc.antiguedadEnAnios); const meses = Math.floor((calc.antiguedadEnAnios * 12) % 12); const dias = Math.floor((calc.antiguedadEnAnios * 365.25) - (anios * 365.25) - (meses * 30.4375));
    return {
        info_reporte: { version_calculadora: "v8.0 (Salarios Devengados)", fecha_generacion: new Date().toISOString() },
        resumen: {
            motivo_baja: inputs.motivoBaja.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            antiguedad: `${anios}a ${meses}m ${dias}d`,
            fecha_ingreso: inputs.fechaIngreso.toISOString().split('T')[0],
            fecha_baja: inputs.fechaBaja.toISOString().split('T')[0],
            sd_calculado: parseFloat(calc.SD.toFixed(2)),
            sdi_calculado: parseFloat(calc.SDI.toFixed(2)),
            total_finiquito_bruto: parseFloat(totalFiniquito.toFixed(2)),
            total_liquidacion_bruta: parseFloat(totalLiquidacion.toFixed(2)),
            total_bruto: parseFloat(totalBruto.toFixed(2)),
            isr_retenido_estimado: parseFloat(calculoISR.isrTotalRetener.toFixed(2)),
            pago_neto_estimado: parseFloat(totalNeto.toFixed(2))
        }
    };
}
function generarReporteJSONDetallado(data) {
    const { inputs, calc, salariosDevengados, finiquito, liquidacion, totalFiniquito, totalLiquidacion, totalBruto, calculoISR, totalNeto } = data;
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const salarioMinimo = inputs.esZonaFronteriza ? SALARIO_MINIMO_FRONTERA_2025 : SALARIO_MINIMO_GENERAL_2025; const topeSalarial = salarioMinimo * 2; const basePrimaAntiguedad = Math.min(calc.SD, topeSalarial);
    const anios = Math.floor(calc.antiguedadEnAnios); const meses = Math.floor((calc.antiguedadEnAnios * 12) % 12); const dias = Math.floor((calc.antiguedadEnAnios * 365.25) - (anios * 365.25) - (meses * 30.4375));
    
    const addUrl = (key) => {
        let cleanKey = key.replace(/ /g, "_").replace(/\./g, "").toUpperCase();
        let url = URLS_LEGALES[cleanKey] || `${URLS_LEGALES.LFT_BASE}${URLS_LEGALES[key.split(' ')[0].toUpperCase()]}` || '';
        if (key === "Art. 123 CONST") url = URLS_LEGALES.ART_123_CONST;
        if (key.startsWith("Art. 93 LISR")) url = `${URLS_LEGALES.LISR_BASE}${URLS_LEGALES.LISR_93}`;
        if (key.startsWith("Art. 96 LISR")) url = `${URLS_LEGALES.LISR_BASE}${URLS_LEGALES.LISR_96}`;
        if (key.startsWith("Art. 174 RLISR")) url = URLS_LEGALES.RLISR_174;
        return { texto: key, url: url };
    };

    const reporte = {
        info_reporte: { version_calculadora: "v8.0 (Salarios Devengados)", fecha_generacion: new Date().toISOString(), marco_legal: "LFT y LISR, México (Vigente a 2025)" },
        evaluacion_legal_escenario: { escenario_seleccionado: inputs.motivoBaja.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), pago_aplicable: totalLiquidacion > 0 ? "Liquidación Completa + Finiquito" : "Finiquito" },
        datos_de_entrada: { fecha_ingreso: inputs.fechaIngreso.toISOString().split('T')[0], fecha_baja: inputs.fechaBaja.toISOString().split('T')[0], fecha_ultimo_pago: inputs.fechaUltimoPago.toISOString().split('T')[0], dias_laborales: inputs.diasTrabajo.join(','), ingreso_bruto_ultimos_30_dias: !isNaN(inputs.ingresoUltimoMes) ? inputs.ingresoUltimoMes : null, sdi_manual_ingresado: !isNaN(inputs.sdiManual) ? inputs.sdiManual : 'No ingresado', dias_aguinaldo_anual: inputs.diasAguinaldo, saldo_vacaciones_previas: inputs.saldoVacaciones, es_zona_fronteriza: inputs.esZonaFronteriza },
        calculos_base: { antiguedad: { anios_decimal: parseFloat(calc.antiguedadEnAnios.toFixed(4)), desglose: `${anios} años, ${meses} meses y ${dias} días` }, salario_diario_sd: { valor: parseFloat(calc.SD.toFixed(2)), fuente: calc.fuenteSDI === 'Ingresado manualmente por el usuario' ? "Estimación inversa" : "Promedio ingresos brutos" }, salario_diario_integrado_sdi: { valor: parseFloat(calc.SDI.toFixed(2)), fuente: calc.fuenteSDI }, vacaciones_anuales_por_ley: { dias: calc.diasVacacionesPorLey } },
        desglose_bruto: {
            finiquito: {
                componentes: [
                    { concepto: "Salarios Devengados", monto_bruto: parseFloat(salariosDevengados.monto.toFixed(2)), fundamento_legal: addUrl("ART_82 LFT"), isr: { exento: 0.00, gravado: parseFloat(salariosDevengados.monto.toFixed(2)) }, calculo_especifico: `${formatCurrency(calc.SD)} x ${salariosDevengados.dias} días` },
                    { concepto: "Aguinaldo Proporcional", monto_bruto: parseFloat(finiquito.aguinaldo.monto.toFixed(2)), fundamento_legal: addUrl("Art. 87 LFT"), isr: { exento: parseFloat(calculoISR.montoExentoAG.toFixed(2)), gravado: parseFloat(calculoISR.montoGravadoAG.toFixed(2)) }, calculo_especifico: `((${formatCurrency(calc.SD)} x ${inputs.diasAguinaldo}) / 365) x ${finiquito.aguinaldo.diasTrabajados} días` }, 
                    { concepto: "Vacaciones (Saldo + Proporcional)", monto_bruto: parseFloat(finiquito.vacaciones.monto.toFixed(2)), fundamento_legal: addUrl("Art. 76 LFT"), isr: { exento: 0.00, gravado: parseFloat(finiquito.vacaciones.monto.toFixed(2)) }, calculo_especifico: `(${inputs.saldoVacaciones} saldo + ${finiquito.vacaciones.proporcionales.toFixed(2)} proporcionales) x ${formatCurrency(calc.SD)}` }, 
                    { concepto: "Prima Vacacional (25%)", monto_bruto: parseFloat(finiquito.primaVacacional.monto.toFixed(2)), fundamento_legal: addUrl("Art. 80 LFT"), isr: { exento: parseFloat(calculoISR.montoExentoPV.toFixed(2)), gravado: parseFloat(calculoISR.montoGravadoPV.toFixed(2)) }, calculo_especifico: `${formatCurrency(finiquito.vacaciones.monto)} x 0.25` } 
                ], total_finiquito_bruto: parseFloat(totalFiniquito.toFixed(2))
            },
            liquidacion: {
                componentes: [ { concepto: "Indemnización Constitucional", monto_bruto: parseFloat(liquidacion.indemnizacion90dias.monto.toFixed(2)), fundamento_legal: addUrl(inputs.motivoBaja === 'incapacidad_trabajador' ? "Art. 54 LFT" : "Art. 123 CONST"), isr: { exento: parseFloat(Math.max(0, liquidacion.indemnizacion90dias.monto - ((liquidacion.indemnizacion90dias.monto / (liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto || 1)) * calculoISR.montoGravadoIND || 0)).toFixed(2)), gravado: parseFloat(((liquidacion.indemnizacion90dias.monto / (liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto || 1)) * calculoISR.montoGravadoIND || 0)).toFixed(2) }, calculo_especifico: inputs.motivoBaja === 'incapacidad_trabajador' ? `${formatCurrency(calc.SD)} x 30` : `${formatCurrency(calc.SDI)} x 90` }, { concepto: "Prima de Antigüedad (12 días por año)", monto_bruto: parseFloat(liquidacion.primaAntiguedad.monto.toFixed(2)), fundamento_legal: addUrl("Art. 162 LFT"), isr: { exento: parseFloat(Math.max(0, liquidacion.primaAntiguedad.monto - ((liquidacion.primaAntiguedad.monto / (liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto || 1)) * calculoISR.montoGravadoIND || 0)).toFixed(2)), gravado: parseFloat(((liquidacion.primaAntiguedad.monto / (liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto || 1)) * calculoISR.montoGravadoIND || 0)).toFixed(2) }, calculo_especifico: `Base(${formatCurrency(basePrimaAntiguedad)}) x 12 x ${calc.antiguedadEnAnios.toFixed(3)} años` }, { concepto: "20 Días de Salario por Año", monto_bruto: parseFloat(liquidacion.veinteDiasPorAnio.monto.toFixed(2)), fundamento_legal: addUrl("Art. 52 LFT"), isr: { exento: parseFloat(Math.max(0, liquidacion.veinteDiasPorAnio.monto - ((liquidacion.veinteDiasPorAnio.monto / (liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto || 1)) * calculoISR.montoGravadoIND || 0)).toFixed(2)), gravado: parseFloat(((liquidacion.veinteDiasPorAnio.monto / (liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto || 1)) * calculoISR.montoGravadoIND || 0)).toFixed(2) }, calculo_especifico: inputs.motivoBaja === 'rescisión_trabajador' ? `${formatCurrency(calc.SDI)} x 20 x ${calc.antiguedadEnAnios.toFixed(3)} años` : "N/A" } ], total_liquidacion_bruta: parseFloat(totalLiquidacion.toFixed(2))
            }
        },
        calculo_isr_detallado: {
            fundamento_legal: addUrl("Art. 96 LISR"),
            exenciones_aplicadas: [ { concepto: "Aguinaldo", monto_exento: parseFloat(calculoISR.montoExentoAG.toFixed(2)), limite: `30 UMAs (${formatCurrency(calculoISR.limiteExentoAG)})`, fundamento: addUrl("Art. 93 LISR") }, { concepto: "Prima Vacacional", monto_exento: parseFloat(calculoISR.montoExentoPV.toFixed(2)), limite: `15 UMAs (${formatCurrency(calculoISR.limiteExentoPV)})`, fundamento: addUrl("Art. 93 LISR") }, { concepto: "Indemnizaciones", monto_exento_total: parseFloat(calculoISR.montoExentoIND.toFixed(2)), limite: `90 UMAs/Año (${calculoISR.aniosComputablesISR} años = ${formatCurrency(calculoISR.limiteExentoIND)})`, fundamento: addUrl("Art. 93 LISR") } ],
            bases_gravables: { ordinaria_bgo: parseFloat(calculoISR.BGO.toFixed(2)), separacion_bgs: parseFloat(calculoISR.BGS.toFixed(2)) },
            procedimiento_retencion: { tipo: calculoISR.procedimientoAplicado, usmo_estimado: parseFloat(calculoISR.USMO.toFixed(2)), tasa_efectiva_aplicada: calculoISR.BGS > calculoISR.USMO ? parseFloat((calculoISR.tasaEfectiva * 100).toFixed(4)) : null, isr_ordinario_neto: calculoISR.BGS > calculoISR.USMO ? parseFloat(calculoISR.isrOrdNeto.toFixed(2)) : null, isr_separacion: calculoISR.BGS > calculoISR.USMO ? parseFloat(calculoISR.isrSeparacion.toFixed(2)) : null, isr_total_a_retener: parseFloat(calculoISR.isrTotalRetener.toFixed(2)) }
        },
        resumen_neto: { total_bruto: formatCurrency(totalBruto), isr_retenido_estimado: formatCurrency(calculoISR.isrTotalRetener), pago_neto_estimado: formatCurrency(totalNeto), nota: "El ISR retenido es una estimación. El cálculo final puede variar ligeramente." }
    };
    return reporte;
}


// --- FUNCIONES PARA GENERAR PDF (SIMPLE Y DETALLADO) ---
// Importar jsPDF
const { jsPDF } = window.jspdf;

// PDF Simple: Resumen conciso en una página
function generarPDFSimple(data, fileName) {
    const { inputs, calc, salariosDevengados, totalFiniquito, totalLiquidacion, totalBruto, calculoISR, totalNeto } = data;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
    const margin = 15; const pageWidth = doc.internal.pageSize.getWidth(); const contentWidth = pageWidth - (margin * 2); let currentY = margin;
    const lineSpacing = 2.2; const sectionSpacing = 5; const titleSize = 15; const headerSize = 11; const bodySize = 9; const smallSize = 7.5;
    const addText = (text, size, weight, align = 'left', spacing = sectionSpacing) => { doc.setFontSize(size); doc.setFont('helvetica', weight); const splitText = doc.splitTextToSize(String(text), contentWidth); splitText.forEach(line => { doc.text(line, align === 'center' ? pageWidth / 2 : margin, currentY, { align: align }); currentY += size / lineSpacing; }); currentY += spacing; };
    const addLine = (spacing = 3) => { doc.setDrawColor(200, 200, 200); doc.line(margin, currentY, pageWidth - margin, currentY); currentY += spacing; }
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }); const formatDate = (date) => date.toLocaleDateString('es-MX', {day: '2-digit', month: '2-digit', year: 'numeric'});

    addText('Resumen de Cálculo Laboral Estimado', titleSize, 'bold', 'center', 5);
    addText(`Generado el: ${formatDate(new Date())}`, smallSize, 'normal', 'center', 8); addLine(4);

    const anios = Math.floor(calc.antiguedadEnAnios); const meses = Math.floor((calc.antiguedadEnAnios * 12) % 12); const dias = Math.floor((calc.antiguedadEnAnios * 365.25) - (anios * 365.25) - (meses * 30.4375));
    addText('Información General', headerSize, 'bold', 'left', 3);
    addText(`Antigüedad: ${anios}a ${meses}m ${dias}d`, bodySize, 'normal');
    addText(`Motivo Baja: ${inputs.motivoBaja.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`, bodySize, 'normal');
    addText(`Fecha Ingreso: ${formatDate(inputs.fechaIngreso)} | Fecha Baja: ${formatDate(inputs.fechaBaja)}`, bodySize, 'normal');
    addText(`SD Calculado: ${formatCurrency(calc.SD)} | SDI Calculado: ${formatCurrency(calc.SDI)}`, bodySize, 'normal', 'left', 6); addLine(4);

    addText('Resumen de Pagos Brutos', headerSize, 'bold', 'left', 3);
    addText(`Salarios Devengados (${salariosDevengados.dias} días): ${formatCurrency(salariosDevengados.monto)}`, bodySize+1, 'normal', 'left', 1);
    addText(`Subtotal Finiquito (Prestaciones): ${formatCurrency(totalFiniquito - salariosDevengados.monto)}`, bodySize+1, 'normal', 'left', 1);
    addText(`Subtotal Liquidación Bruta: ${formatCurrency(totalLiquidacion)}`, bodySize+1, 'normal', 'left', 3);
    addLine(4);
    addText(`Total Bruto Estimado: ${formatCurrency(totalBruto)}`, headerSize+1, 'bold');
    addText(`(-) ISR Retenido Estimado: ${formatCurrency(calculoISR.isrTotalRetener)}`, headerSize, 'normal');
    addText(`(=) Pago Neto Estimado: ${formatCurrency(totalNeto)}`, headerSize+2, 'bold', 'left', 10);

    // Disclaimer completo y con link
    addText('Aviso Legal: Este cálculo es una estimación con fines orientativos, basada en los datos proporcionados y en la legislación vigente a la fecha de consulta (2025). Este resultado no constituye asesoría legal ni reemplaza la consulta con un profesional. Para la defensa y reclamación formal de sus derechos laborales, acuda a la Procuraduría Federal de la Defensa del Trabajo (PROFEDET) para recibir asesoría gratuita y personalizada.', smallSize, 'normal', 'center', 1);
    addText('Herramienta desarrollada por: https://github.com/brianerbes/calculadora-laboral-mx', smallSize-1, 'normal', 'center');

    doc.save(fileName);
}

// PDF Detallado: Verboso y con explicaciones (puede tomar varias páginas)
function generarPDFDetallado(data, fileName) {
    const { inputs, calc, salariosDevengados, finiquito, liquidacion, totalFiniquito, totalLiquidacion, totalBruto, calculoISR, totalNeto } = data;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
    const margin = 15; const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;
    const lineSpacing = 3.5; const sectionSpacing = 6; const subSectionSpacing = 4;
    const titleSize = 16; const headerSize = 12; const bodySize = 10; const smallSize = 8;
    const linkColor = [0, 102, 204];

    const addText = (text, size, weight, align = 'left', spacing = subSectionSpacing) => {
        if (!text && text !== 0) return;
        doc.setFontSize(size);
        doc.setFont('helvetica', weight);
        const splitText = doc.splitTextToSize(String(text), contentWidth);
        splitText.forEach(line => {
             if (currentY + size / lineSpacing > pageHeight - margin - 10) {
                 doc.addPage();
                 currentY = margin;
                 addText('Reporte Detallado (Continuación)', smallSize, 'italic', 'right', 2);
             }
            doc.text(line, align === 'center' ? pageWidth / 2 : (align === 'right' ? pageWidth - margin : margin) , currentY, { align: align });
            currentY += size / lineSpacing;
        });
        currentY += spacing;
    };
    const addLink = (text, url, size, spacing = 2) => {
        if (!text || !url) {
             addText(text, size, 'normal', 'left', spacing);
             return;
        }
        if (currentY + size / lineSpacing > pageHeight - margin - 10) { doc.addPage(); currentY = margin; }
        doc.setFontSize(size);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(linkColor[0], linkColor[1], linkColor[2]);
        try {
            doc.textWithLink(text, margin, currentY, { url: url });
        } catch (e) {
            console.error("Error al crear link en PDF:", e);
            addText(text + " (Link: " + url + ")", size, 'normal', 'left', spacing);
        }
        doc.setTextColor(0, 0, 0); // Reset color
        currentY += size / lineSpacing + spacing;
    };
    const addLine = (spacing = 4) => {
        if (currentY + 1 > pageHeight - margin - 10) { doc.addPage(); currentY = margin; }
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += spacing;
    }
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const formatDate = (date) => date.toLocaleDateString('es-MX', {day: '2-digit', month: '2-digit', year: 'numeric'});

    addText('Reporte Detallado de Cálculo Laboral Estimado', titleSize, 'bold', 'center', 5);
    addText(`Generado el: ${formatDate(new Date())} con la herramienta Calculadora Laboral Definitiva`, smallSize, 'normal', 'center', 8); addLine(sectionSpacing);

    addText('Evaluación Legal del Escenario', headerSize, 'bold', 'left', subSectionSpacing);
    addText(`Motivo de Baja Seleccionado: ${inputs.motivoBaja.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`, bodySize, 'normal');
    addText(`Pago Aplicable según LFT: ${totalLiquidacion > 0 ? "Liquidación Completa + Finiquito" : "Finiquito"}`, bodySize, 'normal', 'left', sectionSpacing);

    addText('Datos y Variables Base', headerSize, 'bold', 'left', subSectionSpacing);
    const anios = Math.floor(calc.antiguedadEnAnios); const meses = Math.floor((calc.antiguedadEnAnios * 12) % 12); const dias = Math.floor((calc.antiguedadEnAnios * 365.25) - (anios * 365.25) - (meses * 30.4375));
    addText(`Fechas: Ingreso ${formatDate(inputs.fechaIngreso)}, Baja ${formatDate(inputs.fechaBaja)}`, bodySize, 'normal');
    addText(`Antigüedad: ${anios}a ${meses}m ${dias}d (${calc.antiguedadEnAnios.toFixed(4)} años)`, bodySize, 'normal');
    addText(`Salario Diario (SD): ${formatCurrency(calc.SD)} (${calc.fuenteSDI === 'Ingresado manually por el usuario' ? 'Estimado' : 'Promedio Art. 89 LFT'})`, bodySize, 'normal');
    addText(`Salario Diario Integrado (SDI): ${formatCurrency(calc.SDI)} (${calc.fuenteSDI})`, bodySize, 'normal');
    addText(`Días Aguinaldo Anual: ${inputs.diasAguinaldo} | Vacaciones Pendientes: ${inputs.saldoVacaciones} | Vacaciones por Ley (Año Actual): ${calc.diasVacacionesPorLey}`, bodySize, 'normal', 'left', sectionSpacing); addLine(sectionSpacing);

    addText('A. Desglose Finiquito (Bruto)', headerSize, 'bold', 'left', subSectionSpacing);
    addText(`1. Salarios Devengados: ${formatCurrency(salariosDevengados.monto)}`, bodySize, 'bold');
    addText(`   Explicación: Pago de ${salariosDevengados.dias} días laborados no cubiertos en el último pago.`, smallSize + 1, 'normal');
    addLink(`   Fundamento: Art. 82, LFT`, `${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_82}`, smallSize);
    addText(`2. Aguinaldo Proporcional: ${formatCurrency(finiquito.aguinaldo.monto)}`, bodySize, 'bold');
    addText(`   Explicación: Parte proporcional de ${inputs.diasAguinaldo} días de aguinaldo por ${finiquito.aguinaldo.diasTrabajados} días laborados en el año.`, smallSize + 1, 'normal');
    addLink(`   Fundamento: Art. 87, LFT`, `${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_87}`, smallSize);
    addText(`3. Vacaciones (Saldo + Prop.): ${formatCurrency(finiquito.vacaciones.monto)}`, bodySize, 'bold');
    addText(`   Explicación: Pago de ${inputs.saldoVacaciones} días pendientes + ${finiquito.vacaciones.proporcionales.toFixed(2)} días proporcionales del año actual.`, smallSize + 1, 'normal');
    addLink(`   Fundamento: Art. 76 y 79, LFT`, `${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_76}`, smallSize);
    addText(`4. Prima Vacacional (25%): ${formatCurrency(finiquito.primaVacacional.monto)}`, bodySize, 'bold');
    addText(`   Explicación: 25% sobre el monto total de vacaciones calculado (${formatCurrency(finiquito.vacaciones.monto)}).`, smallSize + 1, 'normal');
    addLink(`   Fundamento: Art. 80, LFT`, `${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_80}`, smallSize);
    addText(`Subtotal Finiquito Bruto: ${formatCurrency(totalFiniquito)}`, bodySize+1, 'bold', 'left', sectionSpacing); addLine(sectionSpacing);

    addText('B. Desglose Liquidación (Bruto)', headerSize, 'bold', 'left', subSectionSpacing);
    if (liquidacion.indemnizacion90dias.monto > 0) {
        addText(`1. Indemnización Constitucional: ${formatCurrency(liquidacion.indemnizacion90dias.monto)}`, bodySize, 'bold');
        addText(`   Explicación: ${inputs.motivoBaja === 'incapacidad_trabajador' ? "1 mes de salario (30 días SD) por terminación por incapacidad no profesional." : "3 meses de salario (90 días SDI) por despido injustificado o terminación colectiva."}`, smallSize + 1, 'normal');
        addLink(`   Fundamento: ${inputs.motivoBaja === 'incapacidad_trabajador' ? "Art. 54 LFT" : "Art. 123 Const.; Art. 50/436 LFT"}`, inputs.motivoBaja === 'incapacidad_trabajador' ? `${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_54}`: URLS_LEGALES.ART_123_CONST, smallSize);
        addText(`   Cálculo: ${inputs.motivoBaja === 'incapacidad_trabajador' ? formatCurrency(calc.SD) + ' x 30' : formatCurrency(calc.SDI) + ' x 90'}`, smallSize+1, 'normal');
    }
    if (liquidacion.primaAntiguedad.monto > 0) {
        const salarioMinimo = inputs.esZonaFronteriza ? SALARIO_MINIMO_FRONTERA_2025 : SALARIO_MINIMO_GENERAL_2025; const topeSalarial = salarioMinimo * 2; const basePrimaAntiguedad = Math.min(calc.SD, topeSalarial);
        addText(`2. Prima de Antigüedad: ${formatCurrency(liquidacion.primaAntiguedad.monto)}`, bodySize, 'bold');
        addText(`   Explicación: 12 días de salario por cada año de servicio. La base de cálculo se topa a 2 salarios mínimos (${formatCurrency(topeSalarial)}).`, smallSize + 1, 'normal');
        addLink(`   Fundamento: Art. 162 LFT`, `${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_162}`, smallSize);
        addText(`   Cálculo: Base(${formatCurrency(basePrimaAntiguedad)}) x 12 x ${calc.antiguedadEnAnios.toFixed(4)} años`, smallSize+1, 'normal');
    }
    if (liquidacion.veinteDiasPorAnio.monto > 0) {
        addText(`3. 20 Días por Año: ${formatCurrency(liquidacion.veinteDiasPorAnio.monto)}`, bodySize, 'bold');
        addText(`   Explicación: Corresponde por rescisión imputable al patrón (Art. 51 LFT).`, smallSize + 1, 'normal');
        addLink(`   Fundamento: Art. 52 LFT`, `${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_52}`, smallSize);
        addText(`   Cálculo: ${formatCurrency(calc.SDI)} x 20 x ${calc.antiguedadEnAnios.toFixed(4)} años`, smallSize+1, 'normal');
    } else if (totalLiquidacion > 0 && inputs.motivoBaja !== 'incapacidad_trabajador' && inputs.motivoBaja !== 'rescisión_trabajador' && inputs.motivoBaja !== 'renuncia' && inputs.motivoBaja !== 'mutuo_consentimiento' && inputs.motivoBaja !== 'fin_contrato') {
         addText(`3. 20 Días por Año: $0.00`, bodySize, 'bold');
         addText(`   Explicación: Pago condicional que no aplica para ${inputs.motivoBaja.replace(/_/g, ' ')}.`, smallSize + 1, 'normal');
         addLink(`   Fundamento: Art. 50 y 52 LFT`, `${URLS_LEGALES.LFT_BASE}${URLS_LEGALES.ART_50}`, smallSize);
    }
    addText(`Subtotal Liquidación Bruta: ${formatCurrency(totalLiquidacion)}`, bodySize+1, 'bold', 'left', sectionSpacing); addLine(sectionSpacing);

    addText('C. Cálculo Detallado del ISR Estimado', headerSize, 'bold', 'left', subSectionSpacing);
    addText(`1. Cálculo de Partes Exentas:`, bodySize, 'bold');
    addLink(`   Fundamento General: Art. 93 LISR`, `${URLS_LEGALES.LISR_BASE}${URLS_LEGALES.LISR_93}`, smallSize);
    addText(`   - Aguinaldo: Exento ${formatCurrency(calculoISR.montoExentoAG)} (Límite 30 UMAs: ${formatCurrency(calculoISR.limiteExentoAG)}, Frac. XIV)`, smallSize + 1, 'normal');
    addText(`   - Prima Vacacional: Exenta ${formatCurrency(calculoISR.montoExentoPV)} (Límite 15 UMAs: ${formatCurrency(calculoISR.limiteExentoPV)}, Frac. XIV)`, smallSize + 1, 'normal');
    addText(`   - Indemnizaciones: Exentas ${formatCurrency(calculoISR.montoExentoIND)} (Límite 90 UMAs/Año por ${calculoISR.aniosComputablesISR} años: ${formatCurrency(calculoISR.limiteExentoIND)}, Frac. XIII)`, smallSize + 1, 'normal');
    addText(`   - Salarios Devengados y Vacaciones: 100% Gravables`, smallSize + 1, 'normal');

    addText(`2. Determinación de Bases Gravables:`, bodySize, 'bold');
    addText(`   - Base Gravable Ordinaria (BGO): ${formatCurrency(calculoISR.BGO)}`, smallSize + 1, 'normal');
    addText(`   - Base Gravable por Separación (BGS): ${formatCurrency(calculoISR.BGS)}`, smallSize + 1, 'normal');

    addText(`3. Procedimiento de Retención:`, bodySize, 'bold');
    addLink(`   Fundamento: Art. 96 LISR, 6o Párrafo; Art. 174 RLISR`, `${URLS_LEGALES.LISR_BASE}${URLS_LEGALES.LISR_96}`, smallSize);
    addText(`   - Procedimiento Aplicado: ${calculoISR.procedimientoAplicado}.`, smallSize + 1, 'normal');
    addText(`   - Último Sueldo Mensual Ordinario (USMO Estimado): ${formatCurrency(calculoISR.USMO)}.`, smallSize + 1, 'normal');
    if (calculoISR.BGS > calculoISR.USMO) {
        addText(`   - Tasa Efectiva Aplicada: ${(calculoISR.tasaEfectiva * 100).toFixed(4)}%`, smallSize + 1, 'normal');
        addText(`   - ISR Ordinario Neto (sobre BGO): ${formatCurrency(calculoISR.isrOrdNeto)}`, smallSize + 1, 'normal');
        addText(`   - ISR por Separación (BGS x Tasa): ${formatCurrency(calculoISR.isrSeparacion)}`, smallSize + 1, 'normal');
    }
    addText(`   - ISR Total a Retener Estimado: ${formatCurrency(calculoISR.isrTotalRetener)}`, bodySize, 'bold', 'left', sectionSpacing); addLine(sectionSpacing);

    addText('Resumen Final Estimado', headerSize, 'bold', 'left', subSectionSpacing);
    addText(`Total Bruto: ${formatCurrency(totalBruto)}`, bodySize+1, 'normal');
    addText(`(-) ISR Retenido Estimado: ${formatCurrency(calculoISR.isrTotalRetener)}`, bodySize+1, 'normal');
    addText(`(=) Pago Neto Estimado: ${formatCurrency(totalNeto)}`, headerSize+1, 'bold', 'left', 8);

    addText('Aviso Legal: Este cálculo es una estimación con fines orientativos, basada en los datos proporcionados y en la legislación vigente a la fecha de consulta (2025). Este resultado no constituye asesoría legal ni reemplaza la consulta con un profesional. Para la defensa y reclamación formal de sus derechos laborales, acuda a la Procuraduría Federal de la Defensa del Trabajo (PROFEDET) para recibir asesoría gratuita y personalizada.', smallSize, 'normal', 'center', 1);
    addText('Herramienta desarrollada por: https://github.com/brianerbes/calculadora-laboral-mx', smallSize-1, 'normal', 'center');

    doc.save(fileName);
}


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