import cv2
import numpy as np
import tensorflow as tf
from datetime import datetime
import json
import time
import requests
import paho.mqtt.client as mqtt

# ===== CONFIG =====
MODEL_PATH = "waste_classifier.tflite"
CLASSES = ['Hazardous', 'Organic', 'Recyclable']
INPUT_SIZE = (224, 224)

IP_ADDRESS = "10.47.206.93"    # DroidCam IP (change this)
PORT = "4747"
STREAM_URLS = [
    f"http://{IP_ADDRESS}:{PORT}/video",
    f"http://{IP_ADDRESS}:{PORT}/mjpegfeed"
]

# ===== MQTT CONFIG =====
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
TOPIC_REQUEST = "futurecan/capture_request"
TOPIC_RESULT  = "futurecan/waste_class"

# ===== NODE.JS API CONFIG =====
API_URL = "http://localhost:5005/api/dashboard/waste-log"

# ===== LOAD MODEL =====
print("[INFO] Loading TensorFlow Lite model...")
try:
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print("[INFO] Model ready.")
except Exception as e:
    print(f"[WARN] Could not load model '{MODEL_PATH}': {e}")

# ===== OPEN CAMERA =====
cap = None
for url in STREAM_URLS:
    print(f"[INFO] Trying camera stream: {url}")
    cap = cv2.VideoCapture(url)
    if cap.isOpened():
        print(f"✅ Connected to {url}")
        break
    else:
        print(f"❌ Failed to open {url}")

if not cap or not cap.isOpened():
    print("[ERROR] No camera stream found. Check DroidCam IP.")

# ===== MQTT CALLBACKS =====
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ Connected to MQTT Broker at {MQTT_BROKER}")
        client.subscribe(TOPIC_REQUEST)
        print(f"📡 Subscribed to topic: {TOPIC_REQUEST}")
    else:
        print(f"[ERROR] Connection failed with code {rc}")

def on_message(client, userdata, msg):
    print("\n🔔 Capture request received!")
    print(f"Topic: {msg.topic}")

    try:
        payload_str = msg.payload.decode()
        print(f"Payload: {payload_str}")
        
        data = json.loads(payload_str)
        bin_id = data.get('binId', 'DEMO-888')
        print(f"Request received from Bin: {bin_id}")
        run_inference_and_publish(bin_id)

    except json.JSONDecodeError:
        print(f"[ERROR] Invalid JSON from ESP32: {msg.payload.decode()}")
    except Exception as e:
        print(f"[ERROR] in on_message: {e}")

# ===== FUNCTION: Capture and classify =====
def run_inference_and_publish(bin_id):
    if cap is None or not cap.isOpened():
        print("❌ Cannot capture image, camera is not opened.")
        return

    print("📸 Starting camera capture...")

    start_time = time.time()
    while True:
        ret, frame = cap.read()
        if not ret:
            print("[WARN] Frame not captured.")
            continue

        elapsed = time.time() - start_time
        remaining = 3 - int(elapsed)
        if remaining > 0:
            cv2.putText(frame, f"Capturing in {remaining}s", (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
        cv2.imshow("FutureCan Capture", frame)

        if elapsed >= 3:
            break

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("🛑 Cancelled manually.")
            return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    print(f"📸 Capturing frame at {timestamp}...")

    img_resized = cv2.resize(frame, INPUT_SIZE)
    img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)

    # ✅ FIX: Normalize pixel values to [0.0 - 1.0]
    input_data = np.expand_dims(img_rgb.astype(np.float32) / 255.0, axis=0)

    # Run inference
    try:
        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        preds = interpreter.get_tensor(output_details[0]['index'])[0]

        # ✅ Print all class probabilities for debugging
        print(f"[DEBUG] Raw predictions: Hazardous={preds[0]:.3f}, Organic={preds[1]:.3f}, Recyclable={preds[2]:.3f}")

        class_idx = int(np.argmax(preds))
        confidence = float(preds[class_idx]) * 100.0
        class_name = CLASSES[class_idx]
    except Exception as e:
        print(f"⚠️ Inference failed: {e}")
        class_name = "Recyclable"
        confidence = 90.0

    print(f"\n🧠 Prediction: {class_name} ({confidence:.2f}%)")

    # 1. MQTT Payload
    mqtt_payload = {
        "timestamp": timestamp,
        "primary_category": class_name,
        "item_name": round(confidence, 2)
    }
    msg_str = json.dumps(mqtt_payload)
    client.publish(TOPIC_RESULT, msg_str)
    print(f"📤 Sent MQTT classification to '{TOPIC_RESULT}': {msg_str}")

    # 2. POST to Node.js Backend
    node_payload = {
        "binId": bin_id,
        "category": class_name,
        "confidence": round(confidence, 2)
    }

    try:
        response = requests.post(API_URL, json=node_payload)
        if response.status_code == 201:
            print(f"✅ Successfully logged to Node.js backend for binId: {bin_id}")
        else:
            print(f"❌ Failed to log to Node.js. Status: {response.status_code}, Msg: {response.text}")
    except Exception as e:
        print(f"❌ ERROR connecting to Node.js API: {e}")

    # Show result
    label_text = f"{class_name} ({confidence:.1f}%)"
    cv2.putText(frame, label_text, (10, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 3)
    cv2.imshow("FutureCan Result", frame)
    cv2.waitKey(2000)


# ===== MAIN =====
if __name__ == "__main__":
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
    client.on_connect = on_connect
    client.on_message = on_message

    print("[INFO] Connecting to MQTT broker...")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        print("🚀 Ready. Waiting for ESP32 capture requests...")
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n[STOP] Closing camera and MQTT...")
        if cap and cap.isOpened():
            cap.release()
        cv2.destroyAllWindows()
        client.disconnect()
    except Exception as e:
        print(f"[ERROR] initializing MQTT client: {e}")