# YGGDRASIL v4.1 — O Cavaleiro Inominável (Nórdico onda 15)

**Jogo pronto para Cloudflare Workers.** A campanha japonesa permanece com 20 ondas e Tsukuyomi na onda 15. A campanha nórdica possui agora 15 ondas (etapas internas 21 a 35). O Jarl está nas ondas nórdicas 5 e 10; o Cavaleiro Inominável é o chefe final nórdico da onda 15. A fase do dragão ativa ao chegar a 50% HP, com ataques telegráficos, três selos destrutíveis e carta lendária de recompensa. A OST do cavaleiro é uma composição chiptune original incluída em `nameless_ost.mp3`.

**Testes:** `npm run test:server && npm run test:nordic && npm run test:campaign && npm run test:bosses && npm run test:music && npm run test:cards && npm run test:nameless`

**Publicar:** `npx wrangler deploy`

---

# YGGDRASIL v4.0 — Cartas Nórdicas Exclusivas

## Novo baralho do Reino Nórdico

- **30 cartas nórdicas novas**, com nomes, efeitos, ilustrações em SVG e identidade rúnica própria.
- Ao **começar diretamente o Reino Nórdico** (solo ou cooperativo), cada personagem recebe **20 cartas sorteadas sem repetição**, sem tela de escolha.
- Todos os presentes no cooperativo ganham 20 cartas independentes, administradas pelo anfitrião. Os IDs são sincronizados na rede quando a fase muda.
- Recompensas após cada onda nórdica oferecem somente **cartas nórdicas**; as japonesas não aparecem. O baralho do Japão não foi modificado.
- As cartas nórdicas aumentam dano, vida, velocidade, recargas, crítico, defesa e efeitos especiais, com **tetos rígidos** para evitar atributos absurdos: dano 2,85x base; vida 3,5x base; velocidade 1,75x base; proteção 58%; crítico 60%; esquiva 44%; outros atributos e tempos também limitados.
- O jogador não precisa escolher entre as 20 cartas iniciais, mas ainda escolhe 1 de 3 cartas após vencer cada onda.

## Equilíbrio da Eve Lorey

- A ultimate ganha 3% por acerto normal e 4,5% por acerto em chefe (antes 0,7% e 1,2%).
- Q recarrega em 17,5s (antes 21s), E recarrega em 15s (antes 18s).
- O Campo Temporal (E) causa dano leve em pulsos de até 6 por alvo a cada 0,9s; continua reduzindo velocidade dos inimigos.

## Mantido da v3.9

- Japão e Nórdico independentes; mapas, trilhas nórdicas, Jarl do Gelo, Tsukuyomi, animações dos chefes, online cooperativo e X1.
- Warhammer 8-bit continua como trilha nórdica e DragonForce 8-bit como música de chefe nórdico. A OST da onda 15 ainda não havia sido adicionada na v4.0; a v4.1 inclui uma composição original.
- A arte e implementação do Odin ainda **não** fazem parte deste pacote; esta versão foca nas cartas e no equilíbrio de Eve.

## Instalação v4.1 (dois ZIPs menores que 25 MB)

Envie os dois ZIPs da v4.1 para a raiz do projeto e execute no GitHub Codespaces:

```bash
git pull &&
unzip -o Yggdrasil_v41_Parte1_Jogo.zip -d . &&
unzip -o Yggdrasil_v41_Parte2_Musicas.zip -d . &&
npm install &&
npm run test:server &&
npm run test:nordic &&
npm run test:campaign &&
npm run test:bosses &&
npm run test:music &&
npm run test:cards &&
npm run test:nameless &&
npx wrangler deploy &&
git add -A public src tests package.json wrangler.jsonc README.md .gitignore &&
(git diff --cached --quiet || git commit -m "Yggdrasil v4.1 - Cavaleiro Inominavel Nordico") &&
git push
```

Os testes são locais, não substituem o teste visual em dispositivo nem confirmam que o site já foi publicado. Os covers de terceiros continuam sujeitos às respectivas permissões de uso.
