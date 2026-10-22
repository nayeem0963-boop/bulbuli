// Card sets for Memory Match. Each item is a picture (emoji) with its word in English and Bangla.
// To add a set, add an entry with at least 8 items (the largest board uses 8 pairs).

export const DECKS = [
  {
    id: 'animals',
    icon: '🐘',
    name: { en: 'Animals', bn: 'পশুপাখি' },
    items: [
      { id: 'cat', picture: '🐱', word: { en: 'cat', bn: 'বিড়াল' } },
      { id: 'dog', picture: '🐶', word: { en: 'dog', bn: 'কুকুর' } },
      { id: 'cow', picture: '🐮', word: { en: 'cow', bn: 'গরু' } },
      { id: 'lion', picture: '🦁', word: { en: 'lion', bn: 'সিংহ' } },
      { id: 'tiger', picture: '🐯', word: { en: 'tiger', bn: 'বাঘ' } },
      { id: 'elephant', picture: '🐘', word: { en: 'elephant', bn: 'হাতি' } },
      { id: 'fish', picture: '🐟', word: { en: 'fish', bn: 'মাছ' } },
      { id: 'rabbit', picture: '🐰', word: { en: 'rabbit', bn: 'খরগোশ' } },
      { id: 'monkey', picture: '🐵', word: { en: 'monkey', bn: 'বানর' } },
      { id: 'frog', picture: '🐸', word: { en: 'frog', bn: 'ব্যাঙ' } },
      { id: 'duck', picture: '🦆', word: { en: 'duck', bn: 'হাঁস' } },
      { id: 'goat', picture: '🐐', word: { en: 'goat', bn: 'ছাগল' } },
    ],
  },
  {
    id: 'fruits',
    icon: '🥭',
    name: { en: 'Fruits', bn: 'ফল' },
    items: [
      { id: 'mango', picture: '🥭', word: { en: 'mango', bn: 'আম' } },
      { id: 'banana', picture: '🍌', word: { en: 'banana', bn: 'কলা' } },
      { id: 'apple', picture: '🍎', word: { en: 'apple', bn: 'আপেল' } },
      { id: 'grapes', picture: '🍇', word: { en: 'grapes', bn: 'আঙুর' } },
      { id: 'watermelon', picture: '🍉', word: { en: 'watermelon', bn: 'তরমুজ' } },
      { id: 'pineapple', picture: '🍍', word: { en: 'pineapple', bn: 'আনারস' } },
      { id: 'orange', picture: '🍊', word: { en: 'orange', bn: 'কমলা' } },
      { id: 'coconut', picture: '🥥', word: { en: 'coconut', bn: 'নারকেল' } },
      { id: 'lemon', picture: '🍋', word: { en: 'lemon', bn: 'লেবু' } },
      { id: 'strawberry', picture: '🍓', word: { en: 'strawberry', bn: 'স্ট্রবেরি' } },
    ],
  },
  {
    id: 'things',
    icon: '🚲',
    name: { en: 'Things', bn: 'জিনিস' },
    items: [
      { id: 'car', picture: '🚗', word: { en: 'car', bn: 'গাড়ি' } },
      { id: 'bus', picture: '🚌', word: { en: 'bus', bn: 'বাস' } },
      { id: 'boat', picture: '⛵', word: { en: 'boat', bn: 'নৌকা' } },
      { id: 'plane', picture: '✈️', word: { en: 'plane', bn: 'বিমান' } },
      { id: 'bicycle', picture: '🚲', word: { en: 'bicycle', bn: 'সাইকেল' } },
      { id: 'train', picture: '🚆', word: { en: 'train', bn: 'ট্রেন' } },
      { id: 'ball', picture: '⚽', word: { en: 'ball', bn: 'বল' } },
      { id: 'umbrella', picture: '☂️', word: { en: 'umbrella', bn: 'ছাতা' } },
      { id: 'book', picture: '📖', word: { en: 'book', bn: 'বই' } },
      { id: 'house', picture: '🏠', word: { en: 'house', bn: 'ঘর' } },
      { id: 'sun', picture: '☀️', word: { en: 'sun', bn: 'সূর্য' } },
      { id: 'moon', picture: '🌙', word: { en: 'moon', bn: 'চাঁদ' } },
    ],
  },
]

export const getDeck = (id) => DECKS.find((deck) => deck.id === id) ?? DECKS[0]
