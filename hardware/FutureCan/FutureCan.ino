/*
  FutureCan - ESP32 Integrated
  - IR detects item -> publish capture request (futurecan/capture_request)
  - LED on, buzzer beep while waiting for classification
  - Wait for classification on topic (futurecan/waste_class)
  - When classification received -> move servos to drop item into correct bin
  - After cycle -> reset to home, LED off, ready for next item

  Libraries required:
   - ESP32Servo (use instead of Servo for ESP32)
   - PubSubClient
   - WiFi (built-in)
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ===== WIFI CONFIG =====
const char* ssid     = "smartbin";      // <-- change
const char* password = "cleanindia";  // <-- change

// ===== MQTT CONFIG =====
const char* mqtt_server = "broker.hivemq.com";
const int   mqtt_port   = 1883;
const char* topic_request = "futurecan/capture_request";
const char* topic_result  = "futurecan/waste_class";

// Assign your dustbin an ID. For standard Resident Registration, the default is DEMO-888
const char* BIN_ID = "DEMO-888"; 

WiFiClient espClient;
PubSubClient client(espClient);

// ===== PIN DEFINITIONS ===== (update per your wiring)
const int PIN_IR          = 21;  // IR sensor (active-LOW)
const int PIN_LED         = 4;
const int PIN_BUZZER      = 5;
const int PIN_SLIDE_SERVO = 18;
const int PIN_LID_SERVO   = 19;

// ===== SERVOS & POSITIONS =====
Servo slideServo;
Servo lidServo;

int homePosition = 90;               // slide home
int binPositions[3] = {30, 90, 150}; // 0: Organic, 1: Recyclable, 2: Hazardous
int lidClosed = 10;
int lidOpen   = 115;

// ===== TIMING =====
unsigned long waitStartMillis = 0;
const unsigned long CLASS_TIMEOUT_MS = 12000; // wait up to 12 seconds for classification
bool waitingForClass = false;

// Debounce / single-trigger logic
bool itemPresent = false;      // whether IR currently senses an item (active low)
bool previouslyPresent = false;
unsigned long lastDebounce = 0;
const unsigned long DEBOUNCE_MS = 150; // ms

// ===== helper state for executing drop cycle =====
bool performingDrop = false;

// ===== function declarations =====
void callback(char* topic, byte* payload, unsigned int length);
void reconnect();
void doDropCycle(int binIndex);

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println();
  Serial.println("=== FutureCan ESP32 Integrated ===");

  // Pins
  pinMode(PIN_IR, INPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  // Setup servo timers (recommended for ESP32)
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  // Attach servos (pulse range typical; adjust if needed)
  slideServo.setPeriodHertz(50);
  lidServo.setPeriodHertz(50);
  slideServo.attach(PIN_SLIDE_SERVO, 500, 2400);
  lidServo.attach(PIN_LID_SERVO, 500, 2400);

  // Move to safe initial positions
  slideServo.write(homePosition);
  lidServo.write(lidClosed);

  // Connect Wi-Fi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
    if (millis() - wifiStart > 20000) { // 20s timeout
      Serial.println("\nWiFi connect timeout - restarting...");
      ESP.restart();
    }
  }
  Serial.println("\n✅ WiFi connected.");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  reconnect();
}

// ===== LOOP =====
void loop() {
  // Ensure MQTT connection
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Read IR sensor (active-LOW -> 0 means item present)
  int rawIr = digitalRead(PIN_IR);
  bool detected = (rawIr == LOW);

  // Debounce
  if (detected != previouslyPresent) {
    lastDebounce = millis();
  }
  if ((millis() - lastDebounce) > DEBOUNCE_MS) {
    if (detected != itemPresent) {
      itemPresent = detected;
      if (itemPresent) {
        // New item detected -> trigger capture flow (only if not already performing)
        if (!waitingForClass && !performingDrop) {
          Serial.println("\n🔎 Item detected by IR. Requesting camera capture via MQTT...");
          digitalWrite(PIN_LED, HIGH);
          tone(PIN_BUZZER, 2000, 200); 
          delay(250);
          noTone(PIN_BUZZER);

          // Publish capture request with binId
          String payload = "{\"request\":\"capture\",\"binId\":\"";
          payload += BIN_ID;
          payload += "\",\"timestamp\":";
          payload += String(millis());
          payload += "}";

          bool ok = client.publish(topic_request, payload.c_str());
          if (ok) {
            Serial.println("📡 Capture request published.");
            waitingForClass = true;
            waitStartMillis = millis();
          } else {
            Serial.println("⚠️ Failed to publish capture request.");
            digitalWrite(PIN_LED, LOW);
          }
        } else {
          Serial.println("Item detected but already waiting/processing.");
        }
      } else {
        Serial.println("Item removed from IR sensor.");
      }
    }
  }
  previouslyPresent = detected;

  if (waitingForClass && !performingDrop) {
    if (millis() - waitStartMillis > CLASS_TIMEOUT_MS) {
      Serial.println("⚠️ Classification timeout. No result received.");
      waitingForClass = false;
      digitalWrite(PIN_LED, LOW);
      noTone(PIN_BUZZER);
    }
  }

  delay(20);
}

// ===== MQTT CALLBACK =====
void callback(char* topic, byte* payload, unsigned int length) {
  String messageTemp;
  for (unsigned int i = 0; i < length; i++) {
    messageTemp += (char)payload[i];
  }

  Serial.println("\n🔔 MQTT message received");
  Serial.print("Topic: ");
  Serial.println(topic);
  Serial.print("Payload: ");
  Serial.println(messageTemp);

  if (String(topic) == String(topic_result)) {
    if (messageTemp.indexOf("Organic") != -1) {
      Serial.println("➡ Classification: Organic");
      waitingForClass = false;
      performingDrop = true;
      doDropCycle(0);
      performingDrop = false;
      digitalWrite(PIN_LED, LOW);
    } else if (messageTemp.indexOf("Recyclable") != -1) {
      Serial.println("➡ Classification: Recyclable");
      waitingForClass = false;
      performingDrop = true;
      doDropCycle(1);
      performingDrop = false;
      digitalWrite(PIN_LED, LOW);
    } else if (messageTemp.indexOf("Hazardous") != -1) {
      Serial.println("➡ Classification: Hazardous");
      waitingForClass = false;
      performingDrop = true;
      doDropCycle(2);
      performingDrop = false;
      digitalWrite(PIN_LED, LOW);
    } else {
      Serial.println("❓ Unknown classification content.");
    }
  }
}

// ===== MQTT RECONNECT =====
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT broker...");
    if (client.connect("ESP32FutureCanClient")) {
      Serial.println("connected!");
      if (client.subscribe(topic_result)) {
        Serial.print("Subscribed to: ");
        Serial.println(topic_result);
      } else {
        Serial.println("Subscribe failed!");
      }
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(". retrying in 3s");
      delay(3000);
    }
  }
}

// ===== DO DROP CYCLE =====
void doDropCycle(int binIndex) {
  if (binIndex < 0 || binIndex > 2) return;

  Serial.print("Performing drop cycle for bin ");
  Serial.println(binIndex);

  slideServo.write(binPositions[binIndex]);
  delay(600);

  lidServo.write(lidOpen);
  delay(1000);

  lidServo.write(lidClosed);
  delay(500);

  slideServo.write(homePosition);
  delay(600);

  Serial.println("Drop cycle complete.");
}
