# Tablica V2 — zmiany przygotowane do wdrożenia

## Kopia przed zmianami

Punkt powrotu: `fc2dd805a1738f11eed9dc74964e3f4ec9358bb3`, gałąź `backup-przed-tablica-2026-10-18`.
Pełna historia Git i archiwum plików zostały dodatkowo zapisane poza checkoutem w `/workspace/backups`.
Kopia kodu nie jest eksportem produkcyjnego KV. Nie odczytywano ani nie modyfikowano produkcyjnych danych.

## Panel i dane

Sekcja **Tablica w lokalu** w `/admin` ma własny przycisk zapisu. Zapisuje `config:board:v1` w istniejącym KV; nie zmienia identyfikatora KV ani sekretów.

- Kategorie złotych monet: bulionowe, historyczne, pozostałe. Zmiana kategorii grupy przenosi wszystkie jej wagi.
- Wagi jednej monety mają wspólną grupę, nazwę i numer. Pozostałe sekcje mają własne numery.
- Numery monet nie są indeksami widoku. Istniejące zapisane numery zostają po dodaniu nowych produktów.
- Nowe produkty własne są początkowo ukryte na tablicy. Należy przypisać kategorię, numer i widoczność. Dotychczasowy cennik i kalkulator mają niezależną widoczność katalogową. Pozycję ukrytą w katalogu można pokazać na tablicy przełącznikiem „Pokaż”; nie zmienia to jej widoczności na innych stronach.
- Osobne przełączniki skupu, sprzedaży i dostawy dla pozycji oraz sekcji.
- Dostawa tylko dla bulionowych złotych monet i złotych sztabek; wspólny edytowalny termin.
- Sprzedaż i dostawa to wartość czystego metalu według spot plus osobny narzut. Początkowo są wyłączone; nie publikujemy domyślnych cen sprzedaży bez ustawienia przez operatora.
- Publiczne `price`, `metals` i grupy `products` zachowują dotychczasowe wyliczenia. Nowe dane są w dodatkowym polu `board` odpowiedzi `/api/prices`.
- Zapis ustawień tablicy jest uwierzytelniony i walidowany. API odrzuca powtórzone numery w obrębie właściwej numeracji i rozbieżne dane tej samej rodziny.
- Kolejne zapisy archiwizują poprzednią konfigurację w `backup:board:<czas>`; obecny zapis cennika archiwizuje wcześniejsze `config:pricing` w `backup:pricing:<czas>`.

## Weryfikacja

```
node --test tests/board.test.mjs
node --check src/worker.js
node --check public/admin-board.js
npx wrangler@4 deploy --dry-run --outdir /tmp/sezam-worker-dry-run
```

Dodatkowo sprawdzono w Chromium: logowanie testowe, kategorię historyczną, narzut +3%, zapis w izolowanej pamięci, renderowanie tablicy 3440×1440 bez obcięć, pełne złote w tabelach oraz błąd odświeżania. Testy nie łączą się z produkcyjnym KV.

## Wdrożenie i powrót

Panel ma automatyczne wdrożenia z GitHuba. Po uzgodnieniu publikacji należy włączyć przygotowaną gałąź do `main`, poczekać na zakończenie buildów i sprawdzić `/admin` oraz `/api/prices` (obecność `board.version: 1`). Nie uruchamiać ręcznego wdrożenia równolegle z buildami.

Tablica jest w osobnym repozytorium `angsm111-dot/TEST-b6698`, folder `tablica-v2`. Netlify publikuje `main`, zgodnie z `netlify.toml`. Najpierw wdrożyć API/panel, następnie tablicę. Kod tablicy obsługuje starszą wersję API jako etap przejściowy, z komunikatem o wymaganym nowym panelu.

Po wdrożeniu sprawdzić stare strony srebrne, cennik skupu, nowe kategorie i przełączniki. Nie wpisywać cen próbnych do produkcji. Przy powrocie przywrócić kod z gałęzi kopii; stare widoki ignorują osobny klucz `config:board:v1`. Nie usuwać ani nie zastępować całej przestrzeni KV.

Brakujące produkty, stare ręczne ceny sprzedaży i dane WordPressa nie zostały zmigrowane: potrzebny jest ich eksport. Tablica nie zgaduje tych cen.

## Dalsze poprawki interfejsu

Przycisk zapisu tablicy znajduje się na dolnej belce obok publikacji cennika. Zapisuje wybraną sekcję (wraz z przeniesionymi z niej produktami i terminem dostawy); dla widoku „Wszystkie produkty” zapisuje wszystkie sekcje. Niezapisane zmiany innych sekcji są zachowane w edytorze.

Test przeglądarkowy obejmuje zapis sekcji bez zapisywania zmian z innej sekcji oraz włączenie Kangura 1/20 i 1/25 oz, gdy te wagi pozostają ukryte na dotychczasowych stronach. Tablica ma większe dekoracyjne ilustracje sekcji na przezroczystym tle; nie są zdjęciami konkretnych egzemplarzy z oferty.

## Zamykanie i kolejność pozycji

Obok otwierania ustawień jest przycisk zamknięcia. Zamknięcie zachowuje niezapisane zmiany w otwartym panelu; przy ponownym otwarciu edycja jest przywracana. Nie oznacza to zapisania do serwera.

Kolejność tablicy jest osobnym polem `order`, niezależnym od numeru gablotowego i kolejności głównego katalogu. Starsze konfiguracje bez `order` otrzymują domyślną kolejność: sztabki od najmniejszej masy, pozostałe sekcje według numerów. Przyciski ↑/↓ przesuwają pozycję wewnątrz sekcji, a dla monet — całą grupę wag. Zapis wybranej sekcji utrwala kolejność. API i tablica zachowują tę samą kolejność. Numery monet i ceny nie zmieniają się podczas przesuwania. Numery widocznych sztabek są automatycznie dopasowywane do kolejności: 1, 2, 3…; ukryte sztabki nie zostawiają luk.

Numer sztabki w panelu jest tylko do odczytu — wynika z kolejności, nie wymaga ręcznego wpisywania. Dotyczy osobno sztabek złota i srebra. Zmiana kolejności lub widoczności przelicza ich numery, bez zmiany cen.

## Wygaśnięcie logowania

Sesja nadal wygasa po 30 minutach. Gdy uwierzytelnione żądanie panelu cen lub tablicy zwróci 401, panel otwiera dialog ponownego logowania i po sukcesie ponawia pierwotne żądanie. Nie przeładowuje strony, nie pobiera ponownie konfiguracji nad niezapisanymi zmianami i nie zapisuje hasła lokalnie. Anulowanie zachowuje edycję bez zapisywania. Nieprawidłowe hasło pozostawia dialog otwarty. Pierwsze wejście do panelu używa dotychczasowego formularza logowania. Sprawdzono w Chromium ponowne logowanie z widoku monet, zachowanie edytowanej marży, ponowienie zapisu tablicy, błędne hasło i anulowanie logowania.
