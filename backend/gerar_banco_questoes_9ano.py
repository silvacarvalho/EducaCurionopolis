#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para gerar banco de questões SAEB - 9º Ano
Gera arquivo Excel pronto para importação no sistema
"""
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

# Banco de questões - Português 9º Ano
QUESTOES_PORT_9 = [
    # D1 - Localizar informações explícitas em um texto
    {
        "codigo": "D1",
        "enunciado": "Leia o texto:\n\n'A Revolução Industrial, iniciada na Inglaterra no século XVIII, transformou profundamente as relações de trabalho. As fábricas substituíram as oficinas artesanais, e os trabalhadores passaram a cumprir longas jornadas em condições precárias.'\n\nDe acordo com o texto, onde teve início a Revolução Industrial?",
        "alternativa_a": "Na França",
        "alternativa_b": "Na Alemanha",
        "alternativa_c": "Na Inglaterra",
        "alternativa_d": "Nos Estados Unidos",
        "alternativa_e": "Na Itália",
        "gabarito": "C"
    },
    {
        "codigo": "D1",
        "enunciado": "Leia o trecho:\n\n'O aquecimento global é causado principalmente pela emissão de gases de efeito estufa, como o dióxido de carbono (CO2). Esses gases retêm o calor na atmosfera, elevando a temperatura média do planeta.'\n\nSegundo o texto, qual gás é mencionado como causador do efeito estufa?",
        "alternativa_a": "Oxigênio",
        "alternativa_b": "Nitrogênio",
        "alternativa_c": "Hélio",
        "alternativa_d": "Dióxido de carbono",
        "alternativa_e": "Hidrogênio",
        "gabarito": "D"
    },
    # D2 - Estabelecer relações entre partes de um texto
    {
        "codigo": "D2",
        "enunciado": "'Os cientistas alertaram sobre os riscos da poluição. ELES afirmam que medidas urgentes devem ser tomadas.'\n\nNo texto, o pronome ELES refere-se a:",
        "alternativa_a": "Os riscos",
        "alternativa_b": "Os cientistas",
        "alternativa_c": "As medidas",
        "alternativa_d": "A poluição",
        "alternativa_e": "Os alertas",
        "gabarito": "B"
    },
    {
        "codigo": "D2",
        "enunciado": "'A empresa lançou um novo produto. ESTE promete revolucionar o mercado de tecnologia.'\n\nA palavra ESTE substitui:",
        "alternativa_a": "A empresa",
        "alternativa_b": "O mercado",
        "alternativa_c": "O novo produto",
        "alternativa_d": "A tecnologia",
        "alternativa_e": "A revolução",
        "gabarito": "C"
    },
    # D3 - Inferir o sentido de uma palavra ou expressão
    {
        "codigo": "D3",
        "enunciado": "'O político fez um discurso inflamado, conclamando a população a lutar por seus direitos.'\n\nA expressão 'discurso inflamado' significa um discurso:",
        "alternativa_a": "Calmo e tranquilo",
        "alternativa_b": "Apaixonado e intenso",
        "alternativa_c": "Curto e objetivo",
        "alternativa_d": "Confuso e desorganizado",
        "alternativa_e": "Técnico e formal",
        "gabarito": "B"
    },
    {
        "codigo": "D3",
        "enunciado": "'A notícia caiu como uma bomba entre os funcionários da empresa.'\n\nA expressão 'caiu como uma bomba' indica que a notícia:",
        "alternativa_a": "Foi ignorada por todos",
        "alternativa_b": "Causou grande impacto e surpresa",
        "alternativa_c": "Era muito esperada",
        "alternativa_d": "Foi recebida com alegria",
        "alternativa_e": "Não tinha importância",
        "gabarito": "B"
    },
    # D4 - Inferir uma informação implícita
    {
        "codigo": "D4",
        "enunciado": "'Depois de três meses de seca, os agricultores olhavam para o céu com esperança ao verem as nuvens escuras se aproximando.'\n\nPode-se concluir que os agricultores:",
        "alternativa_a": "Tinham medo de tempestades",
        "alternativa_b": "Esperavam que chovesse",
        "alternativa_c": "Queriam sol para a colheita",
        "alternativa_d": "Estavam tristes com o tempo",
        "alternativa_e": "Não se importavam com o clima",
        "gabarito": "B"
    },
    {
        "codigo": "D4",
        "enunciado": "'Maria saiu de casa às 7h, mas o ônibus só passou às 8h30. Quando chegou ao trabalho, seu chefe a olhou com reprovação.'\n\nPode-se inferir que Maria:",
        "alternativa_a": "Chegou no horário",
        "alternativa_b": "Chegou atrasada",
        "alternativa_c": "Não foi trabalhar",
        "alternativa_d": "Recebeu elogios",
        "alternativa_e": "Pediu demissão",
        "gabarito": "B"
    },
    # D5 - Interpretar texto com material gráfico
    {
        "codigo": "D5",
        "enunciado": "Observe o gráfico de pizza que mostra a distribuição do lixo produzido:\n\nPlástico: 40%\nPapel: 25%\nMetal: 15%\nVidro: 10%\nOutros: 10%\n\nQual material representa a maior parte do lixo?",
        "alternativa_a": "Papel",
        "alternativa_b": "Metal",
        "alternativa_c": "Plástico",
        "alternativa_d": "Vidro",
        "alternativa_e": "Outros",
        "gabarito": "C"
    },
    # D6 - Identificar o tema de um texto
    {
        "codigo": "D6",
        "enunciado": "'As redes sociais mudaram a forma como nos comunicamos. Hoje, é possível conversar com pessoas do outro lado do mundo instantaneamente. Porém, essa facilidade trouxe também problemas, como a disseminação de notícias falsas e o cyberbullying.'\n\nO tema central do texto é:",
        "alternativa_a": "A história da internet",
        "alternativa_b": "Os impactos das redes sociais na comunicação",
        "alternativa_c": "Como evitar o cyberbullying",
        "alternativa_d": "A velocidade da internet",
        "alternativa_e": "Os tipos de redes sociais",
        "gabarito": "B"
    },
    {
        "codigo": "D6",
        "enunciado": "'A desigualdade social no Brasil tem raízes históricas profundas. A concentração de renda nas mãos de poucos e a falta de acesso à educação de qualidade perpetuam esse cenário, que afeta milhões de brasileiros.'\n\nO texto trata principalmente de:",
        "alternativa_a": "A história do Brasil",
        "alternativa_b": "O sistema educacional brasileiro",
        "alternativa_c": "A desigualdade social no país",
        "alternativa_d": "A economia brasileira",
        "alternativa_e": "A população brasileira",
        "gabarito": "C"
    },
    # D7 - Identificar a tese de um texto
    {
        "codigo": "D7",
        "enunciado": "'A educação é o principal instrumento de transformação social. Países que investem em ensino de qualidade apresentam melhores índices de desenvolvimento humano, menor criminalidade e maior prosperidade econômica.'\n\nA tese defendida no texto é que:",
        "alternativa_a": "A criminalidade aumenta com a educação",
        "alternativa_b": "A educação transforma a sociedade",
        "alternativa_c": "Países ricos não investem em educação",
        "alternativa_d": "O desenvolvimento humano independe da educação",
        "alternativa_e": "A economia não depende da educação",
        "gabarito": "B"
    },
    {
        "codigo": "D7",
        "enunciado": "'O uso excessivo de agrotóxicos prejudica não apenas o meio ambiente, mas também a saúde humana. Estudos comprovam que a exposição a essas substâncias pode causar doenças graves.'\n\nA tese do autor é que:",
        "alternativa_a": "Agrotóxicos são necessários para a agricultura",
        "alternativa_b": "O uso excessivo de agrotóxicos é prejudicial",
        "alternativa_c": "A saúde humana não é afetada por agrotóxicos",
        "alternativa_d": "O meio ambiente se adapta aos agrotóxicos",
        "alternativa_e": "Estudos não comprovam os malefícios",
        "gabarito": "B"
    },
    # D8 - Relação entre tese e argumentos
    {
        "codigo": "D8",
        "enunciado": "'A prática regular de exercícios físicos é essencial para a saúde. Ela reduz o risco de doenças cardiovasculares, melhora o humor e aumenta a disposição para as atividades diárias.'\n\nOs argumentos que sustentam a tese são:",
        "alternativa_a": "Apenas a redução de doenças",
        "alternativa_b": "Redução de doenças, melhora do humor e aumento da disposição",
        "alternativa_c": "Somente o aumento da disposição",
        "alternativa_d": "Nenhum argumento é apresentado",
        "alternativa_e": "A prática de exercícios",
        "gabarito": "B"
    },
    # D9 - Diferenciar partes principais das secundárias
    {
        "codigo": "D9",
        "enunciado": "'O Brasil, país de dimensões continentais localizado na América do Sul, possui uma das maiores biodiversidades do planeta.'\n\nA informação principal do texto é:",
        "alternativa_a": "O Brasil fica na América do Sul",
        "alternativa_b": "O Brasil tem dimensões continentais",
        "alternativa_c": "O Brasil possui grande biodiversidade",
        "alternativa_d": "O Brasil é um país",
        "alternativa_e": "A localização do Brasil",
        "gabarito": "C"
    },
    # D10 - Identificar conflito gerador do enredo
    {
        "codigo": "D10",
        "enunciado": "'João sonhava em ser médico, mas sua família não tinha condições de pagar a faculdade. Determinado, ele estudou durante anos e conseguiu uma bolsa de estudos integral.'\n\nO conflito central da narrativa é:",
        "alternativa_a": "O sonho de João",
        "alternativa_b": "A falta de recursos financeiros para estudar",
        "alternativa_c": "Os anos de estudo",
        "alternativa_d": "A bolsa de estudos",
        "alternativa_e": "A profissão de médico",
        "gabarito": "B"
    },
    # D11 - Relação causa/consequência
    {
        "codigo": "D11",
        "enunciado": "'Em virtude das fortes chuvas, diversas ruas da cidade ficaram alagadas.'\n\nA causa dos alagamentos foi:",
        "alternativa_a": "As ruas da cidade",
        "alternativa_b": "As fortes chuvas",
        "alternativa_c": "A falta de manutenção",
        "alternativa_d": "O trânsito intenso",
        "alternativa_e": "A poluição",
        "gabarito": "B"
    },
    {
        "codigo": "D11",
        "enunciado": "'O desmatamento da Amazônia tem provocado mudanças climáticas significativas na região.'\n\nA consequência do desmatamento mencionada é:",
        "alternativa_a": "O aumento da floresta",
        "alternativa_b": "Mudanças climáticas",
        "alternativa_c": "A preservação ambiental",
        "alternativa_d": "O crescimento econômico",
        "alternativa_e": "A proteção da fauna",
        "gabarito": "B"
    },
    # D12 - Identificar finalidade de textos
    {
        "codigo": "D12",
        "enunciado": "'EDITAL DE CONCURSO PÚBLICO\nA Prefeitura Municipal abre inscrições para o preenchimento de 50 vagas para diversos cargos...'\n\nA finalidade desse texto é:",
        "alternativa_a": "Narrar uma história",
        "alternativa_b": "Informar sobre vagas em concurso público",
        "alternativa_c": "Vender um produto",
        "alternativa_d": "Entreter o leitor",
        "alternativa_e": "Criticar o governo",
        "gabarito": "B"
    },
    # D13 - Marcas linguísticas do locutor/interlocutor
    {
        "codigo": "D13",
        "enunciado": "'Prezado Cliente,\nInformamos que sua fatura vence no dia 15 do corrente mês. Caso já tenha efetuado o pagamento, favor desconsiderar este comunicado.'\n\nO texto foi escrito por:",
        "alternativa_a": "Um amigo do cliente",
        "alternativa_b": "Uma empresa ou instituição",
        "alternativa_c": "Um familiar",
        "alternativa_d": "Um colega de trabalho",
        "alternativa_e": "Um vizinho",
        "gabarito": "B"
    },
    # D14 - Distinguir fato de opinião
    {
        "codigo": "D14",
        "enunciado": "Leia:\n\n1. O Brasil tem mais de 200 milhões de habitantes.\n2. O Brasil é o melhor país para se viver.\n\nQual afirmação expressa uma OPINIÃO?",
        "alternativa_a": "Apenas a afirmação 1",
        "alternativa_b": "Apenas a afirmação 2",
        "alternativa_c": "Ambas as afirmações",
        "alternativa_d": "Nenhuma das afirmações",
        "alternativa_e": "Não é possível identificar",
        "gabarito": "B"
    },
    {
        "codigo": "D14",
        "enunciado": "'A peça de teatro teve duração de duas horas e foi, sem dúvida, a melhor apresentação do ano.'\n\nA OPINIÃO do autor está em:",
        "alternativa_a": "A peça de teatro",
        "alternativa_b": "Duração de duas horas",
        "alternativa_c": "Foi a melhor apresentação do ano",
        "alternativa_d": "Ambas as informações são fatos",
        "alternativa_e": "Não há opinião no texto",
        "gabarito": "C"
    },
    # D15 - Relações lógico-discursivas
    {
        "codigo": "D15",
        "enunciado": "'Embora tenha estudado muito, não conseguiu aprovação no exame.'\n\nA palavra 'embora' expressa ideia de:",
        "alternativa_a": "Causa",
        "alternativa_b": "Consequência",
        "alternativa_c": "Concessão/oposição",
        "alternativa_d": "Conclusão",
        "alternativa_e": "Adição",
        "gabarito": "C"
    },
    {
        "codigo": "D15",
        "enunciado": "'O projeto foi aprovado, portanto as obras terão início em breve.'\n\nA palavra 'portanto' indica:",
        "alternativa_a": "Oposição",
        "alternativa_b": "Conclusão",
        "alternativa_c": "Adição",
        "alternativa_d": "Alternância",
        "alternativa_e": "Condição",
        "gabarito": "B"
    },
    # D16 - Efeitos de ironia ou humor
    {
        "codigo": "D16",
        "enunciado": "'O político prometeu acabar com a corrupção. Imagino que ele vá começar por si mesmo...'\n\nO efeito de sentido produzido é de:",
        "alternativa_a": "Elogio ao político",
        "alternativa_b": "Ironia, sugerindo que o político é corrupto",
        "alternativa_c": "Admiração pela promessa",
        "alternativa_d": "Confiança no político",
        "alternativa_e": "Neutralidade",
        "gabarito": "B"
    },
    # D17 - Efeito de sentido da pontuação
    {
        "codigo": "D17",
        "enunciado": "Compare:\n\n1. O professor disse: o aluno é inteligente.\n2. O professor, disse o aluno, é inteligente.\n\nA diferença de sentido é que:",
        "alternativa_a": "Em 1, o professor elogia o aluno; em 2, o aluno elogia o professor",
        "alternativa_b": "As frases têm o mesmo sentido",
        "alternativa_c": "Em 1, o aluno elogia o professor",
        "alternativa_d": "Em 2, o professor elogia o aluno",
        "alternativa_e": "Não há diferença",
        "gabarito": "A"
    },
    # D18 - Efeito de sentido da escolha de palavras
    {
        "codigo": "D18",
        "enunciado": "'O atleta venceu a corrida' / 'O atleta esmagou a concorrência na corrida'\n\nA segunda frase, ao usar 'esmagou', transmite a ideia de:",
        "alternativa_a": "Vitória apertada",
        "alternativa_b": "Vitória por larga vantagem",
        "alternativa_c": "Derrota do atleta",
        "alternativa_d": "Empate na corrida",
        "alternativa_e": "Desistência do atleta",
        "gabarito": "B"
    },
    # D19 - Efeito de recursos ortográficos/morfossintáticos
    {
        "codigo": "D19",
        "enunciado": "'SOCORRO! PRECISO DE AJUDA URGENTE!!!'\n\nO uso de letras maiúsculas e exclamações indica:",
        "alternativa_a": "Calma e tranquilidade",
        "alternativa_b": "Desespero e urgência",
        "alternativa_c": "Indiferença",
        "alternativa_d": "Alegria",
        "alternativa_e": "Formalidade",
        "gabarito": "B"
    },
    # D20 - Reconhecer diferentes formas de tratar uma informação
    {
        "codigo": "D20",
        "enunciado": "Jornal A: 'Manifestantes ocupam avenida em protesto pacífico'\nJornal B: 'Baderneiros bloqueiam trânsito e causam transtornos'\n\nOs textos tratam do mesmo evento com:",
        "alternativa_a": "A mesma perspectiva",
        "alternativa_b": "Perspectivas diferentes - um favorável, outro desfavorável",
        "alternativa_c": "Total neutralidade",
        "alternativa_d": "Informações contraditórias",
        "alternativa_e": "Eventos diferentes",
        "gabarito": "B"
    },
    # D21 - Reconhecer posições distintas sobre o mesmo tema
    {
        "codigo": "D21",
        "enunciado": "Texto 1: 'A redução da maioridade penal é necessária para combater a criminalidade juvenil.'\nTexto 2: 'Reduzir a maioridade penal não resolve o problema; é preciso investir em educação.'\n\nOs textos apresentam:",
        "alternativa_a": "A mesma opinião",
        "alternativa_b": "Opiniões opostas sobre a maioridade penal",
        "alternativa_c": "Informações complementares",
        "alternativa_d": "Dados estatísticos",
        "alternativa_e": "Neutralidade sobre o tema",
        "gabarito": "B"
    },
]

# Banco de questões - Matemática 9º Ano
QUESTOES_MAT_9 = [
    # D1 - Localização/movimentação em mapas
    {
        "codigo": "D1",
        "enunciado": "No mapa de uma cidade, a escola está localizada no ponto (3, 4) do plano cartesiano. A biblioteca fica 2 unidades à direita e 3 unidades acima da escola. Qual é a posição da biblioteca?",
        "alternativa_a": "(1, 1)",
        "alternativa_b": "(5, 7)",
        "alternativa_c": "(5, 1)",
        "alternativa_d": "(1, 7)",
        "alternativa_e": "(6, 6)",
        "gabarito": "B"
    },
    # D2 - Figuras bidimensionais e tridimensionais
    {
        "codigo": "D2",
        "enunciado": "Uma pirâmide de base quadrada tem quantas faces no total?",
        "alternativa_a": "3 faces",
        "alternativa_b": "4 faces",
        "alternativa_c": "5 faces",
        "alternativa_d": "6 faces",
        "alternativa_e": "8 faces",
        "gabarito": "C"
    },
    {
        "codigo": "D2",
        "enunciado": "Um prisma de base hexagonal possui quantas arestas?",
        "alternativa_a": "12 arestas",
        "alternativa_b": "15 arestas",
        "alternativa_c": "18 arestas",
        "alternativa_d": "20 arestas",
        "alternativa_e": "24 arestas",
        "gabarito": "C"
    },
    # D3 - Propriedades de triângulos
    {
        "codigo": "D3",
        "enunciado": "Em um triângulo, os ângulos internos medem 60°, 60° e 60°. Esse triângulo é classificado como:",
        "alternativa_a": "Escaleno",
        "alternativa_b": "Isósceles",
        "alternativa_c": "Equilátero",
        "alternativa_d": "Retângulo",
        "alternativa_e": "Obtusângulo",
        "gabarito": "C"
    },
    {
        "codigo": "D3",
        "enunciado": "Um triângulo tem lados medindo 3 cm, 4 cm e 5 cm. Esse triângulo é:",
        "alternativa_a": "Equilátero",
        "alternativa_b": "Isósceles",
        "alternativa_c": "Escaleno e retângulo",
        "alternativa_d": "Escaleno e obtusângulo",
        "alternativa_e": "Isósceles e retângulo",
        "gabarito": "C"
    },
    # D4 - Relação entre quadriláteros
    {
        "codigo": "D4",
        "enunciado": "Todo quadrado é um retângulo, mas nem todo retângulo é um quadrado. Essa afirmação é:",
        "alternativa_a": "Falsa",
        "alternativa_b": "Verdadeira",
        "alternativa_c": "Parcialmente verdadeira",
        "alternativa_d": "Impossível de verificar",
        "alternativa_e": "Contraditória",
        "gabarito": "B"
    },
    # D5 - Ampliação e redução de figuras
    {
        "codigo": "D5",
        "enunciado": "Uma figura foi ampliada na razão 3:1. Se o lado original media 4 cm, qual será a medida do lado ampliado?",
        "alternativa_a": "7 cm",
        "alternativa_b": "12 cm",
        "alternativa_c": "16 cm",
        "alternativa_d": "1,33 cm",
        "alternativa_e": "4 cm",
        "gabarito": "B"
    },
    # D6 - Ângulos
    {
        "codigo": "D6",
        "enunciado": "Dois ângulos são suplementares. Se um deles mede 70°, quanto mede o outro?",
        "alternativa_a": "20°",
        "alternativa_b": "70°",
        "alternativa_c": "90°",
        "alternativa_d": "110°",
        "alternativa_e": "180°",
        "gabarito": "D"
    },
    {
        "codigo": "D6",
        "enunciado": "Dois ângulos são complementares. Se um deles mede 35°, quanto mede o outro?",
        "alternativa_a": "35°",
        "alternativa_b": "45°",
        "alternativa_c": "55°",
        "alternativa_d": "65°",
        "alternativa_e": "145°",
        "gabarito": "C"
    },
    # D7 - Transformação homotética
    {
        "codigo": "D7",
        "enunciado": "Uma figura foi reduzida por uma homotetia de razão 1/2. Se a área original era 100 cm², qual é a área da figura reduzida?",
        "alternativa_a": "50 cm²",
        "alternativa_b": "25 cm²",
        "alternativa_c": "200 cm²",
        "alternativa_d": "100 cm²",
        "alternativa_e": "10 cm²",
        "gabarito": "B"
    },
    # D8 - Propriedades dos polígonos
    {
        "codigo": "D8",
        "enunciado": "A soma dos ângulos internos de um hexágono é:",
        "alternativa_a": "360°",
        "alternativa_b": "540°",
        "alternativa_c": "720°",
        "alternativa_d": "900°",
        "alternativa_e": "1080°",
        "gabarito": "C"
    },
    {
        "codigo": "D8",
        "enunciado": "Quantas diagonais tem um octógono?",
        "alternativa_a": "8",
        "alternativa_b": "12",
        "alternativa_c": "16",
        "alternativa_d": "20",
        "alternativa_e": "24",
        "gabarito": "D"
    },
    # D9 - Coordenadas cartesianas
    {
        "codigo": "D9",
        "enunciado": "O ponto P(-3, 4) está localizado em qual quadrante do plano cartesiano?",
        "alternativa_a": "Primeiro quadrante",
        "alternativa_b": "Segundo quadrante",
        "alternativa_c": "Terceiro quadrante",
        "alternativa_d": "Quarto quadrante",
        "alternativa_e": "Sobre o eixo x",
        "gabarito": "B"
    },
    # D10 - Relações métricas no triângulo retângulo
    {
        "codigo": "D10",
        "enunciado": "Em um triângulo retângulo, os catetos medem 6 cm e 8 cm. Qual é a medida da hipotenusa?",
        "alternativa_a": "7 cm",
        "alternativa_b": "10 cm",
        "alternativa_c": "12 cm",
        "alternativa_d": "14 cm",
        "alternativa_e": "48 cm",
        "gabarito": "B"
    },
    {
        "codigo": "D10",
        "enunciado": "Uma escada de 5 metros está apoiada em uma parede, com sua base a 3 metros da parede. A que altura a escada toca a parede?",
        "alternativa_a": "2 metros",
        "alternativa_b": "3 metros",
        "alternativa_c": "4 metros",
        "alternativa_d": "6 metros",
        "alternativa_e": "8 metros",
        "gabarito": "C"
    },
    # D11 - Círculo/circunferência
    {
        "codigo": "D11",
        "enunciado": "Uma circunferência tem raio de 7 cm. Qual é o seu diâmetro?",
        "alternativa_a": "3,5 cm",
        "alternativa_b": "7 cm",
        "alternativa_c": "14 cm",
        "alternativa_d": "21 cm",
        "alternativa_e": "49 cm",
        "gabarito": "C"
    },
    # D12 - Perímetro
    {
        "codigo": "D12",
        "enunciado": "Qual é o perímetro de um triângulo equilátero cujo lado mede 8 cm?",
        "alternativa_a": "16 cm",
        "alternativa_b": "24 cm",
        "alternativa_c": "32 cm",
        "alternativa_d": "48 cm",
        "alternativa_e": "64 cm",
        "gabarito": "B"
    },
    # D13 - Área
    {
        "codigo": "D13",
        "enunciado": "Qual é a área de um triângulo com base 10 cm e altura 6 cm?",
        "alternativa_a": "16 cm²",
        "alternativa_b": "30 cm²",
        "alternativa_c": "60 cm²",
        "alternativa_d": "32 cm²",
        "alternativa_e": "36 cm²",
        "gabarito": "B"
    },
    {
        "codigo": "D13",
        "enunciado": "Um terreno retangular tem 25 metros de comprimento e 18 metros de largura. Qual é sua área?",
        "alternativa_a": "43 m²",
        "alternativa_b": "86 m²",
        "alternativa_c": "225 m²",
        "alternativa_d": "450 m²",
        "alternativa_e": "324 m²",
        "gabarito": "D"
    },
    # D14 - Volume
    {
        "codigo": "D14",
        "enunciado": "Qual é o volume de um cubo com aresta de 5 cm?",
        "alternativa_a": "15 cm³",
        "alternativa_b": "25 cm³",
        "alternativa_c": "75 cm³",
        "alternativa_d": "125 cm³",
        "alternativa_e": "150 cm³",
        "gabarito": "D"
    },
    {
        "codigo": "D14",
        "enunciado": "Uma caixa d'água tem formato de paralelepípedo com dimensões 2m x 3m x 1,5m. Qual é sua capacidade em litros?",
        "alternativa_a": "6.000 litros",
        "alternativa_b": "9.000 litros",
        "alternativa_c": "12.000 litros",
        "alternativa_d": "90 litros",
        "alternativa_e": "900 litros",
        "gabarito": "B"
    },
    # D15 - Unidades de medida
    {
        "codigo": "D15",
        "enunciado": "Quantos metros quadrados tem um terreno de 2,5 hectares?",
        "alternativa_a": "250 m²",
        "alternativa_b": "2.500 m²",
        "alternativa_c": "25.000 m²",
        "alternativa_d": "250.000 m²",
        "alternativa_e": "2.500.000 m²",
        "gabarito": "C"
    },
    # D16 - Números inteiros na reta numérica
    {
        "codigo": "D16",
        "enunciado": "Na reta numérica, qual número está entre -5 e -3?",
        "alternativa_a": "-6",
        "alternativa_b": "-2",
        "alternativa_c": "-4",
        "alternativa_d": "0",
        "alternativa_e": "4",
        "gabarito": "C"
    },
    # D17 - Números racionais na reta numérica
    {
        "codigo": "D17",
        "enunciado": "Qual fração está localizada entre 0 e 1 na reta numérica?",
        "alternativa_a": "3/2",
        "alternativa_b": "5/4",
        "alternativa_c": "2/3",
        "alternativa_d": "7/5",
        "alternativa_e": "4/3",
        "gabarito": "C"
    },
    # D18 - Cálculos com números inteiros
    {
        "codigo": "D18",
        "enunciado": "Calcule: (-8) × (-3) + (-10) =",
        "alternativa_a": "14",
        "alternativa_b": "-14",
        "alternativa_c": "34",
        "alternativa_d": "-34",
        "alternativa_e": "24",
        "gabarito": "A"
    },
    {
        "codigo": "D18",
        "enunciado": "Calcule: 15 - 20 + 8 - 3 =",
        "alternativa_a": "0",
        "alternativa_b": "-10",
        "alternativa_c": "10",
        "alternativa_d": "46",
        "alternativa_e": "-46",
        "gabarito": "A"
    },
    # D19 - Problemas com números naturais
    {
        "codigo": "D19",
        "enunciado": "Uma escola tem 840 alunos distribuídos igualmente em 24 turmas. Quantos alunos há em cada turma?",
        "alternativa_a": "32 alunos",
        "alternativa_b": "35 alunos",
        "alternativa_c": "38 alunos",
        "alternativa_d": "40 alunos",
        "alternativa_e": "42 alunos",
        "gabarito": "B"
    },
    # D20 - Problemas com números inteiros
    {
        "codigo": "D20",
        "enunciado": "A temperatura de uma cidade às 6h era -3°C. Ao meio-dia, havia subido 12°C. Qual era a temperatura ao meio-dia?",
        "alternativa_a": "-15°C",
        "alternativa_b": "-9°C",
        "alternativa_c": "9°C",
        "alternativa_d": "15°C",
        "alternativa_e": "12°C",
        "gabarito": "C"
    },
    # D21 - Representações de números racionais
    {
        "codigo": "D21",
        "enunciado": "Qual das alternativas representa o mesmo valor que 0,75?",
        "alternativa_a": "1/4",
        "alternativa_b": "2/4",
        "alternativa_c": "3/4",
        "alternativa_d": "4/5",
        "alternativa_e": "7/5",
        "gabarito": "C"
    },
    # D22 - Fração como representação
    {
        "codigo": "D22",
        "enunciado": "Se 3/5 de uma quantia é R$ 120,00, qual é o valor total?",
        "alternativa_a": "R$ 72,00",
        "alternativa_b": "R$ 150,00",
        "alternativa_c": "R$ 180,00",
        "alternativa_d": "R$ 200,00",
        "alternativa_e": "R$ 240,00",
        "gabarito": "D"
    },
    # D23 - Frações equivalentes
    {
        "codigo": "D23",
        "enunciado": "Qual fração é equivalente a 4/6?",
        "alternativa_a": "2/4",
        "alternativa_b": "3/5",
        "alternativa_c": "8/12",
        "alternativa_d": "6/8",
        "alternativa_e": "5/7",
        "gabarito": "C"
    },
    # D24 - Representações decimais
    {
        "codigo": "D24",
        "enunciado": "A fração 5/8 em forma decimal é:",
        "alternativa_a": "0,58",
        "alternativa_b": "0,625",
        "alternativa_c": "0,85",
        "alternativa_d": "1,6",
        "alternativa_e": "0,5",
        "gabarito": "B"
    },
    # D25 - Operações com racionais
    {
        "codigo": "D25",
        "enunciado": "Calcule: 2/3 + 1/4 =",
        "alternativa_a": "3/7",
        "alternativa_b": "3/12",
        "alternativa_c": "11/12",
        "alternativa_d": "8/12",
        "alternativa_e": "1/2",
        "gabarito": "C"
    },
    {
        "codigo": "D25",
        "enunciado": "Calcule: 3/4 × 2/5 =",
        "alternativa_a": "5/9",
        "alternativa_b": "6/20",
        "alternativa_c": "5/20",
        "alternativa_d": "6/9",
        "alternativa_e": "3/10",
        "gabarito": "E"
    },
    # D26 - Problemas com racionais
    {
        "codigo": "D26",
        "enunciado": "Maria gastou 2/5 do seu salário com aluguel e 1/4 com alimentação. Que fração do salário ela gastou?",
        "alternativa_a": "3/9",
        "alternativa_b": "3/20",
        "alternativa_c": "13/20",
        "alternativa_d": "7/9",
        "alternativa_e": "1/2",
        "gabarito": "C"
    },
    # D27 - Radicais
    {
        "codigo": "D27",
        "enunciado": "Calcule: √49 + √16 =",
        "alternativa_a": "11",
        "alternativa_b": "13",
        "alternativa_c": "√65",
        "alternativa_d": "65",
        "alternativa_e": "15",
        "gabarito": "A"
    },
    # D28 - Porcentagem
    {
        "codigo": "D28",
        "enunciado": "Um produto custava R$ 80,00 e teve um aumento de 15%. Qual é o novo preço?",
        "alternativa_a": "R$ 92,00",
        "alternativa_b": "R$ 95,00",
        "alternativa_c": "R$ 88,00",
        "alternativa_d": "R$ 68,00",
        "alternativa_e": "R$ 120,00",
        "gabarito": "A"
    },
    {
        "codigo": "D28",
        "enunciado": "Em uma prova com 40 questões, um aluno acertou 32. Qual foi sua porcentagem de acertos?",
        "alternativa_a": "32%",
        "alternativa_b": "60%",
        "alternativa_c": "75%",
        "alternativa_d": "80%",
        "alternativa_e": "85%",
        "gabarito": "D"
    },
    # D29 - Proporcionalidade
    {
        "codigo": "D29",
        "enunciado": "Se 5 operários fazem um trabalho em 12 dias, em quantos dias 10 operários farão o mesmo trabalho?",
        "alternativa_a": "24 dias",
        "alternativa_b": "6 dias",
        "alternativa_c": "10 dias",
        "alternativa_d": "15 dias",
        "alternativa_e": "8 dias",
        "gabarito": "B"
    },
    {
        "codigo": "D29",
        "enunciado": "Um carro percorre 240 km com 20 litros de gasolina. Quantos litros serão necessários para percorrer 360 km?",
        "alternativa_a": "25 litros",
        "alternativa_b": "28 litros",
        "alternativa_c": "30 litros",
        "alternativa_d": "35 litros",
        "alternativa_e": "40 litros",
        "gabarito": "C"
    },
    # D30 - Valor numérico de expressão algébrica
    {
        "codigo": "D30",
        "enunciado": "Calcule o valor de 3x² - 2x + 1 para x = 2:",
        "alternativa_a": "5",
        "alternativa_b": "7",
        "alternativa_c": "9",
        "alternativa_d": "11",
        "alternativa_e": "13",
        "gabarito": "C"
    },
    # D31 - Equação do 2º grau
    {
        "codigo": "D31",
        "enunciado": "Quais são as raízes da equação x² - 5x + 6 = 0?",
        "alternativa_a": "x = 1 e x = 6",
        "alternativa_b": "x = 2 e x = 3",
        "alternativa_c": "x = -2 e x = -3",
        "alternativa_d": "x = 1 e x = 5",
        "alternativa_e": "x = -1 e x = 6",
        "gabarito": "B"
    },
    # D32 - Expressão algébrica de sequências
    {
        "codigo": "D32",
        "enunciado": "Na sequência 3, 6, 9, 12, 15, ..., qual expressão representa o termo de posição n?",
        "alternativa_a": "n + 3",
        "alternativa_b": "3n",
        "alternativa_c": "n × n",
        "alternativa_d": "2n + 1",
        "alternativa_e": "n + 2",
        "gabarito": "B"
    },
    # D33 - Equação/inequação do 1º grau
    {
        "codigo": "D33",
        "enunciado": "João tem o triplo da idade de Maria. Se a soma das idades é 48 anos, qual equação representa o problema (sendo x a idade de Maria)?",
        "alternativa_a": "x + x = 48",
        "alternativa_b": "3x + x = 48",
        "alternativa_c": "x + 3 = 48",
        "alternativa_d": "3x - x = 48",
        "alternativa_e": "x × 3 = 48",
        "gabarito": "B"
    },
    # D34 - Sistema de equações
    {
        "codigo": "D34",
        "enunciado": "A soma de dois números é 20 e a diferença é 4. Qual sistema representa o problema?",
        "alternativa_a": "x + y = 20 e x × y = 4",
        "alternativa_b": "x + y = 20 e x - y = 4",
        "alternativa_c": "x - y = 20 e x + y = 4",
        "alternativa_d": "2x = 20 e 2y = 4",
        "alternativa_e": "x + y = 4 e x - y = 20",
        "gabarito": "B"
    },
    # D35 - Representação algébrica e geométrica de sistemas
    {
        "codigo": "D35",
        "enunciado": "Duas retas se cruzam em um único ponto no plano cartesiano. O que isso significa para o sistema de equações que elas representam?",
        "alternativa_a": "O sistema não tem solução",
        "alternativa_b": "O sistema tem uma única solução",
        "alternativa_c": "O sistema tem infinitas soluções",
        "alternativa_d": "As retas são paralelas",
        "alternativa_e": "As retas são coincidentes",
        "gabarito": "B"
    },
    # D36 - Informações em tabelas e gráficos
    {
        "codigo": "D36",
        "enunciado": "Um gráfico de barras mostra as vendas de uma loja:\nJan: 150, Fev: 200, Mar: 180, Abr: 220\n\nEm qual mês as vendas foram maiores?",
        "alternativa_a": "Janeiro",
        "alternativa_b": "Fevereiro",
        "alternativa_c": "Março",
        "alternativa_d": "Abril",
        "alternativa_e": "Todos iguais",
        "gabarito": "D"
    },
    # D37 - Associar tabelas a gráficos
    {
        "codigo": "D37",
        "enunciado": "Uma tabela mostra que a empresa A vendeu 40%, a B vendeu 35% e a C vendeu 25% do total. Qual gráfico representa corretamente esses dados?",
        "alternativa_a": "Gráfico de pizza com A sendo o maior setor",
        "alternativa_b": "Gráfico de pizza com C sendo o maior setor",
        "alternativa_c": "Gráfico de barras com A menor que C",
        "alternativa_d": "Gráfico de pizza com todos os setores iguais",
        "alternativa_e": "Gráfico de barras com B maior que A",
        "gabarito": "A"
    },
]

def criar_excel_questoes_9ano():
    """Cria arquivo Excel com banco de questões do 9º ano"""
    wb = openpyxl.Workbook()
    
    # Estilos
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2E7D32", end_color="2E7D32", fill_type="solid")
    alt_fill = PatternFill(start_color="C8E6C9", end_color="C8E6C9", fill_type="solid")
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Criar abas
    ws_port9 = wb.active
    ws_port9.title = "Português 9º Ano"
    
    ws_mat9 = wb.create_sheet("Matemática 9º Ano")
    
    # Cabeçalhos
    headers = ["Código Descritor", "Enunciado", "Alternativa A", "Alternativa B", 
               "Alternativa C", "Alternativa D", "Alternativa E", "Gabarito", "Bloco"]
    
    def preencher_aba(ws, questoes, disciplina, ano):
        # Adicionar cabeçalhos
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = border
        
        # Adicionar questões
        row = 2
        bloco = 1
        questoes_bloco = 0
        
        for q in questoes:
            # Alternar bloco a cada ~13 questões (padrão 9º ano)
            if questoes_bloco >= 13:
                bloco = 2
            
            ws.cell(row=row, column=1, value=q["codigo"]).border = border
            ws.cell(row=row, column=2, value=q["enunciado"]).border = border
            ws.cell(row=row, column=3, value=q["alternativa_a"]).border = border
            ws.cell(row=row, column=4, value=q["alternativa_b"]).border = border
            ws.cell(row=row, column=5, value=q["alternativa_c"]).border = border
            ws.cell(row=row, column=6, value=q["alternativa_d"]).border = border
            ws.cell(row=row, column=7, value=q["alternativa_e"]).border = border
            ws.cell(row=row, column=8, value=q["gabarito"]).border = border
            ws.cell(row=row, column=9, value=f"BLOCO_{bloco}").border = border
            
            # Aplicar cor alternada
            if row % 2 == 0:
                for col in range(1, 10):
                    ws.cell(row=row, column=col).fill = alt_fill
            
            # Wrap text para enunciado
            ws.cell(row=row, column=2).alignment = Alignment(wrap_text=True, vertical="top")
            
            row += 1
            questoes_bloco += 1
        
        # Ajustar larguras das colunas
        ws.column_dimensions['A'].width = 15
        ws.column_dimensions['B'].width = 60
        ws.column_dimensions['C'].width = 30
        ws.column_dimensions['D'].width = 30
        ws.column_dimensions['E'].width = 30
        ws.column_dimensions['F'].width = 30
        ws.column_dimensions['G'].width = 30
        ws.column_dimensions['H'].width = 10
        ws.column_dimensions['I'].width = 12
        
        # Altura das linhas
        ws.row_dimensions[1].height = 30
        for r in range(2, row):
            ws.row_dimensions[r].height = 80
    
    # Preencher abas
    preencher_aba(ws_port9, QUESTOES_PORT_9, "PORTUGUES", 9)
    preencher_aba(ws_mat9, QUESTOES_MAT_9, "MATEMATICA", 9)
    
    # Salvar arquivo
    filename = "banco_questoes_saeb_9ano.xlsx"
    wb.save(filename)
    print(f"Arquivo '{filename}' criado com sucesso!")
    print(f"- Português 9º Ano: {len(QUESTOES_PORT_9)} questões")
    print(f"- Matemática 9º Ano: {len(QUESTOES_MAT_9)} questões")
    print(f"Total: {len(QUESTOES_PORT_9) + len(QUESTOES_MAT_9)} questões")
    return filename

if __name__ == "__main__":
    criar_excel_questoes_9ano()
