export type CategoryKey = 'immigration' | 'hospital' | 'supermarket' | 'restaurant' | 'dating' | 'nightlife';

export interface QAItem {
  question: string;
  answer: string;
}

export interface QASection {
  type: 'qa';
  heading: string;
  items: QAItem[];
}

export interface PhraseSection {
  type: 'phrases';
  heading: string;
  items: string[];
}

export type CategorySection = QASection | PhraseSection;

export interface CategoryDefinition {
  key: CategoryKey;
  title: string;
  description: string;
  roleInstruction: string;
  kickoffPrompt: string;
  register: 'formal' | 'informal';
  sections: CategorySection[];
}

export type TranslatedCategories = Record<CategoryKey, CategoryDefinition>;

export const CATEGORY_DEFINITIONS: Record<CategoryKey, CategoryDefinition> = {
  immigration: {
    key: 'immigration',
    title: 'Entrevista na imigração',
    description:
      'Pratique responder perguntas comuns durante a inspeção de imigração ao chegar em um novo país.',
    roleInstruction:
      'Aja como um agente de imigração cordial, porém atento, conduzindo a entrevista inicial com o viajante.',
    kickoffPrompt:
      'Vamos praticar uma entrevista de imigração. Eu serei o agente e você é o viajante chegando agora.',
    register: 'formal',
    sections: [
      {
        type: 'qa',
        heading: 'Perguntas essenciais',
        items: [
          { question: 'Qual é o motivo da sua viagem?', answer: 'Estou aqui a turismo por duas semanas.' },
          { question: 'Onde você ficará hospedado?', answer: 'Ficarei no Hotel Central, no centro da cidade.' },
          { question: 'Quanto tempo pretende ficar no país?', answer: 'Permanecerei 14 dias e retorno no dia 20 de julho.' },
          { question: 'Você tem passagem de retorno?', answer: 'Sim, meu voo de volta está reservado para 20 de julho.' },
          { question: 'Quanto dinheiro você está trazendo?', answer: 'Tenho 1.500 dólares em espécie e cartões de crédito.' },
          { question: 'Você já visitou nosso país antes?', answer: 'Esta é a minha primeira visita.' },
          { question: 'Você tem familiares ou amigos aqui?', answer: 'Não, estou viajando sozinho.' },
          { question: 'Qual é a sua profissão?', answer: 'Sou analista de sistemas no Brasil.' },
          { question: 'Você trouxe alimentos ou produtos proibidos?', answer: 'Não, apenas itens pessoais e roupas.' },
          { question: 'Qual é o endereço da sua hospedagem?', answer: 'Rua Principal, 123, Hotel Central.' },
          { question: 'Você possui seguro viagem?', answer: 'Sim, tenho cobertura internacional pelo plano TravelCare.' },
          {
            question: 'Qual é o seu itinerário durante a estadia?',
            answer: 'Pretendo visitar museus, parques e os principais pontos turísticos.',
          },
        ],
      },
    ],
  },
  hospital: {
    key: 'hospital',
    title: 'Hospital',
    description:
      'Use frases úteis para explicar sintomas, pedir ajuda e responder perguntas em um pronto atendimento.',
    roleInstruction:
      'Comporte-se como um profissional de triagem em um hospital, ajudando o paciente a descrever sintomas e oferecendo orientações.',
    kickoffPrompt:
      'Estamos em um hospital. Eu serei o profissional de triagem e vou ajudá-lo a explicar seus sintomas.',
    register: 'formal',
    sections: [
      {
        type: 'qa',
        heading: 'Perguntas de triagem',
        items: [
          { question: 'Qual é o problema principal hoje?', answer: 'Estou sentindo dores fortes no estômago desde ontem.' },
          { question: 'Quando os sintomas começaram?', answer: 'Começaram há cerca de doze horas.' },
          { question: 'Você tem alergia a algum medicamento?', answer: 'Não tenho alergias conhecidas.' },
          { question: 'Você está tomando algum remédio agora?', answer: 'Estou tomando apenas um analgésico leve.' },
          { question: 'Você tem febre ou calafrios?', answer: 'Sim, tive febre durante a noite.' },
          { question: 'Como você avaliaria sua dor de zero a dez?', answer: 'Diria que a dor está em oito.' },
          { question: 'Você já passou por alguma cirurgia recente?', answer: 'Não, nunca fiz cirurgia.' },
          {
            question: 'Você tem alguma condição médica crônica?',
            answer: 'Tenho pressão alta controlada com medicamentos.',
          },
        ],
      },
      {
        type: 'phrases',
        heading: 'Sintomas para mencionar',
        items: [
          'Estou com tontura e visão turva.',
          'Tenho dificuldade para respirar.',
          'Sinto dormência no braço esquerdo.',
          'Estou com náusea e falta de apetite.',
          'Tenho tosse seca há vários dias.',
          'Meu joelho está inchado e quente.',
        ],
      },
    ],
  },
  supermarket: {
    key: 'supermarket',
    title: 'Supermercado',
    description: 'Aprenda como pedir ajuda para encontrar itens comuns no mercado e praticar vocabulário de compras.',
    roleInstruction:
      'Finja ser um atendente prestativo de supermercado, oferecendo opções e recomendações de produtos.',
    kickoffPrompt: 'Estamos em um supermercado. Vou ajudá-lo a encontrar os itens da sua lista.',
    register: 'formal',
    sections: [
      {
        type: 'qa',
        heading: 'Assistência de compras',
        items: [
          { question: 'Posso ajudar a encontrar algum item específico?', answer: 'Sim, estou procurando frutas frescas, onde ficam?' },
          { question: 'Prefere refrigerantes sem açúcar?', answer: 'Sim, poderia me mostrar as opções sem açúcar?' },
          { question: 'Você procura produtos orgânicos?', answer: 'Sim, vocês têm verduras orgânicas?' },
          { question: 'Está escolhendo carnes para hoje?', answer: 'Estou procurando frango fresco para o jantar.' },
          { question: 'Deseja ver promoções da estação?', answer: 'Há promoções em frutas da estação?' },
          { question: 'Precisa pesar frutas?', answer: 'Pode pesar um quilo de bananas para mim?' },
          { question: 'Quer sugestões de temperos?', answer: 'Onde encontro temperos para o frango?' },
          { question: 'Deseja substituir algum item?', answer: 'Posso substituir o arroz por legumes cozidos?' },
          { question: 'Quer recomendação de bebidas para churrasco?', answer: 'Qual refrigerante você recomenda para acompanhar um churrasco?' },
          { question: 'Está comparando marcas?', answer: 'Qual é a diferença entre essas marcas de biscoito?' },
          { question: 'Procura a seção de enlatados?', answer: 'Pode me ajudar a encontrar sardinhas enlatadas?' },
          { question: 'Quer os mais vendidos?', answer: 'Onde estão os biscoitos mais populares?' },
        ],
      },
      {
        type: 'qa',
        heading: 'Frutas e verduras',
        items: [
          { question: 'Qual fruta está mais doce hoje?', answer: 'As mangas estão ótimas. Vocês têm mangas maduras?' },
          { question: 'Vocês têm alface americana?', answer: 'Sim, onde fica a seção de folhas?' },
          { question: 'Onde encontro tomates para salada?', answer: 'Estão na seção de hortifrúti. Pode me mostrar?' },
          { question: 'As bananas estão verdes ou maduras?', answer: 'Procuro bananas bem maduras.' },
          { question: 'Tem verduras orgânicas?', answer: 'Sim, preciso de cenoura e alface orgânicas.' },
          { question: 'O abacate está no ponto?', answer: 'Preciso de abacate maduro para hoje.' },
          { question: 'Onde encontro limões?', answer: 'Quero limões para fazer suco.' },
          { question: 'Tem recomendação para uma boa salada?', answer: 'Quero montar com rúcula, tomate e pepino.' },
        ],
      },
      {
        type: 'qa',
        heading: 'Produtos comuns',
        items: [
          { question: 'Onde fica o papel higiênico?', answer: 'No corredor cinco. Vou pegar um pacote grande.' },
          { question: 'Vocês têm absorventes noturnos?', answer: 'Sim, quero o noturno com abas.' },
          { question: 'Preciso de detergente e sabão em pó.', answer: 'Onde ficam os produtos de limpeza?' },
          { question: 'Tem promoções de água mineral?', answer: 'Qual é a marca em oferta hoje?' },
          { question: 'Onde encontro guardanapos e pratos descartáveis?', answer: 'Preciso para um churrasco.' },
          { question: 'Vocês vendem sacos de lixo reforçados?', answer: 'Quero os de 100 litros.' },
          { question: 'Tem pasta de dente e escova?', answer: 'Quero um kit básico.' },
          { question: 'Onde estão as pilhas?', answer: 'Preciso de AA para o controle remoto.' },
        ],
      },
      {
        type: 'qa',
        heading: 'Cortes de carne',
        items: [
          { question: 'Qual corte é melhor para churrasco?', answer: 'Quero picanha ou contra‑filé, 1 kg em bifes finos.' },
          { question: 'Vocês moem carne na hora?', answer: 'Sim, pode moer 500 g de patinho?' },
          { question: 'Tem frango desossado?', answer: 'Quero 1 kg de peito de frango em cubos.' },
          { question: 'Qual carne é boa para ensopado?', answer: 'Pode separar 800 g de acém?' },
          { question: 'Deseja tempero pronto?', answer: 'Prefiro sem tempero; vou marinar em casa.' },
          { question: 'Quer que embale a vácuo?', answer: 'Sim, por favor, para conservar melhor.' },
        ],
      },
      {
        type: 'phrases',
        heading: 'Pedidos úteis',
        items: [
          'Você pode me mostrar onde ficam as frutas frescas?',
          'Preciso encontrar verduras para fazer uma salada.',
          'Onde estão os biscoitos mais populares?',
          'Vocês têm refrigerantes sem açúcar?',
          'Pode me ajudar a localizar a seção de sardinhas enlatadas?',
          'Estou procurando frango fresco para o jantar.',
          'Tem alguma promoção em frutas da estação?',
          'Qual é a diferença entre essas marcas de biscoito?',
          'Pode pesar um quilo de bananas para mim?',
          'Vocês têm opções de verduras orgânicas?',
          'Qual refrigerante você recomenda para acompanhar um churrasco?',
          'Onde posso encontrar temperos para o frango?',
        ],
      },
    ],
  },
  restaurant: {
    key: 'restaurant',
    title: 'Restaurante',
    description:
      'Simule pedidos no restaurante e pratique como solicitar pratos e esclarecer preferências.',
    roleInstruction:
      'Aja como um garçom atencioso, sugerindo combinações e confirmando pedidos com o cliente.',
    kickoffPrompt:
      'Estamos em um restaurante. Sou o garçom e vou ajudá-lo a escolher o prato ideal.',
    register: 'formal',
    sections: [
      {
        type: 'qa',
        heading: 'Pedidos guiados',
        items: [
          { question: 'Mesa para quantas pessoas?', answer: 'Uma mesa para duas pessoas, por favor.' },
          { question: 'Já decidiram o pedido?', answer: 'Sim, eu gostaria de batatas fritas crocantes e um bife acebolado ao ponto médio.' },
          { question: 'Desejam alguma bebida?', answer: 'Gostaria de água com gás e um suco de limão.' },
          { question: 'Como prefere o ponto do bife?', answer: 'Ao ponto médio, por favor.' },
          { question: 'Alguma restrição ou alergia alimentar?', answer: 'Não, nenhuma alergia.' },
          { question: 'Desejam algum acompanhamento?', answer: 'Pode adicionar um purê de batata cremoso.' },
          { question: 'Desejam entradas antes do prato principal?', answer: 'Não, podemos ir direto ao prato principal.' },
          { question: 'Precisa de recomendação de prato ou bebida?', answer: 'Gostaria de uma recomendação de bebida que combine com o peixe.' },
          { question: 'Tudo certo com o prato?', answer: 'Sim, está muito bom.' },
          { question: 'Desejam sobremesa?', answer: 'Sim, uma porção de pudim de leite, por favor.' },
          { question: 'Posso trazer a conta?', answer: 'Sim, por favor, pode trazer a conta.' },
        ],
      },
      {
        type: 'phrases',
        heading: 'Pedidos comuns',
        items: [
          'Eu gostaria de pedir batatas fritas crocantes, por favor.',
          'Pode trazer um bife acebolado ao ponto médio?',
          'Quero uma porção de arroz branco.',
          'Você pode adicionar um purê de batata cremoso?',
          'Gostaria de um prato de peixe grelhado com limão.',
          'Tem alguma sugestão de acompanhamento para o bife?',
          'Pode servir as batatas fritas sem sal?',
          'O purê contém leite ou creme?',
          'Qual peixe está mais fresco hoje?',
          'Poderia trocar o arroz por legumes cozidos?',
          'Pode trazer molho extra para o frango?',
          'Gostaria de uma recomendação de bebida que combine com o peixe.',
        ],
      },
    ],
  },
  dating: {
    key: 'dating',
    title: 'Paquera',
    description: 'Treine conversas de paquera com tom descontraído usando gírias comuns.',
    roleInstruction:
      'Aja como um amigo nativo e professor, conduzindo uma conversa de paquera em tom casual com gírias do inglês americano.',
    kickoffPrompt:
      'Estamos em um bar tranquilo. Puxe assunto de forma leve, faça elogios sutis e mantenha respeito.',
    register: 'informal',
    sections: [
      {
        type: 'qa',
        heading: 'Aberturas e respostas',
        items: [
          { question: 'Posso te oferecer uma bebida?', answer: 'Claro, adoro um mojito. E você?' },
          { question: 'Você vem muito aqui?', answer: 'Às vezes, gosto do clima e da música.' },
          { question: 'O que você curte fazer no fim de semana?', answer: 'Normalmente saio com amigos ou vejo séries.' },
        ],
      },
      {
        type: 'phrases',
        heading: 'Expressões úteis',
        items: [
          'Curti seu estilo.',
          'Vamos dar uma volta lá fora?',
          'Me passa seu Instagram?',
          'Topa dançar mais tarde?',
        ],
      },
    ],
  },
  nightlife: {
    key: 'nightlife',
    title: 'Balada',
    description: 'Pratique interações rápidas na balada com linguagem informal e direta.',
    roleInstruction:
      'Finja estar em uma balada movimentada; fale de forma curta e casual, usando gírias e contrações.',
    kickoffPrompt:
      'Estamos em uma balada lotada. Vá direto ao ponto e mantenha a conversa divertida.',
    register: 'informal',
    sections: [
      {
        type: 'phrases',
        heading: 'Frases rápidas',
        items: [
          'Bora pegar algo pra beber?',
          'Essa música é muito boa!',
          'Vamos para um lugar mais tranquilo?',
          'Depois me chama no WhatsApp.',
        ],
      },
    ],
  },
};

export const CATEGORY_KEYS: CategoryKey[] = ['immigration', 'hospital', 'supermarket', 'restaurant', 'dating', 'nightlife'];

export const BASE_CATEGORY_LANGUAGE_NAME = 'Português (BR)';
