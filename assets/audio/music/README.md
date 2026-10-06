# 🎵 Фонова музика (Background Music)

У грі реалізовано систему **випадкового вибору треку** (Random Shuffle):
- При кожному початку нової гри автоматично обирається випадковий трек із плейлиста.
- Коли трек закінчується, автоматично вмикається наступний випадковий трек (без повторів).

---

### Як додати власну музику:

1. **Покладіть аудіофайли** у цю папку (`assets/audio/music/`), наприклад:
   - `assets/audio/music/track1.mp3`
   - `assets/audio/music/my_chill_song.mp3`

2. **Зареєструйте їх** (оберіть будь-який зручний спосіб):
   - **Спосіб А (Рекомендований)**: Відкрийте файл [assets/audio/music/playlist.json](file:///home/geerbeen/side_projects/dudka/assets/audio/music/playlist.json) і просто впишіть назви файлів у список:
     ```json
     [
       "chill_vape_beat.wav",
       "track1.mp3",
       "my_chill_song.mp3"
     ]
     ```
   - **Спосіб Б (Швидкі назви)**: Якщо ви просто назвете ваші файли `track1.mp3`, `track2.mp3`, `track3.mp3` тощо, гра **автоматично знайде та підключить їх** навіть без редагування файлів!
   - **Спосіб В**: Можна також вписати їх безпосередньо у масив `DEFAULT_MUSIC_TRACKS` на початку файлу [js/audio.js](file:///home/geerbeen/side_projects/dudka/js/audio.js#L7-L10).
