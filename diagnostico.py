"""
Script de diagnóstico para verificar status dos serviços LinguaFlow Avatar
"""
import requests
import sys
from typing import Dict, Tuple

# Cores para terminal
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def check_service(name: str, url: str, optional: bool = False) -> Tuple[bool, str]:
    """Verifica se um serviço está respondendo"""
    try:
        timeout = 5 if 'localhost:3001' in url else 2  # Frontend needs more time
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            return True, f"{GREEN}✓{RESET} {name}: ATIVO"
        else:
            return False, f"{RED}✗{RESET} {name}: HTTP {response.status_code}"
    except requests.exceptions.ConnectionError:
        status = YELLOW if optional else RED
        msg = "INATIVO (opcional)" if optional else "INATIVO"
        return False, f"{status}✗{RESET} {name}: {msg}"
    except requests.exceptions.Timeout:
        return False, f"{RED}✗{RESET} {name}: TIMEOUT"
    except Exception as e:
        return False, f"{RED}✗{RESET} {name}: {str(e)}"

def main():
    print("=" * 60)
    print(f"{BLUE}  DIAGNÓSTICO LINGUAFLOW AVATAR{RESET}")
    print("=" * 60)
    print()
    
    services = {
        "Pronunciation Service": ("http://localhost:8000/health", False),
        "Proxy Service": ("http://localhost:3100/openrouter/models", False),
        "Vosk Service": ("http://localhost:8200/health", True),
        "Whisper Service": ("http://localhost:8003/health", True),
        "Wav2Lip Service": ("http://localhost:8301/health", True),
        "Frontend": ("http://localhost:3001", False),
    }
    
    print(f"{BLUE}[1/3] Verificando Serviços...{RESET}")
    print()
    
    results = {}
    for name, (url, optional) in services.items():
        success, message = check_service(name, url, optional)
        results[name] = success
        print(f"  {message}")
    
    print()
    print("=" * 60)
    print(f"{BLUE}[2/3] Testando Endpoints Específicos...{RESET}")
    print()
    
    # Testar endpoint Whisper detalhado
    if results.get("Whisper Service"):
        try:
            resp = requests.get("http://localhost:8003/health", timeout=2)
            print(f"  {GREEN}✓{RESET} Whisper Health Response: {resp.json()}")
        except Exception as e:
            print(f"  {RED}✗{RESET} Whisper Health Error: {e}")
    
    # Testar endpoint Vosk detalhado
    if results.get("Vosk Service"):
        try:
            resp = requests.get("http://localhost:8200/health", timeout=2)
            print(f"  {GREEN}✓{RESET} Vosk Health Response: {resp.json()}")
        except Exception as e:
            print(f"  {RED}✗{RESET} Vosk Health Error: {e}")
    
    print()
    print("=" * 60)
    print(f"{BLUE}[3/3] Resumo{RESET}")
    print("=" * 60)
    
    critical_services = ["Pronunciation Service", "Proxy Service", "Frontend"]
    optional_services = ["Vosk Service", "Whisper Service", "Wav2Lip Service"]
    
    critical_ok = all(results.get(s, False) for s in critical_services)
    
    print()
    print(f"Serviços Críticos: {GREEN if critical_ok else RED}{'OK' if critical_ok else 'FALHA'}{RESET}")
    print(f"Serviços Opcionais: {sum(results.get(s, False) for s in optional_services)}/{len(optional_services)} ativos")
    print()
    
    if not critical_ok:
        print(f"{RED}⚠ ATENÇÃO: Serviços críticos não estão rodando!{RESET}")
        print(f"{YELLOW}Execute INICIAR_AVATAR.bat para iniciar os serviços{RESET}")
        sys.exit(1)
    else:
        print(f"{GREEN}✓ Sistema operacional!{RESET}")
        
        # Verificar qual STT está disponível
        whisper_ok = results.get("Whisper Service", False)
        vosk_ok = results.get("Vosk Service", False)
        
        if whisper_ok and vosk_ok:
            print(f"{GREEN}✓ Ambos STT disponíveis (Vosk e Whisper){RESET}")
        elif whisper_ok:
            print(f"{GREEN}✓ Whisper STT disponível{RESET}")
        elif vosk_ok:
            print(f"{GREEN}✓ Vosk STT disponível{RESET}")
        else:
            print(f"{YELLOW}⚠ Nenhum STT disponível (opcional){RESET}")
        
        sys.exit(0)

if __name__ == "__main__":
    main()
