import json
import sys
import os

def convert_output_to_script(input_path, output_path=None):
    """
    Convierte un JSON de salida (con campos partial y qualification)
    al formato de script de entrada (lista de acciones con response).
    """
    if not os.path.exists(input_path):
        print(f"Error: El archivo {input_path} no existe.")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    script_output = []

    # Iteramos por las llaves del JSON (ej: "altus:1_CONF:1" o "sipac:SIPAC_FULL_COMPLIANCE:STEP_1")
    for key, value in data.items():
        # Saltamos las entradas de resumen que terminan en ":summary" o variables globales que no son diccionarios
        if key.endswith(":summary") or not isinstance(value, dict):
            continue

        source = value.get("source")
        task_id = value.get("task_id")
        action_id = value.get("action_id")
        partial = value.get("partial", [])

        if not action_id:
            continue

        # Filtramos solo los mensajes que son del usuario (respuestas)
        user_responses = [item["content"] for item in partial if item["role"] == "user"]

        # Generamos una entrada por cada respuesta del usuario dentro de esta acción
        for i, response in enumerate(user_responses):
            entry = {
                "actionId": str(action_id),
                "taskId": task_id,
                "questionIndex": i,
                "response": response
            }
            if source is not None:
                entry["source"] = source
            script_output.append(entry)

    # Guardar el resultado
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(script_output, f, indent=2, ensure_ascii=False)
        print(f"Script generado con éxito en: {output_path}")
    else:
        print(json.dumps(script_output, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python convert_output_to_script.py <archivo_entrada.json> [archivo_salida.json]")
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        convert_output_to_script(input_file, output_file)
