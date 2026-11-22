# Školství

Sada malých nástrojů pro základní školu. Každý projekt je samostatná složka
a dá se nasadit nezávisle na ostatních.

Píšu je jako učitel informatiky, který zároveň spravuje školní IT — takže to
jsou věci, které sám potřebuju, ne ukázky.

## Projekty

| Projekt | Co dělá | Stav |
| --- | --- | --- |
| [**helpdesk**](./helpdesk) | Ticket systém na závady školní techniky. Kolegové hlásí bez zakládání účtu (přihlášení odkazem na školní e-mail), správce IT má frontu úkolů a archiv hotové práce s exportem do CSV. | funkční |
| [**edu-znacka**](./edu-znacka) | Rozšíření do prohlížeče, které u videí na YouTube ukáže, která z nich ověřil odborník z oboru jako odpovídající vědeckému konsenzu. K tomu web, kde značka vzniká a kde je u každé vidět, kdo ji dal a proč. | funkční, databáze se teprve plní |

## Jak to spustit

Každý projekt má vlastní `README.md` s postupem. Obecně:

```bash
cd <projekt> && npm install
```

```bash
cp .env.example .env.local
```

## Nasazení na Vercel

Repozitář obsahuje víc projektů, takže ve Vercelu u každého nastav
**Root Directory** na jeho složku (Settings → General → Root Directory).
Bez toho Vercel hledá aplikaci v kořeni repozitáře a nenajde ji.

U `edu-znacka` je to `edu-znacka/web` — samotné rozšíření se nenasazuje,
buildí se lokálně a nahrává do storů.

## Licence

Volně k použití a úpravám pro jakoukoli školu. Pokud to někde nasadíš
a narazíš na problém, dej vědět.
