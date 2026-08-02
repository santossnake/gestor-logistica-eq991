-- =======================================================
-- ESQUADRA 991 (FORÇA AÉREA) - GESTÃO DE VIATURAS & REBOQUE
-- SUPABASE POSTGRESQL SCHEMA DE MIGRAÇÃO COMPLETO
-- =======================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------
-- 1. TABELA: locais (Locais pré-definidos de estacionamento e chaves)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('VIATURA', 'CHAVE')),
    is_predefinido BOOLEAN DEFAULT false,
    is_ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- 2. TABELA: viaturas (Frota da Esquadra 991)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.viaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula TEXT UNIQUE NOT NULL,
    modelo TEXT NOT NULL,
    num_lugares INT NOT NULL DEFAULT 5,
    tem_gancho_reboque BOOLEAN NOT NULL DEFAULT false,
    km_atuais INT NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'DISPONIVEL' CHECK (estado IN ('DISPONIVEL', 'EM_USO', 'EMPRESTADA_EXTERNO', 'MANUTENCAO')),
    necessita_limpeza BOOLEAN NOT NULL DEFAULT false,
    localizacao_atual_viatura TEXT DEFAULT 'Parque Principal EQ991',
    localizacao_atual_chave TEXT DEFAULT 'Chaveiro Principal - Armário A',
    latitude_atual DOUBLE PRECISION,
    longitude_atual DOUBLE PRECISION,
    fonte_ultima_localizacao TEXT,
    ultima_localizacao_at TIMESTAMPTZ,
    qr_code_token TEXT UNIQUE NOT NULL,
    is_forcada_recomendada BOOLEAN DEFAULT false,
    km_proxima_revisao INT DEFAULT 100000,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- 3. TABELA: pedidos (Reservas de viaturas efetuadas por militares)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_utilizador TEXT NOT NULL,
    nip TEXT NOT NULL,
    posto TEXT NOT NULL,
    email TEXT NOT NULL,
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ NOT NULL,
    destino TEXT NOT NULL,
    motivo TEXT NOT NULL,
    necessita_reboque BOOLEAN DEFAULT false,
    viatura_id UUID REFERENCES public.viaturas(id) ON DELETE SET NULL,
    estado_pedido TEXT DEFAULT 'PENDENTE' CHECK (estado_pedido IN ('PENDENTE', 'APROVADO', 'REJEITADO', 'CONCLUIDO')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- 4. TABELA: registos_marcha (Histórico de marchas / utilizações)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registos_marcha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    viatura_id UUID NOT NULL REFERENCES public.viaturas(id) ON DELETE CASCADE,
    nip_inicio TEXT NOT NULL,
    nip_fim TEXT,
    km_inicial INT NOT NULL,
    km_final INT,
    nivel_combustivel TEXT CHECK (nivel_combustivel IN ('RESERVA', '1/4', '1/2', '3/4', 'CHEIO')),
    litros_abastecidos NUMERIC(10,2) DEFAULT 0,
    valor_abastecido NUMERIC(10,2) DEFAULT 0,
    localizacao_chave TEXT,
    localizacao_viatura TEXT,
    latitude_inicio DOUBLE PRECISION,
    longitude_inicio DOUBLE PRECISION,
    latitude_fecho DOUBLE PRECISION,
    longitude_fecho DOUBLE PRECISION,
    checklist_documentos BOOLEAN DEFAULT true,
    checklist_cartao BOOLEAN DEFAULT true,
    checklist_seguranca BOOLEAN DEFAULT true,
    necessita_limpeza BOOLEAN DEFAULT false,
    alerta_esquecimento_enviado BOOLEAN DEFAULT false,
    fechado_por_admin BOOLEAN DEFAULT false,
    data_saida TIMESTAMPTZ DEFAULT now(),
    data_chegada TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- 5. TABELA: historico_posicoes_gps (Rastreio contínuo e pings)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.historico_posicoes_gps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viatura_id UUID NOT NULL REFERENCES public.viaturas(id) ON DELETE CASCADE,
    registo_marcha_id UUID REFERENCES public.registos_marcha(id) ON DELETE CASCADE,
    nip_operador TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    precisao_metros NUMERIC(10,2),
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('INICIO_MARCHA', 'PING_PERCURSO', 'FOTO_ODOMETRO', 'INCIDENTE', 'FIM_MARCHA')),
    registado_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- 6. TABELA: notificacoes_utilizadores (Auditoria de emails enviados)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notificacoes_utilizadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viatura_id UUID REFERENCES public.viaturas(id) ON DELETE SET NULL,
    registo_marcha_id UUID REFERENCES public.registos_marcha(id) ON DELETE SET NULL,
    nip_destinatario TEXT NOT NULL,
    email_destinatario TEXT NOT NULL,
    motivo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    enviado_por_admin BOOLEAN DEFAULT true,
    data_envio TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- 7. TABELA: emprestimos_externos (Cedências a unidades/entidades externas)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emprestimos_externos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viatura_id UUID NOT NULL REFERENCES public.viaturas(id) ON DELETE CASCADE,
    entidade_externa TEXT NOT NULL,
    nome_responsavel TEXT NOT NULL,
    contacto_responsavel TEXT NOT NULL,
    email_responsavel TEXT NOT NULL,
    data_inicio TIMESTAMPTZ DEFAULT now(),
    data_fim_prevista TIMESTAMPTZ NOT NULL,
    data_devolucao_real TIMESTAMPTZ,
    km_inicio INT NOT NULL,
    km_fim INT,
    observacoes_inicial TEXT,
    observacoes_final TEXT,
    estado TEXT DEFAULT 'ATIVO' CHECK (estado IN ('ATIVO', 'CONCLUIDO')),
    criado_por_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- 8. TABELA: fotos_emprestimo (Galeria de Vistoria Fotográfica Multi-Ângulo)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fotos_emprestimo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emprestimo_id UUID NOT NULL REFERENCES public.emprestimos_externos(id) ON DELETE CASCADE,
    tipo_fase TEXT NOT NULL CHECK (tipo_fase IN ('INICIO', 'DEVOLUCAO')),
    angulo_zona TEXT NOT NULL CHECK (angulo_zona IN ('FRENTE', 'TRASEIRA', 'ESQUERDA', 'DIREITA', 'INTERIOR', 'PAINEL', 'DANO')),
    foto_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- 9. TABELA: anomalias (Avarias, incidentes e gravidades)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anomalias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viatura_id UUID NOT NULL REFERENCES public.viaturas(id) ON DELETE CASCADE,
    registo_marcha_id UUID REFERENCES public.registos_marcha(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    foto_url TEXT,
    latitude_incidente DOUBLE PRECISION,
    longitude_incidente DOUBLE PRECISION,
    gravidade TEXT NOT NULL CHECK (gravidade IN ('LEVE', 'MODERADA', 'GRAVE')),
    estado_anomalia TEXT DEFAULT 'PENDENTE' CHECK (estado_anomalia IN ('PENDENTE', 'EM_RESOLUCAO', 'RESOLVIDO')),
    notas_logistica TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- SEEDS INICIAIS DE TESTE E CONFIGURAÇÃO
-- -------------------------------------------------------

-- Locais Pré-definidos de Estacionamento
INSERT INTO public.locais (nome, tipo, is_predefinido, is_ativo) VALUES
('Parque Principal EQ991', 'VIATURA', true, true),
('Hangar de Manutenção', 'VIATURA', false, true),
('Parque de Viaturas Pesadas', 'VIATURA', false, true),
('Posto de Abastecimento Base', 'VIATURA', false, true);

-- Locais Pré-definidos de Chaves
INSERT INTO public.locais (nome, tipo, is_predefinido, is_ativo) VALUES
('Claviculário Principal - Armário A', 'CHAVE', true, true),
('Corpo de Guarda - Receção', 'CHAVE', false, true),
('Gabinete de Logística EQ991', 'CHAVE', false, true);

-- Viaturas Exemplo Esquadra 991 (Frota Nissan Navara 4x4 com KM Reais)
INSERT INTO public.viaturas (matricula, modelo, num_lugares, tem_gancho_reboque, km_atuais, estado, necessita_limpeza, localizacao_atual_viatura, localizacao_atual_chave, latitude_atual, longitude_atual, qr_code_token, is_forcada_recomendada, km_proxima_revisao) VALUES
('AM-96-11', 'Nissan Navara 4x4', 5, true, 98620, 'DISPONIVEL', false, 'Parque Principal EQ991 (Ota)', 'Chaveiro Principal - Armário A', 39.0940, -8.9670, 'VTR-991-01', true, 110000),
('AM-96-12', 'Nissan Navara 4x4', 5, true, 105888, 'DISPONIVEL', false, 'Parque Principal EQ991 (Ota)', 'Chaveiro Principal - Armário A', 39.0945, -8.9675, 'VTR-991-02', false, 115000),
('AM-96-13', 'Nissan Navara 4x4', 5, true, 102614, 'DISPONIVEL', false, 'Parque Principal EQ991 (Ota)', 'Chaveiro Principal - Armário A', 39.0935, -8.9665, 'VTR-991-03', false, 110000);

-- Add cleaning columns to viaturas if not exists
ALTER TABLE public.viaturas ADD COLUMN IF NOT EXISTS data_ultima_limpeza TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.viaturas ADD COLUMN IF NOT EXISTS limpo_por_nip TEXT;

-- -------------------------------------------------------
-- 11. TABELA: registos_abastecimento (Abastecimentos Unidade / Bombas Comerciais)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registos_abastecimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viatura_id UUID REFERENCES public.viaturas(id) ON DELETE CASCADE,
    registo_marcha_id UUID REFERENCES public.registos_marcha(id) ON DELETE SET NULL,
    nip_responsavel TEXT NOT NULL,
    tipo_abastecimento TEXT CHECK (tipo_abastecimento IN ('UNIDADE_MILITAR', 'POSTO_COMERCIAL')) NOT NULL,
    unidade_militar TEXT,
    posto_comercial_nome TEXT,
    latitude_posto DOUBLE PRECISION,
    longitude_posto DOUBLE PRECISION,
    litros NUMERIC(8,2) NOT NULL,
    valor_euros NUMERIC(8,2),
    km_no_abastecimento INTEGER NOT NULL,
    registado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.registos_abastecimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Total aos Abastecimentos" ON public.registos_abastecimento
    FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------
-- 10. TABELA: utilizadores_logistica (Gestores de Logística com Trigrama)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.utilizadores_logistica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    posto TEXT NOT NULL,
    especialidade TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    trigrama TEXT UNIQUE NOT NULL,
    is_ativo BOOLEAN DEFAULT true,
    ultimo_acesso TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed de exemplo utilizadores logística
INSERT INTO public.utilizadores_logistica (nome, posto, especialidade, email, trigrama, is_ativo) VALUES
('Manuel Oliveira', 'Sargento-Ajudante', 'MELECA', 'logistica.eq991@emfa.pt', 'OLV', true),
('António Ferreira', 'Tenente', 'LOGISTICA', 'ferreira.eq991@emfa.pt', 'FER', true),
('João Silva', 'Capitão', 'MELIA', 'silva.eq991@emfa.pt', 'SIL', true);

ALTER TABLE public.utilizadores_logistica ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir Acesso Utilizadores Logistica" ON public.utilizadores_logistica FOR ALL USING (true);

ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registos_marcha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_posicoes_gps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_utilizadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emprestimos_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_emprestimo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalias ENABLE ROW LEVEL SECURITY;

-- Permitir leitura/escrita anonima controlada para operação militar sem login
CREATE POLICY "Permitir Acesso Leitura Geral" ON public.locais FOR SELECT USING (true);
CREATE POLICY "Permitir Acesso Leitura Viaturas" ON public.viaturas FOR SELECT USING (true);
CREATE POLICY "Permitir Atualizacao Viaturas" ON public.viaturas FOR UPDATE USING (true);
CREATE POLICY "Permitir Escrita Pedidos" ON public.pedidos FOR ALL USING (true);
CREATE POLICY "Permitir Escrita Registos Marcha" ON public.registos_marcha FOR ALL USING (true);
CREATE POLICY "Permitir Escrita Historico GPS" ON public.historico_posicoes_gps FOR ALL USING (true);
CREATE POLICY "Permitir Escrita Anomalias" ON public.anomalias FOR ALL USING (true);
CREATE POLICY "Permitir Acesso Emprestimos" ON public.emprestimos_externos FOR ALL USING (true);
CREATE POLICY "Permitir Acesso Fotos Emprestimo" ON public.fotos_emprestimo FOR ALL USING (true);
CREATE POLICY "Permitir Acesso Notificacoes" ON public.notificacoes_utilizadores FOR ALL USING (true);
