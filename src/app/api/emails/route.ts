import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipo, emailDestinatario, nip, nome, destino, dataInicio, dataFim, necessitaReboque, matricula, nivelCombustivel, descricao, gravidade, motivo, mensagem, entidade, nomeResp, dataFimPrevista } = body;

    const toEmail = emailDestinatario || 'logistica.eq991@emfa.pt';
    console.log(`[EMAIL API] A processar disparo de email do tipo: ${tipo} para ${toEmail}`);

    let subject = 'Esquadra 991 - Notificação do Sistema de Viaturas';
    let htmlContent = `<p>Notificação da Esquadra 991 (Força Aérea).</p>`;

    switch (tipo) {
      case 'CONFIRMACAO_PEDIDO':
        subject = 'Esquadra 991 - Confirmação de Receção de Pedido de Viatura';
        htmlContent = `
          <h2>Esquadra 991 - Força Aérea Portuguesa</h2>
          <p>Exmo. Militar ${nome} [NIP ${nip}],</p>
          <p>Confirmamos a receção do seu pedido de reserva de viatura para o destino <strong>${destino}</strong>.</p>
          <p>O seu pedido encontra-se com o estado <strong>PENDENTE</strong> de validação pela Logística.</p>
          ${necessitaReboque ? '<p style="color: #d97706; font-weight: bold;">⚠️ Reboque Solicitado: Notificação enviada à equipa de manutenção de reboques.</p>' : ''}
        `;
        break;

      case 'APROVACAO_PEDIDO':
        subject = 'Esquadra 991 - Pedido de Viatura APROVADO';
        htmlContent = `
          <h2>Esquadra 991 - Força Aérea Portuguesa</h2>
          <p>Exmo. Militar ${nome},</p>
          <p>Informamos que o seu pedido de viatura com destino a <strong>${destino}</strong> foi <span style="color: #16a34a; font-weight: bold;">APROVADO</span>.</p>
          <p>Viatura Atribuída: <strong>${matricula || 'Nissan Navara 4x4'}</strong></p>
          <p>À chegada ao chaveiro, digitalize o QR Code do porta-chaves ou utilize a opção "Viatura Recomendada".</p>
        `;
        break;

      case 'COMBUSTIVEL_CRITICO':
        subject = `⚠️ ALERTA CRÍTICO LOGÍSTICA: Combustível Baixo (${matricula})`;
        htmlContent = `
          <h2>Alerta de Combustível Crítico - Esquadra 991</h2>
          <p>A viatura <strong>${matricula}</strong> foi devolvida pelo militar NIP <strong>${nip}</strong> com nível de combustível <strong>${nivelCombustivel}</strong> (&lt; 1/4).</p>
          <p>Necessita de reagendamento para abastecimento no Posto da Base.</p>
        `;
        break;

      case 'ALERTA_ANOMALIA':
        subject = `🚨 ALERTA CRÍTICO: Registo de Avaria/Anomalia (${matricula})`;
        htmlContent = `
          <h2>Registo de Anomalia / Incidente - Esquadra 991</h2>
          <p><strong>Viatura:</strong> ${matricula}</p>
          <p><strong>Militar Operador:</strong> NIP ${nip}</p>
          <p><strong>Gravidade:</strong> <span style="color: #dc2626; font-weight: bold;">${gravidade}</span></p>
          <p><strong>Descrição:</strong> ${descricao}</p>
        `;
        break;

      case 'INCONFORMIDADE_LIMPEZA':
        subject = `⚠️ AVISO FORMAL: Inconformidade no Estado / Limpeza da Viatura`;
        htmlContent = `
          <h2>Esquadra 991 - Notificação da Logística</h2>
          <p>Exmo. Militar NIP ${nip},</p>
          <p>Assunto: <strong>${motivo}</strong></p>
          <blockquote style="border-left: 4px solid #f59e0b; padding-left: 10px;">${mensagem}</blockquote>
          <p>Agradecemos a regularização do estado da viatura ou contacto com o Gabinete da Logística.</p>
        `;
        break;

      case 'EMPRESTIMO_EXTERNO_CRIADO':
        subject = `Esquadra 991 - Comprovativo de Cedência Externa de Viatura (${entidade})`;
        htmlContent = `
          <h2>Auto de Cedência Externa - Esquadra 991</h2>
          <p>Exmo. ${nomeResp} (${entidade}),</p>
          <p>Emitido o auto de cedência temporária com devolução prevista para <strong>${new Date(dataFimPrevista).toLocaleString()}</strong>.</p>
          <p>O Auto de Vistoria Fotográfico inicial de 6 ângulos foi arquivado no sistema.</p>
        `;
        break;

      case 'RESET_PASSWORD_TRIGRAMA':
        subject = `Esquadra 991 - Recuperação / Reposição de Palavra-passe [Trigrama: ${body.trigrama}]`;
        htmlContent = `
          <h2>Esquadra 991 - Gestão de Logística</h2>
          <p>Exmo. ${body.posto} ${body.nome} [Trigrama: <strong>${body.trigrama}</strong>],</p>
          <p>Foi solicitado o redefinir da palavra-passe de acesso ao Backoffice de Logística da Esquadra 991.</p>
          <p>O seu nome de utilizador para login é o seu Trigrama: <span style="background-color: #0f172a; color: #10b981; padding: 4px 8px; font-family: monospace; font-weight: bold; border-radius: 4px;">${body.trigrama}</span></p>
          <p>Clique no link abaixo para definir a sua nova palavra-passe:</p>
          <p><a href="http://localhost:3000/login?reset_token=${body.trigrama}" style="display: inline-block; background-color: #059669; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">Redefinir Palavra-passe</a></p>
          <p style="color: #94a3b8; font-size: 12px;">Se não solicitou a recuperação de palavra-passe, reporte a esta equipa de logística.</p>
        `;
        break;

      default:
        break;
    }

    // Send email via Resend API read strictly from process.env.RESEND_API_KEY (.env.local)
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Esquadra 991 Logística <onboarding@resend.dev>',
            to: [toEmail],
            subject,
            html: htmlContent
          })
        });

        const resendData = await resendRes.json();
        console.log(`[RESEND API RESPONSE]`, resendData);

        return NextResponse.json({
          success: true,
          tipo,
          destinatario: toEmail,
          subject,
          resend: resendData,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        console.warn('Erro ao enviar email via Resend API:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    } else {
      console.log(`[SIMULADOR EMAIL DISPATCH] To: ${toEmail} | Subject: ${subject}`);
      return NextResponse.json({
        success: true,
        tipo,
        destinatario: toEmail,
        subject,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err: any) {
    console.error('Erro na API de Emails:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
