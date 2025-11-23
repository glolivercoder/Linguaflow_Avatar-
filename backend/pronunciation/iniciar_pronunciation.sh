#!/bin/bash

# =========================================================
# Script para iniciar o Backend de Pronuncia do LinguaFlow
# Linux / WSL2 / macOS
# =========================================================

set -e

echo ""
echo "========================================"
echo "  LinguaFlow - Backend de Pronuncia"
echo "  com Piper1-GPL e openSMILE"
echo "========================================"
echo ""

# Verifica se Docker esta instalado
if ! command -v docker &> /dev/null; then
    echo "[ERRO] Docker nao encontrado!"
    echo "Por favor, instale o Docker:"
    echo "  Ubuntu/Debian: sudo apt-get install docker.io docker-compose-plugin"
    echo "  macOS: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Verifica se Docker Compose esta disponivel
if ! docker compose version &> /dev/null; then
    echo "[ERRO] Docker Compose nao encontrado!"
    echo "Por favor, instale o Docker Compose plugin."
    exit 1
fi

# Verifica se Docker esta rodando
if ! docker ps &> /dev/null; then
    echo "[ERRO] Docker nao esta rodando!"
    echo "Por favor, inicie o Docker daemon e tente novamente."
    exit 1
fi

echo "[INFO] Docker encontrado e rodando..."
echo ""

# Cria diretorios necessarios
mkdir -p references temp

echo "[INFO] Criando diretorios..."
echo ""

# Opcao de rebuild
read -p "Deseja fazer rebuild da imagem? (s/N): " REBUILD

if [[ "$REBUILD" =~ ^[Ss]$ ]]; then
    echo ""
    echo "[INFO] Fazendo rebuild da imagem Docker..."
    echo "[INFO] Isso pode levar varios minutos na primeira vez..."
    echo ""
    docker compose build --no-cache
fi

echo ""
echo "[INFO] Iniciando containers..."
echo ""

# Inicia os containers
docker compose up -d

echo ""
echo "========================================"
echo "  Backend iniciado com sucesso!"
echo "========================================"
echo ""
echo "  API URL: http://localhost:8000"
echo "  Docs: http://localhost:8000/docs"
echo "  Health: http://localhost:8000/health"
echo ""
echo "Para ver os logs:"
echo "  docker compose logs -f"
echo ""
echo "Para parar o backend:"
echo "  docker compose down"
echo ""
echo "Para reiniciar:"
echo "  docker compose restart"
echo ""
echo "========================================"
echo ""

# Aguarda alguns segundos para o servico iniciar
sleep 5

# Testa se a API esta respondendo
echo "[INFO] Verificando saude da API..."
if curl -f http://localhost:8000/health &> /dev/null; then
    echo "[OK] API esta respondendo corretamente!"
else
    echo "[AVISO] API ainda nao esta respondendo."
    echo "[INFO] Aguarde mais alguns segundos e verifique os logs:"
    echo "       docker compose logs"
fi

echo ""
