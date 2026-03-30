const websiteTemplates = {
  // Cats template
  cats: {
    title: 'Мурлыка',
    theme: 'warm',
    colors: {
      primary: '#ff6b6b',
      secondary: '#feca57', 
      accent: '#ff9ff3',
      bg: '#fff5f5',
      text: '#2d3436'
    },
    hero: {
      title: 'Мурлыка',
      subtitle: 'Мир кошек: породы, уход, советы',
      description: 'Узнайте всё о пушистых друзьях. От британцев до мейн-кунов — находите информацию о породах, уходе и здоровье ваших любимцев.',
      emoji: '🐱'
    },
    sections: [
      {
        title: 'Популярные породы',
        items: [
          { title: 'Британская', desc: 'Спокойные и ласковые компаньоны с плотной шерстью', icon: 'cat' },
          { title: 'Мейн-кун', desc: 'Гиганты с добрым сердцем и пушистым хвостом', icon: 'paw' },
          { title: 'Сиамская', desc: 'Элегантные и разговорчивые красавицы', icon: 'heart' },
          { title: 'Шотландская', desc: 'Милые вислоухие мурлыки', icon: 'star' }
        ]
      },
      {
        title: 'Уход и здоровье',
        items: [
          { title: 'Питание', desc: 'Сбалансированное питание для здоровья кошки', icon: 'utensils' },
          { title: 'Груминг', desc: 'Уход за шерстью, когтями и зубами', icon: 'cut' },
          { title: 'Ветеринар', desc: 'Прививки, осмотры и профилактика', icon: 'stethoscope' }
        ]
      }
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400', alt: 'Кошка' },
      { url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400', alt: 'Котёнок' },
      { url: 'https://images.unsplash.com/photo-1495360019602-e001922271fe?w=400', alt: 'Мейн-кун' }
    ]
  },

  // Dogs template
  dogs: {
    title: 'Верные Друзья',
    theme: 'friendly',
    colors: {
      primary: '#e17055',
      secondary: '#fdcb6e',
      accent: '#6c5ce7',
      bg: '#fff9f0',
      text: '#2d3436'
    },
    hero: {
      title: 'Верные Друзья',
      subtitle: 'Всё о собаках: породы, дрессировка, уход',
      description: 'Собаки — наши лучшие друзья. Узнайте о разных породах, как воспитывать щенка и ухаживать за питомцем.',
      emoji: '🐕'
    },
    sections: [
      {
        title: 'Породы собак',
        items: [
          { title: 'Лабрадор', desc: 'Дружелюбные и энергичные семейные собаки', icon: 'dog' },
          { title: 'Немецкая овчарка', desc: 'Умные и преданные защитники', icon: 'shield-alt' },
          { title: 'Бигль', desc: 'Весёлые и любопытные охотники', icon: 'bone' },
          { title: 'Хаски', desc: 'Красивые и энергичные северные собаки', icon: 'snowflake' }
        ]
      },
      {
        title: 'Дрессировка',
        items: [
          { title: 'Основы', desc: 'Базовые команды: сидеть, лежать, рядом', icon: 'graduation-cap' },
          { title: 'Социализация', desc: 'Как приучить щенка к людям и животным', icon: 'users' },
          { title: 'Проблемы', desc: 'Решение типичных проблем поведения', icon: 'tools' }
        ]
      }
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400', alt: 'Собака' },
      { url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400', alt: 'Щенок' },
      { url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400', alt: 'Собаки' }
    ]
  },

  // Cooking template
  cooking: {
    title: 'Вкус Жизни',
    theme: 'tasty',
    colors: {
      primary: '#00b894',
      secondary: '#fdcb6e',
      accent: '#e17055',
      bg: '#f0fff4',
      text: '#2d3436'
    },
    hero: {
      title: 'Вкус Жизни',
      subtitle: 'Рецепты для вдохновения на кухне',
      description: 'Простые и вкусные рецепты на каждый день. От завтрака за 5 минут до праздничного ужина.',
      emoji: '👨‍🍳'
    },
    sections: [
      {
        title: 'Категории',
        items: [
          { title: 'Завтраки', desc: 'Энергия на весь день с утра', icon: 'coffee' },
          { title: 'Обеды', desc: 'Сытные и полезные блюда', icon: 'utensils' },
          { title: 'Ужины', desc: 'Лёгкие рецепты для вечера', icon: 'moon' },
          { title: 'Десерты', desc: 'Сладкие радости для души', icon: 'cookie' }
        ]
      },
      {
        title: 'Популярные рецепты',
        items: [
          { title: 'Паста Карбонара', desc: 'Классическая итальянская паста с беконом', icon: 'fire' },
          { title: 'Цезарь с курицей', desc: 'Салат, который полюбил весь мир', icon: 'leaf' },
          { title: 'Борщ', desc: 'Традиционный украинский суп', icon: 'mortar-pestle' }
        ]
      }
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', alt: 'Еда' },
      { url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400', alt: 'Завтрак' },
      { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', alt: 'Пицца' }
    ]
  },

  // Travel template
  travel: {
    title: 'Вокруг Света',
    theme: 'adventure',
    colors: {
      primary: '#0984e3',
      secondary: '#74b9ff',
      accent: '#00cec9',
      bg: '#f0f9ff',
      text: '#2d3436'
    },
    hero: {
      title: 'Вокруг Света',
      subtitle: 'Открывайте мир вместе с нами',
      description: 'Лучшие направления, советы путешественникам и вдохновляющие истории. Ваше следующее приключение начинается здесь.',
      emoji: '✈️'
    },
    sections: [
      {
        title: 'Популярные направления',
        items: [
          { title: 'Париж', desc: 'Город любви, света и круассанов', icon: 'landmark' },
          { title: 'Токио', desc: 'Где традиции встречают будущее', icon: 'torii-gate' },
          { title: 'Мальдивы', desc: 'Райские острова в Индийском океане', icon: 'umbrella-beach' },
          { title: 'Нью-Йорк', desc: 'Город, который никогда не спит', icon: 'city' }
        ]
      },
      {
        title: 'Советы путешественникам',
        items: [
          { title: 'Планирование', desc: 'Как составить идеальный маршрут', icon: 'map' },
          { title: 'Бюджет', desc: 'Путешествуйте больше, тратя меньше', icon: 'wallet' },
          { title: 'Безопасность', desc: 'Важные советы для безопасных поездок', icon: 'shield-alt' }
        ]
      }
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400', alt: 'Путешествие' },
      { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400', alt: 'Пляж' },
      { url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400', alt: 'Горы' }
    ]
  },

  // Tech template
  tech: {
    title: 'ТехноМир',
    theme: 'modern',
    colors: {
      primary: '#6c5ce7',
      secondary: '#a29bfe',
      accent: '#00cec9',
      bg: '#f8f9ff',
      text: '#2d3436'
    },
    hero: {
      title: 'ТехноМир',
      subtitle: 'Технологии, которые меняют будущее',
      description: 'Новости IT, обзоры гаджетов, инновации и тренды. Будьте в курсе технологического прогресса.',
      emoji: '💻'
    },
    sections: [
      {
        title: 'Технологии',
        items: [
          { title: 'AI и ML', desc: 'Искусственный интеллект в нашей жизни', icon: 'brain' },
          { title: 'Смартфоны', desc: 'Обзоры и сравнения новинок', icon: 'mobile-alt' },
          { title: 'Гаджеты', desc: 'Устройства, делающие жизнь проще', icon: 'watch' },
          { title: 'Игры', desc: 'Последние новости игровой индустрии', icon: 'gamepad' }
        ]
      },
      {
        title: 'Новости',
        items: [
          { title: 'Apple', desc: 'Всё о продуктах и экосистеме Apple', icon: 'apple-alt' },
          { title: 'Google', desc: 'Android, сервисы и разработки', icon: 'google' },
          { title: 'Tesla', desc: 'Электромобили и технологии Илона Маска', icon: 'car' }
        ]
      }
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400', alt: 'Технологии' },
      { url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', alt: 'Ноутбук' },
      { url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400', alt: 'Гаджеты' }
    ]
  },

  // Nature template
  nature: {
    title: 'Природа',
    theme: 'eco',
    colors: {
      primary: '#00b894',
      secondary: '#55efc4',
      accent: '#00cec9',
      bg: '#f0fff4',
      text: '#2d3436'
    },
    hero: {
      title: 'Природа',
      subtitle: 'Красота и гармония окружающего мира',
      description: 'Исследуйте удивительный мир природы. Леса, горы, океаны и животные нашей планеты.',
      emoji: '🌿'
    },
    sections: [
      {
        title: 'Мир природы',
        items: [
          { title: 'Леса', desc: 'Лёгкие планеты и дом миллионов видов', icon: 'tree' },
          { title: 'Океаны', desc: 'Глубины, полные жизни и загадок', icon: 'water' },
          { title: 'Горы', desc: 'Величественные вершины Земли', icon: 'mountain' },
          { title: 'Пустыни', desc: 'Суровые, но прекрасные ландшафты', icon: 'sun' }
        ]
      },
      {
        title: 'Экология',
        items: [
          { title: 'Сохранение', desc: 'Как защитить природу вместе', icon: 'hands-helping' },
          { title: 'Устойчивость', desc: 'Экологичный образ жизни', icon: 'recycle' },
          { title: 'Животные', desc: 'Защита исчезающих видов', icon: 'paw' }
        ]
      }
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400', alt: 'Лес' },
      { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400', alt: 'Природа' },
      { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', alt: 'Горы' }
    ]
  },

  // Music template
  music: {
    title: 'Меломания',
    theme: 'rhythm',
    colors: {
      primary: '#e84393',
      secondary: '#fd79a8',
      accent: '#6c5ce7',
      bg: '#fff5f7',
      text: '#2d3436'
    },
    hero: {
      title: 'Меломания',
      subtitle: 'Музыка для каждого момента',
      description: 'Откройте для себя новые жанры, исполнителей и плейлисты. Музыка, которая вдохновляет.',
      emoji: '🎵'
    },
    sections: [
      {
        title: 'Жанры',
        items: [
          { title: 'Поп', desc: 'Хиты, которые задают тренды', icon: 'star' },
          { title: 'Рок', desc: 'Энергия гитар и мощь барабанов', icon: 'guitar' },
          { title: 'Джаз', desc: 'Импровизация и душа музыки', icon: 'saxophone' },
          { title: 'Классика', desc: 'Вечная музыка великих композиторов', icon: 'violin' }
        ]
      },
      {
        title: 'Для вас',
        items: [
          { title: 'Новинки', desc: 'Свежие треки каждую неделю', icon: 'sparkles' },
          { title: 'Плейлисты', desc: 'Подборки под любое настроение', icon: 'list-music' },
          { title: 'Концерты', desc: 'Ближайшие выступления в вашем городе', icon: 'ticket-alt' }
        ]
      }
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', alt: 'Музыка' },
      { url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', alt: 'Концерт' },
      { url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', alt: 'Студия' }
    ]
  },

  // Fitness template
  fitness: {
    title: 'Активная Жизнь',
    theme: 'sport',
    colors: {
      primary: '#e17055',
      secondary: '#fab1a0',
      accent: '#00b894',
      bg: '#fff8f6',
      text: '#2d3436'
    },
    hero: {
      title: 'Активная Жизнь',
      subtitle: 'Двигайтесь к лучшей версии себя',
      description: 'Фитнес, здоровье и активный образ жизни. Тренировки, питание и мотивация для результатов.',
      emoji: '💪'
    },
    sections: [
      {
        title: 'Тренировки',
        items: [
          { title: 'Кардио', desc: 'Укрепление сердца и выносливости', icon: 'heartbeat' },
          { title: 'Силовые', desc: 'Набор мышечной массы и силы', icon: 'dumbbell' },
          { title: 'Йога', desc: 'Гибкость, баланс и внутренний покой', icon: 'om' },
          { title: 'Бег', desc: 'Самый доступный вид спорта', icon: 'running' }
        ]
      },
      {
        title: 'Здоровье',
        items: [
          { title: 'Питание', desc: 'Правильное питание для энергии', icon: 'apple-alt' },
          { title: 'Сон', desc: 'Как высыпаться и восстанавливаться', icon: 'bed' },
          { title: 'Вода', desc: 'Важность гидратации организма', icon: 'tint' }
        ]
      }
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', alt: 'Фитнес' },
      { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', alt: 'Тренировка' },
      { url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400', alt: 'Йога' }
    ]
  },

  // Pets template
  pets: {
    title: 'Мир Питомцев',
    category: 'animals',
    theme: 'cute',
    colors: { primary: '#fd79a8', secondary: '#fab1a0', accent: '#a29bfe', bg: '#fff0f5', text: '#2d3436' },
    hero: {
      title: 'Мир Питомцев',
      subtitle: 'Всё о домашних животных',
      description: 'Советы по уходу за питомцами, интересные факты и полезная информация для владельцев.',
      emoji: '🐾'
    },
    sections: [
      { title: 'Питомцы', items: [
        { title: 'Кошки', desc: 'Независимые и ласковые компаньоны', icon: 'cat' },
        { title: 'Собаки', desc: 'Верные друзья и защитники', icon: 'dog' },
        { title: 'Грызуны', desc: 'Милые и неприхотливые питомцы', icon: 'mouse' },
        { title: 'Птицы', desc: 'Яркие и разговорчивые друзья', icon: 'dove' }
      ]},
      { title: 'Уход', items: [
        { title: 'Кормление', desc: 'Правильное питание для каждого вида', icon: 'bowl-food' },
        { title: 'Здоровье', desc: 'Профилактика и уход', icon: 'heartbeat' },
        { title: 'Игры', desc: 'Развлечения для питомцев', icon: 'baseball-ball' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800', alt: 'Питомцы' },
      { url: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800', alt: 'Хомяк' },
      { url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800', alt: 'Попугай' }
    ]
  },

  // Baking template
  baking: {
    title: 'Сладкая Жизнь',
    category: 'food',
    theme: 'sweet',
    colors: { primary: '#e84393', secondary: '#fd79a8', accent: '#fdcb6e', bg: '#fff5f7', text: '#2d3436' },
    hero: {
      title: 'Сладкая Жизнь',
      subtitle: 'Выпечка и десерты для души',
      description: 'Рецепты тортов, пирогов, печенья и других вкусностей. Готовьте с удовольствием!',
      emoji: '🧁'
    },
    sections: [
      { title: 'Выпечка', items: [
        { title: 'Торты', desc: 'Праздничные и повседневные', icon: 'birthday-cake' },
        { title: 'Пироги', desc: 'Сладкие и солёные начинки', icon: 'chart-pie' },
        { title: 'Печенье', desc: 'Хрустящее домашнее', icon: 'cookie-bite' },
        { title: 'Хлеб', desc: 'Ароматный домашний', icon: 'bread-slice' }
      ]},
      { title: 'Техники', items: [
        { title: 'Тесто', desc: 'Все виды теста и секреты', icon: 'flour' },
        { title: 'Кремы', desc: 'Вкусные начинки', icon: 'ice-cream' },
        { title: 'Украшение', desc: 'Красивое оформление', icon: 'paint-brush' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', alt: 'Торт' },
      { url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800', alt: 'Печенье' },
      { url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', alt: 'Хлеб' }
    ]
  },

  // Coffee template
  coffee: {
    title: 'Coffee House',
    category: 'food',
    theme: 'cozy',
    colors: { primary: '#6d4c41', secondary: '#8d6e63', accent: '#a1887f', bg: '#efebe9', text: '#3e2723' },
    hero: {
      title: 'Coffee House',
      subtitle: 'Мир кофе и уюта',
      description: 'Всё о кофе: сорта, способы приготовления, рецепты напитков и секреты бариста.',
      emoji: '☕'
    },
    sections: [
      { title: 'Напитки', items: [
        { title: 'Эспрессо', desc: 'Классический крепкий кофе', icon: 'mug-hot' },
        { title: 'Капучино', desc: 'Нежный с молочной пенкой', icon: 'cloud' },
        { title: 'Латте', desc: 'Мягкий молочный кофе', icon: 'glass-water' },
        { title: 'Американо', desc: 'Лёгкий и освежающий', icon: 'tint' }
      ]},
      { title: 'Знания', items: [
        { title: 'Сорта', desc: 'Арабика и робуста', icon: 'seedling' },
        { title: 'Обжарка', desc: 'Степени обжарки зёрен', icon: 'fire' },
        { title: 'Методы', desc: 'Варианты заваривания', icon: 'filter' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', alt: 'Кофе' },
      { url: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=800', alt: 'Кофейня' },
      { url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800', alt: 'Зёрна' }
    ]
  },

  // Portfolio template
  portfolio: {
    title: 'Portfolio',
    category: 'business',
    theme: 'creative',
    colors: { primary: '#2d3436', secondary: '#636e72', accent: '#00b894', bg: '#ffffff', text: '#2d3436' },
    hero: {
      title: 'Portfolio',
      subtitle: 'Творческие работы и проекты',
      description: 'Коллекция моих лучших работ. Дизайн, разработка, фотография и многое другое.',
      emoji: '🎨'
    },
    sections: [
      { title: 'Навыки', items: [
        { title: 'Дизайн', desc: 'UI/UX, графический дизайн, брендинг', icon: 'paint-brush' },
        { title: 'Разработка', desc: 'Frontend, backend, мобильные приложения', icon: 'code' },
        { title: 'Фото', desc: 'Портретная, предметная съёмка', icon: 'camera' },
        { title: 'Видео', desc: 'Монтаж, цветокоррекция, motion', icon: 'video' }
      ]},
      { title: 'Услуги', items: [
        { title: 'Веб-дизайн', desc: 'Создание современных сайтов', icon: 'desktop' },
        { title: 'Разработка', desc: 'Полный цикл создания проектов', icon: 'rocket' },
        { title: 'Консультации', desc: 'Помощь в развитии бизнеса', icon: 'comments' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800', alt: 'Дизайн' },
      { url: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800', alt: 'Работа' },
      { url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800', alt: 'Проект' }
    ]
  },

  // Business template
  business: {
    title: 'Business Pro',
    category: 'business',
    theme: 'corporate',
    colors: { primary: '#0984e3', secondary: '#74b9ff', accent: '#00cec9', bg: '#f8f9fa', text: '#2d3436' },
    hero: {
      title: 'Business Pro',
      subtitle: 'Профессиональные решения для бизнеса',
      description: 'Консалтинг, аналитика и стратегическое планирование для роста вашего бизнеса.',
      emoji: '💼'
    },
    sections: [
      { title: 'Услуги', items: [
        { title: 'Стратегия', desc: 'Разработка бизнес-стратегий', icon: 'chess' },
        { title: 'Аналитика', desc: 'Глубокий анализ рынка', icon: 'chart-line' },
        { title: 'Маркетинг', desc: 'Эффективное продвижение', icon: 'bullhorn' },
        { title: 'Финансы', desc: 'Управление финансами', icon: 'coins' }
      ]},
      { title: 'Преимущества', items: [
        { title: 'Опыт', desc: 'Более 10 лет на рынке', icon: 'award' },
        { title: 'Команда', desc: '50+ экспертов', icon: 'users' },
        { title: 'Результаты', desc: '500+ успешных проектов', icon: 'trophy' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', alt: 'Офис' },
      { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', alt: 'Команда' },
      { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800', alt: 'Работа' }
    ]
  },

  // Fashion template
  fashion: {
    title: 'Style Studio',
    category: 'lifestyle',
    theme: 'trendy',
    colors: { primary: '#e84393', secondary: '#fd79a8', accent: '#a29bfe', bg: '#fff5f8', text: '#2d3436' },
    hero: {
      title: 'Style Studio',
      subtitle: 'Мода, стиль и красота',
      description: 'Тренды, советы по стилю и вдохновение для создания вашего уникального образа.',
      emoji: '👗'
    },
    sections: [
      { title: 'Направления', items: [
        { title: 'Мода', desc: 'Актуальные тренды и луки', icon: 'tshirt' },
        { title: 'Красота', desc: 'Уход за собой и макияж', icon: 'magic' },
        { title: 'Аксессуары', desc: 'Сумки, украшения, обувь', icon: 'gem' },
        { title: 'Стиль', desc: 'Советы стилистов', icon: 'star' }
      ]},
      { title: 'Сезоны', items: [
        { title: 'Весна', desc: 'Свежие образы', icon: 'cloud-sun' },
        { title: 'Лето', desc: 'Лёгкие ткани', icon: 'sun' },
        { title: 'Осень', desc: 'Тёплые оттенки', icon: 'leaf' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800', alt: 'Мода' },
      { url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800', alt: 'Стиль' },
      { url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800', alt: 'Одежда' }
    ]
  },

  // Education template
  education: {
    title: 'LearnHub',
    category: 'education',
    theme: 'knowledge',
    colors: { primary: '#6c5ce7', secondary: '#a29bfe', accent: '#00cec9', bg: '#f8f9ff', text: '#2d3436' },
    hero: {
      title: 'LearnHub',
      subtitle: 'Образование и развитие',
      description: 'Курсы, туториалы и материалы для саморазвития. Учитесь вместе с нами!',
      emoji: '📚'
    },
    sections: [
      { title: 'Направления', items: [
        { title: 'Программирование', desc: 'Python, JavaScript, Java', icon: 'laptop-code' },
        { title: 'Дизайн', desc: 'UI/UX, графика, 3D', icon: 'palette' },
        { title: 'Бизнес', desc: 'Маркетинг, финансы, управление', icon: 'briefcase' },
        { title: 'Языки', desc: 'Английский, немецкий, французский', icon: 'language' }
      ]},
      { title: 'Форматы', items: [
        { title: 'Видео', desc: 'Понятные видеоуроки', icon: 'play-circle' },
        { title: 'Текст', desc: 'Подробные статьи', icon: 'book' },
        { title: 'Практика', desc: 'Задания и проекты', icon: 'tasks' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', alt: 'Обучение' },
      { url: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800', alt: 'Книги' },
      { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800', alt: 'Онлайн' }
    ]
  },

  // Movies template
  movies: {
    title: 'Cinema World',
    category: 'entertainment',
    theme: 'cinematic',
    colors: { primary: '#2d3436', secondary: '#636e72', accent: '#e17055', bg: '#1a1a2e', text: '#ffffff' },
    hero: {
      title: 'Cinema World',
      subtitle: 'Мир кино и сериалов',
      description: 'Обзоры фильмов, рецензии, новости киноиндустрии и рекомендации что посмотреть.',
      emoji: '🎬'
    },
    sections: [
      { title: 'Жанры', items: [
        { title: 'Боевики', desc: 'Динамичные и захватывающие', icon: 'bomb' },
        { title: 'Драмы', desc: 'Глубокие и эмоциональные', icon: 'theater-masks' },
        { title: 'Комедии', desc: 'Смешные и позитивные', icon: 'laugh-beam' },
        { title: 'Фантастика', desc: 'Невероятные миры', icon: 'rocket' }
      ]},
      { title: 'Разделы', items: [
        { title: 'Новинки', desc: 'Свежие релизы', icon: 'film' },
        { title: 'Топы', desc: 'Лучшие фильмы', icon: 'trophy' },
        { title: 'Актеры', desc: 'Звёзды кино', icon: 'user-star' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800', alt: 'Кино' },
      { url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800', alt: 'Попкорн' },
      { url: 'https://images.unsplash.com/photo-1517604931442-7105398bd636?w=800', alt: 'Проектор' }
    ]
  },

  // Gaming template
  gaming: {
    title: 'GameZone',
    category: 'entertainment',
    theme: 'neon',
    colors: { primary: '#8e44ad', secondary: '#9b59b6', accent: '#00cec9', bg: '#1a1a2e', text: '#ffffff' },
    hero: {
      title: 'GameZone',
      subtitle: 'Мир видеоигр',
      description: 'Обзоры игр, гайды, новости индустрии и лучшие рекомендации для геймеров.',
      emoji: '🎮'
    },
    sections: [
      { title: 'Жанры', items: [
        { title: 'RPG', desc: 'Ролевые приключения', icon: 'scroll' },
        { title: 'Шутеры', desc: 'Динамичные бои', icon: 'crosshairs' },
        { title: 'Стратегии', desc: 'Тактическое мышление', icon: 'chess' },
        { title: 'Инди', desc: 'Уникальные проекты', icon: 'gamepad' }
      ]},
      { title: 'Платформы', items: [
        { title: 'PC', desc: 'Мастер-рейса', icon: 'desktop' },
        { title: 'PlayStation', desc: 'Эксклюзивы Sony', icon: 'play' },
        { title: 'Xbox', desc: 'Игры Microsoft', icon: 'xbox' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', alt: 'Геймер' },
      { url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800', alt: 'Игры' },
      { url: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0d?w=800', alt: 'Консоль' }
    ]
  },

  // Health template
  health: {
    title: 'Здоровье+',
    category: 'health',
    theme: 'medical',
    colors: { primary: '#00b894', secondary: '#55efc4', accent: '#0984e3', bg: '#f0fff9', text: '#2d3436' },
    hero: {
      title: 'Здоровье+',
      subtitle: 'Забота о вашем здоровье',
      description: 'Медицинская информация, советы по профилактике и здоровому образу жизни.',
      emoji: '🏥'
    },
    sections: [
      { title: 'Направления', items: [
        { title: 'Профилактика', desc: 'Предупреждение болезней', icon: 'shield-virus' },
        { title: 'Питание', desc: 'Здоровое питание', icon: 'carrot' },
        { title: 'Спорт', desc: 'Физическая активность', icon: 'running' },
        { title: 'Психология', desc: 'Ментальное здоровье', icon: 'brain' }
      ]},
      { title: 'Советы', items: [
        { title: 'Сон', desc: 'Качественный отдых', icon: 'bed' },
        { title: 'Стресс', desc: 'Управление стрессом', icon: 'spa' },
        { title: 'Витамины', desc: 'Полезные добавки', icon: 'pills' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800', alt: 'Здоровье' },
      { url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', alt: 'Фитнес' },
      { url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800', alt: 'Еда' }
    ]
  },

  // Photography template
  photography: {
    title: 'PhotoArt',
    category: 'creative',
    theme: 'artistic',
    colors: { primary: '#2d3436', secondary: '#636e72', accent: '#e17055', bg: '#ffffff', text: '#2d3436' },
    hero: {
      title: 'PhotoArt',
      subtitle: 'Искусство фотографии',
      description: 'Советы по съёмке, обработке и композиции. Учитесь делать потрясающие фотографии.',
      emoji: '📷'
    },
    sections: [
      { title: 'Направления', items: [
        { title: 'Портрет', desc: 'Съёмка людей', icon: 'user' },
        { title: 'Пейзаж', desc: 'Природа и города', icon: 'image' },
        { title: 'Макро', desc: 'Крупный план', icon: 'search-plus' },
        { title: 'Уличная', desc: 'Street photography', icon: 'road' }
      ]},
      { title: 'Техника', items: [
        { title: 'Камеры', desc: 'Выбор оборудования', icon: 'camera' },
        { title: 'Объективы', desc: 'Разные фокусные расстояния', icon: 'circle' },
        { title: 'Lightroom', desc: 'Обработка снимков', icon: 'sliders-h' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800', alt: 'Камера' },
      { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800', alt: 'Фото' },
      { url: 'https://images.unsplash.com/photo-1500634245200-e5245c7574ef?w=800', alt: 'Объектив' }
    ]
  },

  // Default fallback
  default: {
    title: 'Вдохновение',
    category: 'general',
    theme: 'clean',
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      bg: '#f8fafc',
      text: '#1e293b'
    },
    hero: {
      title: 'Вдохновение',
      subtitle: 'Откройте для себя что-то новое',
      description: 'Качественный контент и современный подход к каждой теме. Исследуйте, учитесь, вдохновляйтесь.',
      emoji: '✨'
    },
    sections: [
      {
        title: 'Возможности',
        items: [
          { title: 'Инновации', desc: 'Современные решения для современных задач', icon: 'lightbulb' },
          { title: 'Качество', desc: 'Только проверенная и полезная информация', icon: 'check-circle' },
          { title: 'Сообщество', desc: 'Присоединяйтесь к единомышленникам', icon: 'users' },
          { title: 'Развитие', desc: 'Растите вместе с нами каждый день', icon: 'chart-line' }
        ]
      },
      {
        title: 'Особенности',
        items: [
          { title: 'Быстрота', desc: 'Всё работает быстро и без сбоев', icon: 'bolt' },
          { title: 'Надёжность', desc: 'Стабильность и безопасность на первом месте', icon: 'shield-alt' },
          { title: 'Поддержка', desc: 'Мы всегда рядом, если нужна помощь', icon: 'headset' }
        ]
      }
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', alt: 'Офис' },
      { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', alt: 'Команда' },
      { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800', alt: 'Работа' }
    ]
  }
};

// Template metadata for detection
const templateKeywords = {
  cats: ['кот', 'кошк', 'cat', 'котят', 'мурк', 'мяу', 'kitty', 'kitten', 'feline', 'пушистик', 'мурлыка'],
  dogs: ['собак', 'dog', 'пёс', 'пес', 'щенк', 'песик', 'бульдог', 'лабрадор', 'овчарка', 'пудель', 'хаски', 'маламут', 'puppy', 'canine', 'hound'],
  pets: ['питомц', 'животн', 'звер', 'pet', 'animal', 'hamster', 'rabbit', 'bird', 'fish', 'хомяк', 'кролик', 'попугай'],
  cooking: ['кулинар', 'рецепт', 'готовить', 'еду', 'еда', 'кухн', 'блюд', 'пищ', 'завтрак', 'обед', 'ужин', 'десерт', 'food', 'cook', 'recipe', 'meal', 'kitchen'],
  baking: ['выпечк', 'торт', 'пирог', 'печенье', 'хлеб', 'cake', 'baking', 'bread', 'pastry', 'dessert'],
  coffee: ['кофе', 'coffee', 'espresso', 'latte', 'cappuccino', 'barista', 'cafe', 'кофейн'],
  travel: ['путешеств', 'travel', 'туризм', 'отдых', 'отпуск', 'поездк', 'тур', 'пляж', 'море', 'горы', 'trip', 'vacation', 'holiday', 'tour', 'hotel', 'beach'],
  tech: ['технолог', 'tech', 'it', 'ai', 'компьютер', 'программирование', 'код', 'смартфон', 'гаджет', 'software', 'hardware', 'app', 'digital'],
  nature: ['природ', 'nature', 'лес', 'парк', 'сад', 'цветы', 'растения', 'дерев', 'эколог', 'forest', 'garden', 'flower', 'eco', 'green'],
  music: ['музык', 'music', 'песн', 'альбом', 'исполнитель', 'групп', 'рок', 'поп', 'джаз', 'song', 'artist', 'band', 'concert'],
  fitness: ['спорт', 'fitness', 'тренировк', 'зал', 'фитнес', 'йог', 'бег', 'workout', 'gym', 'exercise', 'running', 'health'],
  portfolio: ['портфолио', 'portfolio', 'работы', 'проекты', 'design', 'творчеств', 'creative', 'art', 'фото работ'],
  business: ['бизнес', 'business', 'компания', 'company', 'услуги', 'services', 'консалтинг', 'consulting', 'корпоративн'],
  fashion: ['мода', 'fashion', 'одежда', 'style', 'стиль', 'красота', 'beauty', 'look', 'outfit', 'тренд'],
  education: ['образован', 'education', 'курсы', 'courses', 'учёба', 'learning', 'study', 'school', 'university', 'школа'],
  movies: ['кино', 'movies', 'фильм', 'film', 'сериал', 'series', 'movie', 'cinema', 'актер', 'actor', 'netflix'],
  gaming: ['игр', 'gaming', 'game', 'gamer', 'playstation', 'xbox', 'pc', 'steam', 'консоль', 'геймер'],
  health: ['здоровье', 'health', 'медицин', 'medicine', 'врач', 'doctor', 'болезн', 'disease', 'лечение', 'treatment'],
  photography: ['фото', 'photo', 'фотограф', 'photography', 'camera', 'камера', 'съёмка', 'shooting']
};

// Helper to detect template
function detectTemplate(description, intent = null) {
  const desc = description.toLowerCase();
  
  // Use intent if available for smarter detection
  if (intent && intent.category) {
    const categoryMap = {
      'animals': ['cats', 'dogs', 'pets'],
      'food': ['cooking', 'baking', 'coffee'],
      'travel': ['travel'],
      'tech': ['tech'],
      'business': ['business', 'portfolio'],
      'lifestyle': ['fashion'],
      'education': ['education'],
      'entertainment': ['movies', 'gaming'],
      'health': ['health', 'fitness'],
      'creative': ['photography']
    };
    
    const possibleTemplates = categoryMap[intent.category];
    if (possibleTemplates && possibleTemplates.length > 0) {
      // Return first matching template from category
      return possibleTemplates[0];
    }
  }
  
  // Fallback to keyword matching
  for (const [templateId, keywords] of Object.entries(templateKeywords)) {
    if (keywords.some(kw => desc.includes(kw))) {
      return templateId;
    }
  }
  
  return 'default';
}

// AI-powered intent analysis - makes the agent SMARTER
function analyzeIntent(description) {
  const desc = description.toLowerCase();
  
  // Extract primary topic (what the site is about)
  const stopWords = ['создай', 'сделай', 'сайт', 'про', 'веб', 'с', 'о', 'для', 'по', 'на', 'как', 'make', 'create', 'website', 'about', 'with', 'for'];
  let words = desc.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
  
  const primaryKeyword = words[0] || 'проект';
  const secondaryKeywords = words.slice(1, 4);
  
  // Detect category with confidence scoring
  let bestCategory = 'general';
  let maxScore = 0;
  
  const categoryPatterns = {
    'animals': {
      keywords: ['кот', 'кошк', 'собак', 'пес', 'питомец', 'животн', 'cat', 'dog', 'pet', 'animal'],
      weight: 1.0
    },
    'food': {
      keywords: ['рецепт', 'готовить', 'кухн', 'еда', 'кулинар', 'выпечк', 'кофе', 'cake', 'recipe', 'food', 'cook', 'coffee'],
      weight: 1.0
    },
    'travel': {
      keywords: ['путешеств', 'туризм', 'отдых', 'отпуск', 'поездк', 'travel', 'trip', 'vacation'],
      weight: 1.0
    },
    'tech': {
      keywords: ['технолог', 'программирование', 'код', 'компьютер', 'софт', 'tech', 'code', 'software'],
      weight: 1.0
    },
    'business': {
      keywords: ['бизнес', 'компания', 'услуг', 'консалтинг', 'business', 'company', 'service'],
      weight: 1.0
    },
    'fitness': {
      keywords: ['спорт', 'фитнес', 'тренировк', 'зал', 'workout', 'gym', 'fitness'],
      weight: 1.0
    },
    'education': {
      keywords: ['обучен', 'курс', 'школа', 'учёба', 'education', 'course', 'school'],
      weight: 1.0
    },
    'entertainment': {
      keywords: ['кино', 'фильм', 'игр', 'movie', 'game', 'cinema'],
      weight: 1.0
    },
    'health': {
      keywords: ['здоровье', 'медицин', 'врач', 'health', 'medical'],
      weight: 1.0
    }
  };
  
  for (const [category, data] of Object.entries(categoryPatterns)) {
    let score = 0;
    for (const kw of data.keywords) {
      if (desc.includes(kw)) {
        score += data.weight;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }
  
  // Detect sentiment/tone
  const tonePatterns = {
    'professional': ['бизнес', 'компания', 'услуг', 'professional', 'business', 'company'],
    'casual': ['хобби', 'увлечение', 'personal', 'hobby'],
    'educational': ['обучение', 'курс', 'учеба', 'learn', 'course'],
    'entertainment': ['развлечение', 'fun', 'game', 'play']
  };
  
  let tone = 'neutral';
  for (const [t, patterns] of Object.entries(tonePatterns)) {
    if (patterns.some(p => desc.includes(p))) {
      tone = t;
      break;
    }
  }
  
  return {
    primaryKeyword,
    secondaryKeywords,
    category: bestCategory,
    confidence: maxScore,
    tone,
    complexity: words.length > 5 ? 'detailed' : 'simple'
  };
}

module.exports = { templates: websiteTemplates, detectTemplate, analyzeIntent, templateKeywords };
