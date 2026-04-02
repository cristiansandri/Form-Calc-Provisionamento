// ==================== Formatar input Telefone ========================== //
const telefoneInput = document.getElementById('telefone');
telefoneInput.addEventListener('input', (e) => {

    let v = e.target.value.replace(/\D/g, '');
    v = v.substring(0, 11);

    if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (v.length > 6) {
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    }

    e.target.value = v;
});

// ==================== Enviar Evento ========================== //
function enviarEvento() {
    const selecaoDivida = document.getElementById('valor-divida').value;
    if (selecaoDivida === "Abaixo de R$50 mil") {
        fbq('trackCustom', 'Lead Não Qualificado', { valor: selecaoDivida });
        console.log("Evento: Lead Não Qualificado");
    } else if (selecaoDivida === "Entre R$50 mil e R$350 mil" || selecaoDivida === "Acima de R$350 mil") {
        fbq('track', 'Lead Qualificado', {
            content_category: 'Calculadora de Dívida',
            status: 'Qualificado'
        });
        console.log("Evento: Lead Qualificado");
    }
}

// ==================== Enviar Formulário ===================== //
// URL da função no Apps Script atrelada a planilha "[MFX] Leads - Calc. Juros Abusivos"
async function enviarForm() {
    const form = document.getElementById('form-juros-abusivos');
    const formData = new FormData(form);

    //Ler cookies do navegador
    function getCookie(name) {
        let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) return match[2];
        return '';
    }

    // Dados ocultos para a API de Conversões do Meta
    formData.append('userAgent', navigator.userAgent);
    formData.append('fbp', getCookie('_fbp'));
    formData.append('fbc', getCookie('_fbc')); // Só vai ter valor aqui se vier de um anúncio

    const url = ""; // URL do Apps Script para integração de API de conversões e Google Sheets

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            mode: 'no-cors'
        });
        console.log("Dados enviados com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar formulário:", error);
    }
}

// ========== Unificação das funções e Validação para abrir modal =========== //
function processarFormulario(botao) {
    const form = document.getElementById('form-juros-abusivos');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }


    const modalId = botao.getAttribute('data-modal');
    const modal = document.getElementById(modalId);

    if (modal) {
        modal.showModal();
        document.body.classList.add('sem-scroll');
    }
    
    enviarEvento();
    enviarForm();
}


// ==================== Abrir POPUP de Aviso ==================== //
    const modal = document.getElementById('modalAviso');
    const btnFechar = document.getElementById('fechar');

  // Abre automaticamente quando a página carregar
  window.addEventListener('load', () => {
        modal.showModal();
  });

  // Fecha ao clicar no botão
  btnFechar.addEventListener('click', () => {
        modal.close();
  });


// ==================== Fechar POPUP ==================== //
const closeButtons = document.querySelectorAll('.close-modal');
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const modal = button.closest('dialog');
        if (modal) {
            modal.close();
            document.body.classList.remove('sem-scroll');
        };
    });
});

const modais = document.querySelectorAll('dialog');
modais.forEach(modal => {
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.close();
            document.body.classList.remove('sem-scroll');
        }
    });
});





// ================= Funcionalidades da Calculadora ================= //
function formatarMoeda(input) {
    let valor = input.value.replace(/\D/g, "");
    if (valor.length === 0) {
        input.value = "";
        return;
    }
    valor = (parseFloat(valor) / 100).toFixed(2);
    valor = valor.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    input.value = "R$ " + valor;
}

function removerFormatacao(valor) {
    if (!valor || typeof valor !== 'string') return 0;
    const valorNumerico = valor.replace("R$", "").replace(/\./g, "").replace(",", ".");
    return parseFloat(valorNumerico) || 0;
}

let provisionamentoChart;

function calcularProvisionamento() {
    const erroContainer = document.getElementById("mensagem-erro");
    erroContainer.innerText = "";

    const valorParcelasInput = document.getElementById("valor-parcelas").value;
    const totalParcelasInput = document.getElementById("total-parcelas").value;
    const parcelasPagasInput = document.getElementById("parcelas-pagas").value;
    const mesesAtrasoInput = document.getElementById("meses-atraso").value;

    const valorParcelas = removerFormatacao(valorParcelasInput);
    const totalParcelas = parseInt(totalParcelasInput) || 0;
    const parcelasPagas = parseInt(parcelasPagasInput) || 0;
    const mesesAtraso = parseInt(mesesAtrasoInput) || 0;

    if (valorParcelas <= 0 || totalParcelas <= 0 || mesesAtraso < 0) {
        erroContainer.innerHTML = "Por favor, insira valores válidos e positivos para Valor das Parcelas, Total de Parcelas e Meses em Atraso (não pode ser negativo).";
        document.getElementById("resultados").style.display = "none";
        if (provisionamentoChart) provisionamentoChart.destroy();
        return;
    }
    if (parcelasPagas > totalParcelas) {
        erroContainer.innerHTML = "O número de parcelas pagas não pode ser maior que o total de parcelas.";
        document.getElementById("resultados").style.display = "none";
        if (provisionamentoChart) provisionamentoChart.destroy();
        return;
    }

    const valorTotalContrato = totalParcelas * valorParcelas;
    const dividaEmAberto = valorTotalContrato - (parcelasPagas * valorParcelas);
    let valorTotalEmAtraso = mesesAtraso * valorParcelas;

    let classificacao = "N/A";
    let percentualProvisionamento = 0;

    if (mesesAtraso >= 0 && mesesAtraso <= 0.5) {
        classificacao = "A (0-14 dias)";
        percentualProvisionamento = 0;
    } else if (mesesAtraso > 0.5 && mesesAtraso <= 1) {
        classificacao = "B (15-30 dias)";
        percentualProvisionamento = 1;
    } else if (mesesAtraso > 1 && mesesAtraso <= 2) {
        classificacao = "C (31-60 dias)";
        percentualProvisionamento = 3;
    } else if (mesesAtraso > 2 && mesesAtraso <= 3) {
        classificacao = "D (61-90 dias)";
        percentualProvisionamento = 10;
    } else if (mesesAtraso > 3 && mesesAtraso <= 4) {
        classificacao = "E (91-120 dias)";
        percentualProvisionamento = 30;
    } else if (mesesAtraso > 4 && mesesAtraso <= 5) {
        classificacao = "F (121-150 dias)";
        percentualProvisionamento = 50;
    } else if (mesesAtraso > 5 && mesesAtraso <= 6) {
        classificacao = "G (151-180 dias)";
        percentualProvisionamento = 70;
    } else if (mesesAtraso > 6) {
        classificacao = "H (Acima de 180 dias)";
        percentualProvisionamento = 100;
    }

    const valorTotalProvisionado = (valorTotalContrato * percentualProvisionamento) / 100;

    document.getElementById("resultados").style.display = "block";

    const formatBrl = val => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    document.getElementById("valor-total-contrato").innerHTML = `<span class="value-display">${formatBrl(valorTotalContrato)}</span><span class="label-display">Valor Total do Contrato</span>`;
    document.getElementById("divida-em-aberto").innerHTML = `<span class="value-display">${formatBrl(dividaEmAberto)}</span><span class="label-display">Dívida em Aberto</span>`;
    document.getElementById("valor-total-atraso").innerHTML = `<span class="value-display">${formatBrl(valorTotalEmAtraso)}</span><span class="label-display">Valor Total em Atraso</span>`;

    document.getElementById("classificacao-divida").innerText = classificacao;
    document.getElementById("valor-provisionado").innerText = formatBrl(valorTotalProvisionado);

    document.querySelector('#chart-center-text .percentage').innerText = `${percentualProvisionamento}%`;

    renderizarGraficoDonut(percentualProvisionamento, classificacao);
    gerarTextoExplicativo(valorTotalContrato, dividaEmAberto, valorTotalEmAtraso, valorTotalProvisionado, percentualProvisionamento, classificacao);
    updateInfoQuadroColors(classificacao);
}

function renderizarGraficoDonut(percentualProvisionamento, classificacao) {
    const ctx = document.getElementById('provisionamento-chart').getContext('2d');
    if (provisionamentoChart) {
        provisionamentoChart.destroy();
    }

    let chartProvisionedColor = '#e74c3c';
    const firstLetter = classificacao.charAt(0);

    if (firstLetter === 'A' || firstLetter === 'B' || firstLetter === 'C') {
        chartProvisionedColor = '#28a745';
    } else if (firstLetter === 'D' || firstLetter === 'E') {
        chartProvisionedColor = '#ffc107';
    } else if (firstLetter === 'F' || firstLetter === 'G' || firstLetter === 'H') {
        chartProvisionedColor = '#dc3545';
    }

    const data = {
        labels: ['Provisionado', 'Não Provisionado'],
        datasets: [{
            data: [percentualProvisionamento, 100 - percentualProvisionamento],
            backgroundColor: [chartProvisionedColor, '#ddd'],
            borderColor: [chartProvisionedColor, '#ddd'],
            borderWidth: 1
        }]
    };

    provisionamentoChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            animation: {
                animateRotate: true,
                animateScale: false,
                duration: 1000,
                easing: 'easeOutCubic',
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                },
                datalabels: {
                    color: function (context) {
                        return context.dataIndex === 0 ? '#f3f3f3' : '#333';
                    },
                    formatter: function (value, context) {
                        if (value > 10) {
                            return context.chart.data.labels[context.dataIndex].toUpperCase();
                        }
                        return '';
                    },
                    anchor: 'center',
                    align: 'center',
                    font: {
                        size: 10,
                        weight: 'bold'
                    },
                    display: function (context) {
                        return context.dataset.data[context.dataIndex] > 0;
                    }
                }
            }
        }
    });
}

function gerarTextoExplicativo(valorTotalContrato, dividaEmAberto, valorTotalEmAtraso, valorProvisionado, percentualProvisionamento, classificacao) {
    const textoContainer = document.getElementById("texto-explicativo");
    const formatBrl = val => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    let parteProvisionamento = '';
    let parteNegociacao = '';

    if (percentualProvisionamento === 100) {
        parteProvisionamento = `Isso significa que, para o banco, esse valor já foi considerado uma <b>perda total em sua contabilidade (Nível H)</b>.`;
        parteNegociacao = `Neste cenário, as chances de <b>negociação com grandes descontos são altíssimas</b>, pois é mais vantajoso para o banco recuperar parte do valor do que manter o prejuízo integral.`;
    } else if (percentualProvisionamento > 0) {
        parteProvisionamento = `Isso significa que o banco já registrou uma provisão para a sua dívida na classificação <b>${classificacao}</b>.`;
        parteNegociacao = `Com este nível de provisionamento, é um bom momento para <b>iniciar negociações</b> e buscar condições de pagamento mais favoráveis, evitando que o provisionamento aumente.`;
    } else {
        parteProvisionamento = `Isso significa que, atualmente, a sua dívida não possui um provisionamento significativo e está na classificação <b>${classificacao}</b>.`;
        parteNegociacao = `Este é um momento ideal para buscar <b>renegociação e evitar que a situação se agrave</b> e o provisionamento aumente no futuro.`;
    }

    let mensagem = `
                <p><b>Resumo do seu caso:</b></p>
                <p>Com um <b>Valor Total do Contrato de ${formatBrl(valorTotalContrato)},</b> e uma <b>Dívida em Aberto de ${formatBrl(dividaEmAberto)},</b> o banco já provisionou aproximadamente <b>${percentualProvisionamento}%</b> deste valor, totalizando <b>${formatBrl(valorProvisionado)}.</b> ${parteProvisionamento}</p>
                <p>${parteNegociacao}</p>
            `;
    textoContainer.innerHTML = mensagem;
}

function updateInfoQuadroColors(classificacao) {
    const infoQuadro = document.querySelector('.info-quadro');
    infoQuadro.classList.remove('verde-variant', 'amarelo-variant', 'vermelho-variant');
    const firstLetter = classificacao.charAt(0);
    if (firstLetter === 'A' || firstLetter === 'B' || firstLetter === 'C') {
        infoQuadro.classList.add('verde-variant');
    } else if (firstLetter === 'D' || firstLetter === 'E') {
        infoQuadro.classList.add('amarelo-variant');
    } else if (firstLetter === 'F' || firstLetter === 'G' || firstLetter === 'H') {
        infoQuadro.classList.add('vermelho-variant');
    }
}

function redirecionarWhatsApp() {
    const valorTotalContratoText = document.getElementById("valor-total-contrato").querySelector('.value-display').innerText;
    const dividaEmAbertoText = document.getElementById("divida-em-aberto").querySelector('.value-display').innerText;
    const valorTotalAtrasoText = document.getElementById("valor-total-atraso").querySelector('.value-display').innerText;
    const classificacaoText = document.getElementById("classificacao-divida").innerText.trim();
    const valorProvisionadoText = document.getElementById("valor-provisionado").innerText.trim();
    const percentualProvisionamento = document.getElementById("chart-center-text").querySelector('.percentage').innerText;

    const mensagemWhatsApp = `Olá! Gostaria de saber mais sobre o provisionamento bancário da minha dívida. Fiz o cálculo e o resultado foi:\n\n` +
        `Valor Total do Contrato: ${valorTotalContratoText}\n` +
        `Dívida em Aberto: ${dividaEmAbertoText}\n` +
        `Valor Total em Atraso: ${valorTotalAtrasoText}\n` +
        `Classificação: ${classificacaoText}\n` +
        `Percentual de Provisionamento: ${percentualProvisionamento}\n` +
        `Valor Total Provisionado: ${valorProvisionadoText}\n\n` +
        `Gostaria de discutir as oportunidades de negociação.`;

    const numeroTelefone = "5542991088896";
    const urlWhatsApp = `https://wa.me/${numeroTelefone}?text=${encodeURIComponent(mensagemWhatsApp)}`;
    window.open(urlWhatsApp, '_blank');
}


function imprimirResultados() {
    if (document.getElementById("resultados").style.display !== "block" || !provisionamentoChart) {
        console.warn("Por favor, calcule o provisionamento antes de imprimir.");
        return;
    }

    const valorParcelas = document.getElementById("valor-parcelas").value;
    const totalParcelas = document.getElementById("total-parcelas").value;
    const parcelasPagas = document.getElementById("parcelas-pagas").value;
    const mesesAtraso = document.getElementById("meses-atraso").value;
    const percentualProvisionamentoText = document.getElementById("chart-center-text").querySelector('.percentage').innerText;

    const valorTotalContrato = document.getElementById("valor-total-contrato").querySelector('.value-display').innerText;
    const dividaEmAberto = document.getElementById("divida-em-aberto").querySelector('.value-display').innerText;
    const valorTotalAtraso = document.getElementById("valor-total-atraso").querySelector('.value-display').innerText;
    const classificacao = document.getElementById("classificacao-divida").innerText;
    const valorProvisionado = document.getElementById("valor-provisionado").innerText;
    const textoExplicativo = document.getElementById("texto-explicativo").innerHTML;

    const htmlParaImprimir = `
<html>

<head>
    <title>Simulador de Provisionamento Bancário</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Poppins',
                sans-serif;
            margin: 25px;
        }

        h1 {
            text-align: center;
            color: #333;
        }

        .secao {
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            page-break-inside: avoid;
        }

        h2 {
            color: #555;
            border-bottom: 2px solid #eee;
            padding-bottom: 5px;
            margin-top: 0;
        }

        .grid-dados {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .item-dado p {
            margin: 2px 0;
            text-align: center;
        }

        .item-dado {
            background: #cfcfcf;
            padding: 10px;
            border-radius: 5px;
        }

        .item-dado .label {
            font-weight: 500;
            color: #333;
        }

        .item-dado .value {
            color: #666;
            align-items: center;
        }

        .percentual-container {
            text-align: center;
            margin: 15px auto;
            padding: 15px;
            border: 2px dashed #ccc;
            border-radius: 10px;
            max-width: 250px;
        }

        .percentual-container .percentual {
            font-size: 2.5em;
            font-weight: bold;
            color: #333;
            display: block;
            line-height: 0.5;
        }

        .percentual-container .rotulo {
            font-size: 0.7em;
            text-transform: uppercase;
            color: #555;
            font-weight: 300;
            margin-top: 10px;
            display: block;
        }

        .texto-explicativo {
            margin-top: 20px;
            font-size: 0.9em;
            line-height: 1.6;
        }

        .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 0.7em;
            color: #888;
            page-break-before: auto;
        }
    </style>
</head>

<body>
    <h1>Simulador de Provisionamento bancário</h1>

    <div class="secao">
        <h2>Dados Informados</h2>
        <div class="grid-dados">
            <div class="item-dado">
                <p><span class="label">Valor das Parcelas:</span> <span class="value">${valorParcelas}</span></p>
            </div>
            <div class="item-dado">
                <p><span class="label">Total de Parcelas:</span> <span class="value">${totalParcelas}</span></p>
            </div>
            <div class="item-dado">
                <p><span class="label">Parcelas Pagas:</span> <span class="value">${parcelasPagas}</span></p>
            </div>
            <div class="item-dado">
                <p><span class="label">Meses em Atraso:</span> <span class="value">${mesesAtraso}</span></p>
            </div>
        </div>
    </div>

    <div class="secao">
        <h2>Resultados do Cálculo</h2>
        <div class="grid-dados">
            <div class="item-dado">
                <p><span class="label">Valor Total do Contrato: </span> <span
                        class="value">${valorTotalContrato}</span></p>
            </div>
            <div class="item-dado">
                <p><span class="label">Dívida em Aberto:</span> <span class="value">${dividaEmAberto}</span></p>
            </div>
            <div class="item-dado">
                <p><span class="label">Valor em Atraso:</span> <span class="value">${valorTotalAtraso}</span></p>
            </div>
            <div class="item-dado">
                <p><span class="label"><span class="value">${classificacao}</span>
                </p>
            </div>
            <div class="item-dado" style="grid-column: span 2;">
                <p><span class="label">Valor Total Provisionado pelo Banco:</span> <span
                        class="value">${valorProvisionado}</span></p>
            </div>
        </div>
        <div class="percentual-container">
            <span class="percentual">${percentualProvisionamentoText}</span>
            <span class="rotulo">% PROVISIONADO</span>
        </div>
    </div>

    <div class="secao">
        <h2>Análise e Oportunidades</h2>
        <div class="texto-explicativo">
            ${textoExplicativo}
        </div>
    </div>

    <div class="footer">
        <p>Valores apenas estimados.<br>Simulação feita na calculadora de provisionamento da Martins Felix
            Advogados.<br>Disponível em: www.Martinsfelix.com.br</p>
    </div>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlParaImprimir);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 1000);
}

document.addEventListener('DOMContentLoaded', (event) => {
    renderizarGraficoDonut(0, "A (0-14 dias)");
    const initialClassificacao = "A (0-14 dias)";
    gerarTextoExplicativo(0, 0, 0, 0, 0, initialClassificacao);
    updateInfoQuadroColors(initialClassificacao);
});