import { publicPrivateGuide } from './publicPrivateGuide';

export type LearnLang = 'en' | 'de' | 'hu';

export type LearnGuide = {
  slug: string;
  published: string;
  minutes: number;
  title: Record<LearnLang, string>;
  description: Record<LearnLang, string>;
  body: Record<LearnLang, string>;
};

function pick<T>(map: Record<LearnLang, T>, lang: LearnLang): T {
  return map[lang] || map.en;
}

export const LEARN_GUIDES: LearnGuide[] = [
  publicPrivateGuide as LearnGuide,
  {
    slug: 'der-die-das',
    published: '2026-08-31',
    minutes: 10,
    title: {
      en: 'How to learn German articles der, die, das',
      de: 'Deutsche Artikel lernen: der, die, das',
      hu: 'Hogyan tanuld a der, die, das névelőket',
    },
    description: {
      en: 'A method for German noun gender that actually sticks: learn the article with the noun, use reliable ending patterns, and quiz the rest.',
      de: 'Eine Methode für das Genus, die hält: Artikel mit dem Nomen lernen, verlässliche Endungen nutzen, den Rest quizen.',
      hu: 'Módszer a német főnévnemhez, ami megmarad: a névelőt a főnévvel együtt tanulni, megbízható végződéseket használni, a többit kvízezni.',
    },
    body: {
      en: `German has three grammatical genders. They are not the biological sex of the thing. *Das Mädchen* is neuter even though the girl is female. *Der Löffel* (spoon) is masculine for historical reasons, not because a spoon is male. If you try to “feel” the gender, you will guess forever.

The only stable habit is this: **never store a German noun without its article.** Write *das Haus*, say *das Haus*, quiz *das Haus*. Writing *Haus = house* trains an English dictionary, not German.

## Patterns that are worth memorising

No rule covers every noun, but some endings are reliable enough to save hours:

| Ending / type | Typical article | Examples |
| --- | --- | --- |
| *-ung, -heit, -keit, -schaft, -tion, -ik* | **die** | die Wohnung, die Freiheit, die Möglichkeit, die Freundschaft, die Nation |
| *-chen, -lein* | **das** | das Mädchen, das Häuschen |
| Infinitives used as nouns | **das** | das Essen, das Leben |
| Days, months, seasons, most weather | **der** | der Montag, der Januar, der Sommer, der Regen |
| Many trees, cars as brands in speech | **der** | der Apfelbaum; *der BMW* in casual talk |
| Most rivers in Germany (not all) | **der** | der Rhein, der Main — but **die** Mosel, **die** Elbe |

Treat these as shortcuts, not laws. When a noun breaks the pattern, mark it and drill it.

## Articles change in the sentence

Learning only *der Tisch* is not enough in real sentences. The form moves with the case:

- Nominative: *Der Tisch ist groß.*
- Accusative: *Ich kaufe den Tisch.*
- Dative: *Das Buch liegt auf dem Tisch.*
- Genitive: *Die Beine des Tisches sind wackelig.*

If you can pick **der / die / das** in isolation but freeze in a sentence, practise [prepositions](/quizzes/prepositions/) and [cases](/grammar/cases/) next, not more random nouns.

## A 15-minute article session

1. Take 10 nouns from one topic (kitchen, office, travel).
2. Cover the article. Say the noun with *der/die/das* out loud.
3. Put each noun into one accusative sentence: *Ich sehe …*, *Ich kaufe …*, *Ich brauche …*.
4. Quiz the same set on the [articles quiz](/quizzes/articles/).
5. Mark every miss. Tomorrow, start with the marked list, not a new topic.

Do not mix 80 kitchen words with 80 politics words in one sitting. Gender sticks to **themes**.

## Traps for English and Hungarian speakers

English has *the* for everything, so the brain treats gender as decoration. Hungarian has no articles like *der/die/das*, so learners often skip them under stress. In a gap-fill, that skip is a wrong answer.

Also watch plural: many learners lock *die* to “feminine” and then panic in the plural, where **die** is also the plural article (*die Tische, die Frauen, die Kinder*). Separate the two jobs of *die* in your notes: feminine singular vs all plurals.

False friends make it worse. Hungarian *személy* feels close to *Person*, which is *die Person*. English *book* does not hint *das Buch*. Use the [false friends](/learning-materials/reading/false-friends/) list when a word looks familiar and still betrays you.

## What “mastered” looks like

You have the articles under control when you can:

- name 100 everyday nouns with the correct article at conversational speed;
- change *der* to *den/dem* without counting on fingers;
- notice your own mistake and correct it in the same sentence.

That is usable accuracy. It does not require knowing *das Quarkonium*. It does require boring, repeated contact with *das Brot, die Milch, der Käse*.

Start with the [articles quiz](/quizzes/articles/), keep the grammar notes on [articles and genders](/grammar/articles/), and add new nouns only with their article attached.`,
      de: `Deutsch hat drei grammatische Geschlechter. Das ist nicht das biologische Geschlecht. *Das Mädchen* ist sächlich. *Der Löffel* ist maskulin aus historischen Gründen. Wer das Genus „spüren“ will, rät ewig.

Die einzige stabile Gewohnheit: **kein Nomen ohne Artikel speichern.** Schreib *das Haus*, sag *das Haus*, quizze *das Haus*. *Haus = house* trainiert ein Wörterbuch, nicht Deutsch.

## Endungen, die sich zu merken lohnen

Keine Regel gilt für jedes Nomen, aber manche Endungen sparen Stunden:

| Endung / Typ | Typischer Artikel | Beispiele |
| --- | --- | --- |
| *-ung, -heit, -keit, -schaft, -tion, -ik* | **die** | die Wohnung, die Freiheit, die Möglichkeit |
| *-chen, -lein* | **das** | das Mädchen, das Häuschen |
| Infinitive als Nomen | **das** | das Essen, das Leben |
| Tage, Monate, Jahreszeiten | **der** | der Montag, der Januar, der Sommer |
| Viele Flüsse | **der** | der Rhein, der Main — aber **die** Mosel, **die** Elbe |

Das sind Abkürzungen, keine Gesetze. Brüche markieren und drillen.

## Der Artikel verändert sich im Satz

Nur *der Tisch* reicht in echten Sätzen nicht:

- Nominativ: *Der Tisch ist groß.*
- Akkusativ: *Ich kaufe den Tisch.*
- Dativ: *Das Buch liegt auf dem Tisch.*
- Genitiv: *Die Beine des Tisches sind wackelig.*

Wenn du *der/die/das* isoliert kannst, im Satz aber stockst: als Nächstes [Präpositionen](/quizzes/prepositions/) und [Fälle](/grammar/cases/).

## 15 Minuten Artikeltraining

1. 10 Nomen zu einem Thema.
2. Artikel verdecken, laut mit *der/die/das* sagen.
3. Jedes Nomen in einen Akkusativsatz: *Ich sehe …*, *Ich kaufe …*.
4. Dieselbe Menge im [Artikel-Quiz](/quizzes/articles/) testen.
5. Fehler markieren. Morgen mit der markierten Liste beginnen.

Nicht 80 Küchenwörter mit 80 Politikwörtern mischen. Genus haftet an **Themen**.

## Fallen für Englisch und Ungarisch

Englisch hat *the* für alles. Ungarisch hat kein *der/die/das*. Unter Stress lassen Lernende den Artikel weg — in der Lücke ist das falsch.

Und der Plural: *die* ist feminin **und** Pluralartikel (*die Tische*). In den Notizen die zwei Jobs trennen.

Falsche Freunde verschärfen es. Nutze die [Liste](/learning-materials/reading/false-friends/), wenn ein Wort vertraut aussieht und trotzdem täuscht.

## Wann es „sitzt“

- 100 Alltagswörter mit Artikel in Gesprächstempo
- *der* zu *den/dem* ohne Fingerzählen
- eigener Fehler im selben Satz korrigiert

Das ist prüfungsreif. Dafür brauchst du nicht *das Quarkonium*, sondern wiederholten Kontakt mit *das Brot, die Milch, der Käse*.

Weiter: [Artikel-Quiz](/quizzes/articles/) und [Artikel & Geschlechter](/grammar/articles/).`,
      hu: `A németnek három nyelvtani neme van. Ez nem a dolog biológiai neme. A *das Mädchen* semleges. A *der Löffel* hímnemű történelmi okból. Aki „érezi” a nemet, örökké tippel.

Az egyetlen stabil szokás: **soha ne tárold a főnevet névelő nélkül.** Írd: *das Haus*, mondd: *das Haus*, kvízezd: *das Haus*. A *Haus = ház* angol szótárat tanít, nem németet.

## Végződések, amiket érdemes megtanulni

Nincs szabály minden főnévre, de néhány végződés órákat spórol:

| Végződés / típus | Tipikus névelő | Példák |
| --- | --- | --- |
| *-ung, -heit, -keit, -schaft, -tion, -ik* | **die** | die Wohnung, die Freiheit, die Möglichkeit |
| *-chen, -lein* | **das** | das Mädchen, das Häuschen |
| Főnévként használt főnévi igenév | **das** | das Essen, das Leben |
| Napok, hónapok, évszakok | **der** | der Montag, der Januar, der Sommer |
| Sok folyó | **der** | der Rhein, der Main — de **die** Mosel, **die** Elbe |

Ezek gyorsítók, nem törvények. A kivételt jelöld és fúrd.

## A névelő a mondatban változik

A puszta *der Tisch* a vizsgán kevés:

- Nominativ: *Der Tisch ist groß.*
- Akkusativ: *Ich kaufe den Tisch.*
- Dativ: *Das Buch liegt auf dem Tisch.*
- Genitiv: *Die Beine des Tisches sind wackelig.*

Ha izoláltan megy a *der/die/das*, mondatban megakadsz: jöhet a [prepozíciók kvíz](/quizzes/prepositions/) és az [esetek](/grammar/cases/).

## 15 perces névelős kör

1. 10 főnév egy témából.
2. Takard a névelőt, mondd hangosan *der/die/das*-szal.
3. Mindegyik Akkusativ mondatba: *Ich sehe …*, *Ich kaufe …*.
4. Ugyanez a [névelők kvízben](/quizzes/articles/).
5. Hibákat jelöld. Holnap a megjelölt listával kezdj, ne új témával.

Ne keverj 80 konyhai szót 80 politikai szóval. A nem **témához** tapad.

## Csapdák angolul és magyarul beszélőknek

Az angolban mindenre *the* van. A magyarban nincs *der/die/das*. Stresszben a tanuló elhagyja a névelőt — a kiegészítéses feladatban ez hibás válasz.

A többes szám: a *die* nőnemű **és** többes névelő (*die Tische*). A füzetben válaszd szét a két szerepet.

A hamis barátok rontanak rajta. Használd a [listát](/learning-materials/reading/false-friends/), ha a szó ismerősnek tűnik, és mégis átver.

## Mikor „megvan”

- 100 hétköznapi főnév névelővel beszélgetős tempóban
- *der* → *den/dem* ujjszámolás nélkül
- a saját hibát ugyanabban a mondatban javítod

Ez használható pontosság. Nem kell hozzá a *das Quarkonium*, hanem unalmas ismétlés: *das Brot, die Milch, der Käse*.

Kezdd a [névelők kvízzel](/quizzes/articles/), tartsd meg a [névelők és nemek](/grammar/articles/) magyarázatát, és új főnevet csak névelővel vegyél fel.`,
    },
  },
  {
    slug: 'german-cases',
    published: '2026-08-31',
    minutes: 11,
    title: {
      en: 'German cases without panic: Nominativ, Akkusativ, Dativ, Genitiv',
      de: 'Deutsche Fälle ohne Panik: Nominativ, Akkusativ, Dativ, Genitiv',
      hu: 'Német esetek pánik nélkül: Nominativ, Akkusativ, Dativ, Genitiv',
    },
    description: {
      en: 'A plain-language guide to German cases for self-learners: who does what in the sentence, which prepositions freeze the case, and how to practise Wechselpräpositionen.',
      de: 'Fälle in klarer Sprache zum Selbstlernen: wer im Satz was tut, welche Präpositionen den Kasus festlegen, und wie du Wechselpräpositionen übst.',
      hu: 'Közérthető útmutató a német esetekhez önálló tanuláshoz: ki mit csinál a mondatban, mely prepozíciók rögzítik az esetet, és hogyan gyakorold a Wechselpräpositionen-t.',
    },
    body: {
      en: `German cases look like a wall of tables. For everyday German you need a smaller question: **what is the noun doing in this sentence?** Once that is clear, the article and pronoun follow.

## Four jobs, not four mysterious labels

| Case | Job in the sentence | Typical question | Example |
| --- | --- | --- | --- |
| **Nominativ** | the one who does the action (subject) | Who / what is doing it? | *Der Hund bellt.* |
| **Akkusativ** | the thing directly affected | Who / what do I see, buy, need? | *Ich sehe den Hund.* |
| **Dativ** | the person who receives or benefits | To whom / for whom? | *Ich gebe dem Kind einen Apfel.* |
| **Genitiv** | possession or “of” relationships | Whose? | *Das Auto des Lehrers ist neu.* |

In many B1 speaking tasks you can survive with Nominativ, Akkusativ and Dativ. Genitiv appears more in reading and formal writing (*während des Urlaubs*, *trotz des Wetters*).

## Verbs that “take” a case

Some verbs always want Akkusativ: *sehen, kaufen, brauchen, lesen, trinken*. Some want Dativ even when English uses a direct object: *helfen, danken, gehören, gefallen, antworten*.

- *Ich helfe **dem** Freund.* (not *den Freund*)
- *Das Buch gehört **der** Frau.*
- *Das gefällt **mir**.*

Learn those verbs as chunks. Do not rebuild the case from English.

## Prepositions that freeze the case

This is the highest-value grammar for gap-fills:

**Akkusativ only:** *durch, für, gegen, ohne, um*  
*Ich kaufe ein Geschenk für den Vater.*

**Dativ only:** *aus, bei, mit, nach, seit, von, zu*  
*Ich fahre mit dem Bus. Ich komme aus der Stadt.*

**Two-way (Wechsel):** *an, auf, hinter, in, neben, über, unter, vor, zwischen*  
Location (where?) → Dativ. Direction (where to?) → Akkusativ.

- *Das Buch liegt **auf dem** Tisch.* (it is already there)
- *Ich lege das Buch **auf den** Tisch.* (I move it there)

If you remember only one contrast from this page, remember *liegen / stellen / legen* plus *in/auf* + Dativ vs Akkusativ. It shows up in almost every conversation about rooms and travel.

## A drill you can finish in one coffee break

Write six sentences about your room, three “already there” and three “I put it there”:

1. *Die Lampe steht auf dem Schreibtisch.*
2. *Die Tasche hängt an der Tür.*
3. *Die Pflanzen sind vor dem Fenster.*
4. *Ich stelle die Tasse auf den Tisch.*
5. *Ich hänge die Jacke an den Haken.*
6. *Ich lege das Handy neben das Buch.*

Then quiz [prepositions](/quizzes/prepositions/) and read the longer notes under [German cases](/grammar/cases/) and [prepositions](/grammar/prepositions/).

## What to ignore at B1

You do not need every Genitiv adjective ending on day one. You do need:

- *dem/den/die* after the right preposition;
- *mir/mich* and *dir/dich* in fast speech;
- not mixing *in der Arbeit* (at work, location) with *in die Arbeit* (going to work) unless that is what you mean.

Cases become calm when they are attached to **phrases you actually say**, not to a poster of 16 endings. Build those phrases, then let the [quizzes](/quizzes/) catch the leftovers.`,
      de: `Deutsche Fälle wirken wie eine Mauer aus Tabellen. Zum Selbstlernen reicht eine kleinere Frage: **was tut das Nomen in diesem Satz?** Danach folgen Artikel und Pronomen.

## Vier Aufgaben, keine geheimnisvollen Etiketten

| Fall | Aufgabe | Typische Frage | Beispiel |
| --- | --- | --- | --- |
| **Nominativ** | wer handelt (Subjekt) | Wer / was macht es? | *Der Hund bellt.* |
| **Akkusativ** | was direkt betroffen ist | Wen / was sehe, kaufe, brauche ich? | *Ich sehe den Hund.* |
| **Dativ** | wer etwas bekommt | Wem? | *Ich gebe dem Kind einen Apfel.* |
| **Genitiv** | Besitz / „von“ | Wessen? | *Das Auto des Lehrers ist neu.* |

In vielen B1-Sprechprüfungen reichen Nominativ, Akkusativ und Dativ. Der Genitiv kommt stärker im Lesen und formellen Schreiben vor.

## Verben mit festem Fall

Akkusativ: *sehen, kaufen, brauchen, lesen, trinken*. Dativ, obwohl Englisch ein direktes Objekt hat: *helfen, danken, gehören, gefallen, antworten*.

- *Ich helfe **dem** Freund.*
- *Das Buch gehört **der** Frau.*
- *Das gefällt **mir**.*

Diese Verben als Chunks lernen.

## Präpositionen, die den Fall festlegen

**Nur Akkusativ:** *durch, für, gegen, ohne, um*  
**Nur Dativ:** *aus, bei, mit, nach, seit, von, zu*  
**Wechsel:** *an, auf, hinter, in, neben, über, unter, vor, zwischen*  
Ort (wo?) → Dativ. Richtung (wohin?) → Akkusativ.

- *Das Buch liegt **auf dem** Tisch.*
- *Ich lege das Buch **auf den** Tisch.*

Wenn du dir ein Kontrastpaar merkst, dann *liegen/stellen/legen* plus *in/auf*. Das brauchst du ständig bei Räumen und Wegen.

## Eine Übung in einer Kaffeepause

Sechs Sätze über dein Zimmer: drei „ist schon da“, drei „ich lege es dorthin“. Danach [Präpositionen-Quiz](/quizzes/prepositions/) und die Seiten [Fälle](/grammar/cases/) sowie [Präpositionen](/grammar/prepositions/).

## Was du auf B1 weglassen kannst

Nicht jede Genitiv-Adjektivendung am ersten Tag. Wohl aber:

- *dem/den/die* nach der richtigen Präposition
- *mir/mich*, *dir/dich* im schnellen Sprechen
- *in der Arbeit* vs *in die Arbeit* bewusst unterscheiden

Fälle werden ruhig, wenn sie an **Sätze hängen, die du wirklich sagst**. Diese Phrasen bauen, den Rest mit den [Quizzen](/quizzes/) fangen.`,
      hu: `A német esetek táblázatfala ijesztő. Vizsgára egy kisebb kérdés kell: **mit csinál a főnév ebben a mondatban?** Utána jön a névelő és a névmás.

## Négy feladat, nem négy titkos címke

| Eset | Szerep | Tipikus kérdés | Példa |
| --- | --- | --- | --- |
| **Nominativ** | aki cselekszik (alany) | Ki / mi csinálja? | *Der Hund bellt.* |
| **Akkusativ** | amit a cselekvés közvetlenül érint | Kit / mit látok, veszek, kérek? | *Ich sehe den Hund.* |
| **Dativ** | aki kap / akinek szól | Kinek? | *Ich gebe dem Kind einen Apfel.* |
| **Genitiv** | birtok / „-nak a” | Kié? | *Das Auto des Lehrers ist neu.* |

Sok B1 szóbeli részhez elég a Nominativ, Akkusativ és Dativ. A Genitiv inkább olvasásban és hivatalos írásban jön (*während des Urlaubs*).

## Igék, amelyek „hozzák” az esetet

Akkusativ: *sehen, kaufen, brauchen, lesen, trinken*. Dativ akkor is, ha az angol/magyar tárgyat vár: *helfen, danken, gehören, gefallen, antworten*.

- *Ich helfe **dem** Freund.*
- *Das Buch gehört **der** Frau.*
- *Das gefällt **mir**.*

Ezeket az igéket kész darabként tanuld.

## Prepozíciók, amelyek rögzítik az esetet

**Csak Akkusativ:** *durch, für, gegen, ohne, um*  
**Csak Dativ:** *aus, bei, mit, nach, seit, von, zu*  
**Wechsel:** *an, auf, hinter, in, neben, über, unter, vor, zwischen*  
Hol van? → Dativ. Hová megy? → Akkusativ.

- *Das Buch liegt **auf dem** Tisch.*
- *Ich lege das Buch **auf den** Tisch.*

Ha egy kontrasztot jegyzel meg erről az oldalról: *liegen / stellen / legen* + *in/auf*. Szobáknál és útnál folyton előjön.

## Gyakorlat egy kávészünetben

Hat mondat a szobádról: három „már ott van”, három „oda teszem”. Aztán [prepozíciók kvíz](/quizzes/prepositions/), plusz [esetek](/grammar/cases/) és [prepozíciók](/grammar/prepositions/).

## Mit hagyj ki B1-en

Nem kell az összes Genitiv melléknévvégződés az első napon. Kell viszont:

- *dem/den/die* a helyes prepozíció után
- *mir/mich*, *dir/dich* gyors beszédben
- *in der Arbeit* vs *in die Arbeit* tudatos megkülönböztetése

Az esetek akkor nyugszanak meg, ha **mondatokhoz tapadnak, amiket tényleg kimondasz**. Azokat építsd; a maradékot a [kvízek](/quizzes/) elkapják.`,
    },
  },
  {
    slug: 'weekly-german-practice',
    published: '2026-08-31',
    minutes: 8,
    title: {
      en: 'A weekly German practice plan that actually sticks',
      de: 'Ein wöchentlicher Deutsch-Übungsplan, der hält',
      hu: 'Heti német gyakorlóterv, ami megmarad',
    },
    description: {
      en: 'A realistic weekday schedule for self-learning German: short sessions, mixed skills, and a review loop so new words do not disappear by Friday.',
      de: 'Ein realistischer Wochenplan zum Selbstlernen: kurze Einheiten, gemischte Fertigkeiten und eine Wiederholungsschleife, damit neue Wörter nicht bis Freitag verschwinden.',
      hu: 'Reális heti beosztás önálló német tanuláshoz: rövid körök, kevert készségek, és ismétlő hurkok, hogy az új szavak ne tűnjenek el péntekre.',
    },
    body: {
      en: `Most learners fail the week, not the motivation. They study for two hours on Sunday, add 60 new words, and by Wednesday the articles have evaporated. Real progress rewards **returning** to the same material, not collecting it.

This plan uses MicaLingo the way a good notebook works: a little new input, a lot of retrieval, and one longer session for reading or listening.

## The weekday template (25–35 minutes)

| Day | Focus | What to open |
| --- | --- | --- |
| Monday | Vocabulary (one theme) | [Vocabulary quiz](/quizzes/vocabulary/) then save misses |
| Tuesday | Articles | [der, die, das quiz](/quizzes/articles/) + [article guide](/learn/der-die-das/) if you keep guessing |
| Wednesday | Verbs | [Verbs quiz](/quizzes/verbs/) — Präsens and Perfekt of the same 15 verbs |
| Thursday | Grammar in context | One [grammar](/grammar/) category, then [prepositions](/quizzes/prepositions/) or [adjectives](/quizzes/adjectives/) |
| Friday | Mixed retrieval | Marked words (after login) or a weaker quiz from the week |
| Saturday | Input | [Reading](/learning-materials/reading/) or [listening](/learning-materials/listening/), 15–25 minutes |
| Sunday | Output | Write 8–12 sentences or a short email; speak them aloud |

If you only have 15 minutes, do Friday’s job: retrieve old items. New lists without retrieval are decoration.

## Rules that stop the plan from collapsing

- **One theme per day.** Kitchen, then travel, then work — not all three.
- **Cap new words at 12.** If you want more, you are collecting, not learning.
- **Always attach grammar to a sentence.** *geben + Dativ*, not “Dativ = third column”.
- **Reuse yesterday’s mistakes first.** That is the whole point of marked words and quiz scores.
- **Once a week, write.** Quizzes recognise; writing reveals the holes.

## Keep speaking in the mix

If speaking is the scare, add a five-minute voice note after Thursday: describe a picture or your last weekend. Fluency is a muscle. Silence does not train it.

## When life gets busy

Skip Wednesday and Thursday before you skip Friday and Sunday. Retrieval and output protect what you already know. Adding another 40 nouns does not.

If cases keep breaking your writing, read [German cases without panic](/learn/german-cases/) on a Thursday instead of starting a new quiz set. If you want your own language pair, see [public vs private library](/learn/public-and-private/).

Consistency looks boring in a screenshot. It is also what actually makes the language stick.`,
      de: `Die meisten Lernenden verlieren die Woche, nicht die Motivation. Sonntag zwei Stunden, 60 neue Wörter — Mittwoch sind die Artikel weg. Fortschritt belohnt **Zurückkommen**, nicht Sammeln.

Dieser Plan nutzt MicaLingo wie ein gutes Heft: wenig Input, viel Abrufen, eine längere Einheit für Lesen oder Hören.

## Wochentags-Vorlage (25–35 Minuten)

| Tag | Fokus | Öffnen |
| --- | --- | --- |
| Montag | Wortschatz (ein Thema) | [Wortschatz-Quiz](/quizzes/vocabulary/), Fehler speichern |
| Dienstag | Artikel | [der/die/das-Quiz](/quizzes/articles/) |
| Mittwoch | Verben | [Verben-Quiz](/quizzes/verbs/) — dieselben 15 Verben in Präsens und Perfekt |
| Donnerstag | Grammatik im Satz | Eine [Grammatik](/grammar/)-Kategorie, dann [Präpositionen](/quizzes/prepositions/) |
| Freitag | Gemischtes Abrufen | Markierte Wörter oder das schwächste Quiz der Woche |
| Samstag | Input | [Lesen](/learning-materials/reading/) oder [Hören](/learning-materials/listening/) |
| Sonntag | Output | 8–12 Sätze oder eine kurze E-Mail, laut sprechen |

Bei nur 15 Minuten: Freitagsaufgabe. Abrufen schlägt neue Listen.

## Regeln, damit der Plan nicht kippt

- Ein Thema pro Tag.
- Höchstens 12 neue Wörter.
- Grammatik immer an einen Satz hängen.
- Gestern Fehler zuerst.
- Einmal pro Woche schreiben.

## Sprechen nicht weglassen

Wenn Sprechen Angst macht: nach Donnerstag fünf Minuten Sprachnachricht. Stille trainiert keine mündliche Sprache.

## Wenn wenig Zeit ist

Mittwoch und Donnerstag opfern, bevor Freitag und Sonntag sterben. Abrufen und Output schützen, was du schon kannst.

Bei Fällen: [Fälle ohne Panik](/learn/german-cases/). Für eigene Sprachenpaare: [öffentlich vs privat](/learn/public-and-private/).`,
      hu: `A legtöbb tanuló a hetet veszíti el, nem a motivációt. Vasárnap két óra, 60 új szó — szerdára a névelők elpárolognak. A haladás a **visszatérést** díjazza, nem a gyűjtést.

Ez a terv úgy használja a MicaLingo-t, mint egy jó füzet: kevés új input, sok előhívás, egy hosszabb olvasás vagy hallgatás.

## Hétköznapi sablon (25–35 perc)

| Nap | Fókusz | Mit nyiss meg |
| --- | --- | --- |
| Hétfő | Szókincs (egy téma) | [Szókincs kvíz](/quizzes/vocabulary/), hibák mentése |
| Kedd | Névelők | [der, die, das kvíz](/quizzes/articles/) |
| Szerda | Igék | [Ige kvíz](/quizzes/verbs/) — ugyanaz a 15 ige Präsensben és Perfektben |
| Csütörtök | Nyelvtan mondatban | Egy [nyelvtan](/grammar/) kategória, aztán [prepozíciók](/quizzes/prepositions/) |
| Péntek | Vegyes előhívás | Megjelölt szavak vagy a hét leggyengébb kvíze |
| Szombat | Bevitel | [Olvasás](/learning-materials/reading/) vagy [hallás](/learning-materials/listening/) |
| Vasárnap | Kimenet | 8–12 mondat vagy rövid e-mail, hangosan elmondva |

Ha csak 15 perc van: pénteki feladat. Az előhívás nyer az új listákkal szemben.

## Szabályok, hogy ne dőljön össze

- Napi egy téma.
- Legfeljebb 12 új szó.
- A nyelvtant mindig mondathoz kösd.
- Először a tegnapi hibák.
- Hetente egyszer írj.

## A beszédet se hagyd ki

Ha a beszéd ijeszt: csütörtök után öt perc hangüzenet. A csend nem edzi a szóbelit.

## Ha kevés az idő

A szerdát és csütörtököt áldozd, mielőtt a péntek és vasárnap meghal. Az előhívás és a kimenet védi, amit már tudsz.

Esetekhez: [Német esetek pánik nélkül](/learn/german-cases/). Saját nyelvpárhoz: [nyilvános vs saját könyvtár](/learn/public-and-private/).`,
    },
  },
];

const GRAMMAR_PRIMERS: Record<string, Record<LearnLang, string>> = {
  cases: {
    en: `German cases tell you the job of a noun in the sentence. **Nominativ** is the subject (*Der Hund schläft*). **Akkusativ** is the direct object (*Ich sehe den Hund*). **Dativ** is often the person who receives something (*Ich gebe dem Kind den Ball*). **Genitiv** shows belonging (*das Auto des Lehrers*).

Many common mistakes are not “I forgot the table” but mixing location and direction after *in, an, auf*: *Ich bin in der Schule* (already there, Dativ) vs *Ich gehe in die Schule* (movement, Akkusativ). Learn verbs and prepositions as chunks (*helfen + Dativ*, *warten auf + Akkusativ*), then practise with the [cases guide](/learn/german-cases/) and the [prepositions quiz](/quizzes/prepositions/).`,
    de: `Fälle sagen, welche Aufgabe ein Nomen im Satz hat. **Nominativ** ist das Subjekt (*Der Hund schläft*). **Akkusativ** das direkte Objekt (*Ich sehe den Hund*). **Dativ** oft die Person, die etwas bekommt (*Ich gebe dem Kind den Ball*). **Genitiv** zeigt Zugehörigkeit (*das Auto des Lehrers*).

Viele Fehler sind Ort vs Richtung nach *in, an, auf*: *Ich bin in der Schule* (Dativ) gegen *Ich gehe in die Schule* (Akkusativ). Verben und Präpositionen als Chunks lernen, dann der [Fälle-Guide](/learn/german-cases/) und das [Präpositionen-Quiz](/quizzes/prepositions/).`,
    hu: `Az eset megmondja, milyen szerepe van a főnévnek a mondatban. **Nominativ** az alany (*Der Hund schläft*). **Akkusativ** a közvetlen tárgy (*Ich sehe den Hund*). **Dativ** gyakran az, aki kap valamit (*Ich gebe dem Kind den Ball*). **Genitiv** a birtok (*das Auto des Lehrers*).

Sok hiba nem a táblázat, hanem a hely vs irány: *Ich bin in der Schule* (Dativ) és *Ich gehe in die Schule* (Akkusativ). Tanuld az igéket és prepozíciókat kész darabként, aztán a [esetek útmutató](/learn/german-cases/) és a [prepozíciók kvíz](/quizzes/prepositions/).`,
  },
  tenses: {
    en: `For spoken German and most B1 writing, you need a clean **Präsens** and a reliable **Perfekt** (*Ich habe gestern gearbeitet*). **Präteritum** is the narrative past in writing and the normal past of *sein* and *haben* (*ich war, ich hatte*). **Futur I** with *werden* is useful, but Germans often use present + a time word (*Morgen fahre ich*).

Writing tip: in emails about the past, Perfekt sounds natural. In a story paragraph, a few Präteritum forms (*ging, sagte, war*) make the text look more written. Practise both in the [verbs quiz](/quizzes/verbs/).`,
    de: `Fürs Sprechen und die meisten B1-Texte brauchst du ein klares **Präsens** und ein sicheres **Perfekt**. **Präteritum** ist die Erzählzeit und die normale Vergangenheit von *sein* und *haben*. **Futur I** mit *werden* geht, oft reicht Präsens plus Zeitangabe (*Morgen fahre ich*).

In E-Mails über die Vergangenheit klingt Perfekt natürlich. In einer Geschichte wirken ein paar Präteritumformen schriftlicher. Beides im [Verben-Quiz](/quizzes/verbs/).`,
    hu: `Beszédhez és a legtöbb B1 íráshoz kell egy tiszta **Präsens** és egy biztos **Perfekt**. A **Präteritum** az írott elbeszélő múlt, és a *sein/haben* természetes múltja (*ich war, ich hatte*). A **Futur I** működik, de gyakran elég a jelen idő + időhatározó (*Morgen fahre ich*).

Múltról szóló e-mailben a Perfekt természetes. Történetben néhány Präteritum írásosabb. Mindkettő az [ige kvízben](/quizzes/verbs/).`,
  },
  articles: {
    en: `Every German noun has a gender, shown in the singular by **der, die, das**. Gender is grammatical: *das Mädchen* is neuter. The useful method is to learn the article glued to the noun (*die Wohnung*, not *Wohnung*) and to remember high-value endings (*-ung* → usually *die*, *-chen* → *das*).

Articles also change with case (*der → den/dem/des*). If you can pick the dictionary form but fail in a sentence, the gap is cases, not vocabulary. Read [How to learn der, die, das](/learn/der-die-das/) and drill the [articles quiz](/quizzes/articles/).`,
    de: `Jedes Nomen hat ein Genus: **der, die, das**. Das Genus ist grammatisch: *das Mädchen* ist sächlich. Die Methode: Artikel am Nomen kleben (*die Wohnung*) und lohnende Endungen merken (*-ung* meist *die*, *-chen* *das*).

Artikel ändern sich mit dem Fall (*der → den/dem/des*). Wenn die Wörterbuchform sitzt, der Satz aber nicht, fehlt der Kasus. Dazu: [Artikel lernen](/learn/der-die-das/) und [Artikel-Quiz](/quizzes/articles/).`,
    hu: `Minden német főnévnek van neme: **der, die, das**. A nem nyelvtani: a *das Mädchen* semleges. A módszer: a névelőt a főnévre ragasztani (*die Wohnung*), és a hasznos végződéseket megjegyezni (*-ung* általában *die*, *-chen* → *das*).

A névelő esetenként változik (*der → den/dem/des*). Ha a szótári alak megy, a mondat nem, az eset hiányzik. Olvasd: [der, die, das](/learn/der-die-das/), gyakorold: [névelők kvíz](/quizzes/articles/).`,
  },
  adjectives: {
    en: `German adjective endings look heavy because they encode article + gender + case at once. After **der/die/das** the adjective often ends in *-e* or *-en* (*der alte Tisch, die alte Lampe, das alte Haus* in Nominativ). After **ein/kein** or possessives, masculine Nominativ keeps *-er* (*ein alter Tisch*) so you can still hear the gender.

You do not need the full poster overnight. Learn Nominativ and Akkusativ with definite articles first, then *ein*-words, then Dativ. Comparison is more regular than learners fear: *klein → kleiner → am kleinsten*, with common irregulars *gut/besser/am besten* and *viel/mehr/am meisten*. Practise in the [adjectives quiz](/quizzes/adjectives/).`,
    de: `Adjektivendungen packen Artikel, Genus und Fall in eine Endung. Nach **der/die/das** oft *-e* oder *-en*. Nach **ein/kein** bleibt im maskulinen Nominativ *-er* (*ein alter Tisch*), damit man das Genus noch hört.

Nicht das ganze Poster am ersten Abend. Zuerst Nominativ und Akkusativ mit bestimmtem Artikel, dann *ein*-Wörter, dann Dativ. Steigerung: *klein → kleiner → am kleinsten*, plus *gut/besser* und *viel/mehr*. Übung: [Adjektive-Quiz](/quizzes/adjectives/).`,
    hu: `A melléknévvégződés egyszerre kódolja a névelőt, a nemet és az esetet. **der/die/das** után gyakran *-e* vagy *-en*. **ein/kein** után hímnem Nominativban *-er* marad (*ein alter Tisch*), hogy a nem hallható legyen.

Ne az egész posztert tanuld az első este. Először Nominativ és Akkusativ határozott névelővel, aztán az *ein*-szavak, aztán Dativ. Fokozás: *klein → kleiner → am kleinsten*, plusz *gut/besser*, *viel/mehr*. Gyakorlás: [melléknevek kvíz](/quizzes/adjectives/).`,
  },
  prepositions: {
    en: `German prepositions are easier when you stop translating them one-to-one. Some always take Akkusativ (*für, ohne, um, durch, gegen*), some always Dativ (*mit, zu, von, bei, nach, aus, seit*). Two-way prepositions (*in, an, auf, …*) take Dativ for location and Akkusativ for direction.

Memorise a tiny set of everyday sentences: *Ich warte auf den Bus. Ich fahre mit der Bahn. Das Geschenk ist für die Mutter. Ich bin bei meinem Freund.* Then expand. The [prepositions quiz](/quizzes/prepositions/) and the [cases guide](/learn/german-cases/) are the matching pair.`,
    de: `Präpositionen werden leichter, wenn du sie nicht 1:1 übersetzt. Manche immer Akkusativ (*für, ohne, um, durch, gegen*), manche immer Dativ (*mit, zu, von, bei, nach, aus, seit*). Wechselpräpositionen: Dativ bei Ort, Akkusativ bei Richtung.

Kleine Alltagssätze merken: *Ich warte auf den Bus. Ich fahre mit der Bahn. Das Geschenk ist für die Mutter.* Dann erweitern. Passend: [Präpositionen-Quiz](/quizzes/prepositions/) und [Fälle-Guide](/learn/german-cases/).`,
    hu: `A német prepozíciók könnyebbek, ha nem szó szerint fordítod őket. Van, ami mindig Akkusativ (*für, ohne, um, durch, gegen*), van, ami mindig Dativ (*mit, zu, von, bei, nach, aus, seit*). A Wechsel: Dativ helyre, Akkusativ irányra.

Jegyezz meg néhány hétköznapi mondatot: *Ich warte auf den Bus. Ich fahre mit der Bahn. Das Geschenk ist für die Mutter.* Aztán bővítsd. Páros: [prepozíciók kvíz](/quizzes/prepositions/) és [esetek útmutató](/learn/german-cases/).`,
  },
  'sentence-structure': {
    en: `German main clauses put the **conjugated verb second**: *Heute gehe ich ins Kino* — the verb stays in position two even if you start with *Heute*. In yes/no questions the verb comes first: *Gehst du mit?* In *weil, dass, ob* clauses the conjugated verb moves to the **end**: *Ich bleibe zu Hause, weil ich müde bin.*

That last rule is a classic trap. Learners start the *weil* clause and forget the verb. Practise by writing ten *weil/dass* sentences about your week, then reading them aloud. Combine with [verbs](/quizzes/verbs/) so the form you park at the end is actually correct.`,
    de: `Im Hauptsatz steht das **konjugierte Verb an zweiter Stelle**: *Heute gehe ich ins Kino*. In Ja/Nein-Fragen das Verb vorn: *Gehst du mit?* In *weil-, dass-, ob*-Sätzen ans **Ende**: *Ich bleibe zu Hause, weil ich müde bin.*

Klassische Falle: der *weil*-Satz ohne Verb am Ende. Zehn *weil/dass*-Sätze über die Woche schreiben und laut lesen. Dazu [Verben](/quizzes/verbs/), damit die Form am Ende stimmt.`,
    hu: `Főmondatban a **ragozott ige a második helyen** van: *Heute gehe ich ins Kino*. Eleldöntendő kérdésben előre: *Gehst du mit?* *weil, dass, ob* mellett a ragozott ige a **végre** megy: *Ich bleibe zu Hause, weil ich müde bin.*

Klasszikus csapda: a *weil*-mondat ige nélkül. Írj tíz *weil/dass* mondatot a hetedről, olvasd hangosan. Mellé [igék](/quizzes/verbs/), hogy a végére tett alak helyes legyen.`,
  },
};

const QUIZ_PRIMERS: Record<string, Record<LearnLang, string>> = {
  vocabulary: {
    en: `These levels recycle high-frequency German words with Hungarian meanings. Study them in small sets: say the German aloud, hide the translation, then check. Pair this with [articles](/quizzes/articles/) so you never store a noun without *der/die/das*. A weekly rhythm is in the [practice plan](/learn/weekly-german-practice/).`,
    de: `Diese Level wiederholen häufige deutsche Wörter mit ungarischer Bedeutung. Kleine Mengen: Deutsch laut sagen, Übersetzung verdecken, prüfen. Mit [Artikeln](/quizzes/articles/) koppeln. Wochenplan: [Übungsplan](/learn/weekly-german-practice/).`,
    hu: `Ezek a szintek gyakori német szavakat forgatnak magyar jelentéssel és példamondattal. Kis adagokban: mondd hangosan a németet, takard a fordítást, ellenőrizd. Kösd a [névelőkhöz](/quizzes/articles/). Heti ritmus: [gyakorlóterv](/learn/weekly-german-practice/).`,
  },
  articles: {
    en: `Each item asks for **der, die or das** (and later the form that fits the case). Guessing by “how the word feels” fails under pressure. Use ending patterns (*-ung* → *die*) and always learn the noun with its article. Full method: [How to learn der, die, das](/learn/der-die-das/).`,
    de: `Jedes Item fragt **der, die oder das** (später die Kasusform). Nach Gefühl raten scheitert unter Druck. Endungen nutzen und Nomen immer mit Artikel lernen. Methode: [Artikel lernen](/learn/der-die-das/).`,
    hu: `Minden tétel **der, die vagy das** (később az esetnek megfelelő alak). Az „érzésre” tippelés nyomás alatt megbukik. Végződések + főnév névelővel. Módszer: [der, die, das](/learn/der-die-das/).`,
  },
  verbs: {
    en: `Verb quizzes mix conjugation, Präsens, Perfekt and common irregulars (*gehen, sehen, nehmen, essen*). For B1 speaking, Perfekt of everyday verbs matters more than rare Präteritum forms — except *war* and *hatte*, which you need constantly. After a level, write four original sentences with the verbs you missed.`,
    de: `Das Verben-Quiz mischt Konjugation, Präsens, Perfekt und unregelmäßige Verben. Für B1-Sprechen zählt das Perfekt des Alltags mehr als seltenes Präteritum — außer *war* und *hatte*. Nach einem Level vier eigene Sätze mit den Fehlern schreiben.`,
    hu: `Az ige kvíz keveri a ragozást, Präsenst, Perfektet és a rendhagyó igéket. B1 beszédhez a hétköznapi Perfekt fontosabb, mint a ritka Präteritum — kivéve a *war* és *hatte*. Szint után négy saját mondat a hibás igékkel.`,
  },
  adjectives: {
    en: `Practice endings after *der/die/das* and *ein*, plus comparatives (*besser, am besten*). Say the full noun phrase, not the adjective alone: *ein altes Haus* sticks; *alt* does not. Grammar notes: [adjective declension](/grammar/adjectives/).`,
    de: `Endungen nach *der/die/das* und *ein*, plus Steigerung. Die ganze Nominalphrase sagen: *ein altes Haus* bleibt hängen, *alt* nicht. Notizen: [Adjektivdeklination](/grammar/adjectives/).`,
    hu: `Végződések *der/die/das* és *ein* után, plusz fokozás. Az egész nominális szerkezetet mondd: *ein altes Haus* megmarad, a puszta *alt* nem. Jegyzet: [melléknévragozás](/grammar/adjectives/).`,
  },
  prepositions: {
    en: `These items train Akkusativ, Dativ and two-way prepositions. Always ask: is something **already there** or **moving there**? That single question decides *auf dem Tisch* vs *auf den Tisch*. Longer explanation: [German cases](/learn/german-cases/).`,
    de: `Akkusativ, Dativ und Wechselpräpositionen. Immer fragen: ist etwas **schon da** oder **bewegt es sich dorthin**? Das entscheidet *auf dem Tisch* gegen *auf den Tisch*. Länger: [Fälle](/learn/german-cases/).`,
    hu: `Akkusativ, Dativ és Wechsel. Kérdezd: **már ott van**, vagy **oda mozog**? Ettől lesz *auf dem Tisch* vagy *auf den Tisch*. Hosszabban: [esetek](/learn/german-cases/).`,
  },
  phrases: {
    en: `Phrase quizzes store word order, articles and verbs together. Learn them as ready replies for speaking (*Könnten Sie das bitte wiederholen?*, *Das wäre schön.*). After each level, reuse three phrases in a new context — a café, an email, a complaint.`,
    de: `Redemittel-Quizze speichern Wortstellung, Artikel und Verb zusammen. Als fertige Repliken lernen. Nach jedem Level drei Phrasen in einem neuen Kontext wiederverwenden.`,
    hu: `A kifejezés kvízekben szórend, névelő és ige együtt ül. Kész válaszként tanuld. Szint után három kifejezést új helyzetben használd — kávézó, e-mail, panasz.`,
  },
};

export const HOME_ARTICLE: Record<LearnLang, string> = {
  en: `MicaLingo is a free **self-learning** site. The public quizzes are built for **German–Hungarian** learners who need repeatable practice — articles, verbs, prepositions, vocabulary and short grammar notes — not another page that only lists “10 tips to get fluent”.

You can start without an account: open [Quizzes](/quizzes/), pick a topic, and work through levels. Sign in with a **Google account** when you want a private library, marked words from your mistakes, and quizzes generated from your own lists — in **any language pair**, or even for non-language topics. The public HU–DE library stays available either way.

## What you can practise here

- **Accuracy:** [der, die, das](/quizzes/articles/), [verbs](/quizzes/verbs/), [prepositions](/quizzes/prepositions/), [adjectives](/quizzes/adjectives/).
- **Words in context:** [vocabulary](/quizzes/vocabulary/) and [phrases](/quizzes/phrases/), with a readable [word list](/vocabulary/).
- **Rules next to drills:** [grammar](/grammar/) for cases, tenses, articles, adjective endings, prepositions and word order.
- **Reading and listening:** [learning materials](/learning-materials/), including [false friends](/learning-materials/reading/false-friends/) and [idioms](/learning-materials/reading/idioms/).

How the public and private libraries differ: [public vs private](/learn/public-and-private/). A simple loop for the week: [practice plan](/learn/weekly-german-practice/).

## How to start in ten minutes

1. Take the [articles quiz](/quizzes/articles/) until you know whether gender is your leak.
2. Do one [vocabulary](/quizzes/vocabulary/) level on a single theme (home, travel, work).
3. Read the matching grammar primer — [articles](/grammar/articles/) or [cases](/grammar/cases/) — then quiz again.

That loop is the product: short explanation, then retrieval. It is how language sticks, and it is the opposite of a homepage that is only buttons.`,
  de: `MicaLingo ist eine kostenlose Seite zum **Selbstlernen**. Die öffentlichen Quizze sind für **Deutsch–Ungarisch**-Lernende gebaut, die **wiederholbares Üben** brauchen — Artikel, Verben, Präpositionen, Wortschatz und kurze Grammatiknotizen — nicht nur „10 Tipps zur Flüssigkeit“.

Ohne Konto starten: [Quizze](/quizzes/) öffnen, Thema wählen, Level arbeiten. Mit **Google-Konto** anmelden für eine private Bibliothek, markierte Fehler und Quizze aus eigenen Listen — in **beliebigen Sprachen**, oder auch für andere Themen. Die öffentliche DE–HU-Bibliothek bleibt in beiden Fällen da.

## Was du hier üben kannst

- **Genauigkeit:** [der, die, das](/quizzes/articles/), [Verben](/quizzes/verbs/), [Präpositionen](/quizzes/prepositions/), [Adjektive](/quizzes/adjectives/).
- **Wortschatz im Kontext:** [Wortschatz](/quizzes/vocabulary/) und [Redemittel](/quizzes/phrases/), plus [Wortliste](/vocabulary/).
- **Regeln neben dem Drill:** [Grammatik](/grammar/).
- **Lesen und Hören:** [Lernmaterialien](/learning-materials/).

Öffentlich vs privat: [Ratgeber](/learn/public-and-private/). Wochenplan: [Übungsplan](/learn/weekly-german-practice/).

## In zehn Minuten starten

1. [Artikel-Quiz](/quizzes/articles/), bis klar ist, ob das Genus das Leck ist.
2. Ein [Wortschatz](/quizzes/vocabulary/)-Level zu einem Thema.
3. Die passende Grammatik lesen — [Artikel](/grammar/articles/) oder [Fälle](/grammar/cases/) — dann wieder quizen.

Diese Schleife ist das Angebot: kurze Erklärung, dann Abrufen.`,
  hu: `A MicaLingo ingyenes **önálló tanuló** oldal. A nyilvános kvízek **német–magyar** tanulóknak készültek, akiknek **ismételhető gyakorlat** kell — névelők, igék, prepozíciók, szókincs és rövid nyelvtan —, nem egy újabb „10 tipp a folyékonysághoz” lista.

Fiók nélkül is kezdheted: [Kvízek](/quizzes/), téma, szintek. **Google-fiókkal** lépj be, ha saját könyvtárat, megjelölt hibákat és saját listából generált kvízeket akarsz — **bármilyen nyelvpáron**, vagy akár nem nyelvi témán. A nyilvános HU–DE könyvtár mindkét esetben megmarad.

## Mit gyakorolhatsz itt

- **Pontosság:** [der, die, das](/quizzes/articles/), [igék](/quizzes/verbs/), [prepozíciók](/quizzes/prepositions/), [melléknevek](/quizzes/adjectives/).
- **Szavak kontextusban:** [szókincs](/quizzes/vocabulary/) és [kifejezések](/quizzes/phrases/), plusz [szólista](/vocabulary/).
- **Szabály a gyakorlat mellett:** [nyelvtan](/grammar/).
- **Olvasás és hallás:** [tananyagok](/learning-materials/).

Nyilvános vs saját: [útmutató](/learn/public-and-private/). Heti kör: [gyakorlóterv](/learn/weekly-german-practice/).

## Tíz perc alatt indulás

1. [Névelők kvíz](/quizzes/articles/), amíg kiderül, a nem-e a lyuk.
2. Egy [szókincs](/quizzes/vocabulary/) szint egy témán.
3. A hozzá tartozó nyelvtan — [névelők](/grammar/articles/) vagy [esetek](/grammar/cases/) — majd újra kvíz.

Ez a kör a lényeg: rövid magyarázat, aztán előhívás.`,
};

export const GRAMMAR_INDEX_ARTICLE: Record<LearnLang, string> = {
  en: `Use this section as a **rule book next to the quizzes**. Open a category, read the primer, then drill the same pattern. A useful order for self-learners is [articles](/grammar/articles/) → [cases](/grammar/cases/) → [prepositions](/grammar/prepositions/) → [tenses](/grammar/tenses/) → [adjectives](/grammar/adjectives/) → [sentence structure](/grammar/sentence-structure/). Longer walkthroughs live under [Study guides](/learn/).`,
  de: `Dieser Bereich ist das **Regelheft neben den Quizzen**. Kategorie öffnen, Primer lesen, dasselbe Muster üben. Sinnvolle Reihenfolge zum Selbstlernen: [Artikel](/grammar/articles/) → [Fälle](/grammar/cases/) → [Präpositionen](/grammar/prepositions/) → [Zeitformen](/grammar/tenses/) → [Adjektive](/grammar/adjectives/) → [Satzbau](/grammar/sentence-structure/). Längere Texte unter [Lernratgeber](/learn/).`,
  hu: `Ez a rész a **szabályfüzet a kvízek mellett**. Nyiss egy kategóriát, olvasd a bevezetőt, gyakorold ugyanazt. Önálló tanuláshoz jó sorrend: [névelők](/grammar/articles/) → [esetek](/grammar/cases/) → [prepozíciók](/grammar/prepositions/) → [igeidők](/grammar/tenses/) → [melléknevek](/grammar/adjectives/) → [szórend](/grammar/sentence-structure/). Hosszabb anyag: [Tanulási útmutatók](/learn/).`,
};

export const QUIZ_INDEX_ARTICLE: Record<LearnLang, string> = {
  en: `The **public** quizzes are German–Hungarian and grouped by skill. Start with the leak you already know — for most learners that is [articles](/quizzes/articles/) or [verbs](/quizzes/verbs/). Each topic page includes a short explanation and a sample of the words you will meet, so you can learn something even before you press Start.

With a Google login you can switch to a private tab and generate quizzes from your own lists in any languages. Guests can still complete every public HU–DE level. How the two libraries differ: [public vs private](/learn/public-and-private/). How to fit this into a week: [practice plan](/learn/weekly-german-practice/).`,
  de: `Die **öffentlichen** Quizze sind Deutsch–Ungarisch und nach Fertigkeit gruppiert. Starte beim bekannten Leck — oft [Artikel](/quizzes/articles/) oder [Verben](/quizzes/verbs/). Jede Themenseite hat eine kurze Erklärung und Beispielwörter, bevor du auf Start drückst.

Mit Google-Login: privater Tab und eigene Listen in beliebigen Sprachen. Gäste können alle öffentlichen DE–HU-Level spielen. Unterschied: [öffentlich vs privat](/learn/public-and-private/). Wochenplan: [Übungsplan](/learn/weekly-german-practice/).`,
  hu: `A **nyilvános** kvízek német–magyarok, készség szerint csoportosítva. Kezdd a ismert lyukkal — sokaknál [névelők](/quizzes/articles/) vagy [igék](/quizzes/verbs/). Minden témaoldalon van rövid magyarázat és mintaszavak, még a Start előtt.

Google-belépéssel saját kvíz bármilyen nyelven. Vendégként is végigjátszhatod a nyilvános HU–DE szinteket. A két könyvtár: [nyilvános vs saját](/learn/public-and-private/). Heti beosztás: [gyakorlóterv](/learn/weekly-german-practice/).`,
};

export const EXTRA_HOME_FAQ: Record<LearnLang, { q: string; a: string }[]> = {
  en: [
    {
      q: 'Are the public quizzes only German–Hungarian?',
      a: 'Yes. The open library is built for Hungarian learners of German. Sign in with a Google account to set up a private library in any languages and generate your own quizzes — including non-language topics if you want.',
    },
    {
      q: 'Do I need to create an account?',
      a: 'No. Public HU–DE quizzes, grammar primers and study guides work without login. A Google account is only needed to save a private library, marked words and imported files.',
    },
    {
      q: 'In which languages is the site available?',
      a: 'The interface is English, German and Hungarian. Public practice is German with Hungarian meanings. After Google login, your private lists can be any language pair you set up.',
    },
  ],
  de: [
    {
      q: 'Sind die öffentlichen Quizze nur Deutsch–Ungarisch?',
      a: 'Ja. Die offene Bibliothek ist für Ungarisch sprechende Deutschlernende. Mit Google-Konto baust du eine private Bibliothek in beliebigen Sprachen und erzeugst eigene Quizze — auch für andere Themen.',
    },
    {
      q: 'Brauche ich ein Konto?',
      a: 'Nein. Öffentliche DE–HU-Quizze, Grammatik-Primer und Ratgeber funktionieren ohne Login. Ein Google-Konto braucht es nur für private Bibliothek, markierte Wörter und Importe.',
    },
    {
      q: 'In welchen Sprachen gibt es die Seite?',
      a: 'Die Oberfläche ist Englisch, Deutsch und Ungarisch. Öffentlich übst du Deutsch mit ungarischer Bedeutung. Nach dem Google-Login können deine privaten Listen jedes Sprachenpaar sein.',
    },
  ],
  hu: [
    {
      q: 'A nyilvános kvízek csak német–magyarok?',
      a: 'Igen. A nyilvános könyvtár magyarul tanuló németeseknek készült. Google-fiókkal saját könyvtárat állíthatsz be bármilyen nyelven, és generálhatsz saját kvízeket — akár nem nyelvi témára is.',
    },
    {
      q: 'Kell fiókot csinálnom?',
      a: 'Nem. A nyilvános HU–DE kvízek, nyelvtan-bevezetők és útmutatók belépés nélkül mennek. Google-fiók csak a saját könyvtárhoz, megjelölt szavakhoz és importhoz kell.',
    },
    {
      q: 'Milyen nyelveken érhető el az oldal?',
      a: 'A felület angol, német és magyar. Nyilvánosan németet gyakorolsz magyar jelentéssel. Google-belépés után a saját listád bármilyen nyelvpár lehet.',
    },
  ],
};

export function getLearnGuide(slug: string): LearnGuide | undefined {
  const mapped = slug === 'german-exam-prep' ? 'public-and-private' : slug;
  return LEARN_GUIDES.find((g) => g.slug === mapped);
}

export function guideTitle(guide: LearnGuide, lang: LearnLang) {
  return pick(guide.title, lang);
}

export function guideDescription(guide: LearnGuide, lang: LearnLang) {
  return pick(guide.description, lang);
}

export function guideBody(guide: LearnGuide, lang: LearnLang) {
  return pick(guide.body, lang);
}

export function grammarPrimer(categoryId: string | undefined, lang: LearnLang): string | null {
  if (!categoryId || !GRAMMAR_PRIMERS[categoryId]) return null;
  return pick(GRAMMAR_PRIMERS[categoryId], lang);
}

export function quizPrimer(topic: string | undefined, lang: LearnLang): string | null {
  if (!topic || !QUIZ_PRIMERS[topic]) return null;
  return pick(QUIZ_PRIMERS[topic], lang);
}

export function homeArticle(lang: LearnLang) {
  return pick(HOME_ARTICLE, lang);
}

export function grammarIndexArticle(lang: LearnLang) {
  return pick(GRAMMAR_INDEX_ARTICLE, lang);
}

export function quizIndexArticle(lang: LearnLang) {
  return pick(QUIZ_INDEX_ARTICLE, lang);
}

export function extraHomeFaq(lang: LearnLang) {
  return pick(EXTRA_HOME_FAQ, lang);
}
