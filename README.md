# Skup Złota Gorzów — strona z panelem cen

Ta wersja zawiera stronę publiczną, bezpieczny panel `/admin`, pięciominutową pamięć podręczną notowań oraz ustawienia potrąceń dla każdej próby.

Główne źródło cen: `https://investgold.pl/sezamcalc2.json`. Worker sprawdza je automatycznie co 5 minut, a w razie chwilowego błędu zachowuje ostatnie prawidłowe ceny.

## Jak działa cena

`cena spot PLN/g × (próba / 1000) × (1 − potrącenie / 100)`

Każda próba ma tryb automatyczny albo ręczny. Panel zapisuje konfigurację w Cloudflare KV, a publiczna strona pobiera gotowy cennik z `/api/prices`.

## Konfiguracja Cloudflare

1. Utwórz projekt Workers z plików tego katalogu lub połącz repozytorium Git.
2. W ustawieniach projektu dodaj przestrzeń KV i przypisz ją jako binding `PRICE_STORE`.
3. Dodaj zaszyfrowany sekret `ADMIN_PASSWORD` — jest to hasło do panelu.
4. Opcjonalnie dodaj sekrety `PROVIDER_URL` i `PROVIDER_API_KEY` po otrzymaniu danych dostawcy.
5. Wdróż projekt. Panel będzie pod adresem `https://twoja-domena.pl/admin`.

Nie zapisuj hasła ani klucza dostawcy w `wrangler.jsonc` lub JavaScript strony.

## Dostawca cen

Bez własnego dostawcy Worker używa NBP dla złota i USD/PLN oraz Gold API dla srebra, platyny i palladu. Harmonogram odświeża cache co 5 minut. Po podaniu dokumentacji dostawcy należy dostosować wyłącznie funkcję `fetchCustomProvider()` w `src/worker.js`.

Potrzebne informacje od dostawcy:

- adres endpointu,
- sposób uwierzytelniania,
- przykładowa odpowiedź JSON,
- jednostka ceny (PLN/g, USD/oz itd.),
- symbole złota, srebra, platyny i palladu,
- limity zapytań.

## Powiązanie projektu

- Projekt lokalny: „Skup złota Gorzów”; właściwe repozytorium znajduje się w podfolderze `repozytorium`.
- Repozytorium GitHub: https://github.com/angsm111-dot/nowa-skup-zlota-gorzow (gałąź `main`). Poprzednia nazwa: `skup-zlota-gorzow`.
- Cloudflare Worker: `skup-zlota-gorzow`.
- Strona: https://skup-zlota-gorzow.angsm111.workers.dev
- Panel: https://skup-zlota-gorzow.angsm111.workers.dev/admin

Zmiana nazwy repozytorium nie oznacza zmiany nazwy Workera ani adresu strony. Przed pracą na lokalnej kopii należy pobrać aktualną gałąź `main`.

## Zewnętrzny kalkulator SEZAM LAB
Publiczny GET `/api/prices` udostępnia nagłówek CORS `Access-Control-Allow-Origin: *` dla statycznej witryny `angsm111-dot/spektrometriagorzow`. Dotyczy to wyłącznie publicznego cennika bez uwierzytelnienia; trasy administracyjne zachowują dotychczasową ochronę. Kalkulator odczytuje gotowe `metals.gold.purities[próba].price`, bez ponownego naliczania potrąceń.

Po wdrożeniu Workera sprawdź odczyt API z zewnętrznej witryny oraz zgodność ceny z panelem. Zapis do GitHuba nie jest dowodem wdrożenia do Cloudflare. Testy: `node --test tests/prices-cors.test.mjs tests/board.test.mjs`.
