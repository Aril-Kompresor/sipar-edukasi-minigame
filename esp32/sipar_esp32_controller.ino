/*
 * SIPAR ESP32 Dual-Team A/B Trigger Controller
 * Mengirim pilihan A atau B dari Tim A dan Tim B ke server lokal SIPAR
 * melalui WiFi HTTP POST (/api/local/esp32) dan USB Serial fallback.
 */

#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "NAMA_WIFI_LOKAL";
const char* WIFI_PASS = "PASSWORD_WIFI";
const char* LOCAL_SERVER_URL = "http://192.168.1.10:3001/api/local/esp32";

// Pin tombol fisik (INPUT_PULLUP: aktif saat LOW)
const int PIN_TEAM_A_OPT_A = 12;
const int PIN_TEAM_A_OPT_B = 13;
const int PIN_TEAM_B_OPT_A = 14;
const int PIN_TEAM_B_OPT_B = 27;

unsigned long lastDebounceMs = 0;
const unsigned long DEBOUNCE_DELAY = 250;

void setup() {
  Serial.begin(115200);

  pinMode(PIN_TEAM_A_OPT_A, INPUT_PULLUP);
  pinMode(PIN_TEAM_A_OPT_B, INPUT_PULLUP);
  pinMode(PIN_TEAM_B_OPT_A, INPUT_PULLUP);
  pinMode(PIN_TEAM_B_OPT_B, INPUT_PULLUP);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Menghubungkan WiFi");
  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 10000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi terhubung. IP ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Mode USB Serial aktif (WiFi belum terhubung).");
  }
}

void sendChoice(const char* team, const char* choice) {
  // Format Web Serial API: "A:A", "A:B", "B:A", "B:B"
  Serial.print(team);
  Serial.print(":");
  Serial.println(choice);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(LOCAL_SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    String payload = String("{\"team\":\"") + team + "\",\"choice\":\"" + choice + "\",\"deviceId\":\"esp32-wifi\"}";
    http.POST(payload);
    http.end();
  }
}

void loop() {
  unsigned long now = millis();
  if (now - lastDebounceMs < DEBOUNCE_DELAY) return;

  if (digitalRead(PIN_TEAM_A_OPT_A) == LOW) {
    lastDebounceMs = now;
    sendChoice("A", "A");
  } else if (digitalRead(PIN_TEAM_A_OPT_B) == LOW) {
    lastDebounceMs = now;
    sendChoice("A", "B");
  } else if (digitalRead(PIN_TEAM_B_OPT_A) == LOW) {
    lastDebounceMs = now;
    sendChoice("B", "A");
  } else if (digitalRead(PIN_TEAM_B_OPT_B) == LOW) {
    lastDebounceMs = now;
    sendChoice("B", "B");
  }
}
