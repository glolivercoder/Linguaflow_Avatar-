import sys
import os
from fastapi.routing import APIRoute

# Add backend to path
sys.path.append(os.getcwd())

try:
    from vosk_service.main import app
    print("Successfully imported app")
    for route in app.routes:
        if isinstance(route, APIRoute):
            print(f"Route: {route.path} {route.methods}")
except Exception as e:
    print(f"Error importing app: {e}")
    import traceback
    traceback.print_exc()
