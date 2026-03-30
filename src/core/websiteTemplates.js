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

  // Education/Courses template with REAL content
  education: {
    title: 'Академия Знаний',
    category: 'education',
    theme: 'learning',
    colors: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#ec4899', bg: '#f8fafc', text: '#1e293b' },
    hero: {
      title: 'Академия Знаний',
      subtitle: 'Качественное образование для всех',
      description: 'Погружайтесь в мир знаний с нашими структурированными курсами. От основ до продвинутого уровня — учитесь в своём темпе.',
      emoji: '🎓'
    },
    sections: [
      { title: 'Образование', items: [
        { title: 'Курсы', desc: 'Структурированные программы обучения', icon: 'graduation-cap' },
        { title: 'Уроки', desc: 'Пошаговые материалы для изучения', icon: 'book-open' },
        { title: 'Практика', desc: 'Задания и упражнения', icon: 'pencil-alt' },
        { title: 'Тесты', desc: 'Проверка знаний', icon: 'clipboard-check' }
      ]},
      { title: 'Преимущества', items: [
        { title: 'Эксперты', desc: 'Материалы от профессионалов', icon: 'chalkboard-teacher' },
        { title: 'Доступность', desc: 'Учитесь в любое время', icon: 'clock' },
        { title: 'Сертификаты', desc: 'Подтверждение навыков', icon: 'certificate' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', alt: 'Образование' },
      { url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800', alt: 'Учеба' },
      { url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800', alt: 'Книги' }
    ],
    // Real course content structure
    courseContent: {
      math: {
        title: 'Математика',
        description: 'От арифметики до высшей математики',
        modules: [
          { title: 'Арифметика', lessons: ['Числа и операции', 'Дроби и проценты', 'Пропорции'] },
          { title: 'Алгебра', lessons: ['Уравнения', 'Функции', 'Многочлены'] },
          { title: 'Геометрия', lessons: ['Треугольники', 'Окружности', 'Площади'] }
        ]
      },
      physics: {
        title: 'Физика',
        description: 'Законы природы простым языком',
        modules: [
          { title: 'Механика', lessons: ['Кинематика', 'Динамика', 'Законы Ньютона'] },
          { title: 'Электричество', lessons: ['Электрический ток', 'Цепи', 'Магнетизм'] },
          { title: 'Оптика', lessons: ['Свет', 'Линзы', 'Волны'] }
        ]
      },
      programming: {
        title: 'Программирование',
        description: 'Код с нуля до первых проектов',
        modules: [
          { title: 'Основы', lessons: ['Переменные', 'Условия', 'Циклы'] },
          { title: 'Функции', lessons: ['Определение', 'Параметры', 'Рекурсия'] },
          { title: 'Структуры', lessons: ['Массивы', 'Объекты', 'Классы'] }
        ]
      }
    }
  },

  // Math Course - SPECIFIC template with real content
  math: {
    title: 'Математика Просто',
    category: 'education',
    theme: 'academic',
    colors: { primary: '#3b82f6', secondary: '#06b6d4', accent: '#8b5cf6', bg: '#f0f9ff', text: '#1e3a5f' },
    hero: {
      title: 'Математика Просто',
      subtitle: 'Понимай математику, а не зубри',
      description: 'Интерактивный курс от основ арифметики до тригонометрии. С примерами, задачами и объяснениями, которые реально работают.',
      emoji: '📐'
    },
    sections: [
      { title: 'Темы курса', items: [
        { title: 'Арифметика', desc: 'Числа, операции, дроби и проценты', icon: 'calculator' },
        { title: 'Алгебра', desc: 'Уравнения, формулы и графики', icon: 'square-root-alt' },
        { title: 'Геометрия', desc: 'Фигуры, площади и объёмы', icon: 'shapes' },
        { title: 'Тригонометрия', desc: 'Синусы, косинусы и тангенсы', icon: 'wave-square' }
      ]},
      { title: 'Для кого', items: [
        { title: 'Школьники', desc: 'Подготовка к контрольным и ЕГЭ', icon: 'school' },
        { title: 'Студенты', desc: 'Высшая математика по полочкам', icon: 'university' },
        { title: 'Взрослые', desc: 'Вспомнить школьную программу', icon: 'user-graduate' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800', alt: 'Математика' },
      { url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800', alt: 'Формулы' },
      { url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800', alt: 'Учёба' }
    ],
    // REAL course content
    lessons: [
      {
        id: 'arithmetic-1',
        title: 'Натуральные числа',
        content: 'Натуральные числа — это 1, 2, 3, 4, 5... и так до бесконечности. Они используются для счёта предметов. Самое маленькое натуральное число — 1, а самого большого не существует!',
        examples: ['5 яблок', '12 учеников', '100 рублей'],
        practice: ['Запиши 5 натуральных чисел больше 100', 'Какое число идёт после 999?']
      },
      {
        id: 'arithmetic-2',
        title: 'Сложение и вычитание',
        content: 'При сложении чисел мы находим их сумму. При вычитании — разность. Помни: от перестановки слагаемых сумма не меняется!',
        examples: ['15 + 7 = 22', '43 - 8 = 35', '100 + 25 = 125'],
        practice: ['Вычисли: 56 + 34', 'Сколько будет 100 - 27?']
      },
      {
        id: 'algebra-1',
        title: 'Что такое переменная',
        content: 'Переменная — это буква (обычно x или y), которая заменяет неизвестное число. Например, в уравнении x + 5 = 10, переменная x равна 5.',
        examples: ['x + 3 = 8 → x = 5', '2y = 10 → y = 5'],
        practice: ['Реши: x + 7 = 12', 'Найди y: 3y = 21']
      },
      {
        id: 'geometry-1',
        title: 'Треугольники',
        content: 'Треугольник — фигура с тремя сторонами и тремя углами. Сумма углов треугольника всегда равна 180°! Виды: остроугольный, прямоугольный, тупоугольный.',
        examples: ['Если два угла по 60°, то третий тоже 60°', 'Прямоугольный треугольник имеет угол 90°'],
        practice: ['Найди третий угол, если два угла 45° и 60°']
      },
      {
        id: 'fractions-1',
        title: 'Обыкновенные дроби',
        content: 'Дробь состоит из числителя (сверху) и знаменателя (снизу). Числитель показывает сколько частей взяли, а знаменатель — на сколько частей разделили целое.',
        examples: ['½ — половина', '¼ — четверть', '¾ — три четверти'],
        practice: ['Нарисуй круг, раздели на 4 части, закрась ¾']
      },
      {
        id: 'percent-1',
        title: 'Проценты',
        content: 'Процент (%) — это сотая часть числа. 100% = целое. Чтобы найти 1% от числа, делим на 100. Чтобы найти 10%, делим на 10.',
        examples: ['10% от 200 = 20', '25% от 80 = 20', '50% — это половина'],
        practice: ['Найди 20% от 150', 'Сколько процентов составляет 15 от 60?']
      }
    ]
  },

  // Physics Course - with real content
  physics: {
    title: 'Физика Окружающего Мира',
    category: 'education',
    theme: 'science',
    colors: { primary: '#7c3aed', secondary: '#a78bfa', accent: '#ec4899', bg: '#faf5ff', text: '#3c366b' },
    hero: {
      title: 'Физика Окружающего Мира',
      subtitle: 'Пойми, как устроена Вселенная',
      description: 'Открывай законы природы через простые объяснения. Механика, электричество, оптика и термодинамика — станьте мастером физики!',
      emoji: '⚛️'
    },
    sections: [
      { title: 'Разделы физики', items: [
        { title: 'Механика', desc: 'Движение, силы и законы Ньютона', icon: 'atom' },
        { title: 'Электричество', desc: 'Ток, напряжение и цепи', icon: 'bolt' },
        { title: 'Оптика', desc: 'Свет, волны и линзы', icon: 'lightbulb' },
        { title: 'Термодинамика', desc: 'Тепло и температура', icon: 'fire' }
      ]},
      { title: 'Для кого', items: [
        { title: 'Ученики', desc: 'Подготовка к ОГЭ и ЕГЭ', icon: 'school' },
        { title: 'Студенты', desc: 'Технические специальности', icon: 'university' },
        { title: 'Любознательные', desc: 'Понять мир вокруг', icon: 'brain' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800', alt: 'Физика' },
      { url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800', alt: 'Лаборатория' },
      { url: 'https://images.unsplash.com/photo-1581093458791-9d42e3c5e167?w=800', alt: 'Наука' }
    ],
    lessons: [
      {
        id: 'mechanics-1',
        title: 'Путь, скорость и время',
        content: 'Механическое движение — это изменение положения тела в пространстве со временем. Скорость показывает, как быстро движется тело. Формула: v = s/t, где v — скорость, s — путь, t — время.',
        examples: ['Автомобиль проехал 120 км за 2 часа. Его скорость: v = 120/2 = 60 км/ч', 'Пешеход идёт со скоростью 5 км/ч. За 3 часа он пройдёт: s = 5 × 3 = 15 км'],
        practice: ['Поезд прошёл 300 км за 5 часов. Какова его скорость?', 'Самолёт летит со скоростью 900 км/ч. Какое расстояние он пройдёт за 4 часа?']
      },
      {
        id: 'mechanics-2',
        title: 'Законы Ньютона',
        content: 'Первый закон Ньютона: тело сохраняет состояние покоя или равномерного движения, если на него не действуют силы. Второй закон: F = ma (сила равна массе, умноженной на ускорение).',
        examples: ['Если F = 10 Н, а m = 2 кг, то a = 10/2 = 5 м/с²', 'На книгу массой 0.5 кг действует сила тяжести F = mg = 0.5 × 10 = 5 Н'],
        practice: ['Какое ускорение получит тело массой 5 кг под действием силы 20 Н?', 'Чему равна сила тяжести, действующая на шар массой 2 кг?']
      },
      {
        id: 'electricity-1',
        title: 'Электрический ток',
        content: 'Электрический ток — это направленное движение заряженных частиц. Сила тока I = q/t, где q — заряд, t — время. Напряжение U показывает работу тока. Сопротивление R зависит от материала проводника.',
        examples: ['При U = 12 В и R = 4 Ом, сила тока I = U/R = 12/4 = 3 А', 'За 2 секунды через сечение проводника прошёл заряд 6 Кл. I = 6/2 = 3 А'],
        practice: ['Найди силу тока, если напряжение 220 В, а сопротивление 11 Ом', 'Какой заряд пройдёт за 5 секунд при силе тока 0.2 А?']
      },
      {
        id: 'optics-1',
        title: 'Отражение и преломление света',
        content: 'Закон отражения: угол падения равен углу отражения. При преломлении свет меняет направление на границе двух сред. Показатель преломления n показывает, во сколько раз свет замедляется в среде.',
        examples: ['В воде свет движется в 1.33 раза медленнее, чем в вакууме', 'Зеркало отражает свет так, что угол падения = углу отражения'],
        practice: ['Луч падает на зеркало под углом 30° к нормали. Под каким углом он отразится?', 'Почему вода в бассейне кажется мельче?']
      },
      {
        id: 'thermo-1',
        title: 'Температура и теплопередача',
        content: 'Температура — мера средней кинетической энергии молекул. Теплопередача идёт от горячего тела к холодному трём способами: теплопроводность, конвекция и излучение.',
        examples: ['Количество теплоты Q = cmΔT, где c — удельная теплоёмкость, m — масса, ΔT — изменение температуры', 'Чтобы нагреть 1 кг воды на 10°C, нужно Q = 4200 × 1 × 10 = 42000 Дж'],
        practice: ['Сколько теплоты нужно, чтобы нагреть 2 кг воды от 20°C до 100°C?', 'Почему металлическая ложка в горячем супе обжигает, а деревянная нет?']
      },
      {
        id: 'mechanics-3',
        title: 'Давление в жидкостях и газах',
        content: 'Давление p = F/S — сила, действующая на единицу площади. В жидкостях давление растёт с глубиной: p = ρgh, где ρ — плотность, g — ускорение свободного падения, h — глубина.',
        examples: ['На глубине 10 м в воде давление увеличивается на p = 1000 × 10 × 10 = 100000 Па = 100 кПа', 'Гидравлический пресс усиливает силу за счёт разницы площадей поршней'],
        practice: ['Какое давление оказывает вода на аквалангиста на глубине 20 м?', 'Почему нож острый режет лучше?']
      }
    ]
  },

  // Programming Course - with real content
  programming: {
    title: 'Код Мастер',
    category: 'education',
    theme: 'code',
    colors: { primary: '#10b981', secondary: '#34d399', accent: '#6366f1', bg: '#f0fdf4', text: '#064e3b' },
    hero: {
      title: 'Код Мастер',
      subtitle: 'Программирование с нуля до junior',
      description: 'Освой Python, JavaScript или основы веб-разработки. Практические проекты, реальные задачи и понятные объяснения каждой концепции.',
      emoji: '💻'
    },
    sections: [
      { title: 'Направления', items: [
        { title: 'Python', desc: 'Универсальный язык для начинающих', icon: 'python' },
        { title: 'JavaScript', desc: 'Динамика для веба', icon: 'js' },
        { title: 'Веб-разработка', desc: 'HTML, CSS и современные сайты', icon: 'code' },
        { title: 'Алгоритмы', desc: 'Логика и структуры данных', icon: 'project-diagram' }
      ]},
      { title: 'Уровни', items: [
        { title: 'Новичок', desc: 'Нулевой опыт — не проблема', icon: 'seedling' },
        { title: 'Стажёр', desc: 'Первые проекты', icon: 'laptop-code' },
        { title: 'Junior', desc: 'Готов к работе', icon: 'rocket' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800', alt: 'Код' },
      { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800', alt: 'Программирование' },
      { url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800', alt: 'Разработка' }
    ],
    lessons: [
      {
        id: 'py-basics-1',
        title: 'Переменные и типы данных',
        content: 'Переменная — это именованная область памяти для хранения данных. В Python типы определяются автоматически: int (целые), float (дробные), str (строки), bool (логические).',
        examples: ['name = "Алекс"  # строка', 'age = 25  # целое число', 'price = 19.99  # дробное число', 'is_student = True  # логическое'],
        practice: ['Создай переменные: ваше имя, возраст, рост', 'Напиши программу, которая складывает два числа и выводит результат']
      },
      {
        id: 'py-basics-2',
        title: 'Условные операторы if-else',
        content: 'Условные операторы позволяют программе принимать решения. Операторы сравнения: == (равно), != (не равно), < (меньше), > (больше), <=, >=.',
        examples: ['if age >= 18:', '    print("Совершеннолетний")', 'else:', '    print("Несовершеннолетний")', '# Проверка чётности:', 'if number % 2 == 0:', '    print("Чётное")'],
        practice: ['Напиши программу, которая проверяет, положительное ли число', 'Создай калькулятор скидок: если сумма > 1000, скидка 10%']
      },
      {
        id: 'py-basics-3',
        title: 'Циклы for и while',
        content: 'Циклы повторяют код многократно. for используется, когда известно количество повторений. while — когда нужно повторять до выполнения условия.',
        examples: ['# Цикл for:', 'for i in range(5):', '    print(i)  # выведет 0, 1, 2, 3, 4', '# Цикл while:', 'count = 0', 'while count < 5:', '    print(count)', '    count += 1'],
        practice: ['Напиши программу, которая выводит таблицу умножения на 5', 'Создай игру "Угадай число" с циклом while']
      },
      {
        id: 'py-basics-4',
        title: 'Функции и модули',
        content: 'Функция — блок кода, который можно вызывать многократно. Создаются с помощью def. Модули — готовые библиотеки функций.',
        examples: ['def greet(name):', '    return f"Привет, {name}!"', '# Вызов:', 'message = greet("Анна")', '# Использование модуля:', 'import random', 'number = random.randint(1, 10)'],
        practice: ['Напиши функцию, которая считает площадь прямоугольника', 'Создай функцию-калькулятор с операциями +, -, *, /']
      },
      {
        id: 'js-basics-1',
        title: 'Основы JavaScript',
        content: 'JavaScript — язык для веба. Работает в браузере. Можно менять HTML, реагировать на клики, валидировать формы. Переменные: let (изменяемая), const (константа).',
        examples: ['let message = "Hello";', 'const PI = 3.14;', '// Вывод в консоль:', 'console.log(message);', '// Изменение HTML:', 'document.getElementById("title").textContent = "Новый заголовок";'],
        practice: ['Создай переменные для имени пользователя и возраста', 'Напиши скрипт, который меняет цвет фона страницы по клику']
      },
      {
        id: 'web-basics-1',
        title: 'HTML и CSS основы',
        content: 'HTML — структура страницы (теги). CSS — стили (цвета, размеры, расположение). Совместно создают красивые сайты.',
        examples: ['<!-- HTML -->', '<div class="card">', '  <h1>Заголовок</h1>', '  <p>Текст</p>', '</div>', '/* CSS */', '.card {', '  background: blue;', '  padding: 20px;', '}'],
        practice: ['Создай простую карточку профиля с фото, именем и описанием', 'Сделай кнопку, которая меняет цвет при наведении']
      }
    ]
  },

  // History Course - with real content
  history: {
    title: 'Машина Времени',
    category: 'education',
    theme: 'history',
    colors: { primary: '#d97706', secondary: '#fbbf24', accent: '#92400e', bg: '#fffbeb', text: '#78350f' },
    hero: {
      title: 'Машина Времени',
      subtitle: 'История, которая оживает',
      description: 'Погружайтесь в прошлое: от Древнего мира до Современности. Интересные факты, даты, личности и события, изменившие мир.',
      emoji: '🏛️'
    },
    sections: [
      { title: 'Эпохи', items: [
        { title: 'Древний мир', desc: 'Египет, Греция, Рим', icon: 'landmark' },
        { title: 'Средневековье', desc: 'Рыцари и замки', icon: 'shield-alt' },
        { title: 'Новое время', desc: 'Великие открытия', icon: 'ship' },
        { title: 'XX век', desc: 'Войны и прогресс', icon: 'globe' }
      ]},
      { title: 'Темы', items: [
        { title: 'Правители', desc: 'История личностей', icon: 'crown' },
        { title: 'Войны', desc: 'Битвы и стратегии', icon: 'crosshairs' },
        { title: 'Культура', desc: 'Искусство и наука', icon: 'palette' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800', alt: 'Рим' },
      { url: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800', alt: 'Парфенон' },
      { url: 'https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=800', alt: 'История' }
    ],
    lessons: [
      {
        id: 'ancient-1',
        title: 'Древний Египет и пирамиды',
        content: 'Древний Египет — одна из древнейших цивилизаций (ок. 3100 г. до н.э.). Пирамиды Гизы строились как гробницы фараонов. Великая пирамида Хеопса (146 м) была самым высоким сооружением мира 3800 лет. Египтяне изобрели письменность (иероглифы), календарь и проводили мумификацию.',
        examples: ['Пирамида Хеопса содержит ~2.3 млн каменных блоков', 'Розеттский камень (196 г. до н.э.) помог расшифровать иероглифы в 1822 году'],
        practice: ['Нарисуй иероглифы своего имени', 'Посчитай: сколько лет Египетской цивилизации существовало до нашей эры?']
      },
      {
        id: 'ancient-2',
        title: 'Древняя Греция: колыбель демократии',
        content: 'Греция подарила миру демократию, философию, Олимпийские игры и театр. Афины V в. до н.э. — центр культуры. Сократ, Платон, Аристотель заложили основы западной философии. Александр Македонский создал огромную империю.',
        examples: ['Перикл правил Афинами в "золотой век" (461-429 гг. до н.э.)', 'Олимпийские игры возродились в 1896 году, но начались в 776 г. до н.э.'],
        practice: ['Сравни древнегреческую демократию с современной', 'Назови 3 изобретения/идеи Греции, которые мы используем сегодня']
      },
      {
        id: 'medieval-1',
        title: 'Рыцари и средневековые замки',
        content: 'Средневековье (V-XV вв.) — эпоха феодализма. Рыцари следовали кодексу чести. Замки строились для защиты. Крестовые походы (1096-1291) — военные экспедиции христиан на Ближний Восток. Чёрная смерть (чума) уничтожила треть населения Европы в XIV в.',
        examples: ['Замок имеет стены толщиной 3-5 метров', 'Рыцарь начинал обучение в 7 лет, странствовал в 21 год'],
        practice: ['Опиши день рыцаря: от утренней молитвы до вечернего банкета', 'Зачем нужны были крестовые походы с точки зрения крестоносцев?']
      },
      {
        id: 'modern-1',
        title: 'Великие географические открытия',
        content: 'XV-XVII вв. — эпоха открытий. Колумб открыл Америку в 1492 году. Васко да Гама нашёл морской путь в Индию. Магеллан совершил первое кругосветное путешествие (1519-1522). Открытия изменили экономику, науку и карту мира.',
        examples: ['Колумб думал, что достиг Индии, но открыл Багамы', 'Обмен между Старым и Новым светом назвали "Колумбов обмен"'],
        practice: ['Представь, что ты моряк на корабле Колумба. Опиши свои впечатления', 'Как открытия повлияли на развитие науки?']
      },
      {
        id: 'ww2-1',
        title: 'Вторая мировая война: основные события',
        content: 'Вторая мировая война (1939-1945) — крупнейший военный конфликт в истории. Началась с нападения Германии на Польшу. Война затронула 62 страны. Погибло около 70 млн человек. Завершилась атомными бомбардировками Хиросимы и Нагасаки в 1945 году.',
        examples: ['Сталинградская битва (1942-1943) — перелом в войне', 'Высадка в Нормандии (6 июня 1944) — открытие второго фронта'],
        practice: ['Составь хронологию основных событий ВОВ', 'Какие уроки должен был извлечь мир из Второй мировой?']
      },
      {
        id: 'soviet-1',
        title: 'СССР: история и наследие',
        content: 'Союз Советских Социалистических Республик существовал с 1922 по 1991 год. Периоды: Гражданская война, индустриализация, Великая Отечественная война, "холодная война", перестройка. СССР первым запустил спутник (1957) и человека в космос (Гагарин, 1961).',
        examples: ['Первый пятилетний план (1928-1932) — индустриализация', 'Юрий Гагарин облетел Землю за 108 минут 12 апреля 1961 года'],
        practice: ['Назови 3 достижения СССР в науке и технике', 'Сравни жизнь в СССР 1960-х и 1980-х годов']
      }
    ]
  },

  // English Course - with real content
  english: {
    title: 'English Hub',
    category: 'education',
    theme: 'language',
    colors: { primary: '#e11d48', secondary: '#fb7185', accent: '#f59e0b', bg: '#fff1f2', text: '#881337' },
    hero: {
      title: 'English Hub',
      subtitle: 'Английский, который работает',
      description: 'От алфавита до свободного общения. Грамматика, лексика, разговорная практика и подготовка к экзаменам.',
      emoji: '📚'
    },
    sections: [
      { title: 'Уровни', items: [
        { title: 'Beginner', desc: 'С нуля до простых фраз', icon: 'baby' },
        { title: 'Elementary', desc: 'Базовое общение', icon: 'walking' },
        { title: 'Intermediate', desc: 'Свободное общение', icon: 'running' },
        { title: 'Advanced', desc: 'Профессиональный уровень', icon: 'graduation-cap' }
      ]},
      { title: 'Навыки', items: [
        { title: 'Grammar', desc: 'Грамматика без боли', icon: 'spell-check' },
        { title: 'Vocabulary', desc: 'Слова, которые нужны', icon: 'book' },
        { title: 'Speaking', desc: 'Разговорная практика', icon: 'comments' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800', alt: 'English' },
      { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800', alt: 'Учёба' },
      { url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', alt: 'Студенты' }
    ],
    lessons: [
      {
        id: 'eng-basics-1',
        title: 'Базовые фразы и приветствия',
        content: 'Начните с простых фраз. "Hello!" — универсальное приветствие. "How are you?" — как дела? Ответы: "I\'m fine, thanks", "Not bad", "Great!". "Good morning/afternoon/evening" — формальные приветствия. "Bye!" или "See you!" — прощание.',
        examples: ['A: Hello! How are you?', 'B: I\'m fine, thank you. And you?', 'A: Great, thanks!', '', 'A: Good morning!', 'B: Good morning! Nice to meet you!'],
        practice: ['Составь диалог: познакомься с новым соседом', 'Напиши, как поздороваешься с другом утром, а как с начальником']
      },
      {
        id: 'eng-basics-2',
        title: 'Present Simple: настоящее время',
        content: 'Present Simple — для регулярных действий и фактов. Утверждение: I/you/we/they + V, he/she/it + V+s. Отрицание: don\'t/doesn\'t + V. Вопрос: Do/Does + подлежащее + V?',
        examples: ['I work in Moscow.', 'She plays tennis every Sunday.', 'They don\'t like coffee.', 'Does he speak English? — Yes, he does. / No, he doesn\'t.', 'Water boils at 100°C.'],
        practice: ['Расскажи о своём типичном дне (5 предложений)', 'Напиши 3 факта о себе и 3 привычки']
      },
      {
        id: 'eng-basics-3',
        title: 'Местоимения и глагол to be',
        content: 'Личные местоимения: I, you, he, she, it, we, they. Глагол to be (быть): am (I), is (he/she/it), are (you/we/they). Используется для описания состояний, профессий, возраста.',
        examples: ['I am a student.', 'He is 25 years old.', 'They are from Russia.', 'We are friends.', 'Is she a doctor? — Yes, she is.'],
        practice: ['Представься: имя, возраст, профессия, город', 'Опиши свою семью, используя to be']
      },
      {
        id: 'eng-basics-4',
        title: 'Артикли a/an/the',
        content: 'A/an — неопределённый артикль (первое упоминание). The — определённый артикль (конкретный предмет). A используется перед согласными звуками, an — перед гласными.',
        examples: ['I have a book.', 'This is an apple.', 'The book on the table is mine.', 'A university ("ю" — согласный звук)', 'An hour ("а" — гласный звук)'],
        practice: ['Вставь артикли: ___ cat, ___ umbrella, ___ sun', 'Напиши рассказ о своей комнате с использованием the']
      },
      {
        id: 'eng-basics-5',
        title: 'There is / There are',
        content: 'There is/are — "есть", "находится". There is + единственное число. There are + множественное число. Отрицание: There isn\'t / There aren\'t. Вопрос: Is/Are there...?',
        examples: ['There is a cat in the garden.', 'There are three books on the table.', 'Is there a bank near here?', 'There aren\'t any students in the classroom.'],
        practice: ['Опиши свою кухню, используя there is/are', 'Составь диалог: спроси, что есть в холодильнике']
      },
      {
        id: 'eng-inter-1',
        title: 'Past Simple: прошедшее время',
        content: 'Past Simple — для завершённых действий в прошлом. Правильные глаголы: +ed. Неправильные — вторая форма (go → went, see → saw). Отрицание: didn\'t + V. Вопрос: Did + подлежащее + V?',
        examples: ['I watched TV yesterday.', 'She went to Paris last summer.', 'We didn\'t eat meat.', 'Did you see that movie? — Yes, I did.'],
        practice: ['Расскажи о прошлых выходных (5 предложений)', 'Напиши 3 неправильных глагола и их формы']
      }
    ]
  },

  // Recipes/Cooking Course - with real recipes
  recipes: {
    title: 'Кулинарная Мастерская',
    category: 'food',
    theme: 'cooking',
    colors: { primary: '#f97316', secondary: '#fb923c', accent: '#ef4444', bg: '#fff7ed', text: '#7c2d12' },
    hero: {
      title: 'Кулинарная Мастерская',
      subtitle: 'Готовь как шеф-повар',
      description: 'Пошаговые рецепты с фото и секретами. От простых завтраков до праздничных ужинов — учитесь готовить вкусно!',
      emoji: '👨‍🍳'
    },
    sections: [
      { title: 'Категории', items: [
        { title: 'Завтраки', desc: 'Энергия на весь день', icon: 'coffee' },
        { title: 'Обеды', desc: 'Сытные и полезные', icon: 'utensils' },
        { title: 'Ужины', desc: 'Вкусные и быстрые', icon: 'moon' },
        { title: 'Десерты', desc: 'Сладкие радости', icon: 'cookie' }
      ]},
      { title: 'Навыки', items: [
        { title: 'Нож', desc: 'Правильная нарезка', icon: 'cut' },
        { title: 'Термометр', desc: 'Температура готовности', icon: 'thermometer-half' },
        { title: 'Тайминг', desc: 'Время приготовления', icon: 'clock' }
      ]}
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', alt: 'Еда' },
      { url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800', alt: 'Завтрак' },
      { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', alt: 'Пицца' }
    ],
    lessons: [
      {
        id: 'recipe-1',
        title: 'Паста Карбонара классическая',
        content: 'Карбонара — итальянское блюдо из пасты с соусом из яиц, сыра пармезан, гуанчиале (или бекона) и чёрного перца. Главное правило: не использовать сливки! Настоящая карбонара получается кремистой за счёт яиц и сыра.',
        examples: ['Ингредиенты на 2 порции: спагетти 200г, бекон 100г, яйца 2 шт + желток 1 шт, пармезан 50г, чёрный перец, соль', 'Время: 15 минут', 'Калорийность: ~650 ккал на порцию'],
        practice: ['Приготовь пасту альденте (чуть твёрдая внутри)', 'Обжарь бекон до хрустящей корочки', 'Смешай яйца с тёртым пармезаном', 'Соедини горячую пасту с яичной смесью (снимай с огня!)', 'Добавь бекон и много чёрного перца']
      },
      {
        id: 'recipe-2',
        title: 'Борщ украинский',
        content: 'Борщ — один из самых известных супов славянской кухни. Главная особенность — свёкла, которая даёт характерный красный цвет и сладковатый вкус. Традиционно подаётся с пампушками и сметаной.',
        examples: ['Ингредиенты: говядина 500г, свёкла 2 шт, капуста 300г, картофель 3 шт, морковь, лук, томатная паста, чеснок, уксус', 'Время: 2 часа', 'Калорийность: ~120 ккал на 100мл'],
        practice: ['Свари мясной бульон (1-1.5 часа)', 'Обжарь свёклу с уксусом (сохранит цвет)', 'Добавь картофель и капусту в бульон', 'Заправь зажарку из моркови и лука', 'Добавь чеснок и зелень перед подачей', 'Дай настояться 15 минут']
      },
      {
        id: 'recipe-3',
        title: 'Омлет французский',
        content: 'Французский омлет — это про технику. В отличие от пышного омлета, он должен быть гладким, кремовым внутри и иметь овальную форму. Секрет — медленное приготовление и постоянное помешивание.',
        examples: ['Ингредиенты: яйца 3 шт, сливочное масло 20г, соль, перец, зелень', 'Время: 5 минут', 'Техника: помешивание вилкой постоянно'],
        practice: ['Взбей яйца вилкой (не взбивай сильно — не нужна пена)', 'Растопи масло на среднем огне', 'Влей яйца и сразу начинай помешивать вилкой', 'Когда начнёт схватываться, сформируй овал', 'Сложи омлет втрое прямо в сковороде', 'Посыпь зеленью']
      },
      {
        id: 'recipe-4',
        title: 'Цезарь с курицей',
        content: 'Салат Цезарь — американское изобретение, несмотря на название. Хрустящий романо, сочная курица, пармезан и соус из анчоусов. Крутоны (гренки) делают салат особенным.',
        examples: ['Ингредиенты: куриное филе 200г, салат романо, пармезан 30г, яйцо (для соуса), анчоусы, чеснок, оливковое масло, лимон, горчица, багет для гренок', 'Время: 25 минут', 'Соус Цезарь — ключ к успеху'],
        practice: ['Приготовь соус: яйцо + анчоусы + чеснок + масло + лимон + горчица (взбить блендером)', 'Обжарь курицу до готовности, нарежь', 'Подсуши кубики багета с чесноком (гренки)', 'Разорви руками листья салата (не нарезай ножом!)', 'Заправь салат соусом прямо перед подачей', 'Посыпь тёртым пармезаном']
      },
      {
        id: 'recipe-5',
        title: 'Блины тонкие на молоке',
        content: 'Идеальные блины — тонкие, с дырочками, мягкие и вкусные. Секрет — правильное тесто и горячая сковорода. Рецепт проверенный, блины не рвутся и легко переворачиваются.',
        examples: ['Ингредиенты: молоко 500мл, яйца 2 шт, мука 200г, сахар 2 ст.л., соль 0.5 ч.л., масло растительное 2 ст.л., сода (погасить уксусом)', 'Время: 30 минут + 15 минут настойки теста', 'Количество: 15-18 блинов'],
        practice: ['Взбей яйца с сахаром и солью', 'Добавь молоко, перемешай', 'Просей муку, помешивая (избежи комочков)', 'Добавь растительное масло', 'Погаси соду уксусом, добавь в тесто', 'Дай тесту постоять 15 минут', 'Жарь на хорошо разогретой сковороде с двух сторон']
      },
      {
        id: 'recipe-6',
        title: 'Тирамису классический',
        content: 'Тирамису — итальянский десерт, который переводится как "взбодри меня". Савоярди (печенье), кофе, маскарпоне и какао. Готовится без выпечки, но нужно время для пропитки.',
        examples: ['Ингредиенты: маскарпоне 500г, яйца 3 шт, сахар 100г, кофе эспрессо 300мл, савоярди 200г, какао, амаретто (опционально)', 'Время: 30 минут + 4-6 часов в холодильнике', 'Подаётся в порционных стаканах или формой'],
        practice: ['Отдели белки от желтков', 'Взбей желтки с сахаром до пышности', 'Добавь маскарпоне, перемешай до однородности', 'Взбей белки до устойчивых пиков, аккуратно вмешай', 'Охлади кофе, добавь амаретто', 'Обмакни савоярди в кофе на 1-2 секунды, выложи слоем', 'Сверху крем, повтори слои', 'Присыпь какао перед подачей']
      }
    ]
  },

  // Default template
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
  photography: ['фото', 'photo', 'фотограф', 'photography', 'camera', 'камера', 'съёмка', 'shooting'],
  math: ['математик', 'math', 'алгебра', 'геометри', 'арифметик', 'уравнен', 'числ', 'формул', 'calculus', 'algebra', 'geometry', 'тригонометр', 'дроб', 'процент'],
  physics: ['физик', 'physics', 'закон ньютон', 'электричество', 'механик', 'оптик', 'термодинамик', 'скорост', 'ускорени', 'сила', 'давлени', 'ток', 'напряжени'],
  programming: ['программирование', 'programming', 'код', 'code', 'python', 'javascript', 'java', 'html', 'css', 'разработка', 'developer', 'coding', 'программист'],
  history: ['истори', 'history', 'древни', 'средневековь', 'война', 'вторая мировая', 'великая отечественная', 'египет', 'рим', 'ссср', 'царь', 'император', 'битва', 'поход'],
  english: ['английск', 'english', 'язык', 'language', 'grammar', 'грамматик', 'vocabulary', 'лексик', 'speaking', 'разговорны', 'past simple', 'present', 'english course'],
  recipes: ['рецепт', 'recipe', 'готовить', 'кухня', 'кулинария', 'блюдо', 'паста', 'борщ', 'салат', 'омлет', 'блины', 'десерт', 'ужин', 'обед', 'завтрак']
};

// Helper to detect template
function detectTemplate(description, intent = null) {
  const desc = description.toLowerCase();
  
  // Use intent if available for smarter detection
  if (intent && intent.category) {
    const categoryMap = {
      'animals': ['cats', 'dogs', 'pets'],
      'food': ['cooking', 'baking', 'coffee', 'recipes'],
      'travel': ['travel'],
      'tech': ['tech'],
      'business': ['business', 'portfolio'],
      'lifestyle': ['fashion'],
      'education': ['education', 'math', 'physics', 'programming', 'history', 'english'],
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
  const stopWords = ['создай', 'сделай', 'сайт', 'про', 'веб', 'с', 'о', 'для', 'по', 'на', 'как', 'make', 'create', 'website', 'about', 'with', 'for', 'создать', 'сделать', 'построить', 'сгенерировать'];
  let words = desc.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
  
  const primaryKeyword = words[0] || 'проект';
  const secondaryKeywords = words.slice(1, 4);
  
  // Detect site type based on keywords
  let siteType = 'general';
  if (desc.includes('курс') || desc.includes('урок') || desc.includes('обучение') || desc.includes('course') || desc.includes('learn')) {
    siteType = 'course';
  } else if (desc.includes('блог') || desc.includes('blog') || desc.includes('статья') || desc.includes('article')) {
    siteType = 'blog';
  } else if (desc.includes('магазин') || desc.includes('shop') || desc.includes('store') || desc.includes('товар')) {
    siteType = 'shop';
  } else if (desc.includes('портфолио') || desc.includes('portfolio') || desc.includes('работы')) {
    siteType = 'portfolio';
  } else if (desc.includes('лендинг') || desc.includes('landing') || desc.includes('продажа')) {
    siteType = 'landing';
  }
  
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
      keywords: ['обучен', 'курс', 'школа', 'учёба', 'education', 'course', 'school', 'learn', 'урок', 'заняти', 'тема'],
      weight: 1.0,
      subcategories: {
        'math': ['математик', 'алгебра', 'геометри', 'арифметик', 'формул', 'уравнен', 'числ'],
        'physics': ['физик', 'механик', 'электричеств', 'оптик', 'термодинамик', 'ньютон'],
        'programming': ['программирование', 'python', 'javascript', 'код', 'разработка', 'developer', 'html', 'css'],
        'history': ['истори', 'древни', 'война', 'египет', 'рим', 'греци', 'ссср', 'царь'],
        'english': ['английск', 'english', 'grammar', 'грамматик', 'vocabulary', 'язык', 'language']
      }
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
    'educational': ['обучение', 'курс', 'учеба', 'learn', 'course', 'урок', 'школа'],
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
    siteType,
    confidence: maxScore,
    tone,
    complexity: words.length > 5 ? 'detailed' : 'simple'
  };
}

module.exports = { templates: websiteTemplates, detectTemplate, analyzeIntent, templateKeywords };
