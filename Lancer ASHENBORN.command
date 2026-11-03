#!/bin/bash
set -euo pipefail

export PATH="$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd -- "$(dirname -- "$0")"

trap 'printf "\nLe lancement a échoué. Consultez le message ci-dessus.\n"; read -r -p "Appuyez sur Entrée pour fermer… "' ERR

if ! command -v bun >/dev/null 2>&1; then
  printf 'Bun est nécessaire. Installez-le depuis https://bun.sh puis relancez ce raccourci.\n'
  read -r -p "Appuyez sur Entrée pour fermer… "
  exit 1
fi

bun install --frozen-lockfile
bun run build
open "$PWD/dist/index.html"
