#!/usr/bin/env python3
"""
Script de teste para verificar integração do Piper TTS
"""

import sys
from pathlib import Path

def test_imports():
    """Testa se as bibliotecas necessárias estão instaladas"""
    print("=" * 50)
    print("Teste 1: Verificando imports")
    print("=" * 50)
    
    try:
        import piper
        print("✅ piper-tts importado com sucesso")
    except ImportError as e:
        print(f"❌ Erro ao importar piper: {e}")
        return False
    
    try:
        import onnxruntime
        print("✅ onnxruntime importado com sucesso")
    except ImportError as e:
        print(f"❌ Erro ao importar onnxruntime: {e}")
        return False
    
    try:
        import soundfile
        print("✅ soundfile importado com sucesso")
    except ImportError as e:
        print(f"❌ Erro ao importar soundfile: {e}")
        return False
    
    return True


def test_reference_generator():
    """Testa a classe ReferenceAudioGenerator"""
    print("\n" + "=" * 50)
    print("Teste 2: Verificando ReferenceAudioGenerator")
    print("=" * 50)
    
    try:
        from reference_audio_generator import ReferenceAudioGenerator
        print("✅ ReferenceAudioGenerator importado com sucesso")
        
        # Tenta inicializar (pode falhar se não houver modelos)
        try:
            generator = ReferenceAudioGenerator()
            print(f"✅ Generator inicializado com modelo: {generator.voice_model_path}")
            print(f"   Sample rate: {generator.sample_rate}Hz")
            return generator
        except FileNotFoundError as e:
            print(f"⚠️  Modelo não encontrado: {e}")
            print("   Isso é esperado se os modelos ainda não foram copiados")
            return None
            
    except Exception as e:
        print(f"❌ Erro ao importar ReferenceAudioGenerator: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_list_models(generator):
    """Testa listagem de modelos disponíveis"""
    print("\n" + "=" * 50)
    print("Teste 3: Listando modelos disponíveis")
    print("=" * 50)
    
    if generator is None:
        print("⚠️  Pulando teste (generator não inicializado)")
        return
    
    try:
        models = generator.list_available_models()
        print(f"✅ Encontrados {len(models)} modelos:")
        for model in models:
            print(f"   - {model['key']} ({model['language']}) - {model['file_path']}")
    except Exception as e:
        print(f"❌ Erro ao listar modelos: {e}")
        import traceback
        traceback.print_exc()


def test_audio_generation(generator):
    """Testa geração de áudio"""
    print("\n" + "=" * 50)
    print("Teste 4: Gerando áudio de teste")
    print("=" * 50)
    
    if generator is None:
        print("⚠️  Pulando teste (generator não inicializado)")
        return
    
    try:
        test_text = "Hello, this is a test of the Piper text to speech system."
        print(f"Texto: '{test_text}'")
        
        audio_path = generator.generate_reference_audio(
            text=test_text,
            output_filename="test_integration"
        )
        
        print(f"✅ Áudio gerado com sucesso: {audio_path}")
        
        # Verifica se o arquivo existe
        if Path(audio_path).exists():
            size = Path(audio_path).stat().st_size
            print(f"   Tamanho do arquivo: {size:,} bytes")
        else:
            print(f"❌ Arquivo não encontrado: {audio_path}")
            
    except Exception as e:
        print(f"❌ Erro ao gerar áudio: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Executa todos os testes"""
    print("\n")
    print("=" * 50)
    print("TESTE DE INTEGRAÇÃO PIPER TTS")
    print("=" * 50)
    print()
    
    # Teste 1: Imports
    if not test_imports():
        print("\n❌ Falha nos imports. Verifique a instalação.")
        sys.exit(1)
    
    # Teste 2: ReferenceAudioGenerator
    generator = test_reference_generator()
    
    # Teste 3: Listar modelos
    test_list_models(generator)
    
    # Teste 4: Gerar áudio
    test_audio_generation(generator)
    
    print("\n" + "=" * 50)
    print("TESTES CONCLUÍDOS")
    print("=" * 50)
    print()


if __name__ == "__main__":
    main()
