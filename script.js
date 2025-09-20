// --- VALORES CONSTANTES Y LEGALES (Actualizar anualmente) ---
const SALARIO_MINIMO_GENERAL_2025 = 278.80;
const SALARIO_MINIMO_FRONTERA_2025 = 419.88;

// --- LÓGICA PRINCIPAL DE LA CALCULADORA ---
document.addEventListener('DOMContentLoaded', () => {
    
    document.getElementById('fechaBaja').value = new Date().toISOString().split('T')[0];
    
    const form = document.getElementById('calculator-form');
    const downloadButton = document.getElementById('download-json');
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
            alert("Por favor, revisá que todos los datos sean correctos.");
            return;
        }

        const calc = calcularVariablesBase(inputs);
        const finiquito = calcularFiniquito(calc, inputs);
        const liquidacion = calcularLiquidacion(calc, inputs);

        const totalFiniquito = finiquito.aguinaldo.monto + finiquito.vacaciones.monto + finiquito.primaVacacional.monto;
        const totalLiquidacion = liquidacion.indemnizacion90dias.monto + liquidacion.primaAntiguedad.monto + liquidacion.veinteDiasPorAnio.monto;
        const totalBruto = totalFiniquito + totalLiquidacion;

        reporteParaDescargar = { inputs, calc, finiquito, liquidacion, totalFiniquito, totalLiquidacion, totalBruto };
        
        displayResults(reporteParaDescargar);
        downloadButton.style.display = 'inline-block';
    });

    downloadButton.addEventListener('click', () => {
        if (!reporteParaDescargar) {
            alert("Primero tenés que realizar un cálculo.");
            return;
        }
        
        const reporteJSON = generarReporteJSON(reporteParaDescargar);
        const jsonString = JSON.stringify(reporteJSON, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_liquidacion_${reporteParaDescargar.inputs.fechaBaja.toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
});


// --- FUNCIONES DE CÁLCULO ---

function calcularVariablesBase(inputs) {
    const antiguedadEnAnios = (inputs.fechaBaja - inputs.fechaIngreso) / (1000 * 60 * 60 * 24 * 365.25);
    const antiguedadAniosCompletos = Math.floor(antiguedadEnAnios);
    const diasVacacionesPorLey = getDiasVacacionesPorLey(antiguedadAniosCompletos + 1);
    
    let SD = 0, SDI = 0, fuenteSDI = '';

    if (!isNaN(inputs.sdiManual) && inputs.sdiManual > 0) {
        SDI = inputs.sdiManual;
        const factorIntegracionAprox = 1 + (inputs.diasAguinaldo / 365) + (diasVacacionesPorLey * 0.25 / 365);
        SD = SDI / factorIntegracionAprox;
        fuenteSDI = "Ingresado manualmente por el usuario";
    } else {
        SD = inputs.ingresoUltimoMes / 30;
        const parteDiariaAguinaldo = (SD * inputs.diasAguinaldo) / 365;
        const parteDiariaPrimaVacacional = (SD * diasVacacionesPorLey * 0.25) / 365;
        SDI = SD + parteDiariaAguinaldo + parteDiariaPrimaVacacional;
        fuenteSDI = "Autocalculado a partir de ingresos brutos y prestaciones de ley";
    }
    return { antiguedadEnAnios, antiguedadAniosCompletos, diasVacacionesPorLey, SD, SDI, fuenteSDI };
}

function calcularFiniquito(calc, inputs) {
    const inicioDelAnio = new Date(inputs.fechaBaja.getFullYear(), 0, 1);
    const diasTrabajadosEnElAnio = Math.floor((inputs.fechaBaja - inicioDelAnio) / (1000 * 60 * 60 * 24)) + 1;
    const aguinaldoProporcional = (calc.SD * inputs.diasAguinaldo / 365) * diasTrabajadosEnElAnio;
    
    const aniversarioEsteAnio = new Date(inputs.fechaBaja.getFullYear(), inputs.fechaIngreso.getMonth(), inputs.fechaIngreso.getDate());
    let ultimoAniversario = aniversarioEsteAnio;
    if (inputs.fechaBaja < aniversarioEsteAnio) {
        ultimoAniversario = new Date(inputs.fechaBaja.getFullYear() - 1, inputs.fechaIngreso.getMonth(), inputs.fechaIngreso.getDate());
    }
    const diasDesdeUltimoAniversario = Math.floor((inputs.fechaBaja - ultimoAniversario) / (1000 * 60 * 60 * 24));
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

// --- FUNCIONES DE VISUALIZACIÓN Y GENERACIÓN DE JSON ---

function displayResults(data) {
    const { finiquito, totalFiniquito, liquidacion, totalLiquidacion, totalBruto, calc } = data;
    const { antiguedadEnAnios } = calc;
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    
    document.getElementById('res-aguinaldo').textContent = formatCurrency(finiquito.aguinaldo.monto);
    document.getElementById('res-vacaciones').textContent = formatCurrency(finiquito.vacaciones.monto);
    document.getElementById('res-prima-vacacional').textContent = formatCurrency(finiquito.primaVacacional.monto);
    document.getElementById('res-total-finiquito').textContent = formatCurrency(totalFiniquito);
    document.getElementById('res-indemnizacion').textContent = formatCurrency(liquidacion.indemnizacion90dias.monto);
    document.getElementById('res-prima-antiguedad').textContent = formatCurrency(liquidacion.primaAntiguedad.monto);
    document.getElementById('res-20-dias').textContent = formatCurrency(liquidacion.veinteDiasPorAnio.monto);
    document.getElementById('res-total-liquidacion').textContent = formatCurrency(totalLiquidacion);
    document.getElementById('res-total-bruto').textContent = formatCurrency(totalBruto);
    
    fillDetails(data);
    document.getElementById('results-container').classList.remove('hidden');
}

function fillDetails(data) {
    const { finiquito, liquidacion, inputs, calc } = data;
    const { antiguedadEnAnios, SD, SDI } = calc;
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const anios = Math.floor(antiguedadEnAnios);
    const meses = Math.floor((antiguedadEnAnios * 12) % 12);
    const dias = Math.floor((antiguedadEnAnios * 365.25) - (anios * 365.25) - (meses * 30.4375));
    document.getElementById('res-summary-text').textContent = `Cálculo para una antigüedad de ${anios} años, ${meses} meses y ${dias} días.`;
    document.getElementById('det-aguinaldo').innerHTML = `<b>Explicación:</b> Parte proporcional del aguinaldo anual.<br><b>Fundamento:</b> Art. 87, LFT.<br><b>Fórmula:</b> ((SD x Días Aguinaldo) / 365) x Días del año trabajados.<br><b>Tu Cálculo:</b> ((${formatCurrency(SD)} x ${inputs.diasAguinaldo}) / 365) x ${finiquito.aguinaldo.diasTrabajados} días = ${formatCurrency(finiquito.aguinaldo.monto)}`;
    document.getElementById('det-vacaciones').innerHTML = `<b>Explicación:</b> Pago de días de vacaciones no tomados.<br><b>Fundamento:</b> Art. 76 y 79, LFT.<br><b>Fórmula:</b> (Saldo pendiente + Días proporcionales) x SD.<br><b>Tu Cálculo:</b> (${inputs.saldoVacaciones} saldo + ${finiquito.vacaciones.proporcionales.toFixed(2)} proporcionales) x ${formatCurrency(SD)} = ${formatCurrency(finiquito.vacaciones.monto)}`;
    document.getElementById('det-prima-vacacional').innerHTML = `<b>Explicación:</b> 25% adicional sobre el monto total de vacaciones.<br><b>Fundamento:</b> Art. 80, LFT.<br><b>Fórmula:</b> Monto Vacaciones x 0.25.<br><b>Tu Cálculo:</b> ${formatCurrency(finiquito.vacaciones.monto)} x 0.25 = ${formatCurrency(finiquito.primaVacacional.monto)}`;
    const salarioMinimo = inputs.esZonaFronteriza ? SALARIO_MINIMO_FRONTERA_2025 : SALARIO_MINIMO_GENERAL_2025;
    const topeSalarial = salarioMinimo * 2;
    const basePrimaAntiguedad = Math.min(SD, topeSalarial);
    document.getElementById('det-prima-antiguedad').innerHTML = `<b>Explicación:</b> 12 días de salario por cada año de servicio.<br><b>Fundamento:</b> Art. 162, LFT.<br><b>Fórmula:</b> (Salario Diario Topado) x 12 x Años de Servicio.<br><b>Tu Cálculo:</b> Tu SD es ${formatCurrency(SD)}. El tope es ${formatCurrency(topeSalarial)}. Se usa el menor: ${formatCurrency(basePrimaAntiguedad)} x 12 x ${antiguedadEnAnios.toFixed(3)} años = ${formatCurrency(liquidacion.primaAntiguedad.monto)}`;
    let textoIndemnizacion = `<b>Explicación:</b> 90 días de salario por despido injustificado.<br><b>Fundamento:</b> Art. 123 Constitución; Art. 50 LFT.<br><b>Fórmula:</b> Salario Diario Integrado (SDI) x 90.<br><b>Tu Cálculo:</b> Tu SDI es ${formatCurrency(SDI)}. ${formatCurrency(SDI)} x 90 = ${formatCurrency(liquidacion.indemnizacion90dias.monto)}`;
    if (inputs.motivoBaja === 'incapacidad_trabajador') { textoIndemnizacion = `<b>Explicación:</b> 1 mes de salario por terminación por incapacidad.<br><b>Fundamento:</b> Art. 54, LFT.<br><b>Fórmula:</b> Salario Diario (SD) x 30.<br><b>Tu Cálculo:</b> ${formatCurrency(SD)} x 30 = ${formatCurrency(liquidacion.indemnizacion90dias.monto)}`; }
    document.getElementById('det-indemnizacion').innerHTML = textoIndemnizacion;
    let texto20dias = `<b>¡Importante!</b> Este pago es condicional. NO se incluye en una liquidación normal por despido injustificado o cierre de campaña. Generalmente solo procede si demandás la reinstalación y el patrón se niega, o en caso de rescisión por falta grave del patrón (Art. 51).`;
    if (inputs.motivoBaja === 'rescisión_trabajador') { texto20dias = `<b>Explicación:</b> 20 días de salario por año. Corresponde porque la terminación es por una falta grave del patrón (Art. 51).<br><b>Fundamento:</b> Art. 52, LFT.<br><b>Fórmula:</b> Salario Diario Integrado (SDI) x 20 x Años de Servicio.<br><b>Tu Cálculo:</b> ${formatCurrency(SDI)} x 20 x ${antiguedadEnAnios.toFixed(3)} años = ${formatCurrency(liquidacion.veinteDiasPorAnio.monto)}`; }
    document.getElementById('det-20-dias').innerHTML = texto20dias;
}

function generarReporteJSON(data) {
    const { inputs, calc, finiquito, liquidacion, totalFiniquito, totalLiquidacion, totalBruto } = data;
    const formatCurrency = (amount) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

    const salarioMinimo = inputs.esZonaFronteriza ? SALARIO_MINIMO_FRONTERA_2025 : SALARIO_MINIMO_GENERAL_2025;
    const topeSalarial = salarioMinimo * 2;
    const basePrimaAntiguedad = Math.min(calc.SD, topeSalarial);

    const anios = Math.floor(calc.antiguedadEnAnios);
    const meses = Math.floor((calc.antiguedadEnAnios * 12) % 12);
    const dias = Math.floor((calc.antiguedadEnAnios * 365.25) - (anios * 365.25) - (meses * 30.4375));
    
    // --- NUEVA ESTRUCTURA VERBOSA DEL JSON ---
    const reporte = {
        info_reporte: {
            version_calculadora: "v3.0 (Verbose)",
            fecha_generacion: new Date().toISOString(),
            marco_legal: "Ley Federal del Trabajo, México (Vigente a 2025)"
        },
        evaluacion_legal_escenario: {
            escenario_seleccionado: inputs.motivoBaja.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            descripcion: document.getElementById('motivoBaja').options[document.getElementById('motivoBaja').selectedIndex].parentElement.label,
            fundamento_principal: "Ver desglose de cada componente.",
            pago_aplicable: totalLiquidacion > 0 ? "Liquidación Completa + Finiquito" : "Finiquito"
        },
        datos_de_entrada: {
            fecha_ingreso: inputs.fechaIngreso.toISOString().split('T')[0],
            fecha_baja: inputs.fechaBaja.toISOString().split('T')[0],
            ingreso_bruto_ultimos_30_dias: inputs.ingresoUltimoMes,
            sdi_manual_ingresado: !isNaN(inputs.sdiManual) ? inputs.sdiManual : 'No ingresado',
            dias_aguinaldo_anual: inputs.diasAguinaldo,
            saldo_vacaciones_previas: inputs.saldoVacaciones,
            es_zona_fronteriza: inputs.esZonaFronteriza
        },
        calculos_base: {
            antiguedad: {
                anios_decimal: parseFloat(calc.antiguedadEnAnios.toFixed(4)),
                desglose: `${anios} años, ${meses} meses y ${dias} días`
            },
            salario_diario_sd: {
                valor: parseFloat(calc.SD.toFixed(2)),
                fuente: !isNaN(inputs.sdiManual) ? "Estimación inversa a partir del SDI manual" : "Promedio de ingresos brutos de los últimos 30 días (LFT Art. 89)"
            },
            salario_diario_integrado_sdi: {
                valor: parseFloat(calc.SDI.toFixed(2)),
                fuente: calc.fuenteSDI
            },
            vacaciones_anuales_por_ley: {
                dias: calc.diasVacacionesPorLey,
                explicacion: `Correspondientes al ${calc.antiguedadAniosCompletos + 1}er/o año de servicio (Reforma 'Vacaciones Dignas')`
            }
        },
        desglose_detallado: {
            finiquito: {
                componentes: [
                    {
                        concepto: "Aguinaldo Proporcional",
                        monto: parseFloat(finiquito.aguinaldo.monto.toFixed(2)),
                        fundamento_legal: "Art. 87, LFT",
                        calculo: {
                            formula: "((SD x Días Aguinaldo) / 365) x Días Trabajados en el Año",
                            valores: { sd: parseFloat(calc.SD.toFixed(2)), dias_aguinaldo: inputs.diasAguinaldo, dias_trabajados_en_el_ano: finiquito.aguinaldo.diasTrabajados },
                            resultado_texto: `((${formatCurrency(calc.SD)} x ${inputs.diasAguinaldo}) / 365) x ${finiquito.aguinaldo.diasTrabajados} días = ${formatCurrency(finiquito.aguinaldo.monto)}`
                        }
                    },
                    {
                        concepto: "Vacaciones (Saldo + Proporcional)",
                        monto: parseFloat(finiquito.vacaciones.monto.toFixed(2)),
                        fundamento_legal: "Art. 76 y 79, LFT",
                        calculo: {
                            formula: "(Saldo pendiente + Días proporcionales) x SD",
                            valores: { saldo_dias: inputs.saldoVacaciones, proporcionales_dias: finiquito.vacaciones.proporcionales, sd: parseFloat(calc.SD.toFixed(2)) },
                            resultado_texto: `(${inputs.saldoVacaciones} saldo + ${finiquito.vacaciones.proporcionales.toFixed(2)} proporcionales) x ${formatCurrency(calc.SD)} = ${formatCurrency(finiquito.vacaciones.monto)}`
                        }
                    },
                    {
                        concepto: "Prima Vacacional (25%)",
                        monto: parseFloat(finiquito.primaVacacional.monto.toFixed(2)),
                        fundamento_legal: "Art. 80, LFT",
                        calculo: {
                            formula: "Monto Total de Vacaciones x 0.25",
                            valores: { monto_vacaciones: parseFloat(finiquito.vacaciones.monto.toFixed(2)) },
                            resultado_texto: `${formatCurrency(finiquito.vacaciones.monto)} x 0.25 = ${formatCurrency(finiquito.primaVacacional.monto)}`
                        }
                    }
                ],
                total_finiquito: parseFloat(totalFiniquito.toFixed(2))
            },
            liquidacion: {
                componentes: [
                    {
                        concepto: "Indemnización Constitucional",
                        monto: parseFloat(liquidacion.indemnizacion90dias.monto.toFixed(2)),
                        explicacion: inputs.motivoBaja === 'incapacidad_trabajador' ? "1 mes de salario por terminación por incapacidad." : "90 días de salario por despido injustificado.",
                        fundamento_legal: inputs.motivoBaja === 'incapacidad_trabajador' ? "Art. 54, LFT" : "Art. 123 Constitución; Art. 50 LFT",
                        calculo: {
                            formula: inputs.motivoBaja === 'incapacidad_trabajador' ? "SD x 30" : "SDI x 90",
                            valores: { sd: parseFloat(calc.SD.toFixed(2)), sdi: parseFloat(calc.SDI.toFixed(2)) },
                            resultado_texto: inputs.motivoBaja === 'incapacidad_trabajador' ? `${formatCurrency(calc.SD)} x 30 = ${formatCurrency(liquidacion.indemnizacion90dias.monto)}` : `${formatCurrency(calc.SDI)} x 90 = ${formatCurrency(liquidacion.indemnizacion90dias.monto)}`
                        }
                    },
                    {
                        concepto: "Prima de Antigüedad (12 días por año)",
                        monto: parseFloat(liquidacion.primaAntiguedad.monto.toFixed(2)),
                        explicacion: "12 días de salario por cada año de servicio, topado a 2 salarios mínimos.",
                        fundamento_legal: "Art. 162, LFT",
                        calculo: {
                            formula: "(Salario Diario Topado) x 12 x Años de Servicio",
                            valores: { sd_real: parseFloat(calc.SD.toFixed(2)), tope_salarial: topeSalarial, base_calculo: basePrimaAntiguedad, anios_servicio: parseFloat(calc.antiguedadEnAnios.toFixed(4)) },
                            resultado_texto: `Base(${formatCurrency(basePrimaAntiguedad)}) x 12 x ${calc.antiguedadEnAnios.toFixed(3)} años = ${formatCurrency(liquidacion.primaAntiguedad.monto)}`
                        }
                    },
                    {
                        concepto: "20 Días de Salario por Año",
                        monto: parseFloat(liquidacion.veinteDiasPorAnio.monto.toFixed(2)),
                        explicacion: inputs.motivoBaja === 'rescisión_trabajador' ? "Corresponde porque la terminación es por una falta grave del patrón." : "Pago condicional que no aplica en este escenario.",
                        fundamento_legal: "Art. 52, LFT",
                        calculo: {
                            formula: "SDI x 20 x Años de Servicio",
                            valores: { sdi: parseFloat(calc.SDI.toFixed(2)), anios_servicio: parseFloat(calc.antiguedadEnAnios.toFixed(4)) },
                            resultado_texto: inputs.motivoBaja === 'rescisión_trabajador' ? `${formatCurrency(calc.SDI)} x 20 x ${calc.antiguedadEnAnios.toFixed(3)} años = ${formatCurrency(liquidacion.veinteDiasPorAnio.monto)}` : "N/A"
                        }
                    }
                ],
                total_liquidacion: parseFloat(totalLiquidacion.toFixed(2))
            }
        },
        resumen_total: {
            total_finiquito: formatCurrency(totalFiniquito),
            total_liquidacion: formatCurrency(totalLiquidacion),
            pago_total_bruto: formatCurrency(totalBruto),
            nota: "Este es un cálculo bruto antes de la retención de impuestos (ISR)."
        }
    };
    return reporte;
}