export const EVENT_LABEL: Record<string, string> = {
  MACHINE_STARTED: "Machine démarrée",
  MACHINE_STOPPED: "Machine arrêtée",
  MACHINE_IDLE: "Machine en pause",
  MACHINE_ALARM: "Alarme machine",
  MACHINE_MAINTENANCE: "Passage en maintenance",
  PRODUCTION_COUNT_UPDATED: "Compteur production mis à jour",
  GOOD_UNIT_PRODUCED: "Unité bonne produite",
  SCRAP_UNIT_PRODUCED: "Unité rejetée produite",
  CYCLE_TIME_CHANGED: "Temps de cycle modifié",
  DOWNTIME_STARTED: "Arrêt déclenché",
  DOWNTIME_RESOLVED: "Arrêt résolu",
  QUALITY_EVENT_CREATED: "Événement qualité",
  MAINTENANCE_STARTED: "Maintenance démarrée",
  MAINTENANCE_ENDED: "Maintenance terminée",
  SENSOR_TAG_UPDATED: "Tag capteur mis à jour",
}

export type EventTone = "green" | "red" | "amber" | "blue" | "neutral"

export const EVENT_TONE: Record<string, EventTone> = {
  MACHINE_STARTED: "green",
  MACHINE_STOPPED: "neutral",
  MACHINE_IDLE: "amber",
  MACHINE_ALARM: "red",
  MACHINE_MAINTENANCE: "blue",
  PRODUCTION_COUNT_UPDATED: "neutral",
  GOOD_UNIT_PRODUCED: "green",
  SCRAP_UNIT_PRODUCED: "red",
  CYCLE_TIME_CHANGED: "neutral",
  DOWNTIME_STARTED: "red",
  DOWNTIME_RESOLVED: "green",
  QUALITY_EVENT_CREATED: "amber",
  MAINTENANCE_STARTED: "blue",
  MAINTENANCE_ENDED: "blue",
  SENSOR_TAG_UPDATED: "neutral",
}
